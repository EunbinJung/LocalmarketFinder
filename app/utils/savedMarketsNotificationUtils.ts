import { Market } from '../context/SearchContext';
import { SavedMarketNotificationSettings } from '../services/savedMarketNotificationService';

export function getMarketOpenDays(market: Market): number[] {
  const periods = market.opening_hours?.periods;
  if (!Array.isArray(periods) || periods.length === 0) return [];
  const set = new Set<number>();
  for (const p of periods) {
    const day = p?.open?.day;
    if (typeof day === 'number' && day >= 0 && day <= 6) set.add(day);
  }
  return Array.from(set).sort((a, b) => a - b);
}

export function clampLeadDays(value: unknown): SavedMarketNotificationSettings['leadDays'] {
  if (
    value === 0 || value === 1 || value === 2 || value === 3 ||
    value === 4 || value === 5 || value === 6 || value === 7
  ) {
    return value;
  }
  return 1;
}

export function buildDefaultSettings(
  market: Market,
  defaultTimeOfDay: string,
): SavedMarketNotificationSettings {
  return {
    enabled: false,
    leadDays: 1,
    openDays: getMarketOpenDays(market),
    timeOfDay: defaultTimeOfDay,
  };
}
