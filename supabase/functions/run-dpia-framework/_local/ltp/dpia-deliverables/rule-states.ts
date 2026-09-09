// DOC 232 — `buildDpiaRuleStates(report, intake, engagementMap)`.
//
// Adapts DPIA's typed/deterministic facts into the generic rule
// interpreter's `TypedStateBag` (`_shared/corpus/rule-types.ts`) — the SAME
// atom grammar (`flag:` / `class:` / `relationship:` / `data_category:` /
// `instrument:` / `verdict:` / `state:<path>=<value>`) LIA's own
// `buildLiaRuleStates` (run-li-assessment/_local/ltp/lia-deliverables/
// rule-states.ts, reference only — never imported) produces. Filename is
// deliberately `rule-states.ts` (not `dpia-rule-states.ts`) so it matches
// the EXISTING generic entry in
// tests/edge/corpus/corpus-relevance-rule-boundary.test.ts's
// `RULE_INTERPRETER_ALLOWED_IMPORTERS` (`/(^|\/)rule-states\.ts$/`) without
// needing a change to that shared test file.
//
// DOC 230 decision 5 / doc 232 build log — THE ENGAGEMENT MAP IS THE RULE
// PASS HERE: DPIA has no `authority_rules`/`RULE_PRODUCT_REGISTRY` entry (no
// rules-as-data engine exists for this product), but `buildDpiaEngagementMap`
// (`_shared/engagement-map.ts`) already computes a deterministic
// engaged/not_engaged/conditional verdict for the Art. 35(3) triggers and
// two of WP248's nine criteria (R_WP248_CHILDREN — criterion 4/7 "vulnerable
// data subjects/children"; R_WP248_INNOVATIVE_TECH — criterion 8
// "innovative use") from the SAME intake facts a hook would otherwise have
// to read via a `flag:`/`class:` atom. Rather than re-derive those same
// signals a second time (a duplication that could silently drift from the
// engagement map's own regex), every `EngagementEntry` is projected
// VERBATIM into a `state:engagement_map.<rule_id>=<status>` atom — exactly
// the atom the build brief specifies. This is also the mechanism that lets
// `dpia-hook-join.ts` SUPPRESS a WP248 hook whose passage duplicates
// R_WP248_CHILDREN / R_WP248_INNOVATIVE_TECH (doc 232's WP248 rule-vs-hook
// enumeration): the join drops any hook whose `source_row_id` is in the
// curation-time suppression list, so a hook profiled from one of those two
// WP248 passages is never even drafted (see dpia-hook-join.ts's own
// `DPIA_ENGAGEMENT_MAP_SUPPRESSED_SOURCE_IDS` note) — this file's
// `state:engagement_map.*` atoms exist for the OTHER direction: a hook that
// bears on a DIFFERENT WP248 criterion (e.g. criterion 3, systematic
// monitoring — NOT an engagement-map rule today) may still want to know
// whether a *related* engagement-map rule already fired, to avoid arguing a
// point the report has already made deterministically.

import type { TypedStateBag } from "../../../../_shared/corpus/rule-types.ts";
import type { EngagementMap } from "../../../../_shared/engagement-map.ts";
import { DPIA_REASON_SLUGS } from "./dpia-reasons-vocabulary.ts";

type Bag = Record<string, unknown>;

const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});
const str = (v: unknown): string => (v == null ? "" : String(v));
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function get(root: Bag, path: string): unknown {
  let cur: unknown = root;
  for (const seg of path.split(".")) {
    cur = bag(cur)[seg];
    if (cur === undefined) return undefined;
  }
  return cur;
}

function stateValue(v: unknown): string | number | boolean | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return v.map((x) => String(x)).join(", ");
  return null;
}

/** DPIA's flat intake closed-list fields a hook's `state:intake.<path>`
 *  atom may reference (never free-text fields — those are the doc 230 §2 /
 *  v3/field-labels.ts surface, read only by the two-leg pass, never by an
 *  atom). */
const INTAKE_STATE_PATHS: readonly string[] = [
  "jurisdictions",
  "data_categories",
  "legal_basis_proposed",
  "article_9_condition",
  "imagery_capture",
  "imagery_capture_spaces",
  "controller_sector",
  "controller_country",
];

function instrumentOf(intake: Bag): string {
  const jur = arr(intake.jurisdictions).map((j) => str(j));
  const isUk = jur.some((j) => /UK|United Kingdom/i.test(j));
  const isEu = jur.some((j) => /EU|European|EEA|GDPR/i.test(j)) && !isUk;
  if (isEu) return "EU GDPR";
  if (isUk) return "UK GDPR";
  // Both, or neither recorded: EU GDPR is the DPIA product's own default
  // instrument label (mirrors dpia-jurisdiction-registry.ts's own EU-first
  // default) — a hook keyed on `instrument:EU GDPR` degrades safely
  // (simply does not nominate) on a record with no jurisdiction at all.
  return "EU GDPR";
}

/** First matching use-case class, in priority order (most specific first);
 *  `null` when none of the closed `reasons_to_conduct` options that map to
 *  a class are recorded. A first-pass, documented judgment call (doc 232):
 *  DPIA's intake has no closed "relationship"-style single-select the way
 *  LIA's `interest_type` does, so this is derived from `reasons_to_conduct`
 *  instead. */
const USE_CASE_CLASS_BY_SLUG: readonly (readonly [string, string])[] = [
  ["systematic_monitoring", "employee_monitoring"],
  ["art35_3c_public_area_monitoring", "public_space_surveillance"],
  ["automated_decision_making", "algorithmic_decision"],
  ["evaluation_scoring", "algorithmic_decision"],
  ["art35_3a_evaluation_profiling", "algorithmic_decision"],
  ["innovative_technology", "innovative_technology_use"],
  ["matching_combining_datasets", "dataset_matching"],
];

function useCaseClassOf(reasonSlugsHeld: ReadonlySet<string>): string | null {
  for (const [slug, cls] of USE_CASE_CLASS_BY_SLUG) {
    if (reasonSlugsHeld.has(slug)) return cls;
  }
  return null;
}

/** A light, first-pass text signal for who is affected — DPIA has no closed
 *  relationship field (unlike LIA's `relationship_type`); derived from
 *  `data_categories` ("Employee records") and a text scan of `data_subjects`
 *  in the SAME register `buildDpiaEngagementMap` already uses for its own
 *  lexicon checks (doc 232: documented, not claimed authoritative). */
function relationshipOf(intake: Bag): string | null {
  const cats = arr(intake.data_categories).map((c) => str(c).toLowerCase());
  const subjects = str(intake.data_subjects).toLowerCase();
  if (cats.includes("employee records") || /\bemployee/i.test(subjects)) return "employee";
  if (cats.includes("customer records") || /\bcustomer/i.test(subjects)) return "customer";
  if (/\bpublic\b|\bmembers of the public\b|\bpassers?[- ]by\b/i.test(subjects)) return "public";
  return null;
}

/** DPIA's own `data_categories` closed list (DATA_CATS,
 *  src/pages/DPIAFramework.enums.ts) mapped to the `flag:` vocabulary a hook
 *  may test — booleans, so a hook can key on presence/absence rather than
 *  the raw category string alone (mirrors LIA's flags-derived-from-
 *  categories pattern, e.g. its own `flag:special_category`). */
function flagsFrom(intake: Bag, engagementMap: EngagementMap | undefined): string[] {
  const cats = arr(intake.data_categories).map((c) => str(c));
  const flags = new Set<string>();
  if (cats.includes("Biometric data")) flags.add("biometric");
  if (cats.includes("Health or medical data")) flags.add("special_category");
  if (cats.includes("Children's data")) flags.add("children");
  const reasons = arr(intake.reasons_to_conduct).map((r) => str(r));
  if (reasons.some((r) => r.includes("large scale") || r.includes("Large-scale") || r.includes("large-scale"))) {
    flags.add("large_scale");
  }
  if (reasons.some((r) => r.includes("vulnerable"))) flags.add("vulnerable_subjects");
  if (
    reasons.some((r) => /automated decision-making|evaluation or scoring|Systematic, extensive evaluation/i.test(r))
  ) {
    flags.add("automated_decision");
  }
  if (arr(intake.transfer_flows).length > 0) flags.add("cross_border_transfer");
  // The engagement map's own children / large-scale determinations are a
  // second, independent signal (its lexicon scan reads `description` +
  // `purpose` + `data_categories` + `data_subjects` together, catching cases
  // the closed-list checks above miss) — OR'd in rather than replacing the
  // closed-list checks, never overriding a `false` with a `true` removal.
  const entries = engagementMap?.entries ?? [];
  const entry = (id: string) => entries.find((e) => e.rule_id === id);
  if (entry("R_WP248_CHILDREN")?.status === "engaged") flags.add("children");
  if (
    entry("R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES")?.status === "engaged" ||
    entry("R_ART_35_3_C_PUBLIC_MONITORING")?.status === "engaged"
  ) {
    flags.add("large_scale");
  }
  return [...flags];
}

/**
 * DOC 232 — a first-pass, documented deterministic proxy for the two DPIA
 * hook elements (there is no existing typed pass/fail verdict for either in
 * `attachDpiaDeliverables` this build could reuse without risking a
 * misreading of that 4,000+ line module's internals — flagged
 * [NEEDS: CEO/legal review] in the build log rather than guessed at more
 * deeply than this):
 *
 *  - `obligation` — whether Article 35 is MANDATORILY triggered (not merely
 *    exercised as best practice): "passes" when the engagement map finds ANY
 *    of the three Art. 35(3) triggers "engaged", or the record's own closed
 *    `reasons_to_conduct` answer selects one of the three Art. 35(3) options
 *    directly (the trigger is confirmed — the SAME state at which a
 *    "rejected"-posture trigger hook is REDUNDANT with the engagement map's
 *    own rule and drops as `rule_missing`, doc 213 §4's lawyer's rule);
 *    "uncertain" when any Art. 35(3) trigger is "conditional", or a
 *    WP248-only reason is recorded with no Art. 35(3) trigger settled either
 *    way; "fails" otherwise (voluntary / beneficial reasons only, or none
 *    recorded — an adverse trigger authority would be NEWS here, so S2
 *    renders).
 *  - `adequacy` — whether the DPIA's own necessity/proportionality content
 *    is documented to a baseline standard: "passes" when
 *    `necessity_proportionality` carries a substantive answer AND at least
 *    one alternative is recorded with a rejection reason; "uncertain" when
 *    only one of the two holds; "fails" when neither does.
 *
 * VALUE CHOICE IS LOAD-BEARING, NOT COSMETIC: `hook-types.ts`'s
 * `isPassingVerdict` (SHARED, unmodified — on the "do not touch" list) is
 * hardcoded to the literal strings `"passes"` / `"likely_passes"` — it is
 * NOT actually product-agnostic in the values it accepts, only in the code
 * path. A DPIA-specific vocabulary ("mandatory"/"adequate", this file's
 * first draft) silently made EVERY DPIA verdict "non-passing" to
 * `directionFor`, which would have broken the lawyer's rule (an adverse
 * trigger hook on a customer whose own record plainly shows the trigger
 * would print S2 — "cuts against" — instead of correctly dropping as
 * `rule_missing`) and made S5b unreachable for DPIA entirely. Found by this
 * build's own test suite (doc232-dpia-hook-join.test.ts) before it shipped.
 * Fixed by using `directionFor`'s own passing vocabulary directly rather
 * than proposing a change to shared code; the PROPOSED DIFF to make
 * `isPassingVerdict` product-configurable is recorded in doc 232's build log
 * for the orchestrator, not applied here.
 */
const ART35_3_SLUGS: ReadonlySet<string> = new Set([
  "art35_3a_evaluation_profiling",
  "art35_3b_large_scale_special_category",
  "art35_3c_public_area_monitoring",
]);
const WP248_ONLY_SLUGS: ReadonlySet<string> = new Set([
  "evaluation_scoring",
  "automated_decision_making",
  "systematic_monitoring",
  "sensitive_data",
  "large_scale",
  "matching_combining_datasets",
  "vulnerable_subjects",
  "innovative_technology",
  "prevents_exercising_right",
]);

function obligationVerdict(
  reasonSlugsHeld: ReadonlySet<string>,
  engagementMap: EngagementMap | undefined,
): string {
  const entries = engagementMap?.entries ?? [];
  const art353 = entries.filter((e) =>
    e.rule_id === "R_ART_35_3_A_AUTOMATED_DECISIONS" ||
    e.rule_id === "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES" ||
    e.rule_id === "R_ART_35_3_C_PUBLIC_MONITORING"
  );
  const anyEngaged = art353.some((e) => e.status === "engaged") ||
    [...reasonSlugsHeld].some((s) => ART35_3_SLUGS.has(s));
  if (anyEngaged) return "passes";
  const anyConditional = art353.some((e) => e.status === "conditional") ||
    [...reasonSlugsHeld].some((s) => WP248_ONLY_SLUGS.has(s));
  if (anyConditional) return "uncertain";
  return "fails";
}

function adequacyVerdict(intake: Bag): string {
  const necessity = str(intake.necessity_proportionality).trim();
  const hasNecessity = necessity.length >= 40; // matches SELECTION_MIN_ANSWER_CHARS-scale usability, not a legal sufficiency claim
  const alternatives = arr(intake.alternatives_considered);
  const hasAlternatives = alternatives.some((a) => str(bag(a).rejection_reason).trim().length > 0);
  if (hasNecessity && hasAlternatives) return "passes";
  if (hasNecessity || hasAlternatives) return "uncertain";
  return "fails";
}

export function buildDpiaRuleStates(
  report: Bag,
  intake: Bag,
  engagementMap?: EngagementMap,
): TypedStateBag {
  const reasonsRaw = arr(intake.reasons_to_conduct).map((r) => str(r));
  const reasonSlugsHeld = new Set<string>();
  for (const [text, slug] of Object.entries(DPIA_REASON_SLUGS)) {
    if (reasonsRaw.includes(text)) reasonSlugsHeld.add(slug);
  }

  const states: Record<string, string | number | boolean | null> = {};
  for (const path of INTAKE_STATE_PATHS) {
    states[`intake.${path}`] = stateValue(get(intake, path));
  }
  for (const [, slug] of Object.entries(DPIA_REASON_SLUGS)) {
    states[`intake.reasons_to_conduct.${slug}`] = reasonSlugsHeld.has(slug);
  }
  states["intake.reasons_to_conduct.recorded"] = reasonsRaw.length > 0;

  if (engagementMap) {
    for (const e of engagementMap.entries) {
      states[`engagement_map.${e.rule_id}`] = e.status;
    }
  }

  const verdicts: Record<string, string> = {
    obligation: obligationVerdict(reasonSlugsHeld, engagementMap),
    adequacy: adequacyVerdict(intake),
  };

  return {
    instrument: instrumentOf(intake),
    use_case_class: useCaseClassOf(reasonSlugsHeld),
    relationship: relationshipOf(intake),
    data_categories: arr(intake.data_categories).map((c) => str(c)),
    flags: flagsFrom(intake, engagementMap),
    verdicts,
    states,
  };
}

// Re-export for callers/tests that want the raw report bag untouched (the
// parameter is accepted, not read, today — DPIA has no typed determination
// this build could safely read off `report` without risking a misreading of
// attachDpiaDeliverables's 4,000+ line internals; see the [NEEDS] note
// above). Kept as a parameter (not dropped) so a future build can wire a
// richer verdict without changing this function's call sites.
export type { Bag as DpiaRuleStatesBag };
