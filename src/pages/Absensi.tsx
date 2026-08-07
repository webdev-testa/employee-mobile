import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/layout/PageHeader";
import { AttendanceCalendarView } from "@/components/absensi/AttendanceCalendarView";
import { AttendanceDetailModal } from "@/components/absensi/AttendanceDetailModal";
import { LeaveApplicationForm } from "@/components/absensi/LeaveApplicationForm";
import { AttendanceStatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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
  status: string;
  is_flagged: boolean | null;
}

export default function EmployeeAbsensi() {
  const [flowState, setFlowState] = useState<FlowState>("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [recordsList, setRecordsList] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [holidaysList, setHolidaysList] = useState<string[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

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

      const { data: holidaysData } = await supabase
        .schema("hr")
        .from("holidays")
        .select("date")
        .gte("date", firstDayOfMonth)
        .lte("date", lastDayOfMonth);

      if (holidaysData) {
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

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDayClick = (dateStr: string) => {
    if (!dateStr) return;
    const todayStr = new Date().toISOString().split("T")[0];
    if (dateStr > todayStr && !attendanceMap[dateStr]) return;

    const record = attendanceMap[dateStr];
    if (record) {
      setSelectedRecord(record);
    } else {
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
    }
    setFlowState("detail");
  };

  if (flowState === "detail") {
    return (
      <AttendanceDetailModal
        selectedRecord={selectedRecord}
        onBack={() => setFlowState("list")}
        onApplyLeave={() => setFlowState("form")}
      />
    );
  }

  if (flowState === "form") {
    return (
      <LeaveApplicationForm
        onBack={() => setFlowState("list")}
        onSuccess={() => {
          setFlowState("list");
          fetchAttendance();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <PageHeader title="Kalender Absensi" />

      <div className="p-6 space-y-6 pb-24">
        {/* Calendar View */}
        <AttendanceCalendarView
          currentDate={currentDate}
          attendanceMap={attendanceMap}
          recordsList={recordsList}
          holidaysList={holidaysList}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onDayClick={handleDayClick}
        />

        {/* Action Button for Leave Request */}
        <Button
          onClick={() => setFlowState("form")}
          className="w-full h-12 min-h-[44px] rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
        >
          Ajukan Cuti / Izin
        </Button>

        {/* History List Header */}
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-base font-display text-foreground">
            Riwayat Bulan Ini
          </h3>

          {loading ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              Memuat data...
            </div>
          ) : recordsList.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground bg-card border border-border/80 rounded-2xl p-6">
              Belum ada riwayat absensi bulan ini.
            </div>
          ) : (
            <div className="space-y-2">
              {recordsList.map((record) => (
                <button
                  key={record.id}
                  onClick={() => {
                    setSelectedRecord(record);
                    setFlowState("detail");
                  }}
                  className="w-full bg-card border border-border/80 p-3.5 rounded-2xl flex items-center justify-between hover:bg-accent/50 transition-colors text-left min-h-[44px]"
                >
                  <div>
                    <div className="font-semibold text-xs text-foreground">
                      {new Date(record.date).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {record.clock_in_time
                        ? `Masuk: ${new Date(record.clock_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Tidak Absen Masuk"}
                    </div>
                  </div>
                  <AttendanceStatusBadge status={record.status} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
