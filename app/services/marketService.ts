import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from './firebase';

export interface Market {
  place_id: string;
  name: string;
  website: string;
  formatted_address?: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
  types?: string[];
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  rating?: number;
  user_ratings_total?: number;
  photo_reference?: string;
  opening_hours?: {
    periods?: Array<{
    open: { day: number; time: string };
    close?: { day: number; time: string };
    }>,
    weekday_text?: string[];
};
  };

/**
 * Get all markets from Firestore
 */
export async function getAllMarkets(): Promise<Market[]> {
  try {
    const marketsRef = collection(db, 'markets');
    const q = query(marketsRef, limit(1000));
    const querySnapshot = await getDocs(q);

    const markets: Market[] = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      markets.push({
        place_id: doc.id,
        ...data,
      } as Market);
    });

    return markets;
  } catch (error: any) {
    // Handle offline errors gracefully
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      return [];
    }
    console.error('Error getting markets:', error);
    
    return [];
  }
}

/**
 * Get market by place_id
 * Note: place_id should be the document ID in Firestore
 */
export async function getMarket(placeId: string): Promise<Market | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const marketRef = doc(db, 'markets', placeId);
    const marketDoc = await getDoc(marketRef);

    if (marketDoc.exists()) {
      return {
        place_id: marketDoc.id,
        ...marketDoc.data(),
      } as Market;
    }

    return null;
  } catch (error) {
    console.error('Error getting market:', error);
    return null;
  }
}
