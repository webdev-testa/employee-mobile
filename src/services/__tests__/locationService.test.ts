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
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined })
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    watchPosition: vi.fn((success, fail) => { update = success; error = fail; return 5 }), clearWatch,
  } })
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false)
  vi.mocked(Geolocation.clearWatch).mockResolvedValue()
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
describe('location acquisition', () => {
  it('gives GPS a full acquisition window after a slow browser permission grant', async () => {
    const permission = Object.assign(new EventTarget(), { state: 'prompt' })
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: vi.fn().mockResolvedValue(permission) } })
    const promise = acquireLocation()
    const settled = vi.fn(); void promise.then(settled)
    await Promise.resolve()
    vi.advanceTimersByTime(50_000)
    permission.state = 'granted'; permission.dispatchEvent(new Event('change'))
    update(position(97))
    vi.advanceTimersByTime(29_000)
    expect(settled).not.toHaveBeenCalled(); expect(clearWatch).not.toHaveBeenCalled()
    update(position(12))
    expect(await promise).toMatchObject({ accuracy: 12 })
    expect(clearWatch).toHaveBeenCalledWith(5)
  })
  it('rejects a persistent 97 m fix after the post-permission acquisition window', async () => {
    const permission = Object.assign(new EventTarget(), { state: 'granted' })
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: vi.fn().mockResolvedValue(permission) } })
    const remove = vi.spyOn(permission, 'removeEventListener')
    const promise = acquireLocation(); const rejection = expect(promise).rejects.toThrow('±97 m')
    await Promise.resolve(); update(position(97))
    vi.advanceTimersByTime(30_000); await rejection
    expect(clearWatch).toHaveBeenCalledOnce(); expect(remove).toHaveBeenCalledWith('change', expect.any(Function))
  })
  it('bounds an unanswered permission prompt and never starts a watch after cancellation', async () => {
    let query!: (status: unknown) => void
    Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: () => new Promise(resolve => { query = resolve }) } })
    const promise = acquireLocation(); const rejection = expect(promise).rejects.toThrow('Periksa izin lokasi')
    vi.advanceTimersByTime(60_000); await rejection
    query(Object.assign(new EventTarget(), { state: 'granted' })); await Promise.resolve()
    expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled()
  })
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
  it('does not consume the native acquisition window while waiting for permission', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true)
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'prompt', coarseLocation: 'prompt' })
    let grant!: (value: { location: 'granted'; coarseLocation: 'granted' }) => void
    vi.mocked(Geolocation.requestPermissions).mockImplementation(() => new Promise(resolve => { grant = resolve }))
    vi.mocked(Geolocation.watchPosition).mockImplementation(async (_options, callback) => {
      const fix = position()
      callback({ ...fix, coords: { ...fix.coords, magneticHeading: null, trueHeading: null, headingAccuracy: null, course: null } }, undefined)
      return 'native-watch'
    })
    const promise = acquireLocation()
    await Promise.resolve()
    vi.advanceTimersByTime(50_000)
    grant({ location: 'granted', coarseLocation: 'granted' })
    expect(await promise).toMatchObject({ accuracy: 10, provider: 'native' })
    await Promise.resolve()
    expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: 'native-watch' })
  })
})
