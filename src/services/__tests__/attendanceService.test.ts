// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { submitAttendance, recoverAttendance, hasPendingAttendance, loadAttendanceForDate } from '../attendanceService'
import { acquireLocation } from '../locationService'
const mocks = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn(), rpc: vi.fn(), branches: vi.fn(), auth: vi.fn(), read: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: {
  auth: { getUser: mocks.auth },
  storage: { from: () => ({ upload: mocks.upload, remove: mocks.remove }) },
  schema: () => ({ rpc: (...args: unknown[]) => ({ abortSignal: () => mocks.rpc(...args) }),
    from: (table: string) => ({ select: () => {
      if (table === 'branches') return { eq: () => ({ abortSignal: mocks.branches }) }
      const query = { eq: () => query, abortSignal: () => ({ maybeSingle: mocks.read }) }
      return query
    } }) }),
} }))
vi.mock('../locationService', () => ({ acquireLocation: vi.fn() }))
const user = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'
const photo = () => new Blob(['photo'], { type: 'image/jpeg' })
const record = { id: 'record', user_id: user, clock_in_time: 'now' }
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear()
  mocks.auth.mockResolvedValue({ data: { user: { id: user } } })
  mocks.upload.mockResolvedValue({ error: null }); mocks.remove.mockResolvedValue({ error: null })
  mocks.branches.mockResolvedValue({ data: [{ id: 'office', name: 'Office', lat: -8, lng: 112, radius: 100, is_active: true }] })
  vi.mocked(acquireLocation).mockResolvedValue({ latitude: -8, longitude: 112, accuracy: 10, timestamp: Date.now(), provider: 'web' })
  mocks.rpc.mockResolvedValue({ data: record, error: null })
})
describe('attendance requests', () => {
  it('acquires fresh coordinates after upload and returns the committed record', async () => {
    expect(await submitAttendance(user, 'in', photo(), new AbortController().signal)).toEqual(record)
    expect(mocks.upload.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(acquireLocation).mock.invocationCallOrder[0])
    expect(hasPendingAttendance(user)).toBe(false)
  })
  it('replays identical data after a lost response without reuploading or deleting the photo', async () => {
    mocks.rpc.mockResolvedValueOnce({ error: { code: '', message: 'network failed' } })
    await expect(submitAttendance(user, 'in', photo(), new AbortController().signal)).rejects.toThrow('belum dapat dipastikan')
    expect(hasPendingAttendance(user)).toBe(true); expect(mocks.remove).not.toHaveBeenCalled()
    const original = mocks.rpc.mock.calls[0][1]
    await recoverAttendance(user)
    expect(mocks.rpc.mock.calls[1][1]).toEqual(original)
    expect(mocks.upload).toHaveBeenCalledOnce(); expect(hasPendingAttendance(user)).toBe(false)
  })
  it('removes an unsubmitted photo when location fails', async () => {
    vi.mocked(acquireLocation).mockRejectedValue(new Error('GPS denied'))
    await expect(submitAttendance(user, 'in', photo(), new AbortController().signal)).rejects.toThrow('GPS denied')
    expect(mocks.remove).toHaveBeenCalledOnce(); expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('surfaces server rejection of clock-out without an open record', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: 'P0001', message: 'ATTENDANCE_NO_OPEN_RECORD' } })
    await expect(submitAttendance(user, 'out', null, new AbortController().signal)).rejects.toThrow('Tidak ada catatan')
    expect(hasPendingAttendance(user)).toBe(false)
  })
  it('rejects an empty authoritative branch list', async () => {
    mocks.branches.mockResolvedValue({ data: [] })
    await expect(submitAttendance(user, 'out', null, new AbortController().signal)).rejects.toThrow('Tidak ada cabang')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('isolates pending requests by account and handles corrupt cache', async () => {
    localStorage.setItem(`attendance_pending_v1_${user}`, 'null')
    expect(hasPendingAttendance(user)).toBe(false)
    expect(await recoverAttendance('different-user')).toBeNull()
  })
  it('settles a stalled upload immediately when aborted without sending an RPC', async () => {
    mocks.upload.mockImplementation(() => new Promise(() => {}))
    mocks.remove.mockImplementation(() => new Promise(() => {}))
    const controller = new AbortController()
    const promise = submitAttendance(user, 'in', photo(), controller.signal)
    const assertion = expect(promise).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(mocks.upload).toHaveBeenCalled())
    controller.abort()
    await assertion
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('fails closed when browser storage is unavailable without throwing from pending-state checks', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    expect(hasPendingAttendance(user)).toBe(true)
    get.mockRestore()
  })
  it('bounds a stalled current-day refresh used after previous-day recovery', async () => {
    vi.useFakeTimers()
    try {
      mocks.read.mockImplementation(() => new Promise(() => {}))
      const promise = loadAttendanceForDate(user, '2026-09-25', new AbortController().signal)
      const assertion = expect(promise).rejects.toThrow('Koneksi terlalu lama')
      await vi.advanceTimersByTimeAsync(25_000)
      await assertion
    } finally { vi.useRealTimers() }
  })
})
