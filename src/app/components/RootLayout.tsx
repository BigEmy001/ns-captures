import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { rememberSpacePath, spaceForPath } from "./spaceSwitchRoutes";
import { Toaster } from "sonner";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { AuthProvider } from "../context/AuthContext";
import { setCsrfMeta } from "../../lib/csrf";

import { VerificationWelcomeModal } from "./VerificationWelcomeModal";
import { MaintenanceGate } from "./MaintenanceGate";

export function RootLayout() {
  const { pathname, search } = useLocation();

  // Scroll to top on navigation.
  useEffect(() => {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [pathname]);

  // Remember the last page on each side for the Photography | Editions switch
  useEffect(() => {
    rememberSpacePath(pathname, search);
  }, [pathname, search]);

  // Initialize CSRF token
  useEffect(() => {
    setCsrfMeta();
  }, []);

  const isEditions = spaceForPath(pathname) === "editions";

  return (
    <AuthProvider>
      <MaintenanceGate>
        <div
          className={`flex min-h-screen flex-col font-['DM_Sans'] ${
            isEditions ? "bg-[#080B10] text-[#FAF9F5]" : "bg-[#ffffff] text-[#18211f]"
          }`}
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-[#1e4a3f] focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline-none"
          >
            Skip to content
          </a>
          {!isEditions && <Navbar />}
          <main id="main-content" className="flex-1" tabIndex={-1}>
            {/* Don't key this by side: a remount shows the lazy-route "Loading..." fallback
                inside the SpaceSwitch view transition instead of the new page */}
            <Outlet />
          </main>
          {!isEditions && <Footer />}
          <VerificationWelcomeModal />
          <Toaster position="bottom-right" />
        </div>
      </MaintenanceGate>
    </AuthProvider>
  );
}
