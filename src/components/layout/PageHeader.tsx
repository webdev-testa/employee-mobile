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
    <div className="p-6 pb-5 flex items-center gap-3.5 select-none">
      <Button
        onClick={handleBack}
        disabled={disabled}
        variant="outline"
        size="icon"
        className="cursor-pointer disabled:opacity-50"
      >
        <ChevronLeft size={20} />
      </Button>
      <div className="font-['Syne'] text-[22px] font-bold text-[#1A3A4A] tracking-[-0.3px] truncate">
        {title}
      </div>
    </div>
  )
}
