import { Text, View } from 'react-native';

interface Props {
  uid: string | null;
}

function MyAccountCard({ uid }: Props) {
  return (
    <View className="mx-4 mt-3 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
      <Text className="text-lg font-bold text-gray-900">🧾 Data / Account</Text>
      <Text className="text-sm text-gray-600 mt-1">Anonymous user id</Text>
      <View className="mt-4 bg-tertiary rounded-2xl px-4 py-3">
        <Text className="text-xs text-gray-600 font-semibold">User ID</Text>
        <Text className="text-sm text-gray-900 font-semibold mt-1">{uid || '—'}</Text>
      </View>
    </View>
  );
}

export default MyAccountCard;
