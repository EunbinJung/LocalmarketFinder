import { ensureAuthenticated } from '../services/firebase';

/**
 * Get user's comment IDs for a place
 */
export async function getUserCommentIds(
  placeId: string,
): Promise<string[]> {
  try {
    const userId = await ensureAuthenticated();
    if (!userId) return [];

    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');

    const commentsRef = collection(db, 'users', userId, 'comments');
    const q = query(commentsRef, where('placeId', '==', placeId));
    const querySnapshot = await getDocs(q);

    const commentIds: string[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.commentId) {
        commentIds.push(data.commentId);
      }
    });

    return commentIds;
  } catch (error) {
    console.error('Error getting user comment IDs:', error);
    return [];
  }
}

/**
 * Add a comment ID to user's list
 */
export async function addUserCommentId(
  placeId: string,
  commentId: string,
): Promise<void> {
  try {
    const userId = await ensureAuthenticated();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const { doc, setDoc, Timestamp } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');

    const commentDocRef = doc(db, 'users', userId, 'comments', commentId);

    await setDoc(commentDocRef, {
      commentId,
      placeId,
      createdAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error adding user comment ID:', error);
    throw error;
  }
}

/**
 * Remove a comment ID from user's list
 */
export async function removeUserCommentId(
  placeId: string,
  commentId: string,
): Promise<void> {
  try {
    const userId = await ensureAuthenticated();
    if (!userId) return;

    const { doc, deleteDoc } = await import('firebase/firestore');
    const { db } = await import('../services/firebase');

    const commentDocRef = doc(db, 'users', userId, 'comments', commentId);
    await deleteDoc(commentDocRef);
  } catch (error) {
    console.error('Error removing user comment ID:', error);
  }
}

/**
 * Check if user owns a comment
 */
export async function isUserComment(
  placeId: string,
  commentId: string,
): Promise<boolean> {
  try {
    const commentIds = await getUserCommentIds(placeId);
    return commentIds.includes(commentId);
  } catch (error) {
    console.error('Error checking user comment:', error);
    return false;
  }
}
