import { Navigate, Outlet } from "react-router";
import { useAuth } from "../context/AuthContext";

export function AuthRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/signin" replace />;

  return <Outlet />;
}

const roleHome: Record<string, string> = {
  Admin: "/admin",
  Photographer: "/dashboard",
  Enterprise: "/enterprise",
  Buyer: "/account",
};

export function GuestRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to={roleHome[user.role] || "/account"} replace />;

  return <Outlet />;
}

export function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || user.role !== "Admin") return <Navigate to="/signin" replace />;

  return <Outlet />;
}

export function PhotographerRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || (user.role !== "Photographer" && user.role !== "Admin")) return <Navigate to="/signin" replace />;

  return <Outlet />;
}

export function EnterpriseRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user || (user.role !== "Enterprise" && user.role !== "Admin")) return <Navigate to="/signin" replace />;

  return <Outlet />;
}