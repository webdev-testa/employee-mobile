export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface DatabasePos {
  pos: {
    Tables: {
      owners: {
        Row: {
          id: string
          nama: string
          no_wa: string
          email: string | null
          alamat: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nama: string
          no_wa: string
          email?: string | null
          alamat?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nama?: string
          no_wa?: string
          email?: string | null
          alamat?: string | null
          created_at?: string
        }
      }
      cats: {
        Row: {
          id: string
          owner_id: string
          nama: string
          ras: string | null
          jenis_kelamin: 'Jantan' | 'Betina' | null
          warna: string | null
          umur_estimasi: string | null
          catatan_kesehatan: string | null
          foto_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          nama: string
          ras?: string | null
          jenis_kelamin?: 'Jantan' | 'Betina' | null
          warna?: string | null
          umur_estimasi?: string | null
          catatan_kesehatan?: string | null
          foto_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          nama?: string
          ras?: string | null
          jenis_kelamin?: 'Jantan' | 'Betina' | null
          warna?: string | null
          umur_estimasi?: string | null
          catatan_kesehatan?: string | null
          foto_url?: string | null
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          cat_id: string
          owner_id: string
          tanggal_masuk: string
          tanggal_keluar_estimasi: string
          tanggal_keluar_aktual: string | null
          paket: string
          harga_per_hari: number
          catatan: string | null
          status: 'aktif' | 'selesai' | 'dibatalkan'
          created_at: string
        }
        Insert: {
          id?: string
          cat_id: string
          owner_id: string
          tanggal_masuk: string
          tanggal_keluar_estimasi: string
          tanggal_keluar_aktual?: string | null
          paket: string
          harga_per_hari: number
          catatan?: string | null
          status?: 'aktif' | 'selesai' | 'dibatalkan'
          created_at?: string
        }
        Update: {
          id?: string
          cat_id?: string
          owner_id?: string
          tanggal_masuk?: string
          tanggal_keluar_estimasi?: string
          tanggal_keluar_aktual?: string | null
          paket?: string
          harga_per_hari?: number
          catatan?: string | null
          status?: 'aktif' | 'selesai' | 'dibatalkan'
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          booking_id: string
          tipe: 'dp' | 'pelunasan' | 'biaya_tambahan'
          jumlah: number
          metode_bayar: string | null
          uang_diterima: number | null
          kembalian: number | null
          keterangan: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          tipe: 'dp' | 'pelunasan' | 'biaya_tambahan'
          jumlah: number
          metode_bayar?: string | null
          uang_diterima?: number | null
          kembalian?: number | null
          keterangan?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          tipe?: 'dp' | 'pelunasan' | 'biaya_tambahan'
          jumlah?: number
          metode_bayar?: string | null
          uang_diterima?: number | null
          kembalian?: number | null
          keterangan?: string | null
          created_at?: string
        }
      }
      daily_reports: {
        Row: {
          id: string
          booking_id: string
          cat_id: string
          tanggal: string
          nafsu_makan: string
          minum: string
          feses: string
          urinasi: string
          kondisi_umum: string | null
          keterangan: string | null
          foto_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          cat_id: string
          tanggal: string
          nafsu_makan: string
          minum: string
          feses: string
          urinasi: string
          kondisi_umum?: string | null
          keterangan?: string | null
          foto_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          cat_id?: string
          tanggal?: string
          nafsu_makan?: string
          minum?: string
          feses?: string
          urinasi?: string
          kondisi_umum?: string | null
          keterangan?: string | null
          foto_url?: string | null
          created_at?: string
        }
      }
      grooming_sessions: {
        Row: {
          id: string
          owner_id: string
          cat_id: string
          paket: string
          harga: number
          kondisi_awal: string | null
          catatan: string | null
          tanggal: string
          waktu_masuk: string
          waktu_selesai: string | null
          estimasi_selesai: string | null
          status: 'antrian' | 'dikerjakan' | 'selesai' | 'dibatalkan' | 'dijemput'
          current_step: 'check_in' | 'bathing' | 'drying' | 'styling' | 'finishing' | 'done'
          public_token: string
          sudah_bayar: boolean
          metode_bayar: string | null
          groomer_user_id: string | null
          groomer_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          cat_id: string
          paket: string
          harga: number
          kondisi_awal?: string | null
          catatan?: string | null
          tanggal: string
          waktu_masuk: string
          waktu_selesai?: string | null
          estimasi_selesai?: string | null
          status?: 'antrian' | 'dikerjakan' | 'selesai' | 'dibatalkan' | 'dijemput'
          current_step?: 'check_in' | 'bathing' | 'drying' | 'styling' | 'finishing' | 'done'
          public_token: string
          sudah_bayar?: boolean
          metode_bayar?: string | null
          groomer_user_id?: string | null
          groomer_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          cat_id?: string
          paket?: string
          harga?: number
          kondisi_awal?: string | null
          catatan?: string | null
          tanggal?: string
          waktu_masuk?: string
          waktu_selesai?: string | null
          estimasi_selesai?: string | null
          status?: 'antrian' | 'dikerjakan' | 'selesai' | 'dibatalkan' | 'dijemput'
          current_step?: 'check_in' | 'bathing' | 'drying' | 'styling' | 'finishing' | 'done'
          public_token?: string
          sudah_bayar?: boolean
          metode_bayar?: string | null
          groomer_user_id?: string | null
          groomer_name?: string | null
          created_at?: string
        }
      }
      grooming_progress: {
        Row: {
          id: string
          session_id: string
          step: 'check_in' | 'bathing' | 'drying' | 'styling' | 'finishing' | 'done'
          catatan: string | null
          foto_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          step: 'check_in' | 'bathing' | 'drying' | 'styling' | 'finishing' | 'done'
          catatan?: string | null
          foto_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          step?: 'check_in' | 'bathing' | 'drying' | 'styling' | 'finishing' | 'done'
          catatan?: string | null
          foto_url?: string | null
          created_at?: string
        }
      }
      paket_grooming: {
        Row: {
          id: string
          nama: string
          harga: number
          deskripsi: string | null
          durasi_estimasi: number | null
          aktif: boolean
        }
        Insert: {
          id?: string
          nama: string
          harga: number
          deskripsi?: string | null
          durasi_estimasi?: number | null
          aktif?: boolean
        }
        Update: {
          id?: string
          nama?: string
          harga?: number
          deskripsi?: string | null
          durasi_estimasi?: number | null
          aktif?: boolean
        }
      }
      paket_harga: {
        Row: {
          id: string
          nama: string
          harga_per_hari: number
          deskripsi: string | null
          aktif: boolean
        }
        Insert: {
          id?: string
          nama: string
          harga_per_hari: number
          deskripsi?: string | null
          aktif?: boolean
        }
        Update: {
          id?: string
          nama?: string
          harga_per_hari?: number
          deskripsi?: string | null
          aktif?: boolean
        }
      }
      pengaturan: {
        Row: {
          id: number
          nama_usaha: string
          no_wa_usaha: string | null
          alamat_usaha: string | null
          nama_bank: string | null
          no_rekening: string | null
          atas_nama_rekening: string | null
          qris_nmid: string | null
          qris_image_url: string | null
        }
        Insert: {
          id?: number
          nama_usaha: string
          no_wa_usaha?: string | null
          alamat_usaha?: string | null
          nama_bank?: string | null
          no_rekening?: string | null
          atas_nama_rekening?: string | null
          qris_nmid?: string | null
          qris_image_url?: string | null
        }
        Update: {
          id?: number
          nama_usaha?: string
          no_wa_usaha?: string | null
          alamat_usaha?: string | null
          nama_bank?: string | null
          no_rekening?: string | null
          atas_nama_rekening?: string | null
          qris_nmid?: string | null
          qris_image_url?: string | null
        }
      }
    }
  }
}
