import { GOOGLE_MAPS_API_KEY } from '@env';
import { View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSearch } from '../../../../context/SearchContext';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import {
  getCachedCoordinates,
  cacheCoordinates,
} from '../../../../utils/placeCoordinatesCache';
import { useSnackbar } from '../../../../context/SnackbarContext';


export type RootStackParamList = {
  MainTabs: { screen: 'Map' | 'Feed' | 'My' };
  Search: undefined;
};

function SearchInput() {
  const { isSearch, setSelectedLocation, setIsSearch } = useSearch();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const showSnackbar = useSnackbar();

  /**
   * Get coordinates from place_id using Place Details API
   * Uses cache if available to reduce API calls
   */
  const getCoordinatesFromPlaceId = async (
    placeId: string,
  ): Promise<{ lat: number; lng: number } | null> => {
    // Check cache first
    const cached = await getCachedCoordinates(placeId);
    if (cached) {
      return cached;
    }
    
    // Fetch from Place Details API (geometry.location only)
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry.location&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await response.json();

      if (data.status === 'OK' && data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        
        // Cache the coordinates
        await cacheCoordinates(placeId, lat, lng);
        
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error('SearchInput: failed to fetch place details', error);
      return null;
    }
  };

  /**
   * Handle Enter key - require selection from Autocomplete
   */
  const handleEnterKey = () => {
    showSnackbar(
      `After typing an address,\nchoose one from the list.`,
      'info',
    );
  };

  return (
    <View
      className="flex pt-0.5 flex-1"
      pointerEvents={isSearch ? 'auto' : 'box-none'}
    >
      <GooglePlacesAutocomplete
        placeholder="Search"
        query={{ key: GOOGLE_MAPS_API_KEY, language: 'en', types: 'geocode' }}
        onPress={async (data, _details = null) => {
          const placeId = data.place_id;
          
          if (!placeId) {
            return;
          }
          
          // Get coordinates from Place Details API (with cache)
          const coordinates = await getCoordinatesFromPlaceId(placeId);
          
          if (coordinates) {
            setSelectedLocation(coordinates);
            setIsSearch(false);
            navigation.navigate('MainTabs', {
              screen: 'Map',
            });
          } else {
            showSnackbar('Failed to get location information.', 'error');
          }
        }}
        fetchDetails={false}
        timeout={20000}
        minLength={2}
        predefinedPlaces={[]}
        enableHighAccuracyLocation={true}
        autoFillOnNotFound={true}
        onFail={error => console.error('Google Places Autocomplete error:', error)}
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
          onSubmitEditing: handleEnterKey,
        }}
        debounce={300}
        suppressDefaultStyles={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

export default SearchInput;
