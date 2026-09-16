import { supabase } from '@/lib/supabase'

export const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useClockIn() {
  
  // Step 1 — Get GPS
  const getLocation = (): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation tidak didukung pada perangkat ini'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    })
  }

  // Step 2 — Capture photo (no gallery, camera only)
  const capturePhoto = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      // forces front camera, blocks gallery
      // For mobile devices, "user" means front-facing camera.
      input.capture = 'user'
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) resolve(file)
        else reject(new Error('Pengambilan foto dibatalkan'))
      }

      input.oncancel = () => {
        reject(new Error('Pengambilan foto dibatalkan'))
      }

      input.click()
    })
  }

  const getShiftStart = (shiftStr?: string | null) => {
    if (!shiftStr) return { hour: 8, minute: 0 }
    const match = shiftStr.match(/^(\d{2}):(\d{2})/)
    if (match) {
      return { hour: parseInt(match[1], 10), minute: parseInt(match[2], 10) }
    }
    return { hour: 8, minute: 0 }
  }

  const saveAttendance = async (photo: Blob, coords: GeolocationCoordinates, shiftStr?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    // Upload photo to storage with entropy to prevent collision
    const filename = `${user.id}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.jpg`
    const { error: uploadError } = await supabase
      .storage
      .from('attendance-photos')
      .upload(filename, photo, { contentType: 'image/jpeg' })
    
    if (uploadError) throw uploadError

    try {
      // Get photo URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('attendance-photos')
        .getPublicUrl(filename)

      // Calculate late status
      const now = new Date()
      const shiftStart = getShiftStart(shiftStr)
      const shiftTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), shiftStart.hour, shiftStart.minute, 0, 0)
      const status = now.getTime() > shiftTime.getTime() ? 'late' : 'ontime'

      // Save to attendance
      const { error: insertError } = await supabase
        .schema('hr')
        .from('attendance')
        .insert({
          user_id: user.id,
          date: getLocalDateString(now),
          clock_in_time: now.toISOString(),
          clock_in_lat: coords.latitude,
          clock_in_lng: coords.longitude,
          clock_in_photo_url: publicUrl,
          status: status
        })

      if (insertError) throw insertError
    } catch (err) {
      // Clean up orphaned storage file on database failure
      await supabase.storage.from('attendance-photos').remove([filename]).catch(() => {})
      throw err
    }
  }

  return { capturePhoto, getLocation, saveAttendance }
}

export function useClockOut() {
  const saveClockOut = async (coords: GeolocationCoordinates) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const today = getLocalDateString()

    // Update attendance record for today
    const { data, error } = await supabase
      .schema('hr')
      .from('attendance')
      .update({
        clock_out_time: new Date().toISOString(),
        clock_out_lat: coords.latitude,
        clock_out_lng: coords.longitude
      })
      .eq('user_id', user.id)
      .eq('date', today)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('Belum ada catatan absen masuk untuk hari ini.')
    }
  }

  const resetAttendanceDev = async () => {
    if (!import.meta.env.DEV) {
      throw new Error('Reset absen hanya diizinkan pada environment development.')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const today = getLocalDateString()
    const { error } = await supabase
      .schema('hr')
      .from('attendance')
      .delete()
      .eq('user_id', user.id)
      .eq('date', today)

    if (error) throw error
  }

  return { saveClockOut, resetAttendanceDev }
}