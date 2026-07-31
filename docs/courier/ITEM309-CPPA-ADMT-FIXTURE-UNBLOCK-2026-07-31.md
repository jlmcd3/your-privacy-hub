# ITEM 309 — CLOSE-OUT: cppa-admt FIXTURE UNBLOCK (COURIER)

**Dispatch:** Controller Item 309 (CLOSE-OUT), 2026-07-31.
**Authority:** CEO directive 2026-07-31 (overnight autonomous-continuation instruction).
**Scope executed:** minimum golden-fixture coverage for `cppa-admt` so the tool is measurable again, plus the fixture guard that keeps it that way. **NO other engine changes. NO deploy. NO harness invocation. NO ingestion.**
**Stamp:** 2026-07-31T10:22Z (sandbox clock re-read before writing).

---

## 1. WHAT WAS BLOCKING MEASUREMENT

Item 308 added the Chapter-3 deliverables and extended the intake contract with the published pre-use notice text (`notice_element_text.{purpose, optout, access, antiretaliation, howworks_inputs, howworks_output, altprocess}`) and the § 7221(b) condition evidence (`admt_detail.{appeal_reviewer_role, appeal_trained, appeal_authority_overturn, appeal_step_count, sole_use_attestation, nondiscrimination_testing}`). **No fixture carried any of them.** All four existing `CPPA_ADMT_GOLDEN` cases would therefore have scored the *degraded* path — `record_insufficient` notice elements and `insufficient_record` exception conditions — so a benchmark run would have measured the fallback scaffold rather than the analysis. Item 308's own courier flagged this as the natural next turn; this is that turn.

## 2. WHAT WAS DONE — ONE NEW "PERFECT DATA" CASE

`supabase/functions/_shared/golden/cppa-admt.ts` gains a fifth case, **`admt-hr-perfect-record`** (`set: "tuning"`).

**Why a new case rather than extending a shared base (the Item 306 move).** cppa-risk's fixtures share a `base` object, so extending `base` cleared all three pins at once. cppa-admt has no shared base — its four cases are independent literals covering deliberately different postures (HR, credit, adversarial advertising, conservative service-eligibility). Retrofitting a complete notice record onto the *adversarial* case would destroy the posture it exists to test. A fifth case adds the ANALYSED path without disturbing the four degraded/adversarial paths, which remain valuable coverage.

**Fixture content, authored to the Perfect Data standard:**

| Requirement | How it is met |
| --- | --- |
| Every Item 308 field present | All seven `notice_element_text` elements plus all six `admt_detail` operands. Pinned field-by-field by the guard test. |
| Notice text is *specific*, not generic | Each element names the concrete system (NurseMatch v4), the concrete inputs (licence status, acute-care months, competency-checklist scores, shift availability), the concrete output (rubric band A–D + rank), and the concrete route (URL / phone option / email). **None of the six `GENERIC_TEXT_PATTERNS` in `ltp/admt-deliverables/build.ts` appear** — tripping the § 7220(c)(1) screen would defeat the fixture's purpose, so the guard asserts each pattern against every element. |
| Exception evidence is internally consistent | Claimed exception is § 7221(b)(2) (hiring/admission). Both (b)(2) conditions carry evidence (sole-use attestation; a dated adverse-impact testing record with method, population, and retention reference). The (b)(1) operands are supplied too and **agree with the narrative**: `appeal_step_count: "3"` matches the three steps narrated in `opt_out_appeal_process`, and the reviewer role named there is the reviewer role in `appeal_reviewer_role`. A fixture whose structured fields contradict its prose teaches the grader the wrong lesson. |
| Assertions exercise the new surface | Six assertions: § 7221 anchored, `determination_basis=established`, all three deliverable keys present, and `must_not_include: record_insufficient` — the last one is what actually pins the ANALYSED path. |

## 3. THE GUARD — TRACED, NOT ASSERTED

Appended to `src/registry/__tests__/admt-deliverables.test.ts` (the Item 308 pin file; same-tool tests stay in one place rather than fragmenting).

`run-quality-batch/index.ts` imports the validator at L60 and runs it over every pinned intake at run start (L1886–1910), aborting the run on any violation. The guard calls **that same `validateIntake` function** with **that same `cppaAdmtContract` object** over every `CPPA_ADMT_GOLDEN[].intake` and asserts zero violations — the exact predicate the batch evaluates, not a proxy. All 5 cases pass, so no pin-validation abort can occur. Any future contract addition now fails at commit time instead of at batch start.

Three further guards: every Item 308 field present on the Perfect case; the generic-language screen cleared on all seven notice elements; and `buildAdmtDeliverables(perfect.intake)` emitting five notice findings with **no** `record_insufficient` status/verdict and **no** `insufficient_record` exception condition.

**Result: 16 tests in the file, all passing (28ms). Typecheck clean.**

## 4. FILES TOUCHED

| File | Change |
| --- | --- |
| `supabase/functions/_shared/golden/cppa-admt.ts` | Fifth case `admt-hr-perfect-record` appended |
| `src/registry/__tests__/admt-deliverables.test.ts` | ITEM 309 fixture-guard block appended (4 tests) |
| `docs/courier/ITEM309-CPPA-ADMT-FIXTURE-UNBLOCK-2026-07-31.md` | NEW (this) |
| `docs/pipeline-state.md` | Item 309 appended; `Last updated` restamped |

**Nothing else was touched.** No engine module, no contract, no migration, no corpus row, no page. No corpus was read or written this turn — the fixture reuses statutory text only through the existing registry via `buildAdmtDeliverables`.

## 5. DOUBLE-CHECK LEDGER

| Check | Result |
| --- | --- |
| Fixture clears the batch's own validator | ✅ 5/5 cases, via `validateIntake` + `cppaAdmtContract` |
| Perfect case carries every Item 308 field | ✅ 7 notice elements + 6 `admt_detail` operands, pinned individually |
| Generic-language screen cleared | ✅ 6 patterns × 7 elements, asserted |
| ANALYSED path reached, not the fallback | ✅ 5 notice findings, zero `record_insufficient`; zero `insufficient_record` conditions |
| Structured fields agree with the prose | ✅ step count 3 = three narrated steps; reviewer role matches |
| Existing four cases unchanged | ✅ untouched — degraded/adversarial coverage preserved |
| Tests / typecheck | ✅ 16/16, typecheck clean |
| Deploy / harness invocation / ingestion | ✅ NONE |

**Honest limit:** this restores *measurability*, not a *measurement*. No benchmark was run (dispatch forbids harness invocation), so the ANALYSED path's quality is still unscored. The § 7222 access-response adequacy surface flagged in Item 307 §6 remains OPEN and UNSCHEDULED.

---

**Disposition:** COMPLETE — awaiting controller verification. cppa-admt is measurable again. Next per dispatch: **Chapter 6 (dpia) rebuild.**
