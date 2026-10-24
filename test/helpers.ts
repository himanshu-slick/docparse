import type { CompletionRequest, CompletionResult, Provider } from '../src/index.js';

export function fakeProvider(replies: string[]): Provider & { calls: CompletionRequest[] } {
  const calls: CompletionRequest[] = [];
  return {
    name: 'fake',
    model: 'fake-1',
    pricing: { inputPerM: 0, outputPerM: 0 },
    calls,
    async complete(req): Promise<CompletionResult> {
      calls.push(req);
      const text = replies[Math.min(calls.length - 1, replies.length - 1)] as string;
      return { text, latencyMs: 10 };
    },
  };
}

export const validInvoice = {
  invoiceNumber: 'INV-1',
  issueDate: '2026-01-02',
  dueDate: '2026-02-01',
  vendor: 'Acme',
  customer: 'Bob',
  currency: 'USD',
  lineItems: [{ description: 'Widget', quantity: 2, unitPrice: 5, amount: 10 }],
  subtotal: 10,
  tax: 1,
  total: 11,
};
