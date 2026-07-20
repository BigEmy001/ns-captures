import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Toaster } from "sonner";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { RequestProvider } from "./RequestModal";
import { AuthProvider } from "../context/AuthContext";
import { setCsrfMeta } from "../../lib/csrf";

import { VerificationWelcomeModal } from "./VerificationWelcomeModal";

export function RootLayout() {
  const { pathname } = useLocation();

  // Scroll to top on navigation.
  useEffect(() => {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [pathname]);

  // Initialize CSRF token
  useEffect(() => {
    setCsrfMeta();
  }, []);

  return (
    <AuthProvider>
      <RequestProvider>
        <div className="flex min-h-screen flex-col bg-[#ffffff] font-['DM_Sans'] text-[#18211f]">
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-[#1e4a3f] focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline-none"
          >
            Skip to content
          </a>
          <Navbar />
          <main id="main-content" className="flex-1" tabIndex={-1}>
            <Outlet />
          </main>
          <Footer />
          <VerificationWelcomeModal />
          <Toaster position="bottom-right" />
        </div>
      </RequestProvider>
    </AuthProvider>
  );
}
