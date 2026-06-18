import { Loader2 } from "lucide-react"

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "Memuat data..." }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0FAFF] font-sans">
      <Loader2 size={36} className="text-[#F5A940] animate-spin mb-4" />
      <div className="text-[14px] text-[#4A7A8A]">{message}</div>
    </div>
  )
}
