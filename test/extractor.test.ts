import { describe, expect, it } from 'vitest';
import { extract, parseJson } from '../src/index.js';
import { fakeProvider, validInvoice } from './helpers.js';

describe('parseJson', () => {
  it('strips code fences and prose', () => {
    expect(parseJson('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('throws when there is no object', () => {
    expect(() => parseJson('nope')).toThrow(/no JSON/);
  });
});

describe('extract', () => {
  it('returns valid data on the first attempt', async () => {
    const p = fakeProvider([JSON.stringify(validInvoice)]);
    const res = await extract(p, 'invoice', 'text');
    expect(res).toMatchObject({ valid: true, attempts: 1, data: validInvoice });
    expect(p.calls).toHaveLength(1);
  });

  it('retries once with the validation error, then succeeds', async () => {
    const broken = { ...validInvoice, currency: 'US' };
    const p = fakeProvider([JSON.stringify(broken), JSON.stringify(validInvoice)]);
    const res = await extract(p, 'invoice', 'text');
    expect(res).toMatchObject({ valid: true, attempts: 2 });
    expect(p.calls[1]?.prompt).toContain('failed validation');
    expect(p.calls[1]?.prompt).toContain('currency');
  });

  it('gives up after one retry and keeps the parsed data for scoring', async () => {
    const broken = { ...validInvoice, currency: 'US' };
    const p = fakeProvider([JSON.stringify(broken)]);
    const res = await extract(p, 'invoice', 'text');
    expect(res).toMatchObject({ valid: false, attempts: 2, data: broken });
    expect(p.calls).toHaveLength(2);
  });

  it('survives a reply that is not JSON at all', async () => {
    const p = fakeProvider(['sorry, I cannot do that']);
    const res = await extract(p, 'invoice', 'text');
    expect(res.valid).toBe(false);
    expect(res.data).toBeUndefined();
  });

  it('sums latency across attempts', async () => {
    const p = fakeProvider(['{}', JSON.stringify(validInvoice)]);
    expect((await extract(p, 'invoice', 'text')).latencyMs).toBe(20);
  });
});
