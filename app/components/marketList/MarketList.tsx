import MarketCard from './marketCard/MarketCard';
import { useSearch } from '../../context/SearchContext';
import { ActivityIndicator, Text, View } from 'react-native';
import MarketFilter from './marketFilter/MarketFilter';

type SelectedFilter = 'all' | 'near-me' | 'open-now';

function MarketList({
  onUserChangedFilter,
  selectedFilter,
  setSelectedFilter,
}: {
  onUserChangedFilter?: () => void;
  selectedFilter: SelectedFilter;
  setSelectedFilter: (value: SelectedFilter) => void;
}) {
  const { filteredMarkets, markets, loading } = useSearch();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#FF8A65" />
      </View>
    );
  }

  // Always render filteredMarkets.
  // If it's empty, we show an empty state (instead of silently falling back to `markets`,
  // which makes filters feel like they did nothing).
  const list = filteredMarkets;

  if (list.length === 0) {
    return (
      <View className="flex gap-4 w-full mb-30">
        <MarketFilter
          onUserChangedFilter={onUserChangedFilter}
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
        />
        <View className="flex-1 items-center justify-center mt-20">
          <Text className="text-center text-gray-500 text-lg">
            {markets.length > 0
              ? 'No markets match your filter.'
              : 'No markets found nearby.'}
        </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex gap-4 w-full mb-30">
      <MarketFilter
        onUserChangedFilter={onUserChangedFilter}
        selectedFilter={selectedFilter}
        setSelectedFilter={setSelectedFilter}
      />
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
