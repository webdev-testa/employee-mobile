import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OwnerContactPicker } from '@/components/pos/OwnerContactPicker'
import { ConditionTagPicker } from '@/components/grooming/ConditionTagPicker'
import { SudahBayarToggle } from '@/components/shared/SudahBayarToggle'
import { useGroomingForm } from '@/hooks/grooming/useGroomingForm'
import { useAuth } from '@/hooks/useAuth'
import {
  Scissors,
  ArrowLeft,
  Check,
  CheckCircle2,
  MessageCircle,
  Copy,
  Plus,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatRupiah, copyToClipboard } from '@/utils/pos.utils'
import {
  getGroomingReportUrl,
  generateGroomingCheckinWa,
  openWhatsApp,
} from '@/utils/grooming.utils'
import { toast } from 'sonner'

export default function GroomingCheckIn() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const employeeName = user?.name || 'Staff Groomer'

  const {
    step,
    setStep,
    // Owner
    searchOwnerQuery,
    setSearchOwnerQuery,
    selectedOwner,
    isNewOwner,
    setIsNewOwner,
    newOwnerData,
    setNewOwnerData,
    ownerSearchResults,
    isSearchingOwners,
    handleSelectOwner,
    handleClearOwner,
    // Cat
    selectedCat,
    isNewCat,
    setIsNewCat,
    newCatData,
    setNewCatData,
    ownerCats,
    isLoadingCats,
    handleSelectCat,
    handleChooseNewCat,
    // Details
    formData,
    setFormData,
    packages,
    handleSelectPackage,
    // Submission
    submitCheckIn,
    isSubmitting,
    createdSession,
    isSuccessModalOpen,
    setIsSuccessModalOpen,
    resetForm,
  } = useGroomingForm(employeeName)

  // Quick condition tags
  const [selectedConditionTags, setSelectedConditionTags] = useState<string[]>([])

  const handleToggleConditionTag = (tag: string) => {
    const isRemoving = selectedConditionTags.includes(tag)
    const next = isRemoving
      ? selectedConditionTags.filter(t => t !== tag)
      : [...selectedConditionTags, tag]

    setSelectedConditionTags(next)
    setFormData(prev => ({
      ...prev,
      kondisiAwal: next.join(', '),
    }))
  }

  const handleSendWa = () => {
    if (!createdSession) return
    const reportUrl = getGroomingReportUrl(createdSession.public_token)
    const message = generateGroomingCheckinWa(createdSession, reportUrl)
    const phone = createdSession.owner?.no_wa || newOwnerData.no_wa
    if (!phone) {
      toast.error('Nomor WhatsApp pemilik tidak ditemukan.')
      return
    }
    openWhatsApp(phone, message)
  }

  const handleCopyLink = async () => {
    if (!createdSession) return
    const reportUrl = getGroomingReportUrl(createdSession.public_token)
    const success = await copyToClipboard(reportUrl)
    if (success) {
      toast.success('Link live report berhasil disalin!')
    } else {
      toast.error('Gagal menyalin link ke clipboard.')
    }
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-3 pt-1 border-b border-border/70 pb-3">
        <Link to="/employee/grooming">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl cursor-pointer"
            title="Kembali ke Grooming"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <div className="text-[10px] font-mono uppercase font-bold text-[#F5A940] flex items-center gap-1">
            <Scissors className="w-3 h-3" />
            Check-In Grooming
          </div>
          <h1 className="text-base font-bold text-foreground">
            Pendaftaran Kucing Masuk
          </h1>
        </div>
      </div>

      {/* STEP WIZARD BAR */}
      <div className="flex items-center justify-between gap-2 px-1">
        {[
          { num: 1, label: 'Owner' },
          { num: 2, label: 'Kucing' },
          { num: 3, label: 'Paket & Cek' },
        ].map(s => {
          const isActive = step === s.num
          const isDone = step > s.num
          return (
            <div key={s.num} className="flex-1 flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#F5A940] text-white ring-2 ring-[#F5A940]/30 shadow-xs'
                    : isDone
                    ? 'bg-[#3AAD7A] text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span
                className={`text-xs ${
                  isActive ? 'font-bold text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* STEP 1: OWNER SELECTION */}
      {step === 1 && (
        <div className="space-y-4">
          <OwnerContactPicker
            selectedOwner={selectedOwner}
            onSelectOwner={handleSelectOwner}
            onClearOwner={handleClearOwner}
            isNewOwner={isNewOwner}
            onToggleNewOwner={setIsNewOwner}
            newOwnerData={newOwnerData}
            onChangeNewOwnerData={setNewOwnerData}
            searchQuery={searchOwnerQuery}
            onSearchChange={setSearchOwnerQuery}
            owners={ownerSearchResults}
            isLoading={isSearchingOwners}
            title="Identitas Pemilik Kucing"
            description="Cari nama atau nomor WA pemilik terdaftar, atau daftarkan baru."
          />

          <div className="pt-2">
            <Button
              type="button"
              disabled={!selectedOwner && (!isNewOwner || !newOwnerData.nama || !newOwnerData.no_wa)}
              onClick={() => setStep(2)}
              className="w-full h-12 bg-[#F5A940] hover:bg-[#e09833] text-white rounded-2xl font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
            >
              <span>Lanjut Pilih Kucing</span>
              <ArrowLeft className="w-4 h-4 rotate-180 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: CAT SELECTION */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border/70 pb-2">
            <div>
              <h2 className="text-sm font-bold text-foreground">Pilih Kucing</h2>
              <p className="text-[11px] text-muted-foreground">
                Kucing milik {selectedOwner?.nama || newOwnerData.nama}
              </p>
            </div>
            {!isNewCat && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleChooseNewCat}
                className="text-xs h-8 rounded-xl border-dashed cursor-pointer font-semibold"
              >
                <Plus className="w-3.5 h-3.5 text-[#F5A940] mr-1" />
                Tambah Kucing
              </Button>
            )}
          </div>

          {/* LIST EXISTING CATS */}
          {!isNewCat && (
            <div className="space-y-2">
              {isLoadingCats ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Memuat kucing terdaftar...
                </div>
              ) : ownerCats.length > 0 ? (
                ownerCats.map(cat => {
                  const isSelected = selectedCat?.id === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCat(cat)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#3AAD7A] bg-[#3AAD7A]/10 ring-1 ring-[#3AAD7A]'
                          : 'border-border bg-card hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden flex items-center justify-center border border-border shrink-0">
                          {cat.foto_url ? (
                            <img src={cat.foto_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">🐱</span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">{cat.nama}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {cat.ras || 'Domestic'} • {cat.jenis_kelamin || 'Jantan'}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#3AAD7A] shrink-0" />
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Belum ada profil kucing tersimpan untuk pemilik ini.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleChooseNewCat}
                    className="text-xs h-8 rounded-xl cursor-pointer"
                  >
                    + Daftarkan Kucing Sekarang
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* FORM NEW CAT */}
          {isNewCat && (
            <Card className="p-4 rounded-2xl border-2 border-[#F5A940]/40 bg-[#F5A940]/5 space-y-3">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <span className="text-xs font-bold text-foreground">Form Kucing Baru</span>
                {ownerCats.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsNewCat(false)}
                    className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Pilih Dari Daftar
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Nama Kucing <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="cth: Milo / Luna"
                    value={newCatData.nama}
                    onChange={e => setNewCatData(prev => ({ ...prev, nama: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-background border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Ras Kucing
                    </label>
                    <Input
                      placeholder="cth: Persia / BSH"
                      value={newCatData.ras}
                      onChange={e => setNewCatData(prev => ({ ...prev, ras: e.target.value }))}
                      className="h-9 text-xs rounded-xl bg-background border-border"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-foreground block mb-1">
                      Jenis Kelamin
                    </label>
                    <select
                      value={newCatData.jenis_kelamin}
                      onChange={e =>
                        setNewCatData(prev => ({
                          ...prev,
                          jenis_kelamin: e.target.value as 'Jantan' | 'Betina',
                        }))
                      }
                      className="w-full h-9 px-2.5 text-xs rounded-xl bg-background border border-border text-foreground"
                    >
                      <option value="Jantan">Jantan</option>
                      <option value="Betina">Betina</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-foreground block mb-1">
                    Warna / Ciri Fisik
                  </label>
                  <Input
                    placeholder="cth: Putih abu-abu / Tabby"
                    value={newCatData.warna}
                    onChange={e => setNewCatData(prev => ({ ...prev, warna: e.target.value }))}
                    className="h-9 text-xs rounded-xl bg-background border-border"
                  />
                </div>
              </div>
            </Card>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 h-12 rounded-2xl text-xs font-semibold cursor-pointer"
            >
              Kembali
            </Button>
            <Button
              type="button"
              disabled={!selectedCat && (!isNewCat || !newCatData.nama)}
              onClick={() => setStep(3)}
              className="flex-1 h-12 bg-[#F5A940] hover:bg-[#e09833] text-white rounded-2xl font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
            >
              <span>Lanjut ke Paket</span>
              <ArrowLeft className="w-4 h-4 rotate-180 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PACKAGE & INSPECTION DETAILS */}
      {step === 3 && (
        <div className="space-y-4">
          {/* PACKAGE PICKER */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Pilih Paket Grooming <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {packages.map(pkg => {
                const isSelected = formData.paketNama === pkg.nama
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => handleSelectPackage(pkg)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#F5A940] bg-[#F5A940]/10 ring-1 ring-[#F5A940]'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">{pkg.nama}</div>
                      {pkg.deskripsi && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                          {pkg.deskripsi}
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-muted-foreground mt-1">
                        Est: {pkg.durasi_estimasi || 60} menit
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-[#F5A940] font-mono">
                        Rp {formatRupiah(pkg.harga)}
                      </div>
                      {isSelected && (
                        <span className="inline-block px-1.5 py-0.2 bg-[#F5A940] text-white text-[9px] font-bold rounded mt-1">
                          Dipilih
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* INITIAL CONDITION CHIPS */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Pemeriksaan Fisik Awal (Kondisi Kucing)
            </label>
            <ConditionTagPicker
              selectedTags={selectedConditionTags}
              onToggleTag={handleToggleConditionTag}
            />
            <Input
              placeholder="Catatan kondisi lainnya (opsional)..."
              value={formData.kondisiAwal}
              onChange={e => setFormData(prev => ({ ...prev, kondisiAwal: e.target.value }))}
              className="h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>

          {/* SUDAH BAYAR TOGGLE */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground block">
              Status Pembayaran
            </label>
            <SudahBayarToggle
              checked={formData.sudahBayar}
              onChange={checked => setFormData(prev => ({ ...prev, sudahBayar: checked }))}
            />
          </div>

          {/* GROOMER & NOTES */}
          <div className="space-y-2.5">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Groomer yang Menangani
              </label>
              <Input
                placeholder="Nama staf groomer..."
                value={formData.groomerName}
                onChange={e => setFormData(prev => ({ ...prev, groomerName: e.target.value }))}
                className="h-9 text-xs rounded-xl bg-card border-border"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                Pesan Khusus Dari Owner
              </label>
              <Input
                placeholder="cth: Tolong ekor jangan dicukur terlalu pendek..."
                value={formData.catatan}
                onChange={e => setFormData(prev => ({ ...prev, catatan: e.target.value }))}
                className="h-9 text-xs rounded-xl bg-card border-border"
              />
            </div>
          </div>

          {/* SUMMARY CARD */}
          <Card className="p-3.5 bg-muted/30 border border-border/80 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kucing:</span>
              <span className="font-bold text-foreground">
                {selectedCat?.nama || newCatData.nama}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paket:</span>
              <span className="font-bold text-foreground">{formData.paketNama}</span>
            </div>
            <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
              <span>Total Biaya:</span>
              <span className="text-[#F5A940] font-mono">
                Rp {formatRupiah(formData.harga)}
              </span>
            </div>
          </Card>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setStep(2)}
              className="flex-1 h-12 rounded-2xl text-xs font-semibold cursor-pointer"
            >
              Kembali
            </Button>
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={submitCheckIn}
              className="flex-2 h-12 bg-[#3AAD7A] hover:bg-[#2b8a60] text-white rounded-2xl font-bold text-xs cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Konfirmasi Check-In ✂️'}
            </Button>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-5 space-y-4">
          <DialogHeader className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-base font-bold">
              Check-In Berhasil! 🎉
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {createdSession?.cat?.nama || 'Kucing'} telah masuk ke dalam antrian grooming.
            </DialogDescription>
          </DialogHeader>

          {createdSession && (
            <div className="p-3.5 bg-muted/40 rounded-2xl border border-border/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Token Live:</span>
                <span className="font-mono font-bold text-foreground">
                  {createdSession.public_token}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status Bayar:</span>
                <span
                  className={`font-semibold ${
                    createdSession.sudah_bayar ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {createdSession.sudah_bayar ? 'Sudah Lunas' : 'Belum Bayar'}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Button
              type="button"
              onClick={handleSendWa}
              className="w-full h-11 bg-[#3AAD7A] hover:bg-[#2b8a60] text-white rounded-xl font-bold text-xs cursor-pointer gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Kirim Link Live ke WhatsApp Owner</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className="w-full h-10 rounded-xl text-xs font-semibold cursor-pointer gap-2"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Link Report</span>
            </Button>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                resetForm()
                navigate('/employee/grooming')
              }}
              className="flex-1 text-xs cursor-pointer"
            >
              Ke Antrian
            </Button>
            <Button
              type="button"
              onClick={() => {
                const sId = createdSession?.id
                resetForm()
                navigate(`/employee/grooming/work?session=${sId}`)
              }}
              className="flex-1 bg-[#F5A940] hover:bg-[#e09833] text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Buka Meja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
