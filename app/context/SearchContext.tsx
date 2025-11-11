import { createContext, useContext, useState, ReactNode } from 'react';

export interface MarketDetails {
  formatted_address?: string;
  formatted_phone_number?: string;
  website?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close: { day: number; time: string };
    }>;
  };
}

export interface Market {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  opening_hours?: {
    open_now?: boolean;
  }[];
  photos?: {
    photo_reference: string;
    html_attributions: string[];
  }[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  details?: MarketDetails;
}

interface SearchContextType {
  isSearch: boolean;
  setIsSearch: (value: boolean) => void;
  selectedLocation: { lat: number; lng: number } | null;
  setSelectedLocation: (location: { lat: number; lng: number } | null) => void;
  setFilteredMarkets: (filteredMarkets: Market[]) => void;
  filteredMarkets: Market[];
  markets: Market[];
  setMarkets: (markets: Market[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isSearch, setIsSearch] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);

  return (
    <SearchContext.Provider
      value={{
        isSearch,
        setIsSearch,
        selectedLocation,
        setSelectedLocation,
        setFilteredMarkets,
        filteredMarkets,
        markets,
        setMarkets,
        loading,
        setLoading,
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
