/**
 * Cloud Functions for Market Reaction Cycle Reset
 * 
 * This function runs on a schedule to reset reaction counts every 7 days.
 * 
 * ⚠️ IMPORTANT: This function does NOT modify the Firestore document structure.
 * It only updates the values within the existing structure.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled function to reset reaction cycles every 7 days
 * 
 * Trigger: Runs periodically (configure in Firebase Console)
 * 
 * Logic:
 * 1. Check if now >= cycle.nextResetAt
 * 2. For each field in info document:
 *    - Copy current counts → previousCycle
 *    - Reset current counters to 0
 * 3. Update cycle timestamps
 * 
 * Rules:
 * - Do NOT delete userReactions
 * - Do NOT change document shape
 * - Idempotent-safe (can run multiple times safely)
 */
export const resetReactionCycles = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('🔄 Starting reaction cycle reset check...');

    try {
      const now = admin.firestore.Timestamp.now();
      const nowMillis = now.toMillis();

      // Get all markets
      const marketsSnapshot = await db.collection('markets').get();

      if (marketsSnapshot.empty) {
        console.log('ℹ️ No markets found');
        return null;
      }

      let resetCount = 0;
      let skippedCount = 0;

      // Process each market
      for (const marketDoc of marketsSnapshot.docs) {
        const placeId = marketDoc.id;
        const infoRef = db
          .collection('markets')
          .doc(placeId)
          .collection('details')
          .doc('info');

        const infoDoc = await infoRef.get();

        if (!infoDoc.exists) {
          console.log(`⏭️ Skipping ${placeId}: info document does not exist`);
          skippedCount++;
          continue;
        }

        const infoData = infoDoc.data();
        if (!infoData) {
          console.log(`⏭️ Skipping ${placeId}: info data is empty`);
          skippedCount++;
          continue;
        }

        // Check cycle metadata
        const cycle = infoData.cycle || {};
        const nextResetAt = cycle.nextResetAt;

        if (!nextResetAt) {
          console.log(`⏭️ Skipping ${placeId}: no nextResetAt timestamp`);
          skippedCount++;
          continue;
        }

        const nextResetMillis = nextResetAt.toMillis
          ? nextResetAt.toMillis()
          : nextResetAt._seconds * 1000;

        // Check if reset is needed
        if (nowMillis < nextResetMillis) {
          console.log(
            `⏭️ Skipping ${placeId}: reset not due yet (next: ${new Date(nextResetMillis).toISOString()})`,
          );
          skippedCount++;
          continue;
        }

        // Perform reset
        console.log(`🔄 Resetting cycle for ${placeId}...`);

        const updateData: any = {};

        // List of all reaction fields
        const reactionFields = [
          'parking',
          'petFriendly',
          'reusable',
          'toilet',
          'liveMusic',
          'accessibility',
        ];

        let hasChanges = false;

        // Process each field
        for (const fieldName of reactionFields) {
          const fieldData = infoData[fieldName];
          if (!fieldData) continue;

          // Special handling for parking field (Free, Paid, Street)
          if (fieldName === 'parking') {
            const freeCount = fieldData.Free ?? 0;
            const paidCount = fieldData.Paid ?? 0;
            const streetCount = fieldData.Street ?? 0;
            const total = freeCount + paidCount + streetCount;

            // Check if all counts are already 0
            if (total === 0) {
              console.log(
                `  ⏭️ Field ${fieldName}: already zero, skipping update`,
              );
              continue;
            }

            hasChanges = true;

            // Copy current counts to previousCycle
            const previousCyclePath = `previousCycle.${fieldName}`;
            updateData[previousCyclePath] = {
              Free: freeCount,
              Paid: paidCount,
              Street: streetCount,
            };

            // Reset current counts to 0
            updateData[`${fieldName}.Free`] = 0;
            updateData[`${fieldName}.Paid`] = 0;
            updateData[`${fieldName}.Street`] = 0;

            console.log(
              `  ✅ Field ${fieldName}: Free=${freeCount}, Paid=${paidCount}, Street=${streetCount} → previousCycle`,
            );
          } else {
            // Other fields: Handle both formats: {Yes, No} and {yes, no}
            const yesCount = fieldData.Yes ?? fieldData.yes ?? 0;
            const noCount = fieldData.No ?? fieldData.no ?? 0;

            // Check if all counts are already 0
            if (yesCount === 0 && noCount === 0) {
              console.log(
                `  ⏭️ Field ${fieldName}: already zero, skipping update`,
              );
              continue;
            }

            hasChanges = true;

            // Copy current counts to previousCycle
            const previousCyclePath = `previousCycle.${fieldName}`;
            updateData[previousCyclePath] = {
              Yes: yesCount,
              No: noCount,
            };

            // Reset current counts to 0
            updateData[`${fieldName}.Yes`] = 0;
            updateData[`${fieldName}.No`] = 0;

            console.log(
              `  ✅ Field ${fieldName}: ${yesCount} Yes, ${noCount} No → previousCycle`,
            );
          }
        }

        // Always advance the cycle when due (even if counts are already zero)
        updateData['cycle.lastResetAt'] = now;
        updateData['cycle.nextResetAt'] = admin.firestore.Timestamp.fromMillis(
          nowMillis + 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        );
        updateData['lastUpdated'] = now;

        await infoRef.update(updateData);

        // Reset per-market userReactions + user-centric index for this market
        const userReactionsRef = infoRef.collection('userReactions');
        const userReactionsSnapshot = await userReactionsRef.get();

        if (!userReactionsSnapshot.empty) {
          // Firestore batch limit is 500; keep a safe margin.
          let batch = db.batch();
          let opCount = 0;

          for (const userDoc of userReactionsSnapshot.docs) {
            // 1) delete markets/{placeId}/details/info/userReactions/{uid}
            batch.delete(userDoc.ref);
            opCount++;

            // 2) delete userReactions/{uid}/reactions/{placeId} (My → Reactions index)
            const uid = userDoc.id;
            const userIndexRef = db
              .collection('userReactions')
              .doc(uid)
              .collection('reactions')
              .doc(placeId);
            batch.delete(userIndexRef);
            opCount++;

            if (opCount >= 450) {
              await batch.commit();
              batch = db.batch();
              opCount = 0;
            }
          }

          if (opCount > 0) {
            await batch.commit();
          }

          console.log(
            `  ✅ Deleted ${userReactionsSnapshot.size} per-market user reactions + cleared user indexes`,
          );
        }

        resetCount++;
        if (hasChanges) {
          console.log(`  ✅ Reset counts + advanced cycle for ${placeId}`);
        } else {
          console.log(`  ✅ Advanced cycle for ${placeId} (counts already zero)`);
        }
      }

      console.log(
        `✅ Cycle reset complete: ${resetCount} markets reset, ${skippedCount} skipped`,
      );

      return null;
    } catch (error) {
      console.error('❌ Error resetting reaction cycles:', error);
      throw error;
    }
  });
