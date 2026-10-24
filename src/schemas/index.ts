import type { ZodType } from 'zod';
import { Invoice } from './invoice.js';
import { PolicySummary } from './policy.js';
import { Statement } from './statement.js';

export { Invoice, PolicySummary, Statement };

export const DOC_TYPES = ['invoice', 'policy', 'statement'] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const SCHEMAS: Record<DocType, ZodType> = {
  invoice: Invoice,
  policy: PolicySummary,
  statement: Statement,
};

const HINTS: Array<[DocType, RegExp]> = [
  ['statement', /statement of account|opening balance/i],
  ['policy', /policy number|policyholder|sum insured/i],
  ['invoice', /invoice/i],
];

export function detectDocType(text: string): DocType | undefined {
  return HINTS.find(([, re]) => re.test(text))?.[0];
}
