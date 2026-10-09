import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { LOCATION_POLICY, locationProblem, type LocationFix } from '@/types/location'

export function acquireLocation(signal?: AbortSignal, onProgress?: (fix: LocationFix) => void): Promise<LocationFix> {
  return new Promise((resolve, reject) => {
    const native = Capacitor.isNativePlatform()
    let stopped = false
    let watchId: string | number | undefined
    let permission: PermissionStatus | undefined
    let acquiring = false
    let newestTimestamp = -Infinity
    let lastProblem = 'Lokasi belum tersedia. Aktifkan GPS lalu coba lagi.'
    const clear = () => {
      if (watchId === undefined) return
      if (native) void Geolocation.clearWatch({ id: String(watchId) }).catch(() => {})
      else navigator.geolocation.clearWatch(Number(watchId))
      watchId = undefined
    }
    const finish = (fix?: LocationFix, error?: Error) => {
      if (stopped) return
      stopped = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      permission?.removeEventListener('change', permissionChanged)
      clear()
      if (fix) resolve(fix)
      else reject(error)
    }
    const abort = () => finish(undefined, new DOMException('Pengambilan lokasi dibatalkan', 'AbortError'))
    let timer = setTimeout(() => finish(undefined, new Error('Lokasi belum tersedia. Periksa izin lokasi dan GPS lalu coba lagi.')), LOCATION_POLICY.permissionTimeout)
    const startAcquisition = () => {
      if (stopped || acquiring) return
      acquiring = true
      clearTimeout(timer)
      timer = setTimeout(() => finish(undefined, new Error(lastProblem)), LOCATION_POLICY.timeout)
    }
    const permissionChanged = () => {
      if (permission?.state === 'granted') startAcquisition()
      else if (permission?.state === 'denied') fail({ code: 1 })
    }
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) { abort(); return }

    const accept = (position: { coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number }) => {
      startAcquisition()
      if (stopped || position.timestamp <= newestTimestamp) return
      const fix: LocationFix = { latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, timestamp: position.timestamp, provider: native ? 'native' : 'web' }
      // Invalid future samples must not suppress subsequent valid updates.
      const problem = locationProblem(fix)
      if (Number.isFinite(fix.timestamp) && fix.timestamp <= Date.now() + LOCATION_POLICY.futureTolerance) newestTimestamp = fix.timestamp
      lastProblem = problem || lastProblem
      onProgress?.(fix)
      if (!problem) finish(fix)
    }
    const fail = (error: unknown) => {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
      const denied = code === 1 || code === 'OS-PLUG-GLOC-0003'
      finish(undefined, new Error(denied
        ? 'Izin lokasi ditolak. Izinkan lokasi presisi untuk aplikasi atau Safari di pengaturan perangkat.'
        : 'Lokasi tidak tersedia. Aktifkan layanan lokasi dan coba lagi.'))
    }
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: LOCATION_POLICY.timeout }
    void (async () => {
      try {
        if (native) {
          let permissions = await Geolocation.checkPermissions()
          if (stopped) return
          if (permissions.location !== 'granted') permissions = await Geolocation.requestPermissions({ permissions: ['location'] })
          if (stopped) return
          if (permissions.location !== 'granted') { fail({ code: 1 }); return }
          startAcquisition()
          watchId = await Geolocation.watchPosition({ ...options, minimumUpdateInterval: 1000, interval: 1000 }, (position, error) => {
            if (error) fail(error)
            else if (position) accept(position)
          })
        } else {
          if (!window.isSecureContext) { finish(undefined, new Error('Lokasi memerlukan koneksi HTTPS.')); return }
          if (!navigator.geolocation) { finish(undefined, new Error('Perangkat tidak mendukung lokasi.')); return }
          // The browser's acquisition timeout excludes the permission prompt; ours must too.
          if (navigator.permissions) {
            try { permission = await navigator.permissions.query({ name: 'geolocation' }) } catch { /* Older browsers start the deadline with the first sample. */ }
          }
          if (stopped) return
          permission?.addEventListener('change', permissionChanged)
          if (permission?.state === 'denied') { fail({ code: 1 }); return }
          if (permission?.state === 'granted') startAcquisition()
          watchId = navigator.geolocation.watchPosition(accept, fail, options)
        }
        // A callback/abort can finish before an asynchronous native ID arrives.
        if (stopped) clear()
      } catch (error) { fail(error) }
    })()
  })
}
