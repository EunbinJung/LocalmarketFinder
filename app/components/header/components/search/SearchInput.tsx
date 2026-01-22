import { GOOGLE_MAPS_API_KEY } from '@env';
import { Alert, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSearch } from '../../../../context/SearchContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: { screen: 'Map' | 'Feed' | 'My' };
  Search: undefined;
};

function SearchInput() {
  const { isSearch, setSelectedLocation, setIsSearch } = useSearch();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleSearchInput = async (input: string) => {
    if (!input) return;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          input,
        )}&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await response.json();

      if (data.status === 'OK' && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        setSelectedLocation({ lat, lng });
        setIsSearch(false);
        navigation.navigate('MainTabs', { screen: 'Map' });
      } else {
        Alert.alert('검색 결과가 없습니다. 정확한 주소를 입력해주세요.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('검색 중 오류가 발생했습니다.');
    }
  };

  return (
    <View
      className="flex pt-0.5 flex-1"
      pointerEvents={isSearch ? 'auto' : 'box-none'}
    >
      <GooglePlacesAutocomplete
        placeholder="Search"
        query={{ key: GOOGLE_MAPS_API_KEY, language: 'en', types: 'geocode' }}
        onPress={(data, details = null) => {
          if (details?.geometry?.location) {
            const { lat, lng } = details.geometry.location;
            setSelectedLocation({ lat, lng });
            setIsSearch(false);
            navigation.navigate('MainTabs', {
              screen: 'Map',
            });
          }
        }}
        fetchDetails={true}
        timeout={20000}
        minLength={2}
        predefinedPlaces={[]}
        enableHighAccuracyLocation={true}
        autoFillOnNotFound={true}
        onFail={error => console.error('Places Error:', error)}
        listViewDisplayed={isSearch}
        styles={{
          container: { flex: 1 },
          textInputContainer: {
            flexDirection: 'row',
          },
          textInput: {
            paddingLeft: 35,
            fontSize: 20,
            backgroundColor: 'transparent',
          },
          listView: {
            backgroundColor: 'transparent',
            zIndex: 1000,
          },
          row: {
            backgroundColor: 'transparent',
            zIndex: 1000,
            paddingVertical: 12,
            paddingHorizontal: 10,
            alignItems: 'center',
            minHeight: 30,
          },
          separator: {
            height: 1,
            backgroundColor: '#FFD0C7',
          },
          poweredContainer: {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
          },
        }}
        enablePoweredByContainer={true}
        textInputProps={{
          placeholderTextColor: 'gray',
          autoFocus: isSearch,
          editable: isSearch,
          onSubmitEditing: ({ nativeEvent }) => {
            const input = nativeEvent.text;
            handleSearchInput(input);
          },
        }}
        debounce={300}
        suppressDefaultStyles={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

export default SearchInput;
