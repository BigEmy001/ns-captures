import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { RequestProvider } from "./RequestModal";
import { AuthProvider } from "../context/AuthContext";

export function RootLayout() {
  const { pathname } = useLocation();

  // Scroll to top on navigation.
  useEffect(() => {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [pathname]);

  return (
    <AuthProvider>
      <RequestProvider>
        <div className="flex min-h-screen flex-col bg-[#ffffff] font-['DM_Sans'] text-[#18211f]">
          <Navbar />
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
          <Toaster position="bottom-right" />
        </div>
      </RequestProvider>
    </AuthProvider>
  );
}
