// RK3-B — SPINE 4.3 ENCODE: CPPA Risk Assessment.
//
// RENDER LAW. The CEO-authored Spine 4.3 design draft
// `CPPA_Risk_Assessment_Spine_4.3.docx` (Intake Contract v2.0 aligned) is this
// product's render law, superseding the v3 skeleton encoded at ITEM SO-1.
// Every fixed-prose string in SKELETON_SECTIONS below is transcribed from that
// file. Nothing here may be reworded, re-punctuated or "improved" by code, by
// refinement, or by an agent: the skeleton's fixed prose is a protected leaf
// (splice-barred) and the conformance check byte-matches the assembled
// document against it outside the slots.
//
// Block kinds:
//   "skeleton"    — FIXED PROSE. Byte-pinned. Slots inside {braces} are the
//                   only mutable spans; the rest is law.
//   "lead"        — [DETERMINATION LEAD]: exactly one generated sentence,
//                   bound to its typed determination.
//   "generated"   — [GENERATED]: a {{FACTOR.*}} reasoning output. NOT composed
//                   in Phase B — per the NO-PADDING LAW an uncomposed block is
//                   omitted entirely, never padded, never announced. Phase C/D
//                   wire these through the factor engine (Fable 5 per CEO
//                   directive 2026-08-18).
//   "conditional" — [CONDITIONAL]: renders only when its trigger holds; the
//                   assembler composes it from the RISK_FIXED constants below
//                   plus intake facts. Otherwise omitted entirely.
//   "rule"        — a deterministic assembly rule ({{DERIVED.*}} report-view
//                   outputs), composed mechanically from established facts.
//
// PLACEHOLDER PROVENANCE (Spine 4.3 field-status legend):
//   {{INTAKE.*}} / {{FINAL.*}} — Intake Contract v2.0 factual fields → {slots}.
//   {{DERIVED.*}} — mechanical report-view outputs → "rule" blocks or slots.
//   {{FACTOR.*}}  — assumed future factor outputs → "generated" blocks.
//   {{SYSTEM.*}}  — run metadata → {assessmentDate} / {versionNumber} slots.
//
// SPINE NOTE 4 (docx internal notes): section inclusion is driven by legal
// applicability and established facts, not by factor availability. In Phase B
// the factor engine does not exist, so applicable sections render their fixed
// prose and factual record; a missing factor output surfaces at the completion
// gate in Phase C, never as silent narrowing of the fixed prose.

export const RISK_SKELETON_VERSION = "prose-plans-2026-08-18-spine-4.3-rk3-b";
export const RISK_SKELETON_SOURCE_FILE = "CPPA_Risk_Assessment_Spine_4.3.docx";
export const RISK_SKELETON_PROVENANCE =
  "CPPA_Risk_Assessment_Spine_4.3.docx — CEO-authored intake-aligned design draft; RK3-B encode 2026-08-18";
/** SHA-256 over the spine docx's paragraph text, newline-joined, in file order. */
export const RISK_SKELETON_CONTENT_HASH =
  "d3c398b98d701b8542e522eda5e5834ad8475a980442c51c3be9ceb3d02aac4f";

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
  | "rule";

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
 * RATIFICATION FLAGS (for CEO review at the RK3-B push):
 *   [R1] Spine VI.E fixed prose reads "unless the record shows a meaningful
 *        connection"; "the record shows" is in the v3 banned register, which
 *        the harness pins at zero findings. Encoded as "the record identifies"
 *        pending CEO ruling.
 *   [R2] Spine VI.B supplies a no-benefit-established sentence only for the
 *        consumer category. The business / other-stakeholder / public
 *        analogues below follow its pattern and need ratification.
 *   [R3] The SPI fallback (q15 sensitive-PI = Yes with no SPI-mapped q4
 *        category) and the mechanical DERIVED formats need ratification.
 */
export const RISK_FIXED = {
  confidential:
    "CONFIDENTIAL. This assessment contains information concerning the Company’s processing activities, systems, safeguards, and internal decision-making. Distribution should be limited to persons with an appropriate business or legal need to review it.",

  exec_company_decision_lead:
    "Company Decision. After reviewing the assessment, the Company records the following business decision:",
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
    "A. Role of the Technology. The Company describes the relevant automated system as: {q19}. The system participates in the processing as follows: {role}. The assessment focuses on what the technology actually does rather than the label applied to it. A tool that organizes information for a human decisionmaker presents different considerations from one whose output determines or materially shapes an outcome affecting the consumer.",
  admt_b:
    "B. Logic, Assumptions, and Limitations. The Company describes the logic of the system as: {logic}. The factual record should also identify material assumptions or limitations of that logic: {assumptions}. An automated system can operate as designed and still produce an inappropriate result where its inputs, assumptions, or learned relationships are poorly suited to the decision being made. Understanding those limitations is therefore part of understanding the risk.",
  admt_c:
    "C. Output and Decision Effect. The system produces: {output}. The Company uses that output as follows in the relevant decision: {outputUse}. The resulting effect on the consumer is: {consumerEffect}.",
  admt_d:
    "D. Human Review. The Company describes human review or appeal as follows: {humanReview}. Human involvement meaningfully reduces risk only where the reviewer can understand the relevant issue, has enough information and time to evaluate it, and has authority to reach a different result.",
  admt_e:
    "E. Accuracy, Fairness, and Bias. The Company reports the following testing: {testing}. Testing does not guarantee that an automated system will never produce an inappropriate outcome. It does provide evidence about whether relevant classes of error, bias, or disparate impact are being identified and addressed.",
  admt_f:
    "F. Training Data. The Company identifies the source of relevant training data as: {trainingSource}.",
  admt_g:
    "G. ADMT Provided to Another Business. Where the Company makes ADMT trained using personal information available to another business to make a significant decision, the assessment also considers whether the recipient business has access to the facts necessary to conduct its own risk assessment. The factual predicate for this branch is recorded as follows: ADMT made available to another business: {madeAvailable}. ADMT trained using personal information: {trainedPi}. Recipient business uses the ADMT for a significant decision: {recipientSignificant}.",
  admt_appendix_pointer:
    "The supporting technical record appears in Appendix D — ADMT Technical and Decision Record.",
  appendix_d_intro:
    "This appendix preserves the factual and analytical record necessary to understand the automated component of the processing. It should include, as applicable, the role of the technology, logic, assumptions and limitations, output, use of the output, human review, testing, training-data provenance, and facts relevant to § 7153.",

  benefit_identifies_lead: "The Company identifies:",
  benefit_supporting_lead: "Supporting information is:",
  benefit_none_consumer:
    "No distinct consumer benefit has been established on the present record. The assessment therefore gives this category no affirmative weight rather than creating a benefit that the record does not support.",
  // [R2] analogues of the VI.B consumer sentence, pending ratification.
  benefit_none_business:
    "No distinct business benefit has been established on the present record. The assessment therefore gives this category no affirmative weight rather than creating a benefit that the record does not support.",
  benefit_none_other:
    "No distinct benefit to other stakeholders has been established on the present record. The assessment therefore gives this category no affirmative weight rather than creating a benefit that the record does not support.",
  benefit_none_public:
    "No distinct public benefit has been established on the present record. The assessment therefore gives this category no affirmative weight rather than creating a benefit that the record does not support.",

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
    title: "CPPA PRIVACY RISK ASSESSMENT",
    blocks: [
      // 0
      { kind: "skeleton", text: "Prepared for: {entityName}. Processing Activity: {activityName}. Assessment Date: {assessmentDate}. Assessment Version: {versionNumber}." },
      // 1 — [CONDITIONAL: confidentiality designation] — RISK_FIXED.confidential; no intake trigger exists yet, so not composed in Phase B.
      { kind: "conditional", text: "[CONDITIONAL] CONFIDENTIALITY DESIGNATION - fixed text RISK_FIXED.confidential; trigger: confidentiality designation on the engagement. Absent => omitted." },
    ],
  },
  {
    id: "executive_summary",
    title: "EXECUTIVE SUMMARY",
    blocks: [
      // 0
      { kind: "skeleton", text: "Activity Assessed. This Risk Assessment evaluates the following processing activity undertaken by the Company: {activityName}. The Company describes the activity as: {subjectAnchor}. The Company states that the purpose of the processing is: {activityPurpose}. This assessment is specific to that activity, purpose, and the facts described in the assessment record. It is not a general evaluation of the Company’s privacy program or overall CCPA compliance." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.normalized_processing_purpose}}] Fixed first words \"For purposes of the analysis, that purpose is understood as:\" — clarifies, never rewrites, the Company’s stated purpose. Phase C. Absent => omitted." },
      // 2
      { kind: "skeleton", text: "Why the Assessment Is Required. California requires a risk assessment for specified processing that presents significant risk to consumers’ privacy. Based on the facts established for this activity, the following trigger or triggers apply: {derivedTriggers}. The purpose of the assessment is practical: to determine whether the privacy risks created by this processing outweigh the benefits of the same processing after relevant safeguards are considered." },
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
      { kind: "skeleton", text: "A. Processing Purpose. A useful risk assessment begins by defining precisely what the Company is doing and why. Without a sufficiently specific purpose, it is difficult to determine what information is actually needed, what benefits should be credited to the processing, or whether the resulting privacy risk is justified. The activity under review is: {activityName}. The Company states that the processing is intended to: {activityPurpose}." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.purpose_specificity_analysis + normalized_processing_purpose + purpose_conclusion}}] Assessment and conclusion of purpose specificity; where the purpose is narrowed or clarified, fixed note \"The formulation above clarifies the purpose for assessment purposes. It does not replace the factual description supplied by the Company; it identifies the purpose with enough precision to evaluate the information, benefits, and risks associated with the activity.\" Phase C. Absent => omitted." },
      // 2
      { kind: "skeleton", text: "B. Scope and Boundaries. The assessment covers processing undertaken for the purpose stated above. The distinction matters because a new purpose can change the necessity analysis, consumer expectations, relevant risks, and resulting balance even where the same information or technology is used." },
      // 3
      { kind: "generated", text: "[GENERATED {{FACTOR.in_scope_processing_description + out_of_scope_processing_description}}] In-scope / out-of-scope characterisation built from established processing facts. Phase C. Absent => omitted." },
      // 4
      { kind: "conditional", text: "[CONDITIONAL] SECONDARY USES - trigger {has_secondary_uses}=Yes. RISK_FIXED.secondary_uses_lead + {{INTAKE.secondary_activities}}. Factor analysis/conclusion/consequence follow in Phase C. Absent => omitted." },
      // 5
      { kind: "skeleton", text: "C. Regulatory Applicability. The CPPA regulations identify categories of processing that are treated as presenting significant risk to consumers’ privacy. The inquiry is directed to this processing activity rather than to the Company’s overall privacy posture. The following risk-assessment trigger or triggers apply on the present record: {derivedTriggers}." },
      // 6
      { kind: "generated", text: "[GENERATED {{FACTOR.full_trigger_analysis + uncertain_trigger + regulatory_applicability_conclusion}}] Per-trigger analysis; unresolved triggers get fixed lead \"The applicability of the following potential trigger cannot be resolved from the current record:\". Phase C. Absent => omitted." },
      // 7
      { kind: "conditional", text: "[CONDITIONAL] COMPARABLE PROCESSING - trigger: related activities identified. Fixed first words \"The Company has identified related activities that may be sufficiently similar to be assessed together. Related processing may be addressed in one assessment where the activities are similar and present similar privacy risks.\" + {{FACTOR.comparable_processing_analysis/conclusion}}. Phase C. Absent => omitted." },
      // 8
      { kind: "conditional", text: "[CONDITIONAL] PRIOR DPIA / PIA / OTHER ASSESSMENT - trigger {i9_has_existing_dpia}=Yes. RISK_FIXED.prior_assessment_lead + {{INTAKE.i9_existing_dpia_summary}} + RISK_FIXED.prior_assessment_note. Absent => omitted." },
      // 9
      { kind: "skeleton", text: "D. Evidentiary Basis. This assessment is based on information supplied by or on behalf of the Company, materials identified in Appendix F — Materials Considered, and the legal and regulatory authorities identified in Appendix G — Table of Authorities. The report distinguishes among facts supplied by the Company, facts mechanically derived from those supplied facts, analytical conclusions reached by applying the relevant legal and regulatory factors, and unresolved information that could affect the analysis. The assessment does not resolve a material factual gap by assuming the answer most favorable to the processing. Where a fact needed for the assessment is not established in the current intake or supporting record, it should be collected as a factual input rather than inferred by the factor engine." },
      // 10
      { kind: "skeleton", text: "E. Record Sufficiency. Every conclusion that follows depends on the quality of the factual record. A gap is important not because every unanswered question is legally significant, but because missing information can change the assessment of necessity, risk, safeguards, or the ultimate balance. The following individuals provided information for this assessment: {informationProviders}. The Company also identifies the following internal personnel who participated in or were consulted regarding the activity: {internalContributors}. For purposes of the assessment process, the Company has confirmed that the employees whose job duties include participation in the covered processing were included as follows: {operationalParticipants}." },
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
      { kind: "skeleton", text: "A. How the Processing Works. Privacy risk is easier to evaluate when the processing is described as an operational sequence rather than as a product or system name. For this activity, personal information enters the process through: {processingEntryPoint}. The planned methods for collecting, using, disclosing, retaining, and otherwise processing personal information are: {processingMethods}. For readability, those structured facts may be presented in the report as the following operational sequence: {lifecycleNarrative}. The processing produces or supports: {processingResult}." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.processing_coherence_analysis + processing_description_conclusion + processing_clarification_required}}] Phase C. Absent => omitted." },
      // 2
      { kind: "skeleton", text: "B. Consumers and the Interaction. The assessment considers both how the Company interacts with the consumer and why that interaction occurs. Those facts provide important context for expectations, transparency, and the practical significance of the processing. Method of interaction: {interactionMethod}. Purpose of the interaction: {interactionPurpose}. The approximate number of California consumers affected is: {approxCaConsumers}. The number of affected consumers informs the potential reach of a risk, but it does not determine its seriousness. A risk affecting relatively few consumers can still be significant where the information or consequence is sensitive, while processing at substantial scale may present a more limited individual impact where the information and use are appropriately constrained." },
      // 3
      { kind: "generated", text: "[GENERATED {{FACTOR.consumer_context_analysis + consumer_context_conclusion}}] Phase C. Absent => omitted." },
      // 4
      { kind: "skeleton", text: "C. Personal Information. The activity processes the following categories of personal information: {piCategories}. The detailed information used in the activity is described in the processing record as: {piInventory}." },
      // 5
      { kind: "conditional", text: "[CONDITIONAL] SENSITIVE PERSONAL INFORMATION - trigger: SPI in the activity. RISK_FIXED.spi_lead + {{DERIVED.activity_spi_inventory}} + RISK_FIXED.spi_note. Absent => omitted." },
      // 6
      { kind: "generated", text: "[GENERATED {{FACTOR.pi_profile_conclusion}}] Phase C. Absent => omitted." },
      // 7
      { kind: "skeleton", text: "The detailed processing and data inventory, including category-level retention, appears in Appendix A — Processing and Data Inventory." },
      // 8
      { kind: "skeleton", text: "D. Sources of Information. The Company identifies the following sources: {i4bSources}. The source of information can affect both accuracy and consumer expectations. Information given directly by a consumer for a particular transaction may present different considerations from information inferred by the Company, obtained from another business, purchased from a third party, or produced by an automated system." },
      // 9
      { kind: "generated", text: "[GENERATED {{FACTOR.source_risk_analysis + source_conclusion + source_consequence}}] Phase C. Absent => omitted." },
      // 10
      { kind: "skeleton", text: "E. Recipients and Disclosures. The following service providers, contractors, or third parties receive or have access to personal information in connection with the activity: {recipientsNames}. For each material recipient, the structured record identifies the recipient name or category, recipient type, personal-information categories made available, and purpose of the disclosure: {recipientsDetail}. A disclosure can change the risk profile because another organization may possess, use, secure, retain, or further disclose information outside the Company’s immediate operational environment." },
      // 11
      { kind: "generated", text: "[GENERATED {{FACTOR.recipient_risk_analysis + recipient_conclusion + material_vendor_dependency}}] Material vendor dependency gets fixed lead \"The processing materially depends on:\" and the note \"The effectiveness of the related contractual, technical, or oversight controls is considered in Section VIII.\" Phase C. Absent => omitted." },
      // 12
      { kind: "skeleton", text: "F. Retention. The Company reports the following overall retention period or practice: {retentionPeriod}. The period is determined using: {retentionCriteria}. {retentionDetail}. Where retention differs by category of personal information, the assessment record should identify the period for each category or, if the period is not known, the criteria used to determine it. Category-level retention appears in Appendix A. {retentionByCategory}. Retention should remain connected to the purpose that justified processing the information. Once the information no longer serves that purpose or another independently justified obligation, continued retention can increase exposure without increasing the corresponding benefit." },
      // 13
      { kind: "generated", text: "[GENERATED {{FACTOR.retention_analysis + retention_conclusion + retention_consequence}}] Phase C. Absent => omitted." },
    ],
  },
  {
    id: "iii_necessity",
    title: "III. NECESSITY AND DATA MINIMIZATION",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. The Necessity Question. The fact that information is useful does not necessarily mean that it is necessary. The assessment therefore asks whether the stated purpose could reasonably be achieved without each material element of personal information—or by using information that is less precise, less sensitive, or less extensive. The Company identifies the minimum information necessary for the activity as: {minPi}. The detailed element-by-element record appears in Appendix B — Necessity and Minimization Matrix." },
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
      { kind: "skeleton", text: "A. Consumer Perspective. Privacy risk depends in part on the circumstances in which processing occurs. A consumer who knowingly provides information for an expected purpose is in a different position from a consumer whose information is obtained elsewhere, repurposed unexpectedly, used to draw new conclusions, or processed in a way the consumer cannot reasonably understand or influence. This section therefore considers how the activity appears from the consumer’s side of the transaction." },
      // 1 — D7: the disclosures paragraph appears twice in the docx; rendered once here.
      { kind: "skeleton", text: "B. Transparency. The Company identifies the following disclosures made or planned for this activity: {activityDisclosures}. The structured disclosure record identifies both what consumers are or will be told and how the disclosure is or will be made. Relevant public-facing materials include: {privacyPolicyUrl}. A disclosure is meaningful to this assessment to the extent it helps consumers understand the features of the processing that matter to their privacy. The existence of a privacy policy or notice is relevant, but the analysis does not end with whether a disclosure technically exists." },
      // 2
      { kind: "generated", text: "[GENERATED {{FACTOR.transparency_analysis + transparency_conclusion + transparency_consequence}}] Phase C. Absent => omitted." },
      // 3
      { kind: "skeleton", text: "C. Consumer Expectations. The assessment considers whether the activity is reasonably consistent with the context in which information is collected or otherwise obtained." },
      // 4
      { kind: "generated", text: "[GENERATED {{FACTOR.consumer_expectations_analysis + unexpected_processing + consumer_expectations_conclusion}}] Unexpected processing gets fixed lead \"The following aspect of the processing may fall outside the expectations created by the consumer interaction:\" and note \"Unexpected processing is not automatically prohibited. It can, however, increase the importance of notice, choice, minimization, or another safeguard.\" Phase C. Absent => omitted." },
      // 5
      { kind: "skeleton", text: "D. Practical Consumer Control. A right reduces privacy risk only to the extent it is usable in practice. The assessment therefore considers whether consumers can reasonably understand and exercise the available control and whether doing so materially changes the processing." },
      // 6
      { kind: "generated", text: "[GENERATED {{FACTOR.relevant_consumer_controls + consumer_control_analysis + consumer_control_conclusion + consumer_control_consequence}}] Controls list gets fixed lead \"Relevant consumer rights and controls include:\" — projection of the established consumer-rights facts (q6–q10); the factor engine may not invent rights or controls. Phase C. Absent => omitted." },
      // 7
      { kind: "skeleton", text: "E. Coercion, Compulsion, and Choice Architecture. The assessment separately considers whether consumers are effectively required to permit processing that is unnecessary to the service or opportunity they reasonably expect, or whether the design of the interaction materially interferes with an informed and voluntary choice." },
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
      // block is trigger-gated so the section is honestly absent end-to-end
      // for non-ADMT activities.
      // 0
      { kind: "conditional", text: "[CONDITIONAL] ADMT A — ROLE - trigger: ADMT in the activity. RISK_FIXED.admt_a over {{INTAKE.q19_admt_description, admt_operational_role}}. Absent => omitted." },
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
      { kind: "skeleton", text: "A. How Benefits Are Considered. The assessment considers benefits produced by the processing itself—not every advantage associated with the Company’s product, service, or business. A benefit receives greater weight where the record identifies a concrete outcome, explains how this processing contributes to that outcome, and provides support for the claim. Benefits to the business, consumers, other stakeholders, and the public are considered where they are applicable. The assessment does not create a benefit for a stakeholder category where the facts do not support one." },
      // 1
      { kind: "skeleton", text: "B. Benefits to Consumers." },
      // 2
      { kind: "conditional", text: "[CONDITIONAL] CONSUMER BENEFIT IDENTIFIED - trigger {benefit_consumer_identified}=Yes. RISK_FIXED.benefit_identifies_lead + {{INTAKE.a4_benefit_consumer}} + RISK_FIXED.benefit_supporting_lead + {{INTAKE.a4_benefit_consumer_fact}}. Absent => the no-benefit block below." },
      // 3
      { kind: "conditional", text: "[CONDITIONAL] NO CONSUMER BENEFIT ESTABLISHED - trigger: benefit not identified. RISK_FIXED.benefit_none_consumer. Absent => omitted." },
      // 4
      { kind: "generated", text: "[GENERATED {{FACTOR.consumer_benefit_analysis + consumer_benefit_weight}}] Weight lead \"Weight in the balancing analysis:\". Phase C. Absent => omitted." },
      // 5
      { kind: "skeleton", text: "C. Benefits to the Business. Commercial benefit is not discounted merely because it accrues to the Company. The relevant question is whether the benefit is concrete, attributable to this processing, and sufficiently supported to be included in the balance." },
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
      // 13 — [R1] register-safe encode of the VI.E fixed prose.
      { kind: "skeleton", text: "E. Benefits to the Public. A generalized claim that processing promotes innovation, efficiency, security, or another public interest receives limited weight unless the record identifies a meaningful connection between this processing and the claimed outcome." },
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
      { kind: "skeleton", text: "A. How Risk Is Evaluated. The assessment looks for credible pathways from the processing to a negative effect on a consumer. A broad label such as “security risk,” “bias,” or “loss of control” is not enough by itself to make a useful decision. The analysis considers what information is involved, how the problem could arise, what would happen to the consumer, how likely that outcome is, and how serious it would be. The detailed pathway analysis appears in Appendix C — Privacy Risk Register and Safeguard Mapping. The body of the report focuses on the risks that materially affect the processing decision." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.material_risk_blocks}}] B. Material Risk Pathways — ranked repeatable blocks (title; pathway narrative; likelihood; severity; materiality; decision effect before safeguards), projected from the granular risk factors. Phase C. Absent => omitted." },
      // 2
      { kind: "skeleton", text: "C. Other Risk Categories Considered. The assessment also considers other negative impacts supported or reasonably implicated by the record, including as applicable unauthorized processing or loss of availability, unlawful discrimination, impairment of consumer control, coercion or compulsion, economic harm, physical harm, reputational harm, psychological harm, and other processing-specific consequences. A category is not assigned weight merely because it is possible in the abstract. Where the facts do not establish a credible pathway from this activity to the negative impact, it is not treated as a material risk." },
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
      { kind: "skeleton", text: "A. Role of Safeguards. A privacy risk does not determine the outcome of the assessment by itself. The relevant question is what the Company has done—or will do—to prevent the risk, reduce its likelihood, limit its consequences, improve consumer control, detect problems, or correct inappropriate outcomes. Safeguards may be technical, organizational, contractual, procedural, or structural. The assessment gives greater weight to a safeguard where the record supports that it is implemented and effective in the environment being assessed. The detailed safeguard record appears in Appendix C together with the risk pathways it is relevant to. The risk-to-safeguard mapping is an EUP analytical method used to make the reasoning transparent; it is not presented as a regulator-prescribed report format." },
      // 1
      { kind: "generated", text: "[GENERATED {{FACTOR.material_existing_safeguards + safeguard_effectiveness_analysis}}] Fixed sub-head \"B. Material Existing Safeguards\"; lead \"The safeguards most important to the analysis are:\". Phase C. Absent => omitted." },
      // 2
      { kind: "conditional", text: "[CONDITIONAL] TESTED SAFEGUARDS - trigger {{FACTOR.tested_safeguards}} present. Fixed lead \"The following controls are supported by evidence of implementation or testing:\" + note \"These controls receive greater weight because the assessment has evidence that they operate in practice.\" Phase C. Absent => omitted." },
      // 3
      { kind: "conditional", text: "[CONDITIONAL] UNTESTED SAFEGUARDS - trigger {{FACTOR.untested_safeguards}} present. Fixed lead \"The following controls are implemented but are not supported by sufficient testing or other evidence of effectiveness:\" + note \"They are credited as existing safeguards, but the absence of supporting evidence reduces the degree to which the assessment can rely on them.\" Phase C. Absent => omitted." },
      // 4
      { kind: "conditional", text: "[CONDITIONAL] PLANNED SAFEGUARDS - trigger {{FACTOR.planned_safeguards}} present. Fixed lead \"C. Planned Safeguards. The Company plans to implement:\" + note \"A planned safeguard does not eliminate present risk. Where the favorable determination depends materially on a safeguard that is not yet operational, implementation is treated as a Condition to Proceed rather than as an existing mitigation.\" Phase C. Absent => omitted." },
      // 5
      { kind: "conditional", text: "[CONDITIONAL] SAFEGUARD GAPS - trigger {{FACTOR.safeguard_gaps}} present. Fixed lead \"D. Safeguard Gaps. The following material risk is not sufficiently addressed by safeguards established on the current record:\". Phase C. Absent => omitted." },
      // 6
      { kind: "skeleton", text: "E. Residual Risk. Residual risk is what remains after the safeguards that can reasonably be credited are taken into account." },
      // 7
      { kind: "generated", text: "[GENERATED {{FACTOR.material_residual_risks + residual_risk_analysis + overall_residual_risk_conclusion + residual_risk_reasoning}}] Lead \"The principal residual risks are:\". Phase C. Absent => omitted." },
    ],
  },
  {
    id: "ix_balancing",
    title: "IX. BENEFITS–RISKS BALANCING AND PROCESSING DECISION",
    blocks: [
      // 0
      { kind: "skeleton", text: "A. The Decision. The preceding sections consider the processing from different directions. This section brings those findings together. The question is not whether the processing is useful, whether it creates some privacy risk, or whether every possible risk has been eliminated. The question is whether the privacy risks that remain after appropriate safeguards are considered are justified by the benefits of this same processing activity. The determination is a reasoned judgment based on the record. Internal ratings may help organize the analysis, but no numerical score substitutes for understanding the strength of the benefits, the seriousness and likelihood of the risks, and the practical effect of safeguards." },
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
      { kind: "skeleton", text: "B. Assessment Timing. The timing of the assessment depends on when the covered processing began or will begin. The Company identifies the status and relevant timing of the processing as follows: Status: {processingStatus}. Actual start date (if applicable): {processingStartDate}. Planned start date (if applicable): {plannedStartDate}." },
      // 3
      { kind: "conditional", text: "[CONDITIONAL] TIMING RULE AND DEADLINE - trigger: processing status/start date established. RISK_FIXED.x_timing_post2026 or RISK_FIXED.x_timing_pre2026 + {{DERIVED.initial_assessment_deadline}}. Absent => omitted." },
      // 4
      { kind: "skeleton", text: "C. Review and Material Changes. The Company should review the assessment at least every three years and update it as necessary. If a material change creates a new negative impact, increases the magnitude or likelihood of an existing negative impact, or diminishes a safeguard, the assessment should be updated as soon as feasibly possible and no later than 45 calendar days after the material change. Material change since prior assessment: {materialChange}. Next scheduled review: {nextReviewDate}." },
      // 5
      { kind: "conditional", text: "[CONDITIONAL] MATERIAL CHANGE DETAILS - trigger {material_change_since_prior}=Yes. RISK_FIXED.x_material_change_* labels over {{INTAKE.material_change_date, material_change_description, prior_risk_assessment_date}}. Absent => omitted." },
      // 6
      { kind: "generated", text: "[GENERATED {{FACTOR.governance_review_analysis + governance_review_conclusion + governance_review_consequence}}] Phase C. Absent => omitted." },
      // 7
      { kind: "skeleton", text: "D. Retention of the Assessment Record. The Company should retain the original and any updated risk assessments for as long as the processing continues or for five years after completion of the assessment, whichever is later. {retentionEndRule}. Supporting materials should be retained in a manner that allows the Company to understand the record on which material findings and decisions were based, particularly where the determination depends on testing, vendor information, technical documentation, or implementation of a particular safeguard." },
      // 8 — D6: certifier_* and cppa_submission_contact_* are organization-level
      // fields; the slots resolve through the org profile when present on the
      // bag and drop honestly otherwise.
      { kind: "skeleton", text: "E. CPPA Submission Support Record (§ 7157). This assessment contributes information to the Company’s business-level CPPA risk-assessment submission record. It does not, standing alone, necessarily contain all information required for the Company’s annual submission. The Company’s annual submission must aggregate information across all assessments conducted or updated during the reporting period, including business-level counts and other information that cannot necessarily be determined from this individual assessment. The executive identified for the applicable submission process is: {certExecName}, {certExecTitle}. Contact telephone: {certContactPhone}. Contact email: {certContactEmail}. Executive-management status: {certifierIsExec}. Direct responsibility for risk-assessment compliance: {certifierResponsible}. Sufficient knowledge: {certifierKnowledge}. Authorized to submit: {certifierAuthorized}. Business point of contact: {submissionContact}. Appendix E — CPPA Submission Support Record preserves this assessment’s contribution to the later business-level submission. It is an EUP support record, not a CPPA-prescribed form." },
      // 9
      { kind: "generated", text: "[GENERATED {{FACTOR.certifying_executive_eligibility_analysis}}] Phase C. Absent => omitted." },
    ],
  },
  {
    id: "appendix_a",
    title: "Appendix A — Processing and Data Inventory",
    blocks: [
      // 0
      { kind: "skeleton", text: "This appendix preserves the detailed factual record underlying Section II. It should identify, as applicable, the personal-information and sensitive-personal-information categories involved in this activity, sources, processing methods, consumer interaction method and purpose, approximate scale, disclosures and their method, recipients and purposes of disclosure, and retention by personal-information category." },
      // 1
      { kind: "rule", text: "{{DERIVED.processing_and_data_inventory}} — assembled deterministically from the Intake Contract v2.0 structured facts (q4_pi_categories × SPI map, i4b_sources, processing_entry_point/methods/result, consumer interaction, approximate_ca_consumers, activity_disclosures, recipients, retention_by_pi_category, i2 retention record). Adds no operational fact not established in the record." },
    ],
  },
  {
    id: "appendix_b",
    title: "Appendix B — Necessity and Minimization Matrix",
    blocks: [
      // 0 — intro fixed words carried by the Phase C composer: "This appendix
      // provides the element-level analysis underlying Section III. For each
      // material personal-information element, it records the function of the
      // information, whether it is necessary to achieve the stated purpose,
      // the basis for that conclusion, and any identified limitation or
      // change."
      { kind: "generated", text: "[GENERATED {{FACTOR.necessity_matrix}}] Element-level analysis underlying Section III. Phase C. Absent => the appendix is omitted." },
    ],
  },
  {
    id: "appendix_c",
    title: "Appendix C — Privacy Risk Register and Safeguard Mapping",
    blocks: [
      // 0 — intro fixed words carried by the Phase C composer: "This appendix
      // provides the detailed analytical record underlying Sections VII and
      // VIII. For each identified risk pathway, the register records the
      // negative impact, personal information involved, relevant actor or
      // event, source and cause, likelihood, severity, materiality, relevant
      // safeguards, safeguard status, residual risk, and effect on the
      // processing decision. The mapping of risks to safeguards is an EUP
      // analytical method designed to make the reasoning transparent and
      // reviewable. It is not presented as a regulator-prescribed report
      // format."
      { kind: "generated", text: "[GENERATED {{FACTOR.risk_and_safeguard_register}}] Detailed pathway × safeguard register underlying Sections VII–VIII. Phase C. Absent => the appendix is omitted." },
    ],
  },
  {
    id: "appendix_d",
    title: "Appendix D — ADMT Technical and Decision Record",
    blocks: [
      // 0
      { kind: "conditional", text: "[CONDITIONAL] ADMT APPENDIX INTRO - trigger: ADMT applicable. RISK_FIXED.appendix_d_intro. Absent => omitted." },
      // 1
      { kind: "rule", text: "{{DERIVED.admt_technical_facts}} — labelled projection of the Section V intake facts (q19_admt_description, admt_operational_role, i5_admt_logic, admt_assumptions_limitations, admt_output, admt_output_use, admt_consumer_effect, i5_admt_human_review, i5_admt_fairness_testing, i5_admt_training_source, § 7153 facts). Composed only when ADMT applies." },
      // 2
      { kind: "generated", text: "[GENERATED {{FACTOR.admt_technical_analysis}}] Phase C. Absent => omitted." },
    ],
  },
  {
    id: "appendix_e",
    title: "Appendix E — CPPA Submission Support Record (§ 7157)",
    blocks: [
      // 0
      { kind: "skeleton", text: "This appendix is an EUP submission-support record. It preserves the information contributed by this assessment to the Company’s later business-level submission and identifies items that require aggregation across multiple assessments. It is not represented as a CPPA-prescribed form." },
      // 1
      { kind: "rule", text: "{{DERIVED.submission_support_record_for_this_assessment}} — assessment-level contribution mapped from the trigger classification, activity PI/SPI categories, scale, status and certifying-executive record." },
      // 2
      { kind: "rule", text: "{{DERIVED.business_level_submission_fields_outstanding}} — fixed checklist of the § 7157 business-level aggregates this individual assessment cannot determine. [R3]" },
    ],
  },
  {
    id: "appendix_f",
    title: "Appendix F — Materials Considered",
    blocks: [
      // 0
      { kind: "skeleton", text: "The following documents, technical materials, policies, contracts, assessments, or other factual materials were supplied, identified, reviewed, or relied upon in connection with this assessment. Inclusion means the material formed part of the assessment record; it does not necessarily mean that every statement in the material was independently verified or accepted without qualification." },
      // 1
      { kind: "rule", text: "{{DERIVED.materials_considered_index}} — index of the intake record and the materials it names (public privacy policy, existing DPIA/PIA summary where provided)." },
    ],
  },
  {
    // Section id kept as "table_of_authorities": generate-report-pdf forces a
    // fresh page on this id across every SO spine.
    id: "table_of_authorities",
    title: "Appendix G — Table of Authorities",
    blocks: [
      // 0
      { kind: "rule", text: "{{DERIVED.table_of_authorities}} — assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Phase C adds factor-authority provenance records; until then the ledger is the source." },
    ],
  },
  {
    id: "appendix_h",
    title: "Appendix H — EUP Methodology (Optional)",
    blocks: [
      // 0
      { kind: "conditional", text: "[CONDITIONAL] EUP METHODOLOGY - trigger {{SYSTEM.include_methodology_appendix}}=true. Concise description of EUP’s analytical methodology, clearly identified as EUP’s framework and not a CPPA-prescribed format. Not composed in Phase B. Absent => omitted." },
    ],
  },
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
 * TABLE OF AUTHORITIES — deterministic assembly rule. An authority appears iff
 * it is cited in the assembled document.
 */
export const RISK_TOA_RULE =
  "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred.";
export const RISK_TOA_GROUPS: readonly string[] = [
  "Regulations",
  "Statutes",
  "Guidance and Persuasive Authority",
];
