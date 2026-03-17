import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { MyCommentItem } from '../types';

interface Props {
  comments: MyCommentItem[];
  loadingComments: boolean;
  onDelete: (placeId: string, commentId: string) => void;
}

function MyComments({ comments, loadingComments, onDelete }: Props) {
  return (
    <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
      <View className="flex-row items-center justify-between">
        <View>
          <View className="flex-row items-center gap-2">
            <MessageCircle size={18} color="#1F2937" />
            <Text className="text-lg font-bold text-gray-900">My comments</Text>
          </View>
          <Text className="text-sm text-gray-600 mt-1">Your recent comments</Text>
        </View>
        {loadingComments && <ActivityIndicator size="small" color="#E69DB8" />}
      </View>

      {comments.length === 0 && !loadingComments ? (
        <Text className="text-gray-600 mt-4">No comments yet.</Text>
      ) : (
        <View className="mt-4 gap-3">
          {comments.slice(0, 10).map(c => (
            <View
              key={`${c.placeId}:${c.commentId}`}
              className="bg-tertiary rounded-2xl p-4"
            >
              <Text className="text-gray-900 font-semibold" numberOfLines={1}>
                {c.marketName || c.placeId}
              </Text>
              <Text className="text-gray-700 mt-2">{c.text}</Text>
              <View className="flex-row justify-end mt-3">
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Delete comment',
                      'Are you sure you want to delete this comment?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => onDelete(c.placeId, c.commentId),
                        },
                      ],
                    );
                  }}
                  className="px-4 py-2 rounded-full bg-white"
                  activeOpacity={0.85}
                >
                  <Text className="text-primary font-semibold">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default MyComments;
