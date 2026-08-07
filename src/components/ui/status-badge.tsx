import { Badge } from "@/components/ui/badge"

interface AttendanceStatusBadgeProps {
  status: string
  className?: string
}

export function AttendanceStatusBadge({ status, className }: AttendanceStatusBadgeProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ontime":
        return "bg-status-success-bg text-status-success border-transparent font-medium"
      case "late":
        return "bg-status-warning-bg text-status-warning border-transparent font-medium"
      case "absent":
        return "bg-status-danger/10 text-status-danger border-transparent font-medium"
      case "weekend":
        return "bg-neutral-100 text-neutral-400 border-transparent font-medium"
      case "cuti":
      case "izin":
      case "sakit":
        return "bg-status-info-bg text-status-info border-status-info-border font-medium"
      case "cuti_pending":
      case "izin_pending":
      case "sakit_pending":
        return "bg-status-info-bg text-status-info border-status-info-border opacity-80 font-medium"
      case "cuti_rejected":
      case "izin_rejected":
      case "sakit_rejected":
        return "bg-status-danger/10 text-status-danger border-status-danger/20 font-medium"
      default:
        return "bg-status-neutral-bg text-status-neutral border-transparent font-medium"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ontime":
        return "Tepat Waktu"
      case "late":
        return "Terlambat"
      case "absent":
        return "Tidak Hadir"
      case "weekend":
        return "Weekend"
      case "cuti":
        return "Cuti"
      case "izin":
        return "Izin"
      case "sakit":
        return "Sakit"
      case "cuti_pending":
        return "Cuti (Menunggu)"
      case "izin_pending":
        return "Izin (Menunggu)"
      case "sakit_pending":
        return "Sakit (Menunggu)"
      case "cuti_rejected":
        return "Cuti Ditolak"
      case "izin_rejected":
        return "Izin Ditolak"
      case "sakit_rejected":
        return "Sakit Ditolak"
      default:
        return status
    }
  }

  return (
    <Badge
      variant="outline"
      className={`${getStatusStyle(status)} ${className || ""}`}
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
        return "bg-status-warning-bg text-status-warning hover:bg-status-warning-bg shadow-none border-transparent font-medium"
      case 'approved':
        return "bg-status-success-bg text-status-success hover:bg-status-success-bg shadow-none border-transparent font-medium"
      case 'deducted':
        return "bg-status-info-bg text-status-info hover:bg-status-info-bg shadow-none border-status-info-border font-medium"
      case 'rejected':
        return "bg-status-danger/10 text-status-danger hover:bg-status-danger/10 shadow-none border-transparent font-medium"
      default:
        return "bg-status-neutral-bg text-status-neutral border-transparent font-medium"
    }
  }

  const getLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return "⏳ Menunggu"
      case 'approved':
        return "✓ Disetujui"
      case 'deducted':
        return "Dipotong"
      case 'rejected':
        return "✗ Ditolak"
      default:
        return status
    }
  }

  return (
    <Badge
      variant="outline"
      className={`${getStyle(status)} ${className || ""}`}
    >
      {getLabel(status)}
    </Badge>
  )
}
