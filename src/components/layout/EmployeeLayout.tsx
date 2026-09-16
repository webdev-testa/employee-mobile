import { Link, useLocation, Outlet } from 'react-router-dom'
import { Clock, Scissors, Building2, Wallet, User } from 'lucide-react'

interface NavTabProps {
  to: string
  icon: React.ElementType
  label: string
  activeColorClass: string
}

function NavTab({ to, icon: Icon, label, activeColorClass }: NavTabProps) {
  const location = useLocation()
  const isActive = location.pathname === to || (to !== '/employee' && location.pathname.startsWith(to))
  
  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={`min-h-[44px] min-w-[40px] px-2 py-1.5 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200 ${
        isActive 
          ? `${activeColorClass} font-semibold shadow-xs scale-[1.03]` 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-[10.5px] font-medium leading-none">{label}</span>
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

        {/* BOTTOM NAV WITH SAFE AREA BOTTOM PADDING (5 TABS) */}
        <nav 
          role="navigation"
          aria-label="Main employee navigation"
          className="absolute bottom-0 left-0 w-full bg-card/95 backdrop-blur-md border-t border-border/80 flex justify-around items-center px-1.5 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-50 shadow-lg"
        >
          <NavTab to="/employee/home" icon={Clock} label="Home" activeColorClass="text-emerald-700 bg-emerald-500/15 dark:text-emerald-300 dark:bg-emerald-500/20" />
          <NavTab to="/employee/grooming" icon={Scissors} label="Grooming" activeColorClass="text-amber-700 bg-amber-500/15 dark:text-amber-300 dark:bg-amber-500/20" />
          <NavTab to="/employee/hotel" icon={Building2} label="Hotel" activeColorClass="text-cyan-700 bg-cyan-500/15 dark:text-cyan-300 dark:bg-cyan-500/20" />
          <NavTab to="/employee/kasbon" icon={Wallet} label="Kasbon" activeColorClass="text-blue-700 bg-blue-500/15 dark:text-blue-300 dark:bg-blue-500/20" />
          <NavTab to="/employee/profil" icon={User} label="Profil" activeColorClass="text-purple-700 bg-purple-500/15 dark:text-purple-300 dark:bg-purple-500/20" />
        </nav>
      </div>
    </div>
  )
}
