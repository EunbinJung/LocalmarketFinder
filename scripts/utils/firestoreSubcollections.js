

// Load .env from root folder (parent directory)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const admin = require('firebase-admin');
const { initializeFirebaseAdmin } = require('./firebaseAdmin');

/**
 * Initialize details/info subcollection for a market
 * User-owned, reaction-based counters with cycle tracking
 */
async function initializeDetailsInfo(placeId) {
  initializeFirebaseAdmin();
  const infoRef = admin
    .firestore()
    .collection('markets')
    .doc(placeId)
    .collection('details')
    .doc('info');

    const infoDoc = await infoRef.get();

  const now = admin.firestore.Timestamp.now();
  const nextResetAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
  );

    const initialInfo = {
      // Parking reactions
      parking: {
        Free: 0,
        Paid: 0,
        Street: 0,
        lastUpdated: now,
        previousCycle: {
          Free: 0,
          Paid: 0,
          Street: 0,
        },
      },

      // Pet Friendly reactions
      petFriendly: {
        Yes: 0,
        No: 0,
        LeashRequired: 0,
        lastUpdated: now,
        previousCycle: {
          Yes: 0,
          No: 0,
          LeashRequired: 0,
        },
      },

      // Reusable reactions
      reusable: {
        Yes: 0,
        No: 0,
        lastUpdated: now,
        previousCycle: {
          Yes: 0,
          No: 0,
        },
      },

      // Toilet reactions
      toilet: {
        Yes: 0,
        No: 0,
        lastUpdated: now,
        previousCycle: {
          Yes: 0,
          No: 0,
        },
      },

      // Live Music reactions
      liveMusic: {
        Yes: 0,
        No: 0,
        lastUpdated: now,
        previousCycle: {
          Yes: 0,
          No: 0,
        },
      },

      // Accessibility reactions
      accessibility: {
        Yes: 0,
        No: 0,
        lastUpdated: now,
        previousCycle: {
          Yes: 0,
          No: 0,
        },
      },

      // Cycle metadata
      cycle: {
        lastResetAt: now,
        nextResetAt: nextResetAt,
      },

      // Metadata
      updatedAt: now,
      source: 'user',
    };

    if (!infoDoc.exists) {
      // Create new document
      await infoRef.set(initialInfo);
      console.log(`✅ Initialized info for ${placeId}`);
    } else {
      // Update existing document with merge to preserve user data
      await infoRef.set(initialInfo, { merge: true });
      console.log(`✅ Updated info structure for ${placeId}`);
    }
    // console.log(`✅ Initialized info for ${placeId}`);
  }


/**
 * Ensure comments subcollection exists
 * Comments structure:
 * - text: string
 * - userId?: string (optional, for anonymous auth tracking)
 * - anonymous: true
 * - createdAt: Timestamp
 * - updatedAt?: Timestamp
 */
async function ensureCommentsSubcollection(placeId) {
  const commentsRef = admin
    .firestore()
    .collection('markets')
    .doc(placeId)
    .collection('details')
    .doc('comments');

  // Just verify the path exists (comments will be added by users)
  console.log(`✅ Comments subcollection ready for ${placeId}`);
}

module.exports = {
  initializeDetailsInfo,
  ensureCommentsSubcollection,
};
