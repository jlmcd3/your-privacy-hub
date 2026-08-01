# ITEM 340 — ENTAILMENT VALIDATOR CALIBRATION (2026-08-01)

Validator: `prose-entailment-2026-08-01-item340`. Regenerate:
`deno run --allow-read --allow-write scripts/prose/calibrate-entailment.ts --write`

## Evaluation set

| set | description | cases |
| --- | --- | --- |
| A | July donor prose judged against the rebuilt deterministic render (natural pairs, no ground truth) | 3 |
| B | labelled mutations of rebuilt deterministic sections (ground truth known) | 119 |

## Headline numbers

- Set A accept rate: **0.0%** (0/3).
- Set B overall agreement with label: **100.0%** (119/119).
- SAFE transforms accepted (false-reject cost): **100.0%** (30/30).
- UNSAFE transforms caught (the number that matters): **100.0%** (89/89).

Set A's low accept rate is expected and is not a defect: the July donor prose
asserts facts the rebuilt record does not carry, which is precisely what the
gate exists to refuse. The operating number for rollout is the UNSAFE catch
rate; a false reject only costs fluency, since the deterministic text ships.

## Per-mutation results

| mutation | label | cases | correct | rate |
| --- | --- | --- | --- | --- |
| `safe/connective_swap` | accept | 16 | 16 | 100.0% |
| `safe/sentence_join` | accept | 13 | 13 | 100.0% |
| `safe/clause_fronting` | accept | 1 | 1 | 100.0% |
| `unsafe/invented_figure` | reject | 23 | 23 | 100.0% |
| `unsafe/dropped_pinpoint` | reject | 4 | 4 | 100.0% |
| `unsafe/smoothed_disclosure` | reject | 7 | 7 | 100.0% |
| `unsafe/paraphrased_quote` | reject | 2 | 2 | 100.0% |
| `unsafe/added_conclusion` | reject | 26 | 26 | 100.0% |
| `unsafe/invented_party` | reject | 26 | 26 | 100.0% |
| `unsafe/dropped_counsel_close` | reject | 1 | 1 | 100.0% |

## Rejection reasons observed

| rule/code | count |
| --- | --- |
| `sentence_coverage/sentence_not_traceable` | 53 |
| `no_new_anchors/new_entity` | 29 |
| `no_new_anchors/new_number` | 26 |
| `no_lost_anchors/disclosure_dropped` | 7 |
| `no_lost_anchors/citation_dropped` | 6 |
| `no_lost_anchors/quote_dropped` | 5 |
| `no_new_anchors/new_citation` | 2 |
| `no_lost_anchors/counsel_close_dropped` | 1 |

## Five accepted polishes

**1. cppa-risk — Determination** (set B, `safe/connective_swap`)

- DETERMINISTIC: Syntara Believedbasis Corp. records overall risk level of Moderate, because sector on the record is Believed-basis Pilot. In addition, assessment date on the record is 2026-07-06. However, exceptions status on the record is Material gaps identified. By contras…
- CANDIDATE: Syntara Believedbasis Corp. records overall risk level of Moderate, because sector on the record is Believed-basis Pilot. Further, assessment date on the record is 2026-07-06. That said, exceptions status on the record is Material gaps identified. By contrast,…
- VERDICT: ACCEPTED

**2. cppa-risk — Determination** (set B, `safe/sentence_join`)

- DETERMINISTIC: Syntara Believedbasis Corp. records overall risk level of Moderate, because sector on the record is Believed-basis Pilot. In addition, assessment date on the record is 2026-07-06. However, exceptions status on the record is Material gaps identified. By contras…
- CANDIDATE: Syntara Believedbasis Corp. records overall risk level of Moderate, because sector on the record is Believed-basis Pilot, and in addition, assessment date on the record is 2026-07-06. However, exceptions status on the record is Material gaps identified. By con…
- VERDICT: ACCEPTED

**3. cppa-risk — Why this assessment is required** (set B, `safe/connective_swap`)

- DETERMINISTIC: The record does not state enough for a determination in this section, because scope notes on the record is This assessment addresses the single fixed processing activity: automated risk scoring of California customers in the Believed-basis Pilot. The scope is …
- CANDIDATE: The record does not state enough for a determination in this section, because scope notes on the record is This assessment addresses the single fixed processing activity: automated risk scoring of California customers in the Believed-basis Pilot. The scope is …
- VERDICT: ACCEPTED

**4. cppa-risk — Why this assessment is required** (set B, `safe/sentence_join`)

- DETERMINISTIC: The record does not state enough for a determination in this section, because scope notes on the record is This assessment addresses the single fixed processing activity: automated risk scoring of California customers in the Believed-basis Pilot. The scope is …
- CANDIDATE: The record does not state enough for a determination in this section, because scope notes on the record is This assessment addresses the single fixed processing activity: automated risk scoring of California customers in the Believed-basis Pilot, and the scope…
- VERDICT: ACCEPTED

**5. cppa-risk — The record as the company stated it** (set B, `safe/connective_swap`)

- DETERMINISTIC: Impact on the record is Harm Types: Unauthorised access, destruction, use, modification, or disclosure; Impairment of consumer control over personal information; Severity Of Harm: Mode …. In addition, triggers on the record is Admt Involved: false; Sells Or Sh…
- CANDIDATE: Impact on the record is Harm Types: Unauthorised access, destruction, use, modification, or disclosure; Impairment of consumer control over personal information; Severity Of Harm: Mode …. Further, triggers on the record is Admt Involved: false; Sells Or Shares…
- VERDICT: ACCEPTED


## Five rejections with reasons

**1. cppa-risk — record_echo** (set A)

- DETERMINISTIC: The record for “Syntara Believedbasis Corp.” states the following on its own terms. Consumers affected: Over 100,000. Recipients named by the record: AWS, Snowflake, and Zendesk. Safeguards described by the record: RBAC, MFA, pseudonymisation in analytics, ann…
- CANDIDATE: RBAC; MFA; pseudonymisation in analytics; annual vendor DPA review; retention window enforced (24 months, with deletion or de-identification at end of window); privacy notice, preference centre, and DSAR portal provided to consumers; 'Do Not Sell/Share' opt-ou…
- VERDICT: REJECTED — [no_new_anchors/new_number] 1 number value(s) appear in the polished text but not in the deterministic text. Polish may re-word connective tissue only; it may never introduce a value. Offending: "24". [no_new_anchors/new_entity] 2 entity value(s) appear in the polished text but not in the deterministic text. Polish may re-word connective tissue only; it may never introduce a value. Offending: "DSA…

**2. cppa-risk — scope_notes** (set A)

- DETERMINISTIC: The assessment subject is “Automated risk scoring of California customers in Believed-basis Pilot”, as fixed by the record. The recipients identified for that activity are AWS, Snowflake, and Zendesk. [registry: re-queried at build time]
- CANDIDATE: This assessment addresses the single fixed processing activity: automated risk scoring of California customers in the Believed-basis Pilot. The scope is limited to selling or sharing personal information under § 7150(b)(1). Three business-purpose exceptions ar…
- VERDICT: REJECTED — [no_new_anchors/new_citation] 5 citation value(s) appear in the polished text but not in the deterministic text. Polish may re-word connective tissue only; it may never introduce a value. Offending: "§ 7150(b)(1)", "§ 7150(b)(3)", "§ 7150(b)(4)", "§ 7152(a)(1)", "§ 7150(b)". [no_new_anchors/new_number] 1 number value(s) appear in the polished text but not in the deterministic text. Polish may re-w…

**3. cppa-risk — benefits_rationale** (set A)

- DETERMINISTIC: The record asserts that the benefits of this activity outweigh its risks. The benefits it names are “Reduces fraud losses and supports service continuity.” Residual risk is recorded at possible likelihood and moderate severity, after the safeguards the record …
- CANDIDATE: The intake asserts that benefits outweigh risks; the assessment record as documented does not yet satisfy the § 7152(a) documentation requirements to support that determination. This reflects record incompleteness, not a substantive finding that risks outweigh…
- VERDICT: REJECTED — [no_new_anchors/new_citation] 4 citation value(s) appear in the polished text but not in the deterministic text. Polish may re-word connective tissue only; it may never introduce a value. Offending: "§ 7152(a)", "§ 7154", "§ 7152(a)(1)", "§ 7150(b)(1)". [no_new_anchors/new_number] 3 number value(s) appear in the polished text but not in the deterministic text. Polish may re-word connective tissue …

**4. cppa-risk — Determination** (set B, `unsafe/invented_figure`)

- DETERMINISTIC: Syntara Believedbasis Corp. records overall risk level of Moderate, because sector on the record is Believed-basis Pilot. In addition, assessment date on the record is 2026-07-06. However, exceptions status on the record is Material gaps identified. By contras…
- CANDIDATE: Syntara Believedbasis Corp, affecting 8,317,449 consumers. records overall risk level of Moderate, because sector on the record is Believed-basis Pilot. In addition, assessment date on the record is 2026-07-06. However, exceptions status on the record is Mater…
- VERDICT: REJECTED — [no_new_anchors/new_number] 1 number value(s) appear in the polished text but not in the deterministic text. Polish may re-word connective tissue only; it may never introduce a value. Offending: "8,317,449". [sentence_coverage/sentence_not_traceable] 1 polished sentence(s) contain material that is not traceable to the deterministic text. Every sentence must restate input content; none may add comm…

**5. cppa-risk — Determination** (set B, `unsafe/added_conclusion`)

- DETERMINISTIC: Syntara Believedbasis Corp. records overall risk level of Moderate, because sector on the record is Believed-basis Pilot. In addition, assessment date on the record is 2026-07-06. However, exceptions status on the record is Material gaps identified. By contras…
- CANDIDATE: Syntara Believedbasis Corp. records overall risk level of Moderate, because sector on the record is Believed-basis Pilot. In addition, assessment date on the record is 2026-07-06. However, exceptions status on the record is Material gaps identified. By contras…
- VERDICT: REJECTED — [sentence_coverage/sentence_not_traceable] 1 polished sentence(s) contain material that is not traceable to the deterministic text. Every sentence must restate input content; none may add commentary, framing or conclusions. Offending: "On balance the programme appears mature and the organisation diligent in its handling.".

