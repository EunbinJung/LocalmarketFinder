"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetReactionCycles = exports.migrateExistingAlerts = exports.handleMarketAlertTask = exports.onSavedMarketWrite = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const firestore_1 = require("firebase-admin/firestore");
const tasks_1 = require("@google-cloud/tasks");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const tasksClient = new tasks_1.CloudTasksClient();
const PROJECT_ID = 'localmarketfinder-1f6d6';
const REGION = 'us-central1';
const QUEUE = 'market-alerts';
const FUNCTION_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/handleMarketAlertTask`;
// Shared secret to validate Cloud Tasks → handleMarketAlertTask calls
const TASK_SECRET = 'lmf-alert-secret-2024';
// ─── Timezone Helpers ─────────────────────────────────────────────────────────
function getSydneyComponents(date) {
    var _a;
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Australia/Sydney',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        weekday: 'short',
        hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const get = (t) => { var _a, _b; return (_b = (_a = parts.find(p => p.type === t)) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : '0'; };
    const dayMap = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return {
        year: +get('year'),
        month: +get('month'),
        day: +get('day'),
        hour: +get('hour') % 24,
        minute: +get('minute'),
        dayOfWeek: (_a = dayMap[get('weekday')]) !== null && _a !== void 0 ? _a : -1,
    };
}
/**
 * Convert a Sydney local date/time to a UTC Date.
 * Handles both AEST (UTC+10) and AEDT (UTC+11) automatically.
 */
function sydneyToUTC(year, month, day, hour, minute) {
    // Start with UTC+11 estimate (AEDT, Sydney's max offset)
    let utc = new Date(Date.UTC(year, month - 1, day, hour - 11, minute, 0, 0));
    // Verify actual Sydney hour; adjust 1 h if DST offset differs
    const check = getSydneyComponents(utc);
    if (check.hour !== hour) {
        utc = new Date(utc.getTime() + (hour - check.hour) * 3600000);
    }
    return utc;
}
/**
 * Given a user's notification settings, compute the next UTC datetime
 * at which a notification should fire (within the next 14 days).
 */
function computeNextAlertUTC(settings) {
    const { notifyOpenDays, notifyLeadDays, notifyTimeOfDay } = settings;
    if (!(notifyOpenDays === null || notifyOpenDays === void 0 ? void 0 : notifyOpenDays.length) || !notifyTimeOfDay)
        return null;
    const [targetHH, targetMM] = notifyTimeOfDay.split(':').map(Number);
    if (isNaN(targetHH) || isNaN(targetMM))
        return null;
    const now = new Date();
    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
        const probe = getSydneyComponents(new Date(now.getTime() + dayOffset * 86400000));
        const candidateUTC = sydneyToUTC(probe.year, probe.month, probe.day, targetHH, targetMM);
        // Skip if already in the past (allow 30-second buffer)
        if (candidateUTC.getTime() <= now.getTime() + 30000)
            continue;
        // Notification fires on day D; market opens on (D + leadDays) % 7
        const c = getSydneyComponents(candidateUTC);
        const targetOpenDay = (c.dayOfWeek + notifyLeadDays) % 7;
        if (!notifyOpenDays.includes(targetOpenDay))
            continue;
        return candidateUTC;
    }
    return null;
}
// ─── Cloud Tasks Helpers ──────────────────────────────────────────────────────
const queuePath = `projects/${PROJECT_ID}/locations/${REGION}/queues/${QUEUE}`;
async function createAlertTask(uid, placeId, scheduleTime) {
    var _a;
    const payload = JSON.stringify({ uid, placeId, secret: TASK_SECRET });
    const [task] = await tasksClient.createTask({
        parent: queuePath,
        task: {
            httpRequest: {
                httpMethod: 'POST',
                url: FUNCTION_URL,
                headers: { 'Content-Type': 'application/json' },
                body: Buffer.from(payload).toString('base64'),
            },
            scheduleTime: {
                seconds: Math.floor(scheduleTime.getTime() / 1000),
            },
        },
    });
    return (_a = task.name) !== null && _a !== void 0 ? _a : '';
}
async function deleteTask(taskName) {
    try {
        await tasksClient.deleteTask({ name: taskName });
    }
    catch (_a) {
        // Task already executed or deleted — safe to ignore
    }
}
// ─── Trigger: Schedule / Cancel Task When Settings Change ────────────────────
/**
 * Fires whenever a savedMarket document is created, updated, or deleted.
 * - Cancels the old pending task (if any).
 * - If notifications are enabled, schedules a new task for the next alert time.
 */
const NOTIFY_FIELDS = ['notifyEnabled', 'notifyOpenDays', 'notifyLeadDays', 'notifyTimeOfDay'];
exports.onSavedMarketWrite = functions.firestore
    .document('users/{uid}/savedMarkets/{placeId}')
    .onWrite(async (change, context) => {
    var _a, _b, _c;
    const { uid, placeId } = context.params;
    const oldData = change.before.exists ? change.before.data() : null;
    const newData = change.after.exists ? change.after.data() : null;
    // alertTaskName 업데이트만 있는 경우 → 무한루프 방지, 스킵
    const hasRelevantChange = NOTIFY_FIELDS.some(f => JSON.stringify(oldData === null || oldData === void 0 ? void 0 : oldData[f]) !== JSON.stringify(newData === null || newData === void 0 ? void 0 : newData[f]));
    if (!hasRelevantChange && change.before.exists && change.after.exists) {
        return null;
    }
    // Cancel the previously scheduled task
    if (oldData === null || oldData === void 0 ? void 0 : oldData.alertTaskName) {
        await deleteTask(oldData.alertTaskName);
    }
    // Document deleted or notifications turned off → nothing to schedule
    if (!newData || !newData.notifyEnabled) {
        if (change.after.exists) {
            await change.after.ref.update({
                alertTaskName: admin.firestore.FieldValue.delete(),
            });
        }
        return null;
    }
    const nextAlertUTC = computeNextAlertUTC({
        notifyOpenDays: (_a = newData.notifyOpenDays) !== null && _a !== void 0 ? _a : [],
        notifyLeadDays: (_b = newData.notifyLeadDays) !== null && _b !== void 0 ? _b : 1,
        notifyTimeOfDay: (_c = newData.notifyTimeOfDay) !== null && _c !== void 0 ? _c : '20:00',
    });
    if (!nextAlertUTC) {
        console.log(`[Schedule] No upcoming alert for ${uid}/${placeId}`);
        return null;
    }
    const taskName = await createAlertTask(uid, placeId, nextAlertUTC);
    await change.after.ref.update({ alertTaskName: taskName });
    console.log(`[Schedule] Next alert for ${uid}/${placeId}: ${nextAlertUTC.toISOString()}`);
    return null;
});
// ─── HTTP: Handle a Fired Alert Task ─────────────────────────────────────────
/**
 * Called by Cloud Tasks at the exact scheduled time.
 * Sends the FCM push notification, then schedules the next occurrence.
 */
exports.handleMarketAlertTask = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const { uid, placeId, secret } = req.body;
    if (secret !== TASK_SECRET) {
        res.status(403).send('Forbidden');
        return;
    }
    if (!uid || !placeId) {
        res.status(400).send('Missing uid or placeId');
        return;
    }
    const docRef = db
        .collection('users')
        .doc(uid)
        .collection('savedMarkets')
        .doc(placeId);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        res.status(200).send('Document not found');
        return;
    }
    const data = docSnap.data();
    if (!data.notifyEnabled) {
        await docRef.update({
            alertTaskName: admin.firestore.FieldValue.delete(),
        });
        res.status(200).send('Notifications disabled');
        return;
    }
    // ── Send FCM push notification ──────────────────────────────────────────
    const marketSnap = await db.collection('markets').doc(placeId).get();
    const marketName = (_b = (_a = marketSnap.data()) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : 'A local market';
    const leadDays = (_c = data.notifyLeadDays) !== null && _c !== void 0 ? _c : 1;
    const alertDayText = leadDays === 0 ? 'today' :
        leadDays === 1 ? 'tomorrow' :
            `in ${leadDays} days`;
    const tokensSnap = await db
        .collection('users')
        .doc(uid)
        .collection('fcmTokens')
        .get();
    await Promise.all(tokensSnap.docs.map(tokenDoc => admin.messaging().send({
        token: tokenDoc.data().token,
        notification: {
            title: '( . ̫ .)💗 Upcoming Market',
            body: `${marketName} opens ${alertDayText}!`,
        },
        apns: { payload: { aps: { sound: 'default' } } },
    }).catch(err => console.error('[Alert] FCM send error:', err))));
    console.log(`[Alert] Notification sent for ${uid}/${placeId}`);
    // ── Schedule the next occurrence ───────────────────────────────────────
    const nextAlertUTC = computeNextAlertUTC({
        notifyOpenDays: (_d = data.notifyOpenDays) !== null && _d !== void 0 ? _d : [],
        notifyLeadDays: (_e = data.notifyLeadDays) !== null && _e !== void 0 ? _e : 1,
        notifyTimeOfDay: (_f = data.notifyTimeOfDay) !== null && _f !== void 0 ? _f : '20:00',
    });
    if (nextAlertUTC) {
        const taskName = await createAlertTask(uid, placeId, nextAlertUTC);
        await docRef.update({ alertTaskName: taskName });
        console.log(`[Alert] Next scheduled: ${nextAlertUTC.toISOString()}`);
    }
    else {
        await docRef.update({
            alertTaskName: admin.firestore.FieldValue.delete(),
        });
        console.log(`[Alert] No next occurrence for ${uid}/${placeId}`);
    }
    res.status(200).send('ok');
});
// ─── One-time Migration: Backfill Tasks for Existing Users ───────────────────
/**
 * Call this ONCE after deployment to schedule tasks for users who already
 * have notifyEnabled=true (existing data before Cloud Tasks migration).
 *
 * Invoke: GET https://{region}-{project}.cloudfunctions.net/migrateExistingAlerts?secret=lmf-alert-secret-2024
 */
exports.migrateExistingAlerts = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c;
    if (req.query['secret'] !== TASK_SECRET) {
        res.status(403).send('Forbidden');
        return;
    }
    let scheduled = 0;
    let skipped = 0;
    // collectionGroup 단일 필드 쿼리는 자동 인덱스 미적용 → users 순회 방식 사용
    const usersSnap = await db.collection('users').get();
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const savedMarketsSnap = await db
            .collection('users')
            .doc(uid)
            .collection('savedMarkets')
            .where('notifyEnabled', '==', true)
            .get();
        for (const doc of savedMarketsSnap.docs) {
            const data = doc.data();
            // Already has a task — skip
            if (data.alertTaskName) {
                skipped++;
                continue;
            }
            const nextAlertUTC = computeNextAlertUTC({
                notifyOpenDays: (_a = data.notifyOpenDays) !== null && _a !== void 0 ? _a : [],
                notifyLeadDays: (_b = data.notifyLeadDays) !== null && _b !== void 0 ? _b : 1,
                notifyTimeOfDay: (_c = data.notifyTimeOfDay) !== null && _c !== void 0 ? _c : '20:00',
            });
            if (!nextAlertUTC) {
                skipped++;
                continue;
            }
            const taskName = await createAlertTask(uid, doc.id, nextAlertUTC);
            await doc.ref.update({ alertTaskName: taskName });
            scheduled++;
        }
    }
    console.log(`[Migrate] scheduled=${scheduled} skipped=${skipped}`);
    res.status(200).json({ scheduled, skipped });
});
// ─── Existing: Reaction Cycle Reset (unchanged) ───────────────────────────────
exports.resetReactionCycles = functions.pubsub
    .schedule('every 24 hours')
    .timeZone('UTC')
    .onRun(async (_context) => {
    var _a, _b, _c, _d, _e, _f, _g;
    console.log('🔄 Starting reaction cycle reset check...');
    try {
        const now = firestore_1.Timestamp.now();
        const nowMillis = now.toMillis();
        const marketsSnapshot = await db.collection('markets').get();
        if (marketsSnapshot.empty) {
            console.log('ℹ️ No markets found');
            return null;
        }
        let resetCount = 0;
        let skippedCount = 0;
        for (const marketDoc of marketsSnapshot.docs) {
            const placeId = marketDoc.id;
            const infoRef = db
                .collection('markets')
                .doc(placeId)
                .collection('details')
                .doc('info');
            const infoDoc = await infoRef.get();
            if (!infoDoc.exists) {
                skippedCount++;
                continue;
            }
            const infoData = infoDoc.data();
            if (!infoData) {
                skippedCount++;
                continue;
            }
            const cycle = infoData.cycle || {};
            const nextResetAt = cycle.nextResetAt;
            if (!nextResetAt) {
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
            if (nowMillis < nextResetMillis) {
                skippedCount++;
                continue;
            }
            const updateData = {};
            const reactionFields = [
                'parking',
                'petFriendly',
                'reusable',
                'toilet',
                'liveMusic',
                'accessibility',
            ];
            let hasChanges = false;
            for (const fieldName of reactionFields) {
                const fieldData = infoData[fieldName];
                if (!fieldData)
                    continue;
                if (fieldName === 'parking') {
                    const freeCount = (_a = fieldData.Free) !== null && _a !== void 0 ? _a : 0;
                    const paidCount = (_b = fieldData.Paid) !== null && _b !== void 0 ? _b : 0;
                    const streetCount = (_c = fieldData.Street) !== null && _c !== void 0 ? _c : 0;
                    if (freeCount + paidCount + streetCount === 0)
                        continue;
                    hasChanges = true;
                    updateData[`previousCycle.${fieldName}`] = {
                        Free: freeCount,
                        Paid: paidCount,
                        Street: streetCount,
                    };
                    updateData[`${fieldName}.Free`] = 0;
                    updateData[`${fieldName}.Paid`] = 0;
                    updateData[`${fieldName}.Street`] = 0;
                }
                else {
                    const yesCount = (_e = (_d = fieldData.Yes) !== null && _d !== void 0 ? _d : fieldData.yes) !== null && _e !== void 0 ? _e : 0;
                    const noCount = (_g = (_f = fieldData.No) !== null && _f !== void 0 ? _f : fieldData.no) !== null && _g !== void 0 ? _g : 0;
                    if (yesCount === 0 && noCount === 0)
                        continue;
                    hasChanges = true;
                    updateData[`previousCycle.${fieldName}`] = {
                        Yes: yesCount,
                        No: noCount,
                    };
                    updateData[`${fieldName}.Yes`] = 0;
                    updateData[`${fieldName}.No`] = 0;
                }
            }
            updateData['cycle.lastResetAt'] = now;
            updateData['cycle.nextResetAt'] = firestore_1.Timestamp.fromMillis(nowMillis + 7 * 24 * 60 * 60 * 1000);
            updateData.lastUpdated = now;
            await infoRef.update(updateData);
            const userReactionsRef = infoRef.collection('userReactions');
            const userReactionsSnapshot = await userReactionsRef.get();
            if (!userReactionsSnapshot.empty) {
                let batch = db.batch();
                let opCount = 0;
                for (const userDoc of userReactionsSnapshot.docs) {
                    batch.delete(userDoc.ref);
                    opCount++;
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
                if (opCount > 0)
                    await batch.commit();
            }
            resetCount++;
            console.log(hasChanges
                ? `✅ Reset counts + advanced cycle for ${placeId}`
                : `✅ Advanced cycle for ${placeId} (counts already zero)`);
        }
        console.log(`✅ Cycle reset complete: ${resetCount} reset, ${skippedCount} skipped`);
        return null;
    }
    catch (error) {
        console.error('❌ Error resetting reaction cycles:', error);
        throw error;
    }
});
//# sourceMappingURL=index.js.map