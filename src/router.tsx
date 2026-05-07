import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import LoginPage from "@/pages/login/loginPage";
import EmployeeHome from "@/pages/Home";
import EmployeeKasbon from "@/pages/Kasbon";
import EmployeeProfil from "@/pages/Profil";
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

  return <Outlet />;
}

function RoleGuard({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-sm text-[#8ABAC8]">
        Checking permissions...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "admin" || user.role === "superadmin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (user.role === "employee") {
      return <Navigate to="/employee/home" replace />;
    } else {
      return (
        <div className="flex flex-col h-screen items-center justify-center font-mono text-sm">
          <div className="text-[#F5A940] mb-2">
            Error: Invalid or missing user role ({user.role || "none"}).
          </div>
          <button onClick={() => logout()} className="text-blue-500 underline">
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
                    path: "/employee/kasbon",
                    element: <EmployeeKasbon />,
                  },
                  {
                    path: "/employee/profil",
                    element: <EmployeeProfil />,
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
