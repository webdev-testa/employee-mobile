import { useState, useEffect, useRef, useCallback } from "react";
import { Capacitor } from '@capacitor/core';
import { Link } from "react-router-dom";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/lib/supabase";
import { groomingService } from "@/services/groomingService";
import { posService } from "@/services/posService";
import { useClockIn, useClockOut, getLocalDateString } from "@/hooks/useAbsensi";
import { useAuth } from "@/hooks/useAuth";
import { useKasbon } from "@/hooks/useKasbon";
import { toast } from "sonner";
import { evaluateLocation, type BranchOffice } from "@/lib/geofence";
import type { LocationFix } from '@/types/location';
import { hasPendingAttendance, recoverAttendance, loadAttendanceForDate, type AttendanceRecord } from '@/services/attendanceService';
import { SelfieCamera } from '@/components/absensi/SelfieCamera';
import { MapPin, CheckCircle2, ChevronRight, Camera, RefreshCw, Bell, Wallet, FileText, Scissors, Building2 } from "lucide-react";

type FlowState = "idle" | "capturing" | "confirm" | "success";
function formatCurrencyShort(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}jt`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return n.toLocaleString('id-ID');
}

export default function EmployeeHome() {
  const { user: authUser } = useAuth();
  const userName = authUser?.name || "Employee";
  const salary = authUser?.salary ?? 0;
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<BranchOffice[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [actionType, setActionType] = useState<"in" | "out">("in");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [coords, setCoords] = useState<LocationFix | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [savedRecord, setSavedRecord] = useState<AttendanceRecord | null>(null);
  const businessDate = getLocalDateString(currentTime);
  const operation = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const nativeCameraOpen = useRef(false);
  const isSubmittingRef = useRef(false);
  const readGeneration = useRef(0);
  const { capturePhoto, getLocation, saveAttendance } = useClockIn();
  const { saveClockOut, resetAttendanceDev } = useClockOut();
  const updatePhotoUrl = setPhotoUrl;
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const handleCancelConfirm = useCallback(() => {
    if (isSubmittingRef.current) return;
    operation.current?.abort();
    operation.current = null;
    setLoading(false);
    setPhotoUrl(null);
    setPhotoBlob(null);
    setCoords(null);
    setFlowState('idle');
  }, []);

  useEffect(() => {
    mounted.current = true;
    const hidden = () => {
      if (!document.hidden || nativeCameraOpen.current) return;
      operation.current?.abort();
      setCoords(null);
    };
    document.addEventListener('visibilitychange', hidden);
    return () => { mounted.current = false; operation.current?.abort(); document.removeEventListener('visibilitychange', hidden); };
  }, [authUser?.id]);

  const { usedThisMonth: usedKasbon, kasbonLimit } = useKasbon(authUser?.id);
  const [groomingCount, setGroomingCount] = useState(0);
  const [hotelCount, setHotelCount] = useState(0);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    groomingService.fetchSessions().then(sessions => {
      if (active) setGroomingCount(sessions.filter(s => s.status === 'antrian' || s.status === 'dikerjakan').length);
    }).catch(() => {});
    posService.fetchBookings().then(bookings => {
      if (active) setHotelCount(bookings.filter(b => b.status === 'aktif').length);
    }).catch(() => {});
    supabase.schema('hr').from('branches').select('id,name,lat,lng,radius,is_active').eq('is_active', true)
      .then(({ data, error }) => { if (active && !error) setBranches((data || []) as BranchOffice[]); });
    return () => { active = false; };
  }, []);
  const isCutiActive = !!(todayRecord && ['cuti','izin','sakit','cuti_pending','izin_pending','sakit_pending'].includes(todayRecord.status || ''));

  useEffect(() => {
    let active = true;
    if (flowState === 'confirm' && coords && mapRef.current) {
      setOptions({ key: import.meta.env.VITE_GOOGLE_MAPS_KEY || '', v: 'weekly' });
      Promise.all([importLibrary('maps'), importLibrary('marker')]).then(([{ Map }, { AdvancedMarkerElement }]) => {
        if (!active || !mapRef.current) return;
        const position = { lat: coords.latitude, lng: coords.longitude };
        const map = new Map(mapRef.current, { center: position, zoom: 17, mapId: 'DEMO_MAP_ID', disableDefaultUI: true });
        new AdvancedMarkerElement({ map, position });
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [flowState, coords]);

  useEffect(() => {
    let active = true;
    const generation = ++readGeneration.current;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    void (async () => {
      if (!authUser) return;
      try {
        setPending(hasPendingAttendance(authUser.id));
        const { data } = await supabase.schema('hr').from('attendance').select('*').eq('user_id', authUser.id).eq('date', businessDate).maybeSingle();
        if (active && generation === readGeneration.current) setTodayRecord(data || null);
      } catch { /* Storage restrictions must not crash the page. Submission reports them. */ }
    })();
    return () => { active = false; clearInterval(timer); };
  }, [authUser, businessDate]);

  const begin = () => {
    if (operation.current || isSubmittingRef.current) return null;
    const controller = new AbortController();
    operation.current = controller;
    setLoading(true);
    return controller;
  };
  const finish = (controller: AbortController) => {
    if (operation.current !== controller) return;
    operation.current = null;
    if (mounted.current) setLoading(false);
  };
  const locate = async (controller: AbortController) => {
    setLocationMessage('Mengambil lokasi presisi...');
    const fix = await getLocation(controller.signal, value => {
      if (mounted.current && !controller.signal.aborted) setLocationMessage(`Akurasi lokasi ±${Math.round(value.accuracy)} m. Menunggu lokasi presisi...`);
    });
    controller.signal.throwIfAborted();
    setCoords(fix);
    setLocationMessage('');
  };
  const reportError = (error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    const message = error instanceof Error ? error.message : 'Terjadi kesalahan. Coba lagi.';
    if (mounted.current) { setLocationMessage(message); toast.error(message); }
  };
  const acceptPhoto = async (photo: Blob) => {
    const controller = begin();
    if (!controller) return;
    setPhotoBlob(photo);
    updatePhotoUrl(URL.createObjectURL(photo));
    setFlowState('confirm');
    try { await locate(controller); } catch (error) { reportError(error); } finally { finish(controller); }
  };
  const handleStartClockIn = async () => {
    if (todayRecord || pending || operation.current || isSubmittingRef.current) return;
    setActionType('in');
    if (!Capacitor.isNativePlatform()) { setFlowState('capturing'); return; }
    const controller = begin();
    if (!controller) return;
    try {
      nativeCameraOpen.current = true;
      const photo = await capturePhoto();
      nativeCameraOpen.current = false;
      controller.signal.throwIfAborted();
      setPhotoBlob(photo);
      updatePhotoUrl(URL.createObjectURL(photo));
      setFlowState('confirm');
      await locate(controller);
    } catch (error) { reportError(error); } finally { nativeCameraOpen.current = false; finish(controller); }
  };
  const handleStartClockOut = async () => {
    if (!todayRecord?.clock_in_time || todayRecord.clock_out_time || isCutiActive || pending) return;
    const controller = begin();
    if (!controller) return;
    setActionType('out'); setPhotoBlob(null); updatePhotoUrl(null); setFlowState('confirm');
    try { await locate(controller); } catch (error) { reportError(error); } finally { finish(controller); }
  };
  const refreshLocation = async () => {
    const controller = begin();
    if (!controller) return;
    setCoords(null);
    try { await locate(controller); } catch (error) { reportError(error); } finally { finish(controller); }
  };
  const handleConfirm = async () => {
    if (!authUser || pending || (actionType === 'in' && !photoBlob)) return;
    const controller = begin();
    if (!controller) return;
    isSubmittingRef.current = true;
    try {
      const record = actionType === 'in' ? await saveAttendance(authUser.id, photoBlob!, controller.signal) : await saveClockOut(authUser.id, controller.signal);
      if (!mounted.current) return;
      ++readGeneration.current;
      setSavedRecord(record);
      setTodayRecord(record.date === getLocalDateString() ? record : null);
      updatePhotoUrl(null); setPhotoBlob(null); setCoords(null); setFlowState('success');
      toast.success('Absen berhasil disimpan.');
    } catch (error) { reportError(error); }
    finally {
      isSubmittingRef.current = false;
      if (mounted.current) { try { setPending(hasPendingAttendance(authUser.id)); } catch { setPending(true); } }
      finish(controller);
    }
  };
  const handleConfirmClockIn = handleConfirm;
  const handleConfirmClockOut = handleConfirm;
  const checkPending = async () => {
    if (!authUser) return;
    const controller = begin();
    if (!controller) return;
    isSubmittingRef.current = true;
    try {
      const record = await recoverAttendance(authUser.id, controller.signal);
      if (record && mounted.current) {
        ++readGeneration.current;
        setSavedRecord(record);
        if (record.date === getLocalDateString()) setTodayRecord(record);
        else {
          const data = await loadAttendanceForDate(authUser.id, getLocalDateString(), controller.signal);
          if (mounted.current) setTodayRecord(data || null);
        }
        if (!mounted.current) return;
        setActionType(record.clock_out_time ? 'out' : 'in'); setFlowState('success'); updatePhotoUrl(null); setPhotoBlob(null);
      }
    } catch (error) { reportError(error); }
    finally { isSubmittingRef.current = false; if (mounted.current) setPending(hasPendingAttendance(authUser.id)); finish(controller); }
  };
  const handleDevReset = async () => {
    if (!import.meta.env.DEV || pending) return;
    const controller = begin();
    if (!controller) return;
    try { await resetAttendanceDev(); setTodayRecord(null); setFlowState('idle'); } catch (error) { reportError(error); } finally { finish(controller); }
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

  const nearestEval = evaluateLocation(coords, branches, currentTime.getTime());
  const distance = nearestEval.distance ?? null;
  const inArea = nearestEval.accepted;
  const targetBranch = nearestEval.branch || { name: 'Cabang', radius: 100 };

  if (flowState === 'capturing') return <SelfieCamera onCapture={acceptPhoto} onCancel={handleCancelConfirm} />;

  if (flowState === "confirm") {
    return (
      <div className="absolute inset-0 bg-background z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 flex justify-between items-center border-b border-border">
          <h3 className="font-semibold">{actionType === "in" ? "Konfirmasi Absen Masuk" : "Konfirmasi Absen Pulang"}</h3>
          <button disabled={loading} onClick={handleCancelConfirm} className="p-2 bg-muted rounded-full"><ChevronRight className="rotate-180" size={18} /></button>
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
                {coords ? (inArea ? `Dalam Area ${targetBranch.name} (${Math.round(distance!)}m)` : nearestEval.message) : 'Menghitung...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {inArea ? `Lokasi terverifikasi di area ${targetBranch.name}.` : `Batas maksimum dari ${targetBranch.name} adalah ${targetBranch.radius}m.`}
              </p>
            </div>
          </div>
          {coords && (
            <div className="rounded-xl overflow-hidden border border-border">
              <div ref={mapRef} className="h-[150px] w-full bg-muted relative" />
            </div>
          )}

          <p role="status" className="text-sm">{locationMessage || nearestEval.message}{coords ? ` Akurasi ±${Math.round(coords.accuracy)} m.` : ''}</p>
          <button disabled={loading} onClick={refreshLocation} className="min-h-11 w-full rounded-xl border">Coba lokasi lagi</button>
          {pending && <button disabled={loading} onClick={checkPending} className="min-h-11 w-full rounded-xl border">Periksa pengiriman</button>}
          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button disabled={loading} onClick={handleCancelConfirm} className="py-3.5 rounded-xl font-medium text-sm bg-secondary text-secondary-foreground">
              {actionType === "in" ? "Foto Ulang" : "Batal"}
            </button>
            <button 
              onClick={actionType === "in" ? handleConfirmClockIn : handleConfirmClockOut}
              disabled={loading || !inArea || pending}
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
              {savedRecord && new Date((actionType === 'in' ? savedRecord.clock_in_time : savedRecord.clock_out_time) || savedRecord.date).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs text-muted-foreground">Koordinat</span>
            <span className="text-xs">
              {actionType === 'in' ? savedRecord?.clock_in_lat : savedRecord?.clock_out_lat}, {actionType === 'in' ? savedRecord?.clock_in_lng : savedRecord?.clock_out_lng}
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
      {pending && <button disabled={loading} onClick={checkPending} className="min-h-11 w-full rounded-xl border p-3">Periksa pengiriman absen sebelumnya</button>}

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
