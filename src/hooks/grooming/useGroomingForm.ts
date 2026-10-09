import { useState, useEffect, useRef } from 'react'
import { posService } from '@/services/posService'
import { groomingService } from '@/services/groomingService'
import type { Owner, Cat, PaketGrooming, GroomingSession } from '@/types/pos.types'
import { DEFAULT_PAKET_GROOMING } from '@/constants/grooming.constants'
import { toast } from 'sonner'

export interface NewOwnerForm {
  nama: string
  no_wa: string
  email?: string
  alamat?: string
}

export interface NewCatForm {
  nama: string
  ras: string
  jenis_kelamin: 'Jantan' | 'Betina'
  warna: string
  umur_estimasi?: string
  catatan_kesehatan?: string
  foto_url?: string
}

export interface GroomingBookingForm {
  paketId: string
  paketNama: string
  harga: number
  kondisiAwal: string
  catatan: string
  groomerName: string
  estimasiMenit: number
  sudahBayar: boolean
  metodeBayar?: string
}

export function useGroomingForm(initialGroomerName: string = 'Staff Groomer') {
  const isSubmittingRef = useRef(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1: Owner
  const [searchOwnerQuery, setSearchOwnerQuery] = useState('')
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null)
  const [isNewOwner, setIsNewOwner] = useState(false)
  const [newOwnerData, setNewOwnerData] = useState<NewOwnerForm>({
    nama: '',
    no_wa: '',
    email: '',
    alamat: '',
  })
  const [ownerSearchResults, setOwnerSearchResults] = useState<Owner[]>([])
  const [isSearchingOwners, setIsSearchingOwners] = useState(false)

  // Step 2: Cat
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null)
  const [isNewCat, setIsNewCat] = useState(false)
  const [newCatData, setNewCatData] = useState<NewCatForm>({
    nama: '',
    ras: 'Domestic',
    jenis_kelamin: 'Jantan',
    warna: '',
    umur_estimasi: '',
    catatan_kesehatan: '',
    foto_url: '',
  })
  const [ownerCats, setOwnerCats] = useState<Cat[]>([])
  const [isLoadingCats, setIsLoadingCats] = useState(false)

  // Step 3: Grooming Details
  const [packages, setPackages] = useState<PaketGrooming[]>(DEFAULT_PAKET_GROOMING)
  const [formData, setFormData] = useState<GroomingBookingForm>({
    paketId: DEFAULT_PAKET_GROOMING[0].id,
    paketNama: DEFAULT_PAKET_GROOMING[0].nama,
    harga: DEFAULT_PAKET_GROOMING[0].harga,
    kondisiAwal: '',
    catatan: '',
    groomerName: initialGroomerName,
    estimasiMenit: DEFAULT_PAKET_GROOMING[0].durasi_estimasi || 60,
    sudahBayar: false,
  })

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdSession, setCreatedSession] = useState<GroomingSession | null>(null)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)

  // Fetch Packages
  useEffect(() => {
    let mounted = true
    groomingService.fetchPaketGrooming().then(pkgs => {
      if (mounted && pkgs.length > 0) {
        setPackages(pkgs)
        setFormData(prev => ({
          ...prev,
          paketId: pkgs[0].id,
          paketNama: pkgs[0].nama,
          harga: pkgs[0].harga,
          estimasiMenit: pkgs[0].durasi_estimasi || 60,
        }))
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Search Owners
  useEffect(() => {
    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) setIsSearchingOwners(true)
      posService.searchOwners(searchOwnerQuery).then(results => {
        if (mounted) {
          setOwnerSearchResults(results)
          setIsSearchingOwners(false)
        }
      })
    }, 200)

    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [searchOwnerQuery])

  // Fetch Cats when owner changes
  useEffect(() => {
    if (!selectedOwner?.id) return

    let mounted = true
    const timeout = setTimeout(() => {
      if (mounted) setIsLoadingCats(true)
      posService.fetchCatsByOwner(selectedOwner.id).then(cats => {
        if (mounted) {
          setOwnerCats(cats)
          setIsLoadingCats(false)
        }
      })
    }, 0)

    return () => {
      mounted = false
      clearTimeout(timeout)
    }
  }, [selectedOwner?.id])

  // Handlers for Step 1
  const handleSelectOwner = (owner: Owner) => {
    setSelectedOwner(owner)
    setIsNewOwner(false)
    setSelectedCat(null)
    setIsNewCat(false)
  }

  const handleClearOwner = () => {
    setSelectedOwner(null)
    setSelectedCat(null)
    setIsNewCat(false)
    setOwnerCats([])
  }

  // Handlers for Step 2
  const handleSelectCat = (cat: Cat) => {
    setSelectedCat(cat)
    setIsNewCat(false)
  }

  const handleChooseNewCat = () => {
    setSelectedCat(null)
    setIsNewCat(true)
  }

  // Handlers for Step 3
  const handleSelectPackage = (pkg: PaketGrooming) => {
    setFormData(prev => ({
      ...prev,
      paketId: pkg.id,
      paketNama: pkg.nama,
      harga: pkg.harga,
      estimasiMenit: pkg.durasi_estimasi || 60,
    }))
  }

  // Submit Check-in
  const submitCheckIn = async () => {
    if (isSubmittingRef.current || isSubmitting) {
      return
    }

    // Validation
    let ownerId = selectedOwner?.id
    if (isNewOwner) {
      if (!newOwnerData.nama.trim()) {
        toast.error('Nama pemilik wajib diisi!')
        return
      }
      const cleanPhone = newOwnerData.no_wa.replace(/\D/g, '')
      if (cleanPhone.length < 8) {
        toast.error('Nomor WhatsApp tidak valid (minimal 8 digit)!')
        return
      }
    } else if (!selectedOwner) {
      toast.error('Pilih atau daftarkan pemilik kucing terlebih dahulu!')
      return
    }

    let catId = selectedCat?.id
    if (isNewCat) {
      if (!newCatData.nama.trim()) {
        toast.error('Nama kucing wajib diisi!')
        return
      }
    } else if (!selectedCat) {
      toast.error('Pilih atau daftarkan kucing terlebih dahulu!')
      return
    }

    if (!formData.paketNama.trim()) {
      toast.error('Pilih paket grooming terlebih dahulu!')
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      // 1. Resolve / Create Owner
      let resolvedOwner: Owner | null = selectedOwner
      if (isNewOwner) {
        resolvedOwner = await posService.upsertOwner(newOwnerData)
        ownerId = resolvedOwner.id
      }

      if (!ownerId) {
        throw new Error('Gagal menentukan identitas pemilik kucing')
      }

      // 2. Resolve / Create Cat
      let resolvedCat: Cat | null = selectedCat
      if (isNewCat) {
        resolvedCat = await posService.createCat({
          ...newCatData,
          owner_id: ownerId,
        })
        catId = resolvedCat.id
      }

      if (!catId) {
        throw new Error('Gagal menentukan data kucing')
      }

      // Calculate estimate time
      const estimasiDate = new Date(Date.now() + (formData.estimasiMenit || 60) * 60 * 1000).toISOString()

      // 3. Create Grooming Session
      const session = await groomingService.createSession({
        owner_id: ownerId,
        cat_id: catId,
        paket: formData.paketNama,
        harga: formData.harga,
        kondisi_awal: formData.kondisiAwal.trim() || undefined,
        catatan: formData.catatan.trim() || undefined,
        groomer_name: formData.groomerName.trim() || initialGroomerName,
        estimasi_selesai: estimasiDate,
        sudah_bayar: formData.sudahBayar,
      })

      // Attach resolved entities for display in success modal
      session.owner = resolvedOwner || undefined
      session.cat = resolvedCat || undefined

      setCreatedSession(session)
      setIsSuccessModalOpen(true)
      toast.success(`Check-in grooming untuk ${session.cat?.nama || 'kucing'} berhasil!`)
    } catch (err: unknown) {
      console.error('Submit error:', err)
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error('Gagal memproses check-in: ' + msg)
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setStep(1)
    setSelectedOwner(null)
    setIsNewOwner(false)
    setNewOwnerData({ nama: '', no_wa: '', email: '', alamat: '' })
    setSelectedCat(null)
    setIsNewCat(false)
    setOwnerCats([])
    setNewCatData({
      nama: '',
      ras: 'Domestic',
      jenis_kelamin: 'Jantan',
      warna: '',
      umur_estimasi: '',
      catatan_kesehatan: '',
      foto_url: '',
    })
    setFormData({
      paketId: packages[0]?.id || '',
      paketNama: packages[0]?.nama || 'Mandi Sehat',
      harga: packages[0]?.harga || 65000,
      kondisiAwal: '',
      catatan: '',
      groomerName: initialGroomerName,
      estimasiMenit: 60,
      sudahBayar: false,
    })
    setCreatedSession(null)
    setIsSuccessModalOpen(false)
  }

  return {
    step,
    setStep,
    // Owner
    searchOwnerQuery,
    setSearchOwnerQuery,
    selectedOwner,
    isNewOwner,
    setIsNewOwner,
    newOwnerData,
    setNewOwnerData,
    ownerSearchResults,
    isSearchingOwners,
    handleSelectOwner,
    handleClearOwner,
    // Cat
    selectedCat,
    isNewCat,
    setIsNewCat,
    newCatData,
    setNewCatData,
    ownerCats,
    isLoadingCats,
    handleSelectCat,
    handleChooseNewCat,
    // Details
    formData,
    setFormData,
    packages,
    handleSelectPackage,
    // Submission
    submitCheckIn,
    isSubmitting,
    createdSession,
    isSuccessModalOpen,
    setIsSuccessModalOpen,
    resetForm,
  }
}
