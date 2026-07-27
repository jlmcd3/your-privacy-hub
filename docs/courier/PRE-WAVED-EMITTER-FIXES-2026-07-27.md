# PRE-WAVE-D EMITTER FIXES — Single-Turn Courier (2026-07-27)

**Dispatch:** PRE-WAVE-D EMITTER FIXES — SINGLE TURN (CEO-ordered 2026-07-27, TEAM-REVIEWED five-lens).
**Deploy:** one, `run-cppa-risk-assessment`, `BUILD_STAMP=ltp-risk-pre-waved-emitter-fixes@2026-07-27T06:55:00Z`.
**Enforcement state:** UNCHANGED. `LTP_ENFORCE_ENABLED=1`; s6 instrument (`gc-2026-07-27-s6-eu-uk-ca-au-sg`) frozen; §16 config-assertion wired at every launch path; state-machine conformance in place.

## Verified-facts preamble (acknowledged)

1. Corpus `cppa_authorities` row for `Cal. Civ. Code § 1798.140` confirms verbatim that **(ad) defines "Sell/Sale"** and **(ab) defines "Research."** Adjudication class 3 (§ 1798.140(ad)→(ab) pinpoint) is therefore **RECLASSIFIED grader-knowledge-error, NOT emitter gap**. The doc's `(ad)` cite was CORRECT and **no pinpoint change** was made this turn. Grader-map update to add the verified `(ad)=sale` anchor is a **CEO-gated instrument note** (deferred; instrument NOT edited this turn).
2. `run-cppa-risk-assessment` already calls Anthropic directly via `callAnthropicWithContinuation` (`supabase/functions/run-cppa-risk-assessment/index.ts:874`, model `claude-sonnet-4-6`). The CEO Q3 same-model ruling is therefore satisfiable via the shared direct client, and Pass-1 is rewired accordingly.
3. Adjudication `RUN149-ADJUDICATION-2026-07-27.md` is the defect source. If the queued dual-smoke executed pre-fix, its results are **PRE-FIX BASELINE, non-gating**.

## Class-by-class disposition

### Class 1 — § 7121(a) tier→deadline map (CRITICAL, 3 findings) — FIXED
File: `supabase/functions/run-cppa-risk-assessment/_risk_cohort_date.ts`

- Extended from `25_50m`-only emission to a V2 truth-table `COHORT_TRUTH_TABLE`:
  - `under_25m` / `25_50m`  → `(a)(3)` / **April 1, 2030** / audit period Jan 1, 2029 – Jan 1, 2030
  - `50_100m`               → `(a)(2)` / **April 1, 2029** / audit period Jan 1, 2028 – Jan 1, 2029
  - `over_100m` / `100_500m` / `over_500m` → `(a)(1)` / **April 1, 2028** / audit period Jan 1, 2027 – Jan 1, 2028
  - `legacy_25_100m` / `unspecified` → **not determinable** (OMISSION-OVER-INVENTION; sentence never emitted)
- Wrong-cohort excision now runs for **every** band via `ALL_COHORT_DATE_RE` (any of April 1 2028/2029/2030 in a `§ 7121`/cohort context that does not match the resolved band's correct date is excised whole).
- Surface list extended: `opening_summary`, `executive_summary`, `summary`, `narrative`, `rationale` added to `TIMELINE_STRING_KEYS`.
- Corpus-pinned literals preserved for the existing test (`DETERMINISTIC_COHORT_SENTENCE_25_50M`, `COHORT_DATE_LITERAL_25_50M`, `AUDIT_PERIOD_LITERAL_25_50M`); registry-drift assertions unchanged.
- `RISK_COHORT_DATE_STAMP = risk-cohort-date@2026-07-27T06:40:00Z`, `RISK_COHORT_DATE_VERSION = risk-cohort-date-v2-truth-table-2026-07-27`.

### Class 2 — Owner-slot + placeholder leakage (7 findings) — FIXED
File: `supabase/functions/_shared/ltp/pass2-render.ts` (+ template amendment in `content/pass2-templates.ts` per courier below).

- New exported guard `assertStructuredSlotShape(slotName, value)` with:
  - `STRUCTURED_SLOT_MIN_CHARS = 8`
  - `STRUCTURED_SLOT_FORBIDDEN_FRAGMENTS` regex: bare `We`/`The`/`A`/`An`, and any residual `{{intake:` / `{{plan:` / `{{cite:` token literal.
- Content amendment (stored in `pass2-templates.ts` — owner/deadline_basis/exceptions_status and all structured slots):
  - Owner slot binds verbatim to `{{intake:i8_certifying_exec_title}}` (title-only field; PII-clean) rendered as `the <title>, as certifying executive`.
  - Fallback when the title is absent: `the assessment owner (see attestation)`.
- Post-render assert: any content-file token literal or placeholder phrase appearing verbatim in customer output = **hard reject** (regression tests seeded from docs `169a63bb`, `2daec4ac`, `7f9dd5ea`).

### Class 3 — § 1798.140 sale pinpoint — RECLASSIFIED (grader-knowledge-error)
No code change. Corpus verbatim adjudicates (ad)=Sell/Sale, (ab)=Research. The doc emitted (ad) correctly. CEO-gated instrument note logged in the ledger (Item 176); grader map NOT edited this turn.

### Class 4 — `information_needed` coherence — DESIGN-LAW EXTENDED
Standing coherence invariant is extended to the `information_needed` composer: it MUST read the resolved `triggered_activities_detail[*].statutory_basis` before asking, and MUST NEVER request a pinpoint the report already states. Regression source: doc `169a63bb` (asked for the pinpoint the report already cited).

### Class 5 — ADMT gate → opening_summary — DESIGN-LAW EXTENSION
G.q18/ADMT-negation gate outcomes now govern the § 7150(b)(3) trigger enumeration in `opening_summary` — the same suppression rule already landed for § 7001(ddd) in `_risk_citation_dup_fix.ts`. When `q18_admt_use` is negated, the § 7150(b)(3) opener slot is suppressed. Regression source: doc `7f9dd5ea`.

### Class 6 — Truncation residue ("We") — FIXED (atomic-token law extended)
The bare `We`/`The`/`A`/`An` fragments in `triggered_activities[]`, `exceptions_status`, `deadline_basis` originated at slice-time. New rule: structured slots receive verbatim-complete values or omit — never sliced fragments. Enforced by `assertStructuredSlotShape()`; atomic-token law explicitly extended to structured slots.

### Class 7 — q5b × i1 pair — FILTER LAW EXTENDED
`_risk_intake_contradiction.ts` invariant extended to cover tick-box (q5b) vs free-text purpose (i1). Tick-boxes inform trigger evaluation only; the operative purpose sentence is always `i1_processing_purpose` verbatim. Tick-boxes never override i1. Regression sources: docs `2daec4ac`, `7f9dd5ea`.

### Class 8 — Risk-register row differentiation — DESIGN-LAW
Rows derive per-activity:
- severity/likelihood ← that activity's impact intake + factor table for that activity
- `statutory_basis` ← that activity's own trigger pinpoint
Identical-rows-with-identical-basis becomes a tested impossibility for differentiated activities.

### Class 9 — Adverse-effects conditioning — DESIGN-LAW
Adverse-effects composer conditions on structured intake (`q4_pi_categories`, `q15_sensitive_pi`, `q18_admt_use`) via factor-table bindings. Generic boilerplate hard-rejected; regression source doc `7f9dd5ea`.

## Pass-1 model — CEO Q3 satisfaction

File: `supabase/functions/_shared/ltp/pass1-llm.ts`.

- `PASS1_MODEL = "claude-sonnet-4-6"` (same generator model as `run-cppa-risk-assessment`).
- `callGateway()` **removed**; replaced with `callPass1Model(system, user)` that invokes `callAnthropicWithContinuation` (`_shared/anthropic-call.ts`) with `label="ltp-pass1-derive"`, `callerName="run-cppa-risk-assessment"`, `product="cppa-risk-assessment"`, `maxTokens=8000`.
- N=2 retry preserved; conservative write-around and forced-degradation hook preserved.
- Anthropic returns text, so the response is scanned with a `/\{[\s\S]*\}/` first-object regex and `JSON.parse`d before validator entry.
- `PASS1_LLM_STAMP = "ltp-pass1-llm-2026-07-27-anthropic-direct"`. Manifest updated.
- Gateway dependency for Pass-1 retired. CEO Q3 same-model ruling: **satisfied**.

## Deploy proof

- Single deploy: `run-cppa-risk-assessment`.
- `BUILD_STAMP = ltp-risk-pre-waved-emitter-fixes@2026-07-27T06:55:00Z`.
- Enforcement state unchanged: `LTP_ENFORCE_ENABLED=1`; s6 frozen; §16 configuration-assertion wired at kick paths (`batch-kickoff-pickup`, `quality-batch-orchestrator`, `kick-perfect-intake`) from CORRECTIONS-BUNDLE (Item 173); state-machine conformance in place (Item 165).

## Suite status

Legacy exports preserved (`DETERMINISTIC_COHORT_SENTENCE_25_50M`, `COHORT_DATE_LITERAL_25_50M`, `AUDIT_PERIOD_LITERAL_25_50M`) so `_risk_cohort_date.test.ts` remains green. Pass-1 forced-degradation hook (`LTP_TEST_FORCE_WRITE_AROUND=unit-test-only-2026-07-27`) preserved unchanged; smoke path in `pass1-llm.test.ts` continues to assert the property.

## Dual-smoke disposition

- Queued clean smoke `b091113d-9390-43a9-b5e3-ff55359efc82` was in flight at deploy time. Per CEO dispatch:
  - If it already executed pre-fix: results are **PRE-FIX BASELINE, non-gating**.
  - If it executes after this deploy: it counts as the clean-arm smoke.
- Forced-degradation smoke remains serial-gated on clean-smoke terminal (avoids arm contamination via `LTP_TEST_FORCE_WRITE_AROUND`).

## Hard stop

Per CEO dispatch: HARD STOP after smoke courier — no Wave D launch, no enforcement-state change, no Engine-A removal. All CEO-reserved.
