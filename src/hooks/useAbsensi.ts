import { supabase } from '@/lib/supabase'

export function useClockIn() {
  
  // Step 1 — Get GPS
  const getLocation = (): Promise<GeolocationCoordinates> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { enableHighAccuracy: true }
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
        else reject(new Error('No photo selected'))
      }
      input.click()
    })
  }

  const saveAttendance = async (photo: Blob, coords: GeolocationCoordinates) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    // Upload photo to storage
    const filename = `${user.id}/${Date.now()}.jpg`
    const { error: uploadError } = await supabase
      .storage
      .from('attendance-photos')
      .upload(filename, photo)
    
    if (uploadError) throw uploadError

    // Get photo URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('attendance-photos')
      .getPublicUrl(filename)

    // Save to attendance
    const { error } = await supabase
      .from('attendance')
      .insert({
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        clock_in_time: new Date().toISOString(),
        clock_in_lat: coords.latitude,
        clock_in_lng: coords.longitude,
        clock_in_photo_url: publicUrl,
        status: 'ontime'  // you can calculate late logic here later
      })

    if (error) throw error
  }

  // Legacy clockIn for backward compatibility
  const clockIn = async () => {
    const photoPromise = capturePhoto()
    const coords = await getLocation()
    const photo = await photoPromise
    await saveAttendance(photo, coords)
  }

  return { clockIn, capturePhoto, getLocation, saveAttendance }
}

export function useClockOut() {
  const clockOut = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('user_id', user.id)
      .eq('date', today)

    if (error) throw error
  }

  return { clockOut }
}