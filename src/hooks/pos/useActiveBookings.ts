import { useState, useEffect, useCallback } from 'react'
import { posService } from '@/services/posService'
import { getTodayLocalDate } from '@/utils/pos.utils'
import type { Booking } from '@/types/pos.types'

export function useActiveBookings() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [dates] = useState(() => {
    const todayStr = getTodayLocalDate()
    const tomorrowStr = new Date(new Date(todayStr).getTime() + 86400000).toISOString().split('T')[0]
    return { today: todayStr, tomorrow: tomorrowStr }
  })
  const { today, tomorrow } = dates

  const loadBookings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      const data = await posService.fetchBookings()
      setBookings(data)
      setError(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data hotel kucing'
      setError(msg)
      console.error('useActiveBookings error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    posService
      .fetchBookings()
      .then(data => {
        if (mounted) {
          setBookings(data)
          setError(null)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          const msg = err instanceof Error ? err.message : 'Gagal memuat data hotel kucing'
          setError(msg)
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const activeBookings = bookings.filter(b => b.status === 'aktif')
  const menginapCount = activeBookings.length
  const belumLaporanCount = activeBookings.filter(b => !b.sudah_laporan).length
  const checkoutHariIniCount = activeBookings.filter(b => b.tanggal_keluar_estimasi === today).length
  const checkoutBesokCount = activeBookings.filter(b => b.tanggal_keluar_estimasi === tomorrow).length

  return {
    bookings,
    activeBookings,
    today,
    tomorrow,
    metrics: {
      menginapCount,
      belumLaporanCount,
      checkoutHariIniCount,
      checkoutBesokCount,
    },
    loading,
    refreshing,
    error,
    refetch: () => loadBookings(true),
  }
}
