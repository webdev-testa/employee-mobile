import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LogOut, User, Settings, HelpCircle, ChevronRight, FileText, ChevronLeft, Camera, Loader2 } from "lucide-react";

export default function EmployeeProfil() {
  const [view, setView] = useState<"menu" | "detail">("menu");
  const [userName, setUserName] = useState("Employee");
  const [userEmail, setUserEmail] = useState("");
  
  // Additional Profile Data
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [phone, setPhone] = useState("-");
  const [jobTitle, setJobTitle] = useState("-");
  const [department, setDepartment] = useState("-");
  const [joinDate, setJoinDate] = useState("-");
  
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = user.user_metadata || {};
        // Avatar is still fetched from user_metadata
        setAvatarUrl(meta.avatar_url || null);
        
        // Fetch remaining details from public users table
        const { data: dbUser } = await supabase
          .from('users')
          .select('name, email, phone, jabatan, dept, created_at')
          .eq('id', user.id)
          .single();

        if (dbUser) {
          setUserName(dbUser.name || "Employee");
          setUserEmail(dbUser.email || "");
          setPhone(dbUser.phone || "-");
          setJobTitle(dbUser.jabatan || "-");
          setDepartment(dbUser.dept || "-");
          
          if (dbUser.created_at) {
            const date = new Date(dbUser.created_at);
            setJoinDate(date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
          } else {
            setJoinDate("-");
          }
        } else {
          // Fallback if not found in db
          setUserName(meta.name || user.email?.split("@")[0] || "Employee");
          setUserEmail(user.email || "");
        }
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      // Upload to supabase storage bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Gagal mengunggah foto profil. Pastikan bucket "avatars" sudah ada di Supabase.');
    } finally {
      setUploading(false);
    }
  };

  if (view === "detail") {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto pb-24">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-border/80 bg-card sticky top-0 z-10 shadow-2xs">
          <button onClick={() => setView("menu")} className="p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-bold ml-2 text-lg font-display tracking-tight">Detail Profil Karyawan</h2>
        </div>

        <div className="p-5 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center pt-2">
            <div className="relative mb-3">
              <div className="w-24 h-24 rounded-full p-1 bg-muted border border-border/80 shadow-xs">
                <div className="w-full h-full rounded-full bg-muted overflow-hidden flex items-center justify-center text-muted-foreground">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={38} />
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-full">
                      <Loader2 size={24} className="animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-xs cursor-pointer hover:scale-105 active:scale-95 transition-all">
                <Camera size={14} />
              </label>
              <input 
                type="file" 
                id="avatar-upload" 
                accept="image/*" 
                className="hidden" 
                onChange={handleUploadAvatar}
                disabled={uploading}
              />
            </div>
            <h3 className="font-bold text-xl tracking-tight">{userName}</h3>
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/15 border border-purple-500/20 px-3 py-0.5 rounded-full mt-1">{jobTitle}</span>
          </div>

          {/* Details Form / List */}
          <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-xs space-y-4">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Email</label>
              <div className="font-semibold text-sm text-foreground">{userEmail}</div>
            </div>
            <div className="h-px bg-border/80 -mx-5"></div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">No. Handphone</label>
              <div className="font-semibold text-sm text-foreground">{phone}</div>
            </div>
            <div className="h-px bg-border/80 -mx-5"></div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Departemen</label>
              <div className="font-semibold text-sm text-foreground">{department}</div>
            </div>
            <div className="h-px bg-border/80 -mx-5"></div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Tanggal Bergabung</label>
              <div className="font-semibold text-sm text-foreground">{joinDate}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-24">
      {/* Header */}
      <div className="p-4 border-b border-border/80 bg-card sticky top-0 z-10 shadow-2xs">
        <h2 className="font-bold text-lg font-display tracking-tight">Profil & Pengaturan</h2>
        <p className="text-xs text-muted-foreground">Kelola akun dan informasi pekerjaan</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile Card */}
        <div 
          onClick={() => setView("detail")}
          className="bg-card border border-border/80 p-4 rounded-3xl shadow-xs flex items-center gap-4 cursor-pointer hover:border-border transition-all active:scale-[0.99]"
        >
          <div className="w-13 h-13 rounded-full bg-muted border border-border/80 flex items-center justify-center text-muted-foreground overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={26} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h3 className="font-bold text-base truncate">{userName}</h3>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full">Aktif</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
          <ChevronRight size={20} className="text-muted-foreground shrink-0" />
        </div>

        {/* Menus (Colorful Categories) */}
        <div className="bg-card border border-border/80 rounded-3xl shadow-xs overflow-hidden divide-y divide-border/70">
          <button 
            onClick={() => navigate("/employee/slip-gaji")}
            className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/25 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <span className="font-bold text-sm text-foreground block">Slip Gaji Digital</span>
                <span className="text-[11px] text-muted-foreground">Lihat rincian gaji bulanan</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground/60" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 flex items-center justify-center shrink-0">
                <Settings size={18} />
              </div>
              <div>
                <span className="font-bold text-sm text-foreground block">Pengaturan Akun</span>
                <span className="text-[11px] text-muted-foreground">Ubah password & preferensi</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground/60" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left">
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25 flex items-center justify-center shrink-0">
                <HelpCircle size={18} />
              </div>
              <div>
                <span className="font-bold text-sm text-foreground block">Bantuan & CS</span>
                <span className="text-[11px] text-muted-foreground">Pusat bantuan karyawan</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-muted-foreground/60" />
          </button>
        </div>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="w-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <LogOut size={18} />
          Keluar dari Akun
        </button>
      </div>
    </div>
  );
}
