import { useMemo } from 'react';
import { View } from 'react-native';
import { Market } from '../../../context/SearchContext';
import { SavedMarketNotificationSettings } from '../../../services/savedMarketNotificationService';
import { DEFAULT_ALERT_TIME } from '../../../utils/alertTimeUtils';
import { getMarketOpenDays } from '../../../utils/savedMarketsNotificationUtils';
import type { SnackbarType } from '../../common/TopSnackbar';
import LeadDaysPicker from './LeadDaysPicker';
import OpenDaysPicker from './OpenDaysPicker';
import TimeInput from './TimeInput';

interface Props {
  market: Market;
  settings: SavedMarketNotificationSettings;
  weeklyOpenDaysText: string;
  onChange: (partial: Partial<SavedMarketNotificationSettings>) => void;
  onShowSnackbar?: (message: string, type?: SnackbarType) => void;
  onRequestScrollToBottom?: () => void;
}

function ExpandedSettings({
  market,
  settings,
  weeklyOpenDaysText,
  onChange,
  onShowSnackbar,
  onRequestScrollToBottom,
}: Props) {
  const openDayOptions = useMemo(() => getMarketOpenDays(market), [market]);
  const effectiveTimeOfDay = settings.timeOfDay || DEFAULT_ALERT_TIME;

  return (
    <>
      <View className="h-px bg-gray-100" />
      <View className="px-5 pt-4 pb-5">
        <LeadDaysPicker
          leadDays={settings.leadDays}
          enabled={settings.enabled}
          onChange={(days) => onChange({ leadDays: days })}
        />
        <TimeInput
          effectiveTimeOfDay={effectiveTimeOfDay}
          expanded
          enabled={settings.enabled}
          onChange={onChange}
          onShowSnackbar={onShowSnackbar}
          onRequestScrollToBottom={onRequestScrollToBottom}
        />
        <OpenDaysPicker
          openDayOptions={openDayOptions}
          openDays={settings.openDays}
          enabled={settings.enabled}
          weeklyOpenDaysText={weeklyOpenDaysText}
          onChange={onChange}
        />
      </View>
    </>
  );
}

export default ExpandedSettings;
