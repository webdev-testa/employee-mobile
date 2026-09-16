import { Link, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { OwnerContactPicker } from '@/components/pos/OwnerContactPicker'
import { SudahBayarToggle } from '@/components/shared/SudahBayarToggle'
import { useCheckIn } from '@/hooks/pos/useCheckIn'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  MessageCircle,
  Plus,
  Loader2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatRupiah, generateCheckinTemplate, formatTanggalPendek } from '@/utils/pos.utils'
import { openWhatsApp } from '@/utils/grooming.utils'
import { toast } from 'sonner'

export default function HotelCheckIn() {
  const navigate = useNavigate()

  const {
    step,
    setStep,
    // Step 1: Owner
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
    // Step 2: Cat
    selectedCat,
    isNewCat,
    setIsNewCat,
    newCatData,
    setNewCatData,
    ownerCats,
    handleSelectCat,
    handleChooseNewCat,
    // Step 3: Details & DP
    formData,
    setFormData,
    packages,
    handleSelectPackage,
    calculatedNights,
    estimatedTotal,
    // Submission
    submitCheckIn,
    isSubmitting,
    createdBooking,
    isSuccessModalOpen,
    setIsSuccessModalOpen,
    resetForm,
  } = useCheckIn()

  const handleSendWa = () => {
    if (!createdBooking) return
    const phone = createdBooking.owner?.no_wa || newOwnerData.no_wa
    if (!phone) {
      toast.error('Nomor WhatsApp tidak ditemukan.')
      return
    }
    const message = generateCheckinTemplate(
      createdBooking,
      formData.dp || 0,
      'Dr. Meow Cat Hotel'
    )
    openWhatsApp(phone, message)
  }

  // Step 1 validation
  const isStep1Valid = Boolean(
    selectedOwner ||
    (isNewOwner && newOwnerData.nama.trim().length >= 2 && newOwnerData.no_wa.replace(/\D/g, '').length >= 8)
  )

  // Step 2 validation
  const effectiveIsNewCat = isNewCat || isNewOwner || !selectedOwner || ownerCats.length === 0
  const isStep2Valid = Boolean(
    selectedCat ||
    (effectiveIsNewCat && newCatData.nama.trim().length >= 2)
  )

  return (
    <div className="space-y-4 p-4 pb-24">
      {/* TOP HEADER */}
      <div className="flex items-center gap-3 pt-1">
        <Link to="/employee/hotel">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">
            Check-In Tamu Hotel 🏨
          </h1>
          <p className="text-xs text-muted-foreground">
            Form pendaftaran penitipan kucing baru
          </p>
        </div>
      </div>

      {/* STEP PROGRESS INDICATOR */}
      <div className="flex items-center justify-between px-2 pt-2">
        {[
          { num: 1, title: 'Owner' },
          { num: 2, title: 'Kucing' },
          { num: 3, title: 'Kamar & DP' },
        ].map((s, idx) => {
          const isActive = step === s.num
          const isDone = step > s.num
          return (
            <div key={s.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    isDone
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                      ? 'bg-primary/20 text-primary border border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isActive ? 'text-foreground font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {s.title}
                </span>
              </div>
              {idx < 2 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    step > idx + 1 ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* STEP 1: OWNER SELECTION */}
      {step === 1 && (
        <Card className="p-4 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-foreground">1. Data Pemilik (Owner)</h2>
            <p className="text-xs text-muted-foreground">
              Cari owner terdaftar atau daftarkan pelanggan baru
            </p>
          </div>

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

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              onClick={() => setStep(2)}
              disabled={!isStep1Valid}
              className="w-full sm:w-auto px-6 h-11 rounded-xl font-bold bg-[#3AAD7A] hover:bg-[#3AAD7A]/90 text-white cursor-pointer disabled:opacity-50"
            >
              Lanjut ke Data Kucing →
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: CAT SELECTION */}
      {step === 2 && (
        <Card className="p-4 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-foreground">2. Data Kucing</h2>
            <p className="text-xs text-muted-foreground">
              Pilih kucing milik {selectedOwner?.nama || newOwnerData.nama || 'Owner'}
            </p>
          </div>

          {/* Existing Cats Selection */}
          {!isNewCat && selectedOwner && ownerCats.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Pilih Dari Kucing Terdaftar:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ownerCats.map(c => {
                  const isSelected = selectedCat?.id === c.id
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectCat(c)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-[#3AAD7A]/15 border-[#3AAD7A] ring-1 ring-[#3AAD7A]'
                          : 'border-border/80 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden flex items-center justify-center font-bold text-xs text-muted-foreground">
                          {c.foto_url ? (
                            <img
                              src={c.foto_url}
                              alt={c.nama}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            '🐱'
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-foreground">{c.nama}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {c.ras || 'Domestic'} • {c.jenis_kelamin || 'Jantan'}
                          </div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#3AAD7A] text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleChooseNewCat}
                  className="rounded-xl text-xs gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> + Tambah Kucing Lain Milik Owner Ini
                </Button>
              </div>
            </div>
          )}

          {/* New Cat Form */}
          {(isNewCat || !selectedOwner || ownerCats.length === 0) && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Informasi Kucing Baru
                </span>
                {ownerCats.length > 0 && selectedOwner && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsNewCat(false)}
                    className="text-xs text-primary h-7 px-2"
                  >
                    ← Pilih Kucing Lama
                  </Button>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Nama Kucing *</label>
                <Input
                  placeholder="Contoh: Milo"
                  value={newCatData.nama}
                  onChange={e => setNewCatData({ ...newCatData, nama: e.target.value })}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Ras / Breed</label>
                  <Input
                    placeholder="Contoh: British Shorthair"
                    value={newCatData.ras}
                    onChange={e => setNewCatData({ ...newCatData, ras: e.target.value })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Jenis Kelamin</label>
                  <select
                    value={newCatData.jenis_kelamin}
                    onChange={e =>
                      setNewCatData({
                        ...newCatData,
                        jenis_kelamin: e.target.value as 'Jantan' | 'Betina',
                      })
                    }
                    className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary"
                  >
                    <option value="Jantan">Jantan ♂</option>
                    <option value="Betina">Betina ♀</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Warna / Corak</label>
                  <Input
                    placeholder="Contoh: Abu-abu"
                    value={newCatData.warna}
                    onChange={e => setNewCatData({ ...newCatData, warna: e.target.value })}
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Estimasi Umur</label>
                  <Input
                    placeholder="Contoh: 1 tahun"
                    value={newCatData.umur_estimasi}
                    onChange={e =>
                      setNewCatData({ ...newCatData, umur_estimasi: e.target.value })
                    }
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Catatan Kesehatan / Khusus
                </label>
                <Input
                  placeholder="Contoh: Vaksin lengkap, mata agak berair, alergi ayam"
                  value={newCatData.catatan_kesehatan}
                  onChange={e =>
                    setNewCatData({ ...newCatData, catatan_kesehatan: e.target.value })
                  }
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              className="h-11 rounded-xl cursor-pointer"
            >
              ← Kembali
            </Button>
            <Button
              type="button"
              onClick={() => setStep(3)}
              disabled={!isStep2Valid}
              className="px-6 h-11 rounded-xl font-bold bg-[#3AAD7A] hover:bg-[#3AAD7A]/90 text-white cursor-pointer disabled:opacity-50"
            >
              Lanjut ke Kamar & DP →
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: ROOM, DATES & DP */}
      {step === 3 && (
        <Card className="p-4 rounded-2xl border border-border/80 bg-card space-y-4 shadow-xs">
          <div>
            <h2 className="text-sm font-bold text-foreground">3. Kamar, Tanggal & Uang Muka</h2>
            <p className="text-xs text-muted-foreground">
              Pilih paket kamar, durasi inap, dan catat DP jika ada
            </p>
          </div>

          {/* Package Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Pilih Paket Kamar:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {packages.map(pkg => {
                const isSelected = formData.paket === pkg.nama
                return (
                  <div
                    key={pkg.id}
                    onClick={() => handleSelectPackage(pkg)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#3AAD7A]/15 border-[#3AAD7A] ring-1 ring-[#3AAD7A]'
                        : 'border-border/80 hover:bg-muted/30'
                    }`}
                  >
                    <div className="font-bold text-xs text-foreground">{pkg.nama}</div>
                    <div className="text-sm font-extrabold text-[#3AAD7A] mt-1 font-mono">
                      Rp {formatRupiah(pkg.harga_per_hari)}
                      <span className="text-[10px] font-normal text-muted-foreground"> /malam</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dates In & Out */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Tanggal Masuk</label>
              <Input
                type="date"
                value={formData.tanggal_masuk}
                onChange={e => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Estimasi Selesai (Keluar)
              </label>
              <Input
                type="date"
                value={formData.tanggal_keluar_estimasi}
                onChange={e =>
                  setFormData({ ...formData, tanggal_keluar_estimasi: e.target.value })
                }
                className="h-10 rounded-xl"
              />
            </div>
          </div>

          {/* Stay Calculation Card */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Durasi Menginap:</span>
              <span className="font-semibold text-foreground">{calculatedNights} Malam</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Biaya per Malam:</span>
              <span>Rp {formatRupiah(formData.harga_per_hari)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/60 text-sm font-bold text-foreground">
              <span>Total Estimasi Inap:</span>
              <span className="text-[#3AAD7A] font-mono">Rp {formatRupiah(estimatedTotal)}</span>
            </div>
          </div>

          {/* DP Input */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Uang Muka (DP / Titipan)</label>
              <span className="text-[11px] text-muted-foreground">Opsional</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                Rp
              </span>
              <Input
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={formData.dp || ''}
                onChange={e => {
                  const val = Math.max(0, parseInt(e.target.value) || 0)
                  setFormData({ ...formData, dp: val })
                }}
                className="pl-9 h-10 rounded-xl font-mono text-sm"
              />
            </div>
          </div>

          {/* DP Payment Toggle */}
          {(formData.dp || 0) > 0 && (
            <SudahBayarToggle
              checked={formData.sudah_bayar_dp || false}
              onChange={val => setFormData({ ...formData, sudah_bayar_dp: val })}
              label="Tandai DP Sudah Diterima Tunai/Transfer"
            />
          )}

          {/* Catatan Tambahan */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-medium text-foreground">
              Catatan Fasilitas / Kebiasaan Kucing
            </label>
            <Input
              placeholder="Contoh: Bawa dry food sendiri, kandang dekat jendela, dll."
              value={formData.catatan}
              onChange={e => setFormData({ ...formData, catatan: e.target.value })}
              className="h-10 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(2)}
              className="h-11 rounded-xl cursor-pointer"
            >
              ← Kembali
            </Button>
            <Button
              type="button"
              onClick={submitCheckIn}
              disabled={isSubmitting}
              className="px-6 h-11 rounded-xl font-bold bg-[#3AAD7A] hover:bg-[#3AAD7A]/90 text-white cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mendaftarkan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Konfirmasi Check-In
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* SUCCESS CONFIRMATION DIALOG */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Check-In Berhasil Dicatat! 🐾
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kucing {createdBooking?.cat?.nama || 'tamu'} telah resmi terdaftar di Cat Hotel
            </DialogDescription>
          </DialogHeader>

          {createdBooking && (
            <div className="my-3 p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama Kucing:</span>
                <span className="font-bold text-foreground">{createdBooking.cat?.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner:</span>
                <span className="font-medium text-foreground">{createdBooking.owner?.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paket:</span>
                <span className="font-medium text-foreground">{createdBooking.paket}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Periode:</span>
                <span className="font-medium text-foreground">
                  {formatTanggalPendek(createdBooking.tanggal_masuk)} –{' '}
                  {formatTanggalPendek(createdBooking.tanggal_keluar_estimasi)}
                </span>
              </div>
              {formData.dp ? (
                <div className="flex justify-between pt-1 border-t border-border/60">
                  <span className="text-muted-foreground">Uang Muka (DP):</span>
                  <span className="font-bold text-emerald-600">Rp {formatRupiah(formData.dp)}</span>
                </div>
              ) : null}
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:gap-0">
            <Button
              type="button"
              onClick={handleSendWa}
              className="w-full h-11 rounded-xl font-bold bg-[#25D366] hover:bg-[#25D366]/90 text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              Kirim Tanda Terima ke WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSuccessModalOpen(false)
                resetForm()
                navigate('/employee/hotel')
              }}
              className="w-full h-11 rounded-xl font-semibold cursor-pointer"
            >
              Selesai & Kembali ke Hotel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
