import { useEffect } from "react";

/** Stops the page behind a modal from scrolling while the modal is open. */
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
