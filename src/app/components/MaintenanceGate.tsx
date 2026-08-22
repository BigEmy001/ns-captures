import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../context/AuthContext";
import { fetchMaintenanceStatus, type MaintenanceStatus } from "../data/db";

/**
 * Routes that stay reachable while maintenance mode is on, so an admin can
 * still sign in and switch it back off. Without these the toggle would lock
 * everyone — including whoever flipped it — out of the site.
 */
const ADMIN_PATHS = ["/admin", "/admin/login"];

const POLL_INTERVAL = 60_000;

/**
 * How long to wait for the first flag read before giving up and showing the
 * site. A hung request would otherwise leave every visitor on the loader
 * indefinitely — worse than the toggle not working at all.
 */
const FIRST_READ_TIMEOUT = 4_000;

/** Dispatched by the admin settings form so open tabs pick the flag up at once. */
export const SITE_SETTINGS_UPDATED_EVENT = "ns:site-settings-updated";

/**
 * Wraps every route. When `maintenance_mode` is on in site settings, visitors
 * get a holding page instead of the site; admins keep full access and see a
 * reminder that the public can't.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [firstReadTimedOut, setFirstReadTimedOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const failOpen = window.setTimeout(() => {
      if (!cancelled) setFirstReadTimedOut(true);
    }, FIRST_READ_TIMEOUT);

    const load = async () => {
      const next = await fetchMaintenanceStatus();
      if (cancelled) return;
      window.clearTimeout(failOpen);
      setStatus(next);
    };

    load();

    const timer = window.setInterval(load, POLL_INTERVAL);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(SITE_SETTINGS_UPDATED_EVENT, load);

    return () => {
      cancelled = true;
      window.clearTimeout(failOpen);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(SITE_SETTINGS_UPDATED_EVENT, load);
    };
  }, []);

  // Hold the first paint until the flag is known, so the site never flashes up
  // behind the holding page. Bounded by FIRST_READ_TIMEOUT.
  if (!status && !firstReadTimedOut) return <GateFallback />;

  if (!status?.maintenanceMode) return <>{children}</>;

  // Only now does it matter who's viewing, so this is the first point worth
  // waiting on auth for — the open site never pays for it.
  if (authLoading) return <GateFallback />;

  if (user?.role === "Admin") {
    return (
      <>
        {children}
        <MaintenanceBanner />
      </>
    );
  }

  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (ADMIN_PATHS.includes(normalized)) return <>{children}</>;

  return <MaintenanceScreen status={status} />;
}

function GateFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white font-['DM_Sans']">
      <div className="animate-pulse text-[#6b716d]">Loading...</div>
    </div>
  );
}

function MaintenanceScreen({ status }: { status: MaintenanceStatus }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${status.siteName} — Down for maintenance`;
    return () => {
      document.title = previous;
    };
  }, [status.siteName]);

  return (
    <div className="grid min-h-screen place-items-center bg-white px-5 py-24 text-center font-['DM_Sans'] text-[#18211f]">
      <div>
        <p className="font-mono text-[11px] tracking-[0.2em] text-[#49685d]">
          {status.siteName.toUpperCase()}
        </p>
        <h1 className="mt-4 font-serif text-6xl leading-none sm:text-8xl">Back shortly.</h1>
        <p className="mx-auto mt-5 max-w-md text-[#59645f]">
          We're carrying out scheduled maintenance on the archive. Everything will be back in place
          soon — thank you for your patience.
        </p>
        <p className="mt-8 text-sm text-[#6b716d]">
          Need something urgently?{" "}
          <a
            href={`mailto:${status.supportEmail}`}
            className="font-medium text-[#1e4a3f] underline underline-offset-4 hover:text-[#123b31]"
          >
            {status.supportEmail}
          </a>
        </p>
      </div>
    </div>
  );
}

function MaintenanceBanner() {
  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-[45] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-[#1e4a3f]/15 bg-white/95 py-2 pr-2 pl-4 text-sm shadow-lg backdrop-blur-md"
    >
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-[#c2410c]" />
      <span className="text-[#18211f]">Maintenance mode is on — only admins can see the site.</span>
      <Link
        to="/admin?tab=settings&subtab=toggles"
        className="shrink-0 rounded-full bg-[#1e4a3f] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#123b31]"
      >
        Turn off
      </Link>
    </div>
  );
}
