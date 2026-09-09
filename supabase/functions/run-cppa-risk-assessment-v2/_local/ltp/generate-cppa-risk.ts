/**
 * ITEM 357 — ONE SHARED CPPA-RISK GENERATION MODULE.
 *
 * Retires the cutover-attempt model (six Phase-2 failures) by removing the
 * thing that kept failing: TWO code paths (harness vs production) that had to
 * be reconciled by hand every attempt.
 *
 * This module owns the COMPLETE path:
 *
 *   entry-intake normalization (Item 350)
 *     → Pass-1 (deterministic derivePlan | model provider)
 *     → assembleReport (composers, deliverables)
 *     → emit-gate + Item-352 customer whitelist (canonical needs set)
 *     → LEAK-PREV-P2 whitelist serialization
 *     → FINAL PERSISTED-PAYLOAD SHAPE
 *
 * The value returned by `generateCppaRiskReport().report` IS the object that
 * gets written to `cppa_assessments.report_data`. Nothing may be added to the
 * payload downstream of this module — that is the invariant that makes the
 * versioned surface contract un-divergable from the shipped payload.
 *
 * ITEM 357 (2a) — TELEMETRY RELOCATION. `_engine_path` and `_ltp` were
 * top-level customer keys on the Item-355(#6) live payload (34 keys against a
 * 32-key contract). Both are telemetry: they now live under
 * `_meta.internal.engine_path` / `_meta.internal.ltp`. `risk_assessment_by_activity`
 * is the § 7152 per-activity carrier — legitimate customer content, produced by
 * the emit-gate stage, and DECLARED in the contract (33 keys).
 *
 * ITEM 357 (2b) — PASS-2R LIFECYCLE. Pass-2R no longer runs after the request
 * lifecycle has ended. `runCppaRiskPass2R` is awaited INSIDE the shell's
 * `EdgeRuntime.waitUntil` task and performs the row UPDATE itself. Silent
 * fallback is a defect: when the shipped surface stays "deterministic", a
 * non-null `pass2r_skipped_reason` (or a non-empty rejection list) is always
 * recorded on the row.
 */
import { resolveLtpIntake } from "./entry-intake.ts";
import { isRiskSufficiencyRecord } from "../../../_shared/report-contracts/risk-sufficiency.ts";
import { derivePlan } from "./derive.ts";
import { modelProvider } from "./replay/providers.ts";
import { assembleReport, buildTypeJWriteAroundBody } from "./pass2-assembler.ts";
import { runProsePassStage, PASS2R_MANIFEST } from "./pass2r-llm.ts";
import { PASS1_MANIFEST } from "./pass1-llm.ts";
import { fetchEuAuthorityCorpus } from "./eu-authority/fetch.ts";
import { runEmitGate, filterCustomerInformationNeeded } from "../../../_shared/emit-gate.ts";
import { serializeCustomerReport } from "../../../_shared/report-serialize.ts";
// UPGRADE-2 (ITEMS 2+3) — runtime §§ 7150-7157 corpus + shared authority exhibit.
import {
  fetchRiskCorpus,
  buildRiskCorpusLawBlock,
  riskCorpusProvisionsForExhibit,
  EMPTY_RISK_CORPUS,
  type RiskCorpus,
} from "./risk-corpus.ts";
import { buildAuthorityExhibit } from "../../../_shared/report-exhibits/authority-exhibit.ts";
import { CPPA_RISK_REPORT_SCHEMA } from "../report-schemas/cppa-risk.ts";
import { computeRecordNeeds } from "./section-composers/cppa-risk.ts";
// ITEM 378 (CORRECTION) — refinement + CSC + stamp on the ROUTED LTP path.
import { RISK_PIPELINE_STAMP } from "./risk-stamp.ts";
import { attachRiskCsc } from "../../../_shared/ltp/risk-csc.ts";
// ITEM 427 — canonical `risk_assessment_by_activity` emission (LAW 3 write site).
import { normalizeRiskActivities, RISK_ACTIVITIES_CONTRACT_VERSION } from "./risk-activity-emit.ts";
import { normalizeRiskSummaryVoice } from "./risk-summary-voice.ts";
// ITEM 428-B — pre-gate re-home of reserved-determination referral prose.
import { rehomeReservedReferrals } from "./risk-summary-rehome.ts";
import { structureConformanceTelemetry } from "../../../_shared/prose/structure-conformance.ts";
import {
  normalizeRiskExceptions,
  RISK_EXCEPTIONS_CONTRACT_VERSION,
} from "../../../_shared/report-contracts/risk-exceptions.ts";
import { RISK_REFINEMENT_CONFIG, runRiskRefinement } from "./risk-refinement.ts";
import { emptyTelemetryFor, type RefinementDeps, type RefinementTelemetry } from "../../../_shared/ltp/refinement-core.ts";
// ITEM 379 — bidirectional coverage matrix + soft release ledger.
import {
  runCoverageMatrix,
  coverageListForCritic,
  coverageAnchorTokens,
  attachCoverage,
  type CoverageTelemetry,
} from "../../../_shared/ltp/coverage-matrix.ts";
import { attachReleaseLedger } from "../../../_shared/ltp/release-ledger.ts";
// ITEM 380 — the deterministic truth gate and placeholder classification.
import {
  affirmativeParagraph,
  attachRecordComplete,
  classifyPlaceholders,
  computeRecordComplete,
  isByDesignActionSurface,
} from "../../../_shared/ltp/record-complete.ts";
// ITEM 384 — the gold-standard prose pass (G-1, G-2, G-4, G-6).
import { applyRiskProseGold } from "./risk-prose-gold.ts";
// ITEM SO-1 (WIRE-IN) — assembly through the byte-pinned v3 skeleton.
import {
  assembleRiskSkeletonDocument,
  RISK_SKELETON_ASSEMBLER_STAMP,
} from "../../../_shared/ltp/risk-skeleton-assemble.ts";
// ITEM 399 R11 — assembled-prose lint (detect-only telemetry).
import { attachProseLint } from "../../../_shared/prose/assembled-prose-lint.ts";
import { cppaRiskContract } from "../../../_shared/intake-contracts/cppa-risk-assessment.ts";
// DOC 231 — CPPA RISK V3 (dark; RISK_V3_ENABLED default false, RISK_HOOKS
// ships empty — see risk-v3-selection.ts's header for the zero-call
// guarantee this wiring relies on).
import { attachRiskHookSelection, type RiskV3DbClient, type RiskV3SelectionRecord } from "./risk-v3-selection.ts";
// DOC 231A — CPPA RISK V3 hook selection's rankedSourceIds/determinativeSourceIds
// (doc 231 build-log NEED #3), now wired from the H3-style Persuasive
// Authority ranking; and the finalize-time splice of riskV3.applications
// onto eu_persuasive_authority.hook_authorities / persuasive_authority_hooks
// (the CEO's scope ruling — see hook-persuasive.ts's header for the design).
import { RISK_HOOKS } from "../corpus/maps/risk-hooks.ts";
import {
  applyRiskPersuasiveHookSplice,
  riskDeterminativeSourceIds,
  riskPersuasiveRankedSourceIds,
} from "./eu-authority/hook-persuasive.ts";
// DOC 231A — the ROO surface (doc 231 build-log NEED #5). See
// risk-v3-selection.ts's `RiskV3InformationNeededEntry` header for the
// investigated finding this append relies on: report.information_needed's
// PRODUCTION shape is `string[]` (pass2-assembler.ts's renderTemplateSection
// never sets `structured`/`typedSufficiency` for this key), so a plain
// string survives `serializeCustomerReport` untouched (report-serialize.ts's
// `pruneEntry` returns a non-object entry as-is) — no allow-list edit needed.
import { RISK_ROO_UNSETTLED_TEMPLATE } from "./v3/readback-templates.ts";


export const CPPA_RISK_GENERATOR_STAMP = "generate-cppa-risk@2026-08-01-item357";
export { RISK_PIPELINE_STAMP };


export type Pass1Mode = "deterministic" | "model";

export interface GenerateCppaRiskOptions {
  /** Supabase client; only used to fetch the EU persuasive-authority corpus. */
  readonly db?: unknown;
  /** Pre-fetched EU corpus (harness / tests may pass an empty array). */
  readonly euCorpus?: unknown;
  readonly buildStamp: string;
  readonly runId?: string;
  /** "enforce" ships assembled content; "observe" is shadow-only. */
  readonly mode?: "enforce" | "observe";
  /** "deterministic" = derivePlan only (no model spend). Default "model". */
  readonly pass1?: Pass1Mode;
  readonly callerName?: string;
  /** Test/harness seam: inject the Pass-2R model call (hermetic runs, no spend). */
  // deno-lint-ignore no-explicit-any
  readonly pass2rCall?: any;
  /** Set false to skip Pass-2R entirely (records an explicit reason). */
  readonly pass2rEnabled?: boolean;
  /** UPGRADE-2 — pre-resolved §§ 7150-7157 corpus (test seam; else fetched from db). */
  readonly riskCorpus?: RiskCorpus;
  /**
   * ITEM 378 (CORRECTION) — critic/verifier callers for the refinement pass.
   * Omitted (tests/harnesses without model access) ⇒ refinement records
   * `enabled:false` telemetry and the document proceeds unchanged.
   */
  readonly refinementDeps?: RefinementDeps;
  /** Set false to skip the refinement pass explicitly. */
  readonly refinementEnabled?: boolean;
  /** RK2 — when true, csc/prose post-passes run detect-only (no document mutations). */
  readonly postPassDetectOnly?: boolean;
  /** DOC 231 — CPPA RISK V3 hook selection (dark). Supabase client for
   *  reading/writing `hook_selections`; omitted (tests/harnesses, and
   *  every caller until the CEO wires it) ⇒ no prior selections are read
   *  and no new call is ever made even if RISK_V3_ENABLED were true.
   *  Typed `unknown` (matching this interface's own `db?: unknown` field
   *  above) and cast to `RiskV3DbClient` only at the point of use — a
   *  structural check of the FULL supabase-js generated client type
   *  against a narrow interface at this call site produced `TS2589
   *  excessively deep type instantiation` in index.ts. */
  readonly riskV3Db?: unknown;
  /** DOC 231 — `tool_run_meter` values the selection cap and generation
   *  number key on. `[NEEDS]` (doc 231 build log): the shell
   *  (index.ts `runPipeline`) does not yet read the meter BEFORE calling
   *  this module (it reads it AFTER, via `recordRunMeterAndVersion`), so
   *  this is omitted in production today and the conservative defaults
   *  below (`runsAllowed: 4, generationNo: 1`) apply — inert regardless,
   *  since RISK_V3_ENABLED defaults false and RISK_HOOKS ships empty. */
  readonly riskV3Meter?: { readonly runsAllowed: number; readonly generationNo: number };
}


export interface GenerateCppaRiskResult {
  /** THE PERSISTED PAYLOAD. Write this verbatim to report_data. */
  readonly report: Record<string, unknown>;
  /** Assembled (pre-seal) body — Pass-2R merges its prose onto this. */
  readonly base: Record<string, unknown>;
  readonly plan: unknown | null;
  readonly ltpMeta: Record<string, unknown>;
  readonly typeJOrigin: string | null;
  readonly rawIntake: Record<string, unknown>;
  /** ITEM 378 — refinement telemetry when the pass ran at generate time. */
  readonly refinement?: RefinementTelemetry | null;
  /** DOC 231 — the CPPA Risk V3 hook-selection record (dark; see
   *  risk-v3-selection.ts). Computed once at the initial generation and
   *  reused by Pass-2R's finalize calls, mirroring `refinement`. */
  readonly riskV3?: RiskV3SelectionRecord;
}


function seal(report: Record<string, unknown>, intakeRoster: unknown, detectOnly?: boolean): {
  report: Record<string, unknown>;
  emit_gate_filtered: number;
} {
  const out = report;
  let filtered = 0;
  // ITEM 428-B (DEFECT 1) — WRITER-SIDE FIX, BEFORE THE GATE. Reserved-
  // determination referral prose is lifted off the summary surfaces and
  // re-homed onto the reserved-judgment action rows; the fact strip's prose
  // leaf is removed. The gate then sees what the writers should have written.
  try {
    const rehome = rehomeReservedReferrals(out, { detectOnly });
    const meta = (out._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.risk_summary_rehome = rehome;
  } catch (e) {
    console.warn("[generate-cppa-risk] summary re-home failed (non-fatal):", (e as Error)?.message);
  }
  try {
    runEmitGate(out, { tool: "cppa_risk_assessment", intakeRoster: (intakeRoster ?? {}) as never });
  } catch (e) {
    console.warn("[generate-cppa-risk] emit-gate failed (non-fatal):", (e as Error)?.message);
  }

  try {
    filtered = filterCustomerInformationNeeded(out);
  } catch { /* fail-open */ }
  return { report: out, emit_gate_filtered: filtered };
}

function serializeCustomer(report: Record<string, unknown>): Record<string, unknown> {
  try {
    const { report: serialized, telemetry } = serializeCustomerReport(
      report as never,
      CPPA_RISK_REPORT_SCHEMA,
    );
    if (!telemetry.crashed) return serialized as Record<string, unknown>;
  } catch (e) {
    console.warn("[generate-cppa-risk] serializer failed (non-fatal):", (e as Error)?.message);
  }
  return report;
}

/**
 * Attach telemetry under `_meta.internal` — NEVER as top-level customer keys.
 * This is the single place the persisted payload is finalized.
 */
function attachInternal(
  report: Record<string, unknown>,
  ltp: Record<string, unknown>,
): Record<string, unknown> {
  const meta = (report._meta && typeof report._meta === "object" && !Array.isArray(report._meta))
    ? report._meta as Record<string, unknown>
    : {};
  const internal = (meta.internal && typeof meta.internal === "object" && !Array.isArray(meta.internal))
    ? meta.internal as Record<string, unknown>
    : {};
  internal.engine_path = "ltp";
  internal.generator = CPPA_RISK_GENERATOR_STAMP;
  internal.ltp = ltp;
  meta.internal = internal;
  report._meta = meta;
  return report;
}

/**
 * UPGRADE-2 (ITEM 3) — attach the table of authorities built from the
 * citations the report ACTUALLY emits. Excerpts come only from approved
 * corpus rows; every other citation renders citation-only. Fail-open.
 */
function attachAuthorityExhibit(
  report: Record<string, unknown>,
  corpus: RiskCorpus | null | undefined,
): void {
  try {
    const cited = new Set<string>();
    const walk = (v: unknown): void => {
      if (typeof v === "string") {
        for (const m of v.matchAll(/(?:\d+\s*CCR|Cal\.\s*Civ\.\s*Code|GDPR)[^,;.)\]]*?\u00a7+\s*[\d.]+(?:\([a-z0-9]+\))*/gi)) {
          cited.add(m[0].replace(/\s+/g, " ").trim());
        }
        return;
      }
      if (Array.isArray(v)) { for (const x of v) walk(x); return; }
      if (v && typeof v === "object") {
        for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
          if (k === "_meta" || k === "_staging" || k === "authority_exhibit") continue;
          walk(x);
        }
      }
    };
    walk(report);
    report.authority_exhibit = buildAuthorityExhibit(
      [...cited],
      riskCorpusProvisionsForExhibit(corpus) as never,
    ) as unknown as Record<string, unknown>;
  } catch (e) {
    console.warn("[generate-cppa-risk] authority exhibit failed (non-fatal):", (e as Error)?.message);
  }
}

/**
 * DOC 231A — the ROO surface (doc 231 build-log NEED #5, closed).
 *
 * CONCLUSION (investigated, not guessed — see the doc 231A follow-up log
 * for the full finding): `report.information_needed`'s PRODUCTION shape is
 * a plain `string[]` — pass2-assembler.ts's `renderTemplateSection` only
 * ever sets `structured`/`typedSufficiency` for OTHER keys
 * (priority_actions / record_sufficiency); for `information_needed`,
 * `value` is always `rendered` (the plain string array) or `undefined`. A
 * plain string entry therefore survives `serializeCustomerReport`
 * COMPLETELY UNTOUCHED (_shared/report-serialize.ts's `pruneEntry` returns
 * any non-object array entry as-is) — no allow-list edit, no invented
 * object keys (`field`/`ask`/`hook_id`/`source`, which `RISK_ENTRY_KEYS`
 * does not admit, are never put on this entry at all).
 *
 * Each unsettled hook's ask is the ratified `RISK_ROO_UNSETTLED_TEMPLATE`
 * BYTES VERBATIM — never re-worded, never concatenated with the field name
 * (the CEO's ratified text stands alone, exactly as LIA's own template
 * does). The field/hook_id pairing survives instead in
 * `_meta.internal.risk_v3.information_needed_entries` (written by the
 * caller just before this runs), which is where a future revise-path
 * integration would read it from (doc 231A follow-up log's revise-path
 * finding). Deduplicated: the same ratified sentence is never pushed twice
 * even if several hooks are unsettled in one generation, and never pushed
 * at all when `unsettledCount` is 0 — the exact byte-identity the doc 231
 * dark-mode law requires (RISK_HOOKS ships empty today, so `unsettledCount`
 * is always 0 in production, and `report.information_needed` is therefore
 * always left exactly as `composeInformationNeeded` rendered it).
 *
 * Exported (not inlined in `finalizeCppaRiskPayload`) so it is directly
 * unit-testable, mirroring `applyRiskPersuasiveHookSplice`'s own shape.
 */
export function appendRiskRooAsk(report: Record<string, unknown>, unsettledCount: number): void {
  if (unsettledCount <= 0) return;
  const existing = Array.isArray(report.information_needed) ? report.information_needed as unknown[] : [];
  if (existing.includes(RISK_ROO_UNSETTLED_TEMPLATE)) return;
  report.information_needed = [...existing, RISK_ROO_UNSETTLED_TEMPLATE];
}

/**
 * Finalize an assembled body into the exact persisted payload.
 *
 * ITEM 378 (CORRECTION) — this is THE finalize point every completed
 * cppa-risk document passes through on the routed LTP path, so the three
 * item378 attaches land here:
 *   1. refinement telemetry (the pass itself already ran on `base` — see
 *      `refineRiskBase`, which the callers await BEFORE finalizing),
 *   2. the deterministic CSC post-pass (R1–R4), run after refinement,
 *   3. the permanent `risk_pipeline_stamp`.
 * CSC and the stamp run before the payload is returned for persist.
 */
export function finalizeCppaRiskPayload(
  base: Record<string, unknown>,
  ltpMeta: Record<string, unknown>,
  rawIntake: unknown,
  riskCorpus?: RiskCorpus | null,
  extras?: { refinement?: RefinementTelemetry | null; postPassDetectOnly?: boolean; riskV3?: RiskV3SelectionRecord | null },
): { report: Record<string, unknown>; emit_gate_filtered: number } {
  const postPassDetectOnly = extras?.postPassDetectOnly ?? false;
  const sealed = seal({ ...base }, rawIntake, postPassDetectOnly);
  // The exhibit is attached BEFORE serialization so the schema allow-list
  // governs it like every other customer surface.
  attachAuthorityExhibit(sealed.report, riskCorpus);
  const serialized = serializeCustomer(sealed.report);
  const report = attachInternal(serialized, {
    ...ltpMeta,
    emit_gate_filtered: sealed.emit_gate_filtered,
  });

  // (1) refinement telemetry (the splices are already in `base`). This key is
  // unconditional: enabled, disabled, and fail-open runs all carry a record.
  try {
    const internal = ((report._meta as Record<string, unknown>).internal) as Record<string, unknown>;
    internal.risk_refinement = extras?.refinement ??
      emptyTelemetryFor(RISK_REFINEMENT_CONFIG, false, "refinement_not_invoked");
  } catch { /* non-fatal */ }

  // (1a) DOC 231 — CPPA RISK V3 hook selection record (dark; see
  // risk-v3-selection.ts). Unconditional key, mirroring risk_refinement:
  // `enabled:false` while RISK_V3_ENABLED is off or RISK_HOOKS ships empty
  // (both true today), so this is inert but always recorded for audit.
  // NEVER written to any customer-facing surface — see risk-v3-selection.ts
  // `RiskV3InformationNeededEntry`'s header for why `information_needed`
  // itself is not yet a safe append target for this product.
  try {
    const internal = ((report._meta as Record<string, unknown>).internal) as Record<string, unknown>;
    internal.risk_v3 = extras?.riskV3 ?? {
      enabled: false, hooks_available: 0, generation_no: null, cap: null,
      calls_this_generation: 0, considered: [], applications: [], information_needed_entries: [], error: null,
    };
  } catch { /* non-fatal */ }

  // (1a-ii) DOC 231A — the CEO's Persuasive Authority scope ruling, wired.
  // Splices riskV3.applications onto the two customer-facing render
  // surfaces (eu_persuasive_authority.hook_authorities for GDPR-enforcement
  // / EDPB-guidance hooks; persuasive_authority_hooks for FSOR hooks) — see
  // eu-authority/hook-persuasive.ts's header for the full design and why
  // this is additive to, not a rewrite of, build.ts's topic-triggered
  // eu_persuasive_authority logic. Inert today: RISK_HOOKS_ENABLED defaults
  // false AND riskV3.applications is always [] while RISK_HOOKS ships empty
  // — either alone already guarantees report_data stays byte-identical.
  try {
    applyRiskPersuasiveHookSplice(report, extras?.riskV3?.applications ?? []);
  } catch (e) {
    console.warn("[generate-cppa-risk] persuasive hook splice failed (non-fatal):", (e as Error)?.message);
  }

  // (1a-iii) DOC 231A — the ROO surface (doc 231 build-log NEED #5, closed).
  // CONCLUSION (investigated, not guessed): `report.information_needed`'s
  // production shape is a plain `string[]` — pass2-assembler.ts's
  // `renderTemplateSection` only ever sets `structured`/`typedSufficiency`
  // for OTHER keys (priority_actions / record_sufficiency), so for
  // `information_needed` `value` is always `rendered` (the plain string
  // array) or `undefined`. A plain string entry therefore survives
  // `serializeCustomerReport` completely untouched
  // (_shared/report-serialize.ts `pruneEntry` returns any non-object entry
  // as-is, line ~99) — no allow-list edit, no invented object keys. Each
  // unsettled hook's ask is the ratified `RISK_ROO_UNSETTLED_TEMPLATE`
  // BYTES VERBATIM (never re-worded, never concatenated with the field
  // name — the CEO's ratified text stands alone, exactly as LIA's own
  // template does); the field/hook_id pairing survives instead in
  // `_meta.internal.risk_v3.information_needed_entries` (step 1a above),
  // which is where a future revise-path integration would read it from
  // (see the doc 231A follow-up log's revise-path finding). Deduplicated:
  // the same ratified sentence is never pushed twice even if multiple
  // hooks are unsettled in one generation.
  try {
    appendRiskRooAsk(report, extras?.riskV3?.information_needed_entries?.length ?? 0);
  } catch (e) {
    console.warn("[generate-cppa-risk] ROO append failed (non-fatal):", (e as Error)?.message);
  }

  // (1b) ITEM 426 — `exception_analysis` CANONICAL EMISSION. LAW 3 SINGLE
  // WRITE SITE for the SHAPE of that surface: claimed exceptions become
  // nine-leaf records with REGISTRY-RESOLVED pinpoints, an explicit-none
  // record gets the one honest sentence, and a record that never reached the
  // exceptions question loses the key entirely (the empty-array padding the
  // wild documents carry ends here). Runs BEFORE the CSC so r2 reads the
  // typed shape.
  try {
    const exSummary = normalizeRiskExceptions(report, rawIntake);
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.risk_exceptions = { version: RISK_EXCEPTIONS_CONTRACT_VERSION, ...exSummary };
  } catch (e) {
    console.warn("[generate-cppa-risk] exception normalize failed (non-fatal):", (e as Error)?.message);
  }

  // (2) CSC — deterministic post-pass, after refinement, before persist.
  try {
    attachRiskCsc(report, {
      intake: (rawIntake && typeof rawIntake === "object" ? rawIntake : {}) as Record<string, unknown>,
      detectOnly: postPassDetectOnly,
    });
  } catch (e) {
    console.warn("[generate-cppa-risk] risk-csc failed (non-fatal):", (e as Error)?.message);
  }

  // (2b) ITEM 427 — `risk_assessment_by_activity` CANONICAL EMISSION. LAW 3
  // SINGLE WRITE SITE for the SHAPE of that surface: one thirteen-leaf record
  // per TRIGGERED activity, with `statutory_basis` and every
  // `section_7152_mapping[].pinpoint` REGISTRY-RESOLVED.
  //
  // ORDER IS LOAD-BEARING: this runs AFTER attachRiskCsc, because
  // r1_benefits_vs_intake repairs `activity_analytics.benefits` in place and
  // the typed benefit leaves are composed FROM those rows. Emitting first
  // would freeze a benefit claim the CSC then strips.
  try {
    const actSummary = normalizeRiskActivities(report, rawIntake);
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.risk_activities = { version: RISK_ACTIVITIES_CONTRACT_VERSION, ...actSummary };
  } catch (e) {
    console.warn("[generate-cppa-risk] activity normalize failed (non-fatal):", (e as Error)?.message);
  }

  // (3) ITEM 379 — bidirectional coverage matrix (flag-only) on the FINAL
  // document, alongside CSC. No repairs; telemetry only.
  let coverage: CoverageTelemetry | null = null;
  try {
    coverage = attachCoverage(
      report,
      "risk_coverage",
      runCoverageMatrix("cppa-risk", report, rawIntake),
    );
    console.log(JSON.stringify({
      evt: "risk_coverage", fn: "generate-cppa-risk",
      version: coverage.version, orphans: coverage.counts.orphans,
      unused_intake_facts: coverage.counts.unused_intake_facts,
      links_checked: coverage.counts.links_checked, crashed: coverage.crashed,
    }));
  } catch (e) {
    console.warn("[generate-cppa-risk] coverage matrix failed (non-fatal):", (e as Error)?.message);
  }

  // (4) permanent pipeline stamp on every document.
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.risk_pipeline_stamp = RISK_PIPELINE_STAMP;
  } catch { /* non-fatal */ }

  // (5) ITEM 380 — THE TRUTH GATE + PLACEHOLDER CLASSIFICATION. Deterministic,
  // no model. Reads the coverage/CSC telemetry written above plus the LTP
  // build's own `record_needs.missing_data`. Fail-closed on the affirmative
  // claim: on any error `record_complete.value` stays false and every draft
  // framing renders exactly as it does today.
  try {
    const internal = ((report._meta as Record<string, unknown>)?.internal ?? {}) as Record<string, unknown>;
    const missingData = Number(
      ((internal.record_needs ?? (ltpMeta.record_needs as Record<string, unknown>)) as
        Record<string, unknown> | undefined)?.missing_data ?? NaN,
    );
    const telemetry = computeRecordComplete({
      product: "cppa-risk",
      contract: cppaRiskContract,
      intake: (rawIntake && typeof rawIntake === "object" ? rawIntake : {}) as Record<string, unknown>,
      coverage: internal.risk_coverage as never,
      csc: internal.risk_csc as never,
      recordNeedsMissingData: Number.isFinite(missingData) ? missingData : undefined,
    });
    const classification = classifyPlaceholders(report, rawIntake ?? {}, telemetry.value);
    attachRecordComplete(report, telemetry, classification);
    applyRiskRecordCompleteFraming(report, telemetry, classification, postPassDetectOnly);
    console.log(JSON.stringify({
      evt: "risk_record_complete", fn: "generate-cppa-risk",
      value: telemetry.value, failed_conditions: telemetry.failed_conditions,
      ...classification.counts,
    }));
  } catch (e) {
    console.warn("[generate-cppa-risk] record-complete gate failed (non-fatal):", (e as Error)?.message);
  }

  // (6) ITEM 379 — RELEASE LEDGER. Soft, non-blocking; alerts when non-clean.
  try {
    const internal = ((report._meta as Record<string, unknown>)?.internal ?? {}) as Record<string, unknown>;
    attachReleaseLedger(report, {
      refinement: internal.risk_refinement,
      csc: internal.risk_csc,
      coverage,
    }, { fn: "generate-cppa-risk", product: "cppa_risk_assessment" });
  } catch { /* non-fatal */ }

  // (6b) ITEM 428 (PIECE B) — ONE SUMMARY VOICE. THE SINGLE WRITE SITE for the
  // summary-class surfaces: `executive_summary` is the one narrative verdict,
  // `assessment_summary` becomes the TYPED fact strip, `submission_summary` is
  // retired as a top-level surface (demoted to an input the verdict consumes).
  // Runs AFTER the prose-gold pass, which is the last writer of the verdict.
  try {
    const voice = normalizeRiskSummaryVoice(report, rawIntake, { detectOnly: postPassDetectOnly });
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.risk_summary_voice = voice;
  } catch (e) {
    console.warn("[generate-cppa-risk] summary voice failed (non-fatal):", (e as Error)?.message);
  }

  // (7) ITEM 399 R11 — ASSEMBLED-PROSE LINT. Last pass, detect-only,
  // fail-open. It reads the FINAL strings; it never edits them.
  try {
    attachProseLint(report);
  } catch { /* non-fatal */ }

  // (8) ITEM 428 (PIECE A) — STRUCTURAL CONFORMANCE, detect-only, fail-open,
  // ZERO MUTATION of any customer surface. Runs last so it sees the assembled
  // document exactly as the reader will.
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.structure_conformance = structureConformanceTelemetry("cppa-risk", report);
  } catch { /* non-fatal */ }

  // (9) ITEM SO-1 (WIRE-IN) — ASSEMBLY THROUGH THE BYTE-PINNED SKELETON.
  // The v3 counsel-register skeleton is this product's render law. The
  // narrative document the reader receives is assembled HERE, from the typed
  // surfaces every pass above has finished writing, so the skeleton sees the
  // final strings. Deterministic; no model; no mutation of the typed surfaces.
  try {
    const built = assembleRiskSkeletonDocument(
      report,
      (rawIntake && typeof rawIntake === "object" ? rawIntake : {}) as Record<string, unknown>,
    );
    report.skeleton_document = built.document;
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.risk_skeleton = {
      stamp: RISK_SKELETON_ASSEMBLER_STAMP,
      spine_version: built.document.spine_version,
      sections: built.document.sections.length,
      conformance_findings: built.conformance,
      register_findings: built.register_findings,
    };
    console.log(JSON.stringify({
      evt: "risk_skeleton_assembled", fn: "generate-cppa-risk",
      sections: built.document.sections.length,
      conformance_findings: built.conformance.length,
      register_findings: built.register_findings.length,
    }));
  } catch (e) {
    console.warn("[generate-cppa-risk] skeleton assembly failed (non-fatal):", (e as Error)?.message);
  }

  return { report, emit_gate_filtered: sealed.emit_gate_filtered };
}


/**
 * ITEM 380 §3 (RISK) — the determination-equivalent surface for cppa-risk is
 * the record-sufficiency surface in the executive summary. When, and ONLY
 * when, the truth gate holds, its draft framing is replaced by the affirmative
 * paragraph; otherwise the surface is left byte-identical.
 *
 * ITEM 384 — this function is now the SOLE WRITER of the sufficiency voice
 * (G-1) and of the executive-summary opening (G-2), and it normalises the
 * attestation block (G-4). It CONSUMES the item-380 classification; it never
 * edits the gate, the classification rule, or the banner.
 */
export function applyRiskRecordCompleteFraming(
  report: Record<string, unknown>,
  telemetry: { value: boolean },
  classification: {
    counts: { action_item: number; preconditions: number };
    items?: { text: string; klass: string }[];
  },
  detectOnly?: boolean,
): void {
  const text = affirmativeParagraph(
    classification?.counts?.action_item ?? 0,
    classification?.counts?.preconditions ?? 0,
  );
  // ITEM 384 (G-2 / G-4) — register repairs run on EVERY record: a degraded
  // emit-gate placeholder may never open a customer surface, and the
  // attestation block never speaks in the "not stated on the record" idiom.
  // The gate-true rewrites happen inside the same pass.
  const reservedCount = (classification?.items ?? []).filter(
    (i) => i && i.klass === "action_item" && isByDesignActionSurface(String(i.text ?? "")),
  ).length;
  const goldTelemetry = applyRiskProseGold(report, {
    recordComplete: telemetry?.value === true,
    affirmative: text,
    reservedCount,
    detectOnly,
  });
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.risk_prose_gold = goldTelemetry;
  } catch { /* non-fatal */ }

  if (!telemetry?.value) return;

  // ITEM 380 r2 (DEFECT C) — SHAPE-AWARE WRITE. On the live LTP path the two
  // surfaces are NOT objects: `executive_summary` is a STRING and
  // `record_sufficiency` is an ARRAY of paragraphs. Item 384 rewrote both
  // shapes above for the string/array case; the object shapes below remain
  // for legacy envelopes.
  const es = report.executive_summary;
  if (typeof es === "string") {
    report.executive_summary = es.includes(text) ? es : `${es.trim()}\n\n${text}`.trim();
  } else if (es && typeof es === "object" && !Array.isArray(es)) {
    (es as Record<string, unknown>).record_sufficiency_statement = text;
  } else if (es === undefined || es === null) {
    report.executive_summary = { record_sufficiency_statement: text };
  }
  // Mirrored as a top-level statement so telemetry/tests and any surface-level
  // consumer can read the affirmative claim without reparsing prose.
  report.record_sufficiency_statement = text;

  const rs = report.record_sufficiency;
  if (Array.isArray(rs)) {
    if (!rs.some((p) => typeof p === "string" && p.includes(text))) rs.unshift(text);
  } else if (isRiskSufficiencyRecord(rs)) {
    // ITEM 425 — the typed record carries the affirmative as its single
    // `statement` voice; `.prose` is the LEGACY-envelope field and is not
    // written onto a typed record.
    const rec = rs as unknown as Record<string, unknown>;
    const st = typeof rec.statement === "string" ? rec.statement : "";
    rec.statement = st.includes(text) ? st : (st ? `${text}\n\n${st}`.trim() : text);
  } else if (rs && typeof rs === "object") {
    (rs as Record<string, unknown>).prose = text;
  } else if (typeof rs === "string") {
    report.record_sufficiency = rs.includes(text) ? rs : `${text}\n\n${rs}`.trim();
  } else {
    report.record_sufficiency = [text];
  }
}


/**
 * ITEM 378 (CORRECTION) — run the refinement pass (CRITIC → VERIFIER →
 * DETERMINISTIC SPLICER) on the assembled body, IN PLACE, before finalize.
 * Fail-open: any error yields telemetry with `crashed` set and the body is
 * unchanged. Without `refinementDeps` the pass is recorded as disabled.
 */
export async function refineRiskBase(
  base: Record<string, unknown>,
  rawIntake: Record<string, unknown>,
  options: GenerateCppaRiskOptions,
): Promise<RefinementTelemetry> {
  const deps = options.refinementDeps;
  const enabled = options.refinementEnabled !== false;
  let telemetry = emptyTelemetryFor(
    RISK_REFINEMENT_CONFIG,
    enabled,
    enabled && !deps ? "missing_refinement_dependencies" : null,
  );
  try {
    if (enabled && deps) {
      // ITEM 379 §3 — the coverage list is computed BEFORE the critic call and
      // handed to it as the ONLY permitted anchor set for material-omission
      // findings. It is recomputed after splice for the final telemetry.
      const pre = runCoverageMatrix("cppa-risk", base, rawIntake);
      telemetry = await runRiskRefinement(base, rawIntake, deps, {
        enabled: true,
        coverageList: coverageListForCritic(pre),
        coverageAnchors: coverageAnchorTokens(pre),
      });
    } else if (!enabled) {
      telemetry = emptyTelemetryFor(RISK_REFINEMENT_CONFIG, false);
    }
  } catch (e) {
    telemetry = emptyTelemetryFor(
      RISK_REFINEMENT_CONFIG,
      enabled,
      `refinement_error:${(e as Error)?.message?.slice(0, 120) ?? "unknown"}`,
    );
    console.warn("[generate-cppa-risk] risk refinement failed (non-fatal):", (e as Error)?.message);
  } finally {
    console.log(JSON.stringify({
      evt: "risk_refinement", fn: options.callerName ?? "generate-cppa-risk",
      build_stamp: options.buildStamp, risk_pipeline_stamp: RISK_PIPELINE_STAMP, ...telemetry,
    }));
  }
  return telemetry;
}


export async function generateCppaRiskReport(
  rawIntakeInput: unknown,
  options: GenerateCppaRiskOptions,
): Promise<GenerateCppaRiskResult> {
  const rawIntake = (rawIntakeInput && typeof rawIntakeInput === "object" ? rawIntakeInput : {}) as Record<string, unknown>;
  const mode = options.mode ?? "enforce";
  const pass1Mode: Pass1Mode = options.pass1 ?? "model";
  const runId = options.runId ?? "no-run-id";
  const era = resolveLtpIntake(rawIntake);

  // UPGRADE-2 (ITEM 2) — resolve the governing chapter once per run.
  let riskCorpus: RiskCorpus = options.riskCorpus ?? EMPTY_RISK_CORPUS;
  if (!options.riskCorpus && options.db) {
    try {
      riskCorpus = await fetchRiskCorpus(options.db);
    } catch (e) {
      console.warn("[generate-cppa-risk] risk corpus fetch failed (non-fatal):", (e as Error)?.message);
    }
  }

  let euCorpus = options.euCorpus;
  if (euCorpus === undefined && options.db) {
    try {
      euCorpus = await fetchEuAuthorityCorpus(options.db as never);
    } catch (e) {
      console.warn("[generate-cppa-risk] eu corpus fetch failed (non-fatal):", (e as Error)?.message);
    }
  }

  let plan: unknown | null = null;
  let typeJOrigin: string | null = null;
  let pass1Telemetry: Record<string, unknown>;

  if (pass1Mode === "deterministic") {
    plan = derivePlan({
      intake: era.intake,
      report_data: {},
      buildStamp: options.buildStamp,
      ...(euCorpus !== undefined ? { eu_authority_corpus: euCorpus } : {}),
    } as never);
    pass1Telemetry = { ok: true, attempts: 0, write_around: false, latency_ms: 0, error: null, deterministic: true };
  } else {
    const p1 = await modelProvider(
      {
        intake: era.intake,
        report_data: {},
        buildStamp: `${options.buildStamp}#${runId}`,
        eu_authority_corpus: euCorpus,
        // UPGRADE-2 (ITEM 2) — corpus law block into Pass-1 prompt assembly.
        corpus_law_block: buildRiskCorpusLawBlock(riskCorpus),
      } as never,
      { callerName: options.callerName ?? "generate-cppa-risk" },
    );
    plan = p1.plan ?? null;
    if (!p1.telemetry.ok || !p1.plan) typeJOrigin = p1.telemetry.error ?? "pass1_model_error";
    pass1Telemetry = {
      ok: p1.telemetry.ok,
      attempts: p1.telemetry.attempts,
      write_around: p1.telemetry.write_around,
      latency_ms: p1.telemetry.latency_ms,
      error: p1.telemetry.error ?? null,
      deterministic: false,
    };
  }

  let base: Record<string, unknown>;
  let assemblerTelemetry: unknown = null;
  if (typeJOrigin || !plan) {
    // FAIL-CLOSED: ship the Type-J reserved-judgment body, never a fall-through.
    typeJOrigin = typeJOrigin ?? "pass1_no_plan";
    base = buildTypeJWriteAroundBody({
      intake: era.intake,
      origin: "pass1_validator_reject",
      buildStamp: options.buildStamp,
    } as never) as Record<string, unknown>;
  } else {
    const assembled = assembleReport(plan as never, {}, { exitMode: mode, runId } as never);
    base = assembled.report as Record<string, unknown>;
    assemblerTelemetry = assembled.telemetry;
  }

  // ITEM 358 (FIX 1) — needs classification telemetry. The conformance suite
  // reads this to assert the band law: zero `missing_data` needs ⇒ a genuine
  // band, never "Insufficient basis". Reserved decisions do not gate.
  let recordNeeds: Record<string, unknown> = { missing_data: null, reserved_decision: null };
  if (plan && !typeJOrigin) {
    try {
      const needs = computeRecordNeeds(plan as never);
      recordNeeds = {
        missing_data: needs.filter((n) => n.kind === "missing_data").length,
        reserved_decision: needs.filter((n) => n.kind === "reserved_decision").length,
        reserved_need_ids: needs.filter((n) => n.kind === "reserved_decision").map((n) => n.need_id),
      };
    } catch { /* fail-open: telemetry only */ }
  }

  const ltpMeta: Record<string, unknown> = {
    record_needs: recordNeeds,
    build_stamp: options.buildStamp,
    generator_stamp: CPPA_RISK_GENERATOR_STAMP,
    engine_path: "ltp",
    mode,
    pass1_mode: pass1Mode,
    pass1_manifest: PASS1_MANIFEST,
    pass2r_manifest: PASS2R_MANIFEST,
    pass1_telemetry: pass1Telemetry,
    assembler_telemetry: assemblerTelemetry,
    intake_era_normalization: era.telemetry,
    type_j_origin: typeJOrigin,
    shipped_surface: "deterministic",
    // ITEM 357(2b) — a deterministic ship must always carry a reason.
    pass2r_skipped_reason: typeJOrigin ? "type_j_write_around" : "pass2r_not_run_yet",
    pass2r_attempt_rejections: [],
    pass2r_prose_rejected: false,
    risk_corpus: {
      version: riskCorpus.version,
      resolved: riskCorpus.resolved_count,
      approved: riskCorpus.approved_count,
      spine_requirements: riskCorpus.spine_requirements.length,
    },
  };

  // ITEM 378 (CORRECTION 2) — persist-first is itself a completed customer
  // payload, so it must already contain refinement telemetry. If Pass-2R later
  // ships a different surface, that surface is refined and finalized again.
  const refinement = await refineRiskBase(base, rawIntake, options);

  // DOC 231 / DOC 231A — CPPA RISK V3 hook selection (dark). Computed once
  // here (not inside finalizeCppaRiskPayload, which stays synchronous) and
  // reused by Pass-2R's own finalize calls below, mirroring `refinement`'s
  // shape.
  //
  // `verdicts` — `[NEEDS]` still (doc 231 build-log NEED #2, INVESTIGATED
  // this build and left empty, not guessed at: no clean, already-computed
  // `Record<CAM_factor_id, "passes"|"likely_passes"|"fails"|"uncertain">`
  // exists anywhere in this pipeline — see the doc 231A follow-up log for
  // the file/line evidence across risk-factor-engine.ts's `factors` (a
  // DIFFERENT, prose-valued, internal-key-space record, not this
  // vocabulary), analytic-deliverables/types.ts's `NecessityAnalysisEntry.verdict`
  // (a different closed vocabulary, per-activity not per-factor, and only
  // for necessity), and `_local/factors/cppa-risk-factors.ts`'s factor_table
  // (a presence boolean for 4 of the 17 factors, not a verdict). Passed
  // empty, which is inert — every hook evaluates `verdicts[factor] ?? null`
  // safely.
  //
  // `rankedSourceIds` / `determinativeSourceIds` — NOW WIRED (closes NEED
  // #3): the H3-style Persuasive Authority ranking
  // (eu-authority/hook-persuasive.ts), run against `base` (already carries
  // `eu_persuasive_authority` — a deterministic passthrough shard, doc 231A
  // verified — and every other typed surface `deriveRiskFiredStates` reads)
  // and `rawIntake`. Both degrade to `[]`/`new Set()` today regardless,
  // since RISK_HOOKS ships empty (attachRiskHookSelection returns before
  // reading either) and RISK_CORPUS_MAP carries no relevance_profile —
  // this call is real, wired plumbing, not yet a live ranking.
  const riskV3Verdicts: Record<string, string> = {};
  const determinativeSourceIds = riskDeterminativeSourceIds(base, rawIntake);
  const rankedSourceIds = riskPersuasiveRankedSourceIds(rawIntake, riskV3Verdicts, RISK_HOOKS, determinativeSourceIds);
  const riskV3 = await attachRiskHookSelection(rawIntake, riskV3Verdicts, rankedSourceIds, determinativeSourceIds, {
    db: options.riskV3Db as RiskV3DbClient | undefined,
    assessmentId: runId,
    runsAllowed: options.riskV3Meter?.runsAllowed ?? 4,
    generationNo: options.riskV3Meter?.generationNo ?? 1,
  });

  const { report } = finalizeCppaRiskPayload(base, ltpMeta, rawIntake, riskCorpus, { refinement, postPassDetectOnly: options.postPassDetectOnly, riskV3 });
  return { report, base, plan, ltpMeta, typeJOrigin, rawIntake, refinement, riskV3 };
}


export interface Pass2RResult {
  /** New persisted payload when 2R shipped; null when the deterministic surface stands. */
  readonly report: Record<string, unknown> | null;
  readonly shipped_surface: "deterministic" | "2R";
  readonly meta: Record<string, unknown>;
}

/**
 * ITEM 357(2b) — Pass-2R, run INSIDE the persisted lifecycle.
 *
 * Returns the payload to UPDATE the row with. On a 2R ship, that is the merged
 * prose payload; on rejection/skip it is the deterministic payload re-finalized
 * with the recorded reason, so the row NEVER carries a silent fallback.
 */
export async function runCppaRiskPass2R(
  gen: GenerateCppaRiskResult,
  options: GenerateCppaRiskOptions,
): Promise<Pass2RResult> {
  const enforce = (options.mode ?? "enforce") === "enforce";
  // UPGRADE-2 — the same corpus that governed Pass-1 governs the 2R re-finalize.
  let riskCorpus: RiskCorpus = options.riskCorpus ?? EMPTY_RISK_CORPUS;
  if (!options.riskCorpus && options.db) {
    try { riskCorpus = await fetchRiskCorpus(options.db); } catch { /* fail-open */ }
  }
  if (gen.typeJOrigin || !gen.plan) {
    return {
      report: null,
      shipped_surface: "deterministic",
      meta: {
        pass2r_telemetry: null,
        pass2r_skipped_reason: "type_j_write_around",
        pass2r_attempt_rejections: [],
        pass2r_prose_rejected: false,
      },
    };
  }
  try {
    const stage = await runProsePassStage(
      gen.plan as never,
      gen.base,
      {
        enabled: options.pass2rEnabled !== false,
        enforce,
        callerName: options.callerName ?? "generate-cppa-risk",
        // UPGRADE-2 (ITEM 2) — same corpus law block into Pass-2R.
        corpusLawBlock: buildRiskCorpusLawBlock(riskCorpus),
        ...(options.pass2rCall ? { call: options.pass2rCall } : {}),
      } as never,
    );
    const rejections = stage.attempt_rejections ?? [];
    const meta = {
      pass2r_telemetry: stage.telemetry ?? null,
      pass2r_skipped_reason: stage.skipped_reason ??
        (stage.shipped_surface === "2R" ? null : (rejections.length ? "prose_rejected" : "unknown_no_ship")),
      pass2r_attempt_rejections: rejections,
      pass2r_prose_rejected: stage.prose_rejected ? true : false,
    };
    if (stage.shipped_surface === "2R" && stage.prose) {
      const merged = { ...gen.base, ...(stage.prose as unknown as Record<string, unknown>) };
      // ITEM 378 — refinement on the shipped surface, BEFORE CSC/finalize.
      const refinement = await refineRiskBase(merged, gen.rawIntake, options);
      const { report } = finalizeCppaRiskPayload(
        merged,
        { ...gen.ltpMeta, shipped_surface: "2R", ...meta },
        gen.rawIntake,
        riskCorpus,
        { refinement, postPassDetectOnly: options.postPassDetectOnly, riskV3: gen.riskV3 },
      );
      return { report, shipped_surface: "2R", meta };
    }
    const refinementDet = gen.refinement ?? await refineRiskBase(gen.base, gen.rawIntake, options);
    const { report } = finalizeCppaRiskPayload(
      gen.base,
      { ...gen.ltpMeta, shipped_surface: "deterministic", ...meta },
      gen.rawIntake,
      riskCorpus,
      { refinement: refinementDet, postPassDetectOnly: options.postPassDetectOnly, riskV3: gen.riskV3 },
    );
    return { report, shipped_surface: "deterministic", meta };

  } catch (e) {
    const meta = {
      pass2r_telemetry: null,
      pass2r_skipped_reason: `pass2r_threw:${(e as Error)?.message ?? "unknown"}`.slice(0, 200),
      pass2r_attempt_rejections: [],
      pass2r_prose_rejected: false,
    };
    const refinementFallback = gen.refinement ?? await refineRiskBase(gen.base, gen.rawIntake, options);
    const { report } = finalizeCppaRiskPayload(
      gen.base,
      { ...gen.ltpMeta, shipped_surface: "deterministic", ...meta },
      gen.rawIntake,
      riskCorpus,
      { refinement: refinementFallback, postPassDetectOnly: options.postPassDetectOnly, riskV3: gen.riskV3 },
    );

    return { report, shipped_surface: "deterministic", meta };
  }
}
