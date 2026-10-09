import { Capacitor } from '@capacitor/core'
import { Camera, CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera'

export const MAX_SELFIE_BYTES = 5 * 1024 * 1024

export async function captureNativePhoto(): Promise<Blob> {
  if (!Capacitor.isNativePlatform()) throw new Error('Kamera native tidak tersedia.')
  const photo = await Camera.getPhoto({ source: CameraSource.Camera, direction: CameraDirection.Front,
    resultType: CameraResultType.Uri, quality: 80, width: 1280, height: 1280, saveToGallery: false })
  if (!photo.webPath) throw new Error('Foto tidak tersedia. Coba lagi.')
  const response = await fetch(photo.webPath)
  if (!response.ok) throw new Error('Foto gagal dibaca.')
  const blob = await response.blob()
  if (blob.type !== 'image/jpeg' || !blob.size || blob.size > MAX_SELFIE_BYTES) throw new Error('Foto harus JPEG dan maksimal 5 MB.')
  return blob
}
