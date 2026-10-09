import type { Owner } from '@/types/pos.types'

export const NAFSU_MAKAN_OPTIONS = [
  'Sangat baik (habis semua)',
  'Baik (hampir habis)',
  'Cukup (setengah)',
  'Kurang',
  'Tidak nafsu makan',
] as const

export const MINUM_OPTIONS = [
  'Sangat Banyak',
  'Banyak',
  'Normal',
  'Sedikit',
  'Tidak minum',
] as const

export const FESES_OPTIONS = [
  'Tidak BAB',
  'Normal (padat, coklat)',
  'Lembek',
  'Cair (diare)',
  'Ada lendir',
  'Ada darah',
] as const

export const URINASI_OPTIONS = [
  'Tidak BAK',
  'Normal',
  'Sedikit',
  'Banyak / Sering',
  'Warna tidak normal',
  'Mengejan',
] as const

export const DEFAULT_OWNERS: Owner[] = [
  {
    id: 'own-1',
    nama: 'Fara Nabila',
    no_wa: '081234567890',
    email: 'fara.nabila@gmail.com',
    alamat: 'Jl. Kemang Raya No. 14, Jakarta Selatan',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    cats: [
      {
        id: 'cat-1',
        owner_id: 'own-1',
        nama: 'Milo',
        ras: 'British Shorthair',
        jenis_kelamin: 'Jantan',
        warna: 'Silver Tabby',
        umur_estimasi: '1 tahun',
        catatan_kesehatan: 'Sehat, vaksin lengkap',
        foto_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'cat-1b',
        owner_id: 'own-1',
        nama: 'Mochi',
        ras: 'Persia Peaknose',
        jenis_kelamin: 'Betina',
        warna: 'Putih Salju',
        umur_estimasi: '8 bulan',
        catatan_kesehatan: 'Mata agak sensitif',
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'own-2',
    nama: 'Andi Pratama',
    no_wa: '085712345678',
    email: 'andi.pratama@yahoo.com',
    alamat: 'Jl. Margonda Raya No. 88, Depok',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    cats: [
      {
        id: 'cat-2',
        owner_id: 'own-2',
        nama: 'Luna',
        ras: 'Persia Medium',
        jenis_kelamin: 'Betina',
        warna: 'White Calico',
        umur_estimasi: '2 tahun',
        catatan_kesehatan: 'Riwayat jamur ringan di telinga',
        foto_url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600&auto=format&fit=crop&q=80',
        created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'own-3',
    nama: 'Siti Rahma',
    no_wa: '089612345678',
    email: 'siti.rahma@outlook.com',
    alamat: 'Jl. RS Fatmawati No. 22, Jakarta Selatan',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    cats: [
      {
        id: 'cat-3',
        owner_id: 'own-3',
        nama: 'Oliver',
        ras: 'Domestic Mix',
        jenis_kelamin: 'Jantan',
        warna: 'Orange Tabby',
        umur_estimasi: '1.5 tahun',
        catatan_kesehatan: 'Aktif, lincah',
        foto_url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&auto=format&fit=crop&q=80',
        created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'own-4',
    nama: 'Budi Santoso',
    no_wa: '081388776655',
    email: 'budi.santoso@gmail.com',
    alamat: 'Bintaro Sektor 7, Tangerang Selatan',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    cats: [
      {
        id: 'cat-4',
        owner_id: 'own-4',
        nama: 'Simba',
        ras: 'Maine Coon',
        jenis_kelamin: 'Jantan',
        warna: 'Golden Brown',
        umur_estimasi: '3 tahun',
        catatan_kesehatan: 'Berat 7.5kg, nafsu makan baik',
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'own-5',
    nama: 'Amanda Putri',
    no_wa: '081809876543',
    alamat: 'Jl. Tebet Timur Dalam No. 18, Tebet',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    cats: [
      {
        id: 'cat-5',
        owner_id: 'own-5',
        nama: 'Oreo',
        ras: 'Tuxedo Domestic',
        jenis_kelamin: 'Betina',
        warna: 'Hitam Putih',
        umur_estimasi: '1 tahun',
        catatan_kesehatan: 'Sehat & lincah',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: 'own-6',
    nama: 'Rian Hidayat',
    no_wa: '082133445566',
    alamat: 'Jl. Radio Dalam Raya No. 40, Jakarta Selatan',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cats: [
      {
        id: 'cat-6',
        owner_id: 'own-6',
        nama: 'Chiki',
        ras: 'Scottish Fold',
        jenis_kelamin: 'Betina',
        warna: 'Grey Fluff',
        umur_estimasi: '2 tahun',
        catatan_kesehatan: 'Kuku rutin dipotong',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
]
