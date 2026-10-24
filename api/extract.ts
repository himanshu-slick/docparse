import { DOC_TYPES, detectDocType, extract, getProvider, pdfToText, type DocType } from '../src/index.js';
import { allow } from './_limit.js';

const MAX_BYTES = 2 * 1024 * 1024;
const MODEL = process.env.DEMO_MODEL ?? 'gemini';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const isPdf = (b: Uint8Array) => new TextDecoder().decode(b.slice(0, 5)) === '%PDF-';

async function readPdf(request: Request): Promise<Uint8Array | Response> {
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) return json({ error: 'Send the PDF as the request body.' }, 400);
  if (bytes.length > MAX_BYTES) return json({ error: 'PDF is larger than 2 MB.' }, 413);
  if (!isPdf(bytes)) return json({ error: 'Only PDF files are supported.' }, 415);
  return bytes;
}

export async function POST(request: Request): Promise<Response> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!allow(ip)) return json({ error: 'Demo limit reached (10 documents per hour). Try again later.' }, 429);

  const pdf = await readPdf(request);
  if (pdf instanceof Response) return pdf;
  try {
    const text = await pdfToText(pdf);
    const asked = new URL(request.url).searchParams.get('type');
    const docType = (asked ?? detectDocType(text)) as DocType | null;
    if (!docType || !DOC_TYPES.includes(docType)) return json({ error: 'Could not tell the document type.' }, 422);
    const result = await extract(getProvider(MODEL), docType, text);
    return json({ model: MODEL, ...result });
  } catch (err) {
    return json({ error: (err as Error).message }, 502);
  }
}
