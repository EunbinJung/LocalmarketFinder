import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableNetwork } from 'firebase/firestore';
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
      `❌ Firebase 설정 오류: 다음 환경 변수가 설정되지 않았습니다: ${missingVars.join(', ')}`,
    );
    console.error('⚠️ .env 파일을 확인하고 Firebase 설정을 완료하세요.');
    console.error('📝 GoogleService-Info.plist의 값을 .env 파일에 입력하세요.');
    // 개발 환경에서는 경고만 출력하고 계속 진행 (선택사항)
    // 프로덕션에서는 반드시 에러를 던져야 함
    if (__DEV__) {
      console.warn('⚠️ 개발 모드: Firebase 설정이 완전하지 않을 수 있습니다.');
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

if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    // 네트워크 연결 활성화 (오프라인 모드 방지) - 비동기로 처리
    enableNetwork(db)
      .then(() => {
        console.log('✅ Firebase 초기화 완료 (네트워크 연결 활성화)');
      })
      .catch(networkError => {
        console.warn('⚠️ 네트워크 연결 설정 중 경고:', networkError);
        console.log('✅ Firebase 초기화 완료 (오프라인 모드로 계속)');
      });
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
    throw error;
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);

  // 기존 인스턴스에서도 네트워크 연결 확인
  enableNetwork(db).catch(error => {
    // 네트워크 활성화 실패는 무시 (오프라인 모드로 계속)
    console.warn('⚠️ 네트워크 활성화 실패 (오프라인 모드로 계속):', error);
  });
}

export { db };
export default app;
