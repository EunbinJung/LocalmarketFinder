import { Text, View } from 'react-native';
import Header from '../components/header/Header';
import BottomSheet from '../components/bottomsheet/BottomSheet';

function MapScreen() {
  return (
    <View className="flex-1 pt-20 relative">
      <Header />
      <Text>MapScreen</Text>
      <BottomSheet />
    </View>
  );
}

export default MapScreen;
