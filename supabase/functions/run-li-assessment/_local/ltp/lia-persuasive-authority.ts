// LIA L2 — THE PERSUASIVE AUTHORITY SECTION (the S5 surface, 2026-08-26).
//
// Composes the skeleton's Persuasive Authority section from (a) the
// render-eligible AP rows of the CAM (their display blocks are the ratified
// bytes, transcribed verbatim), (b) the precedent-class posture's cited
// decisions where the posture fired (labels composed deterministically from
// the typed authority fields — the Factor-Bearing Law's trail), and (c) the
// doc-63 §6.2 adverse-outcome warning when the typed balancing verdict is
// likely_fails. Deduped by source row. Deterministic, pure; rendered ONLY on
// the deterministic path (the assembler gates the composition), so the
// legacy model path is byte-untouched.
//
// DOC 189 (2026-09-05, CEO-approved scoring) — RELEVANCE RANKING. The AP
// rows no longer render unconditionally: each render-eligible row is scored
// against the record's TYPED states through its curation-time relevance
// profile (lia-relevance-profiles.ts; scorer _shared/corpus/cam-relevance.ts):
// use-case class, the three-part-test elements the authority bears on and
// whether the record leaves them open, the data-subject relationship, shared
// data categories, cross-cutting flags, and the instrument (EU GDPR / UK GDPR
// — a UK-only record is served cross-instrument, labelled, while the UK pool
// is empty). Rows scoring zero do not render; the top five do, each closing
// with ONE template relevance sentence stating the matched attributes
// (approved form, doc 189 §2.4: "Relevance (highly relevant): bears on
// necessity and balancing for employee monitoring; decided under the EU
// GDPR."). No text similarity, no runtime query, no model call — a pure
// function of the pinned map, the profiles and the typed record.
//
// SINGLE-DOOR LAW: this module reads the ePrivacy state from the engagement
// map's R_EPRIVACY_PECR entry, never from the gate finding itself (the typed
// engine's override is the gate's one render door — eprivacy-gate.test.ts).
//
// Every entry's authority_label is also returned as a ledger citation so
// the Table of Authorities lists it (iff-cited: the label string appears
// verbatim in this section's body).

import { LIA_CORPUS_MAP } from "../corpus/maps/lia-corpus-map.ts";
import { liaElementOf, liaProfileOf } from "../corpus/maps/lia-relevance-profiles.ts";
import { LIA_PRECEDENT_CLASS_RATIFIED } from "./lia-deliverables/precedent-classes.ts";
import {
  rankByRelevance,
  type RelevanceInstrument,
  type RelevanceQuery,
  type ScoredRow,
} from "../../../_shared/corpus/cam-relevance.ts";
import type { CamRelevanceProfile } from "../../../_shared/corpus/cam-types.ts";
import { classifyLiaUseCase, USE_CASE_LABELS } from "../../../_shared/lia/lia-use-case-classifier.ts";

type Bag = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map(s).filter(Boolean) : []);
const stop = (t: string): string => (t ? (/[.!?]$/.test(t) ? t : `${t}.`) : "");

export const LIA_PERSUASIVE_AUTHORITY_STAMP = "lia-persuasive-authority@doc189-relevance-2026-09-05";

/** The section renders at most this many ranked enforcement authorities. */
export const LIA_PERSUASIVE_AUTHORITY_LIMIT = 5;

/** The section lead — ratified bytes (CEO-delegated, 2026-08-26 ledger).
 *  Byte-frozen: DOC 207 §3 never edits this constant. */
export const LIA_PERSUASIVE_AUTHORITY_LEAD =
  "This section collects enforcement decisions issued under the GDPR or UK GDPR that bear on factors assessed in this report. Each entry names the factor it bears on. They are enforcement context, persuasive rather than binding as to this processing, and none decides the outcome recorded above, which turns on the facts the company has provided.";
// DOC 161 (2026-09-03) — "this record's own facts" reached the page as "the
// information provided's own facts": the shared renderer's register repair
// rewrites "on this record"; the bytes now say what they mean directly.

// DOC 207 §3 — once a ratified rule fires, this section also carries
// determinative authorities ahead of the ranked persuasive candidates
// (below). `LIA_RULES_LEAD_RATIFIED` gates whether the amended lead below
// replaces the byte-frozen one; false today (LIA_RULES ships empty), so
// `LIA_PERSUASIVE_AUTHORITY_LEAD` above is what every live report renders.
// [RATIFY] when the CEO ratifies the first rule — see 207A-WIRING-LOG.
export const LIA_RULES_LEAD_RATIFIED = false;
export const LIA_PERSUASIVE_AUTHORITY_LEAD_WITH_RULES =
  "This section collects the authorities that bear on factors assessed in this report. Determinative authorities are named first; each names the finding it determines. Every other entry is enforcement context, persuasive rather than binding as to this processing, and none of those persuasive entries decides the outcome recorded above, which turns on the facts the company has provided.";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function humanDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

interface PersuasiveEntry {
  readonly source_row_id: string;
  readonly text: string;
  readonly label: string;
}

// ── The relevance query (typed states → scorer input) ────────────────────────

const PASSING_VERDICTS = new Set(["passes", "likely_passes"]);

function elementState(verdict: string): "passing" | "live" | "absent" {
  if (!verdict) return "absent";
  return PASSING_VERDICTS.has(verdict) ? "passing" : "live";
}

const RELATIONSHIP_CATEGORY: Readonly<Record<string, CamRelevanceProfile["relationship"]>> = {
  "Customer": "customer",
  "Employee": "employee",
  "Prospect": "prospect",
  "Member of the public — no relationship": "public",
  "Existing customer": "customer",
  "Prospective customer": "prospect",
  "Former employee": "employee",
  "Website visitor (no account)": "public",
  "B2B contact": "prospect",
  "Member of the public": "public",
};

const SPECIAL_CATEGORY_LABELS = new Set(["Special category data", "Health or medical data", "Biometric data"]);

/** Instrument the record is assessed under: EU where the EU is among the
 *  recorded jurisdictions (the EU pool serves a dual EU/UK record), UK where
 *  the UK stands alone, EU otherwise. */
export function liaInstrumentOf(intake: Bag): RelevanceInstrument {
  const jur = strs(intake.jurisdictions);
  if (jur.includes("EU (GDPR)")) return "EU GDPR";
  if (jur.includes("United Kingdom (UK GDPR)")) return "UK GDPR";
  return "EU GDPR";
}

/**
 * Build the scorer query from the report's typed states and the intake's
 * closed-list facts. Pure; reads no gate finding (the ePrivacy flag comes
 * from the engagement map's R_EPRIVACY_PECR entry).
 */
export function buildLiaRelevanceQuery(report: Bag, intake: Bag): RelevanceQuery {
  const tpt = bag(report.three_part_test);
  const states = {
    purpose: elementState(s(bag(tpt.purpose_test).verdict) || s(bag(report.interest_legitimacy).verdict)),
    necessity: elementState(s(bag(tpt.necessity_test).verdict)),
    balancing: elementState(s(bag(tpt.balancing_test).verdict)),
  };
  const live = new Set<string>();
  const passing = new Set<string>();
  for (const f of LIA_CORPUS_MAP.rows.map((r) => r.factor_id)) {
    const el = liaElementOf(f);
    if (!el) continue;
    if (states[el] === "live") live.add(f);
    else if (states[el] === "passing") passing.add(f);
  }

  const posture = bag(report.precedent_class_posture);
  const useCase = s(posture.use_case_class) || classifyLiaUseCase(s(intake.processing_description));

  const balancing = bag(intake.balancing_details);
  const relationship = RELATIONSHIP_CATEGORY[s(balancing.relationship_category)] ??
    RELATIONSHIP_CATEGORY[s(intake.relationship_type)] ?? null;

  const dataCategories = new Set(strs(intake.data_categories));

  const flags = new Set<string>();
  if (balancing.special_category_data === true || [...dataCategories].some((c) => SPECIAL_CATEGORY_LABELS.has(c))) {
    flags.add("special_category");
  }
  if (s(bag(report.child_factor).determination) === "children_in_scope" || s(balancing.children_data_subjects) === "Yes") {
    flags.add("children");
  }
  const eprivacy = (Array.isArray(bag(report.engagement_map).entries) ? bag(report.engagement_map).entries as unknown[] : [])
    .map((e) => bag(e)).find((e) => s(e.rule_id) === "R_EPRIVACY_PECR");
  if (eprivacy && (s(eprivacy.status) === "engaged" || s(eprivacy.status) === "conditional")) {
    flags.add("eprivacy_terminal_equipment");
  }
  if (useCase === "direct_marketing") flags.add("electronic_marketing");
  const pa = bag(report.public_authority_exclusion);
  // DOC 207 ledger B3-6 — the real PublicAuthorityDetermination union
  // (types.ts:89-92) never carries "excluded"; the affirmative value is
  // "exclusion_applies" (206B0 §1.5's dead-branch note). This was a dead
  // condition before this fix — the flag fired only via basis_unavailable.
  if (s(pa.determination) === "exclusion_applies" || pa.basis_unavailable === true) flags.add("public_authority");
  if (bag(report.scale_frequency_duration).large_scale_indicated === true) flags.add("large_scale");
  // DOC 207 ledger B3-7 — `automated_decision` was previously a display
  // label only (FLAG_LABELS below) with no derivation anywhere in this
  // function; report.automated_decision_analysis was never read. Any
  // engaged regime (eu/uk/dual) sets the flag; "not_engaged" does not.
  const admRegime = s(bag(report.automated_decision_analysis).regime);
  if (admRegime && admRegime !== "not_engaged") flags.add("automated_decision");

  return {
    instrument: liaInstrumentOf(intake),
    use_case_class: useCase && useCase !== "other" ? useCase : null,
    live_factor_ids: live,
    passing_factor_ids: passing,
    relationship,
    data_categories: dataCategories,
    flags,
  };
}

// ── The template relevance sentence (approved form, doc 189 §2.4) ────────────

const ELEMENT_ORDER = ["purpose", "necessity", "balancing"] as const;
const FLAG_LABELS: Readonly<Record<string, string>> = {
  special_category: "special-category data",
  children: "children's data",
  eprivacy_terminal_equipment: "device access under the ePrivacy rules",
  electronic_marketing: "electronic marketing",
  public_authority: "a public-authority controller",
  large_scale: "large-scale processing",
  automated_decision: "automated decision-making",
};

function joinAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function relevanceSentence(scored: ScoredRow, query: RelevanceQuery): string {
  const m = scored.match;
  const elements = ELEMENT_ORDER.filter((e) => m.live_elements.includes(e) || m.passing_elements.includes(e));
  const clauses: string[] = [];
  const classLabel = m.class_matched && scored.profile.use_case_class
    ? ` for ${(USE_CASE_LABELS[scored.profile.use_case_class] ?? scored.profile.use_case_class).toLowerCase()}`
    : "";
  if (elements.length > 0) {
    const open = ELEMENT_ORDER.filter((e) => m.live_elements.includes(e));
    clauses.push(
      `bears on ${joinAnd(elements)}${classLabel}${
        open.length > 0 ? `, which this assessment leaves open on ${joinAnd(open)}` : ""
      }`,
    );
  } else if (classLabel) {
    clauses.push(`the same use case${classLabel.replace(/^ for /, ": ")}`);
  }
  if (m.relationship_matched && scored.profile.relationship) {
    clauses.push(`the same ${scored.profile.relationship} relationship`);
  }
  if (m.data_categories.length > 0) {
    clauses.push(`shared data categories (${m.data_categories.join(", ")})`);
  }
  if (m.flags.length > 0) {
    clauses.push(joinAnd(m.flags.map((f) => FLAG_LABELS[f] ?? f)));
  }
  const cross = m.cross_instrument
    ? `, offered as cross-instrument context because no ${query.instrument} authority is yet in the corpus`
    : "";
  return `Relevance (${scored.tier}): ${clauses.join("; ")}; decided under the ${scored.profile.instrument}${cross}.`;
}

// ── Entries ──────────────────────────────────────────────────────────────────

function apEntries(
  query: RelevanceQuery,
  // DOC 207 §3 — a source row already carrying a determinative rule
  // citation is removed from the ranked persuasive candidates before
  // ranking runs, so it can never also occupy one of the top-5 relevance
  // slots as merely persuasive (the same authority never appears twice).
  excludeSourceIds: ReadonlySet<string> = new Set(),
): { entries: PersuasiveEntry[]; ranked: ScoredRow[] } {
  const candidateRows = excludeSourceIds.size
    ? LIA_CORPUS_MAP.rows.filter((r) => !excludeSourceIds.has(r.source_row_id))
    : LIA_CORPUS_MAP.rows;
  const ranked = rankByRelevance(candidateRows, query, {
    profileOf: liaProfileOf,
    elementOf: liaElementOf,
    limit: LIA_PERSUASIVE_AUTHORITY_LIMIT,
  });
  const entries = ranked.map((sr) => {
    const r = sr.row;
    const d = r.display!;
    return {
      source_row_id: r.source_row_id,
      label: d.authority_label,
      text: `${d.matter}. ${d.what_happened} Bears on ${r.factor_id.toLowerCase()}: ${d.bearing} (${d.authority_label}.) ${
        relevanceSentence(sr, query)
      }`,
    };
  });
  return { entries, ranked };
}

function precedentEntries(report: Bag): PersuasiveEntry[] {
  if (!LIA_PRECEDENT_CLASS_RATIFIED) return [];
  const finding = bag(report.precedent_class_posture);
  if (s(finding.status) !== "analysed") return [];
  if (!s(finding.posture) || s(finding.posture) === "not_assessed") return [];
  const authorities = Array.isArray(finding.authorities) ? finding.authorities as Bag[] : [];
  const factors = Array.isArray(finding.factor_ids)
    ? (finding.factor_ids as string[]).join("; ").toLowerCase()
    : "";
  return authorities.map((a) => {
    const label = `${s(a.regulator)}, ${s(a.subject)}, decision of ${humanDate(s(a.decision_date))}${
      s(a.case_reference) ? `, ref. ${s(a.case_reference)}` : ""
    } — persuasive authority`;
    return {
      source_row_id: s(a.source_row_id),
      label,
      text: `${s(a.regulator)} — ${s(a.subject)} (${s(a.decision_date).slice(0, 4)}). ${
        s(a.what_happened)
      }${factors ? ` Bears on ${factors}.` : ""} (${label}.)`,
    };
  });
}

// ── DOC 207 §3 — determinative / contrary-authority entries ──────────────
//
// Sourced from `report.rule_applications` (rule-pass.ts's application
// trail — empty until LIA_RULES ships a ratified row). Untyped `Bag`
// reads throughout: this file is not one of the doors the doc 206/207
// import boundary allows onto `rule-types.ts` (that is rule-pass.ts, a
// product's rule-states builder, its generated rules map, gate files, and
// tests — a renderer is none of those), so `RuleApplication`'s shape is
// read structurally, the same way every other report field in this module
// already is.

/** The effect kinds whose LANDED application is "determinative" — it
 *  actually set or capped a verdict or the outcome. `require_condition`
 *  and `flag_risk` are additive asks/notes, not determinations, and
 *  surface instead through `renderRuleClause` (lia-skeleton-assemble.ts)
 *  and `information_needed` — never here. */
const DETERMINATIVE_KINDS = new Set(["override_outcome", "cap_verdict", "route_to_basis", "recognise_interest", "precedent_verdict"]);

function firstSourceRowId(app: Bag): string {
  const sources = Array.isArray(app.sources) ? app.sources as Bag[] : [];
  return sources.length ? s(sources[0].row_id) : "";
}

/** One entry per fired rule's primary source, in application order (the
 *  order rule-pass.ts's applications trail already carries — fixed
 *  kind-then-rule_id order, per rule-interpreter.ts). */
function determinativeEntries(applications: readonly Bag[]): PersuasiveEntry[] {
  const out: PersuasiveEntry[] = [];
  for (const raw of applications) {
    const app = bag(raw);
    const eff = bag(app.effect);
    if (!DETERMINATIVE_KINDS.has(s(eff.kind))) continue;
    if (app.suppressed_by) continue;
    if (!(app.changed === true || app.concurred === true)) continue;
    const element = s(eff.element) || "outcome";
    const citation = s(app.authority_citation);
    const label = `${citation} — determinative: see ${element} finding.`;
    out.push({
      source_row_id: firstSourceRowId(app),
      label,
      text: `${stop(s(app.reason_sentence))} (${label})`,
    });
  }
  return out;
}

/** A favorable rule a same-element adverse rule suppressed this pass
 *  (`contrary_authority`, set only by rule-interpreter.ts's cap_verdict
 *  suppression path) — included in the persuasive list, never the
 *  determinative one, since its own effect never actually applied. */
function contraryAuthorityEntries(applications: readonly Bag[]): PersuasiveEntry[] {
  const out: PersuasiveEntry[] = [];
  for (const raw of applications) {
    const app = bag(raw);
    if (app.contrary_authority !== true) continue;
    const citation = s(app.authority_citation);
    const label = `${citation} — contrary authority (persuasive)`;
    out.push({
      source_row_id: firstSourceRowId(app),
      label,
      text: `${stop(s(app.reason_sentence))} (${label})`,
    });
  }
  return out;
}

export interface LiaRankedAuthority {
  readonly row_id: string;
  readonly source_row_id: string;
  readonly score: number;
  readonly tier: ScoredRow["tier"];
  readonly cross_instrument: boolean;
}

export interface LiaPersuasiveAuthorityResult {
  /** The composed section body ("" when nothing renders). */
  readonly body: string;
  /** Authority labels for the ToA ledger (iff-cited by the body). */
  readonly ledger: readonly string[];
  readonly entry_count: number;
  readonly aow_fired: boolean;
  /** DOC 189 — the ranking that produced the AP entries (telemetry/tests). */
  readonly ranked: readonly LiaRankedAuthority[];
}

export interface LiaPersuasiveContext {
  /** The intake record — the closed-list facts the query reads
   *  (jurisdictions, data_categories, relationship). Omitted → the query is
   *  built from the report alone (no relationship / category matches). */
  readonly intake?: Bag;
}

/**
 * `balancingFails` is the code-computed "balancing_fails" state (the typed
 * balancing verdict === "likely_fails") — the AOW's render_when, satisfied
 * per the render-readiness law only now that the verdict is typed.
 */
export function buildLiaPersuasiveAuthority(
  report: Bag,
  balancingFails: boolean,
  ctx: LiaPersuasiveContext = {},
): LiaPersuasiveAuthorityResult {
  const query = buildLiaRelevanceQuery(report, bag(ctx.intake));

  // DOC 207 §3 — rule_applications is empty until LIA_RULES ships a
  // ratified row (rule-pass.ts), so `determinative`/`contrary` are always
  // [] today and every branch below degrades to the doc 189 behavior.
  const applications = Array.isArray(report.rule_applications) ? report.rule_applications as Bag[] : [];
  const determinative = determinativeEntries(applications);
  const contrary = contraryAuthorityEntries(applications);
  const determinativeSourceIds = new Set(determinative.map((e) => e.source_row_id).filter(Boolean));

  const ap = apEntries(query, determinativeSourceIds);
  const precedent = precedentEntries(report).filter((e) => !determinativeSourceIds.has(e.source_row_id));

  const seen = new Set<string>();
  const entries: PersuasiveEntry[] = [];
  // Determinative authorities list FIRST, ahead of the ranked persuasive
  // candidates; contrary-authority entries join the persuasive tail.
  for (const e of [...determinative, ...ap.entries, ...precedent, ...contrary]) {
    if (seen.has(e.source_row_id)) continue;
    seen.add(e.source_row_id);
    entries.push(e);
  }
  const ranked: LiaRankedAuthority[] = ap.ranked.map((sr) => ({
    row_id: sr.row.id,
    source_row_id: sr.row.source_row_id,
    score: sr.score,
    tier: sr.tier,
    cross_instrument: sr.match.cross_instrument,
  }));
  if (entries.length === 0) return { body: "", ledger: [], entry_count: 0, aow_fired: false, ranked };

  const aow = LIA_CORPUS_MAP.rows.find((r) => r.role === "AOW" && r.render_eligible && r.warning_text);
  const aowFires = balancingFails && !!aow;

  const lead = LIA_RULES_LEAD_RATIFIED ? LIA_PERSUASIVE_AUTHORITY_LEAD_WITH_RULES : LIA_PERSUASIVE_AUTHORITY_LEAD;
  const parts: string[] = [lead, ...entries.map((e) => e.text)];
  if (aowFires && aow?.warning_text) parts.push(aow.warning_text);

  return {
    body: parts.join("\n\n"),
    ledger: entries.map((e) => e.label),
    entry_count: entries.length,
    aow_fired: aowFires,
    ranked,
  };
}
