import { Text, TouchableOpacity, Alert } from 'react-native';
import { useSearch } from '../../../context/SearchContext';
import { getMarketOpenStatus } from '../../../utils/marketOpenStatus';
import { ScrollView } from 'react-native-gesture-handler';

function MarketFilter() {
  const { markets, setFilteredMarkets, selectedLocation, mapCenter } = useSearch();

  const getDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) => {
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
  };
  
  const getBaseLocation = () => {
    if (selectedLocation) return selectedLocation;
    return mapCenter; // 지도 중심 fallback
  };

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
        const baseLocation = getBaseLocation();
        
        if (!baseLocation) {
          Alert.alert(
            'Location Required',
            'Please select a location or allow location access to use this filter.',
            [{ text: 'OK' }],
          );
          return;
        }

        // Filter out markets without valid coordinates
        const marketsWithLocation = markets.filter(market => {
          const location = market.geometry?.location;
          return (
            location &&
            typeof location.lat === 'number' &&
            typeof location.lng === 'number' &&
            !isNaN(location.lat) &&
            !isNaN(location.lng)
          );
        });

        if (marketsWithLocation.length === 0) {
          Alert.alert(
            'No Markets Found',
            'No markets with valid location data available.',
            [{ text: 'OK' }],
          );
          return;
        }

        // Sort by distance
        const sorted = [...marketsWithLocation].sort((a, b) => {
          const aLoc = a.geometry!.location;
          const bLoc = b.geometry!.location;

          const distanceA = getDistance(
            aLoc.lat,
            aLoc.lng,
            baseLocation.lat,
            baseLocation.lng,
          );

          const distanceB = getDistance(
            bLoc.lat,
            bLoc.lng,
            baseLocation.lat,
            baseLocation.lng,
          );

          return distanceA - distanceB;
        });

        setFilteredMarkets(sorted);
      },
    },
    {
      label: 'Open Now',
      value: 'open-now',
      onPress: () => {
        const openNow = markets.filter(market => {
          try {
            const status = getMarketOpenStatus(market.opening_hours?.periods);
            // Only include markets that are currently open
            // Exclude INVALID and CLOSED markets
            return status.status === 'OPEN_NOW';
          } catch {
            // If status calculation fails, exclude the market
            return false;
          }
        });

        if (openNow.length === 0) {
          Alert.alert(
            'No Markets Open',
            'There are no open markets at the moment.',
            [{ text: 'OK' }],
          );
          return;
        }

        setFilteredMarkets(openNow);
      },
    },
  ];

  return (
    <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: 8, paddingRight: 16 }}
    className="mt-3 mx-4">
      {filterOptions.map(option => (
        <TouchableOpacity
          key={option.value}
          className="py-1 px-2 rounded-lg bg-gray-200"
          onPress={option.onPress}
          activeOpacity={0.7}
        >
          <Text className="text-lg font-semibold text-gray-800">
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default MarketFilter;
