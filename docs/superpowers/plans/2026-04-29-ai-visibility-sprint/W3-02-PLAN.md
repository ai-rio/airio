---
phase: ai-visibility-sprint
plan: W3-02
type: execute
wave: 3
depends_on: ["W2-03"]
files_modified:
  - dashboard/app/sites/[siteId]/prompts/page.tsx
autonomous: false
---

<objective>
## Goal
Add "Sugerir prompts com IA" button to the prompts configuration page. When clicked, calls `suggestPrompts` action and presents 5 suggestions as a checkable list. User selects which to add, clicks confirm, and selected prompts are appended to the basket.

## Purpose
Activates the W2-03 backend action in the UI. Reduces onboarding friction for new monitored sites.

## Output
A suggestion UI flow on `/sites/[siteId]/prompts` — button → loading → checklist → save selected.
</objective>

<context>
## Source Files
@dashboard/app/sites/[siteId]/prompts/page.tsx
</context>

<acceptance_criteria>

## AC-1: Suggest button triggers action and shows suggestions
```gherkin
Given a user is on the prompts configuration page
When they click "Sugerir prompts com IA"
Then the button shows a loading state
And after completion, 5 suggested prompts appear as a checkable list below
```

## AC-2: User can select and save suggestions
```gherkin
Given 5 suggestions are displayed
When the user checks 3 of them and clicks "Adicionar selecionados"
Then the 3 selected prompts are appended to the existing basket prompts
And the suggestion UI collapses
```

## AC-3: Graceful error state
```gherkin
Given the suggestPrompts action fails (network error, OpenRouter down)
When the user clicks suggest
Then an error message is displayed (no crash)
And the button is re-enabled for retry
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Add suggestion UI to prompts page</name>
  <files>dashboard/app/sites/[siteId]/prompts/page.tsx</files>
  <action>
    Read the current prompts page first to understand existing state management and mutation patterns.

    Add the following state and logic to the page component:
    ```typescript
    const suggestPromptsAction = useAction(api.actions.suggestPrompts.suggestPrompts);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
    const [suggesting, setSuggesting] = useState(false);
    const [suggestError, setSuggestError] = useState<string | null>(null);

    async function handleSuggest() {
      setSuggesting(true);
      setSuggestError(null);
      setSuggestions([]);
      try {
        const result = await suggestPromptsAction({ siteId: siteId as Id<'sites'> });
        setSuggestions(result);
        setSelectedSuggestions(new Set(result.map((_, i) => i))); // pre-select all
      } catch (err) {
        setSuggestError('Erro ao gerar sugestões. Tente novamente.');
      } finally {
        setSuggesting(false);
      }
    }

    async function handleAddSuggestions() {
      const selected = suggestions.filter((_, i) => selectedSuggestions.has(i));
      // Append selected to existing prompts via updateBasket mutation
      const existing = basket?.prompts ?? [];
      const merged = Array.from(new Set([...existing, ...selected]));
      await updateBasket({ basketId: basket!._id, prompts: merged });
      setSuggestions([]);
    }
    ```

    Add the UI block after the "add prompt" input, before the save button:

    ```tsx
    {/* AI Suggestions */}
    <div className="mt-6 border-t border-border pt-6">
      <button
        type="button"
        onClick={handleSuggest}
        disabled={suggesting}
        className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.1em] text-[var(--brand-text)] hover:opacity-70 transition-opacity disabled:opacity-40"
      >
        {suggesting ? 'Gerando sugestões...' : 'Sugerir prompts com IA →'}
      </button>

      {suggestError && (
        <p className="font-sans text-[var(--brand-danger)] text-[13px] mt-2">{suggestError}</p>
      )}

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          {suggestions.map((s, i) => (
            <label key={i} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSuggestions.has(i)}
                onChange={() => {
                  const next = new Set(selectedSuggestions);
                  if (next.has(i)) next.delete(i); else next.add(i);
                  setSelectedSuggestions(next);
                }}
                className="mt-0.5 accent-[var(--brand)]"
              />
              <span className="font-sans text-foreground text-[14px]">{s}</span>
            </label>
          ))}

          <button
            type="button"
            onClick={handleAddSuggestions}
            disabled={selectedSuggestions.size === 0}
            className="mt-3 bg-[var(--brand)] text-[var(--brand-fg)] font-[family-name:var(--font-bebas)] text-[16px] h-10 px-6 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            ADICIONAR SELECIONADOS ({selectedSuggestions.size})
          </button>
        </div>
      )}
    </div>
    ```

    Import `useAction` from `convex/react`. Follow design-system.md tokens — no rounded-*, no hardcoded colors.
  </action>
  <verify>bun run build — no TypeScript errors. Navigate to /sites/[siteId]/prompts and click suggest.</verify>
  <done>AC-1, AC-2, AC-3 satisfied</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>AI prompt suggestion UI on prompts configuration page</what-built>
  <how-to-verify>
    1. Run: cd dashboard && bun run dev
    2. Visit: /sites/[siteId]/prompts
    3. Click "Sugerir prompts com IA →"
    4. Confirm loading state shows
    5. Confirm 5 suggestions appear pre-checked
    6. Uncheck 2, click "ADICIONAR SELECIONADOS (3)"
    7. Confirm those 3 prompts appear in the basket list
  </how-to-verify>
  <resume-signal>Type "approved" to continue, or describe issues to fix</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- Existing prompt add/remove/save logic on the prompts page
- basket mutation signatures in convex/promptBaskets.ts

## SCOPE LIMITS
- Suggestions are appended to existing prompts, deduped — do not replace
- No server-side storage of suggestions — they are ephemeral until user selects
- No rate limiting on suggest button (trust UX friction as natural limiter)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `bun run build` exits 0
- [ ] Suggestion button visible on prompts page
- [ ] Clicking generates 5 PT-BR prompts
- [ ] Selecting + saving appends to basket correctly
- [ ] Error state shows if action fails
</verification>

<success_criteria>
- Suggest button on prompts page functional
- Suggestions rendered as checkable list
- Selected prompts appended to basket on save
- Error handling in place
</success_criteria>

<output>
After completion, create `W3-02-SUMMARY.md` noting: UX flow, any edge cases found during testing.
</output>
