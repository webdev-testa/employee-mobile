export interface LocationFix {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: number
  provider: 'web' | 'native'
}

export const LOCATION_POLICY = {
  maxAccuracy: 30,
  maxAge: 15_000,
  futureTolerance: 5_000,
  timeout: 30_000,
} as const

export function locationProblem(fix: LocationFix, now = Date.now()): string | null {
  if (![fix.latitude, fix.longitude, fix.accuracy, fix.timestamp].every(Number.isFinite)
    || Math.abs(fix.latitude) > 90 || Math.abs(fix.longitude) > 180 || fix.accuracy < 0) {
    return 'Data lokasi tidak valid.'
  }
  if (fix.timestamp > now + LOCATION_POLICY.futureTolerance) return 'Periksa pengaturan waktu otomatis perangkat.'
  if (now - fix.timestamp > LOCATION_POLICY.maxAge) return 'Lokasi kedaluwarsa. Ambil lokasi lagi.'
  if (fix.accuracy > LOCATION_POLICY.maxAccuracy) return `Akurasi lokasi ±${Math.round(fix.accuracy)} m. Pindah ke area terbuka lalu coba lagi.`
  return null
}
