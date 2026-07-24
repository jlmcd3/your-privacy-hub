# CPPA ≥98 — Product Improvement Plan (CPPA-PRODUCT-1)

Plan-only. No code, no deploys, no batch launches. Wave 8 undisturbed. Measurement never weakened.

## Diagnosis from our own data (W5–W7, quality_findings, last 30d, failing checks)

Recurring, non-stylistic classes dominate — post-hoc scrubbers can't reach them because the generator never sees verified data:

- **cppa-admt** (top failures): `rubric_citation_misapplied` (58), `h3_admt_citation_depth` (37), `rubric_unsupported_business_claim` (36), `e6_counsel_referral` (29), `h7_admt_blanket_range` (26), `rubric_internal_reasoning_leak` (26), `rubric_invented_admt_section` (17), `h6_admt_governing_anchor` (11).
- **cppa-risk**: `rubric_unsupported_business_claim` (54), `rubric_citation_misapplied` (41), `h2_internal_vocab` (30), `no_british_spelling` (28), `e6_counsel_referral` (18), `qc_r1_1_no_asks_on_resolved_tests` (15), `qc_r1_4_cohort_determinism` (11).
- **cppa-cyber**: `rubric_unsupported_business_claim` (50), `rubric_actionability` (29), `rubric_generic_boilerplate` (27), `rubric_citation_misapplied` (11), `e6_counsel_referral` (10).

Two structural signatures across all three: **(A) citation/pinpoint errors** driven by model recall vs. registry (misapplied / invented / wrong depth / wrong anchor), and **(B) unsupported business claims / actionability / boilerplate** driven by intake silence being narrated as fact. These are exactly the failure modes registry-injection + pre-emit validation fixed on biometric (+10/+6 gate gain, WA +61).

Existing assets we already own and would consume:
- `cppa_authorities` (116 rows, verified_by/verified_at/official_url; unique current-citation index) — direct analog to biometric registry.
- `cppa_source_registry`, `cppa_fsor_commentary`, `cppa_fsor_extract` outputs — proposition-to-source glue.
- `cppa-retrieve-context` edge function — existing retrieval seam to reuse.
- `_shared/intake-contracts/*`, `_shared/golden/*`, `_shared/registry/*` (biometric pattern proven).
- W6 fix modules (`_w6_admt_fix.ts`, `_w6_risk_fix.ts`, `_w6_cyber_fix.ts`) — repurpose as the gate rule library, not deletion.
- `quality_findings` (tool, check_id, dimension, severity, doc_id, run_number) — enough to drive the classifier without schema surgery.

## Levers, feasibility, and sequencing

### L1 — Verified-Citation Injection At Generation (registry-driven authoring)
**Port the biometric registry-injection architecture to admt / risk / cyber.**

Build three thin, tool-scoped registries under `_shared/registry/`:
- `cppa-admt-registry.ts` — § 7000-series (esp. § 7001, § 7220, § 7221, ADMT triggers/exclusions, art. 11), each row: `{ proposition_key, citation, subsection, verbatim_quote, depth_class, governing_anchor, verified_on, primary_source_url }`. Source: `cppa_authorities` filtered by `authority_type` + FSOR overlays.
- `cppa-risk-registry.ts` — § 7150(b)(1)–(7) triggers, § 7152 negligible-benefit test, SPI/50% prong definitions. Each row keyed by `intake_predicate` so `computeIntakeSelectedSubsections()` (already added under W6-RISK-FIX) selects rows deterministically.
- `cppa-cyber-registry.ts` — § 7123(a)–(c) components with the operative-vs-comparative flag from W6-CYBER-FIX v2 (HIPAA/NIST/HITRUST are comparative, never operative unless in-scope).

Generator flow (per section): compute intake predicates → select registry rows → inject as a **structured "verified facts" block** into the prompt (proposition → pinpoint + verbatim_quote + depth_class) → model composes prose *around* fixed pinpoints. Same shape biometric uses today; we already have the retrieval function (`cppa-retrieve-context`) to plug in.

- **Finding-class coverage (mapped):** `rubric_citation_misapplied` (110 across three tools), `h3_admt_citation_depth`, `h6_admt_governing_anchor`, `h7_admt_blanket_range`, `rubric_invented_admt_section`, `no_hallucinated_section_numbers`, `art11_gate_enforced`.
- **Effort:** ~2 days per tool for registry authoring from `cppa_authorities` + 1 day per tool for generator wiring + goldens/contract. Total ≈ 9 dev-days across three tools.
- **Consumes:** `cppa_authorities`, `cppa_fsor_commentary`, existing `_shared/registry` pattern, existing `cppa-retrieve-context`.
- **Risk:** registry gaps → generator refuses to cite (safe failure). Mitigation: registry coverage report before flip.

### L2 — Pre-Emit Validation Gate (harness checks in the product path)
Promote the deterministic h-series / e-series / qc-series checks from the QA harness to the generator's output pipeline. Pattern per tool:

1. Model emits candidate JSON (already structured internally).
2. Run the same check library the harness uses (extracted to `_shared/preemit/{tool}.ts`).
3. On failure, **structured-repair the failing field only** — either (a) regenerate that field with an amended prompt naming the violated rule + registry row, or (b) apply a deterministic rewrite from the W6 fix modules (`rewriteUncitedNamedRules`, `regulatoryBasisScrubZeroRuns`, `computeIntakeSelectedSubsections`, etc.).
4. Bounded retry: max 2 field-level repairs per section; if still failing, emit a typed "insufficient-basis" placeholder (never fabricate).

- **Finding-class coverage:** `h3/h5/h6/h7`, `e5/e6`, `rubric_internal_reasoning_leak`, `qc_r1_*`, `no_british_spelling`.
- **Cost/run estimate:** +150–400ms per section for local checks (no model call); +1 model call for ~15–25% of sections that repair (based on W7 failure rates). Expected p95 latency delta ≤ +8s per full run; token cost delta ≤ ~15%.
- **Effort:** ~1.5 days per tool; the check code exists — this is extraction + wiring + retry policy.
- **Data consumed:** existing harness check modules; W6 fix modules become the deterministic repair library.

### L3 — Hard Schema Slots (S5, already queued) — confirm and scope residual
Typed exec-summary slots for admt/cyber close: `rubric_actionability` (29 cyber, 8 admt), `rubric_generic_boilerplate` (27 cyber, 10 admt), `rubric_unsupported_business_claim` (partial — the "narration" half; the "invention" half needs L1+L4), `e5_bare_advisory_close`. Does **not** close citation-family findings — those need L1. Estimated residual after S5 alone: cyber ~ +2, admt ~ +1 on grader mean; needs L1+L2 to reach 98.

- **Effort:** already scoped in S5 backlog. Confirm S5 ships **after** L1 registries land so the typed slots can reference registry keys.

### L4 — Intake Features From Finding Data (R-12 accelerated)
Mine `quality_findings` (waves 1–7) for every finding whose evidence names an intake-implicating silence. From current top failures, the discrete intake fields we already have signal for:

- **admt AdPicker "contextual vs targeted" disambiguation** → enum: `contextual_only | behavioral | mixed | unknown` (drives § 7001(e) branch).
- **admt population counts** → integer with `unknown` sentinel (drives blanket-range gate `h7`).
- **admt cessation-process** → structured `{ has_process: bool, sla_days?: int, evidence_url?: str }` (drives `e6_counsel_referral` when null).
- **risk role identification** → repeatable `{ role_name, controller_or_processor, contact }` (kills invented-role class).
- **cyber in-scope frameworks** → multi-select w/ `none` (drives HIPAA/NIST/HITRUST operative-vs-comparative flag in registry).
- **risk SPI/50% prong evidence** → typed toggles (drives `qc_r1_2`, `qc_r1_3`).

Each intake change carries the **standing same-turn contract-update + fixture + golden + form-parity rule** — enumerated per field so the courier lands atomically.

- **Effort:** 1 day per field family (contract + form + golden + fixtures + registry predicate wiring) — ≈ 6 dev-days total.
- **Consumes:** `quality_findings.evidence` text; existing `_shared/intake-contracts/*`.

### L5 — Findings-to-Backlog Pipeline (repeatable classifier)
A durable surface so every wave feeds product, not just prompts.

**Schema (new table, minimal):**
```text
public.quality_finding_backlog
  id                uuid pk
  finding_check_id  text        -- e.g. rubric_citation_misapplied
  tool              text
  first_seen_wave   int
  last_seen_wave    int
  occurrence_count  int
  class             text        -- 'prompt' | 'feature' | 'intake' | 'measurement_noise'
  proposed_lever    text        -- 'L1' | 'L2' | 'L3' | 'L4' | 'prompt' | 'variance'
  registry_key      text null   -- when class='feature' via L1
  intake_field      text null   -- when class='intake'
  status            text        -- 'open' | 'in_progress' | 'shipped' | 'accepted_variance'
  notes             text
  created_at, updated_at
```
Plus one nightly job `classify-quality-findings` (edge function) that:
1. Reads new `quality_findings` since last run.
2. Applies a rules table (`check_id` → default class + proposed_lever) — starter mapping derived from the W5–W7 data above.
3. Upserts backlog rows, updates counts.
4. Emits an admin view row for the existing `/admin/quality-batch` page.

- **Effort:** 1 day (table + rules table + edge function + view row).
- **Data consumed:** `quality_findings`; classification rules stored in code so they're change-controlled.

## Variance hardening (integrity — never rubric loosening)
To move ±6 grader variance to ±2 without touching the rubric:
- Raise pooled doc count above the currently-observed gate ("pooled docs 9 < 15"): make **N_docs ≥ 15** and **replicates ≥ 3** the campaign default for CPPA tools.
- Record grader model + prompt hash on each `quality_findings` row (already in `run_id`); require **same-hash comparisons** for wave-over-wave deltas.
- Do this in the campaign config, not the rubric.

## Recommended sequencing (post wave-8 ACK, no work this turn)

1. **L5 first (1 day)** — turns every subsequent wave into product signal; costs nothing to ship.
2. **L1 admt registry (2 days) → wire (1 day) → S5 admt slot (queued)** — attacks the biggest failure cluster first.
3. **L2 pre-emit gate for admt (1.5 days)** on top of L1 — converts h/e/qc checks into product behavior.
4. **Repeat L1 + L2 for risk, then cyber.**
5. **L4 intake fields** land in parallel per tool as L1 registries expose their intake predicates (same-turn contract+form+golden+fixtures).
6. Variance-hardening campaign-config change before the first attribution wave for each tool.

**Total ≈ 18–20 dev-days** to move all three CPPA tools onto registry-injection + pre-emit-gate architecture with intake support and a backlog pipeline.

## Non-goals / constraints honored
- No edits to `cppa-admt` / `cppa-risk` / `cppa-cyber` this turn.
- No batch launches, no `active=true` flips.
- No rubric changes; variance is closed by more pooled docs and same-hash comparisons only.
- W6 fix modules stay as the deterministic repair library for L2 — they are not deleted.

## Open questions for the CEO before build
1. Confirm the registry-injection pattern for CPPA should mirror biometric's `verbatim_quote + verified_on + primary_source_url` row shape (recommended) rather than a new schema.
2. Confirm L5 backlog table lives in `public` with admin-only RLS (mirrors `quality_batch2_reviews`), surfaced on `/admin/quality-batch`.
3. Confirm campaign variance defaults (N_docs=15, replicates=3) may be raised for CPPA tools before the next attribution wave.
