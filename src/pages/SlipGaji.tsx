import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, FileText, Printer, CheckCircle, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function EmployeeSlipGaji() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Load user payrolls
  useEffect(() => {
    const fetchPayrolls = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .schema("hr")
          .from("payroll")
          .select("*")
          .eq("user_id", user.id)
          .order("period", { ascending: false });

        if (error) throw error;
        setPayrolls(data || []);
      } catch (e: any) {
        toast.error("Gagal memuat slip gaji", { description: e.message });
      } finally {
        setLoading(false);
      }
    };

    fetchPayrolls();
  }, []);

  // Format Helper
  const formatCurrency = (n: number) => {
    return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
  };

  const getPeriodLabel = (period: string) => {
    if (!period) return "";
    const [year, month] = period.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  // Local Print Slip Gaji Functionality
  const handlePrint = (item: any) => {
    setSelectedSlip(item);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="bg-[#F0FAFF] flex flex-col font-sans relative min-h-screen">
      
      {/* Printing style overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-payslip-mobile, #print-payslip-mobile * {
            visibility: visible;
          }
          #print-payslip-mobile {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
            background: white !important;
            color: black !important;
            padding: 24px !important;
          }
        }
      `}} />

      {/* Header */}
      <div className="p-6 pb-5 flex items-center gap-3.5 bg-white border-b border-[#C8E8F5] shadow-sm">
        <Button
          onClick={() => navigate("/employee/profil")}
          variant="outline"
          size="icon"
          className="cursor-pointer"
        >
          <ChevronLeft size={20} />
        </Button>
        <div>
          <h1 className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] tracking-[-0.3px]">
            Slip Gaji
          </h1>
          <p className="text-[12.5px] text-[#4A7A8A] mt-0.5">Riwayat penerimaan gaji bulanan</p>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6 flex-grow flex flex-col">
        {loading ? (
          <div className="flex-grow flex items-center justify-center py-20 text-[#8ABAC8] font-mono text-sm uppercase tracking-wider">
            Loading Slip Gaji...
          </div>
        ) : payrolls.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center py-20 text-center text-[#8ABAC8] gap-3">
            <FileText size={40} className="stroke-[1.2]" />
            <div className="font-medium text-[14px]">Belum Ada Slip Gaji</div>
            <div className="text-[12.5px] max-w-[200px] leading-relaxed">
              Slip gaji bulanan Anda akan muncul di sini setelah diterbitkan oleh admin.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5 pb-20">
            {payrolls.map((slip) => {
              const isPaid = slip.status === "paid";
              return (
                <div
                  key={slip.id}
                  onClick={() => {
                    setSelectedSlip(slip);
                    setShowDetail(true);
                  }}
                  className="bg-white border border-[#C8E8F5] rounded-[20px] p-4.5 shadow-sm hover:border-[#8ABAC8] transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPaid 
                        ? "bg-[#E2F0E8] border-[#3AAD7A]/30 text-[#3AAD7A]" 
                        : "bg-[#FAF0E1] border-[#E89E3A]/30 text-[#E89E3A]"
                    }`}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-['Syne'] text-[15.5px] font-bold text-[#1A3A4A] leading-tight">
                        {getPeriodLabel(slip.period)}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[11px] font-bold uppercase tracking-[0.3px] px-2 py-0.5 rounded-full ${
                          isPaid ? "bg-[#E2F0E8] text-[#3AAD7A]" : "bg-[#FAF0E1] text-[#E89E3A]"
                        }`}>
                          {isPaid ? "Terbayar" : "Draft"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[15px] font-bold text-[#1A3A4A]">
                      {formatCurrency(slip.net_salary)}
                    </div>
                    <div className="text-[11px] text-[#8ABAC8] mt-0.5">Gaji Bersih</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL / sliding drawer overlay */}
      {showDetail && selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white border border-[#C8E8F5] rounded-[24px] overflow-hidden flex flex-col shadow-xl animate-in slide-in-from-bottom duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-[#F0FAFF] flex items-center justify-between">
              <div>
                <h3 className="font-['Syne'] text-[17px] font-bold text-[#1A3A4A]">Rincian Gaji</h3>
                <p className="text-[12px] text-[#4A7A8A] mt-0.5">{getPeriodLabel(selectedSlip.period)}</p>
              </div>
              <Button
                onClick={() => setShowDetail(false)}
                variant="outline"
                size="sm"
                className="w-8 h-8 cursor-pointer rounded-lg bg-[#F0FAFF] p-0"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 flex-grow overflow-y-auto">
              
              {/* Receipt Style Box */}
              <div className="bg-[#F0FAFF] border border-[#C8E8F5] rounded-[20px] p-5">
                <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono border-b border-[#C8E8F5] pb-2 mb-3">
                  Penerimaan & Potongan
                </div>
                <div className="space-y-3 text-[13.5px]">
                  <div className="flex justify-between">
                    <span className="text-[#4A7A8A]">Gaji Pokok</span>
                    <span className="font-mono font-medium text-[#1A3A4A]">{formatCurrency(selectedSlip.basic_salary)}</span>
                  </div>
                  <div className="flex justify-between text-[#3AAD7A]">
                    <span>Insentif / Bonus</span>
                    <span className="font-mono font-bold">+{formatCurrency(selectedSlip.incentives)}</span>
                  </div>
                  <div className="flex justify-between text-[#F87171]">
                    <span>Potongan Kasbon</span>
                    <span className="font-mono font-bold">-{formatCurrency(selectedSlip.kasbon_deduction)}</span>
                  </div>
                </div>
                <div className="border-t border-[#C8E8F5] pt-3 mt-4 flex justify-between items-center text-[15px] font-bold">
                  <span className="text-[#1A3A4A]">GAJI BERSIH</span>
                  <span className="font-mono text-[#F5A940]">{formatCurrency(selectedSlip.net_salary)}</span>
                </div>
              </div>

              {/* Status Banner */}
              {selectedSlip.status === "paid" ? (
                <div className="bg-[#E2F0E8] border border-[#3AAD7A]/30 rounded-[16px] p-3.5 flex gap-2.5 items-start">
                  <CheckCircle size={18} className="text-[#3AAD7A] shrink-0 mt-0.5" />
                  <div className="text-[12px] text-[#4A7A8A] leading-relaxed">
                    Pembayaran gaji bulan ini telah berhasil ditransfer dan dicairkan ke rekening Anda.
                  </div>
                </div>
              ) : (
                <div className="bg-[#FAF0E1] border border-[#E89E3A]/30 rounded-[16px] p-3.5 flex gap-2.5 items-start">
                  <Clock size={18} className="text-[#E89E3A] shrink-0 mt-0.5" />
                  <div className="text-[12px] text-[#4A7A8A] leading-relaxed">
                    Slip gaji masih berstatus Draft dan sedang diproses oleh bagian keuangan.
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-[#F0FAFF] border-t border-[#C8E8F5] flex gap-2.5">
              <Button
                onClick={() => setShowDetail(false)}
                variant="outline"
                className="flex-1 py-3 font-['Syne'] text-[14.5px] font-bold cursor-pointer bg-white text-[#1A3A4A] hover:bg-[#F0FAFF]"
              >
                Tutup
              </Button>
              <Button
                onClick={() => handlePrint(selectedSlip)}
                variant="orange"
                className="flex-1 py-3 font-['Syne'] text-[14.5px] font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer size={16} />
                Cetak Slip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PAYSLIP TEMPLATE CONTAINER (Hidden on screen, styled for print only) */}
      {selectedSlip && (
        <div id="print-payslip-mobile" className="hidden">
          <div className="max-w-xl mx-auto bg-white p-6 border border-[#C8E8F5] rounded-[20px] font-sans flex flex-col gap-5 text-[#1A3A4A]">
            {/* Slip Header */}
            <div className="border-b-2 border-[#1A3A4A] pb-3.5 flex justify-between items-end">
              <div>
                <h2 className="font-['Syne'] text-[20px] font-bold tracking-tight text-[#1A3A4A]">SLIP GAJI KARYAWAN</h2>
                <p className="text-[11.5px] text-[#4A7A8A] mt-0.5">Klinik Hewan Dr. Meow / HadiR System</p>
              </div>
              <div className="text-right text-[11px] font-mono">
                <div>Periode: {getPeriodLabel(selectedSlip.period)}</div>
                <div className="text-neutral-400 mt-0.5">Cetak: {new Date().toLocaleDateString("id-ID")}</div>
              </div>
            </div>

            {/* Income & Deductions */}
            <div className="grid grid-cols-2 gap-6 py-1">
              {/* Income */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono border-b border-[#C8E8F5] pb-1">Penerimaan</h4>
                <div className="flex flex-col text-[12.5px] gap-1.5">
                  <div className="flex justify-between"><span className="text-[#4A7A8A]">Gaji Pokok</span><span className="font-mono">{formatCurrency(selectedSlip.basic_salary)}</span></div>
                  <div className="flex justify-between text-[#3A6B1A] font-medium"><span>Insentif</span><span className="font-mono">+{formatCurrency(selectedSlip.incentives)}</span></div>
                </div>
              </div>

              {/* Deductions */}
              <div className="flex flex-col gap-2.5">
                <h4 className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono border-b border-[#C8E8F5] pb-1">Potongan</h4>
                <div className="flex flex-col text-[12.5px] gap-1.5">
                  <div className="flex justify-between text-[#F87171] font-medium"><span>Potongan Kasbon</span><span className="font-mono">-{formatCurrency(selectedSlip.kasbon_deduction)}</span></div>
                </div>
              </div>
            </div>

            {/* Total Calculation */}
            <div className="border-t-2 border-[#1A3A4A] pt-3.5 flex justify-between items-center bg-[#F0FAFF] -mx-6 px-6 py-3">
              <span className="font-bold text-[13px] text-[#1A3A4A]">GAJI BERSIH DITERIMA</span>
              <span className="font-['Syne'] text-[18px] font-bold text-[#F5A940] font-mono">
                {formatCurrency(selectedSlip.net_salary)}
              </span>
            </div>

            {/* Footer Note */}
            <div className="text-center text-[9.5px] text-[#8ABAC8] border-t border-dashed border-[#C8E8F5] pt-3.5 mt-2">
              Dokumen ini sah diterbitkan secara elektronik oleh HadiR System.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
