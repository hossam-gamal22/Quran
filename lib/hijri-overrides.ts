// lib/hijri-overrides.ts
// Firestore CRUD for Hijri admin overrides (Layer 1)
// Collection: hijri_overrides
// Document ID: {countryCode}_{hijriYear}_{hijriMonth}

import { db } from '@/lib/firebase-config';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

// ============================================
// Types
// ============================================

export interface HijriOverride {
  countryCode: string;
  countryName: string;
  hijriYear: number;
  hijriMonth: number;
  monthLength: 29 | 30;
  hijriStartGregorian: string; // ISO date string
  source: string;
  sourceUrl?: string;
  announcedAt?: Timestamp;
  updatedBy?: string;
  isVerified: boolean;
}

// ============================================
// Fetch Override from Firestore
// ============================================

export async function getFirestoreOverride(
  countryCode: string,
  hijriYear: number,
  hijriMonth: number,
): Promise<HijriOverride | null> {
  try {
    const docId = `${countryCode}_${hijriYear}_${hijriMonth}`;
    const docRef = doc(db, 'hijri_overrides', docId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    const data = snapshot.data() as HijriOverride;
    if (!data.isVerified) return null;

    return data;
  } catch {
    return null;
  }
}

// ============================================
// Check if override exists for a country+month
// ============================================

export async function hasOverride(
  countryCode: string,
  hijriYear: number,
  hijriMonth: number,
): Promise<boolean> {
  try {
    const result = await getFirestoreOverride(countryCode, hijriYear, hijriMonth);
    return result !== null;
  } catch {
    return false;
  }
}
