# ITEM 305 — CPPA-RISK CHAPTER-1 REBUILD: FIVE § 7152 ANALYTIC DELIVERABLES (COURIER, RETROACTIVE)

**Dispatch:** Controller Item 305 (PRODUCT REBUILD: cppa-risk, Chapter 1 of `docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md`).
**Authority:** CEO directive 2026-07-31.
**Authored:** RETROACTIVELY under Item 306 (CLOSE-OUT). Item 305 shipped with **no courier and no pin test**, breaking the pattern Items 298–304 followed. This document records what Item 305 actually did; the test gap it left is closed by Item 306 in the same turn.
**Stamp:** 2026-07-31T07:34Z (sandbox clock re-read before writing).
**Scope of Item 305 as executed:** engine build turn on the cppa-risk generator. **NO deploy. NO harness invocation. NO ingestion.**

---

## 1. WHAT CHANGED — THE FIVE ANALYTIC DELIVERABLES

Chapter 1's finding was that cppa-risk **RECITES** § 7152 headings instead of performing the analytic operations the section requires. Item 305 replaced recitation with five deterministic per-activity deliverables, built in
`supabase/functions/_shared/ltp/analytic-deliverables/build.ts` and carried on the render plan as the `activity_analytics` shard:

| # | Deliverable | Statutory hook | Operation performed (not recited) |
| --- | --- | --- | --- |
| 1 | `necessity_analysis[]` | § 7152(a)(2) | Per PI element: asserted status + justification → verdict `supported_as_necessary` / `minimisation_candidate` / `undetermined_on_the_record`. A necessity assertion with no reason is **not** accepted. |
| 2 | `harm_causation[]` | § 7152(a)(5)(A)–(H) | Each harm is bound to a **closed catalogue id**, carries the VERBATIM statutory example, and states **source** and **cause** separately, plus likelihood × severity → `inherent_band`. |
| 3 | `safeguard_map[]` | § 7152(a)(6) | Foreign-keyed to `harm_causation[].harm_id`; safeguard status credits (tested 6 / untested 3 / planned 0 / none 0) subtract from the inherent score → `residual_band`. An unaddressed harm is surfaced, not dropped. |
| 4 | `weighing[]` | § 7152(a)(4) | Exactly **four** records — the business, the consumer, other stakeholders, the public — each with the offsetting harm ids and a **generic-benefit screen** (§ 7152(a)(4) forbids generic benefit terms). |
| 5 | `consequence` | § 7152(a)(7), (a)(9) | Deterministic decision function over the four above: ordered rules C0 → C1 → C2 → C3/C3b/C3c → C4 yielding exactly one of `reserved_insufficient_record`, `do_not_initiate_absent_change`, `initiate_with_conditions`, `initiate`, with rule ids, reasons and conditions emitted for the prose pass to state rather than derive. |

**MANDATORY DEGRADATION LAW held throughout.** Every deliverable emits `status: "record_insufficient"` + `information_needed` rather than inventing content, and `buildActivityAnalytics` never throws into `derivePlan` (builder-fault degradation returns a fully-degraded envelope). Secondary (§ 7156(a) comparable-set) activities receive a **degraded** envelope naming what is missing — never a copy of the primary analysis.

## 2. WHERE THE § 7152(a)(5)(A)–(H) CATALOGUE TEXT CAME FROM — CONFIRMED AND CITED

`harm-catalogue.ts`'s own header names its source; Item 306 **verified that claim against the live corpus rather than repeating it**:

- **Row:** `provision_texts` key **`cppa-7152`**, `status='approved'`, citation **"11 CCR § 7152 (OAL-approved text, eff. 2026-01-01)"**, `verbatim_excerpt` length **8,051 chars** (read live 2026-07-31).
- **Verification result:** all eight entries are verbatim substrings of that row under typography normalization. **7 of 8 match outright; (D) matches as two contiguous fragments** either side of a running page header — see §5.
- **Zero new ingestion occurred in Item 305.** No `provision_texts` row was created, edited, promoted or re-ingested; the module is a transcription of an already-approved row ingested in an earlier corpus item. Item 306 wrote no corpus rows either.

## 3. INTAKE ADDITIONS

New fields, `required: "always"` in `cppaRiskContract` (the § 7152(a)(2)/(a)(4)/(a)(5)/(a)(9) operands are mandatory elements of the assessment):

- `a2_necessity_set[]` — `{ element, necessity, justification }`; `necessity` ∈ `NECESSITY_STATUS_OPTS`.
- `a4_benefit_business` / `a4_benefit_consumer` / `a4_benefit_other_stakeholders` / `a4_benefit_public` — one per statutory beneficiary class.
- `a5_harm_pathways[]` — `{ harm, source, cause, likelihood, severity }`; `harm` ∈ `HARM_PATHWAY_OPTS`, each option carrying its `(A)`–`(H)` tag so resolution is a **tag read, never a semantic guess**.
- `a6_safeguards[]` (optional block; leaves conditional) — `{ harm, safeguard, safeguard_status }`.
- `a9_approver_name` / `a9_approver_position` (+ optional `a9_approval_date`) — the § 7152(a)(9) reviewer-approver, deliberately **distinct** from the `i8_certifying_exec_*` certifier.

Step 6 of `src/pages/CPPARiskAssessment.tsx` collects all five operand groups; options live in `src/pages/CPPARiskAssessment.enums.ts` and are copied VERBATIM into the Deno-side `enums.ts` (edge bundling cannot import from `src/`), with parity now asserted mechanically.

## 4. NARRATIVE PARTS AND WIRING

- `_shared/ltp/derive.ts` — calls `buildActivityAnalytics`, attaches the envelope to the plan, and adds `a9_approver_name` to the PII-exclusion list.
- `_shared/ltp/render-plan/schema.ts`, `_shared/ltp/section-shards/cppa-risk.ts`, `_shared/report-schemas/cppa-risk.ts` — register and render the `activity_analytics` shard.
- Prose remains a **statement** of the computed plan: verdicts, bands, rule ids and conditions are decided in `build.ts`, never in the model pass.

## 5. THE ONE TRANSCRIPTION DEVIATION (mechanical, disclosed)

The canonical PDF inserts a running page header **inside** sub-paragraph (D):
`CA PRIVACY PROTECTION AGENCY – TEXT OF REGULATIONS / (CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations) / Page 104 of 127`.
That is pagination, not statutory text, and is excised from `HARM_CATALOGUE[D].verbatim`. The Item 306 pin asserts the two remaining fragments appear **in order** with **nothing but that artifact between them** — the gap is matched against an explicit page-header regex, so a real textual difference cannot hide inside the excision.

**A second corpus artifact was found during Item 306 verification and is recorded here rather than "fixed":** sub-paragraph (H) reads `"non- medical"` in the corpus row (hyphenation across a PDF line break); the catalogue reads `"non-medical"`. The pin's `norm()` therefore rejoins a word-internal hyphen followed by whitespace, applied symmetrically to both sides and documented in the test header. **The corpus row was not edited** — a pin was not bent to make a failing corpus pass, and no statutory text was altered.

## 6. FILES TOUCHED BY ITEM 305

**New:**
- `supabase/functions/_shared/ltp/analytic-deliverables/harm-catalogue.ts`
- `supabase/functions/_shared/ltp/analytic-deliverables/enums.ts`
- `supabase/functions/_shared/ltp/analytic-deliverables/types.ts`
- `supabase/functions/_shared/ltp/analytic-deliverables/build.ts`

**Edited:**
- `supabase/functions/_shared/ltp/derive.ts`
- `supabase/functions/_shared/ltp/section-shards/cppa-risk.ts`
- `supabase/functions/_shared/ltp/render-plan/schema.ts`
- `supabase/functions/_shared/report-schemas/cppa-risk.ts`
- `supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts`
- `src/pages/CPPARiskAssessment.enums.ts`
- `src/pages/CPPARiskAssessment.tsx`

**Not touched:** no migration, no `provision_texts` write, no deploy, no harness invocation.

## 7. WHAT ITEM 305 GOT WRONG (recorded, not softened)

1. **No courier** — the first item since 297 to ship without one. This document is the retroactive repair.
2. **No pin or regression test** — the dispatch required one; `src/registry/__tests__/` held 12 tests, none touching the catalogue, `activity_analytics`, or the new fields. Closed by Item 306.
3. **The contract was tightened without moving the fixtures.** Making a2/a4/a5/a9 `required: "always"` while every cppa-risk golden case still lacked them made the product **unmeasurable**: `run-quality-batch` aborts at start with *"Pinned-fixture contract violations for cppa-risk"*. This is the load-bearing lesson — **a contract addition and its fixture update are one change, not two.** Closed by Item 306.

## 8. DOUBLE-CHECK LEDGER

| Check | Result |
| --- | --- |
| Catalogue source row exists and is approved | ✅ `cppa-7152`, 8,051 chars, approved, OAL-approved-text citation |
| Eight entries verbatim against that row | ✅ 8/8 under normalization (7 direct, (D) two-fragment with artifact gap asserted) |
| Zero ingestion in Item 305 and Item 306 | ✅ no `provision_texts` INSERT/UPDATE in either turn |
| Catalogue = closed set, no duplicates | ✅ ids A–H, 8 distinct verbatim texts, pinpoints machine-checked |
| Intake option parity (form ↔ Deno enums) | ✅ all 8 `HARM_PATHWAY_OPTS` resolve to A–H by tag read |
| Consequence domain closed, never absent | ✅ 5 scenarios × all activities: decision ∈ 4 values, rule_ids non-empty |
| Degradation, not invention, on an empty record | ✅ `reserved_insufficient_record`, `approval_recorded=false` |
| Secondary activity not a copy of the primary | ✅ asserted structurally |
| Off-catalogue harm label dropped, not coerced | ✅ `(Z)` input yields no entry |
| Deploy / harness invocation | ✅ NONE — build and test only |

---

**Disposition:** Item 305 recorded RETROACTIVELY. Its two open defects (missing courier, missing test) and its consequence (fixtures out of contract) are closed under Item 306 in the same turn. `run-cppa-risk-assessment` remains **undeployed** with these changes — they take effect at that function's next dispatched deploy turn.
