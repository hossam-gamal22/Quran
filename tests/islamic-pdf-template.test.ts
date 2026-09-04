// @ts-ignore
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-asset', () => ({
  Asset: {
    loadAsync: vi.fn(() => Promise.resolve([{ localUri: 'mock.ttf', uri: 'mock.ttf' }])),
  },
}));

vi.mock('expo-file-system/legacy', () => ({
  default: {},
  cacheDirectory: 'file:///cache/',
  readAsStringAsync: vi.fn(() => Promise.resolve('')),
  copyAsync: vi.fn(() => Promise.resolve()),
  deleteAsync: vi.fn(() => Promise.resolve()),
  EncodingType: { Base64: 'base64' },
}));

vi.mock('expo-haptics', () => ({
  notificationAsync: vi.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));

vi.mock('expo-print', () => ({
  printToFileAsync: vi.fn(() => Promise.resolve({ uri: 'file:///tmp/random.pdf' })),
}));

vi.mock('expo-sharing', () => ({
  isAvailableAsync: vi.fn(() => Promise.resolve(true)),
  shareAsync: vi.fn(() => Promise.resolve()),
}));

vi.mock('../lib/pdf/appLinkAnnotations', () => ({
  addIslamicPdfAppLinkAnnotations: vi.fn(() => Promise.resolve('file:///cache/قصة_آدم_عليه_السلام.pdf')),
}));

import { __islamicPdfTemplateTest, buildIslamicPdfHtml } from '../lib/pdf/islamicPdfTemplate';
import { __islamicPdfTest } from '../lib/pdf/shareIslamicPdf';

describe('Islamic PDF flow pagination', () => {
  it('does not force a new page for continuation chunks', () => {
    expect(__islamicPdfTemplateTest.shouldInsertFlowPageSpacer(1, true)).toBe(false);
  });

  it('keeps explicit new sections page-separated after the first section', () => {
    expect(__islamicPdfTemplateTest.shouldInsertFlowPageSpacer(1, false)).toBe(true);
  });

  it('uses Expo Print-sized cover pages with a full-page background layer', async () => {
    const html = await buildIslamicPdfHtml({
      title: 'قصة آدم عليه السلام',
      subtitle: 'قصص دينية',
      shortDescription: 'القصة الكاملة لأبي البشر آدم عليه السلام.',
      sections: [{ title: 'نص القصة', body: 'محتوى القصة' }],
    });

    expect(html).toContain('@page{size:794pt 1123pt;margin:0;}');
    expect(html).toContain('html,body{width:1058.6667px;min-width:1058.6667px;');
    expect(html).toContain('.pdf-page{position:relative;width:1058.6667px;height:100vh;');
    expect(html).toContain('.cover-page::before{content:"";position:absolute;inset:0;');
    expect(html).toContain('.cover-box{position:absolute;top:47.5%;');
  });

  it('keeps the app links page on the same 96dpi export grid', async () => {
    const html = await buildIslamicPdfHtml({
      title: 'قصة آدم عليه السلام',
      sections: [{ title: 'نص القصة', body: 'محتوى القصة' }],
    });

    expect(html).toContain('.app-page{width:1058.6667px!important;height:100vh!important;');
    expect(html).toContain('.app-page .outer-frame{position:absolute;left:50%;top:50%;width:941.3333px;height:1380px;');
    expect(html).toContain(`href="https://apps.apple.com/app/id6761651911"`);
    expect(html).toContain(`href="https://play.google.com/store/apps/details?id=com.rooh.almuslim"`);
  });

  it('adds breathing room before continuation sections without forcing a page break', async () => {
    const html = await buildIslamicPdfHtml({
      title: 'قصة آدم عليه السلام',
      sections: [
        { title: 'نص القصة', body: 'الجزء الأول' },
        { body: 'تكملة القصة', continuation: true, largeText: true },
      ],
    });

    expect(html).toContain('<div class="flow-continuation-spacer" aria-hidden="true"></div><section class="flow-section flow-section-continuation flow-section-large">');
    expect(html).toContain('.flow-continuation-spacer{height:23mm;break-after:avoid;');
  });

  it('names shared PDF files after the Arabic story title', () => {
    expect(__islamicPdfTest.safePdfFileName('قصة آدم عليه السلام')).toBe('قصة_آدم_عليه_السلام');
    expect(__islamicPdfTest.getNamedPdfUri('file:///tmp/random.pdf', 'قصة آدم عليه السلام')).toBe('file:///cache/قصة_آدم_عليه_السلام.pdf');
  });
});
