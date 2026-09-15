import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router";
import { motion, useReducedMotion } from "framer-motion";
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
  const reduceMotion = useReducedMotion();

  // Scroll to top on navigation.
  useEffect(() => {
    requestAnimationFrame(() => window.scrollTo(0, 0));
  }, [pathname]);

  // Remember the last page on each side for the Photography | Editions switch
  useEffect(() => {
    rememberSpacePath(pathname, search);
  }, [pathname, search]);

  // Cross-fade when moving between the photography site and Editions, but not on first load
  const space = spaceForPath(pathname);
  const [shownSpace, setShownSpace] = useState(space);
  const [hasSwitchedSpace, setHasSwitchedSpace] = useState(false);
  if (shownSpace !== space) {
    setShownSpace(space);
    setHasSwitchedSpace(true);
  }

  // Initialize CSRF token
  useEffect(() => {
    setCsrfMeta();
  }, []);

  const isEditions = space === "editions";
  const isPhotoDetail = pathname.startsWith("/photo/");

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
          {!isEditions && !isPhotoDetail && <Navbar />}
          <main id="main-content" className="flex-1" tabIndex={-1}>
            <motion.div
              key={space}
              initial={hasSwitchedSpace && !reduceMotion ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </main>
          {!isEditions && !isPhotoDetail && <Footer />}
          <VerificationWelcomeModal />
          <Toaster position="bottom-right" />
        </div>
      </MaintenanceGate>
    </AuthProvider>
  );
}
