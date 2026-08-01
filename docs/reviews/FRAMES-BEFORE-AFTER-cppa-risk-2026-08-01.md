# cppa-risk — FRAME BEFORE/AFTER PAIR (Item 338, awaiting CEO sign-off)

Fixture: sample_reports `a7689621-63e6-42ad-90cc-7760e892eb6d` (Syntara Believedbasis Corp.). BEFORE is the July donor prose as shipped; AFTER is the same fixture rendered through the reviewed frame set with the set temporarily marked approved IN MEMORY ONLY. The on-disk set stays `approved: false` — nothing is flipped.

Reproduce: `deno run --allow-read --allow-run scripts/frames/before-after.ts a7689621-63e6-42ad-90cc-7760e892eb6d`


### processing_narrative

**BEFORE (July donor prose, as shipped):**

> Required documentation: a specific, non-generic purpose identifying the concrete business function, the data used, and the outcome achieved — per § 7152(a)(1). The intake records 'Service delivery, security, analytics, and support,' which does not satisfy the § 7152(a)(1) specificity requirement as applied to the fixed assessment subject (automated risk scoring of California customers). A generic formulation naming only broad business goals does not satisfy § 7152(a)(1). The record must be supplemented with a specific, non-generic purpose statement before this assessment can be relied on.

**AFTER (frame realizer, same fixture):**

> (omitted — FILL-OR-OMIT: required record values silent: i1_categories)

### record_echo

**BEFORE (July donor prose, as shipped):**

> RBAC; MFA; pseudonymisation in analytics; annual vendor DPA review; retention window enforced (24 months, with deletion or de-identification at end of window); privacy notice, preference centre, and DSAR portal provided to consumers; 'Do Not Sell/Share' opt-out link in place; notice at collection provided; outside privacy counsel engaged.

**AFTER (frame realizer, same fixture):**

> The record for “Syntara Believedbasis Corp.” states the following on its own terms. Consumers affected: Over 100,000. Recipients named by the record: AWS, Snowflake, and Zendesk. Safeguards described by the record: RBAC, MFA, pseudonymisation in analytics, annual vendor DPA review, and retention window enforced. These are the company's statements, reproduced without alteration for the reader's review.

### scope_notes

**BEFORE (July donor prose, as shipped):**

> This assessment addresses the single fixed processing activity: automated risk scoring of California customers in the Believed-basis Pilot. The scope is limited to selling or sharing personal information under § 7150(b)(1). Three business-purpose exceptions are claimed; their documentation status is assessed in exception_analysis. The intake records cross-context tracking as present alongside a negated profiling field; this contradiction is documented in inconsistency_flags and bears on whether the § 7150(b)(1) trigger is accurately scoped and whether any § 7150(b)(3) or § 7150(b)(4) trigger is separately required. The intake also records ADMT-related fields (rules-based scoring with human review, fairness testing, opt-out) alongside negated ADMT triggers; this contradiction is separately flagged. Consumer categories were not specified in the intake; this is a documentation gap under § 7152(a)(1). Volume of over 100,000 California consumers was noted; volume alone is not an enumerated § 7150(b) trigger. The intake characterises this activity as involving high-volume processing. Volume alone is not an enumerated § 7150(b) trigger; the controller must confirm which enumerated trigger applies to the processing as described. The § 7150(b)(1) trigger has been applied on the basis of the intake's affirmative sell/share field.

**AFTER (frame realizer, same fixture):**

> The assessment subject is “Automated risk scoring of California customers in Believed-basis Pilot”, as fixed by the record. The recipients identified for that activity are AWS, Snowflake, and Zendesk. [registry: re-queried at build time]

### benefits_rationale

**BEFORE (July donor prose, as shipped):**

> The intake asserts that benefits outweigh risks; the assessment record as documented does not yet satisfy the § 7152(a) documentation requirements to support that determination. This reflects record incompleteness, not a substantive finding that risks outweigh benefits on the merits. The § 7154 balancing goal requires a determination grounded in documented purposes, identified benefits, and quantified or characterised negative impacts measured against confirmed safeguards. Three elements prevent a supported conclusion at this time: (1) the § 7152(a)(1) purpose has not been stated specifically — the recorded formulation ('Service delivery, security, analytics, and support') is generic and does not identify the concrete function, data used, or outcome achieved for the automated risk-scoring activity; (2) consumer categories have not been documented; and (3) the recipient classification and the sale/share characterisation for AWS, Snowflake, and Zendesk are unresolved, leaving the scope of the § 7150(b)(1) trigger incompletely defined. The identified harms (Possible likelihood, Moderate severity) and the stated safeguards are recorded. The overall_risk_level rating of Moderate reflects the severity and likelihood of identified harms net of confirmed safeguards; it is independent of the record-completeness issues that prevent a balancing conclusion, which are addressed in priority_actions and information_needed.

**AFTER (frame realizer, same fixture):**

> The record asserts that the benefits of this activity outweigh its risks. The benefits it names are “Reduces fraud losses and supports service continuity.” Residual risk is recorded at possible likelihood and moderate severity, after the safeguards the record describes. [registry: re-queried at build time] The weight to be given to that assertion is reserved to the Company and its counsel.

## Reader's note

- `processing_narrative` renders as an OMISSION on this fixture: `i1_categories` is silent on the record, so FILL-OR-OMIT degrades rather than half-filling. That is the intended behaviour, and it is the first thing to check on sign-off.
- Every legal proposition in the AFTER column is a `{{CITE}}` slot resolved from the verified-authority registry at build time. No donor citation survived the harvest.
