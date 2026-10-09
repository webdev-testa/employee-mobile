import { supabase } from '@/lib/supabase'
import { supabasePos } from '@/lib/supabasePos'
import { offlineQueue } from '@/lib/offlineQueue'
import { DEFAULT_OWNERS } from '@/constants/pos.constants'
import { calculateBilling, getTodayLocalDate } from '@/utils/pos.utils'
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
const STORAGE_KEY_BOOKINGS = 'dr_meow_pos_bookings_cache'

export const getCachedBookings = (): Booking[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export const saveCachedBookings = (bookings: Booking[]) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings))
  } catch (e) {
    console.error('Failed to cache bookings:', e)
  }
}

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
    const today = getTodayLocalDate()
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
        console.warn('Error fetching POS bookings from DB, returning cache:', error.message)
        return getCachedBookings()
      }

      const rawBookings = (data as unknown as Booking[]) || []
      const formatted = rawBookings.map(b => ({
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

      saveCachedBookings(formatted)
      return formatted
    } catch (err) {
      console.warn('fetchBookings error, returning cache:', err)
      return getCachedBookings()
    }
  },

  /**
   * Fetch a single booking by ID with full nested details.
   */
  async fetchBookingById(id: string): Promise<Booking | null> {
    const today = getTodayLocalDate()
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
        console.warn('Error fetching booking detail, checking cache:', error.message)
        const cached = getCachedBookings().find(b => b.id === id)
        return cached || null
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
    offlineQueue.enqueue('pos_upsert_owner', { ...localOwner })
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
    offlineQueue.enqueue('pos_create_cat', { ...localCat })
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
        if (dp > 0 && payload.booking.sudah_bayar_dp === true) {
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

        const formattedBooking = {
          ...booking,
          harga_per_hari: Number(booking.harga_per_hari),
          transactions: recordedTx ? [recordedTx] : [],
          daily_reports: [],
          sudah_laporan: false,
        }
        const cached = getCachedBookings()
        saveCachedBookings([formattedBooking, ...cached])
        return formattedBooking
      }
    } catch (e) {
      console.warn('Database booking insert failed, using fallback:', e)
    }

    // Fallback booking with valid UUID
    const fallbackBookingId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0')

    const fallbackBooking: Booking = {
      id: fallbackBookingId,
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

    const currentCached = getCachedBookings()
    saveCachedBookings([fallbackBooking, ...currentCached])
    offlineQueue.enqueue('hotel_checkin', {
      ...fallbackBooking,
      dp: payload.booking.dp,
      sudah_bayar_dp: payload.booking.sudah_bayar_dp,
    })

    return fallbackBooking
  },

  /**
   * Upsert a daily health & care report for a booking on a given date.
   */
  async upsertDailyReport(report: Omit<DailyReport, 'id' | 'created_at'>): Promise<DailyReport> {
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('Device is offline')
      }

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
        const cached = getCachedBookings()
        const bIdx = cached.findIndex(b => b.id === report.booking_id)
        if (bIdx >= 0) {
          const reports = [...(cached[bIdx].daily_reports || [])]
          const rIdx = reports.findIndex(r => r.tanggal === report.tanggal)
          if (rIdx >= 0) reports[rIdx] = data
          else reports.push(data)
          cached[bIdx] = { ...cached[bIdx], daily_reports: reports, sudah_laporan: true }
          saveCachedBookings(cached)
        }
        return data
      }
    } catch (e) {
      console.warn('upsertDailyReport DB error, queueing offline mutation:', e)
      offlineQueue.enqueue('hotel_daily_report', report)
    }

    const fallbackReportId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0')

    const fallbackReport: DailyReport = {
      ...report,
      id: fallbackReportId,
      created_at: new Date().toISOString(),
    }

    const cached = getCachedBookings()
    const bIdx = cached.findIndex(b => b.id === report.booking_id)
    if (bIdx >= 0) {
      const reports = [...(cached[bIdx].daily_reports || [])]
      const rIdx = reports.findIndex(r => r.tanggal === report.tanggal)
      if (rIdx >= 0) reports[rIdx] = fallbackReport
      else reports.push(fallbackReport)
      cached[bIdx] = { ...cached[bIdx], daily_reports: reports, sudah_laporan: true }
      saveCachedBookings(cached)
    }

    return fallbackReport
  },

  /**
   * Complete check-out process on mobile: marks booking 'selesai' and logs settlement.
   */
  async executeCheckout(payload: ExecuteCheckoutPayload): Promise<void> {
    const { bookingId, checkoutDate, extraCharges, sudahBayar } = payload

    const currentBooking = await this.fetchBookingById(bookingId)
    if (currentBooking && currentBooking.status === 'selesai') {
      throw new Error('Booking ini sudah selesai dan tidak dapat di-checkout ulang.')
    }

    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false
    if (isOffline) {
      const billing = calculateBilling(
        currentBooking || ({
          id: bookingId,
          cat_id: '',
          owner_id: '',
          tanggal_masuk: checkoutDate,
          tanggal_keluar_estimasi: checkoutDate,
          paket: 'Standard',
          harga_per_hari: 0,
          status: 'selesai',
          created_at: '',
          transactions: [],
        } as Booking),
        checkoutDate,
        extraCharges
      )

      offlineQueue.enqueue('hotel_checkout', {
        bookingId,
        checkoutDate,
        extraCharges,
        settlementAmount: sudahBayar ? billing.sisa_bayar : 0,
      })

      const cached = getCachedBookings()
      const updated = cached.map(b =>
        b.id === bookingId
          ? { ...b, status: 'selesai' as const, tanggal_keluar_aktual: checkoutDate }
          : b
      )
      saveCachedBookings(updated)
      return
    }

    const { error: updateError } = await posDb()
      .from('bookings')
      .update({
        status: 'selesai',
        tanggal_keluar_aktual: checkoutDate,
      })
      .eq('id', bookingId)

    if (updateError) {
      throw new Error(`Gagal memperbarui status checkout: ${updateError.message}`)
    }

    // Record extra charges transactions if provided
    if (extraCharges && extraCharges.length > 0) {
      for (const charge of extraCharges) {
        if (charge.jumlah > 0) {
          const { error: chargeErr } = await posDb().from('transactions').insert({
            booking_id: bookingId,
            tipe: 'biaya_tambahan',
            jumlah: Math.max(0, charge.jumlah),
            keterangan: charge.keterangan || 'Biaya Tambahan',
          })
          if (chargeErr) {
            console.warn('Gagal mencatat transaksi biaya tambahan:', chargeErr)
          }
        }
      }
    }

    // Record settlement payment transaction if marked as sudah bayar
    if (sudahBayar) {
      const billing = calculateBilling(
        currentBooking || ({
          id: bookingId,
          cat_id: '',
          owner_id: '',
          tanggal_masuk: checkoutDate,
          tanggal_keluar_estimasi: checkoutDate,
          paket: 'Standard',
          harga_per_hari: 0,
          status: 'selesai',
          created_at: '',
          transactions: [],
        } as Booking),
        checkoutDate,
        extraCharges
      )

      if (billing.sisa_bayar > 0) {
        const { error: settleErr } = await posDb().from('transactions').insert({
          booking_id: bookingId,
          tipe: 'pelunasan',
          jumlah: billing.sisa_bayar,
          metode_bayar: 'Tunai',
          keterangan: 'Pelunasan Check-Out (Mobile)',
        })
        if (settleErr) {
          console.warn('Gagal mencatat transaksi pelunasan:', settleErr)
        }
      }
    }

    const cached = getCachedBookings()
    const updated = cached.map(b =>
      b.id === bookingId
        ? { ...b, status: 'selesai' as const, tanggal_keluar_aktual: checkoutDate }
        : b
    )
    saveCachedBookings(updated)
  },

  /**
   * Upload an image to Supabase Storage bucket 'cat-photos'.
   */
  async uploadPhoto(file: File | Blob, folder: 'cats' | 'reports' | 'grooming' = 'cats'): Promise<string> {
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

    const safeFolder = folder.replace(/\.\./g, '').replace(/[^a-zA-Z0-9_-]/g, '').trim() || 'cats'
    const uniqueToken = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').substring(0, 12)
      : Math.random().toString(36).substring(2, 10)
    const fileName = `${safeFolder}/${Date.now()}-${uniqueToken}.${safeExt}`

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
