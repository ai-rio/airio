---
phase: ai-visibility-sprint
plan: W2-03
type: execute
wave: 2
depends_on: []
files_modified:
  - convex/actions/suggestPrompts.ts
autonomous: true
---

<objective>
## Goal
Create a Convex action that generates 5 industry-relevant PT-BR monitoring prompts for a given site, using OpenRouter + site crawl data. Reduces onboarding time from 30+ minutes to under 2 minutes.

## Purpose
Users currently must write all prompts manually. For Brazilian SMBs (the ICP), this is a friction-to-activation blocker. AI-suggested prompts lower the barrier to first monitoring cycle.

## Output
New `convex/actions/suggestPrompts.ts` — callable from the prompts page UI (W3-02).
</objective>

<context>
## Project Context
Follow Convex action pattern from `convex/actions/audit.ts`: auth check → rate limit → external call.
OpenRouter is already configured — use `OPENROUTER_MODEL` env var or default to `anthropic/claude-haiku-4-5`.

## Source Files
@convex/actions/audit.ts
@convex/lib/aeo/prompt.ts
@convex/promptBaskets.ts
</context>

<acceptance_criteria>

## AC-1: Returns 5 PT-BR prompts relevant to the site
```gherkin
Given a siteId for a site with name "Clínica Saúde SP" and URL "clinicasaudesp.com.br"
When suggestPrompts action is called
Then it returns an array of exactly 5 strings in PT-BR
And each string is a question that a user might type into ChatGPT or Perplexity about the site's industry
```

## AC-2: Auth required
```gherkin
Given an unauthenticated request
When suggestPrompts is called
Then it returns an error / throws (no prompts returned to unauthenticated callers)
```

## AC-3: Fallback on missing crawl data
```gherkin
Given a site with no prior audit crawl data
When suggestPrompts is called
Then it returns 5 prompts based on site name and URL domain only (no crash)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Create suggestPrompts action</name>
  <files>convex/actions/suggestPrompts.ts</files>
  <action>
    Create `convex/actions/suggestPrompts.ts` as a `'use node'` action:

    ```typescript
    'use node';

    import { v } from 'convex/values';
    import { action } from '../_generated/server';
    import { api } from '../_generated/api';

    export const suggestPrompts = action({
      args: { siteId: v.id('sites') },
      handler: async (ctx, args) => {
        // 1. Auth check
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error('Unauthenticated');

        // 2. Fetch site data
        const site = await ctx.runQuery(api.sites.getById, { siteId: args.siteId });
        if (!site) throw new Error('Site not found');

        // 3. Fetch latest audit for crawl context (optional — fallback gracefully)
        const latestAudit = await ctx.runQuery(api.audits.latestBySite, { siteId: args.siteId });
        let contextClues = '';
        if (latestAudit?.outputFiles) {
          try {
            const parsed = JSON.parse(latestAudit.outputFiles);
            // Extract page types and content summary for context
            contextClues = `Páginas encontradas: ${parsed.pages?.map((p: { url: string }) => p.url).slice(0, 5).join(', ') || 'homepage'}`;
          } catch {
            // ignore parse errors
          }
        }

        // 4. Build prompt
        const systemPrompt = `Você é um especialista em GEO (Generative Engine Optimization) para o mercado brasileiro.
Gere exatamente 5 perguntas em português brasileiro que usuários reais fariam ao ChatGPT, Gemini ou Perplexity
sobre marcas ou serviços na área de atuação do site informado.
As perguntas devem ser genéricas o suficiente para que a marca apareça como resposta se tiver boa visibilidade em IA.
Responda APENAS com um array JSON de 5 strings. Sem explicações.`;

        const userMessage = `Site: ${site.name}
URL: ${site.url}
${contextClues}

Gere 5 perguntas de monitoramento em PT-BR:`;

        // 5. Call OpenRouter
        const model = process.env.OPENROUTER_MODEL ?? 'anthropic/claude-haiku-4-5-20251001';
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://seo.ai.rio.br',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            max_tokens: 512,
            temperature: 0.7,
          }),
        });

        if (!response.ok) throw new Error(`OpenRouter error: ${response.status}`);
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content ?? '[]';

        // 6. Parse and validate
        let prompts: string[] = [];
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            prompts = parsed.filter((p: unknown) => typeof p === 'string').slice(0, 5);
          }
        } catch {
          // Fallback: extract lines from text response
          prompts = content.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 5);
        }

        // Ensure exactly 5 (pad with generic if needed)
        while (prompts.length < 5) {
          prompts.push(`Quais são as melhores opções de ${site.name} no Brasil?`);
        }

        return prompts.slice(0, 5);
      },
    });
    ```

    Follow the Convex action pattern from CLAUDE.md. Use `'use node'` for fetch calls.
    Do NOT add rate limiting here — prompts suggestion is a low-frequency action.
  </action>
  <verify>npx convex dev --once — no TypeScript errors. Call the action from Convex dashboard with a valid siteId. Should return array of 5 strings.</verify>
  <done>AC-1, AC-2, AC-3 satisfied</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `convex/actions/audit.ts` — do not modify existing audit action
- `convex/promptBaskets.ts` — no changes needed; basket management is separate
- Any UI files — that is W3-02

## SCOPE LIMITS
- No saving of suggestions to DB — action returns suggestions, UI lets user choose which to save
- No rate limiting — this is user-triggered, not cron-driven
- No credit deduction — prompt suggestion is a free feature (part of plan, not per-use billing)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npx convex dev --once` — no TypeScript errors
- [ ] Action callable from Convex dashboard
- [ ] Returns array of exactly 5 strings in Portuguese
- [ ] Throws on unauthenticated call
</verification>

<success_criteria>
- suggestPrompts action created and deployed
- Returns 5 PT-BR prompts from site context
- Auth-gated
- Fallback works when no audit data available
</success_criteria>

<output>
After completion, create `W2-03-SUMMARY.md` noting: prompt format, fallback behavior, model used.
</output>
