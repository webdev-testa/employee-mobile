import { Link, useLocation, Outlet } from 'react-router-dom'
import { Clock, Calendar, Wallet, User } from 'lucide-react'

function NavTab({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const location = useLocation()
  const isActive = location.pathname === to || (to !== '/employee' && location.pathname.startsWith(to))
  
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 transition-colors ${
        isActive ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  )
}

export function EmployeeLayout() {
  return (
    <div className="flex justify-center h-screen items-center bg-background font-sans text-sm text-foreground">
      <div className="w-full h-full bg-background overflow-hidden relative flex flex-col">
        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-hidden relative flex flex-col h-full">
          <Outlet />
        </main>

        {/* BOTTOM NAV */}
        <nav className="absolute bottom-0 left-0 w-full bg-card border-t border-border flex justify-around items-center px-2 py-3 pb-6 sm:pb-4 z-50">
          <NavTab to="/employee/home" icon={Clock} label="Home" />
          <NavTab to="/employee/absensi" icon={Calendar} label="Absensi" />
          <NavTab to="/employee/kasbon" icon={Wallet} label="Kasbon" />
          <NavTab to="/employee/profil" icon={User} label="Profil" />
        </nav>
      </div>
    </div>
  )
}
