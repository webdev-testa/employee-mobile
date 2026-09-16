import { supabasePos } from '@/lib/supabasePos'

export type MutationType =
  | 'grooming_step_update'
  | 'grooming_create_session'
  | 'hotel_checkin'
  | 'hotel_daily_report'
  | 'hotel_checkout'
  | 'toggle_sudah_bayar'
  | 'pos_upsert_owner'
  | 'pos_create_cat'

export interface QueuedMutation {
  id: string
  type: MutationType
  createdAt: string
  retryCount: number
  lastError?: string
  payload: Record<string, unknown>
}

export interface FlushResult {
  successCount: number
  failCount: number
  errors: string[]
}

const STORAGE_KEY_QUEUE = 'dr_meow_offline_queue'
const STORAGE_KEY_DLQ = 'dr_meow_offline_dlq'
const MAX_RETRIES = 5

let isFlushing = false

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
  if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) return true
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('abort') ||
    msg.includes('connection') ||
    msg.includes('offline') ||
    msg.includes('timeout')
  )
}

function pushToDeadLetterQueue(item: QueuedMutation): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DLQ)
    const dlq: QueuedMutation[] = raw ? JSON.parse(raw) : []
    dlq.push(item)
    localStorage.setItem(STORAGE_KEY_DLQ, JSON.stringify(dlq))
    console.error(`Item ${item.id} (${item.type}) reached max retries and moved to Dead-Letter Queue.`)
  } catch (e) {
    console.error('Failed to write to Dead-Letter Queue:', e)
  }
}

async function uploadBase64ToStorage(base64Data?: string, folder = 'offline'): Promise<string | undefined> {
  if (!base64Data || !base64Data.startsWith('data:')) return base64Data
  try {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return base64Data
    const mime = match[1]
    const b64 = match[2]
    const byteCharacters = atob(b64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mime })

    const ext = mime.split('/')[1] || 'jpg'
    const uniqueToken = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substring(2, 8)
    const fileName = `${folder}/${Date.now()}-${uniqueToken}.${ext}`

    const { error: uploadErr } = await supabasePos.storage
      .from('cat-photos')
      .upload(fileName, blob, { contentType: mime, upsert: true })

    if (uploadErr) {
      console.warn('Failed to upload base64 to Supabase Storage, keeping local data:', uploadErr)
      return base64Data
    }

    const { data } = supabasePos.storage.from('cat-photos').getPublicUrl(fileName)
    return data?.publicUrl || base64Data
  } catch (err) {
    console.warn('uploadBase64ToStorage error:', err)
    return base64Data
  }
}

function notifyQueueChanged(count: number): void {
  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof CustomEvent === 'function'
  ) {
    try {
      window.dispatchEvent(
        new CustomEvent('offline-queue-changed', {
          detail: { count },
        })
      )
    } catch {
      // Graceful fallback for mock environments
    }
  }
}

export const offlineQueue = {
  /**
   * Get all queued mutations safely from localStorage.
   */
  getQueue(): QueuedMutation[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY_QUEUE)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.error('Failed to read offline queue, resetting corrupt data:', e)
      localStorage.removeItem(STORAGE_KEY_QUEUE)
      return []
    }
  },

  /**
   * Save the queue to localStorage safely.
   */
  saveQueue(queue: QueuedMutation[]): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(queue))
    } catch (e) {
      console.error('Failed to save offline queue:', e)
    }
  },

  /**
   * Add a new mutation to the offline queue.
   */
  enqueue(type: MutationType, payload: Record<string, unknown>): QueuedMutation {
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'mut-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)

    const mutation: QueuedMutation = {
      id: uniqueId,
      type,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      payload,
    }

    const currentQueue = this.getQueue()
    const updatedQueue = [...currentQueue, mutation]
    this.saveQueue(updatedQueue)

    notifyQueueChanged(updatedQueue.length)
    return mutation
  },

  /**
   * Remove a mutation by ID.
   */
  remove(id: string): void {
    const currentQueue = this.getQueue()
    const updatedQueue = currentQueue.filter(m => m.id !== id)
    this.saveQueue(updatedQueue)

    notifyQueueChanged(updatedQueue.length)
  },

  /**
   * Clear all pending mutations.
   */
  clearQueue(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY_QUEUE)
    notifyQueueChanged(0)
  },

  /**
   * Get the number of pending unsynced mutations.
   */
  getPendingCount(): number {
    return this.getQueue().length
  },

  /**
   * Process and execute all queued mutations in FIFO order against Supabase.
   */
  async flush(): Promise<FlushResult> {
    if (isFlushing) {
      return { successCount: 0, failCount: 0, errors: ['Flush already in progress'] }
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { successCount: 0, failCount: 0, errors: ['Perangkat sedang offline'] }
    }

    const queue = this.getQueue()
    if (queue.length === 0) {
      return { successCount: 0, failCount: 0, errors: [] }
    }

    isFlushing = true
    let successCount = 0
    let failCount = 0
    const errors: string[] = []

    try {
      for (const item of queue) {
        try {
          await this.executeMutation(item)
          // Success: remove from queue
          this.remove(item.id)
          successCount++
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          console.warn(`Failed to sync queued mutation ${item.id} (${item.type}):`, msg)
          errors.push(msg)
          failCount++

          // Defect 1: If network error, DO NOT increment retryCount and DO NOT drop!
          if (isNetworkError(err)) {
            console.warn(`Network interruption during sync for mutation ${item.id}. Aborting flush without incrementing retries.`)
            break
          }

          // Genuine data/server error: Increment retry count
          const currentQueue = this.getQueue()
          const mutationIdx = currentQueue.findIndex(m => m.id === item.id)
          if (mutationIdx >= 0) {
            currentQueue[mutationIdx].retryCount += 1
            currentQueue[mutationIdx].lastError = msg

            if (currentQueue[mutationIdx].retryCount >= MAX_RETRIES) {
              console.error(
                `Mutation ${item.id} exceeded maximum retries (${MAX_RETRIES}). Moving to Dead-Letter Queue.`
              )
              pushToDeadLetterQueue(currentQueue[mutationIdx])
              currentQueue.splice(mutationIdx, 1)
            }
            this.saveQueue(currentQueue)
          }
        }
      }
    } finally {
      isFlushing = false
      notifyQueueChanged(this.getPendingCount())
    }

    return { successCount, failCount, errors }
  },

  /**
   * Low-level executor for a single mutation.
   */
  async executeMutation(item: QueuedMutation): Promise<void> {
    const { type, payload } = item

    switch (type) {
      case 'pos_upsert_owner': {
        const ownerData = payload as {
          id: string
          nama: string
          no_wa: string
          email?: string
          alamat?: string
        }
        const { error } = await supabasePos
          .from('owners')
          .upsert(
            {
              id: ownerData.id,
              nama: ownerData.nama.trim(),
              no_wa: ownerData.no_wa,
              email: ownerData.email?.trim() || null,
              alamat: ownerData.alamat?.trim() || null,
            },
            { onConflict: 'no_wa' }
          )
        if (error) throw new Error(error.message)
        break
      }

      case 'pos_create_cat': {
        const catData = payload as {
          id: string
          owner_id: string
          nama: string
          ras?: string
          jenis_kelamin?: string
          warna?: string
          umur_estimasi?: string
          catatan_kesehatan?: string
          foto_url?: string
        }
        const safeCatPhoto = catData.foto_url
          ? await uploadBase64ToStorage(catData.foto_url, 'cats')
          : null

        const { error } = await supabasePos
          .from('cats')
          .upsert(
            {
              id: catData.id,
              owner_id: catData.owner_id,
              nama: catData.nama.trim(),
              ras: catData.ras?.trim() || null,
              jenis_kelamin: catData.jenis_kelamin || null,
              warna: catData.warna?.trim() || null,
              umur_estimasi: catData.umur_estimasi?.trim() || null,
              catatan_kesehatan: catData.catatan_kesehatan?.trim() || null,
              foto_url: safeCatPhoto,
            },
            { onConflict: 'id' }
          )
        if (error) throw new Error(error.message)
        break
      }

      case 'grooming_create_session': {
        const sessionData = payload as {
          id: string
          owner_id: string
          cat_id: string
          paket: string
          harga: number
          kondisi_awal?: string
          catatan?: string
          tanggal: string
          waktu_masuk: string
          estimasi_selesai?: string
          status?: string
          current_step?: string
          public_token?: string
          sudah_bayar?: boolean
          metode_bayar?: string
          groomer_user_id?: string
          groomer_name?: string
          progress?: Array<{
            step: string
            catatan?: string
            foto_url?: string
          }>
        }

        const { error: sessionError } = await supabasePos
          .from('grooming_sessions')
          .upsert(
            {
              id: sessionData.id,
              owner_id: sessionData.owner_id,
              cat_id: sessionData.cat_id,
              paket: sessionData.paket,
              harga: sessionData.harga,
              kondisi_awal: sessionData.kondisi_awal || null,
              catatan: sessionData.catatan || null,
              tanggal: sessionData.tanggal,
              waktu_masuk: sessionData.waktu_masuk,
              estimasi_selesai: sessionData.estimasi_selesai || null,
              status: sessionData.status || 'antrian',
              current_step: sessionData.current_step || 'check_in',
              public_token: sessionData.public_token,
              sudah_bayar: sessionData.sudah_bayar ?? false,
              metode_bayar: sessionData.metode_bayar || null,
              groomer_user_id: sessionData.groomer_user_id || null,
              groomer_name: sessionData.groomer_name || null,
            },
            { onConflict: 'id' }
          )

        if (sessionError) throw new Error(sessionError.message)

        if (sessionData.progress && Array.isArray(sessionData.progress)) {
          for (const prog of sessionData.progress) {
            const safePhoto = prog.foto_url
              ? await uploadBase64ToStorage(prog.foto_url, 'grooming')
              : null
            await supabasePos.from('grooming_progress').insert({
              session_id: sessionData.id,
              step: prog.step,
              catatan: prog.catatan || null,
              foto_url: safePhoto,
            })
          }
        }
        break
      }

      case 'hotel_checkin': {
        const bookingData = payload as {
          id: string
          cat_id: string
          owner_id: string
          tanggal_masuk: string
          tanggal_keluar_estimasi?: string
          paket: string
          harga_per_hari: number
          catatan?: string
          status?: string
          dp?: number
          sudah_bayar_dp?: boolean
        }

        const { error: bookingError } = await supabasePos
          .from('bookings')
          .upsert(
            {
              id: bookingData.id,
              cat_id: bookingData.cat_id,
              owner_id: bookingData.owner_id,
              tanggal_masuk: bookingData.tanggal_masuk,
              tanggal_keluar_estimasi: bookingData.tanggal_keluar_estimasi || null,
              paket: bookingData.paket,
              harga_per_hari: bookingData.harga_per_hari,
              catatan: bookingData.catatan || null,
              status: bookingData.status || 'aktif',
            },
            { onConflict: 'id' }
          )

        if (bookingError) throw new Error(bookingError.message)

        const dp = Number(bookingData.dp) || 0
        if (dp > 0 && bookingData.sudah_bayar_dp) {
          // Idempotent DP check
          const { data: existingTx } = await supabasePos
            .from('transactions')
            .select('id')
            .eq('booking_id', bookingData.id)
            .eq('tipe', 'dp')
            .maybeSingle()

          if (!existingTx) {
            await supabasePos.from('transactions').insert({
              booking_id: bookingData.id,
              tipe: 'dp',
              jumlah: dp,
              metode_bayar: 'Tunai',
              keterangan: 'DP Penitipan (Offline Synced)',
            })
          }
        }
        break
      }

      case 'grooming_step_update': {
        const payloadData = payload as {
          sessionId: string
          step: string
          status?: string
          notes?: string
          catatan?: string
          photoUrl?: string
          foto_url?: string
          completedAt?: string
        }
        const sessionId = payloadData.sessionId
        const step = payloadData.step
        const status = payloadData.status || (step === 'done' ? 'selesai' : 'dikerjakan')
        const notes = payloadData.notes ?? payloadData.catatan
        const rawPhotoUrl = payloadData.photoUrl ?? payloadData.foto_url
        const completedAt = payloadData.completedAt

        const safePhotoUrl = rawPhotoUrl
          ? await uploadBase64ToStorage(rawPhotoUrl, 'grooming')
          : undefined

        const updateData: Record<string, unknown> = {
          current_step: step,
          status,
        }
        if (completedAt) updateData.waktu_selesai = completedAt

        const { data: updatedSessions, error: sessionError } = await supabasePos
          .from('grooming_sessions')
          .update(updateData)
          .eq('id', sessionId)
          .select('id')

        if (sessionError) throw new Error(sessionError.message)
        if (!updatedSessions || updatedSessions.length === 0) {
          throw new Error(`Sesi grooming ${sessionId} tidak ditemukan di server`)
        }

        if (safePhotoUrl || notes) {
          const { error: progressError } = await supabasePos.from('grooming_progress').insert({
            session_id: sessionId,
            step,
            catatan: notes || null,
            foto_url: safePhotoUrl || null,
          })
          if (progressError) throw new Error(progressError.message)
        }
        break
      }

      case 'hotel_daily_report': {
        const report = payload as {
          booking_id: string
          cat_id: string
          tanggal: string
          nafsu_makan: string
          minum: string
          feses: string
          urinasi: string
          kondisi_umum?: string
          keterangan?: string
          foto_url?: string
        }

        const safePhotoUrl = report.foto_url
          ? await uploadBase64ToStorage(report.foto_url, 'reports')
          : null

        const { error: reportError } = await supabasePos
          .from('daily_reports')
          .upsert(
            {
              booking_id: report.booking_id,
              cat_id: report.cat_id,
              tanggal: report.tanggal,
              nafsu_makan: report.nafsu_makan,
              minum: report.minum,
              feses: report.feses,
              urinasi: report.urinasi,
              kondisi_umum: report.kondisi_umum || null,
              keterangan: report.keterangan || null,
              foto_url: safePhotoUrl,
            },
            { onConflict: 'booking_id,tanggal' }
          )

        if (reportError) throw new Error(reportError.message)
        break
      }

      case 'hotel_checkout': {
        const { bookingId, checkoutDate, extraCharges, settlementAmount } = payload as {
          bookingId: string
          checkoutDate: string
          extraCharges?: { keterangan: string; jumlah: number }[]
          settlementAmount?: number
        }

        const { data: updatedBookings, error: checkoutError } = await supabasePos
          .from('bookings')
          .update({
            status: 'selesai',
            tanggal_keluar_aktual: checkoutDate,
          })
          .eq('id', bookingId)
          .select('id')

        if (checkoutError) throw new Error(checkoutError.message)
        if (!updatedBookings || updatedBookings.length === 0) {
          throw new Error(`Booking hotel ${bookingId} tidak ditemukan di server`)
        }

        if (extraCharges && extraCharges.length > 0) {
          for (const charge of extraCharges) {
            if (charge.jumlah > 0) {
              const chargeKet = charge.keterangan || 'Biaya Tambahan'
              const { data: existingCharge } = await supabasePos
                .from('transactions')
                .select('id')
                .eq('booking_id', bookingId)
                .eq('tipe', 'biaya_tambahan')
                .eq('keterangan', chargeKet)
                .maybeSingle()

              if (!existingCharge) {
                await supabasePos.from('transactions').insert({
                  booking_id: bookingId,
                  tipe: 'biaya_tambahan',
                  jumlah: charge.jumlah,
                  keterangan: chargeKet,
                })
              }
            }
          }
        }

        if (settlementAmount && settlementAmount > 0) {
          const { data: existingSettle } = await supabasePos
            .from('transactions')
            .select('id')
            .eq('booking_id', bookingId)
            .eq('tipe', 'pelunasan')
            .maybeSingle()

          if (!existingSettle) {
            await supabasePos.from('transactions').insert({
              booking_id: bookingId,
              tipe: 'pelunasan',
              jumlah: settlementAmount,
              metode_bayar: 'Tunai',
              keterangan: 'Pelunasan Check-Out (Offline Synced)',
            })
          }
        }
        break
      }

      case 'toggle_sudah_bayar': {
        const { table, id, sudah_bayar } = payload as {
          table: 'grooming_sessions' | 'bookings'
          id: string
          sudah_bayar: boolean
        }

        const { data: updatedRows, error } = await supabasePos
          .from(table)
          .update({ sudah_bayar })
          .eq('id', id)
          .select('id')

        if (error) throw new Error(error.message)
        if (!updatedRows || updatedRows.length === 0) {
          throw new Error(`Data ${table} dengan id ${id} tidak ditemukan di server`)
        }
        break
      }

      default:
        console.warn(`Unknown mutation type: ${type}`)
        break
    }
  },
}
