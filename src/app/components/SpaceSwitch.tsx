import { Link, useLocation } from "react-router";
import { Camera, Sparkles, type LucideIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { spaceForPath, spaceSwitchTarget, type Space } from "./spaceSwitchRoutes";

type Tone = "light" | "dark" | "editions";

// Each side styles the switch with its own palette (see docs/ui/*.md)
const TONES: Record<
  Tone,
  { track: string; active: string; idle: string; tag: string; ring: string }
> = {
  light: {
    track: "bg-[#f1efe8] ring-1 ring-inset ring-black/5",
    active:
      "bg-white text-[#18211f] shadow-[0_1px_2px_rgba(24,33,31,0.12),0_1px_1px_rgba(24,33,31,0.06)]",
    idle: "text-[#4a534e] hover:bg-white/70 hover:text-[#18211f]",
    tag: "bg-[#0786ff]/10 text-[#0062c4]",
    ring: "focus-visible:ring-[#1e4a3f]",
  },
  dark: {
    track: "bg-white/10",
    active: "bg-white text-[#12231f]",
    idle: "text-white/80 hover:bg-white/10 hover:text-white",
    tag: "bg-[#0786ff]/25 text-[#9ccfff]",
    ring: "focus-visible:ring-white/60",
  },
  editions: {
    track: "bg-(--ed-raised) ring-1 ring-inset ring-(--ed-border)",
    active: "bg-(--ed-surface) text-(--ed-text) shadow-[0_1px_2px_rgba(0,0,0,0.2)]",
    idle: "text-(--ed-muted) hover:text-(--ed-text)",
    tag: "bg-(--ed-primary)/15 text-(--ed-primary)",
    ring: "focus-visible:ring-(--ed-primary)",
  },
};

const OPTIONS: { id: Space; label: string; icon: LucideIcon }[] = [
  { id: "photography", label: "Photography", icon: Camera },
  { id: "editions", label: "Editions", icon: Sparkles },
];

/**
 * Photography | Editions switch. It sits right after the logo in both headers (and under the
 * header on phones) so people can move between the two sides from any page.
 * Display comes from `className` (default `inline-flex`), so callers can hide it responsively.
 * `condensed` shrinks it from lg up, where the photography header (capped at 1440px) is crowded:
 * Photography becomes an icon and the Web3 tag hides, while "Editions" stays readable.
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
  const { user } = useAuth();
  const current = spaceForPath(pathname);
  const styles = TONES[tone];
  const itemSize = size === "sm" ? "h-8 px-3 text-sm" : "h-9 px-3.5 text-sm";

  return (
    <nav
      aria-label="Switch between Photography and Editions"
      className={`${fullWidth ? "flex w-full" : ""} shrink-0 items-center gap-0.5 rounded-full p-1 ${styles.track} ${className}`}
    >
      {OPTIONS.map(({ id, label, icon: Icon }) => {
        const active = id === current;
        const iconOnly = condensed && id === "photography";
        const itemClass = `inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-[background-color,color,box-shadow] duration-200 ${itemSize} ${iconOnly ? "lg:px-2.5" : ""} ${fullWidth ? "flex-1" : ""} ${active ? styles.active : styles.idle}`;
        const content = (
          <>
            <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            <span className={iconOnly ? "lg:sr-only" : undefined}>{label}</span>
            {id === "editions" && (
              <span
                className={`rounded-full px-1.5 font-mono text-[10px] font-medium uppercase leading-4 tracking-wide ${styles.tag} ${condensed ? "lg:hidden" : ""}`}
              >
                Web3
              </span>
            )}
          </>
        );
        return active ? (
          <span
            key={id}
            aria-current="page"
            title={condensed ? label : undefined}
            className={itemClass}
          >
            {content}
          </span>
        ) : (
          <Link
            key={id}
            to={spaceSwitchTarget(id, pathname, user?.id)}
            title={condensed ? label : undefined}
            onClick={onSwitch}
            className={`${itemClass} outline-none focus-visible:ring-2 ${styles.ring}`}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
