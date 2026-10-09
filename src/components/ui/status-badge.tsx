import { Badge } from "@/components/ui/badge"

interface AttendanceStatusBadgeProps {
  status: string
  className?: string
}

export function AttendanceStatusBadge({ status, className }: AttendanceStatusBadgeProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ontime":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold"
      case "late":
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
      case "absent":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold"
      case "weekend":
        return "bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20 font-medium"
      case "cuti":
      case "izin":
      case "sakit":
        return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30 font-semibold"
      case "cuti_pending":
      case "izin_pending":
      case "sakit_pending":
        return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 animate-pulse font-semibold"
      case "cuti_rejected":
      case "izin_rejected":
      case "sakit_rejected":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 line-through font-semibold"
      default:
        return "bg-muted text-muted-foreground border-border font-medium"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ontime":
        return "✓ Tepat Waktu"
      case "late":
        return "⏱ Terlambat"
      case "absent":
        return "✗ Tidak Hadir"
      case "weekend":
        return "Weekend"
      case "cuti":
        return "🌴 Cuti"
      case "izin":
        return "📝 Izin"
      case "sakit":
        return "🩺 Sakit"
      case "cuti_pending":
        return "⏳ Cuti (Menunggu)"
      case "izin_pending":
        return "⏳ Izin (Menunggu)"
      case "sakit_pending":
        return "⏳ Sakit (Menunggu)"
      case "cuti_rejected":
        return "✗ Cuti Ditolak"
      case "izin_rejected":
        return "✗ Izin Ditolak"
      case "sakit_rejected":
        return "✗ Sakit Ditolak"
      default:
        return status
    }
  }

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-0.5 text-xs shadow-2xs ${getStatusStyle(status)} ${className || ""}`}
    >
      {getStatusLabel(status)}
    </Badge>
  )
}

interface KasbonStatusBadgeProps {
  status: string
  className?: string
}

export function KasbonStatusBadge({ status, className }: KasbonStatusBadgeProps) {
  const getStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold"
      case 'approved':
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold"
      case 'deducted':
        return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 font-semibold"
      case 'rejected':
        return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold"
      default:
        return "bg-muted text-muted-foreground border-border font-medium"
    }
  }

  const getLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return "⏳ Menunggu"
      case 'approved':
        return "✓ Disetujui"
      case 'deducted':
        return "💳 Dipotong"
      case 'rejected':
        return "✗ Ditolak"
      default:
        return status
    }
  }

  return (
    <Badge
      variant="outline"
      className={`rounded-full px-2.5 py-0.5 text-xs shadow-2xs ${getStyle(status)} ${className || ""}`}
    >
      {getLabel(status)}
    </Badge>
  )
}
