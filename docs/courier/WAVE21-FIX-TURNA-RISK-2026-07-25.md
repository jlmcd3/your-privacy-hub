# WAVE21-FIX TURN A (cppa-risk) — Courier Report

**Stamp:** 2026-07-25T11:50:05Z
**Dispatch:** `WAVE21-FIX-TURNA-RISK` — deploy turn on `run-cppa-risk-assessment`.
**Build stamp:** `w21-risk-turna@2026-07-25T11:47:35Z`
**Scope confinement:** `supabase/functions/run-cppa-risk-assessment/_w21_risk_turna.ts` (new), `supabase/functions/run-cppa-risk-assessment/index.ts` (scanner + wiring), `supabase/functions/_tests/w21-risk-turna.test.ts` (new), `docs/pipeline-state.md` (item 48 + Last-updated restamp), this courier. No rubric/grader/golden/registry/fixture/contract/sample edits.

---

## 1. Source findings (wave-21, quality-run `3549f347`, ours 79.35)

Per `docs/courier/WAVE21-DIGEST-2026-07-25.md` §5, risk is the weakest CPPA tool at 79.35 (≈flat at campaign floor). Fact-ledger CLASS RECURS HARD; internal-fragment leaks recur; `information_needed` self-contradiction class recurs; § 7121(a)(3) cohort emission still absent.

## 2. Pre-deploy lock verification

- 11:47Z: `SELECT COUNT(*) FROM cppa_assessments WHERE module='risk_assessment' AND status IN ('pending','processing') AND updated_at > NOW() - INTERVAL '15 minutes'` → **0**.
- 11:47Z: `SELECT status, COUNT(*) FROM quality_batch_runs GROUP BY status` → `complete=62, cancelled=5, failed=1` (0 running/pending).
- Deploy window: **OPEN**.

## 3. Per-item disposition

### A1 — FACT-LEDGER CONTRADICTION ENFORCEMENT — DONE

Upgraded fact-ledger from "missing support" to CONTRADICTION-BLOCKING for anchor-less prose claims.

- New helper `attributeFieldByToken(text, RISK_FIELD_TOKEN_MAP)` maps prose tokens → intake field ids (`sensitive_location_basis`, `q3_sell_share`, `q4_targeted_ads`, `q5b_profiling_observation`, `i5_admt_logic`, `q19_admt_description`, `q18_admt_use`).
- `pickField(o, text)` in `index.ts` now falls back to token attribution when the entry carries no structured field anchor. The existing `checkAssertion` semantics (SKIP on unresolvable field; contradict on asserted-vs-denied) are unchanged — attribution is the only mechanism change.
- Combined effect: wave-21 doc `ccec6376` "systematic observation of workers/students/applicants" would now attribute to `q5b_profiling_observation`, contradict the intake's `Not applicable` value, and be rewritten via `rewriteUnsupported` (LEAK-PREV-P0 catalog phrasing).
- Also scrubs the invented "ADMT-logic/description/opt-out ... record n/a" field-name pattern (wave-21 doc `283f8c11`) via a single-purpose regex `INVENTED_ADMT_FIELDNAMES_RE`.

### A2 — RISK-B1-COHORT-EMITTER — DONE

Wired the § 7121(a)(3) cohort recommendation using verbatim text from approved corpus row `cppa-7121` (docs/pipeline-state.md item 43; OAL-approved, eff. 2026-01-01).

- Verified verbatim at 11:47Z via `SELECT verbatim_excerpt FROM provision_texts WHERE key='cppa-7121' AND status='approved'`. Excerpt embedded verbatim in `CPPA_7121_A3_VERBATIM`.
- Emission gate: (i) report already carries § 7120/§ 7121 context; (ii) intake carries a revenue signal parseable as <$50M for 2028 (`annual_revenue_2028`, `gross_revenue_2028`, `annual_gross_revenue_2028`, `annual_gross_revenue`, `annual_revenue`); (iii) report does not already reference § 7121(a)(3). Idempotent by construction; skip reasons recorded on the counters.
- Emission shape: `{ id, topic: "cybersecurity_audit_deadline", title, action, citation: "11 CCR § 7121(a)(3)", verbatim_quote, proposition_key: "ra_cyber_audit_7121a3", source_fields: ["annual_gross_revenue_2028"], deadline: "2030-04-01", deadline_basis: "11 CCR § 7121(a)(3)" }`.
- No registry weakening; additions only. The verified-authority registry (`risk-verified-authorities.ts`) is untouched — this emission bypasses the registry-first path only for its citation stamp, sourced from the approved corpus row.

### A3 — INTERNAL-FRAGMENT LEAK SCRUB — DONE

Closes wave-21 `rubric_internal_reasoning_leak` ×2:

- `"the trigger review — established on the record"` → `"the record"`.
- `"the cyber-audit tier review"` → `"the cybersecurity audit"`.
- Defensive: `"the <slug> tier review"` → `"the review"`.

Routed through a terminal deterministic prose walker with the standard `ANCHOR_KEYS` skip list (citations / verbatim quotes / structured anchors are never touched). The LEAK-PREV-P2 whitelist serializer covers KEYS, not prose contents; string-level scrub remains the correct tool. Confirmed by test `W21 — anchor keys never scrubbed`.

### A4 — information_needed SELF-CONTRADICTION FILTER — DONE

`filterInformationNeeded(report, ledger)` drops each `information_needed` entry whose `.field` (or `.intake_field_1` / `.source_fields[0]`) is `asserted` / `denied` / `not_applicable` in the intake ledger. Silence-polarity rows are preserved (the ask is legitimate).

Covers wave-21 docs `7f8bc403` and `ccec6376`.

### A5 — TELEMETRY BUILD-STAMP ECHO — DONE

Attached at `_meta.internal.risk_w21a = { stamp: W21_RISK_TURNA_STAMP, ...counters }`. The P2 serializer (`supabase/functions/_shared/report-serialize.ts` lines 140–148 + 179–196) already preserves `_meta.internal` unmodified — no whitelist edit needed. This resolves the item 47 §7 monitoring flag for the risk tool. Admt-side echo remains queued for the next admt fix turn (`_w19/_w20_admt_turna` currently land at TOP-LEVEL underscore keys and are dropped by the whitelist; migration to `_meta.internal` is the admt-turn scope).

## 4. Tests

```
running 10 tests from ./_tests/w21-risk-turna.test.ts
W21 A1 — token map attributes sensitive-location claims ... ok (1ms)
W21 A3 — internal fragments scrubbed from prose ... ok (6ms)
W21 A3 — invented ADMT-fieldname 'record n/a' scrubbed ... ok (0ms)
W21 A2 — cohort row emitted when cyber-audit context + <$50M revenue ... ok (1ms)
W21 A2 — idempotent when § 7121(a)(3) already cited ... ok (0ms)
W21 A2 — no emission without revenue signal ... ok (0ms)
W21 A2 — no emission without cyber-audit context ... ok (0ms)
W21 A4 — info_needed dropped when intake field already resolved ... ok (0ms)
W21 — anchor keys (citation/verbatim) never scrubbed ... ok (0ms)
W21 — stamp is a well-formed build stamp ... ok (0ms)

ok | 10 passed | 0 failed (14ms)
```

## 5. Deploy

- 11:49Z — `supabase--deploy_edge_functions(["run-cppa-risk-assessment"])` → `Successfully deployed edge functions: run-cppa-risk-assessment`.
- Boot-log capture PENDING first invocation (`boot w21_stamp=w21-risk-turna@2026-07-25T11:47:35Z` will appear on cold-boot).

## 6. Guardrails

- No rubric / grader / golden / contract / validator changes.
- No sample-report regeneration.
- No intake-contract changes.
- No registry / corpus edits.
- No changes outside `run-cppa-risk-assessment/`, `_tests/`, `docs/`.
- REPORT-FLOW plain-language review: all customer-visible strings pass through catalog phrasing (LEAK-PREV-P0) for rewrites; the new cohort row uses answer-first plain-language phrasing (no meta-commentary, no raw field ids, no pipeline references).

## 7. Next-step sequencing

Per plan (item 47 §8):
1. Wave-21 **admt** fix turn — register admt build-stamp echo under `_meta.internal`, close fallback-density CRITICAL (`rubric_invented_admt_section` on doc `3746fd24`).
2. Wave-21 **cyber** fix turn — § 7123(c) subsection map, § 7122(g) retention, splice class.
3. **DPIA-REGISTRY-WIRING** deploy turn (after CEO courier review).
