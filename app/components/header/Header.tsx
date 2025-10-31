import { useNavigation } from '@react-navigation/native';
import { Text, View } from 'react-native';
import BackBtn from './components/BackBtn';

function Header() {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack();
    console.log('Back');
  };

  return (
    <View className="flex-row w-full items-center justify-between absolute top-20 left-0 right-0 z-10">
      <View className="flex-row items-center">
        {navigation.canGoBack() && <BackBtn onPress={handleBack} />}
      </View>
      <View className="flex-row items-center">
        <Text>Search</Text>
      </View>
    </View>
  );
}

export default Header;
