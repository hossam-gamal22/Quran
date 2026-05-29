import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TASBIH_PRESETS,
  getTasbihVirtueTitle,
  getOpeningTasbihPreset,
  getDefaultTasbihPresetsForAdmin,
  getDefaultTasbihatForApp,
  resolveTasbihPresetText,
  reconcileAdminTasbihPresets,
  reconcileAppTasbihPresets,
} from '../lib/tasbih-presets';
import { getDefaultTasbihPresets as getAdminPanelDefaultTasbihPresets } from '../admin-panel/src/data/adhkar-defaults';

describe('default tasbih presets', () => {
  it('keeps the bundled app and admin defaults in the same order with matching content', () => {
    const appPresets = getDefaultTasbihatForApp();
    const adminPresets = getDefaultTasbihPresetsForAdmin();

    expect(appPresets).toHaveLength(DEFAULT_TASBIH_PRESETS.length);
    expect(adminPresets).toHaveLength(DEFAULT_TASBIH_PRESETS.length);
    expect(getAdminPanelDefaultTasbihPresets()).toEqual(adminPresets);

    DEFAULT_TASBIH_PRESETS.forEach((preset, index) => {
      expect(appPresets[index]).toMatchObject({
        id: preset.id,
        text: preset.text,
        transliteration: preset.transliteration,
        target: preset.target,
        source: preset.source,
        virtue: preset.virtue,
        reference: preset.reference,
      });
      expect(adminPresets[index]).toMatchObject({
        id: preset.docId,
        text: preset.text,
        transliteration: preset.transliteration,
        target: preset.target,
        source: preset.source,
        virtue: preset.virtue,
        reference: preset.reference,
        order: preset.order,
      });
    });
  });

  it('adds istighfar first and removes the old 100-count duplicate', () => {
    expect(DEFAULT_TASBIH_PRESETS[0]).toMatchObject({
      id: 16,
      docId: 'tasbih_default_16',
      text: 'استغفر الله',
      target: 3,
      order: 0,
    });

    expect(DEFAULT_TASBIH_PRESETS.find(preset => preset.id === 7)).toMatchObject({
      id: 7,
      docId: 'tasbih_default_7',
      text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ',
    });

    expect(DEFAULT_TASBIH_PRESETS.find(preset => preset.id === 9)).toBeUndefined();
    expect(DEFAULT_TASBIH_PRESETS.find(preset => preset.text === 'أَسْتَغْفِرُ اللهَ' && preset.target === 100)).toBeUndefined();

    expect(DEFAULT_TASBIH_PRESETS[DEFAULT_TASBIH_PRESETS.length - 1]).toMatchObject({
      id: 15,
      docId: 'tasbih_default_15',
      text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
    });
  });

  it('reconciles stale admin data so old Firestore presets do not override required updates', () => {
    const legacyDuplicateIstighfar = {
      id: 9,
      text: 'أَسْتَغْفِرُ اللهَ',
      transliteration: 'Astaghfirullah',
      target: 100,
      source: 'hadith_sahih' as const,
      order: 8,
    };
    const staleAppPresets = [
      ...getDefaultTasbihatForApp()
        .filter(preset => preset.id !== 16),
      legacyDuplicateIstighfar,
    ]
      .map((preset, index) => ({
        ...preset,
        order: index,
        text: preset.id === 7
          ? 'سُبْحَانَ اللهِ الْعَظِيمِ وَبِحَمْدِهِ'
          : preset.id === 15
            ? 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ'
            : preset.text,
      }));

    const reconciledApp = reconcileAppTasbihPresets(staleAppPresets);

    expect(reconciledApp).toHaveLength(15);
    expect(reconciledApp[0]).toMatchObject({
      id: 16,
      text: 'استغفر الله',
      target: 3,
    });
    expect(reconciledApp.find(preset => preset.id === 9)).toBeUndefined();
    expect(reconciledApp.find(preset => preset.id === 7)).toMatchObject({
      text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ',
    });
    expect(reconciledApp.find(preset => preset.id === 15)).toMatchObject({
      text: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ',
    });

    const staleAdminPresets = [
      ...getDefaultTasbihPresetsForAdmin().filter(preset => preset.id !== 'tasbih_default_16'),
      {
        ...legacyDuplicateIstighfar,
        id: 'tasbih_default_9',
      },
    ];
    const reconciledAdmin = reconcileAdminTasbihPresets(staleAdminPresets);
    expect(reconciledAdmin[0]).toMatchObject({
      id: 'tasbih_default_16',
      text: 'استغفر الله',
      order: 0,
    });
    expect(reconciledAdmin.find(preset => preset.id === 'tasbih_default_9')).toBeUndefined();
  });

  it('opens on the first tasbih whenever there is no saved counting progress', () => {
    const presets = getDefaultTasbihatForApp();

    expect(getOpeningTasbihPreset(presets, {
      selectedId: 1,
      count: 0,
      totalCount: 0,
      rounds: 0,
    })).toMatchObject({
      id: 16,
      text: 'استغفر الله',
      target: 3,
    });

    expect(getOpeningTasbihPreset(presets, {
      selectedId: 1,
      count: 4,
      totalCount: 4,
      rounds: 0,
    })).toMatchObject({
      id: 1,
      text: 'سُبْحَانَ اللهِ',
    });
  });

  it('uses corrected Arabic preset copy before stale bundled translations', () => {
    expect(resolveTasbihPresetText({
      language: 'ar',
      bundled: 'يا حي يا قيوم برحمتك أستغيث — يا حي يا قيوم برحمتك أستغيث — من قالها أصلح الله له حاله',
      fallback: 'يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله، ولا تكلني إلى نفسي طرفة عين',
    })).toBe('يا حي يا قيوم برحمتك أستغيث، أصلح لي شأني كله، ولا تكلني إلى نفسي طرفة عين');

    expect(resolveTasbihPresetText({
      language: 'en',
      bundled: 'Localized copy',
      fallback: 'النص العربي',
    })).toBe('Localized copy');
  });

  it('uses the same tasbih-specific virtue title on Android and iOS Arabic UI', () => {
    expect(getTasbihVirtueTitle('ar')).toBe('فضل التسبيح');
  });
});
