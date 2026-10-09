import { useEffect, useRef, useState } from 'react'

export function SelfieCamera({ onCapture, onCancel }: { onCapture: (photo: Blob) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const busy = useRef(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let disposed = false
    let stream: MediaStream | undefined
    const stop = () => stream?.getTracks().forEach(track => track.stop())
    const hidden = () => { if (document.hidden) onCancel() }
    document.addEventListener('visibilitychange', hidden)
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Kamera memerlukan Safari atau Chrome melalui HTTPS.')
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 } }, audio: false })
        if (disposed) { stop(); return }
        if (video.current) {
          video.current.srcObject = stream
          await video.current.play()
        }
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : 'Izinkan akses kamera di pengaturan browser.')
        stop()
      }
    })()
    return () => { disposed = true; stop(); document.removeEventListener('visibilitychange', hidden) }
  }, [onCancel])

  const capture = () => {
    const source = video.current
    if (busy.current || !source?.videoWidth || !source.videoHeight) return
    busy.current = true
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1280 / Math.max(source.videoWidth, source.videoHeight))
    canvas.width = Math.round(source.videoWidth * scale)
    canvas.height = Math.round(source.videoHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) { busy.current = false; setError('Kamera gagal mengambil foto.'); return }
    context.drawImage(source, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(blob => {
      busy.current = false
      if (!video.current) return
      if (blob?.size) onCapture(blob)
      else setError('Foto gagal diambil. Coba lagi.')
    }, 'image/jpeg', 0.8)
  }

  return <div className="absolute inset-0 z-50 bg-background flex flex-col p-4 gap-4" role="dialog" aria-label="Ambil selfie">
    <h2 className="font-semibold text-lg">Ambil selfie untuk absen</h2>
    <video ref={video} muted playsInline autoPlay onLoadedData={() => setReady(true)} className="w-full flex-1 min-h-0 rounded-xl object-cover bg-black" />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="grid grid-cols-2 gap-3">
      <button onClick={onCancel} className="min-h-11 rounded-xl bg-secondary">Batal</button>
      <button disabled={!ready || !!error} onClick={capture} className="min-h-11 rounded-xl bg-primary text-primary-foreground disabled:opacity-50">Ambil foto</button>
    </div>
  </div>
}
