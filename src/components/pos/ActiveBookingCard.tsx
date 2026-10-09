import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Calendar,
  Clock,
  Phone,
  FileCheck,
  FileEdit,
  LogOut,
  Sparkles,
  MessageCircle,
} from 'lucide-react'
import { formatTanggalPendek, formatRupiah, hitungHariMenginap } from '@/utils/pos.utils'
import { openWhatsApp } from '@/utils/grooming.utils'
import type { Booking } from '@/types/pos.types'

interface ActiveBookingCardProps {
  booking: Booking
  today: string
  tomorrow: string
  onOpenReport?: (booking: Booking) => void
}

export function ActiveBookingCard({
  booking,
  today,
  tomorrow,
  onOpenReport,
}: ActiveBookingCardProps) {
  const cat = booking.cat
  const owner = booking.owner

  const daysStayed = hitungHariMenginap(booking.tanggal_masuk, today)
  const isCheckoutToday = booking.tanggal_keluar_estimasi === today
  const isCheckoutTomorrow = booking.tanggal_keluar_estimasi === tomorrow
  const isOverdue = booking.tanggal_keluar_estimasi < today

  const handleSendWa = () => {
    if (owner?.no_wa) {
      openWhatsApp(
        owner.no_wa,
        `Halo Kak ${owner.nama || 'Owner'}! 🐾 Update hotel dari ${cat?.nama || 'kucing kesayangan'} di Dr. Meow: Kucing saat ini dalam kondisi baik dan sehat. Terima kasih!`
      )
    }
  }

  return (
    <Card className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-[#F5A940]/50 transition-all p-3.5 space-y-3">
      {/* TOP ROW: Badges & Stay day */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {booking.sudah_laporan ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <FileCheck className="w-3 h-3" />
              Sudah Laporan
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 animate-pulse">
              <FileEdit className="w-3 h-3" />
              Belum Laporan
            </span>
          )}

          {isCheckoutToday && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20">
              🔔 Keluar Hari Ini
            </span>
          )}
          {isCheckoutTomorrow && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/20">
              ⏳ Keluar Besok
            </span>
          )}
          {isOverdue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30">
              ⚠️ Lewat Jadwal
            </span>
          )}
        </div>

        <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
          Hari ke-{daysStayed}
        </span>
      </div>

      {/* CAT & OWNER INFO */}
      <div className="flex items-start gap-3">
        <div className="relative w-13 h-13 rounded-xl overflow-hidden bg-muted border border-border shrink-0 flex items-center justify-center">
          {cat?.foto_url ? (
            <img
              src={cat.foto_url}
              alt={cat.nama}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-2xl">🐱</span>
          )}
          <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8.5px] text-center font-mono py-0.2 uppercase">
            {cat?.jenis_kelamin || 'Kucing'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-foreground truncate">
              {cat?.nama || 'Tanpa Nama'}
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
              {cat?.ras || 'Domestic'}
            </span>
          </div>

          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span className="font-semibold text-foreground/80 truncate">
              Owner: {owner?.nama || '-'}
            </span>
            {owner?.no_wa && (
              <>
                <span>•</span>
                <span className="font-mono text-[10.5px] flex items-center gap-0.5">
                  <Phone className="w-2.5 h-2.5" />
                  {owner.no_wa}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* STAY DETAILS BOX */}
      <div className="grid grid-cols-2 gap-2 p-2 bg-muted/40 border border-border/60 rounded-xl text-[11px]">
        <div>
          <div className="text-[9.5px] uppercase font-mono tracking-wider text-muted-foreground">
            Paket Kamar
          </div>
          <div className="font-semibold text-foreground flex items-center gap-1 mt-0.5 truncate">
            <Sparkles className="w-3 h-3 text-[#F5A940] shrink-0" />
            <span className="truncate">{booking.paket}</span>
          </div>
          <div className="text-[10.5px] text-muted-foreground font-mono tabular-nums">
            Rp {formatRupiah(booking.harga_per_hari)}/malam
          </div>
        </div>

        <div>
          <div className="text-[9.5px] uppercase font-mono tracking-wider text-muted-foreground">
            Periode
          </div>
          <div className="font-medium text-foreground flex items-center gap-1 mt-0.5 truncate">
            <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate">{formatTanggalPendek(booking.tanggal_masuk)}</span>
          </div>
          <div className="text-[10.5px] text-muted-foreground flex items-center gap-1 truncate">
            <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate">s/d {formatTanggalPendek(booking.tanggal_keluar_estimasi)}</span>
          </div>
        </div>
      </div>

      {booking.catatan && (
        <div className="text-[10.5px] text-muted-foreground italic line-clamp-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
          &quot;{booking.catatan}&quot;
        </div>
      )}

      {/* BOTTOM ACTIONS */}
      <div className="pt-2 border-t border-border/60 flex items-center gap-2">
        {owner?.no_wa && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSendWa}
            className="h-8 px-2 text-[11px] text-[#3AAD7A] hover:bg-[#3AAD7A]/10 rounded-xl cursor-pointer"
            title="Kirim pesan WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1" />
            WA
          </Button>
        )}

        {onOpenReport && (
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenReport(booking)}
            className={`flex-1 text-xs h-8 font-semibold cursor-pointer rounded-xl ${
              booking.sudah_laporan
                ? 'bg-muted text-foreground hover:bg-muted/80'
                : 'bg-[#F5A940] hover:bg-[#e09833] text-white shadow-xs'
            }`}
          >
            <FileEdit className="w-3.5 h-3.5 mr-1" />
            {booking.sudah_laporan ? 'Update Laporan' : 'Catat Laporan'}
          </Button>
        )}

        <Link to={`/employee/hotel/checkout?bookingId=${booking.id}`}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold rounded-xl border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 cursor-pointer"
            title="Check Out Kucing Ini"
          >
            <LogOut className="w-3.5 h-3.5 mr-1" />
            Check-out
          </Button>
        </Link>
      </div>
    </Card>
  )
}
