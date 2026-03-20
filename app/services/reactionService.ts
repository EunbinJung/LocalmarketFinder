import {
  doc,
  getDoc,
  setDoc,
  increment,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import { ReactionField, ReactionValue } from '../utils/reactionStorage';
import { ensureAuthenticated } from './firebase';

export interface ReactionCounts {
  yes: number;
  no: number;
}

export interface MarketInfoData {
  parking?: ReactionCounts;
  petFriendly?: ReactionCounts;
  reusable?: ReactionCounts;
  toilet?: ReactionCounts;
  liveMusic?: ReactionCounts;
  accessibility?: ReactionCounts;
  lastUpdated?: Timestamp;
}


/**
 * 🆕 NEW: Get user reaction from userReactions subcollection
 * Path: markets/{place_id}/details/info/userReactions/{userId}
 * 
 * Special handling for parking field: returns 'Free', 'Paid', or 'Street' as string
 * Other fields: returns 'yes' or 'no' as ReactionValue
 */
export async function getUserReactionFromSubcollection(
  placeId: string,
  fieldName: ReactionField,
): Promise<ReactionValue | string | null> {
  try {
    const userId = await ensureAuthenticated();
    if (!userId) return null;

    const userReactionRef = doc(
      db,
      'markets',
      placeId,
      'details',
      'info',
      'userReactions',
      userId,
    );

    const userReactionDoc = await getDoc(userReactionRef);
    if (userReactionDoc.exists()) {
      const data = userReactionDoc.data();
      const value = data[fieldName];
      
      // Special handling for parking field
      if (fieldName === 'parking') {
        if (value === 'Free' || value === 'Paid' || value === 'Street') {
          return value;
        }
        return null;
      }
      
      // Other fields: map to ReactionValue
      if (value === 'Yes' || value === 'yes') return 'yes';
      if (value === 'No' || value === 'no') return 'no';
      return null;
    }

    return null;
  } catch (error) {
    console.error('Error getting user reaction from subcollection:', error);
    return null;
  }
}

/**
 * 🆕 NEW: Update reaction using Firestore transaction
 * This ensures atomic updates to both userReactions and info counters
 * 
 * Rules:
 * - First reaction: Increment selected counter
 * - Change reaction: Decrement previous, increment new
 * - Same reaction: No-op
 * 
 * Special handling for parking field: accepts 'Free', 'Paid', or 'Street'
 * Other fields: accepts 'yes' or 'no'
 */
export async function updateReactionWithTransaction(
  placeId: string,
  fieldName: ReactionField,
  reaction: ReactionValue | 'Free' | 'Paid' | 'Street' | null,
): Promise<void> {
  try {
    const userId = await ensureAuthenticated();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Special handling for parking field
    let firestoreValue: string | null = null;
    if (fieldName === 'parking') {
      // Parking field uses 'Free', 'Paid', 'Street'
      if (reaction === 'Free' || reaction === 'Paid' || reaction === 'Street') {
        firestoreValue = reaction;
      }
    } else {
      // Other fields: Map ReactionValue ('yes'/'no') to Firestore format ('Yes'/'No')
      firestoreValue = reaction === 'yes' ? 'Yes' : reaction === 'no' ? 'No' : null;
    }

    await runTransaction(db, async (transaction) => {
      const infoRef = doc(db, 'markets', placeId, 'details', 'info');
      const userReactionRef = doc(
        db,
        'markets',
        placeId,
        'details',
        'info',
        'userReactions',
        userId,
      );
      // User-centric "my activity" index (so we can show My → Reactions without scanning all markets)
      const userActivityRef = doc(db, 'userReactions', userId, 'reactions', placeId);

      // Read both documents
      const infoDoc = await transaction.get(infoRef);
      const userReactionDoc = await transaction.get(userReactionRef);

      // Get previous reaction from userReactions
      const previousValue = userReactionDoc.exists()
        ? (userReactionDoc.data()[fieldName] as string | undefined)
        : undefined;

      // Check if same reaction (no-op)
      if (previousValue === firestoreValue) {
        return; // No change needed
      }

      // Get current counts from info document
      const infoData = infoDoc.exists() ? (infoDoc.data() as any) : {};

      // Prepare updates for info document
      const infoUpdates: any = {
        lastUpdated: Timestamp.now(),
      };

      // Special handling for parking field
      if (fieldName === 'parking') {
        const hasField = !!infoData[fieldName];

        if (!hasField) {
          // First-time init: create the object (no nested increments to avoid conflicts)
          infoUpdates[fieldName] = {
            Free: firestoreValue === 'Free' ? 1 : 0,
            Paid: firestoreValue === 'Paid' ? 1 : 0,
            Street: firestoreValue === 'Street' ? 1 : 0,
            lastUpdated: Timestamp.now(),
          };
        } else {
          // Decrement previous reaction (if exists)
          if (
            previousValue === 'Free' ||
            previousValue === 'Paid' ||
            previousValue === 'Street'
          ) {
            infoUpdates[`${fieldName}.${previousValue}`] = increment(-1);
          }

          // Increment new reaction (if not null)
          if (
            firestoreValue === 'Free' ||
            firestoreValue === 'Paid' ||
            firestoreValue === 'Street'
          ) {
            infoUpdates[`${fieldName}.${firestoreValue}`] = increment(1);
          }

          infoUpdates[`${fieldName}.lastUpdated`] = Timestamp.now();
        }
      } else {
        const hasField = !!infoData[fieldName];

        if (!hasField) {
          // First-time init: create the object (no nested increments to avoid conflicts)
          infoUpdates[fieldName] = {
            Yes: firestoreValue === 'Yes' ? 1 : 0,
            No: firestoreValue === 'No' ? 1 : 0,
            lastUpdated: Timestamp.now(),
          };
        } else {
          // Decrement previous reaction (if exists)
          if (previousValue === 'Yes') {
            infoUpdates[`${fieldName}.Yes`] = increment(-1);
          } else if (previousValue === 'No') {
            infoUpdates[`${fieldName}.No`] = increment(-1);
          }

          // Increment new reaction (if not null)
          if (firestoreValue === 'Yes') {
            infoUpdates[`${fieldName}.Yes`] = increment(1);
          } else if (firestoreValue === 'No') {
            infoUpdates[`${fieldName}.No`] = increment(1);
          }

          infoUpdates[`${fieldName}.lastUpdated`] = Timestamp.now();
        }
      }

      // Update info document (create if missing)
      transaction.set(infoRef, infoUpdates, { merge: true });

      // Update userReactions document
      const userReactionData: any = {
        [fieldName]: firestoreValue,
        updatedAt: Timestamp.now(),
      };

      if (userReactionDoc.exists()) {
        // Merge with existing data
        const existingData = userReactionDoc.data();
        transaction.update(userReactionRef, {
          ...existingData,
          ...userReactionData,
        });
      } else {
        // Create new document
        transaction.set(userReactionRef, userReactionData);
      }

      // Also upsert user-centric reaction snapshot.
      // Store a simple, display-friendly value:
      // - parking: 'Free' | 'Paid' | 'Street' | null
      // - others: 'yes' | 'no' | null
      const legacyValue =
        fieldName === 'parking'
          ? reaction === 'Free' || reaction === 'Paid' || reaction === 'Street'
            ? reaction
            : null
          : reaction === 'yes' || reaction === 'no'
            ? reaction
            : null;

      transaction.set(
        userActivityRef,
        {
          placeId,
          updatedAt: Timestamp.now(),
          [fieldName]: legacyValue,
        },
        { merge: true },
      );
    });
  } catch (error) {
    console.error('Error updating reaction with transaction:', error);
    throw error;
  }
}

/**
 * Get market info data
 */
export async function getMarketInfo(
  placeId: string,
): Promise<MarketInfoData | null> {
  try {
    const infoRef = doc(db, 'markets', placeId, 'details', 'info');
    const infoDoc = await getDoc(infoRef);

    if (infoDoc.exists()) {
      return infoDoc.data() as MarketInfoData;
    }

    return null;
  } catch (error) {
    console.error('Error getting market info:', error);
    return null;
  }
}

/**
 * Get displayed value for a field — returns the winning option by cumulative count.
 * Parking: 'Free' | 'Paid' | 'Street' (highest count), or null if tied/empty.
 * Others: 'Yes' | 'No' (higher count), or null if tied/empty.
 */
export function getDisplayedValue(
  fieldName: ReactionField,
  marketInfo: MarketInfoData | null,
): 'Yes' | 'No' | 'Free' | 'Paid' | 'Street' | null {
  if (!marketInfo) return null;
  const counts = marketInfo[fieldName];
  if (!counts) return null;

  if (fieldName === 'parking') {
    const free = (counts as any).Free ?? 0;
    const paid = (counts as any).Paid ?? 0;
    const street = (counts as any).Street ?? 0;
    if (free === 0 && paid === 0 && street === 0) return null;
    const max = Math.max(free, paid, street);
    const winners = [free === max, paid === max, street === max].filter(Boolean).length;
    if (winners > 1) return null; // tie
    if (free === max) return 'Free';
    if (paid === max) return 'Paid';
    return 'Street';
  }

  const yes = (counts as any).Yes ?? (counts as any).yes ?? 0;
  const no = (counts as any).No ?? (counts as any).no ?? 0;
  if (yes === no) return null;
  return yes > no ? 'Yes' : 'No';
}

/**
 * Returns true if the field has no votes at all.
 */
export function isFieldEmpty(
  fieldName: ReactionField,
  marketInfo: MarketInfoData | null,
): boolean {
  if (!marketInfo) return true;
  const counts = marketInfo[fieldName];
  if (!counts) return true;

  if (fieldName === 'parking') {
    return (
      ((counts as any).Free ?? 0) === 0 &&
      ((counts as any).Paid ?? 0) === 0 &&
      ((counts as any).Street ?? 0) === 0
    );
  }

  return (
    ((counts as any).Yes ?? (counts as any).yes ?? 0) === 0 &&
    ((counts as any).No ?? (counts as any).no ?? 0) === 0
  );
}
