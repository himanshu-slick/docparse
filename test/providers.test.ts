import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { cacheKey, withCache } from '../src/cache/index.js';
import { getProvider } from '../src/index.js';
import { HttpError, withBackoff } from '../src/providers/retry.js';
import { fakeProvider } from './helpers.js';

describe('withBackoff', () => {
  it('retries 429s with doubling delays', async () => {
    const delays: number[] = [];
    let n = 0;
    const result = await withBackoff(
      async () => {
        if (++n < 3) throw new HttpError(429, 'slow down');
        return 'ok';
      },
      { baseMs: 100, sleepFn: async (ms) => void delays.push(ms) },
    );
    expect(result).toBe('ok');
    expect(delays).toEqual([100, 200]);
  });

  it('does not retry other errors', async () => {
    let n = 0;
    await expect(withBackoff(async () => { n++; throw new HttpError(500, 'boom'); })).rejects.toThrow(/500/);
    expect(n).toBe(1);
  });

  it('gives up after the retry budget', async () => {
    const run = withBackoff(async () => { throw new HttpError(429, 'x'); }, { retries: 2, sleepFn: async () => {} });
    await expect(run).rejects.toThrow(/429/);
  });
});

describe('cache', () => {
  const req = { system: 's', prompt: 'p' };

  it('keys on model and prompt', () => {
    expect(cacheKey('a', req)).toBe(cacheKey('a', req));
    expect(cacheKey('a', req)).not.toBe(cacheKey('b', req));
    expect(cacheKey('a', req)).not.toBe(cacheKey('a', { ...req, prompt: 'q' }));
  });

  it('serves the second call from disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'docparse-'));
    const inner = fakeProvider(['{"x":1}']);
    const cached = withCache(inner, { dir });
    const a = await cached.complete(req);
    const b = await cached.complete(req);
    expect(b).toEqual(a);
    expect(inner.calls).toHaveLength(1);
  });

  it('read-only mode fails on a miss without calling the model', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'docparse-'));
    const inner = fakeProvider(['{}']);
    await expect(withCache(inner, { dir, readOnly: true }).complete(req)).rejects.toThrow(/cache miss/);
    expect(inner.calls).toHaveLength(0);
  });
});

describe('getProvider', () => {
  it('knows the four documented models', () => {
    for (const name of ['gemini', 'groq-gpt-oss', 'groq-qwen', 'ollama']) expect(getProvider(name).name).toBe(name);
  });

  it('rejects unknown names', () => {
    expect(() => getProvider('gpt-9')).toThrow(/unknown model/);
  });
});
