import { useState, useEffect, useRef } from 'react'
import { posService } from '@/services/posService'
import type { Owner, Cat, Booking, PaketHarga } from '@/types/pos.types'
import { hitungMalam, getTodayLocalDate } from '@/utils/pos.utils'
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

export interface HotelBookingForm {
  paket: string
  harga_per_hari: number
  tanggal_masuk: string
  tanggal_keluar_estimasi: string
  catatan: string
  dp: number
  sudah_bayar_dp: boolean
}

export function useCheckIn() {
  const isSubmittingRef = useRef(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const [dates] = useState(() => {
    const todayStr = getTodayLocalDate()
    const tomorrowStr = new Date(new Date(todayStr).getTime() + 86400000).toISOString().split('T')[0]
    return { today: todayStr, tomorrow: tomorrowStr }
  })
  const { today, tomorrow } = dates

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

  // Step 3: Stay & Package Details
  const [packages, setPackages] = useState<PaketHarga[]>([])
  const [formData, setFormData] = useState<HotelBookingForm>({
    paket: 'Kamar Standard',
    harga_per_hari: 50000,
    tanggal_masuk: today,
    tanggal_keluar_estimasi: tomorrow,
    catatan: '',
    dp: 0,
    sudah_bayar_dp: false,
  })

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)

  // Load packages
  useEffect(() => {
    let mounted = true
    posService.fetchPaketHarga().then(pkgs => {
      if (mounted && pkgs.length > 0) {
        setPackages(pkgs)
        setFormData(prev => ({
          ...prev,
          paket: pkgs[0].nama,
          harga_per_hari: pkgs[0].harga_per_hari,
        }))
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  // Search owners with debounce
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

  // Fetch cats when owner selected
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

  const handleSelectCat = (cat: Cat) => {
    setSelectedCat(cat)
    setIsNewCat(false)
  }

  const handleChooseNewCat = () => {
    setSelectedCat(null)
    setIsNewCat(true)
  }

  const handleSelectPackage = (pkg: PaketHarga) => {
    setFormData(prev => ({
      ...prev,
      paket: pkg.nama,
      harga_per_hari: pkg.harga_per_hari,
    }))
  }

  const calculatedNights = hitungMalam(formData.tanggal_masuk, formData.tanggal_keluar_estimasi)
  const estimatedTotal = calculatedNights * formData.harga_per_hari
  const estimatedRemaining = Math.max(0, estimatedTotal - (formData.dp || 0))

  const submitCheckIn = async () => {
    if (isSubmittingRef.current || isSubmitting) return

    // Validate Step 1
    let ownerId = selectedOwner?.id
    if (isNewOwner) {
      if (!newOwnerData.nama.trim()) {
        toast.error('Nama pemilik wajib diisi!')
        return
      }
      const cleanPhone = newOwnerData.no_wa.replace(/\D/g, '')
      if (cleanPhone.length < 8) {
        toast.error('Nomor WhatsApp pemilik minimal 8 digit!')
        return
      }
    } else if (!selectedOwner) {
      toast.error('Pilih atau daftarkan pemilik kucing terlebih dahulu!')
      return
    }

    // Validate Step 2
    const effectiveIsNewCat = isNewCat || isNewOwner || !selectedOwner || ownerCats.length === 0
    let catId = selectedCat?.id
    if (effectiveIsNewCat) {
      if (!newCatData.nama.trim()) {
        toast.error('Nama kucing wajib diisi!')
        return
      }
    } else if (!selectedCat) {
      toast.error('Pilih atau daftarkan kucing terlebih dahulu!')
      return
    }

    // Validate Step 3
    if (!formData.tanggal_masuk || !formData.tanggal_keluar_estimasi) {
      toast.error('Tanggal menginap harus diisi!')
      return
    }

    if (formData.tanggal_keluar_estimasi < formData.tanggal_masuk) {
      toast.error('Tanggal keluar tidak boleh lebih awal dari tanggal masuk!')
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      // 1. Upsert Owner if new
      let resolvedOwner: Owner | null = selectedOwner
      if (isNewOwner) {
        resolvedOwner = await posService.upsertOwner(newOwnerData)
        ownerId = resolvedOwner.id
      }

      if (!ownerId) {
        throw new Error('Gagal menentukan identitas pemilik kucing')
      }

      // 2. Create Cat if new
      let resolvedCat: Cat | null = selectedCat
      if (effectiveIsNewCat) {
        resolvedCat = await posService.createCat({
          ...newCatData,
          owner_id: ownerId,
        })
        catId = resolvedCat.id
      }

      if (!catId) {
        throw new Error('Gagal menentukan data kucing')
      }

      // 3. Create Booking via posService
      const booking = await posService.createCheckIn({
        owner: {
          id: ownerId,
          nama: resolvedOwner?.nama || newOwnerData.nama,
          no_wa: resolvedOwner?.no_wa || newOwnerData.no_wa,
        },
        cat: {
          id: catId,
          nama: resolvedCat?.nama || newCatData.nama,
          ras: resolvedCat?.ras || newCatData.ras,
        },
        booking: {
          tanggal_masuk: formData.tanggal_masuk,
          tanggal_keluar_estimasi: formData.tanggal_keluar_estimasi,
          paket: formData.paket,
          harga_per_hari: formData.harga_per_hari,
          catatan: formData.catatan.trim() || undefined,
          dp: formData.dp > 0 ? formData.dp : undefined,
          sudah_bayar_dp: formData.sudah_bayar_dp,
        },
      })

      // Ensure full relations attached for display in modal
      booking.owner = resolvedOwner || undefined
      booking.cat = resolvedCat || undefined

      setCreatedBooking(booking)
      setIsSuccessModalOpen(true)
      toast.success(`Check-in hotel untuk ${booking.cat?.nama || 'kucing'} berhasil!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      console.error('Submit check-in error:', err)
      toast.error('Gagal memproses check-in hotel: ' + msg)
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
      paket: packages[0]?.nama || 'Kamar Standard',
      harga_per_hari: packages[0]?.harga_per_hari || 50000,
      tanggal_masuk: today,
      tanggal_keluar_estimasi: tomorrow,
      catatan: '',
      dp: 0,
      sudah_bayar_dp: false,
    })
    setCreatedBooking(null)
    setIsSuccessModalOpen(false)
  }

  return {
    step,
    setStep,
    // Step 1: Owner
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
    // Step 2: Cat
    selectedCat,
    isNewCat,
    setIsNewCat,
    newCatData,
    setNewCatData,
    ownerCats,
    isLoadingCats,
    handleSelectCat,
    handleChooseNewCat,
    // Step 3: Details
    packages,
    formData,
    setFormData,
    handleSelectPackage,
    calculatedNights,
    estimatedTotal,
    estimatedRemaining,
    // Submitting
    submitCheckIn,
    isSubmitting,
    createdBooking,
    isSuccessModalOpen,
    setIsSuccessModalOpen,
    resetForm,
  }
}
