interface Period {
  open: { day: number; time: string };
  close?: { day: number; time: string };
}

export type MarketOpenStatus = 'OPEN_NOW' | 'CLOSED' | 'INVALID';

export interface MarketOpenStatusResult {
  status: MarketOpenStatus;
  nextOpenText: string | null;
  daysAhead: number | null;
}

/**
 * Single source of truth for market opening status
 * Returns a clear status enum instead of mixed booleans
 */
export function getMarketOpenStatus(
  periods: Period[] | undefined,
): MarketOpenStatusResult {
  // Handle missing or empty periods
  if (!periods || periods.length === 0) {
    return {
      status: 'INVALID',
      nextOpenText: null,
      daysAhead: null,
    };
  }

  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Helper: convert HHMM string to minutes
    const toMinutes = (timeStr: string): number => {
      try {
        if (!timeStr || timeStr.length < 4) {
          return 0;
        }
        const hours = parseInt(timeStr.slice(0, 2), 10);
        const mins = parseInt(timeStr.slice(2, 4), 10);
        if (isNaN(hours) || isNaN(mins)) {
          return 0;
        }
        return hours * 60 + mins;
      } catch {
        return 0;
      }
    };

    let isOpenNow = false;
    let nextPeriod: Period | null = null;
    let daysAhead: number | null = null;

    // Check current day and next 7 days
    for (let i = 0; i < 7; i++) {
      try {
        const checkDay = (currentDay + i) % 7;
        const period = periods.find(
          p => p && p.open && p.open.day === checkDay,
        );

        if (!period || !period.open?.time) {
          continue;
        }

        // Handle periods without close time (24-hour markets)
        if (!period.close?.time) {
          if (i === 0) {
            // Open 24 hours today
            isOpenNow = true;
            nextPeriod = period;
            daysAhead = 0;
            break;
          }
          // Open 24 hours on a future day
          if (!nextPeriod) {
            nextPeriod = period;
            daysAhead = i;
            break;
          }
          continue;
        }

        const openMins = toMinutes(period.open.time);
        const closeMins = toMinutes(period.close.time);

        if (isNaN(openMins) || isNaN(closeMins)) {
          continue;
        }

        // Same-day closing (normal case)
        if (period.close.day === period.open.day) {
          if (i === 0) {
            // Today
            if (
              currentMinutes >= openMins &&
              currentMinutes < closeMins
            ) {
              // Currently open
              isOpenNow = true;
              nextPeriod = period;
              daysAhead = 0;
              break;
            } else if (currentMinutes < openMins) {
              // Opens later today
              nextPeriod = period;
              daysAhead = 0;
              break;
            }
            // Already closed today, continue to next day
          } else if (!nextPeriod) {
            // Future day
            nextPeriod = period;
            daysAhead = i;
            break;
          }
        }

        // Overnight closing (e.g. open Sat 20:00, close Sun 02:00)
        if (period.close.day !== period.open.day) {
          if (i === 0 && currentMinutes >= openMins) {
            // Currently open (opened yesterday, closes today)
            isOpenNow = true;
            nextPeriod = period;
            daysAhead = 0;
            break;
          }
          if (
            i === 1 &&
            currentMinutes < toMinutes(period.close.time)
          ) {
            // Still open from yesterday
            isOpenNow = true;
            nextPeriod = period;
            daysAhead = 0;
            break;
          }
          if (!isOpenNow && !nextPeriod && i > 0) {
            // Future opening
            nextPeriod = period;
            daysAhead = i;
            break;
          }
        }
      } catch {
        // Continue to next iteration
        continue;
      }
    }

    // Format next open text
    let nextOpenText: string | null = null;
    if (nextPeriod && daysAhead !== null) {
      try {
        const nextDate = new Date();
        nextDate.setDate(now.getDate() + daysAhead);

        let dayName: string;
        let monthName: string;
        try {
          dayName = nextDate.toLocaleDateString('en-US', {
            weekday: 'long',
          });
          monthName = nextDate.toLocaleDateString('en-US', {
            month: 'short',
          });
        } catch {
          // Fallback to manual formatting
          const days = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
          ];
          const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ];
          dayName = days[nextDate.getDay()];
          monthName = months[nextDate.getMonth()];
        }

        const day = nextDate.getDate();
        const openTime = formatTime(nextPeriod.open.time);

        nextOpenText = `${dayName} ${day} ${monthName} ${openTime}`;
      } catch {
        nextOpenText = null;
      }
    }

    // Determine status
    let status: MarketOpenStatus;
    if (isOpenNow) {
      status = 'OPEN_NOW';
    } else {
      // If we have a next period, market is closed but will open later
      // If no next period found, market is closed with no upcoming opening
      status = 'CLOSED';
    }

    return {
      status,
      nextOpenText,
      daysAhead,
    };
  } catch {
    // If any error occurs, return INVALID
    return {
      status: 'INVALID',
      nextOpenText: null,
      daysAhead: null,
    };
  }
}

// Helper for time formatting → "08:00am"
function formatTime(timeStr: string): string {
  try {
    if (!timeStr || timeStr.length < 4) {
      return '00:00';
    }

    const hours = parseInt(timeStr.slice(0, 2), 10);
    const minutes = parseInt(timeStr.slice(2, 4), 10);

    if (isNaN(hours) || isNaN(minutes)) {
      return '00:00';
    }

    try {
      const date = new Date();
      date.setHours(hours, minutes);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      // Fallback to manual formatting
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHours}:${displayMinutes}${period}`;
    }
  } catch {
    return '00:00';
  }
}
