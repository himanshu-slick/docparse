import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

export const LineItem = z.object({
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  amount: z.number(),
});

export const Invoice = z.object({
  invoiceNumber: z.string(),
  issueDate: date,
  dueDate: date,
  vendor: z.string(),
  customer: z.string(),
  currency: z.string().length(3),
  lineItems: z.array(LineItem).min(1),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
});

export type Invoice = z.infer<typeof Invoice>;
