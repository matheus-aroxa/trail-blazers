import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  ThemeContext,
  type Theme,
  type ThemeContextValue,
} from "./theme-context";

function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

function readInitialTheme(): Theme {
  const fromDom = document.documentElement.dataset.theme;
  return isTheme(fromDom) ? fromDom : DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
