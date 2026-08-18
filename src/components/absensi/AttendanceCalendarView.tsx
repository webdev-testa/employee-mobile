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
      return "bg-emerald-600 text-white font-bold shadow-xs scale-105";
    }

    if (record) {
      const status = record.status;
      if (status === "ontime") return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/25";
      if (status === "late") return "bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold border border-amber-500/25";
      if (status.includes("pending")) return "bg-indigo-500/15 text-indigo-800 dark:text-indigo-300 border border-indigo-500/25 animate-pulse font-bold";
      if (status.includes("rejected")) return "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/25 line-through font-bold";
      if (["cuti", "izin", "sakit"].includes(status)) return "bg-sky-500/15 text-sky-800 dark:text-sky-300 font-bold border border-sky-500/25";
      if (status === "absent") return "bg-rose-500/15 text-rose-800 dark:text-rose-300 font-bold border border-rose-500/25";
    }

    if (isFuture) return "text-muted-foreground/30 cursor-default";
    if (isHoliday) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium cursor-default";
    if (isWeekend) return "text-muted-foreground/40 hover:bg-muted";

    return "bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold border border-rose-500/20";
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
      <div className="bg-card border border-border/80 rounded-3xl p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onPrevMonth}
            aria-label="Bulan Sebelumnya"
            className="h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="font-display font-bold text-sm text-foreground capitalize px-3 py-1 rounded-full bg-muted border border-border/60">
            📅 {monthYearLabel}
          </div>
          <button
            onClick={onNextMonth}
            aria-label="Bulan Berikutnya"
            className="h-9 w-9 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day Header */}
        <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted-foreground">
          {["Ming", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day, idx) => (
            <div key={day} className={idx === 0 || idx === 6 ? "text-rose-500 font-extrabold" : ""}>
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
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

      {/* Monthly Summary Statistics (Clean Flat Tint Cards) */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-2xl">
          <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold mb-0.5">✓ Hadir</div>
          <div className="font-extrabold text-base text-emerald-700 dark:text-emerald-300 financial-num">{countOntime}</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-2xl">
          <div className="text-[10px] text-amber-800 dark:text-amber-300 font-bold mb-0.5">⏱ Telat</div>
          <div className="font-extrabold text-base text-amber-700 dark:text-amber-300 financial-num">{countLate}</div>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-2xl">
          <div className="text-[10px] text-rose-800 dark:text-rose-300 font-bold mb-0.5">✗ Absen</div>
          <div className="font-extrabold text-base text-rose-700 dark:text-rose-300 financial-num">{countAbsent}</div>
        </div>
        <div className="bg-sky-500/10 border border-sky-500/20 p-2.5 rounded-2xl">
          <div className="text-[10px] text-sky-800 dark:text-sky-300 font-bold mb-0.5">🌴 Izin/Cuti</div>
          <div className="font-extrabold text-base text-sky-700 dark:text-sky-300 financial-num">{countCuti + countIzinSakit}</div>
        </div>
      </div>
    </div>
  );
}
