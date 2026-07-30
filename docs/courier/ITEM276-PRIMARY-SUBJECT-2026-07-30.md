# ITEM 276 — TRACK 2 REDESIGN STEP 2: THE ASSESSMENT'S SUBJECT IS THE PRIMARY ACTIVITY

**Date:** 2026-07-30
**Authority:** CEO campaign delegation; team-unanimous.
**Scope executed:** `_shared/ltp/section-composers/cppa-risk.ts`, `_shared/ltp/content/pass2-templates.ts` (two new deterministic sentence frames), `_shared/ltp/section-shards/cppa-risk.ts` (registry rows), `_shared/ltp/slot-resolver.ts` (slot vocabulary), `_shared/ltp/replay/{types,runner}.ts` (observation only), tests, ledger.
**NOT touched:** Pass-1 prompts (`pass1-derive-prompt.ts`), legacy wire, `supabase/_rebuild-snapshot-item244/`, grader instruments, quotas.
**Deploy:** `replay-cppa-risk-harness` ONLY. **No harness invocation. No LLM calls. No DB writes.**

---

## 1. The change in one sentence

Before Item 276 the assessment's subject was the *list of engaged § 7150(b) prongs*; after Item 276, when the Item-275 intake supplies `primary_activity_name`, the subject is **the customer's named activity**, and the additional uses the customer reported are handled as a § 7156(a) comparable-set question rather than silently folded into the same analysis.

## 2. MANDATORY DEGRADATION LAW

Every branch is gated on a non-empty `primary_activity_name` on the intake ledger. Pre-Item-275 documents (every archived doc, including the ClearPath acceptance record) carry no such field, so:

- `composeExecutive` emits no lead instance and keeps the prong-count subject;
- `composeRiskByActivity` keeps the Item-266 engaged-prong enumeration in `activity_label`;
- `composeProcessingNarrative` keeps its prong-derived label;
- `secondarySegmentationInstances` returns `[]`;
- `composeInformationNeeded` emits no comparable-set ask.

Pinned by the degradation test (§5).

## 3. New deterministic sentence frames (drafted under delegation — VERBATIM)

`T.risk.exec.primary_subject_lead` (max 640):

> The activity assessed in this Risk Assessment is {{plan:primary_activity_name}}, undertaken for the purpose of {{plan:primary_activity_purpose_clause}}. The analysis that follows — scope, processing, benefits, negative impacts, safeguards, and the weighing conclusion — is directed to that activity.

`T.risk.scope.secondary_segmentation` (max 2400, cites `PINPOINT_7156A` = `11 CCR § 7156(a)`):

> {{plan:entity_name}} also recorded {{plan:secondary_activity_count_phrase}} beyond the assessed activity: {{plan:secondary_activity_list}}. {{cite:PINPOINT_7156A}} permits a single risk assessment to address more than one processing activity only where those activities are comparable — the same personal information, the same purpose, the same method and technology, the same consumers, and similar risks to consumers' privacy. On the record as submitted, the comparison stands as follows: {{plan:secondary_divergence_clause}} This assessment addresses the assessed activity only. Whether any additional use may be covered by a single comparable-set assessment, or requires its own, is a determination reserved to the Company and its counsel.

**Reserved framing:** the tool states the standard, reproduces the customer's own comparison, and reserves the determination. It never green-lights bundling and never asserts that a secondary use IS or IS NOT comparable.

The unresolved-comparison ask reuses the ratified `T.risk.documentation.gap` frame — no new template — anchored at `11 CCR § 7156(a)`.

## 4. Composer edits (file: `_shared/ltp/section-composers/cppa-risk.ts`)

| Site | Behaviour with `primary_activity_name` | Legacy behaviour |
|---|---|---|
| `composeExecutive` | prepends the subject lead; activity count is **one** (the named activity); `close_list` / `negative_list` name the activity | prong-count phrase + engaged-prong list |
| `composeRiskByActivity` | rationale carrier `activity_label` = the named activity | Item-266 engaged-prong enumeration |
| `composeProcessingNarrative` | `activity_label` = the named activity | engaged-prong labels / `i1_processing_purpose` |
| `composeScope` (both branches) | appends ONE § 7156(a) segmentation item after the prong items | prong items only |
| `composeInformationNeeded` | leads with the comparable-set ask when any divergence dimension is "Not sure" | Type-J review asks only |

Helpers added: `primaryActivityName`, `primaryActivityPurpose`, `secondaryActivityRows` (defensive JSON parse — `pickLedger` stringifies non-scalars; a malformed payload degrades to `[]` and never throws), `unresolvedDivergenceDimensions`, `DIVERGENCE_DIMENSION_LABELS` (the five § 7156(a) dimensions, keyed exactly as Item-275 intake emits them), `SECONDARY_ANCHOR_7156A`.

Divergence verdict lexicon (fixed, no invention): `Same` → "recorded as the same as the assessed activity"; `Different` → "recorded as different from the assessed activity"; `Not sure` / missing → "not resolved on the record".

Version stamps bumped: `SECTION_COMPOSERS_VERSION = ltp-section-composers-cppa-risk-2026-07-30-item276-primary-subject`; `PASS2_TEMPLATES_VERSION = pass2-templates-2026-07-30-item276-primary-subject`.

## 5. Tests — `_shared/ltp/item276-primary-subject.test.ts` (5 tests, all pass, 20ms)

1. exec summary leads with `T.risk.exec.primary_subject_lead`, names activity + purpose, and the count-bearing slot never reads as multiple activities;
2. processing-narrative ctx and the rationale carrier's `activity_label` both equal the named activity;
3. scope emits the segmentation item last, names the secondary use, cites § 7156(a), renders "reserved to the Company and its counsel", and reads "Not sure" dimensions as unresolved;
4. unresolved comparisons raise an Items-for-your-review ask naming ONLY the unresolved dimensions (answered dimensions are not re-asked);
5. MANDATORY DEGRADATION — a legacy intake emits neither new template across `executive_summary`, `scope_and_triggers`, `scope_confirmation`, `processing_narrative`, `information_needed`, and keeps its prong-derived subjects.

Suite: `deno test --allow-all supabase/functions/_shared/ltp/` → **299 passed | 3 failed (10s)**. The 3 failures are the SAME 3 present before this turn: `content.test.ts:35` and `waveb.test.ts:93` (stale template-catalogue pins — the live catalogue is 41 templates; the pinned expectation was 34/39 before Item 276 and is updated by the Item-276 delta to 36, still stale by pre-existing drift, inventoried under Item 273) and `value-screen.test.ts:13` (frozen instrument stamp, Item-273 inventory item). No test that passed before this turn fails after it.

Type-check: `deno check` clean on the composer, resolver, and replay runner.

## 6. Observation (no gate change)

`StructureMetrics` gains optional `primary_activity_named` (boolean) and `secondary_uses_reported` (count), populated in `runner.ts` straight off `doc.intake_data`. Advisory telemetry only: no hard failure, no band, no quota, no grader edit. It exists so the next replay run can report how much of the population is on the Item-275 contract versus the degradation path.

## 7. Known limitation carried to Step 3

`T.risk.processing_narrative` currently renders empty under fill-or-omit because its operational clause slots (`pi_categories_clause`, `sources_clause`, …) have no resolver cases — a **pre-existing** condition unchanged by this turn and out of scope here. The Item-276 narrative assertion is therefore made on the composed ctx, and the defect is logged for the Step-3 section re-homing turn.

---

## RIDER — § 7156(a) STANDARD-STATEMENT CORRECTION (controller verification finding, legal lens, 2026-07-30T08:45Z)

**DEFECT.** As first shipped, `T.risk.scope.secondary_segmentation` stated the comparable-set standard as "comparable — the same personal information, the same purpose, the same method and technology, the same consumers, and similar risks to consumers' privacy." Verified read-only against corpus row `cppa-7156` (`provision_texts.key = 'cppa-7156'`, citation `11 CCR § 7156 (OAL-approved text, eff. 2026-01-01)`): the DEFINITIONAL sentence is

> A business may conduct a single risk assessment for a comparable set of processing activities. A “comparable set of processing activities” that can be addressed by a single risk assessment is a set of similar processing activities that present similar risks to consumers’ privacy.

The "same X" enumeration comes from the § 7156(a)(1) **Business E EXAMPLE** ("collecting the same personal information in the same way…"), not from the rule. Presenting example facts as the definitional standard is a **misstated-law-class defect** under our own GTM materiality register (`registry_corpus_drift` family). Caught by controller verification before acceptance; nothing shipped to a customer surface.

**FIX (surgical — this template's text only).** Corrected template, VERBATIM:

> {{plan:entity_name}} also recorded {{plan:secondary_activity_count_phrase}} beyond the assessed activity: {{plan:secondary_activity_list}}. {{cite:PINPOINT_7156A}} permits a single risk assessment to cover more than one processing activity only for a comparable set — “a set of similar processing activities that present similar risks to consumers’ privacy.” On the record as submitted, the comparison stands as follows: {{plan:secondary_divergence_clause}} This assessment addresses the assessed activity only. Whether any additional use falls within a comparable set with the assessed activity, or requires its own assessment, is a determination reserved to the Company and its counsel.

The quoted definitional sentence uses the corpus row's own typographic quote characters (U+201C / U+201D, and U+2019 in "consumers’"). Reserved framing is unchanged and strengthened: the tool states the rule, reproduces the customer's own comparison, and reserves the determination.

**UNCHANGED.** The intake divergence DIMENSIONS (data / purpose / systems / people / risks) stand as-is — they are the customer's own structured comparison, not a statement of the standard. No composer logic, slot, registry, gate, quota, or grader change. Template stamp bumped to `pass2-templates-2026-07-30-item276-rider-7156a-standard`.

**SPEC-OF-TEST CHANGE (deliberate).** `item276-primary-subject.test.ts` §3 now asserts (i) the rendered segmentation item contains the definitional sentence verbatim with corpus typography, and (ii) it does NOT contain the example-derived "the same personal information, the same purpose" enumeration — a permanent pin against re-introducing example facts as the rule.

**VERIFICATION.** `deno test` on `item276-primary-subject.test.ts` + `content/content.test.ts` + `waveb.test.ts` → **31 passed | 2 failed**; the 2 are the pre-existing stale template-catalogue pins already inventoried (`content.test.ts:35`, `waveb.test.ts:93`). All 5 Item-276 tests pass.

**DEPLOY.** `replay-cppa-risk-harness` ONLY. No harness invocation.
