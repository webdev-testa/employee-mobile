// @vitest-environment jsdom
// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import GroomingWorkstation from '../GroomingWorkstation'
import { toast } from 'sonner'
import * as groomingSessionsHook from '@/hooks/grooming/useGroomingSessions'
import type { GroomingSession } from '@/types/pos.types'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn().mockRejectedValue(new Error('User cancelled photos app')),
  },
  CameraResultType: { DataUrl: 'dataUrl' },
  CameraSource: { Camera: 'camera' },
}))

const mockSessionWithMissingCatAndOwner: GroomingSession = {
  id: 'sess-corrupt-1',
  owner_id: 'own-1',
  cat_id: 'cat-1',
  paket: 'Mandi Sehat / Biasa',
  harga: 65000,
  kondisi_awal: 'Jamur Punggung/Dagu',
  catatan: undefined,
  tanggal: '2026-09-17',
  waktu_masuk: '2026-09-17T09:00:00Z',
  estimasi_selesai: '2026-09-17T10:00:00Z',
  status: 'dikerjakan',
  current_step: 'bathing',
  public_token: 'grm-test-token-123',
  sudah_bayar: false,
  groomer_name: 'Budi',
  created_at: '2026-09-17T09:00:00Z',
  owner: undefined,
  cat: undefined,
  progress: [
    {
      id: 'p-1',
      session_id: 'sess-corrupt-1',
      step: 'check_in',
      catatan: 'Check in awal',
      created_at: '', // Corrupt / empty date string
    },
  ],
}

describe('Red-Team Verification: GroomingWorkstation Null-Safety & Fallbacks', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('safely displays fallback "Kucing" and "Owner: -" without crashing when cat and owner are null/undefined', () => {
    vi.spyOn(groomingSessionsHook, 'useGroomingSessions').mockReturnValue({
      sessions: [mockSessionWithMissingCatAndOwner],
      loading: false,
      refreshing: false,
      error: null,
      mutatingSessionId: null,
      refetch: vi.fn(),
      updateStep: vi.fn(),
      toggleSudahBayar: vi.fn(),
      markPickedUp: vi.fn(),
    })

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/grooming/work?session=sess-corrupt-1']}>
          <GroomingWorkstation />
        </MemoryRouter>
      )
    })

    // Should display fallback "Kucing"
    expect(container.textContent).toContain('Kucing')

    // Should NOT display "Owner: ()"
    expect(container.textContent).not.toContain('Owner: ()')
    expect(container.textContent).toContain('Owner: -')
  })

  it('safely formats corrupt progress created_at date without throwing RangeError: Invalid time value', () => {
    vi.spyOn(groomingSessionsHook, 'useGroomingSessions').mockReturnValue({
      sessions: [mockSessionWithMissingCatAndOwner],
      loading: false,
      refreshing: false,
      error: null,
      mutatingSessionId: null,
      refetch: vi.fn(),
      updateStep: vi.fn(),
      toggleSudahBayar: vi.fn(),
      markPickedUp: vi.fn(),
    })

    expect(() => {
      act(() => {
        root.render(
          <MemoryRouter initialEntries={['/grooming/work?session=sess-corrupt-1']}>
            <GroomingWorkstation />
          </MemoryRouter>
        )
      })
    }).not.toThrow()

    // Timeline renders '-' for invalid/empty date
    expect(container.textContent).toContain('-')
  })

  it('disables the big Selesai button when session is dibatalkan', () => {
    const cancelledSession: GroomingSession = {
      ...mockSessionWithMissingCatAndOwner,
      id: 'sess-cancelled',
      status: 'dibatalkan',
    }

    vi.spyOn(groomingSessionsHook, 'useGroomingSessions').mockReturnValue({
      sessions: [cancelledSession],
      loading: false,
      refreshing: false,
      error: null,
      mutatingSessionId: null,
      refetch: vi.fn(),
      updateStep: vi.fn(),
      toggleSudahBayar: vi.fn(),
      markPickedUp: vi.fn(),
    })

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/grooming/work?session=sess-cancelled']}>
          <GroomingWorkstation />
        </MemoryRouter>
      )
    })

    // Selesai button should not be rendered for dibatalkan session
    expect(container.textContent).not.toContain('GROOMING SELESAI & SIAP DIJEMPUT!')
  })

  it('rejects invalid non-image MIME types when uploading photo via file input', () => {
    vi.spyOn(groomingSessionsHook, 'useGroomingSessions').mockReturnValue({
      sessions: [mockSessionWithMissingCatAndOwner],
      loading: false,
      refreshing: false,
      error: null,
      mutatingSessionId: null,
      refetch: vi.fn(),
      updateStep: vi.fn(),
      toggleSudahBayar: vi.fn(),
      markPickedUp: vi.fn(),
    })

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/grooming/work?session=sess-corrupt-1']}>
          <GroomingWorkstation />
        </MemoryRouter>
      )
    })

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeDefined()

    const maliciousFile = new File(['<svg onload="alert(1)"></svg>'], 'exploit.svg', {
      type: 'image/svg+xml',
    })

    act(() => {
      Object.defineProperty(fileInput, 'files', {
        value: [maliciousFile],
        writable: true,
      })
      fileInput.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(toast.error).toHaveBeenCalledWith('Format file harus berupa foto JPEG, PNG, atau WebP')
  })

  it('warns when attempting to send WhatsApp notification with invalid short phone number', () => {
    const sessionWithShortPhone: GroomingSession = {
      ...mockSessionWithMissingCatAndOwner,
      id: 'sess-done-short-phone',
      status: 'selesai',
      owner: {
        id: 'own-1',
        nama: 'Owner',
        no_wa: '123', // Invalid short phone number
        created_at: '2026-09-17T09:00:00Z',
      },
    }

    vi.spyOn(groomingSessionsHook, 'useGroomingSessions').mockReturnValue({
      sessions: [sessionWithShortPhone],
      loading: false,
      refreshing: false,
      error: null,
      mutatingSessionId: null,
      refetch: vi.fn(),
      updateStep: vi.fn(),
      toggleSudahBayar: vi.fn(),
      markPickedUp: vi.fn(),
    })

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/grooming/work?session=sess-done-short-phone']}>
          <GroomingWorkstation />
        </MemoryRouter>
      )
    })

    const buttons = Array.from(container.querySelectorAll('button'))
    const waButton = buttons.find(b => b.textContent?.includes('Kirim Notifikasi Siap Dijemput'))
    expect(waButton).toBeDefined()

    act(() => {
      waButton?.click()
    })

    expect(toast.error).toHaveBeenCalledWith('Nomor WhatsApp pemilik tidak valid (minimal 8 digit).')
  })
})
