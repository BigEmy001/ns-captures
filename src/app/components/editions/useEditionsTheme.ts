import { useCallback, useEffect, useState } from "react";

export type EditionsTheme = "dark" | "light";

const STORAGE_KEY = "ns_editions_theme";
const THEME_EVENT = "ns:editions-theme";

function readTheme(): EditionsTheme {
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

/** Dark / light preference for the editions (NFT) screens, persisted and kept in sync across open views. */
export function useEditionsTheme() {
  const [theme, setThemeState] = useState<EditionsTheme>(readTheme);

  useEffect(() => {
    const sync = () => setThemeState(readTheme());
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setTheme = useCallback((next: EditionsTheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode): keep the choice for this session only
    }
    setThemeState(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { theme, setTheme };
}
