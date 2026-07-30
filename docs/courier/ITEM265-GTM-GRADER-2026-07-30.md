# ITEM 265 — GO-TO-MARKET GRADER (Option 1) — 2026-07-30

**Dispatch:** ITEM 265 — TRACK 2 GRADER REVIEW (CEO-directed 2026-07-30).
**Decision:** OPTION 1 — additive GTM grader. Team-unanimous (four lenses).
**Status:** ACTIVE IN OBSERVE/TELEMETRY ONLY. Register v1 assignments are
DRAFT and **HELD for CEO ratification before any release gating**.

## Governance entries recorded this turn

**(a) Testing-cadence ratification (CEO 2026-07-30):** deterministic,
single-file, non-gating execution of a just-written test deliverable is part
of writing it; testing now ongoing as appropriate (final test phase active).

**(b) Grader-review directive (CEO verbatim):** "have the teams review the
graders and either 1. add a 'go-to-market' grader that identifies known
defects that can or cannot be accepted for product release, or 2. modify the
current graders so that their scores are on whether a product can be
released despite a minor glitch"

## Four-lens evaluation (teams' record, verbatim)

- **CS lens:** Option 2 edits frozen instruments → new grader epoch
  mid-campaign → voids same-epoch baseline comparability (One-Ruler law; the
  s3→s6 drift lost a week of measurement). Option 1 is additive: C/G
  instruments and the 7 deterministic checks stay frozen; GTM consumes
  EXISTING telemetry (PerDocResult hard_failures, review flags, band
  advisories, residue classes, deterministic check outcomes) via a versioned
  deterministic classifier — no new LLM judge, no drift surface. Verdict:
  option 1.
- **Privacy-law lens:** releasability is a materiality judgment about
  customer/legal harm — a different question from quality scoring;
  conflating them (option 2) makes scores unusable for both purposes.
  Materiality criteria must anchor to harm: invented/wrong legal citations,
  misstated law, wrong-polarity conclusions, PII leakage, cross-section
  contradictions, hollow documents, and silently-missing required § 7152(a)
  elements are MATERIAL (block release); register warts, small depth
  shortfalls, advisory band flags are NON-MATERIAL (ship + log). Verdict:
  option 1 with a harm-anchored register.
- **Prompt-engineering lens:** option 2 would require knowledge-map edits
  (CEO-gated, historically the riskiest change class). Option 1 requires
  zero prompt/grader-map changes. Verdict: option 1.
- **Prose lens:** register/wording defects are NM unless they alter legal
  meaning; a defect taxonomy makes that boundary explicit instead of judged
  ad hoc per score. Verdict: option 1.

**UNANIMOUS: option 1.** The frozen quality graders' scores are
CONTEXTUALIZED by the GTM verdict at acceptance, never modified — this
captures option 2's intent without touching the ruler.

## Build

### 1. `supabase/functions/_shared/ltp/replay/gtm-materiality-register.ts`
`GTM_MATERIALITY_REGISTER_VERSION = "gtm-materiality-v1-2026-07-30-DRAFT"`.
Entries: `{ defect_class, materiality, rationale, source }`. Lookup is
longest-prefix over `:`/`_` separators; no match ⇒ `null` (fail-closed).

| defect_class | materiality | source | rationale |
| --- | --- | --- | --- |
| `presence_rate` | material | harness | Hollow-document class: presence below the mined hard floor means the assessment asserts little from the record. |
| `harness_error` | material | harness | No document was produced at all. |
| `label_residue` | material | harness | Unresolved-slot literals misstate the customer's own facts. |
| `note_specificity:no_ledger_ref` | material | harness | PRESENT factor with no intake ledger reference = ungrounded assertion. |
| `note_specificity:fossil_no_record_evidence` | material | harness | Fossil basis on a PRESENT row is a self-contradiction on the legal surface. |
| `note_specificity:missing_weight_note` | material | harness | Conclusion with no stated reasoning. |
| `action_diversity:consecutive_dup` | material | harness | Cloned actions = composition failure; duplicated obligations shipped. |
| `qc_r1*` | material | deterministic_check | Grader-mirrored legal-surface checks (citations, statutory elements, polarity). |
| `pii*` | material | harness | Any PII reject class is a privacy harm. |
| `coherence` | material | harness | Cross-section contradictions misstate the legal position. |
| `contradiction` | material | harness | Direct contradiction between shipped statements. |
| `golden_shape` | non_material | harness | Single-section depth shortfalls are quota/quality flags, not correctness. |
| `review_band_low` / `review_band_high` | non_material | advisory | Advisory presence-band flags; at/above the hard floor. |
| `grounded_note_would_replace` | non_material | advisory | Observe-mode lexicon calibration; no rewrite applied. |
| `deadline_sentence_prose_wart` | non_material | harness | Build-Issues wart; does not alter legal meaning. |
| `legacy_key_missing` | non_material | harness | Side-by-side gap vs archived legacy report; not a shipped-document defect. |

### 2. `supabase/functions/_shared/ltp/replay/gtm-grader.ts`
`evaluateGtm(perDoc, opts?) → { verdict, material_defects, logged_defects,
register_version, unclassified }`. Inputs: `perDoc.hard_failures`, the
`review_band_low/high` advisory metrics, plus `opts.extra_defects` for
deterministic-check ids. Verdict rules: any material **or unclassified** →
`block`; only non-material → `release_with_logged_defects`; none →
`release`.

**FAIL-CLOSED RULE:** any defect class not in the register lands in
`unclassified` AND forces `block`. Unknown defects are material until
classified — the never-guess rule applied to release policy.

### 3. Harness wiring
One insert-site edit in `supabase/functions/replay-cppa-risk-harness/index.ts`:
`per_doc_result` now carries an added `gtm` field
(`gtm: evaluateGtm(outcome.perDoc)`). jsonb column — no schema change.

### 4. Tests — `supabase/functions/_tests/gtm-grader.test.ts` (6/6 green)
clean → release; only `golden_shape:risk_assessment_by_activity` →
`release_with_logged_defects` (today's actual ramp-2 distribution state);
`presence_rate` failure → block; unknown defect → block + unclassified;
advisory band flag → logged; `qc_r1_*` via `extra_defects` → block.

Regression run (verbatim tail): `ok | 60 passed | 0 failed` over replay,
item262, item264, pass1-injection, grader-check-mirror, grounded-note-mode,
e2e-document, surface-ownership, gtm-grader.

## Not changed
C/G grader instruments, knowledge maps, deterministic check definitions,
prompts, screens, composers, legacy wire, `supabase/_rebuild-snapshot-item244/`.
No harness invocation. Redeploy limited to `replay-cppa-risk-harness`.

## Four-lens sign-off
CS ✔ additive classifier, zero drift surface. Privacy ✔ harm-anchored
register, no new data surface (telemetry classes only, no intake values).
Prompt ✔ zero prompt/grader-map edits. Prose ✔ taxonomy makes the
meaning-altering boundary explicit; no customer-facing text authored.
