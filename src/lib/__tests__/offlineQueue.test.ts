import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { offlineQueue } from '../offlineQueue'

const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((k: string) => storage[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { storage[k] = String(v) }),
  removeItem: vi.fn((k: string) => { delete storage[k] }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]) }),
}
vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('window', {
  dispatchEvent: vi.fn(),
})

describe('Offline Mutation Queue Engine (offlineQueue)', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
    vi.restoreAllMocks()
  })

  it('enqueues mutations and stores them in localStorage', () => {
    expect(offlineQueue.getPendingCount()).toBe(0)

    const mut1 = offlineQueue.enqueue('grooming_step_update', {
      sessionId: 'sess-1',
      step: 'bath',
      status: 'dikerjakan',
    })

    expect(mut1.id).toBeDefined()
    expect(mut1.type).toBe('grooming_step_update')
    expect(offlineQueue.getPendingCount()).toBe(1)

    const mut2 = offlineQueue.enqueue('toggle_sudah_bayar', {
      table: 'grooming_sessions',
      id: 'sess-1',
      sudah_bayar: true,
    })

    expect(offlineQueue.getPendingCount()).toBe(2)
    const queue = offlineQueue.getQueue()
    expect(queue[0].id).toBe(mut1.id)
    expect(queue[1].id).toBe(mut2.id)
  })

  it('safely handles corrupt localStorage JSON without throwing', () => {
    localStorage.setItem('dr_meow_offline_queue', '{ corrupt invalid json !!')
    expect(offlineQueue.getQueue()).toEqual([])
    expect(offlineQueue.getPendingCount()).toBe(0)

    // Should still allow enqueueing after corruption recovery
    offlineQueue.enqueue('hotel_daily_report', { booking_id: 'b-1', nafsu_makan: 'Bagus' })
    expect(offlineQueue.getPendingCount()).toBe(1)
  })

  it('removes specific mutations by ID', () => {
    const mut1 = offlineQueue.enqueue('grooming_step_update', { sessionId: 's-1' })
    const mut2 = offlineQueue.enqueue('grooming_step_update', { sessionId: 's-2' })

    expect(offlineQueue.getPendingCount()).toBe(2)
    offlineQueue.remove(mut1.id)

    expect(offlineQueue.getPendingCount()).toBe(1)
    expect(offlineQueue.getQueue()[0].id).toBe(mut2.id)
  })

  it('clears all queued mutations with clearQueue', () => {
    offlineQueue.enqueue('grooming_step_update', { sessionId: 's-1' })
    offlineQueue.enqueue('grooming_step_update', { sessionId: 's-2' })
    expect(offlineQueue.getPendingCount()).toBe(2)

    offlineQueue.clearQueue()
    expect(offlineQueue.getPendingCount()).toBe(0)
    expect(offlineQueue.getQueue()).toEqual([])
  })

  it('flushes queued mutations in FIFO order and removes succeeded ones', async () => {
    const executed: string[] = []

    vi.spyOn(offlineQueue, 'executeMutation').mockImplementation(async (item) => {
      executed.push(item.id)
    })

    const mut1 = offlineQueue.enqueue('grooming_step_update', { sessionId: 's-1' })
    const mut2 = offlineQueue.enqueue('toggle_sudah_bayar', { id: 's-1', table: 'grooming_sessions', sudah_bayar: true })

    expect(offlineQueue.getPendingCount()).toBe(2)

    const result = await offlineQueue.flush()

    expect(result.successCount).toBe(2)
    expect(result.failCount).toBe(0)
    expect(result.errors).toEqual([])
    expect(executed).toEqual([mut1.id, mut2.id])
    expect(offlineQueue.getPendingCount()).toBe(0)
  })

  it('increments retry count on failure and drops item after MAX_RETRIES to prevent blocking', async () => {
    vi.spyOn(offlineQueue, 'executeMutation').mockRejectedValue(new Error('Database lock error'))

    offlineQueue.enqueue('hotel_daily_report', { booking_id: 'b-1' })
    expect(offlineQueue.getPendingCount()).toBe(1)

    // Flush 1 -> retryCount becomes 1
    const res = await offlineQueue.flush()
    expect(res.failCount).toBe(1)
    expect(offlineQueue.getQueue()[0].retryCount).toBe(1)
    expect(offlineQueue.getQueue()[0].lastError).toBe('Database lock error')

    // Flush 2, 3, 4
    await offlineQueue.flush() // retryCount 2
    await offlineQueue.flush() // retryCount 3
    await offlineQueue.flush() // retryCount 4
    expect(offlineQueue.getQueue()[0].retryCount).toBe(4)

    // Flush 5 -> reaches MAX_RETRIES (5), gets pruned
    await offlineQueue.flush()
    expect(offlineQueue.getPendingCount()).toBe(0)
  })

  it('prevents concurrent flush executions (mutex lock)', async () => {
    let resolveFirst: () => void
    const firstPromise = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })

    vi.spyOn(offlineQueue, 'executeMutation').mockImplementation(async () => {
      await firstPromise
    })

    offlineQueue.enqueue('grooming_step_update', { sessionId: 's-1' })

    const p1 = offlineQueue.flush()
    const p2 = offlineQueue.flush() // Second call while first is in-flight

    const res2 = await p2
    expect(res2.errors).toContain('Flush already in progress')

    resolveFirst!()
    const res1 = await p1
    expect(res1.successCount).toBe(1)
  })

  it('aborts flush immediately if device is offline', async () => {
    const originalNavigator = globalThis.navigator
    // Mock navigator.onLine = false
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    })

    offlineQueue.enqueue('hotel_daily_report', { booking_id: 'b-offline' })
    expect(offlineQueue.getPendingCount()).toBe(1)

    const executeSpy = vi.spyOn(offlineQueue, 'executeMutation')
    const result = await offlineQueue.flush()

    expect(result.successCount).toBe(0)
    expect(result.errors).toContain('Perangkat sedang offline')
    expect(executeSpy).not.toHaveBeenCalled()
    expect(offlineQueue.getPendingCount()).toBe(1)

    // Restore navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })
})
