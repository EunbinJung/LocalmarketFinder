import { Image, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  name: string;
  rating?: number;
  userRatingsTotal?: number;
  onOpenGoogleMapsReviews: () => void;
}

function MarketNameCard({ name, rating, userRatingsTotal, onOpenGoogleMapsReviews }: Props) {
  return (
    <View
      className="mb-5 pb-5 bg-tertiary rounded-3xl p-5"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
    >
      <Text className="text-3xl font-bold text-gray-800 mb-3">{name}</Text>
      {(rating || userRatingsTotal) && (
        <TouchableOpacity onPress={onOpenGoogleMapsReviews} className="flex-row items-center gap-3 mt-2">
          <View className="bg-white px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
            <Image source={require('../../../assets/icons/google.png')} className="w-4 h-4" resizeMode="contain" />
            <Text className="text-gray-700 font-semibold text-sm">Google</Text>
          </View>
          {rating && (
            <View className="bg-white px-3 py-1.5 rounded-full flex-row items-center gap-1">
              <Text className="text-lg">⭐</Text>
              <Text className="text-gray-700 font-semibold text-sm">{rating}</Text>
            </View>
          )}
          {userRatingsTotal && (
            <View className="bg-white px-3 py-1.5 rounded-full flex-row items-center gap-1">
              <Text className="text-lg">💬</Text>
              <Text className="text-gray-700 font-semibold text-sm">{userRatingsTotal} reviews</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

export default MarketNameCard;
