import { ChevronLeft, Clock } from "lucide-react";
import { AttendanceStatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

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

interface AttendanceDetailModalProps {
  selectedRecord: AttendanceRecord | null;
  onBack: () => void;
  onApplyLeave: () => void;
}

export function AttendanceDetailModal({
  selectedRecord,
  onBack,
  onApplyLeave,
}: AttendanceDetailModalProps) {
  if (!selectedRecord) return null;

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

  const canApplyCuti =
    selectedRecord.status === "absent" || selectedRecord.status === "weekend";

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Modal Header */}
      <div className="flex items-center p-4 border-b border-border/80 bg-card sticky top-0 z-10">
        <button
          onClick={onBack}
          aria-label="Kembali"
          className="h-10 w-10 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:bg-accent rounded-xl transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="font-semibold ml-2 text-lg font-display text-foreground">
          Detail Absensi
        </h2>
      </div>

      <div className="p-6 space-y-6 pb-24">
        {/* Date & Badge Header */}
        <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border/80 shadow-sm">
          <div>
            <div className="text-xs text-muted-foreground font-medium">Tanggal</div>
            <div className="font-bold text-sm text-foreground mt-0.5">
              {formatDateFull(selectedRecord.date)}
            </div>
          </div>
          <AttendanceStatusBadge status={selectedRecord.status} />
        </div>

        {/* Attendance Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border/80 p-4 rounded-2xl space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-status-success" /> Masuk
            </div>
            <div className="font-bold text-lg text-foreground">
              {formatTime(selectedRecord.clock_in_time)}
            </div>
          </div>

          <div className="bg-card border border-border/80 p-4 rounded-2xl space-y-1">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-status-warning" /> Keluar
            </div>
            <div className="font-bold text-lg text-foreground">
              {formatTime(selectedRecord.clock_out_time)}
            </div>
          </div>
        </div>

        {/* Duration Card */}
        <div className="bg-muted/40 border border-border/60 p-4 rounded-2xl flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Total Durasi Kerja</span>
          <span className="font-bold text-sm text-foreground">
            {calculateWorkDuration(selectedRecord.clock_in_time, selectedRecord.clock_out_time)}
          </span>
        </div>

        {/* Photo Capture Preview */}
        {selectedRecord.clock_in_photo_url && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Foto Presensi Masuk</span>
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border/80 bg-black/5">
              <img
                src={selectedRecord.clock_in_photo_url}
                alt="Presensi Masuk"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Apply Cuti Action if absent/weekend */}
        {canApplyCuti && (
          <div className="pt-4 border-t border-border/80 space-y-3 text-center">
            <p className="text-xs text-muted-foreground">
              Tidak ada catatan presensi pada tanggal ini.
            </p>
            <Button
              onClick={onApplyLeave}
              className="w-full h-12 min-h-[44px] rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Ajukan Cuti / Izin
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
