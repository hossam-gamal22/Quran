// Cross-platform icon component
// Uses MaterialIcons on all platforms (iOS, Android, Web).
// SF Symbols names are mapped to Material Icons internally.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconSymbolName = keyof typeof MAPPING;

/**
 * Complete SF Symbols → Material Icons mapping.
 * Every icon used across the entire app MUST be listed here.
 */
const MAPPING = {
  // ── Navigation tabs ──────────────────────────────────
  "house.fill":                       "home",
  "book.fill":                        "menu-book",
  "book":                             "book",              // ← quran screen
  "clock.fill":                       "access-time",
  "clock":                            "access-time",       // ← outline variant
  "location.north.fill":              "explore",
  "gearshape.fill":                   "settings",

  // ── Chevrons / Arrows ─────────────────────────────────
  "chevron.right":                    "chevron-right",
  "chevron.left":                     "chevron-left",
  "chevron.down":                     "expand-more",
  "chevron.up":                       "expand-less",
  "paperplane.fill":                  "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "arrow.left":                       "arrow-back",
  "arrow.right":                      "arrow-forward",
  "arrow.clockwise":                  "refresh",
  "arrow.counterclockwise":           "replay",            // ← recitations
  "arrow.up.arrow.down":              "swap-vert",
  "arrow.left.arrow.right":          "swap-horiz",        // ← language toggle
  "arrow.down.circle.fill":          "download",          // ← download button

  // ── Actions ───────────────────────────────────────────
  "xmark":                            "close",
  "xmark.circle.fill":                "cancel",
  "magnifyingglass":                  "search",
  "square.and.arrow.up":              "share",
  "doc.on.doc":                       "content-copy",
  "plus":                             "add",
  "minus":                            "remove",
  "checkmark":                        "check",
  "checkmark.circle.fill":            "check-circle",
  "checkmark.seal.fill":              "verified",          // ← khatm tab
  "trash.fill":                       "delete",
  "trash":                            "delete-outline",    // ← outline trash
  "pencil":                           "edit",
  "slider.horizontal.3":              "tune",
  "line.3.horizontal.decrease":       "filter-list",       // ← filter button
  "speedometer":                      "speed",
  "photo":                            "image",             // ← image/photo

  // ── Bookmarks / Favorites ─────────────────────────────
  "bookmark.fill":                    "bookmark",
  "bookmark":                         "bookmark-border",
  "heart.fill":                       "favorite",
  "heart":                            "favorite-border",
  "star.fill":                        "star",
  "star":                             "star-border",

  // ── Media / Audio ─────────────────────────────────────
  "play.fill":                        "play-arrow",
  "pause.fill":                       "pause",
  "stop.fill":                        "stop",
  "forward.fill":                     "skip-next",
  "backward.fill":                    "skip-previous",
  "repeat":                           "repeat",
  "repeat.1":                         "repeat-one",
  "speaker.wave.2.fill":              "volume-up",
  "speaker.slash.fill":               "volume-off",
  "mic.fill":                         "mic",
  "waveform":                         "graphic-eq",
  "headphones":                       "headphones",        // ← recitations tab
  "music.microphone":                 "interpreter-mode",  // ← reciter icon

  // ── Theme / Display ───────────────────────────────────
  "moon.fill":                        "dark-mode",
  "sun.max.fill":                     "light-mode",
  "textformat.size":                  "format-size",
  "text.alignright":                  "format-align-right",
  "text.alignleft":                   "format-align-left",
  "globe":                            "language",
  "note.text":                        "notes",
  "list.bullet":                      "list",
  "square.grid.2x2":                  "grid-view",

  // ── Notifications ─────────────────────────────────────
  "bell.fill":                        "notifications",
  "bell.slash.fill":                  "notifications-off",

  // ── Info / System ─────────────────────────────────────
  "info.circle":                      "info",
  "sparkles":                         "auto-awesome",      // ← daily ayah tab
  "person.fill":                      "person",

  // ── Islamic / App-specific ────────────────────────────
  "scroll.fill":                      "article",           // ← wird tab
  "circle.grid.3x3.fill":             "apps",              // ← tasbih tab
  "text.book.closed.fill":            "import-contacts",   // ← tafsir tab
  "map.fill":                         "map",
  "location.fill":                    "location-on",
  "calendar":                         "calendar-today",
  "calendar.circle":                  "event",             // ← calendar variant
  "moon.stars.fill":                  "nights-stay",
  "sunrise.fill":                     "wb-sunny",
  "sunset.fill":                      "wb-twilight",
  "arrow.up.right.square":             "open-in-new",      // ← external link
  "paintbrush.fill":                   "palette",          // ← theme/color picker
} as const;

/**
 * An icon component that uses MaterialIcons on all platforms.
 * Icon `name`s follow SF Symbols naming convention and are mapped internally.
 * Falls back to "help-outline" if the icon name is not in the mapping.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: string; // accepted but unused (SF Symbols iOS-only property)
}) {
  const iconName = (MAPPING[name] ?? "help-outline") as ComponentProps<
    typeof MaterialIcons
  >["name"];

  return (
    <MaterialIcons color={color} size={size} name={iconName} style={style} />
  );
}
