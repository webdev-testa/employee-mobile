import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  MapPin,
  AlertTriangle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getDistance } from "@/lib/geofence";

// Office Coordinates
const OFFICE_LAT = -8.00970;
const OFFICE_LNG = 112.61071;

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

  // Time off form states
  const [cutiType, setCutiType] = useState<"cuti" | "izin" | "sakit">("cuti");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");

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

    if (isFuture) {
      return "text-neutral-300 cursor-default";
    }

    if (record) {
      const status = record.status;
      if (status === "ontime") return "bg-[#E2F0E8] border border-[#3AAD7A]/30 text-[#3AAD7A]";
      if (status === "late") return "bg-[#FAF0E1] border border-[#E89E3A]/30 text-[#E89E3A]";
      if (status.includes("pending")) return "bg-sky-50 border border-sky-300/40 text-sky-500 animate-pulse";
      if (["cuti", "izin", "sakit"].includes(status)) return "bg-[#F0FAFF] border border-[#C8E8F5] text-[#4A7A8A]";
      if (status === "absent") return "bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171]";
    }

    if (dateStr === todayStr) {
      return "border-2 border-[#4DC8F5] text-[#4DC8F5] font-bold";
    }

    if (isWeekend) {
      return "text-[#8ABAC8] hover:bg-[#F0FAFF]";
    }

    // Weekday in the past with no record means absent
    return "bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171]";
  };

  // Stats summary calculations
  const countOntime = recordsList.filter((r) => r.status === "ontime").length;
  const countLate = recordsList.filter((r) => r.status === "late").length;
  
  // Calculate count of absent past weekdays
  let countAbsent = 0;
  let countCuti = recordsList.filter((r) => ["cuti", "izin", "sakit", "cuti_pending", "izin_pending", "sakit_pending"].includes(r.status)).length;

  calendarDays.forEach((cell) => {
    if (cell.day) {
      const todayStr = new Date().toISOString().split("T")[0];
      const isPast = cell.dateStr < todayStr;
      const date = new Date(cell.dateStr);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      if (isPast && !isWeekend && !attendanceMap[cell.dateStr]) {
        countAbsent++;
      }
    }
  });

  const handleDayClick = (dateStr: string) => {
    if (!dateStr) return;
    const todayStr = new Date().toISOString().split("T")[0];
    if (dateStr > todayStr) return;

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
      await fetchAttendance();
    } catch (e: any) {
      toast.error("Gagal mengirim pengajuan cuti", { description: e.message });
    } finally {
      setLoading(false);
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "ontime":
        return "bg-[#E2F0E8] text-[#3AAD7A]";
      case "late":
        return "bg-[#FAF0E1] text-[#E89E3A]";
      case "absent":
        return "bg-[#F87171]/10 text-[#F87171]";
      case "weekend":
        return "bg-neutral-100 text-neutral-400";
      case "cuti":
      case "izin":
      case "sakit":
        return "bg-[#F0FAFF] text-[#4A7A8A] border border-[#C8E8F5]";
      case "cuti_rejected":
      case "izin_rejected":
      case "sakit_rejected":
        return "bg-[#F87171]/10 text-[#F87171] border border-[#F87171]/20";
      default:
        return "bg-sky-50 text-sky-500 border border-sky-300/30";
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
      <div className="flex flex-col min-h-screen bg-[#F0FAFF] font-sans">
        {/* Header */}
        <div className="p-6 pb-5 flex items-center gap-3.5 bg-white border-b border-[#C8E8F5] shadow-sm">
          <Button
            onClick={() => setFlowState("list")}
            variant="outline"
            size="icon"
            className="cursor-pointer"
          >
            <ChevronLeft size={20} />
          </Button>
          <div className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] tracking-[-0.3px]">
            Ajukan Cuti / Izin
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmitTimeOff} className="p-6 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Tipe Cuti */}
            <div className="bg-white border border-[#C8E8F5] rounded-[18px] p-4 shadow-sm">
              <label className="text-[11px] text-[#8ABAC8] uppercase tracking-[1px] font-mono mb-2.5 block">
                Jenis Pengajuan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["cuti", "izin", "sakit"] as const).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    onClick={() => setCutiType(type)}
                    variant={cutiType === type ? "orange" : "secondary"}
                    className={`py-3 rounded-[12px] font-bold font-['Syne'] text-[14px] capitalize ${
                      cutiType === type
                        ? "bg-[#F5A940]/10 border border-[#F5A940]/40 text-[#F5A940] shadow-none"
                        : "bg-[#F0FAFF]/45 border-[#C8E8F5] text-[#4A7A8A] hover:bg-[#F0FAFF]"
                    }`}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tanggal */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-[#C8E8F5] rounded-[18px] p-4 shadow-sm">
                <label className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5 block">
                  Mulai Tanggal
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full bg-transparent border-none outline-none font-mono text-[14px] text-[#1A3A4A]"
                />
              </div>
              <div className="bg-white border border-[#C8E8F5] rounded-[18px] p-4 shadow-sm">
                <label className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5 block">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full bg-transparent border-none outline-none font-mono text-[14px] text-[#1A3A4A]"
                />
              </div>
            </div>

            {/* Alasan */}
            <div className="bg-white border border-[#C8E8F5] rounded-[18px] p-4 shadow-sm focus-within:border-[#8ABAC8] transition-colors">
              <label className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.8px] font-mono mb-1.5 block">
                Alasan Pengajuan
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan keterangan detail di sini..."
                required
                rows={4}
                className="w-full bg-transparent border-none outline-none font-sans text-[14px] text-[#1A3A4A] placeholder:text-[#8ABAC8] resize-none"
              />
            </div>

            <div className="flex gap-3 items-start bg-amber-50 border border-[#FAF0E1] rounded-[16px] p-3.5">
              <AlertTriangle size={18} className="text-[#E89E3A] shrink-0 mt-0.5" />
              <div className="text-[12px] text-[#4A7A8A] leading-[1.5]">
                Pengajuan cuti/izin memerlukan persetujuan Fara (Admin) dan otomatis memotong jatah libur kerja jika disetujui.
              </div>
            </div>
          </div>

          <div className="pt-6">
            <Button
              type="submit"
              disabled={loading}
              variant="orange"
              className="w-full py-4 rounded-[18px] font-['Syne'] text-[18px] font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  <Send size={18} />
                  Kirim Pengajuan
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (flowState === "success") {
    return (
      <div className="flex flex-col items-center justify-center p-7 text-center min-h-screen bg-[#F0FAFF] font-sans">
        <div className="w-[110px] h-[110px] rounded-full bg-[#FAF0E1] border-2 border-[#FAF0E1] flex items-center justify-center mb-6 relative">
          <div className="absolute -inset-3 rounded-full border border-[#FAF0E1] opacity-40"></div>
          <Send size={40} className="text-[#F5A940] ml-1" />
        </div>

        <div className="font-['Syne'] text-[26px] font-bold text-[#1A3A4A] mb-2 tracking-[-0.5px]">
          Pengajuan Cuti Terkirim!
        </div>
        <div className="text-[13.5px] text-[#4A7A8A] mb-7 leading-[1.6]">
          Permohonan cuti / izin kamu telah berhasil dikirim dan sedang menunggu peninjauan dari admin.
        </div>

        <Button
          onClick={() => setFlowState("list")}
          variant="outline"
          size="xl"
          className="w-full cursor-pointer bg-white text-[#1A3A4A] hover:bg-[#F0FAFF]"
        >
          Kembali ke Absensi
        </Button>
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
        <div className="p-6 pb-5 flex items-center gap-3.5 bg-white border-b border-[#C8E8F5] shadow-sm">
          <Button
            onClick={() => setFlowState("list")}
            variant="outline"
            size="icon"
            className="cursor-pointer"
          >
            <ChevronLeft size={20} />
          </Button>
          <div className="detail-title-block flex-1 min-w-0">
            <div className="font-['Syne'] text-[18px] font-bold text-[#1A3A4A] truncate">
              {formatDateFull(selectedRecord.date)}
            </div>
            <div className="text-[12.5px] text-[#4A7A8A] mt-0.5">Detail absensi harian</div>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold font-['Syne'] ${getStatusBadgeClass(selectedRecord.status)}`}>
            {getStatusLabel(selectedRecord.status)}
          </span>
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
          {isClockedIn && (
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
          )}

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

    return (
      <div
        key={idx}
        onClick={() => cell.day && handleDayClick(cell.dateStr)}
        className={`aspect-square rounded-[10px] flex items-center justify-center font-mono text-[13px] font-medium transition-all ${
          cell.day ? "cursor-pointer hover:scale-105 active:scale-95" : ""
        } ${statusClass}`}
      >
        {cell.day || ""}
      </div>
    );
  });

  return (
    <div className="bg-[#F0FAFF] flex flex-col font-sans relative min-h-screen">
      {/* Page Header */}
      <div className="p-6 pb-4 bg-white border-b border-[#C8E8F5] shadow-sm flex items-center justify-between">
        <div>
          <h1 className="font-['Syne'] text-[24px] font-bold text-[#1A3A4A] tracking-[-0.5px]">
            Absensi
          </h1>
          <p className="text-[13px] text-[#4A7A8A]">Riwayat kehadiranmu</p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-1.5 bg-[#F0FAFF] border border-[#C8E8F5] rounded-xl p-1 shrink-0">
          <Button
            onClick={handlePrevMonth}
            variant="outline"
            size="sm"
            className="w-7 h-7 p-0 flex items-center justify-center rounded-lg bg-white text-[#4A7A8A] hover:bg-[#F0FAFF]"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="font-mono text-[12px] font-bold text-[#1A3A4A] px-2 min-w-[76px] text-center uppercase">
            {currentDate.toLocaleDateString("id-ID", { month: "short", year: "numeric" })}
          </span>
          <Button
            onClick={handleNextMonth}
            variant="outline"
            size="sm"
            className="w-7 h-7 p-0 flex items-center justify-center rounded-lg bg-white text-[#4A7A8A] hover:bg-[#F0FAFF]"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      {/* Recap Stats */}
      <div className="grid grid-cols-4 gap-2.5 px-6 pt-5">
        <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 text-center shadow-sm">
          <div className="font-['Syne'] text-[22px] font-bold text-[#3AAD7A]">{countOntime}</div>
          <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.5px] font-mono mt-1">Hadir</div>
        </div>
        <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 text-center shadow-sm">
          <div className="font-['Syne'] text-[22px] font-bold text-[#E89E3A]">{countLate}</div>
          <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.5px] font-mono mt-1">Lambat</div>
        </div>
        <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 text-center shadow-sm">
          <div className="font-['Syne'] text-[22px] font-bold text-[#F87171]">{countAbsent}</div>
          <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.5px] font-mono mt-1">Absen</div>
        </div>
        <div className="bg-white border border-[#C8E8F5] rounded-[16px] p-3.5 text-center shadow-sm">
          <div className="font-['Syne'] text-[22px] font-bold text-[#4A7A8A]">{countCuti}</div>
          <div className="text-[10px] text-[#8ABAC8] uppercase tracking-[0.5px] font-mono mt-1">Cuti</div>
        </div>
      </div>

      {/* Calendar Wrap */}
      <div className="mx-6 mt-4 bg-white border border-[#C8E8F5] rounded-[24px] p-5 shadow-sm">
        <div className="grid grid-cols-7 gap-1.5 mb-3">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
            <div key={d} className="text-center text-[10px] text-[#8ABAC8] uppercase tracking-[0.5px] font-mono font-bold">
              {d}
            </div>
          ))}
        </div>
        
        {loading ? (
          <div className="h-[210px] flex items-center justify-center font-mono text-sm text-[#8ABAC8] uppercase">
            Loading Calendar...
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">{calendarCells}</div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-3.5 border-t border-[#F0FAFF]">
          <div className="flex items-center gap-1.5 text-[11px] text-[#4A7A8A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3AAD7A]"></span> Tepat waktu
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#4A7A8A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E89E3A]"></span> Terlambat
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#4A7A8A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F87171]"></span> Tidak hadir
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#4A7A8A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C8E8F5]"></span> Cuti/Izin
          </div>
        </div>
      </div>

      {/* Action to Request Cuti */}
      <div className="px-6 mt-2 mb-2">
        <Button
          onClick={() => {
            setStartDate("");
            setEndDate("");
            setFlowState("form");
          }}
          variant="outline"
          size="xl"
          className="w-full cursor-pointer bg-[#FAF0E1] border-[#FAF0E1] text-[#E89E3A] hover:bg-[#FAF0E1]/80 hover:text-[#E89E3A]"
        >
          <Calendar size={18} />
          Ajukan Cuti / Izin Kerja
        </Button>
      </div>

      {/* Daily list header */}
      <div className="px-6 pb-2.5 pt-2 flex items-center justify-between">
        <span className="text-[12px] font-bold text-[#4A7A8A] uppercase tracking-[0.8px] font-mono">
          Riwayat Harian
        </span>
      </div>

      {/* Daily History List */}
      <div className="px-6 pb-[92px] flex flex-col gap-2.5">
        {loading ? (
          <div className="bg-white border border-[#C8E8F5] rounded-[18px] p-6 text-center text-[#8ABAC8] text-[13px]">
            Memuat data...
          </div>
        ) : recordsList.length === 0 ? (
          <div className="bg-white border border-[#C8E8F5] rounded-[18px] p-6 text-center text-[#8ABAC8] text-[13px]">
            Tidak ada riwayat absensi bulan ini
          </div>
        ) : (
          recordsList.map((record) => {
            const dateObj = new Date(record.date);
            const dayNum = dateObj.getDate();
            const dayName = dateObj.toLocaleDateString("id-ID", { weekday: "short" });

            const isCuti = ["cuti", "izin", "sakit", "cuti_pending", "izin_pending", "sakit_pending"].includes(record.status);
            const isAbsent = record.status === "absent";

            return (
              <div
                key={record.id}
                onClick={() => handleDayClick(record.date)}
                className={`flex items-center gap-3 p-4 bg-white border border-[#C8E8F5] rounded-[18px] shadow-sm hover:border-[#8ABAC8] transition-all cursor-pointer ${
                  isAbsent ? "border-[#F87171]/25 bg-[#F87171]/5" : ""
                }`}
              >
                {/* Date Col */}
                <div className="w-10 text-center shrink-0">
                  <div className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] leading-none">
                    {dayNum}
                  </div>
                  <div className="text-[10.5px] text-[#8ABAC8] font-mono uppercase tracking-[0.5px] mt-1">
                    {dayName}
                  </div>
                </div>

                <div className="w-[1px] h-9 bg-[#C8E8F5] shrink-0"></div>

                {/* Info Col */}
                <div className="flex-1 min-w-0">
                  {isAbsent ? (
                    <div className="text-[13.5px] font-bold text-[#F87171]">Tidak Hadir</div>
                  ) : isCuti ? (
                    <div className="text-[13.5px] font-bold text-[#4A7A8A] truncate">
                      {getStatusLabel(record.status)}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${record.status === "late" ? "bg-[#E89E3A]" : "bg-[#3AAD7A]"}`}></span>
                        <span className="font-mono text-[13px] font-medium text-[#1A3A4A]">
                          {formatTime(record.clock_in_time)}
                        </span>
                        <span className="text-[11px] text-[#8ABAC8]">masuk</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300"></span>
                        <span className="font-mono text-[13px] font-medium text-[#1A3A4A]">
                          {formatTime(record.clock_out_time)}
                        </span>
                        <span className="text-[11px] text-[#8ABAC8]">pulang</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Badge Col */}
                <div className="text-right shrink-0">
                  {isAbsent ? (
                    <span className="inline-flex px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-[#F87171]/10 text-[#F87171] uppercase tracking-[0.3px]">
                      ✕ Absen
                    </span>
                  ) : isCuti ? (
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.3px] ${
                      record.status.includes("pending") ? "bg-sky-50 text-sky-500 border border-sky-300/30" : "bg-[#F0FAFF] text-[#4A7A8A]"
                    }`}>
                      {record.status.includes("pending") ? "⏳ Pending" : "✓ Cuti"}
                    </span>
                  ) : (
                    <div className="flex flex-col items-end gap-1.5">
                      {record.clock_in_time && record.clock_out_time && (
                        <div className="text-[11.5px] text-[#4A7A8A] font-mono">
                          {calculateWorkDuration(record.clock_in_time, record.clock_out_time)}
                        </div>
                      )}
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10.5px] font-bold uppercase tracking-[0.3px] ${
                        record.status === "late" ? "bg-[#FAF0E1] text-[#E89E3A]" : "bg-[#E2F0E8] text-[#3AAD7A]"
                      }`}>
                        {record.status === "late" ? "⚠ Late" : "✓ On Time"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
