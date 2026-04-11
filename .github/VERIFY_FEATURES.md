md# 🔬 Feature Verification Audit — Rooh Al Muslim
# DO NOT modify any file. READ and REPORT only.
# Date: 2026-03-31

---

## MISSION
Verify whether each feature listed below is ACTUALLY wired end-to-end.
For each feature, trace the EXACT code path from admin panel → Firestore → app.
Do not assume anything works. Prove it or disprove it with file + line number evidence.

---

## OUTPUT FORMAT (use this exactly for every feature)
```[Feature Name]
STATUS: ✅ WORKING | ⚠️ PARTIAL | ❌ BROKEN | 🔍 NOT FOUNDADMIN writes to:    [exact Firestore path + file:line]
APP reads from:     [exact Firestore path + file:line]
MATCH:              YES / NO / N/A
HOW app uses it:    [one sentence — what happens in the UI]
EVIDENCE:           [paste the exact code line that proves it]
ISSUE (if any):     [specific problem found]

---

## FEATURES TO VERIFY

### GROUP 1 — NOTIFICATIONS

**1A. Scheduled push notifications (sent from admin at specific time)**
- Check: Does `admin-panel/src/pages/Notifications.tsx` have a `scheduledAt` field?
- Check: Is there a Cloud Function or cron job that reads scheduled notifications and sends them?
- Check: `functions/` directory — any scheduler function?
- Check: `admin-panel/src/services/pushNotifications.ts` — what does it actually call?

**1B. Targeting by language**
- Check: Does Notifications.tsx filter `users` collection by `language` field?
- Check: Does the `users` document in Firestore actually have a `language` field written by the app?
- Find in `lib/firebase-user.ts` or equivalent: where does the app write the user's language?

**1C. Targeting by country**
- Check: Does Notifications.tsx filter by `country` field?
- Check: Where does the app write `country` to the `users` collection?

**1D. Targeting specific user by ID**
- Check: Is there a UI in Notifications.tsx to send to a single user ID?
- Check: How is the single user's FCM token fetched?

**1E. Update notification (send new version alert)**
- Check: Is there a "send update notification" button in `Settings.tsx`?
- Check: What Firestore fields does it read (`storeUrlIos`, `storeUrlAndroid`)?
- Check: Are these fields actually saved in `config/app-settings`?

**1F. Morning/Evening azkar reminders — admin control**
- Check: `lib/prayer-notifications.ts` or `lib/notifications-manager.ts`
- Check: Are azkar reminders scheduled locally on device (expo-notifications) or via FCM?
- Check: Is there ANY Firestore path that controls the default azkar reminder time?

---

### GROUP 2 — CONTENT

**2A. Highlights (هايلايتس)**
- Check: `admin-panel/src/pages/HighlightsManager.tsx` — what field in `config/app-settings` does it write to? (exact field name)
- Check: In the app, search for where `highlights` is consumed. File + line number.
- Check: What does a highlight entry look like? (fields: title, imageUrl, actionUrl, etc.)

**2B. Daily Content (المحتوى اليومي)**
- Check: `admin-panel/src/pages/DailyContentManager.tsx` — what tabs exist? What Firestore doc does each tab write to?
- Check: `lib/daily-content-override.ts` — does it read from the same Firestore paths?
- Check: If admin sets a daily hadith, does the app show it? Or does the app have its own fallback?

**2C. Temp Pages**
- Check: How does the app RENDER a temp page? Search for `WebView` or `tempPage` in `app/` directory.
- Check: Is there a theme injection (dark background, green colors) or is it plain HTML?
- Check: Does the app pass any CSS variables or theme colors to the WebView?
- Check: What fields does a TempPage document have? (title, content, etc.)

**2D. Seasonal Content (المحتوى الموسمي)**
- Check: `lib/seasonal-content.ts` — what collection does it read from? `seasonalContent` or `appContent`?
- Check: Does it have a real-time listener or one-time fetch?
- Check: What triggers seasonal content to show in the app? (date range? manual toggle?)

---

### GROUP 3 — USERS & SUBSCRIPTIONS

**3A. User display name**
- Check: Where does the app write `displayName` to Firestore?
- Check: Is there a profile screen or onboarding step that asks the user for their name?
- Check: `lib/firebase-user.ts` — what fields are written on first launch?
- Check: What fields does a `users/{userId}` document actually contain on first app open?

**3B. User unique ID**
- Check: `lib/firebase-user.ts` — how is the user's UID generated? Anonymous auth? Google? 
- Check: Is the UID shown anywhere in the app UI?
- Check: From admin panel `Users.tsx` — can you click on a user and copy their ID?

**3C. Grant subscription from admin**
- Check: `admin-panel/src/pages/Subscriptions.tsx` — what fields does it write when granting?
- Check: In the app, `lib/subscription-manager.ts` or `contexts/SubscriptionContext.tsx` — what fields does it READ to determine if user is premium?
- Check: Do the written fields MATCH the read fields? (e.g., admin writes `adminPremium`, app reads `adminPremium`)

**3D. Why are FCM tokens showing as "معطلة" in Users page**
- Check: `admin-panel/src/pages/Users.tsx` — what field is it checking to display "معطلة"?
- Check: In the app, where is the FCM token written to Firestore? What field name?
- Check: Do the field names match?

---

### GROUP 4 — ADS

**4A. Why ads aren't showing**
- Check: `lib/ads-config.ts` — what Firestore path does it read from? (`config/ads-settings` or hardcoded?)
- Check: `admin-panel/src/pages/Ads.tsx` — what path does it WRITE to?
- Check: Do paths match?
- Check: What is the exact field name for the master ads toggle? (`adsEnabled`? `enabled`? `isEnabled`?)
- Check: In the app, what field name is checked before showing any ad?

---

### GROUP 5 — ANALYTICS

**5A. Why analytics page shows all zeros**
- Check: `lib/firebase-analytics.ts` — what collection does the app WRITE stats to?
- Check: `admin-panel/src/pages/Analytics.tsx` — what collection does admin READ from?
- Check: Do they match?
- Check: Is the analytics write call actually triggered on user actions? Find the call site.

---

## FINAL SUMMARY TABLE

After checking all features, output this table: