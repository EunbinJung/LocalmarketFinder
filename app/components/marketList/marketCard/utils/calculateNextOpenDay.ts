interface Period {
  open: { day: number; time: string };
  close: { day: number; time: string };
}

/**
 * Calculate next opening day and time based on Google Places "periods" data
 */
export const calculateNextOpenDay = (periods: Period[] | undefined) => {
  if (!periods || periods.length === 0) {
    return { text: null, daysAhead: null, isOpenNow: false };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // helper: convert HHMM string to minutes
  const toMinutes = (timeStr: string) => {
    const hours = parseInt(timeStr.slice(0, 2));
    const mins = parseInt(timeStr.slice(2, 4));
    return hours * 60 + mins;
  };

  let isOpenNow = false;
  let nextPeriod: Period | null = null;
  let daysAhead = 0;

  for (let i = 0; i < 7; i++) {
    const checkDay = (currentDay + i) % 7;
    const period = periods.find(p => p.open.day === checkDay);

    if (!period || !period.open?.time || !period.close?.time) continue;

    const openMins = toMinutes(period.open.time);
    const closeMins = toMinutes(period.close.time);

    // same-day closing (normal case)
    if (period.close.day === period.open.day) {
      if (i === 0 && currentMinutes >= openMins && currentMinutes < closeMins) {
        isOpenNow = true;
        nextPeriod = period;
        daysAhead = 0;
        break;
      }
      if (i === 0 && currentMinutes < openMins) {
        nextPeriod = period;
        daysAhead = 0;
        break;
      }
      if (i > 0) {
        nextPeriod = period;
        daysAhead = i;
        break;
      }
    }

    // overnight closing (e.g. open Sat 20:00, close Sun 02:00)
    if (period.close.day !== period.open.day) {
      if (i === 0 && currentMinutes >= openMins) {
        isOpenNow = true;
        nextPeriod = period;
        daysAhead = 0;
        break;
      }
      if (i === 1 && currentMinutes < toMinutes(period.close.time)) {
        isOpenNow = true;
        nextPeriod = period;
        daysAhead = 0;
        break;
      }
      if (!isOpenNow && i > 0) {
        nextPeriod = period;
        daysAhead = i;
        break;
      }
    }
  }

  // 🔹 format readable date text
  let nextOpenString = null;
  if (nextPeriod) {
    const nextDate = new Date();
    nextDate.setDate(now.getDate() + daysAhead);

    const dayName = nextDate.toLocaleDateString('en-US', { weekday: 'long' });
    const day = nextDate.getDate();
    const monthName = nextDate.toLocaleDateString('en-US', { month: 'short' });

    const openTime = formatTime(nextPeriod.open.time);

    nextOpenString = `${dayName} ${day} ${monthName} ${openTime}`;
  }

  return {
    text: nextOpenString,
    daysAhead,
    isOpenNow,
  };
};

// helper for time formatting → "08:00am"
function formatTime(timeStr: string) {
  const hours = parseInt(timeStr.slice(0, 2));
  const minutes = parseInt(timeStr.slice(2, 4));
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
