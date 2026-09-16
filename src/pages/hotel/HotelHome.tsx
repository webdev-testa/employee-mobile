import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useActiveBookings } from '@/hooks/pos/useActiveBookings'
import { ActiveBookingCard } from '@/components/pos/ActiveBookingCard'
import { DailyReportModal } from '@/components/pos/DailyReportModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Booking } from '@/types/pos.types'
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  FileEdit,
  LogOut,
  ClipboardList,
} from 'lucide-react'

export default function HotelHome() {
  const [filterStatus, setFilterStatus] = useState<'all' | 'belum_laporan' | 'checkout_today'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReportBooking, setSelectedReportBooking] = useState<Booking | null>(null)

  const {
    activeBookings,
    today,
    tomorrow,
    metrics,
    loading,
    refreshing,
    refetch,
  } = useActiveBookings()

  const filteredBookings = useMemo(() => {
    return activeBookings.filter(b => {
      // Filter status
      if (filterStatus === 'belum_laporan' && b.sudah_laporan) return false
      if (filterStatus === 'checkout_today' && b.tanggal_keluar_estimasi !== today) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const catName = (b.cat?.nama || '').toLowerCase()
        const ownerName = (b.owner?.nama || '').toLowerCase()
        const ras = (b.cat?.ras || '').toLowerCase()
        return catName.includes(q) || ownerName.includes(q) || ras.includes(q)
      }

      return true
    })
  }, [activeBookings, filterStatus, searchQuery, today])

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#3AAD7A]/15 text-[#3AAD7A] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              Cat Hotel & Boarding 🏨
            </h1>
            <p className="text-xs text-muted-foreground">
              Monitoring harian & operasional cat hotel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link to="/employee/hotel/report">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-xl text-xs gap-1 cursor-pointer"
              title="Cek Laporan Cepat"
            >
              <ClipboardList className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Laporan Cepat</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={refreshing}
            className="h-8 w-8 p-0 rounded-xl cursor-pointer"
            title="Refresh data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* METRIC COUNTER CHIPS */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'all' ? 'all' : 'all')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'all'
              ? 'bg-[#3AAD7A]/20 border-[#3AAD7A] ring-1 ring-[#3AAD7A] shadow-xs'
              : 'bg-[#3AAD7A]/10 border-[#3AAD7A]/20 hover:bg-[#3AAD7A]/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-200 uppercase">
              Menginap
            </span>
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-950 dark:text-emerald-50 mt-1">
            {metrics.menginapCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'belum_laporan' ? 'all' : 'belum_laporan')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'belum_laporan'
              ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500 shadow-xs'
              : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase">
              Perlu Lapor
            </span>
            <FileEdit className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
            {metrics.belumLaporanCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'checkout_today' ? 'all' : 'checkout_today')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'checkout_today'
              ? 'bg-rose-500/20 border-rose-500 ring-1 ring-rose-500 shadow-xs'
              : 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 uppercase">
              Keluar Hari Ini
            </span>
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-900 dark:text-rose-100 mt-1">
            {metrics.checkoutHariIniCount}
          </div>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Cari nama kucing atau owner..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9 pr-4 h-10 rounded-2xl bg-card border-border/80 text-sm"
        />
      </div>

      {/* LIST OF BOOKINGS */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p>Memuat data tamu hotel...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/80 p-8 text-center space-y-3 bg-muted/20">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                {searchQuery || filterStatus !== 'all'
                  ? 'Tidak ada tamu yang cocok dengan filter'
                  : 'Belum ada tamu menginap aktif'}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {searchQuery || filterStatus !== 'all'
                  ? 'Coba ubah kata kunci pencarian atau filter status di atas.'
                  : 'Gunakan tombol Check-In Tamu untuk mencatat kucing baru yang menginap.'}
              </p>
            </div>
            {!searchQuery && filterStatus === 'all' && (
              <Link to="/employee/hotel/checkin">
                <Button className="rounded-xl h-10 px-4 text-xs font-semibold bg-[#3AAD7A] hover:bg-[#3AAD7A]/90 text-white gap-1.5 cursor-pointer">
                  <Plus className="w-4 h-4" />
                  Check-In Tamu Sekarang
                </Button>
              </Link>
            )}
          </div>
        ) : (
          filteredBookings.map(b => (
            <ActiveBookingCard
              key={b.id}
              booking={b}
              today={today}
              tomorrow={tomorrow}
              onOpenReport={booking => setSelectedReportBooking(booking)}
            />
          ))
        )}
      </div>

      {/* FLOATING ACTION BUTTON (CHECK-IN) */}
      <div className="fixed bottom-20 right-4 z-40">
        <Link to="/employee/hotel/checkin">
          <Button
            className="h-12 px-4 rounded-full shadow-lg bg-[#3AAD7A] hover:bg-[#3AAD7A]/90 text-white font-bold flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Check-In Tamu</span>
          </Button>
        </Link>
      </div>

      {/* DAILY REPORT MODAL */}
      <DailyReportModal
        booking={selectedReportBooking}
        isOpen={selectedReportBooking !== null}
        onClose={() => setSelectedReportBooking(null)}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
