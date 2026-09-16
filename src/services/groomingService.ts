import { supabase } from '@/lib/supabase'
import { supabasePos } from '@/lib/supabasePos'
import { offlineQueue } from '@/lib/offlineQueue'
import type {
  GroomingSession,
  GroomingProgress,
  GroomingStep,
  GroomingStatus,
  PaketGrooming,
} from '@/types/pos.types'
import {
  DEFAULT_PAKET_GROOMING,
  DEMO_GROOMING_SESSIONS,
} from '@/constants/grooming.constants'

const posDb = () => supabasePos

const STORAGE_KEY_SESSIONS = 'dr_meow_grooming_sessions_cache'
const STORAGE_KEY_PACKAGES = 'dr_meow_grooming_packages_cache'

const getCachedSessions = (): GroomingSession[] => {
  if (typeof window === 'undefined') return DEMO_GROOMING_SESSIONS
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(DEMO_GROOMING_SESSIONS))
      return DEMO_GROOMING_SESSIONS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEMO_GROOMING_SESSIONS
  } catch {
    return DEMO_GROOMING_SESSIONS
  }
}

const saveCachedSessions = (sessions: GroomingSession[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions))
  } catch (e) {
    console.error('Failed to cache grooming sessions:', e)
  }
}

const getCachedPackages = (): PaketGrooming[] => {
  if (typeof window === 'undefined') return DEFAULT_PAKET_GROOMING
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PACKAGES)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(DEFAULT_PAKET_GROOMING))
      return DEFAULT_PAKET_GROOMING
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : DEFAULT_PAKET_GROOMING
  } catch {
    return DEFAULT_PAKET_GROOMING
  }
}

const saveCachedPackages = (pkgs: PaketGrooming[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_PACKAGES, JSON.stringify(pkgs))
  } catch (e) {
    console.error('Failed to cache grooming packages:', e)
  }
}

export const groomingService = {
  /**
   * Fetch list of grooming sessions with optional date/status filter.
   */
  async fetchSessions(filter?: { date?: string; status?: string }): Promise<GroomingSession[]> {
    try {
      let query = posDb()
        .from('grooming_sessions')
        .select(`
          *,
          owner:owners(*),
          cat:cats(*),
          progress:grooming_progress(*)
        `)
        .order('created_at', { ascending: false })

      if (filter?.date) query = query.eq('tanggal', filter.date)
      if (filter?.status && filter.status !== 'all') query = query.eq('status', filter.status)

      const { data, error } = await query

      if (error) {
        console.warn('Supabase grooming_sessions error, using local state:', error.message)
        let local = getCachedSessions()
        if (filter?.status && filter.status !== 'all') {
          local = local.filter(s => s.status === filter.status)
        }
        return local
      }

      const formatted: GroomingSession[] = ((data as unknown as GroomingSession[]) || []).map(s => ({
        ...s,
        harga: Number(s.harga || 0),
        progress: (s.progress || []).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }))

      if (!filter?.status || filter.status === 'all') {
        saveCachedSessions(formatted)
      } else {
        // Merge into existing cache to avoid wiping out other statuses
        const currentCache = getCachedSessions()
        const mergedMap = new Map<string, GroomingSession>()
        currentCache.forEach(s => mergedMap.set(s.id, s))
        formatted.forEach(s => mergedMap.set(s.id, s))
        saveCachedSessions(Array.from(mergedMap.values()))
      }

      return formatted
    } catch (err) {
      console.warn('fetchSessions fallback triggered:', err)
      let local = getCachedSessions()
      if (filter?.status && filter.status !== 'all') {
        local = local.filter(s => s.status === filter.status)
      }
      return local
    }
  },

  /**
   * Fetch single session by ID
   */
  async fetchSessionById(id: string): Promise<GroomingSession | null> {
    try {
      const { data, error } = await posDb()
        .from('grooming_sessions')
        .select(`
          *,
          owner:owners(*),
          cat:cats(*),
          progress:grooming_progress(*)
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        const cached = getCachedSessions().find(s => s.id === id)
        return cached || null
      }

      const sessionData = data as unknown as GroomingSession
      return {
        ...sessionData,
        harga: Number(sessionData.harga || 0),
        progress: (sessionData.progress || []).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
      }
    } catch {
      const cached = getCachedSessions().find(s => s.id === id)
      return cached || null
    }
  },

  /**
   * Create a new grooming session at check-in
   */
  async createSession(payload: {
    owner_id: string
    cat_id: string
    paket: string
    harga: number
    kondisi_awal?: string
    catatan?: string
    groomer_user_id?: string
    groomer_name?: string
    estimasi_selesai?: string
    sudah_bayar?: boolean
    metode_bayar?: string
  }): Promise<GroomingSession> {
    const randomHex = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
    const publicToken = `grm-${randomHex}`
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data, error } = await posDb()
        .from('grooming_sessions')
        .insert({
          owner_id: payload.owner_id,
          cat_id: payload.cat_id,
          paket: payload.paket,
          harga: payload.harga,
          kondisi_awal: payload.kondisi_awal || null,
          catatan: payload.catatan || null,
          tanggal: today,
          waktu_masuk: new Date().toISOString(),
          estimasi_selesai: payload.estimasi_selesai || null,
          status: 'antrian',
          current_step: 'check_in',
          public_token: publicToken,
          sudah_bayar: payload.sudah_bayar ?? false,
          metode_bayar: payload.metode_bayar || null,
          groomer_user_id: payload.groomer_user_id || null,
          groomer_name: payload.groomer_name || null,
        })
        .select(`
          *,
          owner:owners(*),
          cat:cats(*)
        `)
        .single()

      if (!error && data) {
        await posDb().from('grooming_progress').insert({
          session_id: data.id,
          step: 'check_in',
          catatan: payload.kondisi_awal
            ? `Check-in grooming. Kondisi awal: ${payload.kondisi_awal}`
            : 'Check-in grooming.',
        })

        const full = await this.fetchSessionById(data.id)
        if (full) return full
      }
    } catch (err) {
      console.warn('Database write failed, storing session in local cache:', err)
    }

    // Local fallback creation
    const fallbackSessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0')
    const fallbackProgId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + (Date.now() + 1).toString(16).padStart(12, '0')

    const newSession: GroomingSession = {
      id: fallbackSessionId,
      owner_id: payload.owner_id,
      cat_id: payload.cat_id,
      paket: payload.paket,
      harga: payload.harga,
      kondisi_awal: payload.kondisi_awal,
      catatan: payload.catatan,
      tanggal: today,
      waktu_masuk: new Date().toISOString(),
      estimasi_selesai: payload.estimasi_selesai,
      status: 'antrian',
      current_step: 'check_in',
      public_token: publicToken,
      sudah_bayar: payload.sudah_bayar ?? false,
      metode_bayar: payload.metode_bayar,
      groomer_user_id: payload.groomer_user_id,
      groomer_name: payload.groomer_name,
      created_at: new Date().toISOString(),
      progress: [
        {
          id: fallbackProgId,
          session_id: fallbackSessionId,
          step: 'check_in',
          catatan: payload.kondisi_awal
            ? `Check-in grooming. Kondisi awal: ${payload.kondisi_awal}`
            : 'Check-in grooming.',
          created_at: new Date().toISOString(),
        },
      ],
    }

    const current = getCachedSessions()
    saveCachedSessions([newSession, ...current])
    offlineQueue.enqueue('grooming_create_session', { ...newSession })
    return newSession
  },

  /**
   * Advance grooming step & status
   */
  async updateStep(
    sessionId: string,
    step: GroomingStep,
    extra?: {
      status?: GroomingStatus
      catatan?: string
      foto_url?: string
    }
  ): Promise<void> {
    const currentSession = await this.fetchSessionById(sessionId)
    if (currentSession) {
      if (currentSession.status === 'dijemput' || currentSession.status === 'dibatalkan') {
        throw new Error(`Sesi grooming sudah dalam status '${currentSession.status}' dan tidak dapat diubah lagi.`)
      }
      if (currentSession.status === 'selesai' && step !== 'done') {
        throw new Error("Sesi grooming sudah selesai dan tidak dapat diubah kembali ke pengerjaan.")
      }
    }

    const isDone = step === 'done'
    const newStatus: GroomingStatus = extra?.status
      ? extra.status
      : isDone
      ? 'selesai'
      : step === 'check_in'
      ? 'antrian'
      : 'dikerjakan'

    const updatePayload: Record<string, unknown> = {
      current_step: step,
      status: newStatus,
    }

    if (isDone) {
      updatePayload.waktu_selesai = new Date().toISOString()
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Device is offline')
      }

      const { error: sessionErr } = await posDb()
        .from('grooming_sessions')
        .update(updatePayload)
        .eq('id', sessionId)
      if (sessionErr) throw new Error(sessionErr.message)

      const { data: existingProgress } = await posDb()
        .from('grooming_progress')
        .select('id')
        .eq('session_id', sessionId)
        .eq('step', step)
        .maybeSingle()

      if (!existingProgress) {
        const { error: progInsErr } = await posDb().from('grooming_progress').insert({
          session_id: sessionId,
          step,
          catatan: extra?.catatan || null,
          foto_url: extra?.foto_url || null,
        })
        if (progInsErr) throw new Error(progInsErr.message)
      } else if (extra?.foto_url || extra?.catatan) {
        const updateData: Record<string, unknown> = {}
        if (extra.foto_url) updateData.foto_url = extra.foto_url
        if (extra.catatan) updateData.catatan = extra.catatan
        const { error: progUpErr } = await posDb()
          .from('grooming_progress')
          .update(updateData)
          .eq('id', existingProgress.id)
        if (progUpErr) throw new Error(progUpErr.message)
      }
    } catch (e) {
      console.warn('Update step db error, queueing offline mutation:', e)
      offlineQueue.enqueue('grooming_step_update', {
        sessionId,
        step,
        status: newStatus,
        catatan: extra?.catatan,
        foto_url: extra?.foto_url,
        completedAt: isDone ? updatePayload.waktu_selesai : undefined,
      })
    }

    const sessions = getCachedSessions().map(s => {
      if (s.id === sessionId) {
        const existingIdx = (s.progress || []).findIndex(p => p.step === step)
        const updatedProgress: GroomingProgress[] = [...(s.progress || [])]
        if (existingIdx >= 0) {
          if (extra?.foto_url || extra?.catatan) {
            updatedProgress[existingIdx] = {
              ...updatedProgress[existingIdx],
              ...(extra.foto_url ? { foto_url: extra.foto_url } : {}),
              ...(extra.catatan ? { catatan: extra.catatan } : {}),
            }
          }
        } else {
          const newProgId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0')
          updatedProgress.push({
            id: newProgId,
            session_id: sessionId,
            step,
            catatan: extra?.catatan,
            foto_url: extra?.foto_url,
            created_at: new Date().toISOString(),
          })
        }
        return {
          ...s,
          current_step: step,
          status: newStatus,
          waktu_selesai: isDone ? new Date().toISOString() : s.waktu_selesai,
          progress: updatedProgress,
        }
      }
      return s
    })
    saveCachedSessions(sessions)
  },

  /**
   * Toggle Sudah Bayar status
   */
  async toggleSudahBayar(sessionId: string, sudahBayar: boolean): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Device is offline')
      }
      const { error } = await posDb()
        .from('grooming_sessions')
        .update({ sudah_bayar: sudahBayar })
        .eq('id', sessionId)
      if (error) throw error
    } catch (e) {
      console.warn('toggleSudahBayar DB error, queueing offline mutation:', e)
      offlineQueue.enqueue('toggle_sudah_bayar', {
        table: 'grooming_sessions',
        id: sessionId,
        sudah_bayar: sudahBayar,
      })
    }

    const sessions = getCachedSessions().map(s =>
      s.id === sessionId ? { ...s, sudah_bayar: sudahBayar } : s
    )
    saveCachedSessions(sessions)
  },

  /**
   * Mark pet as picked up by owner
   */
  async markPickedUp(sessionId: string): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Device is offline')
      }
      const { error } = await posDb()
        .from('grooming_sessions')
        .update({ status: 'dijemput' })
        .eq('id', sessionId)
      if (error) throw error
    } catch (e) {
      console.warn('DB error, queueing offline mutation:', e)
      offlineQueue.enqueue('grooming_step_update', {
        sessionId,
        step: 'done',
        status: 'dijemput',
      })
    }

    const sessions = getCachedSessions().map(s =>
      s.id === sessionId ? { ...s, status: 'dijemput' as GroomingStatus } : s
    )
    saveCachedSessions(sessions)
  },

  /**
   * Upload grooming photo to Supabase Storage 'cat-photos' in 'grooming/{sessionId}/' folder.
   */
  async uploadGroomingPhoto(
    file: File | Blob,
    sessionId: string,
    step: GroomingStep
  ): Promise<string> {
    const ALLOWED_MIME_TYPES: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }

    const mime = (file.type || '').toLowerCase()
    const safeExt = ALLOWED_MIME_TYPES[mime]
    if (!safeExt) {
      throw new Error('Format file tidak didukung. Harap unggah foto format JPEG, PNG, atau WebP.')
    }
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_')
    const safeStep = step.replace(/[^a-zA-Z0-9_-]/g, '_')
    const filePath = `grooming/${safeSessionId}/${safeStep}-${Date.now()}.${safeExt}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('cat-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (!uploadError) {
        const { data } = supabase.storage.from('cat-photos').getPublicUrl(filePath)
        if (data?.publicUrl) return data.publicUrl
      }
    } catch (e) {
      console.warn('Storage upload error, using local FileReader URL:', e)
    }

    if (typeof FileReader === 'undefined') {
      return 'https://mock.storage.local/' + filePath
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Gagal membaca data gambar dari perangkat'))
      reader.onabort = () => reject(new Error('Pembacaan gambar dibatalkan'))
      reader.readAsDataURL(file)
    })
  },

  /**
   * Fetch grooming packages
   */
  async fetchPaketGrooming(): Promise<PaketGrooming[]> {
    try {
      const { data, error } = await posDb()
        .from('paket_grooming')
        .select('*')
        .eq('aktif', true)
        .order('harga', { ascending: true })

      if (!error && data && data.length > 0) {
        const rawList = data as unknown as PaketGrooming[]
        const formatted = rawList.map(p => ({
          ...p,
          harga: Number(p.harga || 0),
        }))
        saveCachedPackages(formatted)
        return formatted
      }
    } catch {
      // Fallback
    }

    return getCachedPackages()
  },
}
