# Security Actions

آخر تحديث: 2026-05-26

لا يوجد ضمان أمان 100% لأي مشروع، لكن تم تنفيذ خطوات تقفل أغلب المخاطر العملية: منع رفع الأسرار، تدوير service account، تضييق قواعد Firebase، نقل مفاتيح البناء إلى env، وفحص الباندلات المنشورة.

## تم تنفيذه

- إزالة `.env` وملفات `.firebase` من تتبع Git، وإضافة `.env.example` بدون أسرار.
- تدوير مفتاح Firebase Admin service account وحذف كل المفاتيح القديمة؛ المتبقي مفتاح user-managed واحد فقط.
- ضبط Netlify ليستخدم `FIREBASE_SERVICE_ACCOUNT_JSON` كسر server-side.
- إزالة مفاتيح الطرف الثالث العامة من Netlify env الخاصة بالباندل.
- منع لوحة الأدمن من تسجيل Firebase بدون custom token بصلاحية admin.
- نشر قواعد Firestore وStorage المقفولة.
- إصلاح قراءة لوحة الشرف والمحتوى العام للمستخدمين القدام والجدد بدون فتح الكتابة العامة.
- نقل Firebase config في التطبيق إلى env حسب Android/iOS/Web.
- ضبط EAS env لمفاتيح Firebase العامة الخاصة بالبناء.
- حذف لوحة Firebase Hosting القديمة `/admin` لأنها كانت static وغير مناسبة أمنيًا.
- إنشاء مفتاح Browser جديد مقيد لدومينات Firebase Hosting ونشره.
- نشر لوحة الأدمن على Netlify بعد تنظيف الباندل.

## متبقّي خارج الكود

- تدوير مفاتيح Pexels / Sunnah / EmailJS من Dashboards الخاصة بهم، لأن إنشائها/إلغاؤها لا يتم من هذا الريبو.
- تدوير `EXPO_ACCESS_TOKEN` من Expo Dashboard ثم تحديثه في Netlify/Firebase secrets لو كان مستخدمًا.
- إضافة SHA-1/SHA-256 من Play Console لمفتاح Android API؛ لم يتم تقييد Android بدونها حتى لا يتعطل التطبيق للمستخدمين.
- تفعيل Firebase App Check داخل التطبيق وإصدار نسخة جديدة أولا، ثم تفعيل enforcement من Firebase Console. لا تفعل enforcement قبل الإصدار الجديد حتى لا تتكسر النسخ القديمة.
- تفعيل GitHub Secret Scanning وPush Protection وDependabot من إعدادات GitHub إذا لم تكن مفعلة.

## أوامر تحقق مفيدة

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run tests/firebase-security-rules.test.ts tests/rewards-manager.test.ts tests/notification-priority-contract.test.ts
git grep -l "BEGIN PRIVATE KEY" -- .
```
