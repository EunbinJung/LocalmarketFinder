import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { useSearch } from '../../context/SearchContext';
import CurrentLocationIcon from '../../assets/icons/myMarker.svg';
import MarkerIcon from '../../assets/icons/marker.svg'; 

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

function MapContent() {
  const [region, setRegion] = useState<Region | null>(null);
  const { selectedLocation, filteredMarkets, setMapCenter } = useSearch();

  // ✅ 1️⃣ 초기 위치 가져오기 (최초 마운트 시에만, selectedLocation이 없을 때만)
  useEffect(() => {
    // region이 이미 있으면 초기 위치 가져오지 않음
    if (region) return;

    const getLocation = async () => {
      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          const initialRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setRegion(initialRegion);
          setMapCenter({ lat: latitude, lng: longitude });
        },
        error => {
          Alert.alert(
            'Location Permission',
            'Location access denied. Showing a random area instead.',
          );
          // Fallback to Sydney if location access denied
          const randomRegion = {
            latitude: -33.8688,
            longitude: 151.2093,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          setRegion(randomRegion);
          setMapCenter({ lat: -33.8688, lng: 151.2093 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    };
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map when selected location changes
  useEffect(() => {
    if (selectedLocation) {
      const { lat, lng } = selectedLocation;
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      setMapCenter({ lat, lng });
    }
  }, [selectedLocation, setMapCenter]);

  if (!region)
    return (
      <View className="flex-1 items-center justify-center bg-tertiary">
        <ActivityIndicator size="large" color="#FF8A65" />
      </View>
    );

  return (
    <View className="flex-1" style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        region={region}
        style={{ flex: 1 }}
        showsUserLocation={true}
        zoomEnabled={true}
        zoomControlEnabled={false}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        onRegionChangeComplete={(newRegion) => {
          setMapCenter({ lat: newRegion.latitude, lng: newRegion.longitude });
        }}
      >
        <Marker coordinate={region} title="현재 위치">
          <CurrentLocationIcon width={45} height={45} />
        </Marker>
        {filteredMarkets.map(market => (
          <Marker
            key={market.place_id}
            coordinate={{
              latitude: market.geometry?.location.lat || 0,
              longitude: market.geometry?.location.lng || 0,
            }}
            title={market.name}
          >
            <MarkerIcon width={40} height={40} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MapContent;
