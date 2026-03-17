import messaging from '@react-native-firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db, ensureAuthenticated } from './firebase';

async function saveTokenToFirestore(token: string): Promise<void> {
  const uid = await ensureAuthenticated();
  await setDoc(doc(db, 'users', uid, 'fcmTokens', token), {
    token,
    platform: 'ios',
    updatedAt: new Date(),
  });
}

/**
 * 푸시 알림 권한 요청 및 FCM 토큰 등록
 */
export async function registerPushNotifications(): Promise<void> {
  try {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    let attempts = 0;
    const tryGetToken = async () => {
      try {
        await messaging().deleteToken();
        const token = await messaging().getToken();
        if (token) {
          await saveTokenToFirestore(token);
        }
      } catch (error) {
        if (attempts < 3) {
          attempts++;
          setTimeout(tryGetToken, 3000 * attempts);
        }
      }
    };

    await tryGetToken();
  } catch (error) {
    console.error('Error registering push notifications:', error);
  }
}

/**
 * FCM 토큰 갱신 시 자동으로 Firestore 업데이트
 */
export function setupTokenRefreshListener(): () => void {
  return messaging().onTokenRefresh(async (newToken) => {
    try {
      await saveTokenToFirestore(newToken);
    } catch (error) {
      console.error('Error refreshing FCM token:', error);
    }
  });
}
