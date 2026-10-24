/** OCR fallback for scanned pages. tesseract.js is loaded lazily so the normal path stays fast. */
export async function ocrImage(data: Buffer): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data: result } = await worker.recognize(data);
    return result.text.trim();
  } finally {
    await worker.terminate();
  }
}
