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
  /** The hook's own CEO-approved hedge passage, verbatim (hook-types.ts). */
  readonly hedge_sentence?: string | null;
  /** DOC 223B RATIFICATION FOLLOW-UP (2026-09-09) — the hook's own ratified
   *  sentence, verbatim, printed instead of any shape/slot substitution when
   *  present (hook-types.ts's own doc comment has the full rationale). */
  readonly literal_sentence_override?: string | null;
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
  // DOC 238 §7 — the FSOR regulation package name (real column,
  // `cppa_fsor_commentary.fsor_package`). Two conventions coexist in the
  // data, a slug form ("ccpa-2025-cyber-risk-admt") and a prose form ("CCPA
  // Updates, Cyber, Risk, ADMT, Insurance 2025 FSOR"); since the doc 238
  // §1.4 follow-up (2026-09-09) `citationFor` prints `fsorPackageName()` of
  // the raw value (below), so a citation reads as prose whichever form the
  // row carries.
  readonly fsor_package?: string | null; // cppa_fsor_commentary
  // DOC 238 §7 — the English name of a non-English-language regulator, for
  // the trailing parenthetical the approved Risk/ADMT prose uses (e.g.
  // "Autoriteit Persoonsgegevens (Dutch Data Protection Authority)"). NO
  // DB column carries this today — confirmed read-only this session:
  // `enforcement_actions.regulator_canonical` holds the regulator's own
  // NATIVE full name (e.g. "Garante per la protezione dei dati personali"),
  // not an English gloss. Still no per-row source for most regulators; where
  // one is absent, `citationFor` falls back to `KNOWN_REGULATOR_ENGLISH_GLOSS`
  // (below) keyed off `regulator_canonical`, which today covers only the two
  // regulators an approved citation actually needed it for (doc 236 E1, doc
  // 234 Candidate 1).
  readonly regulator_english_name?: string | null; // enforcement_actions
  // DOC 238 FOLLOW-UP (2026-09-09) — `enforcement_actions.regulator_canonical`
  // (real column, holds the regulator's own native full name). Read but
  // never used in a citation unless `regulator_canonical_in_citation` (next
  // field) is explicitly true for that row: the SAME regulator appears in
  // two already-CEO-approved citations with two different forms — doc 233's
  // Comune di Bolzano prints the short "Garante", while doc 236's E1 prints
  // the full "Garante per la protezione dei dati personali (Italian Data
  // Protection Authority)". Which form a citation uses is the curator's
  // documented choice for that specific hook, not a fact `citationFor` can
  // derive from `regulator_canonical` alone — hence the opt-in flag, set
  // per row, rather than "use canonical whenever present."
  readonly regulator_canonical?: string | null; // enforcement_actions
  // DOC 238 FOLLOW-UP — per-row opt-in: true only for a row whose approved
  // citation has been confirmed (against its curation document) to use the
  // full native name. Backed by a real, additive `enforcement_actions`
  // column, default null/false everywhere — every row's citation is
  // byte-identical to before this field existed unless a curator flips it.
  readonly regulator_canonical_in_citation?: boolean | null; // enforcement_actions
}

// DOC 238 FOLLOW-UP — a small, curated translation table for a
// `regulator_canonical` name into its English gloss, used ONLY in the
// citation's trailing parenthetical when `regulator_canonical_in_citation`
// is true for that row and no per-row `regulator_english_name` is set. Not a
// general-purpose translator: each entry is added only once a specific
// approved citation has actually needed it (doc 236 E1; doc 234 Candidate 1
// — two entries today), never invented ahead of one.
const KNOWN_REGULATOR_ENGLISH_GLOSS: Readonly<Record<string, string>> = {
  "Garante per la protezione dei dati personali": "Italian Data Protection Authority",
  // DOC 238 §1.4 FOLLOW-UP (2026-09-09) — doc 234 Candidate 1 (ICS), CEO
  // approved: "Autoriteit Persoonsgegevens (Dutch Data Protection Authority)".
  // The row (`dc095815`) carried `regulator` "AP" and a NULL
  // `regulator_canonical` (verified live); the canonical name was written to
  // that one row, with `regulator_canonical_in_citation` opted in, the same
  // way E1's row was — 43 other AP rows are untouched and still print "AP".
  "Autoriteit Persoonsgegevens": "Dutch Data Protection Authority",
};

// ── DOC 238 §5 item 6 / §5.5.2 FOLLOW-UP (2026-09-09) — PER-PRODUCT CITATION
// CONVENTIONS. `deriveSourceStatus` and `citationFor` are ONE shared code
// path for all four products (dispatched by product-registry.ts), and the
// CEO's approved documents print DIFFERENT status wording per product for
// the same `sa_decision` source status:
//
//   LIA  (doc 223B) — the ratified LIA_SOURCE_STATUS_LABELS text stands; the
//                     approved paragraphs vary hook-by-hook (a "lead
//                     supervisory authority" phrase, an Icelandic-specific
//                     phrase, an instrument-named phrase) and the CEO has
//                     not ruled on a matrix-level replacement (doc 223B's
//                     own implementation note) — so LIA is left EXACTLY as
//                     ratified, never given invented wording.
//   DPIA (doc 233)  — every approved paragraph prints the shared text
//                     verbatim: no override.
//   Risk (doc 234)  — all four approved enforcement candidates print
//                     "foreign supervisory-authority decision, cited by
//                     analogy"; Candidate 1 (the reference the doc 238
//                     tests pin) adds " — not binding on California
//                     regulators", Candidate 2 adds a row-specific
//                     translation caveat, 3 and 4 add nothing. The
//                     Candidate 1 form is used: it is CEO-approved wording,
//                     true of every foreign decision cited into a
//                     California product, and Candidates 3/4's shorter form
//                     is its strict prefix. (Candidate 2's translation
//                     caveat is curation state, not a label — not modelled.)
//   ADMT (doc 236)  — E1, the only approved ADMT enforcement citation:
//                     "foreign supervisory-authority decision, cited by
//                     analogy — decided under the GDPR, not the CCPA or its
//                     Article 10/11 regulations" — product-generic wording
//                     (every ADMT enforcement source is a GDPR decision).
//
// Keyed by the registry product key (product-registry.ts); every key is
// present so the two tables can be pinned equal. An entry with no
// `sa_decision_label` keeps the shared text byte-for-byte. A product that
// is not in this table at all (a direct `deriveSourceStatus` call with no
// product, or an unregistered product string) also keeps the shared text —
// the override is additive and can never make a label WORSE than today's.
export interface HookCitationConventions {
  /** CEO-approved replacement for the shared `sa_decision` label, applied
   *  only to a FOREIGN decision under a GDPR-family instrument (the fact
   *  the wording asserts) — see `foreignGdprDecision`. */
  readonly sa_decision_label?: string;
  /** Whether a `cppa_fsor_commentary` citation's trailing parenthetical
   *  carries the "; {status}" clause. Default true (doc 234's Risk
   *  convention); false for ADMT (doc 236, every approved FSOR citation). */
  readonly fsor_status_in_citation?: boolean;
}

export const HOOK_PRODUCT_CITATION_CONVENTIONS: Readonly<Record<string, HookCitationConventions>> = {
  lia: {},
  dpia: {},
  "cppa-risk": {
    sa_decision_label: "foreign supervisory-authority decision, cited by analogy — not binding on California regulators",
  },
  admt: {
    sa_decision_label:
      "foreign supervisory-authority decision, cited by analogy — decided under the GDPR, not the CCPA or its Article 10/11 regulations",
    fsor_status_in_citation: false,
  },
};

/** The one fact the per-product `sa_decision_label` wording asserts about
 *  its source — "foreign … cited by analogy … decided under the GDPR" — read
 *  MECHANICALLY off the profile's own instrument, never assumed: a decision
 *  under a California instrument, or under no GDPR-family instrument, keeps
 *  the shared label rather than being called foreign/GDPR falsely. */
function foreignGdprDecision(profile: HookProfileRow): boolean {
  const instrument = (profile.instrument ?? "").trim();
  if (!/GDPR/i.test(instrument)) return false;
  if (/CCPA|CPPA|California/i.test(instrument)) return false;
  return true;
}

// ── DOC 238 §1.4 FOLLOW-UP (2026-09-09) — FSOR PACKAGE-NAME NORMALISATION.
// `cppa_fsor_commentary.fsor_package` mixes two conventions in the live data
// (verified 2026-09-09, all five values that exist, with row counts):
//   "ccpa-2025-cyber-risk-admt"                              916  (slug)
//   "CCPA Updates, Cyber, Risk, ADMT, Insurance 2025 FSOR"   128  (prose)
//   "ccpa-2023-original"                                     181  (slug)
//   "CCPA Updates 2023 FSOR"                                  83  (prose)
//   "dbr-2024-registration"                                   15  (slug)
// The slug and prose forms of each rulemaking point at the SAME source PDFs
// (`source_url`), so they are one package each. `citationFor` used to print
// whatever the row carried, verbatim, so a citation could read "…, ccpa-2025-
// cyber-risk-admt, 11 CCR § 7152(a)(1)". The CEO's instruction: work
// backwards from the finished product — every citation must read as clean
// prose whichever convention the row uses. The 2025 package prints the
// CEO-approved name every FSOR citation in docs 234/236 uses; the 2023 and
// DBR packages print the data's own prose form (the redundant " FSOR" suffix
// dropped — the label already says "Final Statement of Reasons") — no legal
// title is invented for them, and a rename is a one-line table edit. Any
// value NOT in the table falls through to a mechanical slug→prose rule
// (split on "-", uppercase the known acronyms, title-case the rest, drop a
// trailing "fsor"), so a future package still reads as prose, never as a
// slug.
const FSOR_PACKAGE_NAMES: Readonly<Record<string, string>> = {
  "ccpa-2025-cyber-risk-admt": "CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations",
  "CCPA Updates, Cyber, Risk, ADMT, Insurance 2025 FSOR": "CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations",
  "ccpa-2023-original": "CCPA Updates 2023",
  "CCPA Updates 2023 FSOR": "CCPA Updates 2023",
  "dbr-2024-registration": "Data Broker Registration 2024",
};

const FSOR_SLUG_ACRONYMS: ReadonlySet<string> = new Set(["ccpa", "cpra", "cppa", "admt", "dbr", "uid", "fsor", "isor"]);

/** The prose name for an `fsor_package` value — the curated name where one
 *  exists, else a mechanical slug→prose rendering; "" for a blank. */
export function fsorPackageName(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  const curated = FSOR_PACKAGE_NAMES[value];
  if (curated) return curated;
  // A prose value: drop only the redundant trailing " FSOR".
  if (!/^[a-z0-9]+(-[a-z0-9]+)+$/i.test(value)) return value.replace(/\s+FSOR$/i, "").trim();
  // A slug: mechanical rendering.
  const words = value.split("-").filter((w) => w.length > 0);
  if (words[words.length - 1]?.toLowerCase() === "fsor") words.pop();
  return words
    .map((w) => (FSOR_SLUG_ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : /^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

/** The FSOR `page_ref` as the approved citations print it: doc 236's G1
 *  prints the DB's "Appendix, p. 13" as "Appendix p. 13" — the comma inside
 *  the page ref would otherwise read as a citation separator. */
export function fsorPageRef(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  return value.replace(/,\s*(p\.\s*\d)/i, " $1").replace(/\s{2,}/g, " ");
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
  /** DOC 238 §5.5.2 FOLLOW-UP — whether the citation trailer prints the
   *  "; {status}" clause (hook-types.ts `AuthorityHook.status_in_citation`).
   *  True everywhere except a product whose approved FSOR citations omit it. */
  readonly status_in_citation: boolean;
}

/**
 * DOC 222 §2.7 — the printed status, DERIVED from source-row columns. Returns
 * `{ exclude: reason }` where no status can honestly be printed.
 *
 * DOC 238 §5 item 6 FOLLOW-UP (2026-09-09) — `product` (the registry key,
 * optional) selects that product's CEO-approved `sa_decision` wording from
 * `HOOK_PRODUCT_CITATION_CONVENTIONS`. Omitted, or a product with no
 * override (LIA, DPIA), derives EXACTLY what it derived before this
 * parameter existed — every existing three-argument call site is
 * byte-identical.
 */
export function deriveSourceStatus(
  profile: HookProfileRow,
  source: HookSourceRow | undefined,
  hook: Pick<HookRow, "appeal_note" | "verified_as_of">,
  product?: string,
): DerivedStatus | { exclude: string } {
  if (!source) return { exclude: "source row missing for status derivation" };
  const note = (profile.curation_note ?? "").toLowerCase();
  const conventions: HookCitationConventions = (product && HOOK_PRODUCT_CITATION_CONVENTIONS[product]) || {};

  if (profile.source_table === "enforcement_actions") {
    const appeal = String(source.appeal_status ?? "unknown").toLowerCase();
    if (appeal === "vacated" || appeal === "remanded") return { exclude: `decision ${appeal} on appeal — never a hook source (doc 222 §2.7)` };
    if (appeal === "appeal_pending" || note.includes("under appeal") || profile.outcome_posture === "contested") {
      // CEO ruling 2026-09-08: a known appeal is printed by the join as the
      // FIXED sentence LIA_APPEAL_SENTENCE (lia-hooks.ts), never composed
      // from `appeal_note` — that column is record-block detail (docket,
      // date) and is emitted but not printed.
      return { source_status: "sa_decision_appeal_pending", verb: "found", status_label: "under appeal", status_in_citation: true };
    }
    if (appeal === "affirmed") {
      // No approved Risk/ADMT paragraph cites an affirmed decision, so no
      // per-product wording exists to apply here — the shared label stands
      // (and `citationFor` already prints ", affirmed on appeal" inside the
      // label itself).
      return { source_status: "sa_decision_affirmed", verb: "found", status_label: "supervisory-authority decision, affirmed on appeal", status_in_citation: true };
    }
    // The per-product approved wording, ONLY where the fact it asserts (a
    // foreign, GDPR-family decision) is read off the profile; otherwise the
    // shared label, exactly as before.
    const override = conventions.sa_decision_label;
    return {
      source_status: "sa_decision",
      verb: "found",
      status_label: override && foreignGdprDecision(profile)
        ? override
        : "supervisory-authority decision — persuasive, non-binding outside its jurisdiction",
      status_in_citation: true,
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
        status_in_citation: true,
      };
    }
    const title = String(source.title ?? "");
    if (/^(Opinion|Recommendations)\b/i.test(title)) {
      return {
        source_status: "edpb_opinion",
        verb: "states",
        status_label: `EDPB Article 64 opinion${date ? `, adopted ${date}` : ""} — Board opinion, not a judicial decision`,
        status_in_citation: true,
      };
    }
    return {
      source_status: "edpb_guidelines_final",
      verb: "states",
      status_label: `EDPB Guidelines${date ? `, adopted ${date}` : ""} — interpretive guidance, not binding law`,
      status_in_citation: true,
    };
  }

  if (profile.source_table === "regulatory_guidance") {
    const regulator = (source.regulator ?? "").trim();
    if (!regulator) return { exclude: "regulatory_guidance row has no regulator" };
    return { source_status: "regulator_guidance", verb: "states", status_label: `${regulator} regulatory guidance — non-binding`, status_in_citation: true };
  }
  // DOC 231 §6 default #2 (proposed diff, applied verbatim) — the
  // cppa_fsor_commentary branch. No exclusion condition: unlike
  // edpb_guidelines (front-matter/draft status) or enforcement_actions
  // (vacated/remanded appeals), an FSOR row carries no analogous "not yet
  // final" state in its own schema (doc 231A verified the table's columns
  // read-only — see the follow-up log) — every profiled row is a published
  // agency position and always derives this status.
  //
  // DOC 238 §5.5.2 FOLLOW-UP — the label is still derived (it is true, and
  // S4 prints it mid-sentence), but whether the citation TRAILER carries it
  // is the product's convention: doc 236's approved ADMT FSOR citations
  // omit it, doc 234's Risk convention keeps it.
  if (profile.source_table === "cppa_fsor_commentary") {
    return {
      source_status: "regulator_guidance",
      verb: "states",
      status_label: "CPPA Final Statement of Reasons — agency position, primary regulator commentary",
      status_in_citation: conventions.fsor_status_in_citation !== false,
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
    // trailing parenthetical, and the appeal outcome for a FINAL/AFFIRMED
    // decision (real `appeal_status` column; `appeal_pending`/`vacated`/
    // `remanded` are handled elsewhere — `deriveSourceStatus` excludes
    // vacated/remanded outright and prints `sa_decision_appeal_pending`'s
    // own status label + LIA_APPEAL_SENTENCE for a pending one, so this
    // trailing note is only for an appeal that has already resolved). Both
    // are no-ops (identical output to before) when their inputs are absent,
    // which is every hook shipped today.
    //
    // DOC 238 FOLLOW-UP — the PRIMARY regulator name for the citation is the
    // native full name (`regulator_canonical`) only when that row's curator
    // has explicitly opted in (`regulator_canonical_in_citation`); the short
    // `regulator` otherwise. This is a per-row editorial choice, not a rule
    // derivable from the data alone: the SAME `regulator_canonical` value
    // ("Garante per la protezione dei dati personali") sits under two
    // already-CEO-approved citations that made opposite choices — doc 233's
    // Comune di Bolzano prints the short "Garante" and does NOT opt in; doc
    // 236's E1 prints the full name and does. `regulator` (the short form)
    // is untouched either way — it is what the mid-sentence `{regulator}`
    // shape slot uses, never the citation label built here.
    const canonical = (source.regulator_canonical ?? "").trim();
    const regulatorLabel = source.regulator_canonical_in_citation === true && canonical ? canonical : regulator;
    const english = (source.regulator_english_name ?? "").trim() ||
      (regulatorLabel === canonical ? KNOWN_REGULATOR_ENGLISH_GLOSS[canonical] ?? "" : "");
    const regulatorPart = english ? `${regulatorLabel} (${english})` : regulatorLabel;
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
    // package name and the page pinpoint; `page_ref` was already a real
    // `HookSourceRow` field but unused here, and `fsor_package` is threaded
    // through fresh (both added to `HookSourceRow` above). Parts that are
    // absent are skipped, never printed blank.
    //
    // DOC 238 §1.4 / §5.5.2 FOLLOW-UP (2026-09-09) — the label is now the
    // CEO's own FSOR citation form, the one EVERY FSOR citation in docs 234
    // and 236 uses (the doc 236 ones CEO-approved): "California Privacy
    // Protection Agency, Final Statement of Reasons, CCPA Updates, Cyber,
    // Risk, ADMT, and Insurance Regulations, 11 CCR § 7220(c)(1)[, Appendix
    // p. 13]" — not the doc 231A orchestrator default "CPPA Final Statement
    // of Reasons, <slug>, …". The package name is normalised from whichever
    // convention the row carries (`fsorPackageName`) and the page ref from
    // the DB's "Appendix, p. 13" to the approved "Appendix p. 13"
    // (`fsorPageRef`). The inline short label (`shortLabelForFsor`) and the
    // `{regulator}` slot are unchanged.
    const cite = (source.regulation_citation ?? "").trim();
    const pkg = fsorPackageName(source.fsor_package);
    const page = fsorPageRef(source.page_ref);
    const parts = ["California Privacy Protection Agency, Final Statement of Reasons", pkg, cite, page].filter((s) => s.length > 0);
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
    // DOC 238 — additive plumbing; null except for the specific hooks a
    // curator has populated.
    governing_provision_sentence: row.governing_provision_sentence ?? null,
    hedge_variant: row.hedge_variant ?? null,
    hedge_sentence: row.hedge_sentence ?? null,
    // DOC 223B RATIFICATION FOLLOW-UP (2026-09-09) — see hook-types.ts.
    literal_sentence_override: row.literal_sentence_override ?? null,
    // DOC 238 §5.5.2 FOLLOW-UP — derived per product × source table
    // (`deriveSourceStatus`); true for every hook except an ADMT FSOR one.
    status_in_citation: status.status_in_citation,
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
    // DOC 238 §5 item 6 FOLLOW-UP — derived for THIS product's approved
    // conventions (`HOOK_PRODUCT_CITATION_CONVENTIONS`); LIA/DPIA have none.
    const status = deriveSourceStatus(profile, source, row, input.product);
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
