import React, { createContext, useContext, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const STORAGE_KEY = "overraprep-theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore storage access issues
  }
  return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    const initial = getStoredTheme();
    return initial === "system" ? getSystemTheme() : initial;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateResolved = () => {
      const active: ResolvedTheme = theme === "system" ? (mediaQuery.matches ? "dark" : "light") : theme;
      setResolvedTheme(active);

      const root = document.documentElement;

      // 1. Ensure colors in index.css respond to the data-theme attribute
      root.setAttribute("data-theme", active);

      // 2. Also toggle the .dark class for Tailwind utility classes
      if (active === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }

      // 3. Set native color-scheme
      root.style.colorScheme = active;

      // 4. Update meta theme-color for browser navigation bar
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute("content", active === "dark" ? "#0c1017" : "#ffffff");
      }

      // 5. Capacitor mobile status bar styling
      if (Capacitor.isNativePlatform()) {
        StatusBar.setStyle({
          style: active === "dark" ? Style.Dark : Style.Light,
        }).catch(() => {});
        StatusBar.setBackgroundColor({
          color: active === "dark" ? "#0a0f1d" : "#ffffff",
        }).catch(() => {});
      }
    };

    updateResolved();

    // Listen to OS preference changes if system mode is active
    const handleChange = () => {
      if (theme === "system") {
        updateResolved();
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
      localStorage.setItem("theme", newTheme);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
        isDark: resolvedTheme === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
