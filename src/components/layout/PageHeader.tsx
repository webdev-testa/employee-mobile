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
    <div className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] pb-5 flex items-center gap-3.5 select-none">
      <Button
        onClick={handleBack}
        disabled={disabled}
        variant="outline"
        size="icon"
        aria-label="Go back"
        className="h-11 w-11 min-h-[44px] min-w-[44px] cursor-pointer disabled:opacity-50 rounded-xl"
      >
        <ChevronLeft size={20} />
      </Button>
      <div className="font-display text-[22px] font-bold text-foreground tracking-[-0.3px] truncate">
        {title}
      </div>
    </div>
  )
}
