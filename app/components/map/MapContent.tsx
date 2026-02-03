import { useEffect, useMemo, useState, useRef } from 'react';
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
  const { selectedLocation, filteredMarkets, setMapCenter, setUserLocation } = useSearch();
  const mapRef = useRef<MapView>(null);
  const isProgrammaticMoveRef = useRef(false); // Track if move is from code vs user drag
  const lastSelectedLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // iOS + Google Maps provider can crash if Marker children are re-ordered.
  // Render markers in a stable order to avoid native reordering mutations.
  const markerMarkets = useMemo(() => {
    if (!Array.isArray(filteredMarkets) || filteredMarkets.length === 0) {
      return [];
    }

    return filteredMarkets
      .filter(market => {
        const loc = market?.geometry?.location;
        return (
          loc &&
          typeof loc.lat === 'number' &&
          typeof loc.lng === 'number' &&
          !isNaN(loc.lat) &&
          !isNaN(loc.lng)
        );
      })
      .sort((a, b) => a.place_id.localeCompare(b.place_id));
  }, [filteredMarkets]);

  // Get initial device location on mount (best effort).
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
          // Persist the device GPS location for "Closest to Me"
          setUserLocation({ lat: latitude, lng: longitude });
        },
        _error => {
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
          // Keep "Closest to Me" functional even without permission (best-effort fallback)
          setUserLocation({ lat: -33.8688, lng: 151.2093 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
      );
    };
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map when selectedLocation changes (programmatic move)
  useEffect(() => {
    if (!selectedLocation) {
      lastSelectedLocationRef.current = null;
      return;
    }

    const { lat, lng } = selectedLocation;

    // Skip if coordinates haven't actually changed (prevent unnecessary updates)
    if (lastSelectedLocationRef.current &&
        Math.abs(lastSelectedLocationRef.current.lat - lat) < 0.0001 &&
        Math.abs(lastSelectedLocationRef.current.lng - lng) < 0.0001) {
      return;
    }

    const newRegion = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    // Update region state for initial render (when region is null)
    if (!region) {
      setRegion(newRegion);
      setMapCenter({ lat, lng });
      lastSelectedLocationRef.current = { lat, lng };
      return;
    }

    // Use animateToRegion for smooth animation (programmatic move)
    if (mapRef.current) {
      isProgrammaticMoveRef.current = true; // Mark as programmatic move
      mapRef.current.animateToRegion(newRegion, 1000);
      setRegion(newRegion);
      setMapCenter({ lat, lng });
      lastSelectedLocationRef.current = { lat, lng };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]); // region 제거하여 무한 루프 방지

  if (!region)
    return (
      <View className="flex-1 items-center justify-center bg-tertiary">
        <ActivityIndicator size="large" color="#FF8A65" />
      </View>
    );

  return (
    <View className="flex-1" style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        style={{ flex: 1 }}
        showsUserLocation={true}
        zoomEnabled={true}
        zoomControlEnabled={false}
        scrollEnabled={true}
        pitchEnabled={true}
        rotateEnabled={true}
        // onRegionChangeComplete={(newRegion) => {
        //   // Only update mapCenter if this is a user-initiated drag (not programmatic)
        //   if (!isProgrammaticMoveRef.current) {
        //     setMapCenter({ lat: newRegion.latitude, lng: newRegion.longitude });
        //   }
        //   // Reset flag after handling
        //   isProgrammaticMoveRef.current = false;
        // }}
        onRegionChangeComplete={(newRegion) => {
          if (isProgrammaticMoveRef.current) {
            isProgrammaticMoveRef.current = false;
            return;
          }
        
          setMapCenter(prev => {
            if (
              prev &&
              Math.abs(prev.lat - newRegion.latitude) < 0.0001 &&
              Math.abs(prev.lng - newRegion.longitude) < 0.0001
            ) {
              return prev;
            }
        
            return {
              lat: newRegion.latitude,
              lng: newRegion.longitude,
            };
          });
        }}
        
      >
        <Marker coordinate={region} title="현재 위치">
          <CurrentLocationIcon width={45} height={45} />
        </Marker>
        {markerMarkets.map(market => (
            <Marker
              key={market.place_id}
              coordinate={{
                latitude: market.geometry!.location.lat,
                longitude: market.geometry!.location.lng,
              }}
              title={market.name}
              tracksViewChanges={false}
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
