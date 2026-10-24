import 'dotenv/config';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { extract, getProvider, pdfToText, withCache, type DocType, type Provider } from '../src/index.js';
import { renderResults, type ModelResult } from './report.js';
import { costUsd, percentile, scoreDocument } from './score.js';
import { SIMULATED } from './simulated.js';

const ROOT = import.meta.dirname;
const FIXTURES = join(ROOT, 'fixtures');
const PREFIX: Record<string, DocType> = { inv: 'invoice', pol: 'policy', stm: 'statement' };

function resolve(name: string, live: boolean): Provider {
  const sim = SIMULATED[name];
  if (sim) return sim();
  return withCache(getProvider(name), { dir: join(ROOT, 'cache'), readOnly: !live });
}

interface Tally {
  correct: number;
  total: number;
}

async function scoreOne(provider: Provider, id: string) {
  const docType = PREFIX[id.split('-')[0] as string] as DocType;
  const text = await pdfToText(await readFile(join(FIXTURES, `${id}.pdf`)));
  const truth = JSON.parse(await readFile(join(FIXTURES, `${id}.json`), 'utf8'));
  const res = await extract(provider, docType, text);
  return { docType, res, score: scoreDocument(truth, res.data) };
}

const add = (t: Tally, s: Tally) => {
  t.correct += s.correct;
  t.total += s.total;
};

const pctOf = (t: Tally) => (100 * t.correct) / t.total;

async function evaluate(name: string, live: boolean, ids: string[]): Promise<ModelResult> {
  const provider = resolve(name, live);
  const all: Tally = { correct: 0, total: 0 };
  const byType: Record<string, Tally> = {};
  const latencies: number[] = [];
  const n = { valid: 0, firstTry: 0, cost: 0 };
  for (const id of ids) {
    const { docType, res, score } = await scoreOne(provider, id);
    add(all, score);
    add((byType[docType] ??= { correct: 0, total: 0 }), score);
    n.valid += res.valid ? 1 : 0;
    n.firstTry += res.valid && res.attempts === 1 ? 1 : 0;
    n.cost += costUsd(res.inputTokens, res.outputTokens, provider.pricing);
    latencies.push(res.latencyMs);
  }
  return {
    name,
    model: provider.model,
    simulated: name in SIMULATED,
    docs: ids.length,
    accuracy: pctOf(all),
    byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, pctOf(v)])),
    schemaPass: (100 * n.valid) / ids.length,
    firstTryPass: (100 * n.firstTry) / ids.length,
    p50Ms: percentile(latencies, 0.5),
    p95Ms: percentile(latencies, 0.95),
    costPerDocUsd: n.cost / ids.length,
  };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      live: { type: 'boolean', default: false },
      models: { type: 'string', default: Object.keys(SIMULATED).join(',') },
      'update-baseline': { type: 'boolean', default: false },
    },
  });
  const ids = (await readdir(FIXTURES)).filter((f) => f.endsWith('.pdf')).map((f) => f.slice(0, -4)).sort();
  const results: ModelResult[] = [];
  for (const name of values.models.split(',')) results.push(await evaluate(name, values.live, ids));
  await writeFile(join(ROOT, 'results.md'), renderResults(results));
  await writeFile(join(ROOT, 'results.json'), `${JSON.stringify(results, null, 2)}\n`);
  if (values['update-baseline']) {
    const base = Object.fromEntries(results.map((r) => [r.name, { accuracy: round(r.accuracy) }]));
    await writeFile(join(ROOT, 'baseline.json'), `${JSON.stringify(base, null, 2)}\n`);
  }
  console.log(renderResults(results));
}

const round = (n: number) => Math.round(n * 100) / 100;

await main();
