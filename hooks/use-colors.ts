// hooks/use-colors.ts

import { useSettings } from "@/contexts/SettingsContext";
import { Colors, DarkColors } from "@/constants/theme";

// Extended colors object that includes commonly-used UI properties
const LightColors = {
  ...Colors,
  card: '#FFFFFF',
  cardGlass: Colors.cardGlass,
};

const DarkColorsExtended = {
  ...DarkColors,
  card: '#1a1f2b',
  cardGlass: DarkColors.cardGlass,
};

export function useColors() {
  const { isDarkMode } = useSettings();
  return isDarkMode ? DarkColorsExtended : LightColors;
}
