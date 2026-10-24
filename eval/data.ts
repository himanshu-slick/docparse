import type { Invoice, PolicySummary, Statement } from '../src/index.js';
import type { Rng } from './rng.js';

const VENDORS = ['Northwind Supplies Ltd', 'Bluebird Logistics', 'Kestrel Office Co', 'Harbor Freight Services', 'Lumen Print House', 'Orchid Catering'];
const CUSTOMERS = ['Aster Holdings', 'Meridian Clinics', 'Pinecrest Traders', 'Zenith Retail LLP', 'Cobalt Labs'];
const INSURERS = ['Sentinel Mutual', 'Crestline Assurance', 'Beacon Life & General', 'Atlas Shield Insurance'];
const HOLDERS = ['Priya Raman', 'Daniel Okafor', 'Mei Tanaka', 'Lucas Ferreira', 'Aisha Khan', 'Tom Brennan'];
const ITEMS = ['Paper reams', 'Courier service', 'Toner cartridge', 'Pallet storage', 'Catering platter', 'Banner print', 'Consulting hour', 'Cable set'];
const COVERS = ['Fire and allied perils', 'Theft and burglary', 'Public liability', 'Medical expenses', 'Accidental damage', 'Business interruption'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'];

const money = (n: number) => Math.round(n * 100) / 100;

export function isoDate(rng: Rng, yearFrom = 2025): string {
  const d = new Date(Date.UTC(yearFrom, 0, 1) + rng.int(0, 540) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

export function makeInvoice(rng: Rng, n: number): Invoice {
  const lineItems = Array.from({ length: rng.int(1, 4) }, () => {
    const quantity = rng.int(1, 20);
    const unitPrice = money(rng.int(500, 25000) / 100);
    return { description: rng.pick(ITEMS), quantity, unitPrice, amount: money(quantity * unitPrice) };
  });
  const subtotal = money(lineItems.reduce((a, l) => a + l.amount, 0));
  const tax = money(subtotal * 0.1);
  const issueDate = isoDate(rng);
  return {
    invoiceNumber: `INV-${2026}-${String(n * 37 + 1000).padStart(5, '0')}`,
    issueDate,
    dueDate: addDays(issueDate, rng.pick([14, 30, 45])),
    vendor: rng.pick(VENDORS),
    customer: rng.pick(CUSTOMERS),
    currency: rng.pick(CURRENCIES),
    lineItems,
    subtotal,
    tax,
    total: money(subtotal + tax),
  };
}

export function makePolicy(rng: Rng, n: number): PolicySummary {
  const startDate = isoDate(rng);
  const covers = Array.from(new Set(Array.from({ length: rng.int(2, 4) }, () => rng.pick(COVERS))));
  return {
    policyNumber: `POL-${rng.pick(['HM', 'BZ', 'MD'])}-${String(n * 53 + 20000)}`,
    insurer: rng.pick(INSURERS),
    policyholder: rng.pick(HOLDERS),
    startDate,
    endDate: addDays(startDate, 364),
    currency: rng.pick(CURRENCIES),
    coverage: covers.map((type) => ({ type, limit: rng.int(10, 500) * 1000 })),
    premium: money(rng.int(30000, 450000) / 100),
  };
}

export function makeStatement(rng: Rng): Statement {
  const periodStart = isoDate(rng);
  let balance = money(rng.int(100000, 900000) / 100);
  const openingBalance = balance;
  const entries = Array.from({ length: rng.int(4, 8) }, (_, i) => {
    const amount = money((rng.next() < 0.7 ? 1 : -1) * rng.int(2000, 90000) / 100);
    balance = money(balance + amount);
    return {
      date: addDays(periodStart, i * 4 + rng.int(0, 3)),
      reference: `${amount > 0 ? 'INV' : 'PMT'}-${rng.int(10000, 99999)}`,
      description: amount > 0 ? 'Invoice' : 'Payment received',
      amount,
    };
  });
  return {
    vendor: rng.pick(VENDORS),
    statementDate: addDays(periodStart, 31),
    periodStart,
    periodEnd: addDays(periodStart, 30),
    currency: rng.pick(CURRENCIES),
    openingBalance,
    closingBalance: balance,
    entries,
  };
}
