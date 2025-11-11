import { useNavigation } from '@react-navigation/native';
import { View } from 'react-native';
import BackBtn from '../components/header/components/BackBtn';
import { useSearch } from '../context/SearchContext';
import SearchInput from '../components/header/components/search/SearchInput';

function SearchScreen() {
  const { setIsSearch } = useSearch();
  const navigation = useNavigation();

  const handleBack = () => {
    setIsSearch(false);
    navigation.goBack();
  };

  return (
    <View className="flex-1 items-center justify-center pt-[78px] relative">
      <View className="flex flex-1 gap-[0.3px] w-[90%] h-screen flex-row justify-between px-2 bg-tertiary rounded-tl-3xl rounded-tr-3xl shadow-sm relative">
        <View className="absolute left-2 top-3 z-[2000]">
          <BackBtn onPress={handleBack} />
        </View>
        <SearchInput />
      </View>
    </View>
  );
}

export default SearchScreen;
