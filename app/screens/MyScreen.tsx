import { View } from 'react-native';
import MyHeader from '../components/my/MyHeader';
import MyContent from '../components/my/MyContent';

function MyScreen() {
  return (
    <View className="flex-1 pt-20 relative bg-tertiary">
      <MyHeader />
      <MyContent />
    </View>
  );
}

export default MyScreen;
