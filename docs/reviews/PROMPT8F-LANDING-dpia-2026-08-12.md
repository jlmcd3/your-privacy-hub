# PROMPT 8F — DPIA 8E close-out — LANDING REPORT
Date: 2026-08-12. Spine: **UNTOUCHED** (`_shared/prose/plans/dpia.spine.ts` — zero bytes changed; no item required it).

## Per-item diffs

**1. Item-7 DPO disclosure wired (ratified bytes).** `_shared/ltp/dpia-skeleton-assemble.ts`:
- New exported constant `ART36_DPO_DISCLOSURE`, byte-exact to the CEO-ratified sentence.
- `composeArt36Sentence(report)` refactored to compute the typed determination sentence into `base` (all three branches byte-untouched), then append `". " + ART36_DPO_DISCLOSURE` (trailing stop trimmed; the spine slot supplies the final period) ONLY when `art36_consultation.dpo_recommends_consultation === true` AND the determination is not `consultation_required`. Determination logic and text unchanged; nothing is added on the `consultation_required` branch.
- Calibration registry (`_shared/grader/skeleton-calibration.ts`): new id `tmpl_art36_dpo_disclosure`, spans `"The company's data protection officer has advised that the supervisory authority be consulted on this processing"` and `"which is stated above and is unchanged by it"`.
- `so-final-test/dpia-vocabulary-fidelity.test.ts`: byte assertion on the constant, plus rendered-document tests for the positive branch and both negative branches (already-required, no DPO advice).

**2. prompt8a-prose test re-pin (tests only; zero product-code changes).** `tests/edge/run-dpia-framework/prompt8a-prose.test.ts`, six assertions across the three failing tests re-pinned to the ratified 8D bytes:
- `re-scores it against the measures as implemented` → `re-scores it against the mitigating measures once they have been deployed` (occurrence count assertion)
- `proposed until Dr. Anna Meier re-scores it` → `preliminary until Dr. Anna Meier re-scores it against the mitigating measures once they have been deployed`
- `the residual band is low on the same proposed basis` → `the remaining risk level is low on the same preliminary basis`
- `…on this assessment's pre-set taxonomy, an inherent band of high` → `…under this assessment's pre-set risk taxonomy, an initial risk level of high`
- `the residual band is undetermined` → `the remaining risk level is undetermined`
- `proposed until the company re-scores it` → `preliminary until the company re-scores it against the mitigating measures once they have been deployed`
- `The company's answers leave five points open` → `five points are still open`
No other red in `tests/edge/` was touched.

**3. Harness — dpia generator spec (`run-quality-batch/index.ts`).**
- `transfer_flows` is now **structured**: array of objects with exactly `recipient`, `destination_country` (ISO-2), `transfer_mechanism`, `notes`; empty array where no flow exists; the spec instructs roughly half the scenarios to be intra-EEA/intra-UK only and the other half to carry at least one genuine third-country destination, so the item-5 regime trigger is exercised in both directions.
- Sign-off block added: `dpia_prepared_by`, `dpia_approved_by_name`, `dpia_approved_by_title`, `dpia_approval_date` (ISO date), `dpia_signoff_basis`, populated on most scenarios (a minority left blank to keep the no-approver branch covered) so the rescorer slot stops falling back to "the company".
- `source_assessment_id` remains omitted, as recommended.

## Test counts
- `_shared/so-final-test/`: before **136 passed / 0 failed**, after **139 passed / 0 failed** (the three new 8F disclosure tests).
- `tests/edge/`: before **3449 passed / 29 failed**, after **3452 passed / 26 failed**.
- Combined: before **3585 / 29**, after **3591 / 26**.

## Remaining tests/edge red: 26
All pre-existing and untouched by this prompt: stamp/version pins and DB-backed conformance fixtures (item357/item358 class), plus the two live-generation fixtures (`perfect-a073d9c5`, `messy-bd458f0d`). No 8F item authorised editing them.

No batch was run.
