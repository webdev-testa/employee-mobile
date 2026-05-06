export function getDistance(
  userLat: number, userLng: number,
  officeLat: number, officeLng: number
): number {
  const R = 6371000
  const dLat = (officeLat - userLat) * Math.PI / 180
  const dLng = (officeLng - userLng) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
    Math.cos(userLat * Math.PI/180) *
    Math.cos(officeLat * Math.PI/180) *
    Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

export function isWithinArea(
  userLat: number, userLng: number,
  officeLat: number, officeLng: number,
  radiusMeters: number = 100
): boolean {
  return getDistance(userLat, userLng, officeLat, officeLng) <= radiusMeters
}