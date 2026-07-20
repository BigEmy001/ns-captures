import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { GlobalVerificationModal } from "./GlobalVerificationModal";

export function AuthRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user)
    return (
      <Navigate to="/signin" state={{ from: `${location.pathname}${location.search}` }} replace />
    );

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

export function AdminGuestRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user && user.role === "Admin") return <Navigate to="/admin" replace />;

  return <Outlet />;
}

export function AdminRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user || user.role !== "Admin") {
    return (
      <Navigate
        to="/admin/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  }

  return <Outlet />;
}

export function PhotographerRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user || (user.role !== "Photographer" && user.role !== "Admin")) {
    return (
      <Navigate to="/signin" state={{ from: `${location.pathname}${location.search}` }} replace />
    );
  }

  if (user.role !== "Admin" && user.verificationStatus !== "verified") {
    return (
      <>
        <Outlet />
        <GlobalVerificationModal />
      </>
    );
  }

  return <Outlet />;
}

export function EnterpriseRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user || (user.role !== "Enterprise" && user.role !== "Admin")) {
    return (
      <Navigate to="/signin" state={{ from: `${location.pathname}${location.search}` }} replace />
    );
  }

  if (user.role !== "Admin" && user.verificationStatus !== "verified") {
    return <Navigate to="/account?tab=security" replace />;
  }

  return <Outlet />;
}
