import { useState, useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { supabase } from "@/lib/supabase";
import { useClockIn, useClockOut } from "@/hooks/useAbsensi";
import { toast } from "sonner";
import {
  MapPin,
  CheckCircle2,
  ChevronRight,
  Camera,
  RefreshCw,
  Bell,
} from "lucide-react";

type FlowState = "idle" | "confirm" | "success";

export default function EmployeeHome() {
  const [userName, setUserName] = useState("Employee");
  const [loading, setLoading] = useState(false);
  const [hasClockedIn, setHasClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [flowState, setFlowState] = useState<FlowState>("idle");
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);

  const { capturePhoto, getLocation, saveAttendance } = useClockIn();
  const { clockOut } = useClockOut();

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserName(
          user.user_metadata?.name || user.email?.split("@")[0] || "Employee",
        );
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase
          .from("attendance")
          .select("id")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();

        if (data) setHasClockedIn(true);
      }
    };

    checkStatus();
    return () => clearInterval(timer);
  }, []);

  const handleStartClockIn = async () => {
    if (hasClockedIn) {
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
      setFlowState("confirm");
    } catch (error: any) {
      toast.error("Gagal memulai absen", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClockIn = async () => {
    if (!photoBlob || !coords) return;
    try {
      setLoading(true);
      await saveAttendance(photoBlob, coords);
      setHasClockedIn(true);
      setFlowState("success");
      toast.success("Absen Berhasil!");
    } catch (error: any) {
      toast.error("Gagal menyimpan absen", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setLoading(true);
      await clockOut();
      setHasClockedIn(false);
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

  if (flowState === "confirm") {
    return (
      <div className="min-h-screen bg-[#F0FAFF] flex flex-col font-sans">
        <div className="p-6 flex items-center gap-4 bg-white border-b border-[#C8E8F5] shadow-sm">
          <button
            onClick={() => setFlowState("idle")}
            className="w-10 h-10 rounded-xl bg-[#F0FAFF] border border-[#C8E8F5] flex items-center justify-center text-[#4A7A8A]"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
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
                Jam Masuk
              </div>
              <div className="font-mono text-[16px] font-medium text-[#F5A940]">
                {timeString}
              </div>
            </div>
            <div className="flex-1 bg-white border border-[#C8E8F5] rounded-[14px] p-3 shadow-sm">
              <div className="text-[10px] text-[#4A7A8A] font-mono uppercase tracking-wide mb-1">
                Status Lokasi
              </div>
              <div className="font-medium text-[13px] text-[#3AAD7A]">
                Dalam Area
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t border-[#C8E8F5]">
          <button
            onClick={handleConfirmClockIn}
            disabled={loading}
            className="w-full py-4 rounded-[16px] bg-[#3AAD7A] text-white font-['Syne'] text-[17px] font-bold shadow-md hover:bg-[#2b8a60] transition-all flex justify-center items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              "Konfirmasi Absen Masuk"
            )}
          </button>
          <button
            onClick={() => setFlowState("idle")}
            className="w-full mt-3 py-3 rounded-[14px] border border-[#C8E8F5] text-[#4A7A8A] font-medium text-[14px] hover:bg-[#F0FAFF] transition-all"
          >
            Foto Ulang
          </button>
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
          Absen berhasil!
        </h2>
        <p className="text-[14px] text-[#4A7A8A] leading-relaxed mb-8">
          Kehadiran kamu sudah tercatat.
          <br />
          Selamat bekerja, {userName} 👋
        </p>

        <div className="w-full bg-white border border-[#C8E8F5] rounded-[20px] p-5 mb-8 shadow-sm text-left">
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <span className="text-[13px] text-[#4A7A8A]">Nama</span>
            <span className="font-mono text-[13.5px] font-medium text-[#1A3A4A]">
              {userName}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <span className="text-[13px] text-[#4A7A8A]">Jam masuk</span>
            <span className="font-mono text-[13.5px] font-medium text-[#3AAD7A]">
              {timeString}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-[#F0FAFF]">
            <span className="text-[13px] text-[#4A7A8A]">Lokasi</span>
            <span className="font-mono text-[13.5px] font-medium text-[#3AAD7A]">
              Dalam area ✓
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-[13px] text-[#4A7A8A]">Koordinat</span>
            <span className="font-mono text-[11px] text-[#1A3A4A]">
              {coords?.latitude.toFixed(5)}, {coords?.longitude.toFixed(5)}
            </span>
          </div>
        </div>

        <button
          onClick={() => setFlowState("idle")}
          className="w-full py-4 rounded-[16px] border border-[#C8E8F5] bg-white text-[#1A3A4A] font-['Syne'] text-[17px] font-bold hover:bg-[#F0FAFF] transition-all shadow-sm"
        >
          Kembali ke Home
        </button>
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
        <button className="w-[42px] h-[42px] rounded-full bg-white hover:bg-[#F0FAFF] text-[#4A7A8A] hover:text-[#F5A940] transition-all border border-[#C8E8F5] flex items-center justify-center relative shadow-sm">
          <Bell size={18} />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#F87171] rounded-full border border-white"></span>
        </button>
      </header>

      {/* Main Content */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-white border border-[#C8E8F5] rounded-full px-3.5 py-1.5 text-[12.5px] text-[#4A7A8A] font-mono shadow-sm">
            {dateStringFull}
          </div>
          {!hasClockedIn && (
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
                className={`font-mono text-[14px] font-medium ${hasClockedIn ? "text-[#3AAD7A]" : "text-[#F5A940]"}`}
              >
                {hasClockedIn ? "Sudah Absen" : "Belum Absen"}
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

          <button
            onClick={hasClockedIn ? undefined : handleStartClockIn}
            disabled={loading || hasClockedIn}
            className={`w-full py-4 rounded-[16px] font-['Syne'] text-[17px] font-bold transition-all flex items-center justify-center gap-3 relative overflow-hidden ${
              hasClockedIn
                ? "bg-[#E2F0E8] text-[#3AAD7A] cursor-not-allowed border border-[#3AAD7A]/20"
                : "bg-[#F5A940] hover:bg-[#e09833] text-white shadow-[#F5A940]/20 shadow-lg border-none"
            }`}
          >
            {loading ? (
              <RefreshCw size={20} className="animate-spin text-white" />
            ) : hasClockedIn ? (
              <>
                <CheckCircle2 size={20} />
                Sudah Absen
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-[#F5A940] animate-pulse opacity-20" />
                <Camera size={20} className="relative z-10" />
                <span className="relative z-10">Absen Masuk</span>
              </>
            )}
          </button>
        </div>

        {/* Mini Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-white border border-[#C8E8F5] rounded-[18px] p-4 shadow-sm">
            <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-wide font-mono mb-2">
              Kasbon
            </div>
            <div className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] leading-none mb-1">
              Rp 0
            </div>
            <div className="text-[11px] text-[#4A7A8A]">dari limit Rp 1jt</div>
            <div className="h-[4px] bg-[#F0FAFF] rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-[#F5A940]"
                style={{ width: "0%" }}
              ></div>
            </div>
          </div>
          <div className="bg-white border border-[#C8E8F5] rounded-[18px] p-4 shadow-sm">
            <div className="text-[10.5px] text-[#8ABAC8] uppercase tracking-wide font-mono mb-2">
              Estimasi Gaji
            </div>
            <div className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] leading-none mb-1">
              Rp 4.2jt
            </div>
            <div className="text-[11px] text-[#4A7A8A]">bersih bulan ini</div>
            <div className="h-[4px] bg-[#F0FAFF] rounded-full mt-3 overflow-hidden">
              <div
                className="h-full bg-[#3AAD7A]"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Dev Action */}
        {hasClockedIn && (
          <button
            onClick={handleClockOut}
            className="w-full py-3 mb-5 rounded-xl border border-[#F87171]/30 text-[#F87171] text-sm bg-white hover:bg-[#F87171]/5 flex items-center justify-center gap-2"
          >
            <RefreshCw size={16} /> Reset Absen (Dev)
          </button>
        )}
      </div>
    </div>
  );
}
