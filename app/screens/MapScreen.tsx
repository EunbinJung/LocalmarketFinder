import { View } from 'react-native';
import Header from '../components/header/Header';
import BottomSheet from '../components/bottomsheet/BottomSheet';
import MapContent from '../components/map/MapContent';

function MapScreen() {
  return (
    <View className="flex-1 pt-20 relative bg-tertiary">
      <Header />
      <MapContent />
      <BottomSheet />
    </View>
  );
}

export default MapScreen;
