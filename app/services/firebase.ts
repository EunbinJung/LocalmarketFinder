import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableNetwork } from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  FIREBASE_API_KEY,
  FIREBASE_APP_ID,
  FIREBASE_PROJECT_ID,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
} from '@env';

// Firebase configuration validation
const validateFirebaseConfig = () => {
  const requiredVars = {
    FIREBASE_API_KEY,
    FIREBASE_APP_ID,
    FIREBASE_PROJECT_ID,
    FIREBASE_AUTH_DOMAIN,
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => {
      // 값이 없거나, 'your_'로 시작하는 플레이스홀더인 경우
      if (!value || typeof value !== 'string') return true;
      if (value.includes('your_') || value.includes('_here')) return true;
      return false;
    })
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error(
      `Firebase config missing: ${missingVars.join(', ')}`,
    );
    if (__DEV__) {
      console.warn('DEV: Firebase config may be incomplete.');
    }
    throw new Error(
      `Missing Firebase configuration: ${missingVars.join(', ')}`,
    );
  }
};

// Validate configuration before initializing
validateFirebaseConfig();

// Firebase configuration
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // 네트워크 연결 활성화 (오프라인 모드 방지)
    enableNetwork(db).catch(() => {
      // 오프라인 모드로 계속 진행
    });

    // Anonymous Authentication 자동 로그인
    signInAnonymously(auth).catch(error => {
      console.error('Anonymous authentication failed:', error);
    });
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);

  // 기존 인스턴스에서도 네트워크 연결 확인
  enableNetwork(db).catch(() => {
    // 오프라인 모드로 계속 진행
  });

  // Anonymous Authentication 확인 및 자동 로그인
  onAuthStateChanged(auth, user => {
    if (!user) {
      signInAnonymously(auth).catch(error => {
        console.error('Anonymous authentication failed:', error);
      });
    }
  });
}

// Get current user ID (for reactions and comments)
export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null;
}

// Ensure user is authenticated
export async function ensureAuthenticated(): Promise<string> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  const userCredential = await signInAnonymously(auth);
  return userCredential.user.uid;
}

export { db, auth };
export default app;
