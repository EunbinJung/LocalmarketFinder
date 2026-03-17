import { Text, TouchableOpacity, View } from 'react-native';
import { Compass, MapPin } from 'lucide-react-native';

interface Props {
  formattedAddress: string;
  onOpenDirections: () => void;
}

function MarketLocation({ formattedAddress, onOpenDirections }: Props) {
  return (
    <View
      className="mb-5 pb-5 bg-white rounded-3xl p-5"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
    >
      <View className="flex-row items-center gap-2 mb-3">
        <View className="bg-secondary w-10 h-10 rounded-full justify-center items-center">
          <MapPin size={20} color="#E69DB8" />
        </View>
        <Text className="text-lg font-bold text-gray-800">Location</Text>
      </View>
      <Text className="text-gray-600 text-base leading-6 ml-12 mb-3">{formattedAddress}</Text>
      <TouchableOpacity
        onPress={onOpenDirections}
        className="ml-12 bg-primary px-4 py-2.5 rounded-full flex-row items-center gap-2 self-start"
      >
        <Compass size={16} color="#FFFFFF" />
        <Text className="text-white font-semibold text-sm">Directions</Text>
      </TouchableOpacity>
    </View>
  );
}

export default MarketLocation;
