import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CompletionRequest, CompletionResult, Provider } from '../providers/types.js';

export const cacheKey = (model: string, req: CompletionRequest): string =>
  createHash('sha256').update(JSON.stringify([model, req.system, req.prompt])).digest('hex');

export interface CacheOptions {
  dir: string;
  /** Throw on a miss instead of calling the provider (used by CI). */
  readOnly?: boolean;
}

async function readEntry(file: string): Promise<CompletionResult | undefined> {
  try {
    return JSON.parse(await readFile(file, 'utf8')) as CompletionResult;
  } catch {
    return undefined;
  }
}

/** Wrap a provider so every response is stored on disk, keyed by (model, prompt hash). */
export function withCache(provider: Provider, opts: CacheOptions): Provider {
  return {
    ...provider,
    async complete(req) {
      const file = join(opts.dir, `${cacheKey(provider.model, req)}.json`);
      const hit = await readEntry(file);
      if (hit) return hit;
      if (opts.readOnly) throw new Error(`cache miss for ${provider.model}; run "npm run eval:live"`);
      const result = await provider.complete(req);
      await mkdir(opts.dir, { recursive: true });
      await writeFile(file, JSON.stringify(result, null, 2));
      return result;
    },
  };
}
