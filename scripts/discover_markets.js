// Load .env from root folder
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const admin = require('firebase-admin');
const axios = require('axios');
const { initializeFirebaseAdmin } = require('./utils/firebaseAdmin');
const { uploadPhotoToStorage } = require('./utils/photoStorage');

/**
 * Firebase + Google Places Market Import Script (Discover + Initializer 통합)
 * 
 * 목적: 호주 지역 마켓 정보를 Google Places API에서 가져와 Firestore에 저장
 * - Nearby Search → Place Details 호출 → Firestore 저장까지 한 번에 처리
 * - Script 3(Sync/Refresh)는 주기적 업데이트용으로 별도 운영
 */
async function discoverAndImportMarkets() {
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
      { name: 'Geelong', lat: -38.1499, lng: 144.3617 },
      { name: 'Wollongong', lat: -34.4250, lng: 150.8900 },
      { name: 'Brisbane', lat: -27.4698, lng: 153.0251 },
      { name: 'Gold Coast', lat: -28.0167, lng: 153.4000 },
      { name: 'Sunshine Coast', lat: -26.6500, lng: 153.0667 },
      { name: 'Perth', lat: -31.9505, lng: 115.8605 },
      { name: 'Fremantle', lat: -32.0569, lng: 115.7439 },
      { name: 'Adelaide', lat: -34.9285, lng: 138.6007 },
      { name: 'Hobart', lat: -42.8821, lng: 147.3272 },
      { name: 'Canberra', lat: -35.2809, lng: 149.1300 },
      { name: 'Darwin', lat: -12.4634, lng: 130.8456 },
      { name: 'Byron Bay', lat: -28.6474, lng: 153.6020 },
      { name: 'Newcastle', lat: -32.9283, lng: 151.7817 },
      { name: 'Cairns', lat: -16.9186, lng: 145.7781 },
    ];

    console.log('🔍 Discovering local markets from Google Places API...\n');
    console.log(`📍 Searching ${cities.length} cities\n`);

    let totalFound = 0;
    let totalAdded = 0;
    let totalSkipped = 0;
    const allPlaceIds = new Set(); // Track to avoid duplicates
    
    // 배치 처리용
    let batch = admin.firestore().batch();
    let batchCount = 0;

    for (const city of cities) {
      console.log(`\n🏙️  Searching: ${city.name} (${city.lat}, ${city.lng})`);
      
      let nextPageToken = null;
      let pageCount = 0;
      const maxPages = 3; // Limit pages per city to avoid quota issues

      do {
        try {
          // Nearby Search API
          // Use a more "event market" leaning keyword to reduce grocery/supermarket leakage.
          const searchParams = {
            location: `${city.lat},${city.lng}`,
            radius: 50000, // 50km radius
            type: 'point_of_interest',
            keyword:
              'farmers market community market weekend market night market sunday market friday market saturday market artisan market craft market flea market',
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

                  // Fetch detailed information and add to batch
                  const marketData = await importPlaceDetails(placeId, GOOGLE_MAPS_API_KEY);
                  if (marketData) {
                    const marketRef = admin.firestore().collection('markets').doc(placeId);
                    batch.set(marketRef, marketData, { merge: true });
                    batchCount++;
                    totalAdded++;

                    // 배치 커밋 (500개 단위)
                    if (batchCount >= 500) {
                      await batch.commit();
                      console.log(`   📦 Committed batch (${totalAdded} added so far)...`);
                      // 새 배치 생성
                      const newBatch = admin.firestore().batch();
                      batch = newBatch;
                      batchCount = 0;
                    }
                  } else {
                    totalSkipped++;
                  }

                  // Rate limiting: 50ms between requests
                  await new Promise(resolve => setTimeout(resolve, 50));
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

          // Rate limiting between pages: 2s (Google requirement)
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

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`   📦 Committed final batch...`);
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
 * Keyword-based market filtering
 * - Exclude hotels, resorts, supermarkets, malls
 * - Include only real local markets using keyword matching
 */
// Strong market patterns (event-style markets)
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

// Generic "market(s)" word (word boundary avoids matching "supermarket")
const MARKET_WORD_REGEX = /\bmarkets?\b/i;

// Grocery / retail chains & patterns to exclude (focus on "market" groceries)
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

  // Always exclude known grocery-like names / chains
  if (looksLikeGroceryName(nameLower)) return true;

  // Always exclude by types if Google marks it as a supermarket/grocery
  const groceryTypes = [
    'grocery_or_supermarket',
    'supermarket',
    'convenience_store',
    'department_store',
    'liquor_store',
    'shopping_mall',
  ];
  if (groceryTypes.some(t => types.includes(t))) return true;

  // Schedule heuristic: groceries are usually open 6-7 days.
  // We only apply this when the name is a generic "market" (not strong event market signal).
  if (hasMarketWord(nameLower) && !hasStrongMarketSignal(nameLower)) {
    const openDays = countOpenDaysFromWeekdayText(place?.opening_hours?.weekday_text);
    if (typeof openDays === 'number' && openDays >= 6) {
      return true;
    }
  }

  return false;
}

function isLocalMarket(place) {
  const name = (place.name || '').toLowerCase();
  const types = (place.types || []).map(t => t.toLowerCase());

  // 1. Exclude by name keywords
  if (EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword))) {
    return false;
  }

  // 2. Exclude by strong grocery-ish name patterns (word-boundary safe)
  if (looksLikeGroceryName(name)) {
    return false;
  }

  // 3. Exclude by place types
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

  if (excludeTypes.some(type => types.includes(type))) {
    return false;
  }

  // 4. Include only if it looks like a market.
  // Strong signals first; fallback to generic "market(s)" word.
  if (hasStrongMarketSignal(name)) return true;
  return hasMarketWord(name);
}

/**
 * Place Details 호출 및 Firestore 저장 데이터 준비
 * - 신규 마켓만 처리 (이미 존재하면 null 반환)
 * - 가져오는 필드: name, geometry, types, business_status, rating, user_ratings_total, photos, formatted_address, opening_hours, place_id
 * - Firestore 저장 데이터 반환 (배치 처리용)
 */
async function importPlaceDetails(placeId, apiKey) {
  try {
    // Check if already exists
    const marketRef = admin.firestore().collection('markets').doc(placeId);
    const existingDoc = await marketRef.get();

    if (existingDoc.exists) {
      // Already exists, skip (신규 마켓만 처리)
      return null;
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
      return null;
    }

    const place = detailsResponse.data.result;

    // Filter out 24-hour markets
    if (place.opening_hours && place.opening_hours.weekday_text) {
      const weekdayText = place.opening_hours.weekday_text;
      // Check if all days are "Open 24 hours"
      const is24Hours = weekdayText.every(day => 
        day.toLowerCase().includes('open 24 hours') || 
        day.toLowerCase().includes('24 hours')
      );
      if (is24Hours) {
        console.log(`      ⏭️  Skipped (24 hours): ${place.name}`);
        return null;
      }
    }

    // Extra filter: drop grocery-like places that slipped through Nearby Search
    if (looksLikeGroceryFromDetails(place)) {
      console.log(`      ⏭️  Skipped (grocery-like): ${place.name}`);
      return null;
    }

    // Extract city and state from formatted_address
    // Handle formats like: "123 Street, City Name NSW 2000, Australia" or "City Name NSW 2000"
    const address = place.formatted_address || '';
    let city = null;
    let state = null;
    
    // Try multiple patterns to extract city
    // Pattern 1: "Street, City State Postcode" or "City State Postcode"
    const cityMatch1 = address.match(/(?:^|,\s*)([^,]+?),\s*([A-Z]{2,3})\s+\d+/);
    if (cityMatch1) {
      city = cityMatch1[1].trim();
      state = cityMatch1[2].trim();
    } else {
      // Pattern 2: "City, State" (without postcode)
      const cityMatch2 = address.match(/(?:^|,\s*)([^,]+?),\s*([A-Z]{2,3})(?:\s|,|$)/);
      if (cityMatch2) {
        city = cityMatch2[1].trim();
        state = cityMatch2[2].trim();
      }
    }
    
    // Clean up city name (remove common suffixes)
    if (city) {
      city = city.replace(/\s+(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\s*$/, '').trim();
    }

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
      
      // Upload photo to Firebase Storage (유틸리티 사용)
      const storageUrl = await uploadPhotoToStorage(
        place.photos[0].photo_reference,
        placeId,
        apiKey,
      );
      if (storageUrl) {
        marketData.photo_storage_url = storageUrl;
      }
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

// Main 실행
if (require.main === module) {
  discoverAndImportMarkets()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { discoverAndImportMarkets };
