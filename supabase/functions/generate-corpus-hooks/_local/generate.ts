// DOC 213 §2 — the pure generation core for analogy hooks, as amended by
// DOC 222 (hooks contract v2, 2026-09-08).
//
// No I/O. The edge function does the DB read and the response; this module
// decides what is emitted and returns the CONTENTS of the product's pinned
// hooks file. Nothing is written to the repo by an edge function.
//
// EXCLUSION vs ERROR is the same discipline as generate-corpus-rules: an
// unratified or draft-consultation row is EXCLUDED by name; there is no
// silent drop. DOC 222 adds three more named exclusions: no pinpoint (§2.5
// — mandatory for EVERY source table before activation), a source status
// that cannot be derived (§2.7 — vacated/remanded decisions, EDPB front
// matter, a WP29 source with no `verified_as_of`), and a `conditional` hook
// with no proposition split (§2.1).

import type { HookDistinguishingPair, HookMaterialFact, HookPinpoint, HookSourceStatus, HookVerb } from "../../_shared/corpus/hook-types.ts";

export interface HookRow {
  readonly id: string;
  readonly profile_id: string;
  readonly product: string;
  readonly hook_version: number;
  readonly hook_status: string;
  readonly fact_atoms: readonly string[] | null;
  readonly distinguishing_atoms: readonly string[] | null;
  readonly not_distinguishable: boolean;
  readonly required_atoms: readonly string[] | null;
  readonly finding_span: string;
  readonly fact_pattern_paraphrase: string;
  readonly finding_paraphrase: string;
  readonly trigger_terms: readonly string[] | null;
  readonly settledness: string;
  readonly ratified_by: string | null;
  readonly ratified_at: string | null;
  readonly ledger_ref: string | null;
  readonly retired_at: string | null;
  // ── DOC 222 v2 columns (nullable; the settle gate fills them) ────────
  readonly recognised_proposition?: string | null;
  readonly condition_text?: string | null;
  readonly condition_atoms?: readonly string[] | null;
  readonly material_facts?: readonly HookMaterialFact[] | null;
  readonly distinguishing_pairs?: readonly HookDistinguishingPair[] | null;
  readonly pinpoint?: HookPinpoint | null;
  readonly appeal_note?: string | null;
  readonly verified_as_of?: string | null;
  // ── DOC 238 — PROPOSED shape-amendment plumbing (2026-09-09); see
  // hook-types.ts's `AuthorityHook` for the full doc comment. Threaded
  // through here, optionally, so a future ratified `authority_hooks` column
  // has somewhere to land; no such column exists yet (a `[NEEDS]`, doc 238).
  readonly governing_provision_sentence?: string | null;
  readonly hedge_variant?: "domestic_facts" | "foreign_analogy" | null;
}

export interface HookProfileRow {
  readonly id: string;
  readonly source_table: string;
  readonly source_row_id: string;
  readonly outcome_posture: string | null;
  readonly instrument: string | null;
  readonly factor_ids: readonly string[] | null;
  /** Track H3's `relevance` block — copied verbatim onto the emitted hook. */
  readonly use_case_class?: string | null;
  readonly relationship?: string | null;
  readonly data_categories?: readonly string[] | null;
  readonly flags?: readonly string[] | null;
  readonly curation_note?: string | null;
  readonly endorsement?: string | null;
  readonly ratified_by: string | null;
  readonly ratified_at: string | null;
  readonly ledger_ref: string | null;
}

/**
 * The citation and status facts read from the profile's own source row —
 * the same row the drafter was given. `authority_label`, the short label and
 * the printed status are composed here (never by a model).
 */
export interface HookSourceRow {
  readonly source_table: string;
  readonly regulator?: string | null;
  readonly subject?: string | null;
  readonly decision_date?: string | null;
  readonly title?: string | null;
  // ── DOC 222 §2.7 — status derivation inputs ──────────────────────────
  readonly adopted_date?: string | null; // edpb_guidelines
  readonly source_url?: string | null; // edpb_guidelines (WP29 host)
  readonly status?: string | null; // edpb_guidelines: final | front_matter
  readonly appeal_status?: string | null; // enforcement_actions
  readonly document_type?: string | null; // regulatory_guidance
  // DOC 231A — cppa_fsor_commentary (doc 231 §6 default #2's proposed diff,
  // applied). No status-derivation input is needed for this table: an FSOR
  // row carries no adopted/appeal/consultation state — `deriveSourceStatus`
  // ships it unconditionally as `regulator_guidance` (below).
  readonly regulation_citation?: string | null; // cppa_fsor_commentary — the pinpoint, not a title
  readonly page_ref?: string | null; // cppa_fsor_commentary — pinpoint fallback
  // DOC 238 §7 — the FSOR regulation package name, e.g. "CCPA Updates,
  // Cyber, Risk, ADMT, Insurance 2025 FSOR" (real column, verified read-only
  // against `cppa_fsor_commentary.fsor_package` this session — the value is
  // NOT normalised: two conventions coexist in the data today, a slug form
  // ("ccpa-2025-cyber-risk-admt") and a prose form; `citationFor` prints
  // whatever the row carries, verbatim, never invents or reformats it).
  readonly fsor_package?: string | null; // cppa_fsor_commentary
  // DOC 238 §7 — the English name of a non-English-language regulator, for
  // the trailing parenthetical the approved Risk/ADMT prose uses (e.g.
  // "Autoriteit Persoonsgegevens (Dutch Data Protection Authority)"). NO
  // DB column carries this today — confirmed read-only this session:
  // `enforcement_actions.regulator_canonical` holds the regulator's own
  // NATIVE full name (e.g. "Garante per la protezione dei dati personali"),
  // not an English gloss. This field is a proposed addition, exercised only
  // with placeholder test data (doc 238) until a curated source exists.
  readonly regulator_english_name?: string | null; // enforcement_actions
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "22 October 2024" from an ISO date. Null (never a guess) if malformed. */
export function citationDate(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return null;
  const monthIdx = Number(m[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return null;
  return `${Number(m[3])} ${MONTHS[monthIdx]} ${m[1]}`;
}

/** The "¶150" pin a curated EDPB profile records in its curation note —
 *  kept only as a fallback for a v1 row with no structured `pinpoint`. */
export function paragraphPin(curationNote: string | null | undefined): string | null {
  const m = /¶\s*(\d+)/.exec(String(curationNote ?? ""));
  return m ? `¶${m[1]}` : null;
}

const WP29_CUTOVER = "2018-05-25";

/** The short label used inline (doc 222 §5). */
export function shortLabelFor(profile: HookProfileRow, source: HookSourceRow): string | null {
  if (profile.source_table === "enforcement_actions") {
    const regulator = (source.regulator ?? "").trim();
    const subject = (source.subject ?? "").trim();
    return regulator && subject ? `${regulator}, ${subject}` : null;
  }
  // DOC 231A — checked before the `title` early-return below: this table
  // has no `title` field (shortLabelForFsor's own doc comment explains why
  // this branch is additive, beyond doc 231 §6 default #2's literal diff).
  if (profile.source_table === "cppa_fsor_commentary") return shortLabelForFsor();
  const title = (source.title ?? "").trim();
  if (!title) return null;
  if (profile.source_table === "edpb_guidelines") {
    const m = /^(Guidelines|Opinion|Recommendations)\s+([0-9]+\/[0-9]{4})/i.exec(title);
    const wp29 = isWp29(source);
    if (m) return `${wp29 ? "WP29" : "EDPB"} ${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()} ${m[2]}`;
    return `${wp29 ? "WP29" : "EDPB"}, ${title}`;
  }
  if (profile.source_table === "regulatory_guidance") {
    const regulator = (source.regulator ?? "").trim();
    return regulator ? `${regulator}, ${title}` : title;
  }
  return null;
}

/** DOC 231A — the `cppa_fsor_commentary` short label. This table has no
 *  `title` field (see `HookSourceRow`'s new fields), so the branch above
 *  (which reads `source.title` first) never reaches it — this is its own
 *  early return, ADDITIVE (a fourth branch; the three existing branches
 *  above are unchanged). A fixed short form: every row from this table is
 *  the same regulator's FSOR, so "CPPA Final Statement of Reasons" is
 *  always accurate and never varies row to row (doc 231 §6 default #2's
 *  proposed diff named `citationFor`/`deriveSourceStatus` only; this
 *  addition closes the gap those two alone would leave — without it, every
 *  FSOR hook is excluded at generate time with "short citation label could
 *  not be composed", which would defeat the point of unblocking Candidate 5
 *  — see the doc 231A follow-up log for the reasoning). */
function shortLabelForFsor(): string {
  return "CPPA Final Statement of Reasons";
}

function isWp29(source: HookSourceRow): boolean {
  const url = String(source.source_url ?? "");
  if (/ec\.europa\.eu\/newsroom\/article29/i.test(url)) return true;
  const adopted = String(source.adopted_date ?? "");
  return /^\d{4}-\d{2}-\d{2}/.test(adopted) && adopted.slice(0, 10) < WP29_CUTOVER;
}

export interface DerivedStatus {
  readonly source_status: HookSourceStatus;
  readonly verb: HookVerb;
  readonly status_label: string;
}

/**
 * DOC 222 §2.7 — the printed status, DERIVED from source-row columns. Returns
 * `{ exclude: reason }` where no status can honestly be printed.
 */
export function deriveSourceStatus(
  profile: HookProfileRow,
  source: HookSourceRow | undefined,
  hook: Pick<HookRow, "appeal_note" | "verified_as_of">,
): DerivedStatus | { exclude: string } {
  if (!source) return { exclude: "source row missing for status derivation" };
  const note = (profile.curation_note ?? "").toLowerCase();

  if (profile.source_table === "enforcement_actions") {
    const appeal = String(source.appeal_status ?? "unknown").toLowerCase();
    if (appeal === "vacated" || appeal === "remanded") return { exclude: `decision ${appeal} on appeal — never a hook source (doc 222 §2.7)` };
    if (appeal === "appeal_pending" || note.includes("under appeal") || profile.outcome_posture === "contested") {
      // CEO ruling 2026-09-08: a known appeal is printed by the join as the
      // FIXED sentence LIA_APPEAL_SENTENCE (lia-hooks.ts), never composed
      // from `appeal_note` — that column is record-block detail (docket,
      // date) and is emitted but not printed.
      return { source_status: "sa_decision_appeal_pending", verb: "found", status_label: "under appeal" };
    }
    if (appeal === "affirmed") {
      return { source_status: "sa_decision_affirmed", verb: "found", status_label: "supervisory-authority decision, affirmed on appeal" };
    }
    return {
      source_status: "sa_decision",
      verb: "found",
      status_label: "supervisory-authority decision — persuasive, non-binding outside its jurisdiction",
    };
  }

  if (profile.source_table === "edpb_guidelines") {
    if (String(source.status ?? "final") !== "final") return { exclude: `edpb row status "${source.status}" is not final` };
    const date = citationDate(source.adopted_date);
    if (isWp29(source)) {
      const verified = (hook.verified_as_of ?? "").trim();
      if (!verified) return { exclude: "WP29 source requires verified_as_of (doc 222 §2.7)" };
      const endorsed = profile.endorsement === "wp29_endorsed_2018"
        ? ", endorsed by the EDPB on 25 May 2018"
        : profile.endorsement === "wp29_not_endorsed"
        ? ", not endorsed by the EDPB"
        : "";
      return {
        source_status: "wp29_opinion",
        verb: "advised",
        status_label: `Article 29 Working Party opinion${date ? `, ${date}` : ""} — historical interpretive guidance${endorsed}; current relevance verified ${verified}`,
      };
    }
    const title = String(source.title ?? "");
    if (/^(Opinion|Recommendations)\b/i.test(title)) {
      return {
        source_status: "edpb_opinion",
        verb: "states",
        status_label: `EDPB Article 64 opinion${date ? `, adopted ${date}` : ""} — Board opinion, not a judicial decision`,
      };
    }
    return {
      source_status: "edpb_guidelines_final",
      verb: "states",
      status_label: `EDPB Guidelines${date ? `, adopted ${date}` : ""} — interpretive guidance, not binding law`,
    };
  }

  if (profile.source_table === "regulatory_guidance") {
    const regulator = (source.regulator ?? "").trim();
    if (!regulator) return { exclude: "regulatory_guidance row has no regulator" };
    return { source_status: "regulator_guidance", verb: "states", status_label: `${regulator} regulatory guidance — non-binding` };
  }
  // DOC 231 §6 default #2 (proposed diff, applied verbatim) — the
  // cppa_fsor_commentary branch. No exclusion condition: unlike
  // edpb_guidelines (front-matter/draft status) or enforcement_actions
  // (vacated/remanded appeals), an FSOR row carries no analogous "not yet
  // final" state in its own schema (doc 231A verified the table's columns
  // read-only — see the follow-up log) — every profiled row is a published
  // agency position and always derives this status.
  if (profile.source_table === "cppa_fsor_commentary") {
    return {
      source_status: "regulator_guidance",
      verb: "states",
      status_label: "CPPA Final Statement of Reasons — agency position, primary regulator commentary",
    };
  }
  return { exclude: `no status derivation for source table "${profile.source_table}"` };
}

/**
 * regulator + authority_label for the emitted hook. Returns null when a part
 * is missing — the caller EXCLUDES that hook by name rather than shipping a
 * blank citation. DOC 222: the label carries NO pinpoint (the join composes
 * `{citation}` = label + the structured `pinpoint`).
 */
export function citationFor(
  profile: HookProfileRow,
  source: HookSourceRow | undefined,
): { regulator: string; authority_label: string } | null {
  if (!source) return null;
  if (profile.source_table === "enforcement_actions") {
    const regulator = (source.regulator ?? "").trim();
    const subject = (source.subject ?? "").trim();
    const date = citationDate(source.decision_date);
    if (!regulator || !subject || !date) return null;
    // DOC 238 §7 — two ADDITIVE facts the approved Risk/ADMT prose carries
    // that the label omitted before: the regulator's English name as a
    // trailing parenthetical (`regulator_english_name` — proposed field, no
    // DB source yet, see `HookSourceRow`'s own doc comment), and the appeal
    // outcome for a FINAL/AFFIRMED decision (real `appeal_status` column;
    // `appeal_pending`/`vacated`/`remanded` are handled elsewhere —
    // `deriveSourceStatus` excludes vacated/remanded outright and prints
    // `sa_decision_appeal_pending`'s own status label + LIA_APPEAL_SENTENCE
    // for a pending one, so this trailing note is only for an appeal that
    // has already resolved). Both are no-ops (identical output to before)
    // when the new fields are absent, which is every hook shipped today.
    const english = (source.regulator_english_name ?? "").trim();
    const regulatorPart = english ? `${regulator} (${english})` : regulator;
    const appealNote = source.appeal_status === "final"
      ? ", final on appeal"
      : source.appeal_status === "affirmed"
      ? ", affirmed on appeal"
      : "";
    return { regulator, authority_label: `${regulatorPart}, ${subject}, decision of ${date}${appealNote}` };
  }
  if (profile.source_table === "edpb_guidelines") {
    const title = (source.title ?? "").trim();
    if (!title) return null;
    const wp29 = isWp29(source);
    return { regulator: wp29 ? "the Article 29 Working Party" : "the EDPB", authority_label: wp29 ? `Article 29 Working Party, ${title}` : `EDPB, ${title}` };
  }
  if (profile.source_table === "regulatory_guidance") {
    const title = (source.title ?? "").trim();
    if (!title) return null;
    const regulator = (source.regulator ?? "").trim();
    if (!regulator) return null;
    return { regulator: `the ${regulator}`, authority_label: `${regulator}, ${title}` };
  }
  // DOC 231 §6 default #2 (proposed diff, applied verbatim): `regulation_citation`
  // is the pinpoint, not a title — the authority_label names the document,
  // the pinpoint (composed by hook-join.ts's `pinpointText`/`{citation}`
  // slot from the hook's own `pinpoint` field, not from this string) adds
  // the specific location. A row with no `regulation_citation` still yields
  // a valid (if bare) authority_label — the FSOR document itself is a
  // constant, unlike enforcement_actions/edpb_guidelines/regulatory_guidance
  // whose citations depend entirely on per-row facts.
  if (profile.source_table === "cppa_fsor_commentary") {
    // DOC 238 §7 — the approved prose's citation also carries the FSOR
    // package name and the page pinpoint ("…Final Statement of Reasons,
    // CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations, 11 CCR
    // § 7152(a)(1), p. 34"); `page_ref` was already a real `HookSourceRow`
    // field but unused here, and `fsor_package` is threaded through fresh
    // (both added to `HookSourceRow` above). Parts that are absent are
    // skipped, never printed blank — the bare "CPPA Final Statement of
    // Reasons" behaviour for a row with none of the three is unchanged.
    const cite = (source.regulation_citation ?? "").trim();
    const pkg = (source.fsor_package ?? "").trim();
    const page = (source.page_ref ?? "").trim();
    const parts = ["CPPA Final Statement of Reasons", pkg, cite, page].filter((s) => s.length > 0);
    return { regulator: "the CPPA", authority_label: parts.join(", ") };
  }
  return null;
}

/** A v1 row's `¶N` in the curation note, promoted to a structured pinpoint
 *  with the finding span as its anchor — the migration path for the seven
 *  stamped EDPB profiles; a v2 row carries its own. */
export function pinpointFor(row: HookRow, profile: HookProfileRow): HookPinpoint | null {
  const p = row.pinpoint;
  if (p && typeof p === "object" && typeof (p as HookPinpoint).ref === "string" && (p as HookPinpoint).ref.length > 0 && typeof (p as HookPinpoint).anchor_span === "string") {
    return { kind: (p as HookPinpoint).kind, ref: (p as HookPinpoint).ref, anchor_span: (p as HookPinpoint).anchor_span };
  }
  const legacy = paragraphPin(profile.curation_note);
  if (legacy && row.finding_span) return { kind: "paragraph", ref: legacy.slice(1), anchor_span: row.finding_span };
  return null;
}

export interface Exclusion {
  readonly hook_id: string;
  readonly reason: string;
}

export interface GenerateHooksInput {
  readonly product: string;
  readonly rows: readonly HookRow[];
  readonly profiles: ReadonlyMap<string, HookProfileRow>;
  /** Citation + status facts from each profile's source row, keyed by profile id. */
  readonly sources: ReadonlyMap<string, HookSourceRow>;
  /** factor label -> three-part-test element (_local/factor-element.ts). */
  readonly elementOf: (factorId: string) => string | null;

  readonly hooksVersion: string;
  readonly outputPath: string;
  readonly exportPrefix: string;
  /** The [RATIFY] blocks copied verbatim from the existing pinned file. */
  readonly contextBlock: string;
}

export interface GenerateHooksResult {
  readonly ok: boolean;
  readonly emitted: number;
  readonly excluded: Exclusion[];
  readonly errors: string[];
  readonly contents: string | null;
}

function stamped(row: { ratified_by: string | null; ratified_at: string | null; ledger_ref: string | null }): boolean {
  return !!row.ratified_by && !!row.ratified_at && !!row.ledger_ref;
}

/** Relative specifier from the output file to _shared/corpus/hook-types.ts. */
export function typeImportSpecifier(outputPath: string): string {
  const parts = outputPath.split("/");
  const fnIndex = parts.indexOf("functions");
  const depth = parts.length - fnIndex - 2;
  return `${"../".repeat(depth)}_shared/corpus/hook-types.ts`;
}

const POSTURES = new Set(["accepted", "conditional", "rejected", "contested"]);

/**
 * The RUNTIME projection — exactly the fields `AuthorityHook`
 * (_shared/corpus/hook-types.ts) declares, plus Track H3's `relevance` block
 * and the doc 222 v2 fields. Nothing else: an emitted file must pass
 * `deno check` against that type.
 */
function shippedHook(
  row: HookRow,
  profile: HookProfileRow,
  citation: { regulator: string; authority_label: string },
  short: string,
  status: DerivedStatus,
  pinpoint: HookPinpoint,
  factorId: string,
  element: string,
) {
  return {
    hook_id: `${profile.source_table}:${profile.source_row_id}:v${row.hook_version}`,
    profile_id: row.profile_id,
    source_row_id: profile.source_row_id,
    fact_atoms: [...(row.fact_atoms ?? [])],
    distinguishing_atoms: [...(row.distinguishing_atoms ?? [])],
    not_distinguishable: row.not_distinguishable,
    required_atoms: [...(row.required_atoms ?? [])],
    finding_span: row.finding_span,
    fact_pattern_paraphrase: row.fact_pattern_paraphrase,
    finding_paraphrase: row.finding_paraphrase,
    settledness: row.settledness,
    posture: profile.outcome_posture,
    factor_id: factorId,
    bears_on_element: element,
    authority_label: citation.authority_label,
    regulator: citation.regulator,
    // Track H3 — the profile's own typed relevance, copied verbatim.
    relevance: {
      instrument: profile.instrument,
      factor_ids: [...(profile.factor_ids ?? [])],
      use_case_class: profile.use_case_class ?? null,
      relationship: profile.relationship ?? null,
      data_categories: [...(profile.data_categories ?? [])],
      flags: [...(profile.flags ?? [])],
      outcome_posture: profile.outcome_posture,
    },
    // DOC 222 — the v2 contract.
    authority_label_short: short,
    hook_version: row.hook_version,
    source_status: status.source_status,
    status_label: status.status_label,
    verb: status.verb,
    appeal_note: row.appeal_note ?? null,
    verified_as_of: row.verified_as_of ?? null,
    pinpoint,
    recognised_proposition: row.recognised_proposition ?? null,
    condition_text: row.condition_text ?? null,
    condition_atoms: row.condition_atoms ? [...row.condition_atoms] : null,
    material_facts: [...(row.material_facts ?? [])],
    distinguishing_pairs: [...(row.distinguishing_pairs ?? [])],
    // DOC 238 — PROPOSED plumbing, additive; null on every hook today (no
    // row sets either column yet).
    governing_provision_sentence: row.governing_provision_sentence ?? null,
    hedge_variant: row.hedge_variant ?? null,
  };
}

export function generateHooks(input: GenerateHooksInput): GenerateHooksResult {
  const excluded: Exclusion[] = [];
  const errors: string[] = [];
  const emitted: {
    row: HookRow;
    profile: HookProfileRow;
    citation: { regulator: string; authority_label: string };
    short: string;
    status: DerivedStatus;
    pinpoint: HookPinpoint;
    factorId: string;
    element: string;
  }[] = [];

  for (const row of input.rows) {
    const label = `${row.profile_id}#v${row.hook_version}`;
    if (row.retired_at) { excluded.push({ hook_id: label, reason: "hook row is retired" }); continue; }
    if (row.hook_status !== "ratified") {
      excluded.push({ hook_id: label, reason: `hook_status is "${row.hook_status}", not "ratified"` });
      continue;
    }
    const profile = input.profiles.get(row.profile_id);
    if (!profile) { excluded.push({ hook_id: label, reason: `profile ${row.profile_id} not found` }); continue; }
    if (!stamped(profile)) {
      excluded.push({ hook_id: label, reason: `profile ${row.profile_id} is not ratified` });
      continue;
    }
    if (profile.source_table === "edpb_guidelines" && profile.endorsement === "draft_consultation") {
      excluded.push({ hook_id: label, reason: "primary_source_is_consultation_draft" });
      continue;
    }
    // A blank is never shipped: every field the runtime type requires must
    // resolve from ratified data, or the hook is excluded BY NAME.
    if (!profile.outcome_posture || !POSTURES.has(profile.outcome_posture)) {
      excluded.push({ hook_id: label, reason: `profile outcome_posture "${profile.outcome_posture}" is not a hook posture` });
      continue;
    }
    const factorId = (profile.factor_ids ?? [])[0];
    if (!factorId) { excluded.push({ hook_id: label, reason: "profile has no factor_ids[0]" }); continue; }
    const element = input.elementOf(factorId);
    if (!element) {
      excluded.push({ hook_id: label, reason: `factor "${factorId}" maps to no three-part-test element` });
      continue;
    }
    const source = input.sources.get(row.profile_id);
    const citation = citationFor(profile, source);
    if (!citation) {
      excluded.push({ hook_id: label, reason: `citation facts incomplete for ${profile.source_table} row ${profile.source_row_id}` });
      continue;
    }
    const short = source ? shortLabelFor(profile, source) : null;
    if (!short) { excluded.push({ hook_id: label, reason: "short citation label could not be composed" }); continue; }
    // DOC 222 §2.7 — the printed status is derived or the hook is not shipped.
    const status = deriveSourceStatus(profile, source, row);
    if ("exclude" in status) { excluded.push({ hook_id: label, reason: status.exclude }); continue; }
    // DOC 222 §2.5 — a pinpoint is mandatory for EVERY source before activation.
    const pinpoint = pinpointFor(row, profile);
    if (!pinpoint) { excluded.push({ hook_id: label, reason: "pinpoint missing — mandatory before activation (doc 222 §2.5)" }); continue; }
    // DOC 222 §2.1 — a conditional hook needs its proposition split.
    if (profile.outcome_posture === "conditional" && (!row.recognised_proposition || !row.condition_text)) {
      excluded.push({ hook_id: label, reason: "conditional hook without recognised_proposition / condition_text (doc 222 §2.1)" });
      continue;
    }
    emitted.push({ row, profile, citation, short, status, pinpoint, factorId, element });
  }

  if (errors.length > 0) return { ok: false, emitted: 0, excluded, errors, contents: null };

  const sorted = [...emitted].sort((a, b) => (a.row.profile_id < b.row.profile_id ? -1 : a.row.profile_id > b.row.profile_id ? 1 : 0));
  const body = sorted.map(({ row, profile, citation, short, status, pinpoint, factorId, element }) =>
    JSON.stringify(shippedHook(row, profile, citation, short, status, pinpoint, factorId, element), null, 2)
      .split("\n").map((line) => `  ${line}`).join("\n")
  ).join(",\n");

  const excludedLines = excluded.length === 0
    ? "//   (none)"
    : excluded.map((item) => `//   ${item.hook_id} — ${item.reason}`).join("\n");

  const prefix = input.exportPrefix;
  const contents = `// ${input.product.toUpperCase()} ANALOGY HOOKS — pinned, generated file (doc 213 / doc 222).
//
// Generated by \`generate-corpus-hooks\` (action "generate") from RATIFIED
// \`public.authority_hooks\` rows. Do not hand-edit the hooks array:
// regenerate it. Run: ${input.hooksVersion}
//
// EXCLUDED ROWS (named, not silently dropped):
${excludedLines}

import type { AuthorityHook } from "${typeImportSpecifier(input.outputPath)}";


export const ${prefix}_HOOKS_VERSION = ${JSON.stringify(input.hooksVersion)};

export const ${prefix}_HOOKS: readonly AuthorityHook[] = [${sorted.length === 0 ? "" : `\n${body}\n`}];

${input.contextBlock}`;

  return { ok: true, emitted: sorted.length, excluded, errors: [], contents };
}
