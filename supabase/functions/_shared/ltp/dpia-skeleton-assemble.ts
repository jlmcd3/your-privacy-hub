// ITEM SO-5 WIRE-IN — DPIA: ASSEMBLY THROUGH THE BYTE-PINNED SKELETON.
//
// This module assembles the document the CUSTOMER actually receives: the PDF
// renderer and the result page both read `report_data.skeleton_document`,
// which is what this file produces. It is DETERMINISTIC — every
// [DETERMINATION LEAD] and [GENERATED] block is composed from typed surfaces
// the DPIA pipeline already persists (`determination`, `art36_consultation`,
// `necessity_findings`, `proportionality`, `risk_register`,
// `authority_exhibit`, plus the legacy `section_6_conclusion.decision` string
// which is read ONLY as the pre-decision fallback in `decisionText`), and every
// {slot} is filled from
// the live intake per `dpia.slotmap.ts`. No model call, no invented prose, no
// mutation of the typed surfaces.
//
// The Article 36 branch is a CONDITIONAL bound to `art36_consultation`: the
// executive lead states prior consultation only when that typed surface says
// so. Determination outcome logic is NOT touched here — it is read.

import {
  DPIA_SKELETON_SECTIONS,
  DPIA_SKELETON_TITLE,
  DPIA_SKELETON_SUBTITLE,
  DPIA_SKELETON_VERSION,
  DPIA_V3_BANNED_REGISTER,
} from "../prose/plans/dpia.spine.ts";
import { DPIA_LEGAL_BASIS_PHRASE_MAP } from "../prose/plans/dpia.slotmap.ts";
import {
  renderSkeletonDocument,
  skeletonDocumentToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type SlotValues,
} from "../prose/skeleton-render.ts";
import { repairRegister } from "./risk-skeleton-assemble.ts";
import { spliceVerbatim, collapseSeam, humanizeDateISO } from "./verbatim-splice.ts";

export const DPIA_SKELETON_ASSEMBLER_STAMP = "dpia-skeleton-assembler@so5-wire-in-2026-08-10";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.map((x) => (typeof x === "string" ? x.trim() : s((x as Bag)?.label ?? (x as Bag)?.text))).filter(Boolean)
    : s(v) ? [s(v)] : [];

/** Some typed surfaces are persisted as JSON strings; read both shapes. */
function asArray(v: unknown): Bag[] {
  if (Array.isArray(v)) return v as Bag[];
  const t = s(v);
  if (t.startsWith("[")) {
    try {
      const parsed = JSON.parse(t);
      return Array.isArray(parsed) ? parsed as Bag[] : [];
    } catch { /* fall through */ }
  }
  return [];
}

function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/** Drop a trailing period: the skeleton's fixed prose supplies its own. */
const noStop = (t: string): string => t.replace(/\s*\.\s*$/, "");
const stop = (t: string): string => (t ? (/[.!?]$/.test(t) ? t : `${t}.`) : "");

// SO-3 DEFECT CLASS 1 — proper nouns are never case-folded. `lower()` is used
// ONLY on curated enum labels, never on an organisation name, a person's name,
// a sector label or any free-text answer.
function lowerEnumLabel(v: string): string {
  if (!v) return v;
  // Leave acronyms and any label whose second character is upper-case alone.
  if (/^[A-Z]{2,}/.test(v)) return v;
  return v.charAt(0).toLowerCase() + v.slice(1);
}

// SO-3 DEFECT CLASS 2 — abbreviation-aware sentence boundaries. Without this
// guard "GDPR Art. 35(7)" truncates a sentence at "Art.".
const ABBREV_TAIL =
  /(?:\b(?:Art|Arts|Artt|No|Nos|Reg|Recital|Sched|Sec|Secs|Ch|Cl|para|paras|pp|cf|Cal|Civ|Code|Tex|Bus|Com|Ins|Bus\.\s&\sCom|Inc|Ltd|GmbH|AG|Co|Corp|plc|Nr|vs|v|e\.g|i\.e|etc|approx|Dr|Mr|Mrs|Ms|St|U\.S|U\.K)|\s[A-Z])\.$/;

export function firstSentence(text: string): string {
  const t = text.trim();
  const re = /[.!?](?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const end = m.index + 1;
    const head = t.slice(0, end);
    if (ABBREV_TAIL.test(head)) continue;
    if (/^\s+[a-z0-9]/.test(t.slice(end))) continue;
    return head.trim();
  }
  return t;
}

export function firstSentences(text: string, n: number): string {
  let rest = text.trim();
  const out: string[] = [];
  while (rest && out.length < n) {
    const one = firstSentence(rest);
    if (!one) break;
    out.push(one);
    rest = rest.slice(one.length).trim();
  }
  return out.join(" ");
}

/**
 * Quote-aware sentence truncation. Periods inside a double-quoted span
 * (straight " or curly “ ”) are never treated as sentence boundaries.
 * Spans are masked before boundary counting and unmasked after slicing.
 */
const QUOTE_MASK_CHAR = "\u0001";

export function firstSentencesQuoteAware(text: string, n: number): string {
  const src = String(text ?? "");
  const spans: string[] = [];
  let masked = "";
  let open: string | null = null;
  let buf = "";
  for (const ch of src) {
    if (open === null) {
      if (ch === '"' || ch === "\u201C") {
        open = ch === '"' ? '"' : "\u201D";
        buf = ch;
      } else {
        masked += ch;
      }
    } else {
      buf += ch;
      if (ch === open) {
        spans.push(buf);
        masked += QUOTE_MASK_CHAR.repeat(buf.length);
        buf = "";
        open = null;
      }
    }
  }
  if (open !== null) {
    // Unterminated quote — mask the remainder so its periods never split.
    spans.push(buf);
    masked += QUOTE_MASK_CHAR.repeat(buf.length);
  }

  // Masking is length-preserving, so masked indices map 1:1 onto the source.
  let idx = 0;
  while (idx < masked.length && /\s/.test(masked[idx])) idx += 1;
  const start = idx;
  let taken = 0;
  while (idx < masked.length && taken < n) {
    const one = firstSentence(masked.slice(idx));
    if (!one) break;
    idx += one.length;
    taken += 1;
    while (idx < masked.length && /\s/.test(masked[idx])) idx += 1;
  }
  return src.slice(start, idx).trim();
}

// ── Slot values ─────────────────────────────────────────────────────────────

export function buildDpiaSlotValues(intake: Bag): SlotValues {
  const version = s(intake.processing_version);
  const launch = s(intake.estimated_launch_date);
  const art9 = s(intake.article_9_condition);
  const quality = s(intake.data_quality_measures);
  const basis = s(intake.legal_basis_proposed);
  const categories = arr(intake.data_categories).map(lowerEnumLabel);
  const safeguards = arr(intake.existing_safeguards)
    .filter((x) => !/^none$/i.test(x))
    .map(lowerEnumLabel);
  const reasons = arr(intake.reasons_to_conduct).map(lowerEnumLabel);
  const team = s(intake.dpia_team);

  return {
    // Proper nouns — verbatim, never case-folded.
    name: s(intake.processing_activity_name) || "the processing under assessment",
    organizationName: s(intake.organization_name) || "The company",

    // PROMPT 2A(a) — must read grammatically after "…is required because ".
    reasonsToConduct: reasons.length ? `the processing involves ${asProse(reasons)}` : null,
    ...descriptionSlots(noStop(s(intake.description)), version, humanizeDateISO(launch)),

    purpose: noStop(s(intake.purpose)) || null,
    dataSubjects: s(intake.data_subjects) || null,
    dataCategories: categories.length ? asProse(categories) : null,
    volume: noStop(s(intake.volume_frequency)) || null,
    dataFlow: spliceVerbatim(s(intake.functional_description)) || null,

    LEGAL_BASIS_PHRASE: basis
      ? (DPIA_LEGAL_BASIS_PHRASE_MAP[basis] ?? lowerEnumLabel(basis))
      : null,
    ARTICLE_9_SENTENCE: art9
      ? `Because special categories of data are involved, the company relies on ${art9} under Article 9(2)`
      : "",
    necessityProportionality: spliceVerbatim(s(intake.necessity_proportionality)) || null,
    // Spine reads "the company states {slot}" — the colon lives in the value.
    dataMinimisationJustification: s(intake.data_minimisation_justification)
      ? `: ${spliceVerbatim(s(intake.data_minimisation_justification))}`
      : null,
    QUALITY_CLAUSE: quality ? `; on accuracy, ${noStop(quality)}` : "",

    safeguards: safeguards.length ? asProse(safeguards) : null,

    dpiaPreparedBy: s(intake.dpia_prepared_by) || null,
    dpiaTeam: noStop(team) || null,
    DPO_ADVICE_SENTENCE: dpoSentence(intake),
    controllerContact: s(intake.controller_contact) || null,

    dpiaApprovedByName: s(intake.dpia_approved_by_name) || null,
    dpiaScopeNote: noStop(s(intake.dpia_scope_note)) || null,
    endDate: humanizeDateISO(s(intake.estimated_end_date)) || null,
  };
}

/**
 * PROMPT 2A(b) — the spine renders
 *   "The processing under assessment is {description}{VERSION_CLAUSE}{LAUNCH_CLAUSE}."
 * A version/launch clause appended to a MULTI-sentence description modifies the
 * wrong clause. When the description runs to more than one sentence we emit the
 * version/launch material as one separate following sentence instead, carried
 * on LAUNCH_CLAUSE so the spine's own terminal stop closes it.
 */
export function descriptionSlots(
  description: string,
  version: string,
  launchHuman: string,
): { description: string | null; VERSION_CLAUSE: string; LAUNCH_CLAUSE: string } {
  const desc = description.trim();
  if (!desc) {
    return {
      description: null,
      VERSION_CLAUSE: version ? `, version ${version}` : "",
      LAUNCH_CLAUSE: launchHuman ? `, planned to commence ${launchHuman}` : "",
    };
  }
  const multi = firstSentencesQuoteAware(desc, 1).trim() !== desc;
  if (!multi) {
    return {
      description: desc,
      VERSION_CLAUSE: version ? `, version ${version}` : "",
      LAUNCH_CLAUSE: launchHuman ? `, planned to commence ${launchHuman}` : "",
    };
  }
  if (!version && !launchHuman) {
    return { description: noStop(desc), VERSION_CLAUSE: "", LAUNCH_CLAUSE: "" };
  }
  const cover = version
    ? `This assessment covers version ${version} of the processing`
    : "This assessment covers the processing";
  const tail = launchHuman ? `${cover}, planned to commence ${launchHuman}` : cover;
  return {
    description: noStop(desc),
    VERSION_CLAUSE: "",
    LAUNCH_CLAUSE: `. ${tail}`,
  };
}

function dpoSentence(intake: Bag): string {
  const advice = s(intake.dpo_advice);
  const info = s(intake.dpo_info);
  if (advice) return `The company has recorded the advice of its data protection officer as follows: ${noStop(advice)}`;
  if (info) return `The company has recorded its data protection officer as ${noStop(info)}`;
  return "The company has not recorded that the advice of a data protection officer has been obtained";
}

// ── Composed blocks ─────────────────────────────────────────────────────────

function art36Determination(report: Bag): string {
  return s(((report.art36_consultation ?? {}) as Bag).determination).toLowerCase();
}

// PROMPT 3 (2026-08-11) — the decision is read from the deterministic
// `report.decision` surface (buildDecision, rule_id dpia_decision_v1). The
// u5-authored `section_6_conclusion.decision` string is a FALLBACK, used only
// for documents generated before that surface existed.
function decisionSurface(report: Bag): Bag | null {
  const d = report.decision;
  return d && typeof d === "object" && s((d as Bag).determination)
    ? (d as Bag)
    : null;
}

function determination(report: Bag): string {
  return s(decisionSurface(report)?.determination);
}

function decisionText(report: Bag): string {
  const d = decisionSurface(report);
  if (d) return s(d.why);
  const s6 = (report.section_6_conclusion ?? {}) as Bag;
  return s(s6.decision);
}

function residualCounts(report: Bag): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of asArray(report.risk_register)) {
    const band = s(r.residual_band) || s(r.inherent_band);
    if (!band) continue;
    out[band] = (out[band] ?? 0) + 1;
  }
  return out;
}

// VOCABULARY IS THE PIPELINE'S, NOT THIS FILE'S. `art36_consultation.
// determination` is one of `consultation_required` | `consultation_not_required`
// | `undetermined_on_the_record`; risk bands are `low` | `moderate` | `high` |
// `undetermined`; necessity/proportionality verdicts are the
// `*_on_the_record` / `least_intrusive_means_supported` family. These leads
// READ those determinations and may not disagree with them.
function composeExecutiveLead(report: Bag, org: string): string {
  const art36 = art36Determination(report);
  const decision = decisionText(report);
  if (art36 === "consultation_required") {
    return `On the company's answers, the processing requires prior consultation with the supervisory authority under Article 36 before it may proceed.`;
  }
  if (art36 === "undetermined_on_the_record") {
    return `On the company's answers, whether the processing may proceed cannot yet be settled: the residual position on which Article 36 turns is open on the points named below.`;
  }
  const det = determination(report);
  if (det === "draft_incomplete" || (!det && /^DRAFT/i.test(decision))) {
    return `On the company's answers, ${org} may not yet treat the processing as cleared: the assessment remains incomplete on the points named below.`;
  }
  if (det === "conditionally_approved") {
    return `On the company's answers, the processing may proceed conditionally: clearance rides on the measures named below being operated as recorded.`;
  }
  if (det === "approved") {
    return `On the company's answers, the processing may proceed as assessed, subject to the measures identified in this assessment.`;
  }
  return `On the company's answers, the processing may proceed subject to the measures identified in this assessment.`;
}

// SO-FT FIX 1 (2026-08-11): the pipeline emits the same underlying gap more
// than once, phrased differently ("record the national provision" /
// "confirm national provision"), and the executive body rendered each as its
// own numbered point — inflating the "N points left unanswered" count. Merge
// near-duplicates before rendering: keep the most specific phrasing (longest,
// as the fuller phrasing carries the qualifiers) and union the `enables`
// references.
const GAP_STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "for", "and", "or", "in", "on", "at", "by", "with",
  "that", "this", "is", "are", "be", "as", "its", "it", "from", "which", "any",
  "record", "confirm", "provide", "state", "identify", "specify", "supply", "give",
]);

function gapTokens(t: string): Set<string> {
  return new Set(
    t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !GAP_STOPWORDS.has(w)),
  );
}

export function gapOverlap(a: string, b: string): number {
  const A = gapTokens(a), B = gapTokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size);
}

export function mergeOpenGapItems(
  entries: { what: string; enables: string }[],
  threshold = 0.6,
): { what: string; enables: string[] }[] {
  const out: { what: string; enables: string[] }[] = [];
  for (const e of entries) {
    const what = (e.what ?? "").trim();
    if (!what) continue;
    const enables = (e.enables ?? "").trim();
    const hit = out.find((o) => gapOverlap(o.what, what) >= threshold);
    if (hit) {
      // Most specific phrasing wins.
      if (what.length > hit.what.length) hit.what = what;
      if (enables && !hit.enables.some((x) => x.toLowerCase() === enables.toLowerCase())) {
        hit.enables.push(enables);
      }
      continue;
    }
    out.push({ what, enables: enables ? [enables] : [] });
  }
  return out;
}

function composeExecutiveBody(report: Bag): string {
  const bands = residualCounts(report);
  const total = Object.values(bands).reduce((a, b) => a + b, 0);
  const high = bands["high"] ?? 0;
  const openBand = bands["undetermined"] ?? 0;
  const sentences: string[] = [];

  if (total > 0) {
    sentences.push(
      `The assessment carries ${total === 1 ? "one risk" : `${total} risks`} through to a residual position after the measures the company has recorded.`,
    );
    sentences.push(
      high > 0
        ? `${high === 1 ? "One of those risks remains" : `${high} of those risks remain`} at a high residual band on the answers given, and the assessment treats that band as proposed until the company re-scores it against the measures as implemented.`
        : `None of those risks remains at a high residual band on the answers given, and each residual band is proposed until the company re-scores it against the measures as implemented.`,
    );
    if (openBand > 0) {
      sentences.push(
        `${openBand === 1 ? "One residual band is" : `${openBand} residual bands are`} undetermined because the company has not recorded the measures applied, and an undetermined band is not read in the company's favour.`,
      );
    }
  }

  // TRACEABILITY — a count is only stated where the counted items are also
  // rendered in this same document. Each entry is named by the facts it asks
  // for (its `dimensions`, falling back to the intake field key), with the
  // determination it completes where the pipeline recorded one.
  // PROMPT 4 — risk-count reconciliation, stated only when the builder found
  // an explicit, differing count in the company's own residual-risk account.
  const rcn = report.risk_count_note;
  if (rcn && typeof rcn === "object" && s((rcn as Bag).note)) {
    sentences.push(stop(noStop(s((rcn as Bag).note))));
  }

  // PROMPT 4 — the typed gap ledger is the source of open points. The
  // bracket-tag-harvested `information_needed` array is read only for
  // documents generated before the ledger existed.
  const ledger = asArray(report.gap_ledger);
  const gapSource = Array.isArray(report.gap_ledger) ? ledger : asArray(report.information_needed);
  const openItems = mergeOpenGapItems(
    gapSource.map((e) => ({
      what: noStop(s(e.dimensions) || s(e.field)),
      enables: noStop(s(e.enables)),
    })),
  ).map(({ what, enables }) =>
    enables.length > 0
      ? `${what} — which completes ${enables.map((x) => lowerEnumLabel(x)).join(" and ")}`
      : what
  );
  const open = openItems.length;
  if (open > 0) {
    sentences.push(
      `${open === 1 ? "One point is" : `${open} points are`} left unanswered by the company's answers, and each is named here and where it bears on the determination rather than assumed: ${openItems
        .map((t, i) => `(${i + 1}) ${t}`)
        .join("; ")}.`,
    );
  }


  const decision = decisionText(report);
  if (decision) sentences.push(stop(noStop(firstSentence(decision))));

  return repairRegister(sentences.join(" "));
}

const NECESSITY_UNMET = /undetermined_on_the_record|less_intrusive_alternative_available|disproportionate_on_the_record/;

function composeNecessityLead(report: Bag): string {
  const findings = [...asArray(report.necessity_findings), ...asArray(report.proportionality)];
  const unmet = findings.filter((f) => NECESSITY_UNMET.test(s(f.verdict)));
  if (findings.length === 0) {
    return "Whether necessity and proportionality are made out cannot be determined on the company's answers alone; the analysis below sets out what the record does and does not support.";
  }
  return unmet.length === 0
    ? "On the company's answers, necessity and proportionality are made out for the processing as described."
    : `On the company's answers, necessity and proportionality are made out in part: ${unmet.length === 1 ? "one element is" : `${unmet.length} elements are`} not yet supported by the company's answers.`;
}


/** PROMPT 5: defect notice replacing the former raw-u3 fallback. */
export const DPIA_NP_VOID_NOTICE =
  "The necessity and proportionality analysis for this assessment could not be composed from the record's structured surfaces; this document should be regenerated, and this sentence is a defect notice rather than an analysis.";

export function composeNecessityBody(report: Bag): string {
  const parts: string[] = [];
  for (const f of asArray(report.necessity_findings).slice(0, 4)) {
    const why = s(f.why);
    if (why) parts.push(stop(noStop(firstSentencesQuoteAware(why, 2))));
  }
  for (const p of asArray(report.proportionality).slice(0, 3)) {
    const why = s(p.why);
    if (why) parts.push(stop(noStop(firstSentencesQuoteAware(why, 2))));
  }
  if (parts.length === 0) {
    // PROMPT 5 (2026-08-11): no AI-text fallback. buildOperations always yields
    // at least one operation, so empty typed arrays mean the ITEM-310 attach
    // failed outright. Emit a defect notice, never unreviewed model prose.
    console.warn(JSON.stringify({ telemetry: "dpia_skeleton_np_void", necessity_findings: 0, proportionality: 0 }));
    return DPIA_NP_VOID_NOTICE;
  }
  return repairRegister(parts.join(" "));
}

/** The pipeline's band vocabulary, most serious first. */
const BAND_ORDER = ["high", "undetermined", "moderate", "low"];

function topRisk(report: Bag): Bag | null {
  const rows = asArray(report.risk_register);
  if (rows.length === 0) return null;
  const rank = (r: Bag) => {
    const i = BAND_ORDER.indexOf((s(r.residual_band) || s(r.inherent_band)).toLowerCase());
    return i < 0 ? BAND_ORDER.length : i;
  };
  return [...rows].sort((a, b) => rank(a) - rank(b))[0];
}

function composeRiskLead(report: Bag): string {
  const top = topRisk(report);
  if (!top) {
    return "No risk register has been assembled on the company's answers, so no residual position can be stated.";
  }
  const label = noStop(s(top.risk_label)) || "the risk identified below";
  const band = (s(top.residual_band) || s(top.inherent_band)).toLowerCase();
  if (band === "undetermined") {
    return `After the measures the company has recorded, the residual position on ${label} remains undetermined, and that is the most significant open point in this assessment.`;
  }
  return band
    ? `After the measures the company has recorded, the most significant residual risk is ${label}, at a proposed residual band of ${band}.`
    : `After the measures the company has recorded, the most significant residual risk is ${label}.`;
}


export function composeRiskBody(report: Bag, values: SlotValues): string {
  const rows = asArray(report.risk_register);
  const blocks: string[] = [];
  for (const r of rows) {
    const label = noStop(s(r.risk_label));
    if (!label) continue;
    const bits: string[] = [];
    const likelihood = s(r.likelihood);
    const severity = s(r.severity);
    const inherent = s(r.inherent_band);
    const residual = s(r.residual_band);
    const head = [
      `${label}.`,
      likelihood && severity ? `On the safeguards the company has recorded, this assessment places likelihood at ${likelihood}; severity is rated ${severity} under this assessment's pre-set risk taxonomy.` : "",
      inherent ? `Inherent band: ${inherent}.` : "",
    ].filter(Boolean).join(" ");
    bits.push(head);
    const measures = arr(r.measures);
    if (measures.length) {
      bits.push(`The measure that answers it: ${asProse(measures.map(noStop))}.`);
    } else {
      bits.push("The company has recorded no measure against this risk.");
    }
    if (residual) {
      bits.push(
        residual.toLowerCase() === "undetermined"
          ? "Residual band: undetermined, because the measures applied are not on the record."
          : `Residual band, proposed until the company re-scores it: ${residual}.`,
      );
    }

    blocks.push(bits.join(" "));
  }

  const safeguards = values.safeguards;
  const safeguardSentence = safeguards
    ? `The safeguards the company has recorded: ${safeguards}.`
    : "The company has not recorded any safeguards for this processing.";
  blocks.push(safeguardSentence);

  return repairRegister(blocks.filter(Boolean).join("\n\n"));
}

function composeSignoffLead(report: Bag, intake: Bag): string {
  const decision = decisionText(report);
  const det = determination(report);
  const approver = s(intake.dpia_approved_by_name);
  if (det) {
    const head = det === "consultation_required"
      ? "prior consultation with the supervisory authority before the processing begins"
      : det === "draft_incomplete"
      ? "that the assessment is not yet capable of sign-off"
      : det === "conditionally_approved"
      ? "conditional approval, subject to the conditions recorded in this assessment"
      : "approval of the processing as assessed";
    return repairRegister(stop(
      `The sign-off determination recorded is ${head}${
        approver ? `, and ${approver} is recorded against it` : ", and no approver is recorded against it"
      }`,
    ));
  }
  if (!decision) {
    return approver
      ? `No sign-off determination has been recorded, and ${approver} has not yet accepted the residual position.`
      : "No sign-off determination has been recorded, and the assessment carries no approver.";
  }
  const head = noStop(firstSentence(decision));
  return repairRegister(stop(`The sign-off determination recorded is ${head}`));
}

function composeSignoffBody(report: Bag, intake: Bag, values: SlotValues): string {
  const parts: string[] = [];
  const approver = s(intake.dpia_approved_by_name);
  const title = s(intake.dpia_approved_by_title);
  const basis = s(intake.dpia_signoff_basis);
  const bands = residualCounts(report);
  const total = Object.values(bands).reduce((a, b) => a + b, 0);

  if (approver) {
    parts.push(
      `${approver}${title ? `, ${title},` : ""} is recorded as the person accepting the residual position${total ? ` across the ${total === 1 ? "single risk" : `${total} risks`} carried by this assessment` : ""}.`,
    );
  } else {
    parts.push("No approver has been recorded, so the residual position set out above has not yet been accepted by anyone on the company's behalf.");
  }
  if (basis) parts.push(stop(`The basis recorded for that acceptance is as follows: ${spliceVerbatim(basis)}`));
  if (values.dpiaScopeNote) parts.push(stop(`The company has recorded the scope of this assessment as ${values.dpiaScopeNote}`));
  if (values.endDate) parts.push(`The review window the company has recorded runs to ${values.endDate}.`);

  const det = determination(report);
  if (det === "conditionally_approved") {
    const list = Array.isArray((report.decision as Bag)?.conditions)
      ? ((report.decision as Bag).conditions as unknown[]).map((c) => s(c)).filter(Boolean)
      : [];
    if (list.length) {
      parts.push(`Clearance is conditional on ${list.join("; ")}.`);
    }
  }
  if (det === "draft_incomplete") {
    const list = Array.isArray((report.decision as Bag)?.blockers)
      ? ((report.decision as Bag).blockers as unknown[]).map((c) => s(c)).filter(Boolean)
      : [];
    if (list.length) {
      parts.push(`Sign-off is held open by the following: ${list.join(" ")}`);
    }
  }

  const art36 = art36Determination(report);
  if (art36 === "consultation_required" || art36 === "undetermined_on_the_record") {

    const why = s(((report.art36_consultation ?? {}) as Bag).why);
    if (why) parts.push(stop(noStop(firstSentencesQuoteAware(why, 2))));
  }
  return repairRegister(parts.join(" "));
}

// ── Table of Authorities ────────────────────────────────────────────────────

function dpiaToa(report: Bag, body: string): string {
  const exhibit = (report.authority_exhibit ?? {}) as Bag;
  const entries = Array.isArray(exhibit.entries) ? (exhibit.entries as Bag[]) : [];
  const groups: Record<string, string[]> = {
    "Regulations": [],
    "Statutes": [],
    "Guidance and Persuasive Authority": [],
  };
  const seen = new Set<string>();
  for (const e of entries) {
    const citation = s(e.citation);
    if (!citation || seen.has(citation)) continue;
    if (!body.includes(citation)) continue; // iff-cited
    seen.add(citation);
    const cls = s(e.authority_class);
    const group = cls === "regulation" || /GDPR/i.test(citation)
      ? "Regulations"
      : cls === "statute"
      ? "Statutes"
      : "Guidance and Persuasive Authority";
    groups[group].push(citation);
  }
  const lines: string[] = [];
  for (const group of Object.keys(groups)) {
    const inGroup = groups[group].sort();
    if (!inGroup.length) continue;
    lines.push(group === "Guidance and Persuasive Authority" ? `${group} (persuasive)` : group);
    for (const c of inGroup) lines.push(`    ${c}`);
  }
  return lines.join("\n");
}

// ── Assembly ────────────────────────────────────────────────────────────────

export interface DpiaSkeletonResult {
  readonly document: RenderedSkeletonDocument;
  readonly conformance: ReturnType<typeof verifySkeletonConformance>;
  readonly register_findings: string[];
}

/**
 * PROPOSAL 2026-08-11 — PLACEHOLDER LEAK REPAIR.
 *
 * The prompt's PLACEHOLDER FORMAT RULE requires the single form
 * `[TO COMPLETE — description]`. Generation still occasionally emits the
 * D-era bare variants ([DD/MM/YYYY], [INSERT DATE], [NAME / EMAIL],
 * [Organisation Name], [REF], [Date], [insert …]) and those reach the reader
 * verbatim. This normaliser is deterministic and runs on every composed block
 * and every slot value before render, so a prompt miss can no longer ship.
 */
const PLACEHOLDER_REPAIRS: Array<[RegExp, string]> = [
  [/\[\s*(?:DD\/MM\/YYYY|MM\/DD\/YYYY|YYYY-MM-DD)\s*\]/gi, "[TO COMPLETE — date]"],
  [/\[\s*INSERT\s+DATE\s*\]/gi, "[TO COMPLETE — date]"],
  [/\[\s*DATE\s*\]/gi, "[TO COMPLETE — date]"],
  [/\[\s*NAME\s*\/\s*EMAIL\s*\]/gi, "[TO COMPLETE — name and contact email]"],
  [/\[\s*(?:ORGANISATION|ORGANIZATION)\s+NAME\s*\]/gi, "[TO COMPLETE — organisation name]"],
  [/\[\s*REF\s*\]/gi, "[TO COMPLETE — reference]"],
  [/\[\s*INSERT\s*\]/gi, "[TO COMPLETE — value]"],
  [/\[\s*insert\s+([^\]]{1,80})\]/gi, (_m: string, d: string) => `[TO COMPLETE — ${d.trim()}]`] as unknown as [RegExp, string],
];

export function repairDpiaPlaceholders(text: string): string {
  let out = text;
  for (const [re, rep] of PLACEHOLDER_REPAIRS) {
    out = out.replace(re, rep as string & ((...a: string[]) => string));
  }
  return out;
}

export function assembleDpiaSkeletonDocument(report: Bag, intakeInput: Bag): DpiaSkeletonResult {
  const intake = intakeInput ?? {};
  const rawValues = buildDpiaSlotValues(intake);
  const values: SlotValues = Object.fromEntries(
    Object.entries(rawValues).map(([k, v]) => [k, typeof v === "string" ? repairDpiaPlaceholders(v) : v]),
  ) as SlotValues;
  const org = s(intake.organization_name) || "the company";

  const composedRaw: ComposedBlocks = {
    "executive_summary:0": composeExecutiveLead(report, org),
    "executive_summary:2": composeExecutiveBody(report),

    "lawfulness:0": composeNecessityLead(report),
    "lawfulness:2": composeNecessityBody(report),

    "risks_and_measures:0": composeRiskLead(report),
    "risks_and_measures:1": composeRiskBody(report, values),

    "consultation_and_signoff:1": composeSignoffLead(report, intake),
    "consultation_and_signoff:2": composeSignoffBody(report, intake, values),
  };
  const composed: ComposedBlocks = Object.fromEntries(
    Object.entries(composedRaw).map(([k, v]) => [k, typeof v === "string" ? repairDpiaPlaceholders(v) : v]),
  ) as ComposedBlocks;

  const draft = renderSkeletonDocument({
    sections: DPIA_SKELETON_SECTIONS,
    title: DPIA_SKELETON_TITLE,
    subtitle: DPIA_SKELETON_SUBTITLE,
    spineVersion: DPIA_SKELETON_VERSION,
    values,
    composed,
  });

  const toa = dpiaToa(report, skeletonDocumentToText(draft));

  const document = renderSkeletonDocument({
    sections: DPIA_SKELETON_SECTIONS,
    title: DPIA_SKELETON_TITLE,
    subtitle: DPIA_SKELETON_SUBTITLE,
    spineVersion: DPIA_SKELETON_VERSION,
    values,
    composed: { ...composed, "table_of_authorities:0": toa },
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = DPIA_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, DPIA_SKELETON_SECTIONS),
    register_findings,
  };
}
