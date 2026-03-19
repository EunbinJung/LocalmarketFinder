import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { Comment } from '../../../services/marketDetailsService';
import CommentInput from './CommentInput';
import CommentItem from './CommentItem';

interface Props {
  comments: Comment[];
  loadingComments: boolean;
  submittingComment: boolean;
  onAddComment: (text: string) => void;
  onDeleteComment: (commentId: string | undefined) => void;
  onLoadMore: () => void;
  onFocusInput: () => void;
}

function CommentsSection({
  comments,
  loadingComments,
  submittingComment,
  onAddComment,
  onDeleteComment,
  onLoadMore,
  onFocusInput,
}: Props) {
  return (
    <View
      className="mb-5 pb-5 bg-white rounded-3xl p-5"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center gap-2 mb-4">
        <View className="bg-secondary w-10 h-10 rounded-full justify-center items-center">
          <MessageCircle size={20} color="#374151" />
        </View>
        <Text className="text-lg font-bold text-gray-800">Comments</Text>
      </View>

      <View className="mb-4">
        <CommentInput
          onSubmit={onAddComment}
          loading={submittingComment}
          onFocusInput={onFocusInput}
        />
      </View>

      {comments.length === 0 && !loadingComments ? (
        <View className="bg-tertiary rounded-2xl p-6 items-center">
          <Text className="text-gray-400 text-sm text-center">
            No comments yet. Be the first to comment! 💭
          </Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={item =>
            item.id || item.userId || `comment-${item.createdAt}`
          }
          renderItem={({ item }) => (
            <CommentItem comment={item} onDelete={onDeleteComment} />
          )}
          scrollEnabled={false}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingComments ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#E69DB8" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

export default CommentsSection;
