import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Provider } from '../src/index.js';
import { hashString, makeRng, type Rng } from './rng.js';

const FIXTURES = join(import.meta.dirname, 'fixtures');

interface Profile {
  name: string;
  /** Chance that any single field comes back wrong. */
  fieldError: number;
  /** Chance that the first reply breaks the schema (the retry then repairs it). */
  schemaBreak: number;
  latencyMs: [number, number];
}

function corrupt(value: unknown, rng: Rng): unknown {
  if (typeof value === 'number') return Math.round((value + rng.int(1, 9)) * 100) / 100;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(Date.parse(value) + 86_400_000).toISOString().slice(0, 10);
  }
  return typeof value === 'string' ? `${value}x` : value;
}

function perturb(node: unknown, rate: number, rng: Rng): unknown {
  if (Array.isArray(node)) return node.map((v) => perturb(v, rate, rng));
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, perturb(v, rate, rng)]));
  }
  return rng.next() < rate ? corrupt(node, rng) : node;
}

/**
 * A deterministic stand-in for an LLM: it reads the fixture's ground truth (found via the "Ref:" footer in
 * the document text), injects errors at a fixed rate, and sometimes breaks the schema on the first try.
 * It exists so the pipeline, scorer and CI gate run offline. Its numbers say nothing about real models.
 */
export function simulated(profile: Profile): Provider {
  return {
    name: profile.name,
    model: `${profile.name}-sim`,
    pricing: { inputPerM: 0, outputPerM: 0 },
    async complete({ prompt }) {
      const id = /Ref: ([a-z]+-\d+)/.exec(prompt)?.[1];
      if (!id) throw new Error('simulated model needs a fixture document');
      const rng = makeRng(hashString(`${profile.name}:${id}`));
      const truth = JSON.parse(readFileSync(join(FIXTURES, `${id}.json`), 'utf8')) as Record<string, unknown>;
      const retry = prompt.includes('failed validation');
      const reply = perturb(truth, profile.fieldError, rng) as Record<string, unknown>;
      if (!retry && rng.next() < profile.schemaBreak) delete reply.currency;
      const [lo, hi] = profile.latencyMs;
      return { text: JSON.stringify(reply), latencyMs: rng.int(lo, hi) };
    },
  };
}

export const SIMULATED: Record<string, () => Provider> = {
  'simulated-strong': () => simulated({ name: 'simulated-strong', fieldError: 0.03, schemaBreak: 0.04, latencyMs: [500, 1500] }),
  'simulated-weak': () => simulated({ name: 'simulated-weak', fieldError: 0.15, schemaBreak: 0.2, latencyMs: [900, 3500] }),
};
