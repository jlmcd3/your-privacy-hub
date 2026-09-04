// supabase/functions/generate-dpa/_local/clause-library/dpa-clause-library.ts
//
// S-D1 (doc 80, 2026-08-27) — THE DPA CLAUSE LIBRARY. The Commission's own
// Article 28 SCCs prove the structural pattern this Conversion adopts: FIXED
// operative clauses, safely reusable because they never vary per customer,
// with every case-specific fact confined to slots and annexes. This module
// is the fixed-text half; dpa-assemble.ts fills the slots and builds the
// annexes from the intake.
//
// RATIFICATION STATUS: every clause string below is a CEO-ratification
// artifact, drafted under the 2026-08-27 improvement grant by EXTRACTION
// from the requirements the live prompts already enforce (the 18-section US
// list, the GDPR numbered rules, the S-D3 required-terms registry, the S-D4
// anchors, rules 9/10a and the breach-timing/placeholder disciplines) — not
// invented fresh. The library ships DARK behind DPA_DETERMINISTIC_ENABLED
// (default false; the CEO flips at deploy after redline). The advance-
// ratification-ledger entry for this landing is the whole of this file.
//
// SLOT GRAMMAR: {slotName} — filled by the assembler from the intake;
// [TO BE COMPLETED: …] survives into the document verbatim (the
// PLACEHOLDER-NEUTRALITY law: a placeholder names what to supply, never a
// suggested value). No clause asserts a fact the record does not carry.

export type DpaMode = "gdpr" | "uk" | "us-state" | "canada" | "dual-eu-us" | "dual-eu-ca";

/**
 * DOC-81 D-1 — the modes the deterministic assembler may serve. The GDPR
 * family plus us-state; canada stays on the model path until a citation-native
 * section set is drafted and ratified as its own landing.
 */
export const DPA_DETERMINISTIC_MODES: readonly DpaMode[] = ["gdpr", "uk", "us-state", "dual-eu-us", "dual-eu-ca"];

/**
 * DOC-81 D-2 — the UK GDPR substitutes "domestic law" for the EU text's
 * "Union or Member State law" (Art. 28(3)(a)/(g)). Applied by the assembler
 * to every clause when mode === "uk"; the longer phrase is replaced first.
 */
export function ukDomesticLawVariant(text: string): string {
  return text
    .replace(/Union or Member State data protection provisions/g, "domestic data protection provisions")
    .replace(/Union or Member State law/g, "domestic law");
}

export interface DpaClauseSection {
  /** Matches _shared/grader/format-checks.ts DPA_REQUIRED_SECTIONS order. */
  readonly heading: string;
  readonly clauses: readonly string[];
}

// ── The GDPR base library (Article 28(3)/(4) framework) ────────────────────

const GDPR_SECTIONS: readonly DpaClauseSection[] = [
  {
    heading: "1. PARTIES AND RECITALS",
    clauses: [
      `1.1 This Data Processing Agreement ("DPA") is entered into between {controllerName}, a [TO BE COMPLETED: jurisdiction of formation] [TO BE COMPLETED: entity type] (the "Controller"), and {processorName}, a [TO BE COMPLETED: jurisdiction of formation] [TO BE COMPLETED: entity type] (the "Processor").`,
      `1.2 The Controller wishes to engage the Processor to provide {services} (the "Services") and, in the course of providing them, the Processor will process personal data on the Controller's behalf.`,
      `1.3 This DPA is entered into to satisfy the requirements of Article 28(3) of {frameworkCitation}, and governs all processing of Personal Data the Processor carries out for the Controller in connection with the Services.`,
      `{roleRecitalClause}`,
      `{frameworkBaselineClause}`,
    ],
  },
  {
    heading: "2. DEFINITIONS",
    clauses: [
      `2.1 "Personal Data", "processing", "controller", "processor", "data subject", "personal data breach" and "supervisory authority" have the meanings given to them in {frameworkCitation}.`,
      `2.2 "Sub-processor" means any processor engaged by the Processor to process Personal Data on behalf of the Controller in connection with the Services.`,
      `2.3 "DPA" means this Data Processing Agreement and is not used to refer to any data protection authority; supervisory bodies are referred to in full as "supervisory authority".`,
    ],
  },
  {
    heading: "3. SUBJECT MATTER, NATURE, DURATION AND PURPOSE",
    clauses: [
      `3.1 The subject matter of the processing is the Personal Data the Processor processes in providing the Services, being the categories set out in Annex B (Description of the Processing).`,
      `3.2 The Processor shall process Personal Data solely for the specific business purpose of providing the Services described in Annex B, and for no other purpose.`,
      `3.3 The processing shall continue for the duration of this DPA, and the retention position is: {retention}. Where a retention period runs from an event, the event is [TO BE COMPLETED: the event marking the start of the retention period — to be defined by the Parties by reference to the Principal Agreement].`,
    ],
  },
  {
    heading: "4. DATA PROCESSING — OBLIGATIONS OF THE PROCESSOR",
    clauses: [
      `4.1 (Documented instructions — Art. 28(3)(a).) The Processor shall process Personal Data only on documented instructions from the Controller, including with regard to transfers to a third country or an international organisation, unless required to do so by Union or Member State law to which the Processor is subject; in that case, the Processor shall inform the Controller of that legal requirement before processing, unless that law prohibits such information on important grounds of public interest.`,
      `4.2 (Confidentiality — Art. 28(3)(b).) The Processor shall ensure that persons authorised to process the Personal Data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality.`,
      `4.3 (Security — Art. 28(3)(c).) The Processor shall take all measures required pursuant to Article 32 of {frameworkCitation}, and in particular shall implement and maintain the technical and organisational measures set out in Annex C (Technical and Organisational Measures).`,
      `4.4 (Sub-processing conditions — Art. 28(3)(d).) The Processor shall respect the conditions referred to in Article 28(2) and 28(4) of {frameworkCitation} for engaging a Sub-processor, as set out in Section 5.`,
      `4.5 (Records of instructions.) The Processor shall keep records of the Controller's documented instructions for the duration of this DPA and for a period of at least [3] years thereafter, or such longer period as is required by applicable law.`,
      `4.6 (Instruction infringement notice.) The Processor shall immediately inform the Controller if, in its opinion, an instruction infringes {frameworkCitation} or other Union or Member State data protection provisions.`,
    ],
  },
  {
    heading: "5. SUB-PROCESSING",
    clauses: [
      `{subprocessorAuthorisationClause}`,
      `5.2 (Flow-down — Art. 28(4).) Where the Processor engages a Sub-processor, the Processor shall impose on that Sub-processor, by way of a contract, the same data protection obligations as set out in this DPA, in particular providing sufficient guarantees to implement appropriate technical and organisational measures. Where the Sub-processor fails to fulfil its data protection obligations, the Processor remains fully liable to the Controller for the performance of that Sub-processor's obligations.`,
      `5.3 (Sub-processor records.) The Processor shall keep records of its due diligence on each Sub-processor for the duration of this DPA and for a period of at least [3] years thereafter, or such longer period as is required by applicable law.`,
    ],
  },
  {
    heading: "6. DATA SUBJECT RIGHTS",
    clauses: [
      `6.1 (Assistance — Art. 28(3)(e).) Taking into account the nature of the processing, the Processor shall assist the Controller by appropriate technical and organisational measures, insofar as this is possible, for the fulfilment of the Controller's obligation to respond to requests for exercising the data subject's rights under Chapter III of {frameworkCitation}.`,
      `6.2 The Processor shall notify the Controller within five (5) business days of receiving any data subject request directly, and shall not respond to such a request except on the Controller's documented instructions.`,
    ],
  },
  {
    heading: "7. SECURITY",
    clauses: [
      `7.1 (Assistance with Articles 32 to 36 — Art. 28(3)(f).) Taking into account the nature of the processing and the information available to the Processor, the Processor shall assist the Controller in ensuring compliance with the obligations pursuant to Articles 32 to 36 of {frameworkCitation}.`,
      `7.2 (Breach notification.) The Processor shall notify the Controller of a personal data breach without undue delay after becoming aware of it, and in any event within [48] hours, or within such shorter period as is necessary to enable the Controller to notify the supervisory authority within 72 hours under Article 33(1) of {frameworkCitation} if that period would be insufficient. The notification shall describe the nature of the breach, the categories and approximate number of data subjects and records concerned, the likely consequences, and the measures taken or proposed to be taken by the Processor to address the breach and mitigate its possible adverse effects.`,
      `7.3 The operative security baseline is Annex C. {tomsSourceSentence}`,
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
      `9.1 (Art. 28(3)(g).) At the choice of the Controller, the Processor shall delete or return all the Personal Data to the Controller after the end of the provision of the Services, and shall delete existing copies unless Union or Member State law requires storage of the Personal Data.`,
      `9.2 On request, the Processor shall provide the Controller with written confirmation that deletion has been completed, identifying the data deleted and the date of deletion.`,
    ],
  },
  {
    heading: "10. AUDITS AND DEMONSTRATION OF COMPLIANCE",
    clauses: [
      `10.1 (Art. 28(3)(h).) The Processor shall make available to the Controller all information necessary to demonstrate compliance with the obligations laid down in Article 28 of {frameworkCitation}, and shall allow for and contribute to audits, including inspections, conducted by the Controller or another auditor mandated by the Controller. The audit arrangement the Parties have recorded is: {auditRights}.`,
      // A-TEAM SESSION 1, RULING 2 (2026-08-30, doc 111; modifies doc-81
      // D-5 under the CEO's delegated authority): clause 4.6 is the single
      // operative Art. 28(3) second-subparagraph duty — the Commission's own
      // Art. 28(7) standard clauses place it with the Instructions clause,
      // where a counterparty's lawyer looks for it. 10.2 becomes a
      // cross-reference; its D-5 opening phrase is retained byte-for-byte so
      // the sd1r-doc81-redline pin survives. The review panel's delete-4.6
      // recommendation was REJECTED 7-2 (dissents recorded in doc 111).
      `10.2 With regard to the information and audit rights in this Section 10, the Processor's duty to inform the Controller of instruction infringement is governed by clause 4.6 (Instruction infringement notice), which applies equally to any instruction given in connection with this Section 10.`,
      `{dpoRepresentationClause}`,
    ],
  },
  {
    heading: "11. TERM AND TERMINATION",
    clauses: [
      `11.1 This DPA takes effect on the date of its execution and continues for as long as the Processor processes Personal Data for the Controller in connection with the Services.`,
      `11.2 Sections 7 (Security), 9 (Return or Deletion) and 10 (Audits) survive termination to the extent the Processor retains Personal Data or records under this DPA.`,
      `11.3 Governing law and forum: {governingLawClause}`,
    ],
  },
];

// ── Mode deltas ────────────────────────────────────────────────────────────

// PANEL DPA-P1 (2026-08-30, doc 108 / panel-C memo 2 D4-D5) — jurisdiction
// predicates for the UK/EEA adequacy leg. UK is word-bounded (DOC-81 D-8);
// the EEA list deliberately EXCLUDES the United Kingdom, unlike
// frameworkBaselineClause's combined test, and the split test guards each
// side with !UK so "Northern Ireland" (which contains "ireland") stays UK.
const UK_JUR_RE = /united kingdom|\buk\b|\bengland\b|\bscotland\b|\bwales\b|northern ireland/i;
const EEA_JUR_RE =
  /austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|ireland|italy|latvia|lithuania|luxembourg|malta|netherlands|poland|portugal|romania|slovakia|slovenia|spain|sweden|iceland|liechtenstein|norway/i;

/** True when one Party's engaged jurisdiction is the UK and the other's is
 * in the EEA — the pair for which "no transfer" is legally wrong on the
 * face of the parties block (UK↔EEA disclosures are restricted transfers,
 * lawful today under the mutual adequacy decisions). */
export function ukEeaAdequacySplit(controllerJurisdiction: string, processorJurisdiction: string): boolean {
  const a = String(controllerJurisdiction ?? "");
  const b = String(processorJurisdiction ?? "");
  const ukA = UK_JUR_RE.test(a);
  const ukB = UK_JUR_RE.test(b);
  return (ukA && !ukB && EEA_JUR_RE.test(b)) || (ukB && !ukA && EEA_JUR_RE.test(a));
}

/** True when the pair engages the law of the United Kingdom at all — used
 * to make the GDPR citation dual-regime in "gdpr"-mode instruments whose
 * parties span the UK and the EEA (panel-C D5: an EU-GDPR-only instrument
 * under English governing law never mentioned the UK GDPR). */
export function ukEngaged(controllerJurisdiction: string, processorJurisdiction: string): boolean {
  return UK_JUR_RE.test(String(controllerJurisdiction ?? "")) || UK_JUR_RE.test(String(processorJurisdiction ?? ""));
}

/** The framework citation the clauses reference, per mode.
 * PANEL DPA-P1 (2026-08-30): "gdpr" mode with the UK also engaged renders
 * the dual-regime citation, so every {frameworkCitation} splice covers the
 * UK GDPR as well — the derivation collapses a UK+EEA pair to "gdpr" mode,
 * which previously produced an EU-GDPR-only instrument for UK processing. */
export function frameworkCitationFor(mode: DpaMode, opts?: { readonly ukAlsoEngaged?: boolean }): string {
  if (mode === "gdpr" && opts?.ukAlsoEngaged === true) {
    return "Regulation (EU) 2016/679 (the GDPR) and, where the processing is subject to the law of the United Kingdom, the UK GDPR as defined in section 3(10) of the Data Protection Act 2018 (references to Articles being references to the corresponding Articles of each)";
  }
  switch (mode) {
    case "gdpr": return "Regulation (EU) 2016/679 (the GDPR)";
    case "uk": return "the UK GDPR (Regulation (EU) 2016/679 as it forms part of the law of England and Wales, Scotland and Northern Ireland by virtue of section 3 of the European Union (Withdrawal) Act 2018) and the Data Protection Act 2018";
    case "dual-eu-us": return "Regulation (EU) 2016/679 (the GDPR)";
    case "dual-eu-ca": return "Regulation (EU) 2016/679 (the GDPR)";
    case "us-state": return "the applicable US state privacy laws identified in this DPA";
    case "canada": return "the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial privacy laws";
  }
}

/**
 * US-state additional section: the S-D3 required-terms clauses, drafted as
 * operative text. Rendered when California is among the engaged states (the
 * assembler passes the flag); each clause satisfies the registry item its
 * comment names, and the CI test maps registry -> clause.
 */
export const US_REQUIRED_TERMS_SECTION: DpaClauseSection = {
  heading: "12. PROHIBITED PROCESSING AND CCPA REQUIRED TERMS",
  clauses: [
    // DOC-81 D-7 — role mapping and defined citations for the CCPA terms.
    `12.0 For the purposes of this Section 12, the Controller is a "Business" and the Processor is a "Service Provider" as those terms are defined in Cal. Civ. Code § 1798.140; "the CCPA" means Cal. Civ. Code §§ 1798.100 et seq. (Title 1.81.5, as amended by the CPRA) and "the CCPA regulations" means the regulations at Cal. Code Regs. tit. 11, § 7000 et seq.`,
    // 7051(a)(1) + 100(d)(1)
    `12.1 The Processor is prohibited from selling or sharing Personal Data. The Personal Data is disclosed by the Controller only for the limited and specified purposes set out in Annex B, and the Processor shall not sell and shall not share Personal Data for any purpose.`,
    // 7051(a)(2)-(5)
    `12.2 The Processor shall not retain, use, or disclose Personal Data for any purpose other than the specific business purposes set out in Annex B; shall not use Personal Data for any commercial purpose other than those business purposes except as permitted by the CCPA regulations; and shall not use Personal Data outside the direct business relationship between the Parties, including by combining it with personal information received from another source, except as permitted by the CCPA regulations.`,
    // 100(d)(2) + 7051(a)(6)
    `12.3 The Processor shall comply with all applicable obligations under the CCPA and the CCPA regulations, shall provide the same level of privacy protection as the CCPA requires of the Controller, and shall implement reasonable security procedures and practices appropriate to the nature of the Personal Data.`,
    // 100(d)(3) + 7051(a)(7)
    `12.4 The Controller may take reasonable and appropriate steps to help ensure that the Processor uses Personal Data in a manner consistent with the Controller's obligations, including ongoing manual reviews, automated scans, and regular internal or third-party audits at least once every [12] months.`,
    // 100(d)(4) + 7051(a)(8)
    `12.5 The Processor shall notify the Controller if it makes a determination that it can no longer meet its obligations under the CCPA or the CCPA regulations.`,
    // 100(d)(5) + 7051(a)(9)
    `12.6 Upon notice, including under clause 12.5, the Controller may take reasonable and appropriate steps to stop and remediate unauthorized use of Personal Data, and the Processor shall provide documentation verifying deletion where deletion is required.`,
    // 7051(a)(10)
    `12.7 The Processor shall enable the Controller to comply with consumer requests made pursuant to the CCPA, or shall provide the information necessary for the Controller to comply, and shall notify the Controller within five (5) business days of receiving any consumer request directly.`,
  ],
};

/** Canada mode swaps the Art. 28 skeleton's citations for the PIPEDA frame. */
export const CANADA_ACCOUNTABILITY_CLAUSES: readonly string[] = [
  `4.7 (Accountability — PIPEDA Schedule 1, Principle 1; Quebec Private Sector Act (CQLR c. P-39.1), s. 18.3, as amended by Law 25, where engaged.) The Controller remains accountable for Personal Data transferred to the Processor, and this DPA is the written contract specifying the measures the Processor must take to protect it.`,
];

// ── Slot-dependent clause builders (pure; the assembler calls these) ───────

export function subprocessorAuthorisationClause(model: "general" | "specific", noticeDays: number, hasSubProcessors: boolean): string {
  if (!hasSubProcessors) {
    return `5.1 No Sub-processors are engaged as of the Effective Date. Any future engagement of a Sub-processor requires the Controller's prior specific written authorisation obtained before the engagement commences.`;
  }
  if (model === "specific") {
    return `5.1 (Specific authorisation — Art. 28(2).) The Processor shall not engage or replace any Sub-processor without the Controller's prior specific written authorisation obtained before the engagement commences. Annex D lists the Sub-processors already so authorised.`;
  }
  // DOC-81 D-10 (as amended by the CEO): the notice period is floored at 15
  // days so the objection window can never outrun it; the window itself
  // renders bracketed as a negotiable default.
  const days = Math.max(15, noticeDays);
  return `5.1 (General authorisation — Art. 28(2).) The Controller grants a general authorisation limited to the Sub-processors listed in Annex D. The Processor shall inform the Controller in writing at least ${days} days before any intended addition or replacement of a Sub-processor, thereby giving the Controller the opportunity to object within [15] days of the notice; the Processor shall not proceed over an unresolved objection.`;
}

export function dpoRepresentationClause(mode: DpaMode): string {
  if (mode === "us-state" || mode === "canada") return "";
  const fw = mode === "uk" ? "the UK GDPR" : "the GDPR";
  return `10.3 Each Party represents that it has designated a data protection officer where Article 37 of ${fw} requires one, and that it has appointed a representative under Article 27 of ${fw} where that article requires one.`;
}

export function transferClause(opts: {
  readonly mode: DpaMode;
  readonly includeTransferClause: boolean;
  readonly transferMechanism: string;
  /** PANEL DPA-P1 — engaged jurisdictions, so the no-transfer branch can
   * recognise a UK↔EEA pair instead of asserting "no transfer" against the
   * parties' own geography. Optional so ratified callers outside the
   * assembler are byte-unchanged. */
  readonly controllerJurisdiction?: string;
  readonly processorJurisdiction?: string;
}): string {
  if (!opts.includeTransferClause) {
    // PANEL DPA-P1 (2026-08-30, panel-C memo 2 D4): with a UK party on one
    // side and an EEA party on the other, "no transfer" is legally wrong —
    // the disclosure is a restricted transfer under the UK GDPR (and the
    // return leg engages EU GDPR Chapter V), lawful today under the mutual
    // adequacy decisions. The clause states that basis and the fallback
    // mechanism. All other no-transfer pairs keep the ratified sentence
    // byte-unchanged.
    if (ukEeaAdequacySplit(opts.controllerJurisdiction ?? "", opts.processorJurisdiction ?? "")) {
      return `8.1 The processing takes place in both the United Kingdom and the European Economic Area, so Personal Data passing between the Parties moves between those two regimes. Those transfers take place under the applicable adequacy decisions — the European Commission's adequacy decision for the United Kingdom, and the United Kingdom's adequacy regulations for the EEA — and no onward transfer to any other third country is recorded. If an applicable adequacy decision ceases to apply, the Parties shall put an appropriate transfer mechanism (standard contractual clauses under Article 46, or the UK International Data Transfer Agreement or Addendum) in place before continuing the transfer. The Processor shall not otherwise transfer Personal Data to a third country or an international organisation without the Controller's prior documented instructions.`;
    }
    return `8.1 The Parties have recorded that the processing involves no transfer of Personal Data across the recorded jurisdictions or onward to a third country. The Processor shall not transfer Personal Data to a third country or an international organisation without the Controller's prior documented instructions, in which case the Parties shall first put an appropriate transfer mechanism in place.`;
  }
  const mech = String(opts.transferMechanism ?? "").trim();
  if (!mech || /none in place yet/i.test(mech)) {
    return `8.1 The processing involves a transfer of Personal Data for which the Parties have recorded that no transfer mechanism is currently in place. The transfer shall not commence until an appropriate safeguard is executed: [TO BE COMPLETED: the transfer mechanism to be put in place before any transfer commences].`;
  }
  return `8.1 Transfers of Personal Data to a third country are made under the following recorded mechanism, executed with each recipient before any transfer to that recipient commences: ${mech}. Annex B identifies the destination and the categories transferred; the Parties shall keep the mechanism's annexes populated and current.`;
}

export function governingLawClause(controllerJurisdiction: string): string {
  const cj = String(controllerJurisdiction ?? "").trim();
  if (!cj) return `[TO BE COMPLETED: governing law — state the jurisdiction whose law will govern this agreement]`;
  if (/^united kingdom$|^uk$|^england/i.test(cj)) {
    return `this DPA is governed by the laws of England and Wales, and the courts of England and Wales have exclusive jurisdiction.`;
  }
  // DOC-81 D-4 — placeholder-neutrality: no suggested state, no advisory
  // parenthetical inside operative text; the regex is anchored so "federal"
  // cannot match mid-string.
  if (/^(united states( of america)?|usa?)$|^federal$/i.test(cj)) {
    return `this DPA is governed by the laws of [TO BE COMPLETED: the U.S. state whose law will govern], without regard to its conflict-of-laws principles, and the courts of that state (or federal courts sitting there) have exclusive jurisdiction.`;
  }
  return `this DPA is governed by the law of ${cj}, and the courts of ${cj} have exclusive jurisdiction.`;
}

export function roleRecitalClause(services: string, processorName: string): string {
  const s = String(services ?? "");
  const risky = /(adtech|programmatic|data broker|enrichment|model training|machine learning|social media platform)/i.test(s);
  if (!risky) return "";
  return `1.4 The Parties acknowledge that the role characterisation of ${processorName} as a processor under GDPR Article 28 has been assumed for the purposes of this DPA on the basis that ${processorName} processes Personal Data only on the Controller's documented instructions for the Services described herein; the Parties will review this characterisation if the Services change.`;
}

export function frameworkBaselineClause(mode: DpaMode, controllerJurisdiction: string, processorJurisdiction: string): string {
  if (mode !== "gdpr" && mode !== "dual-eu-us" && mode !== "dual-eu-ca") return "";
  // DOC-81 D-8 — "uk" is word-bounded so "Ukraine" cannot match it.
  const eea = /austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|ireland|italy|latvia|lithuania|luxembourg|malta|netherlands|poland|portugal|romania|slovakia|slovenia|spain|sweden|iceland|liechtenstein|norway|united kingdom|\buk\b/i;
  if (eea.test(controllerJurisdiction) || eea.test(processorJurisdiction)) return "";
  return `1.5 Although neither Party is currently established in the EEA or the UK and the EU GDPR does not, on its face, engage, this DPA adopts the GDPR Article 28(3) framework as its contractual baseline standard; its GDPR-derived provisions apply as contractual obligations between the Parties, and additionally as statutory obligations if and to the extent the processing comes within the scope of the EU GDPR or UK GDPR (including under Article 3(2)).`;
}

/** The GDPR-family base sections (uk/dual modes share the skeleton). */
export function baseSections(): readonly DpaClauseSection[] {
  return GDPR_SECTIONS;
}
