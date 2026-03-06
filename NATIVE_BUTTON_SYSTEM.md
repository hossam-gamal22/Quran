// NATIVE BUTTON SYSTEM - System-Native Look & Feel
// نظام الأزرار الأصلية - تطابق تماماً مع نظام التشغيل
// ========================================

## System Theme Integration

The app now automatically reads from device system settings:
- **Light Mode**: Automatically uses system light colors when device is in light mode
- **Dark Mode**: Automatically uses system dark colors when device is in dark mode
- **No Custom Theme Selection Needed**: System automatically detects and applies theme

## Native Button Components

All buttons now follow iOS/Android native design patterns.

### 1. NativeButton (Default/Gray)
- Light mode: White background with light borders
- Dark mode: Dark gray background with light borders
- Best for: Standard, non-emphasis actions
- Usage:
```tsx
<NativeButton
  label="إلغاء"
  icon="close"
  isDarkMode={isDarkMode}
  onPress={handleCancel}
/>
```

### 2. NativeTintedButton (Blue/System Color)
- Light & Dark: System blue color (#007AFF / #0A84FF)
- White text
- Best for: Primary actions, emphasis
- Usage:
```tsx
<NativeTintedButton
  label="تأكيد"
  icon="check"
  isDarkMode={isDarkMode}
  onPress={handleConfirm}
/>
```

### 3. NativeFilledButton (Subtle Fill)
- Light: Light gray background
- Dark: Dark gray with light transparency
- Best for: Secondary actions
- Usage:
```tsx
<NativeFilledButton
  label="حفظ"
  isDarkMode={isDarkMode}
  onPress={handleSave}
/>
```

### 4. NativeTextButton (Text Only)
- Only text in system blue color
- No background
- Best for: Tertiary actions, minimal style
- Usage:
```tsx
<NativeTextButton
  label="مزيد"
  isDarkMode={isDarkMode}
  onPress={handleMore}
/>
```

### 5. NativeToggleSwitch (iOS Standard Toggle)
- Green when enabled (#34C759)
- Gray when disabled
- Follows iOS design exactly
- Usage:
```tsx
<NativeToggleSwitch
  enabled={isNotified}
  onToggle={(value) => setIsNotified(value)}
  isDarkMode={isDarkMode}
/>
```

## System Colors Reference

All colors automatically adapt to light/dark mode:

### Light Mode
- Primary Button: White with light border
- Secondary Button: Light gray background
- Tinted Button: System Blue (#007AFF)
- Text: Black

### Dark Mode
- Primary Button: Dark gray with light border
- Secondary Button: Dark gray with light transparency
- Tinted Button: System Blue Dark (#0A84FF)
- Text: White

## Migration from Old Button System

### Old Custom Buttons
```tsx
<TouchableOpacity style={styles.button}>
  <Text>Click</Text>
</TouchableOpacity>
```

### New Native Buttons
```tsx
<NativeTintedButton
  label="Click"
  isDarkMode={isDarkMode}
  onPress={handlePress}
/>
```

## Updated Components

1. **PrayerList.tsx**: Notification toggle now uses `NativeToggleSwitch`
2. **prayer.tsx**: Bottom view-mode buttons now use `NativeTintedButton`
3. All buttons now automatically detect system theme

## Key Features

✓ Automatic system theme detection
✓ No custom styling needed
✓ Haptic feedback on all buttons
✓ Minimum touch target: 44px (iOS standard)
✓ Disabled state with opacity
✓ Perfect match with system UI
✓ Works on both iOS and Android
✓ Dark mode support built-in

## System Theme Detection Flow

```
Appearance.getColorScheme()
    ↓
SettingsContext (isDarkMode)
    ↓
useSettings() hook in components
    ↓
isDarkMode prop to buttons
    ↓
Automatic color adaptation
```

The app respects system settings automatically. If user changes system theme, 
the app updates in real-time without requiring app restart.
