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
        <View className="flex-1 items-center justify-center mt-20">
          <Text className="text-center text-gray-500 text-lg">
            {filteredMarkets.length === 0 && markets.length > 0
              ? 'No markets match your filter.'
              : 'No markets found nearby.'}
        </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex gap-4 w-full mb-30">
      <MarketFilter />
      {list.map((market) => {
        try {
          return <MarketCard key={market.place_id} market={market} />;
        } catch (error) {
          console.error('Error rendering market:', error);
          return null;
        }
      })}
    </View>
  );
}

export default MarketList;
