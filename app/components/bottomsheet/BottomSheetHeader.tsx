import { View } from 'react-native';
import { Text } from 'react-native-gesture-handler';

function BottomSheetHeader() {
  return (
    <View className="h-[48px] rounded-t-3xl relative pb-1 bg-gray-400">
      <View className="w-[32px] h-[4px] rounded-sm bg-gray-700 m-auto" />
      <Text className="text-center text-sm font-bold">
        3 Markets found near me
      </Text>
    </View>
  );
}

export default BottomSheetHeader;
