import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Market, useSearch } from '../../../context/SearchContext';
import { getMarketOpenStatus } from '../../../utils/marketOpenStatus';
import { getPhotoUrl } from '../../../utils/photoUtils';
import { useMemo, useEffect } from 'react';

interface MarketCardProps {
  market: Market;
}

function MarketCard({ market }: MarketCardProps) {
  // All hooks must be called before any early returns
  const { setSelectedMarket } = useSearch();
  
  // Google Places Photo URL 생성
  // Support both formats: photos array or direct photo_reference field
  const photoUrl = useMemo(() => {
    if (!market?.photo_reference) return null;
    return getPhotoUrl(market.photo_reference, 400);
  }, [market?.photo_reference]);

  // Debug logging
  useEffect(() => {
    if (!market?.name) {
      console.error('❌ [MarketCard] Market without name:', {
        place_id: market?.place_id,
        hasName: !!market?.name,
        marketKeys: market ? Object.keys(market) : []
      });
    }
  }, [market]);

  // Safety check: if market or name is missing, don't render
  if (!market || !market.name) {
    console.error('❌ [MarketCard] Cannot render - missing market or name:', {
      hasMarket: !!market,
      hasName: !!market?.name,
      place_id: market?.place_id
    });
    return null;
  }

  const openStatus = getMarketOpenStatus(market.opening_hours?.periods);
  const { status, nextOpenText } = openStatus;
  const isOpenNow = status === 'OPEN_NOW';

  // Helper function to get status text
  const getStatusText = () => {
    if (status === 'OPEN_NOW') {
      return 'Market is open now';
    }
    if (status === 'CLOSED') {
      // If we have next open text, show it
      if (nextOpenText) {
        return nextOpenText;
      }
      // Otherwise show generic closed message
      return 'Closed';
    }
    if (status === 'INVALID') {
      return 'Opening hours not available';
    }
    return 'Closed';
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      className="bg-white px-5 py-4 border-b-8 border-gray-100"
      onPress={() => setSelectedMarket(market)}
    >
      {/* Header: Name + Status */}
      <View className="flex-1 pr-2">
        <Text className="text-2xl font-semibold text-gray-700 mb-2">
          {market.name}
        </Text>
      </View>

      <View className="flex-row items-center justify-start gap-2 mb-2">
        <Text className="text-md text-gray-500">
          {market.rating || 'No rating'} 🌟
        </Text>
        <Text className="text-md text-gray-500">
          {market.user_ratings_total || 'No reviews'} 💬
        </Text>
      </View>

      <View className="flex-row items-center justify-start gap-2 mb-1">
        <Text
          className={`${isOpenNow ? 'text-green-500' : 'text-red-500'} text-md font-semibold`}
        >
          {isOpenNow ? 'Open' : 'Closed'}
        </Text>
        <Text className="text-md text-gray-600">
          {getStatusText()}
        </Text>
      </View>

      {photoUrl ? (
        <View className="mt-3">
          <Image
            source={{ uri: photoUrl }}
            className="w-full h-40 rounded-lg"
            resizeMode="cover"
          />
        </View>
      ) : (
        <View className="mt-3 w-full h-40 bg-gray-200 rounded-lg justify-center items-center">
          <Text className="text-gray-500">Localmarket Finder</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default MarketCard;
