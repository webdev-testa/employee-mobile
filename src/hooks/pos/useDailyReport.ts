import { useState, useEffect, useRef } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { posService } from '@/services/posService'
import type { Booking, DailyReport } from '@/types/pos.types'
import { generateDailyReportTemplate, getTodayLocalDate } from '@/utils/pos.utils'
import { openWhatsApp } from '@/utils/grooming.utils'
import { toast } from 'sonner'

export interface DailyReportFormValues {
  nafsu_makan: string
  minum: string
  feses: string
  urinasi: string
  kondisi_umum: string
  keterangan: string
  foto_url?: string
}

export function useDailyReport(booking: Booking | null, onSuccess?: () => void) {
  const isSubmittingRef = useRef(false)
  const [formData, setFormData] = useState<DailyReportFormValues>({
    nafsu_makan: 'Sangat baik (habis semua)',
    minum: 'Normal',
    feses: 'Normal (padat, coklat)',
    urinasi: 'Normal',
    kondisi_umum: 'Aktif, lincah, dan responsif',
    keterangan: '',
    foto_url: undefined,
  })

  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Object URL cleanup
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  // Reset form when active booking changes
  useEffect(() => {
    if (!booking) return

    const timer = setTimeout(() => {
      const today = getTodayLocalDate()
      const existing = (booking.daily_reports || []).find(r => r.tanggal === today)
      if (existing) {
        setFormData({
          nafsu_makan: existing.nafsu_makan,
          minum: existing.minum,
          feses: existing.feses,
          urinasi: existing.urinasi,
          kondisi_umum: existing.kondisi_umum || '',
          keterangan: existing.keterangan || '',
          foto_url: existing.foto_url,
        })
        if (existing.foto_url) {
          setPhotoPreview(existing.foto_url)
        }
      } else {
        setFormData({
          nafsu_makan: 'Sangat baik (habis semua)',
          minum: 'Normal',
          feses: 'Normal (padat, coklat)',
          urinasi: 'Normal',
          kondisi_umum: 'Aktif, lincah, dan responsif',
          keterangan: '',
          foto_url: undefined,
        })
        setPhotoBlob(null)
        setPhotoPreview(null)
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [booking])

  const handleCaptureCamera = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      })

      if (photo?.dataUrl) {
        setPhotoPreview(photo.dataUrl)
        const res = await fetch(photo.dataUrl)
        const blob = await res.blob()
        setPhotoBlob(blob)
      }
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      if (!msg.includes('cancel')) {
        console.warn('Camera error:', err)
      }
    }
  }

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_SIZE_MB = 10
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Ukuran foto maksimal ${MAX_SIZE_MB}MB`)
      e.target.value = ''
      return
    }

    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview)
    }

    const localUrl = URL.createObjectURL(file)
    setPhotoPreview(localUrl)
    setPhotoBlob(file)
  }

  const submitReport = async () => {
    if (!booking || isSubmittingRef.current || isSubmitting) return

    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      const today = getTodayLocalDate()
      let finalFotoUrl = formData.foto_url

      if (photoBlob) {
        toast.info('Mengunggah foto laporan harian...')
        const uploaded = await posService.uploadPhoto(photoBlob as File, 'reports')
        finalFotoUrl = uploaded
      }

      const createdReport: DailyReport = await posService.upsertDailyReport({
        booking_id: booking.id,
        cat_id: booking.cat_id,
        tanggal: today,
        nafsu_makan: formData.nafsu_makan,
        minum: formData.minum,
        feses: formData.feses,
        urinasi: formData.urinasi,
        kondisi_umum: formData.kondisi_umum.trim() || undefined,
        keterangan: formData.keterangan.trim() || undefined,
        foto_url: finalFotoUrl,
      })

      toast.success(`Laporan harian untuk ${booking.cat?.nama || 'kucing'} berhasil disimpan!`)

      // Trigger WhatsApp
      const waMessage = generateDailyReportTemplate(booking, createdReport)
      const phone = booking.owner?.no_wa
      if (phone) {
        openWhatsApp(phone, waMessage)
      }

      onSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      console.error('Error saving daily report:', err)
      toast.error('Gagal menyimpan laporan: ' + msg)
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return {
    formData,
    setFormData,
    photoBlob,
    photoPreview,
    isSubmitting,
    handleCaptureCamera,
    handlePhotoFileChange,
    submitReport,
  }
}
