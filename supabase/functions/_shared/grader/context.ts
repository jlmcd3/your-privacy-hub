// GRADER-1 — Shared authoritative context appended to BOTH grader system
// prompts (run-quality-batch + grade-single-assessment). Verified-anchor
// map, contract-provision map, exception-frame map, post-cutoff authority
// list, normalised_intake vocabulary note, and the calibration rule.
//
// Kept in ONE place so the two grader paths stay behaviorally identical.
// Edit here; both paths pick it up on next deploy.

export const SHARED_GRADER_CONTEXT = `
VERIFIED-ANCHOR MAP (X10a; do NOT flag these as misapplied):
- § 1798.140(d)(1)(A) — annual gross revenue threshold ($25M).
- § 1798.140(d)(1)(B) — 100,000+ consumers/households threshold.
- § 1798.140(d)(1)(C) — 50%+ annual revenue from selling/sharing personal information.

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

NORMALISED_INTAKE VOCABULARY (do NOT flag as fabrication):
Reports embed a normalised_intake object produced by the pipeline (resolveIntakeForTestStates / normaliseIntake). The pipeline back-fills flat q*/i* field ids and derives trigger fields (e.g. admt_training_trigger). Pipeline-derived fields and derived-trigger VALUES are NEVER fabrications; the q*/i* field-id registry (q1_revenue, q2_consumers, q5_sell_share, q5c_share_revenue_50pct, q15_sensitive_pi, q15c_spi_volume, q18_admt_use, q18b_admt_training, q19_admt_description, q20_admt_opt_out, i1_processing_purpose, i1b_min_pi, i2_retention_period, i2_retention_criteria, i3_ca_consumer_band, i4_disclosure_mechanisms, i5_admt_logic, i5_admt_human_review, i6_vendors, i7_internal_contributors, i8_certifying_exec_name, i9_has_existing_dpia, etc.) is legitimate intake vocabulary — its presence in an intake or a source_fields anchor is NOT a fabrication signal.

CALIBRATION RULE (BINDING):
A claim the grader cannot personally verify is flagged as "verify against primary sources" at LOW severity — NEVER scored as fabricated / hallucinated. A fabrication finding requires BOTH (i) absent-from-intake (including the normalised_intake and every intake source column shipped alongside the report) AND (ii) absent from the verified-authority context above. Statutory-definition scoping qualifiers in drafting tools (e.g. GDPR Art. 9(1) "to the extent processed for the purpose of uniquely identifying a natural person") and cautionary recitals are standard legal drafting, NOT unsupported business claims. Statutory-anchored placeholder phrasings ("[TO BE COMPLETED …]", "[TO BE ASSESSED]") are anti-fabrication scaffolding — not defects.
`.trim();
