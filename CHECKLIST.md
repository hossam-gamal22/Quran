[[# روح المسلم - قائمة المهام
## Rooh Al-Muslim - Project Checklist

**آخر تحديث:** 2 مارس 2026
**نسبة الإنجاز الكلية:** 40%

---

## 📊 ملخص سريع

| المرحلة | الحالة | النسبة |
|---------|--------|--------|
| Phase 1: Core Setup | ✅ مكتمل | 100% |
| Phase 2: Quran Module | ✅ مكتمل | 100% |
| Phase 3: Khatma System | ✅ مكتمل | 100% |
| Phase 4: Azkar & Duas | ✅ مكتمل | 100% |
| Phase 5: Prayer Times | ⏳ قيد التنفيذ | 0% |
| Phase 6: Worship Tracker | ⏳ معلق | 0% |
| Phase 7: Widgets | ⏳ معلق | 0% |
| Phase 8: Settings | ⏳ معلق | 0% |
| Phase 9: Seasonal Content | ⏳ معلق | 0% |
| Phase 10: Admin Panel | ⏳ معلق | 0% |
| Phase 11: Final Polish | ⏳ معلق | 0% |

---

## ✅ Phase 1: Core Setup (مكتمل)

- [x] إعداد المشروع بـ Expo
- [x] تثبيت المكتبات الأساسية
- [x] إعداد الثيمات (Light/Dark)
- [x] مكون GlassCard
- [x] التاريخ الهجري
- [x] الحافظة (Clipboard)
- [x] إشعارات الصلاة
- [x] التخزين المحلي (AsyncStorage)
- [x] إعداد Firebase

**الملفات:**
- `constants/theme.ts` ✅
- `constants/colors.ts` ✅
- `components/ui/GlassCard.tsx` ✅
- `lib/hijri-date.ts` ✅
- `lib/storage.ts` ✅
- `lib/notifications.ts` ✅

---

## ✅ Phase 2: Quran Module (مكتمل)

- [x] نظام الكاش للقرآن
- [x] مشغل الصوت
- [x] QuranContext
- [x] عرض الآيات
- [x] شريط المشغل
- [x] التخطيط الرئيسي
- [x] صفحة القرآن
- [x] صفحة السورة
- [x] اختيار القارئ
- [x] البحث
- [x] الترجمات (11 لغة)
- [x] التفاسير (3 تفاسير)
- [x] تمييز الآيات

**الملفات:**
- `lib/quran-cache.ts` ✅
- `lib/audio-player.ts` ✅
- `contexts/QuranContext.tsx` ✅
- `components/ui/quran/VerseDisplay.tsx` ✅
- `components/ui/quran/PlayerBar.tsx` ✅
- `app/(tabs)/quran.tsx` ✅
- `app/surah/[id].tsx` ✅

---

## ✅ Phase 3: Khatma System (مكتمل)

- [x] تخزين الختمة
- [x] KhatmaContext
- [x] صفحة الختمات
- [x] إنشاء ختمة جديدة
- [x] الورد اليومي
- [x] إشعارات التذكير

**الملفات:**
- `lib/khatma-storage.ts` ✅
- `contexts/KhatmaContext.tsx` ✅
- `app/khatma/index.tsx` ✅
- `app/khatma/new.tsx` ✅
- `app/khatma/daily.tsx` ✅

---

## ✅ Phase 4: Azkar & Duas (مكتمل)

### البيانات الأساسية:
- [x] `data/azkar.ts` - 55 ذكر (6 فئات)
- [x] `data/duas.ts` - 38 دعاء (3 فئات)
- [x] `data/ruqya.ts` - 10 رقية (2 فئات)

### نظام الترجمات (12 لغة):
- [x] `data/translations/index.ts` - النظام المركزي
- [x] `data/translations/azkar.ts` - 660 ترجمة
- [x] `data/translations/categories.ts` - 372 ترجمة
- [x] `data/translations/benefits.ts` - 216 ترجمة
- [x] `data/translations/duas.ts` - 456 ترجمة
- [x] `data/translations/ruqya.ts` - 120 ترجمة
- [x] `data/translations/ui.ts` - 1,056 ترجمة

### اللغات المدعومة:
ar - العربية | en - English | ur - اردو id - Indonesia | tr - Türkçe | fr - Français de - Deutsch | hi - हिन्दी | bn - বাংলা ms - Melayu | ru - Русский | es - Español


### إحصائيات الترجمات:
| الملف | المفاتيح | اللغات | الإجمالي |
|-------|---------|--------|----------|
| azkar.ts | 55 | 12 | 660 |
| categories.ts | 31 | 12 | 372 |
| benefits.ts | 18 | 12 | 216 |
| duas.ts | 38 | 12 | 456 |
| ruqya.ts | 10 | 12 | 120 |
| ui.ts | 88 | 12 | 1,056 |
| **الإجمالي** | **240** | **12** | **2,880** |

---

## ⏳ Phase 5: Prayer Times (التالي)

- [ ] صفحة مواقيت الصلاة
- [ ] API مواقيت الصلاة (AlAdhan)
- [ ] تحديد الموقع التلقائي
- [ ] العد التنازلي للصلاة القادمة
- [ ] إعدادات طريقة الحساب
- [ ] تعديل الدقائق يدوياً
- [ ] منبه الفجر
- [ ] الوضع الصامت
- [ ] التقويم الشهري
- [ ] الثلث الأخير ومنتصف الليل
- [ ] مشاركة المواقيت كصورة

**الملفات المطلوبة:**
- `app/(tabs)/prayer.tsx`
- `lib/prayer-times.ts`
- `components/ui/prayer/PrayerCard.tsx`
- `components/ui/prayer/PrayerList.tsx`
- `components/ui/prayer/CountdownTimer.tsx`

---

## ⏳ Phase 6: Worship Tracker

- [ ] متتبع الصلاة
- [ ] متتبع الصيام
- [ ] متتبع القرآن
- [ ] دعاء رمضان اليومي (30 دعاء)
- [ ] الإحصائيات الأسبوعية/الشهرية
- [ ] الرسوم البيانية

**الملفات المطلوبة:**
- `app/worship-tracker/index.tsx`
- `app/worship-tracker/prayer.tsx`
- `app/worship-tracker/fasting.tsx`
- `app/worship-tracker/quran.tsx`
- `contexts/WorshipContext.tsx`

---

## ⏳ Phase 7: Widgets

- [ ] ويدجت iOS (expo-widgets)
- [ ] ويدجت Android (react-native-android-widget)
- [ ] ويدجت الصلاة القادمة
- [ ] ويدجت ذكر عشوائي
- [ ] ويدجت التاريخ الهجري
- [ ] ويدجت آية اليوم
- [ ] ويدجت تقدم الختمة
- [ ] ويدجت يوم رمضان

**الملفات المطلوبة:**
- `widgets/ios/PrayerWidget.tsx`
- `widgets/ios/AzkarWidget.tsx`
- `widgets/android/PrayerWidget.tsx`
- `widgets/android/AzkarWidget.tsx`
- `app/widget-settings.tsx`

---

## ⏳ Phase 8: Settings

- [ ] صفحة الإعدادات الرئيسية
- [ ] اختيار اللغة
- [ ] المظهر (فاتح/داكن)
- [ ] إشعارات الأذكار
- [ ] إعدادات الصلاة
- [ ] إعدادات القرآن
- [ ] النسخ الاحتياطي (iCloud)
- [ ] الاستعادة
- [ ] مشاركة التطبيق
- [ ] حول التطبيق

**الملفات المطلوبة:**
- `app/(tabs)/settings.tsx`
- `contexts/SettingsContext.tsx`

---

## ⏳ Phase 9: Seasonal Content

- [ ] قسم رمضان (دعاء، صيام، ستيكرات)
- [ ] قسم ذو الحجة
- [ ] قسم الجمعة
- [ ] المحتوى الموسمي الديناميكي

---

## ⏳ Phase 10: Admin Panel

- [ ] تسجيل الدخول
- [ ] إدارة الأقسام
- [ ] إدارة الأذكار
- [ ] إعدادات إزالة الإعلانات
- [ ] إدارة المحتوى الموسمي
- [ ] إحصائيات الاستخدام

**الملفات المطلوبة:**
- `admin-panel/login.tsx`
- `admin-panel/dashboard.tsx`
- `admin-panel/sections.tsx`
- `admin-panel/azkar.tsx`

---

## ⏳ Phase 11: Final Polish

- [ ] اختبار جميع الميزات
- [ ] تحسين الأداء
- [ ] إصلاح الأخطاء
- [ ] إعداد App Store
- [ ] إعداد Google Play
- [ ] الإطلاق

---

## 📚 APIs المستخدمة

| API | الحالة | الاستخدام |
|-----|--------|----------|
| AlQuran.cloud | ✅ جاهز | القرآن، الترجمات، التفاسير |
| AlAdhan.com | ⏳ معلق | مواقيت الصلاة |
| Islamic.Network CDN | ✅ جاهز | ملفات الصوت |

---

## 📦 المكتبات المطلوبة

```json
{
  "expo-widgets": "للويدجات iOS",
  "react-native-android-widget": "للويدجات Android",
  "expo-av": "تشغيل الصوت",
  "expo-blur": "تأثير الزجاج",
  "react-native-reanimated": "الأنيميشن",
  "expo-notifications": "الإشعارات",
  "expo-location": "الموقع",
  "expo-clipboard": "الحافظة",
  "expo-haptics": "الاهتزاز",
  "@react-native-async-storage/async-storage": "التخزين"
}
📁 هيكل المجلدات
rooh-al-muslim/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx        # الرئيسية
│   │   ├── quran.tsx        # القرآن
│   │   ├── prayer.tsx       # الصلاة (⏳)
│   │   └── settings.tsx     # الإعدادات (⏳)
│   ├── azkar/
│   │   └── [type].tsx       # صفحة الأذكار
│   ├── surah/
│   │   └── [id].tsx         # صفحة السورة
│   ├── khatma/
│   │   ├── index.tsx
│   │   ├── new.tsx
│   │   └── daily.tsx
│   ├── worship-tracker/     # (⏳)
│   └── widget-settings.tsx  # (⏳)
├── components/
│   └── ui/
│       ├── GlassCard.tsx
│       ├── quran/
│       ├── azkar/
│       ├── prayer/          # (⏳)
│       └── widgets/         # (⏳)
├── contexts/
│   ├── QuranContext.tsx
│   ├── KhatmaContext.tsx
│   ├── SettingsContext.tsx  # (⏳)
│   └── WorshipContext.tsx   # (⏳)
├── data/
│   ├── azkar.ts             ✅
│   ├── duas.ts              ✅
│   ├── ruqya.ts             ✅
│   └── translations/
│       ├── index.ts         ✅
│       ├── azkar.ts         ✅
│       ├── categories.ts    ✅
│       ├── benefits.ts      ✅
│       ├── duas.ts          ✅
│       ├── ruqya.ts         ✅
│       └── ui.ts            ✅
├── lib/
│   ├── quran-cache.ts
│   ├── audio-player.ts
│   ├── hijri-date.ts
│   ├── prayer-times.ts      # (⏳)
│   ├── storage.ts
│   ├── khatma-storage.ts
│   └── notifications.ts
├── constants/
│   ├── theme.ts
│   ├── colors.ts
│   └── icons.ts
├── widgets/                  # (⏳)
│   ├── ios/
│   └── android/
├── admin-panel/              # (⏳)
└── assets/
    ├── icons/
    ├── images/
    └── fonts/
](https://www.genspark.ai/)](https://www.genspark.ai/)
