# ITEM 283 — FOUR-LENS COLD READ OF THE STEP-0a REPLAY DOCUMENTS

**Date:** 2026-07-30 · **Item:** 283 · **Disposition:** RECORD ONLY (docs-only)
**Authority:** CEO directive 2026-07-30 — "review the PDFs from a cold, first-time-reviewer perspective; determine next steps; goal: 100% legally correct and a very good read — a solid story built on the facts and analysis."
**Turn discipline:** no `.ts` change, no deploy, no harness invocation, no DB write. The diff for this turn contains ONLY this file and `docs/pipeline-state.md`.

---

## 1. WHAT WAS READ

Batch **1R** (jobs labelled "Step 0a — Pass-2R calibration batch 1R"): **3 docs completed**, **7 reaped**.

Completed doc ids (verified): **`1cda30f6`**, **`2391b49a`**, **`278d0608`**. (The dispatch's leading id `0754dbc8` is the batch/job handle, not a completed doc.)

All three Pass-2R prose attempts ended `validator_reject`. Rejected prose is **NOT persisted** — the all-or-nothing swap means the shipped surface stayed deterministic. The cold read was therefore performed by the four-lens panel on the **deterministic `assembled_report` reading surfaces** (the shipped surface) plus the 2R **reject evidence** (`replay_harness_results.reject_reason`).

Every finding below carries its doc_id.

---

## 2. FINDINGS (each unanimous)

### F1 — VERDICT-CONTRADICTION SEAM (doc `278d0608`; LEGAL-BLOCKING)
`executive_summary` states: "the information provided is not sufficient to complete the required benefit-and-impact analysis." The same document's `assessment_summary` and `risk_assessment_by_activity` state: "The assessment record is complete against the documentation elements of 11 CCR § 7152(a)" and "the record supports the conclusion that the benefits, as documented, outweigh the identified negative impacts."

Docs `1cda30f6` and `2391b49a` are internally consistent (both say not-yet-complete). Two composers therefore compute the **completeness predicate differently** and diverge on this particular record state. The 2R `verdict_consistency` rejection (`conflicting_verdict_stated`, evidence "Low") is best read as a **TRUE POSITIVE** downstream of this seam, not as a validator defect.

### F2 — FIRM FAVORABLE VERDICT ON AN INCOMPLETE RECORD (doc `278d0608`)
The benefits-outweigh conclusion issues while `information_needed` lists § 7152(a)(5) categories, (a)(6) safeguards, and the (a)(7) initiation decision as missing, and while safeguard sufficiency is expressly reserved to counsel. The incentive-balance and reserved-framing laws bind on the **favorable** side too: the tool never green-lights on an incomplete record.

### F3 — MID-WORD TRUNCATION IN SHIPPED FACTOR NOTES (fragment law; doc `278d0608`)
`weight_notes` clip mid-word on the customer surface — "commercial benefit from t", "limiting data exposur", "this personal i", "dark-patter" — in both the factor table and the RABA narrative. The signature is a hard character slice. **Fill-or-omit:** the full value or omission with telemetry, never a fragment.

### F4 — TEMPLATE DEFECTS IN `priority_actions` (doc `278d0608`)
Duplicated phrase: "to address the potential negative impact category the following potential negative impact categories:" and "to document the safeguard the following safeguards:". Owner misassignment: the § 7152(a)(7) initiation-decision action names the accountable business owner in its own text yet assigns "Owner: qualified legal counsel" — the initiation decision belongs to the business.

### F5 — PART 3/4 STARVATION (docs `1cda30f6`, `2391b49a`, `278d0608`)
`next_steps` is NULL on two of the three docs (golden_shape flagged it) and a single trivial item on the third, while `information_needed` is rich. The CEO's four-part narrative requires Part 3 (missing information + next steps) and Part 4 (conclusion + how it could change) to be **substantive**.

### F6 — STORY DEFICIT (prose lens; cold-reader experience; all three docs)
- No customer-overview opening in the reading surface — the known-empty `T.risk.processing_narrative` (§7.5 inherited item) is exactly the missing Part-1/Part-2 connective tissue.
- The FSOR sentence "The Agency's Final Statement of Reasons addresses this consideration: …" repeats verbatim after every factor, some at an imprecise pinpoint ("11 CCR § 7152" bare).
- The executive summary's cross-reference "set out under Items for your review" is a **UI label** that dangles in a PDF.
- The § 7121(a) cyber-audit schedule enters with a bare "Separately," — an unexplained detour to a first-time reader.

### F7 — 2R `entity_whitelist` = EXTRACTION-FP CLASS CONFIRMED (doc `278d0608`)
Reject evidence: `["Ltd","SaaS","Cascade","Stripe","SendGrid"]`. "Ltd" is a corporate suffix; "SaaS" is a generic industry term; "Cascade" is the customer's own name split by tokenization; AWS/Stripe/SendGrid are intake-carried vendors. The whitelist builder must **include intake-ledger-carried entity values** and must **not flag suffix/generic tokens**.

### F8 — `section_structure` REJECTIONS: PROVISIONALLY TRUE POSITIVES
`registry_key_wrong_part: exception_analysis:part_4` and the cross-duplication rejection are provisionally true positives; **re-judge after F1/F5 fixes**, since both may resolve once the completeness predicate and the Part-3/4 emitters land.

### ALSO RECORDED
Doc `2391b49a`: GTM = **block** on `note_specificity:fossil_no_record_evidence:neg.c.impaired_control`. This is the Item-269 fossil guard functioning **as designed**. Goes to the presence/fossil watch list; **no new work this turn**.

---

## 3. NEXT STEPS (four-lens unanimous; execution as separate dispatches)

**N1 — Item 284 (deterministic fix turn).**
- One **shared completeness predicate** consumed by the exec-summary, assessment-summary, and RABA composers.
- When `information_needed` is non-empty, the conclusion states the **provisional posture** — what the record AS DOCUMENTED supports, expressly conditioned on the missing elements — and never a firm favorable verdict.
- F3: fill-or-omit; no character slice.
- F4: phrase de-duplication + owner reassignment.
- F5: `next_steps` emitter deriving Part-3/Part-4 content from `information_needed` plus present-confirmations.
- All of the above with tests.

**N2 — Item 285.** Fix the 2R entity-whitelist builder per F7, then re-run the 10-doc batch.

**N3.** The Part-1 story opening rides the `processing_narrative` re-homing turn plus Pass-2R once N1/N2 land — the narrative is what 2R exists to deliver.

**N4.** 20-doc run, then 4 side-by-side PDFs to the CEO at `/admin/replay-review`.

---

## 4. FOUR-LENS SIGN-OFF

- **LEGAL.** F1 and F2 are blocking: a firm favorable verdict on an admittedly incomplete record misstates what was assessed. Reserved determinations stay reserved on both sides of the ledger.
- **CUSTOMER-SUCCESS.** F3, F4, F5 are what a cold reader notices first — fragments, duplicated stock phrases, and an empty "what do I do next" section undercut the tool's usefulness more than any citation subtlety.
- **PROMPT.** F7 is an input-construction defect, not a model defect; the 2R rejections in batch 1R are mostly the validators working. No prompt variable moves until N1 lands.
- **PROSE.** F6 is the gap between a compliant document and a good read. The four-part narrative needs its Part-1 opening and its Part-3/4 payoff; both are structural, not stylistic.
