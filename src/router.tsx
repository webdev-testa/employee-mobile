import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import LoginPage from "@/pages/login/loginPage";
import ChangePasswordPage from "@/pages/login/ChangePassword";
import EmployeeHome from "@/pages/Home";
import EmployeeAbsensi from "@/pages/Absensi";
import EmployeeKasbon from "@/pages/Kasbon";
import EmployeeProfil from "@/pages/Profil";
import EmployeeSlipGaji from "@/pages/SlipGaji";
import GroomingHome from "@/pages/grooming/GroomingHome";
import GroomingCheckIn from "@/pages/grooming/GroomingCheckIn";
import GroomingWorkstation from "@/pages/grooming/GroomingWorkstation";
import HotelHome from "@/pages/hotel/HotelHome";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";

// Auth

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function AuthGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-sm text-neutral-500">
        Authenticating...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  return <Outlet />;
}

function RoleGuard({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-sm text-status-info">
        Checking permissions...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "admin" || user.role === "superadmin") {
      return (
        <div className="flex flex-col h-screen items-center justify-center font-sans text-sm bg-status-info-bg text-foreground p-6 text-center">
          <div className="text-status-warning mb-4 text-[20px] font-bold font-display">
            Akses Terbatas
          </div>
          <div className="text-status-info mb-6 max-w-xs leading-relaxed">
            Akun Admin hanya dapat digunakan melalui portal web admin. Silakan gunakan akun Karyawan untuk masuk ke aplikasi ini.
          </div>
          <button onClick={() => logout()} className="px-6 py-3 bg-status-warning hover:opacity-90 text-white rounded-[14px] font-sans font-bold font-display transition-all cursor-pointer shadow-md">
            Log out
          </button>
        </div>
      );
    } else if (user.role === "employee") {
      return <Navigate to="/employee/home" replace />;
    } else {
      return (
        <div className="flex flex-col h-screen items-center justify-center font-mono text-sm">
          <div className="text-status-warning mb-2">
            Error: Invalid or missing user role ({user.role || "none"}).
          </div>
          <button onClick={() => logout()} className="text-primary underline">
            Log out
          </button>
        </div>
      );
    }
  }

  return <Outlet />;
}

// Route

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/",
        element: <Navigate to="/login" replace />,
      },
      {
        path: "/login",
        element: <LoginPage />,
      },
      {
        element: <AuthGuard />,
        children: [
          {
            path: "/change-password",
            element: <ChangePasswordPage />,
          },
          {
            element: <RoleGuard allowedRoles={["admin", "superadmin"]} />,
            children: [
              // {
              //   path: "/admin/dashboard",
              //   element: <Dashboard />,
              // },
              // {
              //   path: "/admin/absensi",
              //   element: <AbsenEmployee />,
              // },
              // {
              //   path: "/admin/kasbon",
              //   element: <Kasbon />,
              // },
              // {
              //   path: "/admin/payroll",
              //   element: <Payroll />,
              // },
              // {
              //   path: "/admin/karyawan",
              //   element: <ManageEmployee />,
              // },
            ],
          },
          {
            element: <RoleGuard allowedRoles={["employee"]} />,
            children: [
              {
                element: <EmployeeLayout />,
                children: [
                  {
                    path: "/employee/home",
                    element: <EmployeeHome />,
                  },
                  {
                    path: "/employee/absensi",
                    element: <EmployeeAbsensi />,
                  },
                  {
                    path: "/employee/grooming",
                    element: <GroomingHome />,
                  },
                  {
                    path: "/employee/grooming/checkin",
                    element: <GroomingCheckIn />,
                  },
                  {
                    path: "/employee/grooming/work",
                    element: <GroomingWorkstation />,
                  },
                  {
                    path: "/employee/hotel",
                    element: <HotelHome />,
                  },
                  {
                    path: "/employee/kasbon",
                    element: <EmployeeKasbon />,
                  },
                  {
                    path: "/employee/profil",
                    element: <EmployeeProfil />,
                  },
                  {
                    path: "/employee/slip-gaji",
                    element: <EmployeeSlipGaji />,
                  },
                  {
                    path: "/employee",
                    element: <Navigate to="/employee/home" replace />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
