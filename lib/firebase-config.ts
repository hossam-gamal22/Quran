// lib/firebase-config.ts
// إعداد Firebase للتطبيق
// Re-exports from the single source of truth: config/firebase.ts

export { default, default as app } from '@/config/firebase';
export { db, storage } from '@/config/firebase';