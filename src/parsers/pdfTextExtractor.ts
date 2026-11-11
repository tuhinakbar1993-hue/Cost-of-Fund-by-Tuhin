/**
 * Fast PDF text extraction using pdfjs-dist.
 * Strictly text extraction only: disableFontFace is on, no canvas, no OCR.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker in Vite
// Use CDN or worker url fallback to guarantee 100% reliability in browser and test environments
if (typeof window !== 'undefined') {
  try {
    // In browser with vite:
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    // Fallback CDN if bundler worker fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }
}

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfPageContent {
  pageNumber: number;
  items: PdfTextItem[];
  pageText: string;
}

export interface ExtractedPdfDocument {
  pages: PdfPageContent[];
  fullText: string;
  pageCount: number;
}

/**
 * Computes a quick 32-bit hash of an ArrayBuffer or string for deduplication.
 */
export function computeContentHash(data: ArrayBuffer | string): string {
  let hash = 0x811c9dc5;
  if (typeof data === 'string') {
    for (let i = 0; i < data.length; i++) {
      hash ^= data.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
  } else {
    const view = new Uint8Array(data);
    const step = Math.max(1, Math.floor(view.length / 5000));
    for (let i = 0; i < view.length; i += step) {
      hash ^= view[i];
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Extracts all text items and coordinates from a PDF file.
 */
export async function extractTextFromPdf(
  data: ArrayBuffer | Uint8Array,
  fileName: string
): Promise<ExtractedPdfDocument> {
  const loadingTask = pdfjsLib.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;
  const pages: PdfPageContent[] = [];
  let totalExtractedLength = 0;

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: PdfTextItem[] = [];
    const strings: string[] = [];

    for (const item of textContent.items) {
      if ('str' in item && typeof item.str === 'string') {
        const str = item.str;
        // In PDF matrix: transform[4] = x, transform[5] = y
        const x = item.transform[4];
        const y = item.transform[5];
        const width = item.width || 0;
        const height = item.height || 0;

        items.push({ str, x, y, width, height });
        strings.push(str);
        totalExtractedLength += str.trim().length;
      }
    }

    pages.push({
      pageNumber: pageNum,
      items,
      pageText: strings.join(' '),
    });
  }

  // Scanned PDF check: If no text layer found (< 20 characters), reject with clear error
  if (totalExtractedLength < 20) {
    throw new Error(`scanned PDF, text layer required (${fileName})`);
  }

  const fullText = pages.map((p) => p.pageText).join('\n');

  return {
    pages,
    fullText,
    pageCount,
  };
}
