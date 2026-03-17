import { Alert, Linking, Text, TouchableOpacity, View } from 'react-native';

const FEEDBACK_URL = 'https://github.com/EunbinJung/LocalmarketFinder/issues/new';

function MyFeedback() {
  return (
    <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
      <Text className="text-lg font-bold text-gray-900">🧑‍💻 Feedback</Text>
      <Text className="text-gray-600 mt-2">
        Report bugs or request features via GitHub Issues.
      </Text>
      <TouchableOpacity
        onPress={() => {
          Linking.openURL(FEEDBACK_URL).catch(() => {
            Alert.alert('Error', 'Could not open the feedback page.');
          });
        }}
        activeOpacity={0.85}
        className="mt-4 bg-primary px-4 py-3 rounded-2xl"
      >
        <Text className="text-white font-semibold text-center">
          Open GitHub Issues
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default MyFeedback;
