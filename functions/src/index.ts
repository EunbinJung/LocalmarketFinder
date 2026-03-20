import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { CloudTasksClient } from '@google-cloud/tasks';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();
const tasksClient = new CloudTasksClient();

const PROJECT_ID = 'localmarketfinder-1f6d6';
const REGION = 'us-central1';
const QUEUE = 'market-alerts';
const FUNCTION_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/handleMarketAlertTask`;

// Shared secret to validate Cloud Tasks → handleMarketAlertTask calls
const TASK_SECRET = 'lmf-alert-secret-2024';

// ─── Timezone Helpers ─────────────────────────────────────────────────────────

function getSydneyComponents(date: Date) {
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
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '0';
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: +get('year'),
    month: +get('month'),
    day: +get('day'),
    hour: +get('hour') % 24,
    minute: +get('minute'),
    dayOfWeek: dayMap[get('weekday')] ?? -1,
  };
}

/**
 * Convert a Sydney local date/time to a UTC Date.
 * Handles both AEST (UTC+10) and AEDT (UTC+11) automatically.
 */
function sydneyToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  // Start with UTC+11 estimate (AEDT, Sydney's max offset)
  let utc = new Date(Date.UTC(year, month - 1, day, hour - 11, minute, 0, 0));
  // Verify actual Sydney hour; adjust 1 h if DST offset differs
  const check = getSydneyComponents(utc);
  if (check.hour !== hour) {
    utc = new Date(utc.getTime() + (hour - check.hour) * 3_600_000);
  }
  return utc;
}

/**
 * Given a user's notification settings, compute the next UTC datetime
 * at which a notification should fire (within the next 14 days).
 */
function computeNextAlertUTC(settings: {
  notifyOpenDays: number[];
  notifyLeadDays: number;
  notifyTimeOfDay: string;
}): Date | null {
  const { notifyOpenDays, notifyLeadDays, notifyTimeOfDay } = settings;
  if (!notifyOpenDays?.length || !notifyTimeOfDay) return null;

  const [targetHH, targetMM] = notifyTimeOfDay.split(':').map(Number);
  if (isNaN(targetHH) || isNaN(targetMM)) return null;

  const now = new Date();

  for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
    const probe = getSydneyComponents(
      new Date(now.getTime() + dayOffset * 86_400_000),
    );
    const candidateUTC = sydneyToUTC(
      probe.year, probe.month, probe.day, targetHH, targetMM,
    );

    // Skip if already in the past (allow 5-second buffer)
    if (candidateUTC.getTime() <= now.getTime() + 5_000) continue;

    // Notification fires on day D; market opens on (D + leadDays) % 7
    const c = getSydneyComponents(candidateUTC);
    const targetOpenDay = (c.dayOfWeek + notifyLeadDays) % 7;
    if (!notifyOpenDays.includes(targetOpenDay)) continue;

    return candidateUTC;
  }

  return null;
}

// ─── Cloud Tasks Helpers ──────────────────────────────────────────────────────

const queuePath =
  `projects/${PROJECT_ID}/locations/${REGION}/queues/${QUEUE}`;

function generateNonce(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function createAlertTask(
  uid: string,
  placeId: string,
  scheduleTime: Date,
  nonce: string,
): Promise<string> {
  const payload = JSON.stringify({ uid, placeId, secret: TASK_SECRET, nonce });
  const [task] = await tasksClient.createTask({
    parent: queuePath,
    task: {
      httpRequest: {
        httpMethod: 'POST' as const,
        url: FUNCTION_URL,
        headers: { 'Content-Type': 'application/json' },
        body: Buffer.from(payload).toString('base64'),
      },
      scheduleTime: {
        seconds: Math.floor(scheduleTime.getTime() / 1000),
      },
    },
  });
  return task.name ?? '';
}

async function deleteTask(taskName: string): Promise<void> {
  try {
    await tasksClient.deleteTask({ name: taskName });
  } catch {
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

export const onSavedMarketWrite = functions.firestore
  .document('users/{uid}/savedMarkets/{placeId}')
  .onWrite(async (change, context) => {
    const { uid, placeId } = context.params;

    const oldData = change.before.exists ? change.before.data() : null;
    const newData = change.after.exists ? change.after.data() : null;

    // alertTaskName 업데이트만 있는 경우 → 무한루프 방지, 스킵
    const hasRelevantChange = NOTIFY_FIELDS.some(
      f => JSON.stringify(oldData?.[f]) !== JSON.stringify(newData?.[f]),
    );
    if (!hasRelevantChange && change.before.exists && change.after.exists) {
      return null;
    }

    // Cancel the previously scheduled task
    if (oldData?.alertTaskName) {
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

    console.log(`[Schedule] Settings: openDays=${JSON.stringify(newData.notifyOpenDays)}, leadDays=${newData.notifyLeadDays}, timeOfDay=${newData.notifyTimeOfDay}, nowUTC=${new Date().toISOString()}`);
    const nextAlertUTC = computeNextAlertUTC({
      notifyOpenDays: newData.notifyOpenDays ?? [],
      notifyLeadDays: newData.notifyLeadDays ?? 1,
      notifyTimeOfDay: newData.notifyTimeOfDay ?? '20:00',
    });

    if (!nextAlertUTC) {
      console.log(`[Schedule] No upcoming alert for ${uid}/${placeId}`);
      return null;
    }

    const nonce = generateNonce();
    const taskName = await createAlertTask(uid, placeId, nextAlertUTC, nonce);
    await change.after.ref.update({ alertTaskName: taskName, alertNonce: nonce });
    console.log(
      `[Schedule] Next alert for ${uid}/${placeId}: ${nextAlertUTC.toISOString()}`,
    );
    return null;
  });

// ─── HTTP: Handle a Fired Alert Task ─────────────────────────────────────────

/**
 * Called by Cloud Tasks at the exact scheduled time.
 * Sends the FCM push notification, then schedules the next occurrence.
 */
export const handleMarketAlertTask = functions.https.onRequest(
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { uid, placeId, secret, nonce } = req.body as {
      uid?: string;
      placeId?: string;
      secret?: string;
      nonce?: string;
    };

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

    const data = docSnap.data()!;

    // Orphaned task guard: nonce must match the current scheduled task
    if (nonce && data.alertNonce && nonce !== data.alertNonce) {
      console.log(`[Alert] Stale task ignored for ${uid}/${placeId}`);
      res.status(200).send('Stale task');
      return;
    }

    if (!data.notifyEnabled) {
      await docRef.update({
        alertTaskName: admin.firestore.FieldValue.delete(),
      });
      res.status(200).send('Notifications disabled');
      return;
    }

    // ── Send FCM push notification ──────────────────────────────────────────
    const marketSnap = await db.collection('markets').doc(placeId).get();
    const marketName = marketSnap.data()?.name ?? 'A local market';

    const leadDays: number = data.notifyLeadDays ?? 1;
    const alertDayText =
      leadDays === 0 ? 'today' :
      leadDays === 1 ? 'tomorrow' :
      `in ${leadDays} days`;

    const tokensSnap = await db
      .collection('users')
      .doc(uid)
      .collection('fcmTokens')
      .get();

    await Promise.all(
      tokensSnap.docs.map(tokenDoc =>
        admin.messaging().send({
          token: tokenDoc.data().token,
          notification: {
            title: '( . ̫ .)💗 Upcoming Market',
            body: `${marketName} opens ${alertDayText}!`,
          },
          apns: { payload: { aps: { sound: 'default' } } },
        }).catch(err => console.error('[Alert] FCM send error:', err)),
      ),
    );

    console.log(`[Alert] Notification sent for ${uid}/${placeId}`);

    // ── Schedule the next occurrence ───────────────────────────────────────
    const nextAlertUTC = computeNextAlertUTC({
      notifyOpenDays: data.notifyOpenDays ?? [],
      notifyLeadDays: data.notifyLeadDays ?? 1,
      notifyTimeOfDay: data.notifyTimeOfDay ?? '20:00',
    });

    if (nextAlertUTC) {
      const nextNonce = generateNonce();
      const taskName = await createAlertTask(uid, placeId, nextAlertUTC, nextNonce);
      await docRef.update({ alertTaskName: taskName, alertNonce: nextNonce });
      console.log(`[Alert] Next scheduled: ${nextAlertUTC.toISOString()}`);
    } else {
      await docRef.update({
        alertTaskName: admin.firestore.FieldValue.delete(),
        alertNonce: admin.firestore.FieldValue.delete(),
      });
      console.log(`[Alert] No next occurrence for ${uid}/${placeId}`);
    }

    res.status(200).send('ok');
  },
);

// ─── One-time Migration: Backfill Tasks for Existing Users ───────────────────

/**
 * Call this ONCE after deployment to schedule tasks for users who already
 * have notifyEnabled=true (existing data before Cloud Tasks migration).
 *
 * Invoke: GET https://{region}-{project}.cloudfunctions.net/migrateExistingAlerts?secret=lmf-alert-secret-2024
 */
export const migrateExistingAlerts = functions.https.onRequest(
  async (req, res) => {
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
        if (data.alertTaskName) { skipped++; continue; }

        const nextAlertUTC = computeNextAlertUTC({
          notifyOpenDays: data.notifyOpenDays ?? [],
          notifyLeadDays: data.notifyLeadDays ?? 1,
          notifyTimeOfDay: data.notifyTimeOfDay ?? '20:00',
        });

        if (!nextAlertUTC) { skipped++; continue; }

        const nonce = generateNonce();
        const taskName = await createAlertTask(uid, doc.id, nextAlertUTC, nonce);
        await doc.ref.update({ alertTaskName: taskName, alertNonce: nonce });
        scheduled++;
      }
    }

    console.log(`[Migrate] scheduled=${scheduled} skipped=${skipped}`);
    res.status(200).json({ scheduled, skipped });
  },
);

