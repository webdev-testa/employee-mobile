import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/lib/supabase";
import { groomingService } from "@/services/groomingService";
import { posService } from "@/services/posService";
import { useClockIn, useClockOut, getLocalDateString } from "@/hooks/useAbsensi";
import { useAuth } from "@/hooks/useAuth";
import { useKasbon } from "@/hooks/useKasbon";
import { toast } from "sonner";
import { 
  DEFAULT_BRANCHES, 
  getNearestBranch, 
  getCachedBranches,
  saveCachedBranches,
  type BranchOffice 
} from "@/lib/geofence";

import {
  MapPin,
  CheckCircle2,
  ChevronRight,
  Camera,
  RefreshCw,
  Bell,
  Wallet,
  FileText,
  Scissors,
  Building2,
} from "lucide-react";

type FlowState = "idle" | "confirm" | "success";

const GEOFENCE_RADIUS = 100; // in meters default

function formatCurrencyShort(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}jt`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString('id-ID');
}

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
  status: string;
}

export default function EmployeeHome() {
  const { user: authUser } = useAuth();
  const userName = authUser?.name || "Employee";
  const salary = authUser?.salary ?? 0;
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<BranchOffice[]>(getCachedBranches);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [actionType, setActionType] = useState<"in" | "out">("in");
  const [currentTime, setCurrentTime] = useState(new Date());

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Cleanup object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl);
      }
    };
  }, [photoUrl]);

  const updatePhotoUrl = (newUrl: string | null) => {
    setPhotoUrl(prev => {
      if (prev && prev !== newUrl) {
        URL.revokeObjectURL(prev);
      }
      return newUrl;
    });
  };

  const isSubmittingRef = useRef(false);

  const handleCancelConfirm = () => {
    updatePhotoUrl(null);
    setPhotoBlob(null);
    setCoords(null);
    setFlowState("idle");
  };

  const { usedThisMonth: usedKasbon, kasbonLimit } = useKasbon(authUser?.id);
  const [groomingCount, setGroomingCount] = useState(0);
  const [hotelCount, setHotelCount] = useState(0);

  const mapRef = useRef<HTMLDivElement>(null);

  const { capturePhoto, getLocation, saveAttendance } = useClockIn();
  const { saveClockOut, resetAttendanceDev } = useClockOut();

  useEffect(() => {
    let mounted = true;
    groomingService.fetchSessions().then(sessions => {
      if (mounted) {
        const active = sessions.filter(s => s.status === 'antrian' || s.status === 'dikerjakan');
        setGroomingCount(active.length);
      }
    }).catch(() => {});

    posService.fetchBookings().then(bookings => {
      if (mounted) {
        const active = bookings.filter(b => b.status === 'aktif');
        setHotelCount(active.length);
      }
    }).catch(() => {});

    // Fetch active branches from Supabase hr.branches
    supabase
      .schema("hr")
      .from("branches")
      .select("*")
      .eq("is_active", true)
      .then(
        ({ data, error }) => {
          if (!error && data && data.length > 0 && mounted) {
            const formatted: BranchOffice[] = data.map((row: any) => ({
              id: String(row.id),
              name: String(row.name || "Cabang"),
              address: row.address || "",
              lat: Number(row.lat),
              lng: Number(row.lng),
              radius: Number(row.radius) || GEOFENCE_RADIUS,
              is_active: row.is_active !== false,
            }));
            setBranches(formatted);
            saveCachedBranches(formatted);
          }
        },
        () => {}
      );

    return () => {
      mounted = false;
    };
  }, []);
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const checkStatus = async () => {
      if (!authUser) return;
      const today = getLocalDateString();
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
      updatePhotoUrl(URL.createObjectURL(photo));
      setActionType("in");
      setFlowState("confirm");
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error("Gagal memulai absen", { description });
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
      updatePhotoUrl(null);
      setActionType("out");
      setFlowState("confirm");
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error("Gagal memulai absen pulang", { description });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClockIn = async () => {
    if (isSubmittingRef.current || loading) return;
    if (!photoBlob || !coords) return;
    const nearestEval = getNearestBranch(coords.latitude, coords.longitude, branches);
    if (!nearestEval?.isInside) {
      const dist = nearestEval ? Math.round(nearestEval.distance) : 0;
      const targetBranch = nearestEval?.branch || branches[0] || DEFAULT_BRANCHES[0];
      const maxRadius = targetBranch.radius || GEOFENCE_RADIUS;
      toast.error("Gagal menyimpan absen", {
        description: `Anda berada di luar radius ${targetBranch.name} (${dist}m). Batas maksimum adalah ${maxRadius}m.`
      });
      return;
    }
    isSubmittingRef.current = true;
    try {
      setLoading(true);
      await saveAttendance(photoBlob, coords, authUser?.shift);
      
      const today = getLocalDateString();
      const { data } = await supabase
        .schema("hr")
        .from("attendance")
        .select("*")
        .eq("user_id", authUser!.id)
        .eq("date", today)
        .maybeSingle();
      setTodayRecord(data || null);
      updatePhotoUrl(null);
      setPhotoBlob(null);
      
      setFlowState("success");
      toast.success("Absen Masuk Berhasil!");
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error("Gagal menyimpan absen", { description });
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleConfirmClockOut = async () => {
    if (isSubmittingRef.current || loading) return;
    if (!coords || !todayRecord) return;
    const nearestEval = getNearestBranch(coords.latitude, coords.longitude, branches);
    if (!nearestEval?.isInside) {
      const dist = nearestEval ? Math.round(nearestEval.distance) : 0;
      const targetBranch = nearestEval?.branch || branches[0] || DEFAULT_BRANCHES[0];
      const maxRadius = targetBranch.radius || GEOFENCE_RADIUS;
      toast.error("Gagal menyimpan absen", {
        description: `Anda berada di luar radius ${targetBranch.name} (${dist}m). Batas maksimum adalah ${maxRadius}m.`
      });
      return;
    }
    isSubmittingRef.current = true;
    try {
      setLoading(true);
      await saveClockOut(coords);
      
      const today = getLocalDateString();
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
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error("Gagal menyimpan absen pulang", { description });
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleDevReset = async () => {
    if (!import.meta.env.DEV) return;
    if (isSubmittingRef.current || loading) return;
    isSubmittingRef.current = true;
    try {
      setLoading(true);
      await resetAttendanceDev();
      setTodayRecord(null);
      setFlowState("idle");
      toast.success("Reset absen berhasil");
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'Terjadi kesalahan';
      toast.error("Gagal reset absen", { description });
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
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

  const nearestEval = coords ? getNearestBranch(coords.latitude, coords.longitude, branches) : null;
  const distance = nearestEval ? nearestEval.distance : null;
  const inArea = nearestEval ? nearestEval.isInside : false;
  const targetBranch = nearestEval?.branch || branches[0] || DEFAULT_BRANCHES[0];

  if (flowState === "confirm") {
    return (
      <div className="absolute inset-0 bg-background z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 flex justify-between items-center border-b border-border">
          <h3 className="font-semibold">{actionType === "in" ? "Konfirmasi Absen Masuk" : "Konfirmasi Absen Pulang"}</h3>
          <button onClick={handleCancelConfirm} className="p-2 bg-muted rounded-full"><ChevronRight className="rotate-180" size={18} /></button>
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
                {coords ? (inArea ? `Dalam Area ${targetBranch.name} (${Math.round(distance!)}m)` : `Terlalu Jauh (${Math.round(distance!)}m)`) : 'Menghitung...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {inArea ? `Lokasi terverifikasi di area ${targetBranch.name}.` : `Batas maksimum dari ${targetBranch.name} adalah ${targetBranch.radius || GEOFENCE_RADIUS}m.`}
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
            <button onClick={handleCancelConfirm} className="py-3.5 rounded-xl font-medium text-sm bg-secondary text-secondary-foreground">
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
      <div className="p-6 pb-6 flex justify-between items-start bg-[#0c1d2a] text-white rounded-b-3xl shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-300 text-[11px] font-semibold mb-2 border border-white/10">
            <span>🐾</span> Dr.Meow Employee
          </div>
          <h2 className="text-xl font-display font-bold capitalize tracking-tight">{userName}</h2>
          <p className="text-white/70 text-xs mt-0.5">Semoga harimu menyenangkan!</p>
        </div>
        <button className="relative p-2.5 bg-white/10 hover:bg-white/15 active:scale-95 transition-all rounded-2xl border border-white/10 text-white shadow-xs">
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full"></span>
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Status Card */}
        <div className="bg-card rounded-3xl shadow-xs border border-border/80 p-5">
          <div className="flex justify-between items-center mb-5">
            <div className="bg-muted px-3 py-1 rounded-full text-xs font-semibold text-foreground">
              📅 {dateStringFull}
            </div>
            {!todayRecord ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Absensi Terbuka
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 rounded-full dark:text-blue-300">
                {todayRecord.clock_out_time ? "✨ Selesai Kerja" : "✓ Sudah Masuk"}
              </div>
            )}
          </div>
          
          <div className="text-center mb-5">
            <h1 className="text-5xl font-display font-black tracking-tight mb-1 text-foreground financial-num">{timeString}</h1>
            <p className="text-xs font-medium text-muted-foreground flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Jam kerja dimulai 08:00
            </p>
          </div>

          <div className="flex justify-between items-center px-4 py-3 bg-muted/50 border border-border/60 rounded-2xl mb-5">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Status Hari Ini</p>
              <p className="font-bold text-sm text-foreground">
                {isCutiActive ? "🌴 Cuti / Izin" : !todayRecord ? "⏳ Belum Absen" : todayRecord.clock_out_time ? "✨ Selesai" : "✓ Sudah Masuk"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium text-muted-foreground mb-0.5">Kehadiran Bulan Ini</p>
              <p className="font-bold text-sm text-foreground">26 Hari Hadir</p>
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
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs ${
              isCutiActive || (todayRecord && todayRecord.clock_out_time) 
                ? 'bg-muted text-muted-foreground cursor-not-allowed shadow-none' 
                : todayRecord 
                  ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white active:scale-[0.98]' 
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white active:scale-[0.98]'
            }`}
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Camera size={18} />}
            {isCutiActive ? "Sedang Cuti / Izin" : todayRecord && todayRecord.clock_out_time ? "Absensi Hari Ini Selesai" : todayRecord ? "Absen Pulang Sekarang" : "Absen Masuk Sekarang"}
          </button>
        </div>

        {/* Mini Stats (Clean Flat Solid Surface Cards) */}
        <div className="grid grid-cols-2 gap-3">
          {/* Kasbon Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                  <Wallet size={15} />
                </div>
                <span className="text-xs font-bold text-foreground">Kasbon</span>
              </div>
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full">Bulan Ini</span>
            </div>
            <p className="text-lg font-bold text-foreground mb-2 financial-num">Rp {formatCurrencyShort(usedKasbon)}</p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${kasbonLimit > 0 ? Math.min((usedKasbon / kasbonLimit) * 100, 100) : 0}%` }}></div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">Limit: <strong className="text-foreground financial-num">Rp {formatCurrencyShort(kasbonLimit)}</strong></p>
          </div>
          
          {/* Estimasi Gaji Card */}
          <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                  <FileText size={15} />
                </div>
                <span className="text-xs font-bold text-foreground">Gaji Bersih</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full">Estimasi</span>
            </div>
            <p className="text-lg font-bold text-foreground mb-2 financial-num">Rp {formatCurrencyShort(Math.max(0, salary - usedKasbon))}</p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-1.5">
              <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${salary > 0 ? Math.max(0, Math.min(((salary - usedKasbon) / salary) * 100, 100)) : 100}%` }}></div>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">Take home pay</p>
          </div>
        </div>

        {/* Operasional Klinik & Salon Cards */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase font-mono text-muted-foreground tracking-wider">
              Aktivitas Klinik Hari Ini
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/employee/grooming"
              className="p-3.5 bg-card border border-border/80 rounded-2xl shadow-xs hover:border-[#F5A940]/50 transition-all block group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5A940]/15 text-[#F5A940] flex items-center justify-center">
                  <Scissors size={16} />
                </div>
                <span className="text-[10px] font-semibold text-[#F5A940] bg-[#F5A940]/10 px-2 py-0.5 rounded-full">
                  Grooming
                </span>
              </div>
              <div className="text-base font-bold text-foreground financial-num">
                {groomingCount} Kucing
              </div>
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5 group-hover:text-[#F5A940] transition-colors">
                <span>Buka antrian</span>
                <ChevronRight size={12} />
              </p>
            </Link>

            <Link
              to="/employee/hotel"
              className="p-3.5 bg-card border border-border/80 rounded-2xl shadow-xs hover:border-[#3AAD7A]/50 transition-all block group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-[#3AAD7A]/15 text-[#3AAD7A] flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <span className="text-[10px] font-semibold text-[#3AAD7A] bg-[#3AAD7A]/10 px-2 py-0.5 rounded-full">
                  Hotel
                </span>
              </div>
              <div className="text-base font-bold text-foreground financial-num">
                {hotelCount} Menginap
              </div>
              <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 mt-0.5 group-hover:text-[#3AAD7A] transition-colors">
                <span>Laporan & Kamar</span>
                <ChevronRight size={12} />
              </p>
            </Link>
          </div>
        </div>

        {/* Dev Action (Development Only) */}
        {import.meta.env.DEV && todayRecord && (
          <button
            onClick={handleDevReset}
            className="w-full py-2.5 rounded-2xl text-xs flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 font-semibold transition-colors"
          >
            <RefreshCw size={13} /> Reset Absen (Dev Mode)
          </button>
        )}
      </div>
    </div>
  );
}
