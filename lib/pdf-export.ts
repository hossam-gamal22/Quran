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

/* ──────────────────── Shared base styles ──────────────────── */
const SHARED_BASE = `
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Amiri:wght@400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important;}
html{width:100%;height:100%;min-height:100%;-webkit-print-color-adjust:exact !important;}
body{width:100%;min-height:100%;font-family:'Cairo',-apple-system,'Segoe UI',sans-serif;direction:rtl;line-height:1.8;font-size:15px;padding:12mm 8mm;-webkit-print-color-adjust:exact !important;}
body::before{content:'';position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;background:inherit;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
.content{padding:16px 10px;}
.section{padding:28px 22px 20px 22px;margin-top:20px;margin-bottom:14px;position:relative;border-radius:14px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}
.section-title{font-size:19px;font-weight:700;margin-bottom:10px;padding-bottom:8px;text-align:center;break-after:avoid;-webkit-column-break-after:avoid;page-break-after:avoid;}
.section-desc{font-size:14px;margin-bottom:8px;line-height:1.8;text-align:justify;}
.steps-label{font-size:13px;font-weight:600;margin-bottom:6px;break-after:avoid;-webkit-column-break-after:avoid;page-break-after:avoid;}
.step{display:flex;flex-direction:row;gap:8px;margin-bottom:6px;align-items:flex-start;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}
.step-num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;color:#fff;font-size:11px;font-weight:700;flex-shrink:0;}
.step-text{flex:1;font-size:13px;line-height:1.7;}
.dua-box,.quran-quote{padding:14px 16px;margin:8px 0;position:relative;border-radius:10px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}
.dua-arabic{font-size:16px;line-height:1.9;font-family:'Amiri','Cairo',serif;}
.dua-note,.quran-reference{font-size:11px;margin-top:4px;font-weight:500;}
.hadith-quote{padding:14px 16px;font-family:'Amiri',serif;font-size:16px;line-height:1.9;margin:8px 0;border-radius:10px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}
.hadith-reference{text-align:left;font-size:11px;margin-top:6px;font-weight:500;font-family:'Cairo',sans-serif;}
.virtue-item,.lesson-item{padding:8px 14px;padding-right:32px;border-radius:8px;font-size:13px;text-align:right;position:relative;margin-bottom:5px;break-inside:avoid;-webkit-column-break-inside:avoid;page-break-inside:avoid;}
.virtue-item::before,.lesson-item::before{content:'\\2726';position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:13px;}
p{margin-bottom:8px;text-align:justify;line-height:1.8;font-size:14px;}
h2{font-size:19px;margin-bottom:14px;padding-bottom:8px;text-align:center;break-after:avoid;-webkit-column-break-after:avoid;page-break-after:avoid;}
.decorative-divider{display:flex;align-items:center;justify-content:center;gap:10px;margin:18px 0;}
.decorative-divider::before,.decorative-divider::after{content:'';flex:1;height:2px;}
.decorative-divider span{font-size:18px;}
.footer{margin-top:60px;padding:14px 16px 20px;break-inside:avoid;page-break-inside:avoid;}
.store-links{margin-top:8px;display:flex;justify-content:center;align-items:center;gap:8px;}
.store-link{color:#ffffff;text-decoration:underline;font-size:13px;opacity:0.7;}
.store-sep{opacity:0.4;font-size:10px;color:#ffffff;}
@page{margin:0;size:auto;}
`;

/* ──────────────── Template 1 — Emerald Dark ──────────────── */
function cssEmerald(): string {
  return `${SHARED_BASE}
html{background-color:#0a1f1a;}
body{
  background-color:#0a1f1a;
  color:#e8f0ed;
}
.header{
  background:linear-gradient(160deg,#052e23 0%,#0b513f 40%,#22C55E 100%);
  padding:20px 16px 14px;text-align:center;position:relative;overflow:hidden;
  border-bottom:2px solid rgba(201,168,76,0.4);
}
.header h1{font-size:26px;font-weight:800;color:#ffffff;margin-bottom:6px;position:relative;text-shadow:0 2px 12px rgba(0,0,0,0.4);}
.header .subtitle{font-size:14px;color:rgba(255,255,255,0.6);position:relative;}
.header .decorative-line{width:160px;height:2px;background:linear-gradient(90deg,transparent,#c9a84c 20%,#fbbf24 50%,#c9a84c 80%,transparent);margin:8px auto 0;border-radius:2px;position:relative;}
.header .brand-watermark{position:relative;margin-top:6px;font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:3px;}

.section{
  background:rgba(15,152,127,0.12);
  border:1px solid rgba(15,152,127,0.25);
  box-shadow:0 4px 16px rgba(0,0,0,0.2);
}
.section:nth-child(even){
  background:rgba(201,168,76,0.08);
  border-color:rgba(201,168,76,0.2);
}
.section-title{color:#4eecc4;border-bottom:2px solid rgba(78,236,196,0.2);}
.section:nth-child(even) .section-title{color:#e8c66a;border-bottom-color:rgba(232,198,106,0.2);}
.section-desc{color:rgba(232,240,237,0.8);}
.steps-label{color:#4eecc4;}
.step-num{background:#22C55E;box-shadow:0 2px 6px rgba(15,152,127,0.3);}
.step-text{color:rgba(232,240,237,0.85);}
.section:nth-child(even) .step-num{background:#b8941f;}

.dua-box,.quran-quote{
  background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.2);
  border-right:4px solid #c9a84c;
}
.dua-arabic{color:#f0ece0;}
.dua-note,.quran-reference{color:#c9a84c;}

.hadith-quote{
  background:rgba(15,152,127,0.08);border:1px solid rgba(15,152,127,0.2);
  border-right:4px solid #22C55E;color:#e8f0ed;
}
.hadith-reference{color:#4eecc4;}

.virtue-item,.lesson-item{background:rgba(15,152,127,0.1);border:1px solid rgba(15,152,127,0.15);color:rgba(232,240,237,0.85);}
.virtue-item::before,.lesson-item::before{color:#c9a84c;}
p{color:rgba(232,240,237,0.85);}
h2{color:#4eecc4;border-bottom:2px solid rgba(78,236,196,0.2);}
.decorative-divider{color:#c9a84c;}
.decorative-divider::before,.decorative-divider::after{background:linear-gradient(90deg,transparent,#22C55E 30%,#c9a84c 50%,#22C55E 70%,transparent);}

.footer{
  text-align:center;padding:14px 16px;
  background:linear-gradient(160deg,#052e23 0%,#0b513f 50%,#22C55E 100%);
  position:relative;overflow:hidden;
}
.footer::before{content:'';position:absolute;top:0;left:8%;right:8%;height:3px;background:linear-gradient(90deg,transparent,#c9a84c 30%,#fbbf24 50%,#c9a84c 70%,transparent);border-radius:3px;}
.footer .brand{font-size:20px;font-weight:800;color:#ffffff;margin:0 0 4px 0;}
.footer .brand-en{font-size:12px;color:rgba(255,255,255,0.4);margin:0 0 6px 0;letter-spacing:3px;}
.footer .website{font-size:12px;color:rgba(255,255,255,0.3);margin:0;}
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
  appStore: '',
  playStore: 'https://play.google.com/store/apps/details?id=com.rooh.almuslim',
};

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
    <p class="brand">\u0631\u064f\u0648\u062d \u0627\u0644\u0645\u0633\u0644\u0645</p>
    <p class="brand-en">RUH AL-MUSLIM</p>
    <p class="website">rooh-almuslim.com</p>
    <div class="store-links">
      <a href="${links.appStore}" target="_blank" class="store-link">App Store</a>
      <span class="store-sep">|</span>
      <a href="${links.playStore}" target="_blank" class="store-link">Google Play</a>
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
