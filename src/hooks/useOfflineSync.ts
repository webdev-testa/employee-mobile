import { useState, useEffect, useRef, useCallback } from 'react'
import { offlineQueue } from '@/lib/offlineQueue'
import { useNetworkStatus } from './useNetworkStatus'
import { toast } from 'sonner'

let globalIsSyncing = false
let globalLastSyncedAt: Date | null = null
let lastToastTimestamp = 0

function notifySyncStatus(syncing: boolean): void {
  globalIsSyncing = syncing
  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof CustomEvent === 'function'
  ) {
    try {
      window.dispatchEvent(
        new CustomEvent('offline-sync-status', { detail: { isSyncing: syncing } })
      )
    } catch {
      // Safe fallback
    }
  }
}

function showToastOnce(type: 'success' | 'info' | 'error', message: string): void {
  const now = Date.now()
  if (now - lastToastTimestamp < 1500) return
  lastToastTimestamp = now
  if (type === 'success') toast.success(message)
  else if (type === 'error') toast.error(message)
  else toast.info(message)
}

export function useOfflineSync() {
  const { isOnline } = useNetworkStatus()
  const [pendingCount, setPendingCount] = useState<number>(() => offlineQueue.getPendingCount())
  const [isSyncing, setIsSyncing] = useState<boolean>(() => globalIsSyncing)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => globalLastSyncedAt)
  const wasOfflineRef = useRef(!isOnline)
  const initialCheckedRef = useRef(false)

  // Listen for queue changes and global sync status
  useEffect(() => {
    const handleQueueChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>
      if (typeof customEvent.detail?.count === 'number') {
        setPendingCount(customEvent.detail.count)
      } else {
        setPendingCount(offlineQueue.getPendingCount())
      }
    }

    const handleSyncStatus = (e: Event) => {
      const customEvent = e as CustomEvent<{ isSyncing: boolean }>
      if (typeof customEvent.detail?.isSyncing === 'boolean') {
        setIsSyncing(customEvent.detail.isSyncing)
      }
    }

    window.addEventListener('offline-queue-changed', handleQueueChange)
    window.addEventListener('offline-sync-status', handleSyncStatus)
    return () => {
      window.removeEventListener('offline-queue-changed', handleQueueChange)
      window.removeEventListener('offline-sync-status', handleSyncStatus)
    }
  }, [])

  const triggerSync = useCallback(async () => {
    if (globalIsSyncing) return
    if (!isOnline) {
      showToastOnce('info', 'Perangkat masih dalam keadaan offline')
      return
    }

    const currentPending = offlineQueue.getPendingCount()
    if (currentPending === 0) return

    notifySyncStatus(true)
    setIsSyncing(true)

    try {
      const res = await offlineQueue.flush()
      if (res.successCount > 0) {
        showToastOnce('success', `${res.successCount} data berhasil disinkronkan ke server!`)
        const now = new Date()
        globalLastSyncedAt = now
        setLastSyncedAt(now)
      }
      if (res.failCount > 0) {
        showToastOnce('error', `${res.failCount} data gagal disinkronkan. Akan dicoba lagi nanti.`)
      }
    } catch (err: unknown) {
      console.error('Error during offline queue sync:', err)
    } finally {
      notifySyncStatus(false)
      setIsSyncing(false)
      setPendingCount(offlineQueue.getPendingCount())
    }
  }, [isOnline])

  // Defect 5: Trigger sync on mount if online with pending items
  useEffect(() => {
    if (isOnline && !initialCheckedRef.current) {
      initialCheckedRef.current = true
      if (offlineQueue.getPendingCount() > 0) {
        const timer = setTimeout(() => {
          void triggerSync()
        }, 0)
        return () => clearTimeout(timer)
      }
    }
  }, [isOnline, triggerSync])

  // Defect 6: Auto-sync when transitioning from offline to online (with debounced toast)
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      showToastOnce('success', 'Koneksi internet kembali! Memulai sinkronisasi data...')
      const timer = setTimeout(() => {
        void triggerSync()
      }, 0)
      wasOfflineRef.current = false
      return () => clearTimeout(timer)
    }
    wasOfflineRef.current = !isOnline
  }, [isOnline, triggerSync])

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncedAt,
    triggerSync,
  }
}
