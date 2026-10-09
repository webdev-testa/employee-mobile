import { useState, useMemo, useRef } from 'react'
import { posService } from '@/services/posService'
import type { Booking, BillingCalculation } from '@/types/pos.types'
import { calculateBilling, generateCheckoutTemplate, getTodayLocalDate } from '@/utils/pos.utils'
import { openWhatsApp } from '@/utils/grooming.utils'
import { toast } from 'sonner'

export interface ExtraChargeItem {
  id: string
  keterangan: string
  jumlah: number
}

export function useBilling(booking: Booking | null, onCheckoutSuccess?: () => void) {
  const isCheckingOutRef = useRef(false)
  const [checkoutDate, setCheckoutDate] = useState<string>(() => getTodayLocalDate())
  const [extraCharges, setExtraCharges] = useState<ExtraChargeItem[]>([])
  const [sudahBayar, setSudahBayar] = useState<boolean>(false)
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false)

  const addExtraCharge = (keterangan: string, jumlah: number) => {
    if (!keterangan.trim()) {
      toast.error('Keterangan biaya tambahan wajib diisi!')
      return
    }
    if (jumlah <= 0) {
      toast.error('Jumlah biaya tambahan harus lebih dari 0!')
      return
    }

    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? 'chg-' + crypto.randomUUID()
      : 'chg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)

    const newItem: ExtraChargeItem = {
      id: uniqueId,
      keterangan: keterangan.trim(),
      jumlah: Math.max(0, jumlah),
    }
    setExtraCharges(prev => [...prev, newItem])
    toast.success(`Biaya tambahan "${keterangan}" ditambahkan`)
  }

  const removeExtraCharge = (id: string) => {
    setExtraCharges(prev => prev.filter(c => c.id !== id))
  }

  const billing: BillingCalculation = useMemo(() => {
    if (!booking) {
      return {
        jumlah_malam: 0,
        subtotal: 0,
        total_dp: 0,
        total_biaya_tambahan: 0,
        total: 0,
        sisa_bayar: 0,
      }
    }
    return calculateBilling(
      booking,
      checkoutDate,
      extraCharges.map(e => ({ jumlah: e.jumlah, keterangan: e.keterangan }))
    )
  }, [booking, checkoutDate, extraCharges])

  const executeCheckout = async () => {
    if (!booking || isCheckingOutRef.current || isCheckingOut) return

    if (!checkoutDate) {
      toast.error('Tanggal check-out tidak boleh kosong!')
      return
    }

    if (checkoutDate < booking.tanggal_masuk) {
      toast.error('Tanggal check-out tidak boleh lebih awal dari tanggal masuk!')
      return
    }

    isCheckingOutRef.current = true
    setIsCheckingOut(true)

    try {
      await posService.executeCheckout({
        bookingId: booking.id,
        checkoutDate,
        extraCharges: extraCharges.map(e => ({ jumlah: e.jumlah, keterangan: e.keterangan })),
        sudahBayar,
      })

      toast.success(`Checkout untuk ${booking.cat?.nama || 'kucing'} berhasil!`)

      // Auto-open WhatsApp with checkout receipt
      const waMessage = generateCheckoutTemplate(booking, billing)
      const phone = booking.owner?.no_wa
      if (phone) {
        openWhatsApp(phone, waMessage)
      }

      onCheckoutSuccess?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      console.error('Checkout error:', err)
      toast.error('Gagal menyelesaikan check-out: ' + msg)
    } finally {
      isCheckingOutRef.current = false
      setIsCheckingOut(false)
    }
  }

  return {
    checkoutDate,
    setCheckoutDate,
    extraCharges,
    addExtraCharge,
    removeExtraCharge,
    sudahBayar,
    setSudahBayar,
    billing,
    isCheckingOut,
    executeCheckout,
  }
}
