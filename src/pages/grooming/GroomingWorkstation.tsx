import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGroomingSessions } from '@/hooks/grooming/useGroomingSessions'
import { groomingService } from '@/services/groomingService'
import type { GroomingStep } from '@/types/pos.types'
import {
  GROOMING_STEP_LABELS,
  GROOMING_STEP_EMOJI,
} from '@/constants/grooming.constants'
import {
  Camera as CameraIcon,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getGroomingReportUrl,
  generateGroomingDoneWa,
  openWhatsApp,
} from '@/utils/grooming.utils'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { SudahBayarToggle } from '@/components/shared/SudahBayarToggle'

export default function GroomingWorkstation() {
  const [searchParams] = useSearchParams()
  const initialSessionId = searchParams.get('session')

  const { sessions, refetch, updateStep, toggleSudahBayar } = useGroomingSessions()

  // Selected session to work on
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId)

  // Workstation filter: active vs done
  const [tab, setTab] = useState<'active' | 'done'>('active')

  // Photo upload & notes state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [stepNote, setStepNote] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeSessions = sessions.filter(
    s => s.status === 'antrian' || s.status === 'dikerjakan'
  )
  const doneSessions = sessions.filter(
    s => s.status === 'selesai' || s.status === 'dijemput'
  )

  const currentList = tab === 'active' ? activeSessions : doneSessions
  const selectedSession =
    sessions.find(s => s.id === activeSessionId) ||
    currentList[0] ||
    sessions[0] ||
    null

  const hasInitializedRef = useRef(false)
  const [isSendingWa, setIsSendingWa] = useState(false)

  // Keep activeSessionId in sync if passed via URL on initial mount
  useEffect(() => {
    if (!initialSessionId || hasInitializedRef.current) return
    const found = sessions.find(s => s.id === initialSessionId)
    if (found) {
      setActiveSessionId(initialSessionId)
      if (found.status === 'selesai' || found.status === 'dijemput') {
        setTab('done')
      }
      hasInitializedRef.current = true
    }
  }, [initialSessionId, sessions])

  const handleCapturePhoto = async () => {
    // 1. Try native Capacitor Camera
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      })

      if (photo?.dataUrl) {
        setPhotoPreview(photo.dataUrl)
        const res = await fetch(photo.dataUrl)
        const blob = await res.blob()
        setPhotoBlob(blob)
        return
      }
    } catch (err: unknown) {
      // User cancelled or web permission issue
      const errMsg = (err instanceof Error ? err.message : String(err)).toLowerCase()
      if (!errMsg.includes('cancel')) {
        console.warn('Capacitor camera failed, trying input fallback:', err)
        fileInputRef.current?.click()
      }
    }
  }

  const handleHtmlPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit format to valid images
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      toast.error('Format file harus berupa foto JPEG, PNG, atau WebP')
      e.target.value = ''
      return
    }

    // Limit file size to 10MB
    const MAX_SIZE_MB = 10
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${MAX_SIZE_MB}MB`)
      e.target.value = ''
      return
    }

    setPhotoBlob(file)
    const reader = new FileReader()
    reader.onload = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAdvanceStepWithPhoto = async (targetStep: GroomingStep) => {
    if (!selectedSession || isUploading) return
    setIsUploading(true)

    try {
      let uploadedUrl: string | undefined

      if (photoBlob) {
        toast.info('Mengunggah foto proses...')
        uploadedUrl = await groomingService.uploadGroomingPhoto(
          photoBlob,
          selectedSession.id,
          targetStep
        )
      }

      const res = await updateStep({
        sessionId: selectedSession.id,
        step: targetStep,
        extra: {
          catatan: stepNote.trim() || undefined,
          foto_url: uploadedUrl || photoPreview || undefined,
        },
      })

      if (res.success) {
        setPhotoBlob(null)
        setPhotoPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        setStepNote('')
        toast.success(
          `Step ${GROOMING_STEP_LABELS[targetStep] || targetStep} berhasil disimpan!`
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      toast.error('Gagal memperbarui step: ' + msg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSendDoneWa = () => {
    if (!selectedSession || isSendingWa) return
    const cleanPhone = (selectedSession.owner?.no_wa || '').replace(/\D/g, '')
    if (cleanPhone.length < 8) {
      toast.error('Nomor WhatsApp pemilik tidak valid (minimal 8 digit).')
      return
    }
    setIsSendingWa(true)
    try {
      const reportUrl = getGroomingReportUrl(selectedSession.public_token)
      const message = generateGroomingDoneWa(selectedSession, reportUrl)
      openWhatsApp(cleanPhone, message)
    } finally {
      setTimeout(() => setIsSendingWa(false), 1500)
    }
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 pt-1 border-b border-border/70 pb-3">
        <div className="flex items-center gap-2.5">
          <Link to="/employee/grooming">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 rounded-xl cursor-pointer"
              title="Kembali ke Antrian"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-foreground leading-tight">
              Meja Kerja Groomer ✂️
            </h1>
            <span className="text-[10px] text-muted-foreground font-mono">
              Update langkah & foto live
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="h-8 w-8 p-0 rounded-xl cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* TABS: ANTRIAN vs SELESAI */}
      <div className="flex bg-muted/50 p-1 rounded-2xl border border-border">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'active'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Sedang Dikerjakan</span>
          <span className="px-1.5 py-0.2 bg-[#F5A940]/15 text-[#F5A940] text-[10px] rounded-full font-mono font-bold">
            {activeSessions.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('done')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'done'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Selesai Hari Ini</span>
          <span className="px-1.5 py-0.2 bg-muted text-muted-foreground text-[10px] rounded-full font-mono font-bold">
            {doneSessions.length}
          </span>
        </button>
      </div>

      {/* HORIZONTAL CAROUSEL OF QUEUE CATS */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-mono text-muted-foreground uppercase flex items-center justify-between">
          <span>Pilih Kucing di Meja:</span>
          <span>{currentList.length} kucing</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {currentList.map(session => {
            const isSelected = selectedSession?.id === session.id
            return (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  setActiveSessionId(session.id)
                  setPhotoBlob(null)
                  setPhotoPreview(null)
                  setStepNote('')
                }}
                className={`p-2.5 rounded-2xl border shrink-0 text-left transition-all flex items-center gap-2.5 min-w-[160px] cursor-pointer ${
                  isSelected
                    ? 'bg-[#F5A940]/10 border-[#F5A940] shadow-xs ring-1 ring-[#F5A940]'
                    : 'bg-card border-border/80 hover:bg-muted/40'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {session.cat?.foto_url ? (
                    <img src={session.cat.foto_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🐱</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">
                    {session.cat?.nama?.trim() || 'Kucing'}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{session.paket}</div>
                  <div className="text-[9.5px] font-mono text-[#F5A940] font-semibold flex items-center gap-1 mt-0.5">
                    {GROOMING_STEP_EMOJI[session.current_step] || '🐾'}{' '}
                    {(GROOMING_STEP_LABELS[session.current_step] || 'Proses').split(' ')[0]}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ACTIVE CAT DETAIL PANEL */}
      {selectedSession ? (
        <div className="space-y-4">
          {/* CAT INFO CARD */}
          <Card className="bg-card border-border/80 shadow-xs rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-2xl bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {selectedSession.cat?.foto_url ? (
                    <img
                      src={selectedSession.cat.foto_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">🐱</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-foreground truncate">
                      {selectedSession.cat?.nama?.trim() || 'Kucing'}
                    </h2>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-muted rounded text-muted-foreground">
                      {selectedSession.cat?.ras || 'Domestic'}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    Paket: <strong>{selectedSession.paket}</strong>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    Owner: {selectedSession.owner?.nama?.trim() || '-'} {selectedSession.owner?.no_wa ? `(${selectedSession.owner.no_wa})` : ''}
                  </div>
                </div>
              </div>

              <a
                href={getGroomingReportUrl(selectedSession.public_token)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 bg-muted px-2.5 py-1.5 rounded-xl border border-border shrink-0 cursor-pointer"
                title="Buka tampilan report customer"
              >
                <span>Live View</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Notes & Warnings */}
            {selectedSession.kondisi_awal && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-semibold">Kondisi Awal:</span>{' '}
                  {selectedSession.kondisi_awal}
                </div>
              </div>
            )}

            {selectedSession.catatan && (
              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-xl text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Pesan Khusus:</span>{' '}
                {selectedSession.catatan}
              </div>
            )}

            {/* PAYMENT STATUS TOGGLE */}
            <SudahBayarToggle
              checked={selectedSession.sudah_bayar}
              onChange={checked => toggleSudahBayar(selectedSession.id, checked)}
              showDescription={false}
              className="mt-2"
            />
          </Card>

          {/* QUICK CAMERA CAPTURE SECTION */}
          <Card className="bg-card border-border/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CameraIcon className="w-4 h-4 text-[#F5A940]" />
                <span className="text-xs font-bold text-foreground">
                  Foto Proses (Kamera HP)
                </span>
              </div>
            </div>

            {/* Hidden fallback HTML input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleHtmlPhotoChange}
              className="hidden"
            />

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border max-h-56 bg-black flex items-center justify-center">
                <img src={photoPreview} alt="Preview" className="max-h-56 w-auto object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null)
                    setPhotoBlob(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                >
                  Ganti Foto
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="w-full py-5 border-2 border-dashed border-border hover:border-[#F5A940]/60 rounded-xl bg-muted/30 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#F5A940]/15 text-[#F5A940] flex items-center justify-center">
                  <CameraIcon className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-foreground">
                  Ketuk untuk Ambil Foto Langsung
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Foto akan langsung muncul di live report customer
                </span>
              </button>
            )}

            {/* Step Note */}
            <Input
              placeholder="Catatan pengerjaan tahap ini (opsional)..."
              value={stepNote}
              onChange={e => setStepNote(e.target.value)}
              className="text-xs h-9 rounded-xl border-border bg-background"
            />
          </Card>

          {/* TACTILE STEP BUTTONS */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase text-muted-foreground flex items-center justify-between">
              <span>Langkah Pengerjaan:</span>
              <span className="text-[#F5A940] font-semibold">
                Saat ini: {GROOMING_STEP_LABELS[selectedSession.current_step] || 'Proses'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { step: 'bathing' as GroomingStep, label: 'Mulai Mandi & Shampo', icon: '🛁', color: 'bg-blue-600 hover:bg-blue-700' },
                { step: 'drying' as GroomingStep, label: 'Pengeringan (Blow Dry)', icon: '💨', color: 'bg-cyan-600 hover:bg-cyan-700' },
                { step: 'styling' as GroomingStep, label: 'Styling / Cukur Bulu', icon: '✂️', color: 'bg-purple-600 hover:bg-purple-700' },
                { step: 'finishing' as GroomingStep, label: 'Finishing Touch & Parfum', icon: '✨', color: 'bg-pink-600 hover:bg-pink-700' },
              ].map(item => {
                const isCurrent = selectedSession.current_step === item.step
                const isTerminal =
                  selectedSession.status === 'selesai' ||
                  selectedSession.status === 'dijemput' ||
                  selectedSession.status === 'dibatalkan'
                return (
                  <Button
                    key={item.step}
                    disabled={isUploading || isTerminal}
                    onClick={() => handleAdvanceStepWithPhoto(item.step)}
                    className={`h-12 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer flex items-center justify-between px-3.5 disabled:opacity-50 ${
                      item.color
                    } ${isCurrent ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {isCurrent ? (
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                        Aktif
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 opacity-70" />
                    )}
                  </Button>
                )
              })}
            </div>

            {/* BIG SELESAI BUTTON */}
            {selectedSession.status !== 'dijemput' && selectedSession.status !== 'dibatalkan' && (
              <Button
                disabled={isUploading || selectedSession.status === 'selesai'}
                onClick={() => handleAdvanceStepWithPhoto('done')}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-xs cursor-pointer mt-2 gap-2 disabled:opacity-50"
              >
                <span className="text-xl">🎉</span>
                <span>
                  {selectedSession.status === 'selesai'
                    ? 'GROOMING SUDAH SELESAI'
                    : 'GROOMING SELESAI & SIAP DIJEMPUT!'}
                </span>
              </Button>
            )}

            {/* NOTIFY WA BUTTON WHEN DONE */}
            {selectedSession.status === 'selesai' && (
              <Button
                type="button"
                disabled={isSendingWa}
                onClick={handleSendDoneWa}
                className="w-full h-11 bg-[#3AAD7A] hover:bg-[#2b8a60] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer gap-2 mt-1 disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kirim Notifikasi Siap Dijemput ke WhatsApp Owner</span>
              </Button>
            )}
          </div>

          {/* TIMELINE OF PROGRESS PHOTOS TAKEN */}
          {selectedSession.progress && selectedSession.progress.length > 0 && (
            <Card className="bg-card border-border/80 rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-foreground">
                Riwayat Foto & Catatan ({selectedSession.progress.length})
              </div>

              <div className="space-y-2.5">
                {selectedSession.progress.map((prog, idx) => {
                  const isValidDate = prog.created_at && !isNaN(new Date(prog.created_at).getTime())
                  const timeDisplay = isValidDate
                    ? new Date(prog.created_at).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-'

                  return (
                    <div
                      key={prog.id || idx}
                      className="p-2.5 bg-muted/30 border border-border/60 rounded-xl flex items-start gap-2.5 text-xs"
                    >
                      {prog.foto_url ? (
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-black shrink-0 border border-border">
                          <img src={prog.foto_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-base shrink-0">
                          {GROOMING_STEP_EMOJI[prog.step] || '🐾'}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">
                            {GROOMING_STEP_LABELS[prog.step] || prog.step}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {timeDisplay}
                          </span>
                        </div>
                        {prog.catatan && (
                          <div className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                            {prog.catatan}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground text-xs font-mono">
          Tidak ada kucing yang dipilih di meja.
        </div>
      )}
    </div>
  )
}
