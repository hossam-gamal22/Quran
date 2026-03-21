/**
 * Shared image upload utility for the admin panel.
 *
 * - Accepts any image format (jpg, jpeg, webp, svg, heic, gif, bmp, etc.)
 * - Small images (< 500KB) upload directly without conversion
 * - Large images get resized and compressed to JPEG
 * - Uploads to Firebase Storage and returns the download URL
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

// ─── Config ──────────────────────────────────────────────
const MAX_IMAGE_WIDTH = 1200;
const JPEG_QUALITY = 0.85;
const SKIP_CONVERSION_THRESHOLD = 500 * 1024; // 500KB - skip conversion for small files

// ─── Web-friendly formats that don't need conversion ─────
const WEB_FRIENDLY_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

// ─── Process image (resize if needed, compress to JPEG) ──
export function processImage(file: File, maxWidth = MAX_IMAGE_WIDTH): Promise<{ blob: Blob; ext: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    // SVGs: keep as-is (vector, lightweight)
    if (file.type === 'image/svg+xml') {
      resolve({ blob: file, ext: 'svg', contentType: 'image/svg+xml' });
      return;
    }

    // Small web-friendly files: upload directly without conversion
    if (file.size < SKIP_CONVERSION_THRESHOLD && WEB_FRIENDLY_FORMATS.includes(file.type)) {
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/gif' ? 'gif' : file.type === 'image/webp' ? 'webp' : 'jpg';
      resolve({ blob: file, ext, contentType: file.type });
      return;
    }

    // Non-image files: pass through
    if (!file.type.startsWith('image/')) {
      resolve({ blob: file, ext: 'bin', contentType: file.type });
      return;
    }

    // Large images or non-web formats: resize and compress to JPEG
    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ blob: file, ext: 'jpg', contentType: file.type });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => blob ? resolve({ blob, ext: 'jpg', contentType: 'image/jpeg' }) : resolve({ blob: file, ext: 'jpg', contentType: file.type }),
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for processing'));
    };

    img.src = url;
  });
}

// Legacy alias for backward compatibility
export const convertToPng = (file: File, maxWidth?: number) => 
  processImage(file, maxWidth).then(r => r.blob);

// ─── Upload image (smart processing) ─────────────────────
export interface UploadImageOptions {
  /** Firebase Storage folder path, e.g. "highlights/icons" */
  storagePath: string;
  /** Optional: max width in px (default 1200) */
  maxWidth?: number;
  /** Optional: previous URL to delete from storage */
  previousUrl?: string;
  /** Optional: previous storage path to delete */
  previousStoragePath?: string;
}

// ─── Convert blob to base64 data URL ─────────────────────
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Max size for base64 fallback (700KB image → ~933KB base64, safe for 1MB Firestore doc)
const MAX_BASE64_FILE_SIZE = 700 * 1024;

export async function uploadImage(
  file: File,
  options: UploadImageOptions,
): Promise<{ url: string; storagePath: string }> {
  const { storagePath, maxWidth, previousStoragePath } = options;

  // Delete previous file if provided
  if (previousStoragePath) {
    try {
      await deleteObject(ref(storage, previousStoragePath));
    } catch {
      // File may not exist — that's fine
    }
  }

  console.log('[Upload] Processing:', file.name, `${(file.size / 1024).toFixed(1)}KB`, file.type);

  // Process image (skip conversion for small web-friendly files)
  const { blob, ext, contentType } = await processImage(file, maxWidth ?? MAX_IMAGE_WIDTH);

  console.log('[Upload] Processed:', `${(blob.size / 1024).toFixed(1)}KB`, ext, contentType);

  // Try Firebase Storage first
  try {
    const fileName = `${Date.now()}.${ext}`;
    const fullPath = `${storagePath}/${fileName}`;
    const storageRef = ref(storage, fullPath);

    console.log('[Upload] Uploading to Firebase Storage:', fullPath);
    await uploadBytes(storageRef, blob, { contentType });
    console.log('[Upload] Getting download URL...');
    const url = await getDownloadURL(storageRef);

    console.log('[Upload] Firebase Storage success:', url.substring(0, 80) + '...');
    return { url, storagePath: fullPath };
  } catch (storageError) {
    console.warn('[Upload] Firebase Storage failed, using base64 fallback:', storageError);
  }

  // Fallback: convert to base64 data URL (stored directly in Firestore)
  if (blob.size > MAX_BASE64_FILE_SIZE) {
    throw new Error(`الصورة كبيرة جداً (${(blob.size / 1024).toFixed(0)}KB). الحد الأقصى ${(MAX_BASE64_FILE_SIZE / 1024).toFixed(0)}KB عند عدم توفر Firebase Storage.`);
  }

  console.log('[Upload] Converting to base64...');
  const dataUrl = await blobToBase64(blob);
  console.log('[Upload] Base64 success:', `${(dataUrl.length / 1024).toFixed(1)}KB`);

  return { url: dataUrl, storagePath: '' };
}
