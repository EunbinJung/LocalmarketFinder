import { Text, TouchableOpacity, Alert, View } from 'react-native';
import { useSearch } from '../../../context/SearchContext';
import { getMarketOpenStatus } from '../../../utils/marketOpenStatus';
import { ScrollView } from 'react-native-gesture-handler';
import { useMemo, useEffect, useRef } from 'react';

type SelectedFilter = 'all' | 'near-me' | 'open-now';

function MarketFilter({
  onUserChangedFilter,
  selectedFilter,
  setSelectedFilter,
}: {
  onUserChangedFilter?: () => void;
  selectedFilter: SelectedFilter;
  setSelectedFilter: (value: SelectedFilter) => void;
}) {
  const {
    markets,
    setFilteredMarkets,
    selectedLocation,
    userLocation,
    mapCenter,
    scopeRadiusKm,
    setScopeRadiusKm,
  } = useSearch();

  // Defensive: markets can be non-array during initialization
  const safeMarkets = useMemo(() => (Array.isArray(markets) ? markets : []), [markets]);

  const pendingScrollToTopRef = useRef(false);

  const openNowMarkets = useMemo(() => {
    if (safeMarkets.length === 0) return [];

    return safeMarkets.filter(market => {
      if (!market?.name || !market?.place_id) return false;
      try {
        return getMarketOpenStatus(market?.opening_hours?.periods).status === 'OPEN_NOW';
      } catch {
        return false;
      }
    });
  }, [safeMarkets]);

  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    return Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2));
  };

  const getNearMeLocation = () => {
    if (userLocation) return userLocation;
    // Best-effort fallback: if we have no search selected, mapCenter may still be the device location
    if (!selectedLocation && mapCenter) return mapCenter;
    return null;
  };

  const applyFilter = (
    value: 'all' | 'near-me' | 'open-now',
    opts?: { userAction?: boolean },
  ) => {
    const userAction = !!opts?.userAction;

    if (value === 'all') {
      setFilteredMarkets(safeMarkets);
      return;
    }

    if (value === 'open-now') {
      // Always set (even if empty) so empty-state messaging works.
      setFilteredMarkets(openNowMarkets);
      return;
    }

    // near-me
    const baseLocation = getNearMeLocation();
    if (
      !baseLocation ||
      typeof baseLocation.lat !== 'number' ||
      typeof baseLocation.lng !== 'number'
    ) {
      if (userAction) {
        Alert.alert(
          'Location Required',
          'Please select a location or allow location access to use this filter.',
          [{ text: 'OK' }],
        );
      }
      return;
    }

    const marketsWithLocation = safeMarkets
      .filter(market => {
        const location = market?.geometry?.location;
        return (
          location &&
          typeof location.lat === 'number' &&
          typeof location.lng === 'number' &&
          !isNaN(location.lat) &&
          !isNaN(location.lng)
        );
      })
      .filter(m => m && m.place_id && m.name);

    if (marketsWithLocation.length === 0) {
      if (userAction) {
        Alert.alert(
          'No Markets Found',
          'No markets with valid location data available.',
          [{ text: 'OK' }],
        );
      }
      setFilteredMarkets([]); // ensure list reflects the chosen filter
      return;
    }

    const sorted = [...marketsWithLocation].sort((a, b) => {
      const aLoc = a.geometry?.location;
      const bLoc = b.geometry?.location;
      if (!aLoc || !bLoc) return 0;

      const distanceA = getDistance(aLoc.lat, aLoc.lng, baseLocation.lat, baseLocation.lng);
      const distanceB = getDistance(bLoc.lat, bLoc.lng, baseLocation.lat, baseLocation.lng);
      return distanceA - distanceB;
    });

    setFilteredMarkets(sorted);
  };

  const filterOptions = [
    {
      label: 'All Markets',
      value: 'all',
      onPress: () => applyFilter('all', { userAction: true }),
    },
    {
      label: 'Closest to Me',
      value: 'near-me',
      onPress: () => applyFilter('near-me', { userAction: true }),
    },
    {
      label: 'Open Now',
      value: 'open-now',
      onPress: () => applyFilter('open-now', { userAction: true }),
    },
  ];

  const radiusOptions = [15, 30, 50, 70, 150] as const;

  // Keep the selected filter applied when the scoped market list changes (e.g. radius change).
  // Suppress alerts on auto-apply.
  useEffect(() => {
    applyFilter(selectedFilter, { userAction: false });
    if (pendingScrollToTopRef.current) {
      pendingScrollToTopRef.current = false;
      onUserChangedFilter?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeMarkets, selectedFilter]);

  return (
    <View className="mt-3 mx-4">
      {/* Main filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
      >
        {filterOptions.map(option => {
          const selected = selectedFilter === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              className={`py-1 px-2 rounded-lg ${selected ? 'bg-primary' : 'bg-gray-200'}`}
              onPress={() => {
                pendingScrollToTopRef.current = true;
                setSelectedFilter(option.value as SelectedFilter);
                option.onPress();
              }}
              activeOpacity={0.7}
            >
              <Text className={`text-lg font-semibold ${selected ? 'text-white' : 'text-gray-800'}`}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Radius filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        className="mt-2"
      >
        <View className="py-1 px-2 rounded-lg bg-tertiary border border-gray-100 justify-center">
          <Text className="text-lg font-semibold text-gray-700">Radius</Text>
        </View>
        {radiusOptions.map(km => {
          const selected = scopeRadiusKm === km;
          return (
            <TouchableOpacity
              key={`radius-${km}`}
              className={`py-1 px-2 rounded-lg ${selected ? 'bg-primary' : 'bg-gray-200'}`}
                  onPress={() => {
                    pendingScrollToTopRef.current = true;
                    setScopeRadiusKm(km);
                  }}
              activeOpacity={0.7}
            >
              <Text className={`text-lg font-semibold ${selected ? 'text-white' : 'text-gray-800'}`}>
                {km}km
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default MarketFilter;
