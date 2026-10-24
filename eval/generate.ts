import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { makeInvoice, makePolicy, makeStatement } from './data.js';
import { invoiceLines, policyLines, statementLines, writePdf } from './render.js';
import { makeRng } from './rng.js';

export const FIXTURE_DIR = join(import.meta.dirname, 'fixtures');
const COUNTS = { inv: 30, pol: 15, stm: 5 };

async function emit(id: string, truth: unknown, lines: string[]): Promise<void> {
  await writePdf(join(FIXTURE_DIR, `${id}.pdf`), lines, id);
  await writeFile(join(FIXTURE_DIR, `${id}.json`), `${JSON.stringify(truth, null, 2)}\n`);
}

async function main(): Promise<void> {
  await mkdir(FIXTURE_DIR, { recursive: true });
  for (let n = 1; n <= COUNTS.inv; n++) {
    const rng = makeRng(1000 + n);
    const inv = makeInvoice(rng, n);
    await emit(`inv-${String(n).padStart(3, '0')}`, inv, invoiceLines(inv, rng));
  }
  for (let n = 1; n <= COUNTS.pol; n++) {
    const rng = makeRng(2000 + n);
    const pol = makePolicy(rng, n);
    await emit(`pol-${String(n).padStart(3, '0')}`, pol, policyLines(pol, rng));
  }
  for (let n = 1; n <= COUNTS.stm; n++) {
    const rng = makeRng(3000 + n);
    const stm = makeStatement(rng);
    await emit(`stm-${String(n).padStart(3, '0')}`, stm, statementLines(stm, rng));
  }
  console.log(`wrote ${COUNTS.inv + COUNTS.pol + COUNTS.stm} fixtures to ${FIXTURE_DIR}`);
}

await main();
