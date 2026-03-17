import { ActivityIndicator, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { MyReactionItem } from '../types';

interface Props {
  reactions: MyReactionItem[];
  loadingReactions: boolean;
}

function MyReactions({ reactions, loadingReactions }: Props) {
  return (
    <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
      <View className="flex-row items-center justify-between">
        <View>
          <View className="flex-row items-center gap-2">
            <Sparkles size={18} color="#1F2937" />
            <Text className="text-lg font-bold text-gray-900">My reactions</Text>
          </View>
          <Text className="text-sm text-gray-600 mt-1">Your saved votes</Text>
        </View>
        {loadingReactions && <ActivityIndicator size="small" color="#E69DB8" />}
      </View>

      {reactions.length === 0 && !loadingReactions ? (
        <Text className="text-gray-600 mt-4">No reactions yet.</Text>
      ) : (
        <View className="mt-4 gap-3">
          {reactions.slice(0, 10).map(r => (
            <View key={r.placeId} className="bg-tertiary rounded-2xl p-4">
              <Text className="text-gray-900 font-semibold" numberOfLines={1}>
                {r.marketName || r.placeId}
              </Text>
              <View className="flex-row flex-wrap gap-2 mt-3">
                {r.fields.slice(0, 8).map(f => (
                  <View key={f.key} className="bg-white px-3 py-1.5 rounded-full">
                    <Text className="text-gray-700 text-xs font-semibold">
                      {f.key}: {f.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default MyReactions;
