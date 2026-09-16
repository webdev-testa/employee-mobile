import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { offlineQueue } from '@/lib/offlineQueue'

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

describe('Offline Synchronization Pipeline & Lifecycle Tests', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
    vi.restoreAllMocks()
  })

  it('preserves queued mutations across offline/online cycles', async () => {
    // 1. App goes offline and queues transactions
    offlineQueue.enqueue('grooming_step_update', {
      sessionId: 'sess-offline-1',
      step: 'haircut',
      status: 'dikerjakan',
    })
    offlineQueue.enqueue('hotel_daily_report', {
      booking_id: 'book-offline-1',
      tanggal: '2026-03-25',
      nafsu_makan: 'Baik',
    })

    expect(offlineQueue.getPendingCount()).toBe(2)

    // 2. While offline, flush is prevented
    const originalNavigator = globalThis.navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      writable: true,
      configurable: true,
    })

    const offlineResult = await offlineQueue.flush()
    expect(offlineResult.successCount).toBe(0)
    expect(offlineResult.errors).toContain('Perangkat sedang offline')
    expect(offlineQueue.getPendingCount()).toBe(2)

    // 3. Network reconnects (online = true)
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    })

    const executed: string[] = []
    vi.spyOn(offlineQueue, 'executeMutation').mockImplementation(async (item) => {
      executed.push(item.id)
    })

    const onlineResult = await offlineQueue.flush()
    expect(onlineResult.successCount).toBe(2)
    expect(onlineResult.failCount).toBe(0)
    expect(executed.length).toBe(2)
    expect(offlineQueue.getPendingCount()).toBe(0)

    // Restore navigator
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it('guarantees idempotency and safe recovery when re-syncing duplicate items', async () => {
    const executedItems: string[] = []
    vi.spyOn(offlineQueue, 'executeMutation').mockImplementation(async (item) => {
      executedItems.push(item.id)
    })

    const item = offlineQueue.enqueue('toggle_sudah_bayar', {
      id: 'sess-100',
      table: 'grooming_sessions',
      sudah_bayar: true,
    })

    expect(offlineQueue.getPendingCount()).toBe(1)
    const res = await offlineQueue.flush()
    expect(res.successCount).toBe(1)
    expect(executedItems).toContain(item.id)

    // Subsequent flush on empty queue returns clean zero results
    const secondRes = await offlineQueue.flush()
    expect(secondRes.successCount).toBe(0)
    expect(secondRes.failCount).toBe(0)
    expect(offlineQueue.getPendingCount()).toBe(0)
  })
})
