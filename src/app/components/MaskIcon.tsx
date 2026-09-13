import type { CSSProperties } from "react";

/**
 * Renders a single-colour SVG asset as a CSS mask filled with `currentColor`,
 * so exported design icons pick up hover / active / disabled colours from text
 * utilities instead of needing a separate file per state.
 */
export function MaskIcon({ src, className = "size-5" }: { src: string; className?: string }) {
  const mask = `url("${src}")`;
  const style: CSSProperties = {
    maskImage: mask,
    WebkitMaskImage: mask,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskSize: "contain",
    WebkitMaskSize: "contain",
  };

  return (
    <span aria-hidden className={`inline-block shrink-0 bg-current ${className}`} style={style} />
  );
}
