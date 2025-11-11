import { View } from 'react-native';
import { Text } from 'react-native-gesture-handler';
import { useSearch } from '../../context/SearchContext';

function BottomSheetHeader() {
  const { markets } = useSearch();

  return (
    <View className="h-[60px] rounded-t-3xl relative pb-1 bg-primary">
      <View className="w-[32px] h-[4px] rounded-sm bg-bg m-auto" />
      <Text className="text-center text-md font-semibold text-tertiary pb-1">
        {markets.length} Local Market{markets.length > 1 ? 's' : ''} around you
      </Text>
    </View>
  );
}

export default BottomSheetHeader;
