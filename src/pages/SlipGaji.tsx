import { Capacitor } from '@capacitor/core';
import type { Database } from '@/types/database';
type Payroll = Database['hr']['Tables']['payroll']['Row'];
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { FileText, Printer, CheckCircle, Clock, X, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/PageHeader";

export default function EmployeeSlipGaji() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedSlip, setSelectedSlip] = useState<Payroll | null>(null);
  const [showDetail, setShowDetail] = useState(false);

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
      } catch (e: unknown) {
        toast.error("Gagal memuat slip gaji", { description: e instanceof Error ? e.message : 'Terjadi kesalahan' });
      } finally {
        setLoading(false);
      }
    };

    fetchPayrolls();
  }, []);

  const formatCurrency = (n: number | null) => {
    return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
  };

  const getPeriodLabel = (period: string) => {
    if (!period) return "";
    const [year, month] = period.split("-").map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  };

  const handlePrint = (item: Payroll) => {
    if (Capacitor.isNativePlatform()) {
      toast.info(
        "Fitur cetak tidak didukung di perangkat mobile. Silakan gunakan tangkapan layar (screenshot) untuk menyimpan slip gaji Anda."
      );
      return;
    }
    setSelectedSlip(item);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const latestPaidSlip = payrolls.find((p) => p.status === "paid");

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Printing style overrides */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
      `,
        }}
      />

      {/* Header */}
      <PageHeader title="Slip Gaji" onBack={() => navigate("/employee/profil")} />

      {/* Main Container */}
      <div className="p-5 space-y-5 pb-24">
        {/* Latest Summary Card */}
        {latestPaidSlip && (
          <div className="bg-[#0c1d2a] text-white p-5 rounded-3xl shadow-xs space-y-3 border border-border/40">
            <div className="flex items-center justify-between text-xs text-white/80 font-medium">
              <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">Gaji Diterima Terakhir</span>
              <span className="bg-white/10 text-white px-2.5 py-0.5 rounded-full font-bold text-xs border border-white/10">
                📅 {getPeriodLabel(latestPaidSlip.period)}
              </span>
            </div>

            <div className="pt-1">
              <div className="text-3xl font-black font-display tracking-tight text-white financial-num">
                {formatCurrency(latestPaidSlip.net_salary)}
              </div>
              <div className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1.5 font-semibold">
                <CheckCircle size={15} className="text-emerald-400" />
                <span>Terbayar ke rekening karyawan</span>
              </div>
            </div>
          </div>
        )}

        {/* List Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs font-display text-foreground uppercase tracking-wider">
              Riwayat Slip Gaji
            </h3>
            <span className="text-xs text-muted-foreground font-semibold">{payrolls.length} Periode</span>
          </div>

          {loading ? (
            <div className="text-center py-10 text-xs text-muted-foreground font-medium">
              Memuat slip gaji...
            </div>
          ) : payrolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-10 bg-card border border-border/80 rounded-3xl p-6 shadow-xs">
              <FileText size={38} className="stroke-[1.2] text-muted-foreground" />
              <div className="font-bold text-sm text-foreground">Belum Ada Slip Gaji</div>
              <div className="text-xs max-w-[220px] leading-relaxed">
                Slip gaji bulanan Anda akan muncul di sini setelah diterbitkan oleh admin.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {payrolls.map((slip) => {
                const isPaid = slip.status === "paid";
                return (
                  <div
                    key={slip.id}
                    onClick={() => {
                      setSelectedSlip(slip);
                      setShowDetail(true);
                    }}
                    className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs hover:border-border transition-all cursor-pointer flex items-center justify-between min-h-[44px]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isPaid
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground truncate">
                          {getPeriodLabel(slip.period)}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isPaid
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                            }`}
                          >
                            {isPaid ? "✓ Terbayar" : "⏳ Draft"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <div>
                        <div className="font-black text-sm text-foreground financial-num">
                          {formatCurrency(slip.net_salary)}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                          Gaji Bersih
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground/60" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* DETAIL MODAL / sliding drawer overlay */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        {selectedSlip && (
          <DialogContent
            showCloseButton={false}
            className="w-[calc(100%-2rem)] max-w-md mx-auto bg-card border border-border/80 rounded-3xl p-0 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/80 flex items-center justify-between bg-muted/30">
              <div>
                <DialogTitle className="font-bold text-base font-display text-foreground">
                  Rincian Slip Gaji
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Periode {getPeriodLabel(selectedSlip.period)}
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <button
                  aria-label="Tutup"
                  className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors text-muted-foreground"
                >
                  <X size={16} />
                </button>
              </DialogClose>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Receipt Style Box */}
              <div className="bg-muted/30 border border-border/70 rounded-2xl p-4 space-y-3">
                <div className="text-[11px] font-bold text-muted-foreground uppercase border-b border-border/70 pb-2 tracking-wider">
                  Komponen Penghasilan & Potongan
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Gaji Pokok</span>
                    <span className="font-bold text-foreground financial-num">
                      {formatCurrency(selectedSlip.basic_salary)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>+ Insentif / Bonus</span>
                    <span className="font-bold financial-num">
                      +{formatCurrency(selectedSlip.incentives)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-rose-600 dark:text-rose-400 font-medium">
                    <span>- Potongan Kasbon</span>
                    <span className="font-bold financial-num">
                      -{formatCurrency(selectedSlip.kasbon_deduction)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border/70 pt-3 mt-2 flex justify-between items-center">
                  <span className="font-extrabold text-xs text-foreground uppercase tracking-wider">
                    GAJI BERSIH
                  </span>
                  <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-display financial-num">
                    {formatCurrency(selectedSlip.net_salary)}
                  </span>
                </div>
              </div>

              {/* Status Banner */}
              {selectedSlip.status === "paid" ? (
                <div className="bg-status-success-bg border border-status-success/30 rounded-xl p-3 flex gap-2.5 items-start">
                  <CheckCircle size={18} className="text-status-success shrink-0 mt-0.5" />
                  <div className="text-xs text-status-success font-medium leading-relaxed">
                    Pembayaran gaji periode ini telah berhasil ditransfer ke rekening Anda.
                  </div>
                </div>
              ) : (
                <div className="bg-status-warning-bg border border-status-warning/30 rounded-xl p-3 flex gap-2.5 items-start">
                  <Clock size={18} className="text-status-warning shrink-0 mt-0.5" />
                  <div className="text-xs text-status-warning font-medium leading-relaxed">
                    Slip gaji masih berstatus Draft dan sedang diproses oleh bagian keuangan.
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 bg-muted/20 border-t border-border/80 flex gap-3">
              <DialogClose asChild>
                <button className="flex-1 h-11 min-h-[44px] rounded-xl text-xs font-semibold border border-border/80 bg-card hover:bg-accent transition-colors">
                  Tutup
                </button>
              </DialogClose>
              <button
                onClick={() => handlePrint(selectedSlip)}
                className="flex-1 h-11 min-h-[44px] rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Printer size={16} />
                <span>Cetak Slip</span>
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
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  SLIP GAJI KARYAWAN
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Klinik Hewan Dr. Meow / HadiR System
                </p>
              </div>
              <div className="text-right text-xs">
                <div>Periode: {getPeriodLabel(selectedSlip.period)}</div>
                <div className="text-muted-foreground mt-1">
                  Cetak: {new Date().toLocaleDateString("id-ID")}
                </div>
              </div>
            </div>

            {/* Income & Deductions */}
            <div className="grid grid-cols-2 gap-6 py-2">
              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-medium uppercase text-muted-foreground border-b border-border pb-1">
                  Penerimaan
                </h4>
                <div className="flex flex-col text-sm gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gaji Pokok</span>
                    <span>{formatCurrency(selectedSlip.basic_salary)}</span>
                  </div>
                  <div className="flex justify-between text-green-700 font-medium">
                    <span>Insentif</span>
                    <span>+{formatCurrency(selectedSlip.incentives)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h4 className="text-[10px] font-medium uppercase text-muted-foreground border-b border-border pb-1">
                  Potongan
                </h4>
                <div className="flex flex-col text-sm gap-2">
                  <div className="flex justify-between text-red-700 font-medium">
                    <span>Potongan Kasbon</span>
                    <span>-{formatCurrency(selectedSlip.kasbon_deduction)}</span>
                  </div>
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
