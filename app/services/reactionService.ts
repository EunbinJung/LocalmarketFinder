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
  previousCycle?: {
    parking?: ReactionCounts;
    petFriendly?: ReactionCounts;
    reusable?: ReactionCounts;
    toilet?: ReactionCounts;
    liveMusic?: ReactionCounts;
    accessibility?: ReactionCounts;
  };
  cycleResetAt?: Timestamp;
  lastResetAt?: Timestamp;
  lastUpdated?: Timestamp;
}

export async function updateReactionInFirestore(
  placeId: string,
  fieldName: ReactionField,
  reaction: ReactionValue,
  previousReaction: ReactionValue | null,
): Promise<void> {
  try {
    const infoRef = doc(db, 'markets', placeId, 'details', 'info');

    // updateDoc fails if the doc doesn't exist, and nested field updates can conflict.
    // Compute next counts and write with setDoc(merge).
    const infoDoc = await getDoc(infoRef);
    const currentData = infoDoc.exists() ? (infoDoc.data() as any) : {};
    const currentCounts = (currentData?.[fieldName] as any) || {};

    const currentYes =
      typeof currentCounts?.yes === 'number'
        ? currentCounts.yes
        : typeof currentCounts?.Yes === 'number'
          ? currentCounts.Yes
          : 0;
    const currentNo =
      typeof currentCounts?.no === 'number'
        ? currentCounts.no
        : typeof currentCounts?.No === 'number'
          ? currentCounts.No
          : 0;

    let nextYes = currentYes;
    let nextNo = currentNo;

    if (previousReaction === 'yes') nextYes = Math.max(0, nextYes - 1);
    if (previousReaction === 'no') nextNo = Math.max(0, nextNo - 1);

    if (reaction === 'yes') nextYes += 1;
    if (reaction === 'no') nextNo += 1;

    await setDoc(
      infoRef,
      {
        lastUpdated: Timestamp.now(),
        [fieldName]: {
          yes: nextYes,
          no: nextNo,
        },
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Error updating reaction in Firestore:', error);
    throw error;
  }
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
 * Check if field has new info (current count differs from previous cycle)
 * ⚠️ KEEP EXISTING FUNCTION - DO NOT MODIFY
 * This function is still used by existing code
 */
export function hasNewInfo(
  fieldName: ReactionField,
  marketInfo: MarketInfoData | null,
): boolean {
  if (!marketInfo) return false;

  const currentCounts = marketInfo[fieldName];
  const previousCounts = marketInfo.previousCycle?.[fieldName];

  if (!currentCounts) return false;
  if (!previousCounts) {
    // If there's current data but no previous, it's new
    return currentCounts.yes > 0 || currentCounts.no > 0;
  }

  // Compare current with previous
  return (
    currentCounts.yes !== previousCounts.yes ||
    currentCounts.no !== previousCounts.no
  );
}

/**
 * 🆕 NEW: Get displayed value for a field using tie handling logic
 * 
 * Decision rules:
 * - If total === 0 → use previousCycle
 * - If Yes > No → display Yes
 * - If No > Yes → display No
 * - If tie → use previousCycle
 * 
 * Special handling for parking field: returns 'Free', 'Paid', or 'Street' (highest count)
 * Other fields: returns 'Yes' | 'No' | null
 */
export function getDisplayedValue(
  fieldName: ReactionField,
  marketInfo: MarketInfoData | null,
): 'Yes' | 'No' | 'Free' | 'Paid' | 'Street' | null {
  if (!marketInfo) return null;

  const currentCounts = marketInfo[fieldName];
  if (!currentCounts) return null;

  // Special handling for parking field
  if (fieldName === 'parking') {
    const freeCount = (currentCounts as any).Free ?? 0;
    const paidCount = (currentCounts as any).Paid ?? 0;
    const streetCount = (currentCounts as any).Street ?? 0;
    const total = freeCount + paidCount + streetCount;

    // If current cycle total is 0, use previous cycle
    if (total === 0) {
      const previousCounts = marketInfo.previousCycle?.[fieldName];
      if (!previousCounts) return null;

      const prevFree = (previousCounts as any).Free ?? 0;
      const prevPaid = (previousCounts as any).Paid ?? 0;
      const prevStreet = (previousCounts as any).Street ?? 0;
      const prevTotal = prevFree + prevPaid + prevStreet;

      if (prevTotal === 0) return null;
      
      // Find highest count in previous cycle
      const maxPrev = Math.max(prevFree, prevPaid, prevStreet);
      if (prevFree === maxPrev) return 'Free';
      if (prevPaid === maxPrev) return 'Paid';
      if (prevStreet === maxPrev) return 'Street';
      return null;
    }

    // Current cycle has data - find highest count
    const max = Math.max(freeCount, paidCount, streetCount);
    if (freeCount === max) return 'Free';
    if (paidCount === max) return 'Paid';
    if (streetCount === max) return 'Street';
    return null;
  }

  // Other fields: Yes/No format
  // Normalize to {Yes, No} format
  const yesCount = (currentCounts as any).Yes ?? (currentCounts as any).yes ?? 0;
  const noCount = (currentCounts as any).No ?? (currentCounts as any).no ?? 0;
  const total = yesCount + noCount;

  // If current cycle total is 0, use previous cycle
  if (total === 0) {
    const previousCounts = marketInfo.previousCycle?.[fieldName];
    if (!previousCounts) return null;

    const prevYes = (previousCounts as any).Yes ?? (previousCounts as any).yes ?? 0;
    const prevNo = (previousCounts as any).No ?? (previousCounts as any).no ?? 0;
    const prevTotal = prevYes + prevNo;

    if (prevTotal === 0) return null;
    return prevYes > prevNo ? 'Yes' : prevNo > prevYes ? 'No' : null;
  }

  // Current cycle has data
  if (yesCount > noCount) return 'Yes';
  if (noCount > yesCount) return 'No';
  
  // Tie - use previous cycle
  const previousCounts = marketInfo.previousCycle?.[fieldName];
  if (!previousCounts) return null;

  const prevYes = (previousCounts as any).Yes ?? (previousCounts as any).yes ?? 0;
  const prevNo = (previousCounts as any).No ?? (previousCounts as any).no ?? 0;
  
  if (prevYes > prevNo) return 'Yes';
  if (prevNo > prevYes) return 'No';
  return null;
}

/**
 * 🆕 NEW: Check if field has new info with tie handling
 * 
 * Show NEW badge ONLY IF:
 * - Current winner exists
 * - Current winner !== previous cycle winner
 * - Current cycle total > 0
 * 
 * Special handling for parking field: compares 'Free', 'Paid', 'Street' winners
 */
export function hasNewInfoWithTieHandling(
  fieldName: ReactionField,
  marketInfo: MarketInfoData | null,
): boolean {
  if (!marketInfo) return false;

  const currentCounts = marketInfo[fieldName];
  const previousCounts = marketInfo.previousCycle?.[fieldName];

  if (!currentCounts) return false;

  // Special handling for parking field
  if (fieldName === 'parking') {
    const freeCount = (currentCounts as any).Free ?? 0;
    const paidCount = (currentCounts as any).Paid ?? 0;
    const streetCount = (currentCounts as any).Street ?? 0;
    const total = freeCount + paidCount + streetCount;

    // Current cycle must have data
    if (total === 0) return false;

    // Determine current winner (highest count)
    let currentWinner: 'Free' | 'Paid' | 'Street' | null = null;
    const max = Math.max(freeCount, paidCount, streetCount);
    if (freeCount === max) currentWinner = 'Free';
    else if (paidCount === max) currentWinner = 'Paid';
    else if (streetCount === max) currentWinner = 'Street';

    // Compare with previous cycle winner
    if (!previousCounts) {
      // No previous cycle, but current has winner - it's new
      return currentWinner !== null;
    }

    const prevFree = (previousCounts as any).Free ?? 0;
    const prevPaid = (previousCounts as any).Paid ?? 0;
    const prevStreet = (previousCounts as any).Street ?? 0;
    const prevTotal = prevFree + prevPaid + prevStreet;

    if (prevTotal === 0) {
      // Previous cycle was empty, current has winner - it's new
      return currentWinner !== null;
    }

    // Determine previous winner
    let previousWinner: 'Free' | 'Paid' | 'Street' | null = null;
    const maxPrev = Math.max(prevFree, prevPaid, prevStreet);
    if (prevFree === maxPrev) previousWinner = 'Free';
    else if (prevPaid === maxPrev) previousWinner = 'Paid';
    else if (prevStreet === maxPrev) previousWinner = 'Street';

    // New info if winners differ
    return currentWinner !== previousWinner;
  }

  // Other fields: Yes/No format
  // Normalize to {Yes, No} format
  const yesCount = (currentCounts as any).Yes ?? (currentCounts as any).yes ?? 0;
  const noCount = (currentCounts as any).No ?? (currentCounts as any).no ?? 0;
  const total = yesCount + noCount;

  // Current cycle must have data
  if (total === 0) return false;

  // Determine current winner
  let currentWinner: 'Yes' | 'No' | null = null;
  if (yesCount > noCount) {
    currentWinner = 'Yes';
  } else if (noCount > yesCount) {
    currentWinner = 'No';
  } else {
    // Tie - use previous cycle
    if (!previousCounts) return false;
    const prevYes = (previousCounts as any).Yes ?? (previousCounts as any).yes ?? 0;
    const prevNo = (previousCounts as any).No ?? (previousCounts as any).no ?? 0;
    if (prevYes > prevNo) currentWinner = 'Yes';
    else if (prevNo > prevYes) currentWinner = 'No';
    else return false; // Both cycles are tied
  }

  // Compare with previous cycle winner
  if (!previousCounts) {
    // No previous cycle, but current has winner - it's new
    return currentWinner !== null;
  }

  const prevYes = (previousCounts as any).Yes ?? (previousCounts as any).yes ?? 0;
  const prevNo = (previousCounts as any).No ?? (previousCounts as any).no ?? 0;
  const prevTotal = prevYes + prevNo;

  if (prevTotal === 0) {
    // Previous cycle was empty, current has winner - it's new
    return currentWinner !== null;
  }

  // Determine previous winner
  let previousWinner: 'Yes' | 'No' | null = null;
  if (prevYes > prevNo) {
    previousWinner = 'Yes';
  } else if (prevNo > prevYes) {
    previousWinner = 'No';
  }

  // New info if winners differ
  return currentWinner !== previousWinner;
}

/**
 * 🆕 NEW: Check if field is in empty state
 * Returns true if both current and previous cycles have zero total
 * 
 * Special handling for parking field: checks Free, Paid, Street counts
 */
export function isFieldEmpty(
  fieldName: ReactionField,
  marketInfo: MarketInfoData | null,
): boolean {
  if (!marketInfo) return true;

  const currentCounts = marketInfo[fieldName];
  const previousCounts = marketInfo.previousCycle?.[fieldName];

  // Special handling for parking field
  if (fieldName === 'parking') {
    const freeCount = currentCounts ? (currentCounts as any).Free ?? 0 : 0;
    const paidCount = currentCounts ? (currentCounts as any).Paid ?? 0 : 0;
    const streetCount = currentCounts ? (currentCounts as any).Street ?? 0 : 0;
    const total = freeCount + paidCount + streetCount;

    const prevFree = previousCounts ? (previousCounts as any).Free ?? 0 : 0;
    const prevPaid = previousCounts ? (previousCounts as any).Paid ?? 0 : 0;
    const prevStreet = previousCounts ? (previousCounts as any).Street ?? 0 : 0;
    const prevTotal = prevFree + prevPaid + prevStreet;

    return total === 0 && prevTotal === 0;
  }

  // Other fields: Yes/No format
  // Normalize to {Yes, No} format
  const yesCount = currentCounts
    ? (currentCounts as any).Yes ?? (currentCounts as any).yes ?? 0
    : 0;
  const noCount = currentCounts
    ? (currentCounts as any).No ?? (currentCounts as any).no ?? 0
    : 0;
  const total = yesCount + noCount;

  const prevYes = previousCounts
    ? (previousCounts as any).Yes ?? (previousCounts as any).yes ?? 0
    : 0;
  const prevNo = previousCounts
    ? (previousCounts as any).No ?? (previousCounts as any).no ?? 0
    : 0;
  const prevTotal = prevYes + prevNo;

  return total === 0 && prevTotal === 0;
}
