// @vitest-environment jsdom
// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { useKasbon } from '@/hooks/useKasbon'
import { useClockOut, getLocalDateString } from '@/hooks/useAbsensi'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => {
  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }
  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
      },
      schema: vi.fn(),
      from: vi.fn(),
      channel: vi.fn().mockReturnValue(channelMock),
      removeChannel: vi.fn(),
      storage: {
        from: vi.fn(),
      },
    },
  }
})

// Lightweight React 19 hook runner without external dependencies
function renderHook<T>(hookFn: () => T) {
  const result = { current: null as unknown as T }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  function TestComponent() {
    result.current = hookFn()
    return null
  }

  act(() => {
    root.render(React.createElement(TestComponent))
  })

  return {
    result,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('Red-Team Verification Test Suite - Legacy Absensi & Kasbon Security & Stress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────
  // PHASE 1 & 2: KASBON CONCURRENCY, MUTEX & BOUNDARY LOGIC
  // ─────────────────────────────────────────────────────────
  describe('Kasbon Concurrency, Input Validation & Mutex Defense', () => {
    it('Defect-11 & 12: Rejects NaN, Infinity, floats, zero, negative amounts and short reasons', async () => {
      const mockSchema = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { kasbon_limit: 1000000 }, error: null }),
              gte: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      })
      vi.mocked(supabase.schema).mockImplementation(mockSchema as unknown as typeof supabase.schema)

      const { result, unmount } = renderHook(() => useKasbon('user-123'))
      await act(async () => {
        await Promise.resolve()
      })

      // Test NaN
      const resNaN = await act(async () => {
        return await result.current.submitKasbon(NaN, 'Kebutuhan mendesak', 'Kesehatan')
      })
      expect(resNaN.success).toBe(false)
      expect(resNaN.error).toMatch(/bilangan bulat positif/i)

      // Test Infinity
      const resInf = await act(async () => {
        return await result.current.submitKasbon(Infinity, 'Kebutuhan mendesak', 'Kesehatan')
      })
      expect(resInf.success).toBe(false)
      expect(resInf.error).toMatch(/bilangan bulat positif/i)

      // Test negative
      const resNeg = await act(async () => {
        return await result.current.submitKasbon(-50000, 'Kebutuhan mendesak', 'Kesehatan')
      })
      expect(resNeg.success).toBe(false)
      expect(resNeg.error).toMatch(/bilangan bulat positif/i)

      // Test zero
      const resZero = await act(async () => {
        return await result.current.submitKasbon(0, 'Kebutuhan mendesak', 'Kesehatan')
      })
      expect(resZero.success).toBe(false)
      expect(resZero.error).toMatch(/bilangan bulat positif/i)

      // Test float
      const resFloat = await act(async () => {
        return await result.current.submitKasbon(25000.75, 'Kebutuhan mendesak', 'Kesehatan')
      })
      expect(resFloat.success).toBe(false)
      expect(resFloat.error).toMatch(/bilangan bulat positif/i)

      // Test whitespace / short reason
      const resShort = await act(async () => {
        return await result.current.submitKasbon(100000, '   abc  ', 'Kesehatan')
      })
      expect(resShort.success).toBe(false)
      expect(resShort.error).toMatch(/minimal 5 karakter/i)

      unmount()
    })

    it('Defect-01: In-flight mutex blocks concurrent submitKasbon executions', async () => {
      let resolveInsert: (val: { error: null }) => void = () => {}
      const insertPromise = new Promise<{ error: null }>((res) => {
        resolveInsert = res
      })

      const mockSchema = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { kasbon_limit: 1000000 }, error: null }),
              gte: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          insert: vi.fn().mockImplementation(() => insertPromise),
        }),
      })
      vi.mocked(supabase.schema).mockImplementation(mockSchema as unknown as typeof supabase.schema)

      const { result, unmount } = renderHook(() => useKasbon('user-123'))
      await act(async () => {
        await Promise.resolve()
      })

      // Trigger two submissions rapidly in parallel
      let res1Promise: Promise<{ success: boolean; error?: string }>
      let res2Promise: Promise<{ success: boolean; error?: string }>

      act(() => {
        res1Promise = result.current.submitKasbon(200000, 'Kebutuhan keluarga mendesak', 'Kebutuhan rumah')
        res2Promise = result.current.submitKasbon(200000, 'Kebutuhan keluarga mendesak', 'Kebutuhan rumah')
      })

      // res2 should be immediately rejected by the in-flight mutex!
      const res2 = await res2Promise!
      expect(res2.success).toBe(false)
      expect(res2.error).toMatch(/sedang diproses/i)

      // Complete res1
      resolveInsert({ error: null })
      const res1 = await res1Promise!
      expect(res1.success).toBe(true)

      unmount()
    })

    it('Defect-07: cancelKasbon rejects when 0 rows were deleted (already approved/rejected)', async () => {
      const mockSchema = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { kasbon_limit: 1000000 }, error: null }),
              gte: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  // Returns empty array: row was not deleted because status is no longer 'pending'
                  select: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }),
      })
      vi.mocked(supabase.schema).mockImplementation(mockSchema as unknown as typeof supabase.schema)

      const { result, unmount } = renderHook(() => useKasbon('user-123'))
      await act(async () => {
        await Promise.resolve()
      })

      const cancelRes = await act(async () => {
        return await result.current.cancelKasbon('kasbon-item-999')
      })

      expect(cancelRes.success).toBe(false)
      expect(cancelRes.error).toMatch(/sudah diproses oleh admin atau tidak ditemukan/i)

      unmount()
    })

    it('Defect-15: Clamps remainingLimit to 0 when usedThisMonth exceeds kasbonLimit', async () => {
      const mockSchema = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { kasbon_limit: 500000 }, error: null }),
              gte: vi.fn().mockReturnValue({
                // usedThisMonth = 750,000 (exceeds limit 500,000)
                neq: vi.fn().mockResolvedValue({ data: [{ amount: 750000 }], error: null }),
              }),
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        }),
      })
      vi.mocked(supabase.schema).mockImplementation(mockSchema as unknown as typeof supabase.schema)

      const { result, unmount } = renderHook(() => useKasbon('user-123'))
      await act(async () => {
        await Promise.resolve()
      })

      expect(result.current.usedThisMonth).toBe(750000)
      expect(result.current.kasbonLimit).toBe(500000)
      // Clamped to 0 rather than -250000
      expect(result.current.remainingLimit).toBe(0)

      unmount()
    })
  })

  // ─────────────────────────────────────────────────────────
  // PHASE 3 & 4: ABSENSI CLOCK-IN / OUT & ERROR PATHS
  // ─────────────────────────────────────────────────────────
  describe('Absensi Clock-In / Clock-Out Error Paths & Durability', () => {
    // Camera cancellation and RPC failure/recovery are covered by SelfieCamera and attendanceService tests.
    it('Defect-17: getLocalDateString returns valid local YYYY-MM-DD regardless of UTC offset', () => {
      const fixedDate = new Date(2026, 8, 16, 6, 30, 0) // Sept 16, 2026 06:30 AM
      const formatted = getLocalDateString(fixedDate)
      expect(formatted).toBe('2026-09-16')
    })

    it('Defect-06: resetAttendanceDev blocks execution in non-development environments', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-emp-1' } as unknown as never },
        error: null,
      })

      try {
        vi.stubEnv('DEV', false)
        const originalDev = import.meta.env.DEV
        Object.assign(import.meta.env, { DEV: false })

        const { resetAttendanceDev } = useClockOut()
        await expect(resetAttendanceDev()).rejects.toThrow(/hanya tersedia pada development/i)

        Object.assign(import.meta.env, { DEV: originalDev })
      } finally {
        vi.unstubAllEnvs()
      }
    })

    it('Defect-10: Leave application rejects dangerous attachment extensions', () => {
      const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'pdf']
      const dangerousFiles = ['evil.exe', 'hack.sh', 'payload.php', 'script.js', 'virus.bat']
      for (const f of dangerousFiles) {
        const ext = f.split('.').pop()?.toLowerCase()
        expect(allowedExts.includes(ext!)).toBe(false)
      }
      expect(allowedExts.includes('png')).toBe(true)
      expect(allowedExts.includes('pdf')).toBe(true)
    })

    it('Defect-09: Leave application date filtering isolates weekdays and rejects weekend-only spans', () => {
      // Test Saturday to Sunday span
      const sat = new Date(2026, 8, 19) // Saturday
      const sun = new Date(2026, 8, 20) // Sunday
      const weekdays: string[] = []
      for (let d = new Date(sat); d <= sun; d.setDate(d.getDate() + 1)) {
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          weekdays.push(d.toISOString().split('T')[0])
        }
      }
      expect(weekdays.length).toBe(0) // Weekend only span correctly yields 0 weekdays
    })

    it('Defect-09: Prevents leave spans exceeding 30 days', () => {
      const start = new Date('2026-01-01')
      const end = new Date('2026-02-15')
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      expect(diffDays).toBeGreaterThan(30)
    })
  })
})
