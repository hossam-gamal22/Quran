// components/ui/BrandedCapture.tsx
// نظام مشاركة الصور (معطل - المستخدم يأخذ سكرين شوت عادي)

import React, { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

// ─── Size options (kept for type compatibility) ───
export type ImageSizeKey = 'portrait' | 'story';

export const IMAGE_SIZE_OPTIONS = [
  { key: 'portrait' as const, label: '4:5', width: 1080, height: 1350 },
  { key: 'story' as const, label: '9:16', width: 1080, height: 1920 },
];

// ─── Public API ───
export interface BrandedCaptureHandle {
  capture: (sizeKey?: ImageSizeKey) => Promise<string>;
  showSizePicker: () => void;
}

interface BrandedCaptureProps {
  children: React.ReactNode | ((textColor: string) => React.ReactNode);
  excludeBranding?: boolean;
  isPremium?: boolean;
  title?: string;
  onCapture?: (uri: string) => void;
  storyOnly?: boolean;
}

/**
 * Pass-through component - screenshot sharing disabled.
 * Users can take regular screenshots instead.
 */
export const BrandedCapture = forwardRef<BrandedCaptureHandle, BrandedCaptureProps>(
  ({ children }, ref) => {
    // Provide no-op handle for existing code
    useImperativeHandle(ref, () => ({
      capture: async () => '',
      showSizePicker: () => {},
    }));

    // Resolve render prop pattern
    const resolvedChildren = typeof children === 'function' ? children('#FFFFFF') : children;

    return <View>{resolvedChildren}</View>;
  }
);

BrandedCapture.displayName = 'BrandedCapture';

export default BrandedCapture;
