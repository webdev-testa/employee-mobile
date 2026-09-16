import { supabase } from '@/lib/supabase'
import { supabasePos } from '@/lib/supabasePos'
import { DEFAULT_OWNERS } from '@/constants/pos.constants'
import type {
  Owner,
  Cat,
  Booking,
  Transaction,
  DailyReport,
  PaketHarga,
  Pengaturan,
} from '@/types/pos.types'

const posDb = () => supabasePos

const STORAGE_KEY_OWNERS = 'dr_meow_pos_owners_cache'

export const getCachedOwners = (): Owner[] => {
  if (typeof window === 'undefined') return DEFAULT_OWNERS
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OWNERS)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_OWNERS, JSON.stringify(DEFAULT_OWNERS))
      return DEFAULT_OWNERS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_OWNERS
  } catch {
    return DEFAULT_OWNERS
  }
}

export const saveCachedOwners = (owners: Owner[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_OWNERS, JSON.stringify(owners))
  } catch (e) {
    console.error('Failed to cache owners:', e)
  }
}

export interface CreateCheckInPayload {
  owner: {
    id?: string
    nama: string
    no_wa: string
    email?: string
    alamat?: string
  }
  cat: {
    id?: string
    nama: string
    ras?: string
    jenis_kelamin?: 'Jantan' | 'Betina'
    warna?: string
    umur_estimasi?: string
    catatan_kesehatan?: string
    foto_url?: string
  }
  booking: {
    tanggal_masuk: string
    tanggal_keluar_estimasi: string
    paket: string
    harga_per_hari: number
    catatan?: string
    dp?: number
    sudah_bayar_dp?: boolean
  }
}

export interface ExecuteCheckoutPayload {
  bookingId: string
  checkoutDate: string
  extraCharges?: { keterangan: string; jumlah: number }[]
  sudahBayar?: boolean
}

export const posService = {
  /**
   * Fetch all bookings with nested relationships.
   */
  async fetchBookings(): Promise<Booking[]> {
    const today = new Date().toISOString().split('T')[0]
    try {
      const { data, error } = await posDb()
        .from('bookings')
        .select(`
          *,
          cat:cats(*, owner:owners(*)),
          owner:owners(*),
          transactions(*),
          daily_reports(*)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Error fetching POS bookings from DB:', error)
        return []
      }

      const rawBookings = (data as unknown as Booking[]) || []
      return rawBookings.map(b => ({
        ...b,
        harga_per_hari: Number(b.harga_per_hari || 0),
        transactions: (b.transactions || []).map((t: Transaction) => ({
          ...t,
          jumlah: Number(t.jumlah || 0),
          uang_diterima: t.uang_diterima != null ? Number(t.uang_diterima) : undefined,
          kembalian: t.kembalian != null ? Number(t.kembalian) : undefined,
        })),
        sudah_laporan: (b.daily_reports || []).some((r: DailyReport) => r.tanggal === today),
      }))
    } catch (err) {
      console.warn('fetchBookings error:', err)
      return []
    }
  },

  /**
   * Fetch a single booking by ID with full nested details.
   */
  async fetchBookingById(id: string): Promise<Booking | null> {
    const today = new Date().toISOString().split('T')[0]
    try {
      const { data, error } = await posDb()
        .from('bookings')
        .select(`
          *,
          cat:cats(*, owner:owners(*)),
          owner:owners(*),
          transactions(*),
          daily_reports(*)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        console.error('Error fetching booking detail:', error)
        return null
      }

      const bookingData = data as unknown as Booking
      return {
        ...bookingData,
        harga_per_hari: Number(bookingData.harga_per_hari || 0),
        transactions: (bookingData.transactions || []).map((t: Transaction) => ({
          ...t,
          jumlah: Number(t.jumlah || 0),
          uang_diterima: t.uang_diterima != null ? Number(t.uang_diterima) : undefined,
          kembalian: t.kembalian != null ? Number(t.kembalian) : undefined,
        })),
        sudah_laporan: (bookingData.daily_reports || []).some((r: DailyReport) => r.tanggal === today),
      }
    } catch {
      return null
    }
  },

  /**
   * Search owners by name or WA number, including their existing cats.
   */
  async searchOwners(query = ''): Promise<Owner[]> {
    const cleanQuery = query.replace(/[,()"\\]/g, ' ').trim().toLowerCase()
    if (!cleanQuery) {
      return this.fetchOwners()
    }

    try {
      const { data, error } = await posDb()
        .from('owners')
        .select('*, cats(*)')
        .or(`no_wa.ilike.%${cleanQuery}%,nama.ilike.%${cleanQuery}%`)
        .limit(20)

      if (error || !data || data.length === 0) {
        const cached = getCachedOwners()
        return cached.filter(o => 
          o.nama.toLowerCase().includes(cleanQuery) ||
          o.no_wa.toLowerCase().includes(cleanQuery) ||
          (o.cats && o.cats.some(c => c.nama.toLowerCase().includes(cleanQuery)))
        )
      }

      return data
    } catch {
      const cached = getCachedOwners()
      return cached.filter(o => 
        o.nama.toLowerCase().includes(cleanQuery) ||
        o.no_wa.toLowerCase().includes(cleanQuery) ||
        (o.cats && o.cats.some(c => c.nama.toLowerCase().includes(cleanQuery)))
      )
    }
  },

  /**
   * Fetch all/recent owners with their cats.
   */
  async fetchOwners(limit = 50): Promise<Owner[]> {
    try {
      const { data, error } = await posDb()
        .from('owners')
        .select('*, cats(*)')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error || !data || data.length === 0) {
        return getCachedOwners()
      }

      saveCachedOwners(data)
      return data
    } catch {
      return getCachedOwners()
    }
  },

  /**
   * Fetch all cats for a specific owner.
   */
  async fetchCatsByOwner(ownerId: string): Promise<Cat[]> {
    try {
      const { data, error } = await posDb()
        .from('cats')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Error fetching cats for owner from DB:', error)
        const cachedOwner = getCachedOwners().find(o => o.id === ownerId)
        return cachedOwner?.cats || []
      }

      return data || []
    } catch {
      const cachedOwner = getCachedOwners().find(o => o.id === ownerId)
      return cachedOwner?.cats || []
    }
  },

  /**
   * Fetch all pricing packages.
   */
  async fetchPaketHarga(): Promise<PaketHarga[]> {
    try {
      const { data, error } = await posDb()
        .from('paket_harga')
        .select('*')
        .order('harga_per_hari', { ascending: true })

      if (error) {
        return []
      }

      const rawList = (data as unknown as PaketHarga[]) || []
      return rawList.map(p => ({
        ...p,
        harga_per_hari: Number(p.harga_per_hari || 0),
      }))
    } catch {
      return []
    }
  },

  /**
   * Fetch clinic and POS configuration settings.
   */
  async fetchPengaturan(): Promise<Pengaturan> {
    const defaultSettings: Pengaturan = {
      id: 1,
      nama_usaha: 'Dr. Meow Cat Clinic & Hotel',
      no_wa_usaha: '081234567890',
      alamat_usaha: 'Jakarta',
    }

    try {
      const { data, error } = await posDb()
        .from('pengaturan')
        .select('*')
        .eq('id', 1)
        .single()

      if (error || !data) {
        return defaultSettings
      }

      return data
    } catch {
      return defaultSettings
    }
  },

  /**
   * Upsert an owner by WA number, returning the registered/updated owner.
   */
  async upsertOwner(ownerData: {
    nama: string
    no_wa: string
    email?: string
    alamat?: string
  }): Promise<Owner> {
    const cleanPhone = ownerData.no_wa.replace(/\D/g, '')
    const formattedPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone

    try {
      const { data, error } = await posDb()
        .from('owners')
        .upsert(
          {
            nama: ownerData.nama.trim(),
            no_wa: formattedPhone,
            email: ownerData.email?.trim() || null,
            alamat: ownerData.alamat?.trim() || null,
          },
          { onConflict: 'no_wa' }
        )
        .select()
        .single()

      if (!error && data) {
        const cached = getCachedOwners()
        const existingIdx = cached.findIndex(o => o.id === data.id || o.no_wa === formattedPhone)
        if (existingIdx >= 0) {
          cached[existingIdx] = { ...cached[existingIdx], ...data }
          saveCachedOwners(cached)
        } else {
          saveCachedOwners([data, ...cached])
        }
        return data
      }
    } catch (e) {
      console.warn('upsertOwner DB error:', e)
    }

    const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0')
    const localOwner: Owner = {
      id: fallbackId,
      nama: ownerData.nama.trim(),
      no_wa: formattedPhone,
      email: ownerData.email?.trim(),
      alamat: ownerData.alamat?.trim(),
      created_at: new Date().toISOString(),
      cats: [],
    }
    const cached = getCachedOwners()
    saveCachedOwners([localOwner, ...cached])
    return localOwner
  },

  /**
   * Create a new cat for an owner, returning the cat record.
   */
  async createCat(catData: {
    owner_id: string
    nama: string
    ras?: string
    jenis_kelamin?: 'Jantan' | 'Betina'
    warna?: string
    umur_estimasi?: string
    catatan_kesehatan?: string
    foto_url?: string
  }): Promise<Cat> {
    try {
      const { data, error } = await posDb()
        .from('cats')
        .insert({
          owner_id: catData.owner_id,
          nama: catData.nama.trim(),
          ras: catData.ras?.trim() || null,
          jenis_kelamin: catData.jenis_kelamin || null,
          warna: catData.warna?.trim() || null,
          umur_estimasi: catData.umur_estimasi?.trim() || null,
          catatan_kesehatan: catData.catatan_kesehatan?.trim() || null,
          foto_url: catData.foto_url || null,
        })
        .select()
        .single()

      if (!error && data) {
        const cached = getCachedOwners()
        const owner = cached.find(o => o.id === catData.owner_id)
        if (owner) {
          owner.cats = [data, ...(owner.cats || [])]
          saveCachedOwners([...cached])
        }
        return data
      }
    } catch (e) {
      console.warn('createCat DB error:', e)
    }

    const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0')
    const localCat: Cat = {
      id: fallbackId,
      owner_id: catData.owner_id,
      nama: catData.nama.trim(),
      ras: catData.ras?.trim() || 'Domestic',
      jenis_kelamin: catData.jenis_kelamin || 'Jantan',
      warna: catData.warna?.trim() || 'Unknown',
      umur_estimasi: catData.umur_estimasi?.trim(),
      catatan_kesehatan: catData.catatan_kesehatan?.trim(),
      foto_url: catData.foto_url,
      created_at: new Date().toISOString(),
    }
    const cached = getCachedOwners()
    const owner = cached.find(o => o.id === catData.owner_id)
    if (owner) {
      owner.cats = [localCat, ...(owner.cats || [])]
      saveCachedOwners([...cached])
    }
    return localCat
  },

  /**
   * Create check-in transaction: resolves owner & cat, creates booking.
   */
  async createCheckIn(payload: CreateCheckInPayload): Promise<Booking> {
    // 1. Resolve Owner
    let ownerId = payload.owner.id
    if (!ownerId) {
      const resolvedOwner = await this.upsertOwner(payload.owner)
      ownerId = resolvedOwner.id
    }

    // 2. Resolve Cat
    let catId = payload.cat.id
    if (!catId) {
      const resolvedCat = await this.createCat({
        ...payload.cat,
        owner_id: ownerId,
      })
      catId = resolvedCat.id
    }

    // 3. Create Booking
    try {
      const { data: booking, error: bookingError } = await posDb()
        .from('bookings')
        .insert({
          cat_id: catId,
          owner_id: ownerId,
          tanggal_masuk: payload.booking.tanggal_masuk,
          tanggal_keluar_estimasi: payload.booking.tanggal_keluar_estimasi,
          paket: payload.booking.paket,
          harga_per_hari: payload.booking.harga_per_hari,
          catatan: payload.booking.catatan || null,
          status: 'aktif',
        })
        .select(`
          *,
          cat:cats(*, owner:owners(*)),
          owner:owners(*)
        `)
        .single()

      if (!bookingError && booking) {
        const dp = Number(payload.booking.dp) || 0
        let recordedTx: Transaction | undefined
        if (dp > 0) {
          const { data: tx } = await posDb()
            .from('transactions')
            .insert({
              booking_id: booking.id,
              tipe: 'dp',
              jumlah: dp,
              metode_bayar: 'Tunai',
              keterangan: 'DP Penitipan (Mobile Check-in)',
            })
            .select()
            .single()

          if (tx) {
            recordedTx = {
              ...tx,
              jumlah: Number(tx.jumlah),
            }
          }
        }

        return {
          ...booking,
          harga_per_hari: Number(booking.harga_per_hari),
          transactions: recordedTx ? [recordedTx] : [],
          daily_reports: [],
          sudah_laporan: false,
        }
      }
    } catch (e) {
      console.warn('Database booking insert failed, using fallback:', e)
    }

    // Fallback booking
    const fallbackBooking: Booking = {
      id: 'book-local-' + Date.now(),
      cat_id: catId,
      owner_id: ownerId,
      tanggal_masuk: payload.booking.tanggal_masuk,
      tanggal_keluar_estimasi: payload.booking.tanggal_keluar_estimasi,
      paket: payload.booking.paket,
      harga_per_hari: payload.booking.harga_per_hari,
      catatan: payload.booking.catatan,
      status: 'aktif',
      created_at: new Date().toISOString(),
      cat: {
        id: catId,
        owner_id: ownerId,
        nama: payload.cat.nama,
        ras: payload.cat.ras,
        jenis_kelamin: payload.cat.jenis_kelamin,
        warna: payload.cat.warna,
        foto_url: payload.cat.foto_url,
        created_at: new Date().toISOString(),
      },
      owner: {
        id: ownerId,
        nama: payload.owner.nama,
        no_wa: payload.owner.no_wa,
        created_at: new Date().toISOString(),
      },
      transactions: [],
      daily_reports: [],
      sudah_laporan: false,
    }

    return fallbackBooking
  },

  /**
   * Upsert a daily health & care report for a booking on a given date.
   */
  async upsertDailyReport(report: Omit<DailyReport, 'id' | 'created_at'>): Promise<DailyReport> {
    try {
      const { data, error } = await posDb()
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
            foto_url: report.foto_url || null,
          },
          { onConflict: 'booking_id,tanggal' }
        )
        .select()
        .single()

      if (!error && data) {
        return data
      }
    } catch (e) {
      console.warn('upsertDailyReport DB error, using fallback:', e)
    }

    return {
      ...report,
      id: 'report-local-' + Date.now(),
      created_at: new Date().toISOString(),
    }
  },

  /**
   * Complete check-out process on mobile: marks booking 'selesai'.
   */
  async executeCheckout(payload: ExecuteCheckoutPayload): Promise<void> {
    const { bookingId, checkoutDate } = payload

    try {
      await posDb()
        .from('bookings')
        .update({
          status: 'selesai',
          tanggal_keluar_aktual: checkoutDate,
        })
        .eq('id', bookingId)
    } catch (e) {
      console.warn('executeCheckout DB error:', e)
    }
  },

  /**
   * Upload an image to Supabase Storage bucket 'cat-photos'.
   */
  async uploadPhoto(file: File, folder: 'cats' | 'reports' | 'grooming' = 'cats'): Promise<string> {
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

    const uniqueToken = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
      : Math.random().toString(36).substring(2, 10)
    const fileName = `${folder}/${Date.now()}-${uniqueToken}.${safeExt}`

    try {
      const { error: uploadError } = await supabase.storage
        .from('cat-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (!uploadError) {
        const { data } = supabase.storage
          .from('cat-photos')
          .getPublicUrl(fileName)

        if (data?.publicUrl) return data.publicUrl
      }
    } catch (e) {
      console.warn('Storage upload error, using local FileReader URL:', e)
    }

    // Fallback: Read file as Base64 Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Gagal membaca data gambar dari perangkat'))
      reader.onabort = () => reject(new Error('Pembacaan gambar dibatalkan'))
      reader.readAsDataURL(file)
    })
  },
}
