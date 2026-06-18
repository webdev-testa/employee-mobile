import { Badge } from "@/components/ui/badge"

interface AttendanceStatusBadgeProps {
  status: string
  className?: string
}

export function AttendanceStatusBadge({ status, className }: AttendanceStatusBadgeProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "ontime":
        return "bg-[#E2F0E8] text-[#3AAD7A] border-transparent"
      case "late":
        return "bg-[#FAF0E1] text-[#E89E3A] border-transparent"
      case "absent":
        return "bg-[#F87171]/10 text-[#F87171] border-transparent"
      case "weekend":
        return "bg-neutral-100 text-neutral-400 border-transparent"
      case "cuti":
      case "izin":
      case "sakit":
        return "bg-[#F0FAFF] text-[#4A7A8A] border-[#C8E8F5]"
      case "cuti_pending":
      case "izin_pending":
      case "sakit_pending":
        return "bg-[#F0FAFF] text-[#4A7A8A] border-[#C8E8F5] opacity-80"
      case "cuti_rejected":
      case "izin_rejected":
      case "sakit_rejected":
        return "bg-[#F87171]/10 text-[#F87171] border-[#F87171]/20"
      default:
        return "bg-[#EDEAE4] text-[#A8A49E] border-transparent"
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
        return "bg-[#FAF0E1] text-[#E89E3A] hover:bg-[#FAF0E1] shadow-none border-transparent font-medium"
      case 'approved':
        return "bg-[#E2F0E8] text-[#3AAD7A] hover:bg-[#E2F0E8] shadow-none border-transparent font-medium"
      case 'deducted':
        return "bg-[#F0FAFF] text-[#4A7A8A] hover:bg-[#F0FAFF] shadow-none border-[#C8E8F5] font-medium"
      case 'rejected':
        return "bg-[#F87171]/10 text-[#F87171] hover:bg-[#F87171]/10 shadow-none border-transparent font-medium"
      default:
        return "bg-[#EDEAE4] text-[#A8A49E] border-transparent font-medium"
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
