import { Market } from '../context/SearchContext';
import { SavedMarketNotificationSettings } from '../services/savedMarketNotificationService';

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DEFAULT_ALERT_TIME = '20:00';

export function parseTimeToMinutes(timeStr: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const [hh, mm] = timeStr.split(':').map(v => parseInt(v, 10));
  if (Number.isNaN(hh) || Number.isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

export function formatTime12h(timeStr: string): string {
  const mins = parseTimeToMinutes(timeStr);
  if (mins === null) return timeStr;
  const hh24 = Math.floor(mins / 60);
  const mm = mins % 60;
  const period = hh24 >= 12 ? 'PM' : 'AM';
  const hh12 = hh24 % 12 || 12;
  return `${hh12}:${mm.toString().padStart(2, '0')} ${period}`;
}

export function sanitizeTimeDraft(raw: string): { value: string; hadInvalidChars: boolean } {
  const hadInvalidChars = /[^0-9:]/.test(raw);
  const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (digits.length <= 2) return { value: digits, hadInvalidChars };
  return { value: `${digits.slice(0, 2)}:${digits.slice(2)}`, hadInvalidChars };
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function setTimeOnDate(date: Date, timeStr: string): Date {
  const mins = parseTimeToMinutes(timeStr) ?? 0;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function formatRelativeDay(date: Date, now: Date): string {
  const d0 = startOfDay(now).getTime();
  const d1 = startOfDay(date).getTime();
  const diffDays = Math.round((d1 - d0) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return DAY_SHORT[date.getDay()];
}

export function computeNextAlert(
  market: Market,
  settings: SavedMarketNotificationSettings,
  defaultTimeOfDay: string,
  now: Date,
): { notifyAt: Date | null; openOn: Date | null } {
  if (!settings.enabled) return { notifyAt: null, openOn: null };
  if (!Array.isArray(settings.openDays) || settings.openDays.length === 0) {
    return { notifyAt: null, openOn: null };
  }

  const timeStr = settings.timeOfDay || defaultTimeOfDay;
  for (let delta = 0; delta <= 21; delta++) {
    const openOn = addDays(startOfDay(now), delta);
    if (!settings.openDays.includes(openOn.getDay())) continue;

    const notifyBase = addDays(openOn, -settings.leadDays);
    const notifyAt = setTimeOnDate(notifyBase, timeStr);

    if (notifyAt.getTime() > now.getTime()) {
      return { notifyAt, openOn };
    }
  }

  return { notifyAt: null, openOn: null };
}
