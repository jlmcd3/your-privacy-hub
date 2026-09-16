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
import type { CamRelevanceProfile, CamRow } from "../../../_shared/corpus/cam-types.ts";
import { resolveLiaUseCase, USE_CASE_LABELS } from "../../../_shared/lia/lia-use-case-classifier.ts";
// DOC 213 TRACK H2 — offline analogy hooks, dark behind LIA_HOOKS_ENABLED
// (default false; LIA_HOOKS ships [] until the first ratified row, so the
// block below is a no-op in production today regardless of the flag). This
// file is not one of the doors the doc 206/207 import boundary allows onto
// rule-types.ts (see that file's own header comment) — `TypedStateBag` is
// imported here as a TYPE ONLY, re-exported by hook-join.ts (an allowed
// door) rather than from rule-types.ts directly, exactly the same
// structural-read discipline this file already applies to `RuleApplication`
// below.
import { LIA_HOOKS_ENABLED } from "./lia-hooks-flag.ts";
import { LIA_HOOKS } from "../corpus/maps/lia-hooks.ts";
import {
  applyLiaHooks,
  LIA_HOOK_OMIT_REASONS,
  planLiaHookSelection,
  type LiaHookSelectionPlan,
  type TypedStateBag,
} from "./lia-deliverables/hook-join.ts";
// DOC 224 — the selection map type only (the pure half of the two-leg
// pass; no model client — the doc 217 boundary walk reaches it from here).
import type { HookSelectionMap } from "../../../_shared/corpus/hook-selection.ts";
// DOC 213B TRACK H3 — profile-backed persuasive candidates. `AuthorityHook`
// is declared in `_shared/corpus/hook-types.ts`, which this file is already
// one of the two sanctioned doors onto (that module's own header comment:
// "a product's persuasive-authority renderer consuming a hook-join result
// under its own _HOOKS_ENABLED flag"). A type-only import — no executable
// hook-types.ts code is called from here beyond the type itself.
import type { AuthorityHook } from "../../../_shared/corpus/hook-types.ts";

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
// TEXT ratified 2026-09-07 (doc 206C §E item 3 / doc 210 ledger, CEO's own
// wording, verbatim). The FLAG below still gates when it goes live — per
// this file's original note, that flip happens with the first live rule
// (LIA_DETERMINISTIC_ENABLED), not merely on text ratification.
// [RATIFY] flip this flag with the first live rule — see 207A-WIRING-LOG.
export const LIA_RULES_LEAD_RATIFIED = false;
export const LIA_PERSUASIVE_AUTHORITY_LEAD_WITH_RULES =
  "This section collects the authorities that bear on factors assessed in this report. The most relevant authorities are named first; each names the finding it determines. Every other entry is further enforcement background relevant to this assessment based on the facts the company has provided.";

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
  const useCase = s(posture.use_case_class) || resolveLiaUseCase(intake);

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

// ── DOC 213B — hook-backed ranking candidates ─────────────────────────────
//
// A ratified hook is a self-contained persuasive candidate (its own
// `relevance` block, doc 213B §1.1): `hookCandidateRows` projects each one
// onto a synthetic `CamRow` so it competes in the SAME relevance ranking as
// the map's hand-curated AP rows (`LIA_PERSUASIVE_AUTHORITY_LIMIT`, the join
// caps) — never a separate, unranked channel. The synthetic row's `display`
// text is filled only so it satisfies `apEntries`' shared construction below
// (every field that code touches, nothing else); THAT TEXT NEVER REACHES A
// CUSTOMER — `buildLiaPersuasiveAuthority` renders a hook-backed entry only
// when `hook-join.ts`'s `applyLiaHooks` actually produced an application for
// it (doc 213B §1.3), and drops it otherwise, however far it ranked.

const KNOWN_HOOK_RELATIONSHIPS: ReadonlySet<string> = new Set(["employee", "customer", "prospect", "public", "child"]);
const KNOWN_HOOK_INSTRUMENTS: ReadonlySet<string> = new Set(["EU GDPR", "UK GDPR", "EU GDPR (pre-2021 UK)", "Directive 95/46"]);
const KNOWN_CAM_SOURCE_TABLES: ReadonlySet<string> = new Set([
  "cppa_fsor_commentary",
  "cppa_authorities",
  "provision_texts",
  "edpb_guidelines",
  "gdpr_articles",
  "gdpr_recitals",
  "enforcement_actions",
]);

/** Build the `CamRelevanceProfile` the scorer needs from a hook's own
 *  `relevance` block. `country` has no hook-vocabulary equivalent and is
 *  never read by `scoreRelevance`/`relevanceSentence` — left "". A
 *  `relationship`/`instrument` value outside the CAM-typed union degrades to
 *  null/"EU GDPR" (never scores a false match, never throws) rather than
 *  reject the whole hook — the same "never trust an atom blindly" posture
 *  hook-join.ts already applies to a hook's atoms. */
function hookRelevanceProfile(hook: AuthorityHook): CamRelevanceProfile {
  const rel = hook.relevance;
  const relationship = rel.relationship !== null && KNOWN_HOOK_RELATIONSHIPS.has(rel.relationship)
    ? (rel.relationship as CamRelevanceProfile["relationship"])
    : null;
  const instrument = KNOWN_HOOK_INSTRUMENTS.has(rel.instrument)
    ? (rel.instrument as CamRelevanceProfile["instrument"])
    : "EU GDPR";
  return {
    country: "",
    instrument,
    factor_ids: rel.factor_ids,
    use_case_class: rel.use_case_class,
    // `rel.outcome_posture` is expected to always equal `hook.posture`
    // (hook-types.ts's own doc comment) — `hook.posture` is used here
    // because it is already typed to the exact union CamRelevanceProfile
    // declares, with no further narrowing needed.
    outcome_posture: hook.posture,
    relationship,
    data_categories: rel.data_categories,
    flags: rel.flags,
  };
}

/** `enforcement_actions:<row_id>:v<n>` is the shipped `hook_id` form
 *  (213A-TRACK-H2-BUILD-LOG-2026-09-07.md's Lovable message, item A) — the
 *  prefix names the CAM `source_table`. An unrecognised or missing prefix
 *  degrades to "enforcement_actions" (every first-batch source is one,
 *  doc 213 §3) rather than reject the hook outright. */
function sourceTableForHookId(hookId: string): CamRow["source_table"] {
  const prefix = hookId.slice(0, hookId.indexOf(":"));
  return (KNOWN_CAM_SOURCE_TABLES.has(prefix) ? prefix : "enforcement_actions") as CamRow["source_table"];
}

/**
 * One synthetic `CamRow` per hook eligible to become a NEW ranking
 * candidate. A hook is excluded from `rows` (never duplicated, never
 * suppressed twice) when:
 *   - its `source_row_id` is already cited as a fired rule's determinative
 *     authority (`excludeSourceIds`) — the same exclusion the map's own
 *     rows already receive, applied symmetrically (doc 213B §1.3's
 *     "determinative suppression stands");
 *   - its `source_row_id` is already a render-eligible CAM AP row — "the
 *     CAM row wins on duplicate source_row_id" (doc 213B §1.2). The hook
 *     itself is NOT excluded from `applyLiaHooks`'s own input in this case
 *     — that is what lets it re-text the existing CAM entry (H2 behaviour).
 * `hookSourceIds` names every source_row_id a synthetic row was built for,
 * so the caller can tell a hook-backed candidate from a CAM one after
 * ranking (a hook-backed entry with no join application is dropped, never
 * rendered with this row's own display text — doc 213B §1.3).
 */
function hookCandidateRows(
  hooks: readonly AuthorityHook[],
  excludeSourceIds: ReadonlySet<string>,
): { rows: CamRow[]; profiles: ReadonlyMap<string, CamRelevanceProfile>; hookSourceIds: ReadonlySet<string> } {
  const camApSourceIds = new Set(
    LIA_CORPUS_MAP.rows
      .filter((r) => r.role === "AP" && r.render_eligible && r.display)
      .map((r) => r.source_row_id),
  );
  const rows: CamRow[] = [];
  const profiles = new Map<string, CamRelevanceProfile>();
  const hookSourceIds = new Set<string>();
  for (const hook of hooks) {
    if (excludeSourceIds.has(hook.source_row_id)) continue;
    if (camApSourceIds.has(hook.source_row_id)) continue;
    const row: CamRow = {
      id: `lia/hook/${hook.hook_id}`,
      factor_id: hook.factor_id,
      role: "AP",
      source_table: sourceTableForHookId(hook.hook_id),
      source_row_id: hook.source_row_id,
      excerpt_field: "",
      pinned_excerpt: "",
      render_eligible: true,
      render_surface: "S5",
      purpose_class: "authority",
      display: {
        matter: hook.authority_label,
        what_happened: hook.finding_paraphrase,
        bearing: hook.finding_paraphrase,
        authority_label: hook.authority_label,
        trail_cite: hook.authority_label,
      },
      direction: "neutral",
      logic_bearing: false,
      // "" rather than the actual curation date: this row is never curated,
      // never verified independently of the hook itself — the hook's own
      // ratification stamp (public.authority_hooks, doc 213 §1) is its
      // provenance, not a CAM curation pass.
      provenance: { verified_on: "" },
      curation_note:
        "DOC 213B — synthetic ranking candidate for a ratified hook (lia-persuasive-authority.ts hookCandidateRows). This row's own display text never reaches a customer: a hook-backed entry renders only when hook-join.ts's applyLiaHooks produces an application for it, and is dropped otherwise, however far it ranked.",
    };
    rows.push(row);
    profiles.set(row.id, hookRelevanceProfile(hook));
    hookSourceIds.add(hook.source_row_id);
  }
  return { rows, profiles, hookSourceIds };
}

// ── Entries ──────────────────────────────────────────────────────────────────

function apEntries(
  query: RelevanceQuery,
  // DOC 207 §3 — a source row already carrying a determinative rule
  // citation is removed from the ranked persuasive candidates before
  // ranking runs, so it can never also occupy one of the top-5 relevance
  // slots as merely persuasive (the same authority never appears twice).
  excludeSourceIds: ReadonlySet<string> = new Set(),
  // DOC 213B — ratified hooks in play for THIS render (already resolved by
  // the caller to [] when hooks are not active — see buildLiaPersuasiveAuthority).
  hooks: readonly AuthorityHook[] = [],
): { entries: PersuasiveEntry[]; ranked: ScoredRow[]; hookSourceIds: ReadonlySet<string> } {
  const baseRows = excludeSourceIds.size
    ? LIA_CORPUS_MAP.rows.filter((r) => !excludeSourceIds.has(r.source_row_id))
    : LIA_CORPUS_MAP.rows;
  const { rows: hookRows, profiles: hookProfiles, hookSourceIds } = hookCandidateRows(hooks, excludeSourceIds);
  const candidateRows = hookRows.length > 0 ? [...baseRows, ...hookRows] : baseRows;
  const profileOfRow = (row: CamRow): CamRelevanceProfile | undefined => hookProfiles.get(row.id) ?? liaProfileOf(row);
  const ranked = rankByRelevance(candidateRows, query, {
    profileOf: profileOfRow,
    elementOf: liaElementOf,
    limit: LIA_PERSUASIVE_AUTHORITY_LIMIT,
    // DOC 252 §10 item 1 (CEO-ruled 2026-09-11) — the top tier needs the
    // same use case (batch 916c33a8: Cámara reached it on a fraud record).
    topTierRequiresClassMatch: true,
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
  return { entries, ranked, hookSourceIds };
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
    // DOC 206C §E item 1 — ratified 2026-09-07 (doc 210 ledger, CEO): the
    // recommended short form, not "— determinative: see ...", since the
    // citation text itself already says "determinative authority".
    const label = `${citation} — see ${element} finding.`;
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
  /** DOC 213 — assessor flags from the hook join (`invalid_atom`,
   *  `rule_missing`, `s3_missing_distinguishing_atom`, `adverse_under_pass`,
   *  `unresolved_slot`, or a plain `omitted`). Always `[]` while the flag is
   *  off, or while `ctx.states`/`ctx.verdicts` are not supplied, or while
   *  `LIA_HOOKS` ships empty — never surfaced in the rendered body itself. */
  readonly hook_flags: readonly { hook_id: string; reason: string }[];
  /** DOC 217 §5.6 — the `hook_id`s whose join application actually
   *  RENDERED in this body (an application the post-join filters dropped is
   *  not listed). Always `[]` while hooks are off, unsupplied, or empty —
   *  the record block's `hooks.applied_ids`. */
  readonly hook_applied_ids: readonly string[];
  /** DOC 224 — the subset of `hook_applied_ids` whose agreement came from a
   *  stored two-leg selection rather than the atoms alone. */
  readonly hook_selection_ids: readonly string[];
}

export interface LiaPersuasiveContext {
  /** The intake record — the closed-list facts the query reads
   *  (jurisdictions, data_categories, relationship). Omitted → the query is
   *  built from the report alone (no relationship / category matches). */
  readonly intake?: Bag;
  /** DOC 213 — the record's typed state bag (the same shape
   *  `buildLiaRuleStates` produces), needed to evaluate a hook's atoms.
   *  Omitted → hooks are skipped entirely, even with the flag on and
   *  `LIA_HOOKS` non-empty (doc 213 §6: hook-join needs a states bag to
   *  nominate anything). */
  readonly states?: TypedStateBag;
  /** DOC 213 — the current three-part-test verdicts by element ("purpose" |
   *  "necessity" | "balancing" -> verdict string), used only for the
   *  direction matrix's own verdict check. Omitted → hooks are skipped. */
  readonly verdicts?: Record<string, string>;
  /** DOC 213B §1.5 — the test seam: inject fixture hooks directly, in place
   *  of `LIA_HOOKS` (which ships empty until the first ratified row —
   *  doc213-hook-join.test.ts's `makeHook` fixtures use exactly this field,
   *  never `LIA_HOOKS` itself, "the same seam H2's tests use on
   *  applyLiaHooks"). Omitted → `LIA_HOOKS`.
   *
   *  Supplying this field is ALSO what activates the hook block for a test,
   *  independent of `LIA_HOOKS_ENABLED`: that flag is a module-scope
   *  constant read once from `Deno.env.get` at first import
   *  (lia-hooks-flag.ts), so a test running inside the fleet's shared `deno
   *  test <dir>` process can never observe it flip to true — the very
   *  constraint 213A-TRACK-H2-BUILD-LOG-2026-09-07.md's Deviation 5
   *  documents (H2 worked around it by testing `applyLiaHooks` directly,
   *  which has no notion of the flag at all; H3's ranking/candidate logic
   *  lives inside THIS gated function, so the equivalent bypass has to be a
   *  field here rather than a different function to call). Production
   *  never sets this field — the one real call site
   *  (lia-skeleton-assemble.ts) supplies only `intake` — so the flag still
   *  governs every actual report exactly as H2 shipped it: "everything
   *  ships dark behind LIA_HOOKS_ENABLED" (doc 213 line 3) is unchanged for
   *  any caller that does not deliberately reach for this seam. */
  readonly hooks?: readonly AuthorityHook[];
  /** DOC 224 — the settled two-leg selections (by hook_id) and the hooks
   *  whose legs disagreed, resolved by the caller from the service's rows
   *  (`resolveHookSelections`, hook-join.ts). The join consults them only
   *  where its own atom agreement is `unknown`. Omitted → every unknown
   *  pair is `selection_pending` (or plainly omitted where the matrix
   *  pre-filter says no answer could print). */
  readonly selections?: HookSelectionMap;
  readonly unsettled?: ReadonlySet<string>;
  readonly lapsed?: ReadonlySet<string>;
}

// DOC 224 — index.ts reaches the selection helpers through THIS door (the
// sanctioned persuasive-authority renderer), never hook-join.ts directly.
export { resolveHookSelections, type HookSelectionRow, type ResolvedHookSelections } from "./lia-deliverables/hook-join.ts";
export { canonicalAnswerHash, canonicalAnswerText, type HookSelection } from "../../../_shared/corpus/hook-selection.ts";

/** DOC 224 — what index.ts asks before the assembler runs: the batched
 *  request for this generation's two-leg pass (empty when nothing needs a
 *  call), plus the ranking it was planned against and every hook's
 *  disposition (D10). Runs the SAME ranking `buildLiaPersuasiveAuthority`
 *  runs, so the join and the plan agree on the cap. Pure; no model. */
export interface LiaHookSelectionPlanResult extends LiaHookSelectionPlan {
  readonly ranked_source_ids: readonly string[];
  readonly hooks_in_play: number;
}

export function planLiaHookSelectionForReport(
  report: Bag,
  ctx: LiaPersuasiveContext & { readonly states: TypedStateBag; readonly verdicts: Record<string, string> },
): LiaHookSelectionPlanResult {
  const query = buildLiaRelevanceQuery(report, bag(ctx.intake));
  const applications = Array.isArray(report.rule_applications) ? report.rule_applications as Bag[] : [];
  const determinativeSourceIds = new Set(determinativeEntries(applications).map((e) => e.source_row_id).filter(Boolean));
  const hooksGateOpen = ctx.hooks !== undefined || LIA_HOOKS_ENABLED;
  const hooksSource = ctx.hooks ?? LIA_HOOKS;
  const hooksInPlay: readonly AuthorityHook[] = hooksGateOpen && hooksSource.length > 0 ? hooksSource : [];
  if (hooksInPlay.length === 0) return { items: [], considered: [], ranked_source_ids: [], hooks_in_play: 0 };
  const ap = apEntries(query, determinativeSourceIds, hooksInPlay);
  const rankedSourceIds = ap.ranked.map((sr) => sr.row.source_row_id);
  const plan = planLiaHookSelection(
    hooksInPlay,
    ctx.states,
    ctx.verdicts,
    rankedSourceIds,
    determinativeSourceIds,
    bag(ctx.intake),
    { selections: ctx.selections, unsettled: ctx.unsettled, lapsed: ctx.lapsed },
  );
  return { ...plan, ranked_source_ids: rankedSourceIds, hooks_in_play: hooksInPlay.length };
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

  // DOC 213B — hooks are "in play" for this render only when a hook source
  // is actually available AND the caller supplied both `ctx.states` and
  // `ctx.verdicts` (hook-join has nothing to nominate against without a
  // states bag, and — new to H3 — a hook-backed candidate must never
  // surface its own synthetic display text merely for having ranked well;
  // it renders only through an actual join application, doc 213B §1.3).
  // `ctx.hooks`, when supplied, both NAMES the hook source and OPENS the
  // gate that `LIA_HOOKS_ENABLED` otherwise controls — see that field's own
  // doc comment on `LiaPersuasiveContext` for why a test seam has to work
  // this way here. The default path (`ctx.hooks` omitted) is untouched:
  // `LIA_HOOKS_ENABLED && LIA_HOOKS.length > 0`, exactly as H2 shipped it,
  // and `LIA_HOOKS` ships `[]` today regardless, so `hooksInPlay` is always
  // `[]` in production this build lands into.
  const hooksGateOpen = ctx.hooks !== undefined || LIA_HOOKS_ENABLED;
  const hooksSource = ctx.hooks ?? LIA_HOOKS;
  const hooksInPlay: readonly AuthorityHook[] = hooksGateOpen && hooksSource.length > 0 && ctx.states && ctx.verdicts
    ? hooksSource
    : [];

  const ap = apEntries(query, determinativeSourceIds, hooksInPlay);
  const precedent = precedentEntries(report).filter((e) => !determinativeSourceIds.has(e.source_row_id));

  // DOC 213/213B — offline analogy hooks. `hooksInPlay` is always `[]`
  // unless BOTH the gate above is open AND at least one hook is supplied —
  // so this whole block, and every byte it could touch, remains identity-
  // gated exactly as H2 shipped it whenever a caller relies on the default
  // (`ctx.hooks` omitted): nothing here changes production output before
  // both a flag flip AND a ratified hook exist.
  let hookFlags: readonly { hook_id: string; reason: string }[] = [];
  let hookAppliedIds: readonly string[] = [];
  let hookSelectionIds: readonly string[] = [];
  let apEntriesForBody = ap.entries;
  if (hooksInPlay.length > 0 && ctx.states && ctx.verdicts) {
    const rankedSourceIds = ap.ranked.map((sr) => sr.row.source_row_id);
    const { applications, flags } = applyLiaHooks(
      hooksInPlay,
      ctx.states,
      ctx.verdicts,
      rankedSourceIds,
      determinativeSourceIds,
      { selections: ctx.selections, unsettled: ctx.unsettled, lapsed: ctx.lapsed },
    );
    hookFlags = flags;
    hookSelectionIds = applications.filter((a) => a.selection_field_id).map((a) => a.hook_id);
    const bySource = new Map(applications.map((a) => [a.source_row_id, a] as const));
    const dropSourceIds = new Set<string>();
    for (const f of flags) {
      if (!LIA_HOOK_OMIT_REASONS.has(f.reason)) continue;
      const hook = hooksInPlay.find((h) => h.hook_id === f.hook_id);
      if (hook) dropSourceIds.add(hook.source_row_id);
    }
    // FIRST BUILD LIMITATION (doc 213 §6): an entry the matrix omits is
    // dropped, not back-filled from the next-ranked row — the top-five
    // list can render fewer than five entries when a hook omits one.
    apEntriesForBody = ap.entries
      .filter((e) => !dropSourceIds.has(e.source_row_id))
      .map((e) => {
        const applied = bySource.get(e.source_row_id);
        return applied ? { ...e, text: applied.sentence } : e;
      })
      // DOC 213B §1.3 — a hook-backed (synthetic) candidate renders ONLY
      // through an actual join application; it never falls back to the
      // text `apEntries` built from its display block (that text exists
      // only so the synthetic row satisfies `apEntries`' shared
      // PersuasiveEntry construction — it is never ratified prose). This
      // also catches a hook that ranked into the top five but was never
      // nominated (its `required_atoms` did not hold) or lost the join's
      // own report/factor cap — neither produces a flag, so `dropSourceIds`
      // above cannot see it.
      .filter((e) => !ap.hookSourceIds.has(e.source_row_id) || bySource.has(e.source_row_id));
    // DOC 217 §5.6 — the applications that survived every filter above are
    // the ones the record block names as applied.
    const renderedSourceIds = new Set(apEntriesForBody.map((e) => e.source_row_id));
    hookAppliedIds = applications
      .filter((a) => renderedSourceIds.has(a.source_row_id))
      .map((a) => a.hook_id);
  }

  const seen = new Set<string>();
  const entries: PersuasiveEntry[] = [];
  // Determinative authorities list FIRST, ahead of the ranked persuasive
  // candidates; contrary-authority entries join the persuasive tail.
  for (const e of [...determinative, ...apEntriesForBody, ...precedent, ...contrary]) {
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
  if (entries.length === 0) {
    return { body: "", ledger: [], entry_count: 0, aow_fired: false, ranked, hook_flags: hookFlags, hook_applied_ids: hookAppliedIds, hook_selection_ids: hookSelectionIds };
  }

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
    hook_flags: hookFlags,
    hook_applied_ids: hookAppliedIds,
    hook_selection_ids: hookSelectionIds,
  };
}
