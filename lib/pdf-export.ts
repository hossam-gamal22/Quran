// lib/pdf-export.ts
// PDF export utility — 3 built-in dark-themed templates + custom admin templates

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';
import { t } from '@/lib/i18n';

export type PdfTemplate = 'emerald' | 'royal' | 'classic' | string; // string = custom ID
export function getPdfTemplates(): { key: PdfTemplate; label: string; desc: string }[] {
  return [
    { key: 'emerald', label: t('pdfExport.emerald'), desc: t('pdfExport.emeraldDesc') },
    { key: 'royal', label: t('pdfExport.royal'), desc: t('pdfExport.royalDesc') },
    { key: 'classic', label: t('pdfExport.classic'), desc: t('pdfExport.classicDesc') },
  ];
}
const STORAGE_KEY = '@pdf_template';
const CUSTOM_CACHE_KEY = '@pdf_custom_templates';

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
  templateId?: string; // links to a specific template (built-in key or custom Firestore ID)
  languages?: string[]; // e.g. ['ar','en','fr'] — empty/undefined means all languages
}

/** Find uploaded PDF linked to a specific template + pageType, optionally filtered by language */
export function getUploadForTemplate(templateId: string, pageType?: string, language?: string): UploadedPdf | undefined {
  const uploads = _uploadCache || [];
  return uploads.find(u => {
    const matchesTemplate = u.templateId === templateId;
    const matchesPage = !pageType || u.pageType === pageType || u.pageType === 'general';
    const matchesLang = !language || !u.languages || u.languages.length === 0 || u.languages.includes(language);
    return matchesTemplate && matchesPage && matchesLang;
  });
}

/* ─── Fetch custom templates from Firestore (cached) ─── */
let _customCache: CustomPdfTemplate[] | null = null;
let _uploadCache: UploadedPdf[] | null = null;

export async function getCustomTemplates(): Promise<CustomPdfTemplate[]> {
  if (_customCache) return _customCache;
  try {
    const cached = await AsyncStorage.getItem(CUSTOM_CACHE_KEY);
    if (cached) {
      _customCache = JSON.parse(cached);
      return _customCache!;
    }
  } catch {}
  // Will be populated when fetchCustomTemplatesFromFirestore is called
  return [];
}

export async function fetchCustomTemplatesFromFirestore(): Promise<{ templates: CustomPdfTemplate[]; uploads: UploadedPdf[] }> {
  try {
    const { getFirestore, collection, getDocs } = await import('firebase/firestore');
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

/* ─── Theme PDF Assignments ─── */
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

/** Fetch theme-to-PDF assignments from Firestore (cached) */
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

/** Get the PDF URL assigned to a specific theme index */
export async function getThemePdfUrl(themeIndex: number): Promise<string | null> {
  const assignments = await fetchThemePdfAssignments();
  return assignments[themeIndex]?.pdfUrl || null;
}

export async function getSavedTemplate(): Promise<PdfTemplate> {
  try {
    const v = await AsyncStorage.getItem(STORAGE_KEY);
    if (v === 'emerald' || v === 'royal' || v === 'classic') return v;
    if (v && v.startsWith('custom_bg:')) return v;
    if (v) return v; // custom Firestore template ID
  } catch {}
  return 'emerald';
}
export async function saveTemplate(t: PdfTemplate): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, t);
}

/* ──────────────────── Islamic geometric pattern (SVG data URI) ──────────────────── */
// 8-point star (نجمة ثمانية) — classic Islamic arabesque motif, gold/transparent
const ISLAMIC_PATTERN_GOLD = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='none' stroke='%23c9a84c' stroke-width='0.5' opacity='0.09'%3E%3Cpath d='M40 6 L48 32 L74 40 L48 48 L40 74 L32 48 L6 40 L32 32 Z'/%3E%3Cpath d='M40 14 L46 34 L66 40 L46 46 L40 66 L34 46 L14 40 L34 34 Z'/%3E%3Ccircle cx='40' cy='40' r='4'/%3E%3Cpath d='M0 40 L20 40 M60 40 L80 40 M40 0 L40 20 M40 60 L40 80'/%3E%3C/g%3E%3C/svg%3E";

// Header ornament — interlocking arabesque (denser)
const ISLAMIC_PATTERN_HEADER = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.6' opacity='0.13'%3E%3Cpath d='M30 4 L36 24 L56 30 L36 36 L30 56 L24 36 L4 30 L24 24 Z'/%3E%3Ccircle cx='30' cy='30' r='10'/%3E%3Ccircle cx='30' cy='30' r='3'/%3E%3C/g%3E%3C/svg%3E";

/* ──────────────────── Shared base styles ──────────────────── */
const SHARED_BASE = `
@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&family=Amiri:wght@400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important;}
html{width:100%;height:100%;min-height:100%;-webkit-print-color-adjust:exact !important;}
body{width:100%;min-height:100%;font-family:'Rubik','Segoe UI',-apple-system,sans-serif;direction:rtl;line-height:1.9;font-size:18px;padding:14mm 10mm;-webkit-print-color-adjust:exact !important;font-weight:400;}
body::before{content:'';position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;background:inherit;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
.content{padding:16px 8px;}
.section{padding:32px 24px;margin-top:24px;margin-bottom:16px;position:relative;border-radius:12px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}
.section-title{font-size:22px;font-weight:700;margin-bottom:12px;padding-bottom:10px;text-align:center;break-after:avoid;-webkit-column-break-after:avoid;page-break-after:avoid;letter-spacing:0.2px;}
.section-desc{font-size:16px;margin-bottom:10px;line-height:1.9;text-align:justify;}
.steps-label{font-size:15px;font-weight:600;margin-bottom:8px;break-after:avoid;-webkit-column-break-after:avoid;page-break-after:avoid;}
.step{display:flex;flex-direction:row;gap:10px;margin-bottom:8px;align-items:flex-start;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}
.step-num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;color:#fff;font-size:12px;font-weight:700;flex-shrink:0;font-family:'Rubik',sans-serif;}
.step-text{flex:1;font-size:15px;line-height:1.8;}
.dua-box,.quran-quote{padding:18px 20px;margin:12px 0;position:relative;border-radius:10px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}
.dua-box::before,.quran-quote::before{content:'\\06DD';position:absolute;top:-12px;right:16px;font-size:24px;font-family:'Amiri',serif;opacity:0.6;}
.dua-arabic{font-size:18px;line-height:2.1;font-family:'Amiri','Rubik',serif;text-align:center;}
.dua-note,.quran-reference{font-size:12px;margin-top:8px;font-weight:500;text-align:center;}
.hadith-quote{padding:18px 20px;font-family:'Amiri',serif;font-size:18px;line-height:2.1;margin:12px 0;border-radius:10px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;text-align:center;}
.hadith-reference{text-align:center;font-size:12px;margin-top:8px;font-weight:500;font-family:'Rubik',sans-serif;}
.virtue-item,.lesson-item{padding:10px 16px;padding-right:36px;border-radius:8px;font-size:15px;text-align:right;position:relative;margin-bottom:6px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}
.virtue-item::before,.lesson-item::before{content:'\\2726';position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:14px;}
p{margin-bottom:10px;text-align:justify;line-height:1.9;font-size:16px;}
h2{font-size:21px;margin-bottom:14px;padding-bottom:10px;text-align:center;break-after:avoid;-webkit-column-break-after:avoid;page-break-after:avoid;}
.decorative-divider{display:flex;align-items:center;justify-content:center;gap:12px;margin:20px 0;}
.decorative-divider::before,.decorative-divider::after{content:'';flex:1;height:2px;}
.decorative-divider span{font-size:20px;}

/* ─── Footer ─── */
.footer{margin-top:40px;padding:24px 16px 24px;break-inside:avoid;page-break-inside:avoid;position:relative;overflow:hidden;border-radius:12px 12px 0 0;}
.footer-inner{position:relative;text-align:center;z-index:2;}
.footer-logo{display:flex;justify-content:center;margin-bottom:12px;}
.footer-logo svg{filter:drop-shadow(0 4px 12px rgba(0,0,0,0.35));}
.footer-ornament{display:flex;align-items:center;justify-content:center;gap:12px;margin:8px 0 12px;color:rgba(255,255,255,0.6);font-size:16px;}
.footer-ornament::before,.footer-ornament::after{content:'';height:1px;flex:0 0 70px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent);}
.store-buttons{margin-top:16px;display:flex;justify-content:center;align-items:center;gap:12px;flex-wrap:wrap;}
.store-btn{display:inline-flex;align-items:center;gap:10px;padding:12px 20px;border-radius:26px;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);color:#ffffff !important;text-decoration:none !important;font-size:13px;font-weight:600;font-family:'Rubik',sans-serif;letter-spacing:0.2px;box-shadow:0 2px 8px rgba(0,0,0,0.25);}
.store-btn svg{width:20px;height:20px;flex-shrink:0;fill:#ffffff;}
.store-btn-label{display:flex;flex-direction:column;align-items:flex-start;line-height:1.2;}
.store-btn-label small{font-size:10px;opacity:0.75;font-weight:500;}
.store-btn-label strong{font-size:13px;font-weight:700;}

@page{margin:0;size:auto;}
`;

/* ──────────────── Template 1 — Emerald Dark (Islamic Green & Gold) ──────────────── */
function cssEmerald(): string {
  return `${SHARED_BASE}
html{background-color:#06170f;}
body{
  background-color:#06170f;
  background-image:
    radial-gradient(ellipse at top,rgba(15,152,127,0.18) 0%,transparent 55%),
    radial-gradient(ellipse at bottom,rgba(201,168,76,0.08) 0%,transparent 60%);
  background-repeat:no-repeat,no-repeat;
  background-size:auto,auto;
  color:#e8f0ed;
}
.header{
  background:
    url("${ISLAMIC_PATTERN_HEADER}"),
    linear-gradient(160deg,#031f17 0%,#0b513f 45%,#0d8e62 100%);
  background-repeat:repeat,no-repeat;
  background-size:60px 60px,cover;
  padding:28px 16px 18px;text-align:center;position:relative;overflow:hidden;
  border-bottom:3px double rgba(201,168,76,0.55);
  border-radius:0 0 16px 16px;
  box-shadow:0 6px 20px rgba(0,0,0,0.35);
}
.header::before{content:'';position:absolute;top:6px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#fbbf24,transparent);}
.header::after{content:'';position:absolute;bottom:6px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#fbbf24,transparent);}
.header h1{font-size:28px;font-weight:800;color:#ffffff;margin-bottom:6px;position:relative;text-shadow:0 2px 14px rgba(0,0,0,0.55);letter-spacing:0.5px;}
.header .subtitle{font-size:14px;color:rgba(255,255,255,0.7);position:relative;}
.header .decorative-line{width:180px;height:2px;background:linear-gradient(90deg,transparent,#c9a84c 20%,#fbbf24 50%,#c9a84c 80%,transparent);margin:10px auto 0;border-radius:2px;position:relative;}
.header .brand-watermark{position:relative;margin-top:8px;font-size:10px;color:rgba(251,191,36,0.55);letter-spacing:4px;font-weight:600;}

.section{
  background:linear-gradient(135deg,rgba(15,152,127,0.14) 0%,rgba(15,152,127,0.08) 100%);
  border:1px solid rgba(15,152,127,0.32);
  box-shadow:0 4px 18px rgba(0,0,0,0.28),inset 0 1px 0 rgba(255,255,255,0.04);
}
.section:nth-child(even){
  background:linear-gradient(135deg,rgba(201,168,76,0.10) 0%,rgba(201,168,76,0.05) 100%);
  border-color:rgba(201,168,76,0.30);
}
.section-title{color:#5eebc4;border-bottom:1px solid rgba(78,236,196,0.28);text-shadow:0 1px 4px rgba(0,0,0,0.4);}
.section:nth-child(even) .section-title{color:#f0d479;border-bottom-color:rgba(240,212,121,0.28);}
.section-desc{color:rgba(232,240,237,0.85);}
.steps-label{color:#5eebc4;}
.step-num{background:linear-gradient(135deg,#0d8e62,#0b6a4a);box-shadow:0 2px 8px rgba(15,152,127,0.45);}
.step-text{color:rgba(232,240,237,0.88);}
.section:nth-child(even) .step-num{background:linear-gradient(135deg,#c9a84c,#9c7d2a);box-shadow:0 2px 8px rgba(201,168,76,0.45);}

.dua-box,.quran-quote{
  background:linear-gradient(135deg,rgba(201,168,76,0.12) 0%,rgba(201,168,76,0.04) 100%);
  border:1px solid rgba(201,168,76,0.32);
  border-right:4px solid #c9a84c;
  box-shadow:0 3px 10px rgba(0,0,0,0.2);
}
.dua-box::before,.quran-quote::before{color:#fbbf24;background:#06170f;padding:0 6px;border-radius:50%;}
.dua-arabic{color:#f4eed4;}
.dua-note,.quran-reference{color:#fbbf24;}

.hadith-quote{
  background:linear-gradient(135deg,rgba(15,152,127,0.12) 0%,rgba(15,152,127,0.04) 100%);
  border:1px solid rgba(15,152,127,0.30);
  border-right:4px solid #0d8e62;color:#e8f0ed;
  box-shadow:0 3px 10px rgba(0,0,0,0.2);
}
.hadith-quote::before{color:#5eebc4;background:#06170f;padding:0 6px;border-radius:50%;}
.hadith-reference{color:#5eebc4;}

.virtue-item,.lesson-item{background:rgba(15,152,127,0.12);border:1px solid rgba(15,152,127,0.22);color:rgba(232,240,237,0.88);}
.virtue-item::before,.lesson-item::before{color:#fbbf24;}
p{color:rgba(232,240,237,0.86);}
h2{color:#5eebc4;border-bottom:2px solid rgba(78,236,196,0.25);}
.decorative-divider{color:#c9a84c;}
.decorative-divider::before,.decorative-divider::after{background:linear-gradient(90deg,transparent,#0d8e62 30%,#c9a84c 50%,#0d8e62 70%,transparent);}

.footer{
  background:
    url("${ISLAMIC_PATTERN_HEADER}"),
    linear-gradient(160deg,#031f17 0%,#0b513f 50%,#0d8e62 100%);
  background-repeat:repeat,no-repeat;
  background-size:60px 60px,cover;
  border-top:3px double rgba(201,168,76,0.55);
  box-shadow:0 -6px 20px rgba(0,0,0,0.35);
}
.footer::before{content:'';position:absolute;top:10px;left:8%;right:8%;height:2px;background:linear-gradient(90deg,transparent,#c9a84c 30%,#fbbf24 50%,#c9a84c 70%,transparent);border-radius:3px;z-index:3;}
.footer::after{content:'';position:absolute;bottom:10px;left:8%;right:8%;height:2px;background:linear-gradient(90deg,transparent,#c9a84c 30%,#fbbf24 50%,#c9a84c 70%,transparent);border-radius:3px;z-index:3;}
.footer .brand{font-size:22px;font-weight:800;color:#ffffff;margin:0 0 4px 0;letter-spacing:0.5px;text-shadow:0 2px 10px rgba(0,0,0,0.5);}
.footer .brand-en{font-size:11px;color:rgba(251,191,36,0.7);margin:0 0 6px 0;letter-spacing:4px;font-weight:600;}
.footer .website{font-size:11px;color:rgba(255,255,255,0.55);margin:6px 0 0;letter-spacing:1px;}
.footer .store-btn{background:rgba(0,0,0,0.35);border-color:rgba(251,191,36,0.5);}
.footer .store-btn:hover{background:rgba(251,191,36,0.15);}
`;
}

/* ──────────────── Template 2 — Royal Purple ──────────────── */
function cssRoyal(): string {
  return `${SHARED_BASE}
html{background-color:#0f0e1e;}
body{
  background-color:#0f0e1e;
  color:#e2e4f0;
}
.header{
  background:linear-gradient(160deg,#1a1640 0%,#2d2570 40%,#6d28d9 100%);
  padding:20px 16px 14px;text-align:center;position:relative;overflow:hidden;
  border-bottom:2px solid rgba(168,85,247,0.4);
}
.header h1{font-size:26px;font-weight:800;color:#ffffff;margin-bottom:6px;position:relative;text-shadow:0 2px 12px rgba(0,0,0,0.5);}
.header .subtitle{font-size:14px;color:rgba(255,255,255,0.6);position:relative;}
.header .decorative-line{width:160px;height:2px;background:linear-gradient(90deg,transparent,#a78bfa 20%,#e9d5ff 50%,#a78bfa 80%,transparent);margin:8px auto 0;border-radius:2px;position:relative;}
.header .brand-watermark{position:relative;margin-top:6px;font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:3px;}

.section{
  background:rgba(99,102,241,0.1);
  border:1px solid rgba(99,102,241,0.2);
  box-shadow:0 4px 16px rgba(0,0,0,0.2);
}
.section:nth-child(even){
  background:rgba(168,85,247,0.1);
  border-color:rgba(168,85,247,0.2);
}
.section:nth-child(3n){
  background:rgba(236,72,153,0.07);
  border-color:rgba(236,72,153,0.15);
}
.section-title{color:#c4b5fd;border-bottom:2px solid rgba(196,181,253,0.2);}
.section:nth-child(even) .section-title{color:#d8b4fe;border-bottom-color:rgba(216,180,254,0.2);}
.section:nth-child(3n) .section-title{color:#f9a8d4;border-bottom-color:rgba(249,168,212,0.15);}
.section-desc{color:rgba(226,228,240,0.8);}
.steps-label{color:#c4b5fd;}
.step-num{background:#6d28d9;box-shadow:0 2px 6px rgba(109,40,217,0.3);}
.step-text{color:rgba(226,228,240,0.85);}
.section:nth-child(even) .step-num{background:#7e22ce;}
.section:nth-child(3n) .step-num{background:#be185d;}

.dua-box,.quran-quote{
  background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.18);
  border-right:4px solid #a855f7;
}
.dua-arabic{color:#ede9fe;}
.dua-note,.quran-reference{color:#c084fc;}

.hadith-quote{
  background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);
  border-right:4px solid #818cf8;color:#e2e4f0;
}
.hadith-reference{color:#a5b4fc;}

.virtue-item,.lesson-item{background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.12);color:rgba(226,228,240,0.85);}
.virtue-item::before,.lesson-item::before{color:#c084fc;}
p{color:rgba(226,228,240,0.85);}
h2{color:#c4b5fd;border-bottom:2px solid rgba(196,181,253,0.2);}
.decorative-divider{color:#c084fc;}
.decorative-divider::before,.decorative-divider::after{background:linear-gradient(90deg,transparent,#6d28d9 30%,#a855f7 50%,#6d28d9 70%,transparent);}

.footer{
  text-align:center;padding:14px 16px;
  background:linear-gradient(160deg,#1a1640 0%,#2d2570 50%,#6d28d9 100%);
  position:relative;overflow:hidden;
}
.footer::before{content:'';position:absolute;top:0;left:8%;right:8%;height:3px;background:linear-gradient(90deg,transparent,#a78bfa 30%,#e9d5ff 50%,#a78bfa 70%,transparent);border-radius:3px;}
.footer .brand{font-size:20px;font-weight:800;color:#ffffff;margin:0 0 4px 0;}
.footer .brand-en{font-size:12px;color:rgba(255,255,255,0.35);margin:0 0 6px 0;letter-spacing:3px;}
.footer .website{font-size:12px;color:rgba(255,255,255,0.25);margin:0;}
`;
}

/* ──────────────── Template 3 — Ocean Blue ──────────────── */
function cssClassic(): string {
  return `${SHARED_BASE}
html{background-color:#091b2a;}
body{
  background-color:#091b2a;
  color:#e0eef8;
}
.header{
  background:linear-gradient(160deg,#0c2d48 0%,#0e4d74 40%,#0ea5e9 100%);
  padding:20px 16px 14px;text-align:center;position:relative;overflow:hidden;
  border-bottom:2px solid rgba(56,189,248,0.4);
}
.header h1{font-size:26px;font-weight:800;color:#ffffff;margin-bottom:6px;position:relative;text-shadow:0 2px 12px rgba(0,0,0,0.4);}
.header .subtitle{font-size:14px;color:rgba(255,255,255,0.6);position:relative;}
.header .decorative-line{width:160px;height:2px;background:linear-gradient(90deg,transparent,#38bdf8 20%,#bae6fd 50%,#38bdf8 80%,transparent);margin:8px auto 0;border-radius:2px;position:relative;}
.header .brand-watermark{position:relative;margin-top:6px;font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:3px;}

.section{
  background:rgba(14,165,233,0.1);
  border:1px solid rgba(56,189,248,0.18);
  box-shadow:0 4px 16px rgba(0,0,0,0.2);
}
.section:nth-child(even){
  background:rgba(6,182,212,0.1);
  border-color:rgba(6,182,212,0.18);
}
.section:nth-child(3n){
  background:rgba(59,130,246,0.08);
  border-color:rgba(59,130,246,0.15);
}
.section-title{color:#7dd3fc;border-bottom:2px solid rgba(125,211,252,0.2);}
.section:nth-child(even) .section-title{color:#67e8f9;border-bottom-color:rgba(103,232,249,0.2);}
.section:nth-child(3n) .section-title{color:#93c5fd;border-bottom-color:rgba(147,197,253,0.15);}
.section-desc{color:rgba(224,238,248,0.8);}
.steps-label{color:#7dd3fc;}
.step-num{background:#0369a1;box-shadow:0 2px 6px rgba(14,165,233,0.3);}
.step-text{color:rgba(224,238,248,0.85);}
.section:nth-child(even) .step-num{background:#0e7490;}
.section:nth-child(3n) .step-num{background:#1d4ed8;}

.dua-box,.quran-quote{
  background:rgba(56,189,248,0.07);border:1px solid rgba(56,189,248,0.15);
  border-right:4px solid #38bdf8;
}
.dua-arabic{color:#e0f2fe;}
.dua-note,.quran-reference{color:#7dd3fc;}

.hadith-quote{
  background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.12);
  border-right:4px solid #06b6d4;color:#e0eef8;
}
.hadith-reference{color:#67e8f9;}

.virtue-item,.lesson-item{background:rgba(14,165,233,0.08);border:1px solid rgba(14,165,233,0.12);color:rgba(224,238,248,0.85);}
.virtue-item::before,.lesson-item::before{color:#7dd3fc;}
p{color:rgba(224,238,248,0.85);}
h2{color:#7dd3fc;border-bottom:2px solid rgba(125,211,252,0.2);}
.decorative-divider{color:#38bdf8;}
.decorative-divider::before,.decorative-divider::after{background:linear-gradient(90deg,transparent,#0ea5e9 30%,#38bdf8 50%,#0ea5e9 70%,transparent);}

.footer{
  text-align:center;padding:14px 16px;
  background:linear-gradient(160deg,#0c2d48 0%,#0e4d74 50%,#0ea5e9 100%);
  position:relative;overflow:hidden;
}
.footer::before{content:'';position:absolute;top:0;left:8%;right:8%;height:3px;background:linear-gradient(90deg,transparent,#38bdf8 30%,#bae6fd 50%,#38bdf8 70%,transparent);border-radius:3px;}
.footer .brand{font-size:20px;font-weight:800;color:#ffffff;margin:0 0 4px 0;}
.footer .brand-en{font-size:12px;color:rgba(255,255,255,0.35);margin:0 0 6px 0;letter-spacing:3px;}
.footer .website{font-size:12px;color:rgba(255,255,255,0.25);margin:0;}
`;
}

/* ──────────────── Dynamic CSS from Custom Template ──────────────── */
function cssFromCustom(t: CustomPdfTemplate): string {
  return `${SHARED_BASE}
html{background-color:${t.pageBg};}
body{
  background-color:${t.pageBg};
  color:${t.bodyTextColor};
}
.header{
  background:linear-gradient(160deg,${t.headerGradFrom} 0%,${t.headerGradTo} 100%);
  padding:20px 16px 14px;text-align:center;position:relative;overflow:hidden;
  border-bottom:2px solid ${t.headerBorderColor};
}
.header h1{font-size:26px;font-weight:800;color:#ffffff;margin-bottom:6px;position:relative;text-shadow:0 2px 12px rgba(0,0,0,0.4);}
.header .subtitle{font-size:14px;color:rgba(255,255,255,0.6);position:relative;}
.header .decorative-line{width:160px;height:2px;background:linear-gradient(90deg,transparent,${t.accentLineColor} 20%,${t.accentLineColor} 80%,transparent);margin:8px auto 0;border-radius:2px;position:relative;}
.header .brand-watermark{position:relative;margin-top:6px;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:3px;}

.section{
  background:${t.sectionBg};
  border:1px solid ${t.sectionBorder};
  box-shadow:0 4px 16px rgba(0,0,0,0.2);
}
.section:nth-child(even){
  background:${t.sectionAltBg};
  border-color:${t.sectionAltBorder};
}
.section-title{color:${t.sectionTitleColor};border-bottom:2px solid ${t.sectionBorder};}
.section:nth-child(even) .section-title{color:${t.sectionAltTitleColor};border-bottom-color:${t.sectionAltBorder};}
.section-desc{color:${t.bodyTextColor};}
.steps-label{color:${t.sectionTitleColor};}
.step-num{background:${t.stepNumBg};color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);}
.step-text{color:${t.bodyTextColor};}

.dua-box,.quran-quote{
  background:${t.duaBg};border:1px solid ${t.duaBorder};
  border-right:4px solid ${t.duaBorder};
}
.dua-arabic{color:${t.duaTextColor};}
.dua-note,.quran-reference{color:${t.accentLineColor};}

.hadith-quote{
  background:${t.sectionBg};border:1px solid ${t.sectionBorder};
  border-right:4px solid ${t.sectionTitleColor};color:${t.bodyTextColor};
}
.hadith-reference{color:${t.sectionTitleColor};}

.virtue-item,.lesson-item{background:${t.sectionBg};border:1px solid ${t.sectionBorder};color:${t.bodyTextColor};}
.virtue-item::before,.lesson-item::before{color:${t.accentLineColor};}
p{color:${t.bodyTextColor};}
h2{color:${t.sectionTitleColor};border-bottom:2px solid ${t.sectionBorder};}
.decorative-divider{color:${t.accentLineColor};}
.decorative-divider::before,.decorative-divider::after{background:linear-gradient(90deg,transparent,${t.headerGradTo} 50%,transparent);}

.footer{
  text-align:center;padding:14px 16px;
  background:linear-gradient(160deg,${t.headerGradFrom} 0%,${t.headerGradTo} 100%);
  position:relative;overflow:hidden;
}
.footer::before{content:'';position:absolute;top:0;left:8%;right:8%;height:3px;background:linear-gradient(90deg,transparent,${t.accentLineColor} 30%,${t.accentLineColor} 70%,transparent);border-radius:3px;}
.footer .brand{font-size:20px;font-weight:800;color:${t.footerBrandColor};margin:0 0 4px 0;}
.footer .brand-en{font-size:12px;color:rgba(255,255,255,0.35);margin:0 0 6px 0;letter-spacing:3px;}
.footer .website{font-size:12px;color:rgba(255,255,255,0.25);margin:0;}
`;
}

/* ──────────────── Background color map for custom bg templates ──────────────── */
const BG_DOMINANT_COLORS: Record<string, string> = {
  background1: '#1a2744',
  background2: '#1a4d2e',
  background3: '#2d1b4e',
  background4: '#4a3520',
  background5: '#0d3d38',
  background6: '#4a1a2e',
  background7: '#2a2a2a',
};

function cssCustomBackground(bgKey: string): string {
  const bg = BG_DOMINANT_COLORS[bgKey] || '#1a4d2e';
  return `${SHARED_BASE}
html{background-color:${bg};}
body{
  background-color:${bg};
  color:#e8f0ed;
}
.header{
  background:linear-gradient(160deg,${bg} 0%,rgba(255,255,255,0.08) 100%);
  padding:20px 16px 14px;text-align:center;position:relative;overflow:hidden;
  border-bottom:2px solid rgba(255,255,255,0.15);
}
.header h1{font-size:26px;font-weight:800;color:#ffffff;margin-bottom:6px;position:relative;text-shadow:0 2px 12px rgba(0,0,0,0.4);}
.header .subtitle{font-size:14px;color:rgba(255,255,255,0.6);position:relative;}
.header .decorative-line{width:160px;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4) 20%,rgba(255,255,255,0.6) 50%,rgba(255,255,255,0.4) 80%,transparent);margin:8px auto 0;border-radius:2px;position:relative;}
.header .brand-watermark{position:relative;margin-top:6px;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:3px;}

.section{
  background:rgba(255,255,255,0.06);
  border:1px solid rgba(255,255,255,0.12);
  box-shadow:0 4px 16px rgba(0,0,0,0.2);
}
.section:nth-child(even){
  background:rgba(255,255,255,0.04);
  border-color:rgba(255,255,255,0.1);
}
.section-title{color:rgba(255,255,255,0.9);border-bottom:2px solid rgba(255,255,255,0.15);}
.section:nth-child(even) .section-title{color:rgba(255,255,255,0.85);}
.section-desc{color:rgba(255,255,255,0.7);}
.steps-label{color:rgba(255,255,255,0.85);}
.step-num{background:rgba(255,255,255,0.15);color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);}
.step-text{color:rgba(255,255,255,0.8);}

.dua-box,.quran-quote{
  background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
  border-right:4px solid rgba(255,255,255,0.3);
}
.dua-arabic{color:rgba(255,255,255,0.92);}
.dua-note,.quran-reference{color:rgba(255,255,255,0.5);}

.hadith-quote{
  background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
  border-right:4px solid rgba(255,255,255,0.25);color:rgba(255,255,255,0.9);
}
.hadith-reference{color:rgba(255,255,255,0.5);}

.virtue-item,.lesson-item{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.85);}
.virtue-item::before,.lesson-item::before{color:rgba(255,255,255,0.5);}
p{color:rgba(255,255,255,0.8);}
h2{color:rgba(255,255,255,0.9);border-bottom:2px solid rgba(255,255,255,0.15);}
.decorative-divider{color:rgba(255,255,255,0.4);}
.decorative-divider::before,.decorative-divider::after{background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2) 50%,transparent);}

.footer{
  text-align:center;padding:14px 16px;
  background:linear-gradient(160deg,${bg} 0%,rgba(255,255,255,0.06) 100%);
  position:relative;overflow:hidden;
}
.footer::before{content:'';position:absolute;top:0;left:8%;right:8%;height:3px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3) 30%,rgba(255,255,255,0.5) 50%,rgba(255,255,255,0.3) 70%,transparent);border-radius:3px;}
.footer .brand{font-size:20px;font-weight:800;color:#ffffff;margin:0 0 4px 0;}
.footer .brand-en{font-size:12px;color:rgba(255,255,255,0.35);margin:0 0 6px 0;letter-spacing:3px;}
.footer .website{font-size:12px;color:rgba(255,255,255,0.25);margin:0;}
`;
}

function getCss(template: PdfTemplate): string {
  switch (template) {
    case 'royal': return cssRoyal();
    case 'classic': return cssClassic();
    default: return cssEmerald();
  }
}

async function getCssForTemplate(template: PdfTemplate): Promise<string> {
  // Custom background template (custom_bg:background1, etc.)
  if (template.startsWith('custom_bg:')) {
    const bgKey = template.replace('custom_bg:', '');
    return cssCustomBackground(bgKey);
  }
  // Built-in templates
  if (template === 'emerald' || template === 'royal' || template === 'classic') {
    return getCss(template);
  }
  // Custom template — look up from cache
  const customs = await getCustomTemplates();
  const custom = customs.find(t => t.id === template);
  if (custom) return cssFromCustom(custom);
  // Fallback to emerald
  return cssEmerald();
}

interface PdfLinks {
  appStore: string;
  playStore: string;
}

const DEFAULT_PDF_LINKS: PdfLinks = {
  appStore: 'https://apps.apple.com/app/rooh-muslim/id123456789',
  playStore: 'https://play.google.com/store/apps/details?id=com.rooh.almuslim',
};

/* \u2500\u2500\u2500\u2500 Inline SVG: Rooh Al-Muslim brand logo (mosque dome + crescent + 8-point star) \u2500\u2500\u2500\u2500 */
const LOGO_SVG = `<svg width="84" height="84" viewBox="0 0 84 84" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lg_dome" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fbbf24"/>
      <stop offset="0.55" stop-color="#c9a84c"/>
      <stop offset="1" stop-color="#9c7d2a"/>
    </linearGradient>
    <linearGradient id="lg_bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0d8e62"/>
      <stop offset="1" stop-color="#052e23"/>
    </linearGradient>
  </defs>
  <circle cx="42" cy="42" r="40" fill="url(#lg_bg)" stroke="#c9a84c" stroke-width="1.5"/>
  <g fill="none" stroke="#c9a84c" stroke-width="0.6" opacity="0.35">
    <path d="M42 8 L48 36 L76 42 L48 48 L42 76 L36 48 L8 42 L36 36 Z"/>
    <circle cx="42" cy="42" r="22"/>
  </g>
  <g transform="translate(42 50)">
    <path d="M-18 8 L-18 -4 Q-18 -18 -10 -22 Q-10 -28 -6 -28 Q-6 -22 -2 -22 Q0 -32 6 -22 Q6 -28 10 -28 Q10 -22 18 -18 Q18 -4 18 -4 L18 8 Z" fill="url(#lg_dome)" stroke="#fbbf24" stroke-width="0.6"/>
    <rect x="-2" y="-4" width="4" height="12" fill="#06170f" opacity="0.6"/>
    <circle cx="0" cy="-22" r="2" fill="#fbbf24"/>
  </g>
  <g transform="translate(42 22)" fill="#fbbf24">
    <path d="M-5 0 a5 5 0 1 0 5 5 a4 4 0 1 1 -5 -5 z"/>
    <circle cx="6" cy="-1" r="1.2"/>
  </g>
</svg>`;

/* App Store + Google Play icons (inline SVG, white fill) */
const ICON_APPLE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 12.04c-.02-2.42 1.98-3.59 2.07-3.65-1.13-1.65-2.89-1.88-3.52-1.91-1.5-.15-2.93.88-3.69.88-.77 0-1.95-.86-3.21-.84-1.65.02-3.18.96-4.03 2.44-1.72 2.98-.44 7.39 1.23 9.81.82 1.18 1.79 2.51 3.06 2.46 1.23-.05 1.69-.79 3.18-.79 1.47 0 1.9.79 3.21.77 1.32-.02 2.16-1.2 2.97-2.39.94-1.37 1.32-2.7 1.34-2.77-.03-.01-2.57-.99-2.61-3.91zM14.62 4.85c.68-.82 1.13-1.97.99-3.11-.96.04-2.12.64-2.82 1.45-.63.73-1.18 1.89-1.03 3.01 1.07.08 2.17-.55 2.86-1.35z"/></svg>`;
const ICON_PLAY = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3.6 2.3C3.2 2.6 3 3.1 3 3.8v16.5c0 .6.2 1.1.6 1.4l9.4-9.8L3.6 2.3zm11.6 9l2.6-1.5c1.4-.8 1.4-2.1 0-2.9L15.2 5.3 12.6 8l2.6 3.3zM4.8 1.7l8.8 8.4-2.5 2.5L4.8 1.7zm0 20.6l6.3-10.9 2.5 2.5-8.8 8.4z" fill-opacity="0.95"/></svg>`;

function buildPdfHtml(title: string, contentHtml: string, css: string, links: PdfLinks = DEFAULT_PDF_LINKS): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${css}</style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="decorative-line"></div>
    <div class="brand-watermark">R U H &nbsp; A L - M U S L I M</div>
  </div>
  <div class="content">
    ${contentHtml}
  </div>
  <div class="footer">
    <div class="footer-pattern"></div>
    <div class="footer-inner">
      <div class="footer-logo">${LOGO_SVG}</div>
      <p class="brand">\u0631\u064f\u0648\u062d \u0627\u0644\u0645\u0633\u0644\u0645</p>
      <p class="brand-en">RUH AL-MUSLIM</p>
      <div class="footer-ornament">\u2766 \u2724 \u2766</div>
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
      <p class="website">rooh-almuslim.com</p>
    </div>
  </div>
</body>
</html>`;
}

export async function exportAsPDF(title: string, htmlContent: string, templateOverride?: PdfTemplate): Promise<void> {
  const template = templateOverride ?? await getSavedTemplate();
  const css = await getCssForTemplate(template);

  // Read store links from Firestore config
  let links = DEFAULT_PDF_LINKS;
  try {
    const { getStoreUrls } = await import('@/lib/app-config-api');
    const storeUrls = await getStoreUrls();
    if (storeUrls.ios || storeUrls.android) {
      links = {
        appStore: storeUrls.ios || DEFAULT_PDF_LINKS.appStore,
        playStore: storeUrls.android || DEFAULT_PDF_LINKS.playStore,
      };
    }
  } catch {}

  const fullHtml = buildPdfHtml(title, htmlContent, css, links);
  const { uri } = await Print.printToFileAsync({ html: fullHtml });
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
  } catch {
    // Ad not available — proceed anyway
  }
  await exportFn();
}
