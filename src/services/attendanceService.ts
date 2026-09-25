import { supabase } from '@/lib/supabase'
import { acquireLocation } from '@/services/locationService'
import { evaluateLocation, type BranchOffice } from '@/lib/geofence'
import { MAX_SELFIE_BYTES } from '@/services/photoService'
import type { Database } from '@/types/database'

export type AttendanceRecord = Database['hr']['Tables']['attendance']['Row']
interface Payload {
  p_attempt_id: string
  p_action: 'in' | 'out'
  p_lat: number
  p_lng: number
  p_accuracy: number
  p_sampled_at: string
  p_photo_path: string | null
}
const pendingKey = (userId: string) => `attendance_pending_v1_${userId}`

function bounded<T>(promise: PromiseLike<T>, signal: AbortSignal, timeout = 25_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => settle(undefined, new DOMException('Pengiriman dibatalkan; periksa hasil sebelum mengulang.', 'AbortError'))
    const timer = setTimeout(() => settle(undefined, new Error('Koneksi terlalu lama. Periksa koneksi lalu coba lagi.')), timeout)
    const settle = (value?: T, error?: unknown) => {
      clearTimeout(timer); signal.removeEventListener('abort', abort)
      if (error) reject(error); else resolve(value as T)
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
    Promise.resolve(promise).then(value => settle(value), error => settle(undefined, error))
  })
}
const messages: Record<string, string> = {
  ATTENDANCE_UNAUTHORIZED: 'Akun tidak diizinkan. Periksa status akun dan perubahan kata sandi.',
  ATTENDANCE_STALE_LOCATION: 'Lokasi kedaluwarsa. Coba konfirmasi lagi.',
  ATTENDANCE_INVALID_LOCATION: 'Lokasi tidak cukup akurat. Coba lokasi lagi.',
  ATTENDANCE_OUTSIDE_OR_UNCERTAIN: 'Lokasi belum pasti di dalam area cabang. Coba lagi.',
  ATTENDANCE_ALREADY_EXISTS: 'Catatan absen atau cuti sudah ada. Muat ulang halaman.',
  ATTENDANCE_NO_OPEN_RECORD: 'Tidak ada catatan absen masuk yang dapat dipulangkan. Hubungi admin jika ada catatan ganda.',
  ATTENDANCE_INVALID_PHOTO: 'Foto tidak valid. Ambil selfie kembali.',
}

function readPending(userId: string): Payload | null {
  const raw = localStorage.getItem(pendingKey(userId))
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Payload
    if (value && typeof value.p_attempt_id === 'string' && ['in', 'out'].includes(value.p_action)
      && [value.p_lat, value.p_lng, value.p_accuracy].every(Number.isFinite)
      && typeof value.p_sampled_at === 'string') return value
  } catch { /* Corruption must not crash the attendance page. */ }
  localStorage.removeItem(pendingKey(userId))
  return null
}

async function send(userId: string, payload: Payload, signal?: AbortSignal): Promise<AttendanceRecord> {
  // Save BEFORE sending: a replay must carry identical data after a lost response.
  localStorage.setItem(pendingKey(userId), JSON.stringify(payload))
  const controller = new AbortController()
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) controller.abort()
  const deadline = setTimeout(cancel, 25_000)
  try {
    const { data, error } = await supabase.schema('hr').rpc('attendance_submit', payload).abortSignal(controller.signal)
    if (error) {
      if (error.code === 'P0001') {
        localStorage.removeItem(pendingKey(userId))
        throw new Error(messages[error.message] || 'Permintaan absen ditolak. Hubungi admin.')
      }
      throw new Error('Hasil absen belum dapat dipastikan. Tekan Periksa pengiriman untuk mencoba permintaan yang sama.')
    }
    if (!data || typeof data.id !== 'string') throw new Error('Respons absen tidak valid. Periksa pengiriman sebelum mencoba lagi.')
    localStorage.removeItem(pendingKey(userId))
    return data as AttendanceRecord
  } finally {
    clearTimeout(deadline)
    signal?.removeEventListener('abort', cancel)
  }
}

export async function recoverAttendance(userId: string, signal?: AbortSignal) {
  const pending = readPending(userId)
  return pending ? send(userId, pending, signal) : null
}

export function hasPendingAttendance(userId: string) {
  try { return !!readPending(userId) } catch { return true }
}

export async function loadAttendanceForDate(userId: string, date: string, signal: AbortSignal) {
  const { data, error } = await bounded(supabase.schema('hr').from('attendance').select('*')
    .eq('user_id', userId).eq('date', date).abortSignal(signal).maybeSingle(), signal)
  if (error) throw new Error('Riwayat absen belum dapat dimuat. Muat ulang halaman sebelum absen lagi.')
  return data as AttendanceRecord | null
}

export async function submitAttendance(userId: string, action: 'in' | 'out', photo: Blob | null,
  signal: AbortSignal): Promise<AttendanceRecord> {
  if (navigator.onLine === false) throw new Error('Absen memerlukan koneksi internet.')
  const recovered = await recoverAttendance(userId, signal)
  if (recovered) return recovered
  const { data: auth } = await bounded(supabase.auth.getUser(), signal)
  if (auth.user?.id !== userId) throw new Error('Sesi berubah. Silakan masuk kembali.')
  let path: string | null = null
  let sent = false
  try {
    if (action === 'in') {
      if (!photo || photo.type !== 'image/jpeg' || !photo.size || photo.size > MAX_SELFIE_BYTES) throw new Error('Ambil foto JPEG maksimal 5 MB.')
      path = `${userId}/${crypto.randomUUID()}.jpg`
      const { error } = await bounded(supabase.storage.from('attendance-photos').upload(path, photo, { contentType: 'image/jpeg' }), signal)
      if (error) throw new Error('Unggah foto gagal. Periksa koneksi lalu coba lagi.')
    }
    signal.throwIfAborted()
    const { data: branches, error } = await bounded(supabase.schema('hr').from('branches').select('id,name,lat,lng,radius,is_active').eq('is_active', true).abortSignal(signal), signal)
    if (error) throw new Error('Data cabang gagal dimuat. Coba lagi.')
    // Acquire AFTER upload so slow uploads cannot make a fix stale.
    const fix = await acquireLocation(signal)
    const evaluated = evaluateLocation(fix, (branches || []) as BranchOffice[])
    if (!evaluated.accepted) throw new Error(evaluated.message)
    signal.throwIfAborted()
    const payload: Payload = { p_attempt_id: crypto.randomUUID(), p_action: action,
      p_lat: fix.latitude, p_lng: fix.longitude, p_accuracy: fix.accuracy,
      p_sampled_at: new Date(fix.timestamp).toISOString(), p_photo_path: path }
    sent = true
    return await send(userId, payload, signal)
  } finally {
    // Never delete a possibly committed photo. Uncertain attempts remain replayable.
    if (path && !sent) void bounded(supabase.storage.from('attendance-photos').remove([path]), new AbortController().signal, 3000).catch(() => {})
  }
}
