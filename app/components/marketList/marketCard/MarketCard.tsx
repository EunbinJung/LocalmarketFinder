import { Text, TouchableOpacity, View } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { MessageCircle, Star } from 'lucide-react-native';
import { Market, useSearch } from '../../../context/SearchContext';
import { getMarketOpenStatus } from '../../../utils/marketOpenStatus';
import { getPhotoUrl } from '../../../utils/photoUtils';
import { useMemo } from 'react';

interface MarketCardProps {
  market: Market;
}

function MarketCard({ market }: MarketCardProps) {
  // All hooks must be called before any early returns
  const { setSelectedMarket } = useSearch();
  
  // Photo URL - prefers Firebase Storage, falls back to Google Places API
  const photoUrl = useMemo(() => {
    return getPhotoUrl(market?.photo_reference, market?.photo_storage_url, 400);
  }, [market?.photo_reference, market?.photo_storage_url]);

  // Safety check: if market or name is missing, don't render
  if (!market || !market.name) {
    return null;
  }

  const openStatus = getMarketOpenStatus(market.opening_hours?.periods);
  const { status, nextOpenText } = openStatus;
  const isOpenNow = status === 'OPEN_NOW';

  const getStatusText = () => {
    if (status === 'OPEN_NOW') {
      return 'Market is open now';
    }
    if (status === 'CLOSED') {
      return nextOpenText || 'Closed';
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
      <View className="pr-2">
        <Text className="text-2xl font-semibold text-gray-700 mb-2">
          {market.name}
        </Text>
      </View>

      <View className="flex-row items-center justify-start gap-2 mb-2">
        <View className="flex-row items-center gap-1">
          <Star size={14} color="#FBBF24" fill="#FBBF24" />
          <Text className="text-md text-gray-500">{market.rating || 'No rating'}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <MessageCircle size={14} color="#9CA3AF" />
          <Text className="text-md text-gray-500">{market.user_ratings_total || 'No reviews'}</Text>
        </View>
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
          <FastImage
            source={{ uri: photoUrl, priority: FastImage.priority.normal }}
            style={{ width: '100%', height: 160, borderRadius: 8 }}
            resizeMode={FastImage.resizeMode.cover}
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
