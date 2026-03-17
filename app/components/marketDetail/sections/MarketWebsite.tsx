import { Linking, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  website: string;
}

function getWebsiteBadge(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com')) return { label: 'Instagram', emoji: '📸' };
  if (lower.includes('facebook.com') || lower.includes('fb.com')) return { label: 'Facebook', emoji: '📘' };
  return { label: 'Website', emoji: '🔗' };
}

function MarketWebsite({ website }: Props) {
  const { label, emoji } = getWebsiteBadge(website);
  const safeUrl = website.startsWith('http') ? website : `https://${website}`;

  return (
    <View
      className="mb-5 pb-5 bg-white rounded-3xl p-5"
      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
    >
      <View className="flex-row items-center gap-2 mb-1">
        <TouchableOpacity
          onPress={() => Linking.openURL(safeUrl)}
          activeOpacity={0.7}
          className="bg-secondary w-10 h-10 rounded-full justify-center items-center"
        >
          <Text className="text-xl">{emoji}</Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-800">{label}</Text>
      </View>
    </View>
  );
}

export default MarketWebsite;
