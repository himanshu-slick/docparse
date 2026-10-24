import { describe, expect, it } from 'vitest';
import { allow } from '../api/_limit.js';
import { POST } from '../api/extract.js';

const post = (body: BodyInit, ip = '9.9.9.9') =>
  POST(new Request('http://x/api/extract', { method: 'POST', body, headers: { 'x-forwarded-for': ip } }));

describe('demo api', () => {
  it('rejects empty, non-PDF and oversized bodies', async () => {
    expect((await post('')).status).toBe(400);
    expect((await post('hello world')).status).toBe(415);
    expect((await post(new Uint8Array(2 * 1024 * 1024 + 1))).status).toBe(413);
  });

  it('limits each IP to 10 requests per hour', () => {
    const t = 1_000_000;
    for (let i = 0; i < 10; i++) expect(allow('1.1.1.1', t)).toBe(true);
    expect(allow('1.1.1.1', t)).toBe(false);
    expect(allow('2.2.2.2', t)).toBe(true);
    expect(allow('1.1.1.1', t + 3_600_001)).toBe(true);
  });
});
