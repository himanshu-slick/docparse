import { z } from 'zod';
import type { CompletionResult, Provider } from '../providers/types.js';
import { SCHEMAS, type DocType } from '../schemas/index.js';
import { buildRequest, buildRetryRequest } from './prompt.js';

export interface ExtractionResult<T = unknown> {
  docType: DocType;
  /** Parsed object. Present when the reply was JSON, even if it failed the schema. */
  data?: T;
  valid: boolean;
  error?: string;
  attempts: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

/** Models sometimes wrap JSON in code fences or prose; take the outermost object. */
export function parseJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('reply contains no JSON object');
  return JSON.parse(text.slice(start, end + 1));
}

type Check = { data?: unknown; error?: string };

function validate(docType: DocType, text: string): Check {
  let data: unknown;
  try {
    data = parseJson(text);
  } catch (err) {
    return { error: `invalid JSON: ${(err as Error).message}` };
  }
  const parsed = SCHEMAS[docType].safeParse(data);
  if (parsed.success) return { data: parsed.data };
  return { data, error: z.prettifyError(parsed.error) };
}

function tokens(r: CompletionResult, req: { system: string; prompt: string }) {
  return {
    input: r.inputTokens ?? Math.ceil((req.system.length + req.prompt.length) / 4),
    output: r.outputTokens ?? Math.ceil(r.text.length / 4),
  };
}

/** Call the model, validate against the schema, and retry once with the validation error. */
export async function extract(provider: Provider, docType: DocType, text: string): Promise<ExtractionResult> {
  const first = buildRequest(docType, text);
  const r1 = await provider.complete(first);
  const c1 = validate(docType, r1.text);
  const t1 = tokens(r1, first);
  const base = { docType, latencyMs: r1.latencyMs, inputTokens: t1.input, outputTokens: t1.output };
  if (!c1.error) return { ...base, data: c1.data, valid: true, attempts: 1 };

  const retry = buildRetryRequest(first, r1.text, c1.error);
  const r2 = await provider.complete(retry);
  const c2 = validate(docType, r2.text);
  const t2 = tokens(r2, retry);
  return {
    docType,
    data: c2.data ?? c1.data,
    valid: !c2.error,
    error: c2.error,
    attempts: 2,
    latencyMs: r1.latencyMs + r2.latencyMs,
    inputTokens: t1.input + t2.input,
    outputTokens: t1.output + t2.output,
  };
}
