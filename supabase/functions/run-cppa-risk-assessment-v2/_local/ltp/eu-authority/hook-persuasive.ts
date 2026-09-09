// DOC 231A (2026-09-08) — THE CEO'S SCOPE RULING, BUILT: "For CPPA Risk, we
// can still include a 'Persuasive Authority' at the end of the report which
// surfaces relevant GDPR guidance and regulator actions, and that Persuasive
// Authority would be IN ADDITION TO the hooks for FSOR content. It already
// exists in V2, so it should be easy to add."
//
// THE FINDING THIS FILE ACTS ON (recorded here, in full, once — the doc 231A
// follow-up log restates it): `eu_persuasive_authority`
// (./build.ts / ./types.ts, ITEM 341) is the V2 surface the ruling names,
// and this build keeps it in its EXISTING position, unrenamed, with FSOR
// content never folded into it. But it does NOT use the CAM relevance
// scorer, or any CAM row, at all — it is TOPIC-TRIGGERED
// (`deriveEuTopics(intake)`) against a separately-fetched
// `EuAuthorityCorpus` (EDPB guidance pins / OSS register counts / verified
// enforcement rows), a mechanism with no notion of a "ranked candidate" to
// extend. LIA's own H3 (doc 213B) extends `lia-persuasive-authority.ts`,
// which DOES rank CAM rows through `_shared/corpus/cam-relevance.ts`. CPPA
// Risk's own CAM (`_shared/corpus/maps/risk-corpus-map.ts`) is the closer
// analogue of LIA's CAM than `eu_persuasive_authority`'s own machinery is —
// so THIS module runs the CAM's scorer (the "(or the CAM's — find which and
// say)" branch the brief named) against risk-corpus-map.ts, and its output
// is spliced onto `eu_persuasive_authority` as a NEW field
// (`hook_authorities`) by a finalize-time step, leaving `build.ts`'s own
// topic-triggered logic byte-untouched (still governs `guidance` /
// `pattern_observations` / `verified_precedents` / `topics` exactly as
// today) and leaving `eu_persuasive_authority`'s report_data KEY, POSITION
// and EXISTING CONTENT unchanged whenever no hook renders (RISK_HOOKS ships
// empty today, so `hook_authorities` is never even set — see
// `applyRiskPersuasiveHookSplice` below).
//
// SOURCE-TABLE SPLIT (the ruling's "in ADDITION TO the hooks for FSOR
// content"): a hook whose source is `enforcement_actions` / `edpb_guidelines`
// / `regulatory_guidance` (GDPR-regime material, cited by analogy) is a
// persuasive candidate for THIS module; a hook whose source is
// `cppa_fsor_commentary` (CPPA's OWN authority) is never a candidate here —
// it renders exclusively through `persuasive_authority_hooks` (doc 231 §8's
// reserved key, populated by `applyRiskPersuasiveHookSplice` too, from the
// SAME `riskV3.applications` list, split by source_table).
//
// H3 PATTERN, CARRIED (doc 213B, `lia-persuasive-authority.ts`'s
// `hookCandidateRows` / `apEntries` / the render-only-through-an-application
// rule): a ratified hook is a self-contained persuasive candidate (its own
// `relevance` block, doc 213B §1.1, already on `AuthorityHook` —
// hook-types.ts, unmodified by this build); it is projected onto a synthetic
// `CamRow` so it competes in the SAME relevance ranking as the CAM's own
// hand-curated AP rows ("CAM row wins on duplicate source_row_id" — a hook
// whose source is already a render-eligible CAM AP row is not duplicated as
// a NEW ranking candidate, but is NOT excluded from the join's own input
// either, so it can still re-text that CAM row the same way H2/H3 let a hook
// re-text a CAM entry); a hook-backed entry's own synthetic display text
// NEVER reaches a customer — it renders only when hook-join.ts's
// `applyRiskHooks` actually produced an application for it.

import type { CamRelevanceProfile, CamRow, CamSurface } from "../../../../_shared/corpus/cam-types.ts";
import { RISK_CORPUS_MAP } from "../../../../_shared/corpus/maps/risk-corpus-map.ts";
import { attachCorpusRows } from "../../../../_shared/corpus/cam-attach.ts";
import { deriveRiskFiredStates } from "../../../../_shared/ltp/risk-skeleton-assemble.ts";
import {
  rankByRelevance,
  type RelevanceQuery,
  type ScoredRow,
} from "../../../../_shared/corpus/cam-relevance.ts";
import type { AuthorityHook, HookApplication } from "../../../../_shared/corpus/hook-types.ts";
import { riskProfileOf } from "../../corpus/maps/risk-relevance-profiles.ts";
import { FACTOR_SECTION } from "../hook-join.ts";
import { buildRiskRuleStates } from "../v3/rule-states.ts";
import { RISK_HOOKS_ENABLED } from "../risk-hooks-flag.ts";

export const RISK_HOOK_PERSUASIVE_STAMP = "risk-hook-persuasive@doc231a-2026-09-08";

type Bag = Record<string, unknown>;
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : "")).filter(Boolean) : []);

/** The `AuthorityRelevanceProfile.source_table` values the CEO's ruling
 *  scopes the eu_persuasive_authority extension to — GDPR-regime material,
 *  cited by analogy. `cppa_fsor_commentary` is deliberately excluded: it is
 *  CPPA's own authority and renders only through `persuasive_authority_hooks`
 *  (see `applyRiskPersuasiveHookSplice`'s split below). */
export const RISK_HOOK_PERSUASIVE_SOURCE_TABLES: ReadonlySet<string> = new Set([
  "enforcement_actions",
  "edpb_guidelines",
  "regulatory_guidance",
]);

/** `<source_table>:<row>:vN` is the shipped `hook_id` form
 *  (generate-corpus-hooks/_local/generate.ts's `shippedHook`) — the prefix
 *  names the profile's own `source_table`. An unrecognised or missing
 *  prefix degrades to `"enforcement_actions"` (mirrors
 *  lia-persuasive-authority.ts's own `sourceTableForHookId`) rather than
 *  reject the hook outright; `RISK_HOOK_PERSUASIVE_SOURCE_TABLES` is a
 *  three-member ALLOW-list read separately by every caller here, so this
 *  degrade can never smuggle an FSOR hook into the wrong surface — it can
 *  only ever mis-file an already-non-FSOR hook among the three GDPR tables,
 *  which are treated identically by every function in this file. */
const KNOWN_RISK_HOOK_SOURCE_TABLES: ReadonlySet<string> = new Set([
  "enforcement_actions",
  "edpb_guidelines",
  "regulatory_guidance",
  "cppa_fsor_commentary",
]);

export function sourceTableForHookId(hookId: string): string {
  const i = hookId.indexOf(":");
  const prefix = i === -1 ? "" : hookId.slice(0, i);
  return KNOWN_RISK_HOOK_SOURCE_TABLES.has(prefix) ? prefix : "enforcement_actions";
}

/** Every factor `FACTOR_SECTION` (hook-join.ts) knows a § 7150-7157 pinpoint
 *  for — the same 17-factor closed list `riskElementOf`
 *  (generate-corpus-hooks/_local/risk-factor-element.ts) uses. CPPA Risk has
 *  no three-part-test-style grouping (doc 229 §8 default #1): `elementOf`
 *  for the CAM scorer is therefore an IDENTITY map, not a real grouping —
 *  `scoreRelevance`'s live/passing-element scoring degrades to "one element
 *  per factor" rather than LIA's many-factors-per-element folding, which is
 *  the correct behaviour for a factor-level `bears_on_element` vocabulary. */
export function riskRelevanceElementOf(factorId: string): string | null {
  return factorId in FACTOR_SECTION ? factorId : null;
}

/**
 * Build the scorer query from the record's typed states and closed-list
 * facts. Pure. `instrument` is fixed to "EU GDPR": every candidate this
 * module ranks is GDPR-regime material (enforcement_actions / edpb_guidelines
 * / regulatory_guidance) cited by analogy into a California product — there
 * is no UK-specific angle for CPPA Risk the way LIA's own dual EU/UK pool
 * has, so `RelevanceQuery.instrument`'s cross-instrument branch never fires
 * here (every candidate is same-instrument by construction).
 *
 * `live_factor_ids` / `passing_factor_ids` come from `verdicts` — degrades to
 * two empty sets while `verdicts` is `{}` (doc 231 build-log NEED #2,
 * investigated and left empty this build — the doc 231A follow-up log
 * records the file/line evidence for why no clean
 * `Record<factor_id, verdict>` exists in the engine today). Ranking still
 * functions on `data_categories` / `flags` overlap alone.
 */
export function buildRiskPersuasiveQuery(intake: Bag, verdicts: Record<string, string>): RelevanceQuery {
  const states = buildRiskRuleStates(intake);
  const live = new Set<string>();
  const passing = new Set<string>();
  const PASSING = new Set(["passes", "likely_passes"]);
  for (const factorId of Object.keys(FACTOR_SECTION)) {
    const v = verdicts[factorId];
    if (!v) continue;
    if (PASSING.has(v)) passing.add(factorId);
    else live.add(factorId);
  }
  return {
    instrument: "EU GDPR",
    // [NEEDS] — CPPA Risk has no activity classifier (doc 231 build-log,
    // product-registry.ts's own [NEEDS] note); a class match can never
    // contribute to the score until one exists.
    use_case_class: null,
    live_factor_ids: live,
    passing_factor_ids: passing,
    // [NEEDS] — CPPA Risk has no closed relationship-to-subject field; same
    // reasoning, same file.
    relationship: null,
    data_categories: new Set(strs(intake.q4_pi_categories)),
    flags: new Set(states.flags),
  };
}

/** One synthetic `CamRow` per eligible hook (doc 213B `hookCandidateRows`,
 *  adapted): excluded when its `source_row_id` is already suppressed as
 *  determinative (`excludeSourceIds`), when its source_table is outside the
 *  three-table allow-list above (an FSOR hook is never a candidate here),
 *  or when its `source_row_id` already names a render-eligible CAM AP row
 *  in `RISK_CORPUS_MAP` with a matching source_table — "the CAM row wins on
 *  duplicate source" (the hook itself is NOT excluded from the join's own
 *  input by this — only from becoming a NEW ranking candidate). This row's
 *  own `display` text is filled only so it satisfies the scorer's shared
 *  `CamRow` shape; it is NEVER shown to a customer (see this file's header
 *  and `applyRiskPersuasiveHookSplice` below). */
export function riskHookCandidateRows(
  hooks: readonly AuthorityHook[],
  excludeSourceIds: ReadonlySet<string>,
): { rows: CamRow[]; profiles: ReadonlyMap<string, CamRelevanceProfile>; hookSourceIds: ReadonlySet<string> } {
  const camAllowedSourceIds = new Set(
    RISK_CORPUS_MAP.rows
      .filter((r) => r.role === "AP" && r.render_eligible && r.display && RISK_HOOK_PERSUASIVE_SOURCE_TABLES.has(r.source_table))
      .map((r) => r.source_row_id),
  );
  const rows: CamRow[] = [];
  const profiles = new Map<string, CamRelevanceProfile>();
  const hookSourceIds = new Set<string>();
  for (const hook of hooks) {
    const table = sourceTableForHookId(hook.hook_id);
    if (!RISK_HOOK_PERSUASIVE_SOURCE_TABLES.has(table)) continue; // FSOR (or unknown) — never a candidate here
    if (excludeSourceIds.has(hook.source_row_id)) continue;
    if (camAllowedSourceIds.has(hook.source_row_id)) continue; // the CAM row wins
    const rel = hook.relevance;
    rows.push({
      id: `cppa-risk/hook/${hook.hook_id}`,
      factor_id: hook.factor_id,
      role: "AP",
      source_table: table as CamRow["source_table"],
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
      provenance: { verified_on: "" },
      curation_note:
        "DOC 231A — synthetic ranking candidate for a ratified CPPA Risk hook (hook-persuasive.ts riskHookCandidateRows). This row's own display text never reaches a customer: it renders only when hook-join.ts's applyRiskHooks produces an application for it, and is dropped otherwise, however far it ranked.",
    });
    profiles.set(`cppa-risk/hook/${hook.hook_id}`, {
      country: "",
      instrument: "EU GDPR",
      factor_ids: rel.factor_ids,
      use_case_class: rel.use_case_class,
      outcome_posture: hook.posture,
      relationship: null, // CPPA Risk has no relationship vocabulary — see this file's header
      data_categories: rel.data_categories,
      flags: rel.flags,
    });
    hookSourceIds.add(hook.source_row_id);
  }
  return { rows, profiles, hookSourceIds };
}

export const RISK_PERSUASIVE_LIMIT = 5;

/**
 * The ranked candidate list: CAM AP rows (`RISK_CORPUS_MAP`, the three
 * eligible source tables) PLUS hook-backed synthetic rows, ranked by the
 * CAM's own relevance scorer. Returns `[]` today regardless of intake — no
 * CAM row carries a `relevance_profile` yet (verified this session) and
 * `RISK_HOOKS` ships empty, so there is nothing to rank either way.
 */
export function rankRiskPersuasiveCandidates(
  intake: Bag,
  verdicts: Record<string, string>,
  hooks: readonly AuthorityHook[],
  determinativeSourceIds: ReadonlySet<string>,
): { ranked: ScoredRow[]; hookSourceIds: ReadonlySet<string> } {
  const query = buildRiskPersuasiveQuery(intake, verdicts);
  const baseRows = determinativeSourceIds.size
    ? RISK_CORPUS_MAP.rows.filter((r) => !determinativeSourceIds.has(r.source_row_id))
    : RISK_CORPUS_MAP.rows;
  const eligibleCamRows = baseRows.filter((r) => RISK_HOOK_PERSUASIVE_SOURCE_TABLES.has(r.source_table));
  const { rows: hookRows, profiles: hookProfiles, hookSourceIds } = riskHookCandidateRows(hooks, determinativeSourceIds);
  const candidateRows = [...eligibleCamRows, ...hookRows];
  const profileOfRow = (row: CamRow): CamRelevanceProfile | undefined => hookProfiles.get(row.id) ?? riskProfileOf(row);
  const ranked = rankByRelevance(candidateRows, query, {
    profileOf: profileOfRow,
    elementOf: riskRelevanceElementOf,
    limit: RISK_PERSUASIVE_LIMIT,
  });
  return { ranked, hookSourceIds };
}

/** `rankedSourceIds` for `applyRiskHooks` / `planRiskHookSelection` (doc 231
 *  build-log NEED #3, "the Persuasive Authority section's own ranked source
 *  ids (best first) after the H3 extension"). Pure convenience wrapper. */
export function riskPersuasiveRankedSourceIds(
  intake: Bag,
  verdicts: Record<string, string>,
  hooks: readonly AuthorityHook[],
  determinativeSourceIds: ReadonlySet<string>,
): readonly string[] {
  return rankRiskPersuasiveCandidates(intake, verdicts, hooks, determinativeSourceIds).ranked.map((sr) => sr.row.source_row_id);
}

/** The FC/AP/AOW roles NEED #3 names ("a fired FC / S0 / AP / AOW CAM row")
 *  — "S0" in that phrase names the SURFACE an FC row fires on (cam-types.ts's
 *  header: FC renders on S0 freely, or on S4 only with a map-level
 *  `s4_ratification` stamp `RISK_CORPUS_MAP` does not carry), not a fourth
 *  role; CamRole itself is only AQ/FC/AP/SB/AOW. */
const DETERMINATIVE_ROLES: ReadonlySet<CamRow["role"]> = new Set(["FC", "AP", "AOW"]);
const ALL_SURFACES: readonly CamSurface[] = ["S0", "S1", "S2", "S3", "S4", "S5"];

/**
 * `determinativeSourceIds` for `applyRiskHooks` (doc 231 build-log NEED #3,
 * "source ids already cited by a fired FC/S0/AP/AOW CAM row for the same
 * report — same-authority-never-twice"). Reuses the EXISTING, already
 * battle-tested fired-state derivation
 * (`deriveRiskFiredStates`/`attachCorpusRows`, _shared/ltp/risk-skeleton-assemble.ts)
 * rather than re-deriving fired tokens a second way — same law
 * `buildPersuasiveAuthority` (Appendix B, that file) already applies to its
 * own S5 slice; this function generalises it across every surface a
 * determinative role can render on, since the same-authority suppression is
 * about the SOURCE being cited anywhere determinatively, not about one
 * particular surface. Pure; never throws (both underlying calls already are).
 */
export function riskDeterminativeSourceIds(report: Bag, intake?: Bag): Set<string> {
  const fired = deriveRiskFiredStates(report, intake);
  const ids = new Set<string>();
  for (const surface of ALL_SURFACES) {
    for (const row of attachCorpusRows(RISK_CORPUS_MAP, surface, fired)) {
      if (DETERMINATIVE_ROLES.has(row.role)) ids.add(row.source_row_id);
    }
  }
  return ids;
}

// ── The finalize-time splice (riskV3.applications -> the two render surfaces) ──

export interface RiskPersuasiveSpliceResult {
  readonly eu_authorities_written: number;
  readonly fsor_hooks_written: number;
}

/**
 * Split `riskV3.applications` (hook-join.ts's `applyRiskHooks` output, via
 * `attachRiskHookSelection`) by source table and write each half onto its
 * own render surface — the CEO ruling's "wire BOTH writes from
 * riskV3.applications, gated on RISK_HOOKS_ENABLED, split by the
 * application's source table":
 *   - enforcement_actions / edpb_guidelines / regulatory_guidance ->
 *     `report.eu_persuasive_authority.hook_authorities` (NEW field on the
 *     EXISTING V2 section — see this file's header for why it is additive,
 *     not a rewrite of `build.ts`'s topic-triggered logic);
 *   - cppa_fsor_commentary -> `report.persuasive_authority_hooks.applications`
 *     (doc 231 §8's reserved key, populated for the first time).
 *
 * RENDER LAW: each surface is set ONLY when its half is non-empty — absent
 * (not an empty array/object) when empty, so a flag-off or hooks-empty
 * generation is BYTE-IDENTICAL to before this function existed (the doc 231
 * dark-mode law). Mutates `report` in place (matches every other
 * finalize-time write site in generate-cppa-risk.ts — CSC, activities,
 * exceptions); never throws.
 *
 * `enabledOverride` — the SAME test seam LIA's own H3 build used
 * (lia-persuasive-authority.ts's `ctx.hooks` doc comment): `RISK_HOOKS_ENABLED`
 * is a module-scope constant read once from `Deno.env` at first import, so a
 * test running inside the fleet's shared `deno test <dir>` process can never
 * observe it flip true (and other files in this same directory assert it is
 * false — doc231-zero-call-regression.test.ts). Omitted (every real call
 * site) -> the real flag governs, unchanged. A test supplies `true`
 * directly, independent of the env var, to exercise the "flag on" branch.
 */
export function applyRiskPersuasiveHookSplice(
  report: Record<string, unknown>,
  applications: readonly HookApplication[],
  enabledOverride?: boolean,
): RiskPersuasiveSpliceResult {
  const enabled = enabledOverride ?? RISK_HOOKS_ENABLED;
  if (!enabled || applications.length === 0) return { eu_authorities_written: 0, fsor_hooks_written: 0 };

  const euApplications = applications.filter((a) => RISK_HOOK_PERSUASIVE_SOURCE_TABLES.has(sourceTableForHookId(a.hook_id)));
  const fsorApplications = applications.filter((a) => sourceTableForHookId(a.hook_id) === "cppa_fsor_commentary");

  if (euApplications.length > 0) {
    const existing = report.eu_persuasive_authority;
    const section = existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
    section.hook_authorities = euApplications.map((a) => ({
      hook_id: a.hook_id,
      source_row_id: a.source_row_id,
      fact_agreement: a.fact_agreement,
      shape: a.shape,
      text: a.sentence,
      label: a.label,
    }));
    report.eu_persuasive_authority = section;
  }

  if (fsorApplications.length > 0) {
    report.persuasive_authority_hooks = {
      section_title: "Persuasive authority — CPPA guidance",
      version: RISK_HOOK_PERSUASIVE_STAMP,
      status: "authority_available",
      applications: fsorApplications.map((a) => ({
        hook_id: a.hook_id,
        source_row_id: a.source_row_id,
        fact_agreement: a.fact_agreement,
        shape: a.shape,
        text: a.sentence,
        label: a.label,
      })),
    };
  }

  return { eu_authorities_written: euApplications.length, fsor_hooks_written: fsorApplications.length };
}
