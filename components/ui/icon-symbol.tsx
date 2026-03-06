// components/ui/icon-symbol.tsx
import React from "react";
import { Platform, StyleProp, ViewStyle } from "react-native";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";

// خريطة تحويل أيقونات SF Symbols إلى Ionicons للأندرويد والويب
const ICON_MAP: Record<string, string> = {
  // Tab Bar
  "text.book.closed": "book-outline",
  "text.book.closed.fill": "book",
  "book": "book-outline",
  "book.fill": "book",
  "building.columns": "business-outline",
  "building.columns.fill": "business",
  "gearshape": "settings-outline",
  "gearshape.fill": "settings",
  
  // Navigation & Actions
  "chevron.left": "chevron-back",
  "chevron.right": "chevron-forward",
  "xmark": "close",
  "xmark.circle.fill": "close-circle",
  "magnifyingglass": "search",
  "plus": "add",
  "minus": "remove",
  
  // Home Screen
  "sparkles": "sparkles",
  "sun.max.fill": "sunny",
  "sun.max": "sunny-outline",
  "moon.fill": "moon",
  "moon.stars.fill": "moon",
  "sunrise.fill": "sunny",
  "sunset.fill": "sunny",
  "sun.horizon.fill": "partly-sunny",
  "sun.min.fill": "sunny",
  "bed.double.fill": "bed",
  "alarm.fill": "alarm",
  "hands.sparkles.fill": "hand-left",
  "circle.grid.3x3.fill": "grid",
  "circle.grid.3x3": "grid-outline",
  "star.fill": "star",
  "star": "star-outline",
  "shield.fill": "shield-checkmark",
  "location.north.fill": "compass",
  "location.north": "compass-outline",
  "location.fill": "location",
  "location": "location-outline",
  
  // Prayer
  "bell.fill": "notifications",
  "bell": "notifications-outline",
  "calendar": "calendar-outline",
  "calendar.fill": "calendar",
  
  // Quran
  "play.fill": "play",
  "play": "play-outline",
  "pause.fill": "pause",
  "pause": "pause-outline",
  "stop.fill": "stop",
  "bookmark.fill": "bookmark",
  "bookmark": "bookmark-outline",
  "square.and.arrow.up.fill": "share-social",
  "square.and.arrow.up": "share-social-outline",
  
  // Settings
  "moon.fill": "moon",
  "textformat.size": "text",
  "globe": "globe-outline",
  "number": "keypad-outline",
  "person.wave.2.fill": "person",
  "envelope.fill": "mail",
  "info.circle.fill": "information-circle",
  
  // General
  "house": "home-outline",
  "house.fill": "home",
  "heart.fill": "heart",
  "heart": "heart-outline",
  "clock": "time-outline",
  "clock.fill": "time",
  "checkmark": "checkmark",
  "checkmark.circle.fill": "checkmark-circle",
};

interface IconSymbolProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconSymbol({ name, size = 24, color = "#000000", style }: IconSymbolProps) {
  // استخدام SF Symbols على iOS
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={name as SymbolViewProps["name"]}
        size={size}
        tintColor={color}
        style={style}
        fallback={
          <Ionicons
            name={(ICON_MAP[name] || "information-outline") as any}
            size={size}
            color={color}
            style={style}
          />
        }
      />
    );
  }

  // استخدام Ionicons على Android و Web
  const ionIconName = ICON_MAP[name] || "information-outline";
  
  return (
    <Ionicons
      name={ionIconName as any}
      size={size}
      color={color}
      style={style}
    />
  );
}

export default IconSymbol;
