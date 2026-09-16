import { Check } from 'lucide-react'
import { DEFAULT_CONDITION_TAGS } from '@/constants/grooming.constants'

interface ConditionTagPickerProps {
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  tags?: string[]
}

export function ConditionTagPicker({
  selectedTags,
  onToggleTag,
  tags = DEFAULT_CONDITION_TAGS,
}: ConditionTagPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => {
          const isSelected = selectedTags.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                isSelected
                  ? 'bg-[#F5A940] text-white border-[#F5A940] font-semibold shadow-xs'
                  : 'bg-card text-muted-foreground border-border/80 hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5" />}
              <span>{tag}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
