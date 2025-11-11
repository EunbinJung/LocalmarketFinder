import { Text, TouchableOpacity, View } from 'react-native';
import { useSearch } from '../../../context/SearchContext';
import { calculateNextOpenDay } from '../marketCard/utils/calculateNextOpenDay';

function MarketFilter() {
  const { markets, setFilteredMarkets, selectedLocation } = useSearch();

  const filterOptions = [
    {
      label: 'All Markets',
      value: 'all',
      onPress: () => {
        setFilteredMarkets(markets);
      },
    },
    {
      label: 'Closest to Me',
      value: 'near-me',
      onPress: () => {
        if (!selectedLocation) return;

        const sorted = [...markets].sort((a, b) => {
          const distanceA = Math.sqrt(
            Math.pow(a.geometry.location.lat - selectedLocation.lat, 2) +
              Math.pow(a.geometry.location.lng - selectedLocation.lng, 2),
          );
          const distanceB = Math.sqrt(
            Math.pow(b.geometry.location.lat - selectedLocation.lat, 2) +
              Math.pow(b.geometry.location.lng - selectedLocation.lng, 2),
          );
          return distanceA - distanceB;
        });
        console.log(sorted);
        setFilteredMarkets(sorted);
      },
    },
    {
      label: 'Opening soon',
      value: 'open-soon',
      onPress: () => {
        const soonMarkets = markets
          .map(market => {
            const next = calculateNextOpenDay(
              market.details?.opening_hours?.weekday_text,
            );
            return { ...market, next };
          })
          .filter(m => m.next?.daysAhead !== null)
          .sort((a, b) => (a.next!.daysAhead ?? 7) - (b.next!.daysAhead ?? 7));

        setFilteredMarkets(soonMarkets);
      },
    },
    {
      label: 'Open Now',
      value: 'open-now',
      onPress: () => {
        const openNow = markets.filter(
          market => market.opening_hours?.open_now === true,
        );
        setFilteredMarkets(openNow);
      },
    },
  ];

  return (
    <View className="flex-row items-center justify-start gap-2 mt-3 mx-4 overflow-x-scroll scrollbar-hide">
      {filterOptions.map(option => (
        <TouchableOpacity
          key={option.value}
          className="py-1 px-2 rounded-lg bg-gray-200"
          onPress={option.onPress}
        >
          <Text className="text-lg font-semibold text-gray-800">
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default MarketFilter;
