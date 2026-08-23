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
  DPIA_SKELETON_SUBTITLE_EU,
  DPIA_SKELETON_SUBTITLE_UK,
  DPIA_SKELETON_VERSION,
  DPIA_V3_BANNED_REGISTER,
} from "../prose/plans/dpia.spine.ts";
import { DPIA_LEGAL_BASIS_PHRASE_MAP } from "../prose/plans/dpia.slotmap.ts";
// PROMPT 12D — exhibit-side supply of the spine-cited authorities.
import { DPIA_SPINE_CITED_AUTHORITIES } from "../report-exhibits/dpia-spine-authorities.ts";

// PROMPT 9A — compact-label presentation (registry + R4 merge). Presentation
// only: nothing here changes an ask, a template sentence, or the gap table.
import { mergeLabeledAsks, renderMergedLabel } from "./dpia-ask-labels.ts";
import {
  renderSkeletonDocument,
  skeletonDocumentToText,
  skeletonTableToText,
  verifySkeletonConformance,
  type ComposedBlocks,
  type RenderedSkeletonDocument,
  type RenderedTable,
  type SlotValues,
} from "../prose/skeleton-render.ts";
import { buildDpiaSkeletonTables, buildDpiaTablesBySurface } from "./dpia-skeleton-tables.ts";
// PROMPT 9H item 3 — the record's regime drives the ToA prefix and the header.
import { DPIA_NECESSITY_TEST_SENTENCE, readDpiaRegime } from "./dpia-deliverables/build.ts";
import { repairRegister } from "./risk-skeleton-assemble.ts";
// PROMPT 9J — clause bounding and abbreviation-aware sentence heads live in
// ONE module so dpia-deliverables/build.ts can share them without a cycle.
import { boundedClause, extractionClause, firstSentence, noStop } from "./clause-bound.ts";
export { boundedClause, firstSentence };
import { spliceVerbatim, collapseSeam, humanizeDateISO } from "./verbatim-splice.ts";
import { attachCorpusRows } from "../corpus/cam-attach.ts";
import { DPIA_CORPUS_MAP } from "../corpus/maps/dpia-corpus-map.ts";

// PROMPT 8A (CEO-ratified 2026-08-12) — CITATION STYLE RULING for all DPIA
// composed prose: running prose spells "Article 35(1)"; parenthetical citations
// use "(Art. 35(1))"; the `citation` field and the Table of Authorities keep the
// registry's full form verbatim.
export const DPIA_SKELETON_ASSEMBLER_STAMP = "dpia-skeleton-assembler@prompt8d-plain-language-2026-08-12";

/** PROMPT 8A slot convention `{n:word}`: one–nine as words, digits from 10 up. */
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
export function numberWord(n: number): string {
  return n >= 0 && n <= 9 ? NUMBER_WORDS[n] : String(n);
}

/** PROMPT 8A `{rescorer}`: the recorded approver, else "the company". */
function rescorer(intake: Bag): string {
  return s(intake?.dpia_approved_by_name) || "the company";
}

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

/**
 * PROMPT 9L item 1 (JOINER, CEO-ratified 2026-08-16) — the reasons-to-conduct
 * splice takes the serial comma ("…, and data processed on a large scale").
 * Scoped to that one slot; every other list keeps `asProse` byte-unchanged.
 */
function asProseSerial(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length <= 2) return asProse(xs);
  return `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;
}

/** Drop a trailing period: the skeleton's fixed prose supplies its own. */
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

    // PROMPT 9L item 1 — the regime-conditional prefix, on the ratified
    // subtitle pattern: selected by readDpiaRegime, never rewritten at render.
    regimeName: readDpiaRegime(intake) === "UK" ? "UK GDPR" : "GDPR",

    // PROMPT 2A(a) — must read grammatically after "…is required because ".
    // PROMPT 9L item 1 (JOINER) — the reasons-to-conduct splice takes the
    // serial comma.
    reasonsToConduct: reasons.length ? `the processing involves ${asProseSerial(reasons)}` : null,
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

    // PROMPT 8 (spine v4) — Section 1 and Section 5 slots.
    natureScopeContext: spliceVerbatim(s(intake.nature_scope_context)) || null,
    functionalDescription: spliceVerbatim(s(intake.functional_description)) || null,
    supportingAssets: spliceVerbatim(s(intake.supporting_assets)) || null,
    dataSubjectsViews: dataSubjectsViewsSlot(intake),

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

/**
 * PROMPT 8 — Section 5. The spine reads "the company has recorded:
 * {dataSubjectsViews}". Absence is stated honestly rather than left blank.
 */
export function dataSubjectsViewsSlot(intake: Bag): string {
  const views = spliceVerbatim(s(intake.data_subjects_views));
  if (views) return noStop(views);
  const sought = s(intake.data_subjects_views_sought);
  if (/^(no|not sought|none)/i.test(sought)) {
    return "that the views of data subjects or their representatives were not sought for this processing";
  }
  return "no views of data subjects or their representatives";
}

export function dpoSentence(intake: Bag): string {
  const advice = s(intake.dpo_advice);
  const info = s(intake.dpo_info);
  if (advice) return `The company has recorded the advice of its data protection officer as follows: ${noStop(advice)}`;
  if (info) return `The company has recorded its data protection officer as ${noStop(info)}`;
  return "The company has not recorded that the advice of a data protection officer has been obtained";
}

// ── Composed blocks ─────────────────────────────────────────────────────────

export function art36Determination(report: Bag): string {
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
// `*_on_the_record` / `least_intrusive_means_supported` family. Composed prose
// READS those determinations and may not disagree with them.
//
// PROMPT 8D (CEO-ratified 2026-08-12) — the executive [DETERMINATION LEAD] is
// RETIRED with spine v4.2. Its five branch sentences are replaced by the
// grounded decision sentence that CLOSES the executive body, below.
function composeExecutiveDecisionSentence(report: Bag, total: number): string {
  const art36 = art36Determination(report);
  const det = determination(report);
  if (total === 0) {
    return "This assessment reviews no risks, because the company has recorded none and none is otherwise identified here; no determination on whether the processing may proceed can rest on a register that is empty.";
  }
  if (art36 === "consultation_required" || det === "consultation_required") {
    const authority = /the Commissioner/.test(decisionText(report))
      ? "the Commissioner"
      : "the competent supervisory authority";
    return `Given the noted risks and the mitigating measures, and after the analysis as set forth below, the processing being assessed may not begin until the company has consulted ${authority} under Article 36(1).`;
  }
  if (art36 === "undetermined_on_the_record") {
    return "Given the points still open, and after the analysis as set forth below, whether prior consultation is required cannot yet be determined, and the processing being assessed should not begin until it is.";
  }
  if (det === "draft_incomplete") {
    return "Given the points still open, and after the analysis as set forth below, this assessment cannot yet determine whether the processing being assessed may proceed.";
  }
  if (det === "conditionally_approved") {
    return "Given the noted risks and the mitigating measures, and after the analysis as set forth below, the processing being assessed may proceed on the conditions set out below.";
  }
  if (det === "approved") {
    return "Given the noted risks and the mitigating measures, and after the analysis as set forth below, the processing being assessed may proceed as described: every risk identified by the company and otherwise identified in this assessment is deemed low or moderate.";
  }
  // Pre-decision documents only: the legacy u5 string is the sole fallback.
  const legacy = decisionText(report);
  return legacy ? stop(noStop(firstSentence(legacy))) : "";
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

function composeExecutiveBody(report: Bag, intake: Bag): string {
  const who = rescorer(intake);
  const bands = residualCounts(report);
  const total = Object.values(bands).reduce((a, b) => a + b, 0);
  const high = bands["high"] ?? 0;
  const openBand = bands["undetermined"] ?? 0;
  const sentences: string[] = [];

  // PROMPT 8D (CEO-ratified 2026-08-12) — the CANONICAL MODEL.
  if (total > 0) {
    sentences.push(
      total === 1
        ? "This assessment reviews one risk and the measures the company has put in place to mitigate it."
        : `This assessment reviews ${numberWord(total)} risks and the measures the company has put in place to mitigate them.`,
    );
    const preliminary =
      `the risk levels in this document are preliminary until ${who} re-scores them against the mitigating measures, if and as identified by the company, once they have been deployed`;
    sentences.push(
      high > 0
        ? `${
          high === 1
            ? "One of these risks is deemed a high risk"
            : `${numberWord(high)} of these risks are deemed high risks`
        } based on the information the company provided, and ${preliminary}.`
        : `None is deemed a high risk based on the information the company provided, and ${preliminary}.`,
    );
    if (openBand > 0) {
      sentences.push(
        `${
          openBand === 1 ? "One remaining risk level is" : `${numberWord(openBand)} remaining risk levels are`
        } undetermined because the company has not recorded the measures it applies, and an undetermined level is not read in the company's favour.`,
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
  // PROMPT 9A (R1/R4) — the executive list renders the ratified COMPACT LABEL.
  // The full ask stays in the gap table. Documents generated before 9A carry no
  // `display_label`, so they fall back to the ask text exactly as before.
  const labelled = gapSource.some((e) => s(e.display_label).length > 0);
  const merged = labelled
    ? mergeLabeledAsks(
      gapSource.map((e) => ({
        ask_class: s(e.ask_class) || undefined,
        label: noStop(s(e.display_label)),
        enables: noStop(s(e.enables)),
        scope_op: s(e.scope_op) || undefined,
      })),
    ).map((m) => ({ what: renderMergedLabel(m), enables: m.enables }))
    : mergeOpenGapItems(
      gapSource.map((e) => ({
        what: noStop(s(e.dimensions) || s(e.field)),
        enables: noStop(s(e.enables)),
      })),
    );
  // PROMPT 8A item 3 (CEO revision 2026-08-12) — DETERMINISTIC ORDERING RULE
  // for the open points named in the executive body: decision blockers first
  // (entries that complete a determination, i.e. carry a non-empty `enables`),
  // then every remaining entry in gap-ledger order. The sort is stable, so
  // ordering inside each group is the ledger's own order. The rule is stated
  // here and asserted by test; it NEVER appears in customer prose.
  const ordered = merged
    .map((e, i) => ({ ...e, i }))
    .sort((a, b) => (a.enables.length > 0 ? 0 : 1) - (b.enables.length > 0 ? 0 : 1) || a.i - b.i);
  const openItems = ordered.map(({ what, enables }) =>
    enables.length > 0
      ? `${what} — which completes ${enables.map((x) => lowerEnumLabel(x)).join(" and ")}`
      : what
  );
  const open = openItems.length;
  if (open === 1) {
    sentences.push(
      `Based on the information the company provided, one point is still open; it is listed in the gap table and raised again where it bears on a determination. It is: ${openItems[0]}.`,
    );
  } else if (open > 1) {
    const lead =
      `Based on the information the company provided, ${numberWord(open)} points are still open; each is listed in the gap table and raised again where it bears on a determination.`;
    sentences.push(
      open <= 3
        ? `${lead} They are: ${openItems.join("; ")}.`
        : `${lead} The first three are: ${openItems.slice(0, 3).join("; ")}.`,
    );
  }

  // PROMPT 8D — the grounded decision statement CLOSES the executive body.
  const closing = composeExecutiveDecisionSentence(report, total);
  if (closing) sentences.push(closing);

  return repairRegister(sentences.join(" "));
}


const NECESSITY_UNMET = /undetermined_on_the_record|less_intrusive_alternative_available|disproportionate_on_the_record/;

// PROMPT 9L item 2 (CEO-ratified 2026-08-16) — RETIRED. The §3 neutral lead
// renders nowhere; the four-step composition opens Section 3 directly. The
// constant is retained so the retirement sweep can assert its absence.
export const DPIA_S3_LEAD_RETIRED =
  "Necessity and proportionality are assessed below for the processing described, based on the information the company provided.";

// PROMPT 9I.1 item 2 — the Section 3 DETERMINATION, rendered LAST (before the
// §3.1 design-risk block). Ratified bytes; no other branch vocabulary moves.
export const DPIA_S3_DETERMINATION_ESTABLISHED =
  "On this analysis, necessity and proportionality are established for the processing as described.";

function composeNecessityDetermination(report: Bag): string {
  const findings = [...asArray(report.necessity_findings), ...asArray(report.proportionality)];
  const unmet = findings.filter((f) => NECESSITY_UNMET.test(s(f.verdict)));
  if (findings.length === 0) {
    // The existing branch sentence, relocated here and prefixed.
    return "On this analysis, whether necessity and proportionality are established cannot be determined based on the information the company provided alone; the analysis below sets out what that information does and does not support.";
  }
  return unmet.length === 0
    ? DPIA_S3_DETERMINATION_ESTABLISHED
    : `On this analysis, necessity and proportionality are established in part: ${
      numberWord(unmet.length)
    } elements are not yet supported, each identified above and listed in the gap table.`;
}



// ── PROMPT 9I item 4 (CEO-ratified 2026-08-15) — SECTION 3 RESTRUCTURE ──
//
// S3-R1  order: statutory frame (fixed prose) → necessity → proportionality →
//        determination last (the [DETERMINATION LEAD] block, moved in the spine).
// S3-R2  each element is its own paragraph; paragraphs are separated by a blank
//        line and split by the shared renderer.
// S3-R3  every customer quote in Section 3 is CLAUSE-BOUNDED: a quote carries a
//        single clause of the company's own words, never a whole free-text field.

const quoted = (t: string): string => (t ? `"${t}"` : "");

// PROMPT 9I.1 item 7 — EVERY customer quote in Section 3 passes through the
// clause-bounding rule, including quotes spliced inside a typed `why` field.
export function boundQuotesIn(text: string): string {
  return String(text ?? "").replace(/"([^"]{1,})"/g, (_m, inner: string) => {
    const b = boundedClause(inner);
    return b ? `"${b}"` : `"${inner}"`;
  });
}

/**
 * PROMPT 9I.1 item 3 — the necessity-test sentence. PROMPT 9L RETIRED it from
 * the Section 3 rendering; the surface that carries it (the necessity finding's
 * `why`) is byte-unchanged, and the export stays for the retirement sweep.
 */
export { DPIA_NECESSITY_TEST_SENTENCE };

// ── PROMPT 9L item 2 (CEO-ratified 2026-08-16) — the four-step composition ──
//
// Per operation, primary then secondary; each step is its own paragraph; the
// determination is rendered last (its own spine block). Every absent/adverse
// branch keeps its existing ratified sentence, rendered in its step's position.

/** STEP 3, established branch. */
export const DPIA_S3_STEP3_CONCLUSION =
  "On the stated test — whether a realistic, less intrusive method could achieve the same purpose — each alternative the company considered was rejected for the reasons recorded, and the processing is supported as necessary to achieve the stated goal.";

/** STEP 4 openers (the balance sentence carries the recorded safeguards). */
export const DPIA_S3_STEP4_IMPACT_LEAD =
  "The impact on individual privacy rights is stated by the company separately from the benefit:";

// PROMPT 9L.1 item 3(c) (CEO-ratified 2026-08-16) — one balance template, both
// operations. "including" is added; "the impact is answered and" is RETIRED.
export function dpiaS3BalanceSentence(safeguards: string): string {
  return `Balancing that impact against the goal stated above, and in light of the safeguards the company has recorded (including ${safeguards}), the processing is proportionate to the stated goal.`;
}

/** RETIRED 9L balance phrasing, retained so the sweep can assert its absence. */
export const DPIA_S3_RETIRED_BALANCE_PHRASE = "the impact is answered and";


/** RETIRED §3 bytes, retained so the sweep can assert their absence. */
export const DPIA_S3_RETIRED_BENEFIT_LEAD = "On the benefit side of the balance, the company states:";
export const DPIA_S3_RETIRED_IMPACT_LEAD =
  "On the impact side, stated separately from the benefit, the company states:";

const NOT_STATED_LABEL = "Not stated";

/** The measures list the proportionality `why` reads — same reader, same order. */
function recordedSafeguards(intake: Bag): string[] {
  return arr(intake.existing_safeguards).filter((x) => x !== "None");
}

function branchSentence(why: string): string {
  return why ? boundQuotesIn(stop(noStop(firstSentencesQuoteAware(why, 2)))) : "";
}

/**
 * PROMPT 9L.1 item 1 — ONE Step-2 resolution function, no fork. The operation's
 * own "how" narrative, taken through the shared extraction bound (item 2's
 * colon-aware start). Empty where the operation has nothing quotable.
 */
export function stepTwoClause(intake: Bag, isSecondary: boolean): string {
  const own = isSecondary ? s(intake.secondary_uses) : s(intake.necessity_proportionality);
  if (!own || own === NOT_STATED_LABEL || own.trim().toLowerCase() === "none") return "";
  return extractionClause(own);
}

/** One operation, four steps. */

function composeOperationElement(f: Bag, p: Bag | null, intake: Bag, index: number): string[] {
  const paras: string[] = [];
  const isSecondary = s(f.operation_id) === "op_secondary" || (!s(f.operation_id) && index > 0);

  // STEP 1 — GOALS.
  const purposeRaw = s(f.purpose_text);
  const purpose = purposeRaw && purposeRaw !== NOT_STATED_LABEL ? boundedClause(purposeRaw) : "";
  let necessityWhyRendered = false;
  if (purpose) {
    paras.push(
      isSecondary
        // PROMPT 9L.1 item 3(b) — ratified secondary goals sentence.
        ? `The secondary purpose indicated by the company is the following: ${quoted(purpose)}.`
        : `The primary purpose indicated by the company is the following: ${quoted(purpose)}.`,
    );
  } else {
    const branch = branchSentence(s(f.why));
    if (branch) {
      paras.push(branch);
      necessityWhyRendered = true;
    }
  }

  // STEP 2 — HOW. PROMPT 9L.1 item 1 — the quoted clause resolves PER
  // OPERATION: the secondary operation quotes ITS OWN narrative
  // (`secondary_uses`), never a reuse of the primary's necessity statement.
  // Nothing quotable → the step is omitted for that operation. No new reader,
  // no invented sentence, no new ask.
  const how = stepTwoClause(intake, isSecondary);
  if (how) {
    paras.push(`The company describes how the processing achieves that goal: ${quoted(how)}.`);
  }


  // STEP 3 — LESS INTRUSIVE METHODS.
  const alts = asArray(f.alternatives_considered)
    .map((a) => ({ alt: boundedClause(s(a.alternative)), why: boundedClause(s(a.rejection_reason)) }))
    .filter((a) => a.alt);
  if (alts.length > 0) {
    const list = alts.length === 1
      ? `${quoted(alts[0].alt)}`
      : alts.map((a, i) =>
        `${i === alts.length - 1 ? "and " : ""}${i + 1}. ${quoted(a.alt)}`
      ).join("; ");
    const head = alts.length === 1
      ? `The company has recorded one possible alternative to the proposed processing: ${list}.`
      : `The company has recorded ${numberWord(alts.length)} possible alternatives to the proposed processing: ${list}.`;
    const bridge = alts.length === 1
      ? "The company states why it would not achieve the necessary purpose of the processing, as follows:"
      : "The company states, for each, why it would not achieve the necessary purpose of the processing, as follows:";
    const reasons = alts.filter((a) => a.why).map((a, i) =>
      alts.length === 1 ? quoted(a.why) + "." : `${i + 1}. ${quoted(a.why)}.`
    );
    paras.push([head, bridge].join(" "));
    if (reasons.length) paras.push(reasons.join("\n"));
  }

  if (s(f.verdict) === "least_intrusive_means_supported") {
    paras.push(DPIA_S3_STEP3_CONCLUSION);
  } else if (!necessityWhyRendered) {
    const branch = branchSentence(s(f.why));
    if (branch) paras.push(branch);
  }

  // STEP 4 — IMPACT, BALANCED.
  if (p) {
    const impactRaw = s(p.impact_argument);
    const impact = impactRaw && impactRaw !== NOT_STATED_LABEL ? boundedClause(impactRaw) : "";
    if (impact) paras.push(`${DPIA_S3_STEP4_IMPACT_LEAD} ${quoted(impact)}.`);
    if (s(p.verdict) === "proportionate_on_the_record") {
      paras.push(dpiaS3BalanceSentence(recordedSafeguards(intake).join("; ")));
    } else {
      const branch = branchSentence(s(p.why));
      if (branch) paras.push(branch);
    }
  }

  return paras.filter(Boolean);
}

/** PROMPT 5: defect notice replacing the former raw-u3 fallback. */
export const DPIA_NP_VOID_NOTICE =
  "The necessity and proportionality analysis for this assessment could not be composed from the record's structured surfaces; this document should be regenerated, and this sentence is a defect notice rather than an analysis.";

export function composeNecessityBody(report: Bag, intakeInput?: Bag): string {
  const intake = intakeInput ?? {};
  const paras: string[] = [];
  const findings = asArray(report.necessity_findings).slice(0, 4);
  const props = asArray(report.proportionality).slice(0, 3);
  const used = new Set<number>();

  findings.forEach((f, i) => {
    let pi = props.findIndex((p, j) => !used.has(j) && s(p.operation_id) === s(f.operation_id));
    if (pi < 0 && !s(f.operation_id)) pi = props[i] && !used.has(i) ? i : -1;
    if (pi >= 0) used.add(pi);
    paras.push(...composeOperationElement(f, pi >= 0 ? props[pi] : null, intake, i));
  });

  // Any proportionality finding with no necessity counterpart still renders.
  props.forEach((p, j) => {
    if (used.has(j)) return;
    const impactRaw = s(p.impact_argument);
    const impact = impactRaw && impactRaw !== NOT_STATED_LABEL ? boundedClause(impactRaw) : "";
    if (impact) paras.push(`${DPIA_S3_STEP4_IMPACT_LEAD} ${quoted(impact)}.`);
    if (s(p.verdict) === "proportionate_on_the_record") {
      paras.push(dpiaS3BalanceSentence(recordedSafeguards(intake).join("; ")));
    } else {
      const branch = branchSentence(s(p.why));
      if (branch) paras.push(branch);
    }
  });

  if (paras.length === 0) {
    // PROMPT 5 (2026-08-11): no AI-text fallback. buildOperations always yields
    // at least one operation, so empty typed arrays mean the ITEM-310 attach
    // failed outright. Emit a defect notice, never unreviewed model prose.
    console.warn(JSON.stringify({ telemetry: "dpia_skeleton_np_void", necessity_findings: 0, proportionality: 0 }));
    return DPIA_NP_VOID_NOTICE;
  }
  // Repair per LINE: numbered rejection reasons are one line each.
  return paras
    .map((para) => para.split("\n").map((line) => repairRegister(line)).join("\n"))
    .join("\n\n");
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
    return "No risk register has been assembled based on the information the company provided, so no remaining risk level can be stated.";
  }
  const label = noStop(s(top.risk_label)) || "the risk identified below";
  const band = (s(top.residual_band) || s(top.inherent_band)).toLowerCase();
  if (band === "undetermined") {
    return `After the mitigating measures the company has recorded, the remaining risk level for ${label} is undetermined, and that is the most significant open point in this assessment.`;
  }
  // PROMPT 9I item 3(b) (CEO-ratified 2026-08-15) — Section 4's CLOSING
  // summary sentence, byte-fixed.
  return band
    ? `After the mitigating measures the company has identified, the most significant remaining risk is: ${label}, which is assessed herein at a preliminary remaining risk level of ${band}.`
    : `After the mitigating measures the company has identified, the most significant remaining risk is: ${label}.`;

}



// PROMPT 8A item 1, as revised by the PROMPT 8D plain-language sweep
// (CEO-ratified 2026-08-12) — per-risk analytic template. The re-scoring
// caveat is carried ONCE, by the first risk that states a remaining risk
// level; every later risk closes "on the same preliminary basis". The
// initial/remaining distinction is vocabulary law: a row carrying both renders
// both, and neither is ever collapsed to a bare "risk level".
export function composeRiskBody(report: Bag, values: SlotValues, intake: Bag = {}): string {
  const rows = asArray(report.risk_register);
  const who = rescorer(intake);
  const blocks: string[] = [];
  let caveatSpent = false;
  for (const r of rows) {
    const label = noStop(s(r.risk_label));
    if (!label) continue;
    const likelihood = s(r.likelihood);
    const severity = s(r.severity);
    const inherent = s(r.inherent_band);
    const residual = s(r.residual_band);
    const measures = arr(r.measures).map(noStop);

    // 1.5 — likelihood or severity absent: the level is not broken down.
    if (!(likelihood && severity)) {
      blocks.push(
        `${label} carries an initial risk level of ${inherent || "undetermined"} under this assessment's pre-set risk taxonomy; likelihood and severity are not both recorded, so that level is not broken down here.`,
      );
      continue;
    }

    // PROMPT 9L.1 item 4 (CEO-ratified 2026-08-16) — the uniform per-risk
    // template. Band words take typographic quotes; the protections clause is
    // set off with em dashes; "with an aggregate initial risk level" and
    // "mitigate the risk" render identically on every row.
    const head =
      `${label} is assessed at \u201C${likelihood}\u201D likelihood and \u201C${severity}\u201D severity under this assessment's pre-set risk taxonomy, with an aggregate initial risk level of ${
        inherent || "undetermined"
      }.`;
    const protections = measures.length
      ? `The company's recorded protections \u2014 ${asProse(measures)} \u2014 mitigate the risk`
      : "The company records no measure against it";

    // 1.4 — remaining risk level undetermined. The causal clause is carried
    // only by the measures-present branch: in the no-measures branch it would
    // restate its own antecedent (PROMPT 8D meaning flag 4).
    if (!residual || residual.toLowerCase() === "undetermined") {
      blocks.push(
        `${head} ${protections}, and the remaining risk level is undetermined${
          measures.length ? ", because the company does not record the measures it applies" : ""
        }.`,
      );
      continue;
    }

    // 1.1 (first, carries the re-score clause) / 1.2 (subsequent rows).
    const tail = caveatSpent
      ? `the remaining risk level is ${residual} on the same preliminary basis.`
      : `the remaining risk level, which is preliminary until ${who} re-scores it against the mitigating measures once they have been deployed, is ${residual}.`;
    caveatSpent = true;
    blocks.push(`${head} ${protections}, and ${tail}`);



  }

  const safeguards = values.safeguards;
  // 1.6 / 1.7 — safeguards closer.
  blocks.push(
    safeguards
      ? `Across the processing as a whole the company records ${safeguards}.`
      : "The company records no safeguards for this processing.",
  );

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
      ? "that the assessment cannot yet be signed off"
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
      ? `No sign-off determination has been recorded, and ${approver} has not yet accepted the remaining risk levels.`
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
      `${approver}${title ? `, ${title},` : ""} is recorded as the person accepting the remaining risk levels${total ? ` across the ${total === 1 ? "single risk" : `${total} risks`} this assessment reviews` : ""}.`,
    );
  } else {
    parts.push("No approver has been recorded, so the remaining risk levels set out above have not yet been accepted by anyone on the company's behalf.");
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

/**
 * PROMPT 8 — Section 6 conditional, bound to `art36_consultation`. The spine's
 * fixed prose carries only the slot; the branch may not disagree with the typed
 * determination.
 */
// PROMPT 8F item 1 (CEO-ratified 2026-08-12) — byte-exact DPO disclosure
// sentence. Disclose, don't flip: the typed determination is never altered.
export const ART36_DPO_DISCLOSURE =
  "The company's data protection officer has advised that the supervisory authority be consulted on this processing; that advice is recorded here alongside this assessment's own determination on Article 36(1), which is stated above and is unchanged by it.";

// WAVE C2 (2026-08-23, doc 57 §2a / doc 63 §4.2) — the release-1 AOW,
// bound to the SAME typed consultation_required state Article 36(1)'s own
// sentence reads. Pure CAM attachment (attachCorpusRows over a one-token
// fired-state set); NO-PADDING LAW: the state must fire for the warning to
// attach, so a suppressed Art. 36 sentence can never carry an orphaned
// warning. Placement: adjacent to the adverse determination itself (the
// same "one-warning-adjacent-to-the-adverse-determination" pattern as
// Risk's AOW), not a separate appendix.
export function dpiaConsultationWarning(det: string): string | null {
  if (det !== "consultation_required") return null;
  const aow = attachCorpusRows(DPIA_CORPUS_MAP, "S5", new Set(["consultation_required"])).find(
    (r) => r.role === "AOW",
  );
  return aow?.warning_text ?? null;
}

function composeArt36Sentence(report: Bag): string {
  const a36 = (report.art36_consultation ?? {}) as Bag;
  const det = art36Determination(report);
  let base: string;
  if (det === "consultation_required") {
    // v4.6 (2026-08-21) — ties the sentence to Article 36(1)'s actual
    // trigger: the DPIA concluding the processing would STILL result in a
    // high risk because it cannot be sufficiently mitigated, not merely that
    // a risk level is numerically "high."
    base = "Because this DPIA concludes that the intended processing would still result in a high risk that the company cannot sufficiently mitigate through the measures it has recorded, Article 36(1) requires prior consultation with the supervisory authority before processing begins";
  } else if (det === "undetermined_on_the_record") {
    base = "Whether Article 36(1) requires prior consultation cannot be settled based on the information the company provided, because the remaining risk levels on which that duty turns are open on the points named above";
  } else {
    base = "On this assessment's determination, prior consultation with the supervisory authority under Article 36(1) is not required";
  }
  if (a36.dpo_recommends_consultation === true && det !== "consultation_required") {
    return `${base}. ${noStop(ART36_DPO_DISCLOSURE)}`;
  }
  const warning = dpiaConsultationWarning(det);
  if (warning) return `${base}. ${warning}`;
  return base;
}


// ── Table of Authorities ────────────────────────────────────────────────────

// ── PROMPT 9H item 3 (CEO-ruled 2026-08-15) — ToA citation hygiene ──────────
//
// (a) REGIME PREFIX. Every GDPR entry in a UK record's table reads "UK GDPR";
//     every entry in an EU record's table reads "GDPR". Long-form emissions
//     ("Regulation (EU) 2016/679 (General Data Protection Regulation) art. 13")
//     are folded onto the same house form. Prefix only — pinpoints untouched.
//
// (b) CITATION GRAMMAR. A pinpoint whose paragraph number does not exist in
//     the cited article (the verified "UK GDPR Art. 6(11)" defect) never
//     reaches the table. Articles absent from the table below are accepted.

/** Paragraph counts of the GDPR articles this product cites. */
const GDPR_ARTICLE_PARAGRAPHS: Record<string, number> = {
  "5": 2, "6": 4, "9": 4, "10": 1, "12": 8, "13": 4, "14": 5, "15": 4,
  "22": 4, "24": 3, "25": 3, "28": 10, "30": 5, "32": 4, "33": 5, "34": 4,
  "35": 11, "36": 5, "37": 7, "38": 6, "39": 2, "44": 1, "45": 9, "46": 5,
  "47": 9, "49": 6, "57": 4, "83": 9, "89": 4,
};

/** True when the citation is a well-formed GDPR pinpoint (or not a GDPR one). */
export function isWellFormedGdprPinpoint(citation: string): boolean {
  const c = String(citation || "").replace(/\s+/g, " ").trim();
  const m = /\bArt(?:icle|\.)?\s*(\d+[a-z]?)\s*\((\d+)\)/i.exec(c);
  if (!m) return true;
  const max = GDPR_ARTICLE_PARAGRAPHS[m[1]];
  if (max === undefined) return true;
  const para = Number(m[2]);
  return para >= 1 && para <= max;
}

/** Fold a GDPR citation onto the record's regime prefix. */
export function toaRegimeForm(regime: "EU" | "UK", citation: string): string {
  let c = String(citation || "").replace(/\s+/g, " ").trim();
  const long = /^Regulation \(EU\) 2016\/679(?: \(General Data Protection Regulation\))?\s*,?\s*art(?:icle|\.)?\s*(.+)$/i
    .exec(c);
  if (long) c = `GDPR Art. ${long[1].trim()}`;
  if (!/GDPR/i.test(c)) return c;
  return regime === "UK"
    ? (/\bUK GDPR\b/.test(c) ? c : c.replace(/\bGDPR\b/, "UK GDPR"))
    : c.replace(/\bUK GDPR\b/, "GDPR");
}

/**
 * PROMPT 12B item 1 — IFF-CITED, IN EITHER FORM THE BODY USES.
 *
 * The body cites the regulation both in short pinpoint form ("GDPR Art. 25(1)")
 * and in the ratified long form the skeleton sentences carry ("Article 35(7)(c)
 * requires…"). Both are citations of the same authority, so the table lists the
 * authority either way. Nothing else about the gate moves: an authority the body
 * never names in any form is still excluded.
 */
export function bodyCites(body: string, citation: string): boolean {
  if (body.includes(citation)) return true;
  const m = /Art(?:icle|\.)\s*(\d+[a-z]?(?:\(\d+\))?(?:\([a-z0-9]+\))*)\s*$/i.exec(citation.trim());
  if (!m) return false;
  const pin = m[1].replace(/\s+/g, "");
  return body.includes(`Article ${pin}`) || body.includes(`Art. ${pin}`);
}

function dpiaToa(report: Bag, body: string, regime: "EU" | "UK" = "EU"): string {
  const exhibit = (report.authority_exhibit ?? {}) as Bag;
  const entries = Array.isArray(exhibit.entries) ? (exhibit.entries as Bag[]) : [];
  // PROMPT 12D — the ratified spine openers cite Art. 35(7)(a), Art. 35(9) and
  // Art. 35(11) in long form, which the exhibit harvest never saw. They are
  // supplied here as exhibit entries; the iff-cited gate below is unchanged and
  // still decides whether each one is listed.
  const candidates: Bag[] = [
    ...entries,
    ...DPIA_SPINE_CITED_AUTHORITIES.map((c) => ({
      citation: c,
      authority_class: "regulation",
    } as Bag)),
  ];
  const groups: Record<string, string[]> = {
    "Regulations": [],
    "Statutes": [],
    "Guidance and Persuasive Authority": [],
  };
  const seen = new Set<string>();
  for (const e of candidates) {

    const raw = s(e.citation);
    if (!raw) continue;
    if (!bodyCites(body, raw)) continue; // iff-cited
    if (!isWellFormedGdprPinpoint(raw)) continue;
    const citation = toaRegimeForm(regime, raw);
    if (seen.has(citation)) continue;
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
    const inGroup = consolidatePinpoints(groups[group].sort());
    if (!inGroup.length) continue;
    lines.push(group === "Guidance and Persuasive Authority" ? `${group} (persuasive)` : group);
    for (const c of inGroup) lines.push(`    ${c}`);
  }
  return lines.join("\n");
}

/**
 * PROMPT 10B(1) — consolidate pinpoints of the same article onto one ToA line
 * ("GDPR Art. 9(1), (2)(h)"). Citations without an article-with-pinpoint shape
 * pass through untouched.
 */
function consolidatePinpoints(citations: string[]): string[] {
  const order: string[] = [];
  const pins = new Map<string, string[]>();
  for (const c of citations) {
    const m = /^(.*Art\.\s*\d+[a-z]?)(\(.+\))$/.exec(c);
    const base = m ? m[1] : c;
    if (!pins.has(base)) {
      pins.set(base, []);
      order.push(base);
    }
    if (m && !pins.get(base)!.includes(m[2])) pins.get(base)!.push(m[2]);
  }
  return order.map((base) => {
    const p = pins.get(base)!;
    return p.length ? `${base}${p[0]}${p.slice(1).map((x) => `, ${x}`).join("")}` : base;
  });
}

// ── Appendix A — factor / determination / authority matrix ──────────────────
//
// Spine v4.6.1 (CEO-ratified 2026-08-22) replaces the 4-column factor/intake/
// language/authority matrix with 3 columns: for each material factor, the row
// states the FACTOR, a single "Report Determination" sentence, and the
// primary authority. No new legal content is produced here — every
// determination is read from the same typed surfaces, composed blocks, and
// rendered tables that already appear in the body, so there is no way for a
// row to say something the report itself doesn't establish. Two sentence
// patterns (CEO-ratified): a DESCRIPTIVE factor (did the Company supply the
// inventory this factor covers) states "The Company has provided the
// necessary information for X"; a DETERMINATION factor (a legal conclusion
// is the point of the factor) states the conclusion directly. A row is
// suppressed (never printed as N/A) only when the factor genuinely does not
// apply to this record — matching the no-padding law and the determined-
// outcome rule already applied to the CPPA Risk engine.

/** Joins one or more already-composed values (composed[key] or values[key]), skipping blanks; null if none present. */
function joinComposed(parts: readonly (string | null | undefined)[]): string | null {
  const nonEmpty = parts.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return nonEmpty.length ? nonEmpty.join(" ") : null;
}

/** Total row count across one or more rendered table surfaces; 0 if none rendered. */
function tableRowCount(tables: ReturnType<typeof buildDpiaTablesBySurface>, keys: readonly string[]): number {
  return keys.reduce((n, k) => n + (tables[k]?.rows?.length ?? 0), 0);
}

/** DESCRIPTIVE-pattern sentence: states that the inventory a factor covers was supplied, by count where the underlying table is a genuine per-item list. `nounPlural` overrides the default regular "+s" plural for irregular nouns (e.g. "category" -> "categories"). */
function providedFor(topic: string, count?: number, noun?: string, nounPlural?: string): string {
  const plural = nounPlural ?? (noun ? `${noun}s` : "");
  const detail = typeof count === "number" && noun
    ? `, covering ${count === 1 ? `the 1 ${noun} recorded` : `all ${count} ${plural} recorded`}`
    : "";
  return `The Company has provided the necessary information for ${topic}${detail}.`;
}

interface DpiaMatrixRowSpec {
  readonly label: string;
  readonly authority: string;
  /** Returns the Report Determination sentence for this factor, or null if the factor does not apply to this record. */
  readonly reportDetermination: (
    ctx: {
      readonly report: Bag;
      readonly intake: Bag;
      readonly values: SlotValues;
      readonly composed: ComposedBlocks;
      readonly tables: ReturnType<typeof buildDpiaTablesBySurface>;
    },
  ) => string | null;
}

const DPIA_MATRIX_ROWS: readonly DpiaMatrixRowSpec[] = [
  {
    // DETERMINATION — the trigger conclusion itself is the point of this factor.
    label: "DPIA requirement / high-risk trigger",
    authority: "GDPR Art. 35(1), (3)–(5); EDPB-endorsed WP248 rev.01; applicable supervisory-authority Art. 35(4) list",
    reportDetermination: ({ values }) =>
      values.reasonsToConduct
        ? `${s(values.organizationName)}’s processing triggers this assessment because ${s(values.reasonsToConduct)}.`
        : null,
  },
  {
    // DESCRIPTIVE — a heterogeneous inventory (controller, processors, planning, team, approval); named by category, not by count, since the five underlying tables carry different kinds of rows.
    label: "Controller, processors, and accountability",
    authority: "GDPR Arts. 24, 28; Art. 35(2), (7), (11) as applicable",
    reportDetermination: ({ tables }) =>
      tableRowCount(tables, [
        "processing_inventory.controllers",
        "processing_inventory.processors",
        "processing_inventory.planning",
        "assessment_team",
        "validation_approval",
      ]) > 0
        ? providedFor(
          "its controller and processor record, including its data protection officer, its processor engagements, and this assessment’s own review and approval history",
        )
        : null,
  },
  {
    // DESCRIPTIVE (+ genuine prose tail kept verbatim, not a table dump).
    label: "Systematic description and purposes",
    authority: "GDPR Art. 35(7)(a); Art. 5(1)(b)",
    reportDetermination: ({ tables, values }) =>
      joinComposed([
        tableRowCount(tables, ["processing_inventory.data_items", "processing_inventory.purposes", "processing_inventory.secondary_uses"]) > 0
          ? providedFor("describing the processing and its purposes")
          : null,
        typeof values.natureScopeContext === "string" ? `On nature, scope and context: ${values.natureScopeContext}` : null,
      ]),
  },
  {
    // DETERMINATION — whether the stated basis is supported is the finding, not merely that a basis was named.
    label: "Lawful basis",
    authority: "GDPR Art. 6(1); where legitimate interests are relied on, Art. 6(1)(f) and Art. 35(7)(a)",
    reportDetermination: ({ report }) => {
      const findings = asArray((report as Bag).legal_basis);
      if (!findings.length) return null;
      const bases = Array.from(new Set(findings.map((f) => s(f.article_6_basis)).filter(Boolean)));
      const basisLabel = bases.length ? asProse(bases) : "a lawful basis";
      const supported = findings.every((f) => s(f.verdict) === "basis_supported_on_the_record");
      return supported
        ? `The Company has identified ${basisLabel} for this processing, and the information provided supports that basis.`
        : `The Company has identified ${basisLabel} for this processing; the information provided does not yet establish that basis.`;
    },
  },
  {
    // DETERMINATION — same shape as Lawful Basis, scoped to the Art. 9(2) condition.
    label: "Special-category condition",
    authority: "GDPR Art. 9(1)–(2); Art. 35(7)(b)–(d)",
    reportDetermination: ({ report }) => {
      const cov = (report as Bag).section2_coverage as Bag | undefined;
      const rows = asArray(cov?.special_category_conditions);
      if (!rows.length) return null;
      const conditions = Array.from(new Set(rows.map((r) => s(r.condition_label)).filter(Boolean)));
      const conditionLabel = conditions.length ? asProse(conditions) : "a special-category condition";
      const supported = rows.every((r) => s(r.status) === "analysed");
      return supported
        ? `The Company has identified ${conditionLabel} for the special-category data involved, and the information provided supports that condition.`
        : `The Company has identified ${conditionLabel} for the special-category data involved; the information provided does not yet establish that condition.`;
    },
  },
  {
    // DESCRIPTIVE — one row per data category; count is genuine and informative.
    label: "Data minimisation and retention",
    authority: "GDPR Art. 5(1)(b), (c), (e); Art. 35(7)(b)",
    reportDetermination: ({ tables }) => {
      const n = tableRowCount(tables, ["section2_coverage.data_minimisation_retention"]);
      return n > 0 ? providedFor("data minimisation and retention", n, "data category", "data categories") : null;
    },
  },
  {
    // DESCRIPTIVE — single-matter summary table; a count adds nothing here.
    label: "Data quality / accuracy",
    authority: "GDPR Art. 5(1)(d); Art. 35(7)(b), (d)",
    reportDetermination: ({ tables }) => (tableRowCount(tables, ["section2_coverage.data_quality"]) > 0 ? providedFor("how it keeps this data accurate") : null),
  },
  {
    // DESCRIPTIVE — single-matter summary table.
    label: "Article 5 principles / accountability measures",
    authority: "GDPR Art. 5(1)–(2); Arts. 24, 35(7)(d)",
    reportDetermination: ({ tables }) =>
      tableRowCount(tables, ["section2_coverage.measures_article5"]) > 0 ? providedFor("the measures carrying the Article 5 principles") : null,
  },
  {
    // DESCRIPTIVE — single-matter summary table.
    label: "Data-subject rights",
    authority: "GDPR Arts. 12–22; Art. 35(7)(b), (d)",
    reportDetermination: ({ tables }) =>
      tableRowCount(tables, ["section2_coverage.measures_rights"]) > 0 ? providedFor("how data subjects exercise their rights") : null,
  },
  {
    // DETERMINATION — a distinct factor from Processor Governance (Chapter V vs Art. 28) even though both currently read from the same underlying table; see risk-skeleton-assemble.ts's analogous note for the fleet-wide pattern.
    label: "International transfers",
    authority: "GDPR Art. 44 and Chapter V",
    reportDetermination: ({ report }) => {
      const cov = (report as Bag).section2_coverage as Bag | undefined;
      if (!cov) return null;
      const transfers = asArray(cov.transfers);
      if (!transfers.length) {
        return "The Company’s information establishes that no cross-border transfer occurs in this processing.";
      }
      const INSTRUMENTED = new Set(["intra_eea_processing", "uk_domestic_processing", "adequacy", "instrument_recorded"]);
      const allInstrumented = transfers.every((t) => INSTRUMENTED.has(s(t.determination)));
      return allInstrumented
        ? "The Company has identified its cross-border transfers, and a transfer mechanism is recorded for each."
        : "The Company has identified a cross-border transfer for which a Chapter V transfer mechanism has not yet been recorded.";
    },
  },
  {
    // DETERMINATION — companion factor to International Transfers under Art. 28.
    label: "Processor governance",
    authority: "GDPR Art. 28(1), (3)–(4)",
    reportDetermination: ({ report }) => {
      const cov = (report as Bag).section2_coverage as Bag | undefined;
      const pc = cov?.processor_contract as Bag | undefined;
      if (!pc || Object.keys(pc).length === 0) return null;
      const processors = arr(pc.processors);
      if (!processors.length) {
        return "The Company has not recorded a third-party processor for this processing, so no Art. 28 processing agreement is engaged.";
      }
      return pc.dpa_recorded === true
        ? "The Company’s information establishes that a signed Art. 28 processing agreement is in place for its processor engagements."
        : "The Company has named third-party processors for this processing but has not recorded a signed Art. 28 processing agreement.";
    },
  },
  {
    // DESCRIPTIVE — one row per measure; count is genuine.
    label: "Data protection by design and by default",
    authority: "GDPR Art. 25; Art. 35(7)(d)",
    reportDetermination: ({ tables }) => {
      const n = tableRowCount(tables, ["section2_coverage.measures_dpbd"]);
      return n > 0 ? providedFor("its data-protection-by-design measures", n, "measure") : null;
    },
  },
  {
    // DESCRIPTIVE — one row per safeguard; count is genuine (the row that used to dump all 8 safeguards verbatim).
    label: "Security of processing",
    authority: "GDPR Art. 32; Art. 35(7)(d)",
    reportDetermination: ({ tables }) => {
      const n = tableRowCount(tables, ["section2_coverage.measures_security"]);
      return n > 0 ? providedFor("its security measures", n, "measure") : null;
    },
  },
  {
    // DETERMINATION — reuse the existing [DETERMINATION LEAD] sentence (composeNecessityDetermination) rather than the full multi-paragraph body analysis; already exactly the condensed verdict this column needs.
    label: "Necessity and proportionality",
    authority: "GDPR Art. 35(7)(b); Art. 5(1)(b)–(c)",
    reportDetermination: ({ composed }) =>
      typeof composed["section_3_necessity_proportionality:2"] === "string" ? composed["section_3_necessity_proportionality:2"] : null,
  },
  {
    // DETERMINATION — count-based; the register itself is the detail, this states what exists.
    label: "Design risk",
    authority: "GDPR Art. 35(7)(c)–(d); Recitals 75–76",
    reportDetermination: ({ tables }) => {
      const n = tableRowCount(tables, ["risk_register.design"]);
      if (!n) return null;
      return `The Company’s ${n === 1 ? "1 design-stage risk is" : `${n} design-stage risks are`} recorded and assessed for likelihood and severity.`;
    },
  },
  {
    label: "Incident / misuse risk",
    authority: "GDPR Art. 35(7)(c)–(d); Art. 32; Recitals 75–76",
    reportDetermination: ({ tables }) => {
      const n = tableRowCount(tables, ["risk_register.incident"]);
      if (!n) return null;
      return `The Company’s ${n === 1 ? "1 identified risk is" : `${n} identified risks are`} assessed for likelihood, severity, and the rights affected.`;
    },
  },
  {
    // DETERMINATION — reuse composeRiskLead's existing condensed sentence.
    label: "Overall risk, safeguards, and residual position",
    authority: "GDPR Art. 35(7)(c)–(d); Recitals 75–76",
    reportDetermination: ({ composed }) =>
      typeof composed["section_4_risk_management:6"] === "string" ? composed["section_4_risk_management:6"] : null,
  },
  {
    // DESCRIPTIVE — quoting the DPO's own recorded advice, not a legal determination this tool reaches itself.
    label: "DPO advice",
    authority: "GDPR Art. 35(2); Art. 39(1)(c)",
    reportDetermination: ({ values }) => (typeof values.DPO_ADVICE_SENTENCE === "string" ? values.DPO_ADVICE_SENTENCE : null),
  },
  {
    label: "Views of data subjects / representatives",
    authority: "GDPR Art. 35(9)",
    reportDetermination: ({ values }) => (typeof values.dataSubjectsViews === "string" ? values.dataSubjectsViews : null),
  },
  {
    // DETERMINATION — reuse composeSignoffLead's existing condensed sentence rather than the full sign-off body (basis, scope note, review window).
    label: "Approval / decision",
    authority: "GDPR Arts. 5(2), 24, 35(1), 35(11); EDPB DPIA Template v1.0 as structural guidance",
    reportDetermination: ({ composed }) =>
      typeof composed["section_6_conclusion:2"] === "string" ? composed["section_6_conclusion:2"] : null,
  },
  {
    // DETERMINATION — already a single well-formed sentence (composeArt36Sentence).
    label: "Prior consultation",
    authority: "GDPR Art. 36(1)–(3)",
    reportDetermination: ({ values }) => (typeof values.ART36_SENTENCE === "string" ? values.ART36_SENTENCE : null),
  },
  {
    // INVERSE pattern — this factor exists specifically to name what is missing; count-based, drawn from the same gap ledger the body renders.
    label: "Outstanding matters / record gaps",
    authority: "Primary authority for the affected factor; GDPR Art. 5(2) and Art. 24 for accountability context",
    reportDetermination: ({ tables }) => {
      const n = tableRowCount(tables, ["gap_ledger"]);
      if (!n) return null;
      return n === 1
        ? "The Company has not yet supplied the information needed to resolve 1 open point in this assessment, recorded above."
        : `The Company has not yet supplied the information needed to resolve ${n} open points in this assessment, recorded above.`;
    },
  },
];

/** Appendix A — {{DERIVED.factor_input_determination_authority_matrix}}. Suppresses uncomposed factors (no-padding law); never prints N/A.
 *
 * WAVE C2 (doc 62 §11's R1 amendment, doc 57 §3 S3 sweep): a factor with a
 * ratified `trail_impact` tag on the DPIA CAM carries it in the authority
 * cell (one representative row per factor, per the R2 admission rule —
 * mirrors risk-skeleton-assemble.ts's buildFactorAuthorityMatrixTable). */
function buildDpiaFactorAuthorityMatrixTable(
  report: Bag,
  intake: Bag,
  values: SlotValues,
  composed: ComposedBlocks,
  tables: ReturnType<typeof buildDpiaTablesBySurface>,
): RenderedTable | null {
  const rowsOut: string[][] = [];
  for (const spec of DPIA_MATRIX_ROWS) {
    const determination = spec.reportDetermination({ report, intake, values, composed, tables });
    if (!determination) continue;
    const tagged = DPIA_CORPUS_MAP.rows.find((r) => r.factor_id === spec.label && r.trail_impact);
    const authority = tagged?.trail_impact ? `${spec.authority}; ${tagged.trail_impact}` : spec.authority;
    rowsOut.push([spec.label, determination, authority]);
  }
  if (rowsOut.length === 0) return null;
  return {
    key: "",
    surface: "factor_authority_matrix",
    // Left empty: the section heading already prints the full Appendix A
    // title, so a second title line on the table itself would repeat it.
    title: "",
    columns: ["Factor", "Report Determination", "Primary Authority"],
    rows: rowsOut,
  };
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

/**
 * PROMPT 12J — the Section 4 design-risks intro is render-conditional on its
 * table. Returns the spine sections unchanged when the design table renders;
 * otherwise a shallow copy in which the intro block carries empty text (the
 * renderer's no-padding rule then drops it). No spine bytes are modified.
 */
const DESIGN_TABLE_SURFACE = "risk_register.design";

export function renderSectionsWithConditionalDesignIntro(
  tables: ReturnType<typeof buildDpiaSkeletonTables>,
): typeof DPIA_SKELETON_SECTIONS {
  // deno-lint-ignore no-explicit-any
  const out = (DPIA_SKELETON_SECTIONS as any[]).map((section) => {
    // deno-lint-ignore no-explicit-any
    const blocks = section.blocks as any[];
    const designIdx = blocks.findIndex(
      (b) => b.kind === "table" && String(b.text).trim() === DESIGN_TABLE_SURFACE,
    );
    if (designIdx < 1) return section;
    const t = tables[`${section.id}:${designIdx}`];
    const renders = !!t && Array.isArray(t.rows) && t.rows.length > 0;
    if (renders) return section;
    const introIdx = designIdx - 1;
    if (blocks[introIdx]?.kind !== "skeleton") return section;
    const next = blocks.slice();
    next[introIdx] = { ...blocks[introIdx], text: "" };
    return { ...section, blocks: next };
  });
  return out as typeof DPIA_SKELETON_SECTIONS;
}

export function assembleDpiaSkeletonDocument(report: Bag, intakeInput: Bag): DpiaSkeletonResult {
  const intake = intakeInput ?? {};
  const rawValues = buildDpiaSlotValues(intake);
  const values: SlotValues = Object.fromEntries(
    Object.entries(rawValues).map(([k, v]) => [k, typeof v === "string" ? repairDpiaPlaceholders(v) : v]),
  ) as SlotValues;
  
  // Bound to the typed surface, so it is composed from the report, not the intake.
  (values as Bag).ART36_SENTENCE = repairDpiaPlaceholders(composeArt36Sentence(report));

  // PROMPT 8 — typed surfaces rendered as tables. NO-PADDING LAW: a surface
  // with no rows yields null and the renderer drops the block entirely.
  const tables = buildDpiaSkeletonTables(report, intake);

  // PROMPT 12J (CEO-ruled 2026-08-17) — the Section 4 design-risks INTRO
  // renders IF AND ONLY IF the design-risks table renders. The conditional
  // lives HERE, assembler-side: the spine and its serialization/hashes are
  // untouched, and the ratified sentence bytes are unchanged. When the record
  // carries no design-class risk row, the intro block's text is blanked for
  // this render only, and the renderer drops it under the same no-padding law
  // its table already follows. Block INDICES are preserved, so every composed
  // key and table key still points at the same block.
  const sectionsForRender = renderSectionsWithConditionalDesignIntro(tables);


  const composedRaw: ComposedBlocks = {
    // PROMPT 8D (spine v4.2): the executive lead block is deleted, so the body
    // is block index 1 and carries the closing decision sentence itself.
    "executive_summary:1": composeExecutiveBody(report, intake),


    // PROMPT 8 (spine v4) — the v3 sections `lawfulness`,
    // `risks_and_measures` and `consultation_and_signoff` are retired; the same
    // ratified composers are re-homed onto the EDPB sections.
    // PROMPT 9I.1 item 2 / item 6 — the composed keys are re-pinned to the
    // spine BLOCK INDICES. Section 3: 0 skeleton, 1 generated (the 9L
    // four-step composition), 2 lead (determination LAST), 3 skeleton, 4 table.
    // PROMPT 9L.1 item 5 — Section 4 gains the relocated design-risks intro and
    // table at 0-1, so it is: 0 skeleton (design intro), 1 table (design),
    // 2 skeleton, 3 table, 4 table, 5 generated (per-risk analysis),
    // 6 lead (the most-significant-remaining-risk summary, closing paragraph).
    // PROMPT 9L item 2 — the §3 neutral lead is RETIRED and no longer composed.
    "section_3_necessity_proportionality:1": composeNecessityBody(report, intake),
    "section_3_necessity_proportionality:2": composeNecessityDetermination(report),

    "section_4_risk_management:5": composeRiskBody(report, values, intake),
    "section_4_risk_management:6": composeRiskLead(report),


    "section_6_conclusion:2": composeSignoffLead(report, intake),
    "section_6_conclusion:3": composeSignoffBody(report, intake, values),
  };
  const composed: ComposedBlocks = Object.fromEntries(
    Object.entries(composedRaw).map(([k, v]) => [k, typeof v === "string" ? repairDpiaPlaceholders(v) : v]),
  ) as ComposedBlocks;

  // PROMPT 9H item 3 — the PDF header names the regime the record is under.
  // PROMPT 9H.1 item 2 — selected from two ratified spine constants; the
  // render-time .replace over a ratified constant is removed.
  const regime = readDpiaRegime(intake);
  const subtitle = regime === "UK" ? DPIA_SKELETON_SUBTITLE_UK : DPIA_SKELETON_SUBTITLE_EU;

  // v4.6 — Appendix A replaces the Table of Authorities. It is assembled
  // directly from the same composed blocks, slot values, and rendered
  // tables that already produce the body, so (unlike the ToA) it needs no
  // draft/iff-cited two-pass render. The matrix rows key by SURFACE NAME
  // ("legal_basis", "risk_register.design", ...), not by the positional
  // "section:index" keys `tables` above carries for the renderer, so it is
  // built from a separately surface-keyed bag.
  const tablesBySurface = buildDpiaTablesBySurface(report, intake);
  const matrixTable = buildDpiaFactorAuthorityMatrixTable(report, intake, values, composed, tablesBySurface);
  const tablesWithMatrix = { ...tables, "table_of_authorities:1": matrixTable };

  const document = renderSkeletonDocument({
    sections: sectionsForRender,
    title: DPIA_SKELETON_TITLE,
    subtitle,
    spineVersion: DPIA_SKELETON_VERSION,
    values,
    composed,
    tables: tablesWithMatrix,
  });

  const body = skeletonDocumentToText(document).toLowerCase();
  const register_findings = DPIA_V3_BANNED_REGISTER.filter((b) => body.includes(b));

  return {
    document,
    conformance: verifySkeletonConformance(document, sectionsForRender),
    register_findings,
  };
}
