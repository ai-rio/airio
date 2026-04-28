export interface CitationSample {
  prompt: string;
  runIndex: number;
  brandDetected: boolean;
  responseSnippet: string;
}

export interface PsosResult {
  psos: number;
  ciLower: number;
  ciUpper: number;
  totalSamples: number;
  citationCount: number;
}

export interface RawSample {
  runIndex: number;
  responseText: string;
}
