export function getDistance(
  userLat: number, userLng: number,
  officeLat: number, officeLng: number
): number {
  if (
    !Number.isFinite(userLat) || !Number.isFinite(userLng) ||
    !Number.isFinite(officeLat) || !Number.isFinite(officeLng)
  ) {
    return Infinity;
  }

  const R = 6371000;
  const dLat = ((officeLat - userLat) * Math.PI) / 180;
  const dLng = ((officeLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((officeLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  // Clamp a between 0 and 1 to prevent NaN from floating point rounding errors
  const clampedA = Math.min(1, Math.max(0, a));
  return R * 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
}

export function isWithinArea(
  userLat: number, userLng: number,
  officeLat: number, officeLng: number,
  radiusMeters: number = 100
): boolean {
  if (
    !Number.isFinite(userLat) || !Number.isFinite(userLng) ||
    !Number.isFinite(officeLat) || !Number.isFinite(officeLng)
  ) {
    return false;
  }
  return getDistance(userLat, userLng, officeLat, officeLng) <= radiusMeters;
}