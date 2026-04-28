import { describe, expect, it } from 'bun:test';
import { computePsos, wilsonCI } from '../stats';

describe('computePsos', () => {
  it('returns 0 when no citations', () => {
    expect(computePsos(0, 35)).toBe(0);
  });
  it('returns 1 when all citations', () => {
    expect(computePsos(35, 35)).toBe(1);
  });
  it('returns correct proportion', () => {
    expect(computePsos(7, 35)).toBeCloseTo(0.2, 5);
  });
  it('throws when totalSamples is 0', () => {
    expect(() => computePsos(0, 0)).toThrow('totalSamples must be > 0');
  });
});

describe('wilsonCI', () => {
  it('lower bound is 0 for zero citations', () => {
    const { lower } = wilsonCI(0, 35);
    expect(lower).toBe(0);
  });
  it('upper bound is 1 for all citations', () => {
    const { upper } = wilsonCI(35, 35);
    expect(upper).toBe(1);
  });
  it('psos is within CI bounds', () => {
    const { lower, upper } = wilsonCI(14, 35);
    const psos = computePsos(14, 35);
    expect(lower).toBeLessThan(psos);
    expect(upper).toBeGreaterThan(psos);
  });
  it('CI narrows with more samples at same proportion', () => {
    const wide = wilsonCI(7, 35);
    const narrow = wilsonCI(70, 350);
    expect(narrow.upper - narrow.lower).toBeLessThan(wide.upper - wide.lower);
  });
  it('throws when totalSamples is 0', () => {
    expect(() => wilsonCI(0, 0)).toThrow('totalSamples must be > 0');
  });
});
