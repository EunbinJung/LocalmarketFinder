import { useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { Locate } from 'lucide-react-native';
import { useSearch } from '../../context/SearchContext';
import CurrentLocationIcon from '../../assets/icons/myMarker.svg';
import { Market } from '../../services/marketService';
import MarketMarker from './MarketMarker';

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

function MapContent() {
  const [region, setRegion] = useState<Region | null>(null);
  const { selectedLocation, filteredMarkets, setMapCenter, setUserLocation, userLocation, setSelectedLocation, setFocusedMarketId } = useSearch();
  const mapRef = useRef<MapView>(null);
  const isProgrammaticMoveRef = useRef(false);
  const lastSelectedLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const [mapMarkers, setMapMarkers] = useState<Market[]>([]);

  // Marker 안정화: place_id 순서 기준
  const markerMarkets = useMemo(() => {
    if (!Array.isArray(filteredMarkets)) return [];
    return filteredMarkets
      .filter(m => m.geometry?.location)
      .sort((a, b) => a.place_id.localeCompare(b.place_id));
  }, [filteredMarkets]);

  // Marker 업데이트를 debounce + identity 체크
  useEffect(() => {
    const timer = setTimeout(() => {
      // 이전 배열과 완전히 동일하면 갱신하지 않음
      if (
        mapMarkers.length === markerMarkets.length &&
        mapMarkers.every((m, i) => m.place_id === markerMarkets[i].place_id)
      ) return;

      setMapMarkers(markerMarkets);
    }, 100); // 100ms 지연
    return () => clearTimeout(timer);
  }, [markerMarkets, mapMarkers]);

  // 위치 가져오기
  useEffect(() => {
    if (region) return;

    Geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const initRegion = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
        setRegion(initRegion);
        setMapCenter({ lat: latitude, lng: longitude });
        setUserLocation({ lat: latitude, lng: longitude });
      },
      () => {
        const fallback = { latitude: -33.8688, longitude: 151.2093, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setRegion(fallback);
        setMapCenter({ lat: fallback.latitude, lng: fallback.longitude });
        setUserLocation({ lat: fallback.latitude, lng: fallback.longitude });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  // selectedLocation 변경 시 지도 이동
  useEffect(() => {
    if (!selectedLocation) {
      lastSelectedLocationRef.current = null;
      return;
    }

    const { lat, lng } = selectedLocation;

    if (
      lastSelectedLocationRef.current &&
      Math.abs(lastSelectedLocationRef.current.lat - lat) < 0.0001 &&
      Math.abs(lastSelectedLocationRef.current.lng - lng) < 0.0001
    ) return;

    const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    lastSelectedLocationRef.current = { lat, lng };

    if (mapRef.current) {
      isProgrammaticMoveRef.current = true;
      mapRef.current.animateToRegion(newRegion, 1000);
      setRegion(newRegion);
      setMapCenter({ lat, lng });
    } else {
      setRegion(newRegion);
      setMapCenter({ lat, lng });
    }
  }, [selectedLocation, setMapCenter]);

  const handleReturnToMyLocation = () => {
    if (userLocation) {
      const loc = { latitude: userLocation.lat, longitude: userLocation.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 };
      isProgrammaticMoveRef.current = true;
      mapRef.current?.animateToRegion(loc, 800);
      setSelectedLocation(null);
      setMapCenter({ lat: userLocation.lat, lng: userLocation.lng });
      return;
    }
    Geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const loc = { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
        isProgrammaticMoveRef.current = true;
        mapRef.current?.animateToRegion(loc, 800);
        setUserLocation({ lat: latitude, lng: longitude });
        setSelectedLocation(null);
        setMapCenter({ lat: latitude, lng: longitude });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  };

  if (!region) {
    return (
      <View className="flex-1 items-center justify-center bg-tertiary">
        <ActivityIndicator size="large" color="#FF8A65" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        style={{ flex: 1 }}
        showsUserLocation
        zoomEnabled
        scrollEnabled
        pitchEnabled
        rotateEnabled
        removeClippedSubviews={false}
        liteMode={false}
        collapsable={false}
        onPress={() => setFocusedMarketId(null)}
        onRegionChangeComplete={newRegion => {
          if (isProgrammaticMoveRef.current) {
            isProgrammaticMoveRef.current = false;
            return;
          }

          setMapCenter(prev => {
            if (
              prev &&
              Math.abs(prev.lat - newRegion.latitude) < 0.0001 &&
              Math.abs(prev.lng - newRegion.longitude) < 0.0001
            ) return prev;

            return { lat: newRegion.latitude, lng: newRegion.longitude };
          });
        }}
      >
        <Marker coordinate={region} title="현재 위치">
          <CurrentLocationIcon width={45} height={45} />
        </Marker>

        {mapMarkers.map(market => (
          <MarketMarker key={market.place_id} market={market} />
        ))}
      </MapView>

      <TouchableOpacity
        onPress={handleReturnToMyLocation}
        activeOpacity={0.85}
        style={styles.locationButton}
      >
        <Locate size={20} color="#E69DB8" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  locationButton: {
    position: 'absolute',
    top: 148,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default MapContent;
