// lib/pdf-export.ts
// PDF export — Rubik font, Islamic-style design with green & gold accents

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';
import { t } from '@/lib/i18n';
import { addIslamicPdfAppLinkAnnotations } from '@/lib/pdf/appLinkAnnotations';
import { buildIslamicPdfHtmlFromHtmlContent } from '@/lib/pdf/islamicPdfTemplate';

export type PdfTemplate = 'emerald' | 'royal' | 'classic' | string;
export function getPdfTemplates(): { key: PdfTemplate; label: string; desc: string }[] {
  return [
    { key: 'emerald', label: t('pdfExport.emerald'), desc: t('pdfExport.emeraldDesc') },
    { key: 'royal', label: t('pdfExport.royal'), desc: t('pdfExport.royalDesc') },
    { key: 'classic', label: t('pdfExport.classic'), desc: t('pdfExport.classicDesc') },
  ];
}
const STORAGE_KEY = '@pdf_template';
const CUSTOM_CACHE_KEY = '@pdf_custom_templates';
const PDF_PAGE_WIDTH = 794;
const PDF_PAGE_HEIGHT = 1123;

/* ─── Custom template type from Firestore ─── */
export interface CustomPdfTemplate {
  id: string;
  name: string;
  description: string;
  pageBg: string;
  headerGradFrom: string;
  headerGradTo: string;
  headerBorderColor: string;
  sectionBg: string;
  sectionBorder: string;
  sectionTitleColor: string;
  sectionAltBg: string;
  sectionAltBorder: string;
  sectionAltTitleColor: string;
  duaBg: string;
  duaBorder: string;
  duaTextColor: string;
  bodyTextColor: string;
  accentLineColor: string;
  stepNumBg: string;
  footerBrandColor: string;
  isActive: boolean;
}

export interface UploadedPdf {
  id: string;
  name: string;
  description: string;
  url: string;
  pageType: string;
  templateId?: string;
  languages?: string[];
}

export function getUploadForTemplate(templateId: string, pageType?: string, language?: string): UploadedPdf | undefined {
  const uploads = _uploadCache || [];
  return uploads.find(u => {
    const matchesTemplate = u.templateId === templateId;
    const matchesPage = !pageType || u.pageType === pageType || u.pageType === 'general';
    const matchesLang = !language || !u.languages || u.languages.length === 0 || u.languages.includes(language);
    return matchesTemplate && matchesPage && matchesLang;
  });
}

let _customCache: CustomPdfTemplate[] | null = null;
let _uploadCache: UploadedPdf[] | null = null;
let _rubikPdfFontCss: Promise<string> | null = null;
let _appLogoDataUri: Promise<string> | null = null;
let _headerBgDataUri: Promise<string> | null = null;

async function getRubikPdfFontCss(): Promise<string> {
  if (_rubikPdfFontCss) return _rubikPdfFontCss;
  _rubikPdfFontCss = (async () => {
    try {
      const [regular, medium, semiBold, bold, amiri, amiriBold] = await Asset.loadAsync([
        require('../assets/fonts/Rubik-Regular.ttf'),
        require('../assets/fonts/Rubik-Medium.ttf'),
        require('../assets/fonts/Rubik-SemiBold.ttf'),
        require('../assets/fonts/Rubik-Bold.ttf'),
        require('../assets/fonts/Amiri-Regular.ttf'),
        require('../assets/fonts/Amiri-Bold.ttf'),
      ]);
      const read = async (asset: Asset) => FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const [regular64, medium64, semiBold64, bold64, amiri64, amiriBold64] = await Promise.all([
        read(regular),
        read(medium),
        read(semiBold),
        read(bold),
        read(amiri),
        read(amiriBold),
      ]);
      // Amiri is loaded only for Arabic Presentation Forms (ligatures Rubik lacks: ﷺ ﷻ ﷲ ﷽ etc.)
      // unicode-range tells WebKit to use Amiri ONLY for those code points; everything else stays Rubik.
      return `
@font-face{font-family:'RubikPdf';src:url(data:font/truetype;charset=utf-8;base64,${regular64}) format('truetype');font-weight:400;font-style:normal;}
@font-face{font-family:'RubikPdf';src:url(data:font/truetype;charset=utf-8;base64,${medium64}) format('truetype');font-weight:500;font-style:normal;}
@font-face{font-family:'RubikPdf';src:url(data:font/truetype;charset=utf-8;base64,${semiBold64}) format('truetype');font-weight:600;font-style:normal;}
@font-face{font-family:'RubikPdf';src:url(data:font/truetype;charset=utf-8;base64,${bold64}) format('truetype');font-weight:700 900;font-style:normal;}
@font-face{font-family:'RubikPdf';src:url(data:font/truetype;charset=utf-8;base64,${amiri64}) format('truetype');font-weight:400 600;unicode-range:U+0610-061A,U+0670,U+06D6-06ED,U+0700-077F,U+FB50-FDFF,U+FE70-FEFF;}
@font-face{font-family:'RubikPdf';src:url(data:font/truetype;charset=utf-8;base64,${amiriBold64}) format('truetype');font-weight:700 900;unicode-range:U+0610-061A,U+0670,U+06D6-06ED,U+0700-077F,U+FB50-FDFF,U+FE70-FEFF;}`;
    } catch (error) {
      console.log('PDF Rubik font embedding failed', error);
      return '';
    }
  })();
  return _rubikPdfFontCss;
}

async function getHeaderBgDataUri(): Promise<string> {
  if (_headerBgDataUri) return _headerBgDataUri;
  _headerBgDataUri = (async () => {
    try {
      const [asset] = await Asset.loadAsync([require('../assets/images/backgrounds/background3.png')]);
      const base64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.log('PDF header background embedding failed', error);
      return '';
    }
  })();
  return _headerBgDataUri;
}

async function getAppLogoDataUri(): Promise<string> {
  if (_appLogoDataUri) return _appLogoDataUri;
  _appLogoDataUri = (async () => {
    try {
      // Use the official app icon registered in app.json
      const [asset] = await Asset.loadAsync([require('../assets/images/icons/icon.png')]);
      const base64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.log('PDF logo embedding failed', error);
      return '';
    }
  })();
  return _appLogoDataUri;
}

export async function getCustomTemplates(): Promise<CustomPdfTemplate[]> {
  if (_customCache) return _customCache;
  try {
    const cached = await AsyncStorage.getItem(CUSTOM_CACHE_KEY);
    if (cached) {
      _customCache = JSON.parse(cached);
      return _customCache!;
    }
  } catch {}
  return [];
}

export async function fetchCustomTemplatesFromFirestore(): Promise<{ templates: CustomPdfTemplate[]; uploads: UploadedPdf[] }> {
  try {
    const { collection, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');
    const [tSnap, uSnap] = await Promise.all([
      getDocs(collection(db, 'pdfTemplates')),
      getDocs(collection(db, 'pdfUploads')),
    ]);
    const templates = tSnap.docs
      .map(d => ({ id: d.id, ...d.data() } as CustomPdfTemplate))
      .filter(t => t.isActive);
    const uploads = uSnap.docs.map(d => ({ id: d.id, ...d.data() } as UploadedPdf));
    _customCache = templates;
    _uploadCache = uploads;
    await AsyncStorage.setItem(CUSTOM_CACHE_KEY, JSON.stringify(templates));
    return { templates, uploads };
  } catch (e) {
    console.warn('Failed to fetch custom PDF templates:', e);
    return { templates: await getCustomTemplates(), uploads: _uploadCache || [] };
  }
}

export function getCachedUploads(): UploadedPdf[] {
  return _uploadCache || [];
}

interface ThemePdfAssignment {
  themeIndex: number;
  pdfUrl: string;
  storagePath: string;
  fileName: string;
  fileSizeKB: number;
  uploadedAt: string;
}

let _themePdfCache: Record<number, ThemePdfAssignment> | null = null;
const THEME_PDF_CACHE_KEY = '@theme_pdf_assignments';

export async function fetchThemePdfAssignments(): Promise<Record<number, ThemePdfAssignment>> {
  if (_themePdfCache) return _themePdfCache;
  try {
    const cached = await AsyncStorage.getItem(THEME_PDF_CACHE_KEY);
    if (cached) {
      _themePdfCache = JSON.parse(cached);
      return _themePdfCache!;
    }
  } catch {}
  try {
    const { doc: fbDoc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');
    const snap = await getDoc(fbDoc(db, 'appConfig', 'themePdfAssignments'));
    if (snap.exists()) {
      const data = snap.data();
      _themePdfCache = data.assignments || {};
      await AsyncStorage.setItem(THEME_PDF_CACHE_KEY, JSON.stringify(_themePdfCache));
      return _themePdfCache!;
    }
  } catch (e) {
    console.warn('Failed to fetch theme PDF assignments:', e);
  }
  return {};
}

export async function getThemePdfUrl(themeIndex: number): Promise<string | null> {
  const assignments = await fetchThemePdfAssignments();
  return assignments[themeIndex]?.pdfUrl || null;
}

export async function getSavedTemplate(): Promise<PdfTemplate> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v === 'emerald' || v === 'royal' || v === 'classic') return v;
    if (v && v.startsWith('custom_bg:')) return v;
    if (v) return v;
  } catch {}
  return 'emerald';
}
export async function saveTemplate(t: PdfTemplate): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, t);
}

/* ──────────────────── Islamic religious-book palette ──────────────────── */
// PAPER     #fbf6e9 — warm cream parchment
// CARD      #ffffff — bright page card
// INK       #1a2e2a — dark ink for body text
// GREEN     #0d4f3a — deep traditional Islamic green (titles)
// GREEN2    #0d8e62 — app primary green (accents)
// GOLD      #b8860b — antique gold (borders, ornaments)
// GOLD2     #d4af37 — brighter gold (highlights)
// CREAM_BOX #fffaeb — warm cream box (dua/quran)

// Gold star pattern for parchment background (very subtle)
const PATTERN_CORNER = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='none' stroke='%23b8860b' stroke-width='0.8' opacity='0.12'%3E%3Cpath d='M70 16 L82 58 L124 70 L82 82 L70 124 L58 82 L16 70 L58 58 Z'/%3E%3Ccircle cx='70' cy='70' r='22'/%3E%3Ccircle cx='70' cy='70' r='8'/%3E%3Cpath d='M70 46 L72 70 L70 94 L68 70 Z M46 70 L70 68 L94 70 L70 72 Z'/%3E%3C/g%3E%3C/svg%3E";

/* ──────────────────── Unified base — Islamic religious-book parchment design ──────────────────── */
function buildSharedBase(headerBgDataUri: string = ''): string {
  const bannerBg = headerBgDataUri
    ? `background:url("${headerBgDataUri}") center/cover no-repeat,#0d4f3a;`
    : `background:linear-gradient(135deg,#073d2c 0%,#0d4f3a 45%,#0d8e62 100%);`;
  return `
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important;font-family:'RubikPdf',sans-serif;}
html,body{width:100%;background-color:#fbf6e9;-webkit-print-color-adjust:exact !important;}
body{
  font-family:'RubikPdf',sans-serif;
  direction:rtl;line-height:2.2;font-size:24px;font-weight:400;
  color:#1a2e2a;
  background-color:#fbf6e9;
  background-image:url("${PATTERN_CORNER}");
  background-repeat:repeat;
  background-size:140px 140px;
}

/* ─── Header — banner with Bismillah only ─── */
.header{padding:54px 30px 50px;text-align:center;position:relative;overflow:hidden;${bannerBg}}
.header-inner{position:relative;z-index:2;}
.header .bismillah{font-size:48px;color:#ffffff;font-weight:400;line-height:1.3;}

/* ─── Content — cream parchment page with white card sections ─── */
.content{padding:32px 26px;}
.section{
  background:#ffffff;
  border:1px solid #e2d4a3;
  border-radius:10px;
  padding:32px 28px 26px;
  margin-bottom:26px;
  position:relative;
  break-inside:auto;
  page-break-inside:auto;
}
.section::before{
  content:'';position:absolute;top:0;left:0;right:0;height:5px;
  background:linear-gradient(90deg,#b8860b 0%,#d4af37 25%,#0d8e62 50%,#d4af37 75%,#b8860b 100%);
  border-radius:10px 10px 0 0;
}
.section::after{
  content:'';position:absolute;top:5px;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(184,134,11,0.4) 50%,transparent);
}
.section-title{
  font-size:32px;font-weight:800;color:#0d4f3a;
  margin-bottom:22px;padding-bottom:16px;text-align:center;
  border-bottom:1px solid #d4af37;
  break-after:avoid;page-break-after:avoid;
  position:relative;line-height:1.45;
}
.section-title::after{
  content:'\\2042';display:block;font-size:24px;color:#b8860b;
  margin:12px auto -18px;line-height:1;
}
.section-desc{font-size:24px;color:#1a2e2a;margin-bottom:16px;line-height:2.25;text-align:justify;}
.steps-label{font-size:24px;font-weight:700;color:#0d4f3a;margin:16px 0 12px;break-after:avoid;page-break-after:avoid;}
.step{display:flex;gap:16px;margin-bottom:14px;align-items:flex-start;break-inside:avoid;page-break-inside:avoid;}
.step-num{
  display:inline-flex;align-items:center;justify-content:center;
  width:46px;height:46px;border-radius:50%;
  background:linear-gradient(135deg,#0d8e62,#0d4f3a);
  color:#fff;font-size:19px;font-weight:700;flex-shrink:0;
  border:2px solid #d4af37;
}
.step-text{flex:1;font-size:23px;line-height:2.2;color:#1a2e2a;padding-top:7px;}

/* ─── Dua & Quran boxes — warm cream with gold border ─── */
.dua-box,.quran-quote{
  background:#fffaeb;
  border:1.5px solid #d4af37;
  border-right:6px solid #b8860b;
  border-radius:10px;
  padding:26px 30px;margin:22px 0;
  position:relative;
  break-inside:avoid;page-break-inside:avoid;
}
.dua-box::before,.quran-quote::before{
  content:'\\06DD';position:absolute;top:-16px;right:18px;
  font-size:32px;color:#b8860b;background:#fffaeb;padding:0 8px;line-height:1;
}
.dua-arabic{
  font-size:31px;line-height:2.4;color:#0d4f3a;text-align:center;font-weight:500;
}
.dua-note,.quran-reference{
  font-size:17px;margin-top:14px;font-weight:700;
  color:#8a6510;text-align:center;letter-spacing:0.3px;
}

/* ─── Hadith — light green-tinted parchment with green border ─── */
.hadith-quote{
  background:#f0f8f4;
  border:1.5px solid #a8d4bc;
  border-right:6px solid #0d8e62;
  padding:26px 30px;margin:22px 0;border-radius:10px;
  font-size:30px;line-height:2.3;color:#0a3a28;text-align:center;font-weight:500;
  break-inside:avoid;page-break-inside:avoid;
  position:relative;
}
.hadith-quote::before{
  content:'\\275D';position:absolute;top:-16px;right:18px;
  font-size:32px;color:#0d8e62;background:#f0f8f4;padding:0 8px;line-height:1;
}
.hadith-reference{
  text-align:center;font-size:17px;margin-top:14px;font-weight:700;
  color:#0d4f3a;letter-spacing:0.3px;
}

/* ─── Virtue / Lesson items ─── */
.virtue-item,.lesson-item{
  background:#fdfaf2;
  border:1px solid #e8dab0;
  border-right:4px solid #d4af37;
  padding:18px 22px;padding-right:50px;
  border-radius:8px;
  font-size:23px;color:#1a2e2a;
  text-align:right;position:relative;margin-bottom:12px;line-height:2.1;
  break-inside:avoid;page-break-inside:avoid;
}
.virtue-item::before,.lesson-item::before{
  content:'\\2726';position:absolute;right:20px;top:50%;transform:translateY(-50%);
  font-size:20px;color:#b8860b;
}

p{margin-bottom:16px;text-align:justify;line-height:2.25;font-size:24px;color:#1a2e2a;}
h2{font-size:30px;font-weight:800;color:#0d4f3a;margin:20px 0 16px;padding-bottom:10px;text-align:center;}
.decorative-divider{display:flex;align-items:center;justify-content:center;gap:14px;margin:28px 0;color:#b8860b;}
.decorative-divider::before,.decorative-divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(184,134,11,0.55) 50%,transparent);}
.decorative-divider span{font-size:22px;}

/* ─── Footer — banner with app logo & store buttons ─── */
.footer{margin-top:48px;padding:48px 24px 38px;position:relative;overflow:hidden;break-inside:avoid;page-break-inside:avoid;${bannerBg}}
.footer-inner{position:relative;text-align:center;z-index:2;}
.footer-logo{display:flex;justify-content:center;margin-bottom:18px;}
.footer-logo img{width:128px;height:128px;border-radius:28px;background:#ffffff;padding:10px;}
.footer .brand{font-size:36px;font-weight:800;color:#ffffff;margin:0 auto 8px;letter-spacing:0.6px;text-align:center;}
.footer .footer-tagline{font-size:19px;color:#ffffff;margin:0 auto 24px;line-height:1.7;font-weight:500;opacity:0.96;text-align:center;}

/* ─── Store buttons (real clickable) ─── */
.store-buttons{margin-top:8px;display:flex;justify-content:center;align-items:center;gap:16px;flex-wrap:wrap;}
.store-btn{
  display:inline-flex;align-items:center;gap:12px;
  padding:14px 26px;border-radius:36px;
  background:#000000;
  border:2px solid #d4af37;
  color:#ffffff !important;text-decoration:none !important;
  letter-spacing:0.2px;
  min-width:190px;
}
.store-btn svg{width:28px;height:28px;flex-shrink:0;fill:#ffffff;}
.store-btn-label{display:flex;flex-direction:column;align-items:flex-start;line-height:1.15;text-align:left;}
.store-btn-label small{font-size:10px;opacity:0.9;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;}
.store-btn-label strong{font-size:17px;font-weight:700;letter-spacing:0.2px;}

@page{margin:0;size:auto;}
`;
}

/* ─────────── Unified design — all templates share the same base ─────────── */
function cssUnified(headerBgDataUri: string): string {
  return buildSharedBase(headerBgDataUri);
}

// Custom Firestore templates keep their accent color via override of section accent strip only.
function cssFromCustom(t: CustomPdfTemplate, headerBgDataUri: string): string {
  return `${buildSharedBase(headerBgDataUri)}
.section::before{background:linear-gradient(90deg,${t.accentLineColor} 0%,${t.sectionTitleColor} 50%,${t.accentLineColor} 100%);}
`;
}

async function getCssForTemplate(_template: PdfTemplate, headerBgDataUri: string): Promise<string> {
  if (_template.startsWith('custom_bg:') || _template === 'emerald' || _template === 'royal' || _template === 'classic') {
    return cssUnified(headerBgDataUri);
  }
  const customs = await getCustomTemplates();
  const custom = customs.find(t => t.id === _template);
  if (custom) return cssFromCustom(custom, headerBgDataUri);
  return cssUnified(headerBgDataUri);
}

interface PdfLinks {
  appStore: string;
  playStore: string;
}

const DEFAULT_PDF_LINKS: PdfLinks = {
  appStore: 'https://apps.apple.com/us/app/%D8%B1%D9%88%D8%AD-%D8%A7%D9%84%D9%85%D8%B3%D9%84%D9%85-rooh-al-muslim/id6761651911',
  playStore: 'https://play.google.com/store/apps/details?id=com.rooh.almuslim',
};

/* App Store + Google Play icons */
const ICON_APPLE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 12.04c-.02-2.42 1.98-3.59 2.07-3.65-1.13-1.65-2.89-1.88-3.52-1.91-1.5-.15-2.93.88-3.69.88-.77 0-1.95-.86-3.21-.84-1.65.02-3.18.96-4.03 2.44-1.72 2.98-.44 7.39 1.23 9.81.82 1.18 1.79 2.51 3.06 2.46 1.23-.05 1.69-.79 3.18-.79 1.47 0 1.9.79 3.21.77 1.32-.02 2.16-1.2 2.97-2.39.94-1.37 1.32-2.7 1.34-2.77-.03-.01-2.57-.99-2.61-3.91zM14.62 4.85c.68-.82 1.13-1.97.99-3.11-.96.04-2.12.64-2.82 1.45-.63.73-1.18 1.89-1.03 3.01 1.07.08 2.17-.55 2.86-1.35z"/></svg>`;
const ICON_PLAY = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3.6 2.3C3.2 2.6 3 3.1 3 3.8v16.5c0 .6.2 1.1.6 1.4l9.4-9.8L3.6 2.3zm11.6 9l2.6-1.5c1.4-.8 1.4-2.1 0-2.9L15.2 5.3 12.6 8l2.6 3.3zM4.8 1.7l8.8 8.4-2.5 2.5L4.8 1.7zm0 20.6l6.3-10.9 2.5 2.5-8.8 8.4z" fill-opacity="0.95"/></svg>`;

function buildPdfHtml(
  title: string,
  contentHtml: string,
  css: string,
  links: PdfLinks = DEFAULT_PDF_LINKS,
  logoDataUri: string = '',
): string {
  const footerLogo = logoDataUri
    ? `<img src="${logoDataUri}" alt="رُوح المسلم" />`
    : '';
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}</style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <div class="bismillah">﷽</div>
    </div>
  </div>
  <div class="content">
    ${contentHtml}
  </div>
  <div class="footer">
    <div class="footer-inner">
      <div class="footer-logo">${footerLogo}</div>
      <p class="brand">رُوح المسلم</p>
      <p class="footer-tagline">رفيقك الدائم في رحلة الإيمان</p>
      <div class="store-buttons">
        <a href="${links.appStore}" target="_blank" rel="noopener" class="store-btn">
          ${ICON_APPLE}
          <span class="store-btn-label"><small>Download on the</small><strong>App Store</strong></span>
        </a>
        <a href="${links.playStore}" target="_blank" rel="noopener" class="store-btn">
          ${ICON_PLAY}
          <span class="store-btn-label"><small>GET IT ON</small><strong>Google Play</strong></span>
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function exportAsPDF(title: string, htmlContent: string, templateOverride?: PdfTemplate): Promise<void> {
  const fullHtml = await buildIslamicPdfHtmlFromHtmlContent({
    title,
    subtitle: '',
    shortDescription: '',
    category: 'رُوح المسلم',
    footerTitle: 'رُوح المسلم',
    contentHtml: htmlContent,
  });
  const { uri } = await Print.printToFileAsync({
    html: fullHtml,
    width: PDF_PAGE_WIDTH,
    height: PDF_PAGE_HEIGHT,
    margins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  });
  try {
    await addIslamicPdfAppLinkAnnotations(uri);
  } catch (error) {
    console.log('PDF link annotation failed', error);
  }
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: title,
  });
}

export async function showAdThenExport(exportFn: () => Promise<void>): Promise<void> {
  try {
    await showInterstitial();
  } catch {}
  await exportFn();
}
