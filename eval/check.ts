import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ModelResult } from './report.js';

const MAX_DROP = 2;

export interface Regression {
  model: string;
  baseline: number;
  current?: number;
}

export function findRegressions(
  baseline: Record<string, { accuracy: number }>,
  results: Pick<ModelResult, 'name' | 'accuracy'>[],
): Regression[] {
  return Object.entries(baseline).flatMap(([model, { accuracy }]) => {
    const current = results.find((r) => r.name === model)?.accuracy;
    return current === undefined || accuracy - current > MAX_DROP ? [{ model, baseline: accuracy, current }] : [];
  });
}

async function main(): Promise<void> {
  const dir = import.meta.dirname;
  const baseline = JSON.parse(await readFile(join(dir, 'baseline.json'), 'utf8'));
  const results = JSON.parse(await readFile(join(dir, 'results.json'), 'utf8')) as ModelResult[];
  const bad = findRegressions(baseline, results);
  for (const b of bad) {
    console.error(`REGRESSION ${b.model}: baseline ${b.baseline}% -> ${b.current?.toFixed(2) ?? 'missing'}% (limit: ${MAX_DROP} points)`);
  }
  if (bad.length > 0) process.exit(1);
  console.log(`ok: no model dropped more than ${MAX_DROP} points vs baseline`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
