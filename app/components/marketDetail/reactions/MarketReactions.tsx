import { Text, View } from 'react-native';
import ReactionField from './ReactionField';

interface Props {
  placeId: string;
}

function MarketReactions({ placeId }: Props) {
  return (
    <View className="mb-5">
      <Text className="text-lg font-bold text-gray-800 mb-4 ml-2">Market Info</Text>
      <View
        className="bg-white rounded-3xl p-4"
        style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
      >
        <ReactionField fieldName="parking" label="🅿️ Parking" placeId={placeId} />
        <ReactionField fieldName="petFriendly" label="🐾 Pet Friendly" placeId={placeId} />
        <ReactionField fieldName="reusable" label="♻️ Reusable" placeId={placeId} />
        <ReactionField fieldName="toilet" label="🚻 Toilet" placeId={placeId} />
        <ReactionField fieldName="liveMusic" label="🎵 Live Music" placeId={placeId} />
        <ReactionField fieldName="accessibility" label="♿ Accessibility" placeId={placeId} />
      </View>
    </View>
  );
}

export default MarketReactions;
