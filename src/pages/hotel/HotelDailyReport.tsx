import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useActiveBookings } from '@/hooks/pos/useActiveBookings'
import { DailyReportModal } from '@/components/pos/DailyReportModal'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  FileEdit,
  CheckCircle2,
  MessageCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import type { Booking } from '@/types/pos.types'
import { hitungHariMenginap } from '@/utils/pos.utils'
import { openWhatsApp } from '@/utils/grooming.utils'

export default function HotelDailyReport() {
  const [filterTab, setFilterTab] = useState<'pending' | 'completed'>('pending')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const {
    activeBookings,
    today,
    loading,
    refreshing,
    refetch,
  } = useActiveBookings()

  const pendingList = useMemo(() => {
    return activeBookings.filter(b => !b.sudah_laporan)
  }, [activeBookings])

  const completedList = useMemo(() => {
    return activeBookings.filter(b => b.sudah_laporan)
  }, [activeBookings])

  const displayedList = filterTab === 'pending' ? pendingList : completedList

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3">
          <Link to="/employee/hotel">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              Laporan Harian Tamu 📋
            </h1>
            <p className="text-xs text-muted-foreground">
              Pemantauan nafsu makan, minum, feses & urinasi
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={refreshing}
          className="h-8 w-8 p-0 rounded-xl cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* FILTER TABS */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-2xl border border-border/80">
        <button
          type="button"
          onClick={() => setFilterTab('pending')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            filterTab === 'pending'
              ? 'bg-amber-500/20 text-amber-900 dark:text-amber-100 border border-amber-500/40 shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileEdit className="w-3.5 h-3.5 text-amber-600" />
          <span>Belum Lapor ({pendingList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('completed')}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            filterTab === 'completed'
              ? 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border border-emerald-500/40 shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sudah Lapor ({completedList.length})</span>
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p>Memuat daftar tamu hotel...</p>
          </div>
        ) : displayedList.length === 0 ? (
          <div className="p-8 rounded-3xl border border-dashed border-border text-center space-y-3 bg-muted/20">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {filterTab === 'pending'
                  ? 'Luar biasa! Semua tamu sudah dilaporkan hari ini 🎉'
                  : 'Belum ada laporan harian yang dicatat hari ini.'}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {filterTab === 'pending'
                  ? 'Semua data pemantauan kesehatan tamu hotel untuk hari ini telah lengkap.'
                  : 'Pilih tab "Belum Lapor" untuk mulai mengisi checklist kesehatan tamu.'}
              </p>
            </div>
          </div>
        ) : (
          displayedList.map(booking => {
            const cat = booking.cat
            const owner = booking.owner
            const dayNumber = hitungHariMenginap(booking.tanggal_masuk, today)
            const todayReport = (booking.daily_reports || []).find(r => r.tanggal === today)

            return (
              <Card
                key={booking.id}
                className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-muted overflow-hidden flex items-center justify-center font-bold text-xs text-muted-foreground">
                      {cat?.foto_url ? (
                        <img
                          src={cat.foto_url}
                          alt={cat.nama}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        '🐱'
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <span>{cat?.nama || 'Kucing'}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          Hari ke-{dayNumber}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Owner: {owner?.nama || '-'} • {booking.paket}
                      </div>
                    </div>
                  </div>

                  {booking.sudah_laporan ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                      <CheckCircle2 className="w-3 h-3" /> Lengkap
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 animate-pulse">
                      <Clock className="w-3 h-3" /> Perlu Diisi
                    </span>
                  )}
                </div>

                {/* Report preview summary if completed */}
                {todayReport && (
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                    <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Ringkasan Catatan:</span>
                      <span>Makan: {todayReport.nafsu_makan}</span>
                    </div>
                    {todayReport.kondisi_umum && (
                      <p className="text-foreground text-[11px]">
                        "{todayReport.kondisi_umum}"
                      </p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="pt-1 flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => setSelectedBooking(booking)}
                    className="flex-1 h-9 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    {booking.sudah_laporan ? 'Edit / Lihat Laporan' : 'Catat Laporan Sekarang'}
                  </Button>

                  {owner?.no_wa && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        openWhatsApp(
                          owner.no_wa,
                          `Halo Kak ${owner.nama || 'Owner'}! 🐾 Update harian ${cat?.nama || 'kucing'} hari ke-${dayNumber}: Kucing sedang dalam perawatan dan pengawasan tim Dr. Meow.`
                        )
                      }}
                      className="h-9 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-[#25D366] cursor-pointer"
                      title="Chat WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* DAILY REPORT MODAL */}
      <DailyReportModal
        booking={selectedBooking}
        isOpen={selectedBooking !== null}
        onClose={() => setSelectedBooking(null)}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
