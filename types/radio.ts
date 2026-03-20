// types/radio.ts
// Unified data model for Quran Radio feature

// ==================== Enums & Constants ====================

export type RadioSource = 'mp3quran' | 'radio_browser' | 'curated' | 'admin';

export type RadioCategory =
  | 'quran'        // Full Quran recitation stations
  | 'reciter'      // Single reciter stations
  | 'translation'  // Quran translation in various languages
  | 'tafsir'       // Tafsir / commentary
  | 'islamic'      // General Islamic content
  | 'adhkar'       // Adhkar & dua stations
  | 'seerah'       // Seerah / biography of Prophet
  | 'hadith'       // Hadith narration
  | 'ruqyah'       // Ruqyah stations
  | 'kids'         // Children's Quran stations
  | 'other';       // Uncategorized

// ==================== Core Station Model ====================

export interface RadioStation {
  /** Unique ID: "<source>_<originalId>" e.g. "mp3quran_79" */
  id: string;
  /** Display name (Arabic primary) */
  name: string;
  /** Multi-language names */
  nameTranslations?: Record<string, string>;
  /** Stream URL */
  streamUrl: string;
  /** Resolved/fallback stream URL */
  streamUrlResolved?: string;
  /** Station source */
  source: RadioSource;
  /** Original ID from source API */
  sourceId: string;
  /** Category for filtering */
  category: RadioCategory;
  /** Country code (ISO 3166-1 alpha-2) */
  country?: string;
  /** Language of the station content */
  language?: string;
  /** Favicon / logo URL */
  imageUrl?: string;
  /** Audio codec (mp3, aac, etc.) */
  codec?: string;
  /** Bitrate in kbps */
  bitrate?: number;
  /** Tags for search/filter */
  tags?: string[];
  /** Whether this station is currently live/online */
  isOnline?: boolean;
  /** Last checked timestamp */
  lastChecked?: string;
  /** Vote/popularity count */
  votes?: number;
  /** Admin-set display order (lower = first) */
  order?: number;
  /** Whether admin has hidden this station */
  isHidden?: boolean;
  /** Whether this is a featured/pinned station */
  isFeatured?: boolean;
}

// ==================== API Response Types ====================

/** mp3quran.net /api/v3/radios response */
export interface Mp3QuranRadio {
  id: number;
  name: string;
  url: string;
  recent_date: string;
}

export interface Mp3QuranRadiosResponse {
  radios: Mp3QuranRadio[];
}

/** radio-browser.info API response item */
export interface RadioBrowserStation {
  changeuuid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  language: string;
  codec: string;
  bitrate: number;
  votes: number;
  lastcheckok: number;
  clickcount: number;
}

// ==================== Firestore Admin Types ====================

export interface AdminRadioStation {
  /** Firestore document ID */
  docId?: string;
  /** Station name (Arabic) */
  name: string;
  /** Multi-language names */
  nameTranslations: Record<string, string>;
  /** Stream URL (validated by admin) */
  streamUrl: string;
  /** Category */
  category: RadioCategory;
  /** Country code */
  country?: string;
  /** Language */
  language?: string;
  /** Image URL (uploaded to Firebase Storage) */
  imageUrl?: string;
  /** Tags for search */
  tags: string[];
  /** Display order */
  order: number;
  /** Whether hidden from users */
  isHidden: boolean;
  /** Whether active/visible (admin panel field) */
  isActive?: boolean;
  /** Whether featured/pinned */
  isFeatured: boolean;
  /** Added by admin UID */
  addedBy: string;
  /** Timestamps */
  createdAt: string;
  updatedAt: string;
}

export interface RadioConfig {
  /** Whether radio feature is enabled globally */
  enabled: boolean;
  /** Max stations to fetch from each source */
  maxStationsPerSource: number;
  /** Cache TTL in minutes */
  cacheTTLMinutes: number;
  /** Featured station IDs (shown at top) */
  featuredStationIds: string[];
  /** Hidden station IDs (filtered out) */
  hiddenStationIds: string[];
  /** Default category tab */
  defaultCategory: RadioCategory;
  /** Whether to show radio-browser stations */
  showRadioBrowser: boolean;
  /** Whether to show mp3quran stations */
  showMp3Quran: boolean;
  /** Last updated */
  updatedAt: string;
  updatedBy: string;
}

// ==================== Playback State ====================

export type RadioPlaybackStatus = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error';

export interface RadioPlaybackState {
  status: RadioPlaybackStatus;
  currentStation: RadioStation | null;
  /** Error message if status is 'error' */
  errorMessage?: string;
  /** Volume 0-1 */
  volume: number;
}

// ==================== UI Types ====================

export type RadioTab = 'all' | 'quran' | 'islamic' | 'favorites';

export interface RadioFavorite {
  stationId: string;
  addedAt: string;
}
