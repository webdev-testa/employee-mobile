import { useState } from "react";
import { ChevronLeft, Info, AlertTriangle, Send, Check, ChevronRight } from "lucide-react";

type FlowState = 'idle' | 'form' | 'success';

export default function Kasbon() {
  const [flowState, setFlowState] = useState<FlowState>('idle');
  const [amount, setAmount] = useState<number>(250000);

  if (flowState === 'form') {
    return (
      <div className="flex flex-col min-h-screen bg-[#F0FAFF] font-sans">
        {/* Header */}
        <div className="p-6 pb-5 flex items-center gap-3.5">
          <button 
            onClick={() => setFlowState('idle')} 
            className="w-9 h-9 rounded-xl bg-white border border-[#C8E8F5] flex items-center justify-center cursor-pointer text-[#4A7A8A] shrink-0 shadow-sm hover:bg-[#F0FAFF] transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
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
              {[100000, 250000, 500000, 1000000].map(val => (
                <button 
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`px-3.5 py-1.5 rounded-full border text-[12.5px] font-mono cursor-pointer transition-all ${
                    amount === val 
                    ? 'bg-[#F5A940]/10 border-[#F5A940]/30 text-[#F5A940]' 
                    : 'bg-white border-[#C8E8F5] text-[#4A7A8A] hover:bg-[#F0FAFF]'
                  }`}
                >
                  {val === 1000000 ? '1jt' : `${val/1000}k`}
                </button>
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
              <div className="text-[12px] text-[#4A7A8A] leading-[1.5]">Kasbon &gt; Rp 200k memerlukan approval dari Fara sebelum bisa dicairkan. Biasanya diproses dalam 1–2 jam kerja.</div>
            </div>
          </div>

          {/* Warning: limit */}
          <div className="bg-[#F87171]/10 border border-[#F87171]/30 rounded-[14px] p-3 mb-3.5 flex gap-2.5 items-start">
            <AlertTriangle size={16} className="text-[#F87171] shrink-0 mt-[1px]" />
            <div className="text-[12px] text-[#F87171] leading-[1.5]">Sisa limit kamu <strong className="text-[#1A3A4A]">Rp 500k</strong>. Jumlah kasbon tidak boleh melebihi sisa limit bulan ini.</div>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-3 mb-3.5">
            <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 transition-colors focus-within:border-[#8ABAC8] shadow-sm">
              <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5">Alasan pengajuan</div>
              <input 
                className="bg-transparent border-none outline-none font-sans text-[14px] text-[#1A3A4A] w-full placeholder:text-[#8ABAC8]" 
                type="text" 
                placeholder="Biaya berobat, keperluan keluarga, dll..." 
                defaultValue="Biaya berobat"
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
              >
                <option>Kesehatan</option>
                <option>Pendidikan</option>
                <option>Kebutuhan rumah</option>
                <option>Transportasi</option>
                <option>Lainnya</option>
              </select>
            </div>
          </div>
        </div>

        {/* Form Footer */}
        <div className="p-5 pb-9 bg-[#F0FAFF]">
          <button 
            onClick={() => setFlowState('success')} 
            className="w-full p-4 rounded-[18px] bg-[#F5A940] text-white font-['Syne'] text-[18px] font-bold cursor-pointer transition-all flex items-center justify-center gap-2 hover:bg-[#e09833] hover:scale-[0.98] shadow-[#F5A940]/20 shadow-lg"
          >
            <Send size={18} />
            Kirim Pengajuan
          </button>
        </div>
      </div>
    );
  }

  if (flowState === 'success') {
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
          <div className="font-['Syne'] text-[36px] font-bold text-[#F5A940] tracking-[-1px] text-center mb-4">Rp {amount.toLocaleString('id-ID')}</div>
          
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <div className="text-[12.5px] text-[#4A7A8A]">Tanggal</div>
            <div className="text-[13px] font-medium text-[#1A3A4A] font-mono">20 Apr 2025 · 08:47</div>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <div className="text-[12.5px] text-[#4A7A8A]">Alasan</div>
            <div className="text-[13px] font-medium text-[#1A3A4A] font-mono">Biaya berobat</div>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <div className="text-[12.5px] text-[#4A7A8A]">Kategori</div>
            <div className="text-[13px] font-medium text-[#1A3A4A] font-mono">Kesehatan</div>
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

        <button 
          onClick={() => setFlowState('idle')} 
          className="w-full p-4 rounded-[16px] border border-[#C8E8F5] bg-white text-[#1A3A4A] font-['Syne'] text-[17px] font-bold cursor-pointer transition-all hover:bg-[#F0FAFF] shadow-sm"
        >
          Kembali ke Kasbon
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#F0FAFF] flex flex-col font-sans relative min-h-screen">
      {/* Page Header */}
      <div className="p-6 pb-5">
        <div className="font-['Syne'] text-[26px] font-bold text-[#1A3A4A] tracking-[-0.5px] mb-1">Kasbon</div>
        <div className="text-[13px] text-[#4A7A8A]">Gaji di muka · April 2025</div>
      </div>

      {/* Limit Card */}
      <div className="mx-5 mb-4 bg-white border border-[#C8E8F5] rounded-[24px] p-5 shadow-sm relative overflow-hidden">
        {/* Circle decoration */}
        <div className="absolute -top-[50px] -right-[50px] w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,rgba(245,169,64,0.1)_0%,transparent_70%)] pointer-events-none"></div>

        <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-[1px] font-mono mb-2.5 relative z-10">Kasbon terpakai bulan ini</div>
        
        <div className="flex items-baseline justify-between mb-3.5 relative z-10">
          <div className="font-['Syne'] text-[36px] font-bold text-[#F5A940] tracking-[-1px] leading-none">Rp 500k</div>
          <div className="text-[13px] text-[#8ABAC8] font-mono">limit Rp 1jt</div>
        </div>

        <div className="h-[6px] bg-[#F0FAFF] rounded-full overflow-hidden mb-2.5 relative z-10">
          <div className="h-full rounded-full bg-gradient-to-r from-[#F5A940] to-[#f09020] transition-all duration-700" style={{ width: '50%' }}></div>
        </div>

        <div className="flex justify-between items-center relative z-10">
          <div className="text-[12.5px] text-[#4A7A8A]">Sisa limit: <strong className="text-[#1A3A4A] font-semibold">Rp 500k</strong></div>
          <div className="text-[11px] text-[#8ABAC8] font-mono">Reset 1 Mei</div>
        </div>
      </div>

      {/* Info Chips */}
      <div className="mx-5 mb-4 grid grid-cols-2 gap-2.5">
        <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 shadow-sm">
          <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5">Pengambilan</div>
          <div className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] tracking-[-0.5px] leading-none">2x</div>
          <div className="text-[11px] text-[#8ABAC8] mt-1">bulan ini</div>
        </div>
        <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 shadow-sm">
          <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5">Belum dipotong</div>
          <div className="font-['Syne'] text-[20px] font-bold text-[#F5A940] tracking-[-0.5px] leading-none">Rp 500k</div>
          <div className="text-[11px] text-[#8ABAC8] mt-1">dari gaji Apr</div>
        </div>
      </div>

      {/* Ajukan BTN */}
      <div className="px-5 mb-5">
        <button 
          onClick={() => setFlowState('form')} 
          className="w-full p-4 rounded-[18px] bg-[#F5A940] text-white font-['Syne'] text-[18px] font-bold flex items-center justify-center gap-2 tracking-[-0.3px] hover:bg-[#e09833] transition-all shadow-[#F5A940]/20 shadow-lg"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4"/></svg>
          Ajukan Kasbon
        </button>
      </div>

      {/* Riwayat Header */}
      <div className="flex items-center justify-between px-6 pb-3 pt-1">
        <div className="text-[12px] font-medium text-[#4A7A8A] uppercase tracking-[0.8px] font-mono">Riwayat</div>
        <div className="text-[12px] text-[#4DC8F5] cursor-pointer flex items-center gap-1 hover:text-[#3ab4e0] transition-colors">
          Semua <ChevronRight size={14} />
        </div>
      </div>

      {/* Riwayat List */}
      <div className="px-5 flex flex-col gap-2 pb-8">
        {/* Item 1 */}
        <div className="flex items-center gap-3 p-3.5 bg-white border border-[#C8E8F5] rounded-[16px] shadow-sm hover:border-[#8ABAC8] transition-colors cursor-pointer">
          <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 text-[16px] bg-[#F5A940]/10 border border-[#F5A940]/30">💰</div>
          <div className="flex-1 min-w-0">
            <div className="font-['Syne'] text-[17px] font-bold text-[#1A3A4A] tracking-[-0.3px]">Rp 300k</div>
            <div className="text-[11.5px] text-[#8ABAC8] mt-0.5 truncate">Biaya berobat</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-[#8ABAC8] font-mono mb-1.5">20 Apr</div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#F5A940]/10 text-[#F5A940]">⏳ Menunggu</div>
          </div>
        </div>

        {/* Item 2 */}
        <div className="flex items-center gap-3 p-3.5 bg-white border border-[#C8E8F5] rounded-[16px] shadow-sm hover:border-[#8ABAC8] transition-colors cursor-pointer">
          <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 text-[16px] bg-[#3AAD7A]/10 border border-[#3AAD7A]/30 text-[#3AAD7A]">✓</div>
          <div className="flex-1 min-w-0">
            <div className="font-['Syne'] text-[17px] font-bold text-[#1A3A4A] tracking-[-0.3px]">Rp 200k</div>
            <div className="text-[11.5px] text-[#8ABAC8] mt-0.5 truncate">Keperluan darurat</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-[#8ABAC8] font-mono mb-1.5">15 Apr</div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#3AAD7A]/10 text-[#3AAD7A]">✓ Disetujui</div>
          </div>
        </div>

        {/* Item 3 */}
        <div className="flex items-center gap-3 p-3.5 bg-white border border-[#C8E8F5] rounded-[16px] shadow-sm hover:border-[#8ABAC8] transition-colors cursor-pointer">
          <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 text-[16px] bg-[#F0FAFF] border border-[#C8E8F5] text-[#8ABAC8]">−</div>
          <div className="flex-1 min-w-0">
            <div className="font-['Syne'] text-[17px] font-bold text-[#1A3A4A] tracking-[-0.3px]">Rp 500k</div>
            <div className="text-[11.5px] text-[#8ABAC8] mt-0.5 truncate">Biaya sekolah anak</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-[#8ABAC8] font-mono mb-1.5">28 Mar</div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#F0FAFF] border border-[#C8E8F5] text-[#8ABAC8]">Dipotong</div>
          </div>
        </div>

        {/* Item 4 */}
        <div className="flex items-center gap-3 p-3.5 bg-white border border-[#C8E8F5] rounded-[16px] shadow-sm hover:border-[#8ABAC8] transition-colors cursor-pointer mb-4">
          <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center shrink-0 text-[16px] bg-[#F0FAFF] border border-[#C8E8F5] text-[#8ABAC8]">−</div>
          <div className="flex-1 min-w-0">
            <div className="font-['Syne'] text-[17px] font-bold text-[#1A3A4A] tracking-[-0.3px]">Rp 300k</div>
            <div className="text-[11.5px] text-[#8ABAC8] mt-0.5 truncate">Bayar kos</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] text-[#8ABAC8] font-mono mb-1.5">10 Mar</div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#F0FAFF] border border-[#C8E8F5] text-[#8ABAC8]">Dipotong</div>
          </div>
        </div>
      </div>
    </div>
  );
}
