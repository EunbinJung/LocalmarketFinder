import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAllMarkets } from '../services/marketService';
import { getSavedMarkets } from '../services/savedMarketService';

export interface Market {
  place_id: string;
  name: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
  types?: string[];
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  // Optional fields (may not be loaded initially to save costs)
  rating?: number;
  user_ratings_total?: number;
  website?: string;
  // Support both formats: photos array (Google Places API) and photo_reference string (Firestore)
  photo_reference?: string; // Direct photo_reference field from Firestore
  photo_storage_url?: string; // Firebase Storage URL (preferred)
  formatted_address?: string;
  opening_hours?: {
      periods?: Array<{
        open: { day: number; time: string };
        close?: { day: number; time: string };
      }>;
    weekday_text?: string[];
  };
  
}

type LatLng = { lat: number; lng: number };

const SCOPE_RADIUS_OPTIONS_KM = [15, 30, 50, 70, 150] as const;
type ScopeRadiusKm = (typeof SCOPE_RADIUS_OPTIONS_KM)[number];
const DEFAULT_SCOPE_RADIUS_KM: ScopeRadiusKm = SCOPE_RADIUS_OPTIONS_KM[0]; // smallest

function isValidLatLng(value: unknown): value is LatLng {
  if (!value || typeof value !== 'object') return false;
  const v = value as { lat?: unknown; lng?: unknown };
  return typeof v.lat === 'number' && typeof v.lng === 'number' && !isNaN(v.lat) && !isNaN(v.lng);
}

function hasValidMarketCoordinates(market: Market): boolean {
  const loc = market?.geometry?.location;
  return (
    !!loc &&
    typeof loc.lat === 'number' &&
    typeof loc.lng === 'number' &&
    !isNaN(loc.lat) &&
    !isNaN(loc.lng)
  );
}

function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * (sinDLng * sinDLng);

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function getMarketsWithinRadius(
  allMarkets: Market[],
  center: LatLng,
  radiusKm: number,
): Market[] {
  const withDistance = allMarkets
    .filter(hasValidMarketCoordinates)
    .map(market => ({
      market,
      distanceKm: haversineDistanceKm(center, market.geometry!.location),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (withDistance.length === 0) return [];

  // Fixed radius scope (user-controlled)
  return withDistance.filter(x => x.distanceKm <= radiusKm).map(x => x.market);
}

interface SearchContextType {
  isSearch: boolean;
  setIsSearch: (value: boolean) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectedLocation: (location: { lat: number; lng: number } | null) => void;
  userLocation: { lat: number; lng: number } | null;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  mapCenter: { lat: number; lng: number } | null;
  setMapCenter: (center: { lat: number; lng: number } | null) => void;
  setFilteredMarkets: (filteredMarkets: Market[]) => void;
  filteredMarkets: Market[];
  markets: Market[];
  setMarkets: (markets: Market[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  selectedMarket: Market | null;
  setSelectedMarket: (market: Market | null) => void;
  savedMarketIds: string[];
  setSavedMarketIds: (ids: string[]) => void;
  refreshSavedMarkets: () => Promise<void>;
  scopeRadiusKm: ScopeRadiusKm;
  setScopeRadiusKm: (km: ScopeRadiusKm) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isSearch, setIsSearch] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [filteredMarkets, setFilteredMarketsState] = useState<Market[]>([]);
  
  const setFilteredMarkets = (newMarkets: Market[]) => {
    try {
      if (!Array.isArray(newMarkets)) {
        setFilteredMarketsState([]);
        return;
      }
      
      // Filter out invalid markets (missing name or place_id)
      const validMarkets = newMarkets.filter((m) => {
        const placeId = (m as any)?.place_id;
        const name = (m as any)?.name;
        return (
          typeof placeId === 'string' &&
          placeId.length > 0 &&
          typeof name === 'string' &&
          name.trim().length > 0
        );
      });
      
      setFilteredMarketsState(validMarkets);
    } catch (error) {
      console.error('Error setting filtered markets:', error);
      setFilteredMarketsState([]);
    }
  };
  
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [savedMarketIds, setSavedMarketIds] = useState<string[]>([]);
  const [scopeRadiusKm, setScopeRadiusKm] = useState<ScopeRadiusKm>(
    DEFAULT_SCOPE_RADIUS_KM,
  );

  // Load saved markets
  const refreshSavedMarkets = async () => {
    try {
      const savedIds = await getSavedMarkets();
      setSavedMarketIds(savedIds);
    } catch (error) {
      console.error('Error loading saved markets:', error);
    }
  };

  // Load markets from Firestore on mount
  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setLoading(true);
      
        
        // Load markets and saved markets in parallel
        const [loadedMarkets, savedIds] = await Promise.all([
          getAllMarkets(),
          getSavedMarkets(),
        ]);
        
        setAllMarkets(loadedMarkets);
        setMarkets(loadedMarkets); // until we have a center to scope by
        setFilteredMarkets(loadedMarkets); // until we have a center to scope by
        setSavedMarketIds(savedIds);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMarkets();
  }, []);

  // Scope markets by the user's searched location (preferred) or map center (fallback).
  // This prevents far-away markets from appearing when searching a big city,
  // while still allowing progressive expansion for small towns.
  useEffect(() => {
    if (!isValidLatLng(selectedLocation)) return;
    if (!Array.isArray(allMarkets) || allMarkets.length === 0) return;

    const scoped = getMarketsWithinRadius(allMarkets, selectedLocation, scopeRadiusKm);
    setMarkets(scoped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, allMarkets, scopeRadiusKm]);

  useEffect(() => {
    // If user explicitly searched a location, keep scope anchored there.
    if (selectedLocation) return;
    if (!isValidLatLng(mapCenter)) return;
    if (!Array.isArray(allMarkets) || allMarkets.length === 0) return;

    const scoped = getMarketsWithinRadius(allMarkets, mapCenter, scopeRadiusKm);
    setMarkets(scoped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapCenter, selectedLocation, allMarkets, scopeRadiusKm]);

  return (
    <SearchContext.Provider
      value={{
        isSearch,
        setIsSearch,
        selectedLocation,
        setSelectedLocation,
        userLocation,
        setUserLocation,
        mapCenter,
        setMapCenter,
        setFilteredMarkets,
        filteredMarkets,
        markets,
        setMarkets,
        loading,
        setLoading,
        selectedMarket,
        setSelectedMarket,
        savedMarketIds,
        setSavedMarketIds,
        refreshSavedMarkets,
        scopeRadiusKm,
        setScopeRadiusKm,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
