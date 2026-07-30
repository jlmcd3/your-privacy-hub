# ITEM 272 — STEP 0(a): § 7150(b) SIX-PRONG REGISTRY REALIGNMENT + REGISTRY-VS-CORPUS PIN TEST

**Turn stamp:** 2026-07-30T07:00Z (sandbox clock re-read before writing).
**Turn class:** engine-B shared-module realignment + NEW permanent drift guard + fixture spec-of-test updates + courier/ledger. Legacy wire, snapshot, prompts, grounded-note, GTM register/grader UNTOUCHED. **NO harness invocation.** Explicit redeploy of ONLY `replay-cppa-risk-harness`.
**Signature authority for new/rewritten content:** CEO delegation of 2026-07-30 ("Please let the teams comment on this and decide next steps… You are hereby authorized by me to do so"), executed under four-lens unanimity.

---

## 1. Verbatim source

`provision_texts` row `key='cppa-7150'`, `status='approved'`, `jurisdiction='US-CA'` — OAL-approved 11 CCR § 7150, filed 2025-09-22, effective 2026-01-01 (source PDF SHA-256 `7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650`). The adopted text enumerates **six** (b) triggers plus the (b)(2)(A) employment-administration carve-out. The shipped registry carried the **draft-era five**: "(b)(4) extensive profiling" (draft language), training miscited at **(b)(5)**, and the sensitive-location prong **absent from the product entirely**.

---

## 2. Registry realignment — `_shared/legal-test/cppa-risk-conclusions.ts`

| Pinpoint | Row id | Action |
|---|---|---|
| § 7150(b)(1) | `r.applicability.selling_sharing` | KEPT |
| § 7150(b)(2) | `r.applicability.sensitive_pi` | KEPT; description extended to carry the § 7150(b)(2)(A) employment-administration carve-out verbatim in substance |
| § 7150(b)(3) | `r.applicability.admt_significant_decision` | KEPT |
| § 7150(b)(4) | `r.applicability.systematic_observation` | **REWRITTEN** from `r.applicability.extensive_profiling` (draft-era) |
| § 7150(b)(5) | `r.applicability.sensitive_location` | **NEW ROW** |
| § 7150(b)(6) | `r.applicability.train_admt` | **REPOINTED** (b)(5) → (b)(6); description carries the "intends to use" definition |

### New/rewritten content, quoted in full (CEO delegation = signature authority)

**(b)(4) `display_label`:** "Inferring characteristics from systematic observation of workers, students, or applicants"

**(b)(4) `description`:** "A risk assessment is required when the business uses automated processing to infer or extrapolate a consumer's intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, location, or movements, based upon systematic observation of that consumer when they are acting in their capacity as an educational program applicant, job applicant, student, employee, or independent contractor for the business."

**(b)(4) `compliance_guidance`:** "The business must complete and retain a risk assessment for every activity that infers or extrapolates consumer characteristics from systematic observation of a person acting as an educational program applicant, job applicant, student, employee, or independent contractor, identifying the observation method and its coverage period, the characteristics inferred, the worker, student, or applicant population observed, and the operational decision the inference feeds."

**(b)(5) `display_label`:** "Inferring characteristics from presence at a sensitive location"

**(b)(5) `description`:** "A risk assessment is required when the business uses automated processing to infer or extrapolate a consumer's intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, or movements, based upon that consumer's presence in a sensitive location; inferring or extrapolating does not include using a consumer's personal information solely to deliver goods to, or provide transportation for, that consumer at a sensitive location."

**(b)(5) `compliance_guidance`:** "The business must complete and retain a risk assessment for every activity that infers or extrapolates consumer characteristics from a consumer's presence in a sensitive location, naming the sensitive-location categories involved, the source of the location signal, the characteristics inferred, and the record basis for distinguishing that inference from the excluded case of using location solely to deliver goods to, or provide transportation for, the consumer at that location."

**(b)(2) carve-out clause added:** "§ 7150(b)(2)(A) carves out sensitive personal information of employees or independent contractors processed solely and specifically to administer compensation payments, determine and store employment authorization, administer employment benefits, provide legally required reasonable accommodation, or perform legally required wage reporting, and any other processing of consumers' sensitive personal information remains subject to this Article."

---

## 3. Gates — `_shared/gates/cppa-risk-gates.ts` + `_shared/ltp/gate-eval.ts`

| Gate id | Action | Pinpoint | Intake keying |
|---|---|---|---|
| `G.applicability.extensive_profiling` | **RETIRED** (draft-era) | — | — |
| `G.applicability.systematic_observation` | NEW | § 7150(b)(4) | `q5b_profiling_observation` = "Yes — systematic observation of workers/students/applicants" or "Both" |
| `G.applicability.sensitive_location` | NEW | § 7150(b)(5) | `q5b_profiling_observation` = "Yes — based on sensitive-location presence" or "Both", OR `sensitive_location_basis` engaged |
| `G.applicability.train_admt` | REPOINTED | § 7150(b)(6) | `q18b_admt_training` (unchanged) |

Because (b)(4) and (b)(5) share ONE intake enum, the generic `isNegative` evaluator cannot separate them. Dedicated predicates `q5bSaysObservation`, `q5bSaysSensitiveLocation`, `sensitiveLocationBasisEngaged` were added to `gate-eval.ts`; both predicates accept the "Both" option. Absence of the field yields `not_applicable` (unchanged semantics), never a fabricated engagement.

---

## 4. Touched sites (enumerated)

| File:line | Change |
|---|---|
| `_shared/legal-test/cppa-risk-conclusions.ts:142-215` | Six-prong registry realignment (§2 above) |
| `_shared/gates/cppa-risk-gates.ts:52-107` | Gate ids/pinpoints (§3) |
| `_shared/ltp/gate-eval.ts:36-125` | Alias shim + three q5b predicates + two dedicated gate branches |
| `_shared/openings/ccpa-7150-pin.ts:8-25` | Verbatim (b)(1)–(b)(6) constants + labels (already six; re-verified against corpus this turn) |
| `_shared/ltp/golden-shape-quotas.ts:25-56` | `scope_and_triggers` / `scope_confirmation` `min_items` 5 → 6 (quota counts prongs); version stamp left unchanged so the Item-241.1 telemetry assert stays valid |
| `_shared/ltp/section-composers/cppa-risk.ts:988` | Prong-index regex `/7150\(b\)\((\d+)\)/` — no change needed, already 1..6 tolerant |
| `_shared/ltp/section-composers/cppa-risk.ts` (items array) | Engaged prongs now ordered FIRST explicitly (see §5) |

**No silent behavior changes** beyond the realignment and the ordering fix recorded in §5.

---

## 5. One behavior fix, declared

`composeScope` emitted prong items in **registry order**. The ratified Item-241.1 (E1) contract is "engaged prongs LEAD". With five prongs and a single engaged prong the assertion passed **vacuously** in the shipped fixture; with six prongs and a non-contiguous engaged set ((b)(3) + (b)(4)) the divergence surfaced. The composer now emits `[...engaged, ...notEngaged]`. Version stamp bumped to `ltp-section-composers-cppa-risk-2026-07-30-item272-engaged-lead`. This restores the declared contract; it does not create a new one.

---

## 6. NEW permanent drift guard — `_shared/legal-test/registry-corpus-pin.test.ts`

Asserts: (a) exactly six applicability rows, pinpoints (b)(1)–(b)(6); (b) each pinpoint's subdivision text exists in a checked-in fixture copy of the `cppa-7150` verbatim excerpt (fixture carries a re-verification comment for corpus updates); (c) operative tokens of each `display_label` appear in the matching subdivision ("systematic observation", "sensitive location", "train", …); (d) no registry row cites a subdivision absent from the fixture; plus the negative assert that the draft-era phrase **"extensive profiling" appears in NO applicability display_label**.

Result: **5 passed / 0 failed.**

---

## 7. Regression (verbatim)

`deno test --allow-all --no-check supabase/functions/_shared supabase/functions/_tests` → **1176 passed | 22 failed | 5 ignored (20s)**.

Baseline at turn start (post-realignment, pre-fixture-update) was 28 failed. The six closed this turn are the deliberate **spec-of-test** updates below. The remaining 22 are **PRE-EXISTING** and unrelated (build-stamp asserts, `counsel-voice-1`, `cp5-coherence-prose` slot order, `content`, `value-screen`, `waveb`, `grader-cal-1`, `ql3-p1-2`, `w21-risk-turna`, `rebuild-dpia-cpparisk`, `postbatch-1`, `lia`, `cppa-hf1`, `item241-1 (E2)`) — none imports a file changed this turn except `item241-1 (E2)`, whose failure is in `aggregateBalance` (untouched; no-factor plans resolve `insufficient` via `anyPresentBenefit`).

### Deliberate spec-of-test changes (never silent)

| Test | Change | Rationale |
|---|---|---|
| `cp4-labels-citations.test.ts:60-77` | gate fixture rows retired/added; prong count 5 → 6; distinct pinpoints 5 → 6 | six-prong reality |
| `cp5-scope-coherence.test.ts:41,51` | scope length 5 → 6; pinpoint-set size 5 → 6 | six-prong reality |
| `item241-1-structural.test.ts:36-80` | intake key `q_extensive_profiling` → real enum `q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants"`; counts 5 → 6; title "five" → "six" | draft-era key retired; fixture now exercises the shipped intake contract |
| `item243-completion.test.ts:65-99` | alias direction inverted (`q5b_profiling_observation` is canonical, `q_extensive_profiling` the legacy alias); gate id → `G.applicability.systematic_observation`; intake value → real q5b option | matches the realigned alias shim and gate registry |

---

## 8. Four-lens record

- **Privacy-law:** the shipped product misstated subdivisions on a legal surface — it cited a draft trigger that does not exist in the adopted text and omitted an adopted trigger entirely. Both are correctness defects of the highest class on a citation-bearing document. All new text is corpus-quoted; no paraphrase of operative scope. UNANIMOUS to land.
- **Prose:** new labels are plain-English and read in the same register as the existing rows; no acronym or truncation artifacts introduced.
- **Prompt-engineering:** no prompt edits this turn; the registry is the deterministic source Pass 2 renders from.
- **CS:** customers who engage sensitive-location inference previously received a document that silently omitted their trigger; the new row closes that.

---

## 9. Deploy

`replay-cppa-risk-harness` ONLY. No other function deployed. No harness invocation — controller runs the acceptance campaign.
