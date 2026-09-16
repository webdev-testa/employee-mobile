import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGroomingSessions } from '@/hooks/grooming/useGroomingSessions'
import { GroomingSessionCard } from '@/components/grooming/GroomingSessionCard'
import { Button } from '@/components/ui/button'
import {
  Scissors,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react'

export default function GroomingHome() {
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const { sessions, loading, refreshing, mutatingSessionId, refetch, toggleSudahBayar, markPickedUp } =
    useGroomingSessions()

  const antrianCount = sessions.filter(s => s.status === 'antrian').length
  const dikerjakanCount = sessions.filter(s => s.status === 'dikerjakan').length
  const selesaiCount = sessions.filter(s => s.status === 'selesai').length

  const filteredSessions = sessions.filter(s => {
    if (filterStatus === 'all') return true
    return s.status === filterStatus
  })

  return (
    <div className="space-y-4 p-4 pb-20">
      {/* HEADER BAR */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#F5A940]/15 text-[#F5A940] flex items-center justify-center shrink-0">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground leading-tight">
              Salon Grooming ✂️
            </h1>
            <p className="text-xs text-muted-foreground">
              Manajemen antrian & pengerjaan grooming
            </p>
          </div>
        </div>

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

      {/* METRIC COUNTER CHIPS */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'antrian' ? 'all' : 'antrian')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'antrian'
              ? 'bg-amber-500/20 border-amber-500 ring-1 ring-amber-500 shadow-xs'
              : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase">
              Antrian
            </span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
            {antrianCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'dikerjakan' ? 'all' : 'dikerjakan')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'dikerjakan'
              ? 'bg-blue-500/20 border-blue-500 ring-1 ring-blue-500 shadow-xs'
              : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase">
              Dikerjakan
            </span>
            <Scissors className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
            {dikerjakanCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilterStatus(filterStatus === 'selesai' ? 'all' : 'selesai')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'selesai'
              ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-500 shadow-xs'
              : 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase">
              Selesai
            </span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-900 dark:text-emerald-100 mt-1">
            {selesaiCount}
          </div>
        </button>
      </div>

      {/* QUICK ACTIONS BANNER */}
      <div className="grid grid-cols-2 gap-2">
        <Link to="/employee/grooming/checkin" className="block">
          <Button className="w-full h-12 bg-[#F5A940] hover:bg-[#e09833] text-white rounded-2xl font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>Check-in Baru</span>
          </Button>
        </Link>

        <Link to="/employee/grooming/work" className="block">
          <Button
            variant="outline"
            className="w-full h-12 border-[#F5A940]/50 text-foreground bg-card hover:bg-[#F5A940]/10 rounded-2xl font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Scissors className="w-4 h-4 text-[#F5A940]" />
            <span>Buka Meja Kerja</span>
          </Button>
        </Link>
      </div>

      {/* QUEUE LIST SECTION */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase font-mono text-muted-foreground tracking-wider">
            Daftar Antrian Hari Ini ({filteredSessions.length})
          </h2>

          {filterStatus !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className="text-[11px] text-[#F5A940] font-semibold cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Memuat sesi grooming...
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="space-y-3">
            {filteredSessions.map(session => (
              <GroomingSessionCard
                key={session.id}
                session={session}
                isMutating={mutatingSessionId === session.id}
                onToggleSudahBayar={toggleSudahBayar}
                onMarkPickedUp={markPickedUp}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 px-4 rounded-2xl border border-dashed border-border text-center space-y-2.5">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-2xl">
              🐱
            </div>
            <div className="text-xs font-bold text-foreground">
              {filterStatus === 'all'
                ? 'Belum ada kucing di antrian grooming hari ini.'
                : `Tidak ada sesi dengan status '${filterStatus}'.`}
            </div>
            <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
              Ketuk tombol &quot;Check-in Baru&quot; di atas untuk mendaftarkan kucing yang baru datang.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
