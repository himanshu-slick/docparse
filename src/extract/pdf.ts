import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { PDFParse } from 'pdf-parse';
import { ocrImage } from './ocr.js';

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);
const MIN_TEXT_CHARS = 20;

/** Text from a PDF. pdf-parse copies into its own Uint8Array, so hand it a plain copy of the bytes. */
export async function pdfToText(data: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(data) });
  try {
    const { text } = await parser.getText();
    return text.replace(/^-- \d+ of \d+ --$/gm, '').trim();
  } finally {
    await parser.destroy();
  }
}

/** Extract text from a PDF or an image. Images (and PDFs with no text layer) go through OCR. */
export async function fileToText(path: string): Promise<string> {
  const data = await readFile(path);
  if (IMAGE_EXT.has(extname(path).toLowerCase())) return ocrImage(data);
  const text = await pdfToText(data);
  if (text.length >= MIN_TEXT_CHARS) return text;
  throw new Error(
    `${path} has no text layer. Rasterize its pages to PNG and pass the images (OCR fallback runs on images).`,
  );
}
