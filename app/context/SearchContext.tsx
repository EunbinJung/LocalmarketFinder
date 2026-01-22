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
    formatted_address?: string;
  opening_hours?: {
      periods?: Array<{
        open: { day: number; time: string };
        close?: { day: number; time: string };
      }>;
    weekday_text?: string[];
  };
  
}

interface SearchContextType {
  isSearch: boolean;
  setIsSearch: (value: boolean) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectedLocation: (location: { lat: number; lng: number } | null) => void;
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
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isSearch, setIsSearch] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
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
        return m && m.place_id && m.name;
      });
      
      setFilteredMarketsState(validMarkets);
    } catch (error) {
      console.error('Error setting filtered markets:', error);
      setFilteredMarketsState([]);
    }
  };
  
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [savedMarketIds, setSavedMarketIds] = useState<string[]>([]);

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
        
        setMarkets(loadedMarkets);
        setFilteredMarkets(loadedMarkets);
        setSavedMarketIds(savedIds);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMarkets();
  }, []);

  return (
    <SearchContext.Provider
      value={{
        isSearch,
        setIsSearch,
        selectedLocation,
        setSelectedLocation,
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
