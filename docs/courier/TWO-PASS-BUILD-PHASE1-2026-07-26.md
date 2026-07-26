# TWO-PASS BUILD — PHASE 1 (cppa-risk authoring)

**Dispatch:** TWO-PASS-BUILD-PHASE-1 (CEO-approved 2026-07-26; team-reviewed, five-lens; privacy-counsel lens load-bearing on factor registry + FSOR mapping).
**Scope:** Authoring only. No deploy. `run-cppa-risk-assessment` untouched.
**Gate satisfied:** LEGAL-TEST-V2.1 amendment (ledger item 132) landed 2026-07-26T08:13:29Z.

---

## 1. Corpus prep — § 7152 verbatim sync

`provision_texts.cppa-7152` was `status='pending'` with an empty `verbatim_excerpt`. Per the in-corpus-first discipline established on the § 1798.140 turn, the full text was pulled from the already-verified `cppa_authorities` row (`citation='11 CCR § 7152'`, `full_text` 8,051 chars, `status='current'`, `effective_date=2025-10-01`) and mirrored into `provision_texts.cppa-7152` via a single UPDATE migration. Result: status `approved`, verbatim excerpt populated, citation stamped `11 CCR § 7152 (OAL-approved text, eff. 2026-01-01)`, jurisdiction `US-CA`, `last_verified_at=now()`.

No other corpus rows were created or edited.

---

## 2. Conclusion inventory

`supabase/functions/_shared/legal-test/cppa-risk-conclusions.ts` — 15 conclusions, all `jurisdiction_tag='cppa-ca'`, refined against the actual report surfaces emitted by `run-cppa-risk-assessment`.

| id | type | surface | anchor |
|---|---|---|---|
| `r.applicability.selling_sharing` | R | applicability | § 7150(b)(1) |
| `r.applicability.sensitive_pi` | R | applicability | § 7150(b)(2) |
| `r.applicability.admt_significant_decision` | R | applicability | § 7150(b)(3) |
| `r.applicability.extensive_profiling` | R | applicability | § 7150(b)(4) |
| `r.applicability.train_admt` | R | applicability | § 7150(b)(5) |
| `r.cohort.compliance_date` | R | deadlines | § 7150(c) |
| `r.documentation.purpose_present` | R | documentation_check | § 7152(a)(1) |
| `r.documentation.categories_present` | R | documentation_check | § 7152(a)(2) |
| `r.documentation.operational_elements_present` | R | documentation_check | § 7152(a)(3) |
| `r.documentation.approver_present` | R | documentation_check | § 7152(a)(9) |
| `r.admt.consequence_gated` | R | admt_consequence | § 7001(ddd) |
| `w.balance.risks_vs_benefits` | **W** | balancing | § 7152(a) |
| `j.initiation_decision` | J | closing | § 7152(a)(7) |
| `j.purpose_specificity_adequacy` | J | documentation_check | § 7152(a)(1) |
| `j.safeguard_sufficiency` | J | safeguards | § 7152(a)(6) |

**Design note:** the regulation is a bright-line rulebook wrapping a single balancing test. Only `w.balance.risks_vs_benefits` is Type W (the reg text literally uses "outweigh"). Every other conclusion is Type R (deterministic gate output) or Type J (reserved to the business / counsel by the reg's own text — (a)(7) initiation decision, (a)(1) purpose adequacy beyond non-generic phrasing, (a)(6) safeguard sufficiency).

---

## 3. Factor registry — § 7152(a)(4)-(6)

`supabase/functions/_shared/factors/cppa-risk-factors.ts` — 16 factor rows total; every `verbatim_excerpt` is quoted from `provision_texts.cppa-7152` (via `cppa_authorities`), every `anchor.pinpoint` is at the deepest applicable sub-subsection.

- **§ 7152(a)(4) benefits (4 rows):** the four stakeholder categories the reg enumerates (`business`, `consumer`, `other_stakeholders`, `public`). No sub-categories in the regulation.
- **§ 7152(a)(5) negative impacts (8 rows):** (A) unauthorized access, (B) discrimination, (C) impaired control, (D) coercion / dark patterns, (E) economic harms, (F) physical harms, (G) reputational harms, (H) psychological harms — verbatim.
- **§ 7152(a)(6)(A) safeguards (4 rows):** (i) technical/architectural controls, (ii) privacy-enhancing technologies, (iii) external consultation, (iv) ADMT governance policies and training — verbatim.

### FSOR mapping decisions

Guidance mapping is CPPA-domain only. Every candidate FSOR row was drawn from `cppa_fsor_commentary` filtered on `regulation_citation ILIKE '%7152%'` (16 rows available) or `'%7150%'` (36 rows available, used only for the § 7150-scoped applicability conclusions).

Mapped rows (populated `guidance_refs[]`):
- `neg.a.unauthorized_access` ← FSOR § 7152 Appendix p. 134 (stakeholder-balance framing)
- `neg.b.discrimination` ← FSOR § 7152 Appendix p. 130 (ADMT harm-mitigation framing)
- `safe.i.technical_controls` ← FSOR § 7152 (streamlined-safeguards clarification, no page_ref)
- `safe.iv.admt_governance` ← FSOR § 7152 p. 37 (ADMT specificity requirement)

### Empty-by-finding gaps — feed to T5

The following factor rows have `guidance_refs=[]` because no § 7152-tagged FSOR row directly discusses them. Under Q4(e), cross-provision analogies (e.g. § 7002 purpose-limitation or § 7004 dark-pattern discussion) are BANNED for these customer-facing factors. Each is logged here as a ranked ingestion candidate for the T5 empty-by-finding priority feed (standing input to T5 per LEGAL-TEST §Q4(c)):

| Priority | Factor | Ingestion target |
|---|---|---|
| P1 | `neg.d.coercion_dark_patterns` | § 7152-tagged FSOR row discussing (a)(5)(D) coercion / dark-pattern applicability to risk assessments |
| P1 | `neg.c.impaired_control` | § 7152-tagged FSOR row on (a)(5)(C) informed-decision / reasonable-expectations harm |
| P2 | `safe.ii.privacy_enhancing_technologies` | § 7152-tagged FSOR row on (a)(6)(A)(ii) PETs |
| P3 | `benefit.business` / `.consumer` / `.other_stakeholders` / `.public` | § 7152-tagged FSOR row discussing (a)(4) benefit-articulation specificity beyond the (a)(1) purpose parallel |
| P3 | `neg.e.economic_harms`, `neg.f.physical_harms`, `neg.g.reputational_harms`, `neg.h.psychological_harms` | § 7152-tagged FSOR rows on each (a)(5) sub-category |

Also logged: **Pass-G analogy_fsor_internal tier for `test.cppa-7152.balance` is currently EMPTY.** Per Q4(e) future-proofing, once FSOR revisions or CPPA enforcement discussions land in `cppa_fsor_commentary` or `enforcement_actions` with a `regulation_citation='11 CCR § 7152'` tag, they will flow into candidate-set construction with no architecture change.

---

## 4. RenderPlan schema v1 + validators

- `supabase/functions/_shared/render-plan/schema.ts` — pure types. `RenderPlan` carries `plan_version='v1'`, `product='cppa-risk-assessment'`, `jurisdiction_tag`, `intake_ledger`, `citation_bindings`, `propositions`, `factor_table`, `weighing_frame`, `gate_outcomes`, `conservative_write_around`. Every `Proposition`, `FactorTableEntry`, `CitationBinding`, and `WeighingFrameEntry` carries its own `jurisdiction_tag` slot per §2.7. `FORBIDDEN_COMPARATIVE_TOKENS` exported for the Pass-2 linter.
- `supabase/functions/_shared/render-plan/validators.ts` — all seven validators from §3.2 as pure functions:
  - **V1** intake-ledger closure
  - **V2** citation-binding closure
  - **V3** authority-domain filter (Q4(e) — propositions, bindings, factor rows, frame entries)
  - **V4** guidance closure (CPPA plans require `cppa_fsor_*` source tables)
  - **V5** Pass-G candidate-set closure (frame entries key to known weighing tests with matching domain)
  - **V6** **scoped to Type R** (per LEGAL-TEST v1 §Q1 — Type W deliberately has no polarity requirement)
  - **V7** Type-W factor completeness + frame presence + closeness heuristic (warn when total closeness=0)
  - Plus `lintPass2Output` — banned comparative-token check on rendered prose.

### Test output — PASTED GREEN

```
running 15 tests from ./render-plan/validators.test.ts
V1: intake-ledger closure passes on well-formed plan ... ok (1ms)
V1: unresolved ledger ref is an error ... ok (0ms)
V2: unresolved citation binding ref is an error ... ok (0ms)
V3: cross-domain proposition is rejected ... ok (0ms)
V3: cross-domain citation binding is rejected ... ok (0ms)
V4: non-CPPA guidance source on CPPA plan is rejected ... ok (0ms)
V4: foreign source_table is rejected ... ok (0ms)
V5: weighing frame keyed to unknown test is rejected ... ok (0ms)
V6: Type-R proposition missing polarity is rejected ... ok (0ms)
V6: Type-W proposition without polarity is FINE (scoped to Type R) ... ok (0ms)
V7: Type-W proposition requires a resolvable weighing_frame_ref ... ok (0ms)
V7: zero total closeness emits a warn (not error) ... ok (0ms)
Aggregate validator: happy-path plan returns zero errors ... ok (0ms)
lintPass2Output: banned comparative token is caught ... ok (0ms)
lintPass2Output: clean CPPA prose passes ... ok (0ms)

ok | 15 passed | 0 failed (9ms)
```

---

## 5. Gate registry

`supabase/functions/_shared/gates/cppa-risk-gates.ts` — 12 gate specs, all CPPA-domain, restructured per §3.3 so Pass 1 emits `GateRuleOutcome` rows the renderer keys on rather than post-hoc scrubbers rebuilding intake state:

- `G.q18.admt_consequence` — suppress § 7001(ddd) assertions when q18 negative (`on_block: suppress_section`)
- `G.cohort.compliance_date` — deterministic § 7150(c) cohort date from prong + revenue band
- `G.deadline.registry_access_timeline` — block § 7157 submission-timeline assertions when intake incomplete
- Five `G.applicability.*` gates — one per § 7150(b) prong
- Four `G.documentation.*` gates — presence checks for § 7152(a)(1), (2), (3), (9)

Existing scrubbers in `run-cppa-risk-assessment` (`_risk_citation_dup_fix`, LEAK-PREV, emit-gate) are **unchanged** this turn per Phase-1 no-wiring rule. Phase 2 rewires these gates as first-class Pass-1 outcomes.

---

## 6. Pass-G candidate index

`supabase/functions/_shared/pass-g/cppa-risk-candidate-index.ts` — one candidate slice for `test.cppa-7152.balance` (CPPA-domain). 11 candidate entries indexed today: 8 **primary** (rows tagged § 7152 directly — Appendix pp. 131-135, p. 33, p. 37), 3 **supporting** (§ 7150 rows that scope § 7152 applicability — p. 30, Appendix pp. 117 & 119). **`analogy_fsor_internal` tier deliberately empty** — logged in §3 above as T5 candidate; future FSOR/enforcement rows tagged § 7152 auto-flow in per Q4(e) future-proofing.

Every entry carries `corpus_ref` (a query key downstream Pass G resolves), `regulation_citation`, `page_ref`, `anchor_hint`, and `tier_label`.

---

## 7. Files touched this turn

**Created (7):**
- `supabase/functions/_shared/legal-test/cppa-risk-conclusions.ts`
- `supabase/functions/_shared/factors/cppa-risk-factors.ts`
- `supabase/functions/_shared/render-plan/schema.ts`
- `supabase/functions/_shared/render-plan/validators.ts`
- `supabase/functions/_shared/render-plan/validators.test.ts`
- `supabase/functions/_shared/gates/cppa-risk-gates.ts`
- `supabase/functions/_shared/pass-g/cppa-risk-candidate-index.ts`

**Migration (1):** in-corpus-first sync of `provision_texts.cppa-7152` to approved status with verbatim § 7152 text mirrored from `cppa_authorities`.

**Untouched this turn:** `run-cppa-risk-assessment/*` (no BUILD_STAMP bump), any prompt/rubric/grader/golden/contract/fixture/sample. No deploy. No `quality_batch`. Phase 2 (Pass G + templates + wiring + deploy) awaits controller dispatch after CEO-visible Phase-1 courier review.

---

## 8. CORRECTIVE SUB-TURN — LEGAL-TEST-V2.2-AUTHORITY-WEIGHT (2026-07-26)

CEO CORRECTION (2026-07-26): the v2.1 phrasing "analogies the FSOR itself discusses are legitimate CPPA authority" is WRONG and formally superseded. Correct principle: **binding vs persuasive is load-bearing; non-CA law is NEVER binding for a CPPA/CA product; U.S./CA material is NEVER used in GDPR products in any role; the FSOR-mediated bridge is one-way and persuasive-tier only.**

**Phase-1 artifacts corrected this sub-turn (labels + types added; no data lost):**

1. **`_shared/render-plan/schema.ts`** — added `AuthorityWeight = "binding" | "persuasive"`; added optional `authority_weight` on `CitationBinding` (defaults to "binding") and on `WeighingFrameEntry` with required `fsor_mediation_ref` when persuasive; exported `PERSUASIVE_MARKERS`.
2. **`_shared/factors/cppa-risk-factors.ts`** — `GuidanceRef.authority_weight` now REQUIRED and constrained to `"binding"` (registry lint enforces). All 5 non-empty guidance_refs tagged `"binding"`.
3. **`_shared/pass-g/cppa-risk-candidate-index.ts`** — `CandidateEntry.authority_weight` added (required); all 11 existing primary/supporting entries tagged `"binding"`. Header rewritten to state the v2.2 rule; analogy_fsor_internal comment updated to persuasive + `fsor_mediation_ref` requirement (tier remains empty; T5 candidate note preserved).
4. **`_shared/render-plan/validators.ts`** — added **V8 authority-weight tiering**: Type R non-binding = hard reject; factor guidance non-binding = hard reject; persuasive frame entry without `fsor_mediation_ref` = hard reject; persuasive entry on non-CPPA plan = hard reject. Added `lintPersuasiveMarking` (Pass-2 rendering discipline). Aggregator now includes V8.
5. **`_shared/render-plan/validators.test.ts`** — three V8 tests added; all 18 tests green (`deno test render-plan/validators.test.ts` → `ok | 18 passed | 0 failed`).
6. **`_shared/legal-test/cppa-risk-conclusions.ts`** — header note added: all Type R and Type W factor anchors are binding-tier CPPA/CA authority; no data changes required (every existing anchor already resolves to a California statute or 11 CCR regulation).

**Docs corrected:**
- `docs/design/LEGAL-TEST.md` — Q4(e) v2.1 parenthetical stripped of the "FSOR analogies = CPPA authority" wording; **Q4(e) v2.2** appended defining the binding/persuasive tiering, one-way GDPR bridge, `fsor_mediation_ref`, rendering discipline, and validator rules.
- `docs/design/TWO-PASS-ARCHITECTURE.md` — §2.7 parenthetical replaced; new **§2.8 Legal Test v2.2 — Authority-Weight Tiering** inserted before §3 covering schema deltas, V8 validator, Pass-2 persuasive marker + sole-support ban, and Phase-1 build correction.

**Untouched this sub-turn:** any prompt, rubric, grader, golden, contract, fixture, sample, edge-function deploy, migration, or `quality_batch`. `run-cppa-risk-assessment` untouched; no BUILD_STAMP bumped.

**Status:** Phase 1 remains DONE-AUTHORING under corrected labels. Phase 2 dispatch may proceed.
