// Load .env from root folder
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const admin = require('firebase-admin');
const axios = require('axios');
const { initializeFirebaseAdmin } = require('./utils/firebaseAdmin');
const { uploadPhotoToStorage } = require('./utils/photoStorage');

/**
 * Seed script: discover/import up to N markets per configured city.
 * Intended for quick test data after wiping Firestore.
 *
 * Run:
 *   node scripts/discover_markets_5_each.js
 */
async function discoverAndImportMarkets5Each() {
  try {
    initializeFirebaseAdmin();

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
    }

    // Same city list as scripts/discover_markets.js (31-39)
    const cities = [
      // { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
      // { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
      // { name: 'Geelong', lat: -38.1499, lng: 144.3617 },
      // { name: 'Wollongong', lat: -34.4250, lng: 150.8900 },
      // { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
      // { name: 'Gold Coast', lat: -28.0167, lng: 153.4000 },
      // { name: 'Sunshine Coast', lat: -26.6500, lng: 153.0667 },
      // { name: 'Perth', lat: -31.9505, lng: 115.8605 },
      // { name: 'Fremantle', lat: -32.0569, lng: 115.7439 },
      // { name: 'Adelaide', lat: -34.9285, lng: 138.6007 },
      // { name: 'Hobart', lat: -42.8821, lng: 147.3272 },
      // { name: 'Canberra', lat: -35.2809, lng: 149.1300 },
      // { name: 'Darwin', lat: -12.4634, lng: 130.8456 },
      { name: 'Byron Bay', lat: -28.6474, lng: 153.6020 },
      // { name: 'Newcastle', lat: -32.9283, lng: 151.7817 },
      // { name: 'Cairns', lat: -16.9186, lng: 145.7781 },
    ];

    const LIMIT_PER_CITY = 20;
    const MAX_PAGES_PER_CITY = 3;
    // Option B: run multiple Nearby Search passes with focused keywords and merge results.
    // A long "keyword sentence" can under-return results depending on ranking, so splitting improves recall.
    const KEYWORD_QUERIES = [
      'farmers market',
      "farmer's market",
      'community market',
      'weekend market',
      'sunday market',
      'saturday market',
      'night market',
      'artisan market',
      'craft market',
      'flea market',
      'makers market',
      'handmade market',
    ];

    console.log('🧪 SEED MODE: Discovering local markets (limited per city)...\n');
    console.log(`📍 Cities: ${cities.length}`);
    console.log(`🎯 Limit per city: ${LIMIT_PER_CITY}\n`);

    const allPlaceIds = new Set(); // avoid duplicates across cities

    let batch = admin.firestore().batch();
    let batchCount = 0;

    let totalAdded = 0;
    let totalExisting = 0;
    let totalSkipped = 0;

    for (const city of cities) {
      console.log(`\n🏙️  ${city.name} (${city.lat}, ${city.lng})`);

      let cityAddedOrExisting = 0;

      for (const keyword of KEYWORD_QUERIES) {
        if (cityAddedOrExisting >= LIMIT_PER_CITY) break;

        console.log(`   🔎 Keyword: "${keyword}"`);

        let nextPageToken = null;
        let pageCount = 0;

        while (pageCount < MAX_PAGES_PER_CITY && cityAddedOrExisting < LIMIT_PER_CITY) {
          const searchParams = {
            location: `${city.lat},${city.lng}`,
            radius: 50000, // 50km
            type: 'point_of_interest',
            keyword,
            key: GOOGLE_MAPS_API_KEY,
          };

          if (nextPageToken) {
            searchParams.pagetoken = nextPageToken;
            // Google requires delay before using next_page_token
            await sleep(2000);
          }

          let searchResponse;
          try {
            searchResponse = await axios.get(
              'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
              { params: searchParams },
            );
          } catch (error) {
            console.error(`   ❌ Nearby search failed:`, error.message);
            break;
          }

          const status = searchResponse.data?.status;
          const results = searchResponse.data?.results || [];
          nextPageToken = searchResponse.data?.next_page_token || null;
          pageCount += 1;

          console.log(`      📄 Page ${pageCount}: ${status} (${results.length} results)`);

          if (status !== 'OK' && status !== 'ZERO_RESULTS') {
            if (status === 'INVALID_REQUEST') {
              // often pagination token not ready
              console.log(`      ⚠️  INVALID_REQUEST (pagination), stopping this keyword.`);
              break;
            }
            console.log(`      ⚠️  Status: ${status}`);
            break;
          }

          for (const place of results) {
            if (cityAddedOrExisting >= LIMIT_PER_CITY) break;
            if (!isLocalMarket(place)) continue;

            const placeId = place.place_id;
            if (!placeId) continue;

            // avoid duplicates across keywords/cities
            if (allPlaceIds.has(placeId)) continue;
            allPlaceIds.add(placeId);

            const marketRef = admin.firestore().collection('markets').doc(placeId);

            try {
              const existing = await marketRef.get();
              if (existing.exists) {
                totalExisting += 1;
                cityAddedOrExisting += 1;
                console.log(`      ↩️  Exists: ${existing.data()?.name || place.name || placeId}`);
                continue;
              }

              const marketData = await importPlaceDetails(placeId, GOOGLE_MAPS_API_KEY);
              if (!marketData) {
                totalSkipped += 1;
                continue;
              }

              batch.set(marketRef, marketData, { merge: true });
              batchCount += 1;
              totalAdded += 1;
              cityAddedOrExisting += 1;

              if (batchCount >= 450) {
                await batch.commit();
                console.log(`   📦 Committed batch (${totalAdded} added so far)...`);
                batch = admin.firestore().batch();
                batchCount = 0;
              }

              await sleep(60);
            } catch (error) {
              totalSkipped += 1;
              console.log(`      ❌ Failed: ${placeId} (${error.message})`);
            }
          }

          if (!nextPageToken) break;
        }
      }

      console.log(`   ✅ ${city.name}: ${cityAddedOrExisting}/${LIMIT_PER_CITY} seeded`);
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n📦 Committed final batch (${batchCount} writes)`);
    }

    console.log('\n✅ Seed complete!');
    console.log(`   ✅ Added: ${totalAdded}`);
    console.log(`   ↩️  Already existed: ${totalExisting}`);
    console.log(`   ⏭️  Skipped: ${totalSkipped}`);
  } catch (error) {
    console.error('❌ Seed script failed:', error);
    throw error;
  }
}

/**
 * Keyword-based market filtering
 * - Exclude hotels, resorts, supermarkets, malls
 * - Include only real local markets using keyword matching
 */
const STRONG_MARKET_REGEXES = [
  /\bfarmers?\s+market\b/i,
  /\bfarmer's\s+market\b/i,
  /\bcommunity\s+market\b/i,
  /\bweekend\s+market\b/i,
  /\bartisan\s+market\b/i,
  /\bcraft\s+market\b/i,
  /\bflea\s+market\b/i,
  /\bvillage\s+market\b/i,
  /\bgrowers?\s+market\b/i,
  /\bmakers?\s+market\b/i,
  /\bhandmade\s+market\b/i,
  /\bnight\s+market\b/i,
  /\bsunday\s+market\b/i,
  /\bsaturday\s+market\b/i,
  /\bpopup\s+market\b/i,
  /\bpop-up\s+market\b/i,
];

const MARKET_WORD_REGEX = /\bmarkets?\b/i;

const GROCERY_NAME_REGEXES = [
  /\b(supermarket|grocery|grocer|groceries)\b/i,
  /\b(woolworths|coles|aldi|costco|iga|foodworks|spudshed|drakes|foodland|spar)\b/i,
  /\b(harris\s*farm)\b/i,
  /\b(bottle\s*shop|liquor)\b/i,
  /\b(mini\s*mart|minimart|convenience)\b/i,
];

const EXCLUDE_KEYWORDS = [
  'shopping centre',
  'shopping center',
  'community_centre',
  'city_hall',
  'local_government_office',
  'mall',
];

function hasStrongMarketSignal(nameLower) {
  return STRONG_MARKET_REGEXES.some(r => r.test(nameLower));
}

function hasMarketWord(nameLower) {
  return MARKET_WORD_REGEX.test(nameLower);
}

function looksLikeGroceryName(nameLower) {
  return GROCERY_NAME_REGEXES.some(r => r.test(nameLower));
}

function countOpenDaysFromWeekdayText(weekdayText) {
  if (!Array.isArray(weekdayText)) return null;
  let openDays = 0;
  for (const line of weekdayText) {
    const lower = String(line || '').toLowerCase();
    if (!lower) continue;
    if (lower.includes('closed')) continue;
    openDays += 1;
  }
  return openDays;
}

function looksLikeGroceryFromDetails(place) {
  const nameLower = (place?.name || '').toLowerCase();
  const types = (place?.types || []).map(t => String(t).toLowerCase());

  if (looksLikeGroceryName(nameLower)) return true;

  const groceryTypes = [
    'grocery_or_supermarket',
    'supermarket',
    'convenience_store',
    'department_store',
    'liquor_store',
    'shopping_mall',
  ];
  if (groceryTypes.some(t => types.includes(t))) return true;

  if (hasMarketWord(nameLower) && !hasStrongMarketSignal(nameLower)) {
    const openDays = countOpenDaysFromWeekdayText(place?.opening_hours?.weekday_text);
    if (typeof openDays === 'number' && openDays >= 6) return true;
  }

  return false;
}

function isLocalMarket(place) {
  const name = (place.name || '').toLowerCase();
  const types = (place.types || []).map(t => t.toLowerCase());

  if (EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) return false;
  if (looksLikeGroceryName(name)) return false;

  const excludeTypes = [
    'lodging',
    'hotel',
    'shopping_mall',
    'supermarket',
    'grocery_or_supermarket',
    'convenience_store',
    'department_store',
    'liquor_store',
  ];
  if (excludeTypes.some(type => types.includes(type))) return false;

  if (hasStrongMarketSignal(name)) return true;
  return hasMarketWord(name);
}

async function importPlaceDetails(placeId, apiKey) {
  try {
    const detailsResponse = await axios.get(
      'https://maps.googleapis.com/maps/api/place/details/json',
      {
        params: {
          place_id: placeId,
          fields:
            'name,rating,user_ratings_total,photos,geometry,formatted_address,opening_hours,types,business_status,place_id',
          key: apiKey,
        },
      },
    );

    if (detailsResponse.data.status !== 'OK') {
      console.log(`      ⚠️  ${placeId}: ${detailsResponse.data.status}`);
      return null;
    }

    const place = detailsResponse.data.result;

    // Filter out 24-hour markets
    if (place.opening_hours && Array.isArray(place.opening_hours.weekday_text)) {
      const weekdayText = place.opening_hours.weekday_text;
      const is24Hours = weekdayText.every(day =>
        String(day).toLowerCase().includes('open 24 hours') ||
        String(day).toLowerCase().includes('24 hours'),
      );
      if (is24Hours) {
        console.log(`      ⏭️  Skipped (24 hours): ${place.name}`);
        return null;
      }
    }

    if (looksLikeGroceryFromDetails(place)) {
      console.log(`      ⏭️  Skipped (grocery-like): ${place.name}`);
      return null;
    }

    const address = place.formatted_address || '';
    let city = null;
    let state = null;

    const cityMatch1 = address.match(/(?:^|,\s*)([^,]+?),\s*([A-Z]{2,3})\s+\d+/);
    if (cityMatch1) {
      city = cityMatch1[1].trim();
      state = cityMatch1[2].trim();
    } else {
      const cityMatch2 = address.match(/(?:^|,\s*)([^,]+?),\s*([A-Z]{2,3})(?:\s|,|$)/);
      if (cityMatch2) {
        city = cityMatch2[1].trim();
        state = cityMatch2[2].trim();
      }
    }

    if (city) {
      city = city.replace(/\s+(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\s*$/, '').trim();
    }

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

    if (place.rating !== undefined) marketData.rating = place.rating;
    if (place.user_ratings_total !== undefined) marketData.user_ratings_total = place.user_ratings_total;

    if (place.photos && place.photos.length > 0) {
      marketData.photo_reference = place.photos[0].photo_reference;
      const storageUrl = await uploadPhotoToStorage(
        place.photos[0].photo_reference,
        placeId,
        apiKey,
      );
      if (storageUrl) marketData.photo_storage_url = storageUrl;
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

    console.log(`      ✅ Prepared: ${place.name} (${city || 'Unknown'})`);
    return marketData;
  } catch (error) {
    console.error(`      ❌ Error importing ${placeId}:`, error.message);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

if (require.main === module) {
  discoverAndImportMarkets5Each()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { discoverAndImportMarkets5Each };

