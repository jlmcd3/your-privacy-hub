# ITEM 241.2 — GOLDEN-SHAPE CONTENT COURIER (cppa-risk)

**Date.** 2026-07-28. **Scope.** CONTENT-AUTHORING ONLY. No code, no wiring, no deploy. Every sentence below is proposed verbatim for CEO sign-off; 241.3 wires the approved text through `_shared/legal-test/cppa-risk-conclusions.ts`, the deadline registry, `_shared/ltp/content/pass2-templates.ts`, and the four deep-section composers in `_shared/ltp/section-composers/cppa-risk.ts`. All slot laws, provenance, per-proposition citation binding (CP4), coherence invariant (CP3/CP5), shape contract (CP3), customer-first opener law (CP5-ADDENDUM), and the Golden-Shape rendering contract (Item 241, spec mirror in `docs/design/GOLDEN-SHAPE-cppa-risk.md`) are UNCHANGED.

**Review orientation.** Sections are grouped: (1) `compliance_guidance` per registry row, (2) `deadline_basis` registry population + prospective/ongoing/one-per-action rule text, (3) CP5 §3.2 section-opener template texts, (4) golden-register template rewrites for the deep sections. Each item is presented **CURRENT → PROPOSED** so review is a straight diff. Registry-row ids are the canonical ids in `cppa-risk-conclusions.ts`.

**Anatomy-of-a-compliant-answer clause (golden register — used as the compositional check for every `compliance_guidance` sentence below):** "A specific benefits statement names the concrete outcome, the population that receives it, and the causal connection to the processing." Every `compliance_guidance` sentence proposed here names (i) the concrete element the regulation requires, (ii) the population or artifact it must attach to, and (iii) the causal or evidentiary tie back to the processing.

**Engineering rider — recorded for 241.3, not for this content pass.** Run #178 shipped an insufficiency finding on a documentation-complete record because `insufficientRecord` counts the three Type-J documentation gates (`G.documentation.initiation_decision`, `G.documentation.purpose_specificity`, `G.documentation.safeguard_sufficiency`) as unresolved when they resolve to `not_applicable` awaiting a reserved judgment. Type-J items are reserved decisions, never record gaps. 241.3 must (i) partition `G.documentation.*` into a factual subset (purpose / categories / operational elements / approver) and a judgment subset (initiation / purpose specificity / safeguard sufficiency), (ii) restrict `insufficientRecord` and `aggregateBalance` to the factual subset, and (iii) add a fixture assert that a docs-complete record with three Type-J judgment gates emits a firm mode, never insufficient.

---

## 1. `compliance_guidance` per registry row

Every row below gets a new `compliance_guidance: string` field authored to the anatomy clause. The sentence is the verbatim payload the four-move action template consumes as move (iv) — see §4.5.

### 1.1 Applicability conclusions (Type R, surface = `applicability`)

| id | Anchor | Current `compliance_guidance` | PROPOSED verbatim |
| --- | --- | --- | --- |
| `r.applicability.selling_sharing` | 11 CCR § 7150(b)(1) | *(absent)* | "The business must complete and retain a risk assessment for every processing activity that sells or shares personal information, identifying the personal information involved, the recipients, and the operational purpose the sale or share serves." |
| `r.applicability.sensitive_pi` | 11 CCR § 7150(b)(2) | *(absent)* | "The business must complete and retain a risk assessment for every processing activity that involves sensitive personal information, naming the sensitive-PI categories processed, the consumer population affected, and the operational purpose that justifies processing sensitive data rather than non-sensitive alternatives." |
| `r.applicability.admt_significant_decision` | 11 CCR § 7150(b)(3) | *(absent)* | "The business must complete and retain a risk assessment for every use of automated decisionmaking technology to make a significant decision concerning a consumer, identifying the ADMT deployed, the decision category, the consumer population subject to the decision, and the human-appeal pathway available to that population." |
| `r.applicability.extensive_profiling` | 11 CCR § 7150(b)(4) | *(absent)* | "The business must complete and retain a risk assessment for every use of automated decisionmaking technology for extensive profiling of a consumer, identifying the profiling context (work / education / public-place systematic observation / behavioral advertising), the consumer population profiled, and the observation or inference method producing the profile." |
| `r.applicability.train_admt` | 11 CCR § 7150(b)(5) | *(absent)* | "The business must complete and retain a risk assessment for every processing activity that uses personal information to train automated decisionmaking technology capable of significant decisions, extensive profiling, or physical- or biological-identification profiling, naming the training data source, the consumer population whose data enters training, and the downstream ADMT capability being trained." |

### 1.2 Cohort conclusion (Type R, surface = `deadlines`)

| id | Anchor | PROPOSED verbatim |
| --- | --- | --- |
| `r.cohort.compliance_date` | 11 CCR § 7150(c) | "The business must complete and retain the risk assessment by the compliance date fixed for its processing cohort under § 7150(c), naming the cohort applicable to the processing (pre-existing versus initiated after the operative date) and the specific compliance date the cohort produces." |

### 1.3 Documentation conclusions (Type R, surface = `documentation`)

The four factual documentation conclusions ship a `compliance_guidance` sentence each and, per the engineering rider recorded above, are the ONLY documentation rows the 241.3 predicate reads for record sufficiency.

| id | Anchor | PROPOSED verbatim |
| --- | --- | --- |
| `r.documentation.purpose_present` | 11 CCR § 7152(a)(1) | "The assessment must state, in the assessment record itself, the specific operational purpose of the processing in language concrete enough that a reviewer can distinguish it from adjacent purposes; a generic label such as 'business operations' does not satisfy this element." |
| `r.documentation.categories_present` | 11 CCR § 7152(a)(2) | "The assessment must enumerate, in the assessment record itself, every category of personal information processed (including sensitive-PI subcategories where applicable), tied to the specific operational purpose each category serves." |
| `r.documentation.operational_elements_present` | 11 CCR § 7152(a)(3) | "The assessment must document, in the assessment record itself, the operational elements of the processing — sources of the personal information, recipients or disclosure targets, retention duration, and the number of consumers whose information is processed — so a reviewer can trace the data lifecycle end-to-end." |
| `r.documentation.approver_present` | 11 CCR § 7152(a)(7) | "The assessment must identify, in the assessment record itself, the individuals who reviewed and approved the assessment by name and role, so a reviewer can verify that the approver's authority matches the § 7157(a) certification requirement." |

### 1.4 ADMT conditional conclusion (Type R, surface = `admt`)

| id | Anchor | PROPOSED verbatim |
| --- | --- | --- |
| `r.admt.consequence_gated` | 11 CCR § 7220 | "When the assessment records use of ADMT for a significant decision, the assessment must document the pre-use notice content, the consumer's opt-out or human-appeal pathway, and the operational owner responsible for handling appeals within the § 7220 timeline; this element attaches only when the ADMT applicability trigger is engaged." |

### 1.5 Weighing conclusion (Type W, surface = `balance`)

| id | Anchor | PROPOSED verbatim |
| --- | --- | --- |
| `w.balance.risks_vs_benefits` | 11 CCR § 7152(a)(6) | "The assessment must apply the § 7152(a)(6) balancing test in the assessment record itself, stating the identified benefits, the identified adverse effects and safeguard gaps, and the resulting determination that benefits either do or do not outweigh the risks to consumer privacy; the balancing must reference the specific benefits and adverse-effects entries the record enumerates, not restate them in the abstract." |

### 1.6 Reserved-judgment conclusions (Type J, surface = `judgment`)

Type-J rows carry `compliance_guidance` describing what a compliant reserved judgment looks like when the business (or counsel / external auditor) records it, exactly to make clear these are reserved decisions and not record gaps (see engineering rider).

| id | Anchor | Reserved to | PROPOSED verbatim |
| --- | --- | --- | --- |
| `j.initiation_decision` | 11 CCR § 7152(a)(4) | business | "The business must record a reasoned initiation decision — proceed, proceed with modifications, or do not initiate — attaching the decision to the specific balancing outcome, naming the decisionmaker and the date of decision, and, when proceeding with modifications, listing each modification and the risk it addresses." |
| `j.purpose_specificity_adequacy` | 11 CCR § 7152(a)(1) | legal_counsel | "Counsel must record a reasoned adequacy determination on the stated operational purpose, attaching the determination to the exact purpose language in the record, and identifying any narrowing required for the purpose to satisfy § 7152(a)(1) specificity." |
| `j.safeguard_sufficiency` | 11 CCR § 7152(a)(5) | external_auditor | "The external auditor must record a reasoned sufficiency determination on the safeguards documented, attaching the determination to the specific safeguards enumerated in the record, and identifying any safeguard gap the balancing outcome must weigh under § 7152(a)(6)." |

### 1.7 Gate-level guidance (documentation gates, factual subset)

The four factual documentation gates (`G.documentation.purpose_present`, `G.documentation.categories_present`, `G.documentation.operational_elements_present`, `G.documentation.approver_present`) reuse the `compliance_guidance` of their paired Type-R conclusion verbatim; no separate authoring is required. Judgment-subset gates (`G.documentation.initiation_decision`, `G.documentation.purpose_specificity`, `G.documentation.safeguard_sufficiency`) reuse the paired Type-J `compliance_guidance` verbatim and are excluded from the insufficiency predicate per the engineering rider.

---

## 2. `deadline_basis` registry population

A new registry `_shared/legal-test/cppa-risk-deadlines.ts` (authored in 241.3 from the verbatim content below; no wiring this turn) supplies one row per deadline class. Each action derived from a factor consumes exactly one deadline row via `deadline_basis_id`. The one-deadline-per-action law is restated at the head of the module.

### 2.1 Rule text (verbatim, module-header comment)

> "ONE-DEADLINE-PER-ACTION LAW. Every action emitted by the four-move action template consumes exactly one `deadline_basis` row. If more than one deadline class could apply, the composer selects the earlier of the two and records the loser in `deadline_basis_alt_ref` for telemetry; the customer-facing sentence names only the selected deadline. Actions that have no statutory deadline consume the `ongoing_processing` row and render the 'Immediate (before continuing …)' clause verbatim."

### 2.2 Prospective-marking rule text (verbatim, module-header comment)

> "PROSPECTIVE-MARKING RULE. Deadlines that attach to processing initiated after the operative date render with the prefix 'Prospective —' before the ISO date; deadlines that attach to processing that pre-exists the operative date render with the prefix 'Ongoing —' before the ISO date. The prefix is part of the customer-facing sentence, not decoration, and is set from the cohort resolved by `r.cohort.compliance_date`."

### 2.3 Ongoing-processing rule text (verbatim, module-header comment)

> "ONGOING-PROCESSING RULE. When the record shows the processing is already underway and no statutory deadline extends the compliance date, the action renders 'Immediate (before continuing the processing).' verbatim in place of an ISO date. This clause is the ONLY permissible non-ISO deadline surface."

### 2.4 Deadline rows (verbatim payloads)

| `deadline_basis_id` | Anchor | Class | `deadline_label` (verbatim) | `deadline_sentence` (verbatim, action-tail) |
| --- | --- | --- | --- | --- |
| `d.assessment_record.pre_existing` | 11 CCR § 7155(b) | assessment-record, pre-existing processing | "Ongoing — 2027-12-31 (§ 7155(b))" | "Complete and retain the assessment record by Ongoing — 2027-12-31, the § 7155(b) compliance date for processing that was underway before the operative date." |
| `d.assessment_record.prospective` | 11 CCR § 7155(a) | assessment-record, prospective processing | "Prospective — before initiating the processing (§ 7155(a))" | "Complete and retain the assessment record Prospective — before initiating the processing, as § 7155(a) requires for processing initiated after the operative date." |
| `d.assessment_record.material_change` | 11 CCR § 7155(c) | assessment-record, material change | "Prospective — before implementing the material change (§ 7155(c))" | "Update and retain the assessment record Prospective — before implementing the material change, as § 7155(c) requires when a material change to the processing occurs." |
| `d.admt_pre_use_notice.existing` | 11 CCR § 7220 | ADMT pre-use notice, existing use | "Ongoing — 2027-01-01 (§ 7220)" | "Publish and retain the ADMT pre-use notice by Ongoing — 2027-01-01, the § 7220 compliance date for ADMT already in use." |
| `d.admt_pre_use_notice.prospective` | 11 CCR § 7220 | ADMT pre-use notice, prospective use | "Prospective — before deploying the ADMT (§ 7220)" | "Publish and retain the ADMT pre-use notice Prospective — before deploying the ADMT, as § 7220 requires for ADMT not yet in use." |
| `d.submission.attestation` | 11 CCR § 7157 | annual attestation submission | "Ongoing — annually (§ 7157)" | "Submit the § 7157 attestation Ongoing — annually, on the schedule the Agency prescribes for the business's cohort." |
| `d.ongoing_processing` | (no statutory deadline) | ongoing-processing fallback | "Immediate (before continuing the processing)" | "Address this item Immediate (before continuing the processing), as no statutory deadline extends the compliance date." |

---

## 3. CP5 §3.2 section-opener template texts (final wording)

All openers below are the final customer-first shapes for the five prose-panel targets. Slot variables (`{entity_name}`, `{q4_pi_categories}`, `{i1_processing_purpose}`, `{as_of_date}`, `{balance_outcome_sentence}`, `{aggregateBalance_sentence}`) resolve through the existing composer slot-resolver seam extended in 241.1 (`prong_subject`); 241.3 adds the four remaining slots on the same pattern.

### 3.1 Scope & Triggers

**Current opener (pre-241.1, superseded even before wiring):** "The following § 7150(b) prongs are engaged: …"

**PROPOSED verbatim:**
> "{entity_name}'s processing of {q4_pi_categories} for {i1_processing_purpose} engages the following review prongs. Each is a distinct trigger under 11 CCR § 7150(b): {prong_list_with_individual_pinpoints}."

### 3.2 Balance

**Current opener:** "Under the 11 CCR § 7152 balancing frame, the assessment finds …"

**PROPOSED verbatim:**
> "Weighing {entity_name}'s stated purpose against the risks to consumers whose {q4_pi_categories} is processed, {balance_outcome_sentence}. The 11 CCR § 7152 balancing frame governs this assessment."

### 3.3 Actions / Recommendations

**Current opener:** "The Regulations require the following actions: …"

**PROPOSED verbatim:**
> "Given {customer_fact_clause}, {entity_name} should {action_verb_phrase}. This action is required by {pinpoint}."

`{customer_fact_clause}` is the composer-selected fact that triggered the action — sell/share posture, ADMT posture, sensitive-PI posture, or the specific safeguard gap identified in the record. `{action_verb_phrase}` and `{pinpoint}` are supplied by the four-move template in §4.5.

### 3.4 Compliance Guidance

**Current opener:** the registry sentence rendered without lead-in.

**PROPOSED verbatim:**
> "For {customer_fact_clause}, the regulation requires the following: {compliance_guidance_sentence} ({pinpoint})."

### 3.5 Executive Summary

**Current opener:** "This assessment finds …"

**PROPOSED verbatim:**
> "{entity_name} processes {q4_pi_categories} for {i1_processing_purpose}. This assessment finds {aggregateBalance_sentence}. It is required by {§_7150(b)_pinpoints} and follows 11 CCR § 7152. As of {as_of_date}."

---

## 4. Golden-register template rewrites — deep sections

Depth targets are the top-50 empirical quotas mirrored in `docs/design/GOLDEN-SHAPE-cppa-risk.md` §1. Templates below are the final prose-register wording proposed for 241.3 wiring; each is customer-first per §3, each references registry content by id (never restates it), and each satisfies the anatomy clause.

### 4.1 Four-part rationale assembly (per activity in `risk_assessment_by_activity`; quota ~1,215 chars/activity)

Rendered in strict order — (i) record-status, (ii) colorable-argument, (iii) countervailing-with-enumerated-gaps, (iv) calibrated outcome.

**(i) Record status (verbatim):**
> "The record for this activity is {record_status_clause}. {entity_name} has documented {documented_elements_list} and has not documented {undocumented_elements_list}. This reflects the state of the record before {as_of_date}, not a finding on the merits."

**(ii) Colorable argument (verbatim):**
> "On the record as it stands, {entity_name} has a colorable argument that the processing benefits {beneficiary_population} by {benefit_causal_clause}, and that the safeguards enumerated in the record — {enumerated_safeguards_list} — reduce the identified adverse effects to a level the § 7152(a)(6) balancing frame can weigh."

**(iii) Countervailing with enumerated gaps (verbatim):**
> "Weighing against that argument, the record enumerates the following deficiencies, each with its own pinpoint: {enumerated_deficiencies_block}. Each deficiency identifies a specific element the regulation requires and the compliance_guidance sentence that governs it."

**(iv) Calibrated outcome (verbatim):**
> "On balance, and calibrated to the record as documented, the assessment concludes that {calibrated_outcome_clause}. This outcome consumes the same aggregation the balance composer produces (per CP5 coherence invariant) and does not depend on any element outside the record."

### 4.2 Enumerated safeguard-gaps form (`safeguard_gaps`; quota ~891 chars, enumerated)

**PROPOSED verbatim (line template, one per gap; the section renders the enumerated list produced by the composer):**
> "({n}) {gap_short_label} — {pinpoint} requires {compliance_guidance_excerpt}. The record documents {record_state_clause}; the deficiency is {deficiency_clause}."

**Section lead-in (verbatim):**
> "The record identifies the following safeguard gaps under 11 CCR § 7152(a)(5), each pinned to the regulatory element it fails to satisfy:"

### 4.3 Record-sufficiency flowing-prose form (`record_sufficiency`; quota ~845 chars, flowing prose, NOT bullets)

**PROPOSED verbatim (single paragraph, composer inserts customer-specific clauses at the marked slots):**
> "The record supporting this assessment is {sufficiency_clause}. {entity_name} has documented the four factual elements § 7152(a) requires — {factual_elements_summary_clause} — and has recorded reserved judgments for {reserved_judgments_list}, each attached to the specific record element the judgment governs. Reserved judgments are decisions counsel or the external auditor holds under § 7152(a)(4)–(5); they are not gaps in the record and do not diminish record sufficiency. Where a factual element is absent, the deficiency is enumerated in the safeguard-gaps section with its own pinpoint. As of {as_of_date}, the record is sufficient for the § 7152(a)(6) balancing frame to weigh."

### 4.4 Benefits-to-business and benefits-to-consumers per-factor prose (`benefits_to_business` ~316 chars; `benefits_to_consumers` ~333 chars, distinct prose)

**Benefits to business (verbatim):**
> "The processing benefits {entity_name} by {business_benefit_causal_clause}, measured against {business_benefit_metric_clause}. This benefit is tied to {q4_pi_categories} specifically because {causal_link_to_categories}; a non-PI or lesser-PI alternative would not produce the same benefit for the reasons the record documents."

**Benefits to consumers (verbatim, distinct from the business form):**
> "The processing benefits {beneficiary_population} by {consumer_benefit_causal_clause}, delivered as {consumer_benefit_delivery_clause}. The population that receives this benefit is the same population whose {q4_pi_categories} is processed; the record documents the causal connection between processing and benefit rather than asserting the benefit in the abstract."

### 4.5 Four-move action template (`priority_actions`; quota ~11 items × ~747 chars each)

Every action renders four moves in strict order: (i) element, (ii) customer's recorded fact, (iii) gap or consequence, (iv) `compliance_guidance` sentence. Each action carries exactly one deadline row per §2.

**PROPOSED verbatim:**
> "**{element_short_label}** — {pinpoint}. On {entity_name}'s record, {customer_recorded_fact_clause}. The gap is {gap_or_consequence_clause}. The regulation requires the following: {compliance_guidance_sentence} {deadline_sentence}"

Move (iv) consumes the registry `compliance_guidance` sentence authored in §1 verbatim; `{deadline_sentence}` consumes the `deadline_sentence` from the single `deadline_basis` row selected per §2.1.

### 4.6 Adverse-effects per-factor prose (`adverse_effects`; quota ~4 items × ~308 chars)

**PROPOSED verbatim (per item):**
> "{adverse_effect_short_label} affects {affected_population} by {adverse_causal_clause}. The record ties this effect to {q4_pi_categories_subset} and to {operational_element_ref}; the safeguard(s) the record enumerates against this effect are {mitigating_safeguards_list_or_none_clause}."

`{mitigating_safeguards_list_or_none_clause}` renders the enumerated safeguards when the record documents them, or the verbatim phrase "not documented in the record — see safeguard-gaps section" when it does not, keeping the customer-first ordering intact.

---

## 5. Provenance & law integrity

- Every `compliance_guidance` sentence in §1 attaches to the row's existing binding-tier `anchor` and its `pinpoint`; per-proposition citation binding (CP4) is unchanged.
- Every `deadline_basis` row in §2 attaches to a binding-tier CPPA anchor; no persuasive material appears in any deadline path.
- Every opener in §3 leads with customer facts (S2/S3/S4-class) before the legal frame (S0/S1/S5/S6-class), per CP5-ADDENDUM §4 and the standing customer-first design law.
- Every template rewrite in §4 emits ONLY registry content by id and composer-supplied customer slots; no inline restatement of statute, no invented facts, no invented safeguards.
- Coherence invariant (CP3/CP5), shape contract (CP3), Golden-Shape rendering contract (Item 241), Single-Writer Law (CP2 core), and omit-over-invent are all UNCHANGED.

---

## 6. Disposition

- **Docs written this turn:** this courier + ledger Item 241.2. **Last-updated** header on `docs/pipeline-state.md` updated in the same edit.
- **No code, no wiring, no deploy this turn.** All authoring lands in 241.3 after CEO sign-off.
- **Engineering rider recorded above** for 241.3 execution (Type-J documentation gates must not count against record sufficiency).
- **HARD STOP.** Courier goes to the CEO for verbatim sign-off; approval releases 241.3 wiring.
