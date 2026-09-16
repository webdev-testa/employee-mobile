import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { posService } from '@/services/posService'
import { useBilling } from '@/hooks/pos/useBilling'
import { BillingSummary } from '@/components/pos/BillingSummary'
import { SudahBayarToggle } from '@/components/shared/SudahBayarToggle'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import type { Booking } from '@/types/pos.types'
import { formatTanggalPendek, formatRupiah, generateCheckoutTemplate } from '@/utils/pos.utils'
import { openWhatsApp } from '@/utils/grooming.utils'

export default function HotelCheckOut() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const bookingId = searchParams.get('bookingId') || searchParams.get('id')

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(Boolean(bookingId))
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)

  // Extra charge form inputs
  const [chargeDesc, setChargeDesc] = useState('')
  const [chargeAmount, setChargeAmount] = useState('')

  useEffect(() => {
    if (!bookingId) return

    let mounted = true

    posService
      .fetchBookingById(bookingId)
      .then(data => {
        if (mounted) {
          setBooking(data)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error('Error loading booking for checkout:', err)
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [bookingId])

  const {
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
  } = useBilling(booking, () => {
    setIsSuccessModalOpen(true)
  })

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseInt(chargeAmount) || 0
    if (amt > 0 && chargeDesc.trim()) {
      addExtraCharge(chargeDesc.trim(), amt)
      setChargeDesc('')
      setChargeAmount('')
    }
  }

  const handleSendWa = () => {
    if (!booking) return
    const phone = booking.owner?.no_wa
    if (phone) {
      const msg = generateCheckoutTemplate(booking, billing)
      openWhatsApp(phone, msg)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground space-y-2">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
        <p className="text-sm">Memuat data check-out...</p>
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 pt-1">
          <Link to="/employee/hotel">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-base font-bold text-foreground">Check-Out Hotel</h1>
        </div>

        <Card className="p-8 text-center rounded-3xl border border-dashed border-border space-y-3 bg-muted/20">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">Data Booking Tidak Ditemukan</p>
            <p className="text-xs text-muted-foreground">
              Booking ID tidak valid atau data telah dihapus.
            </p>
          </div>
          <Link to="/employee/hotel">
            <Button className="rounded-xl text-xs font-semibold">
              Kembali ke Daftar Hotel
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const isAlreadyFinished = booking.status === 'selesai'

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-3 pt-1">
        <Link to="/employee/hotel">
          <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">
            Check-Out & Tagihan 🧾
          </h1>
          <p className="text-xs text-muted-foreground">
            Penyelesaian masa inap dan rincian biaya
          </p>
        </div>
      </div>

      {/* TERMINAL STATUS ALERT */}
      {isAlreadyFinished && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs text-emerald-900 dark:text-emerald-100">
            <span className="font-bold">Booking Telah Selesai:</span> Kucing telah di-checkout pada{' '}
            {formatTanggalPendek(booking.tanggal_keluar_aktual || booking.tanggal_keluar_estimasi)}.
          </div>
        </div>
      )}

      {/* GUEST & OWNER OVERVIEW */}
      <Card className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-muted overflow-hidden flex items-center justify-center font-bold text-xs text-muted-foreground">
            {booking.cat?.foto_url ? (
              <img
                src={booking.cat.foto_url}
                alt={booking.cat.nama}
                className="w-full h-full object-cover"
              />
            ) : (
              '🐱'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base text-foreground truncate">
              {booking.cat?.nama || 'Kucing'}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              Owner: {booking.owner?.nama || '-'} • {booking.owner?.no_wa || '-'}
            </div>
            <div className="text-[11px] text-[#3AAD7A] font-semibold mt-0.5">
              Kamar: {booking.paket} (Rp {formatRupiah(booking.harga_per_hari)}/malam)
            </div>
          </div>
        </div>
      </Card>

      {/* CHECKOUT DATE SELECTION */}
      <Card className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-foreground">Tanggal Check-Out Aktual</label>
          <Input
            type="date"
            disabled={isAlreadyFinished}
            value={checkoutDate}
            min={booking.tanggal_masuk}
            onChange={e => setCheckoutDate(e.target.value)}
            className="h-10 rounded-xl"
          />
          <p className="text-[11px] text-muted-foreground">
            Jumlah malam inap akan otomatis dihitung dari tanggal masuk ({formatTanggalPendek(booking.tanggal_masuk)}) hingga tanggal checkout ini.
          </p>
        </div>
      </Card>

      {/* EXTRA CHARGES FORM */}
      {!isAlreadyFinished && (
        <Card className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs">
          <div>
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wide">
              Biaya Tambahan (Opsional)
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Makanan basah ekstra, pembersihan khusus, obat, dll.
            </p>
          </div>

          <form onSubmit={handleAddCharge} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Keterangan (misal: Pakan Basah Kaleng)"
                value={chargeDesc}
                onChange={e => setChargeDesc(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  Rp
                </span>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Jumlah (Rp)"
                  value={chargeAmount}
                  onChange={e => setChargeAmount(e.target.value)}
                  className="pl-9 h-9 rounded-xl text-xs font-mono"
                />
              </div>
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={!chargeDesc.trim() || !chargeAmount}
              className="w-full rounded-xl text-xs h-8 gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Item Biaya
            </Button>
          </form>

          {/* List of Extra Charges */}
          {extraCharges.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              {extraCharges.map(charge => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-muted/40 text-xs"
                >
                  <div>
                    <div className="font-medium text-foreground">{charge.keterangan}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Rp {formatRupiah(charge.jumlah)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExtraCharge(charge.id)}
                    className="h-7 w-7 flex items-center justify-center text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Hapus item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* BILLING SUMMARY CARD */}
      <BillingSummary
        booking={booking}
        billing={billing}
        checkoutDate={checkoutDate}
        extraCharges={extraCharges}
      />

      {/* SUDAH BAYAR TOGGLE */}
      {!isAlreadyFinished && (
        <Card className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs">
          <SudahBayarToggle
            checked={sudahBayar}
            onChange={val => setSudahBayar(val)}
            label="Tandai Pelunasan Sudah Diterima Tunai/Transfer"
          />
        </Card>
      )}

      {/* CONFIRM CHECKOUT BUTTON */}
      {!isAlreadyFinished && (
        <div className="pt-2">
          <Button
            type="button"
            onClick={executeCheckout}
            disabled={isCheckingOut}
            className="w-full h-12 rounded-xl font-bold bg-[#3AAD7A] hover:bg-[#3AAD7A]/90 text-white cursor-pointer flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {isCheckingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Memproses Check-Out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Konfirmasi Check-Out & Selesai
              </>
            )}
          </Button>
        </div>
      )}

      {/* SUCCESS DIALOG */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Check-Out Berhasil Selesai! 🎉
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Masa inap untuk {booking.cat?.nama} telah diselesaikan.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Tagihan:</span>
              <span className="font-bold text-foreground">Rp {formatRupiah(billing.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sisa Pelunasan:</span>
              <span className={`font-bold ${billing.sisa_bayar <= 0 ? 'text-emerald-600' : 'text-primary'}`}>
                Rp {formatRupiah(billing.sisa_bayar)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status Pembayaran:</span>
              <span className="font-bold text-foreground">
                {sudahBayar || billing.sisa_bayar <= 0 ? 'Lunas' : 'Belum Lunas'}
              </span>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:gap-0">
            <Button
              type="button"
              onClick={handleSendWa}
              className="w-full h-11 rounded-xl font-bold bg-[#25D366] hover:bg-[#25D366]/90 text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Kirim Kwitansi WhatsApp ke Owner
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSuccessModalOpen(false)
                navigate('/employee/hotel')
              }}
              className="w-full h-11 rounded-xl font-semibold cursor-pointer"
            >
              Kembali ke Cat Hotel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
