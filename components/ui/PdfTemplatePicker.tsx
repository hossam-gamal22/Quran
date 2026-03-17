// components/ui/PdfTemplatePicker.tsx
// Modal to pick PDF template style — built-in, custom admin, and custom background templates

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
  Image,
  ImageBackground,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  PdfTemplate,
  getPdfTemplates,
  getSavedTemplate,
  saveTemplate,
  fetchCustomTemplatesFromFirestore,
  getUploadForTemplate,
  CustomPdfTemplate,
  UploadedPdf,
} from '@/lib/pdf-export';
import { APP_BACKGROUNDS } from '@/lib/backgrounds';
import { useColors } from '@/hooks/use-colors';
import { useIsRTL } from '@/hooks/use-is-rtl';
import { useSettings } from '@/contexts/SettingsContext';
import { localizeNumber } from '@/lib/format-number';
import { getLanguage } from '@/lib/i18n';

// Each template's color palette for the mini-preview
const PALETTES: Record<PdfTemplate, {
  pageBg: string;
  headerGrad: [string, string];
  sectionBg1: string;
  sectionBorder1: string;
  sectionTitle1: string;
  sectionBg2: string;
  sectionBorder2: string;
  sectionTitle2: string;
  duaBg: string;
  duaBorder: string;
  duaText: string;
  textColor: string;
  accentLine: string;
  accent: string;
}> = {
  emerald: {
    pageBg: '#0a1f1a',
    headerGrad: ['#052e23', '#0f987f'],
    sectionBg1: 'rgba(15,152,127,0.15)',
    sectionBorder1: 'rgba(15,152,127,0.3)',
    sectionTitle1: '#4eecc4',
    sectionBg2: 'rgba(201,168,76,0.1)',
    sectionBorder2: 'rgba(201,168,76,0.25)',
    sectionTitle2: '#e8c66a',
    duaBg: 'rgba(201,168,76,0.1)',
    duaBorder: '#c9a84c',
    duaText: '#f0ece0',
    textColor: 'rgba(232,240,237,0.7)',
    accentLine: '#c9a84c',
    accent: '#0f987f',
  },
  royal: {
    pageBg: '#0f0e1e',
    headerGrad: ['#1a1640', '#6d28d9'],
    sectionBg1: 'rgba(99,102,241,0.12)',
    sectionBorder1: 'rgba(99,102,241,0.25)',
    sectionTitle1: '#c4b5fd',
    sectionBg2: 'rgba(168,85,247,0.12)',
    sectionBorder2: 'rgba(168,85,247,0.25)',
    sectionTitle2: '#d8b4fe',
    duaBg: 'rgba(168,85,247,0.1)',
    duaBorder: '#a855f7',
    duaText: '#ede9fe',
    textColor: 'rgba(226,228,240,0.7)',
    accentLine: '#a78bfa',
    accent: '#7c3aed',
  },
  classic: {
    pageBg: '#091b2a',
    headerGrad: ['#0c2d48', '#0ea5e9'],
    sectionBg1: 'rgba(14,165,233,0.12)',
    sectionBorder1: 'rgba(56,189,248,0.25)',
    sectionTitle1: '#7dd3fc',
    sectionBg2: 'rgba(6,182,212,0.12)',
    sectionBorder2: 'rgba(6,182,212,0.25)',
    sectionTitle2: '#67e8f9',
    duaBg: 'rgba(56,189,248,0.1)',
    duaBorder: '#38bdf8',
    duaText: '#e0f2fe',
    textColor: 'rgba(224,238,248,0.7)',
    accentLine: '#38bdf8',
    accent: '#0ea5e9',
  },
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: PdfTemplate) => void;
  pageType?: string; // for filtering uploaded PDFs
}

export function PdfTemplatePicker({ visible, onClose, onSelect, pageType }: Props) {
  const [selected, setSelected] = useState<PdfTemplate>('emerald');
  const [customTemplates, setCustomTemplates] = useState<CustomPdfTemplate[]>([]);
  const [uploads, setUploads] = useState<UploadedPdf[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const colors = useColors();
  const { isDarkMode, t } = useSettings();
  const isRTL = useIsRTL();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      getSavedTemplate().then((saved) => {
        setSelected(saved);
        if (saved.startsWith('custom_bg:')) {
          setSelectedBg(saved.replace('custom_bg:', ''));
          setShowBgPicker(true);
        } else {
          setSelectedBg(null);
          setShowBgPicker(false);
        }
      });
      setExporting(false);
      setLoading(true);
      fetchCustomTemplatesFromFirestore()
        .then(({ templates, uploads: u }) => {
          setCustomTemplates(templates);
          setUploads(u);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [visible]);

  const handleConfirm = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const templateToUse = selected;
    await saveTemplate(templateToUse);

    // If template has a linked PDF upload, download it directly
    const linked = !selected.startsWith('custom_bg:') ? getUploadForTemplate(selected, pageType, getLanguage()) : undefined;
    if (linked) {
      Linking.openURL(linked.url);
      onClose();
      setExporting(false);
      return;
    }

    onClose();
    // Use requestAnimationFrame to ensure modal is dismissed before export starts
    requestAnimationFrame(() => {
      setTimeout(() => onSelect(templateToUse), 300);
    });
  }, [selected, onSelect, onClose, exporting, pageType]);

  const renderMiniPreview = (key: PdfTemplate) => {
    const p = PALETTES[key];
    return (
      <View style={[previewStyles.page, { backgroundColor: p.pageBg }]}>
        {/* Mini header */}
        <View style={[previewStyles.header, { backgroundColor: p.headerGrad[1] }]}>
          <Text style={previewStyles.headerTitle}>{t('hajjUmrah.hajjRituals')}</Text>
          <View style={[previewStyles.headerLine, { backgroundColor: p.accentLine }]} />
        </View>

        {/* Section 1 */}
        <View style={[previewStyles.section, { backgroundColor: p.sectionBg1, borderColor: p.sectionBorder1 }]}>
          <Text style={[previewStyles.sectionTitle, { color: p.sectionTitle1 }]}>{localizeNumber(1)}. {t('hajjUmrah.ihram')}</Text>
          <View style={previewStyles.textLines}>
            <View style={[previewStyles.textLine, { backgroundColor: p.textColor, width: '90%' }]} />
            <View style={[previewStyles.textLine, { backgroundColor: p.textColor, width: '70%' }]} />
          </View>
          {/* Mini dua box */}
          <View style={[previewStyles.duaBox, { backgroundColor: p.duaBg, borderRightColor: p.duaBorder }]}>
            <Text style={[previewStyles.duaText, { color: p.duaText, textAlign: isRTL ? 'right' : 'left' }]}>﴿ ربنا تقبل منا ﴾</Text>
          </View>
        </View>

        {/* Section 2 — different color */}
        <View style={[previewStyles.section, { backgroundColor: p.sectionBg2, borderColor: p.sectionBorder2 }]}>
          <Text style={[previewStyles.sectionTitle, { color: p.sectionTitle2 }]}>{localizeNumber(2)}. {t('hajjUmrah.tawaf')}</Text>
          <View style={previewStyles.textLines}>
            <View style={[previewStyles.textLine, { backgroundColor: p.textColor, width: '85%' }]} />
            <View style={[previewStyles.textLine, { backgroundColor: p.textColor, width: '60%' }]} />
          </View>
        </View>
      </View>
    );
  };

  const renderCustomMiniPreview = (ct: CustomPdfTemplate) => {
    return (
      <View style={[previewStyles.page, { backgroundColor: ct.pageBg }]}>
        <View style={[previewStyles.header, { backgroundColor: ct.headerGradTo }]}>
          <Text style={previewStyles.headerTitle}>{t('hajjUmrah.hajjRituals')}</Text>
          <View style={[previewStyles.headerLine, { backgroundColor: ct.accentLineColor }]} />
        </View>
        <View style={[previewStyles.section, { backgroundColor: ct.sectionBg, borderColor: ct.sectionBorder }]}>
          <Text style={[previewStyles.sectionTitle, { color: ct.sectionTitleColor }]}>{localizeNumber(1)}. {t('hajjUmrah.ihram')}</Text>
          <View style={previewStyles.textLines}>
            <View style={[previewStyles.textLine, { backgroundColor: ct.bodyTextColor, width: '90%' }]} />
            <View style={[previewStyles.textLine, { backgroundColor: ct.bodyTextColor, width: '70%' }]} />
          </View>
          <View style={[previewStyles.duaBox, { backgroundColor: ct.duaBg, borderRightColor: ct.duaBorder }]}>
            <Text style={[previewStyles.duaText, { color: ct.duaTextColor, textAlign: isRTL ? 'right' : 'left' }]}>﴿ ربنا تقبل منا ﴾</Text>
          </View>
        </View>
        <View style={[previewStyles.section, { backgroundColor: ct.sectionAltBg, borderColor: ct.sectionAltBorder }]}>
          <Text style={[previewStyles.sectionTitle, { color: ct.sectionAltTitleColor }]}>{localizeNumber(2)}. {t('hajjUmrah.tawaf')}</Text>
          <View style={previewStyles.textLines}>
            <View style={[previewStyles.textLine, { backgroundColor: ct.bodyTextColor, width: '85%' }]} />
            <View style={[previewStyles.textLine, { backgroundColor: ct.bodyTextColor, width: '60%' }]} />
          </View>
        </View>
      </View>
    );
  };

  // Filtered uploads for this page
  const filteredUploads = uploads.filter(u => !pageType || u.pageType === pageType || u.pageType === 'general');

  // Check if selected template has a linked PDF
  const linkedPdf = !selected.startsWith('custom_bg:') ? getUploadForTemplate(selected, pageType, getLanguage()) : undefined;

  const renderBgMiniPreview = (bgId: string) => {
    const bg = APP_BACKGROUNDS.find(b => b.id === bgId);
    const dominantColor = bg?.dominantColor || '#1a4d2e';
    if (!bg) return null;
    return (
      <ImageBackground
        source={bg.source}
        style={[previewStyles.page, { backgroundColor: dominantColor }]}
        imageStyle={{ borderRadius: 10 }}
        resizeMode="cover"
      >
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 10 }} />
        <View style={[previewStyles.header, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
          <Text style={previewStyles.headerTitle}>{t('hajjUmrah.hajjRituals')}</Text>
          <View style={[previewStyles.headerLine, { backgroundColor: 'rgba(255,255,255,0.4)' }]} />
        </View>
        <View style={[previewStyles.section, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }]}>
          <Text style={[previewStyles.sectionTitle, { color: 'rgba(255,255,255,0.9)' }]}>{localizeNumber(1)}. {t('hajjUmrah.ihram')}</Text>
          <View style={previewStyles.textLines}>
            <View style={[previewStyles.textLine, { backgroundColor: 'rgba(255,255,255,0.5)', width: '90%' }]} />
            <View style={[previewStyles.textLine, { backgroundColor: 'rgba(255,255,255,0.5)', width: '70%' }]} />
          </View>
          <View style={[previewStyles.duaBox, { backgroundColor: 'rgba(255,255,255,0.05)', borderRightColor: 'rgba(255,255,255,0.3)' }]}>
            <Text style={[previewStyles.duaText, { color: 'rgba(255,255,255,0.9)', textAlign: isRTL ? 'right' : 'left' }]}>﴿ ربنا تقبل منا ﴾</Text>
          </View>
        </View>
        <View style={[previewStyles.section, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }]}>
          <Text style={[previewStyles.sectionTitle, { color: 'rgba(255,255,255,0.85)' }]}>{localizeNumber(2)}. {t('hajjUmrah.tawaf')}</Text>
          <View style={previewStyles.textLines}>
            <View style={[previewStyles.textLine, { backgroundColor: 'rgba(255,255,255,0.5)', width: '85%' }]} />
            <View style={[previewStyles.textLine, { backgroundColor: 'rgba(255,255,255,0.5)', width: '60%' }]} />
          </View>
        </View>
      </ImageBackground>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: isDarkMode
                ? 'rgba(30,30,32,0.97)'
                : 'rgba(255,255,255,0.98)',
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {Platform.OS === 'ios' && (
            <BlurView
              intensity={80}
              tint={isDarkMode ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          )}

          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('pdfExport.chooseStyle')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textLight }]}>
              {t('pdfExport.chooseStyleDesc')}
            </Text>

            {loading ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <>
                <ScrollView
                  ref={scrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.templates}
                  style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
                >
                  {/* Built-in templates */}
                  {getPdfTemplates().map((t) => {
                    const p = PALETTES[t.key as keyof typeof PALETTES];
                    if (!p) return null;
                    const isActive = selected === t.key;
                    return (
                      <Pressable
                        key={t.key}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelected(t.key);
                          setShowBgPicker(false);
                        }}
                        style={[
                          styles.card,
                          {
                            borderColor: isActive ? p.accent : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderWidth: isActive ? 2.5 : 1,
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#fafafa',
                          },
                          isRTL && { transform: [{ scaleX: -1 }] },
                        ]}
                      >
                        {renderMiniPreview(t.key as keyof typeof PALETTES)}

                        <View style={styles.cardLabel}>
                          <Text style={[styles.cardTitle, { color: colors.text }]}>{t.label}</Text>
                          <Text style={[styles.cardDesc, { color: colors.textLight }]}>{t.desc}</Text>
                        </View>

                        {isActive && (
                          <View style={[styles.check, { backgroundColor: p.accent }, isRTL ? { right: 6, left: undefined } : null]}>
                            <MaterialCommunityIcons name="check" size={14} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}

                  {/* Custom admin templates */}
                  {customTemplates.map((ct) => {
                    const isActive = selected === ct.id;
                    return (
                      <Pressable
                        key={ct.id}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setSelected(ct.id);
                          setShowBgPicker(false);
                        }}
                        style={[
                          styles.card,
                          {
                            borderColor: isActive ? ct.headerGradTo : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            borderWidth: isActive ? 2.5 : 1,
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#fafafa',
                          },
                          isRTL && { transform: [{ scaleX: -1 }] },
                        ]}
                      >
                        {renderCustomMiniPreview(ct)}

                        <View style={styles.cardLabel}>
                          <Text style={[styles.cardTitle, { color: colors.text }]}>{ct.name}</Text>
                          <Text style={[styles.cardDesc, { color: colors.textLight }]}>{ct.description || ''}</Text>
                        </View>

                        {isActive && (
                          <View style={[styles.check, { backgroundColor: ct.headerGradTo }, isRTL ? { right: 6, left: undefined } : null]}>
                            <MaterialCommunityIcons name="check" size={14} color="#fff" />
                          </View>
                        )}
                      </Pressable>
                    );
                  })}

                  {/* Custom background option — last in scroll (leftmost in RTL) */}
                  <Pressable
                    onPress={() => {
                      Haptics.selectionAsync();
                      if (!selected.startsWith('custom_bg:')) {
                        setSelected(selectedBg ? `custom_bg:${selectedBg}` as PdfTemplate : 'custom_bg:background1' as PdfTemplate);
                        if (!selectedBg) setSelectedBg('background1');
                      }
                      setShowBgPicker(true);
                    }}
                    style={[
                      styles.card,
                      {
                        borderColor: selected.startsWith('custom_bg:')
                          ? '#0f987f'
                          : isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        borderWidth: selected.startsWith('custom_bg:') ? 2.5 : 1,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : '#fafafa',
                      },
                      isRTL && { transform: [{ scaleX: -1 }] },
                    ]}
                  >
                    {selectedBg && selected.startsWith('custom_bg:') ? (
                      renderBgMiniPreview(selectedBg)
                    ) : (
                      <View style={[previewStyles.page, { backgroundColor: '#1a4d2e', justifyContent: 'center', alignItems: 'center' }]}>
                        <MaterialCommunityIcons name="palette-outline" size={32} color="rgba(255,255,255,0.7)" />
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600', marginTop: 6 }}>{t('pdfExport.chooseBg')}</Text>
                      </View>
                    )}
                    <View style={styles.cardLabel}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{t('pdfExport.custom')}</Text>
                      <Text style={[styles.cardDesc, { color: colors.textLight }]}>{t('pdfExport.bgFromApp')}</Text>
                    </View>
                    {selected.startsWith('custom_bg:') && (
                      <View style={[styles.check, { backgroundColor: '#0f987f' }, isRTL ? { right: 6, left: undefined } : null]}>
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                </ScrollView>

                {/* Background image picker — shown when "تخصيص" is tapped */}
                {showBgPicker && (
                  <View style={styles.bgPickerSection}>
                    <Text style={[styles.bgPickerTitle, { color: colors.textLight }]}>{t('pdfExport.chooseBgTitle')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgPickerList} style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}>
                      {APP_BACKGROUNDS.map((bg) => {
                        const isActive = selectedBg === bg.id;
                        return (
                          <Pressable
                            key={bg.id}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setSelectedBg(bg.id);
                              setSelected(`custom_bg:${bg.id}` as PdfTemplate);
                            }}
                            style={[
                              styles.bgThumb,
                              {
                                borderColor: isActive ? '#0f987f' : 'transparent',
                                borderWidth: isActive ? 2.5 : 0,
                              },
                              isRTL && { transform: [{ scaleX: -1 }] },
                            ]}
                          >
                            <Image source={bg.source} style={styles.bgThumbImage} />
                            <Text style={[styles.bgThumbLabel, { color: colors.text }]}>{bg.name_ar}</Text>
                            {isActive && (
                              <View style={[styles.bgCheck, { backgroundColor: '#0f987f' }, isRTL ? { right: 4, left: undefined } : null]}>
                                <MaterialCommunityIcons name="check" size={10} color="#fff" />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Uploaded PDF alternatives */}
                {filteredUploads.length > 0 && (
                  <View style={styles.uploadsSection}>
                    <Text style={[styles.uploadsTitle, { color: colors.textLight }]}>{t('pdfExport.orDownloadReady')}</Text>
                    {filteredUploads.map((u) => (
                      <Pressable
                        key={u.id}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          Linking.openURL(u.url);
                          onClose();
                        }}
                        style={[styles.uploadRow, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      >
                        <MaterialCommunityIcons name="file-pdf-box" size={24} color="#ef4444" />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.uploadName, { color: colors.text }]}>{u.name}</Text>
                          {u.description ? <Text style={[styles.uploadDesc, { color: colors.textLight }]}>{u.description}</Text> : null}
                        </View>
                        <MaterialCommunityIcons name="download" size={20} color={colors.textLight} />
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Linked PDF for selected template */}
                {linkedPdf && (
                  <View style={[styles.uploadsSection, { marginTop: 4 }]}>
                    <Text style={[styles.uploadsTitle, { color: '#22C55E' }]}>{t('pdfExport.readyCopyForStyle')}</Text>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Linking.openURL(linkedPdf.url);
                        onClose();
                      }}
                      style={[styles.uploadRow, { backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    >
                      <MaterialCommunityIcons name="file-pdf-box" size={24} color="#22C55E" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.uploadName, { color: colors.text }]}>{linkedPdf.name}</Text>
                        {linkedPdf.description ? <Text style={[styles.uploadDesc, { color: colors.textLight }]}>{linkedPdf.description}</Text> : null}
                      </View>
                      <MaterialCommunityIcons name="download" size={20} color="#22C55E" />
                    </Pressable>
                  </View>
                )}
              </>
            )}

            <Pressable
              onPress={handleConfirm}
              disabled={exporting || (selected.startsWith('custom_bg:') && !selectedBg)}
              style={[
                styles.confirmBtn,
                {
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  backgroundColor: (() => {
                    if (selected.startsWith('custom_bg:')) return '#0f987f';
                    const palette = PALETTES[selected as keyof typeof PALETTES];
                    if (palette) return palette.accent;
                    const ct = customTemplates.find(t => t.id === selected);
                    return ct?.headerGradTo || '#0f987f';
                  })(),
                  opacity: exporting || (selected.startsWith('custom_bg:') && !selectedBg) ? 0.5 : 1,
                },
              ]}
            >
              {exporting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name={linkedPdf ? 'download' : 'file-pdf-box'} size={20} color="#fff" />
                  <Text style={styles.confirmText}>{linkedPdf ? t('pdfExport.downloadReady') : t('pdfExport.exportPdf')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const previewStyles = StyleSheet.create({
  page: {
    borderRadius: 10,
    overflow: 'hidden',
    height: 180,
  },
  header: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerLine: {
    width: 30,
    height: 1.5,
    borderRadius: 1,
    marginTop: 4,
    opacity: 0.6,
  },
  section: {
    marginHorizontal: 6,
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
  },
  sectionTitle: {
    fontSize: 7,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  textLines: {
    gap: 8,
  },
  textLine: {
    height: 2,
    borderRadius: 1,
  },
  duaBox: {
    marginTop: 4,
    borderRightWidth: 2,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  duaText: {
    fontSize: 6,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    borderRadius: 24,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 420,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  templates: {
    gap: 12,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  card: {
    width: 130,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  cardLabel: {
    padding: 8,
    paddingTop: 6,
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 9,
    marginTop: 1,
  },
  check: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadsSection: {
    marginTop: 16,
    gap: 8,
  },
  uploadsTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  uploadName: {
    fontSize: 14,
    fontWeight: '600',
  },
  uploadDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  bgPickerSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  bgPickerTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  bgPickerList: {
    gap: 10,
    paddingHorizontal: 12,
  },
  bgThumb: {
    width: 70,
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  bgThumbImage: {
    width: 64,
    height: 64,
    borderRadius: 10,
  },
  bgThumbLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center' as const,
  },
  bgCheck: {
    position: 'absolute' as const,
    top: 4,
    left: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
});
