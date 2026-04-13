// lib/cloud-sync.ts
// خدمة المزامنة السحابية — روح المسلم

import { db, storage } from './firebase-config';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { gatherBackupData, restoreBackupData, formatSize } from './backup-utils';
import type { BackupData, RestoreResult } from './backup-utils';

// ========================================
// الأنواع
// ========================================

export interface CloudBackupMeta {
  openId: string;
  lastSyncAt: Timestamp;
  deviceName: string;
  platform: string;
  appVersion: string;
  keyCount: number;
  sizeBytes: number;
  sizeFormatted: string;
}

export interface CloudUploadResult {
  success: boolean;
  meta: CloudBackupMeta | null;
  error?: string;
}

export interface CloudRestoreResult extends RestoreResult {
  backupDate: string;
  deviceName: string;
}

// ========================================
// ثوابت المسارات
// ========================================

const FIRESTORE_COLLECTION = 'userBackups';
const STORAGE_PATH = 'userBackups';

function getFirestoreDocPath(openId: string) {
  return doc(db, FIRESTORE_COLLECTION, openId);
}

function getStoragePath(openId: string) {
  return `${STORAGE_PATH}/${openId}/backup.json`;
}

// ========================================
// الدوال الأساسية
// ========================================

/**
 * Upload all local data to Firebase cloud.
 * Stores JSON blob in Storage + metadata in Firestore.
 */
export async function uploadToCloud(openId: string): Promise<CloudUploadResult> {
  try {
    console.log('☁️ [CloudSync] Starting upload for:', openId.substring(0, 12) + '...');

    // 1. Gather local data
    const backupData = await gatherBackupData();
    const jsonString = JSON.stringify(backupData);
    const sizeBytes = new Blob([jsonString]).size;

    console.log(`☁️ [CloudSync] Data gathered: ${backupData.keyCount} keys, ${formatSize(sizeBytes)}`);

    // 2. Upload JSON to Firebase Storage
    const storageRef = ref(storage, getStoragePath(openId));
    await uploadString(storageRef, jsonString, 'raw', {
      contentType: 'application/json',
      customMetadata: { openId, uploadedAt: new Date().toISOString() },
    });
    console.log('☁️ [CloudSync] JSON uploaded to Storage');

    // 3. Write metadata to Firestore (rollback Storage on failure)
    const deviceName = Device.deviceName || Device.modelName || Platform.OS;
    const appVersion = Constants.expoConfig?.version || 'unknown';

    const meta: Omit<CloudBackupMeta, 'lastSyncAt'> & { lastSyncAt: ReturnType<typeof serverTimestamp> } = {
      openId,
      lastSyncAt: serverTimestamp(),
      deviceName,
      platform: Platform.OS,
      appVersion,
      keyCount: backupData.keyCount || 0,
      sizeBytes,
      sizeFormatted: formatSize(sizeBytes),
    };

    try {
      await setDoc(getFirestoreDocPath(openId), meta);
    } catch (firestoreError) {
      console.error('☁️ [CloudSync] Firestore write failed, rolling back Storage upload');
      try { await deleteObject(storageRef); } catch { /* best-effort cleanup */ }
      throw firestoreError;
    }
    console.log('☁️ [CloudSync] Metadata written to Firestore');

    // 4. Read back the server timestamp
    const snap = await getDoc(getFirestoreDocPath(openId));
    const savedMeta = snap.data() as CloudBackupMeta;

    return { success: true, meta: savedMeta };
  } catch (error) {
    console.error('☁️ [CloudSync] Upload failed:', error);
    return {
      success: false,
      meta: null,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Download backup from cloud and restore into local AsyncStorage.
 */
export async function downloadFromCloud(openId: string): Promise<CloudRestoreResult | null> {
  try {
    console.log('☁️ [CloudSync] Starting download for:', openId.substring(0, 12) + '...');

    // 1. Verify metadata exists
    const meta = await getCloudBackupMeta(openId);
    if (!meta) {
      console.log('☁️ [CloudSync] No cloud backup found');
      return null;
    }

    // 2. Download JSON from Storage
    const storageRef = ref(storage, getStoragePath(openId));
    const blob = await getBlob(storageRef);
    const jsonString = await blob.text();

    console.log(`☁️ [CloudSync] Downloaded ${formatSize(jsonString.length)} from Storage`);

    // 3. Parse and validate
    let backupData: BackupData;
    try {
      backupData = JSON.parse(jsonString);
    } catch {
      throw new Error('Cloud backup file is corrupted (invalid JSON)');
    }

    if (!backupData.version || !backupData.data || typeof backupData.data !== 'object') {
      throw new Error('Cloud backup file has invalid structure');
    }

    // 4. Restore into AsyncStorage
    const result = await restoreBackupData(backupData);

    console.log(`☁️ [CloudSync] Restore complete: ${result.restored} restored, ${result.failed} failed`);

    return {
      ...result,
      backupDate: backupData.createdAt,
      deviceName: meta.deviceName,
    };
  } catch (error) {
    console.error('☁️ [CloudSync] Download failed:', error);
    throw error;
  }
}

/**
 * Get cloud backup metadata without downloading the full backup.
 * Used for UI display and conflict resolution.
 */
export async function getCloudBackupMeta(openId: string): Promise<CloudBackupMeta | null> {
  try {
    const snap = await getDoc(getFirestoreDocPath(openId));
    if (!snap.exists()) return null;
    return snap.data() as CloudBackupMeta;
  } catch (error) {
    console.error('☁️ [CloudSync] Failed to fetch metadata:', error);
    return null;
  }
}

/**
 * Delete cloud backup (Storage file + Firestore metadata).
 */
export async function deleteCloudBackup(openId: string): Promise<boolean> {
  try {
    const storageRef = ref(storage, getStoragePath(openId));
    try {
      await deleteObject(storageRef);
    } catch {
      // File may not exist — OK to continue
    }
    await deleteDoc(getFirestoreDocPath(openId));
    console.log('☁️ [CloudSync] Cloud backup deleted');
    return true;
  } catch (error) {
    console.error('☁️ [CloudSync] Delete failed:', error);
    return false;
  }
}
