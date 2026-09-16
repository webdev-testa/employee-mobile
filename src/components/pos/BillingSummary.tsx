import React from 'react'
import { Receipt, Calendar, PlusCircle, ShieldCheck } from 'lucide-react'
import type { Booking, BillingCalculation } from '@/types/pos.types'
import { formatRupiah, formatTanggalPendek } from '@/utils/pos.utils'

interface BillingSummaryProps {
  booking: Booking
  billing: BillingCalculation
  checkoutDate: string
  extraCharges?: { keterangan: string; jumlah: number }[]
  className?: string
}

export const BillingSummary: React.FC<BillingSummaryProps> = ({
  booking,
  billing,
  checkoutDate,
  extraCharges = [],
  className = '',
}) => {
  const isLunas = billing.sisa_bayar <= 0

  return (
    <div className={`bg-card rounded-2xl border border-border/80 shadow-xs overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Receipt size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground font-display">Ringkasan Biaya</h3>
            <p className="text-xs text-muted-foreground">Rincian tagihan menginap</p>
          </div>
        </div>
        {isLunas && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-status-success/15 text-status-success">
            <ShieldCheck size={13} /> Lunas
          </span>
        )}
      </div>

      <div className="p-5 space-y-4 text-xs">
        {/* Stay Period & Room Rate */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <div className="font-semibold text-foreground flex items-center gap-1">
              <Calendar size={13} className="text-muted-foreground" />
              Kamar ({booking.paket})
            </div>
            <div className="text-muted-foreground text-[11px]">
              {formatTanggalPendek(booking.tanggal_masuk)} – {formatTanggalPendek(checkoutDate)} ({billing.jumlah_malam} malam × Rp {formatRupiah(booking.harga_per_hari)})
            </div>
          </div>
          <span className="font-bold text-foreground text-sm">
            Rp {formatRupiah(billing.subtotal)}
          </span>
        </div>

        {/* Extra Charges Breakdown if any */}
        {extraCharges.length > 0 && (
          <div className="pt-2 border-t border-dashed border-border/60 space-y-2">
            <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <PlusCircle size={12} /> Biaya Tambahan
            </div>
            {extraCharges.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between pl-2">
                <span className="text-muted-foreground">{item.keterangan || 'Biaya Lainnya'}</span>
                <span className="font-medium text-foreground">Rp {formatRupiah(item.jumlah)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total Cost Before DP */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <span className="text-muted-foreground">Total Tagihan</span>
          <span className="font-semibold text-foreground">Rp {formatRupiah(billing.total)}</span>
        </div>

        {/* Down Payment (DP) row */}
        {billing.total_dp > 0 && (
          <div className="flex items-center justify-between text-status-success">
            <span>Uang Muka (DP Terbayar)</span>
            <span className="font-semibold">- Rp {formatRupiah(billing.total_dp)}</span>
          </div>
        )}

        {/* Grand Remaining Balance */}
        <div className="pt-3 border-t-2 border-border/80 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-foreground">Sisa Pelunasan</div>
            <div className="text-[10px] text-muted-foreground">
              {isLunas ? 'Semua tagihan telah diselesaikan' : 'Tagihan yang perlu dibayar'}
            </div>
          </div>
          <div className="text-right">
            <span
              className={`text-lg font-extrabold tracking-tight ${
                isLunas ? 'text-status-success' : 'text-primary'
              }`}
            >
              Rp {formatRupiah(billing.sisa_bayar)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
