#!/bin/sh
set -e

# ─── GoogleService-Info.plist 생성 ────────────────────────────────────────────
# Xcode Cloud 환경변수에서 Firebase 설정을 읽어 plist 파일을 생성합니다.
# 필요한 환경변수 (App Store Connect → Xcode Cloud → Workflow → Environment):
#   FIREBASE_API_KEY
#   FIREBASE_GCM_SENDER_ID
#   FIREBASE_PROJECT_ID
#   FIREBASE_STORAGE_BUCKET
#   FIREBASE_APP_ID

PLIST_PATH="$CI_PRIMARY_REPOSITORY_PATH/ios/localmarketfinder/GoogleService-Info.plist"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>API_KEY</key>
	<string>${FIREBASE_API_KEY}</string>
	<key>GCM_SENDER_ID</key>
	<string>${FIREBASE_GCM_SENDER_ID}</string>
	<key>PLIST_VERSION</key>
	<string>1</string>
	<key>BUNDLE_ID</key>
	<string>com.localmarketfinder.app</string>
	<key>PROJECT_ID</key>
	<string>${FIREBASE_PROJECT_ID}</string>
	<key>STORAGE_BUCKET</key>
	<string>${FIREBASE_STORAGE_BUCKET}</string>
	<key>IS_ADS_ENABLED</key>
	<false></false>
	<key>IS_ANALYTICS_ENABLED</key>
	<false></false>
	<key>IS_APPINVITE_ENABLED</key>
	<true></true>
	<key>IS_GCM_ENABLED</key>
	<true></true>
	<key>IS_SIGNIN_ENABLED</key>
	<true></true>
	<key>GOOGLE_APP_ID</key>
	<string>${FIREBASE_APP_ID}</string>
</dict>
</plist>
EOF

echo "✅ GoogleService-Info.plist generated at $PLIST_PATH"
