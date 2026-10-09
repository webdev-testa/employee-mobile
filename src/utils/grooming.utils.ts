import type { GroomingSession, GroomingStep, GroomingStatus } from '@/types/pos.types'
import {
  GROOMING_STEPS,
  GROOMING_STEP_LABELS,
  GROOMING_STEP_EMOJI,
  GROOMING_STATUS_LABELS,
} from '@/constants/grooming.constants'
import { formatRupiah } from '@/utils/pos.utils'

/**
 * Generates the full public report URL for a given session public_token.
 */
export const getGroomingReportUrl = (publicToken: string): string => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/grooming/report/${publicToken}`
  }
  return `/grooming/report/${publicToken}`
}

/**
 * 1-Click WhatsApp Template: Check-in Grooming Baru
 */
export const generateGroomingCheckinWa = (
  session: GroomingSession,
  reportUrl: string,
  namaUsaha: string = 'Dr. Meow Cat Grooming'
): string => {
  const estimasi = session.estimasi_selesai
    ? new Date(session.estimasi_selesai).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB'
    : 'Menyesuaikan antrian'

  return `Halo Kak ${session.owner?.nama || 'Owner'}! 👋🐾

Terima kasih sudah mempercayakan *${session.cat?.nama || 'kucing kesayangan'}* untuk grooming di *${namaUsaha}* ✨

📋 *DETAIL CHECK-IN GROOMING*
⸻
🐱 Nama Kucing : ${session.cat?.nama || '-'} (${session.cat?.ras || 'Kucing'})
📦 Paket       : ${session.paket}
💰 Total Biaya : Rp ${formatRupiah(session.harga)}
👨‍🔧 Groomer     : ${session.groomer_name || 'Tim Groomer'}
⏰ Est. Selesai: ${estimasi}
${session.kondisi_awal ? `📝 Kondisi Awal: ${session.kondisi_awal}\n` : ''}⸻

🌟 *Pantau Live Progress & Foto Grooming di sini:*
👉 ${reportUrl}

_(Link di atas terupdate secara live setiap kali groomer selesai satu tahap! Tanpa perlu reload)_

Jika ada pertanyaan, Kakak bisa langsung balas pesan ini ya. Salam hangat dari tim *${namaUsaha}*! 🐾`
}

/**
 * 1-Click WhatsApp Template: Grooming Selesai & Siap Dijemput
 */
export const generateGroomingDoneWa = (
  session: GroomingSession,
  reportUrl: string,
  namaUsaha: string = 'Dr. Meow Cat Grooming'
): string => {
  return `🎉 *GROOMING SELESAI & SIAP DIJEMPUT!* 🎉

Halo Kak ${session.owner?.nama || 'Owner'}! 👋
Kabar gembira, *${session.cat?.nama || 'si manis'}* sudah selesai grooming di *${namaUsaha}*! ✨🐱

Bulu sudah wangi, bersih, dan rapi dipeluk 🥰

📸 *Lihat Foto Hasil Grooming & Struk:*
👉 ${reportUrl}

Mohon dapat dijemput sebelum jam operasional salon berakhir ya Kak.
Ditunggu kedatangannya! Terima kasih banyak 🐾💛`
}

/**
 * 1-Click WhatsApp Template: Update Milestone Progress
 */
export const generateGroomingProgressWa = (
  session: GroomingSession,
  step: GroomingStep,
  reportUrl: string,
  namaUsaha: string = 'Dr. Meow'
): string => {
  const emoji = GROOMING_STEP_EMOJI[step] || '🐾'
  const label = GROOMING_STEP_LABELS[step] || step

  return `${emoji} *UPDATE GROOMING ${session.cat?.nama?.toUpperCase() || 'KUCING'}*

Halo Kak ${session.owner?.nama || 'Owner'}, saat ini *${session.cat?.nama || 'kucing Anda'}* sedang dalam proses:
👉 *${label}*

Pantau foto & live report terbaru di sini:
🔗 ${reportUrl}

-${namaUsaha}-`
}

/**
 * Helper to determine the next step in the grooming process.
 */
export const getNextGroomingStep = (currentStep: GroomingStep): GroomingStep | null => {
  const idx = GROOMING_STEPS.indexOf(currentStep)
  if (idx === -1 || idx === GROOMING_STEPS.length - 1) return null
  return GROOMING_STEPS[idx + 1]
}

/**
 * Calculates progress percentage based on current step.
 */
export const getGroomingProgressPercent = (step: GroomingStep): number => {
  switch (step) {
    case 'check_in':
      return 15
    case 'bathing':
      return 35
    case 'drying':
      return 60
    case 'styling':
      return 80
    case 'finishing':
      return 95
    case 'done':
      return 100
    default:
      return 0
  }
}

/**
 * Checks if a step has already been completed relative to the current step.
 */
export const isStepCompleted = (targetStep: GroomingStep, currentStep: GroomingStep): boolean => {
  const targetIdx = GROOMING_STEPS.indexOf(targetStep)
  const currentIdx = GROOMING_STEPS.indexOf(currentStep)
  if (targetIdx === -1 || currentIdx === -1) return false
  return targetIdx <= currentIdx
}

/**
 * Get step badge color scheme and icon indicator
 */
export const getStepBadgeConfig = (step: GroomingStep) => {
  switch (step) {
    case 'check_in':
      return {
        label: GROOMING_STEP_LABELS.check_in,
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
        dot: 'bg-blue-500',
      }
    case 'bathing':
      return {
        label: GROOMING_STEP_LABELS.bathing,
        color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900',
        dot: 'bg-cyan-500',
      }
    case 'drying':
      return {
        label: GROOMING_STEP_LABELS.drying,
        color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
        dot: 'bg-amber-500',
      }
    case 'styling':
      return {
        label: GROOMING_STEP_LABELS.styling,
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
        dot: 'bg-purple-500',
      }
    case 'finishing':
      return {
        label: GROOMING_STEP_LABELS.finishing,
        color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-900',
        dot: 'bg-pink-500',
      }
    case 'done':
      return {
        label: GROOMING_STEP_LABELS.done,
        color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
        dot: 'bg-emerald-500',
      }
    default:
      return {
        label: (step && GROOMING_STEP_LABELS[step]) || 'Unknown',
        color: 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800',
        dot: 'bg-neutral-500',
      }
  }
}

/**
 * Get status badge color
 */
export const getStatusBadgeConfig = (status: GroomingStatus) => {
  switch (status) {
    case 'antrian':
      return {
        label: GROOMING_STATUS_LABELS.antrian,
        color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800',
      }
    case 'dikerjakan':
      return {
        label: GROOMING_STATUS_LABELS.dikerjakan,
        color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 animate-pulse',
      }
    case 'selesai':
      return {
        label: GROOMING_STATUS_LABELS.selesai,
        color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800',
      }
    case 'dijemput':
      return {
        label: GROOMING_STATUS_LABELS.dijemput,
        color: 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-800',
      }
    case 'dibatalkan':
      return {
        label: GROOMING_STATUS_LABELS.dibatalkan,
        color: 'bg-destructive/15 text-destructive border-destructive/30',
      }
    default:
      return {
        label: (status && GROOMING_STATUS_LABELS[status]) || 'Unknown',
        color: 'bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-800',
      }
  }
}

/**
 * Helper to open WhatsApp directly using wa.me link with secure opener attributes
 */
export const openWhatsApp = (phone: string, text: string) => {
  if (!phone) {
    console.warn('Nomor WhatsApp tidak disediakan.')
    return
  }
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length < 8) {
    console.warn('Nomor WhatsApp tidak valid (terlalu pendek):', phone)
    return
  }
  const formattedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone
  const encodedText = encodeURIComponent(text)
  const url = `https://wa.me/${formattedPhone}?text=${encodedText}`
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
