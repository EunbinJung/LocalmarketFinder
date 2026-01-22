const admin = require('firebase-admin');
const { initializeFirebaseAdmin } = require('./utils/firebaseAdmin');
const { initializeDetailsInfo, ensureCommentsSubcollection } = require('./utils/firestoreSubcollections');

/**
 * Initialize details subcollections for all markets or specific markets
 */
async function initializeAllMarkets(placeIds = null) {
  try {
    // Initialize Firebase Admin if not already initialized
    initializeFirebaseAdmin();

    let marketsRef = admin.firestore().collection('markets');
    
    if (placeIds && Array.isArray(placeIds)) {
      // Initialize specific markets
      console.log(`📝 Initializing ${placeIds.length} specific markets...`);
      for (const placeId of placeIds) {
        await initializeDetailsInfo(placeId);
        await ensureCommentsSubcollection(placeId);
      }
      console.log('✅ Initialization complete');
      return;
    }
    
    // Initialize all markets
    console.log('📝 Initializing all markets...');
    const marketsSnapshot = await marketsRef.get();
    
    let count = 0;
    for (const marketDoc of marketsSnapshot.docs) {
      const placeId = marketDoc.id;
      await initializeDetailsInfo(placeId);
      await ensureCommentsSubcollection(placeId);
      count++;
      
      if (count % 10 === 0) {
        console.log(`   Processed ${count} markets...`);
      }
    }
    
    console.log(`✅ Initialized ${count} markets`);
  } catch (error) {
    console.error('❌ Error initializing markets:', error);
    throw error;
  }
}

if (require.main === module) {
  // Get place IDs from command line arguments or initialize all
  const placeIds = process.argv.slice(2).length > 0 ? process.argv.slice(2) : null;
  
  initializeAllMarkets(placeIds)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = { initializeAllMarkets };
