import { describe, expect, it } from 'vitest';
import { detectDocType, Invoice, PolicySummary, Statement } from '../src/index.js';
import { validInvoice } from './helpers.js';

describe('schemas', () => {
  it('accepts a valid invoice', () => {
    expect(Invoice.safeParse(validInvoice).success).toBe(true);
  });

  it('rejects bad dates, bad currency and empty line items', () => {
    expect(Invoice.safeParse({ ...validInvoice, issueDate: '02/01/2026' }).success).toBe(false);
    expect(Invoice.safeParse({ ...validInvoice, currency: 'US' }).success).toBe(false);
    expect(Invoice.safeParse({ ...validInvoice, lineItems: [] }).success).toBe(false);
  });

  it('validates a policy summary', () => {
    const policy = {
      policyNumber: 'P-1', insurer: 'Acme Mutual', policyholder: 'Jo', startDate: '2026-01-01',
      endDate: '2026-12-31', currency: 'EUR', coverage: [{ type: 'Fire', limit: 1000 }], premium: 99.5,
    };
    expect(PolicySummary.safeParse(policy).success).toBe(true);
    expect(PolicySummary.safeParse({ ...policy, coverage: [] }).success).toBe(false);
  });

  it('validates a statement with signed entry amounts', () => {
    const statement = {
      vendor: 'V', statementDate: '2026-02-01', periodStart: '2026-01-01', periodEnd: '2026-01-31', currency: 'GBP',
      openingBalance: 100, closingBalance: 50,
      entries: [{ date: '2026-01-05', reference: 'PMT-1', description: 'Payment', amount: -50 }],
    };
    expect(Statement.safeParse(statement).success).toBe(true);
  });

  it('detects document types from text', () => {
    expect(detectDocType('STATEMENT OF ACCOUNT\nOpening balance: 1')).toBe('statement');
    expect(detectDocType('Policy number: X\nPolicyholder: Y')).toBe('policy');
    expect(detectDocType('INVOICE INV-1')).toBe('invoice');
    expect(detectDocType('hello')).toBeUndefined();
  });
});
