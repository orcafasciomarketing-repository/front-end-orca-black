import { useEffect, useState } from "react";

import { ThemeContext } from "./themeContext";

export const THEME_STORAGE_KEY = "admin-theme";
const LEGACY_STORAGE_KEY = "admin-charts-theme";

function readSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return saved === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export default function ThemeContextProvider({ children }) {
  const [theme, setTheme] = useState(readSavedTheme);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      return;
    }
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  const ctxValue = {
    theme,
    isDark: theme === "dark",
    toggleTheme,
  };

  return <ThemeContext value={ctxValue}>{children}</ThemeContext>;
}
