import { useState, useRef } from "react";
import { Info, AlertTriangle, Send, Check, ChevronRight, ChevronLeft, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useKasbon } from "@/hooks/useKasbon";
import type { Kasbon as KasbonType } from "@/types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/PageHeader";
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

function getMonthName(): string {
  return new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function getNextMonthReset(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `Reset ${next.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
}

// StatusBadge deleted since we use KasbonStatusBadge from status-badge.tsx

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 text-[16px] bg-[#F5A940]/10 border border-[#F5A940]/30">
          💰
        </div>
      );
    case 'approved':
      return (
        <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 text-[16px] bg-[#3AAD7A]/10 border border-[#3AAD7A]/30 text-[#3AAD7A]">
          ✓
        </div>
      );
    case 'rejected':
      return (
        <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 text-[16px] bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171]">
          ✗
        </div>
      );
    default:
      return (
        <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 text-[16px] bg-[#F0FAFF] border border-[#C8E8F5] text-[#8ABAC8]">
          −
        </div>
      );
  }
}

export default function Kasbon() {
  const { user } = useAuth();
  const {
    history,
    usedThisMonth,
    kasbonLimit,
    remainingLimit,
    pendingCount,
    loading,
    refreshing,
    refresh,
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
        <div className="p-4 flex-1 overflow-y-auto">
          {/* Amount */}
          <div className="bg-card border border-border p-5 rounded-2xl text-center mb-6 shadow-sm">
            <p className="text-sm text-muted-foreground mb-2">Jumlah Kasbon</p>
            <div className="text-4xl font-display font-bold text-amber-500 mb-4 flex items-center justify-center gap-1">
              <span className="text-xl text-muted-foreground font-medium self-start mt-1">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount === 0 ? "" : amount.toString().replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                onChange={e => {
                  const rawVal = e.target.value.replace(/\D/g, '');
                  setAmount(rawVal === '' ? 0 : parseInt(rawVal, 10));
                }}
                disabled={isSubmitting}
                className="bg-transparent border-none outline-none p-0 m-0 text-center w-full focus:ring-0"
              />
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {QUICK_AMOUNTS.map(val => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  disabled={isSubmitting}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    amount === val
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-border hover:bg-muted text-muted-foreground'
                  } disabled:opacity-50`}
                >
                  {val === 1000000 ? '1jt' : `${val/1000}k`}
                </button>
              ))}
            </div>
          </div>

          {/* Info: approval rule */}
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl p-4 mb-4 flex gap-3 items-start">
            <Info size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Kasbon &gt; Rp 200k memerlukan approval dari admin sebelum bisa dicairkan. Biasanya diproses dalam 1–2 jam kerja.
            </div>
          </div>

          {/* Warning: limit */}
          {exceedsLimit ? (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-4 mb-4 flex gap-3 items-start">
              <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-300/90 leading-relaxed">
                Jumlah kasbon <strong>melebihi</strong> sisa limit! Sisa limit kamu <strong>{formatCurrencyFull(remainingLimit)}</strong>.
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-4 mb-4 flex gap-3 items-start">
              <Info size={18} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300/90 leading-relaxed">
                Sisa limit kamu <strong>{formatCurrencyFull(remainingLimit)}</strong>. Jumlah kasbon tidak boleh melebihi sisa limit bulan ini.
              </div>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl p-4 mb-4 flex gap-3 items-start animate-shake">
              <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-300/90 leading-relaxed">{submitError}</div>
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4 mb-6">
            <div className={`space-y-2`}>
              <label className="text-sm font-medium text-muted-foreground">Alasan pengajuan</label>
              <input
                ref={reasonRef}
                className={`w-full p-3 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all ${
                  submitError && !reason.trim() ? 'border-destructive' : 'border-border hover:border-muted-foreground/30'
                }`}
                type="text"
                placeholder="Biaya berobat, keperluan keluarga, dll..."
                value={reason}
                onChange={(e) => { setReason(e.target.value); setSubmitError(null); }}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Kategori</label>
              <Select value={category} onValueChange={setCategory} disabled={isSubmitting}>
                <SelectTrigger className="w-full p-3 h-auto rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20">
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
            className={`w-full py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
              isSubmitting || exceedsLimit 
                ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isSubmitting ? (
              <><Loader2 size={18} className="animate-spin" /> Mengirim...</>
            ) : (
              <><Send size={18} /> Kirim Pengajuan</>
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
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center mb-6 shadow-sm">
          <Send size={32} />
        </div>

        <h2 className="text-2xl font-display font-bold mb-2">Pengajuan Terkirim!</h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-[250px]">
          Kasbon kamu sedang menunggu persetujuan dari admin.
        </p>

        <div className="w-full bg-card border border-border rounded-2xl p-5 mb-8 text-left shadow-sm">
          <div className="text-3xl font-display font-bold text-amber-500 text-center mb-4">
            {formatCurrencyFull(lastSubmitted.amount)}
          </div>

          <div className="flex justify-between items-center py-2 border-b border-muted">
            <span className="text-xs text-muted-foreground">Tanggal</span>
            <span className="text-sm font-medium">{formatDateFull(new Date().toISOString())}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-muted">
            <span className="text-xs text-muted-foreground">Alasan</span>
            <span className="text-sm font-medium truncate max-w-[150px]">{lastSubmitted.reason}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-muted">
            <span className="text-xs text-muted-foreground">Kategori</span>
            <span className="text-sm font-medium">{lastSubmitted.category}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs text-muted-foreground">Status</span>
            <span className="text-sm font-medium text-amber-500">Menunggu approval</span>
          </div>
        </div>

        <button
          onClick={() => setFlowState('idle')}
          className="w-full py-3.5 rounded-xl font-medium bg-secondary text-secondary-foreground"
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
      <div className="p-4 border-b border-border bg-card sticky top-0 z-10 flex justify-between items-center">
        <h2 className="font-semibold text-lg font-display">Kasbon</h2>
        <button onClick={openForm} disabled={remainingLimit <= 0} className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50">
          + Ajukan Kasbon
        </button>
      </div>

      <div className="p-4">
        {/* Limit Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 relative z-10">
            Kasbon Terpakai Bulan Ini
          </p>
          <div className="flex items-baseline justify-between mb-3 relative z-10">
            <div className="text-3xl font-display font-bold text-amber-500">
              {formatCurrency(usedThisMonth)}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Limit {formatCurrency(kasbonLimit)}
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-3 relative z-10">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-700"
              style={{ width: `${usagePercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center relative z-10">
            <p className="text-xs text-muted-foreground">
              Sisa Limit: <strong className="text-foreground">{formatCurrency(remainingLimit)}</strong>
              {pendingAmount > 0 && <span className="ml-1 opacity-75">(incl. {formatCurrency(pendingAmount)} pending)</span>}
            </p>
            <p className="text-[10px] text-muted-foreground">{getNextMonthReset()}</p>
          </div>
        </div>

        {/* Info Chips */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-muted-foreground font-medium mb-1">Pengambilan</p>
            <p className="text-2xl font-display font-bold">{thisMonthCount}x</p>
            <p className="text-[10px] text-muted-foreground">Bulan ini</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm text-center">
            <p className="text-xs text-muted-foreground font-medium mb-1">Belum Dipotong</p>
            <p className="text-2xl font-display font-bold text-amber-500">
              {formatCurrency(
                history
                  .filter(k => k.status === 'approved' || k.status === 'pending')
                  .reduce((sum, k) => sum + k.amount, 0)
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">Dari gaji {new Date().toLocaleDateString('id-ID', { month: 'short' })}</p>
          </div>
        </div>

        {/* Riwayat Header */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Riwayat Pengajuan</h4>
        </div>

        {/* Riwayat List */}
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center text-muted-foreground shadow-sm">
              <p className="text-sm">Belum ada riwayat</p>
              <p className="text-xs">Kasbon yang diajukan akan muncul di sini</p>
            </div>
          ) : (
            history.map((item: KasbonType) => (
              <div
                key={item.id}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm hover:bg-muted/30 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  item.status === 'approved' ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' :
                  item.status === 'rejected' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
                  'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                }`}>
                  {item.status === 'approved' ? '✓' : item.status === 'rejected' ? '✗' : '💰'}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-base truncate">{formatCurrencyFull(item.amount)}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.reason || item.category || '-'}</p>
                </div>
                
                <div className="text-right shrink-0 flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground mb-1">{formatDate(item.requested_at)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${
                    item.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' :
                    item.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                  }`}>
                    {item.status}
                  </span>
                  {item.status === 'pending' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancel(item.id); }}
                      className="text-[10px] text-destructive hover:underline mt-1"
                    >
                      Batal
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
