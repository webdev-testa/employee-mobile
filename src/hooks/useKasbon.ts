import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
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
}

export function useKasbon(userId: string | undefined): UseKasbonReturn {
  const [history, setHistory] = useState<Kasbon[]>([])
  const [usedThisMonth, setUsedThisMonth] = useState(0)
  const [kasbonLimit, setKasbonLimit] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    try {
      setError(null)
      const [limit, used, hist] = await Promise.all([
        fetchKasbonLimit(),
        fetchUsedThisMonth(),
        fetchHistory(),
      ])
      setKasbonLimit(limit)
      setUsedThisMonth(used)
      setHistory(hist)
    } catch (err) {
      console.error('Error loading kasbon data:', err)
      setError('Gagal memuat data kasbon')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId, fetchKasbonLimit, fetchUsedThisMonth, fetchHistory])

  useEffect(() => {
    loadAll()
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

    // Validate against remaining limit
    const remaining = kasbonLimit - usedThisMonth
    if (amount > remaining) {
      return { success: false, error: `Melebihi sisa limit. Sisa: Rp ${remaining.toLocaleString('id-ID')}` }
    }
    if (amount <= 0) {
      return { success: false, error: 'Jumlah kasbon harus lebih dari 0' }
    }

    const { error: insertError } = await supabase
      .schema('hr')
      .from('kasbon')
      .insert({
        user_id: userId,
        amount,
        reason,
        category,
        status: 'pending',
        requested_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Error submitting kasbon:', insertError)
      return { success: false, error: 'Gagal mengirim pengajuan. Coba lagi.' }
    }

    // Refresh data after successful submission
    await loadAll()
    return { success: true }
  }, [userId, kasbonLimit, usedThisMonth, loadAll])

  const remainingLimit = kasbonLimit - usedThisMonth
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
  }
}
