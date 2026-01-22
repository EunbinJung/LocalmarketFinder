/**
 * Calculate Euclidean distance between two coordinates
 * Simple distance calculation for MVP (not great-circle distance)
 * @param lat1 Latitude of first point
 * @param lng1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lng2 Longitude of second point
 * @returns Distance in degrees (for sorting purposes)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const deltaLat = lat2 - lat1;
  const deltaLng = lng2 - lng1;
  return Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
}

/**
 * Get distance from a market to a reference point
 * @param market Market with geometry.location
 * @param referencePoint Reference point with lat/lng
 * @returns Distance in degrees, or Infinity if market has no valid coordinates
 */
export function getMarketDistance(
  market: { geometry?: { location?: { lat?: number; lng?: number } } },
  referencePoint: { lat: number; lng: number },
): number {
  const marketLat = market.geometry?.location?.lat;
  const marketLng = market.geometry?.location?.lng;

  if (marketLat === undefined || marketLng === undefined) {
    return Infinity; // Markets without coordinates go to the end
  }

  return calculateDistance(marketLat, marketLng, referencePoint.lat, referencePoint.lng);
}
