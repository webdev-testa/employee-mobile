// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Home from '../Home'
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const m = vi.hoisted(() => ({ user: { id: 'user', name: 'Test', salary: 0 }, location: vi.fn(), capture: vi.fn(), save: vi.fn(), recover: vi.fn(), pending: vi.fn(), read: vi.fn(), native: vi.fn() }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: m.native } }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: m.user }) }))
vi.mock('@/hooks/useKasbon', () => ({ useKasbon: () => ({ usedThisMonth: 0, kasbonLimit: 0 }) }))
vi.mock('@/hooks/useAbsensi', async importOriginal => {
  const original = await importOriginal<typeof import('@/hooks/useAbsensi')>()
  return { getLocalDateString: original.getLocalDateString, useClockIn: () => ({ capturePhoto: m.capture, getLocation: m.location, saveAttendance: m.save }), useClockOut: () => ({ saveClockOut: m.save, resetAttendanceDev: vi.fn() }) }
})
vi.mock('@/services/attendanceService', () => ({ hasPendingAttendance: m.pending, recoverAttendance: m.recover,
  loadAttendanceForDate: async () => (await m.read()).data }))
vi.mock('@/services/groomingService', () => ({ groomingService: { fetchSessions: async () => [] } }))
vi.mock('@/services/posService', () => ({ posService: { fetchBookings: async () => [] } }))
vi.mock('@googlemaps/js-api-loader', () => ({ setOptions: vi.fn(), importLibrary: () => Promise.reject(new Error('map unavailable')) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/supabase', () => ({ supabase: { schema: () => ({ from: (table: string) => ({ select: () => {
  if (table === 'branches') return { eq: async () => ({ data: [{ id: 'office',name: 'Office',lat:-8,lng:112,radius:100,is_active:true }] }) }
  const query = { eq: () => query, abortSignal: () => query, maybeSingle: m.read }
  return query
} }) }) } }))
let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
const button = (text: string) => Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes(text))!
beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-25T03:00:00Z'))
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  m.native.mockReturnValue(true); m.pending.mockReturnValue(false); m.read.mockResolvedValue({ data: null })
  m.capture.mockResolvedValue(new Blob(['photo'], { type: 'image/jpeg' }))
  m.location.mockImplementation(async () => ({ latitude: -8,longitude:112,accuracy:10,timestamp:Date.now(),provider:'native' }))
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:photo') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})
afterEach(async () => { await act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.restoreAllMocks() })
const render = () => act(() => root.render(<MemoryRouter><Home /></MemoryRouter>))
it('blocks double start and double submit, and releases preview after success', async () => {
  await render()
  await act(() => { button('Absen Masuk Sekarang').click(); button('Absen Masuk Sekarang').click() })
  expect(m.capture).toHaveBeenCalledOnce(); expect(m.location).toHaveBeenCalledOnce()
  let resolve!: (record: unknown) => void
  m.save.mockImplementation(() => new Promise(done => { resolve = done }))
  await act(() => { button('Konfirmasi').click(); button('Konfirmasi').click() })
  expect(m.save).toHaveBeenCalledOnce()
  await act(() => resolve({ id:'record', date:'2026-09-25',clock_in_time:'2026-09-25T03:00:00Z',clock_in_lat:-8,clock_in_lng:112 }))
  expect(container.textContent).toContain('Absen masuk berhasil')
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo')
})
it('expires confirmation and invalidates a fix when hidden', async () => {
  await render(); await act(() => button('Absen Masuk Sekarang').click())
  expect(button('Konfirmasi').disabled).toBe(false)
  await act(() => vi.advanceTimersByTime(16_000)); expect(button('Konfirmasi').disabled).toBe(true)
  await act(() => button('Coba lokasi lagi').click()); expect(button('Konfirmasi').disabled).toBe(false)
  Object.defineProperty(document,'hidden',{ configurable:true,value:true })
  await act(() => document.dispatchEvent(new Event('visibilitychange')))
  expect(button('Konfirmasi').disabled).toBe(true)
  Object.defineProperty(document,'hidden',{ configurable:true,value:false })
})
it('does not replace todays state with yesterdays recovered attendance', async () => {
  m.pending.mockReturnValue(true)
  m.recover.mockImplementation(async () => {
    m.pending.mockReturnValue(false)
    return { id:'old',date:'2026-09-24',clock_in_time:'2026-09-24T01:00:00Z',clock_out_time:'2026-09-24T10:00:00Z' }
  })
  await render(); await act(() => button('Periksa pengiriman').click())
  expect(m.read).toHaveBeenCalledTimes(2)
  await act(() => button('Kembali ke Home').click())
  expect(button('Absen Masuk Sekarang').disabled).toBe(false)
})
it('reloads attendance at Jakarta midnight', async () => {
  vi.setSystemTime(new Date('2026-09-25T16:59:59Z'))
  await render(); expect(m.read).toHaveBeenCalledOnce()
  await act(() => vi.advanceTimersByTime(2000))
  expect(m.read).toHaveBeenCalledTimes(2)
})
it('ignores an initial read that returns after a committed clock-in', async () => {
  let resolveRead!: (value: unknown) => void
  m.read.mockImplementationOnce(() => new Promise(resolve => { resolveRead = resolve }))
  m.save.mockResolvedValue({ id:'new',date:'2026-09-25',clock_in_time:'2026-09-25T03:00:00Z' })
  await render(); await act(() => button('Absen Masuk Sekarang').click())
  await act(() => button('Konfirmasi').click())
  await act(() => resolveRead({ data: null }))
  await act(() => button('Kembali ke Home').click())
  expect(button('Absen Pulang Sekarang')).toBeTruthy()
})
