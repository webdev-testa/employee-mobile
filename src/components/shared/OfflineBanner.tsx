import React from 'react'
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import { Button } from '@/components/ui/button'

export const OfflineBanner: React.FC = () => {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOfflineSync()

  // If online and no pending items, hide banner
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full px-4 py-2.5 text-xs font-medium border-b transition-all flex items-center justify-between gap-3 shadow-xs ${
        !isOnline
          ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-100'
          : isSyncing
          ? 'bg-blue-500/15 border-blue-500/30 text-blue-900 dark:text-blue-100 animate-pulse'
          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-900 dark:text-emerald-100'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!isOnline ? (
          <div className="relative flex items-center justify-center">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
          </div>
        ) : isSyncing ? (
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        )}

        <div className="truncate">
          {!isOnline ? (
            <span>
              <strong className="font-semibold">Mode Offline:</strong> Tidak ada internet. Data tersimpan di HP.
            </span>
          ) : isSyncing ? (
            <span>Menyinkronkan data perubahan ke server...</span>
          ) : (
            <span>Koneksi kembali normal. Siap sinkronisasi.</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {pendingCount > 0 && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              !isOnline
                ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                : 'bg-blue-500/20 text-blue-800 dark:text-blue-200'
            }`}
          >
            {pendingCount} Tertunda
          </span>
        )}

        {isOnline && pendingCount > 0 && !isSyncing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerSync()}
            className="h-7 px-2.5 text-[11px] font-bold rounded-lg gap-1 border-emerald-500/40 hover:bg-emerald-500/20 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Sinkronkan
          </Button>
        )}
      </div>
    </div>
  )
}
