import React, { useState, useRef } from "react";
import { ChevronLeft, Paperclip, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface LeaveApplicationFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function LeaveApplicationForm({ onBack, onSuccess }: LeaveApplicationFormProps) {
  const [cutiType, setCutiType] = useState<"cuti" | "izin" | "sakit">("cuti");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || loading) return;

    const cleanReason = reason.trim();
    if (!startDate || !endDate || !cleanReason) {
      toast.error("Form tidak lengkap", { description: "Semua kolom wajib diisi." });
      return;
    }

    if (cleanReason.length < 5) {
      toast.error("Alasan terlalu pendek", { description: "Alasan pengajuan minimal 5 karakter." });
      return;
    }

    if (startDate > endDate) {
      toast.error("Format tanggal salah", { description: "Tanggal mulai tidak boleh melebihi tanggal selesai." });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 30) {
      toast.error("Rentang waktu terlalu panjang", { description: "Pengajuan cuti/izin maksimal 30 hari berturut-turut." });
      return;
    }

    // Filter weekdays before any storage upload
    const weekdays: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        weekdays.push(`${year}-${month}-${day}`);
      }
    }

    if (weekdays.length === 0) {
      toast.info("Pengajuan cuti hanya berlaku di hari kerja (Senin - Jumat)");
      return;
    }

    // Whitelist check on attachment before network operations
    if (attachment) {
      const ext = attachment.name.split(".").pop()?.toLowerCase();
      const ALLOWED_EXTS = ["jpg", "jpeg", "png", "webp", "pdf"];
      if (!ext || !ALLOWED_EXTS.includes(ext)) {
        toast.error("Format lampiran tidak didukung", {
          description: "Hanya format JPG, PNG, WEBP, atau PDF yang diperbolehkan.",
        });
        return;
      }
    }

    isSubmittingRef.current = true;
    setLoading(true);

    let uploadedFilename: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Anda belum login");

      let uploadedUrl: string | null = null;
      if (attachment) {
        const ext = attachment.name.split(".").pop()?.toLowerCase();
        uploadedFilename = `${user.id}/leave_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const { error: uploadError } = await supabase
          .storage
          .from("attendance-photos")
          .upload(uploadedFilename, attachment);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase
          .storage
          .from("attendance-photos")
          .getPublicUrl(uploadedFilename);
        uploadedUrl = publicUrl;
      }

      // Check existing records for overlapping dates
      const { data: existing, error: checkError } = await supabase
        .schema("hr")
        .from("attendance")
        .select("date")
        .eq("user_id", user.id)
        .in("date", weekdays);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        if (uploadedFilename) {
          await supabase.storage.from("attendance-photos").remove([uploadedFilename]).catch(() => {});
        }
        const dates = existing.map((e) => e.date).join(", ");
        toast.error("Gagal mengajukan cuti", {
          description: `Tanggal berikut sudah memiliki riwayat absen/cuti: ${dates}`,
        });
        return;
      }

      const insertRows = weekdays.map((dateStr) => ({
        user_id: user.id,
        date: dateStr,
        status: `${cutiType}_pending`,
        is_flagged: true,
        clock_in_photo_url: uploadedUrl,
      }));

      const { error: insertError } = await supabase.schema("hr").from("attendance").insert(insertRows);
      if (insertError) {
        if (uploadedFilename) {
          await supabase.storage.from("attendance-photos").remove([uploadedFilename]).catch(() => {});
        }
        throw insertError;
      }

      toast.success("Pengajuan cuti berhasil dikirim");
      onSuccess();
    } catch (e: unknown) {
      const description = e instanceof Error ? e.message : 'Terjadi kesalahan sistem';
      toast.error("Gagal mengirim pengajuan cuti", { description });
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Form Header */}
      <div className="flex items-center p-4 border-b border-border/80 bg-card sticky top-0 z-10">
        <button
          onClick={onBack}
          aria-label="Kembali"
          className="h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:bg-accent rounded-xl transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-semibold ml-2 text-lg font-display text-foreground">
          Ajukan Cuti / Izin
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5 pb-24">
        {/* Type selector */}
        <div>
          <label className="block text-xs font-medium mb-2 text-foreground/80">Jenis Pengajuan</label>
          <div className="flex bg-muted p-1 rounded-xl gap-1">
            {(["cuti", "izin", "sakit"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setCutiType(type)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all min-h-[44px] ${
                  cutiType === type
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Date inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5 text-foreground/80">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              disabled={loading}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 px-3 bg-card border border-border/80 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 text-foreground/80">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              disabled={loading}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-11 px-3 bg-card border border-border/80 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Reason textarea */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-foreground/80">Alasan / Keterangan</label>
          <textarea
            rows={4}
            maxLength={500}
            disabled={loading}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tuliskan alasan pengajuan... (maks. 500 karakter)"
            className="w-full p-3 bg-card border border-border/80 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none disabled:opacity-50"
          />
        </div>

        {/* Attachment upload */}
        <div>
          <label className="block text-xs font-medium mb-1.5 text-foreground/80">Lampiran (Opsional)</label>
          <label className={`flex items-center justify-center gap-2 p-4 border border-dashed border-border/80 rounded-xl bg-card hover:bg-muted/40 cursor-pointer transition-colors min-h-[44px] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <Paperclip size={18} className="text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground truncate max-w-[220px]">
              {attachment ? attachment.name : "Unggah Surat Dokter / Bukti"}
            </span>
            <input
              type="file"
              disabled={loading}
              accept="image/*,application/pdf"
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 min-h-[44px] rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 shadow-md"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Send size={18} />
              <span>Kirim Pengajuan</span>
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
