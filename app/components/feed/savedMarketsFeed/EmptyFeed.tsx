import { Text, View } from 'react-native';

function EmptyFeed() {
  return (
    <View className="px-5 mt-4">
      <View className="bg-white rounded-3xl p-5 border border-gray-100">
        <Text className="text-gray-800 text-lg font-semibold">No saved markets yet</Text>
        <Text className="text-gray-600 mt-2">
          Save a market from the Map screen to see it here.
        </Text>
      </View>
    </View>
  );
}

export default EmptyFeed;
