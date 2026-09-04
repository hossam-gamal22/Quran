import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { addIslamicPdfAppLinkAnnotations } from './appLinkAnnotations';
import { buildIslamicPdfHtml, IslamicPdfData } from './islamicPdfTemplate';

const PDF_PAGE_WIDTH = 794;
const PDF_PAGE_HEIGHT = 1123;

export function safePdfFileName(title: string): string {
  return `${title || 'rooh-almuslim'}`
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'rooh-almuslim';
}

export function getNamedPdfUri(sourceUri: string, title: string): string {
  const baseDirectory = FileSystem.cacheDirectory || sourceUri.replace(/\/[^/]*$/, '/');
  return `${baseDirectory}${safePdfFileName(title)}.pdf`;
}

export async function renamePdfToTitle(sourceUri: string, title: string): Promise<string> {
  const namedUri = getNamedPdfUri(sourceUri, title);
  if (namedUri === sourceUri) return sourceUri;
  await FileSystem.deleteAsync(namedUri, { idempotent: true }).catch(() => {});
  await FileSystem.copyAsync({ from: sourceUri, to: namedUri });
  return namedUri;
}

export async function shareIslamicPdf(data: IslamicPdfData): Promise<void> {
  const html = await buildIslamicPdfHtml(data);
  const file = await Print.printToFileAsync({
    html,
    width: PDF_PAGE_WIDTH,
    height: PDF_PAGE_HEIGHT,
    margins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    base64: false,
  });
  const namedUri = await renamePdfToTitle(file.uri, data.title);

  try {
    await addIslamicPdfAppLinkAnnotations(namedUri);
  } catch (error) {
    console.log('Islamic PDF link annotation failed', error);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('sharing-unavailable');

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await Sharing.shareAsync(namedUri, {
    mimeType: 'application/pdf',
    dialogTitle: data.title,
    UTI: 'com.adobe.pdf',
  });
}

export const __islamicPdfTest = {
  getNamedPdfUri,
  safePdfFileName,
};
