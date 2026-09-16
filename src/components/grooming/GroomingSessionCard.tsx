import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { GroomingSession } from '@/types/pos.types'
import {
  GROOMING_STEP_LABELS,
  GROOMING_STEP_EMOJI,
} from '@/constants/grooming.constants'
import {
  getStatusBadgeConfig,
  openWhatsApp,
  getGroomingReportUrl,
} from '@/utils/grooming.utils'
import { formatRupiah } from '@/utils/pos.utils'
import { GroomingStepProgress } from '@/components/grooming/GroomingStepProgress'
import { ChevronRight, MessageCircle } from 'lucide-react'

interface GroomingSessionCardProps {
  session: GroomingSession
  isMutating?: boolean
  onToggleSudahBayar?: (sessionId: string, status: boolean) => void
  onMarkPickedUp?: (sessionId: string) => void
}

export function GroomingSessionCard({
  session,
  isMutating = false,
  onToggleSudahBayar,
  onMarkPickedUp,
}: GroomingSessionCardProps) {
  const statusBadge = getStatusBadgeConfig(session.status)

  const handleSendWa = () => {
    const reportUrl = getGroomingReportUrl(session.public_token)
    const phone = session.owner?.no_wa
    if (phone) {
      openWhatsApp(
        phone,
        `Halo Kak ${session.owner?.nama || 'Owner'}! 🐾 Berikut link live update grooming ${
          session.cat?.nama || 'si manis'
        }: ${reportUrl}`
      )
    }
  }

  return (
    <Card className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs hover:border-[#F5A940]/50 transition-all">
      <div className="p-3.5 space-y-3">
        {/* TOP ROW: Cat Avatar, Info, Status Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 flex items-center justify-center border border-border">
              {session.cat?.foto_url ? (
                <img
                  src={session.cat.foto_url}
                  alt={session.cat.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">🐱</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground truncate">
                  {session.cat?.nama || 'Kucing'}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                  {session.cat?.ras || 'Domestic'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground font-medium truncate mt-0.5">
                {session.paket} • Rp {formatRupiah(session.harga)}
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <span>Owner: {session.owner?.nama || '-'}</span>
              </div>
            </div>
          </div>

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${statusBadge.color}`}
          >
            {statusBadge.label}
          </span>
        </div>

        {/* STEP PROGRESS & DETAILS */}
        <div className="space-y-1.5 bg-muted/30 p-2.5 rounded-xl border border-border/60">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <span>{GROOMING_STEP_EMOJI[session.current_step]}</span>
              <span className="font-semibold text-foreground">
                {GROOMING_STEP_LABELS[session.current_step]}
              </span>
            </span>
            <div className="flex items-center gap-2">
              {session.sudah_bayar ? (
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  ✓ Lunas
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">
                  Belum Bayar
                </span>
              )}
            </div>
          </div>

          <GroomingStepProgress currentStep={session.current_step} showLabels={false} />
        </div>

        {/* BOTTOM ROW ACTIONS */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            {session.owner?.no_wa && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSendWa}
                className="h-8 px-2 text-[11px] text-[#3AAD7A] hover:bg-[#3AAD7A]/10 rounded-xl cursor-pointer"
                title="Kirim link live via WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1" />
                WA
              </Button>
            )}

            {onToggleSudahBayar && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isMutating}
                onClick={() => onToggleSudahBayar(session.id, !session.sudah_bayar)}
                className={`h-8 px-2 text-[11px] rounded-xl cursor-pointer ${
                  session.sudah_bayar
                    ? 'text-muted-foreground hover:text-foreground'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold'
                }`}
              >
                {session.sudah_bayar ? 'Batalkan Lunas' : 'Tandai Lunas'}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {session.status === 'selesai' && onMarkPickedUp && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isMutating}
                onClick={() => onMarkPickedUp(session.id)}
                className="h-8 px-2.5 text-[11px] rounded-xl font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer"
              >
                Sudah Dijemput
              </Button>
            )}

            <Link to={`/employee/grooming/work?session=${session.id}`}>
              <Button
                size="sm"
                className="h-8 px-3 text-[11px] font-bold rounded-xl bg-[#F5A940] hover:bg-[#e09833] text-white cursor-pointer shadow-xs"
              >
                <span>Buka Meja</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  )
}
