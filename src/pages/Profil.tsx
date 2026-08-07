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
        <div className="flex items-center p-4 border-b border-border bg-card sticky top-0 z-10">
          <button onClick={() => setView("menu")} className="p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-md transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h2 className="font-semibold ml-2 text-lg font-display">Detail Profil</h2>
        </div>

        <div className="p-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full bg-muted border-4 border-background shadow-md overflow-hidden flex items-center justify-center text-muted-foreground">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-primary" />
                  </div>
                )}
              </div>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary/90 transition-colors">
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
            <h3 className="font-bold text-xl">{userName}</h3>
            <p className="text-sm text-muted-foreground">{jobTitle}</p>
          </div>

          {/* Details Form / List */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Email</label>
              <div className="font-medium">{userEmail}</div>
            </div>
            <div className="h-px bg-border -mx-5"></div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">No. Handphone</label>
              <div className="font-medium">{phone}</div>
            </div>
            <div className="h-px bg-border -mx-5"></div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Departemen</label>
              <div className="font-medium">{department}</div>
            </div>
            <div className="h-px bg-border -mx-5"></div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Tanggal Bergabung</label>
              <div className="font-medium">{joinDate}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto pb-24">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card sticky top-0 z-10">
        <h2 className="font-semibold text-lg font-display">Profil</h2>
        <p className="text-xs text-muted-foreground">Pengaturan akun dan preferensi</p>
      </div>

      <div className="p-4">
        {/* Profile Card */}
        <div 
          onClick={() => setView("detail")}
          className="bg-card border border-border p-4 rounded-2xl mb-6 shadow-sm flex items-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
        >
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center text-muted-foreground overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User size={28} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate">{userName}</h3>
            <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
          </div>
          <ChevronRight size={20} className="text-muted-foreground shrink-0" />
        </div>

        {/* Menus */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-6">
          <button 
            onClick={() => navigate("/employee/slip-gaji")}
            className="w-full p-4 flex items-center justify-between border-b border-border hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <FileText size={16} />
              </div>
              <span className="font-medium text-sm">Slip Gaji</span>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
          <button className="w-full p-4 flex items-center justify-between border-b border-border hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Settings size={16} />
              </div>
              <span className="font-medium text-sm">Pengaturan</span>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <HelpCircle size={16} />
              </div>
              <span className="font-medium text-sm">Bantuan & Dukungan</span>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="w-full bg-destructive/10 text-destructive py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
        >
          <LogOut size={18} />
          Keluar
        </button>
      </div>
    </div>
  );
}
