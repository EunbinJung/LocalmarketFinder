import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { useNearbyMarkets } from './utils/fetchNearbyMarkets';
import { useSearch } from '../../context/SearchContext';
import MarkerIcon from '../../assets/icons/marker.svg';
import CurrentLocationIcon from '../../assets/icons/myMarker.svg';

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

function MapContent() {
  const [region, setRegion] = useState<Region | null>(null);
  const { markets, fetchNearbyMarkets, loading } = useNearbyMarkets();
  const { selectedLocation } = useSearch();

  // ✅ 1️⃣ 초기 위치 가져오기 (최초 마운트 시에만, selectedLocation이 없을 때만)
  useEffect(() => {
    if (selectedLocation || region) return; // 검색된 위치나 region이 이미 있으면 초기 위치 가져오지 않음

    const getLocation = async () => {
      Geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          const initialRegion = {
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          };
          //내 위치를 기준으로 주변 마켓 검색
          setRegion(initialRegion);
          fetchNearbyMarkets(latitude, longitude);
        },
        error => {
          console.log('❌ 위치 접근 거절 또는 오류:', error);
          Alert.alert(
            'Location Permission',
            'Location access denied. Showing a random area instead.',
          );
          // ❌ 권한 거절 시 시드니로 대체
          const randomRegion = {
            latitude: -33.8688,
            longitude: 151.2093,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setRegion(randomRegion);
          fetchNearbyMarkets(randomRegion.latitude, randomRegion.longitude);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    };
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 최초 마운트 시에만 실행

  // ✅ 2️⃣ 검색창에서 새로운 위치 선택 시 지도 갱신
  useEffect(() => {
    if (selectedLocation) {
      const { lat, lng } = selectedLocation;
      const newRegion = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(newRegion);
      fetchNearbyMarkets(lat, lng);
    }
  }, [selectedLocation, fetchNearbyMarkets]);

  useEffect(() => {
    console.log('markets', markets);
  }, [markets]);

  if (loading || !region)
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
      >
        {/* 내 위치마커 */}
        <Marker coordinate={region} title="현재 위치">
          <CurrentLocationIcon width={45} height={45} />
        </Marker>
        {/* 주변 마켓 마커 */}
        {markets.map(market => (
          <Marker
            key={market.place_id}
            coordinate={{
              latitude: market.geometry.location.lat,
              longitude: market.geometry.location.lng,
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
