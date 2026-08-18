import { useNavigate } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title: string
  onBack?: () => void
  disabled?: boolean
}

export function PageHeader({ title, onBack, disabled = false }: PageHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (disabled) return
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <div className="p-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-4 flex items-center gap-3.5 select-none bg-card/60 backdrop-blur-md border-b border-border/60 sticky top-0 z-20">
      <Button
        onClick={handleBack}
        disabled={disabled}
        variant="outline"
        size="icon"
        aria-label="Go back"
        className="h-10 w-10 min-h-[44px] min-w-[44px] cursor-pointer disabled:opacity-50 rounded-2xl bg-muted/60 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 border-border transition-all active:scale-95"
      >
        <ChevronLeft size={20} />
      </Button>
      <div className="font-display text-lg font-bold text-foreground tracking-tight truncate">
        {title}
      </div>
    </div>
  )
}
