import {
  collection,
  doc,
  getDoc,
  getDocFromCache,
  getDocFromServer,
  setDoc,
  updateDoc,
  addDoc,
  query,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface MarketDetailData {
  parking: {
    Free: 0,
    Paid: 0,
    Street: 0,
    lastUpdated: Timestamp,
    previousCycle: {
      Free: 0,
      Paid: 0,
      Street: 0,
    },
  petFriendly: {
    Yes: 0,
    No: 0,
    LeashRequired: 0,
    lastUpdated: Timestamp,
    previousCycle: {
      Yes: 0,
      No: 0,
      LeashRequired: 0,
    },
  },
  reusable: {
    Yes: 0,
    No: 0,
    lastUpdated: Timestamp,
    previousCycle: {
      Yes: 0,
      No: 0,
    },
  },
  toilet: {
    Yes: 0,
    No: 0,
    lastUpdated: Timestamp,
    previousCycle: {
      Yes: 0,
      No: 0,
    },
  },
  liveMusic: {
    Yes: 0,
    No: 0,
    lastUpdated: Timestamp,
    previousCycle: {
      Yes: 0,
      No: 0,
    },
  },
  accessibility: {
    Yes: 0,
    No: 0,
    lastUpdated: Timestamp,
    previousCycle: {
      Yes: 0,
      No: 0,
    },
  },
  cycle: {
    lastResetAt: Timestamp,
    nextResetAt: Timestamp,
  },
  updatedAt: Timestamp,
  source: 'user',
  comments: Comment[];
}
}

export interface Comment {
  id?: string;
  text: string,
  userId?: string,
  anonymous: true,
  createdAt: Timestamp,
  updatedAt?: Timestamp
}

// Get market details
export async function getMarketDetails(
  placeId: string,
): Promise<MarketDetailData | null> {
  try {
    const docRef = doc(db, 'markets', placeId, 'details', 'info');

    // Try server first, fallback to cache
    let docSnap;
    try {
      docSnap = await getDocFromServer(docRef);
    } catch (serverError: any) {
      // Fallback to cache if server unavailable
      if (
        serverError?.code === 'unavailable' ||
        serverError?.code === 'failed-precondition'
      ) {
        try {
          docSnap = await getDocFromCache(docRef);
        } catch {
          docSnap = await getDoc(docRef);
        }
      } else {
        docSnap = await getDoc(docRef);
      }
    }

    if (docSnap.exists()) {
      return docSnap.data() as MarketDetailData;
    }
    return null;
  } catch (error: any) {
    // Handle offline errors gracefully
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn('⚠️ 오프라인 상태: 마켓 상세 정보를 가져올 수 없습니다.');
      return null;
    }
    console.error('Error getting market details:', error);
    return null;
  }
}

// Create or update market details
export async function saveMarketDetails(
  placeId: string,
  website: string,
  location: string,
  dateAndTime: string[],
  data: Partial<MarketDetailData>,
): Promise<boolean> {
  try {
    const docRef = doc(db, 'markets', placeId, 'details', 'info');
    const docSnap = await getDoc(docRef);

    const updateData = {
      ...data,
      place_id: placeId,
      website: website,
      location: location,
      dateAndTime: dateAndTime,
      updatedAt: Timestamp.now(),
    };

    if (docSnap.exists()) {
      await updateDoc(docRef, updateData);
    } else {
      await setDoc(docRef, {
        ...updateData,
        createdAt: Timestamp.now(),
      });
    }
    return true;
  } catch (error) {
    console.error('Error saving market details:', error);
    return false;
  }
}

// Add a comment to a market
export async function addMarketComment(
  placeId: string,
  commentText: string,
): Promise<string | null> {
  try {
    const detailsDocRef = doc(db, 'markets', placeId, 'details', 'info');
    const commentsRef = collection(detailsDocRef, 'comments');
    
    // Get current user ID for comment ownership
    const { auth } = await import('./firebase');
    const userId = auth.currentUser?.uid || null;
    
    const newComment = {
      text: commentText,
      userId: userId,
      createdAt: Timestamp.now(),
      anonymous: true,
    };
    const docRef = await addDoc(commentsRef, newComment);
    
    // Store comment ID for user to allow deletion
    const { addUserCommentId } = await import('../utils/commentStorage');
    await addUserCommentId(placeId, docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    return null;
  }
}

// Get all comments for a market with pagination
export async function getMarketComments(
  placeId: string,
  limit: number = 20,
  lastCommentId?: string,
): Promise<Comment[]> {
  try {
    const detailsDocRef = doc(db, 'markets', placeId, 'details', 'info');
    const commentsRef = collection(detailsDocRef, 'comments');

    let q = query(commentsRef, orderBy('createdAt', 'desc'), firestoreLimit(limit));

    if (lastCommentId) {
      const lastDoc = doc(commentsRef, lastCommentId);
      const lastDocSnap = await getDoc(lastDoc);
      if (lastDocSnap.exists()) {
        q = query(q, startAfter(lastDocSnap));
      }
    }

    // Try server first, fallback to cache
    let querySnapshot;
    try {
      querySnapshot = await getDocsFromServer(q);
    } catch (serverError: any) {
      if (
        serverError?.code === 'unavailable' ||
        serverError?.code === 'failed-precondition'
      ) {
        try {
          querySnapshot = await getDocsFromCache(q);
        } catch {
          querySnapshot = await getDocs(q);
        }
      } else {
        querySnapshot = await getDocs(q);
      }
    }

    const comments: Comment[] = [];

    querySnapshot.forEach(commentDoc => {
      const data = commentDoc.data();
      comments.push({
        id: commentDoc.id,
        userId: data.userId,
        text: data.text,
        anonymous: data.anonymous,
        createdAt: data.createdAt,
        ...data,
      } as Comment);
    });

    return comments;
  } catch (error: any) {
    // Handle offline errors gracefully
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn('⚠️ 오프라인 상태: 댓글을 가져올 수 없습니다.');
      return [];
    }
    console.error('Error getting comments:', error);
    return [];
  }
}

// Delete a comment
export async function deleteMarketComment(
  placeId: string,
  commentId: string,
): Promise<boolean> {
  try {
    const { doc: docFn, deleteDoc } = await import('firebase/firestore');
    const detailsDocRef = docFn(db, 'markets', placeId, 'details', 'info');
    const commentRef = docFn(detailsDocRef, 'comments', commentId);
    await deleteDoc(commentRef);
    
    // Remove from user's comment IDs
    const { removeUserCommentId } = await import('../utils/commentStorage');
    await removeUserCommentId(placeId, commentId);
    
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}

// Update a specific field based on comments (admin function - for future)
export async function updateFieldFromComments(
  placeId: string,
  field: string,
  value: any,
): Promise<boolean> {
  try {
    const docRef = doc(db, 'markets', placeId, 'details', 'info');
    await updateDoc(docRef, {
      [field]: value,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error('Error updating field from comments:', error);
    return false;
  }
}
