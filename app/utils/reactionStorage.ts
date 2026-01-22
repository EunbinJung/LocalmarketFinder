import { getCurrentUserId, ensureAuthenticated } from '../services/firebase';

export type ReactionField =
  | 'parking'
  | 'petFriendly'
  | 'reusable'
  | 'toilet'
  | 'liveMusic'
  | 'accessibility';

export type ReactionValue = 'yes' | 'no' | null;

export interface UserReactions {
  [fieldName: string]: ReactionValue;
}

/**
 * Get user's reaction for a specific field
 * Uses Firebase Anonymous Authentication to identify users
 */
export async function getUserReaction(
  placeId: string,
  fieldName: ReactionField,
): Promise<ReactionValue> {
  try {
    const userId = await ensureAuthenticated();
    if (!userId) return null;

    // Store reactions in Firestore: /userReactions/{userId}/reactions/{placeId}
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');

    const reactionDocRef = doc(
      db,
      'userReactions',
      userId,
      'reactions',
      placeId,
    );
    const reactionDoc = await getDoc(reactionDocRef);

    if (reactionDoc.exists()) {
      const data = reactionDoc.data();
      return (data[fieldName] as ReactionValue) || null;
    }

    return null;
  } catch (error) {
    console.error('Error getting user reaction:', error);
    return null;
  }
}

/**
 * Set user's reaction for a specific field
 */
export async function setUserReaction(
  placeId: string,
  fieldName: ReactionField,
  reaction: ReactionValue,
): Promise<void> {
  try {
    const userId = await ensureAuthenticated();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');

    const reactionDocRef = doc(
      db,
      'userReactions',
      userId,
      'reactions',
      placeId,
    );

    // Get existing reactions
    const { getDoc } = await import('firebase/firestore');
    const existingDoc = await getDoc(reactionDocRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : {};

    // Update the specific field
    await setDoc(
      reactionDocRef,
      {
        ...existingData,
        [fieldName]: reaction,
        placeId,
        updatedAt: new Date(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Error setting user reaction:', error);
    throw error;
  }
}

/**
 * Get all user reactions for a place
 */
export async function getAllUserReactions(
  placeId: string,
): Promise<UserReactions> {
  try {
    const userId = await ensureAuthenticated();
    if (!userId) return {};

    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');

    const reactionDocRef = doc(
      db,
      'userReactions',
      userId,
      'reactions',
      placeId,
    );
    const reactionDoc = await getDoc(reactionDocRef);

    if (reactionDoc.exists()) {
      const data = reactionDoc.data();
      // Filter to only reaction fields
      const reactions: UserReactions = {};
      const fields: ReactionField[] = [
        'parking',
        'petFriendly',
        'reusable',
        'toilet',
        'liveMusic',
        'accessibility',
      ];
      fields.forEach(field => {
        if (data[field] !== undefined) {
          reactions[field] = data[field] as ReactionValue;
        }
      });
      return reactions;
    }

    return {};
  } catch (error) {
    console.error('Error getting all user reactions:', error);
    return {};
  }
}

/**
 * Clear all user reactions for a place
 */
export async function clearUserReactions(placeId: string): Promise<void> {
  try {
    const userId = await ensureAuthenticated();
    if (!userId) return;

    const { doc, deleteDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');

    const reactionDocRef = doc(
      db,
      'userReactions',
      userId,
      'reactions',
      placeId,
    );
    await deleteDoc(reactionDocRef);
  } catch (error) {
    console.error('Error clearing user reactions:', error);
  }
}
