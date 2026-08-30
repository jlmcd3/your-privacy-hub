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
import { renderTomsBlock, resolveTomsSelection } from "../registry/dpa-toms-taxonomy.ts";

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
}

export const DPA_ASSEMBLER_STAMP = "dpa-assembler@s-d1-2026-08-27";

const s = (v: unknown): string => String(v ?? "").trim();

function fillSlots(text: string, slots: Record<string, string>): string {
  return text.replace(/\{([a-zA-Z]+)\}/g, (_m, k: string) =>
    Object.prototype.hasOwnProperty.call(slots, k) ? slots[k] : `{${k}}`);
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
    return [
      "ANNEX C — TECHNICAL AND ORGANISATIONAL MEASURES",
      "[TO BE COMPLETED: the technical and organisational measures the Processor applies — the Parties must populate this annex before the processing commences; a bare restatement of the statutory standard does not satisfy Article 28(3)(c)]",
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
  return [
    head,
    ...list.split(/[\n;]+/).map((x) => x.trim()).filter(Boolean).map((x) =>
      `- ${x} / [TO BE COMPLETED: service] / [TO BE COMPLETED: country/region where processing occurs] / [TO BE COMPLETED: date authorised]`
    ),
  ].join("\n");
}

export function assembleDpaDocument(input: DpaAssembleInput): DpaAssembledDocument {
  const mode = input.documentType;
  const slots: Record<string, string> = {
    controllerName: s(input.controllerName) || "[TO BE COMPLETED: controller name]",
    processorName: s(input.processorName) || "[TO BE COMPLETED: processor name]",
    services: s(input.services) || "[TO BE COMPLETED: description of the services]",
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
    subprocessorAuthorisationClause: subprocessorAuthorisationClause(
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
    roleRecitalClause: roleRecitalClause(input.services, s(input.processorName)),
    frameworkBaselineClause: frameworkBaselineClause(mode, input.controllerJurisdiction, input.processorJurisdiction),
    tomsSourceSentence: resolveTomsSelection(input.securityMeasuresSelected).length > 0 || s(input.securityMeasuresDetails)
      ? "Annex C carries the measures the Controller has recorded, in the Controller's own terms."
      : "Annex C is a framework the Parties must populate before the processing commences.",
  };

  const sections: { heading: string; body: string }[] = [];
  for (const sec of baseSections()) {
    const body = sec.clauses
      .map((c) => fillSlots(c, slots))
      // DOC-81 D-2 — UK GDPR's own wording: "domestic law", not the EU
      // text's "Union or Member State law".
      .map((c) => (mode === "uk" ? ukDomesticLawVariant(c) : c))
      .map((c) => c.trim())
      .filter(Boolean)
      .join("\n");
    let augmented = body;
    if (mode === "canada" && sec.heading.startsWith("4.")) {
      augmented = [body, ...CANADA_ACCOUNTABILITY_CLAUSES].join("\n");
    }
    sections.push({ heading: sec.heading, body: augmented });
  }

  if ((mode === "us-state" || mode === "dual-eu-us") && input.californiaEngaged) {
    sections.push({
      heading: US_REQUIRED_TERMS_SECTION.heading,
      body: US_REQUIRED_TERMS_SECTION.clauses.join("\n"),
    });
  }

  const annexes = [annexA(input), annexB(input), annexC(input), annexD(input)].join("\n\n");
  const document_text = [
    ...sections.map((x) => `${x.heading}\n${x.body}`),
    // DOC-81 A-1 — a plain heading, not a bracketed internal token: nothing
    // downstream consumes such a marker, so it would print verbatim.
    "EXECUTION\nIN WITNESS WHEREOF, the Parties have executed this DPA by their duly authorised representatives.\nController: ______________________  Date: ________\nProcessor: ______________________  Date: ________",
    annexes,
  ].join("\n\n");

  return { document_text, sections, mode, assembler: DPA_ASSEMBLER_STAMP };
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
