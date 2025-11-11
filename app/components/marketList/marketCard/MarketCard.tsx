import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Market } from '../../../context/SearchContext';
import { calculateNextOpenDay } from './utils/calculateNextOpenDay';
import { GOOGLE_MAPS_API_KEY } from '@env';

interface MarketCardProps {
  market: Market;
}

function MarketCard({ market }: MarketCardProps) {
  const nextOpenInfo = calculateNextOpenDay(
    market.details?.opening_hours?.periods,
  );
  const { text, daysAhead, isOpenNow } = nextOpenInfo;

  // Google Places Photo URL 생성
  const photoUrl = market.photos?.[0]?.photo_reference
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${market.photos[0].photo_reference}&key=${GOOGLE_MAPS_API_KEY}`
    : null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      className="bg-white px-5 py-4 border-b-8 border-gray-100"
    >
      {/* Header: Name + Status */}
      <View className="flex-1 pr-2">
        <Text className="text-2xl font-semibold text-gray-700 mb-2">
          {market.name}
        </Text>
      </View>

      <View className="flex-row items-center justify-start gap-2 mb-1">
        <Text className="text-sm text-gray-500">
          {market.rating || 'No rating'} 🌟
        </Text>
        <Text className="text-sm text-gray-500">
          {market.user_ratings_total || 'No reviews'} 💬
        </Text>
      </View>

      <View className="flex-row items-center justify-start gap-2 mb-1">
        <Text
          className={`${isOpenNow ? 'text-green-500' : 'text-red-500'} text-sm font-semibold`}
        >
          {isOpenNow ? 'Open' : 'Closed'}
        </Text>
        <Text className="text-sm text-gray-600">
          {isOpenNow
            ? 'Market is open now'
            : daysAhead === 0
              ? `Open today ${text?.split(' ').slice(2).join(' ')}`
              : daysAhead === 1
                ? `Opens tomorrow ${text?.split(' ').slice(2).join(' ')}`
                : `Next market in ${daysAhead} days (${text})`}
        </Text>
      </View>

      {photoUrl && (
        <View className="mt-3">
          <Image
            source={{ uri: photoUrl }}
            className="w-full h-40 rounded-lg"
            resizeMode="cover"
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

export default MarketCard;
