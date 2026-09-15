import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useReducedMotion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { spaceForPath, spaceSwitchTarget, type Space } from "./spaceSwitchRoutes";

type Tone = "light" | "dark" | "editions";

// Each side styles the switch with its own palette (see docs/ui/*.md)
const TONES: Record<
  Tone,
  {
    track: string;
    thumb: string;
    active: string;
    idle: string;
    tag: string;
    activeTag: string;
    ring: string;
  }
> = {
  light: {
    track: "bg-[#f1efe8] ring-1 ring-inset ring-black/5",
    thumb: "bg-white shadow-[0_1px_2px_rgba(24,33,31,0.12),0_1px_1px_rgba(24,33,31,0.06)]",
    active: "text-[#18211f]",
    idle: "text-[#4a534e] hover:text-[#18211f]",
    tag: "bg-[#0786ff]/10 text-[#0062c4]",
    activeTag: "bg-[#0786ff]/10 text-[#0062c4]",
    ring: "focus-visible:ring-[#1e4a3f]",
  },
  dark: {
    track: "bg-white/10",
    thumb: "bg-white",
    active: "text-[#12231f]",
    idle: "text-white/80 hover:text-white",
    tag: "bg-[#0786ff]/25 text-[#9ccfff]",
    activeTag: "bg-[#0786ff]/10 text-[#0062c4]",
    ring: "focus-visible:ring-white/60",
  },
  editions: {
    track: "bg-(--ed-raised) ring-1 ring-inset ring-(--ed-border)",
    thumb: "bg-(--ed-surface) shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
    active: "text-(--ed-text)",
    idle: "text-(--ed-muted) hover:text-(--ed-text)",
    tag: "bg-(--ed-primary)/15 text-(--ed-primary)",
    activeTag: "bg-(--ed-primary)/15 text-(--ed-primary)",
    ring: "focus-visible:ring-(--ed-primary)",
  },
};

const OPTIONS: { id: Space; label: string }[] = [
  { id: "photography", label: "Photography" },
  { id: "editions", label: "Editions" },
];

// How long the pill slides before the page starts its cross-fade
const SLIDE_MS = 250;

/**
 * Photography | Editions switch. It sits right after the logo in both headers (and under the
 * header on phones) so people can move between the two sides from any page.
 * Choosing a side slides the pill across, then navigates with a view transition so the whole
 * page cross-fades (timing in src/styles/index.css). Reduced motion skips both.
 * Display comes from `className` (default `inline-flex`), so callers can hide it responsively.
 * `condensed` tightens it from lg up, where the photography header (capped at 1440px) is crowded:
 * less padding and no Web3 tag.
 */
export function SpaceSwitch({
  tone,
  size = "md",
  fullWidth = false,
  condensed = false,
  className = "inline-flex",
  onSwitch,
}: {
  tone: Tone;
  size?: "sm" | "md";
  fullWidth?: boolean;
  condensed?: boolean;
  className?: string;
  onSwitch?: () => void;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const current = spaceForPath(pathname);
  const [pending, setPending] = useState<Space | null>(null);
  if (pending !== null && pending === current) setPending(null);
  const selected = pending ?? current;
  const styles = TONES[tone];
  const itemSize = size === "sm" ? "h-8 px-3 text-sm" : "h-9 px-3.5 text-sm";

  const rowRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const placedRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  // Keep the pill under the selected option. It only animates when the selection changes;
  // first placement and resizes (breakpoints, font loading) snap into place.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const thumb = thumbRef.current;
    if (!row || !thumb) return;
    const place = (animate: boolean) => {
      const option = row.querySelector<HTMLElement>(`[data-space="${selected}"]`);
      if (!option) return;
      const { offsetLeft, offsetWidth } = option;
      thumb.style.transitionDuration = animate ? "" : "0s";
      thumb.style.width = `${offsetWidth}px`;
      thumb.style.transform = `translateX(${offsetLeft}px)`;
    };
    place(placedRef.current);
    placedRef.current = true;
    let lastWidth = row.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (row.offsetWidth === lastWidth) return;
      lastWidth = row.offsetWidth;
      place(false);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, [selected]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const switchTo = (event: MouseEvent<HTMLAnchorElement>, id: Space, to: string) => {
    // New-tab and modified clicks stay with the browser
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    if (pending) return;
    if (reduceMotion) {
      onSwitch?.();
      navigate(to);
      return;
    }
    setPending(id);
    timerRef.current = window.setTimeout(() => {
      onSwitch?.();
      navigate(to, { viewTransition: true });
    }, SLIDE_MS);
  };

  return (
    <nav
      aria-label="Switch between Photography and Editions"
      className={`${fullWidth ? "flex w-full" : ""} shrink-0 rounded-full p-1 ${styles.track} ${className}`}
    >
      <div
        ref={rowRef}
        className={`relative flex items-center gap-0.5 ${fullWidth ? "w-full" : ""}`}
      >
        <span
          ref={thumbRef}
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 rounded-full transition-[transform,width] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none ${styles.thumb}`}
        />
        {OPTIONS.map(({ id, label }) => {
          const isSelected = id === selected;
          const itemClass = `relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-300 motion-reduce:transition-none ${itemSize} ${condensed ? "lg:px-2.5" : ""} ${fullWidth ? "flex-1" : ""} ${isSelected ? styles.active : styles.idle}`;
          const content = (
            <>
              {label}
              {id === "editions" && (
                <span
                  className={`rounded-full px-1.5 font-mono text-[10px] font-medium uppercase leading-4 tracking-wide transition-colors duration-300 ${isSelected ? styles.activeTag : styles.tag} ${condensed ? "lg:hidden" : ""}`}
                >
                  Web3
                </span>
              )}
            </>
          );
          if (id === current) {
            return (
              <span key={id} data-space={id} aria-current="page" className={itemClass}>
                {content}
              </span>
            );
          }
          const target = spaceSwitchTarget(id, pathname, user?.id);
          return (
            <Link
              key={id}
              to={target}
              data-space={id}
              onClick={(event) => switchTo(event, id, target)}
              className={`${itemClass} outline-none focus-visible:ring-2 ${styles.ring}`}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
