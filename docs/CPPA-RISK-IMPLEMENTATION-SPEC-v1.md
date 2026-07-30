# CPPA-RISK IMPLEMENTATION SPEC v1 — IN-REPO SPEC OF RECORD

**Instantiated:** 2026-07-30 (Item 277). **Governs over code.**

## PROVENANCE NOTE (read first)

The Item-277 dispatch directed that §2R be appended to `docs/CPPA-RISK-IMPLEMENTATION-SPEC-v1.md`. **That file did not exist in the repository** at the time of this turn (verified: `docs/` contained only `pipeline-state.md`, `product-improvement-register.md`, `quality-batch-learnings.md`, `analysis/`, `courier/`, `design/`, `e2e/`, `incidents/`). The §-numbering the Track-2 dispatches use (§3 model contract, §6 guard lifecycle, §7.1 replay harness) is the controller-held spec's numbering; the ledger quotes it directly (e.g. `docs/pipeline-state.md:6309`, Item 261: «SPEC §6 — "every guard ships OBSERVE-FIRST against a regression corpus of real prior outputs; promotion to enforce requires ~zero observed false positives."»).

This file is therefore created as the **in-repo spec of record** so that §2R has a governing home and cannot drift. It carries the amendment only; the pre-existing in-repo architecture text remains in `docs/design/LEGAL-TEST-PIPELINE.md` (LTP: Derive → Guide → Render → Verify), which §2R amends by reference. Where this document and any code disagree, this document governs.

**Anchor map (double-check clause — cited by line, re-read before drafting):**

| Dispatch reference | In-repo anchor | Line |
|---|---|---|
| §2 primary targets | `docs/design/LEGAL-TEST-PIPELINE.md` — "## 2. PRIMARY TARGETS (define §5 success)" | 43–50 |
| Pass-2 rendering contract (§2R's hook point) | same — "## 4. Pass-2: Rendering" / "### 4.1 Rendering contract" | 288–302 |
| Pass-2 prohibitions | same — "### 4.2 What Pass-2 can NOT do" | 302–312 |
| §5 success criteria | same — "## 5. Success Criteria (§2 primary targets)" | 313–324 |
| §6 (in-repo) surface audit | same — "## 6. Surface Audit" | 325–336 |
| §6 (controller spec) guard-lifecycle / observe-first law | quoted at `docs/pipeline-state.md:6309` (Item 261) | 6309 |
| Atomic-token invariant | LEGAL-TEST-PIPELINE.md §4.1(6) | 300 |
| No-self-contradiction invariant | LEGAL-TEST-PIPELINE.md §4.1(7) | 301 |

**§2R hooks in at LEGAL-TEST-PIPELINE.md §4 (line 288)**: it does not replace §4; it adds a second, bounded rendering mode downstream of the same locked plan, with §4's deterministic renderer retained verbatim as the fallback.

---

# §2R — BOUNDED PROSE PASS (PASS-2R)

## §2R.0 GOVERNING CLAUSE — CEO CAVEAT (VERBATIM, BINDING)

> "The document is a narrative, a guide, a useful tool"

with:

> "1. an overview of the CUSTOMER first, then the factors of assessment, then the key facts to be assessed, all in the initial section. 2. Required analysis, with reasoning constrained to the issues presented by the facts. 3. Identification of missing information, if any, and next steps. and 4. a clear conclusion that tells the user the result of the assessment - and how it could be changed if additional or different information were to be added."

Every clause below is subordinate to this caveat. Where a rule in this section would produce a document that is not a narrative, a guide, and a useful tool, the caveat governs and the rule is defective.

## §2R.1 PIPELINE (deliverable (a))

1. **Pass 1 — unchanged.** Derivation produces the `RenderPlan`: intake ledger with verbatim spans and polarity, factor rows with `present_in_intake` + `weight_note`, gate rules, bound `proposition → pinpoint` pairs, the primary activity and secondary activities (Items 275/276), and the computed verdict.
2. **PLAN LOCK.** On successful Pass-1 validation the plan is **frozen**. Pass-2R receives a deep-frozen copy. No 2R output may write back to the plan. A plan mutation attempt is a hard reject.
3. **Pass 2R — NEW.** One bounded call that writes the narrative prose of the four parts (§2R.2) from the locked plan.
4. **Pass 2 — retained, unmodified, as WRITE-AROUND FALLBACK.** The deterministic composer/assembler chain (`_shared/ltp/section-composers/`, `pass2-assembler.ts`, `pass2-templates.ts`) stays fully intact and continues to produce a complete shippable document for **every** run.
5. **FALLBACK LAW (absolute).** Any 2R failure — validator reject after the retry budget, timeout, budget exhaustion, transport error, malformed output, empty output — ships the deterministic Pass-2 document. **Never a blank document, never a partial document, never a mixed document.** Selection is all-or-nothing at document granularity: 2R output ships in full or not at all. Section-level splicing of 2R prose into a deterministic document is prohibited (it would defeat the four-part structure check and the verdict-consistency check).
6. **ORDER OF OPERATIONS.** Pass 2 (deterministic) runs FIRST and its output is persisted as the shipping candidate; Pass 2R runs after and, only on full validator pass under enforce mode, replaces it. This preserves PERSIST-FIRST (LTP §30.3) — the clock budget can expire mid-2R without losing a document.

## §2R.2 DOCUMENT STRUCTURE — THE FOUR CEO PARTS (deliverable (b))

The document is FOUR parts, in order. The existing section registry is re-homed under them; no registry key is invented and none is silently dropped.

**PART 1 — THE INITIAL SECTION (customer → factors → key facts).** In this order:
1. **Customer overview** — who the customer is, in prose, from intake facts only: entity name, sector, scale bands, and the **primary activity assessed** with its purpose (Item 276 subject law). This is the reader's orientation, not a recital of statutes.
2. **The assessment factors** — what this assessment weighs, named in plain terms.
3. **The key facts to be assessed** — the record's operative facts, drawn from the intake ledger.
   *Registry mapping:* `opening_summary`, `executive_summary`, `assessment_summary`, `scope_and_triggers` / `scope_confirmation` (including the § 7156(a) secondary-segmentation item), `processing_narrative`.

**PART 2 — REQUIRED ANALYSIS.** Reasoning **constrained to the issues the facts present**. Engaged triggers are analysed; **non-engaged triggers are dismissed in one clause** and never expanded into boilerplate recitation of inapplicable law. Benefits, negative impacts, safeguards, and the weighing discussion live here.
   *Registry mapping:* `risk_assessment_by_activity`, `record_sufficiency` (analytic portion). **(`exception_analysis` re-homed to Part 4 — see the §2R.2 AMENDMENT below, Item 287.)**

**PART 3 — MISSING INFORMATION + NEXT STEPS.** What the record does not say, and the concrete steps that follow — including the § 7156(a) unresolved-comparison asks from Item 276. Every ask is actionable and names the specific missing item; "consult counsel" alone is not a next step.
   *Registry mapping:* `information_needed`, `strengthen_items`, `priority_actions`, `next_steps`, `submission_summary` (deadline/filing content).

**PART 4 — CONCLUSION: RESULT + CONDITIONS OF CHANGE.** States the **result of the assessment** in plain terms, then a **sensitivity statement**: which different or additional facts would flip or soften the result. The sensitivity statement is derived from the plan's factor margins — the factors nearest the decision boundary and the factors recorded absent — and **may not invent thresholds, scores, or numeric tipping points**.
   *Registry mapping:* the closing/verdict surface plus the standing disclaimer, **plus `exception_analysis` (Item 287 amendment)**.

Ordering, presence of all four parts, and part-to-registry coverage are checked by the section-structure validator (§2R.3).

### §2R.2 AMENDMENT — `exception_analysis` RE-HOMES TO PART 4 (Item 287, 2026-07-30)

**Change.** `exception_analysis` moves from Part 2 to Part 4 in the re-homing map (`PASS2R_PART_HOME` in `_shared/ltp/pass2r-validators.ts`) and in the `section_structure` validator's expectation. Non-material: the four-part law itself is unchanged, and no registry key is added or dropped.

**Evidence.** `exception_analysis:part_4` fired on EVERY validator reject across Step-0a batches 1R and 2. The model was reading the narrative correctly; the map was wrong.

**Four-lens record (unanimous).**
- **LEGAL** — exception discussion belongs with the conclusion's conditionality: an exception is a condition under which the result differs.
- **CS** — single-map edit; the validator reads the same map, so no drift is possible between emitter expectation and check.
- **PROMPT** — removes a systematic false structure signal that was polluting retry feedback on every attempt.
- **PROSE** — Part 4 is where a reader expects "unless / except".

**Not amended.** The Part-4 homings observed for `processing_narrative`, `opening_summary` and `risk_assessment_by_activity` in doc `278d0608` are NOT map errors; those expectations stand and remain a structure-discipline watch.

## §2R.3 NO-NEW-FACTS CONTRACT (deliverable (c))

**Rule.** Every entity name, number, date, statute pinpoint, and factual assertion in 2R output must trace to the **locked plan** or the **pinned corpus**. 2R contributes reasoning and connective prose — never a new fact.

Validators (all deterministic, all post-render):

| Validator | Rejects |
|---|---|
| **Citation whitelist** | any `§`/`Art.`/`Sec.`/pinpoint form not carried by the locked plan; any citation typed by the model outside a substituted span (LTP §4.1(2), §4.2) |
| **Numeric / date whitelist** | any number or date not present in the plan's ledger, factor rows, or the pinned deadline registry |
| **Entity whitelist** | any entity, product, vendor, person, or role name not in the plan; also enforces the Item-273 owner-slot PII rule (no personal names in owner slots) |
| **Verdict consistency** | prose whose stated conclusion is not the plan's verdict (§2R.4) |
| **Section structure** | the four parts absent, out of order, or a registry key orphaned from every part |
| **Atomic-token** | a split or garbled substituted span (LTP §4.1(6), line 300) |
| **No-self-contradiction** | a Part-3 request for information the document already states (LTP §4.1(7), line 301) |

**LIFECYCLE — OBSERVE-FIRST (SPEC §6, quoted at `docs/pipeline-state.md:6309`).** Every validator above ships **observe-first** against a regression corpus of real prior outputs; promotion to enforce requires ~zero observed false positives, calibrated on replay batches. **While any validator is observing, the deterministic Pass-2 document is what ships** — 2R output in observe mode is telemetry, not product. This is the Item-261 rule applied prospectively so 2R can never repeat the grounded-screen mistake of enforcing uncalibrated.

## §2R.4 VERDICT LAW (deliverable (d) — Issue 10)

1. The verdict is computed **deterministically upstream** and is an **INPUT** to 2R.
2. Prose may **explain** the weighing. It may never derive, re-derive, qualify away, or alter the verdict.
3. **Firm negative verdicts may not be justified by category counts.** "More risk factors than benefit factors" is not reasoning. A firm negative must articulate the **colorable countervailing considerations** and say why they do not carry — the Item-273 balance-verdict guard, restated as a prose obligation.
4. **Close outcomes render hedged and reserved to counsel.** Closeness is read off the plan's margin, not judged by the model.
5. Conflict between prose and plan verdict = verdict-consistency reject → retry → fallback.

## §2R.5 REGISTER (deliverable (e))

- Plain professional prose. **No scores, decimals, percentages, confidence values, or internal metric names** in customer-visible text (no "presence rate", "factor score", "closeness", template ids, slot names).
- **No markdown artifacts** in customer text: no `**`, `##`, backticks, bullet glyphs typed into prose.
- **Mid-word truncation banned.** Hard length limits cut at a **sentence boundary** or the output is rejected and re-rendered; never mid-word, never mid-token (LTP §4.1(6)).
- **Acronym casing law:** never lower-case the first letter of an acronym — "ADMT" never becomes "aDMT"; sentence-initial rewrites must restructure rather than case-fold.
- **Reserved-framing law:** § 7156 comparable-set determinations, and every other counsel-reserved determination, are stated as reserved to the Company and its counsel. The tool states the standard and the record; it never green-lights.
- **FSOR / source-boilerplate lines are banned from customer surfaces** (internal provenance stays internal).
- Standing disclaimer unchanged: "This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance."

## §2R.6 MODEL + BUDGET (deliverable (f))

- **Model:** `claude-sonnet-4-6` via the shared Anthropic client (same-model ruling, PRE-WAVED-EMITTER-FIXES-2026-07-27).
- **Calls:** exactly **one 2R call per document**, plus at most **2 retries** on validator reject (3 model calls worst case).
- **Budget:** output cap 6,000 tokens per call; wall-clock ceiling 90 s per attempt and **180 s for the whole 2R stage**, inside the released spend envelope. The 2R stage is subordinate to the LTP §30 clock budget: if the generator's remaining budget is under the 2R stage ceiling, 2R is **skipped** and the deterministic document ships.
- **Telemetry mirrors Pass-1:** `attempts`, `latency_ms` per attempt, per-validator outcome counts, `write_around: bool`, `shipped_surface: "2R" | "deterministic"`, plus the observe-mode reject inventory.

## §2R.7 ACCEPTANCE (deliverable (g))

GTM materiality register **v1.2 gates apply unchanged** — 2R output is graded by exactly the same register as deterministic output; no 2R-specific leniency. Prose-defect classes from the CEO read map as follows:

| CEO-read defect | Named validator | GTM register class |
|---|---|---|
| Mid-word / mid-token truncation | Atomic-token + sentence-boundary length rule (§2R.5) | truncated_output |
| Boilerplate recitation of inapplicable law | Section-structure Part-2 constraint (§2R.2) | non_responsive_analysis |
| `**` and other markdown literals in prose | Register screen (§2R.5) | formatting_artifact |
| "aDMT" and acronym case-folding | Acronym casing law (§2R.5) | misstated_term |
| Owner-slot leaks / personal names | Entity whitelist + Item-273 owner-slot PII rule (§2R.3) | pii_owner_name |
| Duplicated sections / cloned rationale | Section-structure coverage check (§2R.3) | section_cross_duplication |
| Activity-count contradiction | Verdict-consistency + numeric whitelist (§2R.3/.4) | activity_count_contradiction |
| Example facts stated as the legal standard | Citation whitelist (plan-carried pinpoints only) | registry_corpus_drift |
| Count-driven firm negative | Verdict law §2R.4(3) | unsupported_verdict |

**Acceptance bar for enforce promotion:** two consecutive replay batches with zero validator false positives, zero new GTM material classes versus the deterministic document on the same docs, and no regression in golden-shape presence.

## §2R.8 CONTRADICTIONS WITH EXISTING SPEC TEXT — LISTED AND RESOLVED

1. **LTP §4 ("Pass-2 is a template-bounded call", line 290) vs. 2R free prose.** *Resolution:* §4 continues to govern the **deterministic renderer**, which remains the shipping surface until 2R clears enforce promotion. 2R is a distinct, additive mode bound by the §2R.3 whitelists rather than by template slot enums. Neither mode may type a citation (§4.1(2) survives intact for both).
2. **LTP §4.1(3) intake-value channel — "free-typed intake values = post-render hard reject" (line 297) vs. 2R prose that must read naturally.** *Resolution:* the substance of the rule survives as the **entity/numeric/date whitelists**: a 2R-typed intake value is permitted only when it matches a plan ledger `verbatim_value` exactly; any other typed value is a hard reject. The mechanism changes (whitelist instead of token substitution); the guarantee does not.
3. **LTP §4.2 ("Emit any proposition ID not present in `render_plan.render_order`", line ~307) vs. 2R's four-part re-homing.** *Resolution:* 2R may **reorder** plan content into the four parts but may not **introduce** propositions. Coverage, not order, is the invariant; the section-structure validator enforces it.
4. **In-repo §6 is "Surface Audit"; the dispatch's "§6 lifecycle law" is the controller spec's guard-lifecycle clause.** *Resolution:* recorded in the anchor map above. §2R.3 quotes the lifecycle law from its ledger-verified source (`docs/pipeline-state.md:6309`) rather than from an in-repo §6 that says something else.
5. **§5 success criteria (line 313) are stated for the deterministic pilot.** *Resolution:* they bind 2R unchanged, plus the §2R.7 acceptance bar. 2R may not be promoted on prose quality while regressing any §5 target.
6. **Fallback vs. LTP §28.4 ("no fallback seat for Engine A's composer", line 689).** *Resolution:* no conflict. The 2R fallback is **Engine B's own deterministic Pass-2**, not Engine A. Engine A remains without a fallback seat.

**Cross-reference:** `docs/courier/PROSE-CONTRACT-2026-07-30.md` (signed content contract, four-lens sign-off, non-normative exemplar skeleton).
