import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  AlertTriangle,
  Send,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceStatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { getDistance } from "@/lib/geofence";

// Office Coordinates
const OFFICE_LAT = -6.19026;
const OFFICE_LNG = 106.82391;

type FlowState = "list" | "detail" | "form" | "success";

interface AttendanceRecord {
  id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  status: string; // 'ontime' | 'late' | 'absent' | 'cuti' | 'izin' | 'sakit' | 'cuti_pending' etc.
  is_flagged: boolean | null;
}

export default function EmployeeAbsensi() {
  const [flowState, setFlowState] = useState<FlowState>("list");
  const [currentDate, setCurrentDate] = useState(new Date()); // Holds current view month/year
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [recordsList, setRecordsList] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const [cutiType, setCutiType] = useState<"cuti" | "izin" | "sakit">("cuti");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [holidaysList, setHolidaysList] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Load attendance data for the month
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const firstDayOfMonth = new Date(year, month, 1).toISOString().split("T")[0];
      const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().split("T")[0];

      const { data, error } = await supabase
        .schema("hr")
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth);

      if (error) throw error;

      // Fetch holidays for the month
      const { data: holidaysData, error: holidaysError } = await supabase
        .schema("hr")
        .from("holidays")
        .select("date")
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth);

      if (holidaysError) {
        console.error("Fetch holidays error:", holidaysError);
      } else if (holidaysData) {
        setHolidaysList(holidaysData.map((h: any) => h.date));
      }

      const map: Record<string, AttendanceRecord> = {};
      const sorted = [...(data || [])].sort((a, b) => b.date.localeCompare(a.date));
      
      sorted.forEach((record) => {
        map[record.date] = record;
      });

      setAttendanceMap(map);
      setRecordsList(sorted);
    } catch (e: any) {
      toast.error("Gagal mengambil data absensi", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentDate]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calendar Math
  const startDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const getCalendarDays = () => {
    const cells = [];
    // Pad empty cells before the start day
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ day: null, dateStr: "" });
    }
    // Populate calendar days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      const monthStr = String(month + 1).padStart(2, "0");
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      cells.push({ day, dateStr });
    }
    return cells;
  };

  const calendarDays = getCalendarDays();

  // Helper to determine day styles
  const getDayStatusClass = (dateStr: string, isWeekend: boolean) => {
    if (!dateStr) return "bg-transparent cursor-default";

    const record = attendanceMap[dateStr];
    const todayStr = new Date().toISOString().split("T")[0];
    const isFuture = dateStr > todayStr;
    const isHoliday = holidaysList.includes(dateStr);

    if (dateStr === todayStr) {
      return "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20";
    }

    if (record) {
      const status = record.status;
      if (status === "ontime") return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 font-medium";
      if (status === "late") return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-medium";
      if (status.includes("pending")) return "bg-sky-50 text-sky-500 animate-pulse font-medium";
      if (status.includes("rejected")) return "bg-red-50 text-red-400 line-through font-medium";
      if (["cuti", "izin", "sakit"].includes(status)) return "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400 font-medium";
      if (status === "absent") return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 font-medium";
    }

    if (isFuture) {
      return "text-muted-foreground/40 cursor-default";
    }

    if (isHoliday) {
      return "bg-muted text-muted-foreground cursor-default";
    }

    if (isWeekend) {
      return "text-muted-foreground/40 hover:bg-muted";
    }

    // Weekday in the past with no record means absent
    return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 font-medium";
  };

  // Stats summary calculations
  const countOntime = recordsList.filter((r) => r.status === "ontime").length;
  const countLate = recordsList.filter((r) => r.status === "late").length;
  
  // Calculate count of absent past weekdays
  let countAbsent = 0;
  let countCuti = recordsList.filter((r) => ["cuti"].includes(r.status) || r.status === "cuti_pending").length;
  let countIzinSakit = recordsList.filter((r) => ["izin", "sakit", "izin_pending", "sakit_pending"].includes(r.status)).length;

  calendarDays.forEach((cell) => {
    if (cell.day) {
      const todayStr = new Date().toISOString().split("T")[0];
      const isPast = cell.dateStr < todayStr;
      const date = new Date(cell.dateStr);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isHoliday = holidaysList.includes(cell.dateStr);

      if (isPast && !isWeekend && !isHoliday && !attendanceMap[cell.dateStr]) {
        countAbsent++;
      }
    }
  });

  const handleDayClick = (dateStr: string) => {
    if (!dateStr) return;
    const todayStr = new Date().toISOString().split("T")[0];
    if (dateStr > todayStr && !attendanceMap[dateStr]) return;

    const record = attendanceMap[dateStr];
    if (record) {
      setSelectedRecord(record);
      setFlowState("detail");
    } else {
      // Create a dummy / absent record to view or apply for cuti
      const dateObj = new Date(dateStr);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      setSelectedRecord({
        id: "",
        date: dateStr,
        clock_in_time: null,
        clock_out_time: null,
        clock_in_lat: null,
        clock_in_lng: null,
        clock_out_lat: null,
        clock_out_lng: null,
        clock_in_photo_url: null,
        clock_out_photo_url: null,
        status: isWeekend ? "weekend" : "absent",
        is_flagged: null,
      });
      setFlowState("detail");
    }
  };

  // Submit Time off Request
  const handleSubmitTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason) {
      toast.error("Form tidak lengkap", { description: "Semua kolom wajib diisi." });
      return;
    }

    if (startDate > endDate) {
      toast.error("Format tanggal salah", { description: "Tanggal mulai tidak boleh melebihi tanggal selesai." });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Anda belum login");

      let uploadedUrl: string | null = null;
      if (attachment) {
        setUploadingAttachment(true);
        const filename = `${user.id}/leave_${Date.now()}_${attachment.name}`;
        const { error: uploadError } = await supabase
          .storage
          .from('attendance-photos')
          .upload(filename, attachment);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase
          .storage
          .from('attendance-photos')
          .getPublicUrl(filename);
        uploadedUrl = publicUrl;
        setUploadingAttachment(false);
      }

      // Generate all dates in range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const insertRows = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        // Don't insert cuti on weekends
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          insertRows.push({
            user_id: user.id,
            date: dateStr,
            status: `${cutiType}_pending`, // e.g. cuti_pending, izin_pending, sakit_pending
            is_flagged: true, // Marked pending review
            clock_in_photo_url: uploadedUrl, // Save attachment URL here
          });
        }
      }

      if (insertRows.length === 0) {
        toast.info("Pengajuan cuti hanya berlaku di hari kerja");
        return;
      }

      // Check if any date already has attendance logged
      const dateStrings = insertRows.map((r) => r.date);
      const { data: existing } = await supabase
        .schema("hr")
        .from("attendance")
        .select("date")
        .eq("user_id", user.id)
        .in("date", dateStrings);

      if (existing && existing.length > 0) {
        const dates = existing.map((e) => e.date).join(", ");
        toast.error("Gagal mengajukan cuti", {
          description: `Tanggal berikut sudah memiliki riwayat absen/cuti: ${dates}`,
        });
        return;
      }

      const { error } = await supabase.schema("hr").from("attendance").insert(insertRows);
      if (error) throw error;

      setFlowState("success");
      setAttachment(null);
      await fetchAttendance();
    } catch (e: any) {
      toast.error("Gagal mengirim pengajuan cuti", { description: e.message });
    } finally {
      setLoading(false);
      setUploadingAttachment(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ontime":
        return "Tepat Waktu";
      case "late":
        return "Terlambat";
      case "absent":
        return "Tidak Hadir";
      case "cuti":
        return "Cuti Disetujui";
      case "izin":
        return "Izin Disetujui";
      case "sakit":
        return "Sakit Disetujui";
      case "cuti_pending":
        return "Cuti (Menunggu)";
      case "izin_pending":
        return "Izin (Menunggu)";
      case "sakit_pending":
        return "Sakit (Menunggu)";
      case "cuti_rejected":
        return "Cuti Ditolak";
      case "izin_rejected":
        return "Izin Ditolak";
      case "sakit_rejected":
        return "Sakit Ditolak";
      case "weekend":
        return "Hari Libur";
      default:
        return status;
    }
  };

  // Format Helper
  const formatDateFull = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "—";
    return new Date(timeStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const calculateWorkDuration = (inTime: string | null, outTime: string | null) => {
    if (!inTime || !outTime) return "—";
    const diffMs = new Date(outTime).getTime() - new Date(inTime).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}j ${minutes}m`;
  };

  if (flowState === "form") {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto">
        <div className="flex items-center p-4 border-b border-border bg-card sticky top-0 z-10">
          <button onClick={() => setFlowState("list")} className="p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold ml-2 text-lg font-display">Ajukan Cuti / Izin</h2>
        </div>
        
        <form onSubmit={handleSubmitTimeOff} className="p-6 space-y-5 pb-24">
          <div>
            <label className="block text-xs font-medium mb-2 text-foreground/80">Jenis Pengajuan</label>
            <div className="flex bg-muted p-1 rounded-lg">
              {(["cuti", "izin", "sakit"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setCutiType(type)}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                    cutiType === type 
                      ? "bg-background shadow-sm text-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 text-foreground/80">Mulai Tanggal</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full bg-muted border border-transparent rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:bg-background outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 text-foreground/80">Sampai Tanggal</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full bg-muted border border-transparent rounded-lg px-3 py-2.5 text-sm focus:border-primary focus:bg-background outline-none transition-all" 
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-foreground/80">Alasan Pengajuan</label>
            <textarea 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="w-full bg-muted border border-transparent rounded-lg px-3 py-3 text-sm min-h-[100px] focus:border-primary focus:bg-background outline-none transition-all"
              placeholder="Tuliskan keterangan detail di sini..."
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 text-foreground/80">Lampiran / Dokumen (Opsional)</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*,application/pdf"
                id="leave-attachment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setAttachment(file);
                }}
                disabled={loading || uploadingAttachment}
              />
              <label htmlFor="leave-attachment" className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <Paperclip size={24} className="mb-2 opacity-50" />
                <span className="text-xs">{attachment ? attachment.name : "Upload Foto/PDF"}</span>
              </label>
              {attachment && (
                <button 
                  type="button" 
                  onClick={() => setAttachment(null)} 
                  className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-md text-xs font-medium"
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-100 dark:border-amber-500/20 text-amber-800 dark:text-amber-400 text-xs leading-relaxed flex gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <div>
              Pengajuan cuti/izin memerlukan persetujuan Fara (Admin) dan otomatis memotong jatah libur kerja jika disetujui.
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-medium mt-2 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-70"
          >
            {loading ? "Memproses..." : <><Send size={18} /> Kirim Pengajuan</>}
          </button>
        </form>
      </div>
    );
  }

  if (flowState === "success") {
    return (
      <div className="flex flex-col items-center justify-center p-7 text-center min-h-screen bg-background font-sans pb-24">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Send size={40} className="text-primary ml-1" />
        </div>

        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Pengajuan Terkirim!
        </h2>
        <p className="text-sm text-muted-foreground mb-8 max-w-[250px]">
          Permohonan cuti / izin kamu telah berhasil dikirim dan sedang menunggu peninjauan dari admin.
        </p>

        <button
          onClick={() => setFlowState("list")}
          className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-medium shadow-md shadow-primary/20 transition-all hover:bg-primary/90"
        >
          Kembali ke Absensi
        </button>
      </div>
    );
  }

  if (flowState === "detail" && selectedRecord) {
    const isClockedIn = !!selectedRecord.clock_in_time;

    // Check geofence
    const userDistance =
      selectedRecord.clock_in_lat && selectedRecord.clock_in_lng
        ? Math.round(
            getDistance(
              selectedRecord.clock_in_lat,
              selectedRecord.clock_in_lng,
              OFFICE_LAT,
              OFFICE_LNG
            )
          )
        : null;

    const inArea = userDistance !== null ? userDistance <= 100 : false;

    return (
      <div className="flex flex-col min-h-screen bg-[#F0FAFF] font-sans">
        {/* Header */}
        <div className="p-0 bg-white border-b border-[#C8E8F5] shadow-sm flex items-center pr-6">
          <PageHeader title={formatDateFull(selectedRecord.date)} onBack={() => setFlowState("list")} />
          <div className="flex-1" />
          <AttendanceStatusBadge status={selectedRecord.status} />
        </div>

        {/* Detail Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          
          {/* Status Banner */}
          {selectedRecord.status === "absent" ? (
            <div className="bg-[#F87171]/10 border border-[#F87171]/30 rounded-[18px] p-4 flex gap-3 items-start">
              <div className="w-10 h-10 rounded-xl bg-[#F87171]/10 flex items-center justify-center shrink-0 text-[#F87171] text-lg font-bold">✕</div>
              <div>
                <div className="font-bold text-[#F87171] text-[14px]">Tidak Hadir</div>
                <div className="text-[12px] text-[#4A7A8A] mt-1">
                  Anda tidak melakukan clock-in pada hari kerja ini. Jika Anda berhalangan hadir, silakan ajukan cuti.
                </div>
              </div>
            </div>
          ) : selectedRecord.status.includes("pending") ? (
            <div className="bg-sky-50 border border-sky-300/40 rounded-[18px] p-4 flex gap-3 items-start">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center shrink-0 text-sky-500 text-lg font-bold">⏳</div>
              <div>
                <div className="font-bold text-sky-500 text-[14px]">Menunggu Persetujuan</div>
                <div className="text-[12px] text-[#4A7A8A] mt-1">
                  Pengajuan izin/cuti Anda sedang diproses oleh admin.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#E2F0E8] border border-[#3AAD7A]/30 rounded-[18px] p-4 flex gap-3 items-start">
              <div className="w-10 h-10 rounded-xl bg-[#3AAD7A]/10 flex items-center justify-center shrink-0 text-[#3AAD7A] text-lg font-bold">✓</div>
              <div>
                <div className="font-bold text-[#3AAD7A] text-[14px]">{getStatusLabel(selectedRecord.status)}</div>
                <div className="text-[12px] text-[#4A7A8A] mt-1">
                  Absensi Anda tercatat di sistem pada hari ini.
                </div>
              </div>
            </div>
          )}

          {/* Photo Row */}
          {isClockedIn ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[#C8E8F5] rounded-[18px] overflow-hidden shadow-sm">
                <div className="p-2 border-b border-[#F0FAFF] font-mono text-[9px] text-[#8ABAC8] tracking-[0.5px] uppercase">
                  Clock-in Photo
                </div>
                <div className="h-[120px] bg-neutral-100 relative">
                  {selectedRecord.clock_in_photo_url ? (
                    <img
                      src={selectedRecord.clock_in_photo_url}
                      alt="Clock In"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[12px] text-[#8ABAC8]">
                      No Image
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-white border border-[#C8E8F5] rounded-[18px] overflow-hidden shadow-sm">
                <div className="p-2 border-b border-[#F0FAFF] font-mono text-[9px] text-[#8ABAC8] tracking-[0.5px] uppercase">
                  Clock-out Photo
                </div>
                <div className="h-[120px] bg-neutral-100 relative">
                  {selectedRecord.clock_out_photo_url ? (
                    <img
                      src={selectedRecord.clock_out_photo_url}
                      alt="Clock Out"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[12px] text-[#8ABAC8]">
                      No Image
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : selectedRecord.clock_in_photo_url ? (
            <div className="bg-white border border-[#C8E8F5] rounded-[18px] overflow-hidden shadow-sm">
              <div className="p-2 border-b border-[#F0FAFF] font-mono text-[9px] text-[#8ABAC8] tracking-[0.5px] uppercase">
                Dokumen Lampiran
              </div>
              <div className="p-4 flex flex-col gap-2">
                <a
                  href={selectedRecord.clock_in_photo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#F5A940] hover:underline"
                >
                  <Paperclip size={14} />
                  Buka Berkas Lampiran
                </a>
                {selectedRecord.clock_in_photo_url.match(/\.(jpeg|jpg|gif|png)$/i) && (
                  <div className="h-[150px] bg-neutral-100 rounded-lg overflow-hidden border border-[#C8E8F5] relative mt-1">
                    <img
                      src={selectedRecord.clock_in_photo_url}
                      alt="Attachment Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-[#C8E8F5] rounded-[14px] p-3.5 shadow-sm">
              <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1">
                Jam Masuk
              </div>
              <div className="font-mono text-[16px] font-medium text-[#1A3A4A]">
                {formatTime(selectedRecord.clock_in_time)}
              </div>
            </div>
            <div className="bg-white border border-[#C8E8F5] rounded-[14px] p-3.5 shadow-sm">
              <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1">
                Jam Keluar
              </div>
              <div className="font-mono text-[16px] font-medium text-[#1A3A4A]">
                {formatTime(selectedRecord.clock_out_time)}
              </div>
            </div>
            <div className="bg-white border border-[#C8E8F5] rounded-[14px] p-3.5 shadow-sm">
              <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1">
                Durasi Kerja
              </div>
              <div className="font-mono text-[16px] font-medium text-[#1A3A4A]">
                {calculateWorkDuration(selectedRecord.clock_in_time, selectedRecord.clock_out_time)}
              </div>
            </div>
            <div className="bg-white border border-[#C8E8F5] rounded-[14px] p-3.5 shadow-sm">
              <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1">
                Geofencing
              </div>
              <div className={`font-mono text-[15px] font-medium ${inArea ? "text-[#3AAD7A]" : "text-[#F87171]"}`}>
                {isClockedIn ? (inArea ? "Dalam Area" : "Luar Area") : "—"}
              </div>
              {userDistance !== null && (
                <div className="text-[11px] text-[#4A7A8A] mt-1">{userDistance}m dari kantor</div>
              )}
            </div>
          </div>

          {/* Location / Coords Card */}
          {selectedRecord.clock_in_lat && (
            <div className="bg-white border border-[#C8E8F5] rounded-[18px] overflow-hidden shadow-sm">
              <div className="loc-info p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E2F0E8] border border-[#3AAD7A]/30 flex items-center justify-center shrink-0 text-[#3AAD7A]">
                  <MapPin size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[#1A3A4A] text-[13.5px]">Koordinat Terdeteksi</div>
                  <div className="font-mono text-[11px] text-[#4A7A8A] mt-0.5">
                    {selectedRecord.clock_in_lat.toFixed(5)}, {selectedRecord.clock_in_lng?.toFixed(5)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {selectedRecord.status === "absent" && (
            <Button
              onClick={() => {
                setStartDate(selectedRecord.date);
                setEndDate(selectedRecord.date);
                setFlowState("form");
              }}
              variant="orange"
              size="xl"
              className="w-full mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              Ajukan Cuti / Izin untuk Hari Ini
            </Button>
          )}

          <Button
            onClick={() => setFlowState("list")}
            variant="outline"
            size="xl"
            className="w-full mt-2 cursor-pointer bg-white text-[#1A3A4A] hover:bg-[#F0FAFF]"
          >
            Kembali ke Absensi
          </Button>
        </div>
      </div>
    );
  }

  // Generate Calendar Days structure
  const calendarCells = calendarDays.map((cell, idx) => {
    const isWeekend = idx % 7 === 0 || idx % 7 === 6;
    const statusClass = getDayStatusClass(cell.dateStr, isWeekend);
    const todayStr = new Date().toISOString().split("T")[0];
    const isFuture = cell.dateStr > todayStr;
    const hasRecord = !!attendanceMap[cell.dateStr];
    const isClickable = cell.day && (!isFuture || hasRecord);

    return (
      <div
        key={idx}
        onClick={() => isClickable && handleDayClick(cell.dateStr)}
        className={`py-2 rounded-lg text-sm transition-all ${
          isClickable && !statusClass.includes("cursor-default") ? "cursor-pointer hover:scale-105 active:scale-95" : ""
        } ${statusClass} ${!cell.day ? 'bg-transparent' : ''}`}
      >
        {cell.day || ""}
      </div>
    );
  });

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-24">
      {/* Page Header */}
      <div className="p-4 border-b border-border bg-card sticky top-0 z-10 flex justify-between items-center">
        <h2 className="font-semibold text-lg font-display">Absensi</h2>
        <button onClick={() => {
            setStartDate("");
            setEndDate("");
            setFlowState("form");
          }} 
          className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        >
          + Ajukan Cuti/Izin
        </button>
      </div>

      <div className="p-4">
        {/* Navigation moved to calendar head directly */}

        {/* Recap Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-green-50/80 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 rounded-xl py-2 flex flex-col items-center justify-center">
            <span className="text-lg font-display font-bold text-green-700 dark:text-green-400">{countOntime}</span>
            <span className="text-[10px] font-medium text-green-700/80 dark:text-green-400/80 text-center">Tepat Waktu</span>
          </div>
          <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl py-2 flex flex-col items-center justify-center">
            <span className="text-lg font-display font-bold text-amber-700 dark:text-amber-400">{countLate}</span>
            <span className="text-[10px] font-medium text-amber-700/80 dark:text-amber-400/80 text-center">Terlambat</span>
          </div>
          <div className="bg-cyan-50/80 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 rounded-xl py-2 flex flex-col items-center justify-center">
            <span className="text-lg font-display font-bold text-cyan-700 dark:text-cyan-400">{countCuti}</span>
            <span className="text-[10px] font-medium text-cyan-700/80 dark:text-cyan-400/80 text-center">Cuti</span>
          </div>
          <div className="bg-red-50/80 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl py-2 flex flex-col items-center justify-center">
            <span className="text-lg font-display font-bold text-red-700 dark:text-red-400">{countAbsent}</span>
            <span className="text-[10px] font-medium text-red-700/80 dark:text-red-400/80 text-center">Tidak Hadir</span>
          </div>
          <div className="bg-blue-50/80 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl py-2 flex flex-col items-center justify-center col-span-2">
            <span className="text-lg font-display font-bold text-blue-700 dark:text-blue-400">{countIzinSakit}</span>
            <span className="text-[10px] font-medium text-blue-700/80 dark:text-blue-400/80 text-center">Izin / Sakit</span>
          </div>
        </div>

        {/* Calendar Wrap */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-sm">{currentDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</h3>
            <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="p-1.5 rounded-md bg-muted"><ChevronRight className="rotate-180" size={16} /></button>
              <button onClick={handleNextMonth} className="p-1.5 rounded-md bg-muted"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-muted-foreground font-medium">
            <div>M</div><div>S</div><div>S</div><div>R</div><div>K</div><div>J</div><div>S</div>
          </div>
          
          {loading ? (
            <div className="h-[210px] flex items-center justify-center text-sm text-muted-foreground">
              Memuat...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1 text-center text-sm">{calendarCells}</div>
          )}
        </div>

        {/* Daily list header */}
        <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Riwayat Harian</h4>

        {/* Daily History List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
              Memuat data...
            </div>
          ) : recordsList.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-4 text-center text-muted-foreground text-sm">
              Tidak ada riwayat absensi bulan ini
            </div>
          ) : (
            recordsList.map((record) => {
              const dateObj = new Date(record.date);
              const dayNum = dateObj.getDate();
              const dayName = dateObj.toLocaleDateString("id-ID", { weekday: "short" });
              const isCuti = ["cuti", "izin", "sakit", "cuti_pending", "izin_pending", "sakit_pending"].includes(record.status);
              const isAbsent = record.status === "absent";
              
              let statusColor = "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
              let statusText = "Tepat Waktu";
              if (record.status === "late") {
                  statusColor = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
                  statusText = "Terlambat";
              } else if (isAbsent) {
                  statusColor = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
                  statusText = "Tidak Hadir";
              } else if (isCuti) {
                  statusColor = "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
                  statusText = "Cuti/Izin";
                  if (record.status.includes("pending")) statusText = "Menunggu";
              }

              return (
                <div
                  key={record.id}
                  onClick={() => handleDayClick(record.date)}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="w-12 text-center shrink-0">
                    <div className="font-display text-xl font-bold">{dayNum}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-medium">{dayName}</div>
                  </div>
                  
                  <div className="w-[1px] h-10 bg-border shrink-0"></div>
                  
                  <div className="flex-1 min-w-0">
                    {isAbsent ? (
                      <div className="text-sm font-bold text-destructive">Tidak Hadir</div>
                    ) : isCuti ? (
                      <div className="text-sm font-bold text-muted-foreground">{getStatusLabel(record.status)}</div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{formatTime(record.clock_in_time)}</span>
                          <span className="text-xs text-muted-foreground">masuk</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{formatTime(record.clock_out_time)}</span>
                          <span className="text-xs text-muted-foreground">pulang</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
