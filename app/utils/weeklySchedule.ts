/**
 * Utility functions for parsing and formatting weekly opening hours
 */

export interface WeeklyScheduleDay {
  day: string; // e.g., "Monday", "Tuesday"
  date: string; // e.g., "Jan 19"
  openTime: string; // e.g., "09:00"
  closeTime: string; // e.g., "17:00"
  isOpen: boolean;
}

export interface Period {
  open: {
    day: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    time: string; // "0900" format
  };
  close?: {
    day: number;
    time: string;
  };
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

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format time from "0900" to "09:00"
 */
function formatTime(timeString: string): string {
  if (!timeString || timeString.length !== 4) return '';
  return `${timeString.slice(0, 2)}:${timeString.slice(2, 4)}`;
}

/**
 * Get date string for a day of the week
 */
function getDateForDay(dayIndex: number): string {
  const today = new Date();
  const currentDay = today.getDay();
  const daysUntil = (dayIndex - currentDay + 7) % 7;
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysUntil);

  const month = targetDate.toLocaleDateString('en-US', { month: 'short' });
  const day = targetDate.getDate();
  return `${month} ${day}`;
}

/**
 * Parse periods and return weekly schedule
 */
export function getWeeklySchedule(
  periods: Period[] | undefined,
): WeeklyScheduleDay[] {
  if (!periods || periods.length === 0) {
    return [];
  }

  const schedule: WeeklyScheduleDay[] = [];

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    schedule.push({
      day: DAY_NAMES[i],
      date: getDateForDay(i),
      openTime: '',
      closeTime: '',
      isOpen: false,
    });
  }

  // Fill in opening hours from periods
  periods.forEach(period => {
    const openDay = period.open.day;
    const openTime = formatTime(period.open.time);

    if (period.close) {
      const closeDay = period.close.day;
      const closeTime = formatTime(period.close.time);

      // Handle same-day closing
      if (openDay === closeDay) {
        schedule[openDay] = {
          ...schedule[openDay],
          openTime,
          closeTime,
          isOpen: true,
        };
      } else {
        // Handle multi-day periods (e.g., Friday 9am to Saturday 2am)
        schedule[openDay] = {
          ...schedule[openDay],
          openTime,
          closeTime: '24:00', // or next day
          isOpen: true,
        };

        // Mark closing day
        schedule[closeDay] = {
          ...schedule[closeDay],
          openTime: '00:00',
          closeTime,
          isOpen: true,
        };

        // Mark days in between as open
        let currentDay = (openDay + 1) % 7;
        while (currentDay !== closeDay) {
          schedule[currentDay] = {
            ...schedule[currentDay],
            openTime: '00:00',
            closeTime: '24:00',
            isOpen: true,
          };
          currentDay = (currentDay + 1) % 7;
        }
      }
    } else {
      // Open all day (no close time specified)
      schedule[openDay] = {
        ...schedule[openDay],
        openTime,
        closeTime: '24:00',
        isOpen: true,
      };
    }
  });

  return schedule;
}

/**
 * Get formatted schedule string for display
 */
export function formatWeeklySchedule(
  periods: Period[] | undefined,
): string {
  const schedule = getWeeklySchedule(periods);
  if (schedule.length === 0) {
    return 'No schedule available';
  }

  return schedule
    .filter(day => day.isOpen)
    .map(day => {
      const dayShort = DAY_NAMES_SHORT[DAY_NAMES.indexOf(day.day)];
      return `${dayShort} ${day.date}: ${day.openTime} - ${day.closeTime}`;
    })
    .join('\n');
}
