export type MarketOpenStatus = 'OPEN_NOW' | 'CLOSED' | 'INVALID';

export interface Period {
  open?: { day: number; time: string };
  close?: { day: number; time: string };
}

export interface MarketOpenStatusResult {
  status: MarketOpenStatus;
  nextOpenText: string | null;
  daysAhead: number | null;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function parseTimeToMinutes(timeStr: string | undefined): number | null {
  if (!timeStr || typeof timeStr !== 'string' || timeStr.length < 4) {
    return null;
  }
  const hours = parseInt(timeStr.slice(0, 2), 10);
  const mins = parseInt(timeStr.slice(2, 4), 10);
  if (Number.isNaN(hours) || Number.isNaN(mins) || hours < 0 || hours > 23 || mins < 0 || mins > 59) {
    return null;
  }
  return hours * 60 + mins;
}

function formatTime12hFromMinutes(totalMins: number): string {
  const hours = Math.floor(totalMins / 60) % 24;
  const minutes = totalMins % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

function formatNextOpenText(openDayIndex: number, daysAhead: number, openMins: number, now: Date): string {
  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysAhead);

  const dayName = DAY_NAMES[openDayIndex] ?? nextDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfMonth = nextDate.getDate();
  const monthName = nextDate.toLocaleDateString('en-US', { month: 'short' });

  const timeText = formatTime12hFromMinutes(openMins);
  return `Opens ${dayName} ${dayOfMonth} ${monthName} ${timeText}`;
}

function isOpenNow(period: Period, currentDay: number, currentMinutes: number): boolean | null {
  const openDay = period.open?.day;
  const openMins = parseTimeToMinutes(period.open?.time);
  if (typeof openDay !== 'number' || openMins === null) {
    return null;
  }

  let closeDay = period.close?.day;
  let closeMins = parseTimeToMinutes(period.close?.time);

  // If close is missing/invalid, treat as a 24-hour window starting at open time (best-effort).
  if (typeof closeDay !== 'number' || closeMins === null) {
    closeDay = (openDay + 1) % 7;
    closeMins = openMins;
  }

  // Same-day window
  if (closeDay === openDay) {
    if (closeMins <= openMins) return false;
    return currentDay === openDay && currentMinutes >= openMins && currentMinutes < closeMins;
  }

  // Cross-day / multi-day window
  const spanDays = (closeDay - openDay + 7) % 7;
  if (spanDays === 0) return false;

  const offsetFromOpenDay = (currentDay - openDay + 7) % 7;

  // Open day: from open time -> end of day
  if (offsetFromOpenDay === 0) {
    return currentMinutes >= openMins;
  }

  // Closing day: from start of day -> close time
  if (offsetFromOpenDay === spanDays) {
    return currentMinutes < closeMins;
  }

  // Intermediate days (if any): open all day
  if (offsetFromOpenDay > 0 && offsetFromOpenDay < spanDays) {
    return true;
  }

  return false;
}

/**
 * Determine whether a market is open now from Google Places `opening_hours.periods`.
 * Also returns a best-effort "next open" string for CLOSED state.
 */
export function getMarketOpenStatus(periods: Period[] | undefined): MarketOpenStatusResult {
  if (!Array.isArray(periods) || periods.length === 0) {
    return { status: 'INVALID', nextOpenText: null, daysAhead: null };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0=Sun
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // 1) OPEN_NOW check
  let hasAnyParsablePeriod = false;
  for (const period of periods) {
    const openNow = isOpenNow(period, currentDay, currentMinutes);
    if (openNow === null) continue;
    hasAnyParsablePeriod = true;
    if (openNow) {
      return { status: 'OPEN_NOW', nextOpenText: null, daysAhead: null };
    }
  }

  // If nothing was parseable, treat as INVALID rather than CLOSED.
  if (!hasAnyParsablePeriod) {
    return { status: 'INVALID', nextOpenText: null, daysAhead: null };
  }

  // 2) CLOSED: find next opening time
  let best: { openDay: number; daysAhead: number; openMins: number } | null = null;

  for (const period of periods) {
    const openDay = period.open?.day;
    const openMins = parseTimeToMinutes(period.open?.time);
    if (typeof openDay !== 'number' || openMins === null) continue;

    const baseDaysAhead = (openDay - currentDay + 7) % 7;
    let daysAhead = baseDaysAhead;

    // If opening time for "today" already passed, the next occurrence is next week.
    if (baseDaysAhead === 0 && openMins <= currentMinutes) {
      daysAhead = 7;
    }

    if (
      !best ||
      daysAhead < best.daysAhead ||
      (daysAhead === best.daysAhead && openMins < best.openMins)
    ) {
      best = { openDay, daysAhead, openMins };
    }
  }

  if (!best) {
    return { status: 'INVALID', nextOpenText: null, daysAhead: null };
  }

  return {
    status: 'CLOSED',
    nextOpenText: formatNextOpenText(best.openDay, best.daysAhead, best.openMins, now),
    daysAhead: best.daysAhead,
  };
}

