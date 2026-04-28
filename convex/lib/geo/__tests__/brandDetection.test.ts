import { describe, expect, it } from 'bun:test';
import { detectBrand } from '../brandDetection';

describe('detectBrand', () => {
  it('detects exact brand name', () => {
    expect(detectBrand('According to Airbnb, prices are rising.', 'Airbnb')).toBe(true);
  });
  it('is case-insensitive', () => {
    expect(detectBrand('AIRBNB offers competitive rates.', 'Airbnb')).toBe(true);
  });
  it('returns false when brand not present', () => {
    expect(detectBrand('Booking.com and Vrbo are popular.', 'Airbnb')).toBe(false);
  });
  it('detects brand in domain form', () => {
    expect(detectBrand('Visit airbnb.com for deals.', 'Airbnb')).toBe(true);
  });
  it('returns false for empty response', () => {
    expect(detectBrand('', 'Airbnb')).toBe(false);
  });
  it('detects single-word brand', () => {
    expect(detectBrand('Nike shoes are popular among runners.', 'Nike')).toBe(true);
  });
  it('returns false for empty brand name', () => {
    expect(detectBrand('some text here', '')).toBe(false);
  });
});
