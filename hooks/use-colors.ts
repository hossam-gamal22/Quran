// hooks/use-colors.ts

import { useTheme } from "@/lib/theme-provider";
import { ThemeColors } from "@/constants/theme";

export function useColors(): ThemeColors {
  const { colors } = useTheme();
  return colors;
}
