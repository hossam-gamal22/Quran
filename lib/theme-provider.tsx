import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, useColorScheme as useSystemColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SchemeColors, type ColorScheme, type ThemeColors } from "@/constants/theme";

const THEME_STORAGE_KEY = "@app_theme";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleTheme: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "dark";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("dark");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
          setColorSchemeState(saved);
        } else {
          setColorSchemeState(systemScheme);
        }
      } catch {
        setColorSchemeState(systemScheme);
      } finally {
        setIsLoaded(true);
      }
    }
    loadTheme();
  }, [systemScheme]);

  const setColorScheme = useCallback(async (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    Appearance.setColorScheme?.(scheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, scheme);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    const newScheme = colorScheme === "dark" ? "light" : "dark";
    setColorScheme(newScheme);
  }, [colorScheme, setColorScheme]);

  const colors = useMemo(() => SchemeColors[colorScheme], [colorScheme]);
  const isDark = colorScheme === "dark";

  const value = useMemo(
    () => ({
      colorScheme,
      colors,
      setColorScheme,
      toggleTheme,
      isDark,
    }),
    [colorScheme, colors, setColorScheme, toggleTheme, isDark]
  );

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export const useThemeContext = useTheme;