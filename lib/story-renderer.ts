// lib/story-renderer.ts
// يحوّل بيانات القصة إلى HTML كامل للعرض في WebView

import type { Story } from '@/data/stories';

/**
 * ينتج HTML كامل لعرض قصة داخل WebView.
 */
export function renderStory(story: Story, isDarkMode: boolean): string {
  const bgColor = isDarkMode ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDarkMode ? '#E5E7EB' : '#1C1C1E';
  const mutedColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const borderAlpha = isDarkMode ? '0.15' : '0.12';
  const quoteAlpha = isDarkMode ? '0.12' : '0.08';
  const lessonAlpha = isDarkMode ? '0.10' : '0.05';

  const quickInfoHtml = story.quickInfo
    .map(
      (info) =>
        `<div class="item"><div class="label">${escapeHtml(info.label)}</div><div class="value">${escapeHtml(info.value)}</div></div>`,
    )
    .join('');

  const tocHtml = story.sections
    .map(
      (section, i) =>
        `<a href="#section-${i}">${i + 1}. ${escapeHtml(section.title)}</a>`,
    )
    .join('');

  const sectionsHtml = story.sections
    .map((section, i) => {
      let html = `<div class="section" id="section-${i}">`;
      html += `<h2>${escapeHtml(section.title)}</h2>`;
      html += section.content; // content already contains <p> tags
      if (section.quranQuote) {
        html += `<div class="quran-quote">${escapeHtml(section.quranQuote.text)}</div>`;
        html += `<div class="quran-reference">${escapeHtml(section.quranQuote.reference)}</div>`;
      }
      html += '</div>';
      return html;
    })
    .join('');

  const lessonsHtml = story.lessons
    .map((lesson) => `<li>${escapeHtml(lesson)}</li>`)
    .join('');

  const content = `
<div class="header">
  <div class="icon">${story.icon}</div>
  <h1>${escapeHtml(story.nameAr)}</h1>
  <div class="subtitle">${escapeHtml(story.subtitle)}</div>
</div>

<div class="quick-info">${quickInfoHtml}</div>

<div class="toc">
  <h2>الفهرس</h2>
  ${tocHtml}
</div>

${sectionsHtml}

<div class="lessons">
  <h3>الدروس والعبر</h3>
  <ul>${lessonsHtml}</ul>
</div>`;

  return buildHtml(content, bgColor, textColor, mutedColor, borderAlpha, quoteAlpha, lessonAlpha);
}

// ========================================
// بناء قالب HTML
// ========================================

function buildHtml(
  content: string,
  bgColor: string,
  textColor: string,
  mutedColor: string,
  borderAlpha: string,
  quoteAlpha: string,
  lessonAlpha: string,
): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Cairo', 'Amiri', sans-serif;
      background: ${bgColor};
      color: ${textColor};
      padding: 20px;
      line-height: 1.8;
      direction: rtl;
    }
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 2px solid #22C55E;
      margin-bottom: 30px;
    }
    .header .icon { font-size: 60px; margin-bottom: 10px; }
    .header h1 { font-size: 28px; color: #22C55E; }
    .header .subtitle { font-size: 16px; color: ${mutedColor}; margin-top: 8px; }
    .quick-info {
      display: flex; flex-wrap: wrap; gap: 12px;
      padding: 16px; margin-bottom: 24px;
      background: rgba(15, 152, 127, 0.1);
      border-radius: 12px;
    }
    .quick-info .item { flex: 1; min-width: 120px; text-align: center; }
    .quick-info .label { font-size: 12px; color: ${mutedColor}; }
    .quick-info .value { font-size: 14px; font-weight: bold; }
    .toc {
      padding: 16px; margin-bottom: 24px;
      background: rgba(15, 152, 127, 0.06);
      border-radius: 12px;
    }
    .toc h2 { font-size: 18px; margin-bottom: 12px; color: #22C55E; }
    .toc a {
      display: block; padding: 8px 0;
      color: inherit; text-decoration: none;
      border-bottom: 1px solid rgba(128,128,128,${borderAlpha});
    }
    .section { margin-bottom: 32px; }
    .section h2 {
      font-size: 22px; color: #22C55E;
      margin-bottom: 16px; padding-bottom: 8px;
      border-bottom: 1px solid rgba(15,152,127,0.3);
    }
    .section p { margin-bottom: 16px; font-size: 16px; }
    .quran-quote {
      background: rgba(15, 152, 127, ${quoteAlpha});
      border-right: 4px solid #22C55E;
      padding: 16px 20px;
      margin: 16px 0;
      border-radius: 0 12px 12px 0;
      font-family: 'Amiri', serif;
      font-size: 20px;
      line-height: 2;
      text-align: center;
    }
    .quran-reference {
      text-align: center; font-size: 14px;
      color: #22C55E; margin-top: 8px;
    }
    .lessons {
      background: rgba(15, 152, 127, ${lessonAlpha});
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
    }
    .lessons h3 { color: #22C55E; margin-bottom: 12px; font-size: 18px; }
    .lessons ul { list-style: none; padding: 0; }
    .lessons li {
      padding: 8px 0;
      border-bottom: 1px solid rgba(128,128,128,${borderAlpha});
      position: relative;
      padding-right: 20px;
    }
    .lessons li::before {
      content: '•'; position: absolute;
      right: 0; color: #22C55E;
    }
    .footer {
      text-align: center; padding: 24px 0; margin-top: 32px;
      border-top: 2px solid #22C55E; color: ${mutedColor};
    }
    .footer .app-name { font-size: 18px; color: #22C55E; margin-bottom: 4px; }
  </style>
</head>
<body>
  ${content}
  <div class="footer">
    <div class="app-name">روح المسلم</div>
    <div>Ruh Al-Muslim</div>
  </div>
</body>
</html>`;
}

// ========================================
// أدوات مساعدة
// ========================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
