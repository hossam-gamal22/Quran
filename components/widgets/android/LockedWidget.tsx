// components/widgets/android/LockedWidget.tsx
// Locked widget shown to non-premium users — pure glass shell.

import React from 'react';
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { GLASS, FONT, APP_ICON } from './shared';

interface LockedWidgetProps {
  widgetName: string;
}

export function LockedWidget({ widgetName: _widgetName }: LockedWidgetProps) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: GLASS.bg,
        borderRadius: GLASS.radius,
        padding: GLASS.padding,
      }}
      clickAction="OPEN_APP"
      clickActionData={{ uri: 'rooh-almuslim://subscription' }}
    >
      <ImageWidget image={APP_ICON} imageWidth={32} imageHeight={32} radius={8} />
      <TextWidget text="🔒" style={{ fontSize: 26, color: GLASS.text, marginTop: 8 }} />
      <TextWidget
        text="اشترك للحصول على هذه الودجت"
        style={{ fontSize: 12, color: GLASS.textMuted, fontFamily: FONT.amiri, marginTop: 6, textAlign: 'center' }}
        maxLines={2}
        truncate="END"
      />
    </FlexWidget>
  );
}
