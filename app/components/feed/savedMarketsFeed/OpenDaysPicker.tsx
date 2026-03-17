import { Text, TouchableOpacity, View } from 'react-native';
import { SavedMarketNotificationSettings } from '../../../services/savedMarketNotificationService';
import { DAY_SHORT } from '../../../utils/alertTimeUtils';

interface Props {
  openDayOptions: number[];
  openDays: number[];
  enabled: boolean;
  weeklyOpenDaysText: string;
  onChange: (partial: Partial<SavedMarketNotificationSettings>) => void;
}

function OpenDaysPicker({ openDayOptions, openDays, enabled, weeklyOpenDaysText, onChange }: Props) {
  return (
    <>
      <Text className="text-sm font-semibold text-gray-800 mb-2">Market open days</Text>
      {openDayOptions.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {openDayOptions.map(day => {
            const selected = openDays.includes(day);
            return (
              <TouchableOpacity
                key={day}
                onPress={() => {
                  const next = selected
                    ? openDays.filter(d => d !== day)
                    : [...openDays, day].sort((a, b) => a - b);
                  onChange({ openDays: next });
                }}
                className={`px-3 py-2 rounded-2xl ${selected ? 'bg-primary' : 'bg-tertiary'}`}
                activeOpacity={0.85}
                disabled={!enabled}
                style={{ opacity: enabled ? 1 : 0.45 }}
              >
                <Text className={`${selected ? 'text-white' : 'text-gray-800'} font-semibold`}>
                  {DAY_SHORT[day]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text className="text-sm text-gray-500">No opening days available to configure.</Text>
      )}
      <Text className="text-xs text-gray-500 mt-4">{weeklyOpenDaysText}</Text>
    </>
  );
}

export default OpenDaysPicker;
