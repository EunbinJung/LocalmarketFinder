import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';
import { Comment } from '../../../services/marketDetailsService';
import { auth } from '../../../services/firebase';

const REPORT_URL = 'https://github.com/EunbinJung/LocalmarketFinder/issues/new?title=Report+Inappropriate+Comment&body=Please+describe+the+issue+with+this+comment.';

interface Props {
  comment: Comment;
  onDelete: (commentId: string | undefined) => void;
}

function formatDate(timestamp: any): string {
  if (!timestamp) return 'Recently';
  try {
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString();
    return 'Recently';
  } catch {
    return 'Recently';
  }
}

function CommentItem({ comment, onDelete }: Props) {
  const canDelete = auth.currentUser?.uid === comment.userId;

  const handleReport = () => {
    Alert.alert(
      'Report Comment',
      'Report this comment as inappropriate?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => Linking.openURL(REPORT_URL),
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(comment.id || comment.userId || undefined),
        },
      ],
    );
  };

  return (
    <View
      className="bg-tertiary p-4 rounded-2xl mb-3"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}
    >
      <View className="flex-row justify-between items-start mb-3">
        <Text className="text-base text-gray-800 flex-1 leading-6">{comment.text}</Text>
        {canDelete ? (
          <TouchableOpacity
            onPress={handleDelete}
            className="ml-2 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-lg">🗑️</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleReport}
            className="ml-2 p-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-xs text-gray-400">Report</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text className="text-xs text-gray-500 font-medium">{formatDate(comment.createdAt)}</Text>
    </View>
  );
}

export default CommentItem;
