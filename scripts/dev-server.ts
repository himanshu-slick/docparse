import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { extname, join } from 'node:path';
import { POST } from '../api/extract.js';

const PUBLIC = join(import.meta.dirname, '../public');
const TYPES: Record<string, string> = { '.html': 'text/html', '.pdf': 'application/pdf' };
const PORT = Number(process.env.PORT ?? 3000);

async function body(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

/** Local stand-in for Vercel: serves public/ and routes POST /api/extract to the same handler. */
createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  if (req.method === 'POST' && url.pathname === '/api/extract') {
    const request = new Request(url, { method: 'POST', body: new Uint8Array(await body(req)) });
    const out = await POST(request);
    res.writeHead(out.status, { 'content-type': 'application/json' }).end(await out.text());
    return;
  }
  const file = url.pathname === '/' ? '/index.html' : url.pathname;
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(join(PUBLIC, file)));
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, () => console.log(`demo on http://localhost:${PORT}`));
