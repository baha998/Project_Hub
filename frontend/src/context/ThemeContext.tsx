import { useEffect, useState, type ReactNode } from "react";
import { ThemeContext, type Theme } from "./theme";

const STORAGE_KEY = "project_hub_theme";

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch { /* Storage may be unavailable in private browsing. */ }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* Keep the in-memory preference. */ }
  }, [theme]);
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) setTheme(event.newValue);
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((value) => value === "light" ? "dark" : "light") }}>{children}</ThemeContext.Provider>;
}

