// Load .env from root folder
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const admin = require('firebase-admin');
const axios = require('axios');
const { initializeFirebaseAdmin } = require('./utils/firebaseAdmin');

async function discoverMarkets() {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
    }

    // Australian cities to search
    const cities = [
      // NSW
      { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
      { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
      { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
      { name: 'Perth', lat: -31.9505, lng: 115.8605 },
      { name: 'Adelaide', lat: -34.9285, lng: 138.6007 },
      { name: 'Hobart', lat: -42.8821, lng: 147.3272 },
      { name: 'Canberra', lat: -35.2809, lng: 149.1300 },
      { name: 'Darwin', lat: -12.4634, lng: 130.8456 },
      { name: 'Byron Bay', lat: -28.6474, lng: 153.6020 },
      // Add more cities as needed
    ];

    console.log('🔍 Discovering local markets from Google Places API...\n');
    console.log(`📍 Searching ${cities.length} cities\n`);

    let totalFound = 0;
    let totalAdded = 0;
    let totalSkipped = 0;
    const allPlaceIds = new Set(); // Track to avoid duplicates

    for (const city of cities) {
      console.log(`\n🏙️  Searching: ${city.name} (${city.lat}, ${city.lng})`);
      
      let nextPageToken = null;
      let pageCount = 0;
      const maxPages = 3; // Limit pages per city to avoid quota issues

      do {
        try {
          // Nearby Search API
          const searchParams = {
            location: `${city.lat},${city.lng}`,
            radius: 50000, // 50km radius
            type: 'market',
            key: GOOGLE_MAPS_API_KEY,
          };

          if (nextPageToken) {
            searchParams.pagetoken = nextPageToken;
            // Wait 2 seconds before using next_page_token (Google requirement)
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          const searchResponse = await axios.get(
            'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
            { params: searchParams }
          );

          if (searchResponse.data.status === 'OK' || searchResponse.data.status === 'ZERO_RESULTS') {
            const results = searchResponse.data.results || [];
            nextPageToken = searchResponse.data.next_page_token || null;
            pageCount++;

            console.log(`   📄 Page ${pageCount}: Found ${results.length} results`);

            for (const place of results) {
              // Filter: Only real local markets
              if (isLocalMarket(place)) {
                const placeId = place.place_id;
                
                if (!allPlaceIds.has(placeId)) {
                  allPlaceIds.add(placeId);
                  totalFound++;

                  // Fetch detailed information
                  const added = await importPlaceDetails(placeId, GOOGLE_MAPS_API_KEY);
                  if (added) {
                    totalAdded++;
                  } else {
                    totalSkipped++;
                  }

                  // Rate limiting
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              } else {
                totalSkipped++;
              }
            }
          } else if (searchResponse.data.status === 'INVALID_REQUEST') {
            console.log(`   ⚠️  Invalid request (likely pagination issue), moving to next city`);
            break;
          } else {
            console.log(`   ⚠️  Status: ${searchResponse.data.status}`);
            break;
          }

          // Rate limiting between pages
          if (nextPageToken) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          console.error(`   ❌ Error searching ${city.name}:`, error.message);
          break;
        }
      } while (nextPageToken && pageCount < maxPages);

      console.log(`   ✅ ${city.name}: Found ${totalFound} unique markets so far`);
    }

    console.log(`\n✅ Discovery complete!`);
    console.log(`   📊 Total found: ${totalFound}`);
    console.log(`   ✅ Added: ${totalAdded}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped}`);
  } catch (error) {
    console.error('❌ Error discovering markets:', error);
    throw error;
  }
}

/**
 * Check if a place is a real local market
 * Filters out supermarkets, community centres, halls, etc.
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
    'producers market',
    'makers market',
    'vintage market',
    'antique market',
  ];

  const hasMarketKeyword = marketKeywords.some(keyword => name.includes(keyword));

  // Include if it's a market type or has market keyword
  return types.includes('market') || hasMarketKeyword;
}

/**
 * Import place details into Firestore
 */
async function importPlaceDetails(placeId, apiKey) {
  try {
    // Check if already exists
    const marketRef = admin.firestore().collection('markets').doc(placeId);
    const existingDoc = await marketRef.get();

    if (existingDoc.exists) {
      // Already exists, skip
      return false;
    }

    // Fetch place details
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
      console.log(`      ⚠️  ${placeId}: ${detailsResponse.data.status}`);
      return false;
    }

    const place = detailsResponse.data.result;

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
  discoverMarkets()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { discoverMarkets };
