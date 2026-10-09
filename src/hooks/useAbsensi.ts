import { supabase } from '@/lib/supabase'
import { acquireLocation } from '@/services/locationService'
import { captureNativePhoto } from '@/services/photoService'
import { submitAttendance } from '@/services/attendanceService'

export const getLocalDateString = (d = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(d)

export function useClockIn() {
  return { getLocation: acquireLocation, capturePhoto: captureNativePhoto,
    saveAttendance: (userId: string, photo: Blob, signal: AbortSignal) => submitAttendance(userId, 'in', photo, signal) }
}

export function useClockOut() {
  return {
    saveClockOut: (userId: string, signal: AbortSignal) => submitAttendance(userId, 'out', null, signal),
    resetAttendanceDev: async () => {
      if (!import.meta.env.DEV) throw new Error('Reset hanya tersedia pada development.')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Anda belum login.')
      const { error } = await supabase.schema('hr').from('attendance').delete().eq('user_id', user.id).eq('date', getLocalDateString())
      if (error) throw error
    },
  }
}
