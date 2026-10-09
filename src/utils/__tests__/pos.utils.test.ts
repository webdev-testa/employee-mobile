import { describe, it, expect } from 'vitest'
import {
  formatTanggal,
  formatTanggalPendek,
  formatRupiah,
  hitungMalam,
  hitungHariMenginap,
  getTodayLocalDate,
  calculateBilling,
  generateCheckinTemplate,
  generateDailyReportTemplate,
  generateCheckoutTemplate,
} from '../pos.utils'
import type { Booking, DailyReport } from '@/types/pos.types'

describe('pos.utils unit tests', () => {
  describe('formatTanggal & formatTanggalPendek', () => {
    it('formats date to Indonesian full date correctly', () => {
      const result = formatTanggal('2026-03-27')
      expect(result).toBe('27 Maret 2026')
    })

    it('formats date to Indonesian short date correctly', () => {
      const result = formatTanggalPendek('2026-03-27')
      expect(result).toBe('27 Mar 2026')
    })

    it('handles empty or invalid date gracefully', () => {
      expect(formatTanggal('')).toBe('-')
      expect(formatTanggalPendek('')).toBe('-')
    })
  })

  describe('formatRupiah', () => {
    it('formats numbers to Indonesian locale with thousand separators', () => {
      expect(formatRupiah(50000)).toBe('50.000')
      expect(formatRupiah(1500000)).toBe('1.500.000')
      expect(formatRupiah(0)).toBe('0')
    })
  })

  describe('hitungMalam', () => {
    it('calculates duration in nights correctly', () => {
      expect(hitungMalam('2026-03-20', '2026-03-23')).toBe(3)
      expect(hitungMalam('2026-03-20', '2026-03-21')).toBe(1)
    })

    it('clamps to minimum 1 night if same date or inverted date is passed', () => {
      expect(hitungMalam('2026-03-20', '2026-03-20')).toBe(1)
      expect(hitungMalam('2026-03-25', '2026-03-20')).toBe(1)
    })

    it('returns 1 if missing input dates', () => {
      expect(hitungMalam('', '')).toBe(1)
    })
  })

  describe('hitungHariMenginap', () => {
    it('accurately computes ordinal stay day (Day 1 on arrival, Day 2 on next day)', () => {
      expect(hitungHariMenginap('2026-03-20', '2026-03-20')).toBe(1)
      expect(hitungHariMenginap('2026-03-20', '2026-03-21')).toBe(2)
      expect(hitungHariMenginap('2026-03-20', '2026-03-23')).toBe(4)
    })

    it('clamps to minimum 1 if dates are inverted or invalid', () => {
      expect(hitungHariMenginap('2026-03-25', '2026-03-20')).toBe(1)
      expect(hitungHariMenginap('', '')).toBe(1)
    })
  })

  describe('getTodayLocalDate', () => {
    it('returns valid YYYY-MM-DD format string', () => {
      const todayStr = getTodayLocalDate()
      expect(todayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('calculateBilling', () => {
    const mockBooking: Booking = {
      id: 'book-1',
      cat_id: 'cat-1',
      owner_id: 'own-1',
      tanggal_masuk: '2026-03-20',
      tanggal_keluar_estimasi: '2026-03-23',
      paket: 'Standard Room',
      harga_per_hari: 60000,
      status: 'aktif',
      created_at: '2026-03-20T08:00:00Z',
      transactions: [
        {
          id: 'tx-1',
          booking_id: 'book-1',
          tipe: 'dp',
          jumlah: 50000,
          created_at: '2026-03-20T08:00:00Z',
        },
      ],
    }

    it('computes stay nights, subtotal, DP deduction and remaining correctly', () => {
      const billing = calculateBilling(mockBooking, '2026-03-23')
      expect(billing.jumlah_malam).toBe(3)
      expect(billing.subtotal).toBe(180000) // 3 x 60000
      expect(billing.total_dp).toBe(50000)
      expect(billing.total_biaya_tambahan).toBe(0)
      expect(billing.total).toBe(180000)
      expect(billing.sisa_bayar).toBe(130000) // 180000 - 50000
    })

    it('accurately incorporates extra charges into total and remaining balance', () => {
      const extraCharges = [
        { keterangan: 'Wet Food Kaleng', jumlah: 25000 },
        { keterangan: 'Dry Grooming Express', jumlah: 45000 },
      ]
      const billing = calculateBilling(mockBooking, '2026-03-23', extraCharges)
      expect(billing.total_biaya_tambahan).toBe(70000)
      expect(billing.total).toBe(250000) // 180000 + 70000
      expect(billing.sisa_bayar).toBe(200000) // 250000 - 50000
    })

    it('clamps negative extra charge amounts defensively to 0', () => {
      const invalidExtraCharges = [
        { keterangan: 'Invalid Negative Discount', jumlah: -50000 },
        { keterangan: 'Valid Extra Service', jumlah: 20000 },
      ]
      const billing = calculateBilling(mockBooking, '2026-03-23', invalidExtraCharges)
      expect(billing.total_biaya_tambahan).toBe(20000)
      expect(billing.total).toBe(200000) // 180000 + 20000
    })

    it('clamps sisa_bayar to 0 when DP exceeds total (no negative debt)', () => {
      const overpaidBooking: Booking = {
        ...mockBooking,
        transactions: [
          {
            id: 'tx-big-dp',
            booking_id: 'book-1',
            tipe: 'dp',
            jumlah: 300000,
            created_at: '2026-03-20T08:00:00Z',
          },
        ],
      }
      const billing = calculateBilling(overpaidBooking, '2026-03-23')
      expect(billing.total).toBe(180000)
      expect(billing.total_dp).toBe(300000)
      expect(billing.sisa_bayar).toBe(0)
    })
  })

  describe('WhatsApp Templates', () => {
    const booking: Booking = {
      id: 'book-1',
      cat_id: 'cat-1',
      owner_id: 'own-1',
      tanggal_masuk: '2026-03-20',
      tanggal_keluar_estimasi: '2026-03-22',
      paket: 'VIP Suite',
      harga_per_hari: 100000,
      status: 'aktif',
      created_at: '2026-03-20T08:00:00Z',
      cat: {
        id: 'cat-1',
        owner_id: 'own-1',
        nama: 'Luna',
        ras: 'Persian',
        created_at: '',
      },
      owner: {
        id: 'own-1',
        nama: 'Sarah',
        no_wa: '081234567890',
        created_at: '',
      },
      transactions: [],
    }

    it('generates check-in WhatsApp template with booking details', () => {
      const template = generateCheckinTemplate(booking, 50000, 'Dr. Meow Hotel')
      expect(template).toContain('Sarah')
      expect(template).toContain('Luna')
      expect(template).toContain('VIP Suite')
      expect(template).toContain('50.000')
    })

    it('generates daily health report WhatsApp template with checklist icons', () => {
      const report: DailyReport = {
        id: 'rep-1',
        booking_id: 'book-1',
        cat_id: 'cat-1',
        tanggal: '2026-03-21',
        nafsu_makan: 'Sangat baik (habis semua)',
        minum: 'Normal',
        feses: 'Normal (padat, coklat)',
        urinasi: 'Normal',
        kondisi_umum: 'Sangat aktif bermain bola',
        created_at: '',
      }

      const template = generateDailyReportTemplate(booking, report)
      expect(template).toContain('DAILY REPORT LUNA')
      expect(template).toContain('✅ Sangat baik (habis semua)')
      expect(template).toContain('✅ Normal (padat, coklat)')
      expect(template).toContain('Sangat aktif bermain bola')
    })

    it('generates checkout settlement WhatsApp template with exact billing breakdown', () => {
      const billing = {
        jumlah_malam: 2,
        subtotal: 200000,
        total_dp: 50000,
        total_biaya_tambahan: 30000,
        total: 230000,
        sisa_bayar: 180000,
      }

      const template = generateCheckoutTemplate(booking, billing)
      expect(template).toContain('Luna')
      expect(template).toContain('230.000')
      expect(template).toContain('180.000')
    })
  })
})
