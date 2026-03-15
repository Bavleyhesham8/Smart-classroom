import React, { createContext, useContext, useEffect, useState } from "react";
import useStore from "../store/useStore";

const ThemeProviderContext = createContext({
  theme: "light",
  setTheme: () => null,
});

export function ThemeProvider({ children, ...props }) {
  const theme = useStore((state) => state.theme);
  const setThemeStore = useStore((state) => state.setTheme);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    // Also save to localStorage for faster initial load (index.html script)
    localStorage.setItem("smartclass-theme", theme);
  }, [theme]);

  const value = {
    theme,
    setTheme: (t) => setThemeStore(t),
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
