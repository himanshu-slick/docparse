import { createWriteStream } from 'node:fs';
import PDFDocument from 'pdfkit';
import type { Invoice, PolicySummary, Statement } from '../src/index.js';
import type { Rng } from './rng.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DATE_STYLES = ['iso', 'long', 'slash'] as const;

export const fmtDate = (iso: string, style: (typeof DATE_STYLES)[number]): string => {
  const [y, m, d] = iso.split('-') as [string, string, string];
  if (style === 'long') return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  if (style === 'slash') return `${d}/${m}/${y}`;
  return iso;
};

export const fmtMoney = (n: number): string => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function invoiceLines(inv: Invoice, rng: Rng): string[] {
  const style = rng.pick(DATE_STYLES);
  return [
    `INVOICE ${inv.invoiceNumber}`,
    `From: ${inv.vendor}`,
    `Bill to: ${inv.customer}`,
    `Issue date: ${fmtDate(inv.issueDate, style)}`,
    `Due date: ${fmtDate(inv.dueDate, style)}`,
    `Currency: ${inv.currency}`,
    '',
    'Description | Qty | Unit price | Amount',
    ...inv.lineItems.map((l) => `${l.description} | ${l.quantity} | ${fmtMoney(l.unitPrice)} | ${fmtMoney(l.amount)}`),
    '',
    `Subtotal: ${fmtMoney(inv.subtotal)}`,
    `Tax (10%): ${fmtMoney(inv.tax)}`,
    `Total due: ${fmtMoney(inv.total)}`,
  ];
}

export function policyLines(p: PolicySummary, rng: Rng): string[] {
  const style = rng.pick(DATE_STYLES);
  return [
    'POLICY SCHEDULE',
    `Policy number: ${p.policyNumber}`,
    `Insurer: ${p.insurer}`,
    `Policyholder: ${p.policyholder}`,
    `Period of insurance: ${fmtDate(p.startDate, style)} to ${fmtDate(p.endDate, style)}`,
    `Currency: ${p.currency}`,
    '',
    'Coverage | Sum insured',
    ...p.coverage.map((c) => `${c.type} | ${fmtMoney(c.limit)}`),
    '',
    `Annual premium: ${fmtMoney(p.premium)}`,
  ];
}

export function statementLines(s: Statement, rng: Rng): string[] {
  const style = rng.pick(DATE_STYLES);
  return [
    `STATEMENT OF ACCOUNT`,
    `Vendor: ${s.vendor}`,
    `Statement date: ${fmtDate(s.statementDate, style)}`,
    `Period: ${fmtDate(s.periodStart, style)} to ${fmtDate(s.periodEnd, style)}`,
    `Currency: ${s.currency}`,
    `Opening balance: ${fmtMoney(s.openingBalance)}`,
    '',
    'Date | Reference | Description | Amount',
    ...s.entries.map((e) => `${fmtDate(e.date, style)} | ${e.reference} | ${e.description} | ${fmtMoney(e.amount)}`),
    '',
    `Closing balance: ${fmtMoney(s.closingBalance)}`,
  ];
}

export function writePdf(path: string, lines: string[], ref: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, pdfVersion: '1.4', compress: false, info: { CreationDate: new Date(0) } });
    const out = createWriteStream(path);
    out.on('finish', resolve).on('error', reject);
    doc.pipe(out);
    doc.fontSize(11);
    lines.forEach((l, i) => (i === 0 ? doc.fontSize(16).text(l).fontSize(11).moveDown() : doc.text(l)));
    doc.moveDown().fontSize(8).text(`Ref: ${ref}`);
    doc.end();
  });
}
