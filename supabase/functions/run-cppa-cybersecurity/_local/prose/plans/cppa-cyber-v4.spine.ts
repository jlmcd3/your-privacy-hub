// CPPA CYBER — SPINE v4.0: THE CYBER SPINE v1.1 ENCODE (C2, 2026-08-26).
//
// RENDER LAW. The CEO-identified spine document
// `CPPA_Cybersecurity_Cyber_Spine_v1.1_Current_Intake_Aligned (1).docx`
// (VERSION 14/CPPA Cyber folder, 2026-08-25; CEO 2026-08-26: "it is my
// understanding that we had agreed on implementing the product based on the
// attached spine document") is this encode's render law. Every `kind:
// "skeleton"` string below is transcribed from that document's CLIENT-FACING
// paragraphs; {slot}/composed/table lines carry its {{INTAKE.*}} /
// {{DERIVED.*}} / {{FACTOR.*}} fields. This file is NEW alongside the v3
// spine (`cppa-cyber.spine.ts`), which remains byte-untouched as the
// flag-off (model-path) render law — the flag selects the spine, so the
// legacy path cannot drift.
//
// PARAGRAPH DISPOSITIONS (faithful-encode record — every v1.1 paragraph is
// either transcribed below or listed here; nothing was silently dropped):
//   (i1) §II.B trailing paragraph ("The report should say 'evidence
//        identified,' 'evidence represented as available,' or equivalent
//        language. It should not say that the evidence was examined,
//        tested, or found sufficient by the independent auditor …") —
//        GENERATOR INSTRUCTION, encoded as CYBER_V4_BANNED_REGISTER
//        entries + composer discipline (cyber-factors.ts), not prose.
//   (i2) §III.B second paragraph ("Each component should follow one compact
//        pattern … Static legal prose should not be repeated eighteen
//        times.") — INSTRUCTION; implemented as the component-module
//        composer's shape.
//   (i3) §V trailing paragraph ("The generator must not infer from the
//        incident count alone …") — INSTRUCTION; implemented in
//        buildIncidentReadiness (cyber-factors.ts), which never infers
//        breach facts from the count.
//   (i4) §VI trailing paragraph ("Any timeframe generated here should be
//        clearly labeled as an EUP readiness recommendation … The
//        generator should not invent a statutory 30-, 60-, or 90-day
//        remediation deadline.") — INSTRUCTION; the action composers carry
//        no invented deadlines and label priority tiers as EUP
//        recommendations.
//   (i5) §VII trailing paragraph ("A strong record may support language
//        such as … A thin record should produce 'record insufficient,'
//        not 'not ready' …") — INSTRUCTION; implemented by
//        buildOverallReadinessNarrative's conditional composition.
//   (i6) §VIII second sentence ("The readiness product should state that
//        rule once …") — INSTRUCTION (anti-repetition); the five-year
//        rule renders exactly once, in this section.
//   (i7) Front-matter "Regulatory timing note" — NOT RENDERED, a flagged
//        HARMONIZATION (advance-ratification ledger): its first sentence
//        ("The Cyber intake does not collect the facts necessary to
//        determine the Company's § 7120 applicability…") is factually
//        superseded by the doc-64-ratified § 7120(a)-(b) applicability
//        table (C1.2, six intake fields) that this document now renders;
//        rendering both would contradict. The § 7121 half of its point is
//        carried by the ITEM-204 byte-pinned block (all three tiers
//        quoted, no cohort computed), which the CEO settled permanently
//        on 2026-08-25. CEO confirmation requested at the C2 redline.
//   (i8) Appendix A "Suggested columns:" sentence — INSTRUCTION; the
//        matrix table's column set implements it.
//   (i9) The Table of Authorities paragraph — INSTRUCTION; encoded as the
//        `rule` block (same as v3).

export type CyberV4BlockKind =
  | "skeleton" // FIXED PROSE — byte-pinned from the v1.1 docx; {slots} only mutable spans
  | "lead" // one composed determination-bound sentence
  | "generated" // composed deterministic prose (cyber-factors.ts is the sole author)
  | "table" // a rendered table supplied by the assembler
  | "corpus" // byte-pinned corpus quote (ITEM-204 / § 7124)
  | "rule"; // deterministic assembly rule (Table of Authorities)

export interface CyberV4Block {
  readonly kind: CyberV4BlockKind;
  readonly text: string;
}

export interface CyberV4Section {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly CyberV4Block[];
}

export const CYBER_V4_SKELETON_VERSION = "cppa-cyber-v4.0-spine-v1.1-2026-08-26";
export const CYBER_V4_SKELETON_TITLE = "CPPA CYBERSECURITY AUDIT READINESS REPORT";
export const CYBER_V4_SKELETON_SUBTITLE =
  "Prepared under 11 CCR §§ 7120-7124 - {profile.entity_name}";

export const CYBER_V4_SKELETON_SECTIONS: readonly CyberV4Section[] = [
  {
    id: "cover",
    title: "Assessment Profile",
    blocks: [
      // Front matter (v1.1): entity / report date / version / assessment /
      // regulatory reference, as the fleet's cover-table pattern.
      { kind: "table", text: "" },
      // v1.1 front matter, byte-pinned.
      { kind: "skeleton", text: "Reliance notice. This report evaluates audit readiness from information supplied by the Company. It does not represent that End User Privacy has performed the independent cybersecurity audit required by Article 9, examined evidence as the statutory auditor, or certified the Company’s compliance. The independent auditor must make those determinations through the audit process." },
    ],
  },
  {
    id: "executive_summary",
    title: "Executive Summary",
    blocks: [
      { kind: "skeleton", text: "This assessment evaluates the Company’s cybersecurity program as described in the current intake, the evidence categories the Company identifies as available, and the extent to which that record appears prepared for independent audit. The analysis distinguishes implementation posture from evidence posture and distinguishes an identified evidence category from evidence actually examined and tested by an auditor." },
      { kind: "lead", text: "[DETERMINATION LEAD] The deterministic readiness determination, bound to DERIVED.readiness_determination." },
      { kind: "generated", text: "[GENERATED] The executive readiness lines: company/operating context; readiness explanation; component posture; record completeness; evidence posture; auditor-engagement/independence posture; principal readiness gaps; priority readiness actions. Composed from DERIVED surfaces and FACTOR records only." },
    ],
  },
  {
    id: "purpose_scope_record",
    title: "I. Purpose, Scope, and Assessment Record",
    blocks: [
      // A. Nature of the Readiness Assessment (v1.1, byte-pinned, both paragraphs).
      { kind: "skeleton", text: "Article 9 requires an independent cybersecurity audit for businesses within its scope. This report serves a narrower purpose: it organizes the Company’s present cybersecurity record against the regulatory component structure, evaluates whether the Company has described implementation and identified evidence that an auditor can later examine, and identifies gaps or follow-up that should be addressed before or during the independent audit." },
      { kind: "skeleton", text: "The readiness analysis does not convert management descriptions into auditor findings. Where the Company provides only a maturity selection or narrative description without meaningful evidence, the report treats that as a record limitation rather than as proof that the component is either satisfied or deficient." },
      // B. Company and Program Context — composed fact lines + context factor.
      { kind: "generated", text: "[GENERATED] Company and program context: entity, industry, primary framework, most recent audit, incidents in the preceding 12 months, and the context assessment (FACTOR.company_context_analysis)." },
      // C. Scope Record (v1.1, byte-pinned).
      { kind: "skeleton", text: "The Company may identify the frameworks it expects to rely on and describe the intended audit scope. Those facts are useful to readiness because they show how the Company is organizing the engagement and whether prior work may support portions of the eventual audit. They do not themselves establish the independent auditor’s final audit scope." },
      { kind: "generated", text: "[GENERATED] The scope record: frameworks identified for the engagement, the Company's audit-scope rationale, the scope-record assessment and its sufficiency (FACTOR.scope_record_analysis / scope_record_sufficiency)." },
      // The doc-64-ratified § 7120(a)-(b) applicability table (C1.2) and the
      // ITEM-204 § 7121(a) byte-pinned quote — both CEO-settled content this
      // section carries forward (disposition note i7 above).
      { kind: "table", text: "" },
      { kind: "corpus", text: "[BYTE-PINNED - the ITEM-204 ruling] The certification phase-in schedule is stated as law, all three tiers, corpus-quoted from the verified Section 7121 row; the company, in consultation with counsel, determines which tier its revenue places it in. No slot, no generation, no cohort computed." },
      // D. Prior Audit Work (v1.1, byte-pinned).
      { kind: "skeleton", text: "Prior cybersecurity audits, assessments, and certifications may be useful evidence and may reduce duplication where they actually cover the relevant California audit subject matter. The readiness analysis therefore asks what prior work exists and what it covered, while avoiding any assumption that a named framework or prior certification automatically satisfies Article 9." },
      { kind: "generated", text: "[GENERATED] Prior audit work: timing, prior audit scope, and the prior-work reliance analysis (FACTOR.prior_audit_reliance_analysis)." },
      // E. Record Sufficiency (v1.1, byte-pinned).
      { kind: "skeleton", text: "A useful readiness conclusion depends on how much of the record is actually populated. Missing maturity, notes, or evidence information should therefore be visible as a limitation of the assessment rather than silently converted into a negative cybersecurity finding." },
      { kind: "generated", text: "[GENERATED] Record sufficiency: the unassessed/incomplete component count, components lacking narrative support, components lacking identified evidence, the overall record-sufficiency conclusion, and the information needed to improve the record. DERIVED counts + FACTOR.record_sufficiency_conclusion / record_follow_up." },
    ],
  },
  {
    id: "auditor_evidence",
    title: "II. Auditor Engagement and Evidence Readiness",
    blocks: [
      // A. Auditor Engagement Posture (v1.1, byte-pinned).
      { kind: "skeleton", text: "The statutory audit must be performed by a qualified, objective, independent professional. The present intake does not collect the auditor’s identity, qualifications, procedures, or testing record. It does, however, capture the status of the engagement and whether independence has been confirmed in the forms reflected by the intake. The readiness report may evaluate that engagement posture, but should not state that the statutory independence requirement has been conclusively established unless the available status supports only that limited proposition." },
      { kind: "generated", text: "[GENERATED] Auditor engagement: the recorded engagement status, the deterministic engagement/independence determination, and the readiness consequence (FACTOR.independence_readiness_consequence)." },
      // B. Evidence Standard (v1.1, byte-pinned; trailing register
      // instruction encoded as banned-register entries — disposition i1).
      { kind: "skeleton", text: "For readiness purposes, evidence matters independently from implementation. A policy or procedure may show that a control is designed or documented, while a configuration export, log, report, test result, auditor letter, or training record may provide a basis for testing whether the control operates. The readiness report therefore evaluates both the Company’s stated implementation level and the evidence categories it identifies for each component." },
      { kind: "generated", text: "[GENERATED] Evidence readiness: the overall evidence posture, the cross-cutting evidence analysis and the evidence follow-up (DERIVED.evidence_sufficiency_summary + FACTOR.evidence_readiness_analysis / evidence_follow_up). Per-component results render in the component modules and Appendix B." },
    ],
  },
  {
    id: "program_readiness",
    title: "III. Cybersecurity Program Readiness",
    blocks: [
      // A. Program-Level Readiness (v1.1, byte-pinned).
      { kind: "skeleton", text: "The component-by-component analysis is not a substitute for understanding the cybersecurity program as a whole. The readiness assessment should first state whether the intake describes an established program, whether the component record is sufficiently complete to evaluate that program, and whether material implementation or evidence weaknesses cut across multiple components." },
      { kind: "generated", text: "[GENERATED] Program-level readiness: the program-framework fact, the program-obligation findings, the program-level assessment and conclusion (DERIVED.program_obligation_findings + FACTOR.program_readiness_analysis / program_readiness_conclusion)." },
      // B. Treatment of the 18 Regulatory Components (v1.1, byte-pinned;
      // the compact-pattern instruction is disposition i2).
      { kind: "skeleton", text: "The current intake presents all eighteen § 7123(c) components. Because it does not collect a separate applicability determination for each component, this readiness report should review the entire catalogue as a conservative preparation exercise but should not say that all eighteen are legally applicable to every Company. The independent auditor ultimately determines which listed components are applicable to the Company’s information system." },
      { kind: "generated", text: "[GENERATED] The eighteen component modules, one compact pattern each: Company fact (maturity, description, evidence categories) -> deterministic implementation posture -> evidence posture -> readiness analysis -> next action, with the ratified S4 regulator commentary where curated. Composed from INTAKE.controls + DERIVED.component_coverage/evidence_sufficiency + FACTOR.component_analysis." },
    ],
  },
  {
    id: "cross_cutting",
    title: "IV. Cross-Cutting Findings and Readiness Gaps",
    blocks: [
      { kind: "skeleton", text: "The component discussion establishes the record one control at a time. This section should then identify the few matters that actually affect the overall readiness conclusion. It should consolidate recurring evidence problems, common implementation gaps, dependencies on prior audit work, and material information deficiencies rather than repeating eighteen individual observations." },
      { kind: "generated", text: "[GENERATED] Material implementation gaps; material evidence gaps; cross-component/systemic issues; prior-audit dependency gaps; material record limitations; the cross-cutting conclusion. FACTOR.material_* / cross_component_findings / cross_cutting_conclusion." },
    ],
  },
  {
    id: "incident_context",
    title: "V. Security-Incident Context",
    blocks: [
      { kind: "skeleton", text: "Incident history can inform readiness, particularly the incident-response component, but the present intake captures only the number of incidents in the preceding twelve months and whatever additional facts the Company chooses to include in the incident-response control notes and evidence selections. The report should therefore characterize the incident record only to that extent." },
      { kind: "generated", text: "[GENERATED] The incident count, the incident-response component's recorded posture, the incident-readiness analysis and any incident-record follow-up (FACTOR.incident_readiness_analysis / incident_record_follow_up). Never infers breach facts from the count (disposition i3)." },
    ],
  },
  {
    id: "readiness_actions",
    title: "VI. Readiness Actions",
    blocks: [
      { kind: "skeleton", text: "This section converts the assessment into a practical audit-preparation plan. These are EUP readiness actions generated from the intake record; they are not represented as the Company’s formal remediation plan for purposes of § 7123(e)(4). The distinction matters because the current intake identifies who owns remediation but does not collect a Company-approved remediation plan or timeframe." },
      { kind: "generated", text: "[GENERATED] The remediation owner; priority readiness actions; evidence-package actions; implementation actions; record-completion actions; suggested sequencing. Composed from the ratified recommendation library (cyber-recommendations.ts) + FACTOR action families. No invented statutory deadlines (disposition i4)." },
    ],
  },
  {
    id: "readiness_conclusion",
    title: "VII. Readiness Conclusion",
    blocks: [
      { kind: "skeleton", text: "The conclusion should answer a narrow and useful question: based on the Company’s present description of its cybersecurity program and the evidence categories identified, how prepared is the Company to proceed into the independent Article 9 audit? It should not answer the different question whether the independent audit has been completed or whether the Company has passed it." },
      { kind: "lead", text: "[DETERMINATION LEAD] The deterministic readiness determination and its blockers, bound to DERIVED.readiness_determination." },
      { kind: "generated", text: "[GENERATED] The overall readiness narrative and the most important next act (FACTOR.overall_readiness_narrative / single_next_act), composed per disposition i5: a thin record concludes record-insufficient, never not-ready, unless the intake affirmatively describes a material implementation deficiency." },
    ],
  },
  {
    id: "evidence_preservation",
    title: "VIII. Evidence Preservation and Continuing Readiness",
    blocks: [
      { kind: "skeleton", text: "Article 9 requires the business and auditor to retain documents relevant to the cybersecurity audit for at least five years after completion." },
      { kind: "generated", text: "[GENERATED] The most recent audit fact, the evidence-preservation actions, and continuing-readiness observations (FACTOR.evidence_preservation_actions / continuing_readiness_observations). The five-year rule renders exactly once, above (disposition i6)." },
    ],
  },
  {
    id: "appendix_a_matrix",
    title: "Appendix A - Component Readiness Matrix",
    blocks: [
      { kind: "skeleton", text: "A compact matrix generated from the 18 intake records and deterministic analysis." },
      { kind: "table", text: "" },
    ],
  },
  {
    id: "appendix_b_evidence",
    title: "Appendix B - Evidence Readiness Index",
    blocks: [
      { kind: "skeleton", text: "A component-by-component index of the evidence categories the Company identifies as available. The appendix should preserve the distinction between an evidence category selected in intake and a specific artifact actually reviewed by an auditor." },
      { kind: "table", text: "" },
    ],
  },
  {
    id: "appendix_c_actions",
    title: "Appendix C - Readiness Action Register",
    blocks: [
      { kind: "skeleton", text: "A consolidated action register generated from material factor findings, organized by remediation owner where available and by action type. The action register should identify whether an item concerns implementation, evidence, or record completion." },
      { kind: "table", text: "" },
    ],
  },
  {
    id: "appendix_d_record",
    title: "Appendix D - Assessment Record",
    blocks: [
      { kind: "skeleton", text: "A structured preservation of the profile and control facts on which the readiness report was generated, together with the system generation metadata. This is the factual provenance layer for the report." },
      { kind: "table", text: "" }, // profile facts + generation metadata
      { kind: "table", text: "" }, // raw per-component control facts, verbatim
    ],
  },
  // Carried from the v3 spine BYTE-IDENTICALLY (CEO report review 2026-08-24
  // and CEO instruction 2026-08-25 respectively) — see cppa-cyber.spine.ts
  // for both sections' full provenance comments.
  {
    id: "signature",
    title: "Signature",
    blocks: [
      { kind: "skeleton", text: "This information is provided for the purposes of a cybersecurity audit as required pursuant to 11 CCR §§ 7120-7124." },
      { kind: "table", text: "" },
      { kind: "skeleton", text: "This signature acknowledges the information above, and is not the certification described in 11 CCR § 7124." },
    ],
  },
  {
    id: "submission_and_attestation",
    title: "Submission and Attestation",
    blocks: [
      { kind: "corpus", text: "[BYTE-PINNED - the § 7124 certification of completion] Who must sign, what the certification must contain, and the verbatim attestation statement, corpus-quoted from the approved cppa-7124 row. No slot, no generation." },
    ],
  },
  {
    id: "table_of_authorities",
    title: "Table of Authorities",
    blocks: [
      { kind: "rule", text: "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred." },
    ],
  },
];

/** Every byte-pinned fixed-prose string, in document order. Splice-barred. */
export const CYBER_V4_PROTECTED_FIXED_PROSE: readonly string[] = CYBER_V4_SKELETON_SECTIONS
  .flatMap((s) => s.blocks)
  .filter((b) => b.kind === "skeleton")
  .map((b) => b.text);

/**
 * v4 REGISTER BANS — the v3 attribution-voice bans carried forward, plus the
 * v1.1 §6 guardrails (dispositions i1/i3) as machine-checkable phrases: the
 * report never claims auditor examination/testing of evidence, never treats
 * the eighteen components as per-company legal applicability, and never
 * carries the fleet-banned "on the record as documented" register.
 */
export const CYBER_V4_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "the record reflects",
  "the record indicates",
  "the record demonstrates",
  "the record establishes",
  "on this record",
  "as the record makes clear",
  "on the record as documented",
  "evidence was examined by the auditor",
  "evidence was tested by the auditor",
  "found sufficient by the independent auditor",
  "all eighteen components are legally applicable",
  "all 18 components are legally applicable",
];
