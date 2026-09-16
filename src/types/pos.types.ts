export interface Owner {
  id: string
  nama: string
  no_wa: string
  email?: string
  alamat?: string
  created_at: string
  cats?: Cat[]
}

export interface Cat {
  id: string
  owner_id: string
  nama: string
  ras?: string
  jenis_kelamin?: 'Jantan' | 'Betina'
  warna?: string
  umur_estimasi?: string
  catatan_kesehatan?: string
  foto_url?: string
  created_at: string
  owner?: Owner
}

export interface Booking {
  id: string
  cat_id: string
  owner_id: string
  tanggal_masuk: string
  tanggal_keluar_estimasi: string
  tanggal_keluar_aktual?: string
  paket: string
  harga_per_hari: number
  catatan?: string
  status: 'aktif' | 'selesai' | 'dibatalkan'
  created_at: string
  cat?: Cat
  owner?: Owner
  transactions?: Transaction[]
  daily_reports?: DailyReport[]
  sudah_laporan?: boolean
}

export interface Transaction {
  id: string
  booking_id: string
  tipe: 'dp' | 'pelunasan' | 'biaya_tambahan'
  jumlah: number
  metode_bayar?: 'QRIS' | 'Tunai' | 'Transfer' | string
  uang_diterima?: number
  kembalian?: number
  keterangan?: string
  created_at: string
}

export interface DailyReport {
  id: string
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
  created_at: string
}

export interface PaketHarga {
  id: string
  nama: string
  harga_per_hari: number
  deskripsi?: string
  aktif: boolean
}

export interface Pengaturan {
  id: number
  nama_usaha: string
  no_wa_usaha?: string
  alamat_usaha?: string
  nama_bank?: string
  no_rekening?: string
  atas_nama_rekening?: string
  qris_nmid?: string
  qris_image_url?: string
}

export interface BillingCalculation {
  jumlah_malam: number
  subtotal: number
  total_dp: number
  total_biaya_tambahan: number
  total: number
  sisa_bayar: number
}

// ─── Grooming Module Types ───

export type GroomingStep = 'check_in' | 'bathing' | 'drying' | 'styling' | 'finishing' | 'done'
export type GroomingStatus = 'antrian' | 'dikerjakan' | 'selesai' | 'dibatalkan' | 'dijemput'

export interface GroomingSession {
  id: string
  owner_id: string
  cat_id: string
  paket: string
  harga: number
  kondisi_awal?: string
  catatan?: string
  tanggal: string
  waktu_masuk: string
  waktu_selesai?: string
  estimasi_selesai?: string
  status: GroomingStatus
  current_step: GroomingStep
  public_token: string
  sudah_bayar: boolean
  metode_bayar?: string
  groomer_user_id?: string
  groomer_name?: string
  created_at: string
  owner?: Owner
  cat?: Cat
  progress?: GroomingProgress[]
}

export interface GroomingProgress {
  id: string
  session_id: string
  step: GroomingStep
  catatan?: string
  foto_url?: string
  created_at: string
}

export interface PaketGrooming {
  id: string
  nama: string
  harga: number
  deskripsi?: string
  durasi_estimasi?: number
  aktif: boolean
}
