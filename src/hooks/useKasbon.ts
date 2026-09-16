import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Kasbon } from '@/types'

interface UseKasbonReturn {
  history: Kasbon[]
  usedThisMonth: number
  kasbonLimit: number
  remainingLimit: number
  pendingCount: number
  loading: boolean
  error: string | null
  refreshing: boolean
  refresh: () => Promise<void>
  submitKasbon: (amount: number, reason: string, category: string) => Promise<{ success: boolean; error?: string }>
  cancelKasbon: (id: string) => Promise<{ success: boolean; error?: string }>
}

export function useKasbon(userId: string | undefined): UseKasbonReturn {
  const [history, setHistory] = useState<Kasbon[]>([])
  const [usedThisMonth, setUsedThisMonth] = useState(0)
  const [kasbonLimit, setKasbonLimit] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mutex and sequence tracking
  const isSubmittingRef = useRef(false)
  const fetchSeqRef = useRef(0)

  const getMonthStart = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }

  const fetchKasbonLimit = useCallback(async () => {
    if (!userId) return 0
    const { data, error } = await supabase
      .schema('hr')
      .from('users')
      .select('kasbon_limit')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Error fetching kasbon limit:', error)
      return 0
    }
    return data?.kasbon_limit ?? 0
  }, [userId])

  const fetchUsedThisMonth = useCallback(async () => {
    if (!userId) return 0
    const monthStart = getMonthStart()
    const { data, error } = await supabase
      .schema('hr')
      .from('kasbon')
      .select('amount')
      .eq('user_id', userId)
      .gte('requested_at', monthStart)
      .neq('status', 'rejected')
    if (error) {
      console.error('Error fetching monthly kasbon:', error)
      return 0
    }
    return data?.reduce((sum, k) => sum + k.amount, 0) ?? 0
  }, [userId])

  const fetchHistory = useCallback(async () => {
    if (!userId) return []
    const { data, error } = await supabase
      .schema('hr')
      .from('kasbon')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false })
      .limit(20)
    if (error) {
      console.error('Error fetching kasbon history:', error)
      return []
    }
    return (data as Kasbon[]) ?? []
  }, [userId])

  const loadAll = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }
    const currentSeq = ++fetchSeqRef.current
    try {
      setError(null)
      const [limit, used, hist] = await Promise.all([
        fetchKasbonLimit(),
        fetchUsedThisMonth(),
        fetchHistory(),
      ])
      // Avoid out-of-order race conditions
      if (currentSeq !== fetchSeqRef.current) return

      setKasbonLimit(limit)
      setUsedThisMonth(used)
      setHistory(hist)
    } catch (err) {
      console.error('Error loading kasbon data:', err)
      if (currentSeq === fetchSeqRef.current) {
        setError('Gagal memuat data kasbon')
      }
    } finally {
      if (currentSeq === fetchSeqRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [userId, fetchKasbonLimit, fetchUsedThisMonth, fetchHistory])

  useEffect(() => {
    let active = true
    void (async () => {
      await loadAll()
      if (!active) return
    })()
    return () => {
      active = false
    }
  }, [loadAll])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await loadAll()
  }, [loadAll])

  const submitKasbon = useCallback(async (
    amount: number,
    reason: string,
    category: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User tidak terautentikasi' }

    if (isSubmittingRef.current) {
      return { success: false, error: 'Permintaan pengajuan kasbon sedang diproses' }
    }

    // Amount validation: finite positive integer
    if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0) {
      return { success: false, error: 'Jumlah kasbon harus berupa bilangan bulat positif' }
    }

    // Reason validation: trimmed and min length >= 5
    const cleanReason = (reason || '').trim()
    if (cleanReason.length < 5) {
      return { success: false, error: 'Alasan pengajuan minimal 5 karakter' }
    }

    // Validate against remaining limit
    const remaining = Math.max(0, kasbonLimit - usedThisMonth)
    if (amount > remaining) {
      return { success: false, error: `Melebihi sisa limit. Sisa: Rp ${remaining.toLocaleString('id-ID')}` }
    }

    isSubmittingRef.current = true
    try {
      const { error: insertError } = await supabase
        .schema('hr')
        .from('kasbon')
        .insert({
          user_id: userId,
          amount,
          reason: cleanReason,
          category: category || 'Lainnya',
          status: 'pending',
          requested_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error submitting kasbon:', insertError)
        return { success: false, error: 'Gagal mengirim pengajuan. Coba lagi.' }
      }

      await loadAll()
      return { success: true }
    } finally {
      isSubmittingRef.current = false
    }
  }, [userId, kasbonLimit, usedThisMonth, loadAll])

  const cancelKasbon = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: 'User tidak terautentikasi' }

    if (isSubmittingRef.current) {
      return { success: false, error: 'Permintaan sedang diproses' }
    }

    isSubmittingRef.current = true
    try {
      const { data, error: deleteError } = await supabase
        .schema('hr')
        .from('kasbon')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .select()

      if (deleteError) {
        console.error('Error cancelling kasbon:', deleteError)
        return { success: false, error: 'Gagal membatalkan pengajuan. Coba lagi.' }
      }

      if (!data || data.length === 0) {
        return { success: false, error: 'Pengajuan sudah diproses oleh admin atau tidak ditemukan.' }
      }

      await loadAll()
      return { success: true }
    } finally {
      isSubmittingRef.current = false
    }
  }, [userId, loadAll])

  const loadAllRef = useRef(loadAll)
  useEffect(() => {
    loadAllRef.current = loadAll
  }, [loadAll])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`kasbon_user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'hr',
          table: 'kasbon',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          loadAllRef.current()

          if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old?.status
            const newStatus = payload.new?.status
            const amount = payload.new?.amount
            
            // Only trigger toast if oldStatus is present and has actually transitioned
            if (oldStatus && newStatus && oldStatus !== newStatus) {
              const formattedAmt = `Rp ${Number(amount || 0).toLocaleString('id-ID')}`
              if (newStatus === 'approved') {
                toast.success(`Kasbon sebesar ${formattedAmt} telah DISETUJUI oleh admin!`)
              } else if (newStatus === 'rejected') {
                toast.error(`Kasbon sebesar ${formattedAmt} telah DITOLAK oleh admin.`)
              } else if (newStatus === 'deducted') {
                toast.info(`Kasbon sebesar ${formattedAmt} telah dipotong dari gaji.`)
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const remainingLimit = Math.max(0, kasbonLimit - usedThisMonth)
  const pendingCount = history.filter(k => k.status === 'pending').length

  return {
    history,
    usedThisMonth,
    kasbonLimit,
    remainingLimit,
    pendingCount,
    loading,
    error,
    refreshing,
    refresh,
    submitKasbon,
    cancelKasbon,
  }
}
