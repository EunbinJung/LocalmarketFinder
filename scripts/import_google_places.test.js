// Load .env from root folder
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const admin = require('firebase-admin');
const axios = require('axios');
const { initializeFirebaseAdmin } = require('./utils/firebaseAdmin');

/**
 * Test version: Import Google Places data for first 5 markets only
 * Use this for testing before running the full import
 */
async function importGooglePlacesTest() {
  try {
    // Initialize Firebase Admin if not already initialized
    initializeFirebaseAdmin();

    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
    }

    console.log('🧪 TEST MODE: Importing Google Places data (5 markets only)...\n');

    // Get first 5 markets from Firestore for testing
    const marketsRef = admin.firestore().collection('markets');
    const marketsSnapshot = await marketsRef.limit(5).get();

    console.log(`📊 Found ${marketsSnapshot.size} markets to process (TEST MODE)\n`);

    let count = 0;
    let updated = 0;
    let skipped = 0;
    const batch = admin.firestore().batch();
    let batchCount = 0;

    for (const marketDoc of marketsSnapshot.docs) {
      const placeId = marketDoc.id;
      const marketData = marketDoc.data();

      try {
        // Fetch place details from Google Places API
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/place/details/json`,
          {
            params: {
              place_id: placeId,
              fields: 'name,rating,user_ratings_total,photos,geometry,formatted_address,opening_hours,types,business_status,website',
              key: GOOGLE_MAPS_API_KEY,
            },
          }
        );

        if (response.data.status !== 'OK') {
          console.log(`   ⚠️  ${marketData.name || placeId}: ${response.data.status}`);
          skipped++;
          continue;
        }

        const placeDetails = response.data.result;
        const updateData = {};

        // Update rating
        if (placeDetails.rating !== undefined) {
          updateData.rating = placeDetails.rating;
        }

        // Update user_ratings_total
        if (placeDetails.user_ratings_total !== undefined) {
          updateData.user_ratings_total = placeDetails.user_ratings_total;
        }

        // Update photo_reference (first photo only)
        if (placeDetails.photos && placeDetails.photos.length > 0) {
          const firstPhoto = placeDetails.photos[0];
          if (firstPhoto.photo_reference) {
            updateData.photo_reference = firstPhoto.photo_reference;
          }
        }

        // Update formatted_address if available
        if (placeDetails.formatted_address) {
          updateData.formatted_address = placeDetails.formatted_address;
        }

        // Update opening_hours periods if available
        if (placeDetails.opening_hours && placeDetails.opening_hours.periods) {
          if (!updateData.opening_hours) {
            updateData.opening_hours = {};
          }
          updateData.opening_hours.periods = placeDetails.opening_hours.periods;
          updateData.opening_hours.weekday_text = placeDetails.opening_hours.weekday_text;
        }

        // Update types
        if (placeDetails.types) {
          updateData.types = placeDetails.types;
        }

        // Update business_status
        if (placeDetails.business_status) {
          updateData.business_status = placeDetails.business_status;
        }

        // Update website if available
if (placeDetails.website) {
  updateData.website = placeDetails.website;
}

        // Only update if there are changes
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.source = 'google';
          
          // Use merge to preserve existing data
          batch.set(marketDoc.ref, updateData, { merge: true });
          batchCount++;
          updated++;

          console.log(`   ✅ ${marketData.name || placeId}: rating=${placeDetails.rating || 'N/A'}, reviews=${placeDetails.user_ratings_total || 'N/A'}`);

          // Commit in batches of 500
          if (batchCount >= 500) {
            await batch.commit();
            console.log(`   📦 Committed batch (${updated} updated so far)...`);
            batchCount = 0;
          }
        } else {
          skipped++;
        }

        count++;

        // Rate limiting: wait 50ms between requests
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        console.error(`   ❌ Error processing ${marketData.name || placeId}:`, error.message);
        skipped++;
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`\n✅ TEST Import complete!`);
    console.log(`   📊 Total processed: ${count}`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`\n💡 To import all markets, run: node import_google_places.js`);
  } catch (error) {
    console.error('❌ Error importing Google Places data:', error);
    throw error;
  }
}

if (require.main === module) {
  importGooglePlacesTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { importGooglePlacesTest };
