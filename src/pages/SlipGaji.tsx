import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { FileText, Printer, CheckCircle, Clock, X, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/PageHeader";

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
          .eq("status", "paid")
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
    if ((window as any).Capacitor?.isNativePlatform?.()) {
      toast.info("Fitur cetak langsung tidak didukung di perangkat mobile. Silakan gunakan tangkapan layar (screenshot) untuk menyimpan slip gaji Anda.");
      return;
    }
    setSelectedSlip(item);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-24">
      
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
      <div className="p-4 border-b border-border bg-card sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => navigate("/employee/profil")} className="p-1 rounded-md hover:bg-muted transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-semibold text-lg font-display">Slip Gaji</h2>
      </div>

      {/* Main content */}
      <div className="p-4 flex-1 flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm font-medium py-10">
            Loading Slip Gaji...
          </div>
        ) : payrolls.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-10">
            <FileText size={40} className="stroke-[1.2]" />
            <div className="font-medium text-sm">Belum Ada Slip Gaji</div>
            <div className="text-xs max-w-[200px] leading-relaxed">
              Slip gaji bulanan Anda akan muncul di sini setelah diterbitkan oleh admin.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {payrolls.map((slip) => {
              const isPaid = slip.status === "paid";
              return (
                <div
                  key={slip.id}
                  onClick={() => {
                    setSelectedSlip(slip);
                    setShowDetail(true);
                  }}
                  className="bg-card border border-border rounded-xl p-4 shadow-sm hover:bg-muted/30 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isPaid 
                        ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400" 
                        : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                    }`}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">
                        {getPeriodLabel(slip.period)}
                      </div>
                      <div className="mt-1">
                        <span className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded-full ${
                          isPaid ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                        }`}>
                          {isPaid ? "Terbayar" : "Draft"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {formatCurrency(slip.net_salary)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Gaji Bersih</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAIL MODAL / sliding drawer overlay */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        {selectedSlip && (
          <DialogContent showCloseButton={false} className="w-[calc(100%-2rem)] max-w-md mx-auto bg-card border border-border rounded-2xl p-0 overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <DialogTitle className="font-semibold text-lg font-display">Rincian Gaji</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">{getPeriodLabel(selectedSlip.period)}</DialogDescription>
              </div>
              <DialogClose asChild>
                <button className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <X size={18} />
                </button>
              </DialogClose>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Receipt Style Box */}
              <div className="bg-muted/30 border border-border rounded-xl p-4">
                <div className="text-xs font-medium text-muted-foreground uppercase border-b border-border pb-2 mb-3">
                  Penerimaan & Potongan
                </div>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gaji Pokok</span>
                    <span className="font-medium">{formatCurrency(selectedSlip.basic_salary)}</span>
                  </div>
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Insentif / Bonus</span>
                    <span className="font-medium">+{formatCurrency(selectedSlip.incentives)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Potongan Kasbon</span>
                    <span className="font-medium">-{formatCurrency(selectedSlip.kasbon_deduction)}</span>
                  </div>
                </div>
                <div className="border-t border-border pt-3 mt-3 flex justify-between items-center text-sm font-semibold">
                  <span>GAJI BERSIH</span>
                  <span className="text-amber-500">{formatCurrency(selectedSlip.net_salary)}</span>
                </div>
              </div>

              {/* Status Banner */}
              {selectedSlip.status === "paid" ? (
                <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl p-3 flex gap-2 items-start">
                  <CheckCircle size={16} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-green-800 dark:text-green-300/90 leading-relaxed">
                    Pembayaran gaji bulan ini telah berhasil ditransfer dan dicairkan ke rekening Anda.
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 flex gap-2 items-start">
                  <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Slip gaji masih berstatus Draft dan sedang diproses oleh bagian keuangan.
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-muted/10 border-t border-border flex gap-3">
              <DialogClose asChild>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-muted transition-colors">
                  Tutup
                </button>
              </DialogClose>
              <button
                onClick={() => handlePrint(selectedSlip)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                Cetak
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* PRINT PAYSLIP TEMPLATE CONTAINER (Hidden on screen, styled for print only) */}
      {selectedSlip && (
        <div id="print-payslip-mobile" className="hidden">
          <div className="max-w-xl mx-auto bg-white p-6 border border-border rounded-xl font-sans flex flex-col gap-5 text-foreground">
            {/* Slip Header */}
            <div className="border-b-2 border-foreground pb-4 flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">SLIP GAJI KARYAWAN</h2>
                <p className="text-xs text-muted-foreground mt-1">Klinik Hewan Dr. Meow / HadiR System</p>
              </div>
              <div className="text-right text-xs">
                <div>Periode: {getPeriodLabel(selectedSlip.period)}</div>
                <div className="text-muted-foreground mt-1">Cetak: {new Date().toLocaleDateString("id-ID")}</div>
              </div>
            </div>

            {/* Income & Deductions */}
            <div className="grid grid-cols-2 gap-6 py-2">
              {/* Income */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-medium uppercase text-muted-foreground border-b border-border pb-1">Penerimaan</h4>
                <div className="flex flex-col text-sm gap-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">Gaji Pokok</span><span>{formatCurrency(selectedSlip.basic_salary)}</span></div>
                  <div className="flex justify-between text-green-700 font-medium"><span>Insentif</span><span>+{formatCurrency(selectedSlip.incentives)}</span></div>
                </div>
              </div>

              {/* Deductions */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-medium uppercase text-muted-foreground border-b border-border pb-1">Potongan</h4>
                <div className="flex flex-col text-sm gap-2">
                  <div className="flex justify-between text-red-700 font-medium"><span>Potongan Kasbon</span><span>-{formatCurrency(selectedSlip.kasbon_deduction)}</span></div>
                </div>
              </div>
            </div>

            {/* Total Calculation */}
            <div className="border-t-2 border-foreground pt-4 flex justify-between items-center bg-muted/30 -mx-6 px-6 py-4">
              <span className="font-bold text-sm">GAJI BERSIH DITERIMA</span>
              <span className="text-lg font-bold">
                {formatCurrency(selectedSlip.net_salary)}
              </span>
            </div>

            {/* Footer Note */}
            <div className="text-center text-[10px] text-muted-foreground border-t border-dashed border-border pt-4 mt-2">
              Dokumen ini sah diterbitkan secara elektronik oleh HadiR System.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
