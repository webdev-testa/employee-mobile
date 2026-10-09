import React, { useRef } from 'react'
import {
  X,
  Camera as CameraIcon,
  Upload,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Booking } from '@/types/pos.types'
import {
  NAFSU_MAKAN_OPTIONS,
  MINUM_OPTIONS,
  FESES_OPTIONS,
  URINASI_OPTIONS,
} from '@/constants/pos.constants'
import { useDailyReport } from '@/hooks/pos/useDailyReport'

interface DailyReportModalProps {
  booking: Booking | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    formData,
    setFormData,
    photoPreview,
    isSubmitting,
    handleCaptureCamera,
    handlePhotoFileChange,
    submitReport,
  } = useDailyReport(booking, () => {
    onSuccess()
    onClose()
  })

  if (!isOpen || !booking) return null

  const catName = booking.cat?.nama || 'Kucing'
  const ownerName = booking.owner?.nama || 'Pemilik'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-report-modal-title"
    >
      <div className="bg-background w-full max-w-lg max-h-[90vh] flex flex-col rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card">
          <div>
            <h2
              id="daily-report-modal-title"
              className="font-bold text-lg text-foreground font-display"
            >
              Laporan Harian: {catName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Pemilik: {ownerName} • {booking.paket}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup dialog"
            className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Nafsu Makan */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
              1. Nafsu Makan
            </label>
            <div className="flex flex-wrap gap-2">
              {NAFSU_MAKAN_OPTIONS.map(opt => {
                const isSelected = formData.nafsu_makan === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, nafsu_makan: opt }))}
                    className={`text-xs px-3 py-2 rounded-xl border transition-all text-left font-medium ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/80'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Minum */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
              2. Minum
            </label>
            <div className="flex flex-wrap gap-2">
              {MINUM_OPTIONS.map(opt => {
                const isSelected = formData.minum === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, minum: opt }))}
                    className={`text-xs px-3 py-2 rounded-xl border transition-all text-left font-medium ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/80'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Feses */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
              3. Feses (Buang Air Besar)
            </label>
            <div className="flex flex-wrap gap-2">
              {FESES_OPTIONS.map(opt => {
                const isSelected = formData.feses === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, feses: opt }))}
                    className={`text-xs px-3 py-2 rounded-xl border transition-all text-left font-medium ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/80'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Urinasi */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
              4. Urinasi (Buang Air Kecil)
            </label>
            <div className="flex flex-wrap gap-2">
              {URINASI_OPTIONS.map(opt => {
                const isSelected = formData.urinasi === opt
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, urinasi: opt }))}
                    className={`text-xs px-3 py-2 rounded-xl border transition-all text-left font-medium ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border/80'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Kondisi Umum */}
          <div className="space-y-2">
            <label
              htmlFor="kondisi-umum"
              className="text-xs font-semibold text-foreground tracking-wide uppercase"
            >
              5. Kondisi Umum
            </label>
            <input
              id="kondisi-umum"
              type="text"
              value={formData.kondisi_umum}
              onChange={e => setFormData(prev => ({ ...prev, kondisi_umum: e.target.value }))}
              placeholder="Contoh: Aktif, lincah, responsif, tidur nyenyak"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Keterangan / Catatan Khusus */}
          <div className="space-y-2">
            <label
              htmlFor="keterangan-report"
              className="text-xs font-semibold text-foreground tracking-wide uppercase"
            >
              6. Catatan Khusus untuk Pemilik
            </label>
            <textarea
              id="keterangan-report"
              rows={2}
              value={formData.keterangan}
              onChange={e => setFormData(prev => ({ ...prev, keterangan: e.target.value }))}
              placeholder="Opsional: obat sudah diminumkan, bermain bola tali, dll."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm resize-none focus:outline-hidden focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Photo Capture */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground tracking-wide uppercase">
              Foto Bukti Kondisi / Aktivitas Hari Ini
            </label>

            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-border bg-black/5 aspect-video w-full">
                <img
                  src={photoPreview}
                  alt="Foto kondisi kucing"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (fileInputRef.current) fileInputRef.current.value = ''
                    handleCaptureCamera()
                  }}
                  className="absolute bottom-3 right-3 bg-black/70 hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-medium backdrop-blur-xs flex items-center gap-1.5 shadow-md"
                >
                  <CameraIcon size={14} /> Ganti Foto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCaptureCamera}
                  className="h-14 rounded-2xl flex flex-col items-center justify-center gap-1 border-dashed border-2 hover:bg-muted/50"
                >
                  <CameraIcon size={18} className="text-primary" />
                  <span className="text-xs font-medium">Buka Kamera</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-14 rounded-2xl flex flex-col items-center justify-center gap-1 border-dashed border-2 hover:bg-muted/50"
                >
                  <Upload size={18} className="text-muted-foreground" />
                  <span className="text-xs font-medium">Pilih File Galeri</span>
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-card flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl font-medium"
          >
            Batal
          </Button>

          <Button
            type="button"
            onClick={submitReport}
            disabled={isSubmitting}
            className="flex-1 h-12 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} /> Simpan & Kirim WA
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
