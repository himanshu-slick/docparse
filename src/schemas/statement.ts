import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

export const StatementEntry = z.object({
  date,
  reference: z.string(),
  description: z.string(),
  amount: z.number(),
});

export const Statement = z.object({
  vendor: z.string(),
  statementDate: date,
  periodStart: date,
  periodEnd: date,
  currency: z.string().length(3),
  openingBalance: z.number(),
  closingBalance: z.number(),
  entries: z.array(StatementEntry),
});

export type Statement = z.infer<typeof Statement>;
