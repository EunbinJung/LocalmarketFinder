import { Image, Text, View } from 'react-native';

interface Props {
  photoUrl: string | null;
}

function MarketPhoto({ photoUrl }: Props) {
  return (
    <View
      className="mt-5 mb-5 rounded-3xl overflow-hidden"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 }}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} className="w-full h-72" resizeMode="cover" />
      ) : (
        <View className="w-full h-72 bg-secondary justify-center items-center">
          <Text className="text-primary text-lg font-semibold">Localmarket Finder</Text>
        </View>
      )}
    </View>
  );
}

export default MarketPhoto;
