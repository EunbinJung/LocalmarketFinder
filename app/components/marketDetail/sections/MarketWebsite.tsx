import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { Camera, Globe, Instagram } from 'lucide-react-native';

interface Props {
  website: string;
}

function getWebsiteBadge(url: string) {
  const lower = url.toLowerCase();
  if (lower.includes('instagram.com'))
    return { label: 'Instagram', Icon: Instagram };
  if (lower.includes('facebook.com') || lower.includes('fb.com'))
    return { label: 'Facebook', Icon: Globe };
  return { label: 'Website', Icon: Camera };
}

function MarketWebsite({ website }: Props) {
  const { label, Icon } = getWebsiteBadge(website);
  const safeUrl = website.startsWith('http') ? website : `https://${website}`;

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
      <TouchableOpacity
        onPress={() => Linking.openURL(safeUrl)}
        activeOpacity={0.7}
        className="flex-row items-center gap-2"
      >
        <View className="bg-secondary w-10 h-10 rounded-full justify-center items-center">
          <Icon size={20} color="#E69DB8" />
        </View>
        <Text className="text-lg font-bold text-gray-800">{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default MarketWebsite;
