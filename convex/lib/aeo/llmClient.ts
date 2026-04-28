// Cascading strip order: truncation can happen mid-string inside any of these fields
const STRIPPABLE = ['cmsInstructions', 'rewrittenPassages', 'schemaBlocks'];

export async function callLlm(
  prompt: string,
  apiKey: string,
  model: string
): Promise<Record<string, unknown>> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> };
  const text = data.choices[0]?.message?.content ?? '';

  const start = text.indexOf('{');
  if (start === -1) throw new Error('LLM returned no JSON');
  const end = text.lastIndexOf('}');
  const jsonRaw = end > start ? text.slice(start, end + 1) : `${text.slice(start)}}`;

  const stripped: Record<string, unknown[]> = {};

  let parsed: Record<string, unknown> = {};
  let candidate = jsonRaw;
  for (let attempt = 0; attempt <= STRIPPABLE.length; attempt++) {
    try {
      parsed = JSON.parse(candidate);
      break;
    } catch {
      const field = STRIPPABLE[attempt];
      if (!field) {
        console.error('LLM raw output (first 2000 chars):', text.slice(0, 2000));
        throw new Error('LLM returned invalid JSON');
      }
      stripped[field] = [];
      candidate = candidate.replace(new RegExp(`"${field}"[\\s\\S]*$`), `"${field}":[]}`);
    }
  }

  Object.assign(parsed, stripped);
  if (stripped.schemaBlocks || stripped.cmsInstructions) {
    console.warn('LLM output truncated — stripped fields:', Object.keys(stripped).join(', '));
  }

  return parsed;
}
