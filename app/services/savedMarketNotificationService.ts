import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, ensureAuthenticated } from './firebase';

export type NotificationLeadDays = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface SavedMarketNotificationSettings {
  enabled: boolean;
  leadDays: NotificationLeadDays;
  /**
   * Day indexes based on JS Date.getDay(): 0=Sun ... 6=Sat
   * These represent the market OPEN days the user cares about.
   */
  openDays: number[];
  /**
   * Simple "HH:mm" string in 24h time. (Future: used by server/job to schedule push)
   */
  timeOfDay: string;
}

const DEFAULT_TIME_OF_DAY = '20:00'; // 8pm default

function normalizeOpenDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const set = new Set<number>();
  for (const v of value) {
    if (typeof v === 'number' && v >= 0 && v <= 6) set.add(v);
  }
  return Array.from(set).sort((a, b) => a - b);
}

function normalizeLeadDays(value: unknown): NotificationLeadDays {
  if (
    value === 0 ||
    value === 1 ||
    value === 2 ||
    value === 3 ||
    value === 4 ||
    value === 5 ||
    value === 6 ||
    value === 7
  ) {
    return value;
  }
  return 0;
}

function normalizeTimeOfDay(value: unknown): string {
  // If missing/invalid, return empty string so callers can fallback to a global default.
  if (typeof value !== 'string') return '';
  if (!/^\d{2}:\d{2}$/.test(value)) return '';
  const [hh, mm] = value.split(':').map(v => parseInt(v, 10));
  if (
    Number.isNaN(hh) ||
    Number.isNaN(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    return '';
  }
  return value;
}

export async function getSavedMarketNotificationSettings(
  placeId: string,
): Promise<SavedMarketNotificationSettings | null> {
  try {
    const uid = await ensureAuthenticated();
    const ref = doc(db, 'users', uid, 'savedMarkets', placeId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;

    const data = snap.data() as any;
    return {
      enabled: !!data?.notifyEnabled,
      leadDays: normalizeLeadDays(data?.notifyLeadDays),
      openDays: normalizeOpenDays(data?.notifyOpenDays),
      timeOfDay: normalizeTimeOfDay(data?.notifyTimeOfDay),
    };
  } catch (error) {
    console.error('Error reading saved market notification settings:', error);
    return null;
  }
}

export async function upsertSavedMarketNotificationSettings(
  placeId: string,
  partial: Partial<SavedMarketNotificationSettings>,
): Promise<boolean> {
  try {
    const uid = await ensureAuthenticated();
    const ref = doc(db, 'users', uid, 'savedMarkets', placeId);

    const update: any = {
      notifyUpdatedAt: new Date(),
    };

    if (typeof partial.enabled === 'boolean') update.notifyEnabled = partial.enabled;
    if (
      partial.leadDays === 0 ||
      partial.leadDays === 1 ||
      partial.leadDays === 2 ||
      partial.leadDays === 3 ||
      partial.leadDays === 4 ||
      partial.leadDays === 5 ||
      partial.leadDays === 6 ||
      partial.leadDays === 7
    ) {
      update.notifyLeadDays = partial.leadDays;
    }
    if (partial.openDays) update.notifyOpenDays = normalizeOpenDays(partial.openDays);
    if (typeof partial.timeOfDay === 'string') {
      const t = normalizeTimeOfDay(partial.timeOfDay);
      update.notifyTimeOfDay = t || DEFAULT_TIME_OF_DAY;
    }

    // Use setDoc(merge) so it works even if the user doc was created without prefs fields.
    await setDoc(ref, update, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating saved market notification settings:', error);
    return false;
  }
}

