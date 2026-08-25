// SPINE v4.5 ENCODE: CPPA Risk Assessment.
//
// RENDER LAW. The CEO-ratified Spine v4.5 redline
// `CPPA_Risk_Assessment_Spine_v4.5_Deterministic_Assembly_and_Authority_Matrix.docx`
// (Intake Contract v2.0 aligned; unchanged) is this product's render law,
// superseding Spine 4.3/4.4. v4.5 keeps the architecture, intake contract,
// factor logic, and conditional triggers; it rewrites the fixed prose in a
// citation-forward legal-narrative voice, and it replaces the Table of
// Authorities with a customer-readable factor / determination / authority
// matrix appendix (v4.5.1, CEO-ratified 2026-08-22, merged the former
// separate intake-data column into the determination sentence — the same
// pattern used for the CPPA ADMT v3.2 spine and DPIA's Appendix A). v4.7
// (2026-08-23/24) moved that matrix to lead the appendix set as Appendix A
// — see the v4.7 note below for the full reorder.
// Every fixed-prose string in SKELETON_SECTIONS below is
// transcribed from that file. Nothing here may be reworded, re-punctuated or
// "improved" by code, by refinement, or by an agent: the skeleton's fixed
// prose is a protected leaf (splice-barred) and the conformance check
// byte-matches the assembled document against it outside the slots.
//
// Block kinds:
//   "skeleton"    — FIXED PROSE. Byte-pinned. Slots inside {braces} are the
//                   only mutable spans; the rest is law.
//   "lead"        — [DETERMINATION LEAD]: exactly one generated sentence,
//                   bound to its typed determination.
//   "generated"   — [GENERATED]: a {{FACTOR.*}} reasoning output, composed by
//                   the factor engine (risk-factor-engine.ts — deterministic
//                   at runtime; v4.5 does not change factor inputs, logic,
//                   weighting, or action assembly). Per the NO-PADDING LAW an
//                   uncomposed block is omitted entirely, never padded.
//   "conditional" — [CONDITIONAL]: renders only when its trigger holds; the
//                   assembler composes it from the RISK_FIXED constants below
//                   plus intake facts. Otherwise omitted entirely.
//   "rule"        — a deterministic assembly rule ({{DERIVED.*}} report-view
//                   outputs), composed mechanically from established facts.
//   "table"       — a rendered table supplied by the assembler, keyed
//                   `${sectionId}:${i}` exactly like a composed block. Used
//                   for the cover summary and every lettered appendix
//                   (Appendix A, the factor/determination/authority
//                   matrix, among them — see the v4.7 note below).
//
// PLACEHOLDER PROVENANCE (v4.5 field-status legend, unchanged from 4.3):
//   {{INTAKE.*}} / {{FINAL.*}} — Intake Contract v2.0 factual fields → {slots}.
//   {{DERIVED.*}} — mechanical report-view outputs → "rule"/"table" blocks or slots.
//   {{FACTOR.*}}  — factor-engine outputs → "generated" blocks.
//   {{SYSTEM.*}}  — run metadata → {assessmentDate} / {versionNumber} slots.
//
// SPINE NOTE: section inclusion is driven by legal applicability and
// established facts, not by whether a factor happened to produce prose.

// v4.6 (2026-08-22) — corpus program phase 2: adds Appendix I (Persuasive
// Authority, the S5 surface) as a fully conditional section fed from the
// Risk CAM. No prior section's bytes changed. Risk carries no byte-pin
// (doc 44 §D5 verified), so no hash recompute — the version string is the
// only stamp. Shipped under the CEO's 2026-08-22 continue-all-spec-builds
// direction; the new fixed prose is on the advance-ratification ledger.
//
// v4.7 (2026-08-23/24) — CEO REPORT REVIEW: (1) the cover block flips from
// one prose sentence to a label/value table; (2) Appendix B (Necessity
// Matrix) and Appendix C (Risk/Safeguard Register) flip from a joined-
// string "generated" block (which fell through to plain-paragraph
// rendering, never an actual matrix) to real tables; (3) full appendix
// reorder and reletter — the former Appendix G (factor/determination
// matrix) leads as Appendix A, former Appendix I (persuasive authority) is
// B, and the former A–F record/analytical appendices follow as C–H in
// their prior relative order; former Appendix H (EUP Methodology, never
// triggered) is retired. No factor logic, intake contract, or determination
// changed — presentation and ordering only. Every "Appendix X" cross-
// reference inside fixed body prose was updated to match (grep-verified,
// see the 2026-08-24 session record).
// v4.7.1 (2026-08-24) — CEO REPORT REVIEW, signature pages: adds two new
// front-of-appendix sections, "Review and Approval" and "Agency Submission
// Checklist (11 CCR § 7157)", between Section X and the (now-Appendix-A)
// factor matrix. Neither is an attestation the tool performs — both are
// blank-signature/blank-portal-field pages the customer signs and, for the
// checklist, uses to complete the § 7157(d) online submission themselves.
// No appendix letter changes (neither new section is titled "Appendix ...").
// v4.7.2 (2026-08-25) — CEO-ordered report-polish round (ChatGPT output
// review, dispositions recorded in the session of 2026-08-25):
//   (1) Cover section retitled "Assessment Profile" — the banner already
//       carries the report title; repeating it read as a defect.
//   (2) II.B rewritten from a spliced sentence to labeled record lines —
//       the old template garbled when intake values were full clauses
//       ("...through No direct interaction (obtained from another
//       source)"). Slot names unchanged.
//   (3) Conditional sections/subsections that previously vanished now
//       leave a one-line "not applicable" record (Section V, VIII.C,
//       VIII.D, Appendix F) so the fixed numbering never shows an
//       unexplained gap. Fixed numbering itself is unchanged.
//   (4) Cover gains an executive status panel (table block, appended —
//       no index shifts).
export const RISK_SKELETON_VERSION = "cppa-risk-v4.7.2-2026-08-25";
/** The prior encode's stamp, retained for provenance. */
export const RISK_SKELETON_VERSION_V45 = "cppa-risk-v4.5-2026-08-21";
export const RISK_SKELETON_SOURCE_FILE =
  "CPPA_Risk_Assessment_Spine_v4.5_Deterministic_Assembly_and_Authority_Matrix.docx";
export const RISK_SKELETON_PROVENANCE =
  "CPPA_Risk_Assessment_Spine_v4.5_Deterministic_Assembly_and_Authority_Matrix.docx — CEO redline round, ratified 2026-08-21; supersedes Spine 4.3/4.4. Legal-narrative and citation-forward voice rewrite; Table of Authorities replaced by a factor/determination/authority matrix appendix. v4.6 (2026-08-22) adds a Persuasive Authority appendix (corpus program phase 2, doc 49 A.2.4). v4.7 (2026-08-23/24, CEO report review) reorders/reletters the appendix set (determination matrix first, persuasive authority second) and converts the cover block and two more appendices to real tables. v4.7.1 (2026-08-24) adds the Review-and-Approval and Agency-Submission-Checklist signature pages ahead of the appendices.";

export const RISK_SKELETON_TITLE = "CPPA PRIVACY RISK ASSESSMENT";
export const RISK_SKELETON_SUBTITLE =
  "Prepared under 11 CCR §§ 7150–7157 for {entityName}";

/** The v3 register guide, carried forward verbatim. Authoring law; never printed to a customer. */
export const RISK_REGISTER_GUIDE = "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

export type SkeletonBlockKind =
  | "skeleton"
  | "lead"
  | "generated"
  | "conditional"
  | "rule"
  | "table";

export interface SkeletonBlock {
  readonly kind: SkeletonBlockKind;
  readonly text: string;
}

export interface SkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly SkeletonBlock[];
}

/**
 * FIXED PROSE FOR CONDITIONAL BLOCKS — transcribed from Spine 4.3. These
 * strings are CEO prose exactly like the skeleton blocks; they live here (not
 * in the assembler) so the spine file remains the single custody point for
 * customer-facing bytes. The assembler composes each conditional from these
 * constants plus the intake facts its trigger names; conditional text is swept
 * through the register repair by the renderer like any composed block.
 *
 * RATIFICATION FLAGS:
 *   [R1] RESOLVED by Spine v4.5: the VI.E fixed prose now attributes to "the
 *        Company", not "the record" — no v3 banned-register concern remains.
 *   [R2] RESOLVED by Spine v4.5: the business / other-stakeholder / public
 *        no-benefit-established sentences are now spelled out verbatim in the
 *        v4.5 source (Part 1, § VI.C/D/E), not left as an analogical pattern.
 *   [R3] The SPI fallback (q15 sensitive-PI = Yes with no SPI-mapped q4
 *        category) and the mechanical DERIVED formats remain open; v4.5 does
 *        not separately re-ratify them.
 */
export const RISK_FIXED = {
  confidential:
    "CONFIDENTIAL. This assessment contains information concerning the Company’s processing activities, systems, safeguards, and internal decision-making. Distribution should be limited to persons with an appropriate business or legal need to review it.",

  exec_company_decision_lead: "Company Decision.",
  exec_company_decision_note:
    "The Company decision is a finalization fact supplied by the business; it is not generated by the factor engine.",

  secondary_uses_lead:
    "The Company has identified the following additional use or uses of the information:",

  prior_assessment_lead:
    "The Company has also identified an existing assessment relevant to this activity:",
  prior_assessment_note:
    "Existing work may be relied upon to the extent it contains the information required for this assessment. Any California-specific information not addressed in the existing assessment must still be supplied.",

  external_participants_lead:
    "The following external participants were consulted:",

  spi_lead:
    "The activity includes the following sensitive personal information:",
  spi_note:
    "Sensitive information is not treated as inherently improper to process. Its presence does, however, make the purpose, necessity, access, disclosure, retention, and potential consequences of misuse more important to the assessment.",

  admt_a:
    "A. Role of the Technology. Section 7152(a)(3)(G) requires the report to describe the technology's role in the processing. The Company describes the relevant automated system as: {q19}. The system participates in the processing as follows: {role}. The assessment focuses on what the technology actually does rather than the label applied to it. A tool that organizes information for a human decisionmaker presents different considerations from one whose output determines or materially shapes an outcome affecting the consumer.",
  admt_b:
    "B. Logic, Assumptions, and Limitations. Section 7152(a)(3)(G)(i) requires the report to describe the logic used in the technology, including material assumptions and limitations. The Company describes the logic of the system as: {logic}. The factual record also identifies material assumptions or limitations of that logic: {assumptions}. An automated system can operate as designed and still produce an inappropriate result where its inputs, assumptions, or learned relationships are poorly suited to the decision being made.",
  admt_c:
    "C. Output and Decision Effect. Section 7152(a)(3)(G)(ii) requires the report to describe the output of the technology and how the business uses that output. The system produces: {output}. The Company uses that output as follows in the relevant decision: {outputUse}. The resulting effect on the consumer is: {consumerEffect}.",
  admt_d:
    "D. Human Review. Sections 7001(e) and 7150(b)(3) treat meaningful human involvement as a relevant qualification to significant-decision ADMT. The Company describes human review or appeal as follows: {humanReview}. Human involvement meaningfully reduces risk only where the reviewer can understand the relevant issue, has enough information and time to evaluate it, and has authority to reach a different result.",
  admt_e:
    "E. Accuracy, Fairness, and Bias. Sections 7152(a)(5)(B) and 7152(a)(6)(A)(iv) treat testing for accuracy, fairness, and bias as relevant to both the risk analysis and the safeguards the Company has implemented. The Company reports the following testing: {testing}. Testing does not guarantee that an automated system will never produce an inappropriate outcome; it provides evidence about whether relevant classes of error, bias, or disparate impact are being identified and addressed.",
  admt_f:
    "F. Training Data. Sections 7150(b)(6) and 7153 require the report to identify the source of training data used for the ADMT. The Company identifies the source of relevant training data as: {trainingSource}.",
  admt_g:
    "G. ADMT Provided to Another Business. Section 7153(a)–(b) requires the assessment to consider whether a recipient business has access to the facts necessary to conduct its own risk assessment where the Company makes ADMT trained using personal information available to that business to make a significant decision. The factual predicate for this branch is recorded as follows: ADMT made available to another business: {madeAvailable}. ADMT trained using personal information: {trainedPi}. Recipient business uses the ADMT for a significant decision: {recipientSignificant}.",
  admt_appendix_pointer:
    "The supporting technical record appears in Appendix F — ADMT Technical and Decision Record.",
  appendix_d_intro:
    "This appendix preserves the technical and analytical detail supporting Section V, including the technology’s role, logic, assumptions and limitations, output, human review, testing, training-data provenance, and facts relevant to § 7153.",

  benefit_identifies_lead: "The Company identifies:",
  benefit_supporting_lead: "Supporting information is:",
  benefit_none_consumer:
    "The Company has not identified a distinct consumer benefit for this activity, so this category receives no affirmative weight.",
  benefit_none_business:
    "The Company has not identified a distinct business benefit for this activity, so this category receives no affirmative weight.",
  benefit_none_other:
    "The Company has not identified a distinct benefit to other stakeholders for this activity, so this category receives no affirmative weight.",
  benefit_none_public:
    "The Company has not identified a distinct public benefit for this activity, so this category receives no affirmative weight.",

  ix_company_decision:
    "Company Decision. After reviewing the assessment findings and consequences, the Company records its business decision as: {decision}. This decision is supplied by the Company during finalization and should not be inferred from the assessment recommendation.",

  x_approval_head: "A. Approval and Accountability.",
  x_approval_reviewers:
    "The finalization record identifies the individuals who reviewed or approved the assessment:",
  x_approval_date_label: "Approval date:",
  x_approval_authority:
    "The finalization record confirms that at least one approver has authority to participate in deciding whether the covered processing will be initiated or continued:",
  x_approval_authority_basis: "Basis for the authority determination:",

  x_timing_post2026:
    "For covered processing initiated on or after January 1, 2026, the risk assessment should be completed before the processing is initiated.",
  x_timing_pre2026:
    "For covered processing initiated before January 1, 2026 and continuing afterward, the applicable transition deadline should be identified and tracked in the assessment record.",

  x_material_change_date_label: "Material change date:",
  x_material_change_desc_label: "Description of material change:",
  x_material_change_prior_label: "Prior risk-assessment date (if applicable):",
} as const;

export const SKELETON_SECTIONS: readonly SkeletonSection[] = [
  {
    id: "cover",
    // v4.7.2 — was the report title verbatim; the banner already carries it.
    title: "Assessment Profile",
    blocks: [
      // 0 — CEO report review 2026-08-23/24: was one prose sentence
      // ("Prepared for: X. Processing Activity: Y. …"); now a label/value
      // table (deriveCoverTable in risk-skeleton-assemble.ts), same four
      // facts, same values, table presentation.
      { kind: "table", text: "cover_summary" },
      // 1 — [CONDITIONAL: confidentiality designation] — RISK_FIXED.confidential; no intake trigger exists yet, so not composed in Phase B.
      { kind: "conditional", text: "[CONDITIONAL] CONFIDENTIALITY DESIGNATION - fixed text RISK_FIXED.confidential; trigger: confidentiality designation on the engagement. Absent => omitted." },
      // 2 — v4.7.2 executive status panel: the four headline determinations
      // (assessment required / inherent risk / residual risk / disposition)
      // as a label/value table so the outcome is visible before the prose.
      // Derived in risk-skeleton-assemble.ts from the factor engine's own
      // typed operands — never a new determination, only a projection.
      { kind: "table", text: "exec_status_panel" },
    ],
  },
  {
    id: "executive_summary",
    title: "EXECUTIVE SUMMARY",
    blocks: [
      // 0
      { kind: "skeleton", text: "Activity Assessed. The Company identifies {activityName} as the activity under review. It describes the activity as {subjectAnchor} and states the purpose as {activityPurpose}. This assessment is limited to that activity and purpose; it does not evaluate the Company’s privacy program or CCPA compliance generally." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.normalized_processing_purpose}}] Fixed first words \"For purposes of the analysis, that purpose is understood as:\" — clarifies, never rewrites, the Company’s stated purpose. Phase C. Absent => omitted." },
      // 2
      { kind: "skeleton", text: "Why a Risk Assessment Is Required. California requires a risk assessment before a business begins processing that falls within one of the significant-risk categories in 11 CCR § 7150(b), including selling or sharing personal information, processing sensitive personal information, using automated decisionmaking technology (“ADMT”) for a significant decision, specified profiling, and specified training of ADMT or identity-related technologies. The activity triggers the requirement under {derivedTriggers}. The assessment then asks the questions required by §§ 7152 and 7154: whether the benefits of this processing justify the privacy risks after relevant safeguards are considered." },
      // 3
      { kind: "generated", text: "[GENERATED {{FACTOR.executive_trigger_summary}}] Concise explanation of why the listed trigger(s) apply and any material qualification. Phase C. Absent => omitted." },
      // 4
      { kind: "generated", text: "[GENERATED {{FACTOR.executive_material_benefits/risks/safeguards/residual_risks}}] Key Findings — fixed sub-leads \"The benefits carrying the greatest weight are:\", \"The most important risks to consumers are:\", \"The safeguards that most materially reduce those risks are:\", \"After giving appropriate credit to safeguards supported by the record, the principal risks that remain are:\". Projected from the detailed body factors. Phase C. Absent => omitted." },
      // 5
      { kind: "generated", text: "[GENERATED {{FACTOR.executive_balancing_conclusion + executive_balancing_reasoning}}] Overall Determination. Phase C. Absent => omitted." },
      // 6
      { kind: "generated", text: "[GENERATED {{FACTOR.recommended_processing_outcome + executive_recommendation_explanation}}] Fixed first words \"The assessment reaches the following recommended processing outcome:\" — the assessment’s recommended disposition, not the Company’s final business decision. Phase C. Absent => omitted." },
      // 7
      { kind: "conditional", text: "[CONDITIONAL] COMPANY DECISION - trigger: assessment finalized ({{FINAL.final_processing_decision}} present). RISK_FIXED.exec_company_decision_lead + decision + notes. Absent => omitted." },
      // 8
      { kind: "conditional", text: "[CONDITIONAL] CONDITIONS TO PROCEED - trigger {{FACTOR.executive_conditions}} present. Fixed first words \"Conditions to Proceed. The assessment recommendation depends on completion or continued operation of the following:\" then \"These are conditions of the determination, not optional recommendations.\" Phase C. Absent => omitted." },
      // 9
      { kind: "conditional", text: "[CONDITIONAL] ASSESSMENT FOLLOW-UP REQUIRED - trigger {{FACTOR.executive_required_follow_up}} present. Fixed first words \"Assessment Follow-Up Required. The following factual or analytical matters remain unresolved:\" then \"These matters must be completed for the assessment record to be complete. They do not necessarily require the Company to alter the processing unless the additional information changes the analysis.\" Phase C. Absent => omitted." },
    ],
  },
  {
    id: "i_purpose_scope",
    title: "I. PURPOSE, SCOPE, AND ASSESSMENT RECORD",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. Processing Purpose. Section 7152(a)(1) requires the risk assessment to identify the business’s purpose with enough specificity to evaluate the processing; generic purposes such as “improve our services” or “security purposes” are not enough. The Company identifies {activityName} and states the purpose as {activityPurpose}. That purpose sets the baseline for the necessity, benefit, risk, and balancing analyses that follow." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.purpose_specificity_analysis + normalized_processing_purpose + purpose_conclusion}}] Assessment and conclusion of purpose specificity; where the purpose is narrowed or clarified, fixed note \"The formulation above clarifies the purpose for assessment purposes. It does not replace the factual description supplied by the Company; it identifies the purpose with enough precision to evaluate the information, benefits, and risks associated with the activity.\" Phase C. Absent => omitted." },
      // 2
      { kind: "skeleton", text: "B. Scope and Boundaries. The assessment should correspond to the processing activity and purpose actually being evaluated. Section 7156 permits one assessment to cover a comparable set of processing activities only when the activities are similar and present similar privacy risks. This assessment covers processing undertaken for the stated purpose; a materially different purpose may require a different assessment because it can change necessity, expectations, risks, safeguards, and the overall balance." },
      // 3
      { kind: "generated", text: "[GENERATED {{FACTOR.in_scope_processing_description + out_of_scope_processing_description}}] In-scope / out-of-scope characterisation built from established processing facts. Phase C. Absent => omitted." },
      // 4
      { kind: "conditional", text: "[CONDITIONAL] SECONDARY USES - trigger {has_secondary_uses}=Yes. RISK_FIXED.secondary_uses_lead + {{INTAKE.secondary_activities}}. Factor analysis/conclusion/consequence follow in Phase C. Absent => omitted." },
      // 5
      { kind: "skeleton", text: "C. Regulatory Applicability. Section 7150(b) defines the processing activities that present significant risk to consumers’ privacy and therefore require a risk assessment. The Company’s description implicates the following trigger or triggers: {derivedTriggers}. Each confirmed trigger appears once with its section citation and a plain-English factual basis." },
      // 6
      { kind: "generated", text: "[GENERATED {{FACTOR.full_trigger_analysis + uncertain_trigger + regulatory_applicability_conclusion}}] Per-trigger analysis; unresolved triggers get fixed lead \"The applicability of the following potential trigger cannot be resolved from the current record:\". Phase C. Absent => omitted." },
      // 7
      { kind: "conditional", text: "[CONDITIONAL] COMPARABLE PROCESSING - trigger: related activities identified. Fixed first words \"The Company has identified related activities that may be sufficiently similar to be assessed together. Related processing may be addressed in one assessment where the activities are similar and present similar privacy risks.\" + {{FACTOR.comparable_processing_analysis/conclusion}}. Phase C. Absent => omitted." },
      // 8
      { kind: "conditional", text: "[CONDITIONAL] PRIOR DPIA / PIA / OTHER ASSESSMENT - trigger {i9_has_existing_dpia}=Yes. RISK_FIXED.prior_assessment_lead + {{INTAKE.i9_existing_dpia_summary}} + RISK_FIXED.prior_assessment_note. Absent => omitted." },
      // 9
      { kind: "skeleton", text: "D. Basis for the Assessment. Sections 7151 and 7152 require the assessment to be grounded in the people and facts relevant to the processing, including employees whose job duties involve the covered processing. This assessment relies on information supplied by the Company and the materials listed in Appendix H. If information needed for a material conclusion is missing or inconsistent, the report identifies the limitation rather than assuming a favorable answer. Appendix A ties each material factor to the report's determination and the primary authority." },
      // 10
      { kind: "skeleton", text: "E. Record Sufficiency. Section 7152(a)(8) requires the report to identify the individuals who provided information for the assessment, except legal counsel who provided legal advice, and § 7151 requires employees who participate in the covered processing as part of their jobs to be included in the assessment process. Information providers: {informationProviders}. Internal participants: {internalContributors}. Operational participants: {operationalParticipants}." },
      // 11
      { kind: "conditional", text: "[CONDITIONAL] EXTERNAL PARTICIPANTS - trigger {i7_external_consultees} present. RISK_FIXED.external_participants_lead + list. Absent => omitted." },
      // 12
      { kind: "generated", text: "[GENERATED {{FACTOR.record_sources_summary + record_limitations + record_sufficiency_analysis + record_sufficiency_conclusion + record_gap_consequence + nonmaterial_record_follow_up}}] Record Considered, Information Gaps or Inconsistencies, Assessment, Conclusion (Complete | Qualified | Materially Incomplete), and the material/nonmaterial gap consequences with their fixed leads. Phase C. Absent => omitted." },
    ],
  },
  {
    id: "ii_processing_context",
    title: "II. THE PROCESSING IN CONTEXT",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. How the Processing Works. Section 7152(a)(3)(A) requires the report to identify how the Company plans to collect, use, disclose, retain, or otherwise process the information, together with its sources. Entry point: {processingEntryPoint}. Processing stages: {processingMethods}. Result: {processingResult}." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.processing_coherence_analysis + processing_description_conclusion + processing_clarification_required}}] Phase C. Absent => omitted." },
      // 2
      { kind: "skeleton", text: "B. Consumers and the Interaction. Sections 7152(a)(3)(C)–(D) require the assessment to identify how the business interacts with the consumers whose information is processed, the purpose of that interaction, and the approximate number of consumers affected. The Company reports the following. Method of interaction: {interactionMethod}. Purpose of the interaction: {interactionPurpose}. Approximate California consumers affected: {approxCaConsumers}. These facts help explain both consumer expectations and the potential reach of a risk." },
      // 3
      { kind: "generated", text: "[GENERATED {{FACTOR.consumer_context_analysis + consumer_context_conclusion}}] Phase C. Absent => omitted." },
      // 4
      { kind: "skeleton", text: "C. Personal Information. Section 7152(a)(2) requires the report to identify the categories of personal information and sensitive personal information involved and the minimum information necessary to achieve the purpose. The activity processes {piCategories}." },
      // 5
      { kind: "conditional", text: "[CONDITIONAL] SENSITIVE PERSONAL INFORMATION - trigger: SPI in the activity. RISK_FIXED.spi_lead + {{DERIVED.activity_spi_inventory}} + RISK_FIXED.spi_note. Absent => omitted." },
      // 6
      { kind: "generated", text: "[GENERATED {{FACTOR.pi_profile_conclusion}}] Phase C. Absent => omitted." },
      // 7
      { kind: "skeleton", text: "Detailed data-category and category-level retention information appears in Appendix C — Processing and Data Inventory." },
      // 8
      { kind: "skeleton", text: "D. Sources of Information. Section 7152(a)(3)(A) requires the Company to identify the sources of the personal information used in the processing. The Company identifies the following source or sources: {i4bSources}. Source matters because it can affect accuracy, consumer expectations, and the importance of notice or choice." },
      // 9
      { kind: "generated", text: "[GENERATED {{FACTOR.source_risk_analysis + source_conclusion + source_consequence}}] Phase C. Absent => omitted." },
      // 10
      { kind: "skeleton", text: "E. Recipients and Disclosures. Section 7152(a)(3)(F) requires the report to identify the service providers, contractors, or third parties that receive or can access the information for the processing, together with the purpose of the disclosure. The following service providers, contractors, or third parties receive or have access to personal information in connection with the activity: {recipientsNames}. For each material recipient, the record identifies the recipient name or category, recipient type, personal-information categories made available, and purpose of the disclosure: {recipientsDetail}. A disclosure can change the risk profile because another organization may use, secure, retain, or further disclose the information." },
      // 11
      { kind: "generated", text: "[GENERATED {{FACTOR.recipient_risk_analysis + recipient_conclusion + material_vendor_dependency}}] Material vendor dependency gets fixed lead \"The processing materially depends on:\" and the note \"The effectiveness of the related contractual, technical, or oversight controls is considered in Section VIII.\" Phase C. Absent => omitted." },
      // 12
      { kind: "skeleton", text: "F. Retention. Section 7152(a)(3)(B) requires the report to identify how long each category of personal information will be retained or, if the period is not known, the criteria used to determine it. The Company reports {retentionPeriod}, determined using {retentionCriteria}. {retentionDetail}. Category-level retention detail appears in Appendix C." },
      // 13
      { kind: "generated", text: "[GENERATED {{FACTOR.retention_analysis + retention_conclusion + retention_consequence}}] Phase C. Absent => omitted." },
    ],
  },
  {
    id: "iii_necessity",
    title: "III. NECESSITY AND DATA MINIMIZATION",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. The Necessity Question. Section 7152(a)(2) requires the report to identify the minimum personal information necessary to achieve the stated purpose. The Company identifies the minimum information needed as {minPi}. The analysis therefore asks whether each material element genuinely contributes to that purpose or whether the Company can achieve the same result with less precise, less sensitive, or less extensive information. Detailed element-level analysis appears in Appendix D." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.necessary_elements + necessary_elements_reasoning}}] Fixed sub-head \"B. Analysis. Information Supported as Necessary\". Phase C. Absent => omitted." },
      // 2
      { kind: "conditional", text: "[CONDITIONAL] UNNECESSARY ELEMENTS - trigger {{FACTOR.unnecessary_elements}} present. Fixed lead \"Information Not Shown to Be Necessary\" + fixed note \"Processing information that does not materially advance the stated purpose creates privacy exposure without a corresponding contribution to the benefit being assessed.\" Phase C. Absent => omitted." },
      // 3
      { kind: "conditional", text: "[CONDITIONAL] UNCERTAIN NECESSITY - trigger {{FACTOR.uncertain_elements}} present. Fixed lead \"Necessity Not Yet Established\" + fixed note \"Current use is not treated as proof of necessity. Where the Company cannot yet establish why an element is required, that uncertainty remains part of the assessment.\" Phase C. Absent => omitted." },
      // 4
      { kind: "generated", text: "[GENERATED {{FACTOR.necessity_conclusion + necessity_conclusion_explanation}}] Fixed sub-head \"C. Conclusion\". Phase C. Absent => omitted." },
      // 5
      { kind: "conditional", text: "[CONDITIONAL] MINIMIZATION CONDITION - trigger {{FACTOR.minimization_condition}} present. Fixed lead \"D. Consequence. Condition to Proceed\". Phase C. Absent => omitted." },
      // 6
      { kind: "conditional", text: "[CONDITIONAL] MINIMIZATION FOLLOW-UP - trigger {{FACTOR.minimization_follow_up}} present. Fixed lead \"Required Assessment Follow-Up\". Phase C. Absent => omitted." },
      // 7
      { kind: "conditional", text: "[CONDITIONAL] MINIMIZATION RECOMMENDATION - trigger {{FACTOR.minimization_recommendation}} present. Fixed lead \"Recommendation\". Phase C. Absent => omitted." },
    ],
  },
  {
    id: "iv_consumer_transparency",
    title: "IV. CONSUMER CONTEXT, TRANSPARENCY, AND CONTROL",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. Consumer Perspective. Section 7152(a)(5) requires the assessment to identify negative privacy impacts and their sources and causes. The regulation specifically calls out impaired consumer control and coercion as examples of privacy harms. The same processing can therefore carry different risk depending on what consumers are told, what they reasonably expect, and what practical control they can exercise." },
      // 1 — D7: the disclosures paragraph appears twice in the docx; rendered once here.
      { kind: "skeleton", text: "B. Transparency. Section 7152(a)(3)(E) requires the report to identify the disclosures the Company has made or plans to make about the processing and how those disclosures are or will be delivered. Section 7152(a)(5)(C) also treats insufficient information that prevents an informed choice as a potential privacy harm. The Company identifies the following disclosures: {activityDisclosures}. Relevant public-facing materials include {privacyPolicyUrl}." },
      // 2
      { kind: "generated", text: "[GENERATED {{FACTOR.transparency_analysis + transparency_conclusion + transparency_consequence}}] Phase C. Absent => omitted." },
      // 3
      { kind: "skeleton", text: "C. Consumer Expectations. Section 7152(a)(5)(C) identifies interference with consumers’ ability to make choices consistent with their reasonable expectations as a potential negative impact. The activity is therefore evaluated against the context in which the information is obtained and the expectations created by the consumer interaction and the Company’s disclosures." },
      // 4
      { kind: "generated", text: "[GENERATED {{FACTOR.consumer_expectations_analysis + unexpected_processing + consumer_expectations_conclusion}}] Unexpected processing gets fixed lead \"The following aspect of the processing may fall outside the expectations created by the consumer interaction:\" and note \"Unexpected processing is not automatically prohibited. It can, however, increase the importance of notice, choice, minimization, or another safeguard.\" Phase C. Absent => omitted." },
      // 5
      { kind: "skeleton", text: "D. Practical Consumer Control. Section 7152(a)(5)(C) treats impaired consumer control as a potential privacy harm, including where consumers lack enough information to make an informed decision or cannot make choices consistent with reasonable expectations. Consumer rights reduce risk only when consumers can use them in practice and exercising the right meaningfully changes the processing." },
      // 6
      { kind: "generated", text: "[GENERATED {{FACTOR.relevant_consumer_controls + consumer_control_analysis + consumer_control_conclusion + consumer_control_consequence}}] Controls list gets fixed lead \"Relevant consumer rights and controls include:\" — projection of the established consumer-rights facts (q6–q10); the factor engine may not invent rights or controls. Phase C. Absent => omitted." },
      // 7
      { kind: "skeleton", text: "E. Coercion, Compulsion, and Choice Architecture. Section 7152(a)(5)(D) identifies coercing or compelling consumers into unnecessary processing — including through conditioning a service on unnecessary disclosure or using dark patterns — as a potential negative impact. The Company’s design should therefore avoid forcing or steering consumers into processing that is unnecessary to the service or opportunity they reasonably expect." },
      // 8
      { kind: "generated", text: "[GENERATED {{FACTOR.coercion_analysis + coercion_conclusion + coercion_consequence}}] Phase C. Absent => omitted." },
    ],
  },
  {
    id: "v_admt",
    title: "V. AUTOMATED DECISIONMAKING TECHNOLOGY",
    blocks: [
      // Inclusion driven by facts/legal applicability (relevant ADMT trigger or
      // processing fact), not by factor availability — spine note 4. Every
      // block is trigger-gated. v4.7.2: for non-ADMT activities the section
      // no longer vanishes — block 0 carries the one-line not-applicable
      // record instead (composeAdmtBlocks), so the fixed section numbering
      // never shows an unexplained IV→VI gap.
      // 0
      { kind: "conditional", text: "[CONDITIONAL] ADMT A — ROLE - trigger: ADMT in the activity. RISK_FIXED.admt_a over {{INTAKE.q19_admt_description, admt_operational_role}}. Absent => the v4.7.2 not-applicable line (this activity does not involve ADMT)." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.admt_role_analysis + admt_role_conclusion}}] Phase C. Absent => omitted." },
      // 2
      { kind: "conditional", text: "[CONDITIONAL] ADMT B — LOGIC - trigger: ADMT. RISK_FIXED.admt_b over {{INTAKE.i5_admt_logic, admt_assumptions_limitations}}. Absent => omitted." },
      // 3
      { kind: "generated", text: "[GENERATED {{FACTOR.admt_logic_analysis + admt_logic_conclusion}}] Phase C. Absent => omitted." },
      // 4
      { kind: "conditional", text: "[CONDITIONAL] ADMT C — OUTPUT AND DECISION EFFECT - trigger: ADMT. RISK_FIXED.admt_c over {{INTAKE.admt_output, admt_output_use, admt_consumer_effect}}. Absent => omitted." },
      // 5
      { kind: "generated", text: "[GENERATED {{FACTOR.admt_decision_effect_analysis + admt_decision_role_conclusion}}] Phase C. Absent => omitted." },
      // 6
      { kind: "conditional", text: "[CONDITIONAL] ADMT D — HUMAN REVIEW - trigger: ADMT. RISK_FIXED.admt_d over {{INTAKE.i5_admt_human_review}}. Absent => omitted." },
      // 7
      { kind: "generated", text: "[GENERATED {{FACTOR.human_review_effectiveness_analysis + human_review_conclusion + human_review_consequence}}] Phase C. Absent => omitted." },
      // 8
      { kind: "conditional", text: "[CONDITIONAL] ADMT E — ACCURACY, FAIRNESS, AND BIAS - trigger: ADMT. RISK_FIXED.admt_e over {{INTAKE.i5_admt_fairness_testing}}. Absent => omitted." },
      // 9
      { kind: "generated", text: "[GENERATED {{FACTOR.admt_testing_analysis + admt_testing_conclusion}}] Phase C. Absent => omitted." },
      // 10
      { kind: "conditional", text: "[CONDITIONAL] ADMT F — TRAINING DATA - trigger: ADMT. RISK_FIXED.admt_f over {{INTAKE.i5_admt_training_source}}. Absent => omitted." },
      // 11
      { kind: "generated", text: "[GENERATED {{FACTOR.training_data_analysis + training_data_conclusion}}] Phase C. Absent => omitted." },
      // 12
      { kind: "conditional", text: "[CONDITIONAL] ADMT G — § 7153 PROVIDED TO ANOTHER BUSINESS - trigger: ADMT trained using PI and made available to another business for a significant decision. RISK_FIXED.admt_g over {{INTAKE.admt_made_available_to_other_business, admt_provider_trained_using_pi, recipient_business_uses_admt_for_significant_decision}}. Absent => omitted." },
      // 13
      { kind: "generated", text: "[GENERATED {{FACTOR.admt_recipient_business_analysis/conclusion/consequence + admt_overall_conclusion + admt_overall_reasoning}}] Fixed sub-head \"H. Overall ADMT Conclusion\". Phase C. Absent => omitted." },
      // 14
      { kind: "conditional", text: "[CONDITIONAL] ADMT APPENDIX POINTER - trigger: ADMT. RISK_FIXED.admt_appendix_pointer. Absent => omitted." },
    ],
  },
  {
    id: "vi_benefits",
    title: "VI. BENEFITS OF THE PROCESSING",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. How Benefits Are Considered. Section 7152(a)(4) requires the assessment to identify benefits to the consumer, the business, other stakeholders, and the public from the same processing, and it rejects generic benefit descriptions. The assessment therefore gives weight only to benefits produced by this processing and supported by the Company’s information." },
      // 1
      { kind: "skeleton", text: "B. Benefits to Consumers." },
      // 2
      { kind: "conditional", text: "[CONDITIONAL] CONSUMER BENEFIT IDENTIFIED - trigger {benefit_consumer_identified}=Yes. RISK_FIXED.benefit_identifies_lead + {{INTAKE.a4_benefit_consumer}} + RISK_FIXED.benefit_supporting_lead + {{INTAKE.a4_benefit_consumer_fact}}. Absent => the no-benefit block below." },
      // 3
      { kind: "conditional", text: "[CONDITIONAL] NO CONSUMER BENEFIT ESTABLISHED - trigger: benefit not identified. RISK_FIXED.benefit_none_consumer. Absent => omitted." },
      // 4
      { kind: "generated", text: "[GENERATED {{FACTOR.consumer_benefit_analysis + consumer_benefit_weight}}] Weight lead \"Weight in the balancing analysis:\". Phase C. Absent => omitted." },
      // 5
      { kind: "skeleton", text: "C. Benefits to the Business." },
      // 6
      { kind: "conditional", text: "[CONDITIONAL] BUSINESS BENEFIT IDENTIFIED - trigger {benefit_business_identified}=Yes. RISK_FIXED leads + {{INTAKE.a4_benefit_business, a4_benefit_business_fact}}. Absent => the no-benefit block below." },
      // 7
      { kind: "conditional", text: "[CONDITIONAL] NO BUSINESS BENEFIT ESTABLISHED - RISK_FIXED.benefit_none_business [R2]. Absent => omitted." },
      // 8
      { kind: "generated", text: "[GENERATED {{FACTOR.business_benefit_analysis + business_benefit_weight}}] Phase C. Absent => omitted." },
      // 9
      { kind: "skeleton", text: "D. Benefits to Other Stakeholders." },
      // 10
      { kind: "conditional", text: "[CONDITIONAL] OTHER-STAKEHOLDER BENEFIT IDENTIFIED - trigger {benefit_other_stakeholders_identified}=Yes. RISK_FIXED leads + {{INTAKE.a4_benefit_other_stakeholders, a4_benefit_other_stakeholders_fact}}. Absent => the no-benefit block below." },
      // 11
      { kind: "conditional", text: "[CONDITIONAL] NO OTHER-STAKEHOLDER BENEFIT ESTABLISHED - RISK_FIXED.benefit_none_other [R2]. Absent => omitted." },
      // 12
      { kind: "generated", text: "[GENERATED {{FACTOR.other_stakeholder_benefit_analysis + other_stakeholder_benefit_weight}}] Phase C. Absent => omitted." },
      // 13 — v4.5 wording resolves the prior [R1] flag: attribution runs to the
      // Company, not "the record", so the v3 banned-register concern no longer
      // arises here.
      { kind: "skeleton", text: "E. Benefits to the Public. A claimed public benefit receives weight only where the Company identifies a concrete connection between this processing and the public outcome." },
      // 14
      { kind: "conditional", text: "[CONDITIONAL] PUBLIC BENEFIT IDENTIFIED - trigger {benefit_public_identified}=Yes. RISK_FIXED leads + {{INTAKE.a4_benefit_public, a4_benefit_public_fact}}. Absent => the no-benefit block below." },
      // 15
      { kind: "conditional", text: "[CONDITIONAL] NO PUBLIC BENEFIT ESTABLISHED - RISK_FIXED.benefit_none_public [R2]. Absent => omitted." },
      // 16
      { kind: "generated", text: "[GENERATED {{FACTOR.public_benefit_analysis + public_benefit_weight + material_benefits + discounted_benefits + discounted_benefit_reasoning + overall_benefits_conclusion + overall_benefits_reasoning}}] Fixed sub-head \"F. Overall Benefits Conclusion\"; material-benefits lead \"The benefits carrying the greatest weight are:\"; discounted lead \"The following claimed benefits receive reduced or no weight:\". Phase C. Absent => omitted." },
    ],
  },
  {
    id: "vii_risks",
    title: "VII. PRIVACY RISKS",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. How Risk Is Evaluated. Section 7152(a)(5) requires the assessment to identify negative impacts to consumers’ privacy and the sources and causes of those impacts. The regulation gives examples that include unauthorized access or loss of availability, unlawful discrimination, impaired consumer control, coercion, economic harm, physical harm, reputational harm, and psychological harm. Appendix E preserves the full risk detail; the body focuses on risks that materially affect the processing decision." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.material_risk_blocks}}] B. Material Risk Pathways — ranked repeatable blocks (title; pathway narrative; likelihood; severity; materiality; decision effect before safeguards), projected from the granular risk factors. Phase C. Absent => omitted." },
      // 2
      { kind: "skeleton", text: "C. Other Risk Categories Considered. The assessment also considers other negative impacts supported or reasonably implicated by the record, including as applicable unauthorized processing or loss of availability, unlawful discrimination, impairment of consumer control, coercion or compulsion, economic harm, physical harm, reputational harm, psychological harm, and other processing-specific consequences. A category is not assigned weight merely because it is possible in the abstract. Where the facts do not establish a credible path from this activity to the negative impact, it is not treated as a material risk." },
      // 3
      { kind: "generated", text: "[GENERATED {{FACTOR.other_risk_categories_summary}}] Phase C. Absent => omitted." },
      // 4
      { kind: "conditional", text: "[CONDITIONAL] INTERACTING RISKS - trigger: material interaction. Fixed first words \"D. Interacting Risks. Some risks become more significant in combination. For example, an error may become consequential only when used in a decision; sensitive information may become substantially more harmful when linked to location; or an otherwise correct inference may create greater risk where the consumer cannot understand or challenge it. For this activity:\" + {{FACTOR.risk_interdependency_analysis}}. Phase C. Absent => omitted." },
      // 5
      { kind: "generated", text: "[GENERATED {{FACTOR.inherent_material_risks + overall_inherent_risk_conclusion + inherent_risk_reasoning}}] Fixed sub-head \"E. Inherent Risk Conclusion\"; lead \"Before safeguards are given effect, the risks carrying the greatest weight are:\"; closing \"The next question is how materially the Company’s safeguards change that risk.\" Phase C. Absent => omitted." },
    ],
  },
  {
    id: "viii_safeguards",
    title: "VIII. SAFEGUARDS AND RESIDUAL RISK",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. Role of Safeguards. Section 7152(a)(6) requires the report to identify safeguards the Company plans to implement for the processing, including safeguards directed at the negative impacts identified in the assessment. The regulation gives examples ranging from security controls and privacy-enhancing technologies to external consultation and ADMT governance. The assessment gives greater credit where a safeguard is implemented and supported by evidence that it operates in practice." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.material_existing_safeguards + safeguard_effectiveness_analysis}}] Fixed sub-head \"B. Material Existing Safeguards\"; lead \"The safeguards most important to the analysis are:\". Phase C. Absent => omitted." },
      // 2
      { kind: "conditional", text: "[CONDITIONAL] TESTED SAFEGUARDS - trigger {{FACTOR.tested_safeguards}} present. Fixed lead \"The following controls are supported by evidence of implementation or testing:\" + note \"These controls receive greater weight because the assessment has evidence that they operate in practice.\" Phase C. Absent => omitted." },
      // 3
      { kind: "conditional", text: "[CONDITIONAL] UNTESTED SAFEGUARDS - trigger {{FACTOR.untested_safeguards}} present. Fixed lead \"The following controls are implemented but are not supported by sufficient testing or other evidence of effectiveness:\" + note \"They are credited as existing safeguards, but the absence of supporting evidence reduces the degree to which the assessment can rely on them.\" Phase C. Absent => omitted." },
      // 4
      { kind: "conditional", text: "[CONDITIONAL] PLANNED SAFEGUARDS - trigger {{FACTOR.planned_safeguards}} present. Fixed lead \"C. Planned Safeguards. The Company plans to implement:\" + note \"A planned safeguard does not eliminate present risk. Where the favorable determination depends materially on a safeguard that is not yet operational, implementation is treated as a Condition to Proceed rather than as an existing mitigation.\" Phase C. Absent => the v4.7.2 not-applicable line (no planned safeguards recorded), so the A-B-E lettering never shows an unexplained gap." },
      // 5
      { kind: "conditional", text: "[CONDITIONAL] SAFEGUARD GAPS - trigger {{FACTOR.safeguard_gaps}} present. Fixed lead \"D. Safeguard Gaps. The following material risk is not sufficiently addressed by safeguards established on the information provided:\". Phase C. Absent => the v4.7.2 none-identified line." },
      // 6
      { kind: "skeleton", text: "E. Residual Risk. Sections 7152(a)(5)–(6) require the assessment to consider the identified negative impacts together with the safeguards used to address them. Residual risk is the practical risk that remains after safeguards that can reasonably be credited are taken into account; that remaining risk is what enters the final balancing analysis under § 7154." },
      // 7
      { kind: "generated", text: "[GENERATED {{FACTOR.material_residual_risks + residual_risk_analysis + overall_residual_risk_conclusion + residual_risk_reasoning}}] Lead \"The principal residual risks are:\". Phase C. Absent => omitted." },
    ],
  },
  {
    id: "ix_balancing",
    title: "IX. BENEFITS–RISKS BALANCING AND PROCESSING DECISION",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. The Decision. Section 7152 requires the Company to determine whether the privacy risks from the processing outweigh the benefits to consumers, the business, other stakeholders, and the public. Section 7154 states the goal directly: processing should be restricted or prohibited when privacy risks outweigh those benefits. This section brings the analysis together in ordinary language rather than as a numerical score." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.pro_processing_factors + pro_processing_analysis}}] Fixed sub-head \"B. Factors Supporting the Processing\"; lead \"The considerations carrying the greatest weight in favor of the activity are:\". Phase C. Absent => omitted." },
      // 2
      { kind: "generated", text: "[GENERATED {{FACTOR.con_processing_factors + con_processing_analysis}}] Fixed sub-head \"C. Factors Weighing Against the Processing\"; lead \"The considerations carrying the greatest weight against the activity are:\". Phase C. Absent => omitted." },
      // 3
      { kind: "generated", text: "[GENERATED {{FACTOR.balancing_conclusion + balancing_reasoning + balancing_materiality + balancing_decision_effect}}] Fixed sub-head \"D. Overall Balancing Conclusion\" with the \"Balancing conclusion\", \"Materiality of the determination\" and \"Decision effect\" leads. The customer's impact_intake.benefitsOutweigh answer is perspective only and must never feed this conclusion. Phase C. Absent => omitted." },
      // 4
      { kind: "generated", text: "[GENERATED {{FACTOR.recommended_processing_outcome + recommended_processing_outcome_explanation + processing_consequence_type}}] Fixed sub-head \"E. Assessment Recommendation, Company Decision, and Consequences\"; lead \"Assessment recommendation\". Phase C. Absent => omitted." },
      // 5
      { kind: "conditional", text: "[CONDITIONAL] COMPANY DECISION - trigger: assessment finalized ({{FINAL.final_processing_decision}} present). RISK_FIXED.ix_company_decision + {{FINAL.final_processing_decision_notes}}. Absent => omitted." },
      // 6
      { kind: "conditional", text: "[CONDITIONAL] CONDITIONS TO PROCEED - trigger {{FACTOR.conditions_to_proceed}} present. Fixed lead \"Conditions to Proceed\". Phase C. Absent => omitted." },
      // 7
      { kind: "conditional", text: "[CONDITIONAL] REQUIRED ASSESSMENT FOLLOW-UP - trigger {{FACTOR.required_assessment_follow_up}} present. Fixed lead \"Required Assessment Follow-Up\". Phase C. Absent => omitted." },
      // 8
      { kind: "conditional", text: "[CONDITIONAL] RECOMMENDATIONS - trigger {{FACTOR.recommendations}} present. Fixed lead \"Recommendations\". Phase C. Absent => omitted." },
    ],
  },
  {
    id: "x_governance",
    title: "X. GOVERNANCE, APPROVAL, REVIEW, AND CPPA SUBMISSION SUPPORT",
    blocks: [
      // 0
      { kind: "conditional", text: "[CONDITIONAL] APPROVAL AND ACCOUNTABILITY - trigger: any finalization/approval fact present ({{FINAL.assessment_reviewers_approvers}}, {{FINAL.a9_approval_date}} or the a9 approver migration source, {{FINAL.approver_authority_confirmed}}). RISK_FIXED.x_approval_* over those facts. Absent => omitted." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.approver_authority_analysis + approval_sufficiency_conclusion + approval_follow_up}}] Phase C. Absent => omitted." },
      // 2
      { kind: "skeleton", text: "B. Assessment Timing. Section 7155(a)(1) requires a risk assessment before the Company initiates processing that falls within § 7150(b). Section 7155(b) gives businesses until December 31, 2027 to complete assessments for covered processing begun before the regulations’ effective date and continuing afterward. Processing status: {processingStatus}. Actual start date: {processingStartDate}. Planned start date: {plannedStartDate}." },
      // 3
      { kind: "conditional", text: "[CONDITIONAL] TIMING RULE AND DEADLINE - trigger: processing status/start date established. RISK_FIXED.x_timing_post2026 or RISK_FIXED.x_timing_pre2026 + {{DERIVED.initial_assessment_deadline}}. Absent => omitted." },
      // 4
      { kind: "skeleton", text: "C. Review and Material Changes. Section 7155(a)(2) requires review at least once every three years. Section 7155(a)(3) requires an earlier update whenever a material change creates new negative impacts, increases the magnitude or likelihood of existing impacts, or diminishes safeguard effectiveness; that update is due as soon as feasible and no later than 45 calendar days after the material change. Material change since prior assessment: {materialChange}. Next scheduled review: {nextReviewDate}." },
      // 5
      { kind: "conditional", text: "[CONDITIONAL] MATERIAL CHANGE DETAILS - trigger {material_change_since_prior}=Yes. RISK_FIXED.x_material_change_* labels over {{INTAKE.material_change_date, material_change_description, prior_risk_assessment_date}}. Absent => omitted." },
      // 6
      { kind: "generated", text: "[GENERATED {{FACTOR.governance_review_analysis + governance_review_conclusion + governance_review_consequence}}] Phase C. Absent => omitted." },
      // 7
      { kind: "skeleton", text: "D. Retention of the Assessment Record. Section 7155(c) requires the Company to retain original and updated risk assessments for as long as the processing continues or for five years after completion of the assessment, whichever is later. {retentionEndRule}. Supporting materials should be retained with the assessment where they are material to a finding, safeguard, or decision." },
      // 8 — D6: certifier_* and cppa_submission_contact_* are organization-level
      // fields; the slots resolve through the org profile when present on the
      // bag and drop honestly otherwise.
      { kind: "skeleton", text: "E. CPPA Submission Support Record (§ 7157). Section 7157 requires businesses to submit specified risk-assessment information to the Agency on the regulatory schedule rather than routinely submitting each full assessment. For assessments conducted in 2026 and 2027, the first submission is due April 1, 2028; later submissions are due by April 1 following a year in which assessments were conducted. The submission includes business/contact information, the reporting period, counts and categories of assessments, PI/SPI categories, an attestation, and the submitting executive’s name, title, and certification date. The submitting individual must be an executive-management member who is directly responsible for risk-assessment compliance, sufficiently knowledgeable, and authorized to submit. The Agency or Attorney General may separately require the Company to submit its full risk-assessment reports, which must be provided within 30 calendar days of the request. Certifying executive: {certExecName}, {certExecTitle}. Phone: {certContactPhone}. Email: {certContactEmail}. Executive-management status: {certifierIsExec}. Direct responsibility: {certifierResponsible}. Sufficient knowledge: {certifierKnowledge}. Authorized to submit: {certifierAuthorized}. Business point of contact: {submissionContact}." },
      // 9
      { kind: "generated", text: "[GENERATED {{FACTOR.certifying_executive_eligibility_analysis}}] Phase C. Absent => omitted." },
    ],
  },
  // CEO REPORT REVIEW 2026-08-24 — SIGNATURE PAGES. Two new front-of-
  // appendix pages, positioned after the body (Section X) and before the
  // first appendix. Neither is itself an "Appendix" (the lettering below
  // is untouched) — both are plain report_determination-free pages a
  // customer prints and routes for signature. "Review and Approval" is
  // descriptive, not an attestation; it simply gives the Section I.E named
  // reviewers/approvers a physical line to sign. The submission checklist
  // states, and only states, what § 7157 already requires — it never
  // performs the § 7157(d) portal submission itself.
  {
    id: "review_and_approval",
    title: "Review and Approval",
    blocks: [
      // 0
      { kind: "skeleton", text: "This risk assessment was prepared from the information the Company supplied and is retained in accordance with 11 CCR § 7155(c). The individuals below reviewed this assessment as of the date indicated." },
      // 1
      { kind: "table", text: "review_approval_signatures" },
    ],
  },
  {
    id: "agency_submission_checklist",
    title: "Agency Submission Checklist (11 CCR § 7157)",
    blocks: [
      // 0
      { kind: "skeleton", text: "If this risk assessment is subject to the submission requirement under 11 CCR § 7157(a), a member of the Company’s executive management team who meets the qualifications of 11 CCR § 7157(c) must submit the following information to the California Privacy Protection Agency through the Agency’s website at https://cppa.ca.gov/ (11 CCR § 7157(d)). This report does not submit this information on the Company’s behalf — that step must be completed separately, by that individual, on the Agency’s site." },
      // 1
      { kind: "table", text: "agency_submission_checklist" },
      // 2
      { kind: "skeleton", text: "The submitting executive must additionally attest, on the Agency’s portal, to the following statement required by § 7157(b)(5): \"I attest that the business has conducted a risk assessment for the processing activities set forth in California Code of Regulations, Title 11, section 7150, subsection (b), during the time period covered by this submission, and that I meet the requirements of section 7157, subsection (c). Under penalty of perjury under the laws of the state of California, I hereby declare that the risk assessment information submitted is true and correct.\" No signature is required for this step — it is completed as an online attestation, not a signed document." },
    ],
  },
  {
    // CEO REPORT REVIEW 2026-08-23/24 — APPENDIX REORDER. Section id kept
    // as "table_of_authorities": generate-report-pdf forces a fresh page on
    // this id across every SO spine. This section was Appendix G; it now
    // leads the appendix set as Appendix A — the determination matrix is
    // the appendix with the most end-user value (the CEO's own framing),
    // so it comes first, followed by persuasive authority (formerly I, now
    // B), then the four analytical-detail appendices in their prior
    // relative order (formerly A/B/C/D, now C/D/E/F), then the two record-
    // keeping appendices (formerly E/F, now G/H). Former Appendix H (EUP
    // Methodology) is RETIRED below — it has no intake trigger and has
    // never once rendered; dropping it is zero customer-visible change.
    // No appendix content lost; only order and letters change. v4.5.1
    // (CEO-ratified 2026-08-22) drops the separate intake-data column:
    // intake facts and report language merge into one Report Determination
    // sentence per factor, matching the fleet-wide convention (see the
    // identical change to DPIA's Appendix A).
    id: "table_of_authorities",
    title: "Appendix A — Factor, Determination, and Authority Matrix",
    blocks: [
      // 0 — CEO report review 2026-08-24: opening paragraph rewritten
      // verbatim to the CEO's own text.
      { kind: "skeleton", text: "The table below identifies the factors analyzed in this assessment, the determinations made for each factor based on the information provided, and the corresponding controlling authority." },
      // 1 — {{DERIVED.factor_input_determination_authority_matrix}}, assembled
      // in risk-skeleton-assemble.ts from the v4.5 Verified Factor-to-Authority
      // Registry (Part 3.G) over the factor engine's own provenance/output —
      // the same values already printed in the body. No new legal content: a
      // suppressed row means the underlying factor did not compose.
      { kind: "table", text: "factor_authority_matrix" },
    ],
  },
  {
    // v4.6 (2026-08-22) — PHASE 2 of the corpus program (doc 49 A.2.4):
    // the S5 Persuasive Authority surface, fed from the Risk CAM
    // (risk-corpus-map.ts) by pure attachment over the report's own typed
    // trigger states. Resolves PN-CORPUS-2 (the fetched-but-homeless
    // eu_authority_corpus payload now has its spine home; the CAM, not
    // the fetch, supplies generation). Every block is conditional/table:
    // when no precedent row attaches (e.g., no trigger engaged), the
    // section drops entirely under the no-padding law. The lead and
    // warning wording live in risk-skeleton-assemble.ts as ratified
    // constants (advance-ratification ledger, 2026-08-22 build). Was
    // Appendix I; now B (2026-08-23/24 reorder, see above).
    id: "appendix_i",
    title: "Appendix B — Persuasive Authority (Analogous Enforcement)",
    blocks: [
      // 0 — lead: the standing disclaimer (analogous, not binding;
      // GDPR ≠ CCPA). Composed iff ≥1 precedent row attaches.
      { kind: "conditional", text: "[CONDITIONAL] PERSUASIVE AUTHORITY LEAD - composed by the assembler iff at least one CAM precedent row attaches for this report's fired trigger states. Absent => the whole appendix is omitted." },
      // 1 — {{DERIVED.persuasive_authority_matrix}} — doc 46 3-column
      // shape extended with a "What happened" column; one row per
      // attached AP entry, factor-keyed both ways (Factor-Bearing Law).
      { kind: "table", text: "persuasive_authority_matrix" },
      // 2 — adverse-outcome warning (AOW): composed iff the CAM's bound
      // adverse state fired (trigger engaged + assessment record
      // incomplete). Ratified wording from the CAM row; absent => omitted.
      { kind: "conditional", text: "[CONDITIONAL] ADVERSE-OUTCOME WARNING - composed by the assembler iff the AOW row's bound adverse state fired. Absent => omitted." },
    ],
  },
  {
    id: "appendix_a",
    title: "Appendix C — Processing and Data Inventory",
    blocks: [
      // 0
      { kind: "skeleton", text: "This appendix contains the detailed factual inventory supporting Section II, including personal-information and sensitive-personal-information categories, sources, processing methods, consumer interaction, scale, disclosures, recipients, and category-level retention." },
      // 1 — Part B item 3 (2026-08-21, CEO-confirmed, presentation only):
      // was "rule" (a joined string that fell through to the plain-
      // paragraph branch); now "table", assembled deterministically from
      // the Intake Contract v2.0 structured facts (q4_pi_categories × SPI
      // map, i4b_sources, processing_entry_point/methods/result, consumer
      // interaction, approximate_ca_consumers, activity_disclosures,
      // recipients, retention_by_pi_category, i2 retention record). Adds
      // no operational fact not established in the record.
      { kind: "table", text: "processing_and_data_inventory" },
    ],
  },
  {
    id: "appendix_b",
    title: "Appendix D — Necessity and Minimization Matrix",
    blocks: [
      // 0 — CEO report review 2026-08-23/24: was a single "generated" block
      // whose composer joined per-element lines into one string (fell
      // through to the plain-paragraph renderer, so it never actually
      // rendered as a matrix). Now a skeleton intro + a real table
      // (buildNecessityMatrixTable in risk-factor-engine.ts), matching the
      // Appendix C/F/G/H pattern. Same underlying facts, same wording.
      { kind: "skeleton", text: "This appendix provides the element-level analysis underlying Section III. For each material personal-information element, it records the function of the information, whether it is necessary to achieve the stated purpose, the basis for that conclusion, and any identified limitation or change." },
      // 1
      { kind: "table", text: "necessity_matrix" },
    ],
  },
  {
    id: "appendix_c",
    title: "Appendix E — Privacy Risk Register and Safeguard Mapping",
    blocks: [
      // 0 — CEO report review 2026-08-23/24: was a single "generated" block
      // whose composer joined per-pathway lines into one string (fell
      // through to the plain-paragraph renderer, so it never actually
      // rendered as a register). Now a skeleton intro + a real table
      // (buildRiskAndSafeguardRegisterTable in risk-factor-engine.ts),
      // matching the Appendix C/F/G/H pattern. Same underlying facts, same
      // wording.
      { kind: "skeleton", text: "This appendix provides the detailed analytical record underlying Sections VII and VIII. For each identified risk, the register records the negative impact, personal information involved, relevant actor or event, source and cause, likelihood, severity, materiality, relevant safeguards, safeguard status, residual risk, and effect on the processing decision. The mapping of risks to safeguards is an EUP analytical method designed to make the reasoning transparent and reviewable. It is not presented as a regulator-prescribed report format." },
      // 1
      { kind: "table", text: "risk_and_safeguard_register" },
    ],
  },
  {
    id: "appendix_d",
    title: "Appendix F — ADMT Technical and Decision Record",
    blocks: [
      // 0
      { kind: "conditional", text: "[CONDITIONAL] ADMT APPENDIX INTRO - trigger: ADMT applicable. RISK_FIXED.appendix_d_intro. Absent => the v4.7.2 not-applicable line, so the fixed appendix lettering (E then G) never shows an unexplained gap." },
      // 1 — Part B item 3 (2026-08-21, CEO-confirmed, presentation only):
      // was "rule"; now "table" — labelled projection of the Section V
      // intake facts (q19_admt_description, admt_operational_role,
      // i5_admt_logic, admt_assumptions_limitations, admt_output,
      // admt_output_use, admt_consumer_effect, i5_admt_human_review,
      // i5_admt_fairness_testing, i5_admt_training_source, § 7153 facts).
      // Composed only when ADMT applies.
      { kind: "table", text: "admt_technical_facts" },
      // 2
      { kind: "generated", text: "[GENERATED {{FACTOR.admt_technical_analysis}}] Phase C. Absent => omitted." },
    ],
  },
  {
    id: "appendix_e",
    title: "Appendix G — CPPA Submission Support Record (§ 7157)",
    blocks: [
      // 0
      { kind: "skeleton", text: "This appendix preserves the assessment-level information contributed to the Company’s later business-level CPPA submission and identifies items that must be aggregated across assessments. It is an EUP support record, not a CPPA-prescribed form." },
      // 1 — Part B item 3 (2026-08-21, CEO-confirmed, presentation only):
      // was "rule"; now "table" — assessment-level contribution mapped
      // from the trigger classification, activity PI/SPI categories,
      // scale, status and certifying-executive record.
      { kind: "table", text: "submission_support_record" },
      // 2 — same fix; a fixed checklist of the § 7157 business-level
      // aggregates this individual assessment cannot determine. [R3]
      { kind: "table", text: "business_level_submission_outstanding" },
    ],
  },
  {
    id: "appendix_f",
    title: "Appendix H — Materials Considered",
    blocks: [
      // 0
      { kind: "skeleton", text: "This appendix lists the documents, technical materials, policies, contracts, assessments, and other factual materials identified or relied on for this assessment. Inclusion means the material formed part of the assessment record; it does not mean every statement was independently verified." },
      // 1 — Part B item 3 (2026-08-21, CEO-confirmed, presentation only):
      // was "rule"; now "table" — index of the intake record and the
      // materials it names (public privacy policy, existing DPIA/PIA
      // summary where provided).
      { kind: "table", text: "materials_considered_index" },
    ],
  },
  // Former Appendix H (EUP Methodology, id "appendix_h") RETIRED
  // 2026-08-23/24: it has no intake trigger ({{SYSTEM.include_methodology_
  // appendix}} is never set) and has never once composed in any fixture or
  // production render. Dropped from the spine entirely — zero customer-
  // visible change, one fewer appendix to read past.
];

/** Every byte-pinned fixed-prose string, in document order. Splice-barred. */
export const RISK_PROTECTED_FIXED_PROSE: readonly string[] = SKELETON_SECTIONS
  .flatMap((s) => s.blocks)
  .filter((b) => b.kind === "skeleton")
  .map((b) => b.text);

/**
 * v3 REGISTER BANS — carried forward unchanged. The attribution voice is law:
 * the company's facts are attributed to the company, never to "the record".
 */
export const RISK_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "the record reflects",
  "the record indicates",
  "the record demonstrates",
  "the record establishes",
  "on this record",
  "as the record makes clear",
];

/**
 * The lawyer-flagged verification set. Spine 4.3's fixed prose states the
 * § 7155 timing/retention rules and the § 7157 submission-support frame in
 * plain terms but carries no verbatim statutory quotation sentence requiring
 * corpus byte-support; the section-number references are labels. The registry
 * verification therefore has no entries at the 4.3 encode. Phase C factor
 * outputs carry their own pinpoints through the citation ledger.
 */
export interface SkeletonPinpoint {
  readonly pinpoint: string;
  readonly corpus_key: string;
  /** A substring that must appear in the corpus row's verbatim excerpt. */
  readonly supports: string;
}

export const RISK_SKELETON_PINPOINTS: readonly SkeletonPinpoint[] = [];

/**
 * APPENDIX G — the v4.5.1 factor/determination/authority matrix (CEO-ratified
 * 2026-08-22: 3 columns, intake data merged into the determination sentence).
 * Assembled deterministically in risk-skeleton-assemble.ts from the factor
 * engine's own provenance/output over the v4.5 Verified Factor-to-Authority
 * Registry (Part 3.G of the spine docx). A separate Table of Authorities no
 * longer prints (v4.5 Part 1, Voice/Presentation Rules).
 */
export const RISK_APPENDIX_G_RULE =
  "Each row is assembled from the same factor object that produced the body language: Factor (human-readable name, no field key) | Report Determination (the exact final customer-facing sentence(s) printed for that factor, already covering what the Company supplied and what the report concluded from it) | Primary Authority (the verified registry citation). A factor that is not applicable or does not contribute to a printed determination, finding, condition, follow-up item, recommendation, or material balancing determination is suppressed rather than printed as N/A.";
