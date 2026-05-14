// components/widgets/android/AppNotOpenedWidget.tsx
// Android widget empty state for a placement created before the app has ever
// written real shared widget data.

import React from 'react';
import { I18nManager } from 'react-native';
import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import { APP_ICON, FONT, paletteFor } from './shared';

export function AppNotOpenedWidget() {
  const isAr = I18nManager.isRTL;
  const p = paletteFor('dark');

  return (
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: p.bg,
        borderRadius: 0,
        padding: 12,
      }}
      clickAction="OPEN_APP"
    >
      <ImageWidget image={APP_ICON} imageWidth={30} imageHeight={30} radius={7} />
      <TextWidget
        text={isAr ? 'افتح تطبيق روح المسلم' : 'Open Rooh Al Muslim'}
        style={{
          fontSize: 13,
          color: p.text,
          fontFamily: isAr ? FONT.rubikBold : FONT.rubikBold,
          marginTop: 8,
          textAlign: 'center',
        }}
        maxLines={2}
        truncate="END"
      />
      <TextWidget
        text={isAr ? 'حتى تظهر بيانات الويدجت' : 'to load widget data'}
        style={{
          fontSize: 10,
          color: p.muted,
          fontFamily: FONT.rubik,
          marginTop: 4,
          textAlign: 'center',
        }}
        maxLines={2}
        truncate="END"
      />
    </FlexWidget>
  );
}
