// app/dev/widget-snapshots.tsx
//
// Phase H — debug / regression screen. Lists every widget in the registry,
// renders all sizes inline, and exposes a "Save all" button that triggers a
// full snapshot pump and lists the resulting on-disk paths. Use this to
// visually compare the gallery preview against the snapshot PNG (which is
// what the home screen renders after Phase C).

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PixelRatio,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import { WIDGET_REGISTRY, definitionsForPlatform, type WidgetDefinition } from '@/lib/widgets/registry';
import {
  snapshotName,
  snapshotPath,
  snapshotInventory,
  resolveWidgetTheme,
  type ResolvedWidgetTheme,
  type SnapshotInventoryEntry,
} from '@/lib/widgets/snapshot';
import { pumpFromCurrentState, clearSnapshotCache } from '@/lib/widgets/pump';
import { useColors } from '@/hooks/use-colors';
import { useSettings } from '@/contexts/SettingsContext';
import type { PreviewSize } from '@/components/widgets/previews/shared';
import { getSizeDims } from '@/components/widgets/previews/shared';

interface SnapshotEntry {
  id: string;
  size: PreviewSize;
  theme: ResolvedWidgetTheme;
  path: string | null;
}

export default function WidgetSnapshotsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { settings } = useSettings();
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : null;
  const defs: WidgetDefinition[] = platform ? definitionsForPlatform(platform) : WIDGET_REGISTRY;
  const [busy, setBusy] = React.useState(false);
  const [entries, setEntries] = React.useState<SnapshotEntry[]>([]);
  const [inventory, setInventory] = React.useState<SnapshotInventoryEntry[] | null>(null);
  const [log, setLog] = React.useState<string>('');

  // Show the path for the user's currently-active resolved theme. The pump
  // generates all 7 variants — switch app theme to inspect another.
  const activeTheme = React.useMemo(
    () => resolveWidgetTheme(settings?.display?.widgetTheme),
    [settings?.display?.widgetTheme],
  );

  const refreshPaths = React.useCallback(async () => {
    const out: SnapshotEntry[] = [];
    for (const def of defs) {
      for (const size of def.sizes) {
        const path = await snapshotPath(def.id, size, activeTheme);
        out.push({ id: def.id, size, theme: activeTheme, path });
      }
    }
    setEntries(out);
  }, [defs, activeTheme]);

  React.useEffect(() => { refreshPaths(); }, [refreshPaths]);

  const onRunPump = async () => {
    setBusy(true);
    setLog('Pumping…');
    try {
      const r = await pumpFromCurrentState({ force: true });
      setLog(JSON.stringify(r ?? { reason: 'no-context' }, null, 2));
      await refreshPaths();
    } catch (e) {
      setLog(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const onClearCache = async () => {
    await clearSnapshotCache();
    setLog('Snapshot hash cleared. Tap "Run pump" to regenerate.');
  };

  const onInventory = async () => {
    setBusy(true);
    setLog('Inventorying…');
    try {
      const inv = await snapshotInventory();
      setInventory(inv);
      const missing = inv.filter((e) => !e.exists).length;
      const bad = inv.filter((e) => e.exists && !e.ok).length;
      setLog(`Inventory: ${inv.length} entries, ${missing} missing, ${bad} failed verification.`);
    } catch (e) {
      setLog(`Error: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: 'Widget Snapshots (dev)' }} />
      <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.btn, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text }}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRunPump} disabled={busy} style={[styles.btn, { backgroundColor: colors.primary, opacity: busy ? 0.5 : 1 }]}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>{busy ? 'Working…' : 'Run pump (force)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onInventory} disabled={busy} style={[styles.btn, { backgroundColor: colors.card, opacity: busy ? 0.5 : 1 }]}>
              <Text style={{ color: colors.text }}>Inventory</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClearCache} style={[styles.btn, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text }}>Clear cache</Text>
            </TouchableOpacity>
          </View>

          {inventory ? (
            <View style={[styles.log, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>
                Inventory ({inventory.length} entries)
              </Text>
              {inventory.map((e) => {
                const status = !e.exists
                  ? '✗ missing'
                  : e.ok
                  ? `✓ ${e.bytes ?? '?'}b ${e.width ?? '?'}×${e.height ?? '?'}`
                  : `! ${e.notes.join(',')}`;
                const color = !e.exists ? '#c0392b' : e.ok ? '#2e7d32' : '#e67e22';
                return (
                  <Text
                    key={`${e.id}_${e.size}_${e.theme}`}
                    style={{
                      color,
                      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                      fontSize: 10,
                    }}
                  >
                    {`${e.id}_${e.size}_${e.theme}  ${status}`}
                  </Text>
                );
              })}
            </View>
          ) : null}

          <Text style={[styles.meta, { color: colors.textLight }]}>
            Registry: {defs.length} widgets · Platform: {Platform.OS} · Scale: {PixelRatio.get()}
          </Text>

          {log ? (
            <View style={[styles.log, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11 }}>
                {log}
              </Text>
            </View>
          ) : null}

          <View style={styles.list}>
            {defs.map((def) => (
              <View key={def.id} style={[styles.section, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    {def.titleAr} · {def.titleEn}
                  </Text>
                  <Text style={{ color: colors.textLight, fontSize: 11 }}>
                    id={def.id} · sizes={def.sizes.join(',')} · {def.isPremium ? 'PREMIUM' : 'FREE'}
                  </Text>
                </View>
                {def.sizes.map((size) => {
                  const dims = getSizeDims(size);
                  const Preview = def.Preview as React.FC<{ size: PreviewSize; language?: 'ar' | 'en' }>;
                  const entry = entries.find((e) => e.id === def.id && e.size === size);
                  return (
                    <View key={size} style={styles.previewBlock}>
                      <Text style={{ color: colors.textLight, fontSize: 11, marginBottom: 4 }}>
                        {snapshotName(def.id, size, activeTheme)} · {dims.width}×{dims.height}
                      </Text>
                      <View style={{ width: dims.width, height: dims.height }}>
                        <Preview size={size} language={(def.forcedLanguage ?? 'ar') as any} />
                      </View>
                      <Text style={{ color: colors.textLight, fontSize: 10, marginTop: 4 }} numberOfLines={1}>
                        {entry?.path ?? '(no snapshot path resolved yet)'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => Alert.alert('Hint', 'Snapshots regenerate automatically on app foreground / settings change. Use "Run pump (force)" only when debugging.')}
            style={[styles.btn, { backgroundColor: colors.card, alignSelf: 'center', marginVertical: 24 }]}
          >
            <Text style={{ color: colors.text }}>How does this work?</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 64 },
  headerRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  meta: { fontSize: 12, marginBottom: 12 },
  log: { padding: 10, borderRadius: 8, marginBottom: 12 },
  list: { gap: 14 },
  section: { padding: 12, borderRadius: 14 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600' },
  previewBlock: { alignItems: 'center', marginBottom: 14 },
});
