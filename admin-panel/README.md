# Rooh Admin Panel

لوحة إدارة React/Vite مع Netlify Functions. نفس المشروع يشتغل بثلاث طرق:

- Vite dev سريع للتطوير اليومي.
- Netlify dev محلي production-like، يشغل `/api/*` functions محليا.
- Netlify deploy للإنتاج من نفس `netlify.toml`.

## Local Setup

انسخ ملف البيئة:

```bash
cp .env.example .env
```

أضف القيم السرية في `.env`:

```bash
ADMIN_PASSWORD_HASH=...
ADMIN_SESSION_SECRET=at-least-32-random-chars
EXPO_ACCESS_TOKEN=...
ADMIN_PANEL_ORIGINS=http://localhost:8888,http://127.0.0.1:8888
```

توليد `ADMIN_PASSWORD_HASH`:

```bash
node -e "crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_PASSWORD')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))"
```

## Run Locally

تطوير سريع بدون Netlify functions:

```bash
pnpm run dev
```

تشغيل محلي production-like بنفس مسارات Netlify:

```bash
pnpm run dev:netlify
```

افتح:

```text
http://localhost:8888
```

في الوضع ده:

- يتم عمل `vite build` ثم خدمة `dist` محليا.
- `/.netlify/functions/verify-admin` يشتغل محليا من `netlify/functions/verify-admin.ts`.
- `/.netlify/functions/expo-push` يشتغل محليا من `netlify/functions/expo-push.ts`.
- الإنتاج يقدر يستخدم `/api/verify-admin` و`/api/expo-push` عبر redirects.
- صفحات React Router ترجع لـ `index.html` عبر redirects.

## Persistent Local Service

على macOS تقدر تشغل اللوحة كخدمة `launchd` تبدأ تلقائيا وتفضل شغالة:

```bash
pnpm run local-service:install
```

أوامر الإدارة:

```bash
pnpm run local-service:status
pnpm run local-service:restart
pnpm run local-service:stop
pnpm run local-service:uninstall
```

الخدمة تستخدم نفس `pnpm run dev:netlify` ونفس الرابط:

```text
http://localhost:8888
```

اللوج المحلي:

```text
admin-panel/.local-logs/netlify-dev.log
```

## Build And Deploy

اختبار build:

```bash
pnpm run build
```

Deploy preview على Netlify:

```bash
pnpm run deploy:netlify
```

Deploy production:

```bash
pnpm run deploy:netlify:prod
```

لو هتربطه من Netlify UI، خلي الإعدادات:

```text
Base directory: admin-panel
Build command: pnpm install --no-frozen-lockfile && pnpm run build
Publish directory: admin-panel/dist
Functions directory: admin-panel/netlify/functions
```
