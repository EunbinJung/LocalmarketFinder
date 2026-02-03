import { GOOGLE_MAPS_API_KEY } from '@env';

/**
 * Get photo URL - prefers Firebase Storage, falls back to Google Places API
 */
export function getPhotoUrl(
  photoReference: string | undefined,
  photoStorageUrl: string | undefined,
  maxWidth: number = 800,
): string | null {
  // Priority 1: Firebase Storage URL (no API cost)
  if (photoStorageUrl) {
    return photoStorageUrl;
  }

  // Priority 2: Google Places Photo API (fallback)
  if (!photoReference) {
    return null;
  }
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('getPhotoUrl: GOOGLE_MAPS_API_KEY is not set');
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
  
  return url;
}

/**
 * Get multiple photo URLs
 */
export function getPhotoUrls(
  photos: Array<{ photo_reference: string }> | undefined,
  maxWidth: number = 800,
): string[] {
  if (!photos || photos.length === 0) {
    return [];
  }

  return photos
    .map(photo => getPhotoUrl(photo.photo_reference, undefined, maxWidth))
    .filter((url): url is string => url !== null);
}

/**
 * Get representative photo URL (first photo or fallback)
 */
export function getRepresentativePhotoUrl(
  photos: Array<{ photo_reference: string }> | undefined,
  fallbackUrl?: string,
  maxWidth: number = 800,
): string | null {
  if (photos && photos.length > 0) {
    return getPhotoUrl(photos[0].photo_reference, undefined, maxWidth);
  }

  return fallbackUrl || null;
}
