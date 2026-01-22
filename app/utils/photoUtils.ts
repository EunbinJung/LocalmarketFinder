import { GOOGLE_MAPS_API_KEY } from '@env';

/**
 * Get Google Places photo URL
 */
export function getPhotoUrl(
  photoReference: string | undefined,
  maxWidth: number = 800,
): string | null {
  if (!photoReference) {
    console.warn('⚠️ getPhotoUrl: No photo_reference provided');
    return null;
  }
  
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('❌ getPhotoUrl: GOOGLE_MAPS_API_KEY is not set');
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
    .map(photo => getPhotoUrl(photo.photo_reference, maxWidth))
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
    return getPhotoUrl(photos[0].photo_reference, maxWidth);
  }

  return fallbackUrl || null;
}
