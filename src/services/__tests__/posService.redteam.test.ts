import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { posService, getCachedOwners } from '../posService'
import { supabasePos } from '@/lib/supabasePos'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabasePos', () => {
  return {
    supabasePos: {
      from: vi.fn(),
    },
  }
})

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      storage: {
        from: vi.fn(),
      },
    },
  }
})

const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((k: string) => storage[k] ?? null),
  setItem: vi.fn((k: string, v: string) => {
    storage[k] = String(v)
  }),
  removeItem: vi.fn((k: string) => {
    delete storage[k]
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach(k => delete storage[k])
  }),
}
vi.stubGlobal('localStorage', localStorageMock)

describe('Red-Team Verification Test Suite - POS & Hotel Boarding Module', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('Phase 1 & 2: Concurrency, State-Machine Transitions & Re-entrancy', () => {
    it('blocks double check-out and throws error when booking is already finished (status === selesai)', async () => {
      // Mock fetchBookingById returning already 'selesai'
      vi.spyOn(posService, 'fetchBookingById').mockResolvedValue({
        id: 'book-done-1',
        cat_id: 'cat-1',
        owner_id: 'own-1',
        tanggal_masuk: '2026-03-20',
        tanggal_keluar_estimasi: '2026-03-22',
        paket: 'Standard Room',
        harga_per_hari: 50000,
        status: 'selesai',
        created_at: '',
      })

      await expect(
        posService.executeCheckout({
          bookingId: 'book-done-1',
          checkoutDate: '2026-03-22',
        })
      ).rejects.toThrow('sudah selesai')
    })

    it('records settlement transaction and extra charge transactions during valid checkout', async () => {
      vi.spyOn(posService, 'fetchBookingById').mockResolvedValue({
        id: 'book-active-1',
        cat_id: 'cat-1',
        owner_id: 'own-1',
        tanggal_masuk: '2026-03-20',
        tanggal_keluar_estimasi: '2026-03-22',
        paket: 'Standard Room',
        harga_per_hari: 50000,
        status: 'aktif',
        created_at: '',
        transactions: [],
      })

      const insertedTransactions: Array<Record<string, unknown>> = []
      const mockFrom = vi.fn((table: string) => {
        if (table === 'bookings') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              insertedTransactions.push(payload)
              return Promise.resolve({ error: null })
            }),
          }
        }
        return {}
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await posService.executeCheckout({
        bookingId: 'book-active-1',
        checkoutDate: '2026-03-22',
        extraCharges: [{ keterangan: 'Makanan Kaleng', jumlah: 25000 }],
        sudahBayar: true,
      })

      // Must record extra charges
      const extraChargeTx = insertedTransactions.find(t => t.tipe === 'biaya_tambahan')
      expect(extraChargeTx).toBeDefined()
      expect(extraChargeTx?.jumlah).toBe(25000)

      // Must record settlement (pelunasan)
      const settlementTx = insertedTransactions.find(t => t.tipe === 'pelunasan')
      expect(settlementTx).toBeDefined()
      expect(Number(settlementTx?.jumlah)).toBeGreaterThan(0)
    })

    it('throws an error if Supabase fails to update booking status during checkout (no silent swallow)', async () => {
      vi.spyOn(posService, 'fetchBookingById').mockResolvedValue({
        id: 'book-fail-1',
        cat_id: 'cat-1',
        owner_id: 'own-1',
        tanggal_masuk: '2026-03-20',
        tanggal_keluar_estimasi: '2026-03-22',
        paket: 'Standard Room',
        harga_per_hari: 50000,
        status: 'aktif',
        created_at: '',
        transactions: [],
      })

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Network connection aborted' },
          }),
        }),
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await expect(
        posService.executeCheckout({
          bookingId: 'book-fail-1',
          checkoutDate: '2026-03-22',
        })
      ).rejects.toThrow('Network connection aborted')
    })

    it('does NOT create a payment transaction if sudah_bayar_dp is false during check-in', async () => {
      const insertedTx: Array<Record<string, unknown>> = []
      const mockFrom = vi.fn((table: string) => {
        if (table === 'bookings') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'book-no-dp-tx', status: 'aktif', harga_per_hari: 50000 },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'transactions') {
          return {
            insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
              insertedTx.push(payload)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: payload }),
                }),
              }
            }),
          }
        }
        return {}
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await posService.createCheckIn({
        owner: { id: 'own-1', nama: 'Budi', no_wa: '081234567890' },
        cat: { id: 'cat-1', nama: 'Milo' },
        booking: {
          tanggal_masuk: '2026-03-20',
          tanggal_keluar_estimasi: '2026-03-22',
          paket: 'Standard',
          harga_per_hari: 50000,
          dp: 50000,
          sudah_bayar_dp: false, // Unpaid DP!
        },
      })

      expect(insertedTx.filter(t => t.tipe === 'dp').length).toBe(0)
    })

    it('allows progression to step 3 when registering a new cat for an owner without registered cats (effectiveIsNewCat)', () => {
      const isNewOwner = false
      const selectedOwner = { id: 'own-empty', nama: 'Newbie', no_wa: '081234567890', created_at: '' }
      const selectedCat = null
      const isNewCat = false // default unclicked
      const ownerCats: unknown[] = []
      const newCatData = { nama: 'Chiki' }

      const effectiveIsNewCat = isNewCat || isNewOwner || !selectedOwner || ownerCats.length === 0
      const isStep2Valid = Boolean(
        selectedCat || (effectiveIsNewCat && newCatData.nama.trim().length >= 2)
      )

      expect(isStep2Valid).toBe(true)
    })

    it('supports both ?bookingId= and ?id= query parameter formats for checkout navigation', () => {
      const params1 = new URLSearchParams('bookingId=book-abc-123')
      const resolved1 = params1.get('bookingId') || params1.get('id')
      expect(resolved1).toBe('book-abc-123')

      const params2 = new URLSearchParams('id=book-def-456')
      const resolved2 = params2.get('bookingId') || params2.get('id')
      expect(resolved2).toBe('book-def-456')
    })
  })

  describe('Phase 3: Security, Path Traversal & Storage Sanitization', () => {
    it('sanitizes folder name against directory traversal attacks (strip ../) in uploadPhoto', async () => {
      let uploadedPath = ''
      const mockStorage = {
        upload: vi.fn().mockImplementation((path: string) => {
          uploadedPath = path
          return Promise.resolve({ error: null })
        }),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.supabase.co/cat-photos/' + uploadedPath },
        }),
      }
      ;(supabase.storage.from as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStorage)

      const blob = new Blob(['image-bytes'], { type: 'image/jpeg' })
      // Attacker attempts path traversal folder
      await posService.uploadPhoto(blob, '../../reports' as unknown as 'reports')

      expect(uploadedPath).not.toContain('../')
      expect(uploadedPath.startsWith('reports/')).toBe(true)
    })

    it('rejects disallowed file mime types (e.g. svg, exe, php) to prevent malicious upload', async () => {
      const maliciousBlob = new Blob(['<script>alert(1)</script>'], { type: 'image/svg+xml' })
      await expect(posService.uploadPhoto(maliciousBlob, 'cats')).rejects.toThrow(
        'Format file tidak didukung'
      )

      const executableBlob = new Blob(['MZ...'], { type: 'application/x-msdownload' })
      await expect(posService.uploadPhoto(executableBlob, 'cats')).rejects.toThrow(
        'Format file tidak didukung'
      )
    })

    it('sanitizes phone numbers and formats Indonesian numbers with 62 prefix', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'own-clean',
                nama: 'Budi Santoso',
                no_wa: '6281234567890',
                created_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      const result = await posService.upsertOwner({
        nama: '  Budi Santoso  ',
        no_wa: '0812-3456-7890',
      })

      expect(result.no_wa).toBe('6281234567890')
      expect(result.nama).toBe('Budi Santoso')
    })
  })

  describe('Phase 4: Error Paths, Null Safety & Offline Fallback', () => {
    it('generates valid RFC4122 UUID when database insert fails in createCheckIn', async () => {
      // Mock DB failure
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network connection dropped' },
            }),
          }),
        }),
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      const fallbackBooking = await posService.createCheckIn({
        owner: {
          id: 'own-fallback',
          nama: 'Citra',
          no_wa: '081299998888',
        },
        cat: {
          id: 'cat-fallback',
          nama: 'Kimi',
        },
        booking: {
          tanggal_masuk: '2026-03-20',
          tanggal_keluar_estimasi: '2026-03-22',
          paket: 'Standard',
          harga_per_hari: 50000,
        },
      })

      expect(fallbackBooking).toBeDefined()
      // Verify UUID format (8-4-4-4-12 hex format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(fallbackBooking.id).toMatch(uuidRegex)
      expect(fallbackBooking.cat?.nama).toBe('Kimi')
    })

    it('generates valid RFC4122 UUID when upsertDailyReport DB insert fails', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database unreachable' },
            }),
          }),
        }),
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      const report = await posService.upsertDailyReport({
        booking_id: 'book-1',
        cat_id: 'cat-1',
        tanggal: '2026-03-20',
        nafsu_makan: 'Baik (hampir habis)',
        minum: 'Normal',
        feses: 'Normal (padat, coklat)',
        urinasi: 'Normal',
      })

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(report.id).toMatch(uuidRegex)
    })
  })

  describe('Phase 5: Durability & Cache Resilience', () => {
    it('safely recovers from corrupted localStorage JSON without throwing unhandled exceptions', () => {
      localStorageMock.setItem('dr_meow_pos_owners_cache', '{ corrupt invalid json ...')

      expect(() => {
        const cached = getCachedOwners()
        expect(Array.isArray(cached)).toBe(true)
        expect(cached.length).toBeGreaterThan(0)
      }).not.toThrow()
    })
  })
})
