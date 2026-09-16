import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface SudahBayarToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
  showDescription?: boolean
  className?: string
}

export function SudahBayarToggle({
  checked,
  onChange,
  disabled = false,
  label = 'Status Pembayaran',
  showDescription = true,
  className = '',
}: SudahBayarToggleProps) {
  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${
        checked
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              checked
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}
          >
            {checked ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <span>{label}:</span>
              <span
                className={`font-semibold ${
                  checked
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-amber-700 dark:text-amber-300'
                }`}
              >
                {checked ? 'Sudah Lunas' : 'Belum Bayar'}
              </span>
            </div>
            {showDescription && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {checked
                  ? 'Customer sudah membayar di kasir'
                  : 'Tandai jika customer sudah menyelesaikan pembayaran'}
              </p>
            )}
          </div>
        </div>

        <Switch
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          aria-label={label}
        />
      </div>
    </div>
  )
}
