/**
 * Shared image upload utility for the admin panel.
 *
 * - Accepts any image format (jpg, jpeg, webp, svg, heic, gif, bmp, etc.)
 * - Automatically converts to PNG before uploading
 * - Compresses / resizes to keep file size reasonable
 * - Uploads to Firebase Storage and returns the download URL
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

// ─── Config ──────────────────────────────────────────────
const MAX_IMAGE_WIDTH = 1200;
const IMAGE_QUALITY = 0.92; // PNG is lossless, but canvas quality affects pre-processing

// ─── Convert any image file → PNG Blob ───────────────────
export function convertToPng(file: File, maxWidth = MAX_IMAGE_WIDTH): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // SVGs: keep as-is (they're already lightweight and vector)
    if (file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

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
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : resolve(file)),
        'image/png',
        IMAGE_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for conversion'));
    };

    img.src = url;
  });
}

// ─── Upload image (auto-convert to PNG) ──────────────────
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

export async function uploadImage(
  file: File,
  options: UploadImageOptions,
): Promise<{ url: string; storagePath: string }> {
  const { storagePath, maxWidth, previousUrl, previousStoragePath } = options;

  // Delete previous file if provided
  if (previousStoragePath) {
    try {
      await deleteObject(ref(storage, previousStoragePath));
    } catch {
      // File may not exist — that's fine
    }
  } else if (previousUrl) {
    try {
      const oldRef = ref(storage, previousUrl);
      await deleteObject(oldRef);
    } catch {
      // ok
    }
  }

  // Convert to PNG
  const pngBlob = await convertToPng(file, maxWidth ?? MAX_IMAGE_WIDTH);

  // Determine extension (SVG stays .svg, everything else becomes .png)
  const isSvg = file.type === 'image/svg+xml';
  const ext = isSvg ? 'svg' : 'png';
  const fileName = `${Date.now()}.${ext}`;
  const fullPath = `${storagePath}/${fileName}`;

  const storageRef = ref(storage, fullPath);
  const contentType = isSvg ? 'image/svg+xml' : 'image/png';

  await uploadBytes(storageRef, pngBlob, { contentType });
  const url = await getDownloadURL(storageRef);

  return { url, storagePath: fullPath };
}
