import { View } from 'react-native';
import SearchBtn from './components/search/SearchBtn';

function Header() {
  return (
    <View className="flex-row w-full items-center justify-between absolute top-20 left-0 right-0 z-10 px-4 pt-2">
      <View className="flex-row items-center justify-between">
        <SearchBtn />
      </View>
    </View>
  );
}

export default Header;
