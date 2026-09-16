import { useState } from 'react'
import {
  Search,
  X,
  UserPlus,
  CheckCircle2,
  Phone,
  MapPin,
  RotateCcw,
  Users,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Owner } from '@/types/pos.types'

export interface NewOwnerFormValues {
  nama: string
  no_wa: string
  email?: string
  alamat?: string
}

export interface OwnerContactPickerProps<T extends NewOwnerFormValues = NewOwnerFormValues> {
  selectedOwner: Owner | null
  onSelectOwner: (owner: Owner) => void
  onClearOwner: () => void
  isNewOwner: boolean
  onToggleNewOwner: (isNew: boolean) => void
  newOwnerData: T
  onChangeNewOwnerData: (updater: (prev: T) => T) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  owners: Owner[]
  isLoading?: boolean
  title?: string
  description?: string
}

const formatPhoneDisplay = (phone: string): string => {
  if (!phone) return ''
  const clean = phone.replace(/\D/g, '')
  if (clean.length >= 10 && clean.length <= 13) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8)}`
  }
  return phone
}

export function OwnerContactPicker({
  selectedOwner,
  onSelectOwner,
  onClearOwner,
  isNewOwner,
  onToggleNewOwner,
  newOwnerData,
  onChangeNewOwnerData,
  searchQuery,
  onSearchChange,
  owners = [],
  isLoading = false,
  title = 'Identitas Pemilik Kucing',
  description = 'Pilih dari daftar kontak owner terdaftar atau buat pendaftaran baru.',
}: OwnerContactPickerProps) {
  const [selectedSort, setSelectedSort] = useState<'all' | 'with-cats'>('all')

  const filteredOwners = owners.filter(owner => {
    if (selectedSort === 'with-cats' && (!owner.cats || owner.cats.length === 0)) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-3.5">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/70">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#F5A940]" />
            {title}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
        </div>

        {!isNewOwner && !selectedOwner && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleNewOwner(true)}
            className="text-xs h-8 gap-1.5 rounded-xl border-dashed border-border hover:bg-muted/50 font-semibold cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#F5A940]" />
            + Daftarkan Pemilik Baru
          </Button>
        )}
      </div>

      {/* STATE 1: OWNER TERPILIH */}
      {selectedOwner && !isNewOwner && (
        <Card className="p-4 rounded-2xl border-2 border-[#3AAD7A]/30 bg-[#3AAD7A]/5 shadow-xs space-y-3 transition-all">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                <CheckCircle2 className="w-3 h-3" />
                Owner Terpilih
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClearOwner}
              className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Ganti
            </Button>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#F5A940]/20 text-[#F5A940] flex items-center justify-center font-bold text-sm shrink-0">
              {selectedOwner.nama.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-foreground">{selectedOwner.nama}</div>
              <div className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-[#3AAD7A]" />
                {formatPhoneDisplay(selectedOwner.no_wa)}
              </div>
              {selectedOwner.alamat && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{selectedOwner.alamat}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* STATE 2: FORM REGISTRASI OWNER BARU */}
      {isNewOwner && (
        <Card className="p-4 rounded-2xl border-2 border-[#F5A940]/40 bg-[#F5A940]/5 shadow-xs space-y-3 transition-all">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25">
                <UserPlus className="w-3 h-3" />
                Pendaftaran Pemilik Baru
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onToggleNewOwner(false)}
              className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3 mr-1" />
              Batal
            </Button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Nama Lengkap Pemilik <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="cth: Ibu Sarah / Mas Rizki"
                value={newOwnerData.nama}
                onChange={e => onChangeNewOwnerData(prev => ({ ...prev, nama: e.target.value }))}
                className="h-9 text-xs rounded-xl bg-background border-border"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Nomor WhatsApp <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="cth: 081234567890"
                type="tel"
                value={newOwnerData.no_wa}
                onChange={e => onChangeNewOwnerData(prev => ({ ...prev, no_wa: e.target.value }))}
                className="h-9 text-xs rounded-xl bg-background border-border font-mono"
              />
              <span className="text-[10px] text-muted-foreground mt-0.5 block">
                Digunakan untuk mengirim link live progress grooming & notifikasi selesai.
              </span>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Alamat / Domisili
              </label>
              <Input
                placeholder="cth: Jl. Margonda No. 12, Depok"
                value={newOwnerData.alamat || ''}
                onChange={e => onChangeNewOwnerData(prev => ({ ...prev, alamat: e.target.value }))}
                className="h-9 text-xs rounded-xl bg-background border-border"
              />
            </div>
          </div>
        </Card>
      )}

      {/* STATE 3: PENCARIAN & DAFTAR OWNER */}
      {!selectedOwner && !isNewOwner && (
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="search"
              placeholder="Ketik nama atau no WA pemilik..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-9 pr-8 h-10 text-xs rounded-xl bg-card border-border"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedSort('all')}
              className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                selectedSort === 'all'
                  ? 'bg-foreground text-background border-transparent font-semibold'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              Semua ({owners.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedSort('with-cats')}
              className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium cursor-pointer transition-all ${
                selectedSort === 'with-cats'
                  ? 'bg-foreground text-background border-transparent font-semibold'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              Punya Kucing ({owners.filter(o => o.cats && o.cats.length > 0).length})
            </button>
          </div>

          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Memuat data pemilik...
            </div>
          ) : filteredOwners.length > 0 ? (
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredOwners.map(owner => (
                <button
                  key={owner.id}
                  type="button"
                  onClick={() => onSelectOwner(owner)}
                  className="w-full p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/40 hover:border-[#F5A940]/60 transition-all text-left flex items-center justify-between gap-2 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground group-hover:text-[#F5A940] transition-colors truncate">
                      {owner.nama}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {owner.no_wa}
                    </div>
                  </div>
                  {owner.cats && owner.cats.length > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-semibold text-muted-foreground shrink-0">
                      🐱 {owner.cats.length} kucing
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border bg-card text-center space-y-2">
              <div className="text-xs text-muted-foreground">
                Tidak ada pemilik dengan kata kunci &quot;{searchQuery}&quot;
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChangeNewOwnerData(prev => ({ ...prev, nama: searchQuery }))
                  onToggleNewOwner(true)
                }}
                className="text-xs h-8 rounded-xl cursor-pointer"
              >
                + Buat Pemilik Baru &quot;{searchQuery}&quot;
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
