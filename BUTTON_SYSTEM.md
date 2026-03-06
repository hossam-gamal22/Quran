// BUTTON SYSTEM GUIDE
// نظام الأزرار الشامل - Native + Colored
// ========================================

## نظام الأزرار المحدث

الآن لديك ثلاث أنظمة أزرار رئيسية:

### 1. Native System Buttons (نظام iOS الأصلي)
أزرار تطابق تماماً نظام التشغيل

**NativeButton** - الزر الافتراضي
```tsx
<NativeButton
  label="إلغاء"
  icon="close"
  isDarkMode={isDarkMode}
  onPress={handleCancel}
/>
```

**NativeTintedButton** - الزر الرئيسي (أزرق)
```tsx
<NativeTintedButton
  label="تأكيد"
  isDarkMode={isDarkMode}
  onPress={handleConfirm}
/>
```

**NativeButton مع لون مخصص**
```tsx
<NativeButton
  label="حفظ"
  icon="content-save"
  customColor="#34C759" // أخضر
  variant="filled"
  isDarkMode={isDarkMode}
  onPress={handleSave}
/>
```

### 2. Colored Buttons (أزرار ملونة كبيرة)
للأقسام الرئيسية والتسليطات

**أذكار الصباح**
```tsx
<ColoredButton
  label="أذكار الصباح"
  icon="white-balance-sunny"
  backgroundColor="#FF9234" // برتقالي
  iconColor="#fff"
  onPress={() => navigateToAzkar('morning')}
/>
```

**أذكار المساء**
```tsx
<ColoredButton
  label="أذكار المساء"
  icon="moon"
  backgroundColor="#5DADE2" // أزرق سماوي
  iconColor="#fff"
  onPress={() => navigateToAzkar('evening')}
/>
```

**مثال من الصور - الزر الأزرق "شارك التطبيق"**
```tsx
<ColoredButton
  label="شارك التطبيق"
  icon="share-variant"
  backgroundColor="#007AFF" // iOS Blue
  iconColor="#fff"
  size="large"
  onPress={handleShare}
/>
```

### 3. Native Toggle Switch
زر التبديل الأصلي (الأخضر/الرمادي)

```tsx
<NativeToggleSwitch
  enabled={isNotified}
  onToggle={(value) => setIsNotified(value)}
  isDarkMode={isDarkMode}
/>
```

## الألوان الموصى بها

### Colored Buttons
- أذكار الصباح: `#FF9234` (برتقالي)
- أذكار المساء: `#5DADE2` (أزرق سماوي)
- أزرار أخرى: حسب الحاجة

### Native System Colors
- الأزرق: `#007AFF` (iOS Light) / `#0A84FF` (iOS Dark)
- الأخضر: `#34C759` (للتأكيد)
- الأحمر: `#FF3B30` (للحذف)

## مثال عملي كامل

```tsx
import { ColoredButton } from '@/components/ui/colored-button';
import { NativeButton, NativeTintedButton } from '@/components/ui/native-button';

export default function HomeScreen() {
  return (
    <View>
      {/* الأزرار الملونة الكبيرة */}
      <ColoredButton
        label="أذكار الصباح"
        icon="white-balance-sunny"
        backgroundColor="#FF9234"
        onPress={handleMorning}
      />
      <ColoredButton
        label="أذكار المساء"
        icon="moon"
        backgroundColor="#5DADE2"
        onPress={handleEvening}
      />

      {/* الأزرار الأصلية */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <NativeButton
          label="إلغاء"
          isDarkMode={isDarkMode}
          onPress={handleCancel}
        />
        <NativeTintedButton
          label="تأكيد"
          isDarkMode={isDarkMode}
          onPress={handleConfirm}
        />
      </View>
    </View>
  );
}
```

## إرشادات الاستخدام

1. **استخدم ColoredButton** للأقسام الرئيسية والتسليطات الكبيرة
2. **استخدم NativeTintedButton** للإجراءات الرئيسية
3. **استخدم NativeButton** للإجراءات الثانوية
4. **استخدم NativeToggleSwitch** للخيارات الثنائية

## دعم Dark Mode

كل الأزرار تدعم Dark Mode تلقائياً:
- الألوان الأخرى (مثل البرتقالي والأزرق) تبقى كما هي
- الأزرار الأصلية تتغير تلقائياً حسب وضع النظام
