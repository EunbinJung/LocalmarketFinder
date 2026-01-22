# Firestore 데이터 로딩 확인

## Firestore 경로 구조

### 1. 마켓 데이터
- **경로**: `markets/{placeId}`
- **사용 위치**: 
  - `app/services/marketService.ts` - `getAllMarkets()`, `getMarket()`
  - `app/context/SearchContext.tsx` - 마켓 리스트 로딩

### 2. 마켓 상세 정보
- **경로**: `markets/{placeId}/details/info`
- **사용 위치**:
  - `app/services/marketDetailsService.ts` - `getMarketDetails()`, `saveMarketDetails()`
  - `app/services/reactionService.ts` - `getMarketInfo()`, `updateReactionInFirestore()`

### 3. 댓글
- **경로**: `markets/{placeId}/details/comments`
- **사용 위치**:
  - `app/services/marketDetailsService.ts` - `getMarketComments()`, `addMarketComment()`, `deleteMarketComment()`

### 4. 사용자 반응
- **경로**: `userReactions/{userId}/reactions/{placeId}`
- **사용 위치**:
  - `app/utils/reactionStorage.ts` - `getUserReaction()`, `setUserReaction()`

### 5. 사용자 댓글 ID
- **경로**: `userComments/{userId}/places/{placeId}`
- **사용 위치**:
  - `app/utils/commentStorage.ts` - `getUserCommentIds()`, `addUserCommentId()`

## 데이터 로딩 테스트

### 테스트 유틸리티 사용
```typescript
import { testFirestoreConnection } from '../utils/testFirestoreConnection';

// 앱에서 호출하여 Firestore 연결 및 데이터 로딩 확인
await testFirestoreConnection();
```

### 확인 사항

1. **마켓 컬렉션 존재 여부**
   - `markets` 컬렉션에 데이터가 있는지 확인
   - 각 마켓 문서에 `name`, `photos`, `rating` 등 필수 필드 확인

2. **상세 정보 문서 존재 여부**
   - `markets/{placeId}/details/info` 문서 존재 확인
   - 반응 카운트 필드 (`parking`, `petFriendly` 등) 확인

3. **댓글 서브컬렉션 확인**
   - `markets/{placeId}/details/comments` 컬렉션 확인
   - 댓글 구조 (`text`, `createdAt`, `anonymous`) 확인

4. **사용자 인증 확인**
   - Anonymous Authentication이 제대로 작동하는지 확인
   - 사용자별 반응/댓글 저장 경로 확인

## 문제 해결

### 데이터가 로드되지 않는 경우

1. **Firebase 설정 확인**
   - `.env` 파일에 Firebase 설정이 올바른지 확인
   - `app/services/firebase.ts`의 설정 검증 로그 확인

2. **Firestore 보안 규칙 확인**
   - 읽기 권한이 있는지 확인
   - Anonymous 사용자의 읽기/쓰기 권한 확인

3. **네트워크 연결 확인**
   - 오프라인 모드인지 확인
   - `enableNetwork(db)` 호출 확인

4. **경로 확인**
   - Firestore 콘솔에서 실제 경로 확인
   - 코드의 경로와 일치하는지 확인

## 초기화 스크립트

마켓 데이터가 없거나 상세 정보가 없는 경우:

```bash
cd scripts
node initialize_details_subcollections.js
```

특정 마켓만 초기화:
```bash
node initialize_details_subcollections.js place_id_1 place_id_2
```
