import type { Booking, DailyReport, BillingCalculation } from '@/types/pos.types'
import {
  NAFSU_MAKAN_OPTIONS,
  MINUM_OPTIONS,
  FESES_OPTIONS,
  URINASI_OPTIONS,
} from '@/constants/pos.constants'

// Format date to Indonesian: "27 Maret 2026"
export const formatTanggal = (dateStr: string): string => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
}

// Format date to short Indonesian: "27 Mar 2026"
export const formatTanggalPendek = (dateStr: string): string => {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
  } catch {
    return dateStr
  }
}

// Format number to Rupiah: "50.000"
export const formatRupiah = (amount: number): string => {
  return new Intl.NumberFormat('id-ID').format(amount || 0)
}

// Calculate nights between two dates (min 1 night)
export const hitungMalam = (masuk: string, keluar: string): number => {
  if (!masuk || !keluar) return 1
  const t1 = new Date(masuk).getTime()
  const t2 = new Date(keluar).getTime()
  const diffDays = Math.ceil((t2 - t1) / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 1
}

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Continue to textarea fallback
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    const successful = typeof document.execCommand === 'function' ? document.execCommand('copy') : false
    if (textarea.parentNode) {
      document.body.removeChild(textarea)
    }
    return successful
  } catch {
    return false
  }
}

// Calculate billing breakdown
export const calculateBilling = (
  booking: Booking,
  checkoutDateStr?: string,
  extraCharges: { jumlah: number; keterangan?: string }[] = []
): BillingCalculation => {
  const checkoutDate = checkoutDateStr || booking.tanggal_keluar_aktual || booking.tanggal_keluar_estimasi || new Date().toISOString().split('T')[0]
  const checkinDate = booking.tanggal_masuk || new Date().toISOString().split('T')[0]

  const jumlah_malam = hitungMalam(checkinDate, checkoutDate)
  const subtotal = jumlah_malam * (booking.harga_per_hari || 0)

  const existingDp = booking.transactions
    ?.filter(t => t.tipe === 'dp')
    .reduce((sum, t) => sum + Number(t.jumlah || 0), 0) ?? 0

  const existingBiayaTambahan = booking.transactions
    ?.filter(t => t.tipe === 'biaya_tambahan')
    .reduce((sum, t) => sum + Number(t.jumlah || 0), 0) ?? 0

  const newBiayaTambahan = extraCharges.reduce((sum, t) => sum + Number(t.jumlah || 0), 0)
  const total_biaya_tambahan = existingBiayaTambahan + newBiayaTambahan

  const total = subtotal + total_biaya_tambahan
  const total_dp = existingDp
  const sisa_bayar = Math.max(0, total - total_dp)

  return {
    jumlah_malam,
    subtotal,
    total_dp,
    total_biaya_tambahan,
    total,
    sisa_bayar,
  }
}

// WhatsApp Template: Check-in
export const generateCheckinTemplate = (
  booking: Booking,
  dp: number,
  namaUsaha: string = 'Dr. Meow Hotel Kucing'
): string => {
  const estimasiMalam = hitungMalam(
    booking.tanggal_masuk,
    booking.tanggal_keluar_estimasi
  )
  const total = estimasiMalam * booking.harga_per_hari
  const sisa = Math.max(0, total - dp)

  return `Halo ${booking.owner?.nama || 'Kak'}! 👋

Terima kasih sudah menitipkan ${booking.cat?.nama || 'kucing kesayangan'} di ${namaUsaha} 🐱

Berikut detail penitipan:
📅 Check-in  : ${formatTanggal(booking.tanggal_masuk)}
📅 Check-out : ${formatTanggal(booking.tanggal_keluar_estimasi)}
📦 Paket     : ${booking.paket} (Rp ${formatRupiah(booking.harga_per_hari)}/malam)
💰 Total Est.: Rp ${formatRupiah(total)} (${estimasiMalam} malam)
💳 DP Dibayar: Rp ${formatRupiah(dp)}
💳 Sisa      : Rp ${formatRupiah(sisa)}

${booking.cat?.nama || 'Kucing Kakak'} akan mendapatkan daily report setiap hari ya!
Jika ada pertanyaan, langsung balas pesan ini 😊`
}

// WhatsApp Template: Daily Report
const CHECKBOX = { checked: '✅', unchecked: '☐' }
const check = (value: string, option: string) =>
  value === option ? CHECKBOX.checked : CHECKBOX.unchecked

export const generateDailyReportTemplate = (
  booking: Booking,
  report: DailyReport
): string => {
  const tanggal = formatTanggal(report.tanggal)

  const nafsuMakanLines = NAFSU_MAKAN_OPTIONS.map(
    opt => `${check(report.nafsu_makan, opt)} ${opt}`
  ).join('\n')

  const minumLines = MINUM_OPTIONS.map(
    opt => `${check(report.minum, opt)} ${opt}`
  ).join('\n')

  const fesesLines = FESES_OPTIONS.map(
    opt => `${check(report.feses, opt)} ${opt}`
  ).join('\n')

  const urinasiLines = URINASI_OPTIONS.map(
    opt => `${check(report.urinasi, opt)} ${opt}`
  ).join('\n')

  return `📋 DAILY REPORT ${booking.cat?.nama?.toUpperCase() || 'KUCING'}
🗓️ Tanggal: ${tanggal}
⸻
🍽️ Nafsu Makan
${nafsuMakanLines}
⸻
💧 Minum
${minumLines}
⸻
💩 Feses (BAB)
${fesesLines}
⸻
🚽 Urinasi (BAK)
${urinasiLines}
⸻
📝 Kondisi Umum:
${report.kondisi_umum || '-'}

${report.keterangan ? `📌 Keterangan Tambahan:\n${report.keterangan}` : ''}`
}

// WhatsApp Template: Check-out
export const generateCheckoutTemplate = (
  booking: Booking,
  billing: BillingCalculation,
  namaUsaha: string = 'Dr. Meow Hotel Kucing'
): string => {
  const tanggalKeluar =
    booking.tanggal_keluar_aktual ||
    booking.tanggal_keluar_estimasi ||
    new Date().toISOString().split('T')[0]

  return `Halo ${booking.owner?.nama || 'Kak'}! 👋

${booking.cat?.nama || 'Kucing kesayangan'} sudah siap untuk dijemput hari ini 🐱

📋 STRUK CHECKOUT
⸻
Nama Kucing  : ${booking.cat?.nama || '-'}
Check-in     : ${formatTanggal(booking.tanggal_masuk)}
Check-out    : ${formatTanggal(tanggalKeluar)}
Lama Menginap: ${billing.jumlah_malam} malam
⸻
Paket        : ${booking.paket}
Harga/malam  : Rp ${formatRupiah(booking.harga_per_hari)}
Subtotal     : Rp ${formatRupiah(billing.subtotal)}
Biaya Tambahan: Rp ${formatRupiah(billing.total_biaya_tambahan)}
Total        : Rp ${formatRupiah(billing.total)}
⸻
DP Dibayar   : Rp ${formatRupiah(billing.total_dp)}
Sisa Bayar   : Rp ${formatRupiah(billing.sisa_bayar)}
⸻
Terima kasih sudah menitipkan ${booking.cat?.nama || 'kucing'} di ${namaUsaha}!
Sampai jumpa lagi 🐾`
}
