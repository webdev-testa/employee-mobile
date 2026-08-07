import { useState, useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/lib/supabase";
import { useClockIn, useClockOut } from "@/hooks/useAbsensi";
import { useAuth } from "@/hooks/useAuth";
import { useKasbon } from "@/hooks/useKasbon";
import { toast } from "sonner";
import { isWithinArea, getDistance } from "@/lib/geofence";

import {
  MapPin,
  CheckCircle2,
  ChevronRight,
  Camera,
  RefreshCw,
  Bell,
  Wallet,
  FileText,
} from "lucide-react";

type FlowState = "idle" | "confirm" | "success";

// TODO: Set your actual office coordinates here
const OFFICE_LAT = -6.19026;
const OFFICE_LNG = 106.82391;
const GEOFENCE_RADIUS = 100; // in meters

function formatCurrencyShort(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}jt`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString('id-ID');
}

export default function EmployeeHome() {
  const { user: authUser } = useAuth();
  const [userName, setUserName] = useState("Employee");
  const [loading, setLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [actionType, setActionType] = useState<"in" | "out">("in");
  const [currentTime, setCurrentTime] = useState(new Date());

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const { usedThisMonth: usedKasbon, kasbonLimit } = useKasbon(authUser?.id);
  const [salary, setSalary] = useState(0);

  const mapRef = useRef<HTMLDivElement>(null);

  const { capturePhoto, getLocation, saveAttendance } = useClockIn();
  const { saveClockOut, resetAttendanceDev } = useClockOut();
  const isCutiActive = !!(
    todayRecord &&
    ["cuti", "izin", "sakit", "cuti_pending", "izin_pending", "sakit_pending"].includes(todayRecord.status)
  );

  useEffect(() => {
    if (flowState === "confirm" && coords && mapRef.current) {
      setOptions({
        key: import.meta.env.VITE_GOOGLE_MAPS_KEY || "",
        v: "weekly",
      });

      Promise.all([
        importLibrary("maps"),
        importLibrary("marker")
      ]).then(([{ Map }, { AdvancedMarkerElement, Marker }]) => {
        const position = { lat: coords.latitude, lng: coords.longitude };
        const map = new Map(mapRef.current!, {
          center: position,
          zoom: 17,
          mapId: "DEMO_MAP_ID",
          disableDefaultUI: true,
        });

        if (AdvancedMarkerElement) {
          new AdvancedMarkerElement({ map, position });
        } else if (Marker) {
          new Marker({ map, position });
        }
      }).catch(e => console.error("Error loading maps", e));
    }
  }, [flowState, coords]);

  // Load user details
  useEffect(() => {
    if (!authUser) return;

    setUserName(authUser.name || "Employee");
    setSalary(authUser.salary ?? 0);
  }, [authUser]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const checkStatus = async () => {
      if (!authUser) return;
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .schema("hr")
        .from("attendance")
        .select("*")
        .eq("user_id", authUser.id)
        .eq("date", today)
        .maybeSingle();

      setTodayRecord(data || null);
    };

    checkStatus();
    return () => clearInterval(timer);
  }, [authUser]);

  const handleStartClockIn = async () => {
    if (todayRecord) {
      toast.info("Already clocked in");
      return;
    }

    try {
      setLoading(true);
      toast.info("Membuka kamera...");
      const photo = await capturePhoto();

      toast.info("Mengambil lokasi GPS...");
      const loc = await getLocation();

      setPhotoBlob(photo);
      setCoords(loc);
      setPhotoUrl(URL.createObjectURL(photo));
      setActionType("in");
      setFlowState("confirm");
    } catch (error: any) {
      toast.error("Gagal memulai absen", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleStartClockOut = async () => {
    if (!todayRecord || todayRecord.clock_out_time) {
      toast.info("Absen pulang tidak tersedia");
      return;
    }

    try {
      setLoading(true);
      toast.info("Mengambil lokasi GPS...");
      const loc = await getLocation();

      setPhotoBlob(null);
      setCoords(loc);
      setPhotoUrl(null);
      setActionType("out");
      setFlowState("confirm");
    } catch (error: any) {
      toast.error("Gagal memulai absen pulang", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClockIn = async () => {
    if (!photoBlob || !coords) return;
    const isOk = isWithinArea(coords.latitude, coords.longitude, OFFICE_LAT, OFFICE_LNG, GEOFENCE_RADIUS);
    if (!isOk) {
      const dist = getDistance(coords.latitude, coords.longitude, OFFICE_LAT, OFFICE_LNG);
      toast.error("Gagal menyimpan absen", {
        description: `Anda berada di luar radius kantor (${Math.round(dist)}m). Batas maksimum adalah ${GEOFENCE_RADIUS}m.`
      });
      return;
    }
    try {
      setLoading(true);
      await saveAttendance(photoBlob, coords, authUser?.shift);
      
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .schema("hr")
        .from("attendance")
        .select("*")
        .eq("user_id", authUser!.id)
        .eq("date", today)
        .maybeSingle();
      setTodayRecord(data || null);
      
      setFlowState("success");
      toast.success("Absen Masuk Berhasil!");
    } catch (error: any) {
      toast.error("Gagal menyimpan absen", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClockOut = async () => {
    if (!coords) return;
    const isOk = isWithinArea(coords.latitude, coords.longitude, OFFICE_LAT, OFFICE_LNG, GEOFENCE_RADIUS);
    if (!isOk) {
      const dist = getDistance(coords.latitude, coords.longitude, OFFICE_LAT, OFFICE_LNG);
      toast.error("Gagal menyimpan absen", {
        description: `Anda berada di luar radius kantor (${Math.round(dist)}m). Batas maksimum adalah ${GEOFENCE_RADIUS}m.`
      });
      return;
    }
    try {
      setLoading(true);
      await saveClockOut(coords);
      
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .schema("hr")
        .from("attendance")
        .select("*")
        .eq("user_id", authUser!.id)
        .eq("date", today)
        .maybeSingle();
      setTodayRecord(data || null);
      
      setFlowState("success");
      toast.success("Absen Pulang Berhasil!");
    } catch (error: any) {
      toast.error("Gagal menyimpan absen pulang", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDevReset = async () => {
    try {
      setLoading(true);
      await resetAttendanceDev();
      setTodayRecord(null);
      setFlowState("idle");
      toast.success("Reset absen berhasil");
    } catch (error: any) {
      toast.error("Gagal reset absen", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const timeString = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateStringFull = currentTime.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const distance = coords ? getDistance(coords.latitude, coords.longitude, OFFICE_LAT, OFFICE_LNG) : null;
  const inArea = coords ? isWithinArea(coords.latitude, coords.longitude, OFFICE_LAT, OFFICE_LNG, GEOFENCE_RADIUS) : false;

  if (flowState === "confirm") {
    return (
      <div className="absolute inset-0 bg-background z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 flex justify-between items-center border-b border-border">
          <h3 className="font-semibold">{actionType === "in" ? "Konfirmasi Absen Masuk" : "Konfirmasi Absen Pulang"}</h3>
          <button onClick={() => setFlowState("idle")} className="p-2 bg-muted rounded-full"><ChevronRight className="rotate-180" size={18} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Camera Preview */}
          <div className="relative w-full aspect-[3/4] bg-muted rounded-2xl overflow-hidden flex items-center justify-center border border-border">
            {photoUrl ? (
              <img src={photoUrl} alt="Selfie" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <MapPin size={48} className="stroke-[1.2]" />
                <div className="text-[13px] font-medium text-muted-foreground">Tanpa Foto</div>
              </div>
            )}
            
            {/* Attendance Meta Data */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md rounded-xl p-3 text-white text-xs">
              <p className="font-semibold text-sm mb-1">{userName}</p>
              <p className="opacity-90">{dateStringFull} • {timeString}</p>
              <p className="opacity-70 mt-1 flex items-center gap-1"><MapPin size={10} /> {coords?.latitude.toFixed(5)}, {coords?.longitude.toFixed(5)}</p>
            </div>
          </div>

          {/* Location Info */}
          <div className="bg-card border border-border p-4 rounded-xl flex gap-3 items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${inArea ? 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
              <MapPin size={20} />
            </div>
            <div>
              <p className="font-medium text-sm">
                {coords ? (inArea ? `Dalam Area (${Math.round(distance!)}m)` : `Terlalu Jauh (${Math.round(distance!)}m)`) : 'Menghitung...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {inArea ? 'Lokasi sesuai dengan area kantor.' : `Batas maksimum adalah ${GEOFENCE_RADIUS}m.`}
              </p>
            </div>
          </div>
          {coords && (
            <div className="rounded-xl overflow-hidden border border-border">
              <div ref={mapRef} className="h-[150px] w-full bg-muted relative" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => setFlowState("idle")} className="py-3.5 rounded-xl font-medium text-sm bg-secondary text-secondary-foreground">
              {actionType === "in" ? "Foto Ulang" : "Batal"}
            </button>
            <button 
              onClick={actionType === "in" ? handleConfirmClockIn : handleConfirmClockOut}
              disabled={loading || !inArea}
              className={`py-3.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${loading || !inArea ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary text-primary-foreground'}`}
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              Konfirmasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (flowState === "success") {
    return (
      <div className="absolute inset-0 bg-background z-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95 duration-300">
        <div className="relative mb-8">
          <div className="absolute inset-[-20px] rounded-full border border-green-500/20 opacity-40"></div>
          <div className="absolute inset-[-10px] rounded-full border border-green-500/40 opacity-70"></div>
          <div className="w-[100px] h-[100px] rounded-full bg-green-100 border-2 border-green-500/50 flex items-center justify-center relative z-10 dark:bg-green-500/20">
            <CheckCircle2 size={48} className="text-green-600 dark:text-green-400" />
          </div>
        </div>

        <h2 className="text-3xl font-display font-bold mb-2">
          {actionType === "in" ? "Absen masuk berhasil!" : "Absen pulang berhasil!"}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          Kehadiran kamu sudah tercatat.
          <br />
          {actionType === "in" ? `Selamat bekerja, ${userName} 👋` : `Selamat istirahat, ${userName} 👋`}
        </p>

        <div className="w-full bg-card border border-border rounded-[20px] p-5 mb-8 shadow-sm text-left">
          <div className="flex justify-between items-center py-2 border-b border-muted">
            <span className="text-xs text-muted-foreground">Nama</span>
            <span className="font-medium text-sm">
              {userName}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-muted">
            <span className="text-xs text-muted-foreground">
              {actionType === "in" ? "Jam masuk" : "Jam pulang"}
            </span>
            <span className={`font-medium text-sm ${actionType === "in" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
              {timeString}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs text-muted-foreground">Koordinat</span>
            <span className="text-xs">
              {coords?.latitude.toFixed(5)}, {coords?.longitude.toFixed(5)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setFlowState("idle")}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl font-medium"
        >
          Kembali ke Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-24">
      {/* Header */}
      <div className="p-6 pb-6 flex justify-between items-start bg-primary text-primary-foreground rounded-b-3xl">
        <div>
          <p className="text-primary-foreground/70 text-xs mb-1">Welcome back,</p>
          <h2 className="text-xl font-semibold capitalize">{userName}</h2>
        </div>
        <button className="relative p-2 bg-white/10 rounded-full">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border border-primary"></span>
        </button>
      </div>

      <div className="p-6 mt-4">
        {/* Status Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="bg-muted px-3 py-1 rounded-full text-xs font-medium text-foreground">
              {dateStringFull}
            </div>
            {!todayRecord ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full dark:bg-green-500/10 dark:text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400 animate-pulse"></span>
                Absensi terbuka
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {todayRecord.clock_out_time ? "Selesai Kerja" : "Sudah Absen"}
              </div>
            )}
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-5xl font-display font-bold tracking-tight mb-2">{timeString}</h1>
            <p className="text-sm text-muted-foreground">Jam kerja dimulai 08:00</p>
          </div>

          <div className="flex justify-between items-center px-4 py-3 bg-muted/50 rounded-xl mb-6">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Status Hari Ini</p>
              <p className="font-medium text-sm">
                {isCutiActive ? "Cuti / Izin" : !todayRecord ? "Belum Absen" : todayRecord.clock_out_time ? "Selesai" : "Sudah Masuk"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">Kehadiran</p>
              <p className="font-medium text-sm">26 Hari</p>
            </div>
          </div>

          <button 
            onClick={
              isCutiActive ? undefined :
              !todayRecord ? handleStartClockIn :
              todayRecord.clock_out_time ? undefined :
              handleStartClockOut
            }
            disabled={loading || isCutiActive || !!(todayRecord && todayRecord.clock_out_time)}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              isCutiActive || (todayRecord && todayRecord.clock_out_time) 
                ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                : todayRecord 
                  ? 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 active:scale-[0.98]' 
                  : 'bg-primary text-primary-foreground shadow-md shadow-primary/20 active:scale-[0.98]'
            }`}
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Camera size={18} />}
            {isCutiActive ? "Sedang Cuti/Izin" : todayRecord && todayRecord.clock_out_time ? "Absensi Selesai" : todayRecord ? "Absen Pulang" : "Absen Masuk"}
          </button>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Wallet size={16} />
              <span className="text-xs font-medium">Kasbon</span>
            </div>
            <p className="text-lg font-bold mb-1">Rp {formatCurrencyShort(usedKasbon)}</p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${kasbonLimit > 0 ? Math.min((usedKasbon / kasbonLimit) * 100, 100) : 0}%` }}></div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Limit: Rp {formatCurrencyShort(kasbonLimit)}</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm relative overflow-hidden group">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <FileText size={16} />
              <span className="text-xs font-medium">Estimasi Gaji</span>
            </div>
            <p className="text-lg font-bold mb-1">Rp {formatCurrencyShort(Math.max(0, salary - usedKasbon))}</p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${salary > 0 ? Math.max(0, Math.min(((salary - usedKasbon) / salary) * 100, 100)) : 100}%` }}></div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Bersih bulan ini</p>
          </div>
        </div>

        {/* Dev Action */}
        {todayRecord && (
          <button
            onClick={handleDevReset}
            className="w-full py-3 mb-5 rounded-xl text-sm flex items-center justify-center gap-2 text-destructive bg-destructive/10 hover:bg-destructive/20 font-medium transition-colors"
          >
            <RefreshCw size={16} /> Reset Absen (Dev)
          </button>
        )}
      </div>
    </div>
  );
}
