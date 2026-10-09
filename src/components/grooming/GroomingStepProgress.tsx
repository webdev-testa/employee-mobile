import type { GroomingStep } from '@/types/pos.types'
import {
  GROOMING_STEPS,
  GROOMING_STEP_SHORT_LABELS,
  GROOMING_STEP_EMOJI,
} from '@/constants/grooming.constants'
import { getGroomingProgressPercent, isStepCompleted } from '@/utils/grooming.utils'
import { Check } from 'lucide-react'

interface GroomingStepProgressProps {
  currentStep: GroomingStep
  className?: string
  showLabels?: boolean
}

export function GroomingStepProgress({
  currentStep,
  className = '',
  showLabels = true,
}: GroomingStepProgressProps) {
  const percent = getGroomingProgressPercent(currentStep)

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#F5A940] to-[#3AAD7A] transition-all duration-300 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Step Nodes */}
      {showLabels && (
        <div className="flex justify-between items-start gap-1">
          {GROOMING_STEPS.map(step => {
            const isCompleted = isStepCompleted(step, currentStep)
            const isCurrent = step === currentStep

            return (
              <div
                key={step}
                className="flex flex-col items-center text-center min-w-0 flex-1"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all mb-1 ${
                    isCurrent
                      ? 'bg-[#F5A940] text-white ring-2 ring-[#F5A940]/40 font-bold scale-110 shadow-xs'
                      : isCompleted
                      ? 'bg-[#3AAD7A] text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <span>{GROOMING_STEP_EMOJI[step]}</span>
                  )}
                </div>
                <span
                  className={`text-[9px] truncate max-w-[48px] ${
                    isCurrent
                      ? 'font-bold text-[#F5A940]'
                      : isCompleted
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {GROOMING_STEP_SHORT_LABELS[step]}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
