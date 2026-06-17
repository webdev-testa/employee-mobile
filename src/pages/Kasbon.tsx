import { useState, useRef } from "react";
import { ChevronLeft, Info, AlertTriangle, Send, Check, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useKasbon } from "@/hooks/useKasbon";
import type { Kasbon as KasbonType } from "@/types";
import { Button } from "@/components/ui/button";

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

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#F5A940]/10 text-[#F5A940]">
          ⏳ Menunggu
        </div>
      );
    case 'approved':
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#3AAD7A]/10 text-[#3AAD7A]">
          ✓ Disetujui
        </div>
      );
    case 'deducted':
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#F0FAFF] border border-[#C8E8F5] text-[#8ABAC8]">
          Dipotong
        </div>
      );
    case 'rejected':
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#F87171]/10 text-[#F87171]">
          ✗ Ditolak
        </div>
      );
    default:
      return (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#F0FAFF] border border-[#C8E8F5] text-[#8ABAC8]">
          {status}
        </div>
      );
  }
}

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
  } = useKasbon(user?.id);

  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [amount, setAmount] = useState<number>(250000);
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<{ amount: number; reason: string; category: string } | null>(null);
  const reasonRef = useRef<HTMLInputElement>(null);

  const usagePercent = kasbonLimit > 0 ? Math.min((usedThisMonth / kasbonLimit) * 100, 100) : 0;
  const thisMonthCount = history.filter(k => {
    if (!k.requested_at) return false;
    const now = new Date();
    const d = new Date(k.requested_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F0FAFF] font-sans">
        <Loader2 size={36} className="text-[#F5A940] animate-spin mb-4" />
        <div className="text-[14px] text-[#4A7A8A]">Memuat data kasbon...</div>
      </div>
    );
  }

  // ─── FORM STATE ───────────────────────────────────────
  if (flowState === 'form' || flowState === 'submitting') {
    const isSubmitting = flowState === 'submitting';
    const exceedsLimit = amount > remainingLimit;

    return (
      <div className="flex flex-col min-h-screen bg-[#F0FAFF] font-sans">
        {/* Header */}
        <div className="p-6 pb-5 flex items-center gap-3.5">
          <Button
            onClick={() => !isSubmitting && setFlowState('idle')}
            disabled={isSubmitting}
            variant="outline"
            size="icon"
            className="cursor-pointer disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </Button>
          <div className="font-['Syne'] text-[22px] font-bold text-[#1A3A4A] tracking-[-0.3px]">Ajukan Kasbon</div>
        </div>

        {/* Body */}
        <div className="px-5 flex-1 overflow-y-auto hide-scrollbar">
          {/* Amount */}
          <div className="bg-white border border-[#C8E8F5] rounded-[22px] p-5 mb-3.5 text-center shadow-sm">
            <div className="text-[11px] text-[#8ABAC8] uppercase tracking-[1px] font-mono mb-3.5">Jumlah kasbon</div>
            <div className="font-['Syne'] text-[44px] font-bold text-[#1A3A4A] tracking-[-2px] leading-none mb-4 min-h-[52px] flex items-center justify-center gap-1">
              <span className="text-[22px] text-[#4A7A8A] font-light self-start mt-2">Rp</span>
              <span>{amount.toLocaleString('id-ID')}</span>
              <span className="inline-block w-[2px] h-[40px] bg-[#F5A940] rounded-[1px] animate-pulse ml-0.5 align-middle"></span>
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              {QUICK_AMOUNTS.map(val => (
                <Button
                  key={val}
                  onClick={() => setAmount(val)}
                  disabled={isSubmitting}
                  variant={amount === val ? "orange" : "outline"}
                  className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-mono cursor-pointer ${
                    amount === val
                    ? 'bg-[#F5A940]/10 border border-[#F5A940]/30 text-[#F5A940] shadow-none'
                    : 'bg-white border-[#C8E8F5] text-[#4A7A8A] hover:bg-[#F0FAFF]'
                  } disabled:opacity-50`}
                >
                  {val === 1000000 ? '1jt' : `${val/1000}k`}
                </Button>
              ))}
            </div>
          </div>

          {/* Info: approval rule */}
          <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 mb-3.5 flex gap-3 items-start shadow-sm">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 bg-[#F5A940]/10 border border-[#F5A940]/30">
              <Info size={16} className="text-[#F5A940]" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#1A3A4A] mb-1">Perlu persetujuan admin</div>
              <div className="text-[12px] text-[#4A7A8A] leading-[1.5]">Kasbon &gt; Rp 200k memerlukan approval dari admin sebelum bisa dicairkan. Biasanya diproses dalam 1–2 jam kerja.</div>
            </div>
          </div>

          {/* Warning: limit */}
          {exceedsLimit ? (
            <div className="bg-[#F87171]/10 border border-[#F87171]/30 rounded-[14px] p-3 mb-3.5 flex gap-2.5 items-start">
              <AlertTriangle size={16} className="text-[#F87171] shrink-0 mt-[1px]" />
              <div className="text-[12px] text-[#F87171] leading-[1.5]">
                Jumlah kasbon <strong>melebihi</strong> sisa limit! Sisa limit kamu <strong className="text-[#1A3A4A]">{formatCurrencyFull(remainingLimit)}</strong>.
              </div>
            </div>
          ) : (
            <div className="bg-[#F5A940]/10 border border-[#F5A940]/30 rounded-[14px] p-3 mb-3.5 flex gap-2.5 items-start">
              <Info size={16} className="text-[#F5A940] shrink-0 mt-[1px]" />
              <div className="text-[12px] text-[#4A7A8A] leading-[1.5]">Sisa limit kamu <strong className="text-[#1A3A4A]">{formatCurrencyFull(remainingLimit)}</strong>. Jumlah kasbon tidak boleh melebihi sisa limit bulan ini.</div>
            </div>
          )}

          {/* Submit Error */}
          {submitError && (
            <div className="bg-[#F87171]/10 border border-[#F87171]/30 rounded-[14px] p-3 mb-3.5 flex gap-2.5 items-start animate-shake">
              <AlertTriangle size={16} className="text-[#F87171] shrink-0 mt-[1px]" />
              <div className="text-[12px] text-[#F87171] leading-[1.5]">{submitError}</div>
            </div>
          )}

          {/* Fields */}
          <div className="flex flex-col gap-3 mb-3.5">
            <div className={`bg-white border rounded-[16px] p-3.5 transition-colors focus-within:border-[#8ABAC8] shadow-sm ${
              submitError && !reason.trim() ? 'border-[#F87171]' : 'border-[#C8E8F5]'
            }`}>
              <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5">Alasan pengajuan</div>
              <input
                ref={reasonRef}
                className="bg-transparent border-none outline-none font-sans text-[14px] text-[#1A3A4A] w-full placeholder:text-[#8ABAC8]"
                type="text"
                placeholder="Biaya berobat, keperluan keluarga, dll..."
                value={reason}
                onChange={(e) => { setReason(e.target.value); setSubmitError(null); }}
                disabled={isSubmitting}
              />
            </div>
            <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 transition-colors focus-within:border-[#8ABAC8] shadow-sm">
              <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5">Kategori</div>
              <select
                className="bg-transparent border-none outline-none font-sans text-[14px] text-[#1A3A4A] w-full appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238ABAC8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 0 center',
                  paddingRight: '20px'
                }}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
              >
                {CATEGORIES.map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="p-5 pb-9 bg-[#F0FAFF]">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || exceedsLimit}
            variant="orange"
            size="xl"
            className="w-full cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Send size={18} />
                Kirim Pengajuan
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ─── SUCCESS STATE ────────────────────────────────────
  if (flowState === 'success' && lastSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center p-7 text-center min-h-screen bg-[#F0FAFF] font-sans">
        <div className="w-[110px] h-[110px] rounded-full bg-[#F5A940]/10 border-2 border-[#F5A940]/30 flex items-center justify-center mb-6 relative">
          <div className="absolute -inset-3 rounded-full border border-[#F5A940]/30 opacity-40"></div>
          <Send size={40} className="text-[#F5A940] ml-1" />
        </div>

        <div className="font-['Syne'] text-[26px] font-bold text-[#1A3A4A] mb-2 tracking-[-0.5px]">Pengajuan terkirim!</div>
        <div className="text-[13.5px] text-[#4A7A8A] mb-7 leading-[1.6]">
          Kasbon kamu sedang menunggu<br/>persetujuan dari admin.
        </div>

        <div className="w-full bg-white border border-[#C8E8F5] rounded-[20px] p-5 mb-4 text-left shadow-sm">
          <div className="font-['Syne'] text-[36px] font-bold text-[#F5A940] tracking-[-1px] text-center mb-4">
            {formatCurrencyFull(lastSubmitted.amount)}
          </div>

          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <div className="text-[12.5px] text-[#4A7A8A]">Tanggal</div>
            <div className="text-[13px] font-medium text-[#1A3A4A] font-mono">{formatDateFull(new Date().toISOString())}</div>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <div className="text-[12.5px] text-[#4A7A8A]">Alasan</div>
            <div className="text-[13px] font-medium text-[#1A3A4A] font-mono">{lastSubmitted.reason}</div>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <div className="text-[12.5px] text-[#4A7A8A]">Kategori</div>
            <div className="text-[13px] font-medium text-[#1A3A4A] font-mono">{lastSubmitted.category}</div>
          </div>
          <div className="flex justify-between items-center py-2">
            <div className="text-[12.5px] text-[#4A7A8A]">Status</div>
            <div className="text-[13px] font-medium text-[#F5A940] font-mono">Menunggu approval</div>
          </div>
        </div>

        <div className="w-full bg-white border border-[#C8E8F5] rounded-[18px] p-5 mb-6 text-left shadow-sm">
          <div className="text-[11px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-4">Status pengajuan</div>

          <div className="flex gap-3 relative mb-4">
            <div className="absolute left-[9px] top-[14px] w-[1px] h-[20px] bg-[#C8E8F5]"></div>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] bg-[#3AAD7A]/10 text-[#3AAD7A] border border-[#3AAD7A]/30 z-10">
              <Check size={12} strokeWidth={3} />
            </div>
            <div className="text-[13px] text-[#1A3A4A] pt-[1px]">Pengajuan terkirim</div>
          </div>

          <div className="flex gap-3 relative mb-4">
            <div className="absolute left-[9px] top-[14px] w-[1px] h-[20px] bg-[#C8E8F5]"></div>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[#F5A940]/10 border border-[#F5A940]/30 z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F5A940]"></div>
            </div>
            <div className="text-[13px] text-[#1A3A4A] pt-[1px]">Menunggu persetujuan admin</div>
          </div>

          <div className="flex gap-3 relative mb-4">
            <div className="absolute left-[9px] top-[14px] w-[1px] h-[20px] bg-[#C8E8F5]"></div>
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono font-medium bg-white text-[#8ABAC8] border border-[#C8E8F5] z-10">3</div>
            <div className="text-[13px] text-[#8ABAC8] pt-[1px]">Dana diterima</div>
          </div>

          <div className="flex gap-3 relative">
            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-mono font-medium bg-white text-[#8ABAC8] border border-[#C8E8F5] z-10">4</div>
            <div className="text-[13px] text-[#8ABAC8] pt-[1px]">Dipotong dari gaji</div>
          </div>
        </div>

        <Button
          onClick={() => setFlowState('idle')}
          variant="outline"
          size="xl"
          className="w-full cursor-pointer bg-white text-[#1A3A4A] hover:bg-[#F0FAFF]"
        >
          Kembali ke Kasbon
        </Button>
      </div>
    );
  }

  // ─── IDLE STATE (main page) ───────────────────────────
  return (
    <div className="bg-[#F0FAFF] flex flex-col font-sans relative min-h-screen">
      {/* Page Header */}
      <div className="p-6 pb-5 flex items-center justify-between">
        <div>
          <div className="font-['Syne'] text-[26px] font-bold text-[#1A3A4A] tracking-[-0.5px] mb-1">Kasbon</div>
          <div className="text-[13px] text-[#4A7A8A]">Gaji di muka · {getMonthName()}</div>
        </div>
        <Button
          onClick={refresh}
          disabled={refreshing}
          variant="outline"
          size="icon"
          className="w-9 h-9 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Limit Card */}
      <div className="mx-5 mb-4 bg-white border border-[#C8E8F5] rounded-[24px] p-5 shadow-sm relative overflow-hidden">
        {/* Circle decoration */}
        <div className="absolute -top-[50px] -right-[50px] w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,rgba(245,169,64,0.1)_0%,transparent_70%)] pointer-events-none"></div>

        <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-[1px] font-mono mb-2.5 relative z-10">Kasbon terpakai bulan ini</div>

        <div className="flex items-baseline justify-between mb-3.5 relative z-10">
          <div className="font-['Syne'] text-[36px] font-bold text-[#F5A940] tracking-[-1px] leading-none">
            {formatCurrency(usedThisMonth)}
          </div>
          <div className="text-[13px] text-[#8ABAC8] font-mono">limit {formatCurrency(kasbonLimit)}</div>
        </div>

        <div className="h-[6px] bg-[#F0FAFF] rounded-full overflow-hidden mb-2.5 relative z-10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F5A940] to-[#f09020] transition-all duration-700"
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>

        <div className="flex justify-between items-center relative z-10">
          <div className="text-[12.5px] text-[#4A7A8A]">
            Sisa limit: <strong className="text-[#1A3A4A] font-semibold">{formatCurrency(remainingLimit)}</strong>
          </div>
          <div className="text-[11px] text-[#8ABAC8] font-mono">{getNextMonthReset()}</div>
        </div>
      </div>

      {/* Info Chips */}
      <div className="mx-5 mb-4 grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 shadow-sm">
          <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5">Pengambilan</div>
          <div className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] tracking-[-0.5px] leading-none">{thisMonthCount}x</div>
          <div className="text-[11px] text-[#8ABAC8] mt-1">bulan ini</div>
        </div>
        <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 shadow-sm">
          <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5">Belum dipotong</div>
          <div className="font-['Syne'] text-[20px] font-bold text-[#F5A940] tracking-[-0.5px] leading-none">
            {formatCurrency(
              history
                .filter(k => k.status === 'approved' || k.status === 'pending')
                .reduce((sum, k) => sum + k.amount, 0)
            )}
          </div>
          <div className="text-[11px] text-[#8ABAC8] mt-1">
            dari gaji {new Date().toLocaleDateString('id-ID', { month: 'short' })}
          </div>
        </div>
      </div>

      {/* Ajukan BTN */}
      <div className="px-5 mb-5">
        <Button
          onClick={openForm}
          disabled={remainingLimit <= 0}
          variant="orange"
          size="xl"
          className="w-full flex items-center justify-center gap-2 tracking-[-0.3px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4"/></svg>
          Ajukan Kasbon
        </Button>
        {remainingLimit <= 0 && (
          <div className="text-center text-[11.5px] text-[#F87171] mt-2">Limit kasbon bulan ini sudah habis</div>
        )}
      </div>

      {/* Riwayat Header */}
      <div className="flex items-center justify-between px-6 pb-3 pt-1">
        <div className="text-[12px] font-medium text-[#4A7A8A] uppercase tracking-[0.8px] font-mono">
          Riwayat
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#F5A940]/10 text-[#F5A940] text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="text-[12px] text-[#4DC8F5] cursor-pointer flex items-center gap-1 hover:text-[#3ab4e0] transition-colors">
          Semua <ChevronRight size={14} />
        </div>
      </div>

      {/* Riwayat List */}
      <div className="px-5 flex flex-col gap-2 pb-8">
        {history.length === 0 ? (
          <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-8 shadow-sm text-center">
            <div className="text-[32px] mb-3">📋</div>
            <div className="text-[14px] font-medium text-[#1A3A4A] mb-1">Belum ada riwayat</div>
            <div className="text-[12.5px] text-[#8ABAC8]">Kasbon yang kamu ajukan akan muncul di sini</div>
          </div>
        ) : (
          history.map((item: KasbonType) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3.5 bg-white border border-[#C8E8F5] rounded-[16px] shadow-sm hover:border-[#8ABAC8] transition-colors cursor-pointer"
            >
              <StatusIcon status={item.status} />
              <div className="flex-1 min-w-0">
                <div className="font-['Syne'] text-[17px] font-bold text-[#1A3A4A] tracking-[-0.3px]">
                  {formatCurrencyFull(item.amount)}
                </div>
                <div className="text-[11.5px] text-[#8ABAC8] mt-0.5 truncate">
                  {item.reason || item.category || '-'}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-[#8ABAC8] font-mono mb-1.5">
                  {formatDate(item.requested_at)}
                </div>
                <StatusBadge status={item.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
