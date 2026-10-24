export class HttpError extends Error {
  constructor(readonly status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface RetryOptions {
  retries?: number;
  baseMs?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

/** Retry on HTTP 429 with exponential backoff (1s, 2s, 4s...). */
export async function withBackoff<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { retries = 5, baseMs = 1000, sleepFn = sleep } = opts;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const rateLimited = err instanceof HttpError && err.status === 429;
      if (!rateLimited || attempt >= retries) throw err;
      await sleepFn(baseMs * 2 ** attempt);
    }
  }
}

export async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(res.status, await res.text());
  return res.json();
}
