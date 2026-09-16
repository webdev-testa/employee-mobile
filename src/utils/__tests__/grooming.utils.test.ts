import { describe, it, expect, vi } from 'vitest'
import {
  getGroomingReportUrl,
  generateGroomingCheckinWa,
  generateGroomingDoneWa,
  generateGroomingProgressWa,
  getNextGroomingStep,
  getGroomingProgressPercent,
  isStepCompleted,
  getStepBadgeConfig,
  getStatusBadgeConfig,
  openWhatsApp,
} from '../grooming.utils'
import type { GroomingSession, GroomingStep, GroomingStatus } from '@/types/pos.types'

describe('src/utils/grooming.utils.ts - Pure utility functions', () => {
  const mockSession: GroomingSession = {
    id: 'grm-101',
    owner_id: 'own-1',
    cat_id: 'cat-1',
    paket: 'Full Grooming Sehat',
    harga: 85000,
    kondisi_awal: 'Bulu agak gimbal di leher',
    catatan: 'Hati-hati kucing agak pemalu',
    tanggal: '2026-09-15',
    waktu_masuk: '2026-09-15T09:00:00.000Z',
    estimasi_selesai: '2026-09-15T11:00:00.000Z',
    status: 'antrian',
    current_step: 'check_in',
    public_token: 'grm-token-abc123',
    groomer_name: 'Budi (Groomer)',
    sudah_bayar: false,
    created_at: '2026-09-15T09:00:00.000Z',
    owner: {
      id: 'own-1',
      nama: 'Siti Rahma',
      no_wa: '081234567890',
      created_at: '2026-09-15T08:00:00.000Z',
    },
    cat: {
      id: 'cat-1',
      owner_id: 'own-1',
      nama: 'Mochi',
      ras: 'Persian',
      created_at: '2026-09-15T08:00:00.000Z',
    },
  }

  describe('getGroomingReportUrl', () => {
    it('generates the full URL based on window.location.origin', () => {
      const url = getGroomingReportUrl('token-xyz')
      expect(url).toContain('/grooming/report/token-xyz')
    })
  })

  describe('WhatsApp message generators', () => {
    it('generates check-in WA message with correct cat details, paket, and report link', () => {
      const wa = generateGroomingCheckinWa(mockSession, 'https://app.drmeow.com/grooming/report/token-abc')
      expect(wa).toContain('Halo Kak Siti Rahma!')
      expect(wa).toContain('Mochi')
      expect(wa).toContain('Full Grooming Sehat')
      expect(wa).toContain('Rp 85.000')
      expect(wa).toContain('https://app.drmeow.com/grooming/report/token-abc')
    })

    it('generates done WA message ready for pickup', () => {
      const wa = generateGroomingDoneWa(mockSession, 'https://app.drmeow.com/grooming/report/token-abc')
      expect(wa).toContain('GROOMING SELESAI & SIAP DIJEMPUT!')
      expect(wa).toContain('Mochi')
      expect(wa).toContain('https://app.drmeow.com/grooming/report/token-abc')
    })

    it('generates progress WA update for a milestone step', () => {
      const wa = generateGroomingProgressWa(mockSession, 'drying', 'https://app.drmeow.com/grooming/report/token-abc')
      expect(wa).toContain('UPDATE GROOMING MOCHI')
      expect(wa).toContain('Pengeringan / Blow Dry')
      expect(wa).toContain('https://app.drmeow.com/grooming/report/token-abc')
    })
  })

  describe('State progression helpers', () => {
    it('returns the next step in correct sequence', () => {
      expect(getNextGroomingStep('check_in')).toBe('bathing')
      expect(getNextGroomingStep('bathing')).toBe('drying')
      expect(getNextGroomingStep('drying')).toBe('styling')
      expect(getNextGroomingStep('styling')).toBe('finishing')
      expect(getNextGroomingStep('finishing')).toBe('done')
      expect(getNextGroomingStep('done')).toBeNull()
    })

    it('calculates progress percentage correctly', () => {
      expect(getGroomingProgressPercent('check_in')).toBe(15)
      expect(getGroomingProgressPercent('bathing')).toBe(35)
      expect(getGroomingProgressPercent('drying')).toBe(60)
      expect(getGroomingProgressPercent('styling')).toBe(80)
      expect(getGroomingProgressPercent('finishing')).toBe(95)
      expect(getGroomingProgressPercent('done')).toBe(100)
    })

    it('determines if a step is completed relative to current step', () => {
      expect(isStepCompleted('check_in', 'bathing')).toBe(true)
      expect(isStepCompleted('bathing', 'bathing')).toBe(true)
      expect(isStepCompleted('drying', 'bathing')).toBe(false)
      expect(isStepCompleted('done', 'finishing')).toBe(false)
      expect(isStepCompleted('finishing', 'done')).toBe(true)
    })
  })

  describe('Badge configs', () => {
    it('returns badge config for each step', () => {
      const checkInBadge = getStepBadgeConfig('check_in')
      expect(checkInBadge.label).toBe('Check-in & Kondisi Awal')
      expect(checkInBadge.dot).toContain('blue')

      const doneBadge = getStepBadgeConfig('done')
      expect(doneBadge.label).toBe('Selesai & Siap Dijemput ✨')
      expect(doneBadge.dot).toContain('emerald')
    })

    it('returns status badge config for each status', () => {
      expect(getStatusBadgeConfig('antrian').label).toBe('Dalam Antrian')
      expect(getStatusBadgeConfig('dikerjakan').label).toBe('Sedang Dikerjakan')
      expect(getStatusBadgeConfig('selesai').label).toBe('Selesai Pengerjaan')
      expect(getStatusBadgeConfig('dijemput').label).toBe('Sudah Dijemput')
      expect(getStatusBadgeConfig('dibatalkan').label).toBe('Dibatalkan')
    })

    it('returns safe fallback badge config for unknown or undefined values', () => {
      const unknownStep = getStepBadgeConfig(undefined as unknown as GroomingStep)
      expect(unknownStep).toBeDefined()
      expect(unknownStep.label).toBe('Unknown')

      const unknownStatus = getStatusBadgeConfig('unknown' as unknown as GroomingStatus)
      expect(unknownStatus).toBeDefined()
      expect(unknownStatus.label).toBe('Unknown')
    })
  })

  describe('openWhatsApp', () => {
    it('formats 08 phone number to 62 country code and opens window', () => {
      const windowOpenMock = vi.fn()
      vi.stubGlobal('window', {
        location: { origin: 'https://app.drmeow.com' },
        open: windowOpenMock,
      })

      openWhatsApp('0812-3456-7890', 'Halo Dr. Meow')

      expect(windowOpenMock).toHaveBeenCalledWith(
        'https://wa.me/6281234567890?text=Halo%20Dr.%20Meow',
        '_blank',
        'noopener,noreferrer'
      )
    })

    it('ignores empty phone number safely', () => {
      const windowOpenMock = vi.fn()
      vi.stubGlobal('window', {
        location: { origin: 'https://app.drmeow.com' },
        open: windowOpenMock,
      })

      openWhatsApp('', 'Halo')
      expect(windowOpenMock).not.toHaveBeenCalled()
    })

    it('ignores invalid short phone numbers (< 8 digits)', () => {
      const windowOpenMock = vi.fn()
      vi.stubGlobal('window', {
        location: { origin: 'https://app.drmeow.com' },
        open: windowOpenMock,
      })

      openWhatsApp('12345', 'Halo')
      expect(windowOpenMock).not.toHaveBeenCalled()
    })
  })
})
