// supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts
//
// S-D1 (doc 80, 2026-08-27) — THE DETERMINISTIC DPA ASSEMBLER. Pure
// function of the intake: fixed clauses from dpa-clause-library.ts, every
// case-specific fact confined to slots and annexes (the Commission Art. 28
// SCC pattern), zero model calls, byte-deterministic. Ships DARK behind
// DPA_DETERMINISTIC_ENABLED (default false; CEO flips at deploy after the
// clause-library redline).
//
// COMPLETENESS LAW: the assembled document is CI-checked against
// (a) the grader's DPA_REQUIRED_SECTIONS contract, and (b) for
// engaged-California records, every S-D3 required term — the checklist and
// the clause library share single sources, so drift fails the battery.

import {
  baseSections,
  CANADA_ACCOUNTABILITY_CLAUSES,
  type DpaMode,
  dpoRepresentationClause,
  frameworkBaselineClause,
  frameworkCitationFor,
  governingLawClause,
  roleRecitalClause,
  subprocessorAuthorisationClause,
  transferClause,
  ukDomesticLawVariant,
  ukEeaAdequacySplit,
  ukEngaged,
  US_REQUIRED_TERMS_SECTION,
} from "./dpa-clause-library.ts";
import { DPA_TOMS_TAXONOMY, renderTomsBlock, resolveTomsSelection } from "../registry/dpa-toms-taxonomy.ts";
// DOC 182 (2026-09-04) — the Canonical DPA Package v2.0 port: independent
// geography flags, the v2.0 supplementary sections after the ratified core,
// the jurisdiction-neutral skeleton for us-state mode, and the four addenda/
// exhibits attached per engaged geography. The ratified core bytes above
// this line are untouched.
import {
  coveredStateLaw,
  deriveDpaEngagement,
  type DpaEngagement,
  neutralBaseSections,
  neutralSubprocessorAuthorisationClause,
  supplementarySections,
} from "./dpa-v2-supplement.ts";
import { addendumText, buildAddenda, type DpaAddendum } from "./dpa-addenda.ts";

export interface DpaAssembleInput {
  readonly documentType: DpaMode;
  readonly controllerName: string;
  readonly controllerJurisdiction: string;
  readonly processorName: string;
  readonly processorJurisdiction: string;
  readonly services: string;
  readonly dataCategories: readonly string[];
  readonly retention: string;
  readonly hasSubProcessors: boolean;
  readonly subProcessorList: string;
  readonly subprocessorAuthorizationModel: "general" | "specific";
  readonly subprocessorNoticeDays: number;
  readonly auditRights: string;
  readonly includeTransferClause: boolean;
  readonly transferMechanism: string;
  readonly securityMeasuresSelected: readonly string[];
  readonly securityMeasuresDetails: string;
  /** Engaged-California signal (the caller derives it from jurisdictions). */
  readonly californiaEngaged: boolean;
}

export interface DpaAssembledDocument {
  readonly document_text: string;
  readonly sections: readonly { heading: string; body: string }[];
  readonly mode: DpaMode;
  readonly assembler: string;
  /** doc 113 Part I (RULING 9.2) — additive contract-mode structure, computed
   * alongside `sections`/`document_text` from the same intermediate values.
   * Neither `document_text` nor `sections[].body` changes when this is added. */
  readonly contract: DpaContractStructured;
}

/** doc 113 Part I — typed surfaces for the contract-mode PDF renderer. */
export interface DpaContractSection {
  readonly heading: string;
  readonly clauses: readonly string[];
}
export interface DpaContractParty {
  readonly label: string;
  readonly name: string;
}
export interface DpaContractExecution {
  readonly statement: string;
  readonly parties: readonly DpaContractParty[];
}
export interface DpaContractAnnex {
  readonly title: string;
  readonly rows: readonly (readonly string[])[];
  readonly note?: string;
}
export interface DpaContractStructured {
  readonly sections: readonly DpaContractSection[];
  readonly execution: DpaContractExecution;
  readonly annexA: DpaContractAnnex;
  readonly annexB: DpaContractAnnex;
  readonly annexC: DpaContractAnnex;
  readonly annexD: DpaContractAnnex;
  /** DOC 182 — the jurisdiction-specific addenda and transfer exhibits the record engages, in package order. */
  readonly addenda: readonly DpaAddendum[];
  /** DOC 182 — the independent geography flags the addenda were attached on. */
  readonly engagement: DpaEngagement;
}

export const DPA_ASSEMBLER_STAMP = "dpa-assembler@s-d1-2026-08-27+v2-2026-09-04";

const s = (v: unknown): string => String(v ?? "").trim();

// DOC 129 DPA (Batch 3 A-Team ruling, 2026-09-01) — inline slot values are
// sanitised at substitution: an intake value ending in a sentence stop
// produced broken clause punctuation ('…employees. (the "Services") and…'),
// and padded values produced doubled spaces around the slot. A trailing
// stop is stripped only where the clause CONTINUES after the slot (the next
// character is not end-of-text), so a slot that legitimately ends a
// sentence keeps its stop.
export function fillSlots(text: string, slots: Record<string, string>): string {
  // The following character is observed via lookahead (never consumed), so
  // adjacent slots substitute independently.
  const filled = text.replace(/\{([a-zA-Z]+)\}(?=([\s\S]?))/g, (_m, k: string, next: string) => {
    if (!Object.prototype.hasOwnProperty.call(slots, k)) return `{${k}}`;
    let v = String(slots[k] ?? "").trim();
    // Never strip the stop of a trailing abbreviation (Inc., Ltd., e.g.).
    const abbrevTail = /\b(?:Inc|Ltd|Corp|Co|LLC|GmbH|plc|etc|No|Art|e\.g|i\.e)\.$/i.test(v);
    if (next && v.endsWith(".") && !v.endsWith("..") && !abbrevTail) v = v.slice(0, -1);
    return v;
  });
  return filled.replace(/[^\S\n]{2,}/g, " ");
}

function annexA(input: DpaAssembleInput): string {
  // PANEL DPA-P1 (2026-08-30): the SCC exporter/importer labels are
  // transfer-mechanism vocabulary — they print only where the instrument
  // actually frames a transfer (a recorded transfer, or the UK↔EEA
  // adequacy leg clause 8.1 now states); a pure no-transfer DPA labels the
  // Parties plainly, so Annex A no longer contradicts clause 8.1.
  const transferFraming = input.includeTransferClause ||
    ukEeaAdequacySplit(s(input.controllerJurisdiction), s(input.processorJurisdiction));
  const ctrlLabel = transferFraming ? "Data exporter / Controller" : "Controller";
  const procLabel = transferFraming ? "Data importer / Processor" : "Processor";
  return [
    "ANNEX A — PARTIES",
    `${ctrlLabel}: ${s(input.controllerName)} (${s(input.controllerJurisdiction)}) — contact: [TO BE COMPLETED: controller contact details]`,
    `${procLabel}: ${s(input.processorName)} (${s(input.processorJurisdiction)}) — contact: [TO BE COMPLETED: processor contact details]`,
    "The jurisdiction shown beside each Party is the jurisdiction whose law the record engages, not the Party's jurisdiction of formation.",
  ].join("\n");
}

function annexB(input: DpaAssembleInput): string {
  return [
    "ANNEX B — DESCRIPTION OF THE PROCESSING",
    `Services (the specific business purposes): ${s(input.services)}`,
    `Categories of Personal Data: ${input.dataCategories.length ? input.dataCategories.join(", ") : "[TO BE COMPLETED: categories of personal data]"}`,
    `Categories of data subjects: [TO BE COMPLETED: categories of data subjects]`,
    `Retention: ${s(input.retention) || "[TO BE COMPLETED: retention period or criteria]"}`,
    input.includeTransferClause
      ? `Transfer destination(s): [TO BE COMPLETED: destination country/region]`
      // PANEL DPA-P1: keep Annex B consistent with clause 8.1 for the
      // UK↔EEA adequacy pair; all other no-transfer pairs byte-unchanged.
      : ukEeaAdequacySplit(s(input.controllerJurisdiction), s(input.processorJurisdiction))
      ? `Transfers: between the United Kingdom and the EEA under the applicable adequacy decisions (see clause 8.1); no onward transfer to any other third country recorded.`
      : `Transfers: none recorded across the engaged jurisdictions or onward to a third country.`,
  ].join("\n");
}

function annexC(input: DpaAssembleInput): string {
  const items = resolveTomsSelection(input.securityMeasuresSelected);
  const details = s(input.securityMeasuresDetails);
  if (items.length === 0 && !details) {
    // BATCH 20b (doc 113 S6.4b) — the empty state is a structured fill-in
    // checklist over the ratified TOMS taxonomy, framed as a menu, never a
    // mandate; the populate-before-commencement sentence stays.
    return [
      "ANNEX C — TECHNICAL AND ORGANISATIONAL MEASURES",
      "[TO BE COMPLETED: the technical and organisational measures the Processor applies — the Parties must populate this annex before the processing commences; a bare restatement of the statutory standard does not satisfy Article 28(3)(c)]",
      "The Parties may record the applicable measures against the following framework, marking each as applicable or not applicable:",
      ...DPA_TOMS_TAXONOMY.map((t) => `- ${t.label}: [TO BE COMPLETED: applicable / not applicable — specifics]`),
    ].join("\n");
  }
  const lines = items.map((t) => `- ${t.label}`);
  if (details) lines.push(`- Customer-described specifics: ${details}`);
  return ["ANNEX C — TECHNICAL AND ORGANISATIONAL MEASURES", "The measures the Processor applies, in the Controller's own recorded terms:", ...lines].join("\n");
}

function annexD(input: DpaAssembleInput): string {
  const head = "ANNEX D — SUB-PROCESSORS (Name / Service / Location / Date Authorised)";
  if (!input.hasSubProcessors) {
    return [head, "None engaged as of the Effective Date."].join("\n");
  }
  const list = s(input.subProcessorList);
  if (!list) return [head, "[TO BE COMPLETED: list approved Sub-processors here]"].join("\n");
  // BATCH 20b (doc 113 S6.4a) — an item that itself carries service/location
  // separators (" — ", " / ", or a parenthetical) has those parts placed in
  // the Service / Location positions instead of trapped in the Name cell;
  // items without separators keep today's bytes.
  const TBC_SERVICE = "[TO BE COMPLETED: service]";
  const TBC_LOCATION = "[TO BE COMPLETED: country/region where processing occurs]";
  const TBC_DATE = "[TO BE COMPLETED: date authorised]";
  const row = (item: string): string => {
    let name = item;
    let service = "";
    let location = "";
    const paren = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(item);
    if (paren) {
      name = paren[1].trim();
      const inner = paren[2].split(/\s*[,;]\s*/).map((t) => t.trim()).filter(Boolean);
      service = inner[0] ?? "";
      location = inner[1] ?? "";
    } else {
      const parts = item.split(/\s+—\s+|\s+\/\s+/).map((t) => t.trim()).filter(Boolean);
      if (parts.length >= 2) {
        name = parts[0];
        service = parts[1] ?? "";
        location = parts[2] ?? "";
      }
    }
    return `- ${name} / ${service || TBC_SERVICE} / ${location || TBC_LOCATION} / ${TBC_DATE}`;
  };
  return [
    head,
    ...list.split(/[\n;]+/).map((x) => x.trim()).filter(Boolean).map(row),
  ].join("\n");
}

// doc 113 Part I (RULING 9.2) — structured siblings of annexA–annexD above.
// Deliberately NOT a refactor of those functions: each recomputes the same
// underlying facts (same intake fields, same transfer-framing/party-label
// logic, same sub-processor separator parsing) into typed rows, so the
// byte-frozen flat-text builders that feed `document_text` are never
// touched. `document_text` is read by `checkArt28Coverage`'s token matching
// and the legacy grader payload; a refactor risk to those bytes is not
// worth the small duplication avoided.
function partyLabels(input: DpaAssembleInput): { ctrlLabel: string; procLabel: string } {
  const transferFraming = input.includeTransferClause ||
    ukEeaAdequacySplit(s(input.controllerJurisdiction), s(input.processorJurisdiction));
  return {
    ctrlLabel: transferFraming ? "Data exporter / Controller" : "Controller",
    procLabel: transferFraming ? "Data importer / Processor" : "Processor",
  };
}

function annexAStructured(input: DpaAssembleInput): DpaContractAnnex {
  const { ctrlLabel, procLabel } = partyLabels(input);
  return {
    title: "Annex A — Parties",
    rows: [
      [ctrlLabel, `${s(input.controllerName)} (${s(input.controllerJurisdiction)}) — contact: [TO BE COMPLETED: controller contact details]`],
      [procLabel, `${s(input.processorName)} (${s(input.processorJurisdiction)}) — contact: [TO BE COMPLETED: processor contact details]`],
    ],
    note: "The jurisdiction shown beside each Party is the jurisdiction whose law the record engages, not the Party's jurisdiction of formation.",
  };
}

function annexBStructured(input: DpaAssembleInput): DpaContractAnnex {
  const transfersRow = input.includeTransferClause
    ? "[TO BE COMPLETED: destination country/region]"
    : ukEeaAdequacySplit(s(input.controllerJurisdiction), s(input.processorJurisdiction))
    ? "Between the United Kingdom and the EEA under the applicable adequacy decisions (see clause 8.1); no onward transfer to any other third country recorded."
    : "None recorded across the engaged jurisdictions or onward to a third country.";
  return {
    title: "Annex B — Description of the Processing",
    rows: [
      ["Services (the specific business purposes)", s(input.services)],
      ["Categories of Personal Data", input.dataCategories.length ? input.dataCategories.join(", ") : "[TO BE COMPLETED: categories of personal data]"],
      ["Categories of data subjects", "[TO BE COMPLETED: categories of data subjects]"],
      ["Retention", s(input.retention) || "[TO BE COMPLETED: retention period or criteria]"],
      [input.includeTransferClause ? "Transfer destination(s)" : "Transfers", transfersRow],
    ],
  };
}

function annexCStructured(input: DpaAssembleInput): DpaContractAnnex {
  const title = "Annex C — Technical and Organisational Measures";
  const items = resolveTomsSelection(input.securityMeasuresSelected);
  const details = s(input.securityMeasuresDetails);
  if (items.length === 0 && !details) {
    return {
      title,
      rows: DPA_TOMS_TAXONOMY.map((t) => [t.label, "[TO BE COMPLETED: applicable / not applicable — specifics]"]),
      note: "The Parties must populate this annex before the processing commences; a bare restatement of the statutory standard does not satisfy Article 28(3)(c).",
    };
  }
  const rows: string[][] = items.map((t) => [t.label, "Applicable"]);
  if (details) rows.push(["Customer-described specifics", details]);
  return { title, rows };
}

function annexDStructured(input: DpaAssembleInput): DpaContractAnnex {
  const title = "Annex D — Sub-processors";
  if (!input.hasSubProcessors) {
    return { title, rows: [["None engaged as of the Effective Date.", "", "", ""]] };
  }
  const list = s(input.subProcessorList);
  if (!list) return { title, rows: [["[TO BE COMPLETED: list approved Sub-processors here]", "", "", ""]] };
  const TBC_SERVICE = "[TO BE COMPLETED: service]";
  const TBC_LOCATION = "[TO BE COMPLETED: country/region where processing occurs]";
  const TBC_DATE = "[TO BE COMPLETED: date authorised]";
  const row = (item: string): string[] => {
    let name = item;
    let service = "";
    let location = "";
    const paren = /^(.+?)\s*\(([^)]+)\)\s*$/.exec(item);
    if (paren) {
      name = paren[1].trim();
      const inner = paren[2].split(/\s*[,;]\s*/).map((t) => t.trim()).filter(Boolean);
      service = inner[0] ?? "";
      location = inner[1] ?? "";
    } else {
      const parts = item.split(/\s+—\s+|\s+\/\s+/).map((t) => t.trim()).filter(Boolean);
      if (parts.length >= 2) {
        name = parts[0];
        service = parts[1] ?? "";
        location = parts[2] ?? "";
      }
    }
    return [name, service || TBC_SERVICE, location || TBC_LOCATION, TBC_DATE];
  };
  return {
    title,
    rows: list.split(/[\n;]+/).map((x) => x.trim()).filter(Boolean).map(row),
  };
}

function buildExecution(input: DpaAssembleInput): DpaContractExecution {
  const { ctrlLabel, procLabel } = partyLabels(input);
  return {
    statement: "IN WITNESS WHEREOF, the Parties have executed this DPA by their duly authorised representatives.",
    parties: [
      { label: ctrlLabel, name: s(input.controllerName) || "[TO BE COMPLETED: controller name]" },
      { label: procLabel, name: s(input.processorName) || "[TO BE COMPLETED: processor name]" },
    ],
  };
}

// Batch 4ed05f22 (2026-09-05): clause 1.2 reads "to provide {services} (the
// "Services")", which assumes a noun phrase ("cloud hosting services"). The
// intake field is free text and customers write whole sentences ("Cloudaxis
// provides cloud hosting … on behalf of Velostream."), which shipped as
// "to provide Cloudaxis provides cloud hosting…". A sentence-shaped answer is
// framed as a quoted description; a noun phrase is used as before. The clause
// template itself (ratified, hash-pinned) is untouched — only the slot value.
const SENTENCE_SHAPED_SERVICES =
  /^[A-Z][^.!?]{0,200}?\b(?:provides?|offers?|delivers?|operates?|performs?|supplies|supports?|hosts?|processes|is|are|will|includes?)\b/;
export function servicesSlot(raw: string): string {
  const text = raw.trim();
  if (!text) return "[TO BE COMPLETED: description of the services]";
  const sentenceShaped = /[.!?]\s*$/.test(text) || SENTENCE_SHAPED_SERVICES.test(text);
  if (!sentenceShaped) return text;
  return `the following services: “${text.replace(/[.!?]+\s*$/, "")}”`;
}

export function assembleDpaDocument(input: DpaAssembleInput): DpaAssembledDocument {
  const mode = input.documentType;
  // DOC 182 — every geography carries its own flag; the mode stays the gate.
  const engagement = deriveDpaEngagement({
    documentType: mode,
    controllerJurisdiction: s(input.controllerJurisdiction),
    processorJurisdiction: s(input.processorJurisdiction),
    includeTransferClause: input.includeTransferClause,
    transferMechanism: input.transferMechanism,
    californiaEngaged: input.californiaEngaged,
  });
  const slots: Record<string, string> = {
    controllerName: s(input.controllerName) || "[TO BE COMPLETED: controller name]",
    processorName: s(input.processorName) || "[TO BE COMPLETED: processor name]",
    services: servicesSlot(s(input.services)),
    // BATCH 17 (Wave C2): the {retention} slot precedes a literal period in
    // clause 3.3 — trim a recorded terminal stop so ".." never ships.
    retention: s(input.retention).replace(/\s*\.+\s*$/, "") || "[TO BE COMPLETED: retention period or criteria]",
    auditRights: s(input.auditRights) || "[TO BE COMPLETED: the audit arrangement]",
    // PANEL DPA-P1 (2026-08-30): a "gdpr"-mode instrument whose parties
    // engage the UK (the derivation collapses UK+EEA pairs to "gdpr")
    // carries the dual-regime citation, so the UK GDPR is named wherever
    // the clauses cite the framework.
    frameworkCitation: frameworkCitationFor(mode, {
      ukAlsoEngaged: ukEngaged(s(input.controllerJurisdiction), s(input.processorJurisdiction)),
    }),
    // DOC 182 — the neutral skeleton takes the caption-free 5.1 (the ratified
    // clause's "Art. 28(2)" caption is wrong law outside the GDPR family).
    subprocessorAuthorisationClause: (mode === "us-state" ? neutralSubprocessorAuthorisationClause : subprocessorAuthorisationClause)(
      input.subprocessorAuthorizationModel,
      input.subprocessorNoticeDays,
      input.hasSubProcessors,
    ),
    transferClause: transferClause({
      mode,
      includeTransferClause: input.includeTransferClause,
      transferMechanism: input.transferMechanism,
      controllerJurisdiction: s(input.controllerJurisdiction),
      processorJurisdiction: s(input.processorJurisdiction),
    }),
    governingLawClause: governingLawClause(input.controllerJurisdiction),
    dpoRepresentationClause: dpoRepresentationClause(mode),
    // DOC 182 — the risky-services recital cites GDPR Article 28; the
    // jurisdiction-neutral skeleton (us-state) carries no such recital.
    roleRecitalClause: mode === "us-state" ? "" : roleRecitalClause(input.services, s(input.processorName)),
    frameworkBaselineClause: frameworkBaselineClause(mode, input.controllerJurisdiction, input.processorJurisdiction),
    tomsSourceSentence: resolveTomsSelection(input.securityMeasuresSelected).length > 0 || s(input.securityMeasuresDetails)
      ? "Annex C carries the measures the Controller has recorded, in the Controller's own terms."
      : "Annex C is a framework the Parties must populate before the processing commences.",
  };

  const sections: { heading: string; body: string }[] = [];
  // doc 113 Part I (RULING 9.2) — the contract-mode structure is captured
  // from the SAME clause array before it is joined into `body`, so
  // `document_text`/`sections[].body` below are computed exactly as before.
  const contractSections: DpaContractSection[] = [];
  // DOC 182 — the GDPR family (and canada) keep the ratified Art. 28
  // skeleton byte-for-byte; us-state takes the jurisdiction-neutral v2.0
  // skeleton (the Art. 28 citations are wrong law there).
  const skeleton = mode === "us-state" ? neutralBaseSections() : baseSections();
  for (const sec of skeleton) {
    const clauseLines = sec.clauses
      .map((c) => fillSlots(c, slots))
      // DOC-81 D-2 — UK GDPR's own wording: "domestic law", not the EU
      // text's "Union or Member State law".
      .map((c) => (mode === "uk" ? ukDomesticLawVariant(c) : c))
      .map((c) => c.trim())
      .filter(Boolean);
    const body = clauseLines.join("\n");
    let augmented = body;
    let contractClauses = clauseLines;
    if (mode === "canada" && sec.heading.startsWith("4.")) {
      augmented = [body, ...CANADA_ACCOUNTABILITY_CLAUSES].join("\n");
      contractClauses = [...clauseLines, ...CANADA_ACCOUNTABILITY_CLAUSES];
    }
    sections.push({ heading: sec.heading, body: augmented });
    contractSections.push({ heading: sec.heading, clauses: contractClauses });
  }

  if ((mode === "us-state" || mode === "dual-eu-us") && input.californiaEngaged) {
    sections.push({
      heading: US_REQUIRED_TERMS_SECTION.heading,
      body: US_REQUIRED_TERMS_SECTION.clauses.join("\n"),
    });
    contractSections.push({
      heading: US_REQUIRED_TERMS_SECTION.heading,
      clauses: [...US_REQUIRED_TERMS_SECTION.clauses],
    });
  }

  // DOC 182 — the v2.0 supplementary sections follow the core (and the CCPA
  // terms where present) for every mode except canada (CEO 2026-09-04:
  // Canada mode untouched). Numbering continues from the last section.
  if (mode !== "canada") {
    const startAt = sections.length + 1;
    for (const sec of supplementarySections({
      startAt,
      dataCategories: input.dataCategories,
      engagement,
      gdprCore: mode !== "us-state",
      subprocessorNoticeDays: input.subprocessorNoticeDays,
    })) {
      sections.push({ heading: sec.heading, body: sec.clauses.join("\n") });
      contractSections.push({ heading: sec.heading, clauses: [...sec.clauses] });
    }
  }

  // DOC 182 — addenda and exhibits, attached per engaged geography.
  const annexDRows = annexDStructured(input).rows.filter((r) => !/^(None engaged|\[TO BE COMPLETED)/.test(String(r[0] ?? "")));
  const addenda = mode === "canada" ? [] : buildAddenda({
    controllerName: s(input.controllerName),
    controllerJurisdiction: s(input.controllerJurisdiction),
    processorName: s(input.processorName),
    processorJurisdiction: s(input.processorJurisdiction),
    services: s(input.services),
    dataCategories: input.dataCategories.map((c) => s(c)).filter(Boolean),
    retention: s(input.retention).replace(/\s*\.+\s*$/, ""),
    auditRights: s(input.auditRights),
    hasSubProcessors: input.hasSubProcessors,
    subProcessorRows: annexDRows,
    subprocessorAuthorizationModel: input.subprocessorAuthorizationModel,
    subprocessorNoticeDays: input.subprocessorNoticeDays,
    securityMeasureLabels: resolveTomsSelection(input.securityMeasuresSelected).map((t) => t.label),
    securityMeasuresDetails: s(input.securityMeasuresDetails),
    includeTransferClause: input.includeTransferClause,
    transferMechanism: s(input.transferMechanism),
    engagement,
    coveredLaws: engagement.usStatesEngaged.map((st) => coveredStateLaw(st)).filter((l): l is NonNullable<typeof l> => Boolean(l)),
  });

  const annexes = [annexA(input), annexB(input), annexC(input), annexD(input)].join("\n\n");
  const document_text = [
    ...sections.map((x) => `${x.heading}\n${x.body}`),
    // DOC-81 A-1 — a plain heading, not a bracketed internal token: nothing
    // downstream consumes such a marker, so it would print verbatim.
    "EXECUTION\nIN WITNESS WHEREOF, the Parties have executed this DPA by their duly authorised representatives.\nController: ______________________  Date: ________\nProcessor: ______________________  Date: ________",
    annexes,
    ...addenda.map((a) => addendumText(a, s(input.controllerName), s(input.processorName))),
  ].join("\n\n");

  const contract: DpaContractStructured = {
    sections: contractSections,
    execution: buildExecution(input),
    annexA: annexAStructured(input),
    annexB: annexBStructured(input),
    annexC: annexCStructured(input),
    annexD: annexDStructured(input),
    addenda,
    engagement,
  };

  return { document_text, sections, mode, assembler: DPA_ASSEMBLER_STAMP, contract };
}

/** The deterministic completeness check the battery runs on assembly. */
export function checkDpaCompleteness(doc: DpaAssembledDocument): string[] {
  const problems: string[] = [];
  const REQUIRED = [
    "Parties and Recitals", "Definitions", "Subject Matter", "Data Processing",
    "Sub-processing", "Data Subject Rights", "Security", "Data Transfers",
    "Return or Deletion", "Term and Termination",
  ];
  const headings = doc.sections.map((x) => x.heading.toLowerCase());
  // DOC-81 A-3 — match the full required phrase: first-word needles let a
  // missing "Data Processing" section pass on "Data Transfers".
  for (const r of REQUIRED) {
    const needle = r.toLowerCase();
    if (!headings.some((h) => h.includes(needle))) problems.push(`missing required section: ${r}`);
  }
  if (/\{[a-zA-Z]+\}/.test(doc.document_text)) {
    const leftover = doc.document_text.match(/\{[a-zA-Z]+\}/g) ?? [];
    problems.push(`unfilled slots: ${[...new Set(leftover)].join(", ")}`);
  }
  return problems;
}
