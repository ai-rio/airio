const Z95 = 1.96;

export function computePsos(citationCount: number, totalSamples: number): number {
  if (totalSamples <= 0) throw new Error('totalSamples must be > 0');
  return citationCount / totalSamples;
}

export function wilsonCI(
  citationCount: number,
  totalSamples: number,
  z = Z95
): { lower: number; upper: number } {
  if (totalSamples <= 0) throw new Error('totalSamples must be > 0');
  const p = citationCount / totalSamples;
  const n = totalSamples;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const halfWidth = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominator;
  return {
    lower: Math.max(0, center - halfWidth),
    upper: Math.min(1, center + halfWidth),
  };
}
