import { collection, doc, getDoc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, ensureAuthenticated } from './firebase';

/**
 * Get all saved market IDs for the current user
 */
export async function getSavedMarkets(): Promise<string[]> {
  try {
    const uid = await ensureAuthenticated();
    const savedMarketsRef = collection(db, 'users', uid, 'savedMarkets');
    const snapshot = await getDocs(savedMarketsRef);
    
    const savedIds: string[] = [];
    snapshot.forEach(doc => {
      savedIds.push(doc.id);
    });
    
    return savedIds;
  } catch (error) {
    console.error('Error getting saved markets:', error);
    return [];
  }
}

/**
 * Check if a market is saved by the current user
 */
export async function isMarketSaved(placeId: string): Promise<boolean> {
  try {
    const uid = await ensureAuthenticated();
    const savedMarketRef = doc(db, 'users', uid, 'savedMarkets', placeId);
    const savedMarketDoc = await getDoc(savedMarketRef);
    
    return savedMarketDoc.exists();
  } catch (error) {
    console.error('Error checking if market is saved:', error);
    return false;
  }
}

/**
 * Save a market for the current user
 */
export async function saveMarket(placeId: string): Promise<boolean> {
  try {
    const uid = await ensureAuthenticated();
    const savedMarketRef = doc(db, 'users', uid, 'savedMarkets', placeId);
    
    await setDoc(savedMarketRef, {
      placeId,
      savedAt: new Date(),
    });
    
    return true;
  } catch (error) {
    console.error('Error saving market:', error);
    return false;
  }
}

/**
 * Unsave a market for the current user
 */
export async function unsaveMarket(placeId: string): Promise<boolean> {
  try {
    const uid = await ensureAuthenticated();
    const savedMarketRef = doc(db, 'users', uid, 'savedMarkets', placeId);
    
    await deleteDoc(savedMarketRef);
    
    return true;
  } catch (error) {
    console.error('Error unsaving market:', error);
    return false;
  }
}

/**
 * Toggle save/unsave a market for the current user
 */
export async function toggleSaveMarket(placeId: string): Promise<boolean> {
  try {
    const isSaved = await isMarketSaved(placeId);
    
    if (isSaved) {
      return await unsaveMarket(placeId);
    } else {
      return await saveMarket(placeId);
    }
  } catch (error) {
    console.error('Error toggling save market:', error);
    return false;
  }
}