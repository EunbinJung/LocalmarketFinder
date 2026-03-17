import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Market } from '../../../context/SearchContext';
import { SavedMarketNotificationSettings } from '../../../services/savedMarketNotificationService';
import { DEFAULT_ALERT_TIME, computeNextAlert } from '../../../utils/alertTimeUtils';
import UpcomingAlertCard, { UpcomingAlertItem } from './UpcomingAlertCard';

interface Props {
  items: Array<{ market: Market; settings: SavedMarketNotificationSettings }>;
}

function UpcomingAlertsSection({ items }: Props) {
  const upcoming = useMemo(() => {
    const now = new Date();
    const enabled = items
      .filter(i => i.settings.enabled)
      .map(i => {
        const next = computeNextAlert(i.market, i.settings, DEFAULT_ALERT_TIME, now);
        return {
          placeId: i.market.place_id,
          marketName: i.market.name,
          notifyAt: next.notifyAt,
          openOn: next.openOn,
          timeOfDay: i.settings.timeOfDay || DEFAULT_ALERT_TIME,
        } satisfies UpcomingAlertItem;
      });

    const scheduled = enabled
      .filter(x => x.notifyAt)
      .sort((a, b) => a.notifyAt!.getTime() - b.notifyAt!.getTime());
    const unscheduled = enabled.filter(x => !x.notifyAt);

    return [...scheduled, ...unscheduled].slice(0, 3);
  }, [items]);

  return (
    <View className="mx-4 mb-4 rounded-3xl overflow-hidden border border-secondary bg-white">
      <View className="bg-white px-5 pt-5 pb-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900">✨ Upcoming</Text>
          <View className="bg-tertiary px-3 py-1.5 rounded-full border border-gray-100">
            <Text className="text-gray-700 font-semibold">{upcoming.length}</Text>
          </View>
        </View>
      </View>

      <View className="px-5 pb-5 pt-3 w-full">
        {upcoming.length === 0 ? (
          <View className="bg-tertiary rounded-3xl p-5 border border-gray-100">
            <Text className="text-gray-700 font-semibold">No upcoming alerts</Text>
            <Text className="text-gray-600 mt-2">
              Turn on alerts for a saved market to see upcoming notifications.
            </Text>
          </View>
        ) : (
          <View className="w-full gap-3">
            {upcoming.map(item => (
              <UpcomingAlertCard key={item.placeId} item={item} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export default UpcomingAlertsSection;
