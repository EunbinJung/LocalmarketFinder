import { Text, View } from 'react-native';
import { Smartphone } from 'lucide-react-native';

interface AppMeta {
  version: string;
  build: string;
  reactNative: string;
}

interface Props {
  appMeta: AppMeta;
}

function MyAppInfo({ appMeta }: Props) {
  return (
    <View className="mx-4 mb-4 bg-white rounded-3xl border border-gray-100 p-5">
      <View className="flex-row items-center gap-2">
        <Smartphone size={18} color="#1F2937" />
        <Text className="text-lg font-bold text-gray-900">App info</Text>
      </View>
      <View className="mt-4 gap-2">
        <View className="flex-row justify-between">
          <Text className="text-gray-600">Version</Text>
          <Text className="text-gray-900 font-semibold">{appMeta.version}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-600">Build</Text>
          <Text className="text-gray-900 font-semibold">{appMeta.build}</Text>
        </View>
        {!!appMeta.reactNative && (
          <View className="flex-row justify-between">
            <Text className="text-gray-600">React Native</Text>
            <Text className="text-gray-900 font-semibold">{appMeta.reactNative}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default MyAppInfo;
