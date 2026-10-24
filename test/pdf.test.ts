import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pdfToText } from '../src/index.js';

const fixture = (id: string) => readFile(join(import.meta.dirname, '../eval/fixtures', `${id}.pdf`));

describe('pdfToText', () => {
  it('extracts text from a fixture PDF', async () => {
    const text = await pdfToText(await fixture('inv-001'));
    expect(text).toContain('INVOICE INV-2026-01037');
    expect(text).toContain('Total due: 212.59');
  });

  it('accepts a Buffer and a plain Uint8Array alike', async () => {
    const buf = await fixture('pol-001');
    expect(await pdfToText(buf)).toBe(await pdfToText(new Uint8Array(buf)));
  });

  it('every fixture parses and carries its own ref', async () => {
    for (const id of ['inv-030', 'pol-015', 'stm-005']) {
      expect(await pdfToText(await fixture(id))).toContain(`Ref: ${id}`);
    }
  });
});
