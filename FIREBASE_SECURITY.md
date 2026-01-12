# Firebase 보안 가이드

## 🔒 보안 체크리스트

### 1. 환경 변수 보안

✅ **완료된 사항:**
- `.env` 파일이 `.gitignore`에 포함되어 있음
- Firebase 설정에 환경 변수 검증 추가
- GoogleService-Info.plist 기반으로 설정 완료

⚠️ **주의사항:**
- `.env` 파일은 절대 Git에 커밋하지 마세요
- API 키를 코드에 하드코딩하지 마세요
- 프로덕션과 개발 환경의 API 키를 분리하세요

### 2. Firebase Firestore 보안 규칙

Firebase Console에서 다음 보안 규칙을 설정하세요:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Market details - 모든 사용자가 읽을 수 있음, 인증된 사용자만 작성 가능
    match /marketDetails/{marketId} {
      allow read: if true;
      allow create, update: if request.auth != null;
      allow delete: if false; // 삭제는 관리자만 가능하도록 설정 (향후 개선)
      
      // Comments subcollection
      match /comments/{commentId} {
        allow read: if true;
        allow create: if request.auth != null || 
          (request.resource.data.keys().hasAll(['text', 'field']) &&
           request.resource.data.text is string &&
           request.resource.data.text.size() > 0 &&
           request.resource.data.text.size() <= 1000);
        allow update, delete: if request.auth != null && 
          (request.auth.uid == resource.data.userId || 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
      }
    }
    
    // 향후 사용자 인증을 위한 규칙
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. API 키 제한 설정 (Firebase Console)

1. **Google Cloud Console**에서 API 키 제한 설정:
   - [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - API 키 선택 → "애플리케이션 제한사항" 설정
   - iOS 앱의 Bundle ID로 제한: `com.firstProject.LocalmarketFinder`
   - "API 제한사항"에서 필요한 API만 허용:
     - Firebase Installations API
     - Firebase Remote Config API
     - Cloud Firestore API

2. **Firebase Console**에서 앱 체크:
   - Project Settings → General
   - 앱이 올바르게 등록되어 있는지 확인

### 4. 데이터 검증

현재 구현된 검증:
- ✅ Firebase 설정 값 검증 (firebase.ts)
- ✅ 댓글 길이 제한 (1000자)
- ✅ 필수 필드 검증

추가 권장사항:
- 서버 측 검증 추가 (Cloud Functions)
- 스팸 방지 (rate limiting)
- 부적절한 콘텐츠 필터링

### 5. 현재 설정 정보

**프로젝트 정보:**
- Project ID: `localmarketfinder-1f6d6`
- Bundle ID: `com.firstProject.LocalmarketFinder`
- App ID: `1:87735210907:ios:5b22695fa0401438a2873e`

**환경 변수 위치:**
- `.env` 파일 (Git에 커밋되지 않음)
- GoogleService-Info.plist (iOS 네이티브 설정)

### 6. 프로덕션 배포 전 체크리스트

- [ ] Firestore 보안 규칙 설정 완료
- [ ] API 키 제한 설정 완료
- [ ] 프로덕션용 별도 Firebase 프로젝트 생성 (권장)
- [ ] 환경 변수 분리 (개발/프로덕션)
- [ ] 에러 로깅 설정 (Firebase Crashlytics)
- [ ] 사용량 모니터링 설정
- [ ] 백업 전략 수립

### 7. 문제 해결

**"Firebase: Error (auth/configuration-not-found)"**
- `.env` 파일이 프로젝트 루트에 있는지 확인
- Metro bundler 재시작: `npm start -- --reset-cache`
- 앱 재빌드: `npm run ios`

**"Firebase: Error (permission-denied)"**
- Firestore 보안 규칙 확인
- 데이터베이스가 생성되었는지 확인
- 테스트 모드로 시작했는지 확인

**API 키 노출 우려**
- 클라이언트 측 API 키는 완전히 숨길 수 없음 (정상)
- API 키 제한 설정으로 보안 강화
- Firestore 보안 규칙으로 데이터 접근 제어

## 📚 추가 리소스

- [Firebase 보안 모범 사례](https://firebase.google.com/docs/rules/best-practices)
- [Firestore 보안 규칙 가이드](https://firebase.google.com/docs/firestore/security/get-started)
- [API 키 보호 가이드](https://cloud.google.com/docs/authentication/api-keys)

