# Tagsmith Research Citations Index

> Curated index of academic + industry research that informs Tagsmith's product, positioning, and pricing. Each entry maps the paper's findings to specific Tagsmith decisions. Refresh quarterly.

---

## How this doc is used

- **PRD:** when adding/changing AEO tracker logic, check Sielinski 2026 (sampling, CIs) and Tian et al. 2026 (failure taxonomy).
- **Marketing/LP:** cite Semrush 2025 + the academic papers below for authority anchors. Each citation should be linked to a specific claim, never general.
- **Pricing:** Free vs Pro tier rationale rests on Sielinski's sample-size analysis. Don't invent reasons — cite the science.
- **Blog content pipeline:** each paper unlocks 1-3 post ideas; see "Content hooks" per entry.

---

## 1. Sielinski 2026 — *Quantifying Uncertainty in AI Visibility*

**Citation:** Sielinski, R. (2026). *Quantifying Uncertainty in AI Visibility: A Statistical Framework for Generative Search Measurement.* arXiv:2603.08924v1.
**Local copy:** `/home/carlos/research/aeo-monitoring/papers/MinerU_markdown_2603.08924v1_2049222347429572608.md`
**Platforms studied:** Perplexity Search, OpenAI SearchGPT, Google Gemini.

### Core findings

- AI citation metrics are **random variables**, not fixed values. The same query returns different cited sources on different runs.
- Single-run point estimates of citation share, prevalence, and rank are misleading.
- Citation distributions follow a **power-law form**.
- Bootstrap confidence intervals reveal that many apparent differences between domains fall **within the noise floor** of the measurement process.
- Distribution-wide rank stability analysis shows citation rankings are unstable across samples — not just at the top, but throughout the cited set.
- Practical guidance: **report uncertainty estimates** alongside point estimates; minimum sample sizes required for interpretable confidence intervals.

### Tagsmith implications

| Layer | Implication |
|---|---|
| **Product** | AEO tracker must report **confidence intervals** alongside citation rates. Single-run scores are insufficient for decisions. |
| **Pricing tier rationale** | Free tier (weekly = 1 sample/week) → directional only. Pro tier (daily = 7 samples/week) → tight enough CI for real decisions. Honest wedge, science-defended. |
| **Alert logic** | Position "drop" alerts must apply significance testing. Overlapping CIs = no real change. Prevents alert spam, raises trust. |
| **Convex schema** | AEO measurement records need `sampleCount`, `sampleVariance`, and computed `ci95Lower` / `ci95Upper` fields per prompt × engine cell. |
| **UI** | Citation matrix must surface CI visually (e.g., position "5 ±2"). Tooltip explains: based on N samples over M days. |
| **Marketing wedge** | "The only AEO tracker that reports statistically meaningful citation rates." No competitor does this today (Otterly, Profound, etc. all show single-run numbers). |

### Content hooks

1. *"Your single-run AEO score is lying — here's the math."* Walk through Sielinski's bootstrap CI example. Direct ICP1+ICP2 hook.
2. *"How many samples do you need for a real AEO score?"* Practical guide derived from §6 sample-size analysis.
3. *"Why we don't alert on every position change."* Explain significance testing in plain language. Anti-snakeoil + retention.

---

## 2. Tian, Chen, Tang et al. 2026 — *Diagnosing and Repairing Citation Failures in GEO*

**Citation:** Tian, Z., Chen, Y., Tang, Y., Liu, J., Jia, R. (2026). *Diagnosing and Repairing Citation Failures in Generative Engine Optimization.* arXiv:2603.09296v1. Virginia Tech + Zhejiang University.
**Local copy:** `/home/carlos/research/aeo-monitoring/papers/MinerU_markdown_2603.09296v1_2049223874009432064.md`
**Project page:** https://zhihuat.github.io/agentgeo/

### Core findings

- Existing GEO methods measure **contribution** (how much a document influences a response) rather than **citation** (the mechanism that drives traffic back to creators). These are different metrics.
- Generic rewriting rules (one-size-fits-all GEO advice) fail to diagnose **why** individual documents aren't cited.
- Authors propose:
  1. **Taxonomy of citation failure modes** spanning stages of the citation pipeline.
  2. **AgentGEO** — agentic system that diagnoses failures, selects targeted repairs from a tool library, iterates until citation is achieved.
  3. **Document-centric benchmark** evaluating whether optimizations generalize across held-out queries.
- **AgentGEO achieves 40%+ relative improvement in citation rates while modifying only 5% of content** (vs 25% for baselines).
- Generic optimization can **harm long-tail content** — a critical warning against blanket "AEO best practices."

### Tagsmith implications

| Layer | Implication |
|---|---|
| **Positioning** | Tagsmith focuses on citation, not contribution. This validates the framing — most competitors conflate them. Use "citation, not contribution" as a differentiator in copy. |
| **v2 feature** | **Citation-failure diagnosis layer.** When a brand isn't cited, categorize the failure mode (missing schema, wrong @type, JS-rendered pricing, no canonical URL, no Wikipedia entry, broken og:image, etc.). Failure-mode taxonomy = product spec, paper-grounded. |
| **Schema validator output** | Existing validator output is binary (valid / invalid). Should evolve to map errors to citation-failure categories per Tian et al. taxonomy. |
| **Anti-snakeoil narrative** | Generic optimization can harm long-tail content. Tagsmith targets specific failure modes per page. Concrete claim, paper-backed. |
| **Marketing wedge** | "Tagsmith doesn't apply generic 'AEO best practices.' We diagnose why your specific page isn't cited and fix the specific cause." |

### Content hooks

1. *"Most AEO tools measure contribution. Tagsmith measures citation. Why the difference matters."* Foundational positioning post.
2. *"The 12 reasons your brand isn't cited (and which fix actually works)."* Failure-mode taxonomy adapted to indie-brand language.
3. *"Why generic 'add schema markup' advice can hurt your long-tail pages."* Counter-intuitive, cites Tian et al. directly.

---

## 3. Schulte, Bleeker, Kaufmann 2026 — *Don't Measure Once: Measuring Visibility in AI Search (GEO)*

**Citation:** Schulte, J., Bleeker, M., Kaufmann, P. (2026). *Don't Measure Once: Measuring Visibility in AI Search (GEO).* arXiv:2604.07585v1. Global Center for Entrepreneurship and Innovation, University of St. Gallen.
**Local copy:** `/home/carlos/research/aeo-monitoring/papers/MinerU_markdown_2604.07585v1_2049222985857171456.md`

### Core findings (preliminary)

- Reinforces Sielinski 2026's central message: **single measurements are unreliable** in generative search visibility.
- Provides European-academic credibility to the same argument (St. Gallen is a respected business school).
- Useful as a **second authority anchor** for the confidence-interval wedge — two independent papers, two continents, same conclusion.

### Tagsmith implications

| Layer | Implication |
|---|---|
| **Marketing** | Cite alongside Sielinski for "two independent academic studies" framing. Stronger than single-source. |
| **Product** | No new product impact beyond Sielinski's. |

### Content hooks

1. *"Two academic papers, one conclusion: AEO needs repeated sampling."* Joint citation post.

---

## 4. Semrush 2025 AI Visibility Index Study (industry, primary)

**Already documented in:** `_legal-engine-tos.md` and memory `project_tagsmith_aeo_engines.md`.
**URL:** https://ai-visibility-index.semrush.com/
**Local copy:** `/home/carlos/research/aeo-monitoring/papers/MinerU_markdown_The-2025-AI-Visibility-Index-Study-Semrush-Enterprise-compressed_2050579282234187776.md`

### Brief recap (full notes in memory)

- Two-stage AI decision process: Stage 1 (Discovery, UGC-driven) and Stage 2 (Authority, site/schema-driven).
- Tagsmith = Stage-2 authority tool (anti-snakeoil scope wall).
- Static HTML + structured markup = "essential first steps" for AI visibility (Ch6).
- ChatGPT ~80% market share + Google AI Mode = the two surveyed engines.
- Industry-grade data, 2,500 prompts, 5 verticals.

---

## Cross-paper synthesis

The four sources converge on a single positioning thesis for Tagsmith:

1. **AI visibility is non-deterministic and probabilistic** (Sielinski, Schulte). Therefore: report confidence intervals, run repeated samples, apply significance tests.
2. **Citation ≠ contribution; failure modes are specific** (Tian et al.). Therefore: diagnose the specific failure, don't apply generic rules.
3. **Stage 1 ≠ Stage 2; authority signals are technical** (Semrush). Therefore: own Stage 2 (schema, static HTML, OG metadata, structured pricing) and pair with separate UGC strategy for Stage 1.

These are not three messages. They are one message: **AEO is engineering, not magic.** Tagsmith productizes that engineering. Competitors that promise "we'll get you cited" without specifying which failure mode they fix or how they measure are selling magic.

---

## Maintenance

- Add new entries here when papers ship that materially change AEO methodology, measurement, or pricing rationale.
- Update implications quarterly — research moves fast in this space.
- When citing publicly (LP, blog, FAQ), link to the official source URL, not the local MinerU markdown path.
- Authors publishing in this space are rare and findable. PR opportunity: reach out to Sielinski + Tian et al. about Tagsmith productizing their methodology.
