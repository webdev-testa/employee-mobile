import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { groomingService } from '../groomingService'
import { posService } from '../posService'
import { supabasePos } from '@/lib/supabasePos'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabasePos', () => {
  return {
    supabasePos: {
      from: vi.fn(),
    },
  }
})

const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((k: string) => storage[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { storage[k] = String(v) }),
  removeItem: vi.fn((k: string) => { delete storage[k] }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]) }),
}
vi.stubGlobal('localStorage', localStorageMock)
vi.stubGlobal('window', {
  location: { origin: 'https://app.drmeow.com' },
})

describe('Red-Team Verification Test Suite - Cat Grooming Resilience & Security', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('Defect 1: Duplicate progress prevention under concurrent requests', () => {
    it('does not insert duplicate progress records for the same step and session', async () => {
      let progressInsertCount = 0
      const mockFrom = vi.fn((table: string) => {
        if (table === 'grooming_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'session-1', status: 'antrian', current_step: 'check_in' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'grooming_progress') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockImplementation(() => {
                    if (progressInsertCount > 0) {
                      return Promise.resolve({ data: { id: 'existing-prog-1' }, error: null })
                    }
                    return Promise.resolve({ data: null, error: null })
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockImplementation(() => {
              progressInsertCount++
              return Promise.resolve({ error: null })
            }),
          }
        }
        return {}
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      // Invoke step update twice sequentially
      await groomingService.updateStep('session-1', 'bathing')
      await groomingService.updateStep('session-1', 'bathing')

      expect(progressInsertCount).toBe(1)
    })
  })

  describe('Defect 2: Token entropy and public live token format', () => {
    it('generates high-entropy tokens with grm- prefix', async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'sess-101',
                public_token: 'grm-abcdef1234567890',
                harga: 50000,
              },
              error: null,
            }),
          }),
        }),
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      const session = await groomingService.createSession({
        owner_id: 'own-1',
        cat_id: 'cat-1',
        paket: 'Mandi Sehat',
        harga: 50000,
      })

      expect(session.public_token).toBeDefined()
      expect(session.public_token).toMatch(/^grm-[a-zA-Z0-9]+$/)
    })
  })

  describe('Defect 3: Terminal status progression guards', () => {
    it('throws an error and prevents step modification if session is already dijemput', async () => {
      const mockFrom = vi.fn((table: string) => {
        if (table === 'grooming_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'session-closed',
                    status: 'dijemput',
                    current_step: 'done',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await expect(
        groomingService.updateStep('session-closed', 'bathing')
      ).rejects.toThrow(/sudah dalam status 'dijemput'/)
    })

    it('throws an error and prevents step modification if session is dibatalkan', async () => {
      const mockFrom = vi.fn((table: string) => {
        if (table === 'grooming_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'session-cancelled',
                    status: 'dibatalkan',
                    current_step: 'check_in',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await expect(
        groomingService.updateStep('session-cancelled', 'bathing')
      ).rejects.toThrow(/sudah dalam status 'dibatalkan'/)
    })
  })

  describe('Defect 4: File MIME type whitelist & storage safety', () => {
    it('rejects dangerous files (svg/executable/html)', async () => {
      const maliciousFile = new File(['<svg onload=alert(1)>'], 'malicious.svg', {
        type: 'image/svg+xml',
      })

      await expect(
        groomingService.uploadGroomingPhoto(maliciousFile, 'sess-1', 'bathing')
      ).rejects.toThrow(/Format file tidak didukung/)
    })

    it('accepts valid JPEG files and uploads to cat-photos bucket', async () => {
      const validFile = new File(['dummy content'], 'photo.jpg', {
        type: 'image/jpeg',
      })

      const mockUpload = vi.fn().mockResolvedValue({ error: null })
      const mockGetPublicUrl = vi.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.drmeow.com/cat-photos/grooming/photo.jpg' },
      })

      ;(supabase.storage as unknown as { from: unknown }).from = vi.fn().mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })

      const url = await groomingService.uploadGroomingPhoto(validFile, 'sess-1', 'bathing')
      expect(url).toBe('https://storage.drmeow.com/cat-photos/grooming/photo.jpg')
      expect(supabase.storage.from).toHaveBeenCalledWith('cat-photos')
    })
  })

  describe('Defect 5: Sudah Bayar toggle mutation', () => {
    it('toggles payment status cleanly and synchronizes cache', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      const mockFrom = vi.fn().mockReturnValue({
        update: mockUpdate,
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await groomingService.toggleSudahBayar('demo-grm-1', true)
      expect(mockUpdate).toHaveBeenCalledWith({ sudah_bayar: true })

      await groomingService.toggleSudahBayar('demo-grm-1', false)
      expect(mockUpdate).toHaveBeenCalledWith({ sudah_bayar: false })
    })
  })

  describe('Defect 6: Cache preservation when filtering by status', () => {
    it('merges filtered results without deleting existing cached sessions of other statuses', async () => {
      const initialCache = [
        { id: 'sess-done-1', status: 'selesai', current_step: 'done', harga: 50000, progress: [] },
        { id: 'sess-q-1', status: 'antrian', current_step: 'check_in', harga: 60000, progress: [] },
      ]
      localStorage.setItem('dr_meow_grooming_sessions_cache', JSON.stringify(initialCache))

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { id: 'sess-q-1', status: 'antrian', current_step: 'check_in', harga: 60000, progress: [] },
                { id: 'sess-q-2', status: 'antrian', current_step: 'check_in', harga: 75000, progress: [] },
              ],
              error: null,
            }),
          }),
        }),
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await groomingService.fetchSessions({ status: 'antrian' })

      const rawUpdated = localStorage.getItem('dr_meow_grooming_sessions_cache')
      expect(rawUpdated).not.toBeNull()
      const updatedCache = JSON.parse(rawUpdated!)

      const doneSession = updatedCache.find((s: { id: string; status: string }) => s.id === 'sess-done-1')
      expect(doneSession).toBeDefined()
      expect(doneSession?.status).toBe('selesai')

      const q2Session = updatedCache.find((s: { id: string }) => s.id === 'sess-q-2')
      expect(q2Session).toBeDefined()
    })
  })

  describe("Defect 7: Terminal 'selesai' status guard", () => {
    it("blocks illegal transition from 'selesai' back to previous steps", async () => {
      const mockFrom = vi.fn((table: string) => {
        if (table === 'grooming_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'sess-completed',
                    status: 'selesai',
                    current_step: 'done',
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await expect(
        groomingService.updateStep('sess-completed', 'bathing')
      ).rejects.toThrow(/sudah selesai dan tidak dapat diubah kembali/)
    })

    it("allows updating step with 'done' to attach final completion photos", async () => {
      let updateCalled = false
      const mockFrom = vi.fn((table: string) => {
        if (table === 'grooming_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'sess-completed-photo',
                    status: 'selesai',
                    current_step: 'done',
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                updateCalled = true
                return Promise.resolve({ error: null })
              }),
            }),
          }
        }
        if (table === 'grooming_progress') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'prog-done' }, error: null }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return {}
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await expect(
        groomingService.updateStep('sess-completed-photo', 'done', {
          foto_url: 'https://storage.drmeow.com/final.jpg',
        })
      ).resolves.not.toThrow()
      expect(updateCalled).toBe(true)
    })
  })

  describe('Defect 8: Updating existing progress row with photos/notes', () => {
    it('updates existing progress record instead of dropping photo when step row already exists', async () => {
      interface ProgressUpdatePayload {
        foto_url?: string
        catatan?: string
      }
      let updatedProgressData: ProgressUpdatePayload = {}
      const mockFrom = vi.fn((table: string) => {
        if (table === 'grooming_sessions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'sess-repeat', status: 'dikerjakan', current_step: 'bathing' },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        if (table === 'grooming_progress') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'existing-prog-row-42', step: 'bathing' },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockImplementation((data: ProgressUpdatePayload) => {
              updatedProgressData = data
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        return {}
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      await groomingService.updateStep('sess-repeat', 'bathing', {
        foto_url: 'https://storage.drmeow.com/shampoo.jpg',
        catatan: 'Shampo antikutu diaplikasikan',
      })

      expect(updatedProgressData.foto_url).toBe('https://storage.drmeow.com/shampoo.jpg')
      expect(updatedProgressData.catatan).toBe('Shampo antikutu diaplikasikan')
    })
  })

  describe('Defect 9: Path traversal sanitization in uploadGroomingPhoto', () => {
    it('sanitizes directory traversal characters from sessionId and step', async () => {
      let uploadedFilePath = ''
      const validFile = new File(['dummy content'], 'photo.png', {
        type: 'image/png',
      })

      ;(supabase.storage as unknown as { from: unknown }).from = vi.fn().mockReturnValue({
        upload: vi.fn().mockImplementation((path: string) => {
          uploadedFilePath = path
          return Promise.resolve({ error: null })
        }),
        getPublicUrl: vi.fn().mockImplementation((path: string) => ({
          data: { publicUrl: `https://storage.drmeow.com/cat-photos/${path}` },
        })),
      })

      await groomingService.uploadGroomingPhoto(
        validFile,
        '../../danger/session-id',
        'bathing'
      )

      expect(uploadedFilePath).not.toContain('../')
      expect(uploadedFilePath).toContain('grooming/______danger_session-id/bathing-')
    })
  })

  describe('Defect 10: Valid UUID generation in posService for new entities', () => {
    it('generates valid RFC4122 UUIDs for fallback owners and cats', async () => {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

      const mockFrom = vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Offline fallback') }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Offline fallback') }),
          }),
        }),
      })
      ;(supabasePos as unknown as { from: unknown }).from = mockFrom

      const owner = await posService.upsertOwner({
        nama: 'Owner Test',
        no_wa: '081299998888',
      })
      expect(owner.id).toMatch(UUID_REGEX)

      const cat = await posService.createCat({
        owner_id: owner.id,
        nama: 'Cat Test',
      })
      expect(cat.id).toMatch(UUID_REGEX)
    })
  })
})
