import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

export const Coverage = z.object({
  type: z.string(),
  limit: z.number(),
});

export const PolicySummary = z.object({
  policyNumber: z.string(),
  insurer: z.string(),
  policyholder: z.string(),
  startDate: date,
  endDate: date,
  currency: z.string().length(3),
  coverage: z.array(Coverage).min(1),
  premium: z.number(),
});

export type PolicySummary = z.infer<typeof PolicySummary>;
