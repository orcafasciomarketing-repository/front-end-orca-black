import { useContext } from "react";

import { ThemeContext } from "../context/themeContext";

const LIGHT_THEME = { theme: "light", isDark: false, toggleTheme: () => {} };

export default function useTheme() {
  return useContext(ThemeContext) ?? LIGHT_THEME;
}
