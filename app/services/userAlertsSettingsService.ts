import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, ensureAuthenticated } from './firebase';

export interface UserAlertsSettings {
  enabled: boolean;
  defaultTimeOfDay: string; // "HH:mm"
  quietHoursEnabled: boolean;
  quietStart: string; // "HH:mm"
  quietEnd: string; // "HH:mm"
  timeZone: string; // IANA timezone, e.g. "Australia/Sydney"
}

const DEFAULTS: UserAlertsSettings = {
  enabled: true,
  defaultTimeOfDay: '20:00', // 8pm
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '07:00',
  timeZone: 'UTC',
};

function normalizeTimeOfDay(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  if (!/^\d{2}:\d{2}$/.test(value)) return fallback;
  const [hh, mm] = value.split(':').map(v => parseInt(v, 10));
  if (
    Number.isNaN(hh) ||
    Number.isNaN(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    return fallback;
  }
  return value;
}

function getLocalTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === 'string' && tz.length > 0 ? tz : DEFAULTS.timeZone;
  } catch {
    return DEFAULTS.timeZone;
  }
}

export function getDefaultUserAlertsSettings(): UserAlertsSettings {
  return {
    ...DEFAULTS,
    timeZone: getLocalTimeZone(),
  };
}

export async function getUserAlertsSettings(): Promise<UserAlertsSettings> {
  try {
    const uid = await ensureAuthenticated();
    const ref = doc(db, 'users', uid, 'settings', 'alerts');
    const snap = await getDoc(ref);

    const defaults = getDefaultUserAlertsSettings();
    if (!snap.exists()) return defaults;

    const data = snap.data() as any;
    return {
      enabled: typeof data?.enabled === 'boolean' ? data.enabled : defaults.enabled,
      defaultTimeOfDay: normalizeTimeOfDay(data?.defaultTimeOfDay, defaults.defaultTimeOfDay),
      quietHoursEnabled:
        typeof data?.quietHoursEnabled === 'boolean'
          ? data.quietHoursEnabled
          : defaults.quietHoursEnabled,
      quietStart: normalizeTimeOfDay(data?.quietStart, defaults.quietStart),
      quietEnd: normalizeTimeOfDay(data?.quietEnd, defaults.quietEnd),
      timeZone: typeof data?.timeZone === 'string' && data.timeZone.length > 0 ? data.timeZone : defaults.timeZone,
    };
  } catch (error) {
    console.error('Error reading user alerts settings:', error);
    return getDefaultUserAlertsSettings();
  }
}

export async function upsertUserAlertsSettings(
  partial: Partial<UserAlertsSettings>,
): Promise<boolean> {
  try {
    const uid = await ensureAuthenticated();
    const ref = doc(db, 'users', uid, 'settings', 'alerts');

    const update: any = {
      updatedAt: new Date(),
    };

    if (typeof partial.enabled === 'boolean') update.enabled = partial.enabled;
    if (typeof partial.quietHoursEnabled === 'boolean') update.quietHoursEnabled = partial.quietHoursEnabled;
    if (typeof partial.timeZone === 'string' && partial.timeZone.length > 0) update.timeZone = partial.timeZone;

    if (typeof partial.defaultTimeOfDay === 'string') {
      update.defaultTimeOfDay = normalizeTimeOfDay(partial.defaultTimeOfDay, DEFAULTS.defaultTimeOfDay);
    }
    if (typeof partial.quietStart === 'string') {
      update.quietStart = normalizeTimeOfDay(partial.quietStart, DEFAULTS.quietStart);
    }
    if (typeof partial.quietEnd === 'string') {
      update.quietEnd = normalizeTimeOfDay(partial.quietEnd, DEFAULTS.quietEnd);
    }

    await setDoc(ref, update, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating user alerts settings:', error);
    return false;
  }
}

