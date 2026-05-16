// app/dev/bake-prayer-widgets.tsx
//
// Dev route that runs the prayer-widget static-PNG bake. Reuses the existing
// `SnapshotHost` infrastructure (already mounted at app root). Press "Start
// Bake" on a simulator or device, wait for the progress bar to fill, then
// copy the printed folder path out of the simulator and run
//   pnpm build-prayer-imagesets <pulled-folder>
// from the project root to assemble the iOS Asset Catalog imagesets.
//
// This route is NOT shipped to users — it lives under app/dev/ which is
// gated by __DEV__ in app/dev/_layout.tsx.

import React from 'react';
import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Share } from 'react-native';
import { bakePrayerStaticPNGs, PRAYER_BAKE_TOTAL, type BakeResult } from '@/lib/widgets/snapshot';

export default function BakePrayerWidgetsScreen() {
  const [running, setRunning] = React.useState(false);
  const [done, setDone] = React.useState(0);
  const [last, setLast] = React.useState<string>('');
  const [result, setResult] = React.useState<BakeResult | null>(null);

  const start = React.useCallback(async () => {
    setRunning(true);
    setDone(0);
    setResult(null);
    try {
      const r = await bakePrayerStaticPNGs((n, _total, name) => {
        setDone(n);
        setLast(name);
      });
      setResult(r);
    } finally {
      setRunning(false);
    }
  }, []);

  const pct = Math.round((done / PRAYER_BAKE_TOTAL) * 100);

  const sharePath = React.useCallback(async () => {
    if (!result) return;
    try {
      await Share.share({
        title: 'Prayer widget bake output',
        message: `Bake output:\n${result.outputDir}\nManifest:\n${result.manifestPath}\nEntries: ${result.entries.length}\nErrors: ${result.errors.length}`,
      });
    } catch {}
  }, [result]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <View style={{ padding: 20, gap: 12 }}>
        <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>
          Prayer Widget Static-PNG Bake
        </Text>
        <Text style={{ color: '#9CA3AF' }}>
          Generates {PRAYER_BAKE_TOTAL} PNGs into the simulator's documents
          folder (5 widget configs × 6 prayer states × 7 themes × 2 languages).
          Static labels, icons, prayer names, and active-row highlights are
          baked in. Numeric time / countdown areas are transparent placeholders.
        </Text>

        <TouchableOpacity
          onPress={start}
          disabled={running}
          style={{
            backgroundColor: running ? '#374151' : '#10B981',
            paddingVertical: 14,
            paddingHorizontal: 18,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          {running ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color="white" />
              <Text style={{ color: 'white', fontWeight: '700' }}>
                Baking… {done} / {PRAYER_BAKE_TOTAL} ({pct}%)
              </Text>
            </View>
          ) : (
            <Text style={{ color: 'white', fontWeight: '700' }}>Start Bake</Text>
          )}
        </TouchableOpacity>

        {running ? (
          <View style={{ marginTop: 8 }}>
            <View style={{ height: 6, backgroundColor: '#1F2937', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#10B981' }} />
            </View>
            <Text numberOfLines={1} style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6 }}>
              Latest: {last}
            </Text>
          </View>
        ) : null}

        {result ? (
          <View style={{ marginTop: 20, padding: 14, backgroundColor: '#111827', borderRadius: 10, gap: 6 }}>
            <Text style={{ color: 'white', fontWeight: '700' }}>Bake complete</Text>
            <Text style={{ color: '#9CA3AF' }}>
              Wrote {result.entries.length} PNGs to:
            </Text>
            <Text selectable style={{ color: '#34D399', fontFamily: 'Menlo', fontSize: 11 }}>
              {result.outputDir}
            </Text>
            <Text style={{ color: '#9CA3AF', marginTop: 6 }}>Manifest:</Text>
            <Text selectable style={{ color: '#34D399', fontFamily: 'Menlo', fontSize: 11 }}>
              {result.manifestPath}
            </Text>
            {result.errors.length ? (
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: '#F87171', fontWeight: '700' }}>
                  Errors ({result.errors.length}):
                </Text>
                {result.errors.slice(0, 10).map((e, i) => (
                  <Text key={i} style={{ color: '#FCA5A5', fontSize: 12 }}>
                    • {e}
                  </Text>
                ))}
                {result.errors.length > 10 ? (
                  <Text style={{ color: '#FCA5A5', fontSize: 12 }}>
                    … and {result.errors.length - 10} more — see manifest.
                  </Text>
                ) : null}
              </View>
            ) : null}
            <TouchableOpacity
              onPress={sharePath}
              style={{
                marginTop: 12,
                backgroundColor: '#3B82F6',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Share output path</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ marginTop: 22, gap: 6 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Next steps</Text>
          <Text style={{ color: '#9CA3AF' }}>
            1. After bake, pull the folder out of the simulator. On macOS:
          </Text>
          <Text selectable style={{ color: '#34D399', fontFamily: 'Menlo', fontSize: 11 }}>
            {'xcrun simctl get_app_container booted com.rooh.almuslim data'}
          </Text>
          <Text style={{ color: '#9CA3AF' }}>
            Append <Text style={{ color: '#FBBF24' }}>/Documents/prayer-static-bake/</Text> to that path.
          </Text>
          <Text style={{ color: '#9CA3AF', marginTop: 6 }}>2. From repo root run:</Text>
          <Text selectable style={{ color: '#34D399', fontFamily: 'Menlo', fontSize: 11 }}>
            pnpm build-prayer-imagesets &lt;pulled-folder&gt;
          </Text>
          <Text style={{ color: '#9CA3AF', marginTop: 6 }}>
            3. Commit <Text style={{ color: '#FBBF24' }}>widgets/ios/Assets.xcassets/PrayerStatic/</Text> and
            re-run <Text style={{ color: '#FBBF24' }}>pnpm expo prebuild --clean --platform ios</Text>.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
