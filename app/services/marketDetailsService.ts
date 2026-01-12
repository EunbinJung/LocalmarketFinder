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
  where,
  getDocs,
  getDocsFromCache,
  getDocsFromServer,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface MarketDetailData {
  place_id: string;
  name: string;
  location?: string;
  openDateAndTime?: string;
  socialLink?: string;
  petFriendly?: 'Yes' | 'No' | '리드 필수';
  reusable?: 'zero-waste' | 'compost bin 제공' | '개인 용기 사용 가능';
  toilet?: '있음' | '없음';
  liveMusic?: {
    available: 'yes' | 'no';
    time?: string;
  };
  parking?: {
    type: '무료' | '유료' | '주변 주차 정보 링크';
    link?: string;
  };
  accessibility?: {
    transportInfo?: string;
    wheelchairAccessible?: 'yes' | 'no';
  };
  comments?: Comment[];
  representativePhoto?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Comment {
  id: string;
  field?: string; // Which field this comment is about (e.g., 'petFriendly', 'parking', etc.)
  text: string;
  userId?: string;
  userName?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// Get market details
export async function getMarketDetails(
  placeId: string,
): Promise<MarketDetailData | null> {
  try {
    const docRef = doc(db, 'marketDetails', placeId);

    // 서버에서 먼저 시도, 실패하면 캐시에서 가져오기
    let docSnap;
    try {
      // 서버에서 가져오기 시도
      docSnap = await getDocFromServer(docRef);
    } catch (serverError: any) {
      // 서버 접근 실패 시 (오프라인 등) 캐시에서 가져오기 시도
      if (
        serverError?.code === 'unavailable' ||
        serverError?.code === 'failed-precondition'
      ) {
        console.log('📡 서버 접근 불가, 캐시에서 데이터 가져오기 시도...');
        try {
          docSnap = await getDocFromCache(docRef);
        } catch (cacheError) {
          // 캐시에도 없으면 일반 getDoc 사용 (자동으로 소스 선택)
          console.log('💾 캐시에도 없음, 기본 getDoc 사용...');
          docSnap = await getDoc(docRef);
        }
      } else {
        // 다른 에러는 일반 getDoc으로 재시도
        docSnap = await getDoc(docRef);
      }
    }

    if (docSnap.exists()) {
      return docSnap.data() as MarketDetailData;
    }
    return null;
  } catch (error: any) {
    // 오프라인 에러는 조용히 처리 (앱이 계속 작동하도록)
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
  data: Partial<MarketDetailData>,
): Promise<boolean> {
  try {
    const docRef = doc(db, 'marketDetails', placeId);
    const docSnap = await getDoc(docRef);

    const updateData = {
      ...data,
      place_id: placeId,
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
  comment: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string | null> {
  try {
    const commentsRef = collection(db, 'marketDetails', placeId, 'comments');
    const newComment = {
      ...comment,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(commentsRef, newComment);
    return docRef.id;
  } catch (error) {
    console.error('Error adding comment:', error);
    return null;
  }
}

// Get all comments for a market
export async function getMarketComments(placeId: string): Promise<Comment[]> {
  try {
    const commentsRef = collection(db, 'marketDetails', placeId, 'comments');

    // 서버에서 먼저 시도, 실패하면 캐시에서 가져오기
    let querySnapshot;
    try {
      querySnapshot = await getDocsFromServer(commentsRef);
    } catch (serverError: any) {
      if (
        serverError?.code === 'unavailable' ||
        serverError?.code === 'failed-precondition'
      ) {
        console.log('📡 서버 접근 불가, 캐시에서 댓글 가져오기 시도...');
        try {
          querySnapshot = await getDocsFromCache(commentsRef);
        } catch (cacheError) {
          querySnapshot = await getDocs(commentsRef);
        }
      } else {
        querySnapshot = await getDocs(commentsRef);
      }
    }

    const comments: Comment[] = [];

    querySnapshot.forEach(doc => {
      comments.push({
        id: doc.id,
        ...doc.data(),
      } as Comment);
    });

    return comments.sort((a, b) => {
      const aTime =
        a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
      const bTime =
        b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
      return bTime - aTime;
    });
  } catch (error: any) {
    // 오프라인 에러는 조용히 처리
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn('⚠️ 오프라인 상태: 댓글을 가져올 수 없습니다.');
      return [];
    }
    console.error('Error getting comments:', error);
    return [];
  }
}

// Update a specific field based on comments (admin function - for future)
export async function updateFieldFromComments(
  placeId: string,
  field: string,
  value: any,
): Promise<boolean> {
  try {
    const docRef = doc(db, 'marketDetails', placeId);
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
