export type Kind = 'exact' | 'amount' | 'name';
export interface FieldScore {
  correct: number;
  total: number;
}

const EXACT_KEY = /(date|number|reference|currency)$/i;

export function flatten(value: unknown, path = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (Array.isArray(value)) {
    value.forEach((v, i) => flatten(v, `${path}[${i}]`).forEach((x, k) => out.set(k, x)));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      flatten(v, path ? `${path}.${k}` : k).forEach((x, p) => out.set(p, x));
    }
  } else {
    out.set(path, value);
  }
  return out;
}

export function kindOf(path: string, truth: unknown): Kind {
  const key = path.replace(/\[\d+\]/g, '').split('.').pop() ?? '';
  if (typeof truth === 'number') return 'amount';
  return EXACT_KEY.test(key) ? 'exact' : 'name';
}

const normName = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Exact match for IDs/dates, tolerance of one cent for amounts, case/punctuation-insensitive for names. */
export function fieldMatches(kind: Kind, truth: unknown, pred: unknown): boolean {
  if (pred === undefined || pred === null) return false;
  if (kind === 'amount') return typeof pred === 'number' && Math.abs(pred - (truth as number)) < 0.005;
  if (typeof pred !== 'string') return false;
  return kind === 'exact' ? pred.trim() === truth : normName(pred) === normName(truth as string);
}

export function scoreDocument(truth: unknown, pred: unknown): FieldScore {
  const t = flatten(truth);
  const p = pred === undefined ? new Map<string, unknown>() : flatten(pred);
  let correct = 0;
  for (const [path, value] of t) {
    if (fieldMatches(kindOf(path, value), value, p.get(path))) correct++;
  }
  return { correct, total: t.size };
}

export function percentile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)] as number;
}

export function costUsd(inputTokens: number, outputTokens: number, p: { inputPerM: number; outputPerM: number }): number {
  return (inputTokens * p.inputPerM + outputTokens * p.outputPerM) / 1_000_000;
}
