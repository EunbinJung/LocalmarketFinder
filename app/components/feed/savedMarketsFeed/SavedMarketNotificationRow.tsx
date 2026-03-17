import { useMemo } from 'react';
import { View } from 'react-native';
import { Market } from '../../../context/SearchContext';
import { SavedMarketNotificationSettings } from '../../../services/savedMarketNotificationService';
import {
  DAY_NAMES,
  DAY_SHORT,
  DEFAULT_ALERT_TIME,
  computeNextAlert,
  formatRelativeDay,
  formatTime12h,
} from '../../../utils/alertTimeUtils';
import { getWeeklySchedule } from '../../../utils/weeklySchedule';
import type { SnackbarType } from '../../common/TopSnackbar';
import ExpandedSettings from './ExpandedSettings';
import MarketCardHeader from './MarketCardHeader';

interface Props {
  market: Market;
  settings: SavedMarketNotificationSettings;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (partial: Partial<SavedMarketNotificationSettings>) => void;
  onShowSnackbar?: (message: string, type?: SnackbarType) => void;
  onRequestScrollToBottom?: () => void;
}

function SavedMarketNotificationRow({
  market,
  settings,
  expanded,
  onToggleExpanded,
  onChange,
  onShowSnackbar,
  onRequestScrollToBottom,
}: Props) {
  const effectiveTimeOfDay = settings.timeOfDay || DEFAULT_ALERT_TIME;

  const weeklyOpenDaysText = useMemo(() => {
    const weekly = getWeeklySchedule(market.opening_hours?.periods).filter(d => d.isOpen);
    if (weekly.length === 0) return 'Opening hours not available';
    return weekly
      .map(d => {
        const dayIndex = DAY_NAMES.indexOf(d.day);
        const dayShort = dayIndex >= 0 ? DAY_SHORT[dayIndex] : d.day.slice(0, 3);
        return `${dayShort} ${d.openTime}-${d.closeTime}`;
      })
      .filter(Boolean)
      .join(' · ');
  }, [market]);

  const nextAlertText = useMemo(() => {
    if (!settings.enabled) return '🔕 Off';
    const next = computeNextAlert(market, settings, DEFAULT_ALERT_TIME, new Date());
    if (!next.notifyAt) return '⏳ Not scheduled';
    return `🔔 ${formatRelativeDay(next.notifyAt, new Date())} · ${formatTime12h(effectiveTimeOfDay)}`;
  }, [market, settings, effectiveTimeOfDay]);

  return (
    <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 overflow-hidden">
      <MarketCardHeader
        market={market}
        nextAlertText={nextAlertText}
        weeklyOpenDaysText={weeklyOpenDaysText}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        settings={settings}
        onChange={onChange}
      />
      {expanded && (
        <ExpandedSettings
          market={market}
          settings={settings}
          weeklyOpenDaysText={weeklyOpenDaysText}
          onChange={onChange}
          onShowSnackbar={onShowSnackbar}
          onRequestScrollToBottom={onRequestScrollToBottom}
        />
      )}
    </View>
  );
}

export default SavedMarketNotificationRow;
