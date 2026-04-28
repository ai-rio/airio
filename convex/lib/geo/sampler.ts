import type { RawSample } from './types.js';

export async function samplePerplexity(
  apiKey: string,
  prompt: string,
  runs: number
): Promise<RawSample[]> {
  const results: RawSample[] = [];
  for (let i = 0; i < runs; i++) {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: prompt }],
        temperature: 1,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Perplexity API ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    results.push({
      runIndex: i,
      responseText: data.choices[0]?.message?.content ?? '',
    });
  }
  return results;
}
