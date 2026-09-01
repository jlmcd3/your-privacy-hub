// PROMPT 8 (CEO-ratified 2026-08-11) — DPIA SPINE v4 TABLE BUILDERS.
//
// The v4 spine's `table` blocks name a typed surface; this module turns that
// surface into the rendered table. LAW:
//   * ZERO model calls, zero invention. Every cell is a value the typed surface
//     already carries, or a pre-authored fixed label from the maps below.
//   * NO PADDING: a table with no rows is returned as null and the renderer
//     omits the block entirely. Where ABSENCE IS A DETERMINATION (processors,
//     transfers) the surface's own determination is rendered as one row — an
//     honest statement, never silence and never an empty grid.
//   * Column headers are fixed prose ratified with the spine.
//
// Determination vocabulary is the pipeline's. Tokens are mapped to reader
// labels through the fixed maps below — a token with no map entry prints as it
// stands rather than being guessed at.

import type { RenderedTable, SkeletonTables } from "../prose/skeleton-render.ts";
import { DPIA_SKELETON_SECTIONS } from "../prose/plans/dpia.spine.ts";

type Bag = Record<string, unknown>;

const DASH = "—";

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const cell = (v: unknown): string => s(v) || DASH;

function asArray(v: unknown): Bag[] {
  if (Array.isArray(v)) return v as Bag[];
  const t = s(v);
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? (parsed as Bag[]) : [];
    } catch { /* fall through */ }
  }
  return [];
}

function asBag(v: unknown): Bag {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Bag;
  const t = s(v);
  if (t.startsWith("{")) {
    try {
      const parsed = JSON.parse(t);
      if (parsed && typeof parsed === "object") return parsed as Bag;
    } catch { /* fall through */ }
  }
  return {};
}

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];

/** Pre-authored reader labels for the pipeline's determination vocabulary. */
export const DPIA_TABLE_LABELS: Record<string, string> = {
  // A-TEAM S3 RULING IV.6 (doc 115, 2026-08-31) — "Analysed on the record"
  // read as process metadata, not a result; the status states the result.
  analysed: "Assessed",
  // A-TEAM S4 RULING S2.10 (doc 119) — fleet status vocabulary.
  record_insufficient: "Additional information required",
  basis_supported_on_the_record: "Basis supported based on the information the company provided",
  undetermined_on_the_record: "Undetermined based on the information the company provided",
  no_transfer_on_the_record: "No cross-border transfer is on the record",
  intra_eea_processing: "Processing remains within the EEA",
  uk_domestic_processing: "Processing remains within the United Kingdom",
  adequacy: "Adequacy decision relied on",
  // PROMPT 9F item 1 (CEO-ruled 2026-08-15).
  instrument_recorded: "A Chapter V instrument is recorded by the company",

  chapter_v_mechanism_required: "A Chapter V transfer mechanism is required",
  approved: "Approved",
  conditionally_approved: "Approved subject to conditions",
  consultation_required: "Prior consultation with the supervisory authority required",
  // A-TEAM S3 RULING IV.2 (doc 115) — final-status register.
  draft_incomplete: "Sign-off not available — required information remains outstanding",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  undetermined: "Undetermined",
};

export const label = (v: unknown): string => {
  const t = s(v);
  if (!t) return DASH;
  return DPIA_TABLE_LABELS[t] ?? t;
};

// BATCH 20b (Wave C4, doc 113 S6.5 — doc 109 SS 1.4 column conventions,
// applied once here so every DPIA table conforms): a column whose every
// cell is the dash is dropped at any row count (it says nothing); a
// non-identity column whose every cell is identical is dropped when the
// table has two or more rows, with the constant stated once in the note.
// A table never drops below two columns and never loses column 0.
function applyColumnConventions(
  columns: readonly string[],
  rows: readonly (readonly string[])[],
  note?: string,
): { columns: readonly string[]; rows: readonly (readonly string[])[]; note?: string } {
  const keep: number[] = [];
  const droppedConstant: number[] = [];
  const droppedDash: number[] = [];
  const constantOf = new Map<number, string>();
  for (let i = 0; i < columns.length; i++) {
    if (i === 0) {
      keep.push(i);
      continue;
    }
    const cells = rows.map((r) => s(r[i]));
    const allDash = cells.length > 0 && cells.every((c) => c === DASH || c === "");
    if (allDash) {
      droppedDash.push(i);
      continue;
    }
    const constant = rows.length >= 2 && cells.every((c) => c === cells[0]);
    if (constant) {
      droppedConstant.push(i);
      constantOf.set(i, cells[0]);
      continue;
    }
    keep.push(i);
  }
  // Never below two columns: restore data-bearing constant columns first
  // (their note entry is withdrawn), all-dash columns only as a last
  // resort.
  const restoreOrder = [...droppedConstant, ...droppedDash];
  while (keep.length < Math.min(2, columns.length) && restoreOrder.length) {
    const i = restoreOrder.shift()!;
    keep.push(i);
    const at = droppedConstant.indexOf(i);
    if (at >= 0) droppedConstant.splice(at, 1);
  }
  keep.sort((a, b) => a - b);
  const constants = droppedConstant.map((i) => `${columns[i]}: ${constantOf.get(i)}`);
  if (keep.length === columns.length) return { columns, rows, note };
  const constNote = constants.length
    ? `${constants.join("; ")} — applies to every row.`
    : "";
  const mergedNote = [note, constNote].filter(Boolean).join(" ");
  return {
    columns: keep.map((i) => columns[i]),
    rows: rows.map((r) => keep.map((i) => r[i] ?? "")),
    ...(mergedNote ? { note: mergedNote } : {}),
  };
}

function table(
  surface: string,
  title: string,
  columns: readonly string[],
  rows: readonly (readonly string[])[],
  note?: string,
): RenderedTable | null {
  if (rows.length === 0) return null;
  const c = applyColumnConventions(columns, rows, note);
  return { key: "", surface, title, columns: c.columns, rows: c.rows, ...(c.note ? { note: c.note } : {}) };
}

/** v4.6.2 — a "What is still needed" column full of dashes read as an
 * unfinished form (CEO output review); an answered column states the
 * determined outcome instead. A-TEAM S3 RULING IV.19 (doc 115, 2026-08-31):
 * the empty-state phrase for a FOLLOW-UP column states the follow-up result
 * ("No follow-up required"), not the ambiguous "None identified".
 *
 * A-TEAM DELTA (ChatGPT Dropbox Batch 1 review, 2026-08-31, DPIA) — that
 * default fired off `information_needed` alone, blind to the row's own
 * `status`/`verdict` cell. A row whose status is still open (e.g.
 * `record_insufficient`, `undetermined_on_the_record`) but whose
 * `information_needed` text happens to be empty printed "No follow-up
 * required" beside an unresolved status — the retention-table and Article 20
 * contradictions the review quotes. "No follow-up required" is now reserved
 * for a status this module knows is actually closed; every other status
 * (including an unmapped/unknown token) gets an honest "not specified"
 * rather than a false all-clear. */
const RESOLVED_ROW_STATUSES = new Set([
  "analysed",
  "approved",
  "conditionally_approved",
  "basis_supported_on_the_record",
  "no_transfer_on_the_record",
  "intra_eea_processing",
  "uk_domestic_processing",
  "adequacy",
  "instrument_recorded",
  "satisfied",
]);
function needed(v: unknown, status?: unknown): string {
  const text = s(v);
  if (text) return text;
  return RESOLVED_ROW_STATUSES.has(s(status))
    ? "No follow-up required"
    : "Not specified in the record";
}

/** v4.6.2 — reader name for a 2-letter main-establishment country code; the
 * raw intake code ("FR") read as unprocessed data. Codes outside the map
 * pass through unchanged. */
const COUNTRY_NAMES: Record<string, string> = {
  AT: "Austria", BE: "Belgium", BG: "Bulgaria", HR: "Croatia", CY: "Cyprus",
  CZ: "Czechia", DK: "Denmark", EE: "Estonia", FI: "Finland", FR: "France",
  DE: "Germany", GR: "Greece", EL: "Greece", HU: "Hungary", IE: "Ireland",
  IT: "Italy", LV: "Latvia", LT: "Lithuania", LU: "Luxembourg", MT: "Malta",
  NL: "Netherlands", PL: "Poland", PT: "Portugal", RO: "Romania",
  SK: "Slovakia", SI: "Slovenia", ES: "Spain", SE: "Sweden",
  GB: "United Kingdom", UK: "United Kingdom", US: "United States",
  CH: "Switzerland", NO: "Norway", IS: "Iceland", LI: "Liechtenstein",
};
function establishmentCell(v: unknown): string {
  const t = s(v);
  if (/^[A-Za-z]{2}$/.test(t)) return COUNTRY_NAMES[t.toUpperCase()] ?? t;
  return t || DASH;
}

/** Two-column particulars table; absent particulars are dropped, not blanked. */
function particulars(
  surface: string,
  title: string,
  pairs: readonly (readonly [string, string])[],
): RenderedTable | null {
  const rows = pairs.filter(([, v]) => !!v).map(([k, v]) => [k, v]);
  return table(surface, title, ["Particular", "As recorded"], rows);
}

// ── Section 0 — overview ────────────────────────────────────────────────────

function controllersTable(inv: Bag): RenderedTable | null {
  const rows = asArray(inv.controllers).map((c) => [
    cell(c.name),
    cell(c.responsible_unit),
    establishmentCell(c.main_establishment_or_representative),
    cell(c.dpo),
    label(c.status),
    needed(c.information_needed, c.status),
  ]);
  return table("processing_inventory.controllers", "Controller", [
    "Controller",
    "Responsible unit",
    "Main establishment or representative",
    "Data protection officer",
    "Status",
    "What is still needed",
  ], rows);
}

function processorsTable(inv: Bag): RenderedTable | null {
  const rows = asArray(inv.processors).map((p) => [
    cell(p.name),
    cell(p.obligations_and_tasks),
    label(p.status),
    needed(p.information_needed, p.status),
  ]);
  // ABSENCE IS A DETERMINATION: the company recorded no processor, and that is
  // an answer rather than a blank.
  if (rows.length === 0) {
    rows.push(["No processor is recorded for this processing.", DASH, label("analysed"), "No follow-up required"]);
  }
  return table("processing_inventory.processors", "Processors", [
    "Processor",
    "Obligations and tasks",
    "Status",
    "What is still needed",
  ], rows);
}

function planningTable(inv: Bag): RenderedTable | null {
  const p = asBag(inv.planning);
  return particulars("processing_inventory.planning", "Planning particulars", [
    ["Planned commencement", s(p.launch_date)],
    ["Review or end date", s(p.end_date)],
    ["Version of the processing", s(p.version)],
    ["Scale, as the company states it", s(asBag(inv.scale).volume_frequency_verbatim)],
  ]);
}

function assessmentParticularsTable(intake: Bag): RenderedTable | null {
  return particulars("assessment_particulars", "Particulars of this assessment", [
    ["Reasons the assessment was undertaken", strList(intake.reasons_to_conduct).join("; ")],
    ["Scope given to this assessment", s(intake.dpia_scope_note)],
    ["Materials relied on", s(intake.reference_materials)],
    ["Publication intent", s(intake.publication_intent)],
  ]);
}

function assessmentTeamTable(report: Bag): RenderedTable | null {
  const team = asBag(asBag(report.section_0_overview).assessment_team);
  const members = asArray(team.members);
  const rows = members.map((m) => [cell(m.name), cell(m.role)]);
  if (rows.length === 0) {
    const text = s(team.text);
    if (!text) return null;
    return table("assessment_team", "Assessment team", ["Assessment team, as recorded"], [[text]]);
  }
  // v4.6.2 — when the intake supplies only free text (every "member" has no
  // role), a Name/Role grid with a dash column read as an unfinished form;
  // render the record in the single-column form instead.
  if (members.every((m) => !s(m.role))) {
    return table("assessment_team", "Assessment team", ["Assessment team, as recorded"], members.map((m) => [cell(m.name)]));
  }
  return table("assessment_team", "Assessment team", ["Name", "Role"], rows);
}

function validationApprovalTable(report: Bag): RenderedTable | null {
  const v = asBag(asBag(report.section_6_conclusion).validation_approval);
  if (Object.keys(v).length === 0) return null;
  // v4.6.2 (CEO output review) — an approval date earlier than the report's
  // own generation date read as a credibility defect when left bare. The
  // date is the company's intake fact; where it precedes the render date,
  // say why that can be so. (Assembly time IS generation time.)
  const approvalIso = /^\d{4}-\d{2}-\d{2}/.exec(s(v.approval_date))?.[0];
  const renderIso = new Date().toISOString().slice(0, 10);
  const dateNote = approvalIso && approvalIso < renderIso
    ? "The approval date records the company's approval of the assessment record; this report was rendered from that record on the generation date shown on the cover."
    : "";
  return particulars("validation_approval", "Validation and approval", [
    ["Attested", v.attested === true ? "Yes" : "Not attested on the record"],
    ["Approved by", s(v.approved_by_name)],
    ["Title", s(v.approved_by_title)],
    ["Date of approval", s(v.approval_date)],
    // A-TEAM S4 RULING S2.12 (doc 119) — the approval's MEANING renders
    // beside it, so "Approved by X" cannot read against Section 6's
    // pending processing decision.
    ["Meaning", s(v.approved_by_name) ? "Approval of the factual assessment record only; the decision on the processing itself is stated in Section 6." : ""],
    ["Note", dateNote],
    ["Basis for sign-off", s(v.basis_for_sign_off)],
    ["What is still needed", s(v.information_needed)],
  ]);
}

// ── Section 1 — description ─────────────────────────────────────────────────

function dataItemsTable(inv: Bag): RenderedTable | null {
  const rows = asArray(inv.data_items).map((d) => [
    cell(d.item),
    d.special_category === true ? "Special category" : "Not a special category",
    cell(d.art9_condition_label),
    label(d.status),
    needed(d.information_needed, d.status),
  ]);
  return table("processing_inventory.data_items", "Categories of personal data", [
    "Data item",
    "Article 9 classification",
    "Article 9(2) condition selected",
    "Status",
    "What is still needed",
  ], rows);
}

/** v4.6.2 — reader label for an operation id; the internal key (op_primary/
 * op_secondary) rendered verbatim in customer output (CEO output review,
 * the DPIA's q5_sell_share equivalent). */
function operationReaderLabel(id: unknown): string {
  const v = s(id);
  if (v === "op_primary") return "Primary purpose";
  if (v === "op_secondary") return "Secondary use";
  return v ? v.replace(/^op_/, "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : DASH;
}

function purposesTable(inv: Bag): RenderedTable | null {
  const rows = asArray(inv.purposes).map((p) => [cell(p.purpose_text), operationReaderLabel(p.operation_id)]);
  return table("processing_inventory.purposes", "Purposes of the processing", [
    "Purpose, as the company states it",
    "Operation",
  ], rows);
}

function secondaryUsesTable(inv: Bag): RenderedTable | null {
  const entries = asArray(inv.secondary_uses);
  const rows = entries.map((u) => [
    cell(u.use_text),
    u.negation === true
      ? "The company has recorded that no further use is made of the data."
      : "Recorded as a further use of the data.",
  ]);
  if (rows.length === 0) return null;
  return table("processing_inventory.secondary_uses", "Further use of the data", [
    "As recorded",
    "How this assessment reads it",
  ], rows);
}

// ── Section 2 — analysis ────────────────────────────────────────────────────

function legalBasisTable(report: Bag): RenderedTable | null {
  const rows = asArray(report.legal_basis).map((b) => [
    cell(b.purpose),
    cell(b.article_6_basis),
    label(b.verdict),
    cell(b.citation),
    needed(b.information_needed, b.verdict),
  ]);
  return table("legal_basis", "Lawful basis under Article 6(1)", [
    "Purpose",
    "Basis relied on",
    "Finding",
    "Authority",
    "What is still needed",
  ], rows);
}

function specialCategoryTable(cov: Bag): RenderedTable | null {
  const rows = asArray(cov.special_category_conditions).map((r) => [
    cell(r.item),
    cell(r.condition_label),
    cell(r.justification),
    // PROMPT 10B(1): the Art. 9(2)(x) pinpoint renders beside the Art. 9(1)
    // anchor, so the iff-cited ToA rule can see it in the body.
    cell([r.citation, r.condition_citation].filter(Boolean).join("; ")),
    label(r.status),
    needed(r.information_needed, r.status),
  ]);
  return table("section2_coverage.special_category_conditions", "Article 9(2) conditions", [
    "Data item",
    "Condition selected",
    "The company's case for it",
    "Authority",
    "Status",
    "What is still needed",
  ], rows);
}

function minimisationRetentionTable(cov: Bag): RenderedTable | null {
  const rows = asArray(cov.data_minimisation_retention).map((r) => [
    cell(r.item),
    cell(r.need_justification),
    cell(r.retention_period),
    cell(r.citation),
    label(r.status),
    needed(r.information_needed, r.status),
  ]);
  return table("section2_coverage.data_minimisation_retention", "Data minimisation and retention", [
    "Data item",
    "Why the company says it is needed",
    "Retention period",
    "Authority",
    "Status",
    "What is still needed",
  ], rows);
}

function coverageTable(surface: string, title: string, rowsIn: Bag[]): RenderedTable | null {
  const rows = rowsIn.map((r) => [
    cell(r.heading),
    cell(r.record_words),
    // PROMPT 10B(2): the credit-first residual note rides with the finding; it
    // is never an ask, so it never occupies the "still needed" column.
    cell([r.finding, r.residual_note].filter(Boolean).join(" ")),
    cell(r.citation),
    label(r.status),
    needed(r.information_needed, r.status),
  ]);
  return table(surface, title, [
    "Matter",
    "The company's own words",
    "What that establishes",
    "Authority",
    "Status",
    "What is still needed",
  ], rows);
}

function measuresTable(surface: string, title: string, rowsIn: Bag[]): RenderedTable | null {
  const rows = rowsIn.map((r) => [
    cell(r.measure),
    cell(r.description),
    cell(r.citation),
    label(r.status),
    needed(r.information_needed, r.status),
  ]);
  return table(surface, title, [
    "Measure",
    "What it is",
    "Authority",
    "Status",
    "What is still needed",
  ], rows);
}

/**
 * `measures_other` carries the two Chapter V / Article 28 determinations the
 * spine's opener announces: each declared transfer flow, and the processor
 * contract row. Both are determinations even when the answer is negative.
 */
function measuresOtherTable(cov: Bag): RenderedTable | null {
  const rows: string[][] = [];
  for (const t of asArray(cov.transfers)) {
    rows.push([
      // v4.6.2 — the no-transfer SENTINEL row has no destination; "Transfer
      // from EU to —" read as an unfinished form. Label the matter for what
      // it determines instead.
      s(t.determination) === "no_transfer_on_the_record"
        ? "Cross-border transfers"
        : `Transfer from ${cell(t.origin_regime)} to ${cell(t.destination)}${s(t.importer) ? ` (${s(t.importer)})` : ""}`,
      // PANEL DPIA-P3 (2026-08-30) — a zero-flows sentinel that carries an
      // ask (a processor marker outside the origin territory left the
      // transfer question open) must not print the flat "No cross-border
      // transfer is on the record" label; its Determination cell states the
      // open point instead. The clean sentinel is byte-unchanged.
      s(t.determination) === "no_transfer_on_the_record" && s(t.status) === "record_insufficient"
        ? label("record_insufficient")
        : label(t.determination),
      cell(t.mechanism_label),
      cell(t.finding),
      cell(t.mechanism_citation) !== DASH ? cell(t.mechanism_citation) : cell(t.citation),
      label(t.status),
      needed(t.information_needed, t.status),
    ]);
  }
  if (rows.length === 0) {
    // emptyIsAnswer: zero declared flows is a determination, not a gap.
    rows.push([
      "Cross-border transfers",
      label("no_transfer_on_the_record"),
      DASH,
      "The company has declared no transfer of the data outside the origin regime, so Chapter V is not engaged based on the information the company provided.",
      DASH,
      label("analysed"),
      "No follow-up required",
    ]);
  }
  const pc = asBag(cov.processor_contract);
  if (Object.keys(pc).length > 0) {
    rows.push([
      "Processor contract under Article 28(3)",
      pc.dpa_recorded === true
        ? "A data processing agreement is recorded"
        : "No data processing agreement is recorded",
      DASH,
      cell(pc.finding),
      cell(pc.citation),
      label(pc.status),
      needed(pc.information_needed, pc.status),
    ]);
  }
  return table("section2_coverage.measures_other", "Transfers and processor arrangements", [
    "Matter",
    "Determination",
    "Mechanism",
    "Finding",
    "Authority",
    "Status",
    "What is still needed",
  ], rows);
}

// ── Sections 3 and 4 — risk ─────────────────────────────────────────────────

/**
 * Legacy registers (spine v3) carry no `risk_class`. Rather than guess, an
 * unclassified row is treated as an incident risk so it still appears once, in
 * Section 4, where the full register is rendered in any event.
 */
function riskClassOf(r: Bag): "design" | "incident" {
  return s(r.risk_class) === "design" ? "design" : "incident";
}

function riskExposureTable(
  surface: string,
  title: string,
  rowsIn: Bag[],
): RenderedTable | null {
  const rows = rowsIn.map((r) => [
    cell(r.risk_label),
    cell(r.source),
    cell(r.affected_rights),
    label(r.severity),
  ]);
  return table(surface, title, [
    "Risk",
    "What raises it, on the assessment record",
    "Rights affected",
    "Severity",
  ], rows);
}

function riskRegisterTable(rowsIn: Bag[]): RenderedTable | null {
  const rows = rowsIn.map((r) => [
    cell(r.risk_label),
    label(r.likelihood),
    label(r.severity),
    label(r.inherent_band),
    strList(r.measures).join("; ") || "No measure is recorded against this risk.",
    label(r.residual_band),
  ]);
  return table("risk_register", "Risk register", [
    "Risk",
    "Likelihood",
    "Severity",
    "Initial risk level",
    "Measures the company has recorded",
    "Remaining risk level",
  ], rows,
    // v4.6.2 (CEO-ordered polish round) — the "preliminary until re-scored"
    // footnote said the DPIA was unfinished; ratings are final as of the
    // assessment date, with change handled by Art. 35(11) review.
    "Remaining risk levels reflect the mitigating measures recorded in the assessment record.");
}

// ── Section 6 — conclusion ──────────────────────────────────────────────────

function decisionTable(report: Bag): RenderedTable | null {
  const d = asBag(report.decision);
  if (Object.keys(d).length === 0) return null;
  return particulars("decision", "Determination", [
    ["Determination", label(d.determination)],
    ["Conditions", strList(d.conditions).join("; ")],
    // PROMPT 9A (R1/R3) — the blockers are already ratified compact labels,
    // merged per R4. One short line each; no terminal stop is added, so no
    // doubled-stop or ". —" sequence can be produced at the seam.
    ["Matters holding sign-off open", strList(d.blockers).join("\n")],
    ["Why", s(d.why)],
    ["Authority", s(d.citation)],
  ]);
}

// A-TEAM S3 RULINGS I.2/IV.11 (doc 115, 2026-08-31) — the ledger's second
// column printed the raw record-field id (dpo_info, transfer_flows, …): an
// internal schema key in customer-facing text, flagged P0. Known ids resolve
// to authored labels; anything unmapped goes through a humanizer so a raw
// snake_case key can never render again.
const GAP_FIELD_LABELS: Record<string, string> = {
  alternatives_considered: "Alternatives considered (necessity record)",
  necessity_proportionality: "Necessity and proportionality record",
  dpo_info: "Data protection officer details",
  processor_obligations: "Processor obligations record (Art. 28)",
  transfer_flows: "Cross-border transfer record (Chapter V)",
  data_quality_measures: "Data-accuracy measures record",
  data_minimisation_justification: "Data-minimisation record",
  data_subject_rights_mechanisms: "Data-subject rights record (Arts. 12–22)",
  processing_description: "Processing description",
  data_categories: "Categories of personal data",
  retention_schedule: "Retention schedule",
  security_measures: "Security measures record",
  special_categories: "Special-category data record (Art. 9)",
  legal_basis: "Legal-basis record (Art. 6)",
  consultation_record: "Consultation record (Art. 35(9))",
};

function humanizeFieldId(id: string): string {
  const t = id.replace(/_/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function gapFieldLabel(id: string): string {
  return GAP_FIELD_LABELS[id] ?? (id.includes("_") ? humanizeFieldId(id) : id);
}

function gapLedgerTable(report: Bag): RenderedTable | null {
  const rows = asArray(report.gap_ledger)
    .filter((g) => s(g.dimensions) && s(g.field))
    .map((g) => [cell(g.dimensions), gapFieldLabel(cell(g.field)), cell(g.provision), cell(g.enables)]);
  return table("gap_ledger", "Matters outstanding on the record", [
    "What is still needed",
    "Where it belongs in the record",
    "Provision it bears on",
    "Determination it completes",
  ], rows);
}

// ── Surface map → keyed tables ──────────────────────────────────────────────

/** Every table surface the v4 spine names, built from the typed surfaces. */
export function buildDpiaTablesBySurface(report: Bag, intake: Bag): Record<string, RenderedTable | null> {
  const inv = asBag(report.processing_inventory);
  const cov = asBag(report.section2_coverage);
  const register = asArray(report.risk_register);

  return {
    "processing_inventory.controllers": controllersTable(inv),
    "processing_inventory.processors": processorsTable(inv),
    "processing_inventory.planning": planningTable(inv),
    "assessment_particulars": assessmentParticularsTable(intake),
    "assessment_team": assessmentTeamTable(report),
    "validation_approval": validationApprovalTable(report),
    "processing_inventory.data_items": dataItemsTable(inv),
    "processing_inventory.purposes": purposesTable(inv),
    "processing_inventory.secondary_uses": secondaryUsesTable(inv),
    "legal_basis": legalBasisTable(report),
    "section2_coverage.special_category_conditions": specialCategoryTable(cov),
    "section2_coverage.data_minimisation_retention": minimisationRetentionTable(cov),
    "section2_coverage.data_quality": coverageTable(
      "section2_coverage.data_quality",
      "Data quality and accuracy",
      asArray(cov.data_quality),
    ),
    "section2_coverage.measures_article5": coverageTable(
      "section2_coverage.measures_article5",
      "Article 5 principles",
      asArray(cov.measures_article5),
    ),
    "section2_coverage.measures_rights": coverageTable(
      "section2_coverage.measures_rights",
      "Rights of data subjects",
      asArray(cov.measures_rights),
    ),
    "section2_coverage.measures_other": measuresOtherTable(cov),
    "section2_coverage.measures_dpbd": measuresTable(
      "section2_coverage.measures_dpbd",
      "Data protection by design and by default",
      asArray(cov.measures_dpbd),
    ),
    "section2_coverage.measures_security": measuresTable(
      "section2_coverage.measures_security",
      "Security of processing",
      asArray(cov.measures_security),
    ),
    "risk_register.design": riskExposureTable(
      "risk_register.design",
      "Risks the processing carries by design",
      register.filter((r) => riskClassOf(r) === "design"),
    ),
    "risk_register.incident": riskExposureTable(
      "risk_register.incident",
      "Risks arising from deviation, malfunction or attack",
      register.filter((r) => riskClassOf(r) === "incident"),
    ),
    "risk_register": riskRegisterTable(register),
    "decision": decisionTable(report),
    "gap_ledger": gapLedgerTable(report),
  };
}

/** Key the built tables by `${sectionId}:${blockIndex}` for the renderer. */
export function buildDpiaSkeletonTables(report: Bag, intake: Bag): SkeletonTables {
  const bySurface = buildDpiaTablesBySurface(report, intake);
  const out: SkeletonTables = {};
  for (const section of DPIA_SKELETON_SECTIONS) {
    section.blocks.forEach((block, i) => {
      if (block.kind !== "table") return;
      out[`${section.id}:${i}`] = bySurface[block.text.trim()] ?? null;
    });
  }
  return out;
}
