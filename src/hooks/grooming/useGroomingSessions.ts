import { useState, useEffect, useCallback } from 'react'
import { groomingService } from '@/services/groomingService'
import type { GroomingSession, GroomingStep, GroomingStatus } from '@/types/pos.types'
import { toast } from 'sonner'

export function useGroomingSessions(filter?: { date?: string; status?: string }) {
  const [sessions, setSessions] = useState<GroomingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mutatingSessionId, setMutatingSessionId] = useState<string | null>(null)

  const loadSessions = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      const data = await groomingService.fetchSessions(filter)
      setSessions(data)
      setError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat sesi grooming'
      setError(msg)
      console.error('Error in useGroomingSessions:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => {
    let mounted = true
    groomingService
      .fetchSessions(filter)
      .then(data => {
        if (mounted) {
          setSessions(data)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Gagal memuat sesi grooming'
          setError(msg)
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [filter])

  const updateStep = useCallback(
    async (params: {
      sessionId: string
      step: GroomingStep
      extra?: {
        status?: GroomingStatus
        catatan?: string
        foto_url?: string
      }
    }) => {
      try {
        await groomingService.updateStep(params.sessionId, params.step, params.extra)
        // Refresh local sessions state
        await loadSessions()
        return { success: true }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal memperbarui tahapan grooming'
        toast.error(msg)
        return { success: false, error: msg }
      }
    },
    [loadSessions]
  )

  const toggleSudahBayar = useCallback(
    async (sessionId: string, status: boolean) => {
      if (mutatingSessionId === sessionId) {
        return { success: false, error: 'Operasi sedang berjalan' }
      }
      setMutatingSessionId(sessionId)
      try {
        await groomingService.toggleSudahBayar(sessionId, status)
        setSessions(prev =>
          prev.map(s => (s.id === sessionId ? { ...s, sudah_bayar: status } : s))
        )
        toast.success(status ? 'Pembayaran ditandai Lunas' : 'Status pembayaran diubah')
        return { success: true }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal mengubah status pembayaran'
        toast.error(msg)
        return { success: false, error: msg }
      } finally {
        setMutatingSessionId(null)
      }
    },
    [mutatingSessionId]
  )

  const markPickedUp = useCallback(
    async (sessionId: string) => {
      if (mutatingSessionId === sessionId) {
        return { success: false, error: 'Operasi sedang berjalan' }
      }
      setMutatingSessionId(sessionId)
      try {
        await groomingService.markPickedUp(sessionId)
        setSessions(prev =>
          prev.map(s => (s.id === sessionId ? { ...s, status: 'dijemput' } : s))
        )
        toast.success('Kucing berhasil ditandai sudah dijemput!')
        return { success: true }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal mengubah status dijemput'
        toast.error(msg)
        return { success: false, error: msg }
      } finally {
        setMutatingSessionId(null)
      }
    },
    [mutatingSessionId]
  )

  return {
    sessions,
    loading,
    refreshing,
    error,
    mutatingSessionId,
    refetch: () => loadSessions(true),
    updateStep,
    toggleSudahBayar,
    markPickedUp,
  }
}
