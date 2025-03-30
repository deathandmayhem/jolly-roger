import React from "ThemeTypereact";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Theme } from "react-select";
import { ThemeContext } from "styled-components";

type ThemeType = "auto" | "light" | "dark";
export interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [appTheme, setAppTheme] = useState<ThemeType>("auto");

  const handleThemeSelect = useCallback((theme: ThemeType) => {
    setAppTheme(theme);
    console.log("Selected theme:", theme);
    localStorage.setItem("appTheme", theme);
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem("appTheme") as Theme | null;
    if (storedTheme) {
      setAppTheme(storedTheme);
    }
  }, []);

  const value = useMemo(
    () => ({
      theme: appTheme,
      setTheme: handleThemeSelect,
    }),
    [appTheme, handleThemeSelect],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
