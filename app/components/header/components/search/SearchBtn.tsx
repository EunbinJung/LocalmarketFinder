import { TextInput, TouchableOpacity, View } from 'react-native';
import SearchIcon from '../../../../assets/icons/search.svg';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import { useSearch } from '../../../../context/SearchContext';
import { RootStackParamList } from './SearchInput';

function SearchBtn() {
  const { setIsSearch } = useSearch();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleSearch = () => {
    setIsSearch(true);
    navigation.navigate('Search');
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      className="w-full h-[48px] bg-tertiary shadow-sm shadow-gray-400 rounded-full"
      onPress={handleSearch}
    >
      <View
        className={`flex flex-row items-center justify-between h-full pr-7 pl-10`}
      >
        <TextInput
          placeholder="Search"
          className="text-[20px] font-medium placeholder:text-gray-400"
          editable={false}
        />
        <SearchIcon width={28} height={28} />
      </View>
    </TouchableOpacity>
  );
}

export default SearchBtn;
