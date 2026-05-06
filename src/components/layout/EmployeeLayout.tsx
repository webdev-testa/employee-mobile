import { Link, useLocation, Outlet } from 'react-router-dom'
import { Home, CalendarClock, Wallet, User } from 'lucide-react'

function NavTab({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const location = useLocation()
  const isActive = location.pathname === to || (to !== '/employee' && location.pathname.startsWith(to))
  
  return (
    <Link
      to={to}
      className={`flex-1 flex flex-col items-center gap-1.5 py-2 transition-all ${
        isActive 
          ? 'text-[#4DC8F5] opacity-100' 
          : 'text-[#4A7A8A] opacity-60 hover:opacity-100'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-[10px] font-mono tracking-[0.5px] font-medium">{label}</span>
    </Link>
  )
}

export function EmployeeLayout() {
  return (
    <div className="relative min-h-screen bg-[#F0FAFF] font-sans selection:bg-[#4DC8F5]/30 pb-[72px]">
      {/* MAIN CONTENT */}
      <main className="min-h-full">
        <Outlet />
      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#C8E8F5] pb-safe px-2 pt-1 shadow-[0_-4px_20px_rgba(26,58,74,0.05)]">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <NavTab to="/employee/home" icon={Home} label="Home" />
          <NavTab to="/employee/absensi" icon={CalendarClock} label="Absensi" />
          <NavTab to="/employee/kasbon" icon={Wallet} label="Kasbon" />
          <NavTab to="/employee/profil" icon={User} label="Profil" />
        </div>
      </nav>
    </div>
  )
}
