/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { offlineQueue } from '../offlineQueue'
import { supabasePos } from '../supabasePos'

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

describe('Red-Team Verification Suite: Offline Queue & Sync Resilience', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
    vi.restoreAllMocks()
  })

  describe('Defect 1: Network Outages Must Abort Flush Without Incrementing Retries or Wiping Data', () => {
    it('aborts flush on network errors without incrementing retryCount', async () => {
      vi.spyOn(offlineQueue, 'executeMutation').mockRejectedValue(new TypeError('Failed to fetch'))

      offlineQueue.enqueue('grooming_step_update', { sessionId: 's-1', step: 'bath' })
      offlineQueue.enqueue('hotel_daily_report', { booking_id: 'b-1', tanggal: '2026-03-25' })

      expect(offlineQueue.getPendingCount()).toBe(2)

      // Even if flush is called 5 times during network drop
      for (let i = 0; i < 5; i++) {
        const res = await offlineQueue.flush()
        expect(res.failCount).toBe(1)
        expect(res.errors[0]).toContain('Failed to fetch')
      }

      // Zero items should be dropped, retry count should NOT be incremented for network errors
      const queue = offlineQueue.getQueue()
      expect(queue.length).toBe(2)
      expect(queue[0].retryCount).toBe(0)
      expect(queue[1].retryCount).toBe(0)
    })

    it('moves unrecoverable poison-pill mutations to Dead-Letter Queue after MAX_RETRIES', async () => {
      // Non-network schema error
      vi.spyOn(offlineQueue, 'executeMutation').mockRejectedValue(new Error('Invalid foreign key constraint'))

      offlineQueue.enqueue('grooming_step_update', { sessionId: 'corrupt-session' })
      expect(offlineQueue.getPendingCount()).toBe(1)

      for (let i = 0; i < 5; i++) {
        await offlineQueue.flush()
      }

      // Dropped from active queue to prevent lockup
      expect(offlineQueue.getPendingCount()).toBe(0)

      // Preserved in Dead-Letter Queue for forensic recovery
      const dlqRaw = localStorage.getItem('dr_meow_offline_dlq')
      expect(dlqRaw).toBeDefined()
      const dlq = JSON.parse(dlqRaw!)
      expect(dlq.length).toBe(1)
      expect(dlq[0].payload.sessionId).toBe('corrupt-session')
    })
  })

  describe('Defect 2: Offline Owner and Cat Creation Synchronization', () => {
    it('executes pos_upsert_owner and pos_create_cat mutations successfully', async () => {
      const insertedOwners: Array<Record<string, unknown>> = []
      const insertedCats: Array<Record<string, unknown>> = []

      vi.spyOn(supabasePos, 'from').mockImplementation((table: string) => {
        if (table === 'owners') {
          return {
            upsert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              insertedOwners.push(data)
              return Promise.resolve({ error: null })
            }),
          } as any
        }
        if (table === 'cats') {
          return {
            upsert: vi.fn().mockImplementation((data: Record<string, unknown>) => {
              insertedCats.push(data)
              return Promise.resolve({ error: null })
            }),
          } as any
        }
        return {} as any
      })

      offlineQueue.enqueue('pos_upsert_owner', {
        id: 'own-offline-1',
        nama: 'Ahmad Budi',
        no_wa: '6281234567890',
      })
      offlineQueue.enqueue('pos_create_cat', {
        id: 'cat-offline-1',
        owner_id: 'own-offline-1',
        nama: 'Kuro',
        ras: 'Persian',
      })

      expect(offlineQueue.getPendingCount()).toBe(2)

      const res = await offlineQueue.flush()
      expect(res.successCount).toBe(2)
      expect(offlineQueue.getPendingCount()).toBe(0)

      expect(insertedOwners.length).toBe(1)
      expect(insertedOwners[0].id).toBe('own-offline-1')
      expect(insertedCats.length).toBe(1)
      expect(insertedCats[0].id).toBe('cat-offline-1')
    })
  })

  describe('Defect 3: Offline Base64 Photo Upload to Supabase Storage on Sync', () => {
    it('uploads base64 data URLs to cat-photos storage and replaces with public URL', async () => {
      let uploadedToStorage = false
      vi.spyOn(supabasePos.storage, 'from').mockReturnValue({
        upload: vi.fn().mockImplementation(() => {
          uploadedToStorage = true
          return Promise.resolve({ error: null })
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://cdn.drmeow.com/cat-photos/grooming/synced-photo.jpg' },
        }),
      } as any)

      let insertedProgressPhoto = ''
      vi.spyOn(supabasePos, 'from').mockImplementation((table: string) => {
        if (table === 'grooming_sessions') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockResolvedValue({ data: [{ id: 'sess-photo-1' }], error: null }),
              }),
            }),
          } as any
        }
        if (table === 'grooming_progress') {
          return {
            insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              insertedProgressPhoto = String(payload.foto_url)
              return Promise.resolve({ error: null })
            }),
          } as any
        }
        return {} as any
      })

      const base64Data = 'data:image/jpeg;base64,' + btoa('fake-image-bytes')
      await offlineQueue.executeMutation({
        id: 'mut-photo-1',
        type: 'grooming_step_update',
        createdAt: new Date().toISOString(),
        retryCount: 0,
        payload: {
          sessionId: 'sess-photo-1',
          step: 'bath',
          foto_url: base64Data,
        },
      })

      expect(uploadedToStorage).toBe(true)
      expect(insertedProgressPhoto).toBe('https://cdn.drmeow.com/cat-photos/grooming/synced-photo.jpg')
    })
  })

  describe('Defect 4: Financial Transactions Idempotency on Sync Retry', () => {
    it('does not duplicate DP transactions if hotel_checkin is retried', async () => {
      let txInsertCount = 0
      vi.spyOn(supabasePos, 'from').mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
          } as any
        }
        if (table === 'transactions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  // First attempt: no existing DP. Second attempt: existing DP found!
                  maybeSingle: vi.fn().mockImplementation(async () => {
                    if (txInsertCount > 0) return { data: { id: 'existing-dp-tx' }, error: null }
                    return { data: null, error: null }
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockImplementation(() => {
              txInsertCount++
              return Promise.resolve({ error: null })
            }),
          } as any
        }
        return {} as any
      })

      const item = {
        id: 'mut-dp-1',
        type: 'hotel_checkin' as const,
        createdAt: new Date().toISOString(),
        retryCount: 0,
        payload: {
          id: 'book-dp-1',
          cat_id: 'cat-1',
          owner_id: 'own-1',
          tanggal_masuk: '2026-03-25',
          paket: 'VIP',
          harga_per_hari: 100000,
          dp: 50000,
          sudah_bayar_dp: true,
        },
      }

      // Attempt 1: Inserts DP transaction
      await offlineQueue.executeMutation(item)
      expect(txInsertCount).toBe(1)

      // Attempt 2 (retry scenario): Skips duplicate insert
      await offlineQueue.executeMutation(item)
      expect(txInsertCount).toBe(1)
    })
  })

  describe('Defect 7: Non-Existent Record Update Detection', () => {
    it('throws error when grooming_step_update targets a deleted/missing session', async () => {
      vi.spyOn(supabasePos, 'from').mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: [], error: null }), // 0 rows updated
          }),
        }),
      } as any)

      await expect(
        offlineQueue.executeMutation({
          id: 'mut-missing',
          type: 'grooming_step_update',
          createdAt: new Date().toISOString(),
          retryCount: 0,
          payload: { sessionId: 'ghost-session', step: 'done' },
        })
      ).rejects.toThrow('Sesi grooming ghost-session tidak ditemukan di server')
    })
  })
})
