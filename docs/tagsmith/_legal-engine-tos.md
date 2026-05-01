# Engine ToS Compliance — AEO Citation Tracker

**Status:** Research complete 2026-05-01 · Living doc · Review quarterly
**Scope:** Programmatic API use to query LLMs with auto-generated prompts, store output, analyze for brand mentions, display position deltas to end users.
**Method:** Tavily MCP research (`mcp__claude_ai_Tavily__tavily_research` + `mcp__tavily-remote-mcp__tavily_research`, model=pro/mini) against official provider legal pages. Findings dated May 2026.

---

## TL;DR

| Engine | API use | Store output | Brand-mention analysis | Train on output | Verdict |
|---|---|---|---|---|---|
| **Perplexity Sonar** | ✅ | ✅ | ✅ | ❌ | ✅ Clear go |
| **OpenAI ChatGPT API** | ✅ | ✅ owned | ✅ no ban | ❌ competing models | ✅ Clear go |
| **Anthropic Claude API** | ✅ | ✅ assigned to customer | ✅ allowed | ❌ competing models | ✅ Clear go + copyright indemnity |
| **Google Gemini API** | ✅ paid tier | ✅ implied | ⚠️ ambiguous | ❌ similar/competing | ⚠️ Yellow — hedge required |

**Decision:** Adopt Option B — Free tier = ChatGPT + Perplexity (lowest-risk pair). Pro tier adds Claude + Gemini. Gemini stays in product UI but is NOT named on marketing pages.

---

## 1. Anthropic (Claude API)

**Verdict:** ✅ Clearest legal posture of the four. Output ownership is unconditionally assigned to customer. Anthropic ships an expanded copyright indemnity for commercial API use.

### Key clauses

- **Output ownership:** "Anthropic hereby assigns to Customer its right, title and interest (if any) in and to Outputs" — Customer owns Outputs, no royalty or attribution required. [1][2]
- **No training on customer data:** Anthropic may not train models on Customer Content (API inputs + outputs). [1]
- **Retention:** Standard API log retention 30 days, reduced to 7 days for logs after 2025-09-15. ZDR (zero-data-retention) addendum available for enterprise. [3][4]
- **Prohibited uses:** Building competing products/services that "wrap" Claude without added value, reverse engineering, training competing models. Brand monitoring / sentiment analysis are NOT prohibited. [1]
- **Indemnity:** Anthropic defends customers against third-party copyright infringement claims arising from authorized use of Services or Outputs. [5]

### Sources

1. https://www-cdn.anthropic.com/6b68a6508f0210c5fe08f0199caa05c4ee6fb4dc/Anthropic-on-Bedrock-Commercial-Terms-of-Service_Dec_2023.pdf
2. https://www-cdn.anthropic.com/471bd07290603ee509a5ea0d5ccf131ea5897232/anthropic-vertex-commercial-terms-march-2024.pdf
3. https://www.datastudios.org/post/claude-data-retention-policies-storage-rules-and-compliance-overview
4. https://privacy.claude.com/en/articles/8956058-i-have-a-zero-data-retention-agreement-with-anthropic-what-products-does-it-apply-to
5. https://www.anthropic.com/news/expanded-legal-protections-api-improvements

---

## 2. OpenAI (ChatGPT API)

**Verdict:** ✅ Permitted on the API/Business Terms track. Critical to use the API channel (NOT consumer UI scraping).

### Key clauses

- **Output ownership:** Business Terms assign output to customer. Explicit right to integrate API into customer applications and make available to end users. [9][16]
- **No training on API data by default:** API data not used to train OpenAI models unless customer opts in (effective 2023-03-01). [13]
- **Retention:** Up to 30 days for abuse monitoring; ZDR available for eligible endpoints + use cases. [13]
- **Prohibited:** Using output to develop models that compete with OpenAI. [8] Presenting output as human-generated. [8]
- **API vs consumer ToS distinction:** Consumer Terms ban automatic/programmatic extraction. Business/API Terms expressly authorize programmatic integration. **Use API channel only — never scrape the consumer UI.** [8][9]
- **Rate limits:** Org/project-level tiered usage limits scale with spend. Modest workload (5 prompts/week/user) feasible at standard tiers. [14]

### Sources

8. https://openai.com/policies/row-terms-of-use/
9. https://openai.com/policies/nov-2023-business-terms/
13. https://developers.openai.com/api/docs/guides/your-data
14. https://developers.openai.com/api/docs/guides/rate-limits
15. https://openai.com/enterprise-privacy/
16. https://openai.com/policies/services-agreement/

---

## 3. Perplexity (Sonar API)

**Verdict:** ✅ Clear go. Confirmed in prior research (memory: `reference_perplexity_tos.md`).

### Key clauses

- Sonar API programmatic use ✅ allowed.
- Web UI scraping ❌ prohibited.
- No legal blocker for runSiteGeoCheck-style brand monitoring.

### Sources

See `reference_perplexity_tos.md` (cross-session memory). Provider source: https://docs.perplexity.ai/

---

## 4. Google (Gemini API) — ⚠️ Yellow Flag

**Verdict:** Not expressly barred, but Google Cloud Service Terms include a broad competitive-use clause that creates material ambiguity for a commercial AEO/SEO monitoring product.

### Key clauses

- **Competitive-use restriction (the issue):**
  > "Customers may not use an AI/ML Service or Generated Output to develop a similar or competing product or service."
  > "Customers may not use output ... to create or improve models similar to a Google Model." [B]
  > Google may suspend or terminate use for suspected violation.

- **Storage:** Not expressly forbidden. Generated responses treated as customer Content; terms discuss provider-side logging, not customer storage bans. [A][C]
- **No training on paid API data:** Paid Gemini API does not use prompts/responses to improve Google products. Logs retained limited period for policy enforcement, legal disclosures, safety. [A]
- **Human review:** Reviewers may read API I/O after disconnecting from account/project identifiers. [A]
- **Grounding features:** 30-day storage rules apply when using Google Search/Maps grounding. [A]
- **Attribution:** Customer must display required attribution per API documentation. No specific end-user citation/disclosure rule in supplied evidence. [D]
- **Rate limits:** Project-based, scale with spend tier. Paid access can be suspended on billing-account issues. [E][F][G]

### Risk analysis

The competitive-use clause is broad enough that a strict reader could interpret an AEO citation tracker as "developing a similar or competing product or service." Google may suspend on suspicion alone — enforcement risk exists even where scope is unclear.

### Mitigations adopted (Option B, 2026-05-01)

1. **LP scrubbed of Gemini mentions** — reduces keyword-based ToS sweep attack surface.
2. **Free tier = ChatGPT + Perplexity** — Gemini gated behind paid signup; smaller blast radius if flagged.
3. **Positioning copy:** "monitor your brand visibility" framing only. Never "alternative to Gemini" or "AI answers tool."
4. **Engine attribution:** Display "Source: [Engine] · checked [date]" on every cited result.
5. **No raw response storage long-term:** Extract entity mentions + position, drop raw text after analysis (or short retention window).
6. **Internal ToS clause:** Reserve right to swap engines if vendor policy changes.
7. **Quarterly review** of Google AI/ML competitive-use clause.

### Sources

- A. https://ai.google.dev/gemini-api/terms
- B. https://cloud.google.com/terms/service-terms (AI/ML Services section)
- C. https://cloud.google.com/terms/gemini-enterprise/business
- D. https://developers.google.com/terms
- E. https://ai.google.dev/gemini-api/docs/pricing
- F. https://ai.google.dev/gemini-api/docs/rate-limits
- G. https://ai.google.dev/gemini-api/docs/billing
- H. https://ai.google.dev/gemini-api/docs/usage-policies

---

## Cross-Engine Compliance Checklist

All engines:
- ❌ Don't present output as human-generated (OpenAI explicit; spirit applies to all)
- ❌ Don't use outputs to train competing LLMs (all 4)
- ✅ API channel only — never scrape consumer UI (OpenAI consumer ToS explicit ban; principle applies broadly)
- ✅ Display engine attribution + check date when showing citations
- ✅ Pay tier (paid API) for production traffic — free tiers have weaker data-use protections
- ✅ Quarterly clause review (track diff in service-terms changelog)

---

## Open Items

- [ ] Negotiate ZDR addendum with Anthropic if customer volume justifies it
- [ ] OpenAI ZDR endpoint eligibility check before launch
- [ ] Add "engine substitution" clause to user-facing ToS
- [ ] Set quarterly cron to re-run Tavily research against `cloud.google.com/terms/service-terms`
- [ ] Legal counsel review before public launch (this doc = engineering-grade research, not legal advice)

---

## Disclaimer

This document is engineering due-diligence based on Tavily-mediated research of public provider documentation. It is NOT legal advice. Obtain counsel review before relying on these findings in production. Provider terms change frequently; verify current ToS before each launch milestone.
