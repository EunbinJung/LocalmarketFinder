import { Text, View } from 'react-native';
import { formatRelativeDay, formatTime12h } from '../../../utils/alertTimeUtils';

export interface UpcomingAlertItem {
  placeId: string;
  marketName: string;
  notifyAt: Date | null;
  openOn: Date | null;
  timeOfDay: string;
}

function UpcomingAlertCard({ item }: { item: UpcomingAlertItem }) {
  return (
    <View className="bg-secondary rounded-3xl border border-gray-100 p-5 w-full">
      <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
        {item.marketName}
      </Text>
      {item.notifyAt ? (
        <>
          <Text className="text-gray-800 font-semibold mt-3">
            🔔 {formatRelativeDay(item.notifyAt, new Date())} {formatTime12h(item.timeOfDay)}
          </Text>
          {item.openOn && (
            <Text className="text-gray-700 mt-2">
              📍 Opens {formatRelativeDay(item.openOn, new Date())}
            </Text>
          )}
        </>
      ) : (
        <>
          <Text className="text-gray-800 font-semibold mt-3">⚠️ Not scheduled yet</Text>
          <Text className="text-gray-700 mt-2">Check open days / lead days / time.</Text>
        </>
      )}
    </View>
  );
}

export default UpcomingAlertCard;
