# App Icon Source (`assets/icon-src/`)

**Single source of truth for every app icon** (default + seasonal). Edit the
masters here, run the build, and the safe-zone-padded launcher assets under
`assets/images/icons/**` regenerate automatically — so icons never get cut on
circle / squircle / rounded launcher masks.

## Why this exists

Launchers mask icons into circles, squircles and rounded squares. Seasonal
icons are shipped by `expo-dynamic-app-icon` as **non-adaptive legacy bitmaps**,
which launchers crop directly — so any artwork touching the edges gets sliced.
The fix: keep all critical content inside a centered **safe zone** and let only
the background bleed into the croppable margin.

## Safe-zone standard (1024×1024 master)

| Guide | Size | Rule |
|---|---|---|
| Canvas | 1024 (full bleed) | Background only. Gets cropped. |
| 72dp mask | 682 px | Visible on most masks. Secondary art. |
| **66dp safe circle** | **Ø624 px** | **ALL critical content stays inside this circle.** |

Open `_TEMPLATE.svg` (guides) or copy `_DUMMY.png` to see the zones.

## Files

- `_TEMPLATE.svg` — editable design template with guide rings. **Hide/delete the
  `GUIDES` layer before exporting** (or just paint your full-bleed background).
- `_DUMMY.png` — rendered placeholder showing the safe zone (drop-in test icon).
- `icons.config.mjs` — manifest: which master → which output(s), per-icon options.
- `<key>.png` — master artwork per icon key (`default_ar`, `default_en`,
  `ramadan`, `hajj`, `mawlid`, `eid_fitr`, `eid_adha`, `hijri_new_year`).
- `default_monochrome.png` — silhouette master for the Android themed (Material You) icon.

## Build

```bash
pnpm icons:build            # regenerate assets/images/icons/**
npx expo prebuild --clean   # propagate to iOS DynamicAppIcons + Android mipmaps
```

`assets/images/icons/**` is **generated — do not hand-edit it.** Edit masters here.

The build uses each master **as-is (full bleed)** — no inset, no blur. So **you**
are responsible for the safe zone when you design the master:
- Fill the **background to all four edges** (it will be cropped by launcher masks).
- Keep all **critical content inside the green safe circle** (Ø624).
The build only normalises size/format: flat icons are written no-alpha
(store-safe), and the Android adaptive foreground + monochrome are generated
from the default master.

## Edit an existing icon

1. Replace `assets/icon-src/<key>.png` (keep the same filename, 1024×1024,
   critical content inside the green safe circle).
2. `pnpm icons:build && npx expo prebuild --clean`, then rebuild the app.

## Add a NEW seasonal icon (checklist)

1. Add transparent/flat master `assets/icon-src/<key>.png` + an entry in
   `icons.config.mjs` (`flat: ['seasonal/<key>.png']`).
2. `pnpm icons:build`.
3. Register `<key>` in `app.json` under the `expo-dynamic-app-icon` plugin.
4. Add `<key>` to `SeasonalIconKey` + `DEFAULT_SEASONAL_MAP` in
   `lib/app-icon-manager.ts` (and a date range in `lib/seasonal-content.ts` if
   it's a new season).
5. Add it to the `ICONS` / `SEASONS` arrays in
   `admin-panel/src/pages/AppIconManager.tsx` (admin only maps/schedules icons;
   the bitmaps ship in the binary, not Firestore — no upload needed).
6. `npx expo prebuild --clean` and rebuild.

> Dynamic/alternate icons require a real EAS dev/prod build — they do **not**
> work in Expo Go.
