import MarketCard from './marketCard/MarketCard';
import { useSearch } from '../../context/SearchContext';
import { ActivityIndicator, Text, View } from 'react-native';
import MarketFilter from './marketFilter/MarketFilter';

function MarketList() {
  const { filteredMarkets, markets, loading } = useSearch();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FF8A65" />
      </View>
    );
  }

  const list = filteredMarkets.length > 0 ? filteredMarkets : markets;

  if (list.length === 0) {
    return (
      <View className="flex gap-4 w-full mb-30">
        <MarketFilter />
        <Text className="text-center text-gray-500 mt-10">
          No markets found nearby.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex gap-4 w-full mb-30 overflow-x-scroll scrollbar-hide">
      <MarketFilter />
      {list.map(market => (
        <MarketCard key={market.place_id} market={market} />
      ))}
    </View>
  );
}

export default MarketList;
