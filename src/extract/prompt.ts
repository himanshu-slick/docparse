import { z } from 'zod';
import { SCHEMAS, type DocType } from '../schemas/index.js';
import type { CompletionRequest } from '../providers/types.js';

const RULES = [
  'You extract structured data from business documents.',
  'Reply with a single JSON object that matches the schema. No prose, no code fences.',
  'Dates are YYYY-MM-DD. Amounts are plain numbers with no currency symbols or thousands separators.',
  'Currency is a 3-letter ISO code. Copy identifiers exactly as written.',
].join(' ');

export function buildRequest(docType: DocType, text: string): CompletionRequest {
  const schema = JSON.stringify(z.toJSONSchema(SCHEMAS[docType]));
  return {
    system: `${RULES}\nDocument type: ${docType}\nJSON schema: ${schema}`,
    prompt: `Document text:\n"""\n${text}\n"""`,
  };
}

export function buildRetryRequest(base: CompletionRequest, previous: string, error: string): CompletionRequest {
  return {
    system: base.system,
    prompt: `${base.prompt}\n\nYour previous reply:\n${previous}\n\nIt failed validation:\n${error}\nReturn corrected JSON only.`,
  };
}
