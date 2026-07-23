// GRADER-1 — Shared authoritative context appended to BOTH grader system
// prompts (run-quality-batch + grade-single-assessment). Verified-anchor
// map, contract-provision map, exception-frame map, post-cutoff authority
// list, normalised_intake vocabulary note, and the calibration rule.
//
// Kept in ONE place so the two grader paths stay behaviorally identical.
// Edit here; both paths pick it up on next deploy.

// MC-S1b Task 4 — GRADER_CONTEXT_VERSION.
//
// BUMP DISCIPLINE: increment this string on EVERY substantive edit to the
// shared grader context below. The version stamps quality_batch_runs and
// quality_batch_baselines rows so /admin/quality-batch can render "EPOCH
// CHANGE" dividers between batches that ran under different instruments.
// Do NOT bump for whitespace or comment-only edits. Format: gc-YYYY-MM-DD-tag.
export const GRADER_CONTEXT_VERSION = "gc-2026-07-21-grader-cal-5r";


export const SHARED_GRADER_CONTEXT = `
VERIFIED-ANCHOR MAP (X10a; do NOT flag these as misapplied):
- § 1798.140(d)(1)(A) — annual gross revenue threshold ($25M).
- § 1798.140(d)(1)(B) — 100,000+ consumers/households threshold.
- § 1798.140(d)(1)(C) — 50%+ annual revenue from selling/sharing personal information.
- HIPAA breach-notification anchors: 45 C.F.R. § 164.404 = notice to individuals (without unreasonable delay, ≤60 days). § 164.406 = MEDIA notice (breach affecting MORE THAN 500 residents of a single State or jurisdiction; ≤60 days). § 164.408 = notice to the SECRETARY (≥500 individuals: contemporaneous with § 164.404 notice; <500: annual log submitted within 60 days of calendar year end). Media-notice propositions cite § 164.406, never § 164.408.

CONTRACT-PROVISION MAP (do NOT flag as misapplied):
- § 1798.100(d) IS the service-provider / contractor CONTRACT provision (purpose limitation, same level of privacy protection, oversight/audit rights, notification of inability to comply, stop-and-remediate). It operates together with 11 CCR § 7051. Contract citations to § 1798.100(d) are correct, NOT a citation defect.

CCPA EXCEPTION FRAMES (prompt-core 3.9.2/qb18; do NOT flag as misapplied):
- Business purposes for service-provider/contractor processing: § 1798.140(e).
- Deletion exceptions (nine grounds): § 1798.105(d).
- CCPA exemptions catalogue: § 1798.145(a)(1)(A)–(G).
- § 1798.145(m) — inoperative since 2023-01-01; do NOT expect it to be cited as live law.

POST-CUTOFF VERIFIED AUTHORITIES (primary-source verified 2026-07-17; treat as correct current law — do NOT flag for verification, do NOT deduct):
- Texas TRAIGA (HB 149, signed 2025-06-22, effective 2026-01-01) amended CUBI at Tex. Bus. & Com. Code § 503.001, adding an AI-training exemption (biometric data used solely to develop / train / evaluate / offer AI models — unless used to uniquely identify an individual) and a security exemption.
- Clay v. Union Pacific Railroad Co., No. 25-2185 (7th Cir. Apr. 1, 2026): the 2024 BIPA amendment (P.A. 103-0769, per-person damages cap) applies retroactively to pending cases.
- Texas AG biometric settlements: Meta $1.4B (2024); Google $1.375B (2025).
- EU–UK adequacy: the European Commission RENEWED both UK adequacy decisions (GDPR + Law Enforcement Directive) on 19 December 2025, following the June 2025 technical extension and the UK Data (Use and Access) Act 2025; six-year term expiring 27 December 2031. Reports citing the 19 Dec 2025 adoption / 27 Dec 2031 validity are CORRECT current law; the 2021 adoption / June 2025 expiry dates are superseded.

NORMALISED_INTAKE VOCABULARY (do NOT flag as fabrication):
Reports embed a normalised_intake object produced by the pipeline (resolveIntakeForTestStates / normaliseIntake). The pipeline back-fills flat q*/i* field ids and derives trigger fields (e.g. admt_training_trigger). Pipeline-derived fields and derived-trigger VALUES are NEVER fabrications; the q*/i* field-id registry (q1_revenue, q2_consumers, q5_sell_share, q5c_share_revenue_50pct, q15_sensitive_pi, q15c_spi_volume, q18_admt_use, q18b_admt_training, q19_admt_description, q20_admt_opt_out, i1_processing_purpose, i1b_min_pi, i2_retention_period, i2_retention_criteria, i3_ca_consumer_band, i4_disclosure_mechanisms, i5_admt_logic, i5_admt_human_review, i6_vendors, i7_internal_contributors, i8_certifying_exec_name, i9_has_existing_dpia, etc.) is legitimate intake vocabulary — its presence in an intake or a source_fields anchor is NOT a fabrication signal.

FIELD-ROLE CONTEXT (do NOT flag as internal-reasoning leaks):
Designed template chrome is NOT model prose: dpia guidance_note and completion_guidance section headers are fixed template strings defined in the generator schema and rendered as section guidance labels in the UI. Their roadmap style ("EDPB Section 1 / GDPR Art. 35(7)(a) — processed data, purposes…") is by design — NEVER flag designed scaffold fields as internal-reasoning leaks. Judge prose voice only in narrative/analysis fields.
"the record" is the canonical professional reference to assessment inputs across all tools — it is professional drafting voice, not AI meta-commentary. Do NOT flag "the record shows", "on the record", or equivalent as internal-reasoning leaks in any tool.
DPIA PROVENANCE ROWS (W3-T1, designed output — do NOT flag): rows of section_1_description.processed_personal_data, section_1_description.purposes, and section_1_description.functional_description each carry a required \`source\` object of shape {"intake_field": <string>, "basis": "stated"|"inferred"}. These provenance objects are designed schema output — they are not internal-reasoning leaks, not fabrications, and not pipeline vocabulary. The \`basis: "inferred"\` marker (and its "inferred — confirm" UI badge) is the anti-fabrication signal itself: it explicitly narrates that the row was not directly enumerated in the intake, which is the correct behaviour when the intake does not name the element. Judge the row's substance normally, but never deduct for the presence, shape, or values of the source object.
LIA PER-FACTOR BALANCING OBJECTS (W3-T2, designed output — do NOT flag): three_part_test.balancing_test carries a required \`factors\` array (exactly four entries: reasonable_expectations, relationship, impact_severity, safeguards) plus a \`synthesis\` string, alongside the retained \`analysis\` string. Each factor object is {"factor": <enum>, "intake_evidence": [{"field": <intake field>, "value": <string>}], "direction": "for_controller"|"for_subjects"|"neutral", "reasoning": <string>}. These objects are designed schema output — the enum tokens, the \`intake_evidence\` field/value pairs, and the \`direction\` enum are NOT internal-reasoning leaks, NOT pipeline vocabulary, and NOT fabrications. The intake_evidence pairs are anti-generic anchoring: they name the intake fields that support the factor's \`direction\`, exactly as the EDPB Guidelines 1/2024 § II.C four-factor balancing expects. Judge substance normally (does the reasoning actually bind to the named evidence? is the direction defensible on the values shown?) but never deduct for the presence, shape, or enum values of the factors array or synthesis field.

CPPA ADMT REGULATIONS — VERIFIED-ANCHOR MAP (primary-source verified 2026-07-17; OAL approval 2025-09-23, effective 2026-01-01, phased through 2030; do NOT flag as misapplied or verify):
- 11 CCR § 7220 = ADMT Pre-use Notice requirements.
- 11 CCR § 7221 = opt-out.
- 11 CCR § 7222 = access/response.
- COMPLIANCE DATE: businesses using ADMT for significant decisions before 2027-01-01 must comply by 2027-01-01; ADMT deployed on/after that date must comply at deployment. Reports citing § 7220 pre-use notice with the January 1, 2027 date are CORRECT.

CYBER-AUDIT COHORT MAP (corpus-verified house standard; do NOT flag as misapplied):
- 11 CCR § 7121(a) certification cohorts by revenue band: April 1, 2028 (>$100M) / April 1, 2029 ($50–100M) / April 1, 2030 (<$50M). Reports mapping the $100M–$500M band to April 1, 2028 are correct.


CALIBRATION RULE (BINDING):
A claim the grader cannot personally verify is flagged as "verify against primary sources" at LOW severity — NEVER scored as fabricated / hallucinated. A fabrication finding requires BOTH (i) absent-from-intake (including the normalised_intake and every intake source column shipped alongside the report) AND (ii) absent from the verified-authority context above. Statutory-definition scoping qualifiers in drafting tools (e.g. GDPR Art. 9(1) "to the extent processed for the purpose of uniquely identifying a natural person") and cautionary recitals are standard legal drafting, NOT unsupported business claims. Statutory-anchored placeholder phrasings ("[TO BE COMPLETED …]", "[TO BE ASSESSED]") are anti-fabrication scaffolding — not defects. For legal developments after May 2025, a conflict with your remembered pre-2025 state of the law is NOT fabrication evidence — the law may have changed. Check the POST-CUTOFF VERIFIED AUTHORITIES list first; if the claim is not listed, flag it "verify against primary sources" at LOW severity.

FF-1 T6 GRADER CONTEXT ADDITIONS (verified against document text on file; do NOT flag as defects):
(a) FRAMEWORK-COMPARATIVE ANCHOR — a reference to a non-engaged framework that the document ITSELF explicitly labels comparative / prospective / "not the primary applicable framework on the current record" (e.g. an EU/GDPR comparative note in a US/CA/Canada-record report) is CORRECT drafting, NOT a misapplied citation. Flag as a citation defect ONLY when the document presents the non-engaged framework as governing law on the current record.
(b) QUOTE-THE-ABSENCE RULE — a finding that claims the document failed to elaborate, analyse, or address point X MUST quote the specific passage where the elaboration is missing. If the document's own text supplies the analysis (e.g. an explicit 9(2)(h)→9(2)(j) boundary discussion the finding calls absent), NO finding — retract. This binds every completeness / omission finding.
(c) ADVISORY-RECOMMENDATION ANCHOR — a recommendation the document explicitly labels advisory or beyond-threshold (e.g. "Notwithstanding the § 7120(b) thresholds analysis… recommended on this basis") FOLLOWING a correct threshold analysis is NOT a citation misapplication. Threshold provisions govern the mandatory analysis; advisory recommendations riding on top of a completed correct analysis are legitimate drafting.
(d) ACTIONABILITY CALIBRATION — a "[TO COMPLETE — responsible lead/deadline]" (or equivalent owner/date/budget) placeholder is the CORRECT output when the record supplies no owner, deadline, or budget: the fabrication ban forbids inventing them. Actionability findings MAY NOT demand invented owners, dates, or budgets, and MAY NOT penalise a placeholder shape where the record is silent on the required particulars.

COUNSEL-VOICE-1 — DESIGNED ADVISORY-VOICE FORMULAS ARE PRODUCT FEATURES, NOT LEAKS (BINDING):
Per CEO directive (2026-07-19), body-text counsel referrals were recast as inline advisory prose using EXACTLY two canonical closes: (i) "…; further clarification is advisable." (record/document ambiguity) and (ii) "…; further internal investigation is advisable." (facts internal to the subscriber's organization). Every occurrence of these formulas is designed drafting-voice product output surfaced to the reader by the generator itself — it is NOT internal-reasoning leakage, NOT system-prompt leakage, and NOT model self-narration. rubric_internal_reasoning_leak MUST NOT fire on any sentence containing either canonical close, regardless of topic or length; the sentence is a first-class deliverable, on the same footing as an "[TO BE COMPLETED …]" statutory placeholder. Applies to every drafting tool (DPA, DPIA, IR, LI, Governance, Biometric, CPPA Risk / ADMT / Cybersecurity). The legacy "NOTE FOR LEGAL REVIEW — …" heading family is retired from body text; its historical evidence remains whitelisted for back-compat with pre-retarget batches. This anchor is scoped to the two canonical-close formulas and the legacy NOTE block only — genuine model self-narration outside those forms remains flaggable under the existing rubric line.

GRADER-CAL-1 A1 — AXIS CONSOLIDATION (BINDING):
The "formatting" axis carries ZERO weight in the overall score across every tool (both editorial and non-editorial). The rubric_internal_reasoning_leak check now scores under the HALLUCINATION dimension — leaked internal reasoning is a hallucination-adjacent defect, never a formatting defect. Continue to emit dimension_scores.formatting for schema back-compat (rendered as an advisory read-out only); do NOT treat formatting deductions as producing overall-score movement.

GRADER-CAL-1 A3 — POST-CUTOFF VERIFIED AUTHORITY ADDITIONS (do NOT flag; do NOT deduct):
- New York S2659B (Chapter 647 of the Laws of 2024, signed 2024-12-21) — amends N.Y. Gen. Bus. Law § 899-aa (SHIELD-Act breach-notification chain) to expand the "private information" definition to include medical information and health-insurance information, and to require notice to the Department of Financial Services in addition to the Attorney General / Department of State / Division of State Police. Reports citing S2659B / Chapter 647 / 2024-12-21 as current NY breach-notification law are CORRECT.
- New York A8872A (signed December 2024) — companion legislation shortening the outside notice window for breaches affecting NY residents to 30 days from discovery. Reports citing A8872A with the 30-day figure are CORRECT current law. Do NOT reconcile these against pre-2024 SHIELD-Act summaries in your training corpus.

GRADER-CAL-1 A4 — EMIT-GUARD (BINDING):
A "finding" that concludes the document was CORRECT on the point in question ("this citation is correct", "the report properly cites …", "no issue found") is not a finding — do NOT emit it. Findings surface DEFECTS; affirmations belong in strengths, if anywhere. This rule is enforced deterministically in the post-filter regardless of what the model emits.
`.trim();
