import { Loader2 } from "lucide-react"

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = "Memuat data..." }: LoadingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background font-sans">
      <Loader2 size={36} className="text-[#0c1d2a] dark:text-[#faf8f5] animate-spin mb-4" />
      <div className="text-sm font-medium text-muted-foreground">{message}</div>
    </div>
  )
}
