export interface ModelResult {
  name: string;
  model: string;
  simulated: boolean;
  docs: number;
  accuracy: number;
  byType: Record<string, number>;
  schemaPass: number;
  firstTryPass: number;
  p50Ms: number;
  p95Ms: number;
  costPerDocUsd: number;
}

const pct = (n: number) => `${n.toFixed(1)}%`;
const usd = (n: number) => (n === 0 ? '$0' : `$${n.toFixed(5)}`);

function row(r: ModelResult): string {
  const types = ['invoice', 'policy', 'statement'].map((t) => pct(r.byType[t] ?? 0));
  return `| ${r.name}${r.simulated ? ' (simulated)' : ''} | ${r.model} | ${pct(r.accuracy)} | ${types.join(' | ')} | ${pct(r.schemaPass)} | ${pct(r.firstTryPass)} | ${Math.round(r.p50Ms)} | ${Math.round(r.p95Ms)} | ${usd(r.costPerDocUsd)} |`;
}

export function renderResults(results: ModelResult[]): string {
  const docs = results[0]?.docs ?? 0;
  const notes = results.some((r) => r.simulated)
    ? '\n> Rows marked **simulated** come from a deterministic stand-in model that reads the ground truth and injects errors. They exercise the pipeline and CI gate only. Run `npm run eval:live` for real model numbers.\n'
    : '';
  return [
    '# Eval results',
    '',
    `${docs} documents (invoices, policies, statements). Field accuracy: exact match for IDs/dates, 1-cent tolerance for amounts, normalised match for names. Cost is an estimate at list price; actual spend on free tiers is $0.`,
    notes,
    '| Model | Version | Field accuracy | Invoice | Policy | Statement | Schema pass | Pass 1st try | p50 ms | p95 ms | Est. cost/doc |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...results.map(row),
    '',
  ].join('\n');
}
