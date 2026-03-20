import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { Callout, Marker } from 'react-native-maps';
import { Market } from '../../services/marketService';
import { useSearch } from '../../context/SearchContext';
import { getMarketOpenStatus } from '../../utils/marketOpenStatus';

const MarketMarker = React.memo(({ market }: { market: Market }) => {
  const { setSelectedMarket, focusedMarketId, setFocusedMarketId } = useSearch();
  const { status } = getMarketOpenStatus(market.opening_hours?.periods);
  const isOpen = status === 'OPEN_NOW';
  const isFocused = focusedMarketId === market.place_id;

  return (
    <Marker
      key={market.place_id}
      coordinate={{
        latitude: market.geometry!.location.lat,
        longitude: market.geometry!.location.lng,
      }}
      pinColor={isFocused ? '#C2185B' : '#F48FB1'}
      tracksViewChanges={isFocused}
      onPress={() => setFocusedMarketId(market.place_id)}
    >
      <Callout onPress={() => setSelectedMarket(market)} tooltip>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedMarket(market)}
          style={calloutStyles.container}
        >
          <Text style={calloutStyles.name} numberOfLines={2}>
            {market.name}
          </Text>
          <View style={calloutStyles.row}>
            <View
              style={[
                calloutStyles.dot,
                isOpen ? calloutStyles.dotOpen : calloutStyles.dotClosed,
              ]}
            />
            <Text
              style={[
                calloutStyles.status,
                isOpen ? calloutStyles.statusOpen : calloutStyles.statusClosed,
              ]}
            >
              {isOpen ? 'Open now' : 'Closed'}
            </Text>
            {market.rating ? (
              <View style={calloutStyles.ratingRow}>
                <Star size={11} color="#FBBF24" fill="#FBBF24" />
                <Text style={calloutStyles.rating}>{market.rating}</Text>
              </View>
            ) : null}
          </View>
          <View style={calloutStyles.arrow} />
        </TouchableOpacity>
      </Callout>
    </Marker>
  );
});

const calloutStyles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 160,
    maxWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOpen: {
    backgroundColor: '#4CAF50',
  },
  dotClosed: {
    backgroundColor: '#EF5350',
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusOpen: {
    color: '#4CAF50',
  },
  statusClosed: {
    color: '#EF5350',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
  },
  rating: {
    fontSize: 12,
    color: '#6B7280',
  },
  arrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#fff',
  },
});

export default MarketMarker;
