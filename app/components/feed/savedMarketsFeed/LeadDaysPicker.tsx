import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { SavedMarketNotificationSettings } from '../../../services/savedMarketNotificationService';

interface Props {
  leadDays: SavedMarketNotificationSettings['leadDays'];
  enabled: boolean;
  onChange: (days: SavedMarketNotificationSettings['leadDays']) => void;
}

function LeadDaysPicker({ leadDays, enabled, onChange }: Props) {
  return (
    <>
      <Text className="text-sm font-semibold text-gray-800 mb-2">Days before (0–7)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        className="mb-4"
      >
        {([0, 1, 2, 3, 4, 5, 6, 7] as const).map(days => (
          <TouchableOpacity
            key={days}
            onPress={() => onChange(days)}
            className={`px-3 py-2 rounded-2xl ${leadDays === days ? 'bg-primary' : 'bg-tertiary'}`}
            activeOpacity={0.85}
            disabled={!enabled}
            style={{ opacity: enabled ? 1 : 0.45 }}
          >
            <Text className={`${leadDays === days ? 'text-white' : 'text-gray-800'} font-semibold`}>
              {days}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );
}

export default LeadDaysPicker;
