import { Text, View } from 'react-native';
import { AlertTriangle, Bell, MapPin } from 'lucide-react-native';
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
          <View className="flex-row items-center gap-2 mt-3">
            <Bell size={14} color="#374151" />
            <Text className="text-gray-800 font-semibold">
              {formatRelativeDay(item.notifyAt, new Date())} {formatTime12h(item.timeOfDay)}
            </Text>
          </View>
          {item.openOn && (
            <View className="flex-row items-center gap-2 mt-2">
              <MapPin size={14} color="#4B5563" />
              <Text className="text-gray-700">Opens {formatRelativeDay(item.openOn, new Date())}</Text>
            </View>
          )}
        </>
      ) : (
        <>
          <View className="flex-row items-center gap-2 mt-3">
            <AlertTriangle size={14} color="#374151" />
            <Text className="text-gray-800 font-semibold">Not scheduled yet</Text>
          </View>
          <Text className="text-gray-700 mt-2">Check open days / lead days / time.</Text>
        </>
      )}
    </View>
  );
}

export default UpcomingAlertCard;
