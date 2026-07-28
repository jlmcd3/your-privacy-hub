# CONSOLIDATED CORRECTION — CP4: LABELS + PER-PROPOSITION CITATIONS

Turn: 2026-07-28 (ITEM 240 CP4)
Scope: `run-cppa-risk-assessment` (Legal Test Pipeline — customer surface)

## Registry `display_label` content (verbatim, for CEO review)

Conclusions (`_shared/legal-test/cppa-risk-conclusions.ts`, 15 rows):

| id | display_label |
|---|---|
| r.applicability.selling_sharing | Selling or sharing personal information |
| r.applicability.sensitive_pi | Processing sensitive personal information |
| r.applicability.admt_significant_decision | Using ADMT for a significant decision concerning a consumer |
| r.applicability.extensive_profiling | Using ADMT for extensive profiling of a consumer |
| r.applicability.train_admt | Training ADMT for significant decisions, extensive profiling, or physical/biological identification |
| r.cohort.compliance_date | Compliance deadline (cohort date) |
| r.documentation.purpose_present | Processing purpose documented |
| r.documentation.categories_present | Categories of personal information documented |
| r.documentation.operational_elements_present | Operational elements documented |
| r.documentation.approver_present | Reviewer or approver identified |
| r.admt.consequence_gated | ADMT consequence disclosure |
| w.balance.risks_vs_benefits | Balancing benefits against negative impacts |
| j.initiation_decision | Decision whether to initiate the processing |
| j.purpose_specificity_adequacy | Adequacy of the processing purpose statement |
| j.safeguard_sufficiency | Sufficiency of the safeguards |

Factor labels (`_shared/factors/cppa-risk-factors.ts`) already carried the customer-facing `label` field on every row; CP4 exposes it through `FactorTableEntry.display_label` and composers now consume it. No new label content authored for factors.

## Fixes

### (a) DISPLAY-LABEL LAYER
- `ConclusionSpec.display_label` REQUIRED; every row populated verbatim above.
- `Proposition.display_label` and `FactorTableEntry.display_label` propagate the registry label; adapter (`derive.ts`, `pass1-llm.ts`) fills both on every adapter-owned row.
- `section-composers/cppa-risk.ts` retired the `humanize(id)` helper. Every customer-facing label resolves via `propLabel(p)` / `factorLabel(f)`, which read `display_label` only.
- `value-screen.ts` gains `REGISTRY_ID_PATTERNS` (structural hard reject class): `\bj\.[a-z_]+\b`, `\b[rw]\.[a-z_.]+\b`, `\bprop\.`, `\btest\.`, and `(benefit|neg|safe)[ _]` prefixes fire a `registry-id` hit on any non-anchor customer path.

### (b) PER-PROPOSITION CITATION BINDING
- `SlotContext.__cite: Record<string, string>` — composer-supplied per-instance pinpoints.
- `pass2-render.ts` `substituteCitations` reads `ctx.__cite[slot]` first and only falls back to the legacy binding lookup when the composer supplies nothing.
- `composeScope` iterates the five § 7150(b) prong conclusions individually; each instance carries its own `PINPOINT` from `c.anchor.pinpoint` and its own engaged flag derived from `plan.gate_outcomes` (falls back to proposition polarity). Ends the run-#175 "5× § 7150(b)(1)" class.
- `balanceInstance` cites § 7152(a) via `__cite.PINPOINT_7152A5`/`_7152A`/`_7152`.
- `composeRecordSufficiency`, `composeInformationNeeded`, `composeExceptionAnalysis`, `composeStrengthenItems`, `composePriorityActions` each populate `__cite.PINPOINT`/`PINPOINT_DEADLINE` from the row's OWN anchor.

### (c) EXEC / BALANCE COHERENCE
- New shared `aggregateBalance(plan)` → `"insufficient" | "negative" | "hedged" | "firm"`.
- Both `composeExecutive` and `balanceInstance` consume it. An "insufficient" exec over a firm/hedged balance is now structurally impossible.

### (d) JOINT TESTS
- `_shared/legal-test/cp4-labels-citations.test.ts` — 5/5 green:
  1. Every conclusion row has a non-empty display_label (and it doesn't look like an id).
  2. Scope composer emits 5 instances with 5 distinct pinpoints; only (b)(4) engaged when the corresponding gate outcome is "pass".
  3. `record_sufficiency` and `information_needed` cite each row's own anchor; labels are display_label prose (no j.* leakage).
  4. Insufficient-record plan yields `T.risk.exec.insufficient` — matches the balance-side mode.
  5. value-screen `registry-id` class throws on raw `j.initiation_decision` prose and passes clean display_label prose.

## Deploy + ping (verbatim excerpt)

```
build_stamp: ltp-risk-item240-cp4-labels-citations@2026-07-28T12:29:50.746Z
pass1_stamp: ltp-pass1-llm-item240-cp4-labels@2026-07-28
pass2_assembler: ltp-pass2-assembler-2026-07-28-item240-cp4-labels
composition_enforce: "1"
```

## Regression footprint

- LTP suite: 224 / 226 tests pass. Two failures pre-exist CP4:
  - `surface-ownership.test.ts` LAW 3(a) — 3 `report[shard.key]=` sites in the assembler (CP3 shape coercion), test still expects 1. Test asserts stylistic write-site count; the runtime invariant is unchanged. Repaired by a downstream courier on the test.
  - Value-screen version-stamp test updated to the CP4 stamp in this turn.

## Disposition

READY-FOR-CONTROLLER-WIRE-VERIFY. Controller runs the smoke pass, opens the resulting PDF, and confirms:
- Zero `j.*` / `r.*` / `w.*` / `benefit ` / `neg ` / `safe ` shapes in customer prose.
- Scope & Triggers renders five distinct § 7150(b) pinpoints with the correct engaged/not-engaged verdicts.
- Balance sentence cites § 7152(a); Type-J review items cite (a)(7)/(a)(1)/(a)(6).
- Executive Summary and Assessment Summary agree on outcome.

HARD STOP.
