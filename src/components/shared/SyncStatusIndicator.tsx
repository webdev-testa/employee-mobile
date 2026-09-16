import React from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useOfflineSync } from '@/hooks/useOfflineSync'

interface SyncStatusIndicatorProps {
  className?: string
  showLabel?: boolean
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOfflineSync()

  if (!isOnline) {
    return (
      <button
        type="button"
        onClick={() => triggerSync()}
        title="Perangkat Offline — Perubahan disimpan lokal"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <WifiOff className="w-3.5 h-3.5" />
        {showLabel && (
          <span>{pendingCount > 0 ? `Offline (${pendingCount})` : 'Offline'}</span>
        )}
      </button>
    )
  }

  if (isSyncing) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 ${className}`}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        {showLabel && <span>Sinkronisasi...</span>}
      </div>
    )
  }

  if (pendingCount > 0) {
    return (
      <button
        type="button"
        onClick={() => triggerSync()}
        title="Ada data lokal menunggu sinkronisasi"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 cursor-pointer ${className}`}
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {showLabel && <span>Sinkron ({pendingCount})</span>}
      </button>
    )
  }

  return (
    <div
      title="Terhubung ke server & tersinkronisasi"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium text-muted-foreground ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      {showLabel && <span className="text-[11px]">Online</span>}
    </div>
  )
}
