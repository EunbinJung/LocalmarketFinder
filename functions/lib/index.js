"use strict";
/**
 * Cloud Functions for Market Reaction Cycle Reset
 *
 * This function runs on a schedule to reset reaction counts every 7 days.
 *
 * ⚠️ IMPORTANT: This function does NOT modify the Firestore document structure.
 * It only updates the values within the existing structure.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetReactionCycles = exports.sendMarketAlerts = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * Scheduled function to reset reaction cycles every 7 days
 *
 * Trigger: Runs periodically (configure in Firebase Console)
 *
 * Logic:
 * 1. Check if now >= cycle.nextResetAt
 * 2. For each field in info document:
 *    - Copy current counts → previousCycle
 *    - Reset current counters to 0
 * 3. Update cycle timestamps
 *
 * Rules:
 * - Do NOT delete userReactions
 * - Do NOT change document shape
 * - Idempotent-safe (can run multiple times safely)
 */
/**
 * 마켓 알림 스케줄러
 *
 * 매분 실행 → 유저가 설정한 시각(HH:mm)과 정확히 일치하면 푸시 발송
 * 시간대: Australia/Sydney
 */
exports.sendMarketAlerts = functions.pubsub
    .schedule('every 1 minutes')
    .timeZone('Australia/Sydney')
    .onRun(async () => {
    var _a, _b, _c, _d;
    const now = new Date();
    // Sydney 현재 시각 → HH:mm 형식
    const sydneyDate = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
    const hh = String(sydneyDate.getHours()).padStart(2, '0');
    const mm = String(sydneyDate.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;
    // Sydney 기준 오늘 요일 (0=Sun ~ 6=Sat)
    const todayDay = sydneyDate.getDay();
    console.log(`[Alert] Sydney time: ${currentTime}, day: ${todayDay}`);
    // notifyEnabled=true이고 설정 시각이 지금인 항목만 조회
    let snap;
    try {
        snap = await db
            .collectionGroup('savedMarkets')
            .where('notifyEnabled', '==', true)
            .where('notifyTimeOfDay', '==', currentTime)
            .get();
    }
    catch (err) {
        console.error('[Alert] Query failed (index missing?):', err);
        return null;
    }
    if (snap.empty) {
        console.log(`[Alert] No matches for time: ${currentTime}`);
        return null;
    }
    for (const docSnap of snap.docs) {
        try {
            const data = docSnap.data();
            const rawOpenDays = data.notifyOpenDays;
            const openDays = Array.isArray(rawOpenDays) ? rawOpenDays : [];
            const leadDays = (_a = data.notifyLeadDays) !== null && _a !== void 0 ? _a : 1;
            // (오늘 + leadDays) 요일이 마켓 오픈 요일인지 확인
            const targetDay = (todayDay + leadDays) % 7;
            console.log(`[Alert] doc: ${docSnap.ref.path}, openDays: ${JSON.stringify(rawOpenDays)}, leadDays: ${leadDays}, targetDay: ${targetDay}, todayDay: ${todayDay}`);
            if (!openDays.includes(targetDay)) {
                console.log(`[Alert] Skipped — targetDay ${targetDay} not in openDays ${JSON.stringify(openDays)}`);
                continue;
            }
            const uid = (_b = docSnap.ref.parent.parent) === null || _b === void 0 ? void 0 : _b.id;
            const placeId = docSnap.id;
            if (!uid)
                continue;
            const marketSnap = await db.collection('markets').doc(placeId).get();
            const marketName = (_d = (_c = marketSnap.data()) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : 'A local market';
            const tokensSnap = await db.collection('users').doc(uid).collection('fcmTokens').get();
            if (tokensSnap.empty)
                continue;
            const alertDayText = leadDays === 0 ? 'today' : leadDays === 1 ? 'tomorrow' : `in ${leadDays} days`;
            for (const tokenDoc of tokensSnap.docs) {
                await admin.messaging().send({
                    token: tokenDoc.data().token,
                    notification: {
                        title: '📍 Upcoming Market',
                        body: `${marketName} opens ${alertDayText}!`,
                    },
                    apns: {
                        payload: { aps: { sound: 'default' } },
                    },
                });
            }
        }
        catch (err) {
            console.error('[Alert] Error:', docSnap.ref.path, err);
        }
    }
    return null;
});
exports.resetReactionCycles = functions.pubsub
    .schedule('every 24 hours')
    .timeZone('UTC')
    .onRun(async (_context) => {
    var _a, _b, _c, _d, _e, _f, _g;
    console.log('🔄 Starting reaction cycle reset check...');
    try {
        const now = firestore_1.Timestamp.now();
        const nowMillis = now.toMillis();
        // Get all markets
        const marketsSnapshot = await db.collection('markets').get();
        if (marketsSnapshot.empty) {
            console.log('ℹ️ No markets found');
            return null;
        }
        let resetCount = 0;
        let skippedCount = 0;
        // Process each market
        for (const marketDoc of marketsSnapshot.docs) {
            const placeId = marketDoc.id;
            const infoRef = db
                .collection('markets')
                .doc(placeId)
                .collection('details')
                .doc('info');
            const infoDoc = await infoRef.get();
            if (!infoDoc.exists) {
                console.log(`⏭️ Skipping ${placeId}: info document does not exist`);
                skippedCount++;
                continue;
            }
            const infoData = infoDoc.data();
            if (!infoData) {
                console.log(`⏭️ Skipping ${placeId}: info data is empty`);
                skippedCount++;
                continue;
            }
            // Check cycle metadata
            const cycle = infoData.cycle || {};
            const nextResetAt = cycle.nextResetAt;
            if (!nextResetAt) {
                console.log(`🆕 Initializing cycle for ${placeId} (no nextResetAt found)`);
                await infoRef.update({
                    'cycle.lastResetAt': now,
                    'cycle.nextResetAt': firestore_1.Timestamp.fromMillis(nowMillis + 7 * 24 * 60 * 60 * 1000),
                });
                skippedCount++;
                continue;
            }
            const nextResetMillis = nextResetAt.toMillis
                ? nextResetAt.toMillis()
                : nextResetAt._seconds * 1000;
            // Check if reset is needed
            if (nowMillis < nextResetMillis) {
                console.log(`⏭️ Skipping ${placeId}: reset not due yet (next: ${new Date(nextResetMillis).toISOString()})`);
                skippedCount++;
                continue;
            }
            // Perform reset
            console.log(`🔄 Resetting cycle for ${placeId}...`);
            const updateData = {};
            // List of all reaction fields
            const reactionFields = [
                'parking',
                'petFriendly',
                'reusable',
                'toilet',
                'liveMusic',
                'accessibility',
            ];
            let hasChanges = false;
            // Process each field
            for (const fieldName of reactionFields) {
                const fieldData = infoData[fieldName];
                if (!fieldData)
                    continue;
                // Special handling for parking field (Free, Paid, Street)
                if (fieldName === 'parking') {
                    const freeCount = (_a = fieldData.Free) !== null && _a !== void 0 ? _a : 0;
                    const paidCount = (_b = fieldData.Paid) !== null && _b !== void 0 ? _b : 0;
                    const streetCount = (_c = fieldData.Street) !== null && _c !== void 0 ? _c : 0;
                    const total = freeCount + paidCount + streetCount;
                    // Check if all counts are already 0
                    if (total === 0) {
                        console.log(`  ⏭️ Field ${fieldName}: already zero, skipping update`);
                        continue;
                    }
                    hasChanges = true;
                    // Copy current counts to previousCycle
                    const previousCyclePath = `previousCycle.${fieldName}`;
                    updateData[previousCyclePath] = {
                        Free: freeCount,
                        Paid: paidCount,
                        Street: streetCount,
                    };
                    // Reset current counts to 0
                    updateData[`${fieldName}.Free`] = 0;
                    updateData[`${fieldName}.Paid`] = 0;
                    updateData[`${fieldName}.Street`] = 0;
                    console.log(`  ✅ Field ${fieldName}: Free=${freeCount}, Paid=${paidCount}, Street=${streetCount} → previousCycle`);
                }
                else {
                    // Other fields: Handle both formats: {Yes, No} and {yes, no}
                    const yesCount = (_e = (_d = fieldData.Yes) !== null && _d !== void 0 ? _d : fieldData.yes) !== null && _e !== void 0 ? _e : 0;
                    const noCount = (_g = (_f = fieldData.No) !== null && _f !== void 0 ? _f : fieldData.no) !== null && _g !== void 0 ? _g : 0;
                    // Check if all counts are already 0
                    if (yesCount === 0 && noCount === 0) {
                        console.log(`  ⏭️ Field ${fieldName}: already zero, skipping update`);
                        continue;
                    }
                    hasChanges = true;
                    // Copy current counts to previousCycle
                    const previousCyclePath = `previousCycle.${fieldName}`;
                    updateData[previousCyclePath] = {
                        Yes: yesCount,
                        No: noCount,
                    };
                    // Reset current counts to 0
                    updateData[`${fieldName}.Yes`] = 0;
                    updateData[`${fieldName}.No`] = 0;
                    console.log(`  ✅ Field ${fieldName}: ${yesCount} Yes, ${noCount} No → previousCycle`);
                }
            }
            // Always advance the cycle when due (even if counts are already zero)
            updateData['cycle.lastResetAt'] = now;
            updateData['cycle.nextResetAt'] = firestore_1.Timestamp.fromMillis(nowMillis + 7 * 24 * 60 * 60 * 1000);
            updateData['lastUpdated'] = now;
            await infoRef.update(updateData);
            // Reset per-market userReactions + user-centric index for this market
            const userReactionsRef = infoRef.collection('userReactions');
            const userReactionsSnapshot = await userReactionsRef.get();
            if (!userReactionsSnapshot.empty) {
                // Firestore batch limit is 500; keep a safe margin.
                let batch = db.batch();
                let opCount = 0;
                for (const userDoc of userReactionsSnapshot.docs) {
                    // 1) delete markets/{placeId}/details/info/userReactions/{uid}
                    batch.delete(userDoc.ref);
                    opCount++;
                    // 2) delete userReactions/{uid}/reactions/{placeId} (My → Reactions index)
                    const uid = userDoc.id;
                    const userIndexRef = db
                        .collection('userReactions')
                        .doc(uid)
                        .collection('reactions')
                        .doc(placeId);
                    batch.delete(userIndexRef);
                    opCount++;
                    if (opCount >= 450) {
                        await batch.commit();
                        batch = db.batch();
                        opCount = 0;
                    }
                }
                if (opCount > 0) {
                    await batch.commit();
                }
                console.log(`  ✅ Deleted ${userReactionsSnapshot.size} per-market user reactions + cleared user indexes`);
            }
            resetCount++;
            if (hasChanges) {
                console.log(`  ✅ Reset counts + advanced cycle for ${placeId}`);
            }
            else {
                console.log(`  ✅ Advanced cycle for ${placeId} (counts already zero)`);
            }
        }
        console.log(`✅ Cycle reset complete: ${resetCount} markets reset, ${skippedCount} skipped`);
        return null;
    }
    catch (error) {
        console.error('❌ Error resetting reaction cycles:', error);
        throw error;
    }
});
//# sourceMappingURL=index.js.map