import { View, Text } from 'react-native';
import { useSearch } from '../../context/SearchContext';

function FeedHeader() {
  const { savedMarketIds } = useSearch();

  return (
    <View className="px-5 pb-3">
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="text-3xl font-bold text-gray-900">Alerts</Text>
          <Text className="text-gray-600 mt-1">
            Saved markets & notifications
          </Text>
        </View>

        <View className="bg-white px-3 py-2 rounded-2xl border border-gray-100">
          <Text className="text-gray-700 font-semibold">
            Saved {savedMarketIds.length}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default FeedHeader;

