import { useState, useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/lib/supabase";
import { useClockIn, useClockOut } from "@/hooks/useAbsensi";
import { useAuth } from "@/hooks/useAuth";
import { useKasbon } from "@/hooks/useKasbon";
import { toast } from "sonner";
import { isWithinArea, getDistance } from "@/lib/geofence";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  MapPin,
  CheckCircle2,
  ChevronRight,
  Camera,
  RefreshCw,
  Bell,
} from "lucide-react";

type FlowState = "idle" | "confirm" | "success";

// TODO: Set your actual office coordinates here
const OFFICE_LAT = -8.00970; 
const OFFICE_LNG = 112.61071;
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
      toast.info("Membuka kamera...");
      const photo = await capturePhoto();

      toast.info("Mengambil lokasi GPS...");
      const loc = await getLocation();

      setPhotoBlob(photo);
      setCoords(loc);
      setPhotoUrl(URL.createObjectURL(photo));
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
      await saveClockOut(photoBlob, coords);
      
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
      <div className="min-h-screen bg-[#F0FAFF] flex flex-col font-sans">
        <div className="p-6 flex items-center gap-4 bg-white border-b border-[#C8E8F5] shadow-sm">
          <Button
            onClick={() => setFlowState("idle")}
            variant="secondary"
            size="icon"
          >
            <ChevronRight className="rotate-180" size={20} />
          </Button>
          <h1 className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A]">
            Konfirmasi Absen
          </h1>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="rounded-[20px] overflow-hidden border border-[#C8E8F5] relative bg-[#0D2D3D] shadow-sm h-[300px]">
            {photoUrl && (
              <img
                src={photoUrl}
                alt="Selfie"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <div className="text-white/80 font-mono text-[11px] leading-relaxed">
                  <strong className="text-white block text-[13px] mb-1">
                    {userName}
                  </strong>
                  {timeString} · {dateStringFull}
                  <br />
                  {coords?.latitude.toFixed(5)}, {coords?.longitude.toFixed(5)}
                </div>
                <div className="flex items-center gap-1 bg-[#3AAD7A]/20 border border-[#3AAD7A]/40 rounded-full px-3 py-1.5 text-[11px] text-[#3AAD7A] font-medium">
                  <CheckCircle2 size={12} /> GPS ✓
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white border border-[#C8E8F5] rounded-[18px] overflow-hidden shadow-sm">
            <div className="p-4 flex items-center gap-3 border-b border-[#C8E8F5]">
              <div className="w-10 h-10 rounded-xl bg-[#E2F0E8] border border-[#3AAD7A]/30 flex items-center justify-center shrink-0 text-[#3AAD7A]">
                <MapPin size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1A3A4A] text-[14px] truncate">
                  Lokasi Terdeteksi
                </div>
                <div className="font-mono text-[11px] text-[#4A7A8A] mt-0.5">
                  {coords?.latitude.toFixed(5)}, {coords?.longitude.toFixed(5)}
                </div>
              </div>
              <CheckCircle2 size={20} className="text-[#3AAD7A] shrink-0" />
            </div>
            {coords && (
              <div ref={mapRef} className="h-[150px] w-full bg-[#E2F0E8] relative" />
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <div className="flex-1 bg-white border border-[#C8E8F5] rounded-[14px] p-3 shadow-sm">
              <div className="text-[10px] text-[#4A7A8A] font-mono uppercase tracking-wide mb-1">
                {actionType === "in" ? "Jam Masuk" : "Jam Keluar"}
              </div>
              <div className="font-mono text-[16px] font-medium text-[#F5A940]">
                {timeString}
              </div>
            </div>
            <div className="flex-1 bg-white border border-[#C8E8F5] rounded-[14px] p-3 shadow-sm">
              <div className="text-[10px] text-[#4A7A8A] font-mono uppercase tracking-wide mb-1">
                Status Lokasi
              </div>
              {coords ? (
                inArea ? (
                  <div className="font-medium text-[13px] text-[#3AAD7A]">
                    Dalam Area ({Math.round(distance!)}m)
                  </div>
                ) : (
                  <div className="font-medium text-[13px] text-[#F87171]">
                    Terlalu Jauh ({Math.round(distance!)}m)
                  </div>
                )
              ) : (
                <div className="font-medium text-[13px] text-[#4A7A8A]">
                  Menghitung...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-[#C8E8F5]">
          {coords && !inArea && (
            <div className="mb-4 p-3 bg-[#F87171]/10 border border-[#F87171]/30 rounded-xl text-[#F87171] text-[13px] text-center font-medium">
              ⚠️ Tidak Dapat Absen: Anda berada di luar radius kantor ({Math.round(distance!)}m). Silakan mendekat ke lokasi kantor.
            </div>
          )}
          <Button
            onClick={actionType === "in" ? handleConfirmClockIn : handleConfirmClockOut}
            disabled={loading || !inArea}
            variant={inArea ? "green" : "outline"}
            size="xl"
            className={!inArea ? "bg-neutral-300 text-neutral-500 cursor-not-allowed border border-neutral-300 shadow-none w-full" : "w-full"}
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              actionType === "in" ? "Konfirmasi Absen Masuk" : "Konfirmasi Absen Pulang"
            )}
          </Button>
          <Button
            onClick={() => setFlowState("idle")}
            variant="outline"
            className="w-full mt-3 font-medium text-[14px]"
          >
            Foto Ulang
          </Button>
        </div>
      </div>
    );
  }

  if (flowState === "success") {
    return (
      <div className="min-h-screen bg-[#F0FAFF] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="relative mb-8">
          <div className="absolute inset-[-20px] rounded-full border border-[#3AAD7A]/20 opacity-40"></div>
          <div className="absolute inset-[-10px] rounded-full border border-[#3AAD7A]/40 opacity-70"></div>
          <div className="w-[100px] h-[100px] rounded-full bg-[#E2F0E8] border-2 border-[#3AAD7A]/50 flex items-center justify-center relative z-10">
            <CheckCircle2 size={48} className="text-[#3AAD7A]" />
          </div>
        </div>

        <h2 className="font-['Syne'] text-[28px] font-bold text-[#1A3A4A] mb-2">
          {actionType === "in" ? "Absen masuk berhasil!" : "Absen pulang berhasil!"}
        </h2>
        <p className="text-[14px] text-[#4A7A8A] leading-relaxed mb-8">
          Kehadiran kamu sudah tercatat.
          <br />
          {actionType === "in" ? `Selamat bekerja, ${userName} 👋` : `Selamat istirahat, ${userName} 👋`}
        </p>

        <div className="w-full bg-white border border-[#C8E8F5] rounded-[20px] p-5 mb-8 shadow-sm text-left">
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <span className="text-[13px] text-[#4A7A8A]">Nama</span>
            <span className="font-mono text-[13.5px] font-medium text-[#1A3A4A]">
              {userName}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <span className="text-[13px] text-[#4A7A8A]">
              {actionType === "in" ? "Jam masuk" : "Jam pulang"}
            </span>
            <span className={`font-mono text-[13.5px] font-medium ${actionType === "in" ? "text-[#3AAD7A]" : "text-[#C84B2F]"}`}>
              {timeString}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <span className="text-[13px] text-[#4A7A8A]">Lokasi</span>
            <span className={`font-mono text-[13.5px] font-medium ${inArea ? "text-[#3AAD7A]" : "text-[#F87171]"}`}>
              {inArea ? "Dalam area ✓" : "Luar area ⚠️"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-[13px] text-[#4A7A8A]">Koordinat</span>
            <span className="font-mono text-[11px] text-[#1A3A4A]">
              {coords?.latitude.toFixed(5)}, {coords?.longitude.toFixed(5)}
            </span>
          </div>
        </div>

        <Button
          onClick={() => setFlowState("idle")}
          variant="outline"
          size="xl"
          className="w-full bg-white text-[#1A3A4A] hover:bg-[#F0FAFF]"
        >
          Kembali ke Home
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#F0FAFF] flex flex-col font-sans relative min-h-screen">
      {/* Header (existing styling) */}
      <header className="relative z-10 p-6 flex justify-between items-center bg-white border-b border-[#C8E8F5] shadow-sm">
        <div>
          <p className="text-[11px] font-medium text-[#8ABAC8] tracking-[1.5px] uppercase font-mono mb-1">
            Welcome back
          </p>
          <h1 className="text-[20px] font-bold text-[#1A3A4A] font-['Syne'] capitalize">
            {userName}
          </h1>
        </div>
        <Button
          variant="outline"
          size="icon-lg"
          className="bg-white hover:bg-[#F0FAFF] text-[#4A7A8A] hover:text-[#F5A940] relative"
        >
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#F87171] rounded-full border border-white"></span>
        </Button>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-white border border-[#C8E8F5] rounded-full px-3.5 py-1.5 text-[12.5px] text-[#4A7A8A] font-mono shadow-sm">
            {dateStringFull}
          </div>
          {!todayRecord && (
            <div className="flex items-center gap-1.5 bg-[#E2F0E8] border border-[#3AAD7A]/30 rounded-full px-3 py-1.5 text-[11.5px] text-[#3AAD7A] font-medium shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3AAD7A] animate-ping"></div>
              Absensi terbuka
            </div>
          )}
        </div>

        <div className="bg-white border border-[#C8E8F5] rounded-[24px] p-6 shadow-sm relative overflow-hidden mb-5">
          <div className="absolute -top-10 -right-10 w-[140px] h-[140px] rounded-full bg-gradient-to-br from-[#4DC8F5]/10 to-transparent pointer-events-none"></div>

          <div className="font-['Syne'] text-[48px] sm:text-[56px] font-bold text-[#1A3A4A] tracking-tight leading-none mb-1">
            {timeString}
          </div>
          <div className="text-[13px] text-[#4A7A8A] mb-6">
            Jam kerja dimulai 08:00
          </div>

          <div className="flex gap-2.5 mb-5">
            <div className="flex-1 bg-[#F0FAFF] border border-[#C8E8F5] rounded-[14px] p-3">
              <div className="text-[10px] text-[#8ABAC8] uppercase tracking-wide font-mono mb-1">
                Status hari ini
              </div>
              <div
                className={`font-mono text-[14px] font-medium ${
                  isCutiActive
                    ? "text-[#4A7A8A]"
                    : !todayRecord 
                      ? "text-[#F5A940]" 
                      : todayRecord.clock_out_time 
                        ? "text-neutral-400" 
                        : "text-[#3AAD7A]"
                }`}
              >
                {isCutiActive
                  ? "Cuti / Izin Kerja"
                  : !todayRecord 
                    ? "Belum Absen" 
                    : todayRecord.clock_out_time 
                      ? "Selesai Kerja" 
                      : "Sudah Masuk"}
              </div>
            </div>
            <div className="flex-1 bg-[#F0FAFF] border border-[#C8E8F5] rounded-[14px] p-3">
              <div className="text-[10px] text-[#8ABAC8] uppercase tracking-wide font-mono mb-1">
                Kehadiran
              </div>
              <div className="font-mono text-[14px] font-medium text-[#4DC8F5]">
                26 Hari
              </div>
            </div>
          </div>

          <Button
            onClick={
              isCutiActive
                ? undefined
                : !todayRecord 
                  ? handleStartClockIn 
                  : todayRecord.clock_out_time 
                    ? undefined 
                    : handleStartClockOut
            }
            disabled={loading || isCutiActive || !!(todayRecord && todayRecord.clock_out_time)}
            variant={
              isCutiActive
                ? "outline"
                : todayRecord && todayRecord.clock_out_time
                  ? "outline"
                  : todayRecord
                    ? "red"
                    : "orange"
            }
            size="xl"
            className={`w-full flex items-center justify-center gap-3 relative overflow-hidden ${
              (isCutiActive || (todayRecord && todayRecord.clock_out_time))
                ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed shadow-none"
                : ""
            }`}
          >
            {loading ? (
              <RefreshCw size={20} className="animate-spin text-white" />
            ) : isCutiActive ? (
              <>
                <CheckCircle2 size={20} />
                Sedang Cuti / Izin
              </>
            ) : todayRecord && todayRecord.clock_out_time ? (
              <>
                <CheckCircle2 size={20} />
                Absensi Selesai
              </>
            ) : todayRecord ? (
              <>
                <Camera size={20} className="relative z-10" />
                <span className="relative z-10">Absen Pulang</span>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-[#F5A940] animate-pulse opacity-20" />
                <Camera size={20} className="relative z-10" />
                <span className="relative z-10">Absen Masuk</span>
              </>
            )}
          </Button>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <Card className="rounded-[18px] p-4">
            <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-wide font-mono mb-2">
              Kasbon
            </div>
            <div className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] leading-none mb-1">
              Rp {usedKasbon.toLocaleString("id-ID")}
            </div>
            <div className="text-[11px] text-[#4A7A8A]">dari limit Rp {formatCurrencyShort(kasbonLimit)}</div>
            <div className="h-[4px] bg-[#F0FAFF] rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-[#F5A940] transition-all duration-500"
                style={{ width: `${kasbonLimit > 0 ? Math.min((usedKasbon / kasbonLimit) * 100, 100) : 0}%` }}
              ></div>
            </div>
          </Card>
          <Card className="rounded-[18px] p-4">
            <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-wide font-mono mb-2">
              Estimasi Gaji
            </div>
            <div className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] leading-none mb-1">
              Rp {Math.max(0, salary - usedKasbon).toLocaleString("id-ID")}
            </div>
            <div className="text-[11px] text-[#4A7A8A]">bersih bulan ini</div>
            <div className="h-[4px] bg-[#F0FAFF] rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-[#3AAD7A] transition-all duration-500"
                style={{ width: `${salary > 0 ? Math.max(0, Math.min(((salary - usedKasbon) / salary) * 100, 100)) : 100}%` }}
              ></div>
            </div>
          </Card>
        </div>

        {/* Dev Action */}
        {todayRecord && (
          <Button
            onClick={handleDevReset}
            variant="destructive"
            className="w-full py-3 mb-5 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Reset Absen (Dev)
          </Button>
        )}
      </div>
    </div>
  );
}
