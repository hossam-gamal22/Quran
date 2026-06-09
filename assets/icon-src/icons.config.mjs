// =============================================================================
// App-icon source manifest — single source of truth for the icon build.
//
// Each entry describes ONE master in this folder (assets/icon-src/) and which
// launcher asset(s) it produces under assets/images/icons/. Masters are used
// AS-IS (full bleed): you author each icon with the background already filled
// and the critical content kept inside the safe circle (see _TEMPLATE.svg).
//
// Edit a master PNG here (same filename) -> run `pnpm icons:build` -> the
// launcher assets regenerate. Then `npx expo prebuild --clean` propagates them
// to iOS DynamicAppIcons + Android mipmaps.
// =============================================================================

/** Canonical icon canvas. Author every master at this size. */
export const CANVAS = 1024;

/**
 * @typedef {Object} IconEntry
 * @property {string}   key   canonical snake_case icon key
 * @property {string}   src   master filename in assets/icon-src/
 * @property {string[]} flat  output paths (relative to assets/images/icons/), no-alpha
 */

/** @type {IconEntry[]} */
export const ICONS = [
  // ---- Default / language icons ----
  { key: 'default_ar', src: 'default_ar.png', flat: ['icon.png'] },     // iOS primary + web base
  { key: 'default_en', src: 'default_en.png', flat: ['icon_en.png'] },  // expo-dynamic-app-icon `app_icon_english`

  // ---- Seasonal icons ----
  { key: 'ramadan',        src: 'ramadan.png',        flat: ['seasonal/ramadan.png'] },
  { key: 'hajj',           src: 'hajj.png',           flat: ['seasonal/hajj.png'] },
  { key: 'mawlid',         src: 'mawlid.png',         flat: ['seasonal/mawlid.png'] },
  { key: 'eid_fitr',       src: 'eid_fitr.png',       flat: ['seasonal/eid_fitr.png'] },
  { key: 'eid_adha',       src: 'eid_adha.png',       flat: ['seasonal/eid_adha.png'] },
  { key: 'hijri_new_year', src: 'hijri_new_year.png', flat: ['seasonal/hijri_new_year.png'] },
];

/**
 * Android default adaptive-icon layers, generated from the default_ar master.
 * The background layer is a solid colour declared in app.json as
 * `android.adaptiveIcon.backgroundColor` (kept in sync with `backgroundColor`
 * below) — it sits behind the foreground as a fallback.
 */
export const ANDROID_ADAPTIVE = {
  src: 'default_ar.png',
  foreground: 'android-icon-foreground.png',
  monochrome: { src: 'default_monochrome.png', out: 'android-icon-monochrome.png' },
  // Mirror of app.json android.adaptiveIcon.backgroundColor.
  backgroundColor: '#11161c',
};
