# ITEM 258 — Full-Contract Ledger (SPEC §2) + Grounded-Note Mass-Replace Abort (SPEC §6)

Date: 2026-07-29
Track: TRACK 2 / Stage B(2) SPEC-CONFORMANCE
Team-unanimous under the CEO gating-issue delegation.
Scope: two `_shared/ltp/` modules + one test file + this courier + ledger + EXPLICIT redeploy of ONLY `replay-cppa-risk-harness`.
`run-cppa-risk-assessment`, `supabase/_rebuild-snapshot-item244/`, the coherence screen, composers, and templates are UNTOUCHED. No harness invocation — controller reruns personally.

---

## 1. Evidence (controller-verified from ramp-1 attempt 3, job `a5c209d1`)

- Pass-1 attempt 1 succeeded (~99 s, no continuation, `validator_issues=0`).
- Presence: 8/16 = **0.5** — IN mined presence band; 8/8 present rows carried refs (Item-246 + Item-257 wiring working as ratified).
- Golden-shape shortfalls collapsed to 2 (`risk_assessment_by_activity`, `next_steps`), well below the Item-257 baseline of 3.
- Grounded-note screen replaced **8/8 factor notes** (`replacement_rate=1.0`, `over_threshold=true` vs the informational `tuning_threshold_rate=0.25`) with the canonical `the intake records "…" for stated processing purpose` boilerplate.
- The model's ORIGINAL notes (preserved only via `pass1_grounded_note.details[].original_note` telemetry) named real intake verbatims:
  - `i6_vendors` — "Experian, Equifax, Plaid, Acxiom, LexisNexis"
  - `i5_admt_human_review` — "78% of declines fully automated"
  - `i5_admt_fairness_testing` — "no disparate-impact analysis since v3 retraining January 2024"
  - `impact_intake.harmTypes` — "Unlawful discrimination"
- Every one of those verbatims was flagged ungrounded ONLY because `LEDGER_KEYS` carried ~16 of the contract's ~50 fields, so those fields' verbatims were absent from the allowed vocabulary.

Two SPEC deviations were operating simultaneously:

1. **SPEC §2 deviation** (Issue-4 fossil): `LEDGER_KEYS` was a hand-typed subset naming five shadow-era fossils (`sell_share`, `sensitive_pi`, `processing_purposes`, `safeguards_summary`, `retention_period`) that are not contract keys, and OMITTING the majority of the real contract keys the model was authoring against.
2. **SPEC §6 deviation**: `applyGroundedNoteScreen` at a 100 % replacement rate silently mass-rewrote customer-facing prose instead of failing loud — the run-#180 destroyer class. Originals survived only via telemetry.

## 2. Spec authorities (verbatim, controller-supplied)

- SPEC §2 — `intake_ledger` is "(verbatim, from the full contract key list)". The narrow `LEDGER_KEYS` list is a spec deviation.
- SPEC §4 — "PII verbatim only in attestation/metadata with post-render email/phone reject." Ledger verbatims feed the grounded-note ALLOWED vocabulary and would render inline in customer-facing `weight_notes`.
- SPEC §6 — "mass-action guards (rewrite/replacement rates) carry enforcing thresholds that ABORT on malfunction-scale firing." The grounded screen firing at 1.0 must ABORT, never mass-rewrite.

## 3. PII CARVE-OUT (four-lens, privacy leads)

SPEC §2's "full contract key list" language is qualified by SPEC §4's PII law. Ledger verbatims feed the grounded-note ALLOWED vocabulary; including name/email/phone in that vocabulary would license PII tokens into customer-facing `weight_notes`, defeating §4's post-render email/phone reject.

- **EXCLUDED** from the ledger (three keys): `i8_certifying_exec_name`, `i8_contact_email`, `i8_contact_phone`.
- **RETAINED**: `i8_certifying_exec_title` (a role title; PII-law-permitted).

Excluding these three fields is a non-material deviation from SPEC §2's literal text in service of SPEC §4's explicit law. Privacy lens leads; CS/prompt/prose lenses concur. The post-render PII reject at assembler exit remains in force as backstop; the carve-out is a defense-in-depth complement, not a substitute.

## 4. Fixes

### FIX 1 — `_shared/ltp/derive.ts`: full-contract ledger

`LEDGER_KEYS` is now derived from the intake contract source of truth:

```ts
import { cppaRiskContract } from "../intake-contracts/cppa-risk-assessment.ts";

const PII_EXCLUDED_LEDGER_KEYS = new Set([
  "i8_certifying_exec_name",
  "i8_contact_email",
  "i8_contact_phone",
]);

const LEDGER_KEYS: readonly string[] = cppaRiskContract.fields
  .map((f) => f.key)
  .filter((k) => !k.includes("."))                 // dotted leaves → parent structured key carries the verbatim
  .filter((k) => !PII_EXCLUDED_LEDGER_KEYS.has(k)); // PII carve-out
```

Exclusions applied:
1. **Dotted-leaf keys** (contain "."): the parent structured key (e.g. `impact_intake`) carries the verbatim payload; the leaves (`impact_intake.harmTypes`, etc.) are enum-parity anchors only.
2. **PII carve-out**: the three keys above.

Consequence: the five shadow-era fossils (`sell_share`, `sensitive_pi`, `processing_purposes`, `safeguards_summary`, `retention_period`) disappear naturally — they are not contract keys. This **closes the code half of Build-Issues Issue 4**.

`displayLabelForField` (in `grounded-note.ts` L87–89) already handles unknown fields via `humanizeFieldKey` fallback (underscores → spaces + title-case). All newly-ledgered fields either have an explicit entry in `INTAKE_FIELD_DISPLAY_LABELS` (L60–80) or a sane humanized fallback (no registry-id-shaped labels leak).

### FIX 2 — `_shared/ltp/grounded-note.ts`: mass-replace abort

Added:

```ts
export const GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD = 0.5;

export class GroundedNoteMassReplaceAbort extends Error {
  readonly code = "grounded_note_mass_replace_abort";
  readonly replacement_rate: number;
  readonly telemetry: GroundedNoteTelemetry;
  constructor(t: GroundedNoteTelemetry) {
    super(`[grounded-note] mass-replace replacement_rate=${t.replacement_rate.toFixed(3)} exceeds ${GROUNDED_NOTE_MASS_REPLACE_ABORT_THRESHOLD}`);
    …
    this.name = "GroundedNoteMassReplaceAbort";
  }
}
```

`applyGroundedNoteScreen` now throws `GroundedNoteMassReplaceAbort` when `replacement_rate > 0.5`. The existing 0.25 `TUNING_THRESHOLD_RATE` / `over_threshold` telemetry is UNCHANGED (informational lexicon-width flag; CEO reviews the data).

Rationale per SPEC §6: malfunction-scale replacement must fail loud, never mass-rewrite. With the Item-258 full-contract ledger, legitimate rates should be near zero; 0.5 only fires on malfunction. Mirrors `MassAbsenceRewriteAbort` in `pass1-present-note-coherence.ts` (same class of enforcing threshold).

Observe-first note: this is the spec-mandated mass-action ABORT threshold class, not a new content guard. Empirical basis: this run's 1.0-rate malfunction plus the run-#180 incident.

### FIX 3 — `_shared/ltp/pass1-llm.ts`: catch wiring (verification only)

Existing `catch` in `runPass1Llm` (L426–436) already covers this throw: `isAbort()` matches on `AnthropicTimeoutError`, `DOMException(AbortError|TimeoutError)`, or `/abort|timeout|generation_timeout/i` in the message. `GroundedNoteMassReplaceAbort`'s message is `[grounded-note] mass-replace replacement_rate=…` (no match), so the abort surfaces as attempt outcome `error` with the error string preserved — identical to how `MassAbsenceRewriteAbort` (from the coherence screen at L378) surfaces today. NO additional wiring required.

`PASS1_LLM_STAMP` bumped to `ltp-pass1-llm-item258-full-ledger-grounded-abort@2026-07-29`.

## 5. Tests

`_shared/ltp/pass1-injection.test.ts`:
- `BASE_INTAKE` rebuilt on contract-real field names; fossils removed.
- (a)–(d) preserved.
- (e) NEW — `pickLedger` over `BASE_INTAKE` ledgers every populated non-dotted, non-PII-excluded contract field; PII-excluded fields absent; dotted leaves absent; shadow-era fossils absent from `LEDGER_KEYS`.
- (f) NEW — `applyGroundedNoteScreen` throws `GroundedNoteMassReplaceAbort` when 4/4 rows are ungrounded (rate 1.0); does NOT throw when only 2/4 are ungrounded (rate 0.5, NOT > 0.5).

### 5.1 Full verbatim outputs

`pass1-injection.test.ts` + `replay.test.ts` + `grader-check-mirror.test.ts`:

```
running 8 tests from ./_shared/ltp/replay/replay.test.ts
harness has teeth: deterministic-provider run on real intake yields non-empty golden-shape hard failures ... ok (52ms)
presence_rate on deterministic path is 0 (pickFactorTable pins present_in_intake:false) ... ok (20ms)
runReplayBatch aggregates per-gate counts + presence-rate distribution correctly over 2 copies ... ok (39ms)
side-by-side compareDoc returns deltas and tolerates a missing legacy key ... ok (16ms)
Item 254: 9/16 present → passes hard floor, sits IN review band, no band flags ... ok (16ms)
Item 254: 0/16 present (collapse class — item243 4-doc footprint) → presence_rate hard failure under default config ... ok (16ms)
Item 254: 5/16 present (0.3125) → passes hard floor, flags review_band_low, no presence hard failure ... ok (12ms)
STATIC ASSERTION — modelProvider was never invoked during Stage A suite ... ok (1ms)
running 6 tests from ./_shared/ltp/pass1-injection.test.ts
(a) valid model refs survive injection with refs intact ... ok (4ms)
(b) invalid ref 'L.not_a_field' is dropped and counted ... ok (0ms)
(c) all-invalid refs → refs=[] with present flag preserved for coherence screen ... ok (0ms)
(d) proposition refs remain adapter-derived regardless of model input ... ok (0ms)
(e) pickLedger over contract-real intake ledgers every populated non-dotted, non-PII-excluded contract field ... ok (0ms)
(f) grounded-note mass-replace ABORTS above threshold and does NOT abort at/below threshold ... ok (8ms)
running 10 tests from ./_shared/ltp/grader-check-mirror.test.ts
CHECK 1a (qc_r1_1): registry carries the signed resolution_source_fields state ... ok (0ms)
CHECK 1b (qc_r1_1): composer skips purpose-adequacy ask when i1_processing_purpose is populated; still asks otherwise ... ok (2ms)
CHECK 2 (qc_r1_2): resolved M4 (SPI volume qualifying) → submission_summary cites § 7120(b)(2)(B) ... ok (37ms)
CHECK 2 (qc_r1_2): resolved M4 (SPI volume below threshold) → submission_summary cites § 7120(b)(2)(B) ... ok (23ms)
CHECK 2 (qc_r1_2): M4 not_applicable (q15_sensitive_pi=No) → submission_summary still cites § 7120(b)(2)(B) ... ok (5ms)
CHECK 3 (qc_r1_3): resolved M5 met (q5c=Yes) → submission_summary cites § 7120(b)(1) ... ok (10ms)
CHECK 3 (qc_r1_3): resolved M5 not_met (q5c=No) → submission_summary cites § 7120(b)(1) ... ok (9ms)
CHECK 4 (qc_r1_4): resolved revenue band → full § 7121(a) schedule in submission_summary ... ok (17ms)
CHECK 4 (qc_r1_4): absent revenue band → indeterminate two-cohort treatment subsumed by full schedule ... ok (16ms)
CHECK 4 (qc_r1_4): shipped schedule never computes a customer-specific cohort ... ok (12ms)

ok | 24 passed | 0 failed (799ms)
```

CHECK 1b behavior is preserved (i1_processing_purpose was already ledgered pre-Item-258; the expansion does not change its treatment).

### 5.2 Regression: `e2e-document.test.ts` + `surface-ownership.test.ts`

```
running 11 tests from ./_shared/ltp/e2e-document.test.ts
LAW 2 (i): every emitted section carries real, residue-free content ... ok (55ms)
LAW 2 (ii): every omitted section carries a classified omit reason ... ok (26ms)
LAW 2 (iii): every shipped top-level key ∈ shard registry AND ∈ report schema ... ok (20ms)
LAW 2 (iv): zero blank-slot patterns anywhere on the shipped surface ... ok (36ms)
LAW 2: structural completeness — assembler reports no nonconformant keys ... ok (15ms)
ITEM 236 / LAW 2 TIGHTENED: no always-section may omit for ANY reason ... ok (17ms)
ITEM 236 fix (b): balance-template selection routes through chooseVariant (never firm at closeness ≥ threshold) ... ok (0ms)
ITEM 236 fix (b): chooseVariant contract — closeness ≥ 0.6 → hedged ... ok (0ms)
ITEM 236 fix (c): boilerplate always-sections are emitted with real content ... ok (10ms)
ITEM 236 fix (d): exec-summary activity_label never carries a raw intake answer prefix ... ok (0ms)
ITEM 237 fix (b): assembler emits hedged (NEVER firm) for assessment_summary + risk_assessment_by_activity at closeness ≥ threshold ... ok (9ms)
running 4 tests from ./_shared/ltp/surface-ownership.test.ts
LAW 3 (a): assembler source declares exactly ONE report[<key>] write site ... ok (3ms)
LAW 3 (b): every shard.key is present in report schema top-level allow-list ... ok (0ms)
LAW 3 (c): no shard.key is a top-level CUT ruling path ... ok (0ms)
LAW 3 (d): assembler never ships a top-level key that matches a CUT ruling path ... ok (39ms)

ok | 15 passed | 0 failed (533ms)
```

No behavioral drift observed. The ledger-size expansion reaches `pickIntakeDisplay` and related composer paths without changing any asserted output shape.

## 6. Four-lens record

- **Computer-science.** Ledger derivation now has ONE source of truth (the intake contract) with two clearly-named exclusion rules. The grounded-note screen now enforces its mass-action guard the same way the coherence screen already does — same abort-class pattern, same catch site, no new failure modes.
- **Privacy-law.** PII carve-out is explicit and named at the derivation site; documented four-lens. The post-render PII reject at assembler exit remains authoritative; this carve-out is defense-in-depth. No customer surface touched.
- **Prompt-engineering.** No prompt change this turn. Rule 9 (grounded-note law) in the prompt already tells the model that violating notes are DETERMINISTICALLY REPLACED; the added abort simply enforces the spec's own mass-action guard when the wire itself misfires.
- **Prose.** No prose authored. The Rule-4 exemplar authored for Item 257 remains the only in-flight prose contribution.

## 7. Deploy

EXPLICIT redeploy of ONLY `replay-cppa-risk-harness` — confirmed by platform: `Successfully deployed edge functions: replay-cppa-risk-harness` (2026-07-29T15:58Z). `HARNESS_BUILD_STAMP` bumped to `replay-cppa-risk-harness-2026-07-29-item258` so the fresh bundle is observable in results rows.

The legacy customer wire `run-cppa-risk-assessment` imports `pass1-llm.ts`/`derive.ts`/`grounded-note.ts` at its Item-217-restore deployed bundle and is NOT redeployed — this Item-258 edit does not reach the live customer path.

## 8. Live-call declaration

No harness invocation. No Pass-1 model call. No DB writes. No grader edits. Controller reruns personally.
