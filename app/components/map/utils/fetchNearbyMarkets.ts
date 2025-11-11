import { useCallback } from 'react';
import { GOOGLE_MAPS_API_KEY } from '@env';
import {
  Market,
  MarketDetails,
  useSearch,
} from '../../../context/SearchContext';

interface GooglePlacesResponse {
  status: string;
  results: Market[] & MarketDetails[];
}

export const useNearbyMarkets = () => {
  const { markets, setMarkets, loading, setLoading } = useSearch();

  const fetchNearbyMarkets = useCallback(
    async (latitude: number, longitude: number) => {
      try {
        setLoading(true);
        const radius = 5000; // 10km
        const keywords = [
          'farmers market',
          'local market',
          'weekend market',
          'artisan market',
          'craft market',
          'community market',
          'street market',
          'village market',
          'flea market',
          'sunday market',
          'saturday market',
          'byron market',
          'sydney market',
          'melbourne market',
          'perth market',
          'adelaide market',
          'australia market',
          'brisbane market',
          'wednesday market',
          'friday market',
          'pop up market',
        ];
        let allResults: Market[] = [];

        for (const keyword of keywords) {
          const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&keyword=${encodeURIComponent(
            keyword,
          )}&key=${GOOGLE_MAPS_API_KEY}`;

          const response = await fetch(url);
          const data: GooglePlacesResponse = await response.json();

          if (data.status !== 'OK') {
            console.warn(`Google Places API returned status: ${data.status}`);
            continue;
          }

          // ❌ 제외할 타입 (상업용/건물/기관 등)
          const excludedTypes = [
            'supermarket',
            'grocery_or_supermarket',
            'restaurant',
            'food',
            'store',
            'cafe',
            'bakery',
            'farm',
            'meal_takeaway',
            'takeaway',
            'meal_delivery',
            'shopping_mall',
            'convenience_store',
            'clothing_store',
            'community_center',
            'church',
            'school',
            'city_hall',
            'library',
            'gym',
            'hall',
            'park',
            'museum',
            'carpark',
          ];

          // ✅ 필터: 제외 타입이 하나라도 포함되거나, 영업 종료(PERMANENTLY_CLOSED)면 제거
          const filtered: Market[] = data.results.filter(
            (place: Market) =>
              !place.types.some((type: string) =>
                excludedTypes.includes(type),
              ) && place.business_status !== 'CLOSED_PERMANENTLY',
          );

          for (const place of filtered) {
            // Place Details 요청 (photos 포함)
            const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,geometry,formatted_address,formatted_phone_number,website,opening_hours,photos&key=${GOOGLE_MAPS_API_KEY}`;
            const detailsRes = await fetch(detailsUrl);
            const detailsData = await detailsRes.json();

            allResults.push({
              ...place,
              details: detailsData.result,
              photos: detailsData.result?.photos || place.photos,
            });
          }
        }

        // 중복 제거 (place_id 기준)
        const uniqueResults = Array.from(
          new Map(allResults.map(item => [item.place_id, item])).values(),
        );

        setMarkets(uniqueResults);
      } catch (err) {
        console.error('Error fetching nearby markets:', err);
      } finally {
        setLoading(false);
      }
    },
    [setMarkets, setLoading],
  );

  return { markets, fetchNearbyMarkets, loading };
};
