// lib/api/pexels.ts
export type PhotoSrc = {
  original: string;
  large2x: string;
  large: string;
  medium: string;
  small: string;
  portrait: string;
  landscape: string;
  tiny: string;
};

export type Photo = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color?: string;
  src: PhotoSrc;
  liked?: boolean;
  alt?: string;
};

export type PhotoListResponse = {
  page: number;
  per_page: number;
  photos: Photo[];
  total_results: number;
  next_page?: string;
  prev_page?: string;
};

export type VideoFile = {
  id: number;
  quality: string;
  file_type: string;
  width?: number | null;
  height?: number | null;
  fps?: number;
  link: string;
};

export type Video = {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: { id: number; name: string; url: string };
  video_files: VideoFile[];
  video_pictures?: Array<{ id: number; nr: number; picture: string }>;
};

const PEXELS_BASE = 'https://api.pexels.com';
const PEXELS_V1 = `${PEXELS_BASE}/v1`;
const PEXELS_VIDEOS = `${PEXELS_BASE}/videos`;
// EXPO_PUBLIC_ prefix required for Expo SDK 49+ to bundle env vars at build time
const PEXELS_KEY = process.env.EXPO_PUBLIC_PEXELS_API_KEY || '';

async function pexelsFetch<T = any>(url: string, init: RequestInit = {}) {
  if (!PEXELS_KEY) throw new Error('PEXELS_API_KEY environment variable is not set');
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', PEXELS_KEY);
  headers.set('Accept', 'application/json');

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Pexels API error ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function searchPhotos(query: string, page = 1, perPage = 15) {
  const qs = new URLSearchParams({ query, page: String(page), per_page: String(perPage) });
  return pexelsFetch<PhotoListResponse>(`${PEXELS_V1}/search?${qs.toString()}`);
}

export async function curatedPhotos(page = 1, perPage = 15) {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  return pexelsFetch<PhotoListResponse>(`${PEXELS_V1}/curated?${qs.toString()}`);
}

export async function getPhotoById(id: number) {
  return pexelsFetch<Photo>(`${PEXELS_V1}/photos/${id}`);
}

export async function searchVideos(query: string, page = 1, perPage = 15) {
  const qs = new URLSearchParams({ query, page: String(page), per_page: String(perPage) });
  return pexelsFetch<{ page: number; per_page: number; total_results: number; videos: Video[] }>(
    `${PEXELS_VIDEOS}/search?${qs.toString()}`
  );
}

export async function getVideoById(id: number) {
  return pexelsFetch<Video>(`${PEXELS_VIDEOS}/videos/${id}`);
}

const PexelsApi = {
  searchPhotos,
  curatedPhotos,
  getPhotoById,
  searchVideos,
  getVideoById,
  pexelsFetch,
};

export default PexelsApi;
