import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { PDFArray, PDFDocument, PDFName, PDFRawStream, PDFString } from 'pdf-lib';

import { ISLAMIC_PDF_APP_LINKS } from './islamicPdfTemplate';

type PdfPage = ReturnType<PDFDocument['getPages']>[number];

// A page is considered "empty" if its content stream is tiny — i.e. nothing was
// drawn besides the background rectangle. WebKit on iOS sometimes inserts these
// between full-page-height elements; we strip them so the visible PDF doesn't
// have blank pages between the cover and the first content page.
const EMPTY_PAGE_CONTENT_BYTES = 600;

function pageContentLength(page: PdfPage): number {
  try {
    const contents = page.node.Contents();
    if (!contents) return 0;
    // pdf-lib returns either a stream or an array of streams.
    const streams = 'asArray' in contents ? (contents as PDFArray).asArray() : [contents];
    let total = 0;
    for (const ref of streams) {
      const resolved = ref instanceof PDFRawStream ? ref : page.doc.context.lookup(ref);
      if (resolved instanceof PDFRawStream) {
        total += resolved.contents.length;
      }
    }
    return total;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}

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
  const initialDoc = await PDFDocument.load(Buffer.from(base64, 'base64'));
  const initialPages = initialDoc.getPages();
  if (initialPages.length === 0) return uri;

  // Remove blank intermediate pages (iOS WebKit sometimes inserts an empty page
  // between the cover and the first content page). Never drop the first or
  // last page — those carry the cover and the app-links page.
  const lengths: number[] = initialPages.map(pageContentLength);
  let hadRemovals = false;
  for (let i = initialPages.length - 2; i >= 1; i -= 1) {
    if (lengths[i] <= EMPTY_PAGE_CONTENT_BYTES) {
      initialDoc.removePage(i);
      hadRemovals = true;
    }
  }
  // Save & re-load so subsequent annotation work operates on the trimmed page
  // tree (pdf-lib's in-memory getPages caches stale references after removePage).
  // Disable object streams so Hermes/JSC don't choke on the compressed xref.
  const workingDoc = hadRemovals
    ? await PDFDocument.load(await initialDoc.save({ useObjectStreams: false }))
    : initialDoc;
  const pages = workingDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();
  // The store buttons live near vertical center of the page, inside the rounded box.
  // We use a generous rectangle that comfortably covers each button so taps land
  // even if the underlying viewer scales/rounds the layout slightly.
  // Buttons are roughly centered horizontally; widen the hit rect to a safe ~70% of page width.
  const hitWidth = width * 0.78;
  const hitX = (width - hitWidth) / 2;
  const buttonHeight = 96;
  // Estimated top offsets from page top in PDF points, derived from the
  // app-page layout (logo + name + copy + first button + spacer + second button).
  const appStoreTop = height * 0.62;
  const playStoreTop = appStoreTop - buttonHeight - 30;

  const addStoreLink = (url: string, centerY: number) => {
    addLinkAnnotation(lastPage, url, [
      hitX,
      centerY - buttonHeight / 2,
      hitX + hitWidth,
      centerY + buttonHeight / 2,
    ]);
  };

  addStoreLink(ISLAMIC_PDF_APP_LINKS.appStore, appStoreTop);
  addStoreLink(ISLAMIC_PDF_APP_LINKS.playStore, playStoreTop);

  const updatedBytes = await workingDoc.save({ useObjectStreams: false });
  await FileSystem.writeAsStringAsync(uri, Buffer.from(updatedBytes).toString('base64'), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}
