# 🔧 Fix Verified Issues — Rooh Al Muslim
# Date: 2026-03-31
# Source: VERIFY_FEATURES.md audit results

## RULES
1. PLAN MODE first — show every file you will touch before writing any code
2. Admin panel fixes only: `admin-panel/src/` (unless fix explicitly says app-side)
3. DO NOT fix: Azkar admin control, Seasonal content — skip these completely
4. After each round: stop and ask "Round [N] done. Proceed to Round [N+1]?"
5. After ALL rounds: run `npx tsc --noEmit` inside `admin-panel/` and report result
6. DO NOT modify any file in `/app`, `/lib`, `/hooks`, `/contexts`

---

## ROUND 1 — Fix Analytics Zeros (5 min)

### Problem
`Analytics.tsx:73` reads from `doc(db, 'config', 'analytics')` — this path is NEVER written by the app.
App writes real stats to `stats/global` (firebase-analytics.ts:89).
Result: admin always sees zeros.

### Fix — admin-panel/src/pages/Analytics.tsx only

Step 1: Find the primary stats read (around line 73):
```ts
// WRONG — this path is never written by the app:
const docRef = doc(db, 'config', 'analytics');
// OR
const statsCollection = await getDocs(collection(db, 'stats'));
```

Step 2: Replace with correct path `stats/global`:
```ts
// CORRECT — this is what the app actually writes to:
const globalStatsRef = doc(db, 'stats', 'global');
const globalSnap = await getDoc(globalStatsRef);
const globalStats = globalSnap.exists() ? globalSnap.data() : {};
```

Step 3: Map these exact field names (app writes these to `stats/global`):
- `totalAzkarRead` — total azkar reads
- `totalQuranPages` — total Quran pages read
- `totalPrayers` — total prayers recorded
- `appOpens` — total app opens
- `lastUpdated` — last update timestamp

Step 4: Also read the `activity/` collection for recent activity — keep this AS IS, it is already correct.

Step 5: Update the UI to display the fields above with proper Arabic labels.

### Verification
Open Analytics page → should now show real numbers instead of zeros.

---

## ROUND 2 — Fix FCM "معطلة" Misleading Label (10 min)

### Problem
`Users.tsx:314-318` shows "معطلة/مفعّلة" label but it checks `user.adsEnabled`.
This means the label is showing ADS status — not FCM token status.
This is misleading because admins think FCM notifications are broken when they are actually working fine.

### Fix — admin-panel/src/pages/Users.tsx only

Step 1: Find this code (around line 314-318):
```ts
// CURRENT — wrong, shows ads status with misleading label:
user.adsEnabled ? 'مفعّلة' : 'معطّلة'
```

Step 2: Split into TWO separate columns:

```tsx
{/* Column 1 — FCM Token Status */}
<td>
  {user.fcmToken
    ? <span style={{ color: '#4CAF82', fontWeight: 600 }}>✓ إشعارات نشطة</span>
    : <span style={{ color: '#ef4444' }}>✗ بدون توكن</span>
  }
</td>

{/* Column 2 — Ads Status (keep existing logic, just label it correctly) */}
<td>
  {user.adsEnabled !== false
    ? <span style={{ color: '#9CA3AF', fontSize: 12 }}>الإعلانات: مفعّلة</span>
    : <span style={{ color: '#6B7280', fontSize: 12 }}>الإعلانات: معطّلة</span>
  }
</td>
```

Step 3: Update the table column headers to match:
- "الإشعارات" for FCM token column
- "الإعلانات" for ads column

### Verification
- Users with `fcmToken` field in Firestore → show "✓ إشعارات نشطة" in green
- Users without token → show "✗ بدون توكن" in red
- Ads column is now separate and clearly labeled

---

## ROUND 3 — Add Country Targeting to Notifications (20 min)

### Problem
`pushNotifications.ts:169-171` already has country filtering logic ready.
App writes `country` field to `users/{userId}` on registration.
But `Notifications.tsx` has NO country selection UI — so the filter is never triggered.

### Fix — admin-panel/src/pages/Notifications.tsx only

Step 1: Add state variable at the top of the component:
```ts
const [targetCountries, setTargetCountries] = useState<string[]>([]);
```

Step 2: Find where `targetLanguages` UI is rendered (the language multi-select).
Add this country selector DIRECTLY BELOW it:

```tsx
{/* Country Targeting — add below language selector */}
<div style={{ marginTop: 12 }}>
  <label style={{
    fontSize: 13,
    color: '#9CA3AF',
    display: 'block',
    marginBottom: 6
  }}>
    🌍 استهداف حسب الدولة (اختياري)
  </label>
  <select
    multiple
    value={targetCountries}
    onChange={(e) => {
      const selected = Array.from(e.target.selectedOptions, o => o.value);
      setTargetCountries(selected);
    }}
    style={{
      width: '100%',
      background: '#1F2937',
      color: '#E5E7EB',
      border: '1px solid #374151',
      borderRadius: 8,
      padding: 8,
      minHeight: 110,
      fontSize: 13,
    }}
  >
    <option value="SA">🇸🇦 السعودية</option>
    <option value="EG">🇪🇬 مصر</option>
    <option value="AE">🇦🇪 الإمارات</option>
    <option value="MA">🇲🇦 المغرب</option>
    <option value="DZ">🇩🇿 الجزائر</option>
    <option value="TN">🇹🇳 تونس</option>
    <option value="IQ">🇮🇶 العراق</option>
    <option value="SY">🇸🇾 سوريا</option>
    <option value="JO">🇯🇴 الأردن</option>
    <option value="LB">🇱🇧 لبنان</option>
    <option value="KW">🇰🇼 الكويت</option>
    <option value="QA">🇶🇦 قطر</option>
    <option value="BH">🇧🇭 البحرين</option>
    <option value="OM">🇴🇲 عُمان</option>
    <option value="YE">🇾🇪 اليمن</option>
    <option value="ID">🇮🇩 إندونيسيا</option>
    <option value="PK">🇵🇰 باكستان</option>
    <option value="TR">🇹🇷 تركيا</option>
    <option value="IN">🇮🇳 الهند</option>
    <option value="BD">🇧🇩 بنغلاديش</option>
    <option value="MY">🇲🇾 ماليزيا</option>
    <option value="GB">🇬🇧 بريطانيا</option>
    <option value="US">🇺🇸 أمريكا</option>
    <option value="DE">🇩🇪 ألمانيا</option>
    <option value="FR">🇫🇷 فرنسا</option>
    <option value="RU">🇷🇺 روسيا</option>
    <option value="SG">🇸🇬 سنغافورة</option>
  </select>
  <p style={{ fontSize: 11, color: '#6B7280', margin: '4px 0 0' }}>
    Ctrl / Cmd للاختيار المتعدد. اتركه فارغاً للإرسال للجميع.
  </p>
</div>
```

Step 3: Include `targetCountries` when saving the notification document to Firestore:
```ts
// Add to the notification object being saved:
targetCountries: targetCountries.length > 0 ? targetCountries : [],
```

Step 4: Clear `targetCountries` when resetting the form after send.

Step 5: In `pushNotifications.ts`, verify the filter at line 169-171 reads `targetCountries`:
```ts
// Should already exist — verify it looks like this:
if (notification.targetCountries?.length > 0 &&
    !notification.targetCountries.includes(user.country)) {
  continue;
}
```
If the field name is different, align it with what you saved in Step 3.

### Verification
Create a notification targeting "EG" only → open notifications history → sentCount should match only Egyptian users count.

---

## ROUND 4 — Add Single User Targeting to Notifications (15 min)

### Problem
There is no way to send a push notification to a specific user by ID from the Notifications page.
The only workaround is the Rewards prize notification which targets winner IDs — but it is not a general-purpose tool.

### Fix — admin-panel/src/pages/Notifications.tsx only

Step 1: Add state variable:
```ts
const [targetUserId, setTargetUserId] = useState<string>('');
```

Step 2: Find the "targetAudience" audience selector UI.
Add a new audience option called `'single_user'`:

```tsx
{/* Add to existing audience options */}
<button
  onClick={() => setTargetAudience('single_user')}
  style={{
    background: targetAudience === 'single_user' ? '#4CAF82' : '#1F2937',
    color: targetAudience === 'single_user' ? '#fff' : '#9CA3AF',
    border: '1px solid #374151',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: 13,
  }}
>
  👤 مستخدم محدد
</button>
```

Step 3: When `targetAudience === 'single_user'`, show a User ID input field:
```tsx
{targetAudience === 'single_user' && (
  <div style={{ marginTop: 12 }}>
    <label style={{ fontSize: 13, color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
      معرّف المستخدم (User ID)
    </label>
    <input
      type="text"
      placeholder="user_xxxxxxxxxxxxxxxx"
      value={targetUserId}
      onChange={(e) => setTargetUserId(e.target.value.trim())}
      style={{
        width: '100%',
        background: '#1F2937',
        color: '#E5E7EB',
        border: '1px solid #374151',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 13,
        boxSizing: 'border-box',
      }}
    />
    <p style={{ fontSize: 11, color: '#6B7280', margin: '4px 0 0' }}>
      انسخ المعرّف من صفحة المستخدمين
    </p>
  </div>
)}
```

Step 4: In the send function, handle `single_user` audience:
```ts
// Inside the users filtering logic — add this case:
if (targetAudience === 'single_user') {
  if (!targetUserId) {
    alert('يرجى إدخال معرّف المستخدم');
    return;
  }
  filteredUsers = allUsers.filter(u => u.id === targetUserId);
  if (filteredUsers.length === 0) {
    alert('لم يتم العثور على المستخدم أو ليس لديه توكن إشعارات');
    return;
  }
}
```

Step 5: Reset `targetUserId` to `''` when form is cleared after send.

### Verification
Go to Users page → copy a User ID → go to Notifications → select "مستخدم محدد" → paste ID → send → verify only that user received it.

---

## ROUND 5 — Add Display Name Prompt to App Onboarding (app-side)

### Problem
`registerUser()` in `firebase-user.ts` does NOT set `displayName` on first launch.
Users appear as "-" in admin panel.
Rewards system cannot show winners properly.
Admin has to manually set names one by one.

### Fix — App side (ONE file only)

**File:** Find the onboarding or first-launch screen.
Search for: the screen that shows after first app open OR the screen where user selects their language.

Step 1: Find this screen (likely `app/onboarding.tsx` or `app/(tabs)/index.tsx` first-launch check).

Step 2: Add a name input step to onboarding OR add a profile setup modal that appears once:

```tsx
// Add a one-time name prompt — show only when displayName is null/empty
// Store "hasSetName" flag in AsyncStorage to never show again

import AsyncStorage from '@react-native-async-storage/async-storage';

// Check on app load:
const hasSetName = await AsyncStorage.getItem('hasSetName');
const userDoc = await getDoc(doc(db, 'users', userId));
const displayName = userDoc.data()?.displayName;

if (!hasSetName && !displayName) {
  // Show name input modal
  setShowNameModal(true);
}
```

Step 3: The name input modal (minimal, non-blocking):
```tsx
<Modal visible={showNameModal} transparent animationType="fade">
  <View style={{
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  }}>
    <View style={{
      backgroundColor: '#1A2232',
      borderRadius: 16,
      padding: 24,
    }}>
      <Text style={{
        color: '#E8E8E8',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
      }}>
        أهلاً بك في روح المسلم 🌙
      </Text>
      <Text style={{
        color: '#9CA3AF',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
      }}>
        ما اسمك؟ (اختياري)
      </Text>
      <TextInput
        placeholder="اكتب اسمك هنا..."
        placeholderTextColor="#6B7280"
        value={nameInput}
        onChangeText={setNameInput}
        style={{
          background: '#0D1117',
          color: '#E8E8E8',
          borderRadius: 10,
          padding: 12,
          fontSize: 16,
          textAlign: 'right',
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#374151',
        }}
      />
      <TouchableOpacity
        onPress={async () => {
          if (nameInput.trim()) {
            await updateDoc(doc(db, 'users', userId), {
              displayName: nameInput.trim()
            });
          }
          await AsyncStorage.setItem('hasSetName', 'true');
          setShowNameModal(false);
        }}
        style={{
          backgroundColor: '#4CAF82',
          borderRadius: 10,
          padding: 14,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
          {nameInput.trim() ? 'حفظ الاسم' : 'تخطي'}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
```

Step 4: When user submits the name, write it to Firestore `users/{userId}.displayName`.

### Verification
Fresh install → onboarding → name modal appears → user enters name → name shows in admin Users page.

---

## FINAL CHECKLIST

After all rounds complete, verify:

```
ROUND 1 — Analytics:
[ ] Analytics page shows real numbers (not zeros)
[ ] Field names match: totalAzkarRead, totalQuranPages, totalPrayers, appOpens

ROUND 2 — FCM Label:
[ ] Users table has TWO columns: "الإشعارات" and "الإعلانات"
[ ] Users with fcmToken show "✓ إشعارات نشطة" in green
[ ] Users without token show "✗ بدون توكن" in red

ROUND 3 — Country Targeting:
[ ] Country selector appears in Notifications page
[ ] Selecting one country filters send to that country's users only
[ ] Empty selection = send to all (no regression)

ROUND 4 — Single User:
[ ] "مستخدم محدد" option appears in audience selector
[ ] Pasting a user ID and sending reaches only that user
[ ] Invalid ID shows Arabic error message

ROUND 5 — Display Name:
[ ] Fresh install shows name modal after onboarding
[ ] Entering a name → saves to Firestore users/{userId}.displayName
[ ] Skipping → sets hasSetName flag, never shows again
[ ] Admin Users page now shows names for users who set them

TYPESCRIPT:
[ ] npx tsc --noEmit in admin-panel/ → 0 errors
[ ] npx tsc --noEmit in root → 0 errors
```

---

## DO NOT TOUCH

```
lib/notifications-manager.ts   ← azkar local scheduling (skip)
lib/seasonal-content.ts        ← seasonal content (skip)
contexts/SeasonalContext.tsx   ← seasonal content (skip)
app/_layout.tsx                ← critical, do not touch
constants/translations.ts      ← fragile, do not touch
```