/**
 * MushafLineSkia — Renders a single Mushaf line using Skia + COLR/CPAL font.
 *
 * Used only in Tajweed mode. Skia is required because React Native iOS
 * `<Text>` does not rasterize COLR layer tables (all glyphs paint mono).
 *
 * Layout matches the RN-based renderer in app/surah/[id].tsx:
 *  - Single line, centered horizontally
 *  - Auto-shrinks to fit width (respects width budget like adjustsFontSizeToFit)
 *  - Supports onLongPress for ayah bookmarking
 *
 * IMPORTANT — bidi: Skia's <Text> is a non-bidi, left-to-right glyph painter.
 * It does NOT reorder Arabic (RTL) runs the way React Native's native <Text>
 * does. Callers MUST pass `text` already in VISUAL (right-to-left → left-to-right
 * paint) order. For QCF word glyphs that means reversing the logical word
 * sequence before passing it in (see the caller in app/surah/[id].tsx).
 */

import React, { useMemo } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { Canvas, Text as SkText, useFont } from '@shopify/react-native-skia';
import * as Haptics from 'expo-haptics';

export interface MushafLineSkiaProps {
  text: string;
  fontSource: any; // require() result for the COLR TTF
  fontSize: number;
  lineHeight: number;
  width: number;
  paddingTop?: number;
  paddingBottom?: number;
  /** Min scale when text overflows width; matches RN minimumFontScale={0.85} */
  minScale?: number;
  /** Base/foreground color for non-COLR glyphs. COLR palette colors still override. */
  color?: string;
  onLongPress?: () => void;
}

export const MushafLineSkia = React.memo(function MushafLineSkia({
  text,
  fontSource,
  fontSize,
  lineHeight,
  width,
  paddingTop = 0,
  paddingBottom = 0,
  minScale = 0.85,
  color,
  onLongPress,
}: MushafLineSkiaProps) {
  const font = useFont(fontSource, fontSize);

  const layout = useMemo(() => {
    if (!font) return null;
    const available = Math.max(1, width - 8);
    const measured = font.measureText(text);
    let drawSize = fontSize;
    let textWidth = measured.width;
    if (textWidth > available) {
      const scale = Math.max(minScale, available / textWidth);
      drawSize = fontSize * scale;
      textWidth = textWidth * scale;
    }
    const x = Math.max(0, (width - textWidth) / 2);
    return { drawSize, x };
  }, [font, text, fontSize, width, minScale]);

  // Reserve enough vertical space for the line + glyph clipping margins
  const containerHeight = lineHeight + paddingTop + paddingBottom;

  // Skia <SkText> y is the baseline. Position so the visual line sits
  // centered within `lineHeight`, biased down by paddingTop.
  const baselineY = paddingTop + lineHeight - (lineHeight - fontSize) / 2 - fontSize * 0.18;

  // If we re-rasterized at a smaller size for fit, build a sized font.
  const sizedFont = useFont(fontSource, layout?.drawSize ?? fontSize);

  const content = (
    <View style={{ width, height: containerHeight }} pointerEvents="box-none">
      <Canvas style={{ flex: 1 }}>
        {sizedFont && layout && (
          <SkText x={layout.x} y={baselineY} text={text} font={sizedFont} color={color} />
        )}
      </Canvas>
    </View>
  );

  if (!onLongPress) return content;

  return (
    <Pressable
      onLongPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
        onLongPress();
      }}
      delayLongPress={300}
    >
      {content}
    </Pressable>
  );
});

export default MushafLineSkia;
