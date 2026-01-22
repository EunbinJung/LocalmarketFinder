# Localmarket Finder Scripts

Scripts for managing Localmarket Finder Firebase data.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env` file (root folder):
```
GOOGLE_MAPS_API_KEY=your_api_key_here
FIREBASE_PROJECT_ID=localmarketfinder-1f6d6

# Firebase Admin SDK 인증 방법 (둘 중 하나 선택)
# 방법 1: Service Account Key 파일 사용 (권장)
SERVICE_ACCOUNT_KEY_PATH=scripts/serviceAccountKey.json

# 방법 2: Application Default Credentials 사용
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
# 또는: gcloud auth application-default login
```

3. Set up Firebase Admin credentials:

   **방법 1: Service Account Key 파일 사용 (권장)**
   1. Firebase Console → Project Settings → Service Accounts
   2. "Generate new private key" 클릭
   3. 다운로드한 JSON 파일을 `scripts/serviceAccountKey.json`에 저장
   4. `.env` 파일에 `SERVICE_ACCOUNT_KEY_PATH=scripts/serviceAccountKey.json` 추가

   **방법 2: Application Default Credentials 사용**
   ```bash
   gcloud auth application-default login
   ```

## Scripts

### `check_firebase_connection.js`
Test Firebase connection
```bash
npm run check
```

### `inspect_firestore_structure.js`
Inspect Firestore structure
```bash
npm run inspect
```

### `initialize_details_subcollections.js`
Initialize details subcollections for all markets or specific markets
```bash
# Initialize all markets
npm run init

# Initialize specific markets
node initialize_details_subcollections.js place_id_1 place_id_2
```

### `import_google_places.js`
Import data from Google Places API (all markets)
```bash
npm run import
```

### `import_google_places.test.js`
Test version: Import Google Places data for first 5 markets only
```bash
npm run import:test
```

### `discover_markets.js`
Discover and import new markets from Google Places API (all Australian cities)
```bash
npm run discover
```

### `discover_markets.test.js`
Test version: Discover markets from one city only (5 markets max)
```bash
npm run discover:test
```

## Data Model

### `/markets/{place_id}` (Google-owned fields)
- `place_id` (string, doc ID)
- `name`
- `formatted_address`
- `city?`
- `state?`
- `geometry.location.lat`
- `geometry.location.lng`
- `types` (array)
- `business_status?`
- `rating`
- `user_ratings_total` (reviews count)
- `photo_reference`
- `opening_hours.periods?`
- `opening_hours.weekday_text?`
- `createdAt?`
- `updatedAt?`
- `source: "google"`

### `/markets/{place_id}/details/info` (User-owned, reaction-based counters)
- `parking: {Free, Paid, Street, lastUpdated, previousCycle: {...}}`
- `petFriendly: {Yes, No, LeashRequired, lastUpdated, previousCycle: {...}}`
- `reusable: {ZeroWaste, CompostBin, OwnContainer, lastUpdated, previousCycle: {...}}`
- `toilet: {Yes, No, lastUpdated, previousCycle: {...}}`
- `liveMusic: {Yes, No, time?, lastUpdated, previousCycle: {...}}`
- `accessibility: {Far, Around, No, lastUpdated, previousCycle: {...}}`
- `description?`
- `cycle: {lastResetAt, nextResetAt}`
- `updatedAt?`
- `source: "user"`

### `/markets/{place_id}/details/comments/{commentId}` (User-owned)
- `text`
- `field?`
- `userId?`
- `anonymous: true`
- `createdAt`
- `updatedAt?`

## Utils

- `utils/firestoreSubcollections.js` - Utilities for managing Firestore subcollections
