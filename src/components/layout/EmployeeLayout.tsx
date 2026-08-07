import { Link, useLocation, Outlet } from 'react-router-dom'
import { Clock, Calendar, Wallet, User } from 'lucide-react'

function NavTab({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const location = useLocation()
  const isActive = location.pathname === to || (to !== '/employee' && location.pathname.startsWith(to))
  
  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={`min-h-[44px] min-w-[44px] px-3 py-1.5 flex flex-col items-center justify-center gap-1 rounded-xl transition-all ${
        isActive 
          ? 'text-primary font-semibold bg-primary/10' 
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-[11px] font-medium leading-none">{label}</span>
    </Link>
  )
}

export function EmployeeLayout() {
  return (
    <div className="flex justify-center min-h-screen sm:items-center bg-muted/40 font-sans text-sm text-foreground antialiased">
      <div className="w-full h-screen sm:h-[92vh] sm:max-w-md sm:rounded-3xl sm:shadow-2xl sm:border sm:border-border/60 bg-background overflow-hidden relative flex flex-col transition-all duration-300">
        {/* MAIN CONTENT WITH SAFE AREA TOP PADDING */}
        <main className="flex-1 overflow-y-auto relative flex flex-col h-full pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
          <Outlet />
        </main>

        {/* BOTTOM NAV WITH SAFE AREA BOTTOM PADDING */}
        <nav 
          role="navigation"
          aria-label="Main employee navigation"
          className="absolute bottom-0 left-0 w-full bg-card/95 backdrop-blur-md border-t border-border/80 flex justify-around items-center px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50 shadow-lg"
        >
          <NavTab to="/employee/home" icon={Clock} label="Home" />
          <NavTab to="/employee/absensi" icon={Calendar} label="Absensi" />
          <NavTab to="/employee/kasbon" icon={Wallet} label="Kasbon" />
          <NavTab to="/employee/profil" icon={User} label="Profil" />
        </nav>
      </div>
    </div>
  )
}

