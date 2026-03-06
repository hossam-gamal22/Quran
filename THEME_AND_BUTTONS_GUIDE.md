# ✅ نظام الثيم والأزرار الموحد - التحديثات الحديثة

## 📋 الحالة الحالية

### ✅ تم التحديث:
1. **more.tsx** - تم التحديث ليستخدم SettingsContext و BackgroundWrapper
   - استخدام isDarkMode من useSettings()
   - استخدام BackgroundWrapper من CompetitionContext
   - استخدام MaterialCommunityIcons بدلاً من Ionicons
   - نفس نظام الألوان والتصميم من باقي الصفحات

2. **app/(tabs)/index.tsx** - محدّث مع ColoredButton
   - استخدام ColoredButton للأقسام الرئيسية
   - استخدام BackgroundWrapper
   - استخدام isDarkMode من useSettings()

3. **app/(tabs)/settings.tsx** - محدّث
   - استخدام SettingsContext
   - استخدام نظام الثيم الصحيح

### 🔄 قيد المراجعة:
- prayer.tsx - يستخدم NativeTintedButton ولكن قد يحتاج تحديثات أخرى
- quran.tsx - قد يحتاج إلى استخدام BackgroundWrapper و isDarkMode بشكل صحيح

---

## 🎨 نظام الثيم الموحد - كيفية الاستخدام

### 1️⃣ استيراد المتطلبات الأساسية

```tsx
import { useSettings } from '@/contexts/SettingsContext';
import BackgroundWrapper from '@/components/ui/BackgroundWrapper';
import { StatusBar, SafeAreaView } from 'react-native';
```

### 2️⃣ في المكون الرئيسي

```tsx
export default function MyScreen() {
  const { isDarkMode, settings } = useSettings();

  return (
    <BackgroundWrapper
      backgroundKey={settings.display.appBackground}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        
        {/* محتوى الصفحة */}
      </SafeAreaView>
    </BackgroundWrapper>
  );
}
```

### 3️⃣ الأنماط (Styles)

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',  // Light mode
  },
  containerDark: {
    backgroundColor: '#11151c',  // Dark mode
  },
  safeArea: {
    flex: 1,
  },
});
```

---

## 🔘 نظام الأزرار الموحد

### نوع 1: ColoredButton (الأقسام الرئيسية)

```tsx
import { ColoredButton } from '@/components/ui/colored-button';

<ColoredButton
  label="أذكار الصباح"
  icon="weather-sunny"
  backgroundColor="#FF9234"
  iconColor="#fff"
  textColor="#fff"
  size="medium"
  onPress={handlePress}
/>
```

**متى تستخدمه:**
- الأقسام الرئيسية (Azkar, Duas, Quran, etc.)
- الأزرار الكبيرة مع الأيقونات
- الدعوات للإجراء الرئيسية (Call to Action)

### نوع 2: NativeButton (الأزرار الأصلية)

```tsx
import { NativeButton, NativeTintedButton } from '@/components/ui/native-button';

// الزر الافتراضي (أبيض/رمادي)
<NativeButton
  label="إلغاء"
  icon="close"
  isDarkMode={isDarkMode}
  onPress={handleCancel}
/>

// الزر الرئيسي (أزرق)
<NativeTintedButton
  label="تأكيد"
  isDarkMode={isDarkMode}
  onPress={handleConfirm}
/>

// الزر مع لون مخصص
<NativeButton
  label="حفظ"
  icon="content-save"
  customColor="#34C759"
  variant="filled"
  isDarkMode={isDarkMode}
  onPress={handleSave}
/>
```

**متى تستخدمه:**
- الأزرار في الحوارات (Dialogs)
- الأزرار الثانوية والتأكيد
- أزرار الإجراءات في القوائم
- تتبع النظام الأصلي (iOS/Android)

### نوع 3: NativeToggleSwitch

```tsx
import { NativeToggleSwitch } from '@/components/ui/native-button';

<NativeToggleSwitch
  enabled={notificationEnabled}
  onToggle={(value) => setNotificationEnabled(value)}
  isDarkMode={isDarkMode}
/>
```

**متى تستخدمه:**
- المفاتيح والخيارات الثنائية
- الإخطارات والتفضيلات

---

## 🌈 نظام الألوان

### الألوان الأساسية

| الوضع | الـ Background | الـ Surface | النص | النص الثانوي |
|-------|--------------|----------|------|----------|
| Light | #f5f5f5 | #fff | #333 | #999 |
| Dark | #11151c | #1a1a2e | #fff | #999 |

### الألوان المتخصصة

```
الأخضر الرئيسي:  #2f7659
الأزرق:          #007AFF (Light) / #0A84FF (Dark)
الأحمر:          #EF4444
الأزرق السماوي: #3A7CA5
البرتقالي:       #FF9234
البنفسجي:        #5D4E8C
الذهبي:          #DAA520
```

---

## 📋 قائمة التحقق للصفحات الجديدة

عند إنشاء صفحة جديدة، تأكد من:

- [ ] استيراد `useSettings` من SettingsContext
- [ ] استيراد BackgroundWrapper
- [ ] استخدام `isDarkMode` من useSettings()
- [ ] استخدام `StatusBar` مع المود الصحيح
- [ ] استخدام `SafeAreaView` للتطبيق المناسب
- [ ] تطبيق الألوان الصحيحة (Light/Dark mode variants)
- [ ] استخدام الأزرار الموحدة (ColoredButton أو NativeButton)
- [ ] اختبار في Light و Dark mode
- [ ] اختبار على iOS و Android

---

## 🔗 الملفات الرئيسية

```
components/
├── ui/
│   ├── colored-button.tsx          ← الأزرار الملونة
│   ├── native-button.tsx           ← الأزرار الأصلية
│   ├── BackgroundWrapper.tsx       ← غلاف الخلفية
│   └── ...

contexts/
└── SettingsContext.tsx             ← إدارة الإعدادات والثيم

app/(tabs)/
├── index.tsx                       ✅ محدّث
├── more.tsx                        ✅ محدّث
├── settings.tsx                    ✅ محدّث
├── prayer.tsx                      🔄 قيد المراجعة
└── quran.tsx                       🔄 قيد المراجعة
```

---

## 📝 ملاحظات التحديث

### more.tsx التحديثات الأخيرة:
✅ تغيير من AsyncStorage إلى SettingsContext
✅ تطبيق BackgroundWrapper
✅ استخدام isDarkMode من useSettings()
✅ تحديث الأيقونات إلى MaterialCommunityIcons
✅ توحيد نظام الألوان
✅ إزالة ثوابت theme القديمة (Colors, DarkColors, Spacing, etc.)

---

**التاريخ**: 2026-03-05
**الحالة**: 🔄 قيد التحديث المستمر
**الصفحات المتبقية للتحديث**:
- quran.tsx
- وصفحات أخرى حسب الحاجة
