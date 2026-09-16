import { Card } from '@/components/ui/card'
import { Building2, Sparkles } from 'lucide-react'

export default function HotelHome() {
  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center gap-2.5 pt-1 border-b border-border/70 pb-3">
        <div className="w-10 h-10 rounded-2xl bg-[#3AAD7A]/15 text-[#3AAD7A] flex items-center justify-center shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">
            Cat Hotel & Penitipan 🏨
          </h1>
          <p className="text-xs text-muted-foreground">
            Monitoring harian & operasional cat hotel
          </p>
        </div>
      </div>

      <Card className="p-6 rounded-3xl border border-dashed border-border text-center space-y-3 bg-muted/20">
        <div className="w-14 h-14 rounded-full bg-[#3AAD7A]/15 text-[#3AAD7A] flex items-center justify-center mx-auto text-2xl">
          🏨
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-foreground">
            Modul Cat Hotel (Fase 3)
          </h2>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Fitur check-in tamu menginap, checklist laporan harian (makan, minum, feses, urinasi), serta checkout cat hotel akan hadir di Fase 3.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Segera Hadir</span>
        </div>
      </Card>
    </div>
  )
}
