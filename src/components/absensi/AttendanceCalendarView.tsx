import { ChevronLeft, ChevronRight } from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  clock_in_time: string | null;
  clock_out_time: string | null;
  status: string;
}

interface AttendanceCalendarViewProps {
  currentDate: Date;
  attendanceMap: Record<string, AttendanceRecord>;
  recordsList: AttendanceRecord[];
  holidaysList: string[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (dateStr: string) => void;
}

export function AttendanceCalendarView({
  currentDate,
  attendanceMap,
  recordsList,
  holidaysList,
  onPrevMonth,
  onNextMonth,
  onDayClick,
}: AttendanceCalendarViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startDayOfWeek = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const getCalendarDays = () => {
    const cells = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ day: null, dateStr: "" });
    }
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      const monthStr = String(month + 1).padStart(2, "0");
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      cells.push({ day, dateStr });
    }
    return cells;
  };

  const calendarDays = getCalendarDays();
  const todayStr = new Date().toISOString().split("T")[0];

  const getDayStatusClass = (dateStr: string, isWeekend: boolean) => {
    if (!dateStr) return "bg-transparent cursor-default";

    const record = attendanceMap[dateStr];
    const isFuture = dateStr > todayStr;
    const isHoliday = holidaysList.includes(dateStr);

    if (dateStr === todayStr) {
      return "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20";
    }

    if (record) {
      const status = record.status;
      if (status === "ontime") return "bg-status-success-bg text-status-success font-medium";
      if (status === "late") return "bg-status-warning-bg text-status-warning font-medium";
      if (status.includes("pending")) return "bg-status-info-bg text-status-info animate-pulse font-medium";
      if (status.includes("rejected")) return "bg-status-danger/10 text-status-danger line-through font-medium";
      if (["cuti", "izin", "sakit"].includes(status)) return "bg-status-info-bg text-status-info font-medium";
      if (status === "absent") return "bg-status-danger/10 text-status-danger font-medium";
    }

    if (isFuture) return "text-muted-foreground/40 cursor-default";
    if (isHoliday) return "bg-muted text-muted-foreground cursor-default";
    if (isWeekend) return "text-muted-foreground/40 hover:bg-muted";

    return "bg-status-danger/10 text-status-danger font-medium";
  };

  // Stats calculation
  const countOntime = recordsList.filter((r) => r.status === "ontime").length;
  const countLate = recordsList.filter((r) => r.status === "late").length;
  let countAbsent = 0;
  const countCuti = recordsList.filter((r) => ["cuti"].includes(r.status) || r.status === "cuti_pending").length;
  const countIzinSakit = recordsList.filter((r) => ["izin", "sakit", "izin_pending", "sakit_pending"].includes(r.status)).length;

  calendarDays.forEach((cell) => {
    if (cell.day) {
      const isPast = cell.dateStr < todayStr;
      const date = new Date(cell.dateStr);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isHoliday = holidaysList.includes(cell.dateStr);

      if (isPast && !isWeekend && !isHoliday && !attendanceMap[cell.dateStr]) {
        countAbsent++;
      }
    }
  });

  const monthYearLabel = currentDate.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevMonth}
            aria-label="Bulan Sebelumnya"
            className="h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="font-display font-bold text-base text-foreground capitalize">
            {monthYearLabel}
          </div>
          <button
            onClick={onNextMonth}
            aria-label="Bulan Berikutnya"
            className="h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day Header */}
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted-foreground">
          {["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day, idx) => (
            <div key={day} className={idx === 0 || idx === 6 ? "text-status-danger/70" : ""}>
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((cell, idx) => {
            if (!cell.day) {
              return <div key={`empty-${idx}`} className="h-9" />;
            }
            const dateObj = new Date(cell.dateStr);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const statusClass = getDayStatusClass(cell.dateStr, isWeekend);

            return (
              <button
                key={cell.dateStr}
                onClick={() => onDayClick(cell.dateStr)}
                disabled={cell.dateStr > todayStr && !attendanceMap[cell.dateStr]}
                className={`h-9 w-full rounded-xl flex items-center justify-center text-xs transition-all ${statusClass}`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Monthly Summary Statistics */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-status-success-bg/60 border border-status-success/20 p-2.5 rounded-xl">
          <div className="text-[10px] text-muted-foreground font-medium">Hadir</div>
          <div className="font-bold text-sm text-status-success">{countOntime}</div>
        </div>
        <div className="bg-status-warning-bg/60 border border-status-warning/20 p-2.5 rounded-xl">
          <div className="text-[10px] text-muted-foreground font-medium">Telat</div>
          <div className="font-bold text-sm text-status-warning">{countLate}</div>
        </div>
        <div className="bg-status-danger/10 border border-status-danger/20 p-2.5 rounded-xl">
          <div className="text-[10px] text-muted-foreground font-medium">Absen</div>
          <div className="font-bold text-sm text-status-danger">{countAbsent}</div>
        </div>
        <div className="bg-status-info-bg/60 border border-status-info-border p-2.5 rounded-xl">
          <div className="text-[10px] text-muted-foreground font-medium">Cuti/Izin</div>
          <div className="font-bold text-sm text-status-info">{countCuti + countIzinSakit}</div>
        </div>
      </div>
    </div>
  );
}
