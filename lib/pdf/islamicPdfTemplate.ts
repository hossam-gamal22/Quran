import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/constants/app';

export type IslamicPdfSection = {
  title?: string;
  body: string | string[];
  continuation?: boolean;
  keepTogether?: boolean;
  largeText?: boolean;
};

export type IslamicPdfData = {
  title: string;
  subtitle?: string;
  shortDescription?: string;
  category?: string;
  sections: IslamicPdfSection[];
  virtues?: string[];
  footerTitle?: string;
  closingDua?: string;
};

export const ISLAMIC_PDF_APP_LINKS = {
  appStore: APP_STORE_URL,
  playStore: PLAY_STORE_URL,
};

let rubikFontCssPromise: Promise<string> | null = null;
let appLogoDataUriPromise: Promise<string> | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeTextList(value?: string | string[]): string[] {
  if (!value) return [];
  const items = Array.isArray(value) ? value : value.split(/\n{2,}/);
  return items.map(item => item.trim()).filter(Boolean);
}

async function readAssetBase64(moduleRef: number): Promise<string> {
  const [asset] = await Asset.loadAsync([moduleRef]);
  return FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

async function getAppLogoDataUri(): Promise<string> {
  if (appLogoDataUriPromise) return appLogoDataUriPromise;
  appLogoDataUriPromise = (async () => {
    try {
      const base64 = await readAssetBase64(require('../../assets/images/icons/icon.png'));
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      console.log('Islamic PDF app logo embedding failed', error);
      return '';
    }
  })();
  return appLogoDataUriPromise;
}

export async function getIslamicPdfRubikFontCss(): Promise<string> {
  if (rubikFontCssPromise) return rubikFontCssPromise;
  rubikFontCssPromise = (async () => {
    try {
      const [regular, medium, semiBold, bold] = await Promise.all([
        readAssetBase64(require('../../assets/fonts/Rubik-Regular.ttf')),
        readAssetBase64(require('../../assets/fonts/Rubik-Medium.ttf')),
        readAssetBase64(require('../../assets/fonts/Rubik-SemiBold.ttf')),
        readAssetBase64(require('../../assets/fonts/Rubik-Bold.ttf')),
      ]);

      return `
@font-face{font-family:"Rubik";src:url(data:font/truetype;charset=utf-8;base64,${regular}) format("truetype");font-weight:400;font-style:normal;font-display:swap;}
@font-face{font-family:"Rubik";src:url(data:font/truetype;charset=utf-8;base64,${medium}) format("truetype");font-weight:500;font-style:normal;font-display:swap;}
@font-face{font-family:"Rubik";src:url(data:font/truetype;charset=utf-8;base64,${semiBold}) format("truetype");font-weight:600;font-style:normal;font-display:swap;}
@font-face{font-family:"Rubik";src:url(data:font/truetype;charset=utf-8;base64,${bold}) format("truetype");font-weight:700 900;font-style:normal;font-display:swap;}`;
    } catch (error) {
      console.log('Islamic PDF Rubik font embedding failed', error);
      return '';
    }
  })();
  return rubikFontCssPromise;
}

function ornamentSvg(className = 'ornament'): string {
  return `<svg class="${className}" viewBox="0 0 96 96" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round">
      <path d="M48 8c8 12 8 24 0 36-8-12-8-24 0-36Z"/>
      <path d="M48 88c-8-12-8-24 0-36 8 12 8 24 0 36Z"/>
      <path d="M8 48c12-8 24-8 36 0-12 8-24 8-36 0Z"/>
      <path d="M88 48c-12 8-24 8-36 0 12-8 24-8 36 0Z"/>
      <path d="M20 20c14 3 23 11 26 25-14-3-23-11-26-25Z"/>
      <path d="M76 76c-14-3-23-11-26-25 14 3 23 11 26 25Z"/>
      <path d="M76 20c-3 14-11 23-25 26 3-14 11-23 25-26Z"/>
      <path d="M20 76c3-14 11-23 25-26-3 14-11 23-25 26Z"/>
      <circle cx="48" cy="48" r="11"/>
    </g>
  </svg>`;
}

function divider(className = 'divider'): string {
  return `<div class="${className}"><span></span><i>✦</i><span></span></div>`;
}

function coverPatternGrid(): string {
  return '';
}

function buildParagraphs(body: string | string[]): string {
  return normalizeTextList(body)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('');
}

function shouldInsertFlowPageSpacer(index: number, isContinuation: boolean): boolean {
  return index > 0 && !isContinuation;
}

function buildFlowSection(section: IslamicPdfSection, index: number, data: IslamicPdfData): string {
  const sectionTitle = section.title?.trim() || data.title;
  const pageSpacer = shouldInsertFlowPageSpacer(index, !!section.continuation)
    ? '<div class="flow-page-spacer" aria-hidden="true"></div>'
    : '';
  const continuationSpacer = index > 0 && section.continuation
    ? '<div class="flow-continuation-spacer" aria-hidden="true"></div>'
    : '';
  const className = [
    'flow-section',
    section.continuation ? 'flow-section-continuation' : '',
    section.keepTogether ? 'flow-section-keep' : '',
    section.largeText ? 'flow-section-large' : '',
  ].filter(Boolean).join(' ');
  const titleMarkup = section.continuation ? '' : `<h2 class="flow-section-title">${escapeHtml(sectionTitle)}</h2>`;
  return `${pageSpacer}${continuationSpacer}<section class="${className}">
    ${titleMarkup}
    <div class="flow-section-body">${buildParagraphs(section.body)}</div>
  </section>`;
}

function buildFlowContent(data: IslamicPdfData, logoDataUri = ''): string {
  const eyebrow = data.category?.trim() || data.footerTitle?.trim() || 'رُوح المسلم';
  const description = data.shortDescription?.trim();
  const sections = data.sections.map((section, index) => buildFlowSection(section, index, data)).join('');
  const virtues = data.virtues?.map(item => item.trim()).filter(Boolean) || [];

  return `<main class="flow-content">
    <header class="flow-document-header">
      <div class="eyebrow">﴿ ${escapeHtml(eyebrow)} ﴾</div>
      <h1>${escapeHtml(data.title)}</h1>
      ${data.subtitle?.trim() ? `<p class="flow-subtitle">${escapeHtml(data.subtitle.trim())}</p>` : ''}
      ${description ? `<p class="flow-description">${escapeHtml(description)}</p>` : ''}
    </header>
    ${sections}
    ${data.closingDua?.trim() ? `<section class="flow-section flow-closing"><p>${escapeHtml(data.closingDua.trim())}</p></section>` : ''}
    ${virtues.length ? `<section class="flow-section flow-virtues">
      <h2 class="flow-section-title">الدروس والفضائل</h2>
      <div class="flow-virtues-grid">
        ${virtues.map(item => `<div class="flow-virtue"><span>✦</span>${escapeHtml(item)}</div>`).join('')}
      </div>
    </section>` : ''}
  </main>`;
}

type ContentPageChunk = {
  body: string[];
  isContinuation: boolean;
};

const CONTENT_CHARS_PER_LINE = 48;
const FIRST_CONTENT_PAGE_LINES = 12;
const CONTINUATION_CONTENT_PAGE_LINES = 14;

function estimateLineCount(paragraph: string): number {
  return Math.max(1, Math.ceil(paragraph.length / CONTENT_CHARS_PER_LINE));
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];

  const parts: string[] = [];
  let remaining = paragraph.trim();
  while (remaining.length > maxChars) {
    const window = remaining.slice(0, maxChars);
    const punctuationCut = Math.max(
      window.lastIndexOf('،'),
      window.lastIndexOf('؛'),
      window.lastIndexOf('.'),
      window.lastIndexOf('؟'),
      window.lastIndexOf('!'),
    );
    const spaceCut = window.lastIndexOf(' ');
    const cut = punctuationCut > maxChars * 0.55 ? punctuationCut + 1 : Math.max(spaceCut, Math.floor(maxChars * 0.75));
    parts.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

function chunkParagraphs(paragraphs: string[]): ContentPageChunk[] {
  const chunks: ContentPageChunk[] = [];
  let current: string[] = [];
  let currentLines = 0;

  const flush = () => {
    if (!current.length) return;
    chunks.push({
      body: current,
      isContinuation: chunks.length > 0,
    });
    current = [];
    currentLines = 0;
  };

  paragraphs.forEach(sourceParagraph => {
    const maxLines = chunks.length === 0 ? FIRST_CONTENT_PAGE_LINES : CONTINUATION_CONTENT_PAGE_LINES;
    const maxChars = maxLines * CONTENT_CHARS_PER_LINE;
    const normalized = splitLongParagraph(sourceParagraph, maxChars);

    normalized.forEach(paragraph => {
      const nextLines = estimateLineCount(paragraph) + (current.length ? 1 : 0);
      const pageLines = chunks.length === 0 ? FIRST_CONTENT_PAGE_LINES : CONTINUATION_CONTENT_PAGE_LINES;
      if (current.length && currentLines + nextLines > pageLines) {
        flush();
      }
      current.push(paragraph);
      currentLines += estimateLineCount(paragraph) + (current.length > 1 ? 1 : 0);
    });
  });

  flush();
  return chunks.length ? chunks : [{ body: [], isContinuation: false }];
}

function buildContentSection(section: IslamicPdfSection, pageNumber: number, data: IslamicPdfData, chunk: ContentPageChunk): string {
  const sectionTitle = section.title?.trim() || data.title;
  const eyebrow = data.category?.trim() || data.footerTitle?.trim() || 'رُوح المسلم';
  const pageClass = chunk.isContinuation ? 'pdf-page content-page continuation-page' : 'pdf-page content-page';

  return `<section class="${pageClass}">
    ${chunk.isContinuation ? '' : `<header class="content-header">
      <div class="eyebrow">﴿ ${escapeHtml(eyebrow)} ﴾</div>
      <h2>${escapeHtml(sectionTitle)}</h2>
    </header>`}
    <article class="content-box">
      ${buildParagraphs(chunk.body)}
    </article>
    <footer class="page-footer">
      <span>${escapeHtml(data.footerTitle || 'رُوح المسلم')}</span>
      <span>${pageNumber}</span>
    </footer>
  </section>`;
}

function buildContentSections(data: IslamicPdfData): string[] {
  const pages: string[] = [];
  data.sections.forEach(section => {
    const chunks = chunkParagraphs(normalizeTextList(section.body));
    chunks.forEach(chunk => {
      pages.push(buildContentSection(section, pages.length + 2, data, chunk));
    });
  });
  return pages;
}

function buildVirtuesPage(data: IslamicPdfData, pageNumber: number): string {
  const virtues = data.virtues?.map(item => item.trim()).filter(Boolean) || [];
  if (!virtues.length && !data.closingDua?.trim()) return '';

  return `<section class="pdf-page content-page">
    <div class="page-arc arc-top"></div>
    <div class="page-arc arc-bottom"></div>
    <header class="content-header compact-header">
      <div class="eyebrow">﴿ ${escapeHtml(data.category || data.footerTitle || 'رُوح المسلم')} ﴾</div>
      <h2>الدروس والفضائل</h2>
    </header>
    ${data.closingDua?.trim() ? `<article class="content-box closing-box"><p>${escapeHtml(data.closingDua.trim())}</p></article>` : ''}
    ${virtues.length ? `<section class="virtues-wrap">
      <h3>الفضائل</h3>
      <div class="virtues-grid">
        ${virtues.map(item => `<div class="virtue-pill"><span>✦</span>${escapeHtml(item)}</div>`).join('')}
      </div>
    </section>` : ''}
    <footer class="page-footer">
      <span>${escapeHtml(data.footerTitle || 'رُوح المسلم')}</span>
      <span>${pageNumber}</span>
    </footer>
  </section>`;
}

const ICON_APPLE = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="48" height="48" aria-hidden="true"><path fill="#ffffff" d="M17.05 12.04c-.02-2.42 1.98-3.59 2.07-3.65-1.13-1.65-2.89-1.88-3.52-1.91-1.5-.15-2.93.88-3.69.88-.77 0-1.95-.86-3.21-.84-1.65.02-3.18.96-4.03 2.44-1.72 2.98-.44 7.39 1.23 9.81.82 1.18 1.79 2.51 3.06 2.46 1.23-.05 1.69-.79 3.18-.79 1.47 0 1.9.79 3.21.77 1.32-.02 2.16-1.2 2.97-2.39.94-1.37 1.32-2.7 1.34-2.77-.03-.01-2.57-.99-2.61-3.91zM14.62 4.85c.68-.82 1.13-1.97.99-3.11-.96.04-2.12.64-2.82 1.45-.63.73-1.18 1.89-1.03 3.01 1.07.08 2.17-.55 2.86-1.35z"/></svg>`;
// iOS WebKit PDF refuses to rasterise a 2nd inline `<svg>` inside an `<a>` in
// some scenarios (renders the broken-image placeholder). Fall back to a
// CSS-only triangle drawn with borders for the Play icon — works on both engines.
const ICON_PLAY = `<span class="play-triangle" aria-hidden="true"></span>`;

function buildAppLinksPage(data: IslamicPdfData, pageNumber: number | string, logoDataUri = ''): string {
  const logoBlock = logoDataUri
    ? `<div class="app-logo"><img src="${logoDataUri}" alt="رُوح المسلم" /></div>`
    : `<div class="app-logo app-logo-fallback"><span>رُوح</span></div>`;
  return `<section class="pdf-page app-page">
    <div class="outer-frame"></div>
    <div class="app-box">
      ${logoBlock}
      <div class="app-name">رُوح المسلم</div>
      <p class="app-copy">رفيقك اليومي للقرآن والأذكار والمواقيت والسيرة</p>
      <div class="app-links">
        <a class="store-btn" href="${APP_STORE_URL}" target="_blank" rel="noopener">
          <span class="store-btn-icon">${ICON_APPLE}</span>
          <span class="store-btn-text"><small>تحميل من</small><strong>App Store</strong><em>apps.apple.com</em></span>
        </a>
        <a class="store-btn" href="${PLAY_STORE_URL}" target="_blank" rel="noopener">
          <span class="store-btn-icon">${ICON_PLAY}</span>
          <span class="store-btn-text"><small>تحميل من</small><strong>Google Play</strong><em>play.google.com</em></span>
        </a>
      </div>
    </div>
    <footer class="page-footer">
      <span>${escapeHtml(data.footerTitle || 'رُوح المسلم')}</span>
      <span>${pageNumber}</span>
    </footer>
  </section>`;
}

function buildAppLinksBlock(logoDataUri = ''): string {
  const logoBlock = logoDataUri
    ? `<div class="flow-app-logo"><img src="${logoDataUri}" alt="رُوح المسلم" /></div>`
    : '';
  return `<section class="flow-app-block">
    ${logoBlock}
    <div class="flow-app-copy">
      <h2>رُوح المسلم</h2>
      <p>رفيقك اليومي للقرآن والأذكار والمواقيت والسيرة</p>
    </div>
    <div class="flow-app-links">
      <a class="store-btn" href="${APP_STORE_URL}" target="_blank" rel="noopener">
        <span class="store-btn-icon">${ICON_APPLE}</span>
        <span class="store-btn-text"><small>تحميل من</small><strong>App Store</strong><em>apps.apple.com</em></span>
      </a>
      <a class="store-btn" href="${PLAY_STORE_URL}" target="_blank" rel="noopener">
        <span class="store-btn-icon">${ICON_PLAY}</span>
        <span class="store-btn-text"><small>تحميل من</small><strong>Google Play</strong><em>play.google.com</em></span>
      </a>
    </div>
  </section>`;
}

export function buildIslamicPdfHtmlWithRawContent(
  data: Omit<IslamicPdfData, 'sections'> & { contentHtml: string },
  fontCss = '',
  logoDataUri = '',
): string {
  const safeTitle = data.title.trim() || 'رُوح المسلم';
  const cover = buildCoverPage({
    ...data,
    title: safeTitle,
    sections: [],
  });

  return htmlDocument(`${cover}<main class="flow-content legacy-flow-content">
    <header class="flow-document-header">
      <div class="eyebrow">﴿ ${escapeHtml(data.category || data.footerTitle || 'رُوح المسلم')} ﴾</div>
      <h1>${escapeHtml(safeTitle)}</h1>
    </header>
    <div class="legacy-content">${data.contentHtml}</div>
  </main>${buildAppLinksPage({
    ...data,
    title: safeTitle,
    sections: [],
  }, 'تحميل التطبيق', logoDataUri)}`, fontCss);
}

function buildCoverPage(data: IslamicPdfData): string {
  const subtitle = data.subtitle?.trim();
  const description = data.shortDescription?.trim();

  return `<section class="pdf-page cover-page">
    ${coverPatternGrid()}
    <div class="cover-box">
      <div class="cover-ornament">${divider('ornament-line')}${ornamentSvg('cover-flower')}</div>
      <div class="bismillah">بسم الله الرحمن الرحيم</div>
      ${divider('cover-small-divider')}
      <h1>${escapeHtml(data.title)}</h1>
      ${subtitle ? `<h2>${escapeHtml(subtitle)}</h2>` : ''}
      ${divider('cover-small-divider')}
      ${description ? `<p class="cover-description">${escapeHtml(description)}</p>` : ''}
      <div class="cover-bottom-ornament">${divider('ornament-line')}${ornamentSvg('cover-flower')}</div>
    </div>
  </section>`;
}

function htmlDocument(content: string, extraCss = ''): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    ${extraCss}
    ${ISLAMIC_PDF_CSS}
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

export async function buildIslamicPdfHtml(data: IslamicPdfData): Promise<string> {
  const [fontCss, logoDataUri] = await Promise.all([
    getIslamicPdfRubikFontCss(),
    getAppLogoDataUri(),
  ]);
  const safeData: IslamicPdfData = {
    ...data,
    title: data.title.trim() || 'رُوح المسلم',
    sections: data.sections.length ? data.sections : [{ title: data.title, body: data.shortDescription || data.title }],
  };
  return htmlDocument(`${buildCoverPage(safeData)}${buildFlowContent(safeData, logoDataUri)}${buildAppLinksPage(safeData, 'تحميل التطبيق', logoDataUri)}`, fontCss);
}

export async function buildIslamicPdfHtmlFromHtmlContent(data: Omit<IslamicPdfData, 'sections'> & { contentHtml: string }): Promise<string> {
  const [fontCss, logoDataUri] = await Promise.all([
    getIslamicPdfRubikFontCss(),
    getAppLogoDataUri(),
  ]);
  return buildIslamicPdfHtmlWithRawContent({
    ...data,
    contentHtml: data.contentHtml,
  }, fontCss, logoDataUri);
}

const ISLAMIC_PDF_CSS = `
@page{size:794pt 1123pt;margin:0;}
*{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-family:"Rubik",Arial,sans-serif;}
html,body{width:1058.6667px;min-width:1058.6667px;margin:0;padding:0;background:#043222;color:#f7efd8;direction:rtl;unicode-bidi:plaintext;overflow-x:hidden;}
body{font-family:"Rubik",Arial,sans-serif;}
.pdf-page{position:relative;width:1058.6667px;height:100vh;max-height:100vh;overflow:hidden;background:#043222;
  background-image:none;
}
.cover-page{
  height:100vh;
  max-height:100vh;
  background-color:#033322;
  isolation:isolate;
}
.cover-page::before{content:"";position:absolute;inset:0;
  background:radial-gradient(circle at 50% 34%,rgba(7,88,62,.72) 0%,rgba(4,60,42,.92) 38%,#032f22 72%,#022519 100%);
  z-index:0;
}
.cover-pattern-grid{display:none;}
.page-arc{display:none;}
.arc-top{width:118mm;height:118mm;top:-44mm;left:118mm;}
.arc-bottom{width:126mm;height:126mm;bottom:-74mm;right:-18mm;}
.cover-arc-top{width:76mm;height:116mm;top:-34mm;left:111mm;border-color:rgba(207,177,90,.24);}
.cover-arc-right{width:108mm;height:108mm;top:35mm;left:164mm;border-color:rgba(207,177,90,.22);}
.cover-arc-bottom{width:116mm;height:116mm;bottom:-79mm;right:-36mm;border-color:rgba(207,177,90,.22);}
.outer-frame{position:absolute;inset:28mm 18mm;border:0.3mm solid rgba(205,177,93,.46);}
.cover-side-line{position:absolute;top:0;bottom:0;width:0.28mm;background:rgba(220,192,103,.78);}
.side-left{left:13mm;}
.side-right{right:13mm;}
.cover-side-line:before,.cover-side-line:after{content:"";position:absolute;left:50%;width:0.45mm;height:43mm;background:#043222;transform:translateX(-50%);}
.cover-side-line:before{top:58mm;}
.cover-side-line:after{bottom:44mm;}
.cover-side-line i{position:absolute;top:50%;left:50%;width:6mm;height:6mm;border:0.35mm solid rgba(220,192,103,.9);transform:translate(-50%,-50%) rotate(45deg);}
.cover-side-line i:before{content:"";position:absolute;inset:1.7mm;border:0.25mm solid rgba(220,192,103,.7);}
.cover-box{position:absolute;top:47.5%;left:109.3333px;right:109.3333px;transform:translateY(-50%);border:4px solid #d8bc68;border-radius:90.6667px;background:#064632;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%23d8bc68' stroke-width='1' opacity='.045'%3E%3Cpath d='M80 18 L92 68 L142 80 L92 92 L80 142 L68 92 L18 80 L68 68 Z'/%3E%3Ccircle cx='80' cy='80' r='34'/%3E%3Cpath d='M80 46 L114 80 L80 114 L46 80 Z'/%3E%3C/g%3E%3C/svg%3E"),linear-gradient(155deg,#07583e 0%,#05412f 56%,#032d22 100%);
  background-repeat:repeat,no-repeat;
  background-size:200px 200px,cover;
  background-position:center center,center;
  z-index:1;color:#f8f0d8;text-align:center;padding:85.3333px 80px 76px;box-shadow:inset 0 0 0 2.6667px rgba(238,216,130,.22),inset 0 0 90.6667px rgba(0,0,0,.18);
}
.cover-ornament,.cover-bottom-ornament{color:#d8bc68;display:flex;flex-direction:column;align-items:center;}
.cover-bottom-ornament{position:static;margin-top:9mm;}
.cover-flower{width:18mm;height:18mm;color:#d8bc68;order:-1;margin-bottom:-4mm;}
.ornament-line{width:92mm;margin:0 auto 18mm;display:flex;align-items:center;gap:5mm;color:#d8bc68;}
.cover-bottom-ornament .ornament-line{margin:0 auto;}
.ornament-line span{display:block;height:.25mm;flex:1;background:linear-gradient(90deg,transparent,#c5a853,transparent);}
.ornament-line i,.cover-small-divider i{font-style:normal;color:#fbf3d8;}
.bismillah{font-size:29.3333px;line-height:1.9;font-weight:600;color:#d8bc68;margin:0 0 11mm;}
.cover-small-divider{width:27mm;margin:0 auto 12mm;display:flex;align-items:center;gap:3mm;color:#d8bc68;}
.cover-small-divider span{height:.25mm;flex:1;background:#c5a853;}
.cover-page h1{font-size:66.6667px;line-height:1.34;font-weight:800;color:#fff9e8;margin:0;text-align:center;}
.cover-page h2{font-size:53.3333px;line-height:1.42;font-weight:800;color:#d8bc68;margin:1mm 0 8mm;text-align:center;}
.cover-description{font-size:28px;line-height:2;font-weight:500;color:#f4ecd8;margin:0 auto;max-width:116mm;text-align:center;}
.content-page{display:flex;flex-direction:column;justify-content:flex-start;padding-bottom:14mm;}
.content-header{position:relative;z-index:1;text-align:center;padding:14mm 18mm 4mm;flex:0 0 auto;break-after:avoid;page-break-after:avoid;}
.eyebrow{font-size:15px;line-height:1.6;color:#d8bc68;font-weight:600;margin-bottom:4mm;}
.content-header h2{margin:0 auto;color:#f8e8ba;font-size:35px;line-height:1.38;font-weight:800;text-align:center;break-inside:avoid;page-break-inside:avoid;}
.compact-header{padding-top:18mm;padding-bottom:4mm;}
.content-box{position:relative;z-index:1;margin:0 auto;width:174mm;border:.3mm solid rgba(205,177,93,.46);border-radius:10mm;background:#063324;padding:8mm 10mm;flex:0 1 auto;break-inside:avoid;page-break-inside:avoid;}
.continuation-page .content-box{margin-top:14mm;}
.content-box p{margin:0 0 4mm;color:#f6efdf;font-size:24px;line-height:1.78;font-weight:500;text-align:right;direction:rtl;unicode-bidi:plaintext;break-inside:avoid;page-break-inside:avoid;}
.content-box p:last-child{margin-bottom:0;}
.closing-box{margin-top:2mm;}
.content-page .page-footer{position:static;margin:auto 18mm 0;width:auto;left:auto;right:auto;bottom:auto;flex:0 0 auto;}
.virtues-wrap{position:relative;z-index:1;width:163mm;margin:8mm auto 0;}
.virtues-wrap h3{height:10mm;border:.35mm solid rgba(205,177,93,.58);border-radius:8mm;color:#f4d584;font-size:19px;line-height:9.2mm;text-align:right;padding:0 12mm;margin:0 0 4mm;font-weight:800;}
.virtues-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;}
.virtue-pill{min-height:13mm;border:.35mm solid rgba(205,177,93,.48);border-radius:8mm;background:#0b3f2e;color:#fbf2d8;font-size:13.5px;font-weight:700;line-height:1.6;display:flex;align-items:center;justify-content:center;gap:3mm;text-align:center;padding:2mm 5mm;}
.virtue-pill span{color:#d8bc68;}
.page-footer{position:absolute;z-index:1;left:18mm;right:18mm;bottom:8mm;display:flex;align-items:center;justify-content:space-between;color:rgba(216,188,104,.78);font-size:10px;font-weight:500;border-top:.25mm solid rgba(216,188,104,.28);padding-top:3mm;}
.legacy-content-page{height:auto;min-height:297mm;overflow:visible;padding-bottom:16mm;}
.legacy-content-page .page-footer{position:relative;margin:9mm 18mm 0;width:auto;left:auto;right:auto;bottom:auto;break-inside:avoid;page-break-inside:avoid;}
.legacy-content{position:relative;z-index:1;width:163mm;margin:0 auto 0;orphans:3;widows:3;}
.legacy-content .section{border:.3mm solid rgba(205,177,93,.46);border-radius:10mm;background:#063324;padding:12mm;margin:0 0 9mm;break-inside:auto;page-break-inside:auto;}
.legacy-content .section-title{font-size:26px;line-height:1.55;font-weight:800;color:#f8e8ba;text-align:center;margin:0 0 8mm;break-after:avoid;page-break-after:avoid;break-inside:avoid;page-break-inside:avoid;}
.legacy-content .section-desc,.legacy-content p{font-size:19px;line-height:2.05;color:#f6efdf;text-align:right;margin:0 0 6mm;direction:rtl;unicode-bidi:plaintext;break-inside:avoid;page-break-inside:avoid;}
.legacy-content .steps-label{font-size:17px;font-weight:800;color:#d8bc68;margin:7mm 0 4mm;}
.legacy-content .virtue-item,.legacy-content .lesson-item{border:.3mm solid rgba(205,177,93,.46);border-radius:8mm;background:#0b3f2e;color:#fbf2d8;font-size:13.5px;font-weight:700;line-height:1.7;display:inline-flex;align-items:center;justify-content:center;min-width:73mm;margin:2mm;padding:3mm 5mm;text-align:center;}
.legacy-content .virtue-item:before,.legacy-content .lesson-item:before{content:"✦";color:#d8bc68;margin-left:3mm;}
.legacy-content .dua-box,.legacy-content .quran-quote,.legacy-content .hadith-quote{border:.35mm solid rgba(205,177,93,.58);border-radius:8mm;background:#0b3f2e;padding:7mm;margin:5mm 0;color:#fbf2d8;text-align:center;}
.legacy-content .dua-arabic{font-size:20px;line-height:2;color:#f8e8ba;}
.legacy-content .dua-note,.legacy-content .quran-reference,.legacy-content .hadith-reference{font-size:12px;line-height:1.8;color:#d8bc68;margin-top:3mm;}
.legacy-content .step{display:flex;gap:4mm;align-items:flex-start;margin-bottom:4mm;}
.legacy-content .step-num{display:inline-flex;align-items:center;justify-content:center;min-width:8mm;height:8mm;border-radius:50%;border:.3mm solid #d8bc68;color:#d8bc68;font-size:12px;font-weight:700;}
.legacy-content .step-text{flex:1;font-size:15px;line-height:2;color:#f6efdf;}
.flow-content{width:100%;min-height:0;margin:0;background:#043222;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%23d8bc68' stroke-width='1' opacity='.055'%3E%3Cpath d='M80 18 L92 68 L142 80 L92 92 L80 142 L68 92 L18 80 L68 68 Z'/%3E%3Ccircle cx='80' cy='80' r='34'/%3E%3Cpath d='M80 46 L114 80 L80 114 L46 80 Z'/%3E%3C/g%3E%3C/svg%3E");background-repeat:repeat;background-size:160px 160px;background-position:center top;padding:80px 77px 72px;color:#f7efd8;}
.flow-page-spacer{break-before:page;page-break-before:always;height:60px;width:100%;}
.flow-continuation-spacer{height:23mm;break-after:avoid;page-break-after:avoid;break-inside:avoid;page-break-inside:avoid;}
.flow-document-header{width:100%;margin:0 auto 30px;text-align:center;}
.flow-document-header h1{margin:0;color:#f8e8ba;font-size:34px;line-height:1.35;font-weight:800;text-align:center;}
.flow-subtitle{margin:11px auto 0;color:#fff7e5;font-size:20px;line-height:1.65;font-weight:700;text-align:center;max-width:620px;}
.flow-description{margin:11px auto 0;color:#eadfca;font-size:16px;line-height:1.85;font-weight:500;text-align:center;max-width:660px;}
.flow-section{width:100%;margin:0 auto 30px;border:1px solid rgba(205,177,93,.46);border-radius:28px;background:#063324;padding:28px 34px;break-inside:auto;page-break-inside:auto;}
.flow-section-keep{}
.flow-section-continuation{padding-top:34px;}
.flow-section-large{padding:30px 38px;margin-bottom:34px;}
.flow-section-large.flow-section-continuation{padding:26px 36px;margin-bottom:24px;}
.flow-section-title{font-size:26px;line-height:1.45;font-weight:800;color:#f8e8ba;text-align:center;margin:0 0 20px;padding-bottom:12px;border-bottom:1px solid rgba(216,188,104,.38);}
.flow-section-large .flow-section-title{font-size:42px;line-height:1.36;margin-bottom:24px;padding-bottom:16px;}
.flow-section-body{break-before:avoid;page-break-before:avoid;}
.flow-section p{font-size:20px;line-height:1.95;font-weight:500;color:#f6efdf;text-align:right;direction:rtl;unicode-bidi:plaintext;margin:0 0 17px;break-inside:avoid;page-break-inside:avoid;}
.flow-section-large p{font-size:36px;line-height:1.68;font-weight:700;margin-bottom:22px;}
.flow-section-large.flow-section-continuation p{font-size:34px;line-height:1.6;margin-bottom:16px;}
.flow-section p:last-child{margin-bottom:0;}
.flow-closing p{text-align:center;color:#f8e8ba;font-size:21px;line-height:2;}
.flow-virtues-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.flow-virtue{min-height:42px;border:1px solid rgba(205,177,93,.42);border-radius:22px;background:#0b3f2e;color:#fbf2d8;font-size:14px;font-weight:700;line-height:1.6;display:flex;align-items:center;justify-content:center;gap:8px;text-align:center;padding:8px 15px;break-inside:avoid;page-break-inside:avoid;}
.flow-virtue span{color:#d8bc68;}
.flow-app-block{width:100%;margin:38px auto 0;border:1px solid rgba(216,188,104,.48);border-radius:28px;background:#063324;padding:26px 30px;display:flex;align-items:center;gap:22px;break-inside:avoid;page-break-inside:avoid;}
.flow-app-logo{width:22mm;height:22mm;border-radius:5mm;background:#ffffff;padding:1.5mm;flex:0 0 auto;}
.flow-app-logo img{width:100%;height:100%;border-radius:4mm;display:block;}
.flow-app-copy{flex:1;text-align:right;}
.flow-app-copy h2{margin:0 0 1mm;color:#fff9e8;font-size:24px;line-height:1.35;font-weight:800;text-align:right;}
.flow-app-copy p{margin:0;color:#f4ecd8;font-size:13px;line-height:1.7;font-weight:600;text-align:right;}
.flow-app-links{display:flex;flex-direction:column;gap:2mm;flex:0 0 auto;}
.flow-app-links .store-btn{width:68mm;height:12mm;margin:0;border-radius:6mm;}
.flow-app-links .store-btn small{font-size:7px;}
.flow-app-links .store-btn strong{font-size:12px;}
.flow-app-links .store-btn em{font-size:5.8px;}
.legacy-flow-content .legacy-content{width:100%;margin:0 auto;}
.legacy-flow-content .legacy-content .section{padding:28px 34px;margin-bottom:30px;border-radius:28px;break-inside:auto;page-break-inside:auto;}
.legacy-flow-content .legacy-content .section + .section{break-before:page;page-break-before:always;margin-top:90px;}
.legacy-flow-content .legacy-content .section-title{font-size:25px;line-height:1.45;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid rgba(216,188,104,.38);}
.legacy-flow-content .legacy-content .section-desc,.legacy-flow-content .legacy-content p{font-size:19px;line-height:1.95;margin-bottom:17px;}
.app-page{width:1058.6667px!important;height:100vh!important;max-height:100vh!important;display:block;direction:ltr;unicode-bidi:plaintext;background:#043222;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%23d8bc68' stroke-width='1' opacity='.055'%3E%3Cpath d='M80 18 L92 68 L142 80 L92 92 L80 142 L68 92 L18 80 L68 68 Z'/%3E%3Ccircle cx='80' cy='80' r='34'/%3E%3Cpath d='M80 46 L114 80 L80 114 L46 80 Z'/%3E%3C/g%3E%3C/svg%3E");background-repeat:repeat;background-size:160px 160px;background-position:center top;page-break-before:always;break-before:page;overflow:hidden;}
.app-page .outer-frame{position:absolute;left:50%;top:50%;width:941.3333px;height:1380px;transform:translate(-50%,-50%);border:1.3333px solid rgba(216,188,104,.44);}
.app-box{position:absolute;left:50%;top:50%;width:856px;height:1300px;transform:translate(-50%,-50%);direction:rtl;unicode-bidi:plaintext;border:4px solid #d8bc68;border-radius:90.6667px;background:#064632;background-image:linear-gradient(150deg,#07583e 0%,#05412f 58%,#032d22 100%);text-align:center;padding:122.6667px 74.6667px;box-shadow:inset 0 0 0 2.6667px rgba(238,216,130,.24),inset 0 0 109.3333px rgba(0,0,0,.22);display:flex;flex-direction:column;align-items:center;justify-content:center;}
.app-logo{display:flex;justify-content:center;align-items:center;margin:0 auto 45.3333px;}
.app-logo img{width:200px;height:200px;border-radius:45.3333px;background:#ffffff;padding:12px;box-shadow:0 0 0 2.6667px rgba(216,188,104,.82);}
.app-logo-fallback{width:200px;height:200px;border-radius:45.3333px;background:#0d4f3a;border:2.6667px solid #d8bc68;color:#f8e8ba;font-size:26.6667px;font-weight:800;display:flex;align-items:center;justify-content:center;}
.app-name{font-size:64px;line-height:1.35;font-weight:800;color:#fff9e8;margin:0 0 25.3333px;}
.app-copy{font-size:24px;line-height:1.85;color:#f4ecd8;margin:0 auto 76px;max-width:666.6667px;text-align:center;font-weight:600;}
.app-links{display:block;margin-top:10.6667px;width:674.6667px;}
.store-btn{position:relative;display:flex;align-items:center;justify-content:center;gap:20px;width:674.6667px;height:98.6667px;margin:0 auto 26.6667px;border:2.6667px solid #d8bc68;border-radius:49.3333px;background:#000000;color:#ffffff!important;text-decoration:none!important;direction:ltr;unicode-bidi:plaintext;font-size:30.6667px;font-weight:800;padding:0 32px;}
.store-btn-icon{display:flex;align-items:center;justify-content:center;width:52px;height:52px;color:#ffffff;flex:0 0 auto;}
.store-btn-icon svg{width:48px;height:48px;display:block;color:#ffffff;}
.play-triangle{display:inline-block;width:0;height:0;border-style:solid;border-width:18px 0 18px 28px;border-color:transparent transparent transparent #ffffff;}
.store-btn-text{display:flex;flex-direction:column;align-items:flex-start;line-height:1.08;text-align:left;color:#ffffff;}
.store-btn small{font-size:13.3333px;font-weight:500;letter-spacing:.3px;opacity:.92;color:#ffffff;}
.store-btn strong{font-size:24px;font-weight:800;letter-spacing:.3px;color:#ffffff;}
.store-btn em{font-size:10.6667px;font-style:normal;font-weight:600;letter-spacing:.2px;opacity:.72;color:#ffffff;}
`;

export const __islamicPdfTemplateTest = {
  shouldInsertFlowPageSpacer,
};
