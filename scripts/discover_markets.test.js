// Load .env from root folder
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const admin = require('firebase-admin');
const axios = require('axios');
const { initializeFirebaseAdmin } = require('./utils/firebaseAdmin');

/**
 * Test version: Discover markets from one city only (5 markets max)
 */
async function discoverMarketsTest() {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
    }

    // Test with one city only
    const testCity = { name: 'Sydney', lat: -33.8688, lng: 151.2093 };

    console.log('🧪 TEST MODE: Discovering local markets...\n');
    console.log(`📍 Testing with: ${testCity.name} (${testCity.lat}, ${testCity.lng})\n`);

    let totalFound = 0;
    let totalAdded = 0;
    let totalSkipped = 0;
    const allPlaceIds = new Set();
    const maxMarkets = 5; // Limit to 5 for testing

    try {
      // Nearby Search API (first page only)
      const searchParams = {
        location: `${testCity.lat},${testCity.lng}`,
        radius: 50000, // 50km radius
        keyword: 'market farmers market craft market flea market artisan market vintage market antique market',
        key: GOOGLE_MAPS_API_KEY,
      };

      const searchResponse = await axios.get(
        'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        { params: searchParams }
      );

      if (searchResponse.data.status === 'OK') {
        const results = searchResponse.data.results || [];
        console.log(`   📄 Found ${results.length} results\n`);

        for (const place of results) {
          if (totalFound >= maxMarkets) {
            console.log(`   ⏹️  Reached test limit of ${maxMarkets} markets`);
            break;
          }

          // Filter: Only real local markets
          if (isLocalMarket(place)) {
            const placeId = place.place_id;
            
            if (!allPlaceIds.has(placeId)) {
              allPlaceIds.add(placeId);
              totalFound++;

              // Fetch detailed information to check opening hours
              const placeDetails = await fetchPlaceDetails(placeId, GOOGLE_MAPS_API_KEY);
              
              // Filter out 24-hour markets
              if (placeDetails && is24Hours(placeDetails)) {
                totalSkipped++;
                console.log(`      ⏭️  Skipped (24 hours): ${place.name}`);
                continue;
              }

              // Import if not 24 hours
              const added = await importPlaceDetails(placeId, GOOGLE_MAPS_API_KEY, placeDetails);
              if (added) {
                totalAdded++;
              } else {
                totalSkipped++;
              }

              // Rate limiting
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } else {
            totalSkipped++;
            console.log(`      ⏭️  Skipped (not a local market): ${place.name}`);
          }
        }
      } else {
        console.log(`   ⚠️  Status: ${searchResponse.data.status}`);
      }

    } catch (error) {
      console.error(`   ❌ Error searching ${testCity.name}:`, error.message);
    }

    console.log(`\n✅ TEST Discovery complete!`);
    console.log(`   📊 Total found: ${totalFound}`);
    console.log(`   ✅ Added: ${totalAdded}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped}`);
    console.log(`\n💡 To discover all markets, run: node discover_markets.js`);
  } catch (error) {
    console.error('❌ Error discovering markets:', error);
    throw error;
  }
}

/**
 * Check if a place is a real local market
 */
function isLocalMarket(place) {
  const name = (place.name || '').toLowerCase();
  const types = (place.types || []).map(t => t.toLowerCase());

  // Exclude these types
  const excludeTypes = [
    'supermarket',
    'grocery_or_supermarket',
    'shopping_mall',
    'community_centre',
    'city_hall',
    'local_government_office',
  ];

  // Exclude if has excluded types
  if (excludeTypes.some(type => types.includes(type))) {
    return false;
  }

  // Include if name contains market-related keywords
  const marketKeywords = [
    'market',
    'farmers market',
    'craft market',
    'flea market',
    'artisan market',
    'vintage market',
    'antique market',
  ];

  const hasMarketKeyword = marketKeywords.some(keyword => name.includes(keyword));

  // Include if it's a market type or has market keyword
  return types.includes('market') || hasMarketKeyword;
}

/**
 * Check if opening hours indicate 24-hour operation
 * Filters out markets that are open 24 hours (typically supermarkets, convenience stores)
 */
function is24Hours(place) {
  if (!place.opening_hours) {
    return false;
  }

  // Check weekday_text for "Open 24 hours" pattern
  if (place.opening_hours.weekday_text && place.opening_hours.weekday_text.length > 0) {
    const has24HoursText = place.opening_hours.weekday_text.some(text => {
      const lowerText = text.toLowerCase();
      return lowerText.includes('open 24 hours') || 
             lowerText.includes('24 hours') ||
             lowerText.includes('24/7') ||
             (lowerText.includes('open') && lowerText.includes('24'));
    });
    if (has24HoursText) {
      return true;
    }
  }

  // Check periods for 24-hour patterns
  if (place.opening_hours.periods && place.opening_hours.periods.length > 0) {
    // Check if all periods indicate 24-hour operation
    const all24Hours = place.opening_hours.periods.every(period => {
      if (!period.open) {
        return false;
      }
      
      // If no close time, it might be 24 hours (but not always)
      if (!period.close) {
        // Check if it's explicitly marked as 24 hours in weekday_text
        return false; // Don't assume 24 hours without close time
      }
      
      // Same day, same time at 0000 (e.g., open: {day: 0, time: "0000"}, close: {day: 0, time: "0000"})
      if (period.open.day === period.close.day && 
          period.open.time === '0000' && 
          period.close.time === '0000') {
        return true;
      }
      
      // Open at 0000 and close at 0000 next day (24 hours)
      // e.g., open: {day: 0, time: "0000"}, close: {day: 1, time: "0000"}
      const nextDay = (period.open.day + 1) % 7;
      if (period.open.time === '0000' && 
          period.close.day === nextDay && 
          period.close.time === '0000') {
        return true;
      }
      
      return false;
    });
    
    // If all periods are 24 hours, it's a 24-hour market
    if (all24Hours && place.opening_hours.periods.length >= 5) {
      // At least 5 days of the week are 24 hours
      return true;
    }
  }

  return false;
}

/**
 * Fetch place details from Google Places API
 */
async function fetchPlaceDetails(placeId, apiKey) {
  try {
    const detailsResponse = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields: 'name,rating,user_ratings_total,photos,geometry,formatted_address,opening_hours,types,business_status,place_id',
          key: apiKey,
        },
      }
    );

    if (detailsResponse.data.status !== 'OK') {
      return null;
    }

    return detailsResponse.data.result;
  } catch (error) {
    console.error(`      ⚠️  Error fetching details for ${placeId}:`, error.message);
    return null;
  }
}

/**
 * Import place details into Firestore
 */
async function importPlaceDetails(placeId, apiKey, placeDetails = null) {
  try {
    // Check if already exists
    const marketRef = admin.firestore().collection('markets').doc(placeId);
    const existingDoc = await marketRef.get();

    if (existingDoc.exists) {
      console.log(`      ⏭️  Already exists: ${placeId}`);
      return false;
    }

    // Fetch place details if not provided
    let place = placeDetails;
    if (!place) {
      place = await fetchPlaceDetails(placeId, apiKey);
      if (!place) {
        console.log(`      ⚠️  ${placeId}: Failed to fetch details`);
        return false;
      }
    }

    // Extract city and state from formatted_address
    const address = place.formatted_address || '';
    const cityMatch = address.match(/([^,]+),\s*([A-Z]{2,3})\s+\d+/);
    const city = cityMatch ? cityMatch[1].trim() : null;
    const state = cityMatch ? cityMatch[2].trim() : null;

    // Prepare market data
    const marketData = {
      place_id: place.place_id,
      name: place.name,
      geometry: place.geometry,
      types: place.types || [],
      business_status: place.business_status || 'OPERATIONAL',
      source: 'google',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add optional fields
    if (place.rating !== undefined) {
      marketData.rating = place.rating;
    }
    if (place.user_ratings_total !== undefined) {
      marketData.user_ratings_total = place.user_ratings_total;
    }
    if (place.photos && place.photos.length > 0) {
      marketData.photo_reference = place.photos[0].photo_reference;
    }
    if (place.formatted_address) {
      marketData.formatted_address = place.formatted_address;
      if (city) marketData.city = city;
      if (state) marketData.state = state;
    }
    if (place.opening_hours) {
      marketData.opening_hours = {
        periods: place.opening_hours.periods || null,
        weekday_text: place.opening_hours.weekday_text || null,
      };
    }

    // Save to Firestore
    await marketRef.set(marketData);
    console.log(`      ✅ Added: ${place.name} (${city || 'Unknown'})`);
    return true;

  } catch (error) {
    console.error(`      ❌ Error importing ${placeId}:`, error.message);
    return false;
  }
}

if (require.main === module) {
  discoverMarketsTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { discoverMarketsTest };
