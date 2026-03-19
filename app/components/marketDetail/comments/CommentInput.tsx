import { useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  onSubmit: (text: string) => void;
  loading: boolean;
  onFocusInput?: () => void;
}

function CommentInput({ onSubmit, loading, onFocusInput }: Props) {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = () => {
    if (commentText.trim()) {
      onSubmit(commentText.trim());
      setCommentText('');
    }
  };

  return (
    <View className="p-4">
      <TextInput
        value={commentText}
        onChangeText={setCommentText}
        placeholder="Write an anonymous comment..."
        multiline
        className="bg-white border border-gray-300 rounded-lg p-3 text-gray-700 min-h-[80px] mb-3"
        editable={!loading}
        onFocus={() => onFocusInput?.()}
      />
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={loading || !commentText.trim()}
        className="bg-primary py-3 rounded-lg"
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center font-semibold">Submit</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default CommentInput;
