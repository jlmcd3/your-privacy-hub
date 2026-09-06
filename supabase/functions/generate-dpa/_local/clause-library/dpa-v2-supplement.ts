// supabase/functions/generate-dpa/_local/clause-library/dpa-v2-supplement.ts
//
// DOC 182 (2026-09-04) — THE CANONICAL DPA PACKAGE v2.0 PORT, PART ONE.
// Ports "01_Canonical_Global_Data_Processing_Agreement_v2.0" onto the dark
// clause-library assembler WITHOUT touching a ratified clause string
// (doc 80/81 + every A-Team/panel re-pin): the Art. 28 skeleton in
// dpa-clause-library.ts stays byte-for-byte; this module ADDS.
//
//   1. deriveDpaEngagement() — the single-enum DpaMode is kept for the mode
//      gate (DOC-81 D-1 is the CEO's call), but every geography now carries
//      its own independent flag so addenda and exhibits attach per
//      jurisdiction (the layered package the CEO ratified), never per mode.
//   2. DPA_US_COVERED_STATE_LAWS — the comprehensive-law table for the states
//      the intake can engage. Alabama, Louisiana, Oklahoma and Vermont are
//      NOT here (CEO 2026-09-04: omit until legally verified); New York,
//      Washington, Illinois and Massachusetts have sectoral statutes only and
//      carry no comprehensive-law row.
//   3. supplementarySections() — the v2.0 provisions the ratified core does
//      not carry (assessments, privacy by design, sensitive data, compliance
//      programme, transparency, liability, general provisions, addenda &
//      precedence) plus the OPTIONAL PROVISIONS section, appended after the
//      core for the GDPR family.
//   4. neutralBaseSections() — the jurisdiction-neutral v2.0 skeleton used
//      when mode === "us-state" (the GDPR skeleton's Art. 28 citations are
//      wrong law there). It is exercised by tests today and serves
//      production only once the CEO adds "us-state" to
//      DPA_DETERMINISTIC_MODES.
//
// PLACEHOLDER GRAMMAR is the library's own: [TO BE COMPLETED: …] names what
// to supply and never a value; the PDF renderer turns each into the fleet's
// italic bracketed prompt and counts it in the completion banner.
//
// LINT DISCIPLINE: every clause here passes the deterministic nets the
// handler runs on the deterministic path too — no children's-data,
// HIPAA/GLBA/FCRA or AI-training vocabulary unless the record carries the
// category; no non-engaged state statute named anywhere; no § 1798.150.

import { normalizeJurisdiction } from "../dpa-derivation.ts";
import { deriveEngagedStates } from "../dpa-engaged-states.ts";
import { type DpaClauseSection, type DpaMode, ukEngaged as ukEngagedByJurisdiction } from "./dpa-clause-library.ts";

// ── Engagement ─────────────────────────────────────────────────────────────

export interface DpaEngagement {
  /** EU GDPR engaged: a GDPR-family mode, or an EEA party. */
  readonly gdprEngaged: boolean;
  /** UK GDPR engaged: "uk" mode or a UK party (word-bounded test). */
  readonly ukEngaged: boolean;
  readonly californiaEngaged: boolean;
  /** Canonical names of engaged non-California states that HAVE a comprehensive law, sorted. */
  readonly usStatesEngaged: readonly string[];
  /** Engaged US states with no comprehensive law (sectoral statutes only), sorted. */
  readonly usStatesWithoutComprehensiveLaw: readonly string[];
  /** The EU SCC Module 2 exhibit attaches (a recorded transfer on the EU SCCs, or the UK Addendum which rides on them). */
  readonly euSccExhibit: boolean;
  /** The UK International Data Transfer Addendum exhibit attaches. */
  readonly ukAddendumExhibit: boolean;
  readonly canadaEngaged: boolean;
}

export interface DpaEngagementInput {
  readonly documentType: DpaMode;
  readonly controllerJurisdiction: string;
  readonly processorJurisdiction: string;
  readonly includeTransferClause: boolean;
  readonly transferMechanism: string;
  readonly californiaEngaged?: boolean;
}

const EEA_JUR_RE =
  /austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|\bireland\b|italy|latvia|lithuania|luxembourg|malta|netherlands|poland|portugal|romania|slovakia|slovenia|spain|sweden|iceland|liechtenstein|norway/i;
const UK_ONLY_IRELAND_RE = /northern ireland/i;

export function deriveDpaEngagement(input: DpaEngagementInput): DpaEngagement {
  const ctrl = String(input.controllerJurisdiction ?? "");
  const proc = String(input.processorJurisdiction ?? "");
  const canon = [normalizeJurisdiction(ctrl).canonical, normalizeJurisdiction(proc).canonical];
  const engaged = deriveEngagedStates(canon);
  const gdprFamily = input.documentType === "gdpr" || input.documentType === "dual-eu-us" || input.documentType === "dual-eu-ca";
  const eea = (j: string) => EEA_JUR_RE.test(j) && !UK_ONLY_IRELAND_RE.test(j);
  const mech = String(input.transferMechanism ?? "");
  const ukAddendum = !!input.includeTransferClause && /\bUK\b|IDTA|Addendum/i.test(mech);
  const euScc = !!input.includeTransferClause && /standard contractual clauses|\bSCCs?\b/i.test(mech);
  const covered = [...engaged].filter((s) => s !== "California" && COVERED_BY_NAME.has(s)).sort();
  const sectoral = [...engaged].filter((s) => s !== "California" && !COVERED_BY_NAME.has(s)).sort();
  return {
    gdprEngaged: gdprFamily || eea(ctrl) || eea(proc),
    ukEngaged: input.documentType === "uk" || ukEngagedByJurisdiction(ctrl, proc),
    californiaEngaged: input.californiaEngaged === true || engaged.has("California"),
    usStatesEngaged: covered,
    usStatesWithoutComprehensiveLaw: sectoral,
    euSccExhibit: euScc || ukAddendum,
    ukAddendumExhibit: ukAddendum,
    canadaEngaged: input.documentType === "canada" || input.documentType === "dual-eu-ca",
  };
}

// ── Covered state laws ─────────────────────────────────────────────────────

export interface CoveredStateLaw {
  readonly state: string;
  readonly law: string;
  readonly citation: string;
  /** Human-readable effective date of the comprehensive law. */
  readonly effective: string;
  /** Florida's law has materially narrower entity coverage; rendered with its own applicability clause. */
  readonly narrowCoverage?: boolean;
  /** Schedule 3 operational supplement, where the v2.0 package carries one. */
  readonly supplement?: string;
}

/**
 * The comprehensive-law table for every US jurisdiction the DPA intake can
 * select (DPA_JURISDICTIONS). Citations reconcile the v2.0 package's
 * Schedule 1 with the fleet's verified anchors (dpa-us-citation-anchors.ts)
 * where they differ: Virginia carries the recodified §§ 59.1-575–585 the
 * anchors use; Tennessee is Part 32 (§ 47-18-3201), the form the engaged-
 * states detector recognises; Connecticut cites the codified chapter.
 */
export const DPA_US_COVERED_STATE_LAWS: readonly CoveredStateLaw[] = [
  { state: "Colorado", law: "Colorado Privacy Act", citation: "Colo. Rev. Stat. § 6-1-1301 et seq.", effective: "July 1, 2023",
    supplement: "The Processor shall provide the information and assessment cooperation the Colorado Privacy Act requires of processors. Where that law requires an opportunity to object to a new Sub-processor, the objection right in Section 5 of the DPA applies notwithstanding a less protective default." },
  { state: "Connecticut", law: "Connecticut Data Privacy Act", citation: "Conn. Gen. Stat. § 42-515 et seq.", effective: "July 1, 2023",
    supplement: "The Processor shall provide the information and assessment cooperation the Connecticut Data Privacy Act requires of processors. Where that law requires an opportunity to object to a new Sub-processor, the objection right in Section 5 of the DPA applies notwithstanding a less protective default." },
  { state: "Delaware", law: "Delaware Personal Data Privacy Act", citation: "6 Del. C. Ch. 12D", effective: "January 1, 2025" },
  { state: "Florida", law: "Florida Digital Bill of Rights", citation: "Fla. Stat. § 501.701 et seq.", effective: "July 1, 2024", narrowCoverage: true },
  { state: "Indiana", law: "Indiana Consumer Data Protection Act", citation: "Ind. Code § 24-15-1-1 et seq.", effective: "January 1, 2026" },
  { state: "Iowa", law: "Iowa Consumer Data Protection Act", citation: "Iowa Code Ch. 715D", effective: "January 1, 2025" },
  { state: "Minnesota", law: "Minnesota Consumer Data Privacy Act", citation: "Minn. Stat. § 325O", effective: "July 31, 2025",
    supplement: "The Processor shall provide reasonable assistance concerning profiling-related transparency and review information to the extent the Processor performs such Processing on the Controller's behalf and the Minnesota Consumer Data Privacy Act requires it." },
  { state: "Montana", law: "Montana Consumer Data Privacy Act", citation: "Mont. Code Ann. § 30-14-2801 et seq.", effective: "October 1, 2024" },
  { state: "Oregon", law: "Oregon Consumer Privacy Act", citation: "Or. Rev. Stat. §§ 646A.570–646A.589", effective: "July 1, 2024",
    supplement: "The Processor shall provide the information and assessment cooperation the Oregon Consumer Privacy Act requires of processors, including reasonable information needed for the Controller to respond to Oregon consumer requests and disclosure-related obligations to the extent that information is available to the Processor. Oregon universal opt-out requirements are supported where the Processor operates the relevant interface." },
  { state: "Tennessee", law: "Tennessee Information Protection Act", citation: "Tenn. Code Ann. § 47-18-3201 et seq.", effective: "July 1, 2025" },
  { state: "Texas", law: "Texas Data Privacy and Security Act", citation: "Tex. Bus. & Com. Code Ch. 541", effective: "July 1, 2024",
    supplement: "The Processor shall satisfy the duties the Texas Data Privacy and Security Act imposes on processors, and the assistance and assessment provisions of this Addendum shall be read accordingly." },
  { state: "Utah", law: "Utah Consumer Privacy Act", citation: "Utah Code § 13-61-101 et seq.", effective: "December 31, 2023" },
  { state: "Virginia", law: "Virginia Consumer Data Protection Act", citation: "Va. Code Ann. §§ 59.1-575 to 59.1-585", effective: "January 1, 2023",
    supplement: "The Processor shall provide the information and assessment cooperation the Virginia Consumer Data Protection Act requires of processors. Where that law requires an opportunity to object to a new Sub-processor, the objection right in Section 5 of the DPA applies notwithstanding a less protective default." },
];

const COVERED_BY_NAME = new Map(DPA_US_COVERED_STATE_LAWS.map((l) => [l.state, l] as const));

export function coveredStateLaw(state: string): CoveredStateLaw | undefined {
  return COVERED_BY_NAME.get(state);
}

// ── Shared clause helpers ──────────────────────────────────────────────────

const TBC = (what: string) => `[TO BE COMPLETED: ${what}]`;

/** Numbered clause list: "N.1 …", "N.2 …" from an array of bodies. */
function numbered(n: number, bodies: readonly string[]): string[] {
  return bodies.filter(Boolean).map((b, i) => `${n}.${i + 1} ${b}`);
}

export interface SupplementOpts {
  /** The number of the first supplementary section. */
  readonly startAt: number;
  /** The record's data categories (intake labels). */
  readonly dataCategories: readonly string[];
  readonly engagement: DpaEngagement;
  /** True when the GDPR-family core precedes (governing law lives in clause 11.3). */
  readonly gdprCore: boolean;
  readonly subprocessorNoticeDays: number;
}

const hasCategory = (cats: readonly string[], re: RegExp) => cats.some((c) => re.test(String(c)));

/**
 * The v2.0 supplementary sections. Numbering is contiguous from `startAt`;
 * clause numbers follow their section. Returned in document order.
 */
export function supplementarySections(opts: SupplementOpts): DpaClauseSection[] {
  const cats = opts.dataCategories;
  const childrens = hasCategory(cats, /children|minor|under 18/i);
  const biometric = hasCategory(cats, /biometric/i);
  const genetic = hasCategory(cats, /genetic/i);
  const e = opts.engagement;
  const out: DpaClauseSection[] = [];
  let n = opts.startAt;

  // Applicable Data Protection Law is the v2.0 package's umbrella term; the
  // GDPR-family core cites {frameworkCitation} directly, so the term is
  // defined here at the point the supplementary provisions first use it.
  // The neutral skeleton (us-state) already defines it in clause 2.1.
  out.push({
    heading: `${n}. DATA PROTECTION ASSESSMENTS AND REGULATORY ASSISTANCE`,
    clauses: numbered(n, [
      opts.gdprCore
        ? `In this Section and the Sections that follow, "Applicable Data Protection Law" means the framework cited in this DPA together with every other data protection, privacy, data security and consumer-privacy law and binding regulation that applies to the processing covered by this DPA.`
        : "",
      `(Assessment assistance.) Taking into account the nature of the processing and the information available to the Processor, the Processor shall provide the information reasonably necessary for the Controller to conduct a data protection impact assessment, data protection assessment, risk assessment, transfer assessment or prior consultation required by Applicable Data Protection Law.`,
      `(Regulatory cooperation.) The Processor shall reasonably cooperate with the Controller in responding to a competent supervisory authority or attorney general concerning processing performed by the Processor on the Controller's behalf, subject to legal privilege and applicable confidentiality obligations.`,
    ]),
  });
  n++;

  out.push({
    heading: `${n}. PRIVACY BY DESIGN, DATA MINIMISATION AND DATA QUALITY`,
    clauses: numbered(n, [
      `(Design support.) The Processor shall support the Controller's privacy-by-design and privacy-by-default obligations to the extent required by Applicable Data Protection Law and reasonably related to the Services.`,
      `(Data minimisation.) The Processor shall not intentionally collect or process categories of Personal Data beyond those authorised in Annex B, except on further documented instructions or as required by law.`,
      `(Accuracy and correction.) The Processor shall maintain functionality reasonably necessary to implement the Controller's instructions to correct, update, restrict or delete Personal Data where required by Applicable Data Protection Law and supported by the Services.`,
    ]),
  });
  n++;

  {
    const bodies = [
      `(Sensitive Data.) "Sensitive Data" means Personal Data subject to heightened protection under Applicable Data Protection Law, including special categories of personal data where the GDPR or UK GDPR applies and sensitive data or sensitive personal information where U.S. state law applies. The Processor shall process Sensitive Data only on the Controller's documented instructions and subject to safeguards appropriate to the sensitivity of the data and the requirements of Applicable Data Protection Law.`,
      `(Required authorisation.) The Controller remains responsible for establishing any consent, authorisation or other lawful basis required for the processing it instructs, unless Applicable Data Protection Law independently assigns that obligation to the Processor.`,
      childrens
        ? `(Children and teenagers.) The record identifies Personal Data concerning children or teenagers. Where such data is subject to heightened statutory protection, the Processor shall provide the reasonable assistance necessary for the Controller to implement applicable consent, opt-in, opt-out, deletion or age-related requirements within the Services.`
        : "",
      biometric || genetic
        ? `(${biometric && genetic ? "Biometric and genetic data" : biometric ? "Biometric data" : "Genetic data"}.) The record identifies ${biometric && genetic ? "biometric and genetic data" : biometric ? "biometric data" : "genetic data"}. The Processor shall not create or use ${biometric ? "biometric identifiers or templates" : "genetic data"} for purposes outside the Services, and shall delete such data in accordance with the Controller's documented retention instructions and any shorter period required by applicable ${biometric ? "biometric-privacy" : "data protection"} law.`
        : "",
    ];
    out.push({ heading: `${n}. SENSITIVE DATA AND SPECIAL CATEGORIES`, clauses: numbered(n, bodies) });
    n++;
  }

  out.push({
    heading: `${n}. COMPLIANCE PROGRAMME AND DUE DILIGENCE`,
    clauses: numbered(n, [
      `(Compliance status.) The Processor shall promptly notify the Controller if the Processor determines that it can no longer comply with a material processor obligation applicable to the processing, and shall cooperate in reasonable remediation.`,
      `(Policies and training.) The Processor shall maintain privacy and security policies, workforce controls and training reasonably appropriate to the processing and the risks involved.`,
    ]),
  });
  n++;

  out.push({
    heading: `${n}. TRANSPARENCY AND REGULATORY COMMUNICATIONS`,
    clauses: numbered(n, [
      `(Processing transparency.) The Processor shall provide the Controller the information reasonably necessary for the Controller to describe the processing, recipients, Sub-processors, transfer mechanisms and material security measures in notices or records required by Applicable Data Protection Law.`,
      `(Regulatory communications.) To the extent legally permitted, the Processor shall promptly notify the Controller of a regulatory inquiry that specifically concerns the Processor's processing of the Controller's Personal Data, and shall reasonably coordinate responses that materially affect the Controller.`,
    ]),
  });
  n++;

  out.push({
    heading: `${n}. LIABILITY, INDEMNIFICATION AND REMEDIES`,
    clauses: numbered(n, [
      `(Default allocation.) Except for liability that cannot lawfully be limited or allocated by contract, liability arising from this DPA is subject to the liability limitations, exclusions and remedies in the Principal Agreement. Nothing in this Section limits the rights a data subject has directly under an applicable transfer mechanism or mandatory law.`,
    ]),
  });
  n++;

  out.push({
    heading: `${n}. GENERAL PROVISIONS`,
    clauses: numbered(n, [
      `(Conflict with the Principal Agreement.) With respect to the processing of Personal Data, this DPA prevails over the Principal Agreement to the extent of a direct conflict, except where this DPA expressly incorporates the Principal Agreement's terms.`,
      opts.gdprCore
        ? `(Governing law and disputes.) Governing law and forum are stated in clause 11.3. Where an applicable transfer mechanism requires a different governing law or forum for the transfer it governs, that mechanism prevails to that extent.`
        : `(Governing law and disputes.) Governing law and forum are stated in Section 11. Where an applicable transfer mechanism requires a different governing law or forum for the transfer it governs, that mechanism prevails to that extent.`,
      `(Amendments.) This DPA may be amended only by a written or electronic instrument that is legally binding on both Parties. An approved transfer mechanism may be amended only to the extent the mechanism itself allows.`,
      `(Severability.) If a provision is invalid or unenforceable, it shall be enforced to the maximum lawful extent or severed without invalidating the remainder, provided that an approved transfer mechanism shall not be modified through this clause in a manner the mechanism prohibits.`,
      `(Counterparts and electronic signatures.) This DPA may be executed in counterparts and by legally valid electronic signature.`,
      `(Notices.) Formal notices shall be delivered using the notice method in the Principal Agreement. Operational privacy notices may be delivered to the contacts identified in Annex A or another documented operational channel.`,
      `(Assignment.) Assignment of this DPA follows the assignment provisions of the Principal Agreement, subject to any additional requirement in an applicable transfer mechanism.`,
    ]),
  });
  n++;

  {
    const attached: string[] = [];
    if (e.californiaEngaged) attached.push(`(California Addendum.) The CCPA Service Provider Addendum attached to this DPA applies to California personal information to the extent the CCPA applies to the relevant processing.`);
    if (e.usStatesEngaged.length) attached.push(`(US Multi-State Addendum.) The US Multi-State Privacy Law Addendum attached to this DPA applies to personal data of consumers under the state laws identified in its Schedule 1 (${e.usStatesEngaged.join(", ")}) to the extent each law applies to the relevant processing.`);
    if (e.euSccExhibit) attached.push(`(EU SCC Module 2 Exhibit.) The EU SCC Module 2 Implementation Exhibit attached to this DPA applies where the Parties rely on Commission Implementing Decision (EU) 2021/914, Module Two, for a restricted transfer.`);
    if (e.ukAddendumExhibit) attached.push(`(UK Addendum Exhibit.) The UK International Data Transfer Addendum B1.0 Implementation Exhibit attached to this DPA applies where the Parties use the EU SCCs together with the ICO Approved Addendum for a UK restricted transfer.`);
    const precedence = attached.length
      ? `(Order of precedence.) For a conflict concerning a restricted transfer, the applicable approved transfer mechanism prevails. ${e.californiaEngaged ? "For California-specific requirements, the CCPA Service Provider Addendum prevails. " : ""}${e.usStatesEngaged.length ? "For other covered U.S. state requirements, the US Multi-State Privacy Law Addendum prevails to the extent necessary to satisfy the applicable state law. " : ""}This DPA otherwise prevails over inconsistent data-processing terms in the Principal Agreement.`
      : `No jurisdiction-specific addendum or transfer exhibit is engaged by the record. If the processing later engages California, another U.S. state comprehensive privacy law, or a restricted transfer under the EU SCCs or the UK Addendum, the Parties shall attach the corresponding addendum or exhibit before that processing commences.`;
    out.push({
      heading: `${n}. JURISDICTION-SPECIFIC ADDENDA AND TRANSFER EXHIBITS`,
      clauses: numbered(n, [...attached, precedence]),
    });
    n++;
  }

  out.push({ heading: `${n}. OPTIONAL PROVISIONS`, clauses: optionalProvisionClauses(n, { childrens, biometric, noticeDays: opts.subprocessorNoticeDays }) });
  return out;
}

/**
 * The v2.0 package's negotiable provisions that do not assert a fact about
 * the Processor the record does not carry. The enhanced-security baseline,
 * RTO/RPO and SOC 2 provisions are deliberately NOT ported: each asserts
 * controls, algorithms or certifications the intake never collects (the
 * package's own Annex 2 completion rule forbids inferring them).
 */
export function optionalProvisionClauses(n: number, ctx: { childrens: boolean; biometric: boolean; noticeDays: number }): string[] {
  const days = Math.max(15, ctx.noticeDays || 30);
  const provisions: [string, string][] = [
    ["Instruction-change service level", `The Processor shall acknowledge a material change to the Controller's documented instructions within five (5) business days and identify any material technical, legal, operational or pricing consequence before implementation.`],
    ["Extended confidentiality survival", `Confidentiality obligations relating to Personal Data survive termination for five (5) years, and survive indefinitely for Sensitive Data, trade secrets and information that Applicable Data Protection Law requires to remain confidential for a longer period.`],
    ["Sub-processor due diligence", `The Processor shall conduct reasonable pre-engagement due diligence and at least annual risk-based reassessment of material Sub-processors and, on request, provide the Controller a summary of relevant assurance information, material findings and remediation status.`],
    ["Public Sub-processor list", `The Processor shall maintain a publicly accessible and reasonably current list of Sub-processors and shall provide a documented mechanism for the Controller to receive notice of material changes.`],
    ["Objection resolution", `Where the Controller objects to a Sub-processor within the objection window stated in Section 5 (following the ${days}-day notice) and the Parties cannot resolve the objection in good faith, the Controller may terminate the affected Services on thirty (30) calendar days' written notice without penalty, and prepaid fees allocable to the terminated period shall be refunded on a pro rata basis.`],
    ["Data subject request service level", `The Processor shall forward a request received directly within two (2) business days and shall provide reasonably requested assistance within the deadline stated by the Controller, provided the deadline affords the Processor a commercially reasonable period and allows the Controller to meet the applicable legal response period.`],
    ["24-hour initial breach notification", `The Processor shall provide an initial written notification within twenty-four (24) hours after becoming aware of a Personal Data Breach, even if the investigation is incomplete. The initial notice shall include then-known information concerning the nature of the incident, the affected data and systems, the likely consequences, containment actions and a response contact.`],
    ["72-hour incident report", `If complete information is not available with the initial notice, the Processor shall provide a substantially complete written incident report within seventy-two (72) hours after becoming aware, followed by material updates as additional information becomes available.`],
    ["Incident updates and root cause", `During active response, the Processor shall provide material status updates at least once every twenty-four (24) hours unless the Parties agree otherwise. Within thirty (30) days after material containment and remediation, the Processor shall provide a written root-cause analysis and remediation summary.`],
    ["Public-disclosure coordination", `The Processor shall not make a public statement or voluntary regulatory notification that specifically identifies the Controller in connection with an incident without the Controller's prior written consent, except where the Processor is legally required to do so; legally required disclosures remain subject to any advance-notice obligation permitted by law.`],
    ["No-additional-fee assessment assistance", `Routine assessment assistance within the ordinary scope of the Services shall be provided at no additional charge. Extraordinary assistance requiring material dedicated professional services shall be subject to a mutually agreed statement of work unless the need results from the Processor's material breach of this DPA.`],
    ["Enhanced government-access handling", `Where legally permitted, the Processor shall challenge a government-access request that it reasonably believes is unlawful or disproportionate, seek appropriate protective relief where practicable, disclose only the minimum Personal Data legally required, and maintain an internal record of requests relating to the Controller's Personal Data.`],
    ["30-day return or deletion", `The Processor shall complete return or deletion within thirty (30) calendar days after the applicable instruction or termination date.`],
    ["Backup carve-out", `If Personal Data remains in immutable or cyclic backups that cannot reasonably be deleted immediately, the Processor may retain it for no more than ninety (90) calendar days, shall isolate it from ordinary processing, and shall delete it through the ordinary backup-expiration process.`],
    ["Deletion certification", `Upon the Controller's written request, the Processor shall provide a written certification, signed by an authorised representative, confirming completion of deletion and identifying any legally retained data or backup carve-out that remains subject to this DPA.`],
    ["Audit-report-first", `As the primary compliance-verification mechanism, the Processor may satisfy routine requests by providing a current independent audit report, certification or comparable assurance documentation. The Controller may conduct a direct audit if that documentation is reasonably insufficient, a material incident or documented compliance concern exists, or a competent authority requires a direct audit.`],
    ["Audit notice, frequency and cost", `Except following a material Personal Data Breach, a documented material compliance concern or a regulatory requirement, direct audits shall occur no more than once per calendar year on at least thirty (30) days' prior written notice during normal business hours. The Controller shall bear audit costs unless the audit identifies a material breach by the Processor, in which case the Processor shall bear reasonable documented audit costs.`],
    ["New-feature privacy review", `Before deploying a material new feature that changes the categories of Personal Data, the purposes of processing or the material privacy risks of the Services, the Processor shall conduct an internal privacy review and provide the Controller reasonable advance notice if the change requires amendment of Annex B or a legally required assessment.`],
    ["Sensitive-data segregation", `The Processor shall apply enhanced logical access restrictions and, where technically feasible and proportionate, segregate or separately encrypt Sensitive Data from general Personal Data.`],
    ["DPO or privacy lead", `The Processor shall designate a data protection officer where legally required and otherwise shall designate a qualified privacy lead responsible for oversight of the processing covered by this DPA. Contact details shall be provided to the Controller on request.`],
    ["Annual compliance certification", `On request no more than once per calendar year, the Processor shall provide a written certification by an authorised officer that, to the officer's knowledge after reasonable inquiry, the Processor materially complies with this DPA, or shall identify known material exceptions and remediation plans.`],
    ["Regulatory-notice service level", `The Processor shall provide notice of a material regulatory inquiry concerning the Controller's Personal Data within three (3) business days after receipt, unless law or the regulator prohibits or requires a shorter response.`],
    ["Uncapped Sensitive Data and confidentiality liability", `No contractual limitation of liability shall apply to damages arising from the Processor's intentional misuse of Sensitive Data, material breach of the confidentiality obligations in this DPA, fraud, wilful misconduct, or liability that Applicable Data Protection Law prohibits the Parties from limiting.`],
    ["Regulatory-fines allocation", `Each Party shall be responsible for regulatory fines and penalties to the extent attributable to that Party's violation of Applicable Data Protection Law. If a fine results from both Parties' conduct, responsibility shall be allocated according to their respective contribution to the violation, to the extent such allocation is legally permissible.`],
    ["Privacy indemnification", `The Processor shall defend, indemnify and hold the Controller harmless from third-party claims, losses, reasonable legal fees and regulatory costs to the extent arising from the Processor's material breach of this DPA, the Processor's violation of Applicable Data Protection Law in its role as Processor, or the acts or omissions of a Sub-processor for which the Processor is responsible, subject to customary notice, defence-control and cooperation requirements.`],
    ["Annual DPA review", `The Parties shall review this DPA at least annually and in connection with a material change in the Services or Applicable Data Protection Law, and shall execute the amendments reasonably necessary to maintain compliance.`],
    ["Restriction on unilateral online amendments", `Neither Party may materially reduce the other Party's rights under this DPA solely by posting revised terms online without a legally binding acceptance mechanism, except for updates expressly permitted by an approved transfer mechanism or an agreed Sub-processor-notification procedure.`],
  ];
  const clauses = [
    `${n}.1 The provisions in this Section are negotiable. Each applies only if the Parties retain it in the executed document; a provision the Parties do not retain shall be deleted before execution. ${TBC("retain, revise or delete each optional provision in this Section before execution")}`,
    ...provisions.map(([title, body], i) => `${n}.${i + 2} (Optional provision — ${title}.) ${body}`),
  ];
  return clauses;
}

// ── The jurisdiction-neutral skeleton (us-state mode) ──────────────────────

/**
 * The Section 5 authorisation clause without the Art. 28(2) caption the
 * ratified clause carries (wrong law outside the GDPR family). Same
 * branches, same floored 15-day objection window (DOC-81 D-10).
 */
export function neutralSubprocessorAuthorisationClause(
  model: "general" | "specific",
  noticeDays: number,
  hasSubProcessors: boolean,
  // QA round two (DPA-A-01) — see subprocessorAuthorisationClause in
  // dpa-clause-library.ts. False = the inventory was never collected, so the
  // selected regime is drafted and emptiness is not asserted. Defaults true.
  inventoryCollected = true,
): string {
  if (!hasSubProcessors && inventoryCollected) {
    return `5.1 No Sub-processors are engaged as of the Effective Date. Any future engagement of a Sub-processor requires the Controller's prior specific written authorisation obtained before the engagement commences.`;
  }
  if (model === "specific") {
    return `5.1 (Specific authorisation.) The Processor shall not engage or replace any Sub-processor without the Controller's prior specific written authorisation obtained before the engagement commences. Annex D lists the Sub-processors already so authorised.`;
  }
  const days = Math.max(15, noticeDays);
  return `5.1 (General authorisation.) The Controller grants a general authorisation limited to the Sub-processors listed in Annex D. The Processor shall inform the Controller in writing at least ${days} days before any intended addition or replacement of a Sub-processor, identifying the Sub-processor, the processing location, the nature of the processing and the categories of Personal Data involved, thereby giving the Controller the opportunity to object within [15] days of the notice; the Processor shall not proceed over an unresolved objection.`;
}

/**
 * The v2.0 core as a base skeleton for modes whose framework is not the
 * GDPR. Slot names are the assembler's own ({controllerName},
 * {processorName}, {services}, {frameworkCitation}, {retention},
 * {subprocessorAuthorisationClause}, {transferClause}, {auditRights},
 * {governingLawClause}, {roleRecitalClause}, {tomsSourceSentence}); the
 * headings carry the ten phrases checkDpaCompleteness and the grader's
 * DPA_REQUIRED_SECTIONS contract require.
 */
export function neutralBaseSections(): readonly DpaClauseSection[] {
  return [
    {
      heading: "1. PARTIES AND RECITALS",
      clauses: [
        `1.1 This Data Processing Agreement ("DPA") is entered into between {controllerName}, a [TO BE COMPLETED: jurisdiction of formation] [TO BE COMPLETED: entity type] (the "Controller"), and {processorName}, a [TO BE COMPLETED: jurisdiction of formation] [TO BE COMPLETED: entity type] (the "Processor").`,
        `1.2 The Controller wishes to engage the Processor to provide {services} (the "Services") and, in the course of providing them, the Processor will process Personal Data on the Controller's behalf.`,
        `1.3 This DPA is entered into to satisfy the processor-contract requirements of {frameworkCitation}, and governs all processing of Personal Data the Processor carries out for the Controller in connection with the Services.`,
        `{roleRecitalClause}`,
      ],
    },
    {
      heading: "2. DEFINITIONS",
      clauses: [
        `2.1 "Applicable Data Protection Law" means {frameworkCitation} together with every other data protection, privacy, data security and consumer-privacy law and binding regulation that applies to the processing covered by this DPA.`,
        `2.2 "Controller" means the Party that determines the purposes and means of the relevant processing, including a "business" or equivalent role under applicable U.S. state law; "Processor" means the Party that processes Personal Data on the Controller's behalf and on its documented instructions, including a "service provider" or equivalent role where applicable.`,
        `2.3 "Personal Data" means information that constitutes personal data, personal information or an equivalent regulated category under Applicable Data Protection Law and that the Processor processes on the Controller's behalf; "Sensitive Data" means Personal Data subject to heightened protection under Applicable Data Protection Law; "Consumer" means a natural person entitled to rights under an applicable U.S. state privacy law, and "data subject" includes a Consumer where the context requires.`,
        `2.4 "Processing" means any operation or set of operations performed on Personal Data, including collection, access, storage, use, disclosure, alteration, retrieval, transmission, restriction, deletion or destruction; "Personal Data Breach" means a breach of security resulting in accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to Personal Data, and any broader security-incident concept that Applicable Data Protection Law requires the Processor to report to the Controller.`,
        `2.5 "Sub-processor" means any third party engaged by the Processor to process Personal Data on behalf of the Controller in connection with the Services; "Restricted Transfer" means a transfer of Personal Data that requires an approved transfer mechanism under Applicable Data Protection Law.`,
        `2.6 "DPA" means this Data Processing Agreement and is not used to refer to any data protection authority; supervisory bodies are referred to in full as "supervisory authority" or "attorney general".`,
      ],
    },
    {
      heading: "3. SUBJECT MATTER, NATURE, DURATION AND PURPOSE",
      clauses: [
        `3.1 The subject matter of the processing is the Personal Data the Processor processes in providing the Services, being the categories set out in Annex B (Description of the Processing).`,
        `3.2 The Processor shall process Personal Data solely for the specific business purposes of providing the Services described in Annex B, and for no other purpose. A generic reference to the Principal Agreement does not substitute for the specific description in Annex B.`,
        `3.3 The processing shall continue for the duration of this DPA, and the retention position is: {retention}. Where a retention period runs from an event, the event is [TO BE COMPLETED: the event marking the start of the retention period — to be defined by the Parties by reference to the Principal Agreement].`,
      ],
    },
    {
      heading: "4. DATA PROCESSING — OBLIGATIONS OF THE PROCESSOR",
      clauses: [
        `4.1 (Documented instructions.) The Processor shall process Personal Data only on the Controller's documented instructions, including with respect to transfers, unless applicable law requires otherwise; where legally permitted, the Processor shall inform the Controller before carrying out legally required processing that conflicts with the instructions.`,
        `4.2 (Unlawful instructions.) The Processor shall promptly inform the Controller if, in the Processor's reasonable judgment, an instruction infringes Applicable Data Protection Law, and may suspend the affected instruction while the Parties identify a lawful alternative.`,
        `4.3 (Confidentiality and access.) The Processor shall ensure that persons authorised to process Personal Data are subject to appropriate confidentiality obligations and receive instructions concerning the confidential nature of Personal Data; shall limit access to personnel and Sub-processors who require it to perform the Services; and shall revoke access when it is no longer required.`,
        `4.4 (No sale or independent commercialisation.) The Processor shall not sell Personal Data, share it for cross-context behavioural advertising, or otherwise use it for the Processor's independent commercial purposes except where expressly permitted by Applicable Data Protection Law and documented by the Parties in an applicable addendum.`,
        `4.5 (Records of instructions.) The Processor shall keep records of the Controller's documented instructions for the duration of this DPA and for a period of at least [3] years thereafter, or such longer period as is required by applicable law.`,
      ],
    },
    {
      heading: "5. SUB-PROCESSING",
      clauses: [
        `{subprocessorAuthorisationClause}`,
        `5.2 (Flow-down.) Where the Processor engages a Sub-processor, the Processor shall enter into a written agreement with that Sub-processor imposing data protection obligations appropriate to the delegated processing and no less protective than those required of the Processor under this DPA. Where the Sub-processor fails to fulfil its data protection obligations, the Processor remains fully liable to the Controller for the performance of that Sub-processor's obligations.`,
        `5.3 (Sub-processor records.) The Processor shall keep records of its due diligence on each Sub-processor for the duration of this DPA and for a period of at least [3] years thereafter, or such longer period as is required by applicable law.`,
      ],
    },
    {
      heading: "6. DATA SUBJECT RIGHTS AND CONSUMER RIGHTS",
      clauses: [
        `6.1 (Assistance.) Taking into account the nature of the processing and the information available to the Processor, the Processor shall assist the Controller by appropriate technical and organisational measures, insofar as reasonably possible, to respond to valid data subject and Consumer requests under Applicable Data Protection Law, including requests for access, correction, deletion, restriction, portability, objection, opt-out, appeal-related information and information about automated decisions or profiling, to the extent each right applies and the Processor possesses responsive information or functionality.`,
        `6.2 The Processor shall notify the Controller within five (5) business days of receiving any data subject or Consumer request directly, and shall not respond to such a request except on the Controller's documented instructions or where required by law.`,
        `6.3 (Opt-out preference signals.) To the extent the Processor operates the technical interface that receives a universal opt-out mechanism or other legally recognised preference signal on the Controller's behalf, the Processor shall preserve, communicate or implement the signal in accordance with the Controller's documented instructions and Applicable Data Protection Law.`,
      ],
    },
    {
      heading: "7. SECURITY AND PERSONAL DATA BREACH",
      clauses: [
        `7.1 (Risk-based security.) The Processor shall implement and maintain appropriate technical and organisational measures that provide a level of security appropriate to the risk, taking into account the nature, scope, context and purposes of the processing, the risks to individuals, the state of the art and the cost of implementation, and in particular shall implement and maintain the measures set out in Annex C (Technical and Organisational Measures). The Processor shall not materially reduce the overall level of protection described in Annex C during the term without prior notice to the Controller where Applicable Data Protection Law requires it.`,
        `7.2 (Breach notification.) The Processor shall notify the Controller of a Personal Data Breach affecting Personal Data processed on the Controller's behalf without undue delay after becoming aware of it, and in any event within [48] hours, and shall provide the information reasonably available to the Processor that the Controller needs to satisfy its notification obligations. The notification shall describe the nature of the breach, the categories and approximate number of individuals and records concerned, the likely consequences, and the measures taken or proposed to address the breach and mitigate its possible adverse effects.`,
        `7.3 (Cooperation.) The Processor shall take reasonable steps to contain, investigate, mitigate and remediate a Personal Data Breach and shall cooperate with the Controller's legally required response activities.`,
        `7.4 The operative security baseline is Annex C. {tomsSourceSentence}`,
      ],
    },
    {
      heading: "8. DATA TRANSFERS",
      clauses: [
        `{transferClause}`,
      ],
    },
    {
      heading: "9. RETURN OR DELETION",
      clauses: [
        `9.1 At the choice of the Controller, the Processor shall delete or return all the Personal Data to the Controller after the end of the provision of the Services, and shall delete existing copies unless applicable law requires storage of the Personal Data.`,
        `9.2 Where law requires continued retention, the Processor shall limit processing to the legally required purpose and continue to protect the retained Personal Data under this DPA for as long as it is retained.`,
        `9.3 On request, the Processor shall provide the Controller with written confirmation that deletion has been completed, identifying the data deleted and the date of deletion.`,
      ],
    },
    {
      heading: "10. AUDITS AND DEMONSTRATION OF COMPLIANCE",
      clauses: [
        `10.1 The Processor shall make available to the Controller all information necessary to demonstrate compliance with the processor obligations under Applicable Data Protection Law and this DPA, and shall allow for and contribute to reasonable audits and assessments, including inspections, conducted by the Controller or an independent auditor mandated by the Controller, subject to reasonable security and confidentiality controls. The audit arrangement the Parties have recorded is: {auditRights}.`,
        `10.2 Where Applicable Data Protection Law permits, the Processor may arrange for a qualified independent assessor to conduct an assessment and provide the resulting report to the Controller in lieu of a Controller-led assessment.`,
      ],
    },
    {
      heading: "11. TERM AND TERMINATION",
      clauses: [
        `11.1 This DPA takes effect on the date of its execution and continues for as long as the Processor processes Personal Data for the Controller in connection with the Services.`,
        `11.2 A material breach of this DPA is a material breach of the Principal Agreement to the extent the Principal Agreement permits that treatment. On termination or expiry, the Processor shall cease processing except as necessary to return or delete Personal Data or to comply with law, and Section 9 applies. Confidentiality, security, return or deletion, audit rights relating to the period before termination, liability, and any provision that by its nature must continue survive for as long as necessary to give them effect.`,
        `11.3 Governing law and forum: {governingLawClause}`,
      ],
    },
  ];
}
