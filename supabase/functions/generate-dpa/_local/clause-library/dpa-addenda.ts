// supabase/functions/generate-dpa/_local/clause-library/dpa-addenda.ts
//
// DOC 182 (2026-09-04) — THE CANONICAL DPA PACKAGE v2.0 PORT, PART TWO: the
// jurisdiction-specific addenda and transfer exhibits, each attached ONLY
// when its geography flag is engaged (dpa-v2-supplement.ts
// deriveDpaEngagement):
//   02  CCPA Service Provider Addendum        — californiaEngaged
//   03  US Multi-State Privacy Law Addendum         — usStatesEngaged.length
//   04  EU SCC Module 2 Implementation Exhibit      — euSccExhibit
//   05  UK International Data Transfer Addendum     — ukAddendumExhibit
//
// Each addendum is its own instrument incorporated by reference (own
// numbering, own schedules, own execution block), exactly as the package
// lays them out. Every fact the intake carries is populated; every fact it
// does not is a [TO BE COMPLETED: …] prompt; nothing asserts a fact the
// record does not carry (the package's own "no inferred controls" rule).
//
// The CCPA addendum does NOT repeat the fifteen required contract terms:
// those are Section 12 of the DPA (the ratified, registry-checked
// US_REQUIRED_TERMS_SECTION) and the addendum cross-references it —
// one fact, one home.

import { type CoveredStateLaw, type DpaEngagement } from "./dpa-v2-supplement.ts";

export interface DpaAddendumSection {
  readonly heading: string;
  readonly clauses: readonly string[];
}

export interface DpaAddendumSchedule {
  readonly title: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly note?: string;
}

export interface DpaAddendum {
  readonly id: "ccpa" | "us-multistate" | "eu-scc" | "uk-addendum";
  readonly title: string;
  readonly subtitle: string;
  readonly reference: string;
  /** Opening notes rendered before the numbered sections. */
  readonly preamble: readonly string[];
  readonly sections: readonly DpaAddendumSection[];
  readonly schedules: readonly DpaAddendumSchedule[];
  /** Party labels for the execution block, controller first. */
  readonly executionLabels: readonly [string, string];
}

export interface DpaAddendaCtx {
  readonly controllerName: string;
  readonly controllerJurisdiction: string;
  readonly processorName: string;
  readonly processorJurisdiction: string;
  readonly services: string;
  readonly dataCategories: readonly string[];
  readonly retention: string;
  readonly auditRights: string;
  readonly hasSubProcessors: boolean;
  /** Annex D rows: [name, service, location, dateAuthorised]. */
  readonly subProcessorRows: readonly (readonly string[])[];
  readonly subprocessorAuthorizationModel: "general" | "specific";
  readonly subprocessorNoticeDays: number;
  readonly securityMeasureLabels: readonly string[];
  readonly securityMeasuresDetails: string;
  readonly includeTransferClause: boolean;
  readonly transferMechanism: string;
  readonly engagement: DpaEngagement;
  readonly coveredLaws: readonly CoveredStateLaw[];
}

const TBC = (what: string) => `[TO BE COMPLETED: ${what}]`;
const s = (v: unknown) => String(v ?? "").trim();
const or = (v: string, what: string) => (s(v) ? s(v) : TBC(what));
const list = (xs: readonly string[], what: string) => (xs.length ? xs.join(", ") : TBC(what));

function numbered(n: number, bodies: readonly string[]): string[] {
  return bodies.filter(Boolean).map((b, i) => `${n}.${i + 1} ${b}`);
}

const OPTIONAL_CONVENTION =
  `Provisions under an "Optional provision" caption are negotiable and apply only if the Parties retain them in the executed document; a provision not retained shall be deleted before execution. Bracketed completion fields are not optional: each names information to be supplied before execution.`;

function optionalSection(n: number, provisions: readonly (readonly [string, string])[]): DpaAddendumSection {
  return {
    heading: `${n}. OPTIONAL PROVISIONS`,
    clauses: [
      `${n}.1 The provisions in this Section are negotiable. Each applies only if the Parties retain it in the executed document. ${TBC("retain, revise or delete each optional provision in this Section before execution")}`,
      ...provisions.map(([title, body], i) => `${n}.${i + 2} (Optional provision — ${title}.) ${body}`),
    ],
  };
}

function sensitiveCategories(cats: readonly string[]): string[] {
  return cats.filter((c) => /health|medical|biometric|genetic|criminal|children|minor|financial|location/i.test(String(c)));
}

// ── 02 — CCPA Service Provider Addendum ───────────────────────────────

export function ccpaAddendum(ctx: DpaAddendaCtx): DpaAddendum {
  const sens = sensitiveCategories(ctx.dataCategories);
  const childrens = ctx.dataCategories.some((c) => /children|minor|under 18/i.test(String(c)));
  const sections: DpaAddendumSection[] = [
    {
      heading: "1. DEFINITIONS AND SCOPE",
      clauses: numbered(1, [
        `"CCPA" and "the CCPA regulations" have the meanings given in Section 12 of the DPA: the California Consumer Privacy Act of 2018, as amended by the California Privacy Rights Act and later amendments, and its implementing regulations, each as amended from time to time.`,
        `"Business" means the Controller to the extent it qualifies as a "business" under the CCPA for the relevant California Personal Information; "Service Provider" means the Processor to the extent it processes California Personal Information on behalf of the Business for the limited and specified Business Purposes stated in this Addendum and qualifies as a "service provider" under the CCPA; "Contractor" means the Processor or a downstream recipient to the extent the relevant arrangement is characterised as a "contractor" relationship under the CCPA.`,
        `"California Personal Information" means personal information relating to a California consumer that is processed pursuant to the written contract between the Parties and is subject to the CCPA; "Sensitive Personal Information" means California Personal Information that constitutes sensitive personal information as the CCPA defines that term.`,
        `"Business Purpose" means a specific business purpose permitted by the CCPA and identified in Schedule A. A generic reference to the entire Principal Agreement does not substitute for the specific description in Schedule A.`,
        `Capitalised terms not defined here have the meanings in the DPA. This Addendum supplements the DPA only for California Personal Information.`,
      ]),
    },
    {
      heading: "2. SPECIFIC PROCESSING DESCRIPTION",
      clauses: numbered(2, [
        `(Limited and specified purposes.) The Business discloses or makes available California Personal Information to the Service Provider only for the limited and specified Business Purposes in Schedule A. The Service Provider shall process the information only as reasonably necessary and proportionate to those purposes, to perform the Services, on the Business's lawful instructions, or as otherwise permitted by the CCPA.`,
        `(Categories of personal information.) The categories actually processed are identified in Schedule A using the categories recorded in the DPA intake and any California-specific detail completed by the Parties. The Service Provider shall not intentionally expand those categories without the Business's documented authorisation.`,
        sens.length
          ? `(Sensitive Personal Information.) The record identifies categories that may constitute Sensitive Personal Information (${sens.join(", ")}). Schedule A identifies the relevant category and purpose; the Service Provider shall not use Sensitive Personal Information for a purpose beyond the purposes permitted by the CCPA and the Business's instructions. ${TBC("confirm which recorded categories constitute Sensitive Personal Information as the CCPA defines that term, and the purpose for each")}`
          : `(Sensitive Personal Information.) The record identifies no category of Sensitive Personal Information. If Sensitive Personal Information is later processed, Schedule A shall be amended to identify the relevant category and purpose before that processing commences.`,
      ]),
    },
    {
      heading: "3. SERVICE PROVIDER AND CONTRACTOR REQUIREMENTS",
      clauses: numbered(3, [
        `(Required contract terms.) The contract terms the CCPA and its regulations require of a service provider or contractor — the prohibition on selling or sharing, purpose limitation, the direct-business-relationship and combination restrictions, the same level of privacy protection, notification of inability to comply, the Business's oversight and remediation rights, and consumer-request assistance — are set out in Section 12 of the DPA (Prohibited Processing and CCPA Required Terms) and apply to California Personal Information as if repeated here.`,
        `(Certification.) By executing this Addendum, the Service Provider certifies that it understands the restrictions and obligations applicable to service providers and contractors under the CCPA and will comply with them for California Personal Information processed under this Addendum.`,
      ]),
    },
    {
      heading: "4. CONSUMER RIGHTS ASSISTANCE",
      clauses: numbered(4, [
        `(Assistance.) The Service Provider shall cooperate with the Business in responding to consumer requests to exercise rights that apply to the relevant California Personal Information, including access or know, deletion, correction, portability, opt-out, and limitation of use or disclosure of Sensitive Personal Information where applicable.`,
        `(Direct requests.) The Service Provider shall promptly notify the Business of a consumer request received directly concerning California Personal Information processed on the Business's behalf and shall not independently respond except on the Business's instruction or as required by law.`,
        `(Opt-out preference signals.) To the extent the Service Provider operates the technical interface that receives an opt-out preference signal on the Business's behalf, the Service Provider shall preserve, communicate or implement the signal in accordance with the Business's documented instructions and the CCPA regulations applicable to that interface.`,
        `(Verification.) The Service Provider shall provide the information reasonably necessary to support the Business's verification or authentication process, but shall not disclose California Personal Information to an unverified requester unless the Business directs it to do so in compliance with law.`,
      ]),
    },
    {
      heading: "5. RISK ASSESSMENT AND CYBERSECURITY AUDIT COOPERATION",
      clauses: numbered(5, [
        `(Risk assessments.) With respect to California Personal Information collected pursuant to the written contract, the Service Provider shall cooperate with the Business in conducting a risk assessment to the extent the CCPA regulations require one, including by making available facts necessary to the assessment that are in the Service Provider's possession, custody or control.`,
        `(Cybersecurity audits.) Where the Business is required to complete a cybersecurity audit under the CCPA regulations, the Service Provider shall cooperate to the extent those regulations require, including by making available relevant information in the Service Provider's possession, custody or control that the Business's auditor reasonably requests.`,
        `(No misrepresentation.) The Service Provider shall not knowingly misrepresent a material fact necessary for a legally required risk assessment or cybersecurity audit relating to California Personal Information processed under this Addendum.`,
      ]),
    },
    {
      heading: "6. SUBCONTRACTORS AND DOWNSTREAM SERVICE PROVIDERS",
      clauses: numbered(6, [
        `(Authorisation.) Sub-processors and downstream service providers are governed by Section 5 and Annex D of the DPA. Each downstream recipient of California Personal Information shall be bound by a written contract containing the restrictions the CCPA requires for its role.`,
        `(Flow-down.) The downstream contract shall, as applicable, identify the specific permitted purposes; prohibit sale, sharing and unauthorised use, disclosure, retention and combination; require appropriate privacy protection; require notice if the recipient can no longer comply; and provide the rights necessary to stop and remediate unauthorised processing.`,
        `(Responsibility.) The Service Provider remains responsible for downstream processing to the extent required by the DPA and applicable law.`,
      ]),
    },
    {
      heading: "7. VERIFICATION, AUDITS AND SECURITY",
      clauses: numbered(7, [
        `(Verification rights.) The Business may take reasonable and appropriate steps to help ensure the Service Provider uses California Personal Information consistently with the Business's obligations under the CCPA, including reasonable manual reviews, automated scans, assessments, audits or other technical and operational testing permitted by law and proportionate to risk.`,
        `(Security.) The security obligations and the measures in Section 7 and Annex C of the DPA apply to California Personal Information. The Service Provider shall maintain reasonable security procedures and practices appropriate to the nature of the information.`,
        `(Incidents.) Personal Data Breaches involving California Personal Information are governed by Section 7 of the DPA and applicable California breach-notification law.`,
      ]),
    },
    {
      heading: "8. DEIDENTIFIED AND AGGREGATE INFORMATION",
      clauses: numbered(8, [
        `(Deidentified information.) If the Service Provider creates or receives deidentified information derived from California Personal Information, the Service Provider shall comply with the statutory requirements for maintaining it in deidentified form and shall not attempt to reidentify it except as law expressly permits.`,
        `(Downstream recipients.) Where the CCPA requires contractual restrictions on a recipient of deidentified information, the Service Provider shall impose those restrictions before disclosure.`,
        `(Aggregate information.) Aggregate information that falls outside the definition of personal information may be used only as permitted by the DPA and the Principal Agreement and in a manner that does not circumvent CCPA restrictions.`,
      ]),
    },
    {
      heading: "9. TERM, PRECEDENCE AND CHANGES IN LAW",
      clauses: numbered(9, [
        `(Term.) This Addendum applies for so long as the Service Provider processes California Personal Information on the Business's behalf. Return and deletion are governed by Section 9 of the DPA, subject to California law.`,
        `(Precedence.) For California Personal Information, this Addendum prevails over the DPA${ctx.engagement.usStatesEngaged.length ? " and the US Multi-State Privacy Law Addendum" : ""} to the extent of a conflict concerning a California-specific requirement.`,
        `(Changes in law.) The Parties shall interpret this Addendum in light of amendments to the CCPA and binding regulations. If a mandatory contract term is added or changed, the Parties shall amend this Addendum as reasonably necessary to comply.`,
      ]),
    },
    optionalSection(10, [
      ["Five-business-day inability-to-comply notice", `The Service Provider shall provide the notice required by Section 12 of the DPA within five (5) business days after determining that it can no longer meet its applicable obligations, and shall include a reasonable description of the cause and the proposed remediation.`],
      ["Consumer-request service level", `The Service Provider shall forward a direct request within two (2) business days and, after receiving a verified instruction from the Business, shall provide ordinary-course technical assistance within fifteen (15) business days or a shorter period reasonably necessary for the Business to meet the applicable legal deadline.`],
      ["California subcontractor notice and objection", `The Service Provider shall provide thirty (30) calendar days' prior written notice before adding or replacing a material downstream service provider that will process California Personal Information, and the Business may object within fifteen (15) calendar days on reasonable privacy or security grounds under the procedure in Section 5 of the DPA.`],
      ["Annual California compliance audit", `The Business may conduct one (1) direct audit per calendar year on thirty (30) days' prior written notice, in addition to audits following a material incident or documented material non-compliance. The Business bears ordinary audit costs unless the audit identifies a material breach by the Service Provider.`],
      ["California 24-hour breach notice", `For a Personal Data Breach involving California Personal Information, the Service Provider shall provide the initial notice required by the DPA within twenty-four (24) hours after becoming aware.`],
      ["California product-improvement use", `The Service Provider may use California Personal Information to improve the quality or safety of the Services only to the extent the use is a permitted business purpose under the CCPA, is reasonably necessary and proportionate, does not involve building or modifying consumer profiles for use in another business's services, and is specifically identified in Schedule A.`],
      ["California governing law", `Notwithstanding the governing-law clause in the DPA, this Addendum is governed by the laws of the State of California, without regard to conflict-of-law principles, provided that disputes remain subject to the forum and dispute-resolution procedures in the Principal Agreement unless mandatory law requires otherwise.`],
      ["Separate officer certification", `An authorised officer of ${or(ctx.processorName, "processor name")} shall certify in writing, on behalf of the Service Provider, that the Service Provider understands and will comply with the restrictions and obligations in this Addendum; does not sell or share California Personal Information processed under this Addendum; will use it only for the limited and specified Business Purposes; will notify the Business if it can no longer comply; and will maintain reasonable security measures.`],
    ]),
  ];

  const scheduleA: DpaAddendumSchedule = {
    title: "Schedule A — Specific Business Purposes and California Personal Information",
    columns: ["Business Purpose", "PI Categories", "Retention", "Restrictions / Notes"],
    rows: [
      [or(ctx.services, "the specific operational purpose of the Services"), list(ctx.dataCategories, "categories of personal information"), or(ctx.retention, "retention period or criteria"), "Service Provider use limited to the specified Business Purpose and CCPA-permitted uses."],
      [TBC("any additional specific business purpose, or state that there is none"), TBC("the categories processed for that purpose"), TBC("retention for that purpose"), TBC("restrictions")],
      ...(childrens ? [[TBC("where personal information of consumers under 16 is processed, state the purpose and the consent or opt-in basis the Business has established"), "", "", ""]] : []),
    ],
    note: "The CCPA requires the permitted Business Purposes to be specific; the Services description populates the first row and the Parties add any detail needed to avoid a generic description.",
  };
  const scheduleB: DpaAddendumSchedule = {
    title: "Schedule B — Authorised Subcontractors / Downstream Service Providers",
    columns: ["Subcontractor", "Service / Processing", "Location", "PI Categories"],
    rows: ctx.hasSubProcessors
      ? (ctx.subProcessorRows.length ? ctx.subProcessorRows.map((r) => [r[0] ?? "", r[1] ?? "", r[2] ?? "", TBC("categories of California Personal Information disclosed to this subcontractor")]) : [[TBC("list the authorised subcontractors"), "", "", ""]])
      : [["None engaged as of the Effective Date.", "", "", ""]],
    note: "Schedule B consists of the Sub-processors listed in Annex D of the DPA, as updated in accordance with Section 5 of the DPA and this Addendum.",
  };
  const scheduleC: DpaAddendumSchedule = {
    title: "Schedule C — Service Provider Certification",
    columns: ["Certification"],
    rows: [[`Execution of this Addendum constitutes the Service Provider's certification that it understands the restrictions applicable to service providers and contractors under the CCPA and will comply with them for California Personal Information processed pursuant to this written contract.`]],
  };

  return {
    id: "ccpa",
    title: "CCPA Service Provider Addendum",
    subtitle: "California Consumer Privacy Act, as amended, and implementing regulations",
    reference: "DPA-CA-v2.0 — incorporated into the Data Processing Agreement between the Parties",
    preamble: [OPTIONAL_CONVENTION],
    sections,
    schedules: [scheduleA, scheduleB, scheduleC],
    executionLabels: ["Business / Controller", "Service Provider / Processor"],
  };
}

// ── 03 — US Multi-State Privacy Law Addendum ───────────────────────────────

export function usMultiStateAddendum(ctx: DpaAddendaCtx): DpaAddendum {
  const laws = ctx.coveredLaws;
  const ca = ctx.engagement.californiaEngaged;
  const childrens = ctx.dataCategories.some((c) => /children|minor|under 18/i.test(String(c)));
  const stateList = laws.map((l) => l.state).join(", ");
  const florida = laws.find((l) => l.narrowCoverage);
  const sections: DpaAddendumSection[] = [
    {
      heading: "1. DEFINITIONS AND SCOPE",
      clauses: numbered(1, [
        `"Covered State Law" means each comprehensive U.S. state privacy law listed in Schedule 1 (${stateList}), together with binding amendments and regulations, to the extent the law applies to the relevant processing; the term also includes another comprehensive state privacy law added to Schedule 1 by amendment.`,
        `"Covered Personal Data" means Personal Data processed by the Processor on the Controller's behalf that is subject to a Covered State Law.`,
        `(State-law terminology.) For each Covered State Law, "controller", "processor", "consumer", "personal data", "sensitive data", "sale", "targeted advertising" and "profiling" have the meanings assigned by that law. If definitions differ, the definition in the law governing the affected consumer and processing controls.`,
        ca ? `(California exclusion.) California personal information is governed by the separate CCPA Service Provider Addendum attached to the DPA.` : "",
        `(No scope expansion.) This Addendum does not make a Party subject to a state law that would not otherwise apply, and does not convert the Processor into a controller for processing performed solely on the Controller's instructions.`,
      ]),
    },
    {
      heading: "2. PROCESSING INSTRUCTIONS AND REQUIRED CONTRACT DESCRIPTION",
      clauses: numbered(2, [
        `(Instructions.) The Processor shall adhere to the Controller's instructions, including the DPA, this Addendum, Schedule 2 and later lawful documented instructions.`,
        `(Nature and purpose.) Schedule 2 states the nature and purpose of the processing, the types and categories of Covered Personal Data, the duration or retention criteria, and the rights and obligations of the Parties.`,
        `(Purpose limitation.) The Processor shall not process Covered Personal Data for a purpose outside the Controller's instructions except to the extent applicable law permits or requires the processing.`,
        `(Confidentiality.) The Processor shall ensure each person authorised to process Covered Personal Data is subject to an appropriate duty of confidentiality.`,
      ]),
    },
    {
      heading: "3. CONTROLLER ASSISTANCE AND CONSUMER RIGHTS",
      clauses: numbered(3, [
        `(Rights assistance.) Taking into account the nature of the processing and the information available to the Processor, the Processor shall assist the Controller in responding to authenticated consumer requests under the applicable Covered State Law.`,
        `(Covered rights.) Assistance may include confirmation or access, correction, deletion, portability, disclosure-related information, opt-out requests, appeals, and rights relating to targeted advertising, sale, profiling or sensitive data, to the extent each right exists under the applicable law.`,
        `(Direct requests.) The Processor shall promptly forward a consumer request received directly concerning Covered Personal Data and shall not independently decide or respond to the request except on the Controller's instruction or as required by law.`,
      ]),
    },
    {
      heading: "4. SECURITY AND DATA PROTECTION ASSESSMENTS",
      clauses: numbered(4, [
        `(Security.) The Processor shall maintain reasonable administrative, technical and physical safeguards appropriate to the nature and volume of Covered Personal Data and the risks of the processing, as further described in Annex C of the DPA.`,
        `(Assessment assistance.) The Processor shall provide the information reasonably necessary for the Controller to conduct any data protection assessment or similar risk assessment required by a Covered State Law, taking into account the nature of the processing and the information available to the Processor.`,
        `(Incident cooperation.) The Processor shall cooperate with the Controller concerning security incidents and breach obligations in accordance with Section 7 of the DPA and applicable state law.`,
      ]),
    },
    {
      heading: "5. SUB-PROCESSORS",
      clauses: numbered(5, [
        `(Authorisation.) Sub-processors are authorised using the model selected in Section 5 of the DPA (${ctx.subprocessorAuthorizationModel === "specific" ? "specific prior written authorisation" : "general authorisation"}) and listed in Annex D of the DPA.`,
        `(Written contract.) The Processor shall enter into a written contract with each Sub-processor requiring appropriate confidentiality, security, purpose limitation, rights assistance, return or deletion, and the other processor obligations applicable to the delegated processing under the relevant Covered State Law.`,
        `(Responsibility.) The Processor remains responsible for delegated processing to the extent required by the applicable Covered State Law and the DPA.`,
      ]),
    },
    {
      heading: "6. COMPLIANCE INFORMATION AND ASSESSMENTS OF THE PROCESSOR",
      clauses: numbered(6, [
        `(Demonstrating compliance.) The Processor shall make available to the Controller the information reasonably necessary to demonstrate the Processor's compliance with processor obligations under the applicable Covered State Laws.`,
        `(Assessments.) The Processor shall allow and cooperate with reasonable assessments by the Controller or the Controller's designated assessor to the extent a Covered State Law requires such an assessment. Where law permits, the Processor may use a qualified independent assessor and provide the resulting report to the Controller in lieu of a Controller-led assessment.`,
        `(Regulatory cooperation.) The Processor shall reasonably cooperate with the Controller in responding to lawful inquiries from an attorney general or other authority with enforcement jurisdiction over a Covered State Law concerning the Processor's processing on the Controller's behalf.`,
      ]),
    },
    {
      heading: "7. RETURN, DELETION, DEIDENTIFIED AND PSEUDONYMOUS DATA",
      clauses: numbered(7, [
        `(Return or deletion.) At the Controller's direction or at the end of the relevant Services, the Processor shall delete or return Covered Personal Data as required by the applicable Covered State Law and Section 9 of the DPA, unless retention is required by law.`,
        `(Legally retained data.) During legally required retention, the Processor shall limit processing to the legally required purpose and continue to protect the data under the DPA and this Addendum.`,
        `(Deidentified data.) Where a Covered State Law imposes obligations on deidentified data, the Processor shall take the measures that law requires to prevent reidentification and shall impose the required contractual restrictions on recipients.`,
        `(Pseudonymous data.) Pseudonymous data remains subject to this Addendum to the extent it remains personal data under the applicable law.`,
      ]),
    },
    {
      heading: "8. SENSITIVE DATA, TARGETED ADVERTISING, SALE AND PROFILING",
      clauses: numbered(8, [
        `(Sensitive data.) The Processor shall process sensitive data only on the Controller's instructions and only where the Controller has established any consent or other authorisation the applicable Covered State Law requires, unless the law independently assigns the requirement to the Processor.`,
        `(Sale and targeted advertising.) The Processor shall not sell Covered Personal Data or use it for the Processor's own targeted advertising. Any processing that would cause the Processor to act as an independent controller must be separately documented and lawfully supported.`,
        `(Profiling.) The Processor shall not engage in profiling in furtherance of decisions producing legal or similarly significant effects except on the Controller's documented instructions and in compliance with the applicable Covered State Law.`,
        childrens ? `(Children and teenagers.) The record identifies Personal Data concerning children or teenagers. Where a Covered State Law provides heightened protection for them, the Processor shall provide reasonable assistance for the Controller to implement the applicable opt-in, consent, opt-out, deletion or assessment obligations.` : "",
      ]),
    },
    {
      heading: "9. UNIVERSAL OPT-OUT MECHANISMS AND PREFERENCE SIGNALS",
      clauses: numbered(9, [
        `(Conditional applicability.) Where a Covered State Law requires the Controller to recognise a universal opt-out mechanism or other legally recognised preference signal, the Processor shall assist to the extent the Processor operates the relevant interface or receives the signal on the Controller's behalf.`,
        `(No unnecessary expansion.) The Processor is not required to recognise a signal where the applicable Covered State Law does not require it or where the Processor does not operate the relevant technical interface or processing operation.`,
      ]),
    },
    {
      heading: "10. STATE-SPECIFIC SUPPLEMENTAL REQUIREMENTS",
      clauses: numbered(10, [
        `(Supplemental schedule.) Schedule 3 identifies material state-specific differences that require operational attention in addition to the common processor-contract baseline in this Addendum.`,
        `(Stricter compatible requirement.) If two Covered State Laws apply to the same processing and impose compatible but different requirements, the Parties may follow the more protective requirement where doing so satisfies both laws. If the laws conflict, each requirement applies only to the processing and consumers governed by that law.`,
        `(Changes in law.) If a Covered State Law is amended or a new comprehensive state privacy law becomes applicable, the Parties shall interpret the DPA and this Addendum to satisfy mandatory processor-contract terms and amend Schedule 1 or Schedule 3 as reasonably necessary.`,
        florida
          ? `(Florida.) The Florida Digital Bill of Rights has materially narrower entity coverage than the other Covered State Laws. Where it applies to the relevant processing, the processor-contract obligations in this Addendum apply to Florida personal data to the extent consistent with that law. ${TBC("confirm whether the Controller meets the Florida Digital Bill of Rights controller threshold")}`
          : "",
      ]),
    },
    {
      heading: "11. RELATIONSHIP TO THE DPA AND TERM",
      clauses: numbered(11, [
        `(Incorporation.) This Addendum is incorporated into the DPA and applies for as long as the Processor processes Covered Personal Data on the Controller's behalf.`,
        `(Precedence.) For Covered Personal Data, this Addendum prevails over the DPA only to the extent necessary to comply with the applicable Covered State Law.${ca ? " The CCPA Service Provider Addendum prevails for California personal information." : ""}`,
        `(Commercial terms.) Liability, indemnification, notices, dispute resolution and governing law are controlled by the DPA and the Principal Agreement except where mandatory law provides otherwise.`,
      ]),
    },
    optionalSection(12, [
      ["Multi-state consumer-request service level", `The Processor shall forward a direct request within two (2) business days and provide ordinary-course assistance within fifteen (15) business days after the Controller's authenticated instruction, or within a shorter period reasonably necessary for the Controller to meet an applicable legal deadline.`],
      ["Multi-state Sub-processor notice and objection", `Where general authorisation applies, the Processor shall provide ${Math.max(15, ctx.subprocessorNoticeDays || 30)} calendar days' advance written notice of a material new or replacement Sub-processor and permit the Controller to object within fifteen (15) calendar days on reasonable privacy or security grounds, using the procedure in Section 5 of the DPA.`],
      ["Assessment frequency and cost", `Routine direct assessments shall occur no more than once per calendar year on thirty (30) days' prior written notice and at the Controller's expense, except where a material incident, documented material non-compliance or a regulatory requirement justifies a different schedule. If an assessment identifies the Processor's material breach, the Processor shall bear reasonable documented assessment costs.`],
    ]),
  ];

  const schedule1: DpaAddendumSchedule = {
    title: "Schedule 1 — Covered State Laws",
    columns: ["State", "Law", "Effective Date"],
    rows: laws.map((l) => [l.state, `${l.law}, ${l.citation}`, l.effective]),
    note: "Only the states the record engages are listed. A law applies under this Addendum only when its own applicability requirements are satisfied.",
  };
  const schedule2: DpaAddendumSchedule = {
    title: "Schedule 2 — Description of Processing",
    columns: ["Required Term", "Populated Value"],
    rows: [
      ["Controller", `${or(ctx.controllerName, "controller legal name")} (${or(ctx.controllerJurisdiction, "controller jurisdiction")})`],
      ["Processor", `${or(ctx.processorName, "processor legal name")} (${or(ctx.processorJurisdiction, "processor jurisdiction")})`],
      ["Nature and purpose / Services", or(ctx.services, "the Services")],
      ["Types / categories of personal data", list(ctx.dataCategories, "categories of personal data")],
      ["Categories of consumers / data subjects", TBC("categories of consumers or data subjects")],
      ["Duration / retention", or(ctx.retention, "retention period or criteria")],
      ["Security measures", ctx.securityMeasureLabels.length || s(ctx.securityMeasuresDetails) ? `Annex C of the DPA: ${[...ctx.securityMeasureLabels, s(ctx.securityMeasuresDetails)].filter(Boolean).join("; ")}` : `Annex C of the DPA ${TBC("populate Annex C before the processing commences")}`],
      ["Sub-processor authorisation", ctx.subprocessorAuthorizationModel === "specific" ? "Specific prior written authorisation" : "General authorisation"],
      ["Audit / assessment model", or(ctx.auditRights, "the audit arrangement")],
    ],
  };
  const schedule3: DpaAddendumSchedule = {
    title: "Schedule 3 — State-Specific Operational Supplements",
    columns: ["State", "Supplemental Operational Rule"],
    rows: [
      ...laws.filter((l) => l.supplement).map((l) => [l.state, l.supplement as string]),
      ["Other Covered State", "If an applicable law imposes a mandatory processor-contract term not reasonably satisfied by this Addendum, the minimum additional legally required term is incorporated upon written amendment to this Schedule."],
    ],
  };

  return {
    id: "us-multistate",
    title: "US Multi-State Privacy Law Addendum",
    subtitle: `Controller-to-Processor — ${ca ? "non-California " : ""}comprehensive state privacy laws engaged by the record: ${stateList}`,
    reference: "DPA-US-MULTISTATE-v2.0 — incorporated into the Data Processing Agreement between the Parties",
    preamble: [OPTIONAL_CONVENTION],
    sections,
    schedules: [schedule1, schedule2, schedule3],
    executionLabels: ["Controller", "Processor"],
  };
}

// ── 04 — EU SCC Module 2 Implementation Exhibit ────────────────────────────

export function euSccExhibit(ctx: DpaAddendaCtx): DpaAddendum {
  const specific = ctx.subprocessorAuthorizationModel === "specific";
  const days = Math.max(15, ctx.subprocessorNoticeDays || 30);
  const sens = sensitiveCategories(ctx.dataCategories);
  const sections: DpaAddendumSection[] = [
    {
      heading: "1. INCORPORATION AND MODULE ELECTION",
      clauses: numbered(1, [
        `(Incorporation.) The Parties incorporate the standard contractual clauses in the Annex to Commission Implementing Decision (EU) 2021/914, Module Two (transfer controller to processor), without modification except for the permitted module and option selections and completion of the Appendix. The official text is published at https://eur-lex.europa.eu/eli/dec_impl/2021/914/oj. If the law governing execution requires the official text to be physically attached or reproduced, the Parties shall attach the official Module Two text at execution without alteration. No language in the DPA or this Exhibit replaces or rewrites the SCCs.`,
        `(Module.) Module Two — transfer controller to processor — applies. The data exporter is the Controller and the data importer is the Processor for the transfers described in Annex I.B.`,
        `(Hierarchy.) Clause 5 of the SCCs controls their relationship with the DPA and this Exhibit. If this Exhibit or the DPA conflicts with the SCCs, the SCCs prevail to the extent of the conflict.`,
        `(When this Exhibit may be used.) This Exhibit is used only where Commission Implementing Decision (EU) 2021/914 is available for the transfer; the Commission's transfer SCCs are designed for transfers to a data importer whose relevant processing is not itself directly subject to the GDPR under Article 3. ${TBC("confirm that the data importer's processing of the transferred data is not itself directly subject to the GDPR under Article 3; if it is, a different mechanism is required")}`,
      ]),
    },
    {
      heading: "2. PERMITTED SCC ELECTIONS",
      clauses: numbered(2, [
        `(Clause 7 — docking.) ${TBC("state whether Clause 7 (Docking Clause) is included; if it is not, the non-selected text is deleted from any physically attached SCC text")}`,
        `(Clause 9 — Sub-processors.) The Clause 9(a) option matching the DPA is ${specific ? "Option 1 (specific prior authorisation)" : `Option 2 (general written authorisation), with an advance-notice period of ${days} days, matching Section 5 of the DPA`}. The non-selected Clause 9(a) option shall be deleted from any physically attached SCC text.`,
        `(Clause 11 — redress.) ${TBC("state whether the optional Clause 11(a) language permitting the data subject to lodge a complaint with an independent dispute-resolution body at no cost is included")}`,
        `(Clause 13 — supervisory authority.) The competent supervisory authority is identified in Annex I.C using the Clause 13 rule that applies to the data exporter's establishment, Article 3(2) status and Article 27 representative status.`,
        `(Clause 17 — governing law.) The SCCs are governed by the law of ${TBC("the EU Member State whose law governs the SCCs; that law must allow for third-party beneficiary rights")}, as Clause 17 requires.`,
        `(Clause 18 — forum.) The courts for Clause 18(b) are the courts of ${TBC("the EU Member State whose courts have jurisdiction")}, without prejudice to the data-subject forum rights in Clause 18(c).`,
      ]),
    },
    {
      heading: "3. SUPPLEMENTAL CONTRACT TERMS",
      clauses: numbered(3, [
        `(Non-contradiction.) Additional protections in the DPA apply only to the extent they do not contradict the SCCs, directly or indirectly, or prejudice data-subject rights. A supplemental obligation does not amend the SCC text.`,
        `(Operational details.) The DPA may specify how the Parties will perform SCC obligations, including fixed response or notification timelines, audit procedures and deletion procedures, provided those terms do not undermine the SCCs.`,
      ]),
    },
    optionalSection(4, [
      ["24-hour breach supplement", `Without modifying Clause 8.6(c), the Parties agree that "without undue delay" includes an initial notice by the data importer to the data exporter within twenty-four (24) hours after the data importer becomes aware of a personal data breach affecting data transferred under the SCCs.`],
      ["Deletion-certification detail", `Without modifying Clause 8.5, the data importer shall provide the deletion certification described in the DPA upon the data exporter's written request and shall identify any personal data retained because local law prevents deletion or return.`],
    ]),
  ];

  const parties: DpaAddendumSchedule = {
    title: "Annex I.A — List of Parties",
    columns: ["Item", "Data exporter (Controller)", "Data importer (Processor)"],
    rows: [
      ["Name", or(ctx.controllerName, "controller legal name"), or(ctx.processorName, "processor legal name")],
      ["Address", TBC("address"), TBC("address")],
      ["Contact person, position and details", TBC("contact person, position and details"), TBC("contact person, position and details")],
      ["Activities relevant to the transfer", or(ctx.services, "the activities relevant to the transfer"), or(ctx.services, "the activities relevant to the transfer")],
      ["Role", "Controller", "Processor"],
      ["Signature and date", "See the execution block of this Exhibit or of the DPA, where legally sufficient", "See the execution block of this Exhibit or of the DPA, where legally sufficient"],
    ],
  };
  const transfer: DpaAddendumSchedule = {
    title: "Annex I.B — Description of Transfer",
    columns: ["Required Appendix Item", "Description"],
    rows: [
      ["Categories of data subjects", TBC("categories of data subjects")],
      ["Categories of personal data", list(ctx.dataCategories, "categories of personal data")],
      ["Sensitive data and safeguards", sens.length ? `${sens.join(", ")} — ${TBC("the specific restrictions and safeguards applied to the sensitive data")}` : "None identified in the record."],
      ["Frequency of the transfer", TBC("continuous, periodic, ad hoc or other")],
      ["Nature of the processing", or(ctx.services, "the nature of the processing")],
      ["Purpose(s) of the transfer and further processing", or(ctx.services, "the purposes of the transfer")],
      ["Retention period or criteria", or(ctx.retention, "retention period or criteria")],
      ["Transfers to sub-processors", specific ? "Subject matter, nature and duration as described in Annex III of this Exhibit and the applicable Sub-processor contracts." : "Subject matter, nature and duration as described in Annex D of the DPA and the applicable Sub-processor contracts."],
      ["Destination country or region", TBC("destination country or region")],
    ],
  };
  const authority: DpaAddendumSchedule = {
    title: "Annex I.C — Competent Supervisory Authority",
    columns: ["Item", "Completion"],
    rows: [["Competent supervisory authority under Clause 13", TBC("the supervisory authority determined by the data exporter's establishment, representative or Article 3(2) circumstances — not selected for convenience")]],
  };
  const toms: DpaAddendumSchedule = {
    title: "Annex II — Technical and Organisational Measures",
    columns: ["Measure", "SCC Annex II Detail"],
    rows: [
      ["Security measures", ctx.securityMeasureLabels.length || s(ctx.securityMeasuresDetails) ? [...ctx.securityMeasureLabels, s(ctx.securityMeasuresDetails)].filter(Boolean).join("; ") : TBC("the measures in Annex C of the DPA, described with sufficient specificity for the transfer")],
      ["Measures for sensitive data", sens.length ? TBC("the measures applied to the sensitive data transferred") : "Not applicable — no sensitive data identified in the record."],
      ["Measures enabling data-subject request assistance", TBC("search, export, correction, deletion and restriction mechanisms, as applicable")],
      ["Measures for transfers to sub-processors", TBC("the applicable flow-down, access and security measures")],
    ],
    note: "The measures in Annex C of the DPA are incorporated to the extent they are actually implemented and apply to the transferred personal data.",
  };
  const subs: DpaAddendumSchedule = specific
    ? {
      title: "Annex III — List of Sub-processors (specific authorisation)",
      columns: ["Name", "Address", "Contact", "Description of Processing"],
      rows: ctx.subProcessorRows.length
        ? ctx.subProcessorRows.map((r) => [r[0] ?? "", TBC("address"), TBC("contact"), r[1] && !/^\[TO BE COMPLETED/.test(r[1]) ? `${r[1]}${r[2] && !/^\[TO BE COMPLETED/.test(r[2]) ? ` (${r[2]})` : ""}` : TBC("description of processing")])
        : [[TBC("list the authorised sub-processors"), "", "", ""]],
    }
    : {
      title: "Annex III — List of Sub-processors",
      columns: ["Note"],
      rows: [["Clause 9(a) Option 2 (general written authorisation) is selected; the Sub-processor list is maintained in Annex D of the DPA for contractual and notice purposes, and Annex III is not required by the SCC Appendix for that election."]],
    };

  return {
    id: "eu-scc",
    title: "EU Standard Contractual Clauses — Module Two Implementation Exhibit",
    subtitle: "Commission Implementing Decision (EU) 2021/914 — controller-to-processor restricted transfers",
    reference: "Official instrument: Commission Implementing Decision (EU) 2021/914, Annex, Module Two — incorporated into the Data Processing Agreement between the Parties",
    preamble: [
      `Execution of this Exhibit or of the DPA constitutes agreement to be bound by the official EU SCCs to the extent valid under the law governing execution. Annex I.A must be executed in a manner satisfying the SCCs and applicable contract law.`,
      OPTIONAL_CONVENTION,
    ],
    sections,
    schedules: [parties, transfer, authority, toms, subs],
    executionLabels: ["Data exporter / Controller", "Data importer / Processor"],
  };
}

// ── 05 — UK International Data Transfer Addendum B1.0 Exhibit ──────────────

export function ukAddendumExhibit(ctx: DpaAddendaCtx): DpaAddendum {
  const specific = ctx.subprocessorAuthorizationModel === "specific";
  const days = Math.max(15, ctx.subprocessorNoticeDays || 30);
  const sens = sensitiveCategories(ctx.dataCategories);
  const sections: DpaAddendumSection[] = [
    {
      heading: "1. APPROVED INSTRUMENT",
      clauses: numbered(1, [
        `This Exhibit implements the ICO's International Data Transfer Addendum to the EU Commission Standard Contractual Clauses, template Addendum B.1.0 issued by the ICO and laid before Parliament under section 119A of the Data Protection Act 2018 on 2 February 2022 (the "Approved Addendum"). It does not rewrite the Approved Addendum's Mandatory Clauses.`,
        `The EU SCCs used with this Addendum are the official Commission Implementing Decision (EU) 2021/914 Module Two SCCs identified in the EU SCC Module 2 Implementation Exhibit.`,
        `The Approved Addendum's own revision mechanism governs future revisions; the Parties shall use the current IDTA and Addendum versions the ICO instructs organisations to use at the time of execution.`,
      ]),
    },
    {
      heading: "2. PART 2 — MANDATORY CLAUSES OF THE APPROVED ADDENDUM",
      clauses: numbered(2, [
        `The Part 2 Mandatory Clauses are incorporated by reference using the wording the ICO authorises, which shall not be rewritten except as the Approved Addendum itself permits: "Part 2: Mandatory Clauses of the Approved Addendum, being the template Addendum B.1.0 issued by the ICO and laid before Parliament in accordance with s119A of the Data Protection Act 2018 on 2 February 2022, as it is revised under Section 18 of those Mandatory Clauses."`,
      ]),
    },
    {
      heading: "3. TRANSFER RISK ASSESSMENT AND DPA COORDINATION",
      clauses: numbered(3, [
        `(TRA requirement.) The UK sender remains responsible for ensuring that a restricted transfer satisfies the applicable UK transfer rules, including completion of a transfer risk assessment where required. The Parties shall cooperate by providing the relevant information in their possession.`,
        `(Current UK data-protection test.) The Parties shall apply the UK transfer-risk standard and the ICO guidance in force when the assessment is performed, including the requirement that the standard of protection for people's information is not materially lower after the transfer.`,
        `(No modification of mandatory clauses.) Nothing in this Section, the DPA or the EU SCC Exhibit changes the Approved Addendum's Mandatory Clauses or makes a change to the Approved EU SCCs that the Approved Addendum does not permit.`,
      ]),
    },
    optionalSection(4, [
      ["UK extra protection", `In addition to the Approved Addendum and the EU SCCs, the optional enhanced security, breach-notification, audit, deletion and government-access provisions retained in the DPA apply to UK personal data to the extent they do not reduce the protections of, or conflict with, the Approved Addendum or the EU SCCs.`],
      ["Table 4 ending election", `The importer and the exporter may end this Addendum in the circumstances set out in the Approved Addendum Mandatory Clauses when the Approved Addendum changes. ${TBC("if the Parties prefer a different Table 4 selection permitted by the Approved Addendum, replace this election before execution")}`],
    ]),
  ];

  const table1: DpaAddendumSchedule = {
    title: "Part 1 — Table 1: Parties",
    columns: ["Item", "Exporter (sends the restricted transfer)", "Importer (receives the restricted transfer)"],
    rows: [
      ["Full legal name", or(ctx.controllerName, "controller legal name"), or(ctx.processorName, "processor legal name")],
      ["Main address", TBC("main address"), TBC("main address")],
      ["Official registration number, if any", TBC("registration number"), TBC("registration number")],
      ["Key contact name and title", TBC("key contact name and title"), TBC("key contact name and title")],
      ["Key contact details", TBC("key contact details"), TBC("key contact details")],
      ["Role under the EU SCCs", "Controller / data exporter", "Processor / data importer"],
    ],
  };
  const table2: DpaAddendumSchedule = {
    title: "Part 1 — Table 2: Selected SCCs, Modules and Selected Clauses",
    columns: ["EU SCC Item", "Selection"],
    rows: [
      ["Addendum EU SCCs", "The Approved EU SCCs are the standard contractual clauses in Commission Implementing Decision (EU) 2021/914 identified in the EU SCC Module 2 Implementation Exhibit, completed using the Appendix information referenced in Table 3."],
      ["Module", "Module Two — transfer controller to processor."],
      ["Clause 7 (docking)", TBC("included or not included — match the EU SCC Exhibit election")],
      ["Clause 9(a) (Sub-processors)", specific ? "Option 1 — specific prior authorisation (matching Section 5 of the DPA)." : `Option 2 — general written authorisation, with an advance-notice period of ${days} days (matching Section 5 of the DPA).`],
      ["Clause 11 optional redress language", TBC("included or not included — match the EU SCC Exhibit election")],
      ["Clause 13", "As adapted by the Approved Addendum for UK restricted transfers."],
      ["Clauses 17 and 18", "As modified by the Approved Addendum Mandatory Clauses for UK restricted transfers."],
    ],
  };
  const table3: DpaAddendumSchedule = {
    title: "Part 1 — Table 3: Appendix Information",
    columns: ["Appendix Information", "Location / Completion"],
    rows: [
      ["Annex I.A — List of Parties", "Table 1 above and EU SCC Exhibit Annex I.A, with any UK-specific completion needed for the restricted transfer."],
      ["Annex I.B — Description of Transfer", "EU SCC Exhibit Annex I.B and Annex B of the DPA. Categories of data subjects, transfer frequency and destination remain party-completion fields where not recorded in the intake."],
      ["Annex I.C — Supervisory Authority", "For the UK Addendum, the Information Commissioner exercises the functions assigned by the Approved Addendum Mandatory Clauses; EU SCC Annex I.C remains completed for EU transfers where separately applicable."],
      ["Annex II — TOMs", "Annex C of the DPA and EU SCC Exhibit Annex II."],
      ["Annex III — Sub-processors", specific ? "EU SCC Exhibit Annex III (Clause 9 Option 1 applies)." : "Annex D of the DPA provides the agreed Sub-processor list and notice mechanism (Clause 9 Option 2 applies)."],
    ],
  };
  const sheet: DpaAddendumSchedule = {
    title: "Schedule 1 — UK Restricted Transfer Completion Sheet",
    columns: ["Field", "Completion"],
    rows: [
      ["UK sender / exporter", or(ctx.controllerName, "controller legal name")],
      ["Receiver / importer", or(ctx.processorName, "processor legal name")],
      ["Restricted transfer destination", TBC("destination country or region")],
      ["Categories of data subjects", TBC("categories of data subjects")],
      ["Categories of personal data", list(ctx.dataCategories, "categories of personal data")],
      ["Sensitive, special-category or criminal-offence data", sens.length ? sens.join(", ") : "None identified in the record."],
      ["Nature and purpose", or(ctx.services, "the nature and purpose of the processing")],
      ["Frequency", TBC("continuous, periodic, ad hoc or other")],
      ["Retention", or(ctx.retention, "retention period or criteria")],
      ["TOMs", "Annex C of the DPA / EU SCC Exhibit Annex II"],
      ["Sub-processors", specific ? "EU SCC Exhibit Annex III" : "Annex D of the DPA and the EU SCC Clause 9 election"],
      ["TRA reference and date", TBC("the transfer risk assessment reference and date, completed outside or with this Addendum")],
    ],
  };

  return {
    id: "uk-addendum",
    title: "UK International Data Transfer Addendum — B1.0 Implementation Exhibit",
    subtitle: "ICO International Data Transfer Addendum to the EU Commission Standard Contractual Clauses",
    reference: "Approved Addendum: template Addendum B.1.0 issued by the ICO and laid before Parliament under s.119A DPA 2018 on 2 February 2022 — incorporated into the Data Processing Agreement between the Parties",
    preamble: [
      `The Parties agree to be legally bound by this UK Addendum implementation, including the Part 1 information and the incorporated Part 2 Mandatory Clauses, in connection with the UK restricted transfers it covers.`,
      OPTIONAL_CONVENTION,
    ],
    sections,
    schedules: [table1, table2, table3, sheet],
    executionLabels: ["Exporter / Controller", "Importer / Processor"],
  };
}

// ── Assembly ───────────────────────────────────────────────────────────────

/** The addenda the engagement attaches, in package order. */
export function buildAddenda(ctx: DpaAddendaCtx): DpaAddendum[] {
  const out: DpaAddendum[] = [];
  if (ctx.engagement.californiaEngaged) out.push(ccpaAddendum(ctx));
  if (ctx.engagement.usStatesEngaged.length && ctx.coveredLaws.length) out.push(usMultiStateAddendum(ctx));
  if (ctx.engagement.euSccExhibit) out.push(euSccExhibit(ctx));
  if (ctx.engagement.ukAddendumExhibit) out.push(ukAddendumExhibit(ctx));
  return out;
}

/** Flat text of one addendum (document_text sibling of the structured form). */
export function addendumText(a: DpaAddendum, controllerName: string, processorName: string): string {
  const parts: string[] = [];
  parts.push(`${a.title.toUpperCase()}\n${a.subtitle}\n${a.reference}`);
  for (const p of a.preamble) parts.push(p);
  for (const sec of a.sections) parts.push(`${sec.heading}\n${sec.clauses.join("\n")}`);
  for (const sch of a.schedules) {
    const lines = [`${sch.title.toUpperCase()} (${sch.columns.join(" / ")})`];
    for (const r of sch.rows) lines.push(`- ${r.filter((c) => c !== "").join(" / ")}`);
    if (sch.note) lines.push(sch.note);
    parts.push(lines.join("\n"));
  }
  parts.push(`EXECUTION\nIN WITNESS WHEREOF, the Parties have executed this ${a.id === "eu-scc" || a.id === "uk-addendum" ? "Exhibit" : "Addendum"} by their duly authorised representatives.\n${a.executionLabels[0]}: ${s(controllerName) || "______________________"}  Date: ________\n${a.executionLabels[1]}: ${s(processorName) || "______________________"}  Date: ________`);
  return parts.join("\n\n");
}
