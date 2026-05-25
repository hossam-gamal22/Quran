import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { PDFArray, PDFDocument, PDFName, PDFString } from 'pdf-lib';

import { ISLAMIC_PDF_APP_LINKS } from './islamicPdfTemplate';

type PdfPage = ReturnType<PDFDocument['getPages']>[number];

function addLinkAnnotation(page: PdfPage, url: string, rect: [number, number, number, number]) {
  const pdfDoc = page.doc;
  const annotation = pdfDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Link'),
    Rect: rect,
    Border: [0, 0, 0],
    A: {
      Type: PDFName.of('Action'),
      S: PDFName.of('URI'),
      URI: PDFString.of(url),
    },
  });

  const annotationRef = pdfDoc.context.register(annotation);
  const annotsKey = PDFName.of('Annots');
  let annots = page.node.lookupMaybe(annotsKey, PDFArray);
  if (!annots) {
    annots = pdfDoc.context.obj([]);
    page.node.set(annotsKey, annots);
  }
  annots.push(annotationRef);
}

export async function addIslamicPdfAppLinkAnnotations(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const pdfDoc = await PDFDocument.load(Buffer.from(base64, 'base64'));
  const pages = pdfDoc.getPages();
  const candidatePages = pages.slice(Math.max(0, pages.length - 2));
  candidatePages.forEach((page) => {
    const { width, height } = page.getSize();
    const addStoreLink = (url: string, top: number, buttonWidth: number, buttonHeight: number) => {
      const x = (width - buttonWidth) / 2;
      addLinkAnnotation(page, url, [
        x,
        height - top - buttonHeight,
        x + buttonWidth,
        height - top,
      ]);
    };

    addStoreLink(ISLAMIC_PDF_APP_LINKS.appStore, 650, width, 105);
    addStoreLink(ISLAMIC_PDF_APP_LINKS.playStore, 765, width, 105);

    // Fallback for older cached previews.
    addStoreLink(ISLAMIC_PDF_APP_LINKS.appStore, 600, width, 95);
    addStoreLink(ISLAMIC_PDF_APP_LINKS.playStore, 704, width, 95);
  });

  const updatedBytes = await pdfDoc.save();
  await FileSystem.writeAsStringAsync(uri, Buffer.from(updatedBytes).toString('base64'), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}
