import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  onSubmit: (text: string) => void;
  onCancel: () => void;
  loading: boolean;
  onFocusInput?: () => void;
}

function CommentInput({ onSubmit, onCancel, loading, onFocusInput }: Props) {
  const [commentText, setCommentText] = useState('');

  const handleSubmit = () => {
    if (commentText.trim()) {
      onSubmit(commentText.trim());
      setCommentText('');
    }
  };

  return (
    <View className="p-4 bg-gray-50 border-t border-gray-200">
      <TextInput
        value={commentText}
        onChangeText={setCommentText}
        placeholder="Write an anonymous comment..."
        multiline
        className="bg-white border border-gray-300 rounded-lg p-3 text-gray-700 min-h-[80px] mb-3"
        editable={!loading}
        onFocus={() => onFocusInput?.()}
      />
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !commentText.trim()}
          className="flex-1 bg-primary py-3 rounded-lg"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold">Submit</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setCommentText(''); onCancel(); }}
          disabled={loading}
          className="flex-1 bg-gray-300 py-3 rounded-lg"
        >
          <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default CommentInput;
