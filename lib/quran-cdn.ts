import * as FileSystem from 'expo-file-system';

// List of CDN hosts to try (ordered by preference)
const HOSTS = [
  'https://cdn.islamic.network',
  'https://cdn.alquran.cloud',
  'https://cdn.islamic.ru',
];
const BASE_DIR: string = ((FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory || '') as string;
const CACHE_DIR = BASE_DIR + 'quran_pages/';

async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

export function getCdnPageImageUrl(page: number): string {
  return `${HOSTS[0]}/quran/images/pages/${page}.png`;
}

export function getCdnPageImageFallbackUrl(page: number): string {
  return `${HOSTS[1]}/quran/images/pages/${page}.png`;
}

export async function fetchAndCachePageImage(page: number): Promise<string> {
  await ensureCacheDir();
  const filename = `page_${page}.png`;
  const dest = CACHE_DIR + filename;

  try {
    const stat = await FileSystem.getInfoAsync(dest);
    if (stat.exists && stat.uri) return stat.uri;
  } catch (e) {
    // ignore and continue to download
  }

  // Common path patterns used by various Quran CDNs/sites
  const PATH_PATTERNS = [
    '/quran/images/pages/{p}.png',
    '/images/quran/pages/{p}.png',
    '/images/pages/{p}.png',
    '/mushaf/page_{p}.png',
    '/mushaf/pages/{p}.png',
    '/quran/page/{p}.png',
    '/uploads/pages/{p}.png',
    '/quran/pages/{p}.png',
  ];

  const urls: string[] = [];
  for (const host of HOSTS) {
    for (const pattern of PATH_PATTERNS) {
      urls.push(host + pattern.replace('{p}', String(page)));
    }
  }
  let lastError: any = null;

  for (const url of urls) {
    try {
      console.warn('[quran-cdn] trying URL ->', url);
      // Probe with HEAD where supported to skip obviously missing resources
      try {
        const head = await fetch(url, { method: 'HEAD' });
        console.warn('[quran-cdn] HEAD result', url, { ok: head.ok, status: head.status });
        if (head.ok) {
          const ct = head.headers.get('content-type') || '';
          console.warn('[quran-cdn] content-type', url, ct);
          if (!ct.includes('image')) {
            // not an image, skip this resource
            console.warn('[quran-cdn] skipping (not image)', url);
            continue;
          }
        }
      } catch (probeErr) {
        // ignore probe errors and attempt download anyway (some hosts block HEAD)
        console.warn('[quran-cdn] HEAD probe failed (will attempt download) for', url, probeErr);
      }

      // Attempt to download the image
      try {
        const res = await FileSystem.downloadAsync(url, dest);
        console.warn('[quran-cdn] download attempt result', url, res && (res.status || res.uri));
        if (res && res.uri) {
          console.warn('[quran-cdn] downloaded ->', url, res.uri);
          return res.uri;
        }
      } catch (dlErr) {
        lastError = dlErr;
        console.warn('[quran-cdn] download failed for', url, dlErr);
      }
      // try next url
    } catch (err) {
      lastError = err;
      console.warn('[quran-cdn] unexpected error for', url, err);
    }
  }

  // cleanup any partial file
  try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch {}

  throw lastError || new Error('Failed to download page image');
}

export default { getCdnPageImageUrl, getCdnPageImageFallbackUrl, fetchAndCachePageImage };
