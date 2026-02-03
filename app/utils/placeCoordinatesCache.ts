import { db } from '../services/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

/**
 * Cache place_id → coordinates mapping in Firestore
 * Reduces Place Details API calls for repeated searches
 */

interface CachedCoordinates {
  place_id: string;
  lat: number;
  lng: number;
  cachedAt: Timestamp;
}

/**
 * Get coordinates from cache
 */
export async function getCachedCoordinates(
  placeId: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const cacheRef = doc(db, 'placeCoordinates', placeId);
    const cacheDoc = await getDoc(cacheRef);

    if (cacheDoc.exists()) {
      const data = cacheDoc.data() as CachedCoordinates;
      return { lat: data.lat, lng: data.lng };
    }

    return null;
  } catch (error) {
    console.error('Error getting cached coordinates:', error);
    return null;
  }
}

/**
 * Cache coordinates for a place_id
 */
export async function cacheCoordinates(
  placeId: string,
  lat: number,
  lng: number,
): Promise<void> {
  try {
    const cacheRef = doc(db, 'placeCoordinates', placeId);
    await setDoc(
      cacheRef,
      {
        place_id: placeId,
        lat,
        lng,
        cachedAt: Timestamp.now(),
      },
      { merge: true },
    );
  } catch (error) {
    console.error('Error caching coordinates:', error);
  }
}
