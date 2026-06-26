// lib/app-icon-resolver.ts
//
// SINGLE SOURCE OF TRUTH for "which app icon is effective right now and why".
//
// This module is intentionally PURE: no react-native, no expo, no firebase, no
// AsyncStorage imports. That lets BOTH the mobile app (`lib/app-icon-manager.ts`)
// and the admin panel (`admin-panel/src/pages/AppIconManager.tsx`, via the
// `@app-lib/app-icon-resolver` alias) import the exact same priority logic — so
// the panel's preview can never silently drift from what the app actually does.
//
// ─── Priority (highest wins) ────────────────────────────────────────────────
//   1. Active manual SCHEDULE  — enabled, now ∈ [startAt,endAt], platform &
//                                app-version match, and its icon is usable.
//                                Among overlaps the most-recently-created wins.
//   2. Legacy MANUAL mode      — mode==='manual' && manualIcon (indefinite).
//   3. SEASONAL auto           — mode==='auto' + active enabled season mapped to
//                                a non-default usable icon (season priority among
//                                overlaps).
//   4. Language DEFAULT        — default_ar / default_en.
//
// `mode==='language_only'` still lets an explicit schedule win (deliberate,
// time-boxed admin action), then falls back to the language default. Any icon
// with `iconLibrary[key].enabled === false` is skipped and resolution falls
// through, so disabling an icon can never strand the app on a missing variant.
//
// ─── Season detection caveat ────────────────────────────────────────────────
// Season windows are evaluated against a PURE tabular Hijri date (offset 0). The
// app applies a per-user Hijri offset (`@hijri_system_offset` + user adjustment)
// that the panel cannot know, so the app passes its own offset-corrected season
// via `ctx.currentSeason`; the panel omits it and uses the tabular approximation.
// The PRIORITY logic above is fully shared either way.

// ─── Types ──────────────────────────────────────────────────────────────────

export type SeasonalIconKey =
  | 'default_ar'
  | 'default_en'
  | 'ramadan'
  | 'hajj'
  | 'mawlid'
  | 'eid_fitr'
  | 'eid_adha'
  | 'hijri_new_year';

export type SeasonName =
  | 'ramadan'
  | 'hajj'
  | 'mawlid'
  | 'eid_fitr'
  | 'eid_adha'
  | 'dhul_hijjah'
  | 'hijri_new_year'
  | 'ashura'
  | 'muharram'
  | 'rajab'
  | 'shaban';

export type IconMode = 'auto' | 'manual' | 'language_only';

export type IconPlatform = 'ios' | 'android';

export type LocalizedText = Partial<Record<string, string>>;
export type SeasonalLocalizedText = Partial<Record<SeasonName, LocalizedText>>;

export interface MonthDay {
  month: number;
  day: number;
}

/** A time-boxed manual override pushed from the admin panel. */
export interface IconSchedule {
  id: string;
  iconKey: SeasonalIconKey;
  /** ISO; null = active immediately (no lower bound). */
  startAt: string | null;
  /** ISO; null = until-further-notice (no upper bound). */
  endAt: string | null;
  /** Platforms this schedule applies to. Empty/undefined = both. */
  platforms?: IconPlatform[];
  /** Inclusive app-version bounds (e.g. "2.3.0"). null = unbounded. */
  minAppVersion?: string | null;
  maxAppVersion?: string | null;
  enabled: boolean;
  note?: string;
  createdAt: string;
  createdBy?: string;
}

/** Per-icon library metadata (admin-managed; the real bitmap is build-bundled). */
export interface IconMeta {
  enabled: boolean;
  displayNameAr?: string;
  displayNameEn?: string;
  platforms: IconPlatform[];
  /** Admin-uploaded preview thumbnail (Storage). Display-only, never the launcher image. */
  previewUrl?: string | null;
  lastUsedAt?: string | null;
  kind: 'default' | 'seasonal' | 'event';
}

export interface AppIconsConfig {
  version: number;
  alertEnabled: boolean;
  // Legacy AR/EN alert fields (kept for backward compat with older app builds).
  alertTitle: string;
  alertMessage: string;
  alertTitleEn: string;
  alertMessageEn: string;
  // Multilingual alert maps (preferred).
  alertTitleI18n?: LocalizedText;
  alertMessageI18n?: LocalizedText;
  seasonalAlertTitleI18n?: SeasonalLocalizedText;
  seasonalAlertMessageI18n?: SeasonalLocalizedText;
  // Seasonal switching.
  mode?: IconMode;
  manualIcon?: SeasonalIconKey | null;
  seasonalMap?: Partial<Record<SeasonName, SeasonalIconKey>>;
  enabledSeasons?: SeasonName[];
  // ─── New control-center fields (all optional, additive, backward-compatible) ──
  schedules?: IconSchedule[];
  iconLibrary?: Partial<Record<SeasonalIconKey, IconMeta>>;
  // NOTE: season WINDOWS (start/end dates) are owned by `seasons_metadata`
  // (admin Seasonal page) — NOT here — so there is a single source of truth for
  // when a season is active. This config only owns the season→icon MAPPING
  // (`seasonalMap`) and the enabled set (`enabledSeasons`).
  /** ISO; set only when an announce (version bump) save happens. */
  lastPublishedAt?: string;
  /** Monotonic "config changed at all" counter (≠ `version`, which gates the user alert). */
  configRevision?: number;
  updatedAt?: string;
}

export type IconSource = 'schedule' | 'manual' | 'seasonal' | 'default';

export interface EffectiveIconState {
  iconKey: SeasonalIconKey;
  source: IconSource;
  /** Human-readable Arabic reason for the current selection. */
  reason: string;
  scope: {
    platforms: IconPlatform[]; // [] means "all"
    minAppVersion?: string | null;
    maxAppVersion?: string | null;
  };
  /** ISO when the current selection began (schedule start). null otherwise. */
  startedAt?: string | null;
  /** ISO when the current selection ends (schedule end). null = indefinite. */
  expiresAt?: string | null;
  /** Set when source==='seasonal'. */
  season?: SeasonName | null;
  /** Approximate days remaining in the active season (seasonal source only). */
  seasonDaysRemaining?: number | null;
  activeScheduleId?: string | null;
  /** Soonest future enabled schedule that will start (absolute time). */
  nextSchedule?: { id: string; iconKey: SeasonalIconKey; startAt: string } | null;
}

export interface ResolveContext {
  now: Date;
  platform: IconPlatform;
  /** App version string (e.g. Constants.expoConfig.version). Used for targeting. */
  appVersion?: string | null;
  /** 'ar' | 'en' | ... — only Arabic maps to default_ar; all others → default_en. */
  language: string;
  /**
   * The app supplies its own per-user (offset-corrected) season here so the app
   * stays exactly correct. The panel omits it → the resolver computes a tabular
   * approximation from `now`.
   */
  currentSeason?: SeasonName | null;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const ICON_KEYS: SeasonalIconKey[] = [
  'default_ar',
  'default_en',
  'ramadan',
  'hajj',
  'mawlid',
  'eid_fitr',
  'eid_adha',
  'hijri_new_year',
];

/** Icon "kind" for the library view. */
export const ICON_KIND: Record<SeasonalIconKey, 'default' | 'seasonal' | 'event'> = {
  default_ar: 'default',
  default_en: 'default',
  ramadan: 'seasonal',
  hajj: 'seasonal',
  mawlid: 'event',
  eid_fitr: 'event',
  eid_adha: 'event',
  hijri_new_year: 'event',
};

// Retired icon keys → replacement. `dhul_hijjah` was merged into the single
// `hajj` icon for the first 9 days of Dhul-Hijjah.
export const LEGACY_ICON_ALIASES: Record<string, SeasonalIconKey> = {
  dhul_hijjah: 'hajj',
};

export function normalizeIconKey(key: string | null | undefined): SeasonalIconKey {
  if (!key) return 'default_ar';
  return (LEGACY_ICON_ALIASES[key] ?? key) as SeasonalIconKey;
}

export const DEFAULT_SEASONAL_MAP: Record<SeasonName, SeasonalIconKey> = {
  ramadan: 'ramadan',
  hajj: 'hajj',
  mawlid: 'mawlid',
  eid_fitr: 'eid_fitr',
  eid_adha: 'eid_adha',
  // Days 1–9 of Dhul-Hijjah show the single Hajj icon; day 10 flips to eid_adha
  // via its higher priority.
  dhul_hijjah: 'hajj',
  hijri_new_year: 'hijri_new_year',
  // Months without dedicated icons fall back to the language default.
  ashura: 'default_ar',
  muharram: 'default_ar',
  rajab: 'default_ar',
  shaban: 'default_ar',
};

export const DEFAULT_ENABLED_SEASONS: SeasonName[] = [
  'ramadan',
  'hajj',
  'mawlid',
  'eid_fitr',
  'eid_adha',
  'dhul_hijjah',
  'hijri_new_year',
];

// Priority order for overlapping seasons (most specific event wins).
// Keep identical to SEASON_PRIORITY in lib/seasonal-content.ts.
export const SEASON_PRIORITY: SeasonName[] = [
  'eid_fitr',
  'eid_adha',
  'mawlid',
  'ashura',
  'ramadan',
  'dhul_hijjah',
  'hajj',
  'hijri_new_year',
  'muharram',
  'rajab',
  'shaban',
];

export const SEASON_RANGES: Record<SeasonName, { start: MonthDay; end: MonthDay }> = {
  ramadan: { start: { month: 9, day: 1 }, end: { month: 9, day: 30 } },
  hajj: { start: { month: 12, day: 8 }, end: { month: 12, day: 13 } },
  mawlid: { start: { month: 3, day: 12 }, end: { month: 3, day: 12 } },
  eid_fitr: { start: { month: 10, day: 1 }, end: { month: 10, day: 3 } },
  eid_adha: { start: { month: 12, day: 10 }, end: { month: 12, day: 13 } },
  dhul_hijjah: { start: { month: 12, day: 1 }, end: { month: 12, day: 9 } },
  hijri_new_year: { start: { month: 1, day: 1 }, end: { month: 1, day: 3 } },
  ashura: { start: { month: 1, day: 9 }, end: { month: 1, day: 10 } },
  muharram: { start: { month: 1, day: 1 }, end: { month: 1, day: 10 } },
  rajab: { start: { month: 7, day: 1 }, end: { month: 7, day: 30 } },
  shaban: { start: { month: 8, day: 1 }, end: { month: 8, day: 30 } },
};

export const SEASON_NAMES_AR: Record<SeasonName, string> = {
  ramadan: 'رمضان',
  hajj: 'موسم الحج',
  mawlid: 'المولد النبوي',
  eid_fitr: 'عيد الفطر',
  eid_adha: 'عيد الأضحى',
  dhul_hijjah: 'العشر الأوائل من ذي الحجة',
  hijri_new_year: 'رأس السنة الهجرية',
  ashura: 'عاشوراء',
  muharram: 'محرم',
  rajab: 'رجب',
  shaban: 'شعبان',
};

export const HIJRI_MONTHS_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذي الحجة',
];

// ─── Pure tabular Hijri conversion (offset 0) ────────────────────────────────

function isHijriLeapYear(year: number): boolean {
  return (11 * year + 14) % 30 < 11;
}

function getHijriMonthDays(year: number, month: number): number {
  if (month % 2 === 1) return 30;
  if (month === 12) return isHijriLeapYear(year) ? 30 : 29;
  return 29;
}

export interface HijriParts {
  year: number;
  month: number;
  day: number;
  label: string;
}

/** Convert a Gregorian Date to a tabular (Kuwaiti-algorithm) Hijri date. */
export function hijriFromGregorian(date: Date = new Date()): HijriParts {
  const g = date.getFullYear();
  const m = date.getMonth() + 1;
  const gd = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const y = g + 4800 - a;
  const mo = m + 12 * a - 3;
  const julianDay =
    gd +
    Math.floor((153 * mo + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  const l = julianDay - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 =
    l2 -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;

  let year = 30 * n + j - 30;
  let month = Math.floor((24 * (l3 - 1)) / 709);
  let day = l3 - Math.floor((709 * month) / 24);
  const maxDays = getHijriMonthDays(year, month);
  if (day > maxDays) {
    day -= maxDays;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return { year, month, day, label: `${day} ${HIJRI_MONTHS_AR[month - 1]} ${year}` };
}

// ─── Season window helpers ───────────────────────────────────────────────────

/** Linearized day-of-year using the 30-day-month approximation (matches seasonal-content). */
function linearDay(d: MonthDay): number {
  return (d.month - 1) * 30 + d.day;
}

function isDateInRange(current: MonthDay, start: MonthDay, end: MonthDay): boolean {
  const c = linearDay(current);
  const s = linearDay(start);
  const e = linearDay(end);
  // Handle ranges that wrap across the Hijri year boundary.
  if (s > e) return c >= s || c <= e;
  return c >= s && c <= e;
}

/**
 * Options for season-window computation. `ranges` lets the caller feed the
 * AUTHORITATIVE windows from `seasons_metadata` (admin Seasonal page) so the
 * panel preview matches the app exactly; it defaults to the built-in defaults.
 */
export interface SeasonResolveOptions {
  ranges?: Partial<Record<SeasonName, { start: MonthDay; end: MonthDay }>>;
  enabledSeasons?: SeasonName[];
}

function rangeFor(
  season: SeasonName,
  opts?: SeasonResolveOptions
): { start: MonthDay; end: MonthDay } {
  return opts?.ranges?.[season] ?? SEASON_RANGES[season];
}

export interface ActiveSeasonInfo {
  season: SeasonName;
  range: { start: MonthDay; end: MonthDay };
  totalDays: number;
  currentDay: number;
  daysRemaining: number;
}

/**
 * The highest-priority active season for a given Gregorian date. Season windows
 * come from `opts.ranges` (authoritative `seasons_metadata`) or the defaults —
 * NEVER from the appIcons config, which only owns the season→icon mapping.
 */
export function getActiveSeason(
  date: Date,
  opts?: SeasonResolveOptions
): ActiveSeasonInfo | null {
  const hijri = hijriFromGregorian(date);
  const current: MonthDay = { month: hijri.month, day: hijri.day };
  const enabled = opts?.enabledSeasons ?? DEFAULT_ENABLED_SEASONS;

  const season = SEASON_PRIORITY.find((s) => {
    if (!enabled.includes(s)) return false;
    const r = rangeFor(s, opts);
    return isDateInRange(current, r.start, r.end);
  });
  if (!season) return null;

  const range = rangeFor(season, opts);
  const totalDays = linearDay(range.end) - linearDay(range.start) + 1;
  const currentDay = linearDay(current) - linearDay(range.start) + 1;
  return {
    season,
    range,
    totalDays,
    currentDay,
    daysRemaining: Math.max(0, totalDays - currentDay),
  };
}

/** The nearest upcoming season (by Hijri day-count), ignoring the active one. */
export function getUpcomingSeason(
  date: Date,
  opts?: SeasonResolveOptions
): { season: SeasonName; daysUntil: number } | null {
  const hijri = hijriFromGregorian(date);
  const currentDays = linearDay({ month: hijri.month, day: hijri.day });
  const enabled = opts?.enabledSeasons ?? DEFAULT_ENABLED_SEASONS;

  let best: { season: SeasonName; daysUntil: number } | null = null;
  (Object.keys(SEASON_RANGES) as SeasonName[]).forEach((season) => {
    if (!enabled.includes(season)) return;
    let daysUntil = linearDay(rangeFor(season, opts).start) - currentDays;
    if (daysUntil < 0) daysUntil += 354; // approx Hijri year length
    if (daysUntil === 0) return; // currently active
    if (!best || daysUntil < best.daysUntil) best = { season, daysUntil };
  });
  return best;
}

// ─── Targeting helpers ────────────────────────────────────────────────────────

/** Numeric semver-ish compare. Missing parts treated as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

function platformMatches(platforms: IconPlatform[] | undefined, platform: IconPlatform): boolean {
  if (!platforms || platforms.length === 0) return true;
  return platforms.includes(platform);
}

function versionMatches(
  schedule: Pick<IconSchedule, 'minAppVersion' | 'maxAppVersion'>,
  appVersion: string | null | undefined
): boolean {
  if (!appVersion) return true; // unknown version → don't exclude
  if (schedule.minAppVersion && compareVersions(appVersion, schedule.minAppVersion) < 0) return false;
  if (schedule.maxAppVersion && compareVersions(appVersion, schedule.maxAppVersion) > 0) return false;
  return true;
}

function withinWindow(schedule: Pick<IconSchedule, 'startAt' | 'endAt'>, now: Date): boolean {
  const t = now.getTime();
  if (schedule.startAt && t < Date.parse(schedule.startAt)) return false;
  if (schedule.endAt && t > Date.parse(schedule.endAt)) return false;
  return true;
}

/** True when an icon may be selected (exists in the bundle + not disabled in the library). */
export function isIconUsable(
  key: SeasonalIconKey,
  config: AppIconsConfig | null,
  platform: IconPlatform
): boolean {
  const meta = config?.iconLibrary?.[key];
  if (!meta) return true; // unmanaged → usable (backward-compat default)
  if (meta.enabled === false) return false;
  if (meta.platforms && meta.platforms.length > 0 && !meta.platforms.includes(platform)) return false;
  return true;
}

function nextUpcomingSchedule(
  config: AppIconsConfig | null,
  now: Date,
  platform: IconPlatform,
  appVersion: string | null | undefined
): EffectiveIconState['nextSchedule'] {
  const t = now.getTime();
  const future = (config?.schedules ?? [])
    .filter((s) => s.enabled && s.startAt && Date.parse(s.startAt) > t)
    .filter((s) => platformMatches(s.platforms, platform))
    .filter((s) => versionMatches(s, appVersion))
    .filter((s) => isIconUsable(normalizeIconKey(s.iconKey), config, platform))
    .sort((a, b) => Date.parse(a.startAt as string) - Date.parse(b.startAt as string));
  const s = future[0];
  return s ? { id: s.id, iconKey: normalizeIconKey(s.iconKey), startAt: s.startAt as string } : null;
}

function languageDefault(language: string): SeasonalIconKey {
  return language === 'ar' ? 'default_ar' : 'default_en';
}

// ─── The centerpiece ──────────────────────────────────────────────────────────

/**
 * Resolve the effective icon + full explanation. Used identically by the app
 * (per-user season via ctx.currentSeason) and the admin panel (tabular season).
 */
export function computeIconState(
  config: AppIconsConfig | null,
  ctx: ResolveContext
): EffectiveIconState {
  const { now, platform, appVersion, language } = ctx;
  const langDefault = languageDefault(language);
  const next = nextUpcomingSchedule(config, now, platform, appVersion);

  // 1) Active manual schedule (highest priority, even under language_only).
  const activeSchedules = (config?.schedules ?? [])
    .filter((s) => s.enabled)
    .filter((s) => withinWindow(s, now))
    .filter((s) => platformMatches(s.platforms, platform))
    .filter((s) => versionMatches(s, appVersion))
    .filter((s) => isIconUsable(normalizeIconKey(s.iconKey), config, platform))
    .sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'));

  const active = activeSchedules[0];
  if (active) {
    return {
      iconKey: normalizeIconKey(active.iconKey),
      source: 'schedule',
      reason: active.endAt
        ? 'تبديل يدوي مجدول نشط'
        : 'تبديل يدوي نشط (حتى إشعار آخر)',
      scope: {
        platforms: active.platforms ?? [],
        minAppVersion: active.minAppVersion ?? null,
        maxAppVersion: active.maxAppVersion ?? null,
      },
      startedAt: active.startAt ?? null,
      expiresAt: active.endAt ?? null,
      activeScheduleId: active.id,
      nextSchedule: next,
    };
  }

  const mode: IconMode = config?.mode ?? 'auto';

  // 2) Legacy indefinite manual mode.
  if (mode === 'manual' && config?.manualIcon) {
    const key = normalizeIconKey(config.manualIcon);
    if (isIconUsable(key, config, platform)) {
      return {
        iconKey: key,
        source: 'manual',
        reason: 'override يدوي دائم (وضع يدوي)',
        scope: { platforms: [] },
        expiresAt: null,
        nextSchedule: next,
      };
    }
  }

  // language_only short-circuits to the language default (schedules already handled).
  if (mode === 'language_only') {
    return {
      iconKey: langDefault,
      source: 'default',
      reason: 'حسب اللغة فقط',
      scope: { platforms: [] },
      nextSchedule: next,
    };
  }

  // 3) Seasonal auto.
  if (mode === 'auto') {
    // Prefer the app-supplied (offset-corrected) season; else compute tabular.
    let season: SeasonName | null = ctx.currentSeason ?? null;
    let daysRemaining: number | null = null;
    const enabled = config?.enabledSeasons ?? DEFAULT_ENABLED_SEASONS;
    if (season) {
      if (!enabled.includes(season)) season = null;
    } else if (ctx.currentSeason === undefined) {
      const info = getActiveSeason(now, { enabledSeasons: enabled });
      if (info) {
        season = info.season;
        daysRemaining = info.daysRemaining;
      }
    }

    if (season) {
      const map = { ...DEFAULT_SEASONAL_MAP, ...(config?.seasonalMap ?? {}) };
      const mapped = normalizeIconKey(map[season]);
      if (
        mapped !== 'default_ar' &&
        mapped !== 'default_en' &&
        isIconUsable(mapped, config, platform)
      ) {
        return {
          iconKey: mapped,
          source: 'seasonal',
          reason: `موسم ${SEASON_NAMES_AR[season]} نشط`,
          scope: { platforms: [] },
          season,
          seasonDaysRemaining: daysRemaining,
          expiresAt: null,
          nextSchedule: next,
        };
      }
    }
  }

  // 4) Language default.
  return {
    iconKey: langDefault,
    source: 'default',
    reason: 'الأيقونة الافتراضية',
    scope: { platforms: [] },
    nextSchedule: next,
  };
}

/** Convenience: just the resolved icon key (mirrors the old resolveActiveIcon). */
export function resolveEffectiveIconKey(
  config: AppIconsConfig | null,
  ctx: ResolveContext
): SeasonalIconKey {
  return computeIconState(config, ctx).iconKey;
}

/** Choose the highest-priority active season when multiple overlap. */
export function pickPrioritySeason(activeSeasons: SeasonName[]): SeasonName | null {
  for (const candidate of SEASON_PRIORITY) {
    if (activeSeasons.includes(candidate)) return candidate;
  }
  return null;
}
