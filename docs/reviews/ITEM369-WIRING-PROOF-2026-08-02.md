# Item 369 — Wiring Item 363 into production, PHASE 1 + 2 (build & prove, NO flip)

Date: 2026-08-02. Scope: cppa-risk only. **Nothing was flipped.** No route, cron,
webhook, or default behaviour changed. `generateCppaRiskReport` is untouched;
`run-cppa-risk-assessment-v2` still serves the live LTP/assembler payload.

---

## 0. Context verification (verified, not assumed)

| Claim | Verdict |
| --- | --- |
| Live path `generateCppaRiskReport` → `derivePlan` → `assembleReport` (pass2-templates) → optional Pass-2R | **Confirmed** (`_shared/ltp/generate-cppa-risk.ts`, Item 357) |
| Item 363 path `composeCppaRisk` + `renderDocumentFromPlan` over the approved `DocumentPlan`/`FrameSet` | **Confirmed** (`_shared/prose/plans/cppa-risk.compose.ts`, `_shared/prose/plan-render.ts`) |
| That path is reachable only from `scripts/plans/item363-render.ts` | **Confirmed** — before this item, no deployed function imported `composeCppaRisk`. The `approved:true` flag in `prose_document_plans`/`prose_frame_sets` was read by nothing on any live path. |
| Shape mismatch between the 9 sections and the persisted contract | **Confirmed** — see §1 |

`library/prose/load.ts` is file-backed and its JSON reports the authored
approval state; the DB-backed `library-source.ts` is the runtime loader. The
preview entrypoint takes an injectable `librarySource` so the offline harness
uses the files and a future live path would use the rows.

---

## 1. SHAPE-MAPPING DECISION — **versioned additive contract (v2)**, not a same-contract swap

This is the headline finding. A 1:1 mapping onto
`_shared/report-contracts/cppa-risk-shape.ts` (v1) is **not honestly possible**.

Section-by-section:

| Item 363 section | v1 contract disposition |
| --- | --- |
| `executive_lead` | (a) replaces `opening_summary` |
| `record_card` | **(c) no home in v1.** It is labelled record data (label/value pairs), not a narrative key. Flattening it into a prose key would reintroduce exactly the sentence-shaped field dumps Item 347 rule 2 outlawed. |
| `determination` | (a) replaces `executive_summary` |
| `why_required` | (a) replaces `scope_and_triggers` (v1 accepts array or object; overlaid as prose) |
| `risk_analysis` | **(c) conflicts.** v1's `risk_assessment_by_activity` is a *per-activity array*; Item 363's `risk_analysis` is a single record-level analysis. Overwriting the array with a string would break the v4/LTP readers and the surface contract's declared type. |
| `corpus_analogies` | **(c) no home in v1.** `eu_persuasive_authority` is a structured bag, not rendered prose. |
| `general_conclusions` | (b) closest is `assessment_summary.narrative`, but v1's bag is assembler-derived; overlaying loses the distinction between determination and synthesis. |
| `record_completeness_summary` | (a) replaces `record_sufficiency` |
| `what_to_do_next` | (a) replaces `priority_actions` (v1 array; overlaid as prose) |

Three sections (`record_card`, `risk_analysis`, `corpus_analogies`) have **no
lossless v1 home**, and one (`general_conclusions`) is lossy. Per the task's
"do not force a lossy mapping to avoid a version bump", the decision is:

**`CPPA_RISK_PROSE9_SHAPE_VERSION = "cppa-risk-shape@2026-08-02-item369-prose9"`,
carried in an ADDITIVE `report.prose_document` envelope**
(`_shared/report-contracts/cppa-risk-prose9.ts`).

- The envelope is the lossless carrier: all nine sections, in plan order, with
  their text, span table, degraded flag, and `record_card` rows.
- `applyProse9Mapping()` additionally overlays the five honestly-mappable v1
  keys (`opening_summary`, `executive_summary`, `scope_and_triggers`,
  `record_sufficiency`, `priority_actions`) so v1-only consumers degrade
  gracefully rather than blankly.
- Every other v1 key (`submission_summary`, `next_steps`, `information_needed`,
  `risk_level`, `citation_ledger`, `_meta`, …) is carried over untouched from
  the live baseline payload.
- `hasProse9Document(report)` is THE single discriminator. The live path never
  sets `prose_document`, so live PDF and viewer output are unaffected.

**Consequence for the eventual flip:** it is a versioned contract migration,
not a drop-in swap. The flip item must decide the fate of
`risk_assessment_by_activity` and `eu_persuasive_authority` explicitly.

---

## 2. What was built (Phase 1)

| File | Role |
| --- | --- |
| `supabase/functions/_shared/report-contracts/cppa-risk-prose9.ts` | v2 envelope, `CPPA_RISK_PROSE9_SHAPE_VERSION`, `hasProse9Document`, `applyProse9Mapping` |
| `supabase/functions/_shared/ltp/generate-cppa-risk-item363-preview.ts` | `generateCppaRiskReportItem363Preview` — **not reachable from any route, cron or webhook**. Reuses the live `generateCppaRiskReport` for the baseline payload and the existing analytics/needs/EU-corpus call sites (REUSE LAW), then composes + renders the nine sections. |
| `supabase/functions/generate-report-pdf/prose9-html.ts` | Prose-9 PDF renderer, extracted so the proof harness exercises the exporter's real code |
| `supabase/functions/generate-report-pdf/index.ts` | Dispatch branch on `hasProse9Document`, ahead of `isLtpRiskShape` |
| `src/lib/cppa-risk-shape.ts` | `hasProse9Document` mirror + `"prose9"` added to `describeCppaRiskShape` |
| `src/components/cppa/RiskAssessmentReportProse9.tsx` | Viewer renderer; `record_card` renders as a `<dl>`, never as sentences; explicit fail-loud card if the envelope has no renderable section |
| `src/components/report-bodies/CPPARiskReportBody.tsx` | `prose9` branch, ahead of `ltp` |

---

## 3. Phase 2 evidence

Harnesses: `scripts/item369/prove.ts` (payloads + lints),
`scripts/item369/pdf-proof.ts` (PDF), `src/test/item369-prose9-viewer.test.tsx`
(viewer). Artifacts under `docs/reviews/item369/`.

### 3.1 Persisted-shape + lint battery — `docs/reviews/item369/lint-results.md`

Three fixtures: item350 `perfect`, item350 `messy`, `risk-saas-clean-tuning`.
All three produced a valid envelope (9/9 sections, plan order, 17–19 tracked
spans), all overlay keys landed, all carried-over keys survived, and the live
baseline payload carried no `prose_document` on every run.

Lint battery (15 style rules + Item 347 render lint + connective-edge audit)
run on the **persisted sections**, not a markdown dump:

| Fixture | Result |
| --- | --- |
| perfect (item350) | **all clean** |
| risk-saas-clean-tuning | **all clean** (matches Item 363 acceptance) |
| messy (item350) | **2 rule classes FAIL** — see §3.4 |

### 3.2 PDF evidence — `docs/reviews/item369/pdf-evidence.md`, `pdf-*.html`

All three fixtures: body not blank (7.8k–9.4k chars of extracted text), all
nine `data-section-id` sections present, no U+E000/U+E001 leakage, no raw JSON
or `undefined`, record card rendered as `<table class="record-card">`,
disclaimer present. **ALL CHECKS PASSED.**

### 3.3 Viewer evidence (the R6 check) — `src/test/item369-prose9-viewer.test.tsx`

`4 passed / 0 failed`. For each fixture the real `CPPARiskReportBody` dispatch
renders >1500 chars of DOM text, all nine sections reach the DOM, no sentinels
or raw JSON leak, and `record_card` renders as a `<dl>`. The fourth test pins
the live-shape regression: an LTP payload still resolves to `shape: "ltp"` and
never renders the prose-9 component. This is the check Item 363's original
acceptance never ran and that R6 proves is necessary.

### 3.4 OPEN DEFECT found by this proof — degraded-record prose (messy fixture)

Two rule classes fail, and only on the incomplete record:

1. `banned_record_phrase` — `record_card` emits the placeholder
   `"not stated on the record"` (3 hits). Item 363 banned "on the record"
   phrasing; the missing-value placeholder was never updated.
2. `attribution_missing` — `risk_analysis` carries three record values
   (`necessity_analysis[].element` ×2, `safeguard_map[].safeguard`) that are not
   governed by an attribution verb, because the degraded branch substitutes a
   remediation instruction where an attributed clause is expected.

This is a **genuine Item 363 defect on degraded records**, surfaced only
because this item lints the persisted shape on the messy fixture. It is *not*
caused by the wiring. Per the task's build-and-prove scope it is reported, not
fixed. **It must be fixed before any flip** — a customer with an incomplete
record would receive prose that violates two of the accepted style rules.

### 3.5 Graded batch — NOT RUN, blocked

`grade-single-assessment` (and the `run-quality-batch` path used for runs
#183–187) is admin-gated: it validates the caller's JWT and calls
`has_role(_user_id,'admin')` (`grade-single-assessment/index.ts:255-270`). No
admin session is available to this environment, and the alternative — routing
the preview entrypoint through the deployed harness — is explicitly out of
scope for this item. **No score against the #187 = 73.35/89 baseline is
reported.** This is the one Phase-2 deliverable not completed; it needs either
an admin session or an explicit authorization to deploy the preview entrypoint
behind an admin-only shadow route.

---

## 4. Regression

- Live PDF path: unaffected. The prose-9 branch is entered only when
  `hasProse9Document` is true; the renderer moved to its own module with
  identical body, and no other exporter code changed.
- Live viewer path: unaffected; pinned by the fourth viewer test.
- `generateCppaRiskReport`: not modified.

---

## 5. Recommendation for the flip item (not authorized here)

1. Fix §3.4 (degraded-record placeholder + attribution) and re-run this proof.
2. Obtain the graded score (§3.5).
3. Decide explicitly what happens to `risk_assessment_by_activity` and
   `eu_persuasive_authority` under the v2 contract.
4. Only then consider routing.
