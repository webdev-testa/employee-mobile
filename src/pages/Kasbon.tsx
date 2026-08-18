import { useState, useRef } from "react";
import { Info, AlertTriangle, Send, ChevronLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useKasbon } from "@/hooks/useKasbon";
import type { Kasbon as KasbonType } from "@/types";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { KasbonStatusBadge } from "@/components/ui/status-badge";

type FlowState = 'idle' | 'form' | 'submitting' | 'success' | 'error';

const QUICK_AMOUNTS = [100000, 250000, 500000, 1000000];
const CATEGORIES = ['Kesehatan', 'Pendidikan', 'Kebutuhan rumah', 'Transportasi', 'Lainnya'];

function formatCurrency(n: number): string {
  if (n >= 1000000) return `Rp ${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}jt`;
  if (n >= 1000) return `Rp ${(n / 1000).toFixed(0)}k`;
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatCurrencyFull(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatDateFull(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function getNextMonthReset(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `Reset ${next.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
}

export default function Kasbon() {
  const { user } = useAuth();
  const {
    history,
    usedThisMonth,
    kasbonLimit,
    remainingLimit,
    loading,
    submitKasbon,
    cancelKasbon,
  } = useKasbon(user?.id);

  const handleCancel = async (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin membatalkan pengajuan kasbon ini?")) {
      const result = await cancelKasbon(id);
      if (result.success) {
        toast.success("Pengajuan kasbon berhasil dibatalkan");
      } else {
        toast.error(result.error || "Gagal membatalkan pengajuan");
      }
    }
  };

  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [amount, setAmount] = useState<number>(250000);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<{ amount: number; reason: string; category: string } | null>(null);
  const reasonRef = useRef<HTMLInputElement>(null);

  const usagePercent = kasbonLimit > 0 ? Math.min((usedThisMonth / kasbonLimit) * 100, 100) : 0;
  const thisMonthCount = history.filter(k => {
    if (!k.requested_at || k.status === 'rejected') return false;
    const now = new Date();
    const d = new Date(k.requested_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const pendingAmount = history
    .filter(k => k.status === 'pending')
    .reduce((sum, k) => sum + k.amount, 0);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setSubmitError('Alasan pengajuan wajib diisi');
      reasonRef.current?.focus();
      return;
    }
    if (amount <= 0) {
      setSubmitError('Jumlah kasbon harus lebih dari 0');
      return;
    }
    if (amount > remainingLimit) {
      setSubmitError(`Melebihi sisa limit. Sisa: ${formatCurrencyFull(remainingLimit)}`);
      return;
    }

    setSubmitError(null);
    setFlowState('submitting');

    const result = await submitKasbon(amount, reason.trim(), category);

    if (result.success) {
      setLastSubmitted({ amount, reason: reason.trim(), category });
      setFlowState('success');
      // Reset form
      setAmount(250000);
      setReason('');
      setCategory(CATEGORIES[0]);
    } else {
      setSubmitError(result.error ?? 'Terjadi kesalahan');
      setFlowState('form');
    }
  };

  const openForm = () => {
    setSubmitError(null);
    setFlowState('form');
  };

  // ─── LOADING STATE ────────────────────────────────────
  if (loading) {
    return <LoadingScreen message="Memuat data kasbon..." />;
  }

  // ─── FORM STATE ───────────────────────────────────────
  if (flowState === 'form' || flowState === 'submitting') {
    const isSubmitting = flowState === 'submitting';
    const exceedsLimit = amount > remainingLimit;

    return (
      <div className="flex flex-col h-full bg-background animate-in slide-in-from-right-2 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-border bg-card sticky top-0 z-10 flex items-center gap-3">
          <button onClick={() => !isSubmitting && setFlowState('idle')} disabled={isSubmitting} className="p-1 rounded-md hover:bg-muted transition-colors disabled:opacity-50">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold text-lg font-display">Ajukan Kasbon</h2>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Amount Hero */}
          <div className="bg-card border border-border/80 p-5 rounded-3xl text-center shadow-xs">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Jumlah Pengajuan Kasbon</p>
            <div className="text-4xl font-display font-black text-amber-600 dark:text-amber-400 mb-4 flex items-center justify-center gap-1.5 financial-num">
              <span className="text-2xl text-amber-500 font-bold self-start mt-1">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount === 0 ? "" : amount.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                onChange={e => {
                  const rawVal = e.target.value.replace(/\D/g, '');
                  setAmount(rawVal === '' ? 0 : parseInt(rawVal, 10));
                }}
                disabled={isSubmitting}
                className="bg-transparent border-none outline-none p-0 m-0 text-center w-full focus:ring-0 font-extrabold text-foreground"
              />
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {QUICK_AMOUNTS.map(val => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  disabled={isSubmitting}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                    amount === val
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'border border-border hover:bg-muted text-muted-foreground'
                  } disabled:opacity-50`}
                >
                  {val === 1000000 ? 'Rp 1jt' : `Rp ${val/1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Info: approval rule */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 items-start">
            <div className="p-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5 font-bold">
              <Info size={16} />
            </div>
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
              Kasbon &gt; Rp 200k memerlukan persetujuan admin. Biasanya diproses dalam 1–2 jam kerja.
            </div>
          </div>

          {/* Warning: limit */}
          {exceedsLimit ? (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-start">
              <div className="p-1 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 shrink-0 mt-0.5 font-bold">
                <AlertTriangle size={16} />
              </div>
              <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed font-medium">
                Jumlah kasbon <strong>melebihi</strong> sisa limit! Sisa limit kamu <strong className="financial-num">{formatCurrencyFull(remainingLimit)}</strong>.
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-3 items-start">
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5 font-bold">
                <Info size={16} />
              </div>
              <div className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                Sisa limit kasbon bulan ini: <strong className="financial-num">{formatCurrencyFull(remainingLimit)}</strong>.
              </div>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 items-start animate-shake">
              <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed font-semibold">{submitError}</div>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Alasan Pengajuan</label>
              <input
                ref={reasonRef}
                className={`w-full p-3.5 rounded-2xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${
                  submitError && !reason.trim() ? 'border-destructive' : 'border-border hover:border-muted-foreground/30'
                }`}
                type="text"
                maxLength={200}
                aria-label="Alasan pengajuan kasbon"
                placeholder="Biaya kesehatan, keperluan keluarga, dll..."
                value={reason}
                onChange={(e) => { setReason(e.target.value); setSubmitError(null); }}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Kategori Kebutuhan</label>
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger className="w-full p-3.5 h-auto rounded-2xl border border-border bg-card text-sm focus:ring-2 focus:ring-amber-500/30">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || exceedsLimit}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all ${
              isSubmitting || exceedsLimit 
                ? 'bg-muted text-muted-foreground cursor-not-allowed shadow-none' 
                : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? (
              <><Loader2 size={18} className="animate-spin" /> Mengirim Pengajuan...</>
            ) : (
              <><Send size={18} /> Kirim Pengajuan Kasbon</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── SUCCESS STATE ────────────────────────────────────
  if (flowState === 'success' && lastSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center h-full bg-background animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
          <Send size={28} />
        </div>

        <h2 className="text-2xl font-display font-extrabold mb-1">Pengajuan Terkirim!</h2>
        <p className="text-xs text-muted-foreground mb-6 max-w-[260px]">
          Pengajuan kasbon kamu sedang diproses dan menunggu persetujuan admin.
        </p>

        <div className="w-full bg-card border border-border/80 rounded-3xl p-5 mb-6 text-left shadow-xs">
          <div className="text-3xl font-display font-extrabold text-foreground text-center mb-4 financial-num">
            {formatCurrencyFull(lastSubmitted.amount)}
          </div>

          <div className="flex justify-between items-center py-2.5 border-b border-border/60">
            <span className="text-xs text-muted-foreground">Waktu Pengajuan</span>
            <span className="text-xs font-semibold">{formatDateFull(new Date().toISOString())}</span>
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-border/60">
            <span className="text-xs text-muted-foreground">Alasan</span>
            <span className="text-xs font-semibold truncate max-w-[160px]">{lastSubmitted.reason}</span>
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-border/60">
            <span className="text-xs text-muted-foreground">Kategori</span>
            <span className="text-xs font-semibold">{lastSubmitted.category}</span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-xs text-muted-foreground">Status</span>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/20">⏳ Menunggu approval</span>
          </div>
        </div>

        <button
          onClick={() => setFlowState('idle')}
          className="w-full py-3.5 rounded-2xl font-bold bg-primary text-primary-foreground shadow-xs active:scale-[0.98]"
        >
          Kembali ke Kasbon
        </button>
      </div>
    );
  }

  // ─── IDLE STATE (main page) ───────────────────────────
  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-24">
      {/* Page Header */}
      <div className="p-4 border-b border-border/80 bg-card sticky top-0 z-10 flex justify-between items-center shadow-2xs">
        <h2 className="font-bold text-lg font-display tracking-tight">Kasbon Karyawan</h2>
        <button 
          onClick={openForm} 
          disabled={remainingLimit <= 0} 
          className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
        >
          + Ajukan Kasbon
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Limit Card (Clean Flat Surface) */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Kasbon Terpakai Bulan Ini
            </p>
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
              {getNextMonthReset()}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-3">
            <div className="text-3xl font-display font-black text-foreground financial-num">
              {formatCurrency(usedThisMonth)}
            </div>
            <div className="text-xs text-muted-foreground font-semibold">
              Limit <strong className="text-foreground financial-num">{formatCurrency(kasbonLimit)}</strong>
            </div>
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${usagePercent}%` }}
            ></div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Sisa Limit: <strong className="text-foreground font-bold financial-num">{formatCurrency(remainingLimit)}</strong>
            </p>
            {pendingAmount > 0 && (
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">({formatCurrency(pendingAmount)} pending)</span>
            )}
          </div>
        </div>

        {/* Info Chips */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs text-center">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Pengambilan</p>
            <p className="text-2xl font-display font-black text-foreground financial-num">{thisMonthCount}x</p>
            <p className="text-[10px] text-muted-foreground">Bulan ini</p>
          </div>
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs text-center">
            <p className="text-[11px] text-muted-foreground font-medium mb-1">Belum Dipotong</p>
            <p className="text-2xl font-display font-black text-amber-600 dark:text-amber-400 financial-num">
              {formatCurrency(
                history
                  .filter(k => k.status === 'approved' || k.status === 'pending')
                  .reduce((sum, k) => sum + k.amount, 0)
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">Gaji {new Date().toLocaleDateString('id-ID', { month: 'short' })}</p>
          </div>
        </div>

        {/* Riwayat Header */}
        <div className="flex items-center justify-between pt-1">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Riwayat Pengajuan</h4>
          <span className="text-[11px] text-muted-foreground font-semibold">{history.length} Transaksi</span>
        </div>

        {/* Riwayat List */}
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="bg-card border border-border/80 rounded-2xl p-6 text-center text-muted-foreground shadow-xs">
              <p className="text-sm font-medium">Belum ada riwayat pengajuan</p>
              <p className="text-xs mt-0.5">Kasbon yang diajukan akan tercatat di sini</p>
            </div>
          ) : (
            history.map((item: KasbonType) => (
              <div
                key={item.id}
                className="bg-card border border-border/80 rounded-2xl p-4 flex items-center gap-3 shadow-xs hover:border-border transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                  item.status === 'approved' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20' :
                  item.status === 'rejected' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20' :
                  'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                }`}>
                  {item.status === 'approved' ? '✓' : item.status === 'rejected' ? '✗' : '💰'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-base truncate financial-num text-foreground">{formatCurrencyFull(item.amount)}</p>
                  <p className="text-xs text-muted-foreground truncate font-medium">{item.reason || item.category || '-'}</p>
                </div>
                
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">{formatDate(item.requested_at)}</span>
                  <KasbonStatusBadge status={item.status} />
                  {item.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancel(item.id); }}
                      className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline mt-0.5"
                    >
                      Batalkan
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
