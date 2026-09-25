// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { acquireLocation } from '../locationService'
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: vi.fn() } }))
vi.mock('@capacitor/geolocation', () => ({ Geolocation: { checkPermissions: vi.fn(), requestPermissions: vi.fn(), watchPosition: vi.fn(), clearWatch: vi.fn() } }))

let update: PositionCallback
let error: PositionErrorCallback
const clearWatch = vi.fn()
const position = (accuracy = 10, timestamp = Date.now()) => ({ coords: { latitude: -8, longitude: 112, accuracy }, timestamp }) as GeolocationPosition
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.stubGlobal('isSecureContext', true)
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    watchPosition: vi.fn((success, fail) => { update = success; error = fail; return 5 }), clearWatch,
  } })
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
  vi.mocked(Geolocation.clearWatch).mockResolvedValue()
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
describe('location acquisition', () => {
  it('reads real Web IDL coordinate getters rather than enumerable properties', async () => {
    const coords = Object.create({ get latitude() { return -8 }, get longitude() { return 112 }, get accuracy() { return 10 } })
    const promise = acquireLocation()
    update({ coords, timestamp: Date.now() } as GeolocationPosition)
    expect(await promise).toMatchObject({ latitude: -8, longitude: 112, accuracy: 10 })
  })
  it('waits for precision and clears the browser watch on success', async () => {
    const promise = acquireLocation()
    update(position(200)); expect(clearWatch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000); update(position(12))
    expect(await promise).toMatchObject({ accuracy: 12, provider: 'web' })
    expect(clearWatch).toHaveBeenCalledWith(5)
  })
  it('rejects stale and out-of-order samples and times out without leaking', async () => {
    const promise = acquireLocation(); const rejection = expect(promise).rejects.toThrow()
    update(position(10, Date.now() - 20_000)); update(position(50)); update(position(5, Date.now() - 1))
    vi.advanceTimersByTime(30_000); await rejection
    expect(clearWatch).toHaveBeenCalledOnce()
  })
  it('does not let a future sample suppress a valid sample', async () => {
    const promise = acquireLocation(); update(position(5, Date.now() + 90_000)); update(position())
    expect((await promise).accuracy).toBe(10)
  })
  it('explains denied permissions and releases watch', async () => {
    const promise = acquireLocation(); error({ code: 1 } as GeolocationPositionError)
    await expect(promise).rejects.toThrow('Izin lokasi ditolak')
    expect(clearWatch).toHaveBeenCalledOnce()
  })
  it('cancels without accepting late callbacks', async () => {
    const abort = new AbortController(); const progress = vi.fn(); const promise = acquireLocation(abort.signal, progress)
    abort.abort(); update(position())
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' }); expect(progress).not.toHaveBeenCalled()
  })
  it('uses the native plugin and clears a watch ID that arrives after cancellation', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted', coarseLocation: 'granted' })
    let giveId!: (id: string) => void
    vi.mocked(Geolocation.watchPosition).mockImplementation(() => new Promise(resolve => { giveId = resolve }))
    const abort = new AbortController(); const promise = acquireLocation(abort.signal)
    await vi.waitFor(() => expect(Geolocation.watchPosition).toHaveBeenCalled())
    abort.abort(); await expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    giveId('native-watch'); await Promise.resolve()
    expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: 'native-watch' })
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled()
  })
})
