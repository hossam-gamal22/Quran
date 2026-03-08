// lib/pdf-export.ts
// PDF export utility for religious content pages

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { showInterstitial } from '@/components/ads/InterstitialAdManager';

/**
 * Wraps content HTML in a styled RTL PDF template with app branding.
 */
function buildPdfHtml(title: string, contentHtml: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Cairo', -apple-system, 'Segoe UI', Tahoma, sans-serif;
      direction: rtl;
      padding: 32px 28px;
      color: #1a1a1a;
      line-height: 1.9;
      font-size: 15px;
      background: #fff;
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #0f987f;
      margin-bottom: 30px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      flex-direction: row-reverse;
      margin-bottom: 10px;
    }
    .header-logo {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: #0f987f;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header .app-name {
      font-size: 24px;
      color: #0f987f;
      font-weight: 700;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
    }
    .section {
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 19px;
      font-weight: 700;
      color: #0f987f;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(15,152,127,0.25);
    }
    .section-desc {
      font-size: 14px;
      color: #555;
      margin-bottom: 12px;
    }
    .steps-label {
      font-size: 14px;
      font-weight: 600;
      color: #0f987f;
      margin-bottom: 8px;
    }
    .step {
      display: flex;
      flex-direction: row;
      gap: 10px;
      margin-bottom: 6px;
      align-items: flex-start;
    }
    .step-num {
      display: inline-block;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #0f987f;
      color: #fff;
      text-align: center;
      line-height: 24px;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .step-text {
      flex: 1;
      font-size: 14px;
      line-height: 1.8;
    }
    .dua-box {
      background: rgba(15,152,127,0.06);
      border-right: 3px solid #0f987f;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 8px 0;
    }
    .dua-arabic {
      font-size: 16px;
      line-height: 2;
      color: #1a1a1a;
    }
    .dua-note {
      font-size: 12px;
      color: #777;
      margin-top: 4px;
    }
    p {
      margin-bottom: 12px;
      text-align: justify;
      line-height: 1.9;
    }
    .virtue-item {
      padding: 4px 0;
      font-size: 14px;
    }
    .virtue-item::before {
      content: '✦ ';
      color: #0f987f;
    }
    .footer {
      text-align: center;
      padding: 20px 0 0;
      margin-top: 30px;
      border-top: 2px solid #0f987f;
      color: #666;
    }
    .footer .brand {
      font-size: 16px;
      color: #0f987f;
      font-weight: 700;
      margin: 0;
    }
    .footer .brand-en {
      font-size: 14px;
      color: #666;
      margin: 4px 0 0 0;
    }
    .footer .website {
      font-size: 12px;
      color: #999;
      margin: 4px 0 0 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-brand">
      <div class="header-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="14" cy="10" r="6" stroke="#fff" stroke-width="1.5" fill="none"/>
          <path d="M14 4 L14.8 7.5 L14 6.5 L13.2 7.5 Z" fill="#fff"/>
          <path d="M7 18 Q14 14 21 18 L21 24 Q14 20 7 24 Z" fill="#fff" opacity="0.9"/>
        </svg>
      </div>
      <span class="app-name">روح المسلم</span>
    </div>
    <h1>${title}</h1>
  </div>
  ${contentHtml}
  <div class="footer">
    <p class="brand">روح المسلم — Ruh Al-Muslim</p>
    <p class="website">rooh-almuslim.com</p>
  </div>
</body>
</html>`;
}

/**
 * Generate PDF from HTML content and share it.
 */
export async function exportAsPDF(title: string, htmlContent: string): Promise<void> {
  const fullHtml = buildPdfHtml(title, htmlContent);
  const { uri } = await Print.printToFileAsync({ html: fullHtml });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: title,
  });
}

/**
 * Show interstitial ad (if available), then run the export function.
 */
export async function showAdThenExport(exportFn: () => Promise<void>): Promise<void> {
  try {
    await showInterstitial();
  } catch {
    // Ad not available — proceed anyway
  }
  await exportFn();
}
