import { describe, expect, it } from 'vitest';
import { findRegressions } from '../eval/check.js';
import { costUsd, fieldMatches, flatten, kindOf, percentile, scoreDocument } from '../eval/score.js';

describe('scoring', () => {
  it('flattens nested objects and arrays to paths', () => {
    const m = flatten({ a: 1, b: [{ c: 'x' }, { c: 'y' }] });
    expect([...m.keys()]).toEqual(['a', 'b[0].c', 'b[1].c']);
  });

  it('picks the comparison kind from the field name and type', () => {
    expect(kindOf('invoiceNumber', 'X')).toBe('exact');
    expect(kindOf('lineItems[0].description', 'X')).toBe('name');
    expect(kindOf('total', 5)).toBe('amount');
    expect(kindOf('entries[2].reference', 'R')).toBe('exact');
  });

  it('matches amounts within a cent, names loosely, IDs exactly', () => {
    expect(fieldMatches('amount', 10.0, 10.004)).toBe(true);
    expect(fieldMatches('amount', 10.0, 10.02)).toBe(false);
    expect(fieldMatches('amount', 10, '10')).toBe(false);
    expect(fieldMatches('name', 'Acme Ltd.', 'ACME  ltd')).toBe(true);
    expect(fieldMatches('exact', 'INV-1', 'inv-1')).toBe(false);
    expect(fieldMatches('exact', 'INV-1', undefined)).toBe(false);
  });

  it('scores a document field by field', () => {
    const truth = { id: 'A1', total: 10, items: [{ name: 'x' }, { name: 'y' }] };
    expect(scoreDocument(truth, { id: 'A1', total: 11, items: [{ name: 'X' }] })).toEqual({ correct: 2, total: 4 });
    expect(scoreDocument(truth, undefined)).toEqual({ correct: 0, total: 4 });
  });

  it('computes percentiles and cost', () => {
    expect(percentile([5, 1, 3, 2, 4], 0.5)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.95)).toBe(10);
    expect(percentile([], 0.5)).toBe(0);
    expect(costUsd(1_000_000, 500_000, { inputPerM: 1, outputPerM: 2 })).toBe(2);
  });
});

describe('regression gate', () => {
  const baseline = { m: { accuracy: 90 } };

  it('passes within 2 points and on improvement', () => {
    expect(findRegressions(baseline, [{ name: 'm', accuracy: 88.5 }])).toEqual([]);
    expect(findRegressions(baseline, [{ name: 'm', accuracy: 95 }])).toEqual([]);
  });

  it('fails on a drop of more than 2 points', () => {
    expect(findRegressions(baseline, [{ name: 'm', accuracy: 87.9 }])).toHaveLength(1);
  });

  it('fails when a baseline model is missing from the results', () => {
    expect(findRegressions(baseline, [])).toHaveLength(1);
  });
});
