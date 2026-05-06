import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LogOut, User, Settings, HelpCircle, ChevronRight } from "lucide-react";

export default function EmployeeProfil() {
  const [userName, setUserName] = useState("Employee");
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.name || user.email?.split("@")[0] || "Employee");
        setUserEmail(user.email || "");
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="bg-[#F0FAFF] flex flex-col font-sans relative min-h-screen">
      {/* Header */}
      <div className="p-6 pb-5">
        <div className="font-['Syne'] text-[26px] font-bold text-[#1A3A4A] tracking-[-0.5px] mb-1">Profil</div>
        <div className="text-[13px] text-[#4A7A8A]">Pengaturan akun dan preferensi</div>
      </div>

      {/* Profile Card */}
      <div className="mx-5 mb-5 bg-white border border-[#C8E8F5] rounded-[24px] p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
        <div className="w-[60px] h-[60px] rounded-full bg-[#E2F0E8] border-2 border-[#3AAD7A]/30 flex items-center justify-center shrink-0">
          <User size={28} className="text-[#3AAD7A]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-['Syne'] text-[20px] font-bold text-[#1A3A4A] truncate">{userName}</div>
          <div className="text-[13px] text-[#4A7A8A] font-mono truncate">{userEmail}</div>
        </div>
      </div>

      {/* Menus */}
      <div className="mx-5 bg-white border border-[#C8E8F5] rounded-[20px] shadow-sm overflow-hidden mb-6">
        <div className="p-4 flex items-center gap-3 border-b border-[#F0FAFF] cursor-pointer hover:bg-[#F0FAFF] transition-colors">
          <div className="w-10 h-10 rounded-xl bg-[#F0FAFF] border border-[#C8E8F5] flex items-center justify-center shrink-0 text-[#4A7A8A]">
            <Settings size={18} />
          </div>
          <div className="flex-1 font-medium text-[15px] text-[#1A3A4A]">Pengaturan</div>
          <ChevronRight size={18} className="text-[#8ABAC8]" />
        </div>
        <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-[#F0FAFF] transition-colors">
          <div className="w-10 h-10 rounded-xl bg-[#F0FAFF] border border-[#C8E8F5] flex items-center justify-center shrink-0 text-[#4A7A8A]">
            <HelpCircle size={18} />
          </div>
          <div className="flex-1 font-medium text-[15px] text-[#1A3A4A]">Bantuan & Dukungan</div>
          <ChevronRight size={18} className="text-[#8ABAC8]" />
        </div>
      </div>

      {/* Logout */}
      <div className="px-5">
        <button
          onClick={handleLogout}
          className="w-full p-4 rounded-[18px] bg-white border border-[#F87171]/30 text-[#F87171] font-['Syne'] text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-[#F87171]/5 transition-all shadow-sm cursor-pointer"
        >
          <LogOut size={18} />
          Keluar (Log Out)
        </button>
      </div>
    </div>
  );
}
