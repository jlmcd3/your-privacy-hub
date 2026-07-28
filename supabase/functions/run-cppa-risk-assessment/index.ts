// qb8 build active · cppa-risk r1b1.4-rca continuation-on-truncation + 330s self-report abort + compact cells
import { attachDeterministicChecks, extractProseFromReport } from '../_shared/advisory-voice.ts';
import { runFormatChecksGeneric } from '../_shared/grader/format-checks.ts';
import { extractIntakeRoster } from '../_shared/grader/intake-roster.ts';
import { runCppaHf1Checks } from '../_shared/grader/cppa-hf1-checks.ts';
// CPPA-HF6R BUILD_STAMP retired — now an exported const (below).
// W15 RISK-FACT-LEDGER-WIRING (2026-07-24) — shared intake fact-ledger
// (sb-fl-w1) wired pre-VA-stamp to block wave-15 unsupported/contradictory
// claim classes (sensitive-location contradiction, worker/free-tier positive
// projections). Runs after W6/W9/W10 retro-audits, before the w15 risk_va
// L1 citation stamp so citations attach to final claim text. Fail-open.
// WAVE19-FIX TURN B (2026-07-25) — D2/B1 reconciliation guard now consults
// the fact-ledger BEFORE emitting the reconciliation.required template.
// Suppression telemetry lands at _meta.internal.risk_b1
// .d2b1_reconciliation_suppressed_by_ledger (sequestered by the existing
// _w<digits>_* / _meta.internal strip). Feeds future LEAK-PREV-P4 loop.
// T-M9.2 (Item 232, 2026-07-28): LEGACY GENERATION EXECUTION RETIRED.
// Runtime shape now matches declared: intake → fact ledger → Pass-1 derive
// (abort-controller, 120s×2) → Guide → Pass-2 assembler → guards → persist.
// The legacy Engine-A v4 generation (callModel) is unreachable at runtime;
// callModel throws on invocation and a runtime shape-conformance assert
// fails loud on any drift.
export const BUILD_STAMP = `ltp-risk-item242-bc-rider-grounded-note@${new Date().toISOString()}`;
console.log(`[run-cppa-risk-assessment] boot build_stamp=${BUILD_STAMP}`);
// T-M9.2 retirement flag + runtime LLM-call counter for the legacy v4 path.
// When true, callModel() throws instead of hitting Anthropic, and the
// end-of-pipeline shape-conformance assert requires legacyLlmCallCount === 0.
const LEGACY_GENERATION_RETIRED = true;
let legacyLlmCallCount = 0;
const legacyLlmCallLabels: string[] = [];
// T-M1 (Item 221): Pass-1 is AUTHORITATIVE for cppa-risk. The historical
// shadow/enforce env gate is retired — Pass-1 runs unconditionally on every
// generation. LTP_MODE_BOOT is pinned to "enforce" so §16 measurement-validity
// pings continue to advertise the fleet-declared expectation.
const LTP_MODE_BOOT = "enforce";
const COMPOSITION_ENFORCE_BOOT = Deno.env.get("LTP_COMPOSITION_ENFORCE") === "1" ? "1" : "0";
console.log(`[run-cppa-risk-assessment] boot ltp_mode=${LTP_MODE_BOOT} composition_enforce=${COMPOSITION_ENFORCE_BOOT} safe_finalize=safe-finalize@2026-07-27-hangfix persist_first_retry=retry-budget@2026-07-27-persistfirst design=docs/design/LEGAL-TEST-PIPELINE.md §16-measurement-validity-law`);
console.log(`[run-cppa-risk-assessment] boot ltp_phase=t-m1-derive-authoritative pass1_authoritative=1 subsumed=_risk_citation_dup_fix,_w18_risk_vocab,_w15_risk_va`);
console.log(`[run-cppa-risk-assessment] boot t7_risk_opening_pilot=SHIPPED spec=docs/design/OPENING-PARAGRAPH-DESIGN.md`);
console.log(`[run-cppa-risk-assessment] boot pass1_model=${PASS1_MODEL} pass1_max_attempts=${PASS1_MAX_ATTEMPTS} pass1_stamp=${PASS1_MANIFEST.stamp}`);
import { GRADER_CONTEXT_VERSION } from "../_shared/grader/context.ts";
console.log(`[run-cppa-risk-assessment] boot band_realignment_t2a=LANDED grader_context_version=${GRADER_CONTEXT_VERSION} risk_opening_version=risk-opening-t7-pilotfix3@2026-07-26`);
console.log(`[run-cppa-risk-assessment] boot waveb_completion=LANDED waveb2_closure=LANDED surfaces=purpose+priority_actions+inconsistency_flags+pii_narrative+crosswalk_7120b+atomic_tokens+info_needed_contradiction`);
import {
  newVocabScrubMetrics,
  scrubReportVocab,
  W18_RISK_VOCABSCRUB_STAMP,
} from "./_w18_risk_vocab.ts";
console.log(`[run-cppa-risk-assessment] boot vocab_scrub_stamp=${W18_RISK_VOCABSCRUB_STAMP}`);
import { applyW6RiskFix } from "./_w6_risk_fix.ts";
import { attachAndValidateSlots as attachW9RiskSlots, W9_RISK_SLOTS_STAMP } from "./_w9_risk_slots.ts";
import { applyW10RiskB1, W10_RISK_B1_STAMP } from "./_w10_risk_b1.ts";
import { applyW20RiskTurnB, W20_RISK_TURNB_STAMP } from "./_w20_risk_turnb.ts";
import { applyW21RiskTurnA, W21_RISK_TURNA_STAMP, attributeFieldByToken } from "./_w21_risk_turna.ts";
import { applyW22RiskTurnA, W22_RISK_TURNA_STAMP } from "./_w22_risk_turna.ts";
import { applyW23RiskTurnB, W23_RISK_TURNB_STAMP } from "./_w23_risk_turnb.ts";
import { applyW24RiskTurnA, W24_RISK_TURNA_STAMP } from "./_w24_risk_turna.ts";
import { applyW24aV3, W24A_V3_STAMP, W24A_V3_VERSION } from "./_w24a_v3.ts";
import { applyRiskCohortDate, RISK_COHORT_DATE_STAMP, RISK_COHORT_DATE_VERSION } from "./_risk_cohort_date.ts";
import { applyRiskIntakeContradiction, RISK_INTAKE_CONTRADICTION_STAMP } from "./_risk_intake_contradiction.ts";
import { applyRiskCitationDupFix, RISK_CITATION_DUP_FIX_STAMP } from "./_risk_citation_dup_fix.ts";
import { runLegalTestPipelineShadow, LTP_STAMP } from "../_shared/ltp/pipeline.ts";
import { runPass1Llm, PASS1_MANIFEST, PASS1_MODEL, PASS1_MAX_ATTEMPTS, PASS1_TIMEOUT_ENFORCED, PASS1_ABORT_TIMEOUT_ERROR } from "../_shared/ltp/pass1-llm.ts";
import { classifyPass1WriteAroundOrigin, type WriteAroundOrigin } from "../_shared/ltp/composition-hook-audit.ts";
import { assembleReport, assembleReportShadow, buildTypeJWriteAroundBody, COMPOSITION_SHAPE_DECLARATION, PASS2_ASSEMBLER_VERSION } from "../_shared/ltp/pass2-assembler.ts";
import {
  finalizeComposition,
  safeFinalizeComposition,
  SAFE_FINALIZE_VERSION,
  readForceWriteAroundOnce,
  currentEnforceMode,
  COMPOSITION_FINALIZE_VERSION,
  evaluateShippedSurfaceGuard,
  evaluateShippedValueScreen,
  SHIPPED_VALUE_SCREEN_VERSION,
  isRetiredSurfacePath,
} from "../_shared/ltp/composition-finalize.ts";

import { computeScenarioSignature } from "../_shared/future-building/signature.ts";
// prior_stamps echoed verbatim per deploy-guard doctrine.
console.log(`[run-cppa-risk-assessment] boot w23_stamp=${W23_RISK_TURNB_STAMP} w24_stamp=${W24_RISK_TURNA_STAMP} w24a_v3_stamp=${W24A_V3_STAMP} t7_pilotfix_stamp=t7-risk-pilotfix@2026-07-25T22:32:00Z t7_pilotfix2_stamp=t7-risk-pilotfix2@2026-07-26T01:10:00Z risk_cohort_date_stamp=${RISK_COHORT_DATE_STAMP} risk_intake_contradiction_stamp=${RISK_INTAKE_CONTRADICTION_STAMP} risk_citation_dup_fix_stamp=${RISK_CITATION_DUP_FIX_STAMP} build_stamp=${BUILD_STAMP}`);

console.log(`[run-cppa-risk-assessment] boot w21_stamp=${W21_RISK_TURNA_STAMP}`);
import {
  buildFactLedger,
  enforceLedger,
  FACT_LEDGER_VERSION,
} from "../_shared/intake/fact-ledger.ts";
console.log(`[run-cppa-risk-assessment] boot slots_stamp=${W9_RISK_SLOTS_STAMP}`);
console.log(JSON.stringify({
  evt: "fact_ledger_loaded", fn: "run-cppa-risk-assessment",
  version: FACT_LEDGER_VERSION,
}));
import { buildCppaDeadlineBlock, verifyCppaDeadlineDrift } from "../_shared/cppa-deadline-registry.ts";
// W15 RISK-REGISTRY-WIRING — L1 verified-authority resolver + risk registry
// (mirrors W9-ADMT-WIRE pattern in run-admt-checker/index.ts L28-L66).
import {
  RISK_VERIFIED_AUTHORITIES,
  RISK_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/risk-verified-authorities.ts";
import {
  resolveByPropositionKey,
  registrySize as vaRegistrySize,
} from "../_shared/verified-authority-resolver.ts";

function buildRiskVerifiedAuthorityBlock(): string {
  const rows = Object.values(RISK_VERIFIED_AUTHORITIES);
  const lines = rows.map((r) =>
    `- [${r.proposition_key}] ${r.subsection} — "${r.verbatim_quote.replace(/\s+/g, " ").slice(0, 260)}"`
  );
  return `VERIFIED-AUTHORITY REGISTRY (${RISK_VERIFIED_AUTHORITY_VERSION}, ${rows.length} rows — SINGLE SOURCE OF TRUTH FOR RISK-ASSESSMENT CITATIONS; wired W15 RISK-REGISTRY-WIRING):
Every citation this report emits SHOULD be REGISTRY-STAMPED, never authored from recall. When a finding, risk_register entry, trigger claim, scope note, or executive-summary sentence asserts a proposition covered by a row below, emit "proposition_key": "<key>" on that entry (alongside any existing element_id / source_fields). The resolver deterministically stamps citation, subsection, and verbatim_quote onto the entry post-generation; you write the prose around the stamped pinpoint and NEVER type a "§" or "11 CCR" token yourself for a registry-covered proposition.

SUBSECTION DISCIPLINE — § 7150(b) triggers: (b)(1)–(b)(6) are SEPARATE rows with predicate-distinct pinpoints. Never collapse a trigger claim to a bare "§ 7150(b)" or repeat "§ 7150(b) … § 7150(b)" as an undifferentiated pair. Emit the specific proposition_key (ra_trigger_sell_share / ra_trigger_sensitive / ra_trigger_sensitive_hr_exclusion / ra_trigger_admt / ra_trigger_infer_context / ra_trigger_infer_sensitive_location / ra_trigger_train). If a claim's predicate is under-specified by the intake, omit proposition_key and route to information_needed with an empty citation — never repeat bare "§ 7150(b)".

If no row covers a proposition, omit proposition_key and rely on the existing corpus-grounded prose; the unresolvable path is counted in telemetry (report._meta.internal.risk_va) and never fabricated as a stamped citation. RISK ASSESSMENTS ARE ARTICLE 10 (§ 7150 et seq.), NEVER § 7221 OR ITS SUBDIVISIONS — this substantive discipline is retained.

Row shape shown as "[proposition_key] pinpoint — verbatim quote":
${lines.join("\n")}
`;
}
const RISK_VERIFIED_AUTHORITY_BLOCK = buildRiskVerifiedAuthorityBlock();
console.log(JSON.stringify({
  evt: "risk_va_registry_loaded", fn: "run-cppa-risk-assessment",
  build_stamp: BUILD_STAMP,
  va_version: RISK_VERIFIED_AUTHORITY_VERSION,
  va_rows: vaRegistrySize(RISK_VERIFIED_AUTHORITIES),
}));
// run-meter deploy-check v1
// CPPA Risk Assessment — v4 (CR-2, June 2026)
// Five-stage intake + corpus-grounded generation. See
// EUP_CPPA_Risk_Assessment_Redesign.md (CR-2) for the spec.
//
// Pipeline:
//   1. Normalise intake (shim legacy flat payloads -> minimal five-stage).
//   2. Pre-generation validation (skipped/relaxed for legacy-shimmed payloads).
//   3. Parallel corpus retrieval: get-enforcement-context +
//      generate-longitudinal-synthesis.
//   4. Single generation call using the new § 7150–7157 system prompt.
//   5. Persist new-schema JSON to cppa_assessments.report_data.
//
// NOTE: The frontend intake form (src/pages/CPPARiskAssessment.tsx) and the
// result-page renderer still consume the legacy q*/i* schema. The shim keeps
// existing drafts running; the result page will need a separate redesign
// (tracked as a follow-up) before it can render the new output structure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startFunctionRun, finishFunctionRun, failFunctionRun, logPostGenLint } from "../_shared/function-run-logger.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type SystemBlock, type ToolModule, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { BANNED_PHRASES } from "../_shared/citation-verifier.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
// [REVISED] authoritative § 7150(b) section strings — single source of truth
import { CITATION_REGISTRY, verifyRegistryAgainstCorpus } from "../_shared/admt-citation-registry.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { freezeOpenItemsOnFirstRun, rewriteI3CompositionAsks } from "../_shared/open-items.ts";
import { handleRevisionMode } from "../_shared/revision-mode.ts"; // RC-B.1
import { renderSupplementalBlock } from "../_shared/supplemental-block.ts";
import { normalizeRiskV2 } from "./_qbp25_b3_pointers.ts";
import { validateSourceFields } from "../_shared/source-fields-validator.ts";
import { observeCitations } from "../_shared/citation-observe.ts";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";
import { callAnthropicWithContinuation, AnthropicTimeoutError } from "../_shared/anthropic-call.ts";
import {
  computeRetryBudget,
  withRetryPersistFirst,
  hasBudgetForPostLintLLM,
  POST_LINT_LLM_BUDGET_MS,
  POST_LINT_LLM_CALL_TIMEOUT_MS,
  POST_LINT_PASS1_TIMEOUT_MS,
} from "../_shared/ltp/retry-budget.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// r1b1.1 (2026-07-11): time-budget guard on the post-gen T-1..T-5 retry.
// If elapsed generation time at violation detection is at/over this threshold,
// skip the retry, log post_gen_violation_retry_skipped, and proceed with the
// document instead of burning the isolate's remaining wall-clock on a second
// full generation. Mirrors run-dpia-framework DPIA_T234_RETRY_ELAPSED_THRESHOLD_MS.
const CPPA_RISK_RETRY_ELAPSED_THRESHOLD_MS = 150_000;
// Courier 2026-07-12 item 4: first-call ceiling for risk. Continuation
// (see callAnthropicWithContinuation) is the safety net if exceeded.
const CPPA_RISK_MAX_TOKENS = 32_000;
const REPORT_COMPLETION_GATE = "final-status-and-report-data@2026-07-27-smoke-latency-rootcause";
console.log(`[cppa-risk] build active · core=${PROMPT_CORE_VERSION} · cppa-risk=r1b1.4-rca`);

// L3 stage 1: fire-and-forget corpus-consistency check (once per warm
// instance). Non-blocking; warns on drift; no behavior change.
verifyRegistryAgainstCorpus(supabase as any).catch(() => { /* already warns internally */ });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// R1e/A2 (PURE MOVE, 2026-07-11): ExceptionEntry / FiveStageIntake type
// declarations plus EMPTY_TRIGGERS / EMPTY_EXCEPTION / EMPTY_EXCEPTIONS /
// shimLegacyIntake / normaliseIntake now live in
// `_shared/cppa-risk-normalise.ts` so run-quality-batch's QC-R1 deterministic
// checks can feed the IDENTICAL pipeline the generator runs
// (normaliseIntake -> computeTestStates). Re-exported here so every existing
// caller is byte-identically preserved.
// ---------------------------------------------------------------------------
export {
  EMPTY_TRIGGERS,
  EMPTY_EXCEPTION,
  EMPTY_EXCEPTIONS,
  shimLegacyIntake,
  normaliseIntake,
} from "../_shared/cppa-risk-normalise.ts";
import {
  EMPTY_TRIGGERS,
  EMPTY_EXCEPTION,
  EMPTY_EXCEPTIONS,
  shimLegacyIntake,
  normaliseIntake,
} from "../_shared/cppa-risk-normalise.ts";
import type { ExceptionEntry, FiveStageIntake, TestState } from "../_shared/cppa-test-states.ts";
export type { ExceptionEntry, FiveStageIntake } from "../_shared/cppa-test-states.ts";
export { classifyRevenueBand, computeTestStates, formatTestStatesBlock } from "../_shared/cppa-test-states.ts";
export type { RevenueBand, TestState } from "../_shared/cppa-test-states.ts";
import { classifyRevenueBand, computeTestStates, formatTestStatesBlock, detectTestStatesLeak } from "../_shared/cppa-test-states.ts";
import { detectBlacklistPhrases, formatBlacklistRetrySuffix } from "../_shared/blacklist-phrases.ts";


// POSTBATCH-1 — deterministic post-generation fallback for TEST-STATES leakage
// and resolved-source information_needed asks. Used when the T-1..T-5 retry is
// skipped (elapsed budget exceeded) or when the retry result still violates.
const M_TOKEN_MAP: Record<string, string> = {
  M1: "the revenue determination",
  M2: "the consumer-volume determination",
  M3: "the consumer-volume determination",
  M4: "the sensitive-PI determination",
  M5: "the sale/share-revenue determination",
  M6: "the cyber-audit tier review",
  M7: "the trigger review",
  M8: "the exception review",
  M9: "the § 7152(a) element review",
  M10: "the canonical-dates review",
};

// REBUILD-DPIA T10a — compound-first patterns BEFORE the bare-id pass.
// Catches "the M<n> (cohort |audit |trigger )?determination" so the whole
// phrase is replaced atomically, preventing double-noun artefacts
// (batch 4487d55d: "the M6 cohort determination" formerly became
// "the the audit-cohort determination cohort determination").
const M_COMPOUND_REPLACEMENTS: Array<[RegExp, (id: string) => string]> = [
  [/\bthe\s+(M10|M[1-9])\s+(cohort|audit|trigger)\s+determination\b/gi, (id: string) => M_TOKEN_MAP[id] ?? id],
  [/\bthe\s+(M10|M[1-9])\s+determination\b/gi, (id: string) => M_TOKEN_MAP[id] ?? id],
];

// REBUILD-DPIA T10b — prose field-id scrub map. Raw intake field ids in prose
// (outside information_needed.field / source_fields anchors) are C5 violations
// and co-trigger qc_r1_1. This map applies to *prose* fields only; the
// applyDeterministicPostGenFallback walker excludes information_needed
// entries' `field`/`source_fields` values.
export const PROSE_FIELD_ID_MAP: Record<string, string> = {
  q18_admt_use: "the ADMT-use answer",
  q18b_admt_training: "the ADMT-training answer",
  q5_sell_share: "the sale/share answer",
  q5c_share_revenue_50pct: "the 50%-revenue answer",
  q15_sensitive_pi: "the sensitive-PI answer",
  q15c_spi_volume: "the sensitive-PI volume figure",
  q5b_profiling_observation: "the profiling-observation answer",
  q15b_under16_knowledge: "the under-16 knowledge answer",
};

const STATE_TOKEN_REPLACEMENTS: Array<[RegExp, string]> = [
  // Compound "is/are resolved <state>" forms first — most specific.
  [/\bis\s+resolved[_\s]met\b/gi, "is established on the record"],
  [/\bare\s+resolved[_\s]met\b/gi, "are established on the record"],
  [/\bis\s+resolved[_\s]not[_\s]met\b/gi, "is not met on the record"],
  [/\bare\s+resolved[_\s]not[_\s]met\b/gi, "are not met on the record"],
  [/\bis\s+resolved[_\s]not[_\s]applicable\b/gi, "is not applicable on the record"],
  [/\bare\s+resolved[_\s]not[_\s]applicable\b/gi, "are not applicable on the record"],
  // Bare state tokens (upper or lower, underscored or spaced).
  [/\bRESOLVED[_\s]NOT[_\s]APPLICABLE\b/g, "not applicable on the record"],
  [/\bresolved[_\s]not[_\s]applicable\b/gi, "not applicable on the record"],
  [/\bRESOLVED[_\s]NOT[_\s]MET\b/g, "not met on the record"],
  [/\bresolved[_\s]not[_\s]met\b/gi, "not met on the record"],
  [/\bRESOLVED[_\s]MET\b/g, "established on the record"],
  [/\bresolved[_\s]met\b/gi, "established on the record"],
  [/\bINDETERMINATE\b/g, "indeterminate on the record"],
];

// Post-scrub cleanup: collapse "the the" and immediate duplicated trailing
// noun ("determination ... determination" within 6 words of a scrub site).
function postScrubCleanup(s: string): string {
  let out = s.replace(/\bthe\s+the\b/gi, "the");
  // Collapse duplicated "determination" within 6 words:
  //   "audit-cohort determination cohort determination" → "audit-cohort determination"
  out = out.replace(/(\b\w[\w-]*\s+determination)(?:\s+\w+){0,4}\s+determination\b/gi, "$1");
  return out;
}

// PROSE FIELDS ONLY: recurse into strings, but never rewrite the values of
// information_needed[].field or information_needed[].source_fields (Task 10b).
function scrubTestTokensDeep(
  node: unknown,
  notes: Array<{ code: string; detail: string }>,
  parentKey?: string,
  insideInformationNeededEntry: boolean = false,
): unknown {
  if (typeof node === "string") {
    // Preserve raw intake-field ids inside information_needed entry anchors.
    const isAnchor = insideInformationNeededEntry && (parentKey === "field" || parentKey === "source_fields");
    let out = node;

    // Compound M-phrase pass (BEFORE bare-id pass; Task 10a).
    for (const [re, replFn] of M_COMPOUND_REPLACEMENTS) {
      out = out.replace(re, (_m: string, id: string) => {
        const human = (replFn as any)(id);
        if (human && human !== id) notes.push({ code: "test_token_scrubbed", detail: `${id}-compound→"${human}"` });
        return human ?? _m;
      });
    }
    // State-token pass.
    for (const [re, repl] of STATE_TOKEN_REPLACEMENTS) {
      if (re.test(out)) {
        out = out.replace(re, repl);
        notes.push({ code: "test_token_scrubbed", detail: `state→"${repl}"` });
      }
    }
    // Bare M-id pass.
    out = out.replace(/\b(M10|M[1-9])\b/g, (_m, id: string) => {
      const human = M_TOKEN_MAP[id];
      if (!human) return _m;
      notes.push({ code: "test_token_scrubbed", detail: `${id}→"${human}"` });
      return human;
    });
    // TEST-STATES literal.
    if (/\bTEST-STATES\b/.test(out)) {
      out = out.replace(/\bTEST-STATES\b/g, "the deterministic checks");
      notes.push({ code: "test_token_scrubbed", detail: "TEST-STATES→\"the deterministic checks\"" });
    }
    // Prose field-id pass (Task 10b) — NEVER touch anchors.
    if (!isAnchor) {
      for (const [fid, human] of Object.entries(PROSE_FIELD_ID_MAP)) {
        const re = new RegExp("\\b" + fid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
        if (re.test(out)) {
          out = out.replace(re, human);
          notes.push({ code: "prose_field_id_scrubbed", detail: `${fid}→"${human}"` });
        }
      }
    }
    // Cleanup pass (Task 10a).
    out = postScrubCleanup(out);
    return out;
  }
  if (Array.isArray(node)) return node.map((v) => scrubTestTokensDeep(v, notes, parentKey, insideInformationNeededEntry));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      const inIN = insideInformationNeededEntry || parentKey === "information_needed";
      out[k] = scrubTestTokensDeep(v, notes, k, inIN);
    }
    return out;
  }
  return node;
}


function dropResolvedSourceAsks(
  report: any,
  testStates: Record<string, TestState>,
  notes: Array<{ code: string; detail: string }>,
): any {
  const resolvedSources = new Set<string>();
  for (const ts of Object.values(testStates ?? {})) {
    if (ts && typeof ts.state === "string" && ts.state.startsWith("resolved")) {
      for (const f of ts.source_fields ?? []) resolvedSources.add(f);
    }
  }
  if (resolvedSources.size === 0) return report;
  const entries: any[] = Array.isArray(report?.information_needed) ? report.information_needed : [];
  const kept: any[] = [];
  for (const e of entries) {
    const fields: string[] = [];
    if (typeof e?.field === "string") fields.push(e.field);
    if (Array.isArray(e?.source_fields)) for (const f of e.source_fields) if (typeof f === "string") fields.push(f);
    const overlaps = fields.some((f) => resolvedSources.has(f));
    if (overlaps) {
      notes.push({
        code: "resolved_source_ask_dropped",
        detail: String(e?.field ?? e?.dimensions ?? "").slice(0, 120),
      });
    } else {
      kept.push(e);
    }
  }
  if (kept.length !== entries.length) {
    report.information_needed = kept;
  }
  return report;
}

export function applyDeterministicPostGenFallback(
  parsed: any,
  testStates: Record<string, TestState>,
): { parsed: any; notes: Array<{ code: string; detail: string }> } {
  const notes: Array<{ code: string; detail: string }> = [];
  let out = dropResolvedSourceAsks(parsed, testStates, notes);
  out = scrubTestTokensDeep(out, notes) as any;
  return { parsed: out, notes };
}





// ---------------------------------------------------------------------------
// R1b1 — deterministic TEST-STATES computed from the normalised intake.
// A RESOLVED state is binding: the model may not hedge, contradict, or
// convert it into an information_needed ask (rule TEST-STATES ARE BINDING,
// enforced by post-check T-2).
//
// R1d/A1 (PURE MOVE): TestState, computeTestStates, and formatTestStatesBlock
// live in _shared/cppa-test-states.ts and are re-exported at the top of this
// file so every existing caller is byte-identically preserved.
// ---------------------------------------------------------------------------



// ---------------------------------------------------------------------------
// Validation (CR-2 Step 5). Relaxed when payload was shimmed from legacy.
// Returns { ok, error?, field? }.
// ---------------------------------------------------------------------------
function validateFiveStage(intake: FiveStageIntake, lenient: boolean): { ok: true } | { ok: false; message: string; field: string } {
  if (!Object.values(intake.triggers).some((v) => v === true)) {
    return {
      ok: false,
      message:
        "No § 7150(b) triggering activity is selected. The CPPA Risk Assessment is only required when one of the § 7150(b) triggers applies (sell/share, targeted advertising, profiling with significant effects, sensitive PI beyond enumerated, ADMT, or training ADMT). If your only trigger is high consumer volume, the applicable obligation is the § 7120 cybersecurity audit — please run the CPPA Cybersecurity tool instead.",
      field: "triggers",
    };
  }
  // Runs in BOTH modes: a blank/placeholder company name produced
  // "[FILL IN — business legal name]" in finished reports. Block it.
  const companyName = String(intake.org_context?.company_name ?? "");
  if (!companyName.trim() || companyName.includes("[FILL IN")) {
    return { ok: false, message: "The business legal name is missing. Please complete the entity name on Step 1 before generating.", field: "org_context.company_name" };
  }
  if (lenient) return { ok: true };

  const generic = ["to improve our service", "for business purposes", "to provide services", "general operations"];
  for (const a of intake.activity_details ?? []) {
    const p = String(a.purpose_description ?? "").toLowerCase();
    if (p.length < 50 || generic.some((g) => p.includes(g))) {
      return {
        ok: false,
        message: `Processing purpose for "${a.trigger_key}" is too generic. Describe the specific purpose as required by § 7152(a)(1).`,
        field: `activity_details.${a.trigger_key}.purpose_description`,
      };
    }
  }
  if (String(intake.impact?.benefits_outweigh_risks_rationale ?? "").length < 100) {
    return {
      ok: false,
      message: "The benefits-outweigh-risks rationale is too brief. § 7152(a)(4) (benefits) and the § 7154 balancing goal require a substantive analysis.",
      field: "impact.benefits_outweigh_risks_rationale",
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Corpus retrieval (CR-2 Step 1).
// ---------------------------------------------------------------------------
async function retrieveCorpusContext(intake: FiveStageIntake): Promise<{ enforcementContext: string; longitudinalSynthesis: string; statuteContext: string; fsorContext: string; citations: string[] }> {
  const primaryActivity = Object.entries(intake.triggers)
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/_/g, " "))
    .join(", ");
  const sector = intake.org_context?.sector ?? "general";
  const corpusQuery = `CPPA risk assessment ${sector} ${primaryActivity} California privacy enforcement`;

  const S = String.fromCharCode(167); // section symbol, encoding-safe
  const RISK_BASE_CITATIONS = [
    `11 CCR ${S} 7001`, `11 CCR ${S} 7120`, `11 CCR ${S} 7121`,
    `11 CCR ${S} 7150`, `11 CCR ${S} 7151`, `11 CCR ${S} 7152`, `11 CCR ${S} 7153`,
    `11 CCR ${S} 7154`, `11 CCR ${S} 7155`, `11 CCR ${S} 7156`, `11 CCR ${S} 7157`,
    // Doc V Step 4: § 7220 is cited by the ADMT LINKAGE rule; must be pinned so
    // citation-lint reports in_supply=true. Corpus row exists (6,774 chars,
    // status=current). Base citations are fetched separately from full_text_limit,
    // so this does not consume semantic slots.
    `11 CCR ${S} 7220`,
    // Pinned per Doc H: § 1798.145 (CCPA exceptions) — cited by every US risk
    // run for exception_analysis; base citations are fetched separately from
    // full_text_limit, so this does not consume semantic slots.
    `Cal. Civ. Code ${S} 1798.145`,
  ];
  const statuteTopics = ["risk-assessment", "thresholds"];
  if (intake.triggers.admt_involved) statuteTopics.push("admt", "significant-decision");
  if (intake.triggers.profiling_significant_effects) statuteTopics.push("profiling");

  const [enforcementRes, longitudinalRes, statuteRes] = await Promise.allSettled([
    supabase.functions.invoke("get-enforcement-context", {
      body: { query: corpusQuery, jurisdictions: ["California", "US-CA", "United States"], regime: "ccpa", limit: 8 },
    }),
    supabase.functions.invoke("generate-longitudinal-synthesis", {
      body: {
        topic: `CPPA enforcement patterns ${sector} sector risk assessment`,
        jurisdiction: "US-CA",
        regulation: "CPPA",
        focus_areas: [primaryActivity, "audit division enforcement priorities", "§ 7152 documentation requirements"],
      },
    }),
    supabase.functions.invoke("cppa-retrieve-context", {
      body: { topics: statuteTopics, query: `risk assessment ${primaryActivity}`, include_deadlines: false, full_text_limit: 10, limit: 16, base_citations: RISK_BASE_CITATIONS },
    }),
  ]);

  const enforcementRows = enforcementRes.status === "fulfilled"
    ? (enforcementRes.value?.data?.results ?? [])
    : (console.warn("[cppa-risk] get-enforcement-context failed:", enforcementRes.reason), []);
  const enforcementContext = Array.isArray(enforcementRows) && enforcementRows.length
    ? enforcementRows.slice(0, 8).map((r: any) => {
        const fine = r.fine_amount ?? r.fine_eur_equivalent;
        const failure = r.key_compliance_failure ?? r.violation ?? "compliance failure not specified";
        return `• ${r.regulator ?? "Regulator"}${r.jurisdiction ? ` (${r.jurisdiction})` : ""}${r.subject ? ` — ${r.subject}` : ""}: ${failure}${fine ? ` [fine: ${fine}]` : ""}${r.decision_date ? ` (${r.decision_date})` : ""}${r.source_url ? ` ${r.source_url}` : ""}`;
      }).join("\n")
    : "";
  const longitudinalSynthesis = longitudinalRes.status === "fulfilled"
    ? (longitudinalRes.value?.data?.synthesis ?? "")
    : (console.warn("[cppa-risk] generate-longitudinal-synthesis failed:", longitudinalRes.reason), "");

  // Verbatim statutory text + plain summaries from the CPPA authorities corpus.
  const authorities: any[] = statuteRes.status === "fulfilled" ? (statuteRes.value?.data?.authorities ?? []) : [];
  if (statuteRes.status === "rejected") console.warn("[cppa-risk] cppa-retrieve-context failed:", statuteRes.reason);
  const baseMissing = statuteRes.status === "fulfilled" ? (statuteRes.value?.data?.base_missing ?? []) : [];
  if (baseMissing.length > 0) console.warn("[cppa-risk] BASE CITATIONS MISSING FROM SUPPLY:", baseMissing.join("; "));
  const statuteContext = authorities
    .map((a: any) => `${a.citation}${a.title ? ` — ${a.title}` : ""}\nPlain summary: ${a.plain_summary ?? ""}\nRegulation text: ${String(a.full_text ?? "").slice(0, 1200)}`)
    .join("\n\n");

  // Agency's own commentary (Final Statement of Reasons) for the retrieved citations.
  let fsorContext = "";
  try {
    const cites = authorities.map((a: any) => a.citation).filter(Boolean).slice(0, 20);
    if (cites.length) {
      const { data: fsorRows } = await supabase
        .from("cppa_fsor_commentary")
        .select("regulation_citation, agency_position_summary")
        .in("regulation_citation", cites)
        .not("agency_position_summary", "is", null)
        .limit(20);
      fsorContext = (fsorRows ?? [])
        .map((r: any) => `${r.regulation_citation}: ${r.agency_position_summary}`)
        .join("\n\n");
    }
  } catch (e) {
    console.warn("[cppa-risk] FSOR commentary fetch failed:", e);
  }

  const citations = authorities.map((a: any) => a?.citation).filter(Boolean);
  return { enforcementContext, longitudinalSynthesis, statuteContext, fsorContext, citations };
}

// ---------------------------------------------------------------------------
// Tool Module (CR-2 Step 2). Generic regulator-facing rules now live in the
// shared prompt core (_shared/prompt-core.ts); this module carries only what
// is specific to CPPA Risk Assessment.
// ---------------------------------------------------------------------------
export const CPPA_RISK_TOOL_MODULE: ToolModule = {
  identity:
    "You are a CPPA risk assessment specialist with deep expertise in Cal. Code Regs. tit. 11 §§ 7150–7157 and the California Privacy Rights Act. You produce a formal risk assessment that must meet the § 7152 content requirements and withstand scrutiny from the CPPA Audits Division (operational since February 2026; existing-activity compliance deadline December 31, 2027).",
  citationFramework:
    "Cite only Cal. Code Regs. tit. 11 (format \"§ 7150(b)(1)\") or Cal. Civ. Code § 1798 (format \"§ 1798.185\"). Never cite § 7221(c)(5) for any purpose. Exception citations are § 7152(a)(1)–(8) only — verify each exists in the provided regulation text before use. § 7150(b) trigger→subsection mappings are provided to you explicitly below and in the regulation text; use those exact subsections — never assign a § 7150(b) subsection from memory.",
  outputMode: "strict-JSON",
  includeEuTransfers: false,
  languageVariant: "american",
  extraRules: [
    "R-A — ATTESTATION_BLOCK SLOT (W9-RISK-SLOTS): every output MUST include a top-level `attestation_block` object with these keys: certifying_executive_name, certifying_executive_title, certifying_contact_email (rendered from the intake's § 7157/§ 7156 certifying-executive fields — do NOT invent identity), certification_statement (the fixed § 7156 perjury statement provided by the pipeline — never paraphrased), statutory_basis (must contain '§ 7156'), submission_status ('pending' | 'submitted' | 'not_required'), submission_deadline. This is a hard slot: emitting the assessment without a rendered attestation_block is a pre-emit defect and the pipeline will reject the output. Never place the certification_statement, executive identity, or § 7156 basis anywhere else in the report — attestation lives only in this slot.",
    "R-B — SUBMISSION_SUMMARY SLOT (W9-RISK-SLOTS): every output MUST include a top-level `submission_summary` object with: assessment_date, business_name, statutory_framework (must contain '§§ 7150–7157'), triggered_subsections (array of § 7150(b)(N) anchors derived from scope_and_triggers — never a paraphrase), compliance_deadline ('December 31, 2027'), submission_deadline, submission_basis. The § 7150(b)(N) list in this slot is the CANONICAL trigger inventory for the report — assessment_summary.triggered_activities remains a prose list but the submission_summary carries the anchored subsections used by downstream registers and the § 7156 filing summary.",
    "R-C — RISK_REGISTER SLOT (W9-RISK-SLOTS): every output MUST include a top-level `risk_register` object with `entries[]`. Each entry has: id ('RR-NNN'), activity, harm_type, likelihood, severity, pre_safeguard_likelihood, pre_safeguard_severity, pre_safeguard_residual_risk_level, current_safeguards, gap_status ('open' | 'mitigated' | 'accepted' | 'unassessed'), residual_risk_level ('Low' | 'Moderate' | 'High' | 'Critical' | 'Insufficient basis'), statutory_basis. The register is a projection of risk_assessment_by_activity.adverse_effects — one row per (activity × adverse_effect). Do NOT invent entries not present in risk_assessment_by_activity; the pipeline reprojects the register deterministically after model output and the pre-emit validator will reject a manually authored register that drifts from the underlying risk_assessment_by_activity fan.",
    "R-D — ICO-FLOW ORDERING (TURN 1b, CPPA-STANDARD-SETTER): every activity treated in risk_assessment_by_activity MUST be reasoned in the ICO DPIA order: (1) identify the processing and its purpose (§ 7152(a)(1)–(3)); (2) identify the negative impacts and who is affected (§ 7152(a)(5)); (3) identify the current and planned safeguards (§ 7152(a)(6)); (4) balance benefits against remaining risks (§ 7152(a)(4) and § 7154). Never emit the balancing conclusion BEFORE the harm identification, and never emit the safeguards discussion BEFORE the harm identification. Where prose combines these steps, the sentence order is fixed: purpose → harm → safeguards → balancing. The reviewer can walk the record top-to-bottom without reordering.",
    "R-E — STRUCTURED RISK SCORING (TURN 1b, CNIL import): every adverse_effect MUST carry BOTH the pre-safeguard scoring pair (pre_safeguard_likelihood, pre_safeguard_severity) AND the post-safeguard scoring pair (likelihood, severity), both drawn from the § 7152 impact-assessment scales (IMPACT_LIKELIHOOD_OPTS / IMPACT_SEVERITY_OPTS). Where the record does not distinguish pre vs post, set pre == post and state so in the accompanying narrative — do NOT fabricate a delta. The CNIL structured-scoring pattern requires the reader to see the risk BEFORE mitigation and the residual risk AFTER — a single-column score is a defect. The deterministic register reprojection will fill missing pre_safeguard_* fields with the bump-up rule; the model SHOULD supply them explicitly when the intake gives a basis to differentiate.",
    "R-F — BALANCING CONCLUSION DISCIPLINE (TURN 1b): the § 7152(a)(4) / § 7154 balancing conclusion is a SINGLE named sentence at the close of the balancing analysis, and it names (i) the specific benefits (from the intake), (ii) the specific residual risks (from the risk_register), (iii) the specific safeguards relied on, and (iv) whether benefits outweigh residual risks. Vague balancing verdicts ('benefits outweigh risks on balance', 'the risks are acceptable given the safeguards', 'the processing is proportionate') are DEFECTS. Never emit a balancing conclusion in the executive_summary before the underlying activity analysis has run — the conclusion is a downstream artifact, not a lead paragraph. Where the record does not yet support a conclusion, the balancing section states the specific named fact whose absence prevents completion and stops — do NOT emit a placeholder verdict.",
    "R-G — TURN 1b INTAKE FIELDS: two intake fields flow through the § 7150(b) selection and the submission_summary. (i) `sensitive_location_basis` — closed enum from SENSITIVE_LOCATION_BASIS_OPTS. Any value other than 'Not applicable — no sensitive-location processing' ENGAGES § 7150(b)(5); resolve it as a discrete trigger and never paraphrase the enum member in prose (render the exact string as the record anchor). (ii) `public_privacy_policy_url` — optional URL rendered as a record anchor in both attestation_block and submission_summary. Never assert facts about the linked policy that are not present in the intake; the URL is a locator, not a source of facts.",
    "W3-T5 (b) — INCONSISTENCY_FLAGS FIELD NAMING: entries in inconsistency_flags MUST use the exact intake field name (as emitted by the intake contract) for every referenced field — never a paraphrase, casual label, or derived slug. Each entry names both intake fields whose values conflict (source_field_a, source_field_b) using their canonical intake keys. Where the conflict involves a value derived from a specific intake row, name the parent intake field plus the array index or item id in parentheses. Human-readable prose in the entry's `explanation` field is unchanged; only field-identifier fields carry the canonical names.",
    "ADVOCATE-DRAFTER GOVERNING PHILOSOPHY (LEAD RULE — controls every other rule when they conflict): This tool is the client's advocate-drafter — it builds the strongest supportable record and shows what would strengthen it, the way outside counsel prepares a defensible assessment. Rational balance is mandatory: facts are never overstated ('you're in the clear' is banned) and never verdicted against ('insufficient basis' is banned). The house formulation for partially-supported positions is: 'These facts present a strong/colorable argument that [issue]', followed by the named facts that would strengthen or complete the position.",
    "PROSE BLACKLIST (ABSOLUTE — FF-2 T1): the phrases 'insufficient basis', 'not substantiated', 'cannot be confirmed', 'no basis to assess', and 'in the clear' NEVER appear in any user-facing field — not in exception analyses, conclusions, rationales, information_needed dimensions, priority_actions, executive_summary, chips, banners, or any other visible string. Where the record does not yet complete a determination, use the advocate-drafter voice: state what the recorded facts establish, then name the specific completing item and the provision it satisfies.",
    "MOST-SPECIFIC-SECTION / NO BLANKET RANGES (QB-TEAM 2026-07-22; adapted from run-admt-checker): every duty-bearing sentence cites its single most specific section — the § 7152(a)(N) subparagraph that carries the duty, the § 7154 content requirement, the § 7155(a)(1)/(2) or (b) timing, the § 7156 attestation, or the § 7157 retention duty. Hyphenated range cites (e.g. §§ 7150–7157) are permitted ONLY in one scope-framing sentence per section, never as the anchor for a specific duty; § 7152(a) or § 7154 alone (without the subparagraph) is a defect where the duty attaches to a specific subparagraph. This rule operates within PF6 T3(b) (§ 1798.185 is rulemaking authority only) and STATUTORY_BASIS MATCHES THE PROSE — it never licenses citing the parent section where the operative subparagraph is available.",
    "CANONICAL RECORD REFERENCE (FF-2 T2 — cross-tool CEO ruling D3): in user-facing prose, refer to the source of facts as 'the record' (e.g. 'the record shows …', 'the record reflects …', 'the record does not yet resolve …'). NEVER write 'the intake states', 'the intake records', 'the submission', 'the form', or 'the questionnaire' in user-facing prose. Raw intake field ids remain permitted only in information_needed.field / source_fields anchors, per the INTERNAL-VOCAB CLASS BAN.",
    "CPPA-HF3 B1 — FABRICATED PROFESSIONAL ATTRIBUTION BAN: NEVER assert in any user-facing prose that legal counsel, outside counsel, in-house counsel, a privacy officer, a DPO, a compliance officer, an auditor, an engineer, or any other named or generic professional or reviewer has reviewed, flagged, advised, opined on, escalated, cleared, blessed, approved, or otherwise acted upon any element of the record — unless that exact fact appears as a value in the intake fields provided to the model. Banned constructions include: 'Legal counsel has flagged this as a material gap', 'counsel has advised', 'privacy counsel identified', 'the DPO noted', 'our reviewers have determined', or any equivalent. Correct form: state the gap or determination directly, tied to the record and the provision — e.g. 'The record does not resolve whether [named fact]; the assessment record must address this before the § 7152 determination is complete under § 7152(a)(N).' Do not invent a reviewer, do not attribute the observation to a role that the intake did not populate.",
    "CPPA-HF3 C — PRIORITY-ACTION CITATION ANCHORING (ADMT priority actions inside the risk assessment): where a priority action addresses an ADMT obligation, the citation anchors on the substantive obligation's home section — NEVER on a § 7150(b) trigger subsection. Verified anchor map: (i) ADMT PRE-USE NOTICE obligations → § 7220 (pre-use notice content and delivery); (ii) ADMT OPT-OUT obligations → § 7221 (opt-out right, methods, and exceptions); (iii) ADMT ACCESS obligations → § 7222 (right of access to ADMT). § 7150(b)(3) is a RISK-ASSESSMENT trigger — cite it only where the priority action is 'conduct the § 7150 risk assessment', never where the priority action is 'provide the pre-use notice' or 'establish the opt-out method'. Do NOT swap § 7220 and § 7221 (a common defect: citing § 7220 for opt-out or § 7221 for pre-use notice). § 7152(a)(6) is a RISK-ASSESSMENT content element (safeguards) — it is a companion cite, never a substitute for the § 7220/7221/7222 obligation home. Where a priority action is compound (e.g. 'establish an ADMT opt-out method and record the notice-delivery safeguard'), cite the appropriate ADMT-subchapter section for each limb and § 7152 only for the risk-assessment-content limb.",
    "CPPA-HF3 D — INTAKE-FIELD-ID RENDER BAN (STRENGTHENED): raw intake field identifiers (i5_admt_logic, q19_admt_description, i7_internal_contributors, i1b_min_pi, impact_intake, q15c_spi_volume, etc.) and the internal source_fields projections (whether the raw array literal or the string 'source_fields') NEVER appear in customer-facing narrative prose, including inconsistency_flags.description, inconsistency_flags.resolution_required, priority_actions.rationale, adverse_effects narratives, safeguard_gaps narratives, benefits_outweigh_risks_rationale, and executive_summary. Anchor exceptions: information_needed[].field, information_needed[].source_fields, and equivalent structured technical anchors continue to carry raw field ids. In prose, replace the raw id with the human-readable descriptor of the same content (e.g. 'the ADMT logic description', 'the ADMT-system description supplied in the intake', 'the internal-contributors roster', 'the minimum-PI justification', 'the sensitive-PI volume figure'). The H2 deterministic check enforces this against prose extracts.",
    "CPPA-HF3 E — ADVISORY CLOSE NAMED-FACT SPECIFICITY (SUPPLEMENTS advisory-voice rule E5, which already bans a bare advisory close): every advisory close in this rulebook ('further clarification is advisable', 'further internal investigation is advisable', 'should be confirmed', 'warrants further review', 'further investigation is advisable') NAMES the specific fact, field, document, contract, or determination whose confirmation is being requested. The advisory close is a request for a NAMED item, not a stylistic hedge. Bare closes ('should be confirmed', 'further internal investigation is advisable' with no named object) are non-compliant and will fail the E5 deterministic check. Correct form: 'further internal investigation is advisable to confirm whether [named fact from the record] establishes [named legal element]'; 'the [named document or contract] should be confirmed to determine whether [named determination under § XXXX]'.",
    "§ 7152 MAPPING: every output section maps to a § 7152 required content element; generate nothing not required by statute.",
    "§ 7152(a)(4) BENEFITS-OUTWEIGH: ground the balancing in the specific benefits and harms in the intake; no generic balancing language.",
    "PRODUCT-FIX-4 T6(a) § 7152(a)(4) BENEFITS TIE-TO-INTAKE: every citation of § 7152(a)(4) in a priority_action, exception_analysis line, benefits_outweigh_risks conclusion, or table cell IS TIED to the specific benefits and named beneficiaries actually present in the intake — the concrete business function or service the intake describes, the individuals or groups the intake identifies as beneficiaries (e.g. named user cohort, employees, patients, customers of the described service), and the specific benefit each obtains (e.g. improved fraud detection accuracy for account-holders, faster clinical triage for patients, targeted training recommendations for employees). NEVER emit a generic '§ 7152(a)(4) requires documentation of benefits' recital that names no benefit, no beneficiary, and no concrete outcome — that recital is a defect. Where the intake does not supply a specific benefit or named beneficiary, ROUTE the item to information_needed with a targeted ask ('§ 7152(a)(4) requires the benefits of the processing to be documented — the record does not yet identify [beneficiary group] and the specific benefit [group] obtains from [the intake's processing description]') rather than emitting a generic recital in body text.",
    "EXCEPTION ANALYSIS SHAPE (REBUILD-RISK C2): each claimed exception renders EXACTLY three substantive elements: (i) facts_supporting — the intake facts, tied to the pinned frame's specific subparagraph per EXCEPTION_PIN; (ii) argument_strength — 'strong' (elements substantially evidenced on the record) or 'colorable' (plausible mapping with material facts undocumented), accompanied by one sentence of rationale; (iii) strengthen_position — named facts with their legal significance, constructively phrased (never verdict language). The obsolete 'documentation_status' / 'validity_assessment' verdict fields are REMOVED from the output shape. The employment_context counsel-review branch (pinned cite = counsel-review flag) retains its counsel-review routing and uses argument_strength = 'counsel-review'.",
    "CYBERSECURITY-AUDIT LINKAGE: if the intake reveals cybersecurity deficiencies or revenue exceeds $100M, flag the cybersecurity-audit obligation as a staggered obligation tied to annual gross revenue, framing each date relative to the assessment date per the prompt-core TEMPORAL FRAMING RULE: April 1, 2028 if 2026 revenue exceeded $100M; April 1, 2029 if 2027 revenue is $50M–$100M; April 1, 2030 if under $50M. Where the intake does not pin the revenue band, do NOT assert a single date as definitive — set `deadline` to the earliest band that could apply and use `deadline_basis` to spell out the conditional cohorts (e.g. \"April 1, 2028 if 2026 annual gross revenue > $100M; April 1, 2029 if 2027 revenue $50M–$100M\"). Where the intake does pin the band, use that band's single date.",
    "ADMT LINKAGE: if ADMT is involved in any triggered activity, flag the January 1, 2027 ADMT disclosure deadline under § 7221 — framing the date relative to the assessment date per the prompt-core TEMPORAL FRAMING RULE (prospective before 1 January 2027; operative on/after) — and route the user to the ADMT Assessment tool.",
    "TRIGGER ROUTING: a sensitive-PI trigger applies only where a genuine § 7001(bbb) SPI element is present — income, debt-to-income, or credit history are not per se SPI.",
    "CONSUMER CATEGORIES: every `consumer_categories` value must be a human-readable label (e.g., \"California residents\", \"Employees\", \"Job applicants\", \"Minors under 16\", \"Website visitors\"). Never emit raw intake keys (no snake_case, no field IDs) and never leave the array empty — if unknown, use [\"Not specified in intake\"].",
    "PRIORITY ACTIONS: split severity from deadline. `severity` is one of Immediate | High | Medium | Low (operational urgency). `deadline` is an ISO-style date (YYYY-MM-DD) or a known statutory deadline (\"December 31, 2027\" for existing-activity § 7155(b); \"April 1, 2028\" for § 7121(a) cyber-audit certification (revenue >$100M in 2026 — confirm cohort per § 7121(a)'s staggered schedule before asserting a single date); \"January 1, 2027\" for § 7220 ADMT pre-use notice). `deadline_basis` cites the statutory or operational source for the date. Do not encode the deadline inside the severity enum.",
    "§ 1798.140(d)(1) THRESHOLDS: § 1798.140(d)(1) defines a covered \"business\" by THREE ALTERNATIVE thresholds — (A) annual gross revenue over $25M, (B) buying/selling/sharing PI of 100,000+ consumers or households, or (C) deriving 50%+ of annual revenue from selling or sharing PI. Subsection (C) is the selling/sharing-revenue prong — NEVER describe (C) as a general \"revenue floor\" or imply a dollar revenue range straddles (C). When discussing the § 7121(a) cyber-audit linkage, state all three thresholds and which the intake figures bear on; do not collapse them into a single revenue test.",
    "VOLUME IS NOT A § 7150(b) TRIGGER: high consumer volume alone does not trigger a § 7150(b) risk assessment (it is a § 7120 cyber-audit signal). If the intake or an activity asserts volume as the basis for the assessment, do NOT search for or speculate about which § 7150(b) subsection it maps to, and do NOT emit a \"NOTE FOR COUNSEL\" asking which subsection applies. State it plainly as a user-asserted deficiency: \"The intake characterises this activity as high-volume processing. Volume alone is not an enumerated § 7150(b) trigger; the user must confirm which enumerated trigger (selling/sharing, targeted advertising, profiling with significant effects, sensitive PI, or ADMT/training) applies to the processing as described.\" Flag the deficiency; do not resolve it.",
    "ENFORCEMENT CLAIMS ARE CORPUS-ONLY: any specific enforcement action — naming a date, an outcome (e.g. \"shutdown\"), a party, a docket, or a fine — must come from the supplied enforcement corpus (get-enforcement-context) and be attributable to it. NEVER assert a specific enforcement action from training memory. Do NOT state things like \"the CPPA's February 2025 enforcement action resulting in the shutdown of a data broker\" unless that action appears in the supplied corpus. R-TURN-2 REWRITE — NO-CORPUS FALLBACK IS SILENCE: when the supplied enforcement corpus contains no on-point CPPA action for the processing described, make NO claims about CPPA enforcement posture, priorities, focus areas, or signalled intentions. State the absence in one sentence and move on — canonical form: \"The supplied enforcement corpus does not include an on-point CPPA action for this processing; specific enforcement examples are omitted.\" Do NOT fill the space with generic-posture prose (e.g. \"the CPPA has signalled that disproportionate consumer-profiling risk is an enforcement priority\", \"the CPPA has indicated an enforcement focus on X\"), do NOT direct the reader to the CPPA's public enforcement records as a substitute for an on-point item, and do NOT emit any sentence characterising CPPA enforcement direction without a corpus anchor. The absence-statement is the complete treatment.",
    "ORG-CONTEXT DEFAULTS ARE NOT FINDINGS OF ABSENCE: org_context booleans that arrive false from the compatibility shim — privacy_counsel_engaged, dpo_or_privacy_officer, board_level_oversight, cppa_audit_notification_received — mean \"not captured in the intake,\" NOT \"confirmed absent.\" NEVER assert in safeguard_gaps, adverse-effect, or any narrative that the organisation has \"no privacy counsel,\" \"no DPO/privacy officer,\" or \"no board oversight\" on the basis of these defaults; at most state the item is \"not documented in the intake.\" Where another field contradicts the default (e.g. external consultees name outside privacy counsel, or a certifying executive holds a Chief Privacy Officer title), do NOT assert absence at all — defer to the inconsistency flag, which records the contradiction for the user to resolve.",
    "FF-1 T5 — DERIVED-DEFAULT PROSE BAN: for the four org_context governance booleans (privacy_counsel_engaged, dpo_or_privacy_officer, board_level_oversight, cppa_audit_notification_received), when the STAGE 5 render shows the value as 'Not recorded' the record is SILENT on the field. Prose MUST NOT say the record 'records No', is 'affirmatively recorded as No', is 'documented as No', or any equivalent — describe it as 'not recorded' or 'the intake does not address [the item]'. Prose may assert 'the record shows No' ONLY when the STAGE 5 render shows the literal value 'No' (i.e. the raw intake supplied a false answer). This applies across safeguard_gaps, adverse_effects, benefits_outweigh_risks_rationale, inconsistency_flags, priority_actions, and every narrative field.",
    "THIRD PARTY ≠ SALE/SHARE: classifying a recipient as a third party (rather than a service provider/contractor) does NOT by itself make a disclosure a \"sale\" or \"share.\" Under the § 1798.140 definitions of \"sell\" and \"share,\" a sale/share additionally requires monetary or other valuable consideration, or that the disclosure is for cross-context behavioural advertising. When the intake shows a vendor (e.g. a support/ticketing tool) that may not be under a compliant service-provider contract, state the two determinations SEPARATELY: (1) recipient classification (service provider/contractor vs third party), and (2) whether any transfer is a sale/share (which turns on consideration or cross-context advertising and, if present, triggers a separate § 7150(b)(1) assessment). Never write that non-service-provider status \"is\" or \"constitutes\" a sale/share — flag both as items the user must confirm.",
    "§ 7152(a) SUBSECTION DISCIPLINE: cite each element to its own subsection and never reuse (a)(2) as a catch-all. (a)(1) = processing summary and specific (non-generic) purpose; (a)(2) = categories of PI and whether they include sensitive PI (NOT minimum-PI, NOT consumer categories); (a)(3) = the processing-operation details; (a)(4) = benefits; (a)(5) = negative impacts; (a)(6) = safeguards; (a)(8)–(a)(9) = the individuals involved and the decisionmaker with authority to proceed. The benefits-outweigh-risks balancing itself is the § 7154 goal, not a content element. Consumer categories belong to the (a)(1) processing summary, never (a)(2).",
    "OVERALL_RISK_LEVEL MEASURES SUBSTANTIVE PRIVACY RISK ONLY: overall_risk_level reflects the severity and likelihood of the enumerated adverse effects to consumers from the processing itself, net of safeguards CONFIRMED in the record. It is NOT increased by documentation gaps, unresolved classifications, missing intake answers, deadline proximity, or the incompleteness of the assessment record — those are compliance-record issues, expressed exclusively through benefits_outweigh_risks_conclusion ('Insufficient basis' where the record cannot support a conclusion), the inconsistency flags, information_needed, and priority_actions. If every enumerated harm is Moderate severity / Possible likelihood, overall_risk_level is Moderate even where the record is materially incomplete. The balancing conclusion and overall_risk_level remain distinct axes and can diverge; when they do, add one sentence to benefits_outweigh_risks_rationale stating what the rating reflects (identified-harm severity net of confirmed safeguards) and noting that record-completeness issues are addressed separately in the conclusion and priority actions.",
    "DEADLINE FIELD PRECISION MUST MATCH CERTAINTY: do not populate `deadline` with a specific ISO date (YYYY-MM-DD) when the regulation only specifies a year and the exact date is unconfirmed. The § 7157 submission date IS confirmed by the regulation text: for risk assessments conducted in 2026 and 2027 the submission is due no later than April 1, 2028 (11 CCR § 7157(a)(1)); for risk assessments conducted after 2027 the submission is due no later than April 1 of the year following the assessment year (§ 7157(a)(2)). Populate `deadline` as `2028-04-01` for the 2026/2027 cohort and quote § 7157(a)(1) in `deadline_basis`; use the § 7157(a)(2) April 1 rolling date for subsequent cohorts and cite § 7157(a)(2). Do not emit bracketed 'exact date TBD' placeholders for § 7157.",
    "ACTIONABLE FILL-IN GUIDANCE: where a priority_action requires the user to supply a judgment call the tool cannot make (e.g. 'document specific, non-generic purposes', 'confirm recipient classification', 'document minimum PI necessary'), append one clause of concrete guidance rather than leaving the standard bare. The guidance names the DIMENSIONS a sufficient answer must cover — never an example value or drafted text (see NO DRAFTED MODEL LANGUAGE; the prohibition applies inside parentheticals and 'e.g.' clauses). For a non-generic purpose requirement, add '(a specific purpose names the concrete business function, the data used, and the outcome achieved; a formulation naming only a broad business goal does not satisfy the § 7152(a)(1) specificity requirement)'. For recipient classification, add '(a service provider/contractor processes PI only on the business's behalf under a compliant contract per § 1798.140(ag)/(j); a third party does not)'. For minimum-necessary determinations, add '(document, per data element, why it is required for the stated purpose; remove elements collected but not used for that purpose).' Keep each addition to one parenthetical clause — do not turn priority_actions into an instructional essay.",
    "INCONSISTENCY FLAGS MUST CITE, NEVER RESOLVE, NEVER PRESCRIBE A METHOD: when flagging an inconsistency (e.g. ADMT disclosure vs. negated profiling field), resolution_required must name the controlling provision(s) and state that the controller must resolve and document the determination — it must NEVER state what the controller should conclude, NEVER assert 'if [condition] applies, [consequence] is required,' NEVER direct a specific follow-on action contingent on an unresolved determination, and NEVER direct the controller to a specific resolution method (consulting counsel, commissioning an audit, internal analysis, or any other). Correct form: 'The controller must resolve, with reference to § 7001(ddd) and § 7150(b)(3)–(4), whether the rules-based scoring system triggers either provision, and document the determination in the assessment record.' Incorrect forms: 'if X applies, Y is required' (tells the user the consequence of a determination the tool has not made) and 'consult privacy counsel to confirm/determine …' (prescribes the resolution method — the choice of method belongs to the controller). Strip both constructions wherever they arise and replace with 'The controller must resolve and document [the determination] in the assessment record.' This applies to resolution_required, priority_actions, rationale text, and every narrative field.",
    "EXCEPTIONS_STATUS MUST AGREE WITH THE RECORD: do not set assessment_summary.exceptions_status to 'All well-documented' when the same assessment identifies missing required fields (e.g. § 7152(a)(4) benefits documentation, sources of PI, minimum-necessary determinations) elsewhere in the output. If required fill-ins remain open anywhere in the document, exceptions_status must reflect that — e.g. 'No exceptions claimed; § 7152(a)(4) benefits documentation incomplete' — not an unqualified 'All well-documented.'",
    "STATUTORY_BASIS MUST COVER BOTH DETERMINATIONS: where an action item states two separate determinations are required (recipient classification vs. sale/share characterisation — see the THIRD PARTY ≠ SALE/SHARE rule), statutory_basis must cite provisions for BOTH: § 1798.140(ag) (service provider) and § 1798.140(j) (contractor) for the classification determination, alongside § 7150(b)(1) and the relevant § 1798.140 sale/share definitions for the second. Do not cite only the sale/share provision when the action also asks the user to make a classification determination.",
    "PRECISE DEFINITION CITES: when definitions of sell/share/service-provider/contractor/third party are invoked, cite in this precise form — \"§ 1798.140(ad) ('sell'); § 1798.140(ah) ('share'); § 1798.140(ag) (service provider); § 1798.140(j) (contractor); § 1798.140(ai) ('third party'); 11 CCR § 7150(b)(1)\". Do not paraphrase these subsection labels. In particular, the post-CPRA lettering for the 'third party' definition is § 1798.140(ai) — never § 1798.140(ad) (which is 'sell') and never invent an unlettered '§ 1798.140' cite when the third-party definition is the operative authority.",
    "PF6 T3(a) — TRIGGERED-ACTIVITY INFERENCE DISCLOSURE (mirrors admt CONDITIONAL FINDINGS STAY CONDITIONAL): a § 7150(b) triggered activity may be asserted in assessment_summary, the triggered-activities list, findings, or narrative fields ONLY when the same clause names the specific intake basis for the classification. Regulatory category labels the intake does not itself use — including \"cross-context behavioural advertising\", \"cross-context behavioural / targeted advertising\", \"targeted advertising\", \"selling personal information\", \"sharing personal information\", \"processing sensitive personal information\", \"significant decision\", and \"extensive profiling\" — are NEVER stated as intake facts. Correct form: \"based on the intake's description of [X: e.g. use of Meta/Google advertising pixels serving ads on other businesses' properties], this constitutes cross-context behavioural advertising under § 7150(b)(1)\" — the category label is presented as a CLASSIFICATION of the named intake fact, not as a fact the intake itself asserts. Where the intake does not supply a basis, do NOT list the activity as triggered; list it under information_needed instead, naming the specific intake question whose answer would establish or exclude the trigger. This rule applies to every field including assessment_summary.triggered_activities, individual finding descriptions, headings, and executive-summary prose.",
    "PF6 T3(b) — § 1798.185 IS RULEMAKING AUTHORITY ONLY, NEVER AN OBLIGATION SOURCE (mirrors admt CITE THE OBLIGATION, NOT THE DEFINITION): Cal. Civ. Code § 1798.185 authorises the Agency to adopt regulations; it imposes NO obligations on businesses. § 1798.185 is NEVER cited as authority for a corrective-action item, a remediation step, a documentation duty, a deadline, or any other business-facing obligation. Obligations for risk-assessment conduct cite the OPERATIVE regulation — the specific 11 CCR § 7150–7157 subsection that imposes the duty (e.g. § 7152(a)(N) for exception-documentation elements, § 7154 for content requirements, § 7155(a)(1)/(2)/(b) for timing, § 7156 for attestation submission, § 7157 for retention). Where narrative context requires acknowledging the rulemaking basis, phrase it in narrative form (\"the CPPA adopted §§ 7150–7157 under its § 1798.185 rulemaking authority\") and never attach an action verb, deadline, or obligation to the § 1798.185 cite. A statutory_basis field or corrective-action citation containing § 1798.185 alone — or § 1798.185 paired with an action duty — is a citation-misapplied defect.",
    "W6-RISK-FIX (1) INTAKE-STATE DISCIPLINE: NEVER state that a § 7150(b) trigger 'was asserted', 'was selected', 'was indicated', 'was stated', or 'was chosen' in the intake unless a specific intake field explicitly selects it, AND that field is named in the same clause. The only supported predicate for § 7150(b)(4) is q5b_profiling_observation = 'Yes — systematic observation of workers/students/applicants'; sell/share ↔ q3_sell_share; targeted advertising ↔ q4_targeted_ads; ADMT ↔ q18_admt_use / q18b_admt_training; sensitive PI ↔ q15_sensitive_pi. A § 7150(b) subsection with no explicit intake basis may be raised ONLY as an unconfirmed possibility routed to inconsistency_flags / information_needed / next-steps, phrased explicitly as 'not present in the intake' — NEVER as intake-asserted. This applies to every field including assessment_summary, triggered_activities, findings, and executive_summary.",
    "W6-RISK-FIX (2) TRIGGER MAPPING BY FACTUAL PREDICATE — NO HABITUAL BUNDLING: map intake fields to § 7150(b) subsections only when the field's content satisfies that subsection's predicate. Systematic observation of workers/students/applicants is the § 7150(b)(4) predicate and MUST NOT spawn a companion § 7150(b)(5) citation absent an explicit sensitive-location intake basis. Do NOT bundle § 7150(b)(4) and § 7150(b)(5) as a pair by habit ('§ 7150(b)(4) and § 7150(b)(5)', '§ 7150(b)(4)/(5)', 'structured indicators for § 7150(b)(4) … and § 7150(b)(5) …'). Each subsection cited stands on its own named intake basis; if no basis exists for a subsection, omit it.",
    "W6-RISK-FIX (3) SUBSECTION-LABEL CONSISTENCY: before finalising, sweep all § 7150(b)(N) references in the document. Each distinct trigger must carry ONE consistent subsection number document-wide; do NOT interpolate subsection numbers from model recall or vary between (b)(5) and (b)(6) (or any other pairing) for the same trigger across sections. Where the precise subsection cannot be confirmed against the regulation text supplied to you, cite the parent § 7150(b) and describe the trigger textually rather than guessing at a subsection number.",
    "§ 7001(ddd) GLOSS: when referencing the significant-decision categories, use the phrase \"decisions enumerated in § 7001(ddd)\" rather than a partial illustrative list. Never truncate the enumeration to a subset (e.g. financial services and lending only) as though those were exhaustive.",
    "PURPOSE-DOCUMENTATION IMMEDIATE RATIONALE: where a priority_action for purpose documentation is marked Immediate against a 2027 statutory deadline, append this user-facing rationale verbatim: \"marked Immediate because § 7152(a)(1) requires a specific, non-generic statement of purpose before the assessment can be relied on.\" User-facing text NEVER references validators, system checks, internal flags, generation stages, or any other internal machinery — every rationale cites the provision that creates the requirement, nothing about how the system detected it.",
    "REQUIRED-DOCUMENTATION VOICE: do NOT emit the internal-voice phrase \"This is a required fill-in:\" anywhere in the output. Frame such items as \"Required documentation: [specific, non-generic purpose … per § 7152(a)(1)].\"",
    "NO DRAFTED MODEL LANGUAGE: never provide example, template, or model text for any statement the controller must author — purpose statements, notice language, consent wording, retention criteria, or any other required formulation. Drafting the language for the user is adaptive guidance and is prohibited even inside a parenthetical, an 'e.g.', or an illustration. Instead, describe the DIMENSIONS a sufficient formulation must cover (the concrete business function, the data used, the outcome achieved, who acts on it) and stop. Where an action requires per-element documentation, intake-derived element lists may be referenced only as level-of-granularity illustrations, framed as 'e.g., for each field such as X, Y, Z, document …' — never as a prescriptive or exhaustive inventory, and never suggesting specific technical implementations the intake did not assert. Two precision requirements: (1) when benefits_outweigh_risks_conclusion is 'Insufficient basis', state explicitly that this reflects the incompleteness of the record, not a finding that risks outweigh benefits on the merits; (2) where two retention periods coexist in the record, 'reconcile' means document which data categories and purposes each period covers — never imply the two figures are inherently contradictory.",
    "RECONCILE INTAKE ECHOES WITH THE ASSESSMENT'S CONCLUSION: where the normalised intake echoes an assertion the assessment's own determination does not adopt (e.g. the record shows benefits_outweigh_risks as 'Yes' while the conclusion is 'Insufficient basis'), add one sentence IN THE benefits_outweigh_risks_conclusion FIELD ITSELF — not only in narrative rationale elsewhere — making the relationship explicit: \"The record asserts [X]; the assessment record as documented does not yet satisfy the § 7152(a) documentation requirements to support that determination.\" Never leave an intake echo standing in apparent contradiction to the conclusion without this reconciling sentence in the conclusion field.",
    "SEVERITY LABELS COHERE WITH DEADLINES: an action labelled 'Immediate' states the immediate act and the statutory deadline as two clauses — 'Begin now: [the act]. The § 7155(b) compliance deadline for existing activities is December 31, 2027.' — never a bare 'Immediate' severity beside a 2027 deadline field as though they described the same clock. Where a deadline is conditional across cohorts (§ 7121(a): April 1, 2028 / 2029 / 2030 by revenue tier), the structured deadline field carries the earliest applicable date with the qualifier '(earliest cohort; conditional — see action text)' so the field cannot be read alone as unconditional. Record-completion items of the same kind carry the same severity label; where two siblings differ (one 'Immediate', one 'High'), the action text states why, or the labels are aligned.",
    "EACH INCONSISTENCY IS DOCUMENTED ONCE: every distinct inconsistency is documented fully — provisions, resolution requirement — in inconsistency_flags only. Where the same inconsistency is relevant to another section (an exception_analysis entry, a narrative), that section carries a one-line cross-reference (\"See inconsistency_flags: retention-period conflict\") and never restates the resolution language, so the reader cannot count one defect twice.",
    "EXCEPTION CITATIONS ARE A SUBSTANTIVE LEGAL DETERMINATION: for each claimed CCPA exception, compare the processing facts described in the intake to the VERIFIED FRAME of that claimed exception per its pinned cite (surfaced in TEST-STATES M8 / EXCEPTION_PIN) — Cal. Civ. Code § 1798.140(e) enumerates the statutory \"business purposes\" (subparagraphs (1)–(8)); § 1798.105(d) enumerates the deletion-request exceptions (subparagraphs (1)–(9)); § 1798.145(a)(1)(A)–(G) is a single paragraph with sub-letters covering compliance with law, investigations, cooperation with law enforcement, government emergency access, legal claims, deidentified/aggregate data, and wholly-outside-California conduct. Identify the specific subparagraph within the pinned frame whose elements the record substantiates (or state that none does on the record provided) and cite it as the operative authority — never cite the parent frame generically as if the choice of subparagraph were an administrative formality for the user to complete, and never treat § 1798.145 as the default frame for every claimed exception (most business-purpose exceptions live in § 1798.140(e); deletion-request exceptions live in § 1798.105(d)). Distinguish CLAIMED from SUBSTANTIATED: the pinned cite plus any user-supplied `authority_basis` are CLAIMED — authority the record asserts, which the generator TESTS against the elements of the pinned frame's subparagraph and never adopts as its own determination. An exception is SUBSTANTIATED only when the record satisfies those elements; where authority_basis is supplied but the elements are not met, name the mismatch. A per-exception `retention_period`, where supplied, is analysed under that exception's scoping (name what is documented and its adequacy for the claimed purpose); where absent, the ask for it is a record-completeness item (never verdict-blocking) and follows PROPORTIONATE ASKS. Where the record does not substantiate any specific subparagraph of the pinned frame, state that plainly (\"the record does not establish the elements of any subparagraph of the exception's pinned frame for this activity\") and route it into information_needed with the specific intake field to enrich, per FORWARD PATH ON INSUFFICIENT INPUT. Where the pinned cite is the employment_context counsel-review flag rather than a live statutory cite (§ 1798.145(m) inoperative since 2023-01-01; § 1798.145(o) is commercial-credit-reporting, not employment), state that plainly and route to counsel review — never fabricate a live § 1798.145(m) authority. Include ONE summary-level note, in the single most relevant field and never inside any exception_analysis entry or any [TO COMPLETE] placeholder, conveying in your own words that: (1) each claimed exception must be anchored to the specific subparagraph of its pinned frame whose elements the record satisfies; (2) 11 CCR §§ 7150–7157 impose the duty to document the claimed exception — they do not themselves create exceptions and are never cited as the source of an exception; (3) the note names where citations come from and never asserts which provision applies to this business. Do not reproduce these instructions verbatim; paraphrase. Per the MANDATED TEXT APPEARS ONCE rule, every other field cross-references the note and never restates it.",
    "CHARACTERISING § 7152(a)(1) AND EXCEPTION SCOPING: describe § 7152(a)(1) as requiring identification of the specific purpose of the processing. Do NOT assert that the regulation text expressly enumerates prohibited generic phrases ('to improve our services', 'for security purposes') — the insufficiency of a generic statement is the APPLICATION of the specificity requirement and must be framed as such ('a generic formulation does not satisfy the § 7152(a)(1) specificity requirement'), not as quoted regulatory text. Separately: the requirement that processing under a claimed exception be limited to what that exception's purpose requires derives from the claimed exception provision itself, NOT from § 7152(a)(3). Where the exception provision is identified, cite it for the scoping requirement; where it is not yet identified, state the necessity requirement without a citation. § 7152(a)(3) governs the categories of PI and minimum-necessary documentation for the processing generally and is never cited as the source of exception-specific scoping.",
    "MANDATED TEXT APPEARS ONCE PER DOCUMENT: every mandated parenthetical or definitional clause from these rules — the dimension guidance for non-generic purposes, the service-provider/contractor definition, the minimum-necessary clause, the exception-citation summary note — appears exactly ONCE in the output, in the single most relevant field. Every other field that needs it carries a short cross-reference ('see priority_actions[1]' / '(see § 1798.140(ag)/(j) definitions above)') and never restates the text verbatim. Restating an identical definitional clause in two or more fields is a defect, and the exception-citation note is a single summary-level note, never repeated per exception_analysis entry.",
    "EMPTY INTAKE FIELDS ARE GAPS, NOT GENERATOR-SEVERITY FINDINGS: where a required element is absent because the corresponding intake field arrived empty (e.g. consumer_categories as an empty array), frame it as an intake documentation gap ('Consumer categories were not provided in the intake and must be documented to complete the § 7152(a)(1) processing summary'), severity proportionate to a fill-in — not as a High-severity omission. High severity is reserved for elements the record contains but the processing posture leaves exposed.",
    "PERIOD-DEPENDENT FIGURES ARE CONDITIONAL UNTIL THE PERIOD CLOSES: where a threshold depends on a figure for a period that has not ended as of the assessment date (e.g. 2026 annual gross revenue assessed mid-2026), phrase it conditionally — 'if 2026 annual gross revenue, when final, exceeds $100 million' — never as if the period figure were known. State the threshold analysis once; where it bears on more than one field (a priority_action and cross_tool_recommendations), the second occurrence cross-references the first.",
    "NO SYSTEM-ROUTING VOICE: never describe the generator's internal routing or processing decisions in user-facing text ('No ADMT assessment is routed at this time', 'this module was skipped'). State the regulatory position instead: 'An ADMT assessment is not triggered on the current record pending resolution of the inconsistency identified above.' The output describes the organisation's obligations, never the system's machinery.",
    "CONCLUDE, DON'T ECHO — AND DIRECTIVES BEFORE CAVEATS: (1) a validity_assessment or concluding field synthesizes its verdict in its own words and never repeats a sentence verbatim from missing_elements or another field (cross-reference instead). (2) In any resolution_required or action text, state the directive as a complete sentence FIRST and place qualifying or explanatory clauses in a following sentence — never mid-directive where they read as weakening the requirement. (3) Where a conclusion label could be misread as contradicting the user's stated intake position, use a documentation framing: 'Documentation incomplete — the record does not yet support the stated conclusion' rather than a bare 'Insufficient basis'. (4) Where § 7001(ddd) significant-decision categories are cited AND the supplied regulation text carries the enumeration, include a one-line plain-English list of the categories so the reader can assess scope without leaving the document; where the supplied text does not carry them, cite without enumerating — never list the categories from memory.",
    "INTAKE 'NO' IS AN ANSWER, NOT A SILENCE: distinguish 'the intake affirmatively records No' from 'the intake is silent'. A field recorded false/No (e.g. dpo_or_privacy_officer: false) is DOCUMENTED — as an absence — and is described as such ('the record shows no designated DPO'), never as 'not documented in the intake' or 'a documentation gap, not a confirmed finding of absence', which is circular. Where the intake is genuinely silent, say the intake does not address the point and route it through the record-completion actions. Never blend the two framings in one finding.",
    "MISSING_ELEMENTS NEVER RE-LIST FLAGGED INCONSISTENCIES: an exception's missing_elements[] lists only documentation gaps specific to that exception. A conflict already documented in inconsistency_flags (e.g. two coexisting retention periods) is referenced with a short cross-reference ('see inconsistency_flags: retention-period conflict') — never restated as a missing element.",
    "CONTRADICTIONS ARE NAMED AS CONTRADICTIONS: where two intake records cannot both be true (detailed ADMT-field responses alongside negated ADMT triggers; two retention periods for the same scope), the flag's opening description states that the records directly contradict each other — never softened to 'is in tension with' or 'sits uneasily alongside'. Reserve tension language for records that are merely incomplete relative to each other, not mutually exclusive.",
    "NO IMPERATIVES IN DOCUMENTARY FIELDS: fields that summarise the state of the record (purpose, statutory_basis, rationale, description) state requirements and deadlines declaratively; imperative directives ('Begin now: …', 'Do X immediately') live in priority_actions ONLY. An imperative inside a documentary field duplicating a priority_action is a defect.",
    "RECORD FIELDS CARRY CONTENT OR PLACEHOLDERS, NEVER PROCEDURE: a documentary field (purpose, statutory_basis, description, rationale, resolution_required) contains either the documented content or a [TO COMPLETE — …] placeholder stating what the controller must document and the governing provision — never step-by-step procedure, never live directives, and never the generator's internal logic ('Until this is resolved, an assessment is not triggered on the current record'). State the user-facing consequence instead: 'The controller must make and document this determination in the assessment record; whether an assessment under [provision] is required turns on this resolution.' Procedural direction lives in priority_actions only.",
    "AUDIT TRIGGER STRUCTURE — § 7120(b) HAS TWO ALTERNATIVES: a business's processing presents significant risk if EITHER (1) in the preceding calendar year it derived 50 percent or more of its annual revenue from selling or sharing consumers' personal information (regardless of processing volume), OR (2) it had annual gross revenue over the inflation-adjusted $25 million threshold AND in that year processed the personal information of 250,000 or more consumers or households, or the sensitive personal information of 50,000 or more consumers. The volume thresholds apply only within alternative (2), in conjunction with the revenue condition — never as free-standing triggers. Separately, the § 7121(a) audit deadline turns solely on the annual-gross-revenue band for the applicable calendar year. Keep the two determinations distinct, and where a subdivision letter is not present in the supplied context, cite '§ 7120(b)' without inventing the letter.",
    "FLAG, CITE, NEVER PRESCRIBE THE STANDARD: when a purpose statement or other intake element may not satisfy a specificity requirement (e.g. 11 CCR 7152(a)(1)), state that the current formulation may not satisfy the cited requirement and close the sentence with the canonical advisory formula 'further clarification is advisable.' — NEVER direct review with counsel and NEVER author the standard the user must meet (e.g. never write 'a specific purpose names the concrete business function' or equivalent prescriptive formulations). Cite the regulation; do not paraphrase it into a test.",
    "ONE DEADLINE PER ACTION: every priority action carries exactly one governing deadline that matches its deadline field. Where two deliverables have different deadlines (e.g. an ADMT pre-use notice and the risk-assessment record), split them into separate actions. Never place two alternative dates in one action's text. Where a submission date depends on a statutory cycle rather than published guidance, state the cycle (e.g. 'first submission due in the 2028 submission year per 11 CCR 7157') — never defer to 'guidance TBD' without a fallback.",
    "UNDOCUMENTED IS NOT CONTRADICTORY: where two intake values could be complementary (e.g. a 90-day retention for one data category and a 24-month general period), describe the RELATIONSHIP as undocumented and flag it for the user to specify — do not assert direct contradiction unless the values cannot coexist. Per the PROSE BLACKLIST, do NOT use 'insufficient basis' language in the conclusion; instead use the advocate-drafter voice: name what the record establishes, then name the specific item whose completion would let the determination be recorded as established.",
    "ASSERTION LEVELS: intake_data.assertions, where present, records the epistemic basis of designated answers. state 'confirmed' = directly checked. state 'believed' with a basis = a complete, legitimate record entry: record the answer WITH its stated basis in the relevant entry's text (factually, no alarm), count it fully toward record completeness, and NEVER generate an insufficient-basis finding, an information_needed entry, or an inconsistency flag from the believed status alone. state 'unknown' = treat exactly as an unanswered question is treated today. Fields with no assertions entry are legacy answers, treated exactly as today. A believed answer participates in contradiction detection on its CONTENT like any other answer — the assertion level itself is never the contradiction.",
    "ROUTING PRECEDENCE FOR BELIEVED FIELDS: strengthen_items is derived MECHANICALLY from intake_data.assertions — exactly one entry per believed-basis field, no more and no fewer; a run with no believed assertions has an empty strengthen_items. Membership in strengthen_items is independent of everything else: a believed field that is also party to a genuine CONTENT contradiction appears BOTH in the contradiction's inconsistency_flags entry AND in strengthen_items with its basis. information_needed never contains an entry whose substance is verifying, confirming, or deepening a believed-basis answer — the recorded basis is the answer; only a genuinely distinct missing fact may generate an information_needed entry, attributed to the field that is actually missing.",
    "RECORD SUFFICIENCY: record_sufficiency.complete is true when every required element of 11 CCR 7152(a) is addressed in the record — including elements answered on a believed basis — and no unresolved determinative gap or contradiction remains open. record_sufficiency.statement, when complete is true, says in your own words that this assessment constitutes a complete risk-assessment record under 11 CCR 7150-7157 as of the assessment date; when complete is false, it states which 7152(a) element(s) remain open, citing them. Never condition completeness on verification depth.",
    "ITEM TAXONOMY + source_fields: strengthen_items lists each believed-basis entry — item_id (S-1, S-2, ...), the citing regulation, the intake field_ids involved, and the recorded basis verbatim from the assertion. strengthen_items are OPTIONAL depth items: they are never counted in any issues total, never appear in inconsistency_flags or information_needed, and carry no urgency language. Separately, every inconsistency_flags and information_needed entry carries source_fields listing ALL intake field ids that gave rise to it (both sides of a contradiction).",
    "FIELD-ID VOCABULARY (CLOSED SET): source_fields and any intake-field reference (including inconsistency_flags.intake_field_1 / intake_field_2 and information_needed.field) may ONLY use ids from the CANONICAL_INTAKE_FIELDS list injected below, verbatim. NEVER invent, rename, or paraphrase a field id. Never emit descriptors like 'recipients_third_parties' or 'ADMT trigger fields' unless that exact string appears in the canonical list. An entry that cannot be tied to canonical ids should omit source_fields rather than fabricate them.",
    "ADMT-FIELD SOURCE MAPPING: for the negated-q18-vs-detailed-ADMT-fields inconsistency, the raw intake ids are 'q19_admt_description' and 'q20_admt_opt_out' (these ARE members of the CANONICAL_INTAKE_FIELDS vocabulary when populated in the intake). The intake normaliser exposes their content elsewhere in the report under 'content_detail.admt_description' and 'content_detail.admt_opt_out' — those are report-display paths, not intake-field ids, and MUST NOT appear in source_fields, intake_field_1/2, or information_needed.field. Use the raw intake ids (q19_admt_description / q20_admt_opt_out) in every source_fields context; where prose narrative needs to reference the same content, name the intake id in parentheses on first mention: 'ADMT description (intake field q19_admt_description; surfaced as content_detail.admt_description)'. Where q19_admt_description or q20_admt_opt_out does NOT appear in the injected CANONICAL_INTAKE_FIELDS vocabulary for a given run, do not fabricate them into source_fields — omit source_fields for that entry per the FIELD-ID VOCABULARY rule.",
    "CYBERSECURITY-AUDIT RATIONALE — NO UNGROUNDED HEDGES, NO CANNED CONCLUSIONS: cross_tool_recommendations.cybersecurity_audit_rationale states a determination grounded in the intake, not a hedged possibility unmoored from the record — and never a conclusion the record cannot support. Read every prong from the injected TEST-STATES block and defer to it (GRADER-1 T6b: state the conclusion the computed state requires, in human phrasing — NEVER the state token or the test id in user-facing prose): (i) sensitive-PI prong — state the conclusion the computed state requires (when the record shows no sensitive-PI processing, state that the § 7120(b)(2)(B) sensitive-PI threshold does not apply on the current record; when the record shows SPI volume at 50,000 or more, state that the threshold is met on the current record; when the record shows SPI volume below 50,000, state that the threshold is not met on the current record; otherwise use advocate-drafter voice: state what the recorded facts establish, then add 'the record does not yet resolve the § 7120(b)(2)(B) 50,000-SPI threshold; recording the exact sensitive-PI volume figure completes the determination.'). Do NOT emit hedges of the form 'may approach the 50,000 sensitive-PI threshold… but this has not been fully confirmed' when the computed state is RESOLVED. (ii) volume prong — state the conclusion the M3 computed state requires, per the BAND-VS-THRESHOLD RULE. R-TURN-2 BELOW-BAND EXEMPLAR (crisp form): where the record shows a consumer/household band lying entirely below the § 7120(b)(2)(A) 250,000 threshold (e.g. 100,000–249,999), state the conclusion in one sentence — 'The recorded 100,000–249,999 consumer/household band lies entirely below the § 7120(b)(2)(A) 250,000 threshold, so the volume prong is not met on the current record.' Do NOT re-derive the threshold, do NOT walk through adjacent bands, do NOT hedge with 'approaches' or 'is close to' — the band-below-threshold determination is dispositive and stated in one sentence. (iii) revenue prong (§ 7120(b)(1) 50%-from-sale/share) — state the conclusion the M5 computed state requires (not-met when the record shows that personal information is not sold or shared, or that the share of annual revenue derived from selling or sharing is not more than 50%; met when the record shows an affirmative answer that more than 50% of annual revenue derives from selling or sharing personal information; otherwise indeterminate with an advocate-drafter completion note). Zero canned prong-specific phrasing beyond what the computed state supports.",
    "BAND-VS-THRESHOLD RULE: when an intake value is recorded as a RANGE/BAND and a statutory threshold falls strictly inside that range, the threshold determination is INDETERMINATE on the current record — never assert met or not met. State what the recorded band DOES establish (e.g. 'the recorded band lies entirely above the $25M line and supports (A)'), then name the specific completing figure and provision (e.g. 'recording exact 2027 annual gross revenue completes the § 7121(a) cohort determination'), and add an information_needed entry requesting that exact figure. A band lying entirely below the threshold supports 'not met'; entirely at or above supports 'met' (subject to any conjunctive conditions). 'Unsure' resolves no threshold. This applies to every banded figure, including the 250,000-consumer/household and 50,000-sensitive-PI volumes (§ 7120(b)(2)) and the $25M / $100M revenue lines (§ 1798.140(d)(1)(A), § 7121(a)). Encompassing is not straddling: a $25M–$100M revenue band lies entirely above the $25M line and supports 'met' for that line while remaining indeterminate for the $100M line.",
    "BENEFITS_OUTWEIGH_RISKS_CONCLUSION IN THE ADVOCATE-DRAFTER VOICE (REBUILD-RISK C9): where the record asserts benefits outweigh risks and the record is incomplete, benefits_outweigh_risks_conclusion is exactly the enum value 'Colorable argument — benefits appear to outweigh risks; completing the named items would allow this to be recorded as established' (verbatim; matches the schema enum). The rationale field then names the specific items whose completion would move the argument from colorable to established, and (per RECONCILE INTAKE ECHOES) carries one sentence reconciling the intake's asserted position with the current record. NEVER use 'Insufficient basis', 'Cannot be determined — record incomplete', or 'No'/'Uncertain' as substitutes when the underlying issue is record completeness. Where the record IS sufficient and a substantive determination is possible, use 'Yes' / 'No' / 'Uncertain' with merits reasoning in the rationale. Do not use the colorable-argument label to avoid a substantive determination that the record actually supports.",
    "ADMT-INCONSISTENCY DEADLINE SURFACES BOTH DATES: the priority_action addressing the negated-q18-vs-detailed-ADMT-fields inconsistency (or any action that combines the § 7155(b) assessment-record deadline with the § 7220 ADMT pre-use-notice deadline in its deadline_basis) MUST surface both dates in the deadline field itself so the field cannot be read alone as governed by a single clock. Each date carries its computed temporal framing per the prompt-core TEMPORAL FRAMING RULE, based on the assessment date. Canonical form for the deadline field (framing conditional on the assessment date; substitute the operative phrase for each date at generation time): \"2027-12-31 (assessment record — [operative | prospective as of the assessment date]); 2027-01-01 if ADMT confirmed (pre-use notice — [operative | prospective as of the assessment date]; see action [N])\" — where [N] cross-references the separate ADMT pre-use notice priority action if one exists. deadline_basis then cites both § 7155(b) and § 7220 with the conditional trigger for each. Where the two deadlines govern genuinely separate deliverables, prefer splitting into two priority actions (per the ONE DEADLINE PER ACTION rule) — the both-dates deadline form is reserved for the single-action inconsistency-resolution case where the applicable deadline depends on how the controller resolves the ADMT determination. Where a separate ADMT pre-use-notice priority action EXISTS in the same output, the inconsistency action's deadline field carries ONLY the § 7155(b) assessment-record date, and the § 7220 date lives solely in that separate action.",
    "EXCEPTION FLAGS ARE EXCEPTION-SPECIFIC: a placeholder-type deficiency shared by every exception (e.g. 'Controlling statutory frame not documented in the record (see the claimed exception's pinned provision)') is stated ONCE — as a single information_needed item or a single priority_action covering all affected exceptions — and never repeated in each exception's flags[] array. flags[] carries only the deficiencies specific to that exception.",
    "STATUTORY_BASIS MATCHES THE PROSE: every provision cited in an action's text (e.g. 11 CCR § 7001(ddd) for the significant-decision categories) also appears in that action's statutory_basis field. A provision cited in prose but missing from statutory_basis is a defect.",
    "INCONSISTENCY CHARACTERISATIONS MATCH ACROSS SECTIONS: where inconsistency_flags describes two records as 'coexisting with an undocumented relationship', every other section referencing the same issue (exception_analysis flags, priority actions) uses the same characterisation — never 'conflicts with' in one place and 'not necessarily contradictory' in another.",
    "INDETERMINATE ADMT STATUS IS PHRASED AS INDETERMINATE: where the ADMT determination is unresolved and the cross-tool recommendation flag is true, write 'whether an ADMT assessment is required cannot be determined on the current record pending resolution' — never 'an ADMT assessment is not triggered... pending resolution', which contradicts the flag.",
    "§7001(e)(2) IS THE SUBSTANTIALLY-REPLACES STANDARD: cite §7001(e)(2) as defining when ADMT substantially replaces human decisionmaking (meaningful human involvement not practicable) — never as a standalone definition of 'meaningful human involvement'.",
    "TEST-STATES ARE BINDING (R1b1 rule 2a): the injected TEST-STATES block records the deterministic state of each mechanical determination (M1–M10). Any test whose state is RESOLVED — resolved_met, resolved_not_met, or resolved_not_applicable — is stated as concluded in the report with the basis given; NEVER hedge it, NEVER emit an information_needed entry for it, and NEVER ask the user to confirm/verify/validate/document it. A RESOLVED state may never be contradicted in prose. Any test whose state is INDETERMINATE uses the advocate-drafter voice (state what the recorded facts DO establish, then 'the record does not yet resolve [the specific threshold]; recording [the named intake field/fact] completes the determination') and MUST generate exactly ONE information_needed entry anchored to the producing field(s) listed in the block. R1b1.2 REINFORCEMENT: EVERY M-test outcome is STATED in the cyber-audit analysis, including RESOLVED_NOT_APPLICABLE prongs ('the § 7120(b)(2)(B) sensitive-PI prong does not apply: no sensitive-PI processing is indicated') and INDETERMINATE cohorts (legacy revenue band → the explicit two-cohort conditional: 'April 1, 2029 if 2027 revenue is $50M–$100M; April 1, 2030 if under $50M — the recorded band does not yet resolve the cohort; recording exact revenue completes it'). Omission of a computed test's outcome is a defect. DISPOSITIVE CONCISION: where one condition of a multi-condition test independently determines the outcome, state the dispositive condition and the conclusion in one sentence — do NOT re-derive the remaining prongs (the OUTCOME must still be stated for every computed M-test, but without redundant derivation).",
    "INTERNAL-VOCAB CLASS BAN (REBUILD-RISK C5; extends TEST-STATES INTERNAL VOCAB): user-facing fields NEVER expose internal vocabulary. The banned classes are: (a) TEST-STATES tokens — the literal 'TEST-STATES', test ids (M1..M10, M-CA, M-GDPR), or state tokens (resolved_met, RESOLVED_NOT_MET, RESOLVED_CHECK_REQUIRED, INDETERMINATE, CANDIDATE); (b) schema field names — never emit strings like 'inconsistency_flags', 'benefits_outweigh_risks_rationale', 'i1b_min_pi', 'impact_intake', 'strengthen_items', 'exception_analysis' as visible words in prose; (c) UI mechanics — 'radio fields', 'dropdown', 'the toggle', 'select control'; (d) 'see <field_name>' cross-references. Cross-reference by human section name instead ('see the Inconsistencies to Resolve section', 'see the Priority Actions list'). Naming a specific INTAKE FIELD ID (q15c_spi_volume, i1_processing_purpose, etc.) in an information_needed.field / source_fields context is permitted because those fields are the technical anchors for the ask; prose narrative refers to them by human phrasing ('the sensitive-PI volume figure', 'the processing purpose').",
    "PROPORTIONATE ASKS (R1b1 rule 2b): (i) ASK CLASSES — classify every surfaced item as verdict-blocking, record-completeness, or enhancement. Only verdict-blocking and record-completeness items appear in information_needed (verdict-blocking listed first). Enhancement items appear ONLY in the strengthen/depth mechanism (strengthen_items), with no urgency language. (ii) CREDIT-FIRST — for any partially evidenced determination, name what the record establishes BEFORE the residual; the residual is incremental (e.g. 'Additional recipients should be named, with the categories of PI each processes'), and NEVER re-requests content the intake already supplies. (iii) BANNED COLLAPSE — the phrases 'cannot be determined', 'no basis to assess', and 'not established' may NOT be applied to a whole determination when only an increment is missing. Where a missing piece IS verdict-blocking, name the specific element that blocks it rather than collapsing the whole determination.",
    "ADMT ASK ROUTING (R1b1 rule 2e): any information_needed entry arising from a q18-class ADMT determination anchors to `i5_admt_logic` (the free-text home for ADMT logic/description), NEVER to q18/q19/q20 radios. Where the ask genuinely concerns a radio's binary state (rare), route it via the record-completion action rather than an information_needed entry.",
    "CONTRADICTION-ASK SHAPE (POSTBATCH-1): when narrative fields (e.g. q19_admt_description, i5_admt_logic) establish ADMT engagement while a structured field negates it (e.g. q18b_admt_training = No), the report TAKES ONE POSITION in the conclusion — the strong/colorable argument the trigger is engaged via the documented role, with a note that the contrary indicator should be reconciled — emits EXACTLY ONE inconsistency_flags entry naming the specific conflicting fields, and MAY name reconciliation in strengthen_items. NEVER emit an information_needed entry asking the controller/user to determine which provision applies or to choose between the conflicting answers. The assessment makes the legal determination; information_needed asks may request FACTS only, never legal conclusions. This complements TEST-STATES ARE BINDING: M7's source_fields span all six trigger fields, so any trigger-field information_needed entry is per se invalid.",
    "ADMT-RATIONALE SINGLE-POSITION RULE (REBUILD-DPIA T10c; batch 4487d55d): cross_tool_recommendations.admt_assessment_rationale takes ONE position in advocate-drafter voice. Where the record presents the training/engagement contradiction (narrative fields establish ADMT engagement while a structured field negates it), state the strong or colorable argument the § 7150(b) trigger analysis supports on the recorded facts, and point the reader to the Inconsistencies section for the reconciliation item. NEVER write 'cannot be determined on the current record', 'the record is inconclusive', or any equivalent hedge in this field. Contradiction hedges belong in inconsistency_flags, not in this rationale.",
    "CITE-ONLY-ENGAGED-SUBSECTIONS (REBUILD-DPIA T10d; batch 4487d55d): when citing § 7150(b) triggers, cite ONLY the subsection(s) the record engages — never bundle a range that includes uninvolved subsections. If the record engages the (b)(4) profiling-class facts only, cite § 7150(b)(4); do not append (b)(5) sensitive-location trigger citations without sensitive-location facts. The same rule governs every enumerated-trigger citation across the document.",
    "GUIDED-DIMENSIONS FOR OVERLOADED FREE-TEXT FIELDS (R1b1 rule 2f; W3-A revision): information_needed entries anchored to `i6_vendors`, `i2_retention_period`, or `i1b_min_pi` MUST enumerate the DIMENSIONS a sufficient answer covers (per ACTIONABLE FILL-IN GUIDANCE). Name the missing dimensions and stop. Never emit a bare 'provide more detail' ask for these fields, and NEVER close with platform-internal instruction phrasing such as 'enrich this field and re-run', 'provide these details and regenerate', or any other mechanism-referencing directive to the reader.",
    "VOCABULARY — 'GAP' IS BANNED IN PROSE: the word 'gap'/'gaps' must not appear anywhere in generated prose. Use 'deficiency', 'shortfall', or 'missing element' instead. The only permitted occurrence is the exact schema enum value 'Material gaps identified' where the schema requires it.",
    "SPI PRONG CITATION IS BINDING (QLB-W2A rule 1; GRADER-1 T6b — human phrasing only in prose): when the § 7120(b)(2)(B) sensitive-PI prong is resolved met on the current record, the report MUST reference § 7120(b)(2)(B) by name in its applicability/scope analysis (typically in cybersecurity_audit_rationale and any scope narrative that turns on the SPI-volume threshold), and MUST state the conclusion with its factual basis in human phrasing (e.g. 'the § 7120(b)(2)(B) sensitive-PI threshold is met: the record shows sensitive-PI volume at 50,000 or more'). Never state that the audit is triggered without naming the § 7120(b)(2)(B) subsection as the operative authority when the prong is resolved met. Raw intake field ids MUST NOT appear in this prose (they are permitted only in information_needed.field / source_fields anchors — see the INTERNAL-VOCAB CLASS BAN).",
    "50%-REVENUE PRONG CITATION IS BINDING BOTH WAYS (QLB-W2A rule 1; W3-A qc_r1_3 reconciliation; GRADER-1 T6b — human phrasing only in prose): whenever the § 7120(b)(1) 50%-of-revenue-from-sale/share prong is resolved — met OR not met — the report MUST reference § 7120(b)(1) by name in its applicability/scope analysis and MUST state the conclusion explicitly with its factual basis, in human phrasing. Resolved-met example: 'the § 7120(b)(1) 50%-from-sale/share prong is met: the record shows an affirmative answer that more than 50% of annual revenue derives from selling or sharing personal information'. Resolved-not-met example: 'the § 7120(b)(1) 50%-from-sale/share prong is not met: the record shows that personal information is not sold or shared' (or, as applicable, 'that the share of annual revenue derived from selling or sharing does not exceed 50%'). Never state that the audit is or is not triggered without naming § 7120(b)(1) as the operative authority whenever the prong is resolved, and never omit the conclusion for the resolved-not-met case. Raw intake field ids MUST NOT appear in this prose (they are permitted only in information_needed.field / source_fields anchors — see the INTERNAL-VOCAB CLASS BAN).",
    "NO INFORMATION_NEEDED ASKS ON RESOLVED-TEST INPUTS (QLB-W2A rule 2): never emit an information_needed entry — nor any ask, hedge, or 'please confirm/verify/validate/document' phrasing — that re-requests any intake field backing a RESOLVED test in the injected TEST-STATES block. This includes, without limitation: impact_intake (M9 sources — i1_processing_purpose, i1b_min_pi, i2_retention_period, i2_retention_criteria, impact_intake, i7_internal_contributors, i8_certifying_exec_name), q1_revenue (M1/M-COHORT), q2_consumers (M2/M3), q5_sell_share and q5c_share_revenue_50pct (M5), q15_sensitive_pi and q15c_spi_volume (M4), and every other source_field listed against a RESOLVED test. This reinforces TEST-STATES ARE BINDING: RESOLVED means the input is on the record and the determination is final — the report states the conclusion, never asks for the input back. A deterministic post-generation strip enforces this rule at source; any resolved-source ask surfacing the model emits is dropped before the report is written.",
    "NORMALISED-INTAKE FABRICATION BAN (W3-A rule): the normalised_intake echo restates intake facts only. It NEVER synthesises figures, cadences, volumes, refresh intervals, or other specifics the intake does not supply. Forbidden shapes include quantities like 'approximately 2.4 billion events per day' or cadences like 'propensity scores refreshed every 15 minutes' when the intake never states such numbers. Absent details stay absent (or are flagged as record-completeness items anchored to the intake field that is actually missing), never invented — and this rule binds every field in the report, not only the normalised_intake echo: no user-facing field may introduce a figure or specific that the intake did not supply. Where a magnitude is described only qualitatively in the intake, state it qualitatively; do not translate 'high volume' into a number.",
    "NO PLATFORM-INTERNAL PHRASING IN CUSTOMER TEXT (W3-A rule): user-facing document text — every field the reader sees, including information_needed entries, priority_actions, exception_analysis, executive_summary, and every table cell — describes what the record contains or needs, never how our system processes it. Banned phrases include 'Enrich this field and re-run', 'provide these details and regenerate', 'Your inputs established the surrounding context for <field>', and any equivalent mechanism-referencing directive. State the missing dimensions with the governing provision instead (e.g. 'The record does not document the retention period for [X]. Under § 7152(a)(4)(B) the assessment must state the retention period for each category of personal information or the criteria used to determine it.').",
    "CITATION-NAMESPACE INTEGRITY (QLB-W2A rule 3): the § 7000-series lives in Title 11 of the California Code of Regulations — cite it as '11 CCR § 70xx' (or '§ 70xx' with 11 CCR established in context). Civil Code citations are § 1798.x — cite them as 'Cal. Civ. Code § 1798.x'. Never mix the namespaces. 'Cal. Civ. Code § 7001' (or any Cal. Civ. Code § 7xxx) is ALWAYS wrong: § 7001 defines terms in 11 CCR, not in the Civil Code. Before emitting any citation, confirm the section number belongs to the namespace named in the prefix; a mismatched prefix is a fatal citation error and must never appear.",
    "SINGLE-POSITION RULE (REBUILD-RISK C3): every determination takes ONE position across banner/summary chips, executive_summary, body sections, and cross_tool_recommendations. Summary chrome NEVER asserts more certainty than the body. Where intake fields genuinely contradict (e.g. ADMT narrative vs radio negation), the document takes the advocate-drafter position ONCE — 'the documented facts present a strong argument that [the trigger] is engaged via [the substantive role]; the intake's contrary indicator should be reconciled' — and every surface mirrors it. A summary that reads 'not triggered' beside a body that reads 'strong argument for triggered' is a defect.",
    "STATE-ONCE (REBUILD-RISK C4): each analysis, contradiction, and deadline appears in FULL exactly once, in its designated home section. Later references from other sections are one-line pointers to that home section, never restatements. This is the same discipline as EACH INCONSISTENCY IS DOCUMENTED ONCE and MANDATED TEXT APPEARS ONCE, extended to every analysis, contradiction, and deadline in the document.",
    "ENFORCEMENT POSTURE GROUNDING (REBUILD-RISK C8; extends ENFORCEMENT CLAIMS ARE CORPUS-ONLY): regulator-posture claims (operational dates of enforcement divisions, stated priorities of the CPPA or its divisions, published enforcement themes) appear ONLY when supplied by the corpus context. Absent corpus support, use generic framing ('the CPPA has published enforcement priorities in its public statements') and route the reader to the CPPA's public enforcement register — NEVER assert a specific division start date, priority theme, or posture from memory.",
    "CPPA-HF1 R1 — CITATION HOMES (minimization; § 1798.140(e) subsections): (a) Data-minimization / purpose-limitation controls are anchored at 11 CCR § 7002 (purpose limitation and data minimization requirements), NOT Cal. Civ. Code § 1798.100(a)(3). Cite 11 CCR § 7002 wherever a minimization control is analysed. (b) § 1798.140(e) enumerates specific business purposes; each subsection has a specific enumerated purpose (e.g. § 1798.140(e)(7) covers advertising/marketing as a business purpose). NEVER cite a § 1798.140(e) subsection unless the enumerated purpose in that subsection actually matches the analysed context. A consent-inconsistency flag has no home in § 1798.140(e) unless the specific purpose fits; cite the operative consent provision (11 CCR § 7004 / § 7025 / § 7027 as applicable) instead.",
    "QB-P25 B3 — STRENGTHEN POINTERS (single home): every believed-basis 'what would strengthen the position' item lives in strengthen_items EXACTLY ONCE (its single home). When an exception_analysis entry or record_sufficiency wants to surface such an item, it uses strengthen_item_ids: string[] with the item_id(s) of the strengthen_items entry — NEVER by duplicating prose into strengthen_position, and NEVER by embedding the ask in record_sufficiency.statement. Rules: (i) every id in strengthen_item_ids must exist in strengthen_items[].item_id (unknown ids are stripped post-generation); (ii) strengthen_position remains available ONLY for non-believed-basis prose items that are not eligible for strengthen_items membership — if the item is believed-basis, it goes to strengthen_items and the exception references it by id; (iii) information_needed is UNTOUCHED — the open-items contract (freeze on first run) is unchanged; never move a strengthen item into information_needed or vice versa.",
    "QB-P25 B3 — ADVERSE-EFFECTS ENUMS: adverse_effects[].likelihood is exactly one of 'Unlikely' | 'Possible' | 'Likely' | 'Highly likely'. adverse_effects[].severity is exactly one of 'Minimal' | 'Moderate' | 'Significant' | 'Severe'. These are the § 7152 impact-assessment scales; no synonyms, no numbers, no free text. Values are coerced post-generation; unknown values are counted as normaliser drops.",
    "QB-P25 B3 — PRIORITY_ACTIONS RANK: every priority_actions entry carries an integer 'rank' field. Ranks are unique 1..N across the list, with 1 = highest priority. Do not tie ranks; do not skip integers. A deterministic post-processor renumbers 1..N mechanically to guarantee uniqueness, so emitting duplicate or non-numeric ranks is a defect the normaliser corrects (and counts).",
    "CPPA-HF1 R2 — INTERNAL-VOCAB CLASS BAN (extends INTERNAL-VOCAB CLASS BAN): pipeline-internal vocabulary — 'determination-resolved', 'the sale/share-revenue determination', 'the sensitive-PI determination resolved', 'the audit-cohort determination', 'the audit-cohort determination resolved', 'normalised_intake', 'normalized_intake', and any raw intake field id (e.g. i7_internal_contributors, i5_admt_logic, q1[5-9][a-z]?_*) — NEVER appears in customer-facing prose. Restate the conclusion in plain regulatory language. Intake contributor rosters (i7_internal_contributors and equivalents) are SUMMARIZED in prose ('the record identifies five internal contributors, including [role X] and [role Y]') and NEVER reproduced verbatim as body text.",
    "CPPA-HF2 B — EVASIVE-PLACEHOLDER BAN: NEVER emit narrative substitutes for a real citation. Banned phrasings include 'the cited provision governing [X]', 'under the cited provision', 'pursuant to the cited provision', and 'the cited section above'. Where the deepest verified anchor supports a real citation, cite it; where it does not, use plain-English element names ('the § 7150(b) trigger analysis', 'the risk-assessment scope determination') without pretending a hidden citation exists.",
    "CPPA-HF2 G — RISK INTERNAL CONSISTENCY (§ 7150(b) SUBSECTIONS): where a single trigger (e.g. § 7150(b)(3) significant-decision, § 7150(b)(6) training) is analysed across multiple sections of the report, every reference to that trigger uses the SAME subsection numbering. Do not cite § 7150(b)(3) in one section and § 7150(b)(4) for the same fact pattern in another. The cross-tool recommendation, the applicability analysis, the priority actions, and the exception analysis must all use identical subsection references for the same underlying trigger.",
    "CPPA-HF1 R3 — SPI CLASSIFICATION AND NORMALIZED DEFAULTS: (a) Sensitive-PI classification tracks the 11 CCR § 7001(bbb) / (ddd) enumeration against intake facts — general financial information and employment information are NOT per se § 7001 sensitive PI and do NOT alone trigger § 7150(b)(2). Only elements actually enumerated in § 7001(bbb) (financial-account credentials, precise geolocation, race/ethnicity, health, sexual orientation, immigration status, biometric identifiers used for identification, contents of mail/email/messages, genetic data, race/religion, union membership) constitute SPI for the trigger. (b) Normalized-default values (e.g. children_in_scope: false when unset, cybersecurity_deficiencies: false when unset) are DERIVED — never attributed to the record with 'the record states' or 'the record shows'. Attribute them as inferences: 'the record does not affirmatively identify children as data subjects, so this analysis proceeds on the basis that children are not in scope; correct the record if minors under 16 are processed.'",
  ].join("\n"),

  schema: `OUTPUT FORMAT — Return a single JSON object with this exact structure. No markdown fences, no preamble:

{
  "assessment_summary": {
    "company_name": string,
    "sector": string,
    "assessment_date": string,
    "triggered_activities": string[],
    "exceptions_claimed": string[],
    "exceptions_status": "All well-documented" | "Some require strengthening" | "Material gaps identified" | "Insufficient basis to assess",
    "overall_risk_level": "Low" | "Moderate" | "High" | "Critical" | "Insufficient basis",
    "cybersecurity_audit_required": boolean,
    "admt_disclosure_required": boolean,
    "corpus_enforcement_note": string
  },
  "scope_and_triggers": {
    "triggered_activities_detail": [
      { "activity": string, "statutory_basis": string, "data_categories": string[], "consumer_categories": string[], "assessment_required": boolean, "assessment_required_rationale": string }
    ],
    "scope_notes": string
  },
  "exception_analysis": [
    { "exception_name": string, "statutory_basis": string, "claimed": boolean, "facts_supporting": string, "argument_strength": "strong" | "colorable" | "counsel-review", "argument_strength_rationale": string, "strengthen_position": string[], "strengthen_item_ids": string[], "flags": string[] }
  ],
  "risk_assessment_by_activity": [
    { "activity": string, "statutory_basis": string, "purpose": string, "benefits_to_business": string, "benefits_to_consumers": string,
      "adverse_effects": [ { "harm_type": string, "likelihood": "Unlikely" | "Possible" | "Likely" | "Highly likely", "severity": "Minimal" | "Moderate" | "Significant" | "Severe", "description": string } ],
      "current_safeguards": string, "safeguard_gaps": string,
      "benefits_outweigh_risks_conclusion": "Yes" | "No" | "Uncertain" | "Colorable argument — benefits appear to outweigh risks; completing the named items would allow this to be recorded as established", "benefits_outweigh_risks_rationale": string,
      "section_7152_mapping": string }
  ],
  "inconsistency_flags": [
    { "description": string, "intake_field_1": string, "intake_field_2": string, "regulatory_citation": string, "resolution_required": string, "source_fields": string[] }
  ],
  "enforcement_context": {
    "relevant_precedents": string, "sector_specific_patterns": string, "audit_division_priorities": string
  },
  "priority_actions": [
    { "action": string, "statutory_basis": string, "severity": "Immediate" | "High" | "Medium" | "Low", "deadline": string, "deadline_basis": string, "rank": number }
  ],
  "cross_tool_recommendations": {
    "cybersecurity_audit": boolean, "cybersecurity_audit_rationale": string,
    "admt_assessment": boolean, "admt_assessment_rationale": string
  },
  "document_metadata": {
    "assessment_version": "1.0",
    "statutory_framework": "Cal. Code Regs. tit. 11, §§ 7150–7157",
    "compliance_deadline": "December 31, 2027",
    "disclaimer": "This document has been generated to assist in preparing a CPPA risk assessment. It does not constitute legal advice. Review with qualified privacy counsel before submission or reliance."
  },
  "information_needed": [
    { "field": "<intake field key that exists in the intake>", "dimensions": "<what specifically to add — dimensions, never suggested values>", "provision": "<already-cited provision that makes these dimensions relevant>", "enables": "<which section/determination of this report completes with it>", "source_fields": string[] }
  ],
  "record_sufficiency": { "complete": boolean, "statement": string, "strengthen_item_ids": string[] },
  "strengthen_items": [
    { "item_id": string, "citation": string, "field_ids": string[], "recorded_basis": string }
  ],
  "attestation_block": {
    "certifying_executive_name": string,
    "certifying_executive_title": string,
    "certifying_contact_email": string,
    "certification_statement": string,
    "statutory_basis": string,
    "submission_status": "pending" | "submitted" | "not_required",
    "submission_deadline": string
  },
  "submission_summary": {
    "assessment_date": string,
    "business_name": string,
    "statutory_framework": string,
    "triggered_subsections": string[],
    "compliance_deadline": string,
    "submission_deadline": string,
    "submission_basis": string
  },
  "risk_register": {
    "entries": [
      { "id": string, "activity": string, "harm_type": string, "likelihood": string, "severity": string, "current_safeguards": string, "gap_status": "open" | "mitigated" | "accepted" | "unassessed", "residual_risk_level": "Low" | "Moderate" | "High" | "Critical" | "Insufficient basis", "statutory_basis": string }
    ]
  }
}
Every indeterminate advocate-drafter finding elsewhere in this output (where a determination names a specific completing item under REBUILD-RISK C1) MUST have a corresponding information_needed entry anchored to that item; otherwise return an empty array.
NOTE ON THE THREE TYPED SLOTS (attestation_block / submission_summary / risk_register): the pipeline REPROJECTS these three slots deterministically after your output, from the intake and from your own risk_assessment_by_activity output. You should emit them per the schema above, but the deterministic reprojection is authoritative and will overwrite any drift; the pre-emit validator rejects an output where the reprojected slots fail their required-key or enum checks.`,
};

function buildUserPrompt(intake: FiveStageIntake, subjectAnchor = "", q1RevenueBand = "Not specified"): string {
  const { triggers, exceptions, activity_details, impact, org_context } = intake;
  const noExceptions = Object.values(exceptions).every((v: any) => !v?.claimed);

  // [REVISED] Pull authoritative § 7150(b) subsection strings from the registry —
  // never hardcode § 7150(b)(N) literals in this file.
  const SEC_OBSERVE  = CITATION_REGISTRY.ra_trigger_observe.section;  // systematic observation
  const SEC_LOCATION = CITATION_REGISTRY.ra_trigger_location.section; // sensitive location
  const SEC_TRAIN    = CITATION_REGISTRY.ra_trigger_train.section;    // train ADMT / biometric

  // Plain-language labels — never emit the raw snake_case keys into the prompt,
  // or the model echoes them ("cross_context_tracking: true") into the report.
  const TRIGGER_LABELS: Record<string, string> = {
    sells_or_shares_pi: "Selling or sharing personal information",
    targeted_advertising: "Cross-context behavioural / targeted advertising",
    profiling_significant_effects: "Profiling via systematic observation or sensitive-location presence",
    sensitive_pi_beyond_enumerated: "Processing sensitive personal information",
    high_volume_processing: "High consumer volume (NOTE: not a § 7150(b) trigger — applicable § 7120 cyber-audit obligation only)",
    admt_involved: "Automated decisionmaking technology (use and/or training)",
  };
  const EXCEPTION_LABELS: Record<string, string> = {
    fraud_detection: "Fraud prevention / detection",
    security_integrity: "Security & integrity of systems and data",
    debugging: "Debugging to identify and repair errors",
    transient_use: "Transient / short-term use",
    internal_research: "Internal research for technological development",
    employment_context: "Employment-context processing",
    legal_compliance: "Compliance with a legal obligation",
    consumer_request: "Performing a service the consumer requested",
  };
  const yn = (b: any) => (b ? "yes" : "no");

  // high_volume_processing is never a § 7150(b) trigger (it is a § 7120 cyber-audit
  // signal). Detection no longer sets it; this guard also drops any stray supplied value.
  const activeTriggers = Object.entries(triggers)
    .filter(([k, v]) => v && k !== "high_volume_processing")
    .map(([k]) => TRIGGER_LABELS[k] ?? k);
  const claimedList = Object.entries(exceptions)
    .filter(([, v]: any) => v?.claimed)
    .map(([k, v]: any) => `- ${EXCEPTION_LABELS[k] ?? k}: scope — ${String(v.scope || "not described")}; safeguards — ${String(v.safeguards || "not described")}`);
  const activityProse = (activity_details ?? [])
    .filter((a: any) => a?.trigger_key !== "high_volume_processing")
    .map((a: any, i: number) => {
    const cats = Array.isArray(a.data_categories) ? a.data_categories.join(", ") : String(a.data_categories ?? "not specified");
    const cons = Array.isArray(a.consumer_categories) && a.consumer_categories.length ? a.consumer_categories.join(", ") : "not specified";
    return `Activity ${i + 1} — ${TRIGGER_LABELS[a.trigger_key] ?? a.trigger_key}:
  Data categories: ${cats}
  Consumer categories: ${cons}
  Specific purpose: ${String(a.purpose_description ?? "not provided")}
  Minimum PI necessary (§ 7152(a)(3)): ${String(a.minimum_pi_necessary ?? "Not provided.")}
  Sources of the PI (§ 7152(a)(3)): ${String(a.pi_sources ?? "Not provided.")}
  Recipients / third parties: ${String(a.third_party_recipients || "none stated")}
  Benefit to the business (§ 7152(a)(4)): ${String(a.business_benefits ?? "Not provided.")}
  Benefit to the consumer (§ 7152(a)(4)): ${String(a.consumer_benefits ?? "Not provided.")}
  Benefit to other stakeholders / the public: ${String(a.stakeholder_public_benefits ?? "Not provided.")}
  Planned safeguards (§ 7152(a)(6)): ${String(a.current_safeguards ?? "Not provided.")}
  Cross-context tracking: ${yn(a.cross_context_tracking)}; profiling/inferences: ${yn(a.profiling_inferences)}; children in scope: ${yn(a.children_in_scope)}`;
  }).join("\n\n");

  const today = new Date().toISOString().slice(0, 10);

  return `Generate a CPPA risk assessment for the following organisation. Map all output to the § 7152 required content elements. Use ${today} as the assessment_date — do not invent a different date.

FIXED ASSESSMENT SUBJECT (locked across revision runs): ${subjectAnchor || "(not provided — legacy assessment)"}
This assessment addresses this single processing activity. All findings, the § 7152(a)(1) purpose
analysis, and every section of the report concern this subject only.


STAGE 1 — TRIGGERED ACTIVITIES (§ 7150(b)):
${activeTriggers.length ? activeTriggers.map((t) => `- ${t}`).join("\n") : "- None explicitly indicated."}

Annual consumer volume: ${intake.annual_consumer_volume ?? "Not specified"}

STAGE 2 — § 7152 EXCEPTION / BUSINESS-PURPOSE CLAIMS:
${noExceptions ? "No exceptions claimed." : claimedList.join("\n")}

STAGE 3 — PROCESSING ACTIVITY DETAILS:
${activityProse || "No activity detail provided."}

STAGE 4 — IMPACT ASSESSMENT:
Likelihood of harm: ${impact.likelihood_of_harm}
Severity of harm: ${impact.severity_of_harm}
Harm types identified: ${(Array.isArray(impact.harm_types) ? impact.harm_types : []).join(", ")}
${impact.vulnerable_populations_detail ? `Vulnerable populations detail: ${impact.vulnerable_populations_detail}` : ""}
Benefits outweigh risks (organisation assessment): ${impact.benefits_outweigh_risks}
Rationale: ${impact.benefits_outweigh_risks_rationale}
Cybersecurity gaps identified: ${impact.cybersecurity_gaps_identified ? "Yes" : "No"}
Prior assessments conducted: ${impact.prior_assessments_conducted ? `Yes (${impact.prior_assessment_date ?? "date not specified"})` : "No"}

STAGE 5 — ORGANISATIONAL CONTEXT:
Company: ${org_context.company_name}
Sector: ${org_context.sector}
Annual revenue band (§ 1798.140(d)(1)(A)): ${q1RevenueBand}
Privacy counsel engaged: ${org_context.privacy_counsel_engaged === true ? "Yes" : org_context.privacy_counsel_engaged === false ? "No" : "Not recorded"}
DPO/Privacy Officer: ${org_context.dpo_or_privacy_officer === true ? "Yes" : org_context.dpo_or_privacy_officer === false ? "No" : "Not recorded"}
Board-level privacy oversight: ${org_context.board_level_oversight === true ? "Yes" : org_context.board_level_oversight === false ? "No" : "Not recorded"}
Existing privacy programme: ${org_context.existing_privacy_programme}
CPPA audit notification received: ${org_context.cppa_audit_notification_received === true ? "YES — URGENT" : org_context.cppa_audit_notification_received === false ? "No" : "Not recorded"}
${org_context.additional_context ? `Additional context: ${org_context.additional_context}` : ""}
${intake.content_detail ? `
§ 7152(a)(1)–(9) CONTENT DETAIL (from the user's intake — map each to its required content element; treat blanks as fill-ins, not findings of absence):
Retention period: ${intake.content_detail.retention_period || "not provided"}
Retention criteria: ${intake.content_detail.retention_criteria || "not provided"}
Retention detail: ${intake.content_detail.retention_detail || "not provided"}
How consumers are informed / disclosures (§ 7152(a)(3)(E)): ${intake.content_detail.consumer_disclosures || "not provided"}
ADMT — logic: ${intake.content_detail.admt_logic || "n/a"}
ADMT — training-data source: ${intake.content_detail.admt_training_source || "n/a"}
ADMT — fairness/bias testing: ${intake.content_detail.admt_fairness_testing || "n/a"}
ADMT — human review / appeal: ${intake.content_detail.admt_human_review || "n/a"}
ADMT — description: ${intake.content_detail.admt_description || "n/a"}
ADMT — opt-out offered: ${intake.content_detail.admt_opt_out || "n/a"}
Sensitive-PI use-limitation offered: ${intake.content_detail.sensitive_pi_limit_offered || "n/a"}
Sensitive-PI processing basis: ${intake.content_detail.sensitive_pi_basis || "n/a"}
"Do Not Sell/Share" opt-out link: ${intake.content_detail.opt_out_link || "n/a"}
Notice at collection: ${intake.content_detail.notice_at_collection || "n/a"}
Minimum PI necessary (§ 7152(a)(3)): ${intake.content_detail.minimum_pi_necessary || "not provided"}
Sources of the PI (§ 7152(a)(3)): ${intake.content_detail.pi_sources || "not provided"}
Under-16 actual knowledge (§ 7001(bbb)): ${intake.content_detail.under16_actual_knowledge || "not stated"}
Systematic-observation profiling trigger (${SEC_OBSERVE}): ${intake.content_detail.profiling_observation_trigger || "no"}
Sensitive-location profiling trigger (${SEC_LOCATION}): ${intake.content_detail.profiling_observation_trigger || "no"}
ADMT / biometric training trigger (${SEC_TRAIN}): ${intake.content_detail.admt_training_trigger || "no"}
Negative-impact sources and causes (§ 7152(a)(5)): ${intake.content_detail.harm_sources_and_causes || "not provided"}
Contributors to this assessment (§ 7152(a)(8)): ${intake.content_detail.internal_contributors || "not provided"}
External consultees: ${intake.content_detail.external_consultees || "none stated"}
Certifying executive (§ 7157): ${intake.content_detail.certifying_exec_name || "[FILL IN]"}${intake.content_detail.certifying_exec_title ? `, ${intake.content_detail.certifying_exec_title}` : ""}${intake.content_detail.certifying_contact_email ? ` (${intake.content_detail.certifying_contact_email})` : ""}
Existing DPIA/assessment to cross-reference: ${intake.content_detail.existing_dpia || "No"}
` : ""}
Return only valid JSON matching the specified output structure. No preamble, no markdown fences.`;
}

// ---------------------------------------------------------------------------
// Model call — Claude Sonnet 4.6 via Anthropic API direct.
// ---------------------------------------------------------------------------
async function callModel(
  system: string | SystemBlock[],
  user: string,
  label = "generate-v4",
  maxTokens: number = CPPA_RISK_MAX_TOKENS,
  timeoutMs?: number,
): Promise<{ text: string; stopReason: string | null }> {
  // T-M9.2 (Item 232): legacy v4 generation is retired at runtime. Any
  // invocation is undeclared composition-shape drift — fail loud so the
  // pipeline never spends on a discarded call again.
  if (LEGACY_GENERATION_RETIRED) {
    legacyLlmCallCount += 1;
    legacyLlmCallLabels.push(label);
    throw new Error(`composition_shape_drift:legacy_v4_callmodel_invoked:label=${label}`);
  }
  const r = await callAnthropicWithContinuation({
    model: "claude-sonnet-4-6",
    system, user, maxTokens, label, timeoutMs,
  });
  return { text: r.text, stopReason: r.stopReason };
}

function tryParseJson(text: string): any | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
async function runPipeline(assessment_id: string) {
  try {
    const { data: row } = await supabase.from("cppa_assessments").select("*").eq("id", assessment_id).single();
    if (!row) return;
    const procWrite = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "processing" }, { fn: "run-cppa-risk-assessment", phase: "pre_generation" });
    if (!procWrite.ok) {
      // Cannot persist lifecycle state — abort before spending model time.
      return;
    }

    // T-M9.1 (Item 231): worker_start liveness touch — fires IMMEDIATELY
    // after the processing write and BEFORE any slow work (corpus retrieval,
    // deadline block, first model call). Together with worker_liveness_pass1_start
    // (deeper in the pipeline) this bounds the "silent gap" between DB
    // touches so a stalled worker is distinguishable from a slow one within
    // seconds instead of minutes. Non-fatal on failure.
    try {
      await supabase.from("cppa_assessments").update({
        updated_at: new Date().toISOString(),
      }).eq("id", assessment_id);
      console.log(JSON.stringify({
        evt: "worker_liveness_start", fn: "run-cppa-risk-assessment",
        assessment_id, build_stamp: BUILD_STAMP,
      }));
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] worker_liveness_start touch failed (non-fatal):", (e as Error)?.message);
    }

    const { intake: fiveStage, wasLegacyShimmed, bandResolution } = normaliseIntake(row.intake_data ?? {});

    const validation = validateFiveStage(fiveStage, /* lenient */ wasLegacyShimmed);
    if (!validation.ok) {
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
        status: "error",
        report_data: { error: "VALIDATION_FAILED", message: validation.message, field: validation.field },
      }, { fn: "run-cppa-risk-assessment", phase: "terminal_error_validation" });
      return;
    }

    // Corpus retrieval (parallel).
    const { enforcementContext, longitudinalSynthesis, statuteContext, fsorContext, citations } = await retrieveCorpusContext(fiveStage);

    const today = new Date().toISOString().slice(0, 10);
    const rawIntake = (row.intake_data ?? {}) as Record<string, unknown>;

    // R1b1 — compute deterministic TEST-STATES and inject them into the system content.
    const testStates = computeTestStates(fiveStage, rawIntake as Record<string, any>);
    const testStatesBlock = formatTestStatesBlock(testStates);

    // C2-2 — corpus-sourced CPPA canonical deadlines + startup drift-lint.
    verifyCppaDeadlineDrift(supabase, "risk");
    const riskDeadlineBlock = await buildCppaDeadlineBlock(supabase, "risk");

    const injected = [
      `ENFORCEMENT CONTEXT FROM CORPUS:\n${enforcementContext || "(none returned)"}`,
      `LONGITUDINAL ENFORCEMENT PATTERNS:\n${longitudinalSynthesis || "(none returned)"}`,
      `VERBATIM REGULATION TEXT (Cal. Code Regs. tit. 11 — authoritative; ground every citation in this text):\n${statuteContext || "(none returned)"}`,
      `CPPA AGENCY COMMENTARY — FINAL STATEMENT OF REASONS:\n${fsorContext || "(none returned)"}`,
      testStatesBlock,
      riskDeadlineBlock,
      RISK_VERIFIED_AUTHORITY_BLOCK,
    ].filter(Boolean).join("\n\n");
    const system = buildSystemContent({
      toolModule: CPPA_RISK_TOOL_MODULE,
      currentDate: today,
      injected,
    });
    const subjectAnchor = typeof rawIntake?.subject_anchor === "string" ? (rawIntake.subject_anchor as string).trim() : "";
    // Doc O 3c-2(i): canonical intake-field vocabulary.
    const canonicalFieldIds = Object.keys(rawIntake)
      .filter((k) => k !== "assertions")
      .sort();
    const canonicalBlock = `CANONICAL_INTAKE_FIELDS (closed vocabulary — use only these ids verbatim in source_fields, intake_field_1/2, and information_needed.field):\n${canonicalFieldIds.map((k) => `  - ${k}`).join("\n")}`;
    const compactCellsBlock = `COMPACT-CELLS OUTPUT RULE: Table cells and matrix rows are COMPACT. Each cell contains a substantive but concise determination of approximately 40 words or fewer — enough to state the determination and its immediate justification, not an essay. This applies to every repeated-row structure in the report (including the risk_register / risk_matrix rows, control-mapping rows, information_needed rows, and any other table or matrix). Narrative sections (assessment_summary, methodology notes, and section-level rationales) carry the analysis; tables carry the determinations. This rule does not reduce substantive scope — every required field is still populated with an assessed determination — it constrains only the length and register of table-cell text.`;
    const userPrompt = `${compactCellsBlock}\n\n${canonicalBlock}\n\n${buildUserPrompt(fiveStage, subjectAnchor, (row.intake_data as any)?.q1_revenue ?? "Not specified")}${renderSupplementalBlock({ responses: (rawIntake as any)?.supplemental_responses, context: (rawIntake as any)?.supplemental_context })}`;


    const t0 = Date.now();
    // T-M9.2 (Item 232): legacy v4 generation execution retired. The Pass-2
    // assembler (T-M6 cutover, ~L3577) overwrites every non-underscore
    // top-level key with the deterministic body — none of the legacy
    // scrub/lint/retry work reached the shipped surface. `parsed` is a
    // minimal shape-valid stub so the downstream scrub passes (which mutate
    // fields the assembler will overwrite anyway) no-op safely on empty
    // inputs; `report_data` is initialized from `parsed` and preserved for
    // the _meta.internal telemetry attached below.
    let parsed: any = {
      assessment_summary: {},
      _legacy_generation_retired: {
        retired: true,
        build_stamp: BUILD_STAMP,
        note: "Body composed exclusively by Pass-2 assembler (T-M6 cutover); no Engine-A LLM call executed.",
      },
    };
    let debugRaw = "";
    let lastStopReason: string | null = "retired";
    console.log(JSON.stringify({
      evt: "legacy_v4_generation_skipped",
      fn: "run-cppa-risk-assessment",
      build_stamp: BUILD_STAMP,
      reason: "T-M9.2 retirement — Pass-2 assembler is the shipped body",
    }));



    // MEASUREMENT-VALIDITY FIX (SMOKE-LATENCY-ROOTCAUSE, 2026-07-27):
    // report_data is a completion surface for the harness. Therefore no
    // pre-final snapshot may write report_data here. The only successful
    // report_data write is terminal_complete after composition-finalize and
    // the serializer have run; the harness gate is status='complete' plus
    // report_data present.



    // Post-generation verification (soft): banned phrases + hard lint violations.
    // One regeneration via the existing retry path if either fires.
    try {
      const flat = JSON.stringify(parsed);
      const banned = BANNED_PHRASES.filter((p) => flat.includes(p));
      const lint = lintReportText(flat, { banGapWord: true });

      // T-1 (WAVE12-FIX TURN D — D1) — deterministic band-vs-threshold
      // backstop for the § 7120(b)(2)(A) 250,000-consumer volume prong.
      //
      // Wave-12 defect (HIGH doc 9ce32381): T-1 read q2_consumers whose
      // CONSUMER_OPTS bands already align to the 250k breakpoint (e.g.
      // "100,000–249,999" resolves BELOW). The correct field for the CA
      // 12-month count is `i3_ca_consumer_band`, whose CA_CONSUMER_BAND
      // bands are coarser and DO straddle 250k. Reading q2 hid a straddle
      // and let a definitive "not met" ship. Fix: read i3_ca_consumer_band
      // and evaluate against its own band set.
      //
      // CA_CONSUMER_BAND resolution:
      //   "Fewer than 10,000" / "10,000–100,000" — entirely BELOW 250,000 →
      //       definitive "met" claims are violations.
      //   "More than 1,000,000" — entirely ABOVE 250,000 → definitive
      //       "not met" claims are violations.
      //   "100,000–1,000,000" — STRADDLES 250,000 → any definitive
      //       met/not-met claim is a violation; must resolve indeterminate.
      //   "Unsure" — indeterminate; same rule as straddle.
      const i3Band = String((rawIntake as Record<string, unknown>)?.i3_ca_consumer_band ?? "").trim();
      const belowBands = new Set(["Fewer than 10,000", "10,000–100,000"]);
      const aboveBands = new Set(["More than 1,000,000"]);
      const straddleOrUnsure = i3Band === "100,000–1,000,000" || i3Band.toLowerCase() === "unsure";
      const volumeBand = i3Band; // for telemetry parity below

      const metPatterns: RegExp[] = [
        /exceeds the 250,000/i,
        /250,000-consumer volume threshold is met/i,
      ];
      const notMetPatterns: RegExp[] = [
        /below the 250,000/i,
        /250,000-consumer volume threshold is not met/i,
      ];
      const hasMetClaim = metPatterns.some((re) => re.test(flat));
      const hasNotMetClaim = notMetPatterns.some((re) => re.test(flat));

      let t1Violation = false;
      let t1Reason: string | undefined;
      if (straddleOrUnsure && (hasMetClaim || hasNotMetClaim)) {
        t1Violation = true;
        t1Reason = "straddle_or_unsure_definitive_claim";
      } else if (belowBands.has(volumeBand) && hasMetClaim) {
        t1Violation = true;
        t1Reason = "below_band_claims_met";
      } else if (aboveBands.has(volumeBand) && hasNotMetClaim) {
        t1Violation = true;
        t1Reason = "above_band_claims_not_met";
      }
      if (t1Violation) {
        console.warn(JSON.stringify({
          evt: "post_gen_violation",
          rule: "T-1",
          fn: "run-cppa-risk-assessment",
          band: volumeBand,
          reason: t1Reason,
        }));
      }

      // T-2 — TEST-STATES ARE BINDING: any information_needed entry, hedge, or
      // confirm-ask referencing a test whose injected state is RESOLVED is a hard
      // violation. Uses the same testStates map that was injected into the prompt.
      const hedgeRe = /\b(cannot be determined|insufficient basis|not established|no basis to assess|indeterminate|please confirm|please verify)\b/i;
      const infoEntries: any[] = Array.isArray(parsed?.information_needed) ? parsed.information_needed : [];
      let t2Violation = false;
      const t2Details: Array<{ test: string; kind: "info_needed" | "hedge_in_prose"; detail: string }> = [];
      for (const [testId, ts] of Object.entries(testStates)) {
        if (ts.state === "indeterminate") continue;
        const src = new Set(ts.source_fields);
        for (const entry of infoEntries) {
          const entryFields = new Set<string>([
            ...(Array.isArray(entry?.source_fields) ? entry.source_fields : []),
            ...(typeof entry?.field === "string" ? [entry.field] : []),
          ]);
          const overlaps = [...entryFields].some((f) => src.has(f));
          if (overlaps) {
            t2Violation = true;
            t2Details.push({ test: testId, kind: "info_needed", detail: String(entry?.field ?? entry?.dimensions ?? "").slice(0, 120) });
          }
        }
        // Detect hedge phrases in cybersecurity_audit_rationale where any of the
        // three prong tests M3/M4/M5 or the cohort M6 is RESOLVED.
        if (["M3", "M4", "M5", "M6"].includes(testId)) {
          const rationale = String(parsed?.cross_tool_recommendations?.cybersecurity_audit_rationale ?? "");
          if (hedgeRe.test(rationale)) {
            t2Violation = true;
            t2Details.push({ test: testId, kind: "hedge_in_prose", detail: rationale.slice(0, 160) });
          }
        }
      }
      // T-2 EXTENSION (r1b1.2, 2026-07-11): OMISSION detection in
      // cross_tool_recommendations.cybersecurity_audit_rationale. A RESOLVED
      // test whose outcome is not stated at all in the rationale is a defect
      // ("a check that cannot see its own conclusion passes everything").
      // Scope: M4 (sensitive-PI prong, incl. resolved_not_applicable) and M6
      // (audit-cohort, incl. legacy-band indeterminate requiring both cohort
      // dates). Merges into the same t2Violation surface so the r1b1.1
      // time-budgeted retry gate governs the response.
      {
        const rationaleT2 = String(parsed?.cross_tool_recommendations?.cybersecurity_audit_rationale ?? "");
        const m4 = (testStates as any).M4;
        if (m4) {
          if (m4.state === "resolved_not_applicable") {
            // Must state the prong does not apply.
            const naRe = /(does not apply|not applicable|inapplicable|no sensitive[- ]pi|no sensitive personal information)/i;
            if (!naRe.test(rationaleT2)) {
              t2Violation = true;
              t2Details.push({ test: "M4", kind: "hedge_in_prose", detail: "M4 RESOLVED_NOT_APPLICABLE: § 7120(b)(2)(B) N/A prong outcome absent from cybersecurity_audit_rationale" });
            }
          } else if (m4.state === "resolved_met" || m4.state === "resolved_not_met") {
            const spiRe = /(sensitive[- ]pi|sensitive personal information|§?\s*7120\(b\)\(2\)\(B\)|50,?000)/i;
            if (!spiRe.test(rationaleT2)) {
              t2Violation = true;
              t2Details.push({ test: "M4", kind: "hedge_in_prose", detail: `M4 ${m4.state}: SPI prong outcome absent from cybersecurity_audit_rationale` });
            }
          }
        }
        const m6 = (testStates as any).M6;
        if (m6) {
          if (m6.state === "indeterminate") {
            // Legacy band → both cohort dates must appear conditionally.
            const has2029 = /2029/.test(rationaleT2);
            const has2030 = /2030/.test(rationaleT2);
            if (!(has2029 && has2030)) {
              t2Violation = true;
              t2Details.push({ test: "M6", kind: "hedge_in_prose", detail: "M6 INDETERMINATE (legacy band): cybersecurity_audit_rationale must state BOTH cohort dates (2029 and 2030) as the conditional resolution" });
            }
          } else if (m6.state === "resolved_met") {
            const cohortYear = String(m6.note ?? "").match(/(\d{4})-\d{2}-\d{2}/)?.[1] ?? "";
            if (cohortYear && !new RegExp(cohortYear).test(rationaleT2)) {
              t2Violation = true;
              t2Details.push({ test: "M6", kind: "hedge_in_prose", detail: `M6 RESOLVED_MET: cohort year ${cohortYear} absent from cybersecurity_audit_rationale` });
            }
          }
        }
      }
      if (t2Violation) {
        console.warn(JSON.stringify({ evt: "post_gen_violation", rule: "T-2", fn: "run-cppa-risk-assessment", details: t2Details.slice(0, 10) }));
      }

      // T-3 — BANNED COLLAPSE: banned-collapse phrasing applied to a determination
      // that the record actually credits. Heuristic: an activity block whose
      // current_safeguards or benefits fields carry substantive content AND whose
      // conclusion/rationale contains 'cannot be determined' / 'no basis to assess' /
      // 'not established' collapses a credited determination.
      let t3Violation = false;
      const t3Details: string[] = [];
      const collapseRe = /\b(cannot be determined|no basis to assess|not established)\b/i;
      const activities: any[] = Array.isArray(parsed?.risk_assessment_by_activity) ? parsed.risk_assessment_by_activity : [];
      for (let i = 0; i < activities.length; i++) {
        const a = activities[i] ?? {};
        const hasEvidence =
          String(a.current_safeguards ?? "").trim().length > 20 ||
          String(a.benefits_to_business ?? "").trim().length > 20 ||
          String(a.benefits_to_consumers ?? "").trim().length > 20;
        const concl = String(a.benefits_outweigh_risks_conclusion ?? "") + " " + String(a.benefits_outweigh_risks_rationale ?? "");
        if (hasEvidence && collapseRe.test(concl)) {
          t3Violation = true;
          t3Details.push(`activity[${i}]: credited evidence present but conclusion uses banned-collapse phrasing`);
        }
      }
      if (t3Violation) {
        console.warn(JSON.stringify({ evt: "post_gen_violation", rule: "T-3", fn: "run-cppa-risk-assessment", details: t3Details.slice(0, 10) }));
      }

      // T-4 — ENHANCEMENT-CLASS in information_needed. Detectable subset: entries
      // whose `dimensions` text contains no statutory-requirement anchor AND uses
      // optional-depth language. Uncertain cases are log-only (t4_observe).
      const statAnchorRe = /(§\s*\d|11\s*CCR|1798\.|section\s+\d)/i;
      const depthLangRe = /\b(could|would strengthen|additional context|nice to have|consider (?:adding|providing)|optionally|for completeness|to enrich)\b/i;
      let t4Violation = false;
      const t4Details: string[] = [];
      const t4Observe: string[] = [];
      for (const entry of infoEntries) {
        const dim = String(entry?.dimensions ?? "");
        const hasDepthLang = depthLangRe.test(dim);
        const hasAnchor = statAnchorRe.test(dim) || statAnchorRe.test(String(entry?.provision ?? ""));
        if (hasDepthLang && !hasAnchor) {
          t4Violation = true;
          t4Details.push(String(entry?.field ?? "?") + ": " + dim.slice(0, 120));
        } else if (hasDepthLang) {
          t4Observe.push(String(entry?.field ?? "?"));
        }
      }
      if (t4Violation) {
        console.warn(JSON.stringify({ evt: "post_gen_violation", rule: "T-4", fn: "run-cppa-risk-assessment", details: t4Details.slice(0, 10) }));
      }
      if (t4Observe.length) {
        console.log(JSON.stringify({ evt: "t4_observe", fn: "run-cppa-risk-assessment", fields: t4Observe.slice(0, 20) }));
      }

      // T-5 — TEST-STATES vocabulary leakage (leg-(b) 2026-07-11). Hard violation, retry.
      const t5Hits = detectTestStatesLeak(parsed);
      const t5Violation = t5Hits.length > 0;
      if (t5Violation) {
        console.warn(JSON.stringify({ evt: "post_gen_violation", rule: "T-5", fn: "run-cppa-risk-assessment", count: t5Hits.length, hits: t5Hits.slice(0, 10) }));
      }

      // FF-2 T1 — HARD PROSE BLACKLIST post-gen check. User-facing prose only
      // (walker excludes machine fields per MACHINE_PATH_RE). Feeds into the
      // same retry machinery; over-budget or retry-still-hits ships with
      // per-hit lint entries { code: "blacklist_phrase_shipped" }.
      const blHits = detectBlacklistPhrases(parsed);
      const blViolation = blHits.length > 0;
      if (blViolation) {
        console.warn(JSON.stringify({ evt: "post_gen_violation", rule: "BLACKLIST", fn: "run-cppa-risk-assessment", count: blHits.length, hits: blHits.slice(0, 10) }));
      }

      if (banned.length || hasHardViolations(lint) || t1Violation || t2Violation || t3Violation || t4Violation || t5Violation || blViolation) {
        // r1b1.1 time-budget guard (mirrors run-dpia-framework r1b2.1):
        // retry only if elapsed generation time at detection < 150s;
        // otherwise log post_gen_violation_retry_skipped, merge findings into
        // the existing lint/observation surface, and proceed with the document.
        const elapsedAtViolationMs = Date.now() - t0;
        // SMOKE-HANG ADDENDUM 2026-07-27 — retry_within_budget MUST include
        // remaining wall-clock against the isolate ceiling with a safety
        // margin for post-retry work (T-5 detect, deterministic fallback,
        // i3 rewriter, guard, W6..W24, LTP finalize, serializer, persist).
        // See _shared/ltp/retry-budget.ts. Persist-first: the first composed
        // doc is snapshotted; a retry that hangs, throws, or produces
        // garbage restores the snapshot instead of losing the document.
        const budget = computeRetryBudget({
          elapsedMs: elapsedAtViolationMs,
          elapsedThresholdMs: CPPA_RISK_RETRY_ELAPSED_THRESHOLD_MS,
        });
        const retryWithinBudget = budget.allowed;
        console.warn(JSON.stringify({
          evt: "post_gen_violation",
          fn: "run-cppa-risk-assessment",
          elapsed_ms: elapsedAtViolationMs,
          retry_threshold_ms: CPPA_RISK_RETRY_ELAPSED_THRESHOLD_MS,
          retry_within_budget: retryWithinBudget,
          retry_budget_reason: budget.reason,
          remaining_wall_clock_ms: budget.remainingWallClockMs,
          retry_cap_ms: budget.retryCapMs,
          banned,
          violations: lint.violations?.slice(0, 20) ?? [],
          t1: t1Violation,
          t2: t2Violation,
          t3: t3Violation,
          t4: t4Violation,
          t5: t5Violation,
          blacklist: blViolation,
        }));
        if (retryWithinBudget) {
          const t5InstructionSuffix = t5Violation
            ? `\n\nPREVIOUS ATTEMPT REJECTED for TEST-STATES vocabulary leakage: internal tokens surfaced in user-facing prose (${t5Hits.slice(0, 6).map((h) => `${h.path}: "${h.match}"`).join("; ")}). Re-emit the assessment removing every reference to TEST-STATES, test ids (M1, M2, …), and state tokens (resolved_met / resolved_not_met / RESOLVED_* / INDETERMINATE / CANDIDATE) from all user-facing fields. State the conclusion with its factual basis instead. Do not mention this instruction in the output.`
            : "";
          const blInstructionSuffix = blViolation ? formatBlacklistRetrySuffix(blHits) : "";
          // PERSIST-FIRST: `parsed` is the first composed doc; if the retry
          // hangs, throws, or returns garbage, keep it. The wall-clock cap
          // in `budget.retryCapMs` prevents the retry from consuming the
          // reserve budget needed for post-retry work + persist.
          const parsedPreRetry = parsed;
          const stopReasonPreRetry = lastStopReason;
          const debugRawPreRetry = debugRaw;
          const outcome = await withRetryPersistFirst<{ parsed: any; stopReason: any; text: string } | null>(
            null,
            budget.retryCapMs,
            async (_signal) => {
              if (LEGACY_GENERATION_RETIRED) return null; // T-M9.2: legacy retry retired
              const retry = await callModel(system, userPrompt + t5InstructionSuffix + blInstructionSuffix, "generate-v4-retry", CPPA_RISK_MAX_TOKENS, POST_LINT_LLM_CALL_TIMEOUT_MS);
              const retryParsed = tryParseJson(retry.text);
              if (retryParsed && retryParsed.assessment_summary) {
                return { parsed: retryParsed, stopReason: retry.stopReason, text: retry.text };
              }
              return null;
            },
            (c) => c !== null,
          );
          if (outcome.kind === "used_retry" && outcome.value) {
            parsed = outcome.value.parsed;
            lastStopReason = outcome.value.stopReason;
            debugRaw = outcome.value.text;
            console.log(JSON.stringify({
              evt: "post_gen_retry_used",
              fn: "run-cppa-risk-assessment",
              retry_elapsed_ms: outcome.elapsedMs,
            }));
          } else {
            // Preserve first document (already in `parsed`) explicitly.
            parsed = parsedPreRetry;
            lastStopReason = stopReasonPreRetry;
            debugRaw = debugRawPreRetry;
            console.warn(JSON.stringify({
              evt: "post_gen_retry_failed_preserve_first_doc",
              fn: "run-cppa-risk-assessment",
              reason: outcome.kind === "kept_first" ? outcome.reason : "unknown",
              error: outcome.kind === "kept_first" ? outcome.error : undefined,
              retry_elapsed_ms: outcome.elapsedMs,
            }));
          }
        } else {
          console.warn(JSON.stringify({
            evt: budget.reason === "wall_clock_insufficient"
              ? "post_gen_violation_retry_skipped_wall_clock"
              : "post_gen_violation_retry_skipped",
            fn: "run-cppa-risk-assessment",
            reason: budget.reason,
            elapsed_ms: elapsedAtViolationMs,
            retry_threshold_ms: CPPA_RISK_RETRY_ELAPSED_THRESHOLD_MS,
            remaining_wall_clock_ms: budget.remainingWallClockMs,
            retry_cap_ms: budget.retryCapMs,
            rules: { t1: t1Violation, t2: t2Violation, t3: t3Violation, t4: t4Violation, t5: t5Violation, blacklist: blViolation },
          }));
        }


        // FF-2 T1 — after any retry attempt, if blacklist hits still surface
        // in the final parsed doc, ship with per-hit lint entries. NO
        // mechanical rewriting (REBUILD-DPIA D2 rationale).
        const residualBlHits = detectBlacklistPhrases(parsed);
        if (residualBlHits.length > 0) {
          if (!Array.isArray((parsed as any).lint_warnings)) (parsed as any).lint_warnings = [];
          for (const h of residualBlHits) {
            (parsed as any).lint_warnings.push({
              code: "blacklist_phrase_shipped",
              field: h.path,
              match: h.match,
              context: h.context,
            });
          }
          console.warn(JSON.stringify({
            evt: "blacklist_phrase_shipped",
            fn: "run-cppa-risk-assessment",
            count: residualBlHits.length,
            retry_within_budget: retryWithinBudget,
          }));
        }


        // POSTBATCH-1 — deterministic post-generation fallback. Runs whenever
        // the retry is skipped (over budget) OR the retry result still has
        // T-2 / T-5 residue (resolved-source ask OR TEST-STATES token leakage).
        // Idempotent on a clean document.
        const residualLeaks = detectTestStatesLeak(parsed);
        const resolvedSources = new Set<string>();
        for (const ts of Object.values(testStates ?? {})) {
          if (ts && typeof ts.state === "string" && ts.state.startsWith("resolved")) {
            for (const f of ts.source_fields ?? []) resolvedSources.add(f);
          }
        }
        const residualResolvedAsks: any[] = (Array.isArray(parsed?.information_needed) ? parsed.information_needed : []).filter((e: any) => {
          const fields: string[] = [];
          if (typeof e?.field === "string") fields.push(e.field);
          if (Array.isArray(e?.source_fields)) for (const f of e.source_fields) if (typeof f === "string") fields.push(f);
          return fields.some((f) => resolvedSources.has(f));
        });
        const applied = residualLeaks.length > 0 || residualResolvedAsks.length > 0;
        let fallbackNotes: Array<{ code: string; detail?: string }> = [];
        if (applied) {
          const result = applyDeterministicPostGenFallback(parsed, testStates);
          parsed = result.parsed;
          fallbackNotes = result.notes;
          console.warn(JSON.stringify({
            evt: "post_gen_fallback_applied",
            fn: "run-cppa-risk-assessment",
            retry_within_budget: retryWithinBudget,
            residual_leaks: residualLeaks.length,
            residual_resolved_asks: residualResolvedAsks.length,
            notes: result.notes.slice(0, 40),
          }));
        }

        // i3-EMITTER FIX — when the LLM asks about i3_ca_consumer_band but
        // the intake already has the volume band answered, rewrite the ask
        // to i3_ca_consumer_band_composition so open_items routes to
        // structured (category mix), not the re-select band. Runs BEFORE
        // freezeOpenItemsOnFirstRun so the rewrite lands in the frozen set.
        // Historical (already-frozen) docs are unaffected.
        if (Array.isArray(parsed?.information_needed)) {
          const before = parsed.information_needed;
          const _intakeForI3 = ((row as any).intake_data as Record<string, unknown>) ?? {};
          const after = rewriteI3CompositionAsks(before, _intakeForI3);
          if (after !== before) {
            parsed.information_needed = after;
            console.warn(JSON.stringify({
              evt: "i3_composition_ask_rewritten",
              fn: "run-cppa-risk-assessment",
              count: (after as any[]).filter(
                (e: any) => e?.field === "i3_ca_consumer_band_composition",
              ).length,
            }));
          }
        }
        // REBUILD-DPIA T9 — persist post_gen_lint telemetry (fire-and-forget).
        logPostGenLint(supabase, {
          functionName: "run-cppa-risk-assessment",
          fallbackApplied: applied,
          retryWithinBudget,
          residualLeaks: residualLeaks.length,
          residualResolvedAsks: residualResolvedAsks.length,
          notes: fallbackNotes,
          sourceTable: "cppa_assessments",
          sourceRowId: assessment_id ?? null,
        });
      }



    } catch (e) {
      console.warn("[cppa-risk v4] post-gen verification error:", e);
    }

    // Item-201/202 persist-early snapshot removed. It made report_data
    // observable before composition-finalize/serializer and allowed a later
    // overwrite after the harness could complete the doc. That is a §16
    // measurement-validity violation. This spot remains a no-op.




    // 2.2.a — FORWARD PATH retry trigger: if the guard detects a dead-end
    // insufficient-basis passage without a paired information_needed entry,
    // one regeneration with the appended instruction.
    try {
      const intakeForGuard = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const guarded = guardInformationNeeded(parsed, intakeForGuard, "cppa_risk_assessment");
      // Auto-repair (synthesised information_needed entries from empty intake keys) is
      // applied in-place; no model retry needed. We only regenerate when the guard could
      // not repair AND still detects a dead-end phrase — a rare edge case that used to
      // cost ~180s per run and push the outer job past the 12-min watchdog.
      if (guarded.autoRepaired > 0) {
        parsed = guarded.report;
      } else if (guarded.deadEndWithoutPath) {
        const elapsedNow = Date.now() - t0;
        if (!hasBudgetForPostLintLLM(elapsedNow)) {
          console.warn(JSON.stringify({ evt: "forward_path_retry_skipped_budget", fn: "run-cppa-risk-assessment", elapsed_ms: elapsedNow, budget_ms: POST_LINT_LLM_BUDGET_MS }));
        } else if (LEGACY_GENERATION_RETIRED) {
          console.warn(JSON.stringify({ evt: "forward_path_retry_skipped_retired", fn: "run-cppa-risk-assessment", build_stamp: BUILD_STAMP }));
        } else {
          console.warn(JSON.stringify({ evt: "forward_path_retry", fn: "run-cppa-risk-assessment", elapsed_ms: elapsedNow }));
          const appended = userPrompt + "\n\nYour previous output contained an insufficient-basis finding with no information_needed entry. Re-emit with the required entry per the FORWARD PATH rule.";
          const retry = await callModel(system, appended, "generate-v4-fwdpath-retry", CPPA_RISK_MAX_TOKENS, POST_LINT_LLM_CALL_TIMEOUT_MS);
          const retryParsed = tryParseJson(retry.text);
          if (retryParsed && retryParsed.assessment_summary) {
            parsed = retryParsed;
            lastStopReason = retry.stopReason;
            debugRaw = retry.text;
          }
        }
      }

    } catch (e) {
      console.warn("[cppa-risk v4] forward-path guard preview error:", e);
    }

    // POST-C1-FIX-2B — CHAIN-OF-THOUGHT / SELF-CORRECTION LEAK GUARD.
    // Batch 5aee4b99 shipped visible self-correction in scope_notes
    // ("— wait, ... Correcting: ..."). Detect banned self-correction markers
    // across all customer-prose string leaves; on hit, fire ONE regeneration
    // with an explicit instruction to emit final text only. Log both outcomes.
    try {
      const SELF_CORRECTION_RE =
        /(—\s*wait\b|\bCorrecting\s*:|\blet\s+me\s+reconsider\b|\bactually,\s+(?:the|that|this)\b|\bon\s+second\s+thought\b|\bstrike\s+that\b|\bscratch\s+that\b|\bI\s+meant\b)/i;
      const hitPaths: string[] = [];
      const walkDetect = (node: any, path: string) => {
        if (node == null) return;
        if (typeof node === "string") {
          if (SELF_CORRECTION_RE.test(node)) hitPaths.push(path);
          return;
        }
        if (Array.isArray(node)) {
          for (let i = 0; i < node.length; i++) walkDetect(node[i], `${path}[${i}]`);
          return;
        }
        if (typeof node !== "object") return;
        for (const k of Object.keys(node)) walkDetect((node as any)[k], path ? `${path}.${k}` : k);
      };
      walkDetect(parsed, "");
      if (hitPaths.length > 0) {
        const elapsedNow = Date.now() - t0;
        if (!hasBudgetForPostLintLLM(elapsedNow)) {
          console.warn(JSON.stringify({ evt: "cot_leak_retry_skipped_budget", fn: "run-cppa-risk-assessment", elapsed_ms: elapsedNow, budget_ms: POST_LINT_LLM_BUDGET_MS, hits: hitPaths.length }));
        } else if (LEGACY_GENERATION_RETIRED) {
          console.warn(JSON.stringify({ evt: "cot_leak_retry_skipped_retired", fn: "run-cppa-risk-assessment", build_stamp: BUILD_STAMP, hits: hitPaths.length }));
        } else {
        console.warn(JSON.stringify({
          evt: "cot_leak_detected",
          fn: "run-cppa-risk-assessment",
          build_stamp: BUILD_STAMP,
          paths: hitPaths.slice(0, 8),
          count: hitPaths.length,
          elapsed_ms: elapsedNow,
        }));
        const cotInstruction = "\n\nYour previous output contained visible self-correction or chain-of-thought markers (e.g. \"— wait,\", \"Correcting:\", \"let me reconsider\", \"actually,\", \"on second thought\"). CUSTOMER PROSE IS FINAL TEXT ONLY — corrections must be applied SILENTLY before emission. Re-emit the JSON with clean, final prose in every string leaf, including scope_notes.";
        const retry = await callModel(system, userPrompt + cotInstruction, "generate-v4-cot-leak-retry", CPPA_RISK_MAX_TOKENS, POST_LINT_LLM_CALL_TIMEOUT_MS);

        const retryParsed = tryParseJson(retry.text);
        if (retryParsed && retryParsed.assessment_summary) {
          // Verify the retry is clean; if still dirty, keep retry but log.
          const stillDirty: string[] = [];
          walkDetect.call(null, retryParsed, "");
          const walk2 = (node: any, path: string) => {
            if (node == null) return;
            if (typeof node === "string") { if (SELF_CORRECTION_RE.test(node)) stillDirty.push(path); return; }
            if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) walk2(node[i], `${path}[${i}]`); return; }
            if (typeof node !== "object") return;
            for (const k of Object.keys(node)) walk2((node as any)[k], path ? `${path}.${k}` : k);
          };
          walk2(retryParsed, "");
          console.log(JSON.stringify({
            evt: "cot_leak_retry_result",
            fn: "run-cppa-risk-assessment",
            build_stamp: BUILD_STAMP,
            still_dirty_paths: stillDirty.slice(0, 8),
            still_dirty_count: stillDirty.length,
          }));
          parsed = retryParsed;
          lastStopReason = retry.stopReason;
          debugRaw = retry.text;
        }
        }
      }

    } catch (e) {
      console.warn("[cppa-risk v4] CoT leak guard failed (non-fatal):", (e as Error)?.message);
    }



    // DETERMINISTIC § 7157 DEADLINE NORMALISATION (Branch A — corpus-confirmed date):
    // 11 CCR § 7157(a)(1) confirms that risk assessments conducted in 2026 and 2027
    // must be submitted no later than April 1, 2028. Normalise any § 7157 action's
    // deadline to that canonical value: rewrite bracketed "TBD" placeholders and any
    // other specific 2028 ISO date to 2028-04-01, and ensure deadline_basis quotes
    // § 7157(a)(1). Also rewrite any specific non-April-1 2028 calendar-date phrasing
    // in the action text to the canonical date. Structurally non-fatal (same try/catch
    // posture as other backstops).
    try {
      if (parsed && Array.isArray(parsed.priority_actions)) {
        const SEVEN_157_PATTERN = /§\s*7157|section\s*7157|11\s*CCR\s*§?\s*7157/i;
        const SPECIFIC_2028_DATE = /^2028-\d{2}-\d{2}$/;
        const BRACKETED_2028 = /^\[?\s*2028[^\]]*\]?$/;
        const CANONICAL = "2028-04-01";
        const BASIS_QUOTE = "11 CCR § 7157(a)(1): for risk assessments conducted in 2026 and 2027, the business must submit to the Agency the information required by subsection (b) no later than April 1, 2028.";
        for (const action of parsed.priority_actions) {
          const referencesSeven157 =
            SEVEN_157_PATTERN.test(String(action?.action ?? "")) ||
            SEVEN_157_PATTERN.test(String(action?.statutory_basis ?? "")) ||
            SEVEN_157_PATTERN.test(String(action?.deadline_basis ?? ""));
          if (!referencesSeven157) continue;
          const deadlineStr = String(action?.deadline ?? "");
          const needsFix =
            (SPECIFIC_2028_DATE.test(deadlineStr) && deadlineStr !== CANONICAL) ||
            BRACKETED_2028.test(deadlineStr);
          if (needsFix) {
            console.warn(`[cppa-risk] normalised § 7157 deadline from "${action.deadline}" to ${CANONICAL} (deterministic backstop, Branch A)`);
            action.deadline = CANONICAL;
            const existingBasis = String(action?.deadline_basis ?? "").trim();
            action.deadline_basis = existingBasis && !existingBasis.includes("7157(a)(1)")
              ? `${BASIS_QUOTE} ${existingBasis}`
              : BASIS_QUOTE;
          }
          // Rewrite any specific non-April-1 2028 calendar date in the action text.
          const actionText = String(action?.action ?? "");
          const badDatePattern = /\b(January|February|March|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+2028\b/gi;
          if (badDatePattern.test(actionText)) {
            const fixed = actionText.replace(badDatePattern, "April 1, 2028");
            if (fixed !== actionText) {
              console.warn(`[cppa-risk] rewrote non-canonical 2028 date in § 7157 action text to April 1, 2028`);
              action.action = fixed;
            }
          }
        }
      }
    } catch (e) {
      console.warn("[cppa-risk] § 7157 deadline backstop error:", e);
    }

    // DETERMINISTIC 2027-DATE TEMPORAL-FRAMING NORMALISATION: for every
    // priority_action whose deadline or deadline_basis text references
    // 2027-01-01 / "January 1, 2027" or 2027-12-31 / "December 31, 2027",
    // compare the date to the run's assessment date; if the date is AFTER
    // the assessment date, rewrite any attached framing token reading
    // "operative", "took effect", or "in force" to "prospective as of the
    // assessment date"; if ON OR BEFORE, rewrite any attached "prospective"
    // framing to "operative". Same try/catch posture as other backstops.
    try {
      if (parsed && Array.isArray(parsed.priority_actions)) {
        const assessmentDateStr = String((parsed as any)?.assessment_date || new Date().toISOString().slice(0, 10));
        const assessmentDate = new Date(assessmentDateStr);
        const TARGETS: { iso: string; prose: RegExp }[] = [
          { iso: "2027-01-01", prose: /January\s+1,?\s+2027/i },
          { iso: "2027-12-31", prose: /December\s+31,?\s+2027/i },
        ];
        for (let idx = 0; idx < parsed.priority_actions.length; idx++) {
          const action = parsed.priority_actions[idx];
          const deadlineStr = String(action?.deadline ?? "");
          const basisStr = String(action?.deadline_basis ?? "");
          for (const t of TARGETS) {
            const referenced =
              deadlineStr.includes(t.iso) ||
              basisStr.includes(t.iso) ||
              t.prose.test(deadlineStr) ||
              t.prose.test(basisStr);
            if (!referenced) continue;
            const target = new Date(t.iso);
            const isProspective = target.getTime() > assessmentDate.getTime();
            const fieldsToRewrite: Array<"deadline" | "deadline_basis" | "action"> = ["deadline", "deadline_basis", "action"];
            for (const f of fieldsToRewrite) {
              const original = String((action as any)?.[f] ?? "");
              if (!original) continue;
              let rewritten = original;
              if (isProspective) {
                // REBUILD-RISK C7 — TEMPLATE-SEAM FIX: only rewrite framing
                // tokens when they appear as a clean parenthetical or
                // dash-set qualifier — never mid-sentence (which produced
                // the garbled "the prospective as of the assessment date
                // § X" splices).
                rewritten = rewritten.replace(/([\(\[—–-])\s*(operative|took effect|in force)\s*(?=[\)\];,.])/gi, "$1prospective as of the assessment date");
              } else {
                rewritten = rewritten.replace(/([\(\[—–-])\s*prospective(?:\s+as\s+of\s+the\s+assessment\s+date)?\s*(?=[\)\];,.])/gi, "$1operative");
              }
              if (rewritten !== original) {
                console.warn(`[cppa-risk] 2027-date temporal framing rewrite on priority_actions[${idx}].${f} (target=${t.iso}, prospective=${isProspective})`);
                (action as any)[f] = rewritten;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[cppa-risk] 2027-date temporal framing backstop error:", e);
    }

    // DETERMINISTIC ADMT PRE-USE-NOTICE DEADLINE COLLAPSE + SELF-REFERENCE FIX:
    // (a) if a § 7220 pre-use-notice action exists, strip the "if ADMT confirmed"
    //     second-date clause from other actions' deadline fields and annotate their
    //     deadline_basis to point at the separate action.
    // (b) rewrite priority_actions[N] self-references / out-of-bounds references
    //     to the § 7150(b)(3) or ADMT-determination action's index.
    try {
      if (parsed && Array.isArray(parsed.priority_actions)) {
        const actions = parsed.priority_actions;
        // Identify the pre-use-notice action as one that cites § 7220 in its
        // action/text or deadline_basis AND whose OWN deadline field is a
        // single-clause form (does not itself contain the second conditional
        // "§ 7220 / if ADMT confirmed" clause). This prevents self-matching the
        // dual-date inconsistency action, whose deadline_basis also cites § 7220.
        const cites7220 = (a: any) => {
          const t = String(a?.action ?? a?.text ?? "");
          const b = String(a?.deadline_basis ?? "");
          return /§\s*7220/.test(t) || /§\s*7220/.test(b);
        };
        const hasSecondClauseDeadline = (a: any) =>
          /§\s*7220|if\s+ADMT\s+confirmed/i.test(String(a?.deadline ?? ""));
        const preUseIdx = actions.findIndex((a: any) => cites7220(a) && !hasSecondClauseDeadline(a));
        const anyCites7220 = actions.some((a: any) => cites7220(a));
        if (preUseIdx >= 0) {
          for (let idx = 0; idx < actions.length; idx++) {
            if (idx === preUseIdx) continue;
            const action = actions[idx];
            const deadline = String(action?.deadline ?? "");
            const hasDate = /\d{4}-\d{2}-\d{2}|January|February|March|April|May|June|July|August|September|October|November|December/i.test(deadline);
            const hasSecondClause = /§\s*7220|if\s+ADMT\s+confirmed/i.test(deadline);
            if (hasDate && hasSecondClause) {
              const firstDateMatch = deadline.match(/^[^;]*/);
              const firstDate = firstDateMatch ? firstDateMatch[0].trim() : deadline;
              action.deadline = firstDate;
              const basis = String(action?.deadline_basis ?? "");
              const note = " (see the separate ADMT pre-use-notice action)";
              if (!basis.includes("separate ADMT pre-use-notice action")) {
                action.deadline_basis = basis + note;
              }
              console.warn(`[cppa-risk] ADMT pre-use-notice deadline collapse on priority_actions[${idx}] (pre-use action at ${preUseIdx})`);
            }
          }
        } else if (anyCites7220) {
          // Per the ADMT-INCONSISTENCY canonical, if a § 7220-citing action
          // exists but no qualifying single-date pre-use action is present, the
          // both-dates deadline form is legitimate and nothing is rewritten.
          console.warn("[cppa-risk] ADMT pre-use-notice deadline collapse: § 7220-citing action found but no single-date pre-use action; leaving both-dates form intact per ADMT-INCONSISTENCY canonical");
        }
        const determinationIdx = actions.findIndex((a: any) => {
          const t = String(a?.action ?? a?.text ?? "");
          const b = String(a?.statutory_basis ?? "");
          return /§\s*7150\(b\)\(3\)/.test(t) || /§\s*7150\(b\)\(3\)/.test(b) || /ADMT\s+determination/i.test(t);
        });
        for (let idx = 0; idx < actions.length; idx++) {
          const action = actions[idx];
          const text = String(action?.action ?? action?.text ?? "");
          const rewritten = text.replace(/priority_actions\[(\d+)\]/g, (m, nStr) => {
            const n = Number(nStr);
            if (n === idx || n < 0 || n >= actions.length) {
              if (determinationIdx >= 0 && determinationIdx !== idx) {
                console.warn(`[cppa-risk] priority_actions self/out-of-bounds reference rewrite on priority_actions[${idx}] -> [${determinationIdx}]`);
                return `priority_actions[${determinationIdx}]`;
              }
            }
            return m;
          });
          if (rewritten !== text) {
            if ("action" in action) action.action = rewritten;
            else action.text = rewritten;
          }
        }
      }
    } catch (e) {
      console.warn("[cppa-risk] ADMT deadline-collapse / self-reference backstop error:", e);
    }



    let report_data: any = {
      schema_version: "v4-five-stage",
      generated_at: new Date().toISOString(),
      legacy_shim_applied: wasLegacyShimmed,
      normalised_intake: fiveStage,
      ...parsed,
      retrieval_meta: {
        enforcement_context_chars: enforcementContext.length,
        longitudinal_synthesis_chars: longitudinalSynthesis.length,
      },
    };

    // Stage 5: forward-path guard (strip invented information_needed fields; log dead-ends).
    const guarded = guardInformationNeeded(report_data, ((row as any).intake_data as Record<string, unknown>) ?? {}, "cppa_risk_assessment");
    report_data = guarded.report;

    // W3-A — DETERMINISTIC RESOLVED-SOURCE STRIP. Enforces the QLB-W2A rule 2
    // and the ratified TP W3-A directive at source: any information_needed
    // entry whose `field` (or its first dot-segment) is a source_field of a
    // RESOLVED test is a re-ask for input the record already supplies. Batch
    // 4de60a82 proved answering these asks makes documents WORSE. Prompt-level
    // guidance is insufficient — models still emit them — so we strip them
    // here after the closed-set guard and record a lint_warnings entry.
    try {
      const resolvedSources = new Set<string>();
      for (const [_id, st] of Object.entries(testStates ?? {})) {
        const state = String((st as any)?.state ?? "");
        if (state === "resolved_met" || state === "resolved_not_met" || state === "resolved_not_applicable") {
          for (const sf of ((st as any)?.source_fields ?? []) as string[]) {
            if (typeof sf === "string" && sf) resolvedSources.add(sf);
          }
        }
      }
      const infoList: any[] = Array.isArray((report_data as any).information_needed) ? (report_data as any).information_needed : [];
      const strippedFields: string[] = [];
      const kept = infoList.filter((e) => {
        const raw = typeof e?.field === "string" ? e.field : "";
        if (!raw) return true;
        const root = raw.split(/[.\[]/, 1)[0];
        if (resolvedSources.has(raw) || resolvedSources.has(root)) {
          strippedFields.push(raw);
          return false;
        }
        return true;
      });
      if (strippedFields.length > 0) {
        (report_data as any).information_needed = kept;
        if (!Array.isArray((report_data as any).lint_warnings)) (report_data as any).lint_warnings = [];
        for (const f of strippedFields) {
          (report_data as any).lint_warnings.push({ code: "w3a_resolved_source_ask_stripped", field: f });
        }
        console.log(JSON.stringify({ evt: "w3a_resolved_source_ask_stripped", tool: "cppa_risk_assessment", count: strippedFields.length, fields: strippedFields.slice(0, 12) }));
      }
    } catch (e) {
      console.warn("[cppa-risk] W3-A resolved-source strip errored:", e);
    }

    // RC-A A4 — §7121(a) cohort BINDING lint. When the revenue band resolves
    // to a specific audit cohort, no prose may claim the band "straddles"
    // the $50M line — that phrasing is only valid for the legacy
    // $25M–$100M band (where audit_cohort === "indeterminate"). Rewrite any
    // straddle sentence to the resolved cohort and record a lint_warnings
    // entry. Fires post-guard so both the initial parse and any post-repair
    // parse are covered.
    try {
      const rawIntake = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const band = classifyRevenueBand(rawIntake.q1_revenue);
      if (band.audit_cohort !== "indeterminate") {
        const STRADDLE_RE = /\bstraddles?\s+the\s+\$50M\s+line\b/gi;
        const fix = `resolves to §7121(a) cohort ${band.audit_cohort} (revenue band ${band.label})`;
        let hits = 0;
        const walk = (v: any): any => {
          if (typeof v === "string") {
            if (STRADDLE_RE.test(v)) {
              hits++;
              STRADDLE_RE.lastIndex = 0;
              return v.replace(STRADDLE_RE, fix);
            }
            return v;
          }
          if (Array.isArray(v)) return v.map(walk);
          if (v && typeof v === "object") {
            const o: any = {};
            for (const [k, x] of Object.entries(v)) o[k] = walk(x);
            return o;
          }
          return v;
        };
        report_data = walk(report_data);
        if (hits > 0) {
          if (!Array.isArray((report_data as any).lint_warnings)) (report_data as any).lint_warnings = [];
          (report_data as any).lint_warnings.push({ code: "straddle_phrasing_rewritten", hits, resolved_cohort: band.audit_cohort });
          console.log(JSON.stringify({ evt: "cppa_risk_straddle_rewritten", hits, cohort: band.audit_cohort }));
        }
      }
    } catch (e) {
      console.warn("[cppa-risk RC-A A4] straddle lint error:", e);
    }

    // Doc O 3c-2(ii): non-fatal source_fields validation. Drop any
    // source_fields / field_ids value that is not a canonical intake
    // key. Never blocks. Logs invented-id counts for the July 13 review.
    try {
      validateSourceFields(
        report_data,
        ((row as any).intake_data as Record<string, unknown>) ?? {},
      );
    } catch (e) {
      console.warn("[cppa-risk v4] source_fields validator error:", e);
    }

    // Doc O R2: ensure the two new top-level keys are always present so
    // downstream renderers / graders can rely on their shape even when
    // the model omits them (additive defaults, never overwriting).
    if (!report_data.strengthen_items || !Array.isArray(report_data.strengthen_items)) {
      report_data.strengthen_items = [];
    }
    if (!report_data.record_sufficiency || typeof report_data.record_sufficiency !== "object") {
      report_data.record_sufficiency = { complete: false, statement: "" };
    }

    // Doc W: deterministic BELIEVED-routing enforcement (belt and braces —
    // the generator has already ignored rule 3a once). Non-fatal, no status
    // or metering writes (Doc F posture). Contradiction flags are never
    // touched by this pass; only strengthen_items and information_needed.
    try {
      const intake = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const assertions = (intake?.assertions ?? {}) as Record<string, { state?: string; basis?: string | null }>;
      const believedFields = new Set(
        Object.entries(assertions)
          .filter(([, v]) => v && v.state === "believed" && !!v.basis)
          .map(([k]) => k),
      );

      // 3b ENFORCE STRENGTHEN EXCLUSIVITY: remove any strengthen_items entry
      // whose field_ids contain NO believed-basis field. Empties the list on
      // legacy runs; logs each removal.
      const siBefore: any[] = Array.isArray(report_data.strengthen_items) ? report_data.strengthen_items : [];
      const siKept: any[] = [];
      for (const it of siBefore) {
        const fids: string[] = Array.isArray(it?.field_ids) ? it.field_ids : [];
        const anyBelieved = fids.some((f) => believedFields.has(f));
        if (anyBelieved) {
          siKept.push(it);
        } else {
          console.warn(`[cppa-risk Doc W] strengthen-exclusivity: removed entry item_id=${it?.item_id ?? "?"} field_ids=${JSON.stringify(fids)}`);
        }
      }
      report_data.strengthen_items = siKept;

      // 3a ENFORCE STRENGTHEN MEMBERSHIP: for every believed-basis field, if
      // no surviving strengthen_items entry references it, synthesize one.
      // Citation preference: the citation of any inconsistency_flags or
      // information_needed entry that references the field, else the R2
      // default "11 CCR 7152(a)".
      const findCitationForField = (f: string): string => {
        const flags: any[] = Array.isArray(report_data.inconsistency_flags) ? report_data.inconsistency_flags : [];
        for (const fl of flags) {
          const sf: string[] = Array.isArray(fl?.source_fields) ? fl.source_fields : [];
          if (sf.includes(f) && typeof fl?.regulatory_citation === "string" && fl.regulatory_citation.trim()) {
            return String(fl.regulatory_citation);
          }
        }
        const infos: any[] = Array.isArray(report_data.information_needed) ? report_data.information_needed : [];
        for (const inf of infos) {
          const sf: string[] = Array.isArray(inf?.source_fields) ? inf.source_fields : [];
          if ((sf.includes(f) || inf?.field === f) && typeof inf?.provision === "string" && inf.provision.trim()) {
            return String(inf.provision);
          }
        }
        return "11 CCR 7152(a)";
      };
      let nextIdx = report_data.strengthen_items.length + 1;
      const covered = new Set<string>();
      for (const it of report_data.strengthen_items) {
        for (const f of (it?.field_ids ?? [])) covered.add(f);
      }
      for (const f of believedFields) {
        if (covered.has(f)) continue;
        const basisToken = assertions[f]?.basis ?? "";
        const synth = {
          item_id: `S-${nextIdx++}`,
          citation: findCitationForField(f),
          field_ids: [f],
          recorded_basis: String(basisToken),
        };
        report_data.strengthen_items.push(synth);
        console.warn(`[cppa-risk Doc W] strengthen-membership: synthesized ${synth.item_id} for believed field ${f} (basis=${basisToken}, citation=${synth.citation})`);
      }

      // 3c INFORMATION_NEEDED SCRUB: remove any information_needed entry
      // whose `field` is a believed-basis field AND whose text asks to
      // verify/confirm/check/document the answer already given. Distinct
      // missing facts are preserved. Contradiction flags untouched.
      const verifyVerb = /\b(verify|verif(y|ies|ied|ication)|confirm(ed|ation|s)?|check(ed|s)?|validate(d|s)?|document(ed|ation|s)?)\b/i;
      const infoBefore: any[] = Array.isArray(report_data.information_needed) ? report_data.information_needed : [];
      const infoKept: any[] = [];
      for (const inf of infoBefore) {
        const f = String(inf?.field ?? "");
        if (believedFields.has(f)) {
          const blob = [inf?.dimensions, inf?.enables, inf?.provision]
            .filter((s) => typeof s === "string")
            .join(" ");
          if (verifyVerb.test(blob)) {
            console.warn(`[cppa-risk Doc W] info-scrub: removed information_needed entry field=${f} text=${JSON.stringify(String(inf?.dimensions ?? "").slice(0, 200))}`);
            continue;
          }
        }
        infoKept.push(inf);
      }
      report_data.information_needed = infoKept;
    } catch (e) {
      console.warn("[cppa-risk Doc W] BELIEVED-routing pass error:", e);
    }




    // QB11-5(b): an exception's missing_elements[] entry and flags[] entry must not be
    // exact duplicates — keep the missing_elements copy, drop the duplicate flag.
    function dedupeExceptionFlags(report: any): any {
      try {
        const arr = report?.exception_analysis;
        if (Array.isArray(arr)) {
          for (const ex of arr) {
            if (ex && Array.isArray(ex.flags) && Array.isArray(ex.missing_elements)) {
              const missing = new Set(ex.missing_elements.map((s: any) => String(s).trim().toLowerCase()));
              const before = ex.flags.length;
              ex.flags = ex.flags.filter((f: any) => !missing.has(String(f).trim().toLowerCase()));
              if (ex.flags.length !== before) console.warn(`[RISK] QB11-5(b): removed ${before - ex.flags.length} duplicate exception flag(s)`);
            }
          }
        }
      } catch (e) {
        console.error("[RISK] QB11-5(b) dedupe errored:", e);
      }
      return report;
    }
    report_data = dedupeExceptionFlags(report_data);

    // QB-P25 B3 — deterministic normaliser for strengthen_item_ids pointers,
    // adverse_effects enum coercion, and priority_actions rank uniqueness.
    // Pure post-processor; does not touch information_needed (frozen).
    try {
      const summary = normalizeRiskV2(report_data);
      if (summary.strippedIds || summary.droppedLikelihood || summary.droppedSeverity || summary.ranksRenumbered) {
        console.log("[RISK] qbp25-b3 normaliser summary:", summary);
      }
    } catch (e) {
      console.error("[RISK] qbp25-b3 normaliser errored:", e);
    }

    // REBUILD-RISK C6 — LABEL ACCURACY LINT: for each inconsistency_flags
    // entry, verify that each conflicting_inputs field name (source_fields
    // / intake_field_1 / intake_field_2) appears in the flag's own
    // narrative (description / resolution_required), OR that any field id
    // named in the narrative appears in source_fields. On mismatch, log a
    // non-fatal lint_warning ("w3_label_mismatch") — the flag is never
    // dropped. Mirrors the W3-A resolved-source strip pattern (try/catch,
    // no status effect).
    try {
      const flagsArr: any[] = Array.isArray((report_data as any)?.inconsistency_flags) ? (report_data as any).inconsistency_flags : [];
      const warnings: any[] = [];
      // Match canonical intake field ids like q1_revenue, q15c_spi_volume, i1_processing_purpose, etc.
      const FIELD_ID_RE = /\b(?:q\d+[a-z]?(?:_[a-z0-9_]+)?|i\d+[a-z]?(?:_[a-z0-9_]+)?|impact_intake(?:\.[a-z_]+)?|exceptions_intake(?:\.[a-z_]+)?)\b/gi;
      for (let idx = 0; idx < flagsArr.length; idx++) {
        const fl = flagsArr[idx];
        if (!fl || typeof fl !== "object") continue;
        const declared = new Set<string>();
        const push = (v: any) => { if (typeof v === "string" && v.trim()) declared.add(v.trim()); };
        push(fl.intake_field_1);
        push(fl.intake_field_2);
        if (Array.isArray(fl.source_fields)) for (const s of fl.source_fields) push(s);
        const narrative = [fl.description, fl.resolution_required].filter((s) => typeof s === "string").join(" ");
        const mentioned = new Set<string>();
        const m = narrative.match(FIELD_ID_RE);
        if (m) for (const t of m) mentioned.add(t);
        // Only lint when we have BOTH sides; empty narrative or empty declared is out of scope.
        if (declared.size === 0 || mentioned.size === 0) continue;
        // Symmetric membership check.
        const declaredArr = Array.from(declared);
        const mentionedArr = Array.from(mentioned);
        const declaredCovered = declaredArr.every((d) => mentionedArr.some((n) => n.toLowerCase().includes(d.toLowerCase()) || d.toLowerCase().includes(n.toLowerCase())));
        const mentionedCovered = mentionedArr.every((n) => declaredArr.some((d) => d.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(d.toLowerCase())));
        if (!declaredCovered || !mentionedCovered) {
          warnings.push({
            code: "w3_label_mismatch",
            index: idx,
            declared: declaredArr,
            narrative_field_ids: mentionedArr,
          });
          console.warn(`[RISK] REBUILD-RISK C6 w3_label_mismatch inconsistency_flags[${idx}]: declared=${JSON.stringify(declaredArr)} narrative=${JSON.stringify(mentionedArr)}`);
        }
      }
      if (warnings.length) {
        const meta: any = (report_data as any)._meta ?? ((report_data as any)._meta = {});
        const existing: any[] = Array.isArray(meta.lint_warnings) ? meta.lint_warnings : [];
        meta.lint_warnings = existing.concat(warnings);
      }
    } catch (e) {
      console.warn("[RISK] REBUILD-RISK C6 label-accuracy lint error:", e);
    }


    // QB12-4(a) v3 (Doc V Step 2): field-aware dedupe of the exception-citation
    // summary note. A "note occurrence" is any string containing both "1798.145"
    // and "under which" (whitespace-normalized).
    //   - The KEPT occurrence is the one inside priority_actions[] (the note's
    //     designed home). If no priority_actions occurrence exists, keep the first
    //     occurrence encountered by depth-first walk.
    //   - A duplicate inside any REFERENCE field (e.g. exception_analysis
    //     statutory_basis) is replaced with the self-contained POINTER constant
    //     below (the § 1798.145 citation text plus the 11 CCR §§ 7150–7157
    //     clarifier), per CORE-1.
    //   - A duplicate whose priority_actions[].action is ONLY the note (fewer than
    //     40 chars of substantive content remain after excision) means the action
    //     exists only to restate the note: DELETE the whole action entry (never
    //     leave a pointer-only action). An action that CONTAINS the note alongside
    //     real content has only the note text excised.
    // Structurally non-fatal: try/catch cannot change status or metering.
    function dedupeExceptionCitationNote(report: any): any {
      try {
        const POINTER = "Controlling statutory frame not documented in the record (see the claimed exception's pinned provision in the exception-citation summary note; the applicable frame is § 1798.140(e), § 1798.105(d), or § 1798.145(a)(1)(A)–(G) depending on the claim). Note: 11 CCR §§ 7150–7157 impose the documentation duty but do not create exceptions; the specific subparagraph of the pinned frame must be cited in the assessment record.";
        // REBUILD-RISK C10 — DEDUPE MATCHER: recognise the exception-
        // citation summary note whether it uses the legacy § 1798.145
        // frame or the frame-neutral § 1798.140(e) / § 1798.105(d)
        // framings introduced by W3-F3b.
        const isNote = (s: string) => {
          if (typeof s !== "string") return false;
          const n = s.replace(/\s+/g, " ").toLowerCase();
          const hasFrameCite = n.includes("1798.145") || n.includes("1798.140(e)") || n.includes("1798.105(d)");
          return hasFrameCite && n.includes("under which");
        };
        // Extract every note substring occurrence for excision (case-insensitive
        // match on the sentence around "1798.145 ... under which ...").
        const stripNoteText = (s: string): string => {
          // Remove sentences containing both markers; conservative: split on
          // sentence terminators, drop matching sentences, then normalise
          // doubled whitespace/punctuation.
          const parts = s.split(/(?<=[.!?])\s+/);
          const kept = parts.filter((p) => !isNote(p));
          let out = kept.join(" ").replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
          return out;
        };

        // Pass 1: locate the KEPT occurrence — prefer priority_actions.
        let keptRef: { container: any; key: string | number } | null = null;
        const actions = Array.isArray(report?.priority_actions) ? report.priority_actions : [];
        for (let i = 0; i < actions.length; i++) {
          const a = actions[i];
          if (a && typeof a === "object") {
            for (const k of Object.keys(a)) {
              if (typeof a[k] === "string" && isNote(a[k])) {
                keptRef = { container: a, key: k };
                break;
              }
            }
          }
          if (keptRef) break;
        }
        // Fallback: first occurrence anywhere.
        if (!keptRef) {
          const findFirst = (node: any): boolean => {
            if (!node) return false;
            if (Array.isArray(node)) { for (const v of node) if (findFirst(v)) return true; return false; }
            if (typeof node !== "object") return false;
            for (const k of Object.keys(node)) {
              const v = node[k];
              if (typeof v === "string" && isNote(v)) { keptRef = { container: node, key: k }; return true; }
              if (findFirst(v)) return true;
            }
            return false;
          };
          findFirst(report);
        }

        let pointerReplaced = 0;
        let actionDeleted = 0;
        let actionExcised = 0;

        // Pass 2a: walk priority_actions[] for duplicates — action-level logic.
        if (Array.isArray(report?.priority_actions)) {
          for (let i = report.priority_actions.length - 1; i >= 0; i--) {
            const a = report.priority_actions[i];
            if (!a || typeof a !== "object") continue;
            // Never touch the kept entry's action field.
            if (keptRef && keptRef.container === a) continue;
            // Only the .action field is a substantive directive; other fields
            // are references handled by pass 2b below.
            if (typeof a.action === "string" && isNote(a.action)) {
              const stripped = stripNoteText(a.action).replace(/\s+/g, "");
              if (stripped.length < 40) {
                report.priority_actions.splice(i, 1);
                actionDeleted += 1;
                console.warn(`[RISK] QB12-4(a) v3: deleted priority_actions[${i}] (pointer-only after note excision)`);
              } else {
                a.action = stripNoteText(a.action);
                actionExcised += 1;
                console.warn(`[RISK] QB12-4(a) v3: excised note from priority_actions[${i}].action`);
              }
            }
          }
        }

        // Pass 2b: walk everything else — reference fields get the short pointer.
        const walk = (node: any, path: string) => {
          if (!node) return;
          if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) walk(node[i], `${path}[${i}]`); return; }
          if (typeof node !== "object") return;
          for (const key of Object.keys(node)) {
            const val = node[key];
            if (typeof val === "string") {
              if (isNote(val)) {
                // Skip the kept occurrence.
                if (keptRef && keptRef.container === node && keptRef.key === key) continue;
                // Skip priority_actions[].action — already handled in pass 2a.
                if (path.startsWith(".priority_actions") && key === "action") continue;
                node[key] = POINTER;
                pointerReplaced += 1;
                console.warn(`[RISK] QB12-4(a) v3: replaced duplicate note at ${path}.${key} with pointer`);
              }
            } else {
              walk(val, `${path}.${key}`);
            }
          }
        };
        walk(report, "");

        if (pointerReplaced + actionDeleted + actionExcised > 0) {
          console.warn(`[RISK] QB12-4(a) v3 summary: pointer=${pointerReplaced} action_deleted=${actionDeleted} action_excised=${actionExcised}`);
        }
      } catch (e) {
        console.error("[RISK] QB12-4(a) v3 dedupe errored:", e);
      }
      return report;
    }
    report_data = dedupeExceptionCitationNote(report_data);

    // QB12-4(b) v2 (Doc V Step 3): [TO COMPLETE ...] placeholders are fill-in slots.
    // Surgical excision: remove ONLY the exception-citation note text (and any
    // resulting doubled whitespace/punctuation); keep the remaining prose so the
    // controller retains statutory context. Length cap becomes a fallback: if the
    // placeholder still exceeds 400 chars after excision, truncate at the end of
    // the first sentence (not at the bracket clause), reappending "]" if the
    // closing bracket was lost. Structurally non-fatal.
    function truncateToCompletePlaceholders(report: any): any {
      try {
        let excised = 0;
        let sentenceTruncated = 0;
        const PLACEHOLDER = /\[\s*TO\s+COMPLETE[^\]]*\]/i;
        // REBUILD-RISK C10 — frame-neutral note matcher (same as above).
        const isNote = (s: string) => {
          if (typeof s !== "string") return false;
          const n = s.replace(/\s+/g, " ").toLowerCase();
          const hasFrameCite = n.includes("1798.145") || n.includes("1798.140(e)") || n.includes("1798.105(d)");
          return hasFrameCite && n.includes("under which");
        };
        const stripNoteText = (s: string): string => {
          const parts = s.split(/(?<=[.!?])\s+/);
          const kept = parts.filter((p) => !isNote(p));
          return kept.join(" ").replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
        };
        const walk = (node: any, path: string) => {
          if (!node) return;
          if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) walk(node[i], `${path}[${i}]`); return; }
          if (typeof node !== "object") return;
          for (const key of Object.keys(node)) {
            const val = node[key];
            if (typeof val === "string") {
              if (!PLACEHOLDER.test(val)) continue;
              let out = val;
              // 3a: excise note text only, keep the rest.
              if (isNote(out)) {
                const stripped = stripNoteText(out);
                if (stripped !== out) {
                  out = stripped;
                  excised += 1;
                  console.warn(`[RISK] QB12-4(b) v2: excised note from ${path}.${key}`);
                }
              }
              // 3b: length fallback — truncate at first sentence end if still >400.
              if (out.length > 400) {
                const sentEnd = out.search(/(?<=[.!?])\s+/);
                let cut = sentEnd > 0 ? out.slice(0, sentEnd + 1).trim() : out.slice(0, 400).trim();
                // Reappend ] if the closing bracket was lost.
                if (cut.includes("[") && !cut.includes("]")) cut = cut + "]";
                if (cut !== out) {
                  out = cut;
                  sentenceTruncated += 1;
                  console.warn(`[RISK] QB12-4(b) v2: sentence-truncated ${path}.${key} (>400 chars post-excision)`);
                }
              }
              if (out !== val) node[key] = out;
            } else {
              walk(val, `${path}.${key}`);
            }
          }
        };
        walk(report, "");
        if (excised + sentenceTruncated > 0) {
          console.warn(`[RISK] QB12-4(b) v2 summary: excised=${excised} sentence_truncated=${sentenceTruncated}`);
        }
      } catch (e) {
        console.error("[RISK] QB12-4(b) v2 placeholder rework errored:", e);
      }
      return report;
    }
    report_data = truncateToCompletePlaceholders(report_data);


    // QB13-3(a): strip instruction-voice "Begin now:" from every report field EXCEPT
    // entries of priority_actions (where the imperative belongs). Same try/catch discipline
    // as QB11-5(b)/QB12-4(a).
    function stripBeginNowNonAction(report: any): any {
      try {
        if (!report || typeof report !== "object") return report;
        const paActions = new Set<any>();
        const pa = (report as any).priority_actions;
        if (Array.isArray(pa)) for (const e of pa) paActions.add(e);
        let stripped = 0;
        const walk = (node: any) => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) { for (const v of node) walk(v); return; }
          if (paActions.has(node)) return; // skip priority_actions entries entirely
          for (const key of Object.keys(node)) {
            const val = (node as any)[key];
            if (typeof val === "string") {
              const next = val.split("Begin now: ").join("").split("Begin now:").join("");
              if (next !== val) { (node as any)[key] = next; stripped += 1; }
            } else if (val && typeof val === "object") {
              walk(val);
            }
          }
        };
        walk(report);
        if (stripped > 0) console.warn("[RISK] QB13-3(a): stripped instruction-voice 'Begin now:' from a non-action field");
      } catch (e) {
        console.error("[RISK] QB13-3(a) strip errored:", e);
      }
      return report;
    }
    report_data = stripBeginNowNonAction(report_data);

    // CPPA-HF5 Task A — RENDER-PATH FIELD-ID SCRUB, FAIL-CLOSED.
    // Prior HF4 pass replaced only mapped IDs and let unmapped IDs render.
    // HF5 promotes this to a fail-closed rule: EVERY field-id-shaped token
    // in prose is replaced — mapped labels win; unmapped tokens fall
    // through to a generic "the corresponding intake field" replacement.
    // Anchor keys and URL substrings are exempt. Also promotes
    // w3_label_mismatch from lint-warning to render-time correction.
    function scrubRawFieldIdsInProse(root: any): { scrubbed: number; unmapped: number } {
      const ANCHOR_KEYS = new Set([
        "field", "source_fields", "field_ids",
        "intake_field_1", "intake_field_2",
        "citation_ids", "canonical_fields", "element_id",
      ]);
      // HF5 A(2) — extended label map. Each entry maps a field-id token
      // to human-readable prose. Order matters: more specific tokens are
      // listed first so partial-prefix matches (q19_admt vs q19_admt_description)
      // resolve correctly.
      const LABELS: Array<[RegExp, string]> = [
        [/\bi5_admt_logic\b/gi, "the ADMT logic description"],
        [/\bq19_admt_description\b/gi, "the ADMT-system description"],
        [/\bq20_admt_opt_out\b/gi, "the ADMT opt-out description"],
        [/\bq18[a-c]?_admt(?:_[a-z_]+)?\b/gi, "the ADMT trigger response"],
        [/\bi7_internal_contributors\b/gi, "the internal-contributors roster"],
        [/\bi1b_min_pi\b/gi, "the minimum-PI justification"],
        [/\bi1_processing_purpose\b/gi, "the processing purpose"],
        [/\bi2_retention_period\b/gi, "the recorded retention period"],
        [/\bi2_retention_detail\b/gi, "the recorded retention detail"],
        [/\bi2_retention_criteria\b/gi, "the recorded retention criteria"],
        [/\bi6_vendors\b/gi, "the vendor roster"],
        [/\bq15c_spi_volume\b/gi, "the sensitive-PI volume figure"],
        [/\bq1_revenue\b/gi, "the recorded revenue"],
        [/\bimpact_intake(?:\.[a-z_]+)?\b/gi, "the impact-assessment record"],
        [/\bexceptions_intake(?:\.[a-z_]+)?\b/gi, "the exceptions record"],
        [/\bsource_fields\b/g, "the record fields"],
      ];
      // HF5 A(1) — fail-closed catch-all. Field-id token shape:
      // 1–3 lowercase letters, optional digits, optional single letter,
      // underscore, then a lowercase word body. Mirrors intake conventions
      // (q1_revenue, i2_retention_period, q15c_spi_volume, impact_intake).
      // URLs are exempted below.
      // Field-id token shape: 1–3 lowercase letters, 1–3 digits (required —
      // avoids false positives like "opt_out", "risk_assessment"), optional
      // single trailing letter, underscore, then a lowercase word body.
      const CATCHALL = /\b[a-z]{1,3}\d{1,3}[a-z]?_[a-z][a-z0-9_]{2,}\b/g;
      const URL_RE = /https?:\/\/[^\s)]+/g;

      const scrubString = (s: string): { out: string; hits: number; unmapped: number } => {
        // Protect URLs by extracting them out, scrubbing the rest, and
        // stitching them back. Legitimate paths (cppa.ca.gov/regulations/
        // pdf/…) must never be mangled.
        const urls: string[] = [];
        const withHoles = s.replace(URL_RE, (u) => { urls.push(u); return `\u0000URL${urls.length - 1}\u0000`; });
        let hits = 0;
        let next = withHoles;
        for (const [re, sub] of LABELS) {
          next = next.replace(re, (m) => { hits++; return sub; });
        }
        // Catch-all pass for any residual field-id-shaped tokens.
        let unmapped = 0;
        next = next.replace(CATCHALL, (m) => {
          unmapped++;
          hits++;
          return "the corresponding intake field";
        });
        // Restore URLs.
        next = next.replace(/\u0000URL(\d+)\u0000/g, (_m, i) => urls[Number(i)] ?? "");
        return { out: next, hits, unmapped };
      };

      let scrubbed = 0;
      let unmapped = 0;
      const walk = (node: any) => {
        if (!node) return;
        if (Array.isArray(node)) { for (const v of node) walk(v); return; }
        if (typeof node !== "object") return;
        for (const key of Object.keys(node)) {
          const val = node[key];
          if (ANCHOR_KEYS.has(key)) continue;
          if (typeof val === "string") {
            const { out, hits, unmapped: u } = scrubString(val);
            if (hits > 0) { node[key] = out; scrubbed += hits; unmapped += u; }
          } else if (val && typeof val === "object") {
            walk(val);
          }
        }
      };
      try { walk(root); } catch (_) { /* non-fatal */ }
      return { scrubbed, unmapped };
    }
    try {
      const { scrubbed, unmapped } = scrubRawFieldIdsInProse(report_data);
      if (scrubbed > 0) {
        console.warn(`[RISK] CPPA-HF5 A: render-path scrubbed ${scrubbed} field-id occurrence(s) in prose (unmapped catch-all: ${unmapped})`);
        const meta: any = (report_data as any)._meta ?? ((report_data as any)._meta = {});
        meta.hf5_render_scrub = { scrubbed, unmapped };
      }
    } catch (_) { /* non-fatal */ }

    // W6-RISK-FIX (2026-07-24) — intake-state discipline, (b)(4)/(b)(5)
    // de-bundling, and § 7150(b)(N) subsection-consistency sweep.
    // Fail-open; runs immediately before the _meta stamp so counters are
    // captured on the report.
    try {
      const _intakeForFix = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const { counters: _w6rc } = applyW6RiskFix(report_data, _intakeForFix);
      if ((_w6rc.intake_state_rewrites + _w6rc.bundled_pairs_debundled + _w6rc.subsection_normalized) > 0) {
        console.warn(`[RISK] W6-RISK-FIX applied: intake_state=${_w6rc.intake_state_rewrites} debundled=${_w6rc.bundled_pairs_debundled} normalized=${_w6rc.subsection_normalized} scanned=${_w6rc.scanned_string_nodes}`);
      }
      (report_data as any)._w6_risk_fix = _w6rc;
    } catch (e) { console.error("[RISK] W6-RISK-FIX errored (fail-open):", e); }

    // W9-RISK-SLOTS (TURN 1a) — deterministic reprojection of the three typed
    // slots (attestation_block, submission_summary, risk_register) + pre-emit
    // validation. Any model-emitted values for these three keys are overwritten
    // by the deterministic reprojection. Validation is non-blocking (counters
    // are attached under _meta.w9_risk_slots) — deploy-time defects surface via
    // the counter, not by aborting the write; the CI unit test enforces the
    // structural contract at build time.
    try {
      const _intakeForSlots = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const { attached, validation } = attachW9RiskSlots(report_data as any, _intakeForSlots);
      (report_data as any)._w9_risk_slots = {
        stamp: W9_RISK_SLOTS_STAMP,
        attached,
        ok: validation.ok,
        errors: validation.errors,
        warnings: validation.warnings,
      };
      if (!validation.ok) {
        console.warn(`[RISK] W9-RISK-SLOTS validator flagged ${validation.errors.length} defect(s): ${validation.errors.join("; ")}`);
      } else {
        console.log(`[RISK] W9-RISK-SLOTS attached ${attached.join(",")} (clean)`);
      }
    } catch (e) { console.error("[RISK] W9-RISK-SLOTS errored (fail-open):", e); }

    // W10-RISK-B1 (TURN B) — field-provenance validation for
    // inconsistency_flags + claims guard over risk_register / executive_summary.
    // Runs AFTER W9 slots so the deterministic risk_register reprojection is
    // the target of the claims guard.
    try {
      const _intakeForB1 = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const { counters: _b1c } = applyW10RiskB1(report_data as any, _intakeForB1);
      (report_data as any)._w10_risk_b1 = { stamp: W10_RISK_B1_STAMP, ...(_b1c as any) };
      // W19 TURN B — telemetry sequestered under _meta.internal.risk_b1
      // (mirrors top-level _w10_risk_b1 which the _w<digits>_* strip
      // already removes from customer output). The new counter
      // `d2b1_reconciliation_suppressed_by_ledger` is the sole hook the
      // future LEAK-PREV-P4 over-enforcement demotion loop will read.
      try {
        const _rd: any = report_data;
        const _meta = (_rd._meta && typeof _rd._meta === "object") ? _rd._meta : (_rd._meta = {});
        const _internal = (_meta.internal && typeof _meta.internal === "object") ? _meta.internal : (_meta.internal = {});
        _internal.risk_b1 = { stamp: W10_RISK_B1_STAMP, ..._b1c };
      } catch { /* fail-open */ }
      if (_b1c.flags_rekeyed + _b1c.flags_dropped + _b1c.claims_downgraded + _b1c.d2b1_reconciliation_suppressed_by_ledger > 0) {
        console.warn(`[RISK] W10-RISK-B1 rekey=${_b1c.flags_rekeyed} drop=${_b1c.flags_dropped} claims_downgraded=${_b1c.claims_downgraded} d2b1_suppressed_by_ledger=${_b1c.d2b1_reconciliation_suppressed_by_ledger}`);
      }
    } catch (e) { console.error("[RISK] W10-RISK-B1 errored (fail-open):", e); }

    // ── S-B INTAKE-FACT-LEDGER (sb-fl-w1) wiring — pre-VA-stamp ──
    // Blocks wave-15 unsupported-positive / contradiction / negative-from-
    // silence classes on the same client-fact surfaces the VA stamp walks.
    // ORDER: after W6/W9/W10 retro-audit scrubs; BEFORE the w15 risk_va L1
    // citation stamp pass so stamps attach to final (rewritten) claim text.
    // Fail-open. Telemetry sequestered under _meta.internal.fact_ledger only.
    try {
      const _intakeForFL = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const ledger = buildFactLedger(_intakeForFL);
      const NEG_RE = /\b(no|none|not|never|absence of|does not|is not|are not|without)\b/i;
      const pickText = (o: any): string => {
        if (!o || typeof o !== "object") return "";
        // W16-HOTFIX: `harm_type` REMOVED from the pickText/setText
        // surface. It is an enum-like structured field (risk_register
        // entries) — template caveats must never overwrite its
        // controlled vocabulary. Any rewrite lands on the entry's
        // narrative field instead.
        return String(
          o.description ?? o.text ?? o.action ?? o.statement ??
            o.title ?? o.note ?? o.rationale ?? o.detail ?? "",
        );
      };
      const pickField = (o: any, text?: string): string | undefined => {
        if (!o || typeof o !== "object") return undefined;
        const f = o.field ?? o.intake_field_1 ??
          (Array.isArray(o.source_fields) && o.source_fields[0]);
        if (typeof f === "string" && f.trim()) return f.trim();
        // W21-RISK-TURNA A1 — infer field from prose tokens so
        // contradictions on anchor-less claims are still blockable.
        return typeof text === "string" ? attributeFieldByToken(text) : undefined;
      };
      const setText = (o: any, next: string): void => {
        if (!o || typeof o !== "object") return;
        for (const k of ["description", "text", "action", "statement", "title", "note", "rationale", "detail"]) {
          if (typeof o[k] === "string" && o[k]) { o[k] = next; return; }
        }
      };
      const claims: Array<{ text: string; field?: string; direction: "positive" | "negative"; surfacePath?: string; needle?: string; __ref?: any }> = [];
      const scan = (arr: any, path: string): void => {
        if (!Array.isArray(arr)) return;
        arr.forEach((it, i) => {
          const text = pickText(it);
          if (!text) return;
          const field = pickField(it, text);
          const direction: "positive" | "negative" = NEG_RE.test(text) ? "negative" : "positive";
          // Needle for cross-attribution: first quoted phrase, if any.
          const q = text.match(/["“]([^"”]{6,120})["”]/);
          const needle = q ? q[1] : undefined;
          claims.push({ text, field, direction, surfacePath: `${path}[${i}]`, needle, __ref: it });
        });
      };
      const r0: any = report_data;
      scan(r0.information_needed, "information_needed");
      scan(r0.strengthen_items, "strengthen_items");
      scan(r0.inconsistency_flags, "inconsistency_flags");
      scan(r0.top_3_actions, "top_3_actions");
      scan(r0.top_actions, "top_actions");
      if (r0.risk_register && typeof r0.risk_register === "object") {
        scan(r0.risk_register.entries, "risk_register.entries");
      }
      const sa: any = r0.scope_analysis ?? r0.trigger_analysis;
      if (sa && typeof sa === "object") {
        const text = pickText(sa);
        if (text) {
          const field = pickField(sa, text);
          const direction: "positive" | "negative" = NEG_RE.test(text) ? "negative" : "positive";
          claims.push({ text, field, direction, surfacePath: "scope_analysis", __ref: sa });
        }
      }
      const flRes = enforceLedger(r0, ledger, { claims: claims.map(({ __ref, ...c }) => c) });
      // Apply rewrites to surface entries (D2-mirror phrasing sourced from module).
      for (const rw of flRes.rewrites) {
        const src = claims.find((c) => c.surfacePath === rw.surfacePath && c.text === rw.from);
        if (src && src.__ref) setText(src.__ref, rw.to);
      }
      console.log(JSON.stringify({
        evt: "fact_ledger_pass", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, version: FACT_LEDGER_VERSION,
        ledger_rows: ledger.length, ...flRes.counters,
      }));
    } catch (e) {
      console.warn("[RISK] S-B fact-ledger errored (fail-open):", (e as Error)?.message);
    }

    // ── W15 RISK-REGISTRY-WIRING — L1 REGISTRY-STAMPED CITATIONS pass ──
    // Walks every finding/entry that emitted a proposition_key and stamps
    // citation + subsection + verbatim_quote from RISK_VERIFIED_AUTHORITIES.
    // Runs AFTER W6/W9/W10 so it sees the final registry-facing shape.
    // Also flags any bare "§ 7150(b)" survivor (subsection-collapse guard).
    // Fail-open: all telemetry lands under report_data._meta.internal.risk_va;
    // never mutates a top-level customer key with an underscore prefix.
    try {
      const vaMetrics = {
        va_version: RISK_VERIFIED_AUTHORITY_VERSION,
        va_rows: vaRegistrySize(RISK_VERIFIED_AUTHORITIES),
        va_stamps_applied: 0,
        va_stamps_unresolved: 0,
        va_subsection_collapse_flagged: 0,
        va_information_needed_added: 0,
        va_prose_collapse_rewritten: 0,
        va_prose_doubled_deduped: 0,
        va_statutory_basis_flagged: 0,
        va_prose_fields_scanned: 0,
        va_cite_fields_flagged: 0,
        buckets_scanned: 0,
      };
      const stampEntry = (it: any): boolean => {
        if (!it || typeof it !== "object") return false;
        let stamped = false;
        const pk = typeof it.proposition_key === "string" ? it.proposition_key.trim() : "";
        if (pk) {
          const row = resolveByPropositionKey(RISK_VERIFIED_AUTHORITIES, pk);
          if (row) {
            it.citation = row.subsection;
            it.verbatim_quote = row.verbatim_quote;
            vaMetrics.va_stamps_applied++;
            stamped = true;
          } else {
            it.citation = "";
            it.information_needed = true;
            vaMetrics.va_stamps_unresolved++;
            vaMetrics.va_information_needed_added++;
          }
        }
        const cit = typeof it.citation === "string" ? it.citation : "";
        if (cit && !stamped) {
          const hasPredicate = /\(b\)\s*\(\s*\d/.test(cit);
          const bareCollapse = /(?:11\s*CCR\s*)?§\s*7150\(b\)/i;
          const doubledCollapse = /§\s*7150\(b\)[^§]{0,60}§\s*7150\(b\)/i;
          if (doubledCollapse.test(cit)) {
            it.citation = "";
            it.information_needed = true;
            vaMetrics.va_subsection_collapse_flagged++;
            vaMetrics.va_information_needed_added++;
          } else if (bareCollapse.test(cit) && !hasPredicate) {
            it.citation = "";
            it.information_needed = true;
            vaMetrics.va_subsection_collapse_flagged++;
            vaMetrics.va_information_needed_added++;
          }
        }
        return stamped;
      };
      const walkBucket = (arr: any): void => {
        if (!Array.isArray(arr)) return;
        vaMetrics.buckets_scanned++;
        for (const it of arr) stampEntry(it);
      };

      // W16 RISK-COLLAPSE-COVERAGE — prose-surface deterministic pass.
      // Doubled bare "§ 7150(b) … § 7150(b)" repeats within one sentence
      // (no intervening pinpoint) collapse to a single reference. Bare
      // "§ 7150(b)" with no (b)(N) pinpoint is PERMITTED only when the same
      // sentence carries a textual trigger description (W6-RISK-FIX(3)
      // permitted form). Otherwise the token is rewritten to the plain-
      // English element name "the § 7150(b) trigger analysis" (CPPA-HF2 B).
      // Where the sentence asserts a specific trigger without a pinpoint,
      // additionally route an information_needed entry naming the under-
      // specified trigger. Pinpointed cites are untouched. Never fabricate.
      const TRIGGER_KW = /\b(sell|shar(?:e|ing)|target(?:ed|ing)?\s+ad|sensitive|profil|admt|automated\s+decision|train(?:ing)?|biometric|infer|systematic\s+observation|location|worker|student|applicant|monitor)/i;
      const DOUBLED_BARE = /(§\s*7150\(b\)(?!\s*\(\s*\d))([^§]{1,60}?)(§\s*7150\(b\)(?!\s*\(\s*\d))/g;
      const BARE_B_TOKEN = /§\s*7150\(b\)(?!\s*\(\s*\d)/g;
      const PINPOINT_ANY = /§\s*7150\(b\)\s*\(\s*\d/;
      const infoNeededAdds: any[] = [];
      const rewriteProse = (s: any, fieldAnchor: string): any => {
        if (typeof s !== "string" || !s) return s;
        let out = s;
        let prev = "";
        while (prev !== out) {
          prev = out;
          out = out.replace(DOUBLED_BARE, (_m, a, mid, _b) => {
            vaMetrics.va_prose_doubled_deduped++;
            return `${a}${mid}`;
          });
        }
        out = out.replace(/[^.!?]+[.!?]?/g, (sent) => {
          BARE_B_TOKEN.lastIndex = 0;
          if (!BARE_B_TOKEN.test(sent)) return sent;
          BARE_B_TOKEN.lastIndex = 0;
          const hasTrigger = TRIGGER_KW.test(sent);
          const hasPinpoint = PINPOINT_ANY.test(sent);
          if (hasTrigger && !hasPinpoint) {
            const kw = sent.match(TRIGGER_KW)?.[0] ?? "the § 7150(b) trigger";
            infoNeededAdds.push({
              field: fieldAnchor,
              dimensions: `the specific § 7150(b) subsection (§ 7150(b)(1)–(6)) that applies to the "${kw}" trigger asserted in prose without a pinpoint`,
              provision: "11 CCR § 7150(b)",
              enables: "scope_and_triggers pinpoint identification",
              source_fields: [fieldAnchor],
            });
            vaMetrics.va_information_needed_added++;
          }
          if (hasTrigger) return sent; // permitted W6-RISK-FIX(3) form
          return sent.replace(BARE_B_TOKEN, () => {
            vaMetrics.va_prose_collapse_rewritten++;
            return "the § 7150(b) trigger analysis";
          });
        });
        return out;
      };

      const r: any = report_data;
      walkBucket(r.information_needed);
      walkBucket(r.strengthen_items);
      walkBucket(r.inconsistency_flags);
      walkBucket(r.top_3_actions);
      walkBucket(r.top_actions);
      if (r.risk_register && typeof r.risk_register === "object") {
        walkBucket(r.risk_register.entries);
      }
      // W16 KEY-MISMATCH FIX: schema key is `scope_and_triggers`; keep
      // aliases for defensive coverage of legacy shapes.
      const sat: any = r.scope_and_triggers ?? r.scope_analysis ?? r.trigger_analysis;
      if (sat && typeof sat === "object") {
        stampEntry(sat);
        if (Array.isArray(sat.triggered_activities_detail)) {
          vaMetrics.buckets_scanned++;
          for (const activity of sat.triggered_activities_detail) {
            if (!activity || typeof activity !== "object") continue;
            stampEntry(activity);
            // statutory_basis on activity: apply W15 bare/doubled collapse
            // semantics — blank + information_needed on bare/doubled forms.
            const sb = typeof activity.statutory_basis === "string" ? activity.statutory_basis : "";
            if (sb) {
              const hasPin = /\(b\)\s*\(\s*\d/.test(sb);
              const bare = /(?:11\s*CCR\s*)?§\s*7150\(b\)/i;
              const doubled = /§\s*7150\(b\)[^§]{0,60}§\s*7150\(b\)/i;
              if (doubled.test(sb) || (bare.test(sb) && !hasPin)) {
                activity.statutory_basis = "";
                activity.information_needed = true;
                vaMetrics.va_statutory_basis_flagged++;
                vaMetrics.va_information_needed_added++;
              }
            }
            if (typeof activity.assessment_required_rationale === "string") {
              activity.assessment_required_rationale = rewriteProse(
                activity.assessment_required_rationale,
                "scope_and_triggers.triggered_activities_detail[].assessment_required_rationale",
              );
            }
          }
        }
        if (typeof sat.scope_notes === "string") {
          sat.scope_notes = rewriteProse(sat.scope_notes, "scope_and_triggers.scope_notes");
        }
      }

      // W18 RISK-COLLAPSE-COVERAGE-2 — extended prose/cite coverage across the
      // remaining narrative and citation-shaped surfaces of the terminal report.
      // Wave-17 escape: bare "§ 7150(b) … § 7150(b)" collapsed on
      // inconsistency_flags prose (doc 52dfb9a1). This pass closes the class by
      // walking every prose / citation-shaped slot in the report shape and
      // applying identical semantics to the scope_notes pass (W16 above):
      //   - prose strings: doubled bare → deduped; bare-without-pinpoint routed
      //     to information_needed when a trigger keyword is present, otherwise
      //     rewritten to plain-English form (CPPA-HF2 B); pinpointed cites pass
      //     through untouched.
      //   - citation-shaped strings (statutory_basis, regulatory_citation,
      //     provision): bare/doubled → blanked + information_needed=true on the
      //     entry (identical to the W15 activity-level statutory_basis gate).
      // Fail-open, per-entry try/catch, no customer-surface underscore keys.
      const rewriteProseFields = (
        arr: any,
        fields: string[],
        anchorPrefix: string,
      ): void => {
        if (!Array.isArray(arr)) return;
        for (let i = 0; i < arr.length; i++) {
          const it = arr[i];
          if (!it || typeof it !== "object") continue;
          for (const f of fields) {
            try {
              if (typeof it[f] === "string" && it[f]) {
                vaMetrics.va_prose_fields_scanned++;
                it[f] = rewriteProse(it[f], `${anchorPrefix}[${i}].${f}`);
              }
            } catch { /* per-field fail-open */ }
          }
        }
      };
      const flagCiteField = (entry: any, field: string): void => {
        try {
          if (!entry || typeof entry !== "object") return;
          const raw = typeof entry[field] === "string" ? entry[field] : "";
          if (!raw) return;
          const hasPin = /\(b\)\s*\(\s*\d/.test(raw);
          const bare = /(?:11\s*CCR\s*)?§\s*7150\(b\)/i;
          const doubled = /§\s*7150\(b\)[^§]{0,60}§\s*7150\(b\)/i;
          if (doubled.test(raw) || (bare.test(raw) && !hasPin)) {
            entry[field] = "";
            entry.information_needed = true;
            vaMetrics.va_cite_fields_flagged++;
            vaMetrics.va_information_needed_added++;
          }
        } catch { /* per-field fail-open */ }
      };
      const walkCiteFields = (arr: any, fields: string[]): void => {
        if (!Array.isArray(arr)) return;
        for (const it of arr) {
          for (const f of fields) flagCiteField(it, f);
        }
      };

      // inconsistency_flags — WAVE-17 ESCAPE (doc 52dfb9a1). Prose slots:
      // description, resolution_required. Citation-shaped: regulatory_citation.
      rewriteProseFields(
        r.inconsistency_flags,
        ["description", "resolution_required"],
        "inconsistency_flags",
      );
      walkCiteFields(r.inconsistency_flags, ["regulatory_citation"]);

      // exception_analysis — prose: facts_supporting, argument_strength_rationale;
      // cite-shaped: statutory_basis.
      rewriteProseFields(
        r.exception_analysis,
        ["facts_supporting", "argument_strength_rationale"],
        "exception_analysis",
      );
      walkCiteFields(r.exception_analysis, ["statutory_basis"]);

      // risk_assessment_by_activity — prose: purpose, benefits_to_business,
      // benefits_to_consumers, current_safeguards, safeguard_gaps,
      // benefits_outweigh_risks_rationale, section_7152_mapping;
      // cite-shaped: statutory_basis; nested adverse_effects[].description.
      rewriteProseFields(
        r.risk_assessment_by_activity,
        [
          "purpose",
          "benefits_to_business",
          "benefits_to_consumers",
          "current_safeguards",
          "safeguard_gaps",
          "benefits_outweigh_risks_rationale",
          "section_7152_mapping",
        ],
        "risk_assessment_by_activity",
      );
      walkCiteFields(r.risk_assessment_by_activity, ["statutory_basis"]);
      if (Array.isArray(r.risk_assessment_by_activity)) {
        for (let i = 0; i < r.risk_assessment_by_activity.length; i++) {
          const ra = r.risk_assessment_by_activity[i];
          if (!ra || typeof ra !== "object") continue;
          rewriteProseFields(
            ra.adverse_effects,
            ["description"],
            `risk_assessment_by_activity[${i}].adverse_effects`,
          );
        }
      }

      // priority_actions — prose: action, deadline_basis; cite-shaped: statutory_basis.
      rewriteProseFields(
        r.priority_actions,
        ["action", "deadline_basis"],
        "priority_actions",
      );
      walkCiteFields(r.priority_actions, ["statutory_basis"]);

      // information_needed — prose: dimensions, enables; cite-shaped: provision.
      rewriteProseFields(
        r.information_needed,
        ["dimensions", "enables"],
        "information_needed",
      );
      walkCiteFields(r.information_needed, ["provision"]);

      // record_sufficiency — prose: statement.
      if (r.record_sufficiency && typeof r.record_sufficiency === "object" && typeof r.record_sufficiency.statement === "string") {
        try {
          vaMetrics.va_prose_fields_scanned++;
          r.record_sufficiency.statement = rewriteProse(
            r.record_sufficiency.statement,
            "record_sufficiency.statement",
          );
        } catch { /* fail-open */ }
      }

      // strengthen_items — prose: recorded_basis; cite-shaped: citation.
      rewriteProseFields(
        r.strengthen_items,
        ["recorded_basis"],
        "strengthen_items",
      );
      walkCiteFields(r.strengthen_items, ["citation"]);

      // risk_register.entries — cite-shaped: statutory_basis (activity/harm_type
      // are enum-like and out-of-scope for prose collapse).
      if (r.risk_register && typeof r.risk_register === "object") {
        walkCiteFields(r.risk_register.entries, ["statutory_basis"]);
      }

      // assessment_summary — prose: corpus_enforcement_note; also flatten a
      // top-level triggered_activities string array.
      if (r.assessment_summary && typeof r.assessment_summary === "object") {
        try {
          if (typeof r.assessment_summary.corpus_enforcement_note === "string") {
            vaMetrics.va_prose_fields_scanned++;
            r.assessment_summary.corpus_enforcement_note = rewriteProse(
              r.assessment_summary.corpus_enforcement_note,
              "assessment_summary.corpus_enforcement_note",
            );
          }
          if (Array.isArray(r.assessment_summary.triggered_activities)) {
            r.assessment_summary.triggered_activities = r.assessment_summary.triggered_activities.map(
              (s: any, i: number) => (typeof s === "string" && s
                ? (vaMetrics.va_prose_fields_scanned++, rewriteProse(s, `assessment_summary.triggered_activities[${i}]`))
                : s),
            );
          }
        } catch { /* fail-open */ }
      }

      // enforcement_context — prose slots.
      if (r.enforcement_context && typeof r.enforcement_context === "object") {
        for (const f of ["relevant_precedents", "sector_specific_patterns", "audit_division_priorities"]) {
          try {
            if (typeof r.enforcement_context[f] === "string" && r.enforcement_context[f]) {
              vaMetrics.va_prose_fields_scanned++;
              r.enforcement_context[f] = rewriteProse(
                r.enforcement_context[f],
                `enforcement_context.${f}`,
              );
            }
          } catch { /* fail-open */ }
        }
      }

      // Fold prose-detected info_needed adds into the report bucket.
      if (infoNeededAdds.length > 0) {
        const existing = Array.isArray(r.information_needed) ? r.information_needed : [];
        r.information_needed = [...existing, ...infoNeededAdds];
      }

      // Persist telemetry under _meta.internal (C1-strip compatible).
      const meta = (r._meta = r._meta && typeof r._meta === "object" ? r._meta : {});
      const internal = (meta.internal = meta.internal && typeof meta.internal === "object" ? meta.internal : {});
      internal.risk_va = { build_stamp: BUILD_STAMP, ...vaMetrics };
      console.log(JSON.stringify({
        evt: "_w15_risk_va_wire", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, ...vaMetrics,
      }));
    } catch (e) {
      console.warn("[RISK] W15/W16 RISK-REGISTRY-WIRING failed (non-fatal):", (e as Error)?.message);
    }

    // W18-RISK-VOCABSCRUB — deterministic post-emit scrub of raw intake
    // field-id tokens leaking into customer-facing prose (wave-17 doc
    // 17c0aa18: inconsistency_flags[].description). Runs AFTER the W15/W16
    // VA-stamp / registry pass and BEFORE freezeOpenItemsOnFirstRun so
    // information_needed prose is scrubbed before it is frozen. Anchor keys
    // (source_fields, field, intake_field_1/2, provision) are skipped so
    // structured technical anchors are preserved. Fail-open.
    try {
      const vocabMetrics = newVocabScrubMetrics();
      scrubReportVocab(report_data, vocabMetrics);
      const rd: any = report_data;
      const meta = (rd._meta = rd._meta && typeof rd._meta === "object" ? rd._meta : {});
      const internal = (meta.internal = meta.internal && typeof meta.internal === "object" ? meta.internal : {});
      internal.risk_vocab_scrub = { build_stamp: W18_RISK_VOCABSCRUB_STAMP, ...vocabMetrics };
      console.log(JSON.stringify({
        evt: "_w18_risk_vocabscrub", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, vocab_scrub_stamp: W18_RISK_VOCABSCRUB_STAMP,
        ...vocabMetrics,
      }));
    } catch (e) {
      console.warn("[RISK] W18-RISK-VOCABSCRUB failed (non-fatal):", (e as Error)?.message);
    }

    // W20-RISK-TURNB — terminal deterministic sanitizers (B2/B3/B5/B6).
    // Runs AFTER W18 vocab scrub and BEFORE freeze/emit-gate so scrubbed
    // prose is what freezes. B1 (§ 7121(a) cohort) is a docs-ledger flag;
    // B4 is the widened D2 regex in _w10_risk_b1.ts.
    try {
      const { counters: _w20c, report: _w20r } = applyW20RiskTurnB(report_data as any);
      report_data = _w20r as any;
      const rd: any = report_data;
      const meta = (rd._meta = rd._meta && typeof rd._meta === "object" ? rd._meta : {});
      const internal = (meta.internal = meta.internal && typeof meta.internal === "object" ? meta.internal : {});
      internal.risk_w20b = { stamp: W20_RISK_TURNB_STAMP, ..._w20c };
      console.log(JSON.stringify({
        evt: "_w20_risk_turnb", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, w20_stamp: W20_RISK_TURNB_STAMP, ..._w20c,
      }));
    } catch (e) {
      console.warn("[RISK] W20-RISK-TURNB failed (non-fatal):", (e as Error)?.message);
    }

    // W21-RISK-TURNA — A1 contradiction-attribution rewrite via fact-
    // ledger token-inference (wired into scanner above), A2 § 7121(a)(3)
    // cohort emitter, A3 internal-fragment leak scrub, A4 info_needed
    // self-contradiction filter. Runs AFTER W20 so prose scrubs and the
    // cohort emission both freeze into the terminal payload. A5
    // build-stamp echo attaches under _meta.internal.risk_w21a; the
    // LEAK-PREV-P2 serializer preserves _meta.internal unmodified.
    try {
      const _intakeW21 = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const _ledgerW21 = buildFactLedger(_intakeW21);
      const { counters: _w21c, report: _w21r } = applyW21RiskTurnA(
        report_data as any,
        { intake: _intakeW21, ledger: _ledgerW21 },
      );
      report_data = _w21r as any;
      const rd21: any = report_data;
      const meta21 = (rd21._meta = rd21._meta && typeof rd21._meta === "object" ? rd21._meta : {});
      const internal21 = (meta21.internal = meta21.internal && typeof meta21.internal === "object" ? meta21.internal : {});
      internal21.risk_w21a = { stamp: W21_RISK_TURNA_STAMP, ..._w21c };
      console.log(JSON.stringify({
        evt: "_w21_risk_turna", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, w21_stamp: W21_RISK_TURNA_STAMP, ..._w21c,
      }));
    } catch (e) {
      console.warn("[RISK] W21-RISK-TURNA failed (non-fatal):", (e as Error)?.message);
    }

    // W22-RISK-TURNA — wave-22 closers (P1 info-needed placeholder scrub,
    // P2 § 7150(b) subsection pinpoint discipline, P3 scope_notes fact-
    // ledger contradiction downgrade, P4 risk_register safeguards dedup).
    // Runs LAST in the deterministic scrub chain so all upstream prose
    // rewrites are what freeze into the terminal payload. Counters at
    // _meta.internal.risk_w22a; the LEAK-PREV-P2 serializer preserves
    // _meta.internal unmodified so no whitelist change is needed.
    try {
      const _intakeW22 = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const _ledgerW22 = buildFactLedger(_intakeW22);
      const { counters: _w22c, report: _w22r } = applyW22RiskTurnA(
        report_data as any,
        { intake: _intakeW22, ledger: _ledgerW22 },
      );
      report_data = _w22r as any;
      const rd22: any = report_data;
      const meta22 = (rd22._meta = rd22._meta && typeof rd22._meta === "object" ? rd22._meta : {});
      const internal22 = (meta22.internal = meta22.internal && typeof meta22.internal === "object" ? meta22.internal : {});
      internal22.risk_w22a = { stamp: W22_RISK_TURNA_STAMP, ..._w22c };
      console.log(JSON.stringify({
        evt: "_w22_risk_turna", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, w22_stamp: W22_RISK_TURNA_STAMP, ..._w22c,
      }));
    } catch (e) {
      console.warn("[RISK] W22-RISK-TURNA failed (non-fatal):", (e as Error)?.message);
    }

    // ── WAVE23-FIX TURN B (cppa-risk) ────────────────────────────────
    // Item 71 / FINDING B: internal-note (customer-messages
    // `ir.intake_mismatch_generic` + near-variants) leaked into
    // safeguard_gaps and sibling free-text emitters (mitigation_gaps,
    // open_items, *_gaps, *_notes); also normalizes ".." splice debris.
    // Fact-ledger consulted so intake-supported claims are preserved.
    // Runs AFTER W22 turnA and BEFORE the LEAK-PREV P1 emit gate.
    // Stamp echoes at _meta.internal.risk_w23b; LEAK-PREV-P2 serializer
    // preserves _meta.internal unmodified (item-32 gate).
    try {
      const _intakeW23 = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const _ledgerW23 = buildFactLedger(_intakeW23);
      const { counters: _w23c, report: _w23r } = applyW23RiskTurnB(
        report_data as any,
        { intake: _intakeW23, ledger: _ledgerW23 },
      );
      report_data = _w23r as any;
      const rd23: any = report_data;
      const meta23 = (rd23._meta = rd23._meta && typeof rd23._meta === "object" ? rd23._meta : {});
      const internal23 = (meta23.internal = meta23.internal && typeof meta23.internal === "object" ? meta23.internal : {});
      internal23.risk_w23b = { stamp: W23_RISK_TURNB_STAMP, ..._w23c };
      console.log(JSON.stringify({
        evt: "_w23_risk_turnb", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, w23_stamp: W23_RISK_TURNB_STAMP, ..._w23c,
      }));
    } catch (e) {
      console.warn("[RISK] W23-RISK-TURNB failed (non-fatal):", (e as Error)?.message);
    }

    // ── WAVE24-FIX TURN A (cppa-risk) ────────────────────────────────
    // Item 74 / FINDING A (CRITICAL): qc_r1_4_cohort_determinism. Scrub
    // hedge phrases adjacent to the resolved § 7121(a)(3) cohort date
    // ("April 1, 2030" / "2030-04-01") so the customer surface carries
    // one deterministic date, no hedge, near the cite window. Also runs
    // a defensive B1 field-coverage extension pass (current_safeguards,
    // risk_assessment_by_activity, safeguards/mitigations/assessment
    // narrative slots) alongside the extended isTargetField set now
    // live in _w23_risk_turnb.ts. Fact-ledger consulted so intake-
    // supported claims are preserved. Runs AFTER W23 turnB and BEFORE
    // the LEAK-PREV P1 emit gate. Stamp echoes at
    // _meta.internal.risk_w24a; the LEAK-PREV-P2 serializer preserves
    // _meta.internal unmodified (item-32 gate).
    try {
      const _intakeW24 = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const _ledgerW24 = buildFactLedger(_intakeW24);
      const { counters: _w24c, report: _w24r } = applyW24RiskTurnA(
        report_data as any,
        { intake: _intakeW24, ledger: _ledgerW24 },
      );
      report_data = _w24r as any;
      const rd24: any = report_data;
      const meta24 = (rd24._meta = rd24._meta && typeof rd24._meta === "object" ? rd24._meta : {});
      const internal24 = (meta24.internal = meta24.internal && typeof meta24.internal === "object" ? meta24.internal : {});
      internal24.risk_w24a = { stamp: W24_RISK_TURNA_STAMP, ..._w24c };
      console.log(JSON.stringify({
        evt: "_w24_risk_turna", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, w24_stamp: W24_RISK_TURNA_STAMP, ..._w24c,
      }));
    } catch (e) {
      console.warn("[RISK] W24-RISK-TURNA failed (non-fatal):", (e as Error)?.message);
    }

    // ── W24A-V3 (2026-07-26) ─────────────────────────────────────────
    // Item 96 discharge — recurrence of qc_r1_4_cohort_determinism on
    // wave-27 doc 7f0de458. Extends v2 with (a) walker-coverage
    // guarantee (strings_scanned counts every non-anchor string),
    // (b) sentence-level excision for conditional-parenthetical hedge
    // variants "(applicable if 2027 … — confirm cohort when 2027
    // revenue is final)" and the comparator "cannot be determined
    // until … if …; if …" shape adjacent to a cohort reference, and
    // (c) resolved-cohort anchor firing on any resolved cohort date
    // (April 1, 2029/2030 variants). Runs AFTER v2 turnA and BEFORE
    // the LEAK-PREV P1 emit gate. Whole-sentence excision only; no
    // partial-clause splicing. Fail-open. Telemetry bumps
    // _meta.internal.risk_w24a.version to risk-w24-turna-v3-2026-07-26.
    try {
      const { counters: _v3c, report: _v3r } = applyW24aV3(report_data as any);
      report_data = _v3r as any;
      const rdV3: any = report_data;
      const metaV3 = (rdV3._meta = rdV3._meta && typeof rdV3._meta === "object" ? rdV3._meta : {});
      const internalV3 = (metaV3.internal = metaV3.internal && typeof metaV3.internal === "object" ? metaV3.internal : {});
      // Merge v3 counters on top of v2 telemetry; version bumped to v3.
      internalV3.risk_w24a = {
        ...(internalV3.risk_w24a && typeof internalV3.risk_w24a === "object" ? internalV3.risk_w24a : {}),
        ..._v3c,
        version: W24A_V3_VERSION,
        stamp: W24A_V3_STAMP,
        v2_stamp: W24_RISK_TURNA_STAMP,
      };
      console.log(JSON.stringify({
        evt: "_w24a_v3", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, w24a_v3_stamp: W24A_V3_STAMP, ..._v3c,
      }));
    } catch (e) {
      console.warn("[RISK] W24A-V3 failed (non-fatal):", (e as Error)?.message);
    }

    // ── RISK-COHORT-DATE-DETERMINISM (2026-07-26) ─────────────────────
    // Deploy-guarded fix per dispatch RISK-COHORT-DATE-DETERMINISM-2026-07-26.
    // Discharges pipeline-state item 107 Driver 1 (qc_r1_4_cohort_
    // determinism recurrence on w27 doc 7f0de458 + w28 docs e5a04cf7
    // and 1036f12c). When resolved revenue band = $25M–$50M, guarantee
    // the § 7121(a)(3) cohort date "April 1, 2030" is stated in the
    // deadline/compliance-timeline surface. Model NEVER writes/edits
    // the date; deterministic emitter only. Corpus-pinned literal.
    // Whole-sentence excision for wrong-cohort sentences. Omission-
    // over-invention for every other band. Runs AFTER applyW24aV3 and
    // BEFORE the LEAK-PREV P1 emit gate. Fail-open at every seam.
    // Telemetry lands at `_meta.internal.risk_cohort_date`; preexisting
    // `_meta.internal` siblings (risk_w24a, risk_t7_opening, …) are
    // preserved.
    try {
      const _rcdIntake = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const { counters: _rcdC, report: _rcdR } = applyRiskCohortDate(
        _rcdIntake, report_data as any, { buildStamp: BUILD_STAMP },
      );
      report_data = _rcdR as any;
      const rdRcd: any = report_data;
      const metaRcd = (rdRcd._meta = rdRcd._meta && typeof rdRcd._meta === "object" ? rdRcd._meta : {});
      const internalRcd = (metaRcd.internal = metaRcd.internal && typeof metaRcd.internal === "object" ? metaRcd.internal : {});
      internalRcd.risk_cohort_date = _rcdC;
      console.log(JSON.stringify({
        evt: "_risk_cohort_date", fn: "run-cppa-risk-assessment",
        ..._rcdC, build_stamp: BUILD_STAMP, risk_cohort_date_stamp: RISK_COHORT_DATE_STAMP,
      }));
    } catch (e) {
      console.warn("[RISK] RISK-COHORT-DATE-DETERMINISM failed (non-fatal):", (e as Error)?.message);
    }

    // ── RISK-INTAKE-CONTRADICTION-BODY (2026-07-26) ──────────────────
    // Discharges item-107 QUEUED backlog (w28 doc 1036f12c hallucination
    // HIGH ×2, Driver 2). Whole-sentence excision of model-written body
    // prose that contradicts a definite intake polarity (q5b/q18/q5), plus
    // deterministic downgrade of hedged "reconcile" framing (Class B).
    // Model NEVER writes replacements. Runs AFTER applyRiskCohortDate and
    // BEFORE the LEAK-PREV P1 emit gate. Anchor + reserved-subtree safe.
    // Telemetry at _meta.internal.risk_intake_contradiction; preexisting
    // _meta.internal siblings preserved.
    try {
      const _ricIntake = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const { counters: _ricC, report: _ricR } = applyRiskIntakeContradiction(
        _ricIntake, report_data as any, { buildStamp: BUILD_STAMP },
      );
      report_data = _ricR as any;
      const rdRic: any = report_data;
      const metaRic = (rdRic._meta = rdRic._meta && typeof rdRic._meta === "object" ? rdRic._meta : {});
      const internalRic = (metaRic.internal = metaRic.internal && typeof metaRic.internal === "object" ? metaRic.internal : {});
      internalRic.risk_intake_contradiction = _ricC;
      console.log(JSON.stringify({
        evt: "_risk_intake_contradiction", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, risk_intake_contradiction_stamp: RISK_INTAKE_CONTRADICTION_STAMP, ..._ricC,
      }));
    } catch (e) {
      console.warn("[RISK] RISK-INTAKE-CONTRADICTION-BODY failed (non-fatal):", (e as Error)?.message);
    }

    // ── RISK-CITATION-DUP-FIX (2026-07-26) ────────────────────────────
    // Deterministic post-pass discharging the two generator-owned
    // classes from PERFECT-INTAKE-EXPERIMENT run f3674428:
    //   (A) two-trigger comparison sentences that carry the SAME
    //       § 7150(b) pinpoint on both sides — restructured to
    //       single-trigger phrasing by whole-sentence excision.
    //   (B) ADMT-consequence assertions (§ 7001(ddd) / decision-
    //       effects prose) when q18_admt_use resolves NEGATIVE —
    //       the § 7150(b)(4) profiling trigger itself is preserved.
    // Anchor + reserved-subtree safe. Runs AFTER intake-contradiction
    // and BEFORE the LEAK-PREV P1 emit gate. Telemetry lands on
    // _meta.internal.risk_citation_dup_fix; preexisting _meta.internal
    // siblings preserved.
    try {
      const _cdfIntake = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const { counters: _cdfC, report: _cdfR } = applyRiskCitationDupFix(
        _cdfIntake, report_data as any, { buildStamp: BUILD_STAMP },
      );
      report_data = _cdfR as any;
      const rdCdf: any = report_data;
      const metaCdf = (rdCdf._meta = rdCdf._meta && typeof rdCdf._meta === "object" ? rdCdf._meta : {});
      const internalCdf = (metaCdf.internal = metaCdf.internal && typeof metaCdf.internal === "object" ? metaCdf.internal : {});
      internalCdf.risk_citation_dup_fix = _cdfC;
      console.log(JSON.stringify({
        evt: "_risk_citation_dup_fix", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, risk_citation_dup_fix_stamp: RISK_CITATION_DUP_FIX_STAMP, ..._cdfC,
      }));
    } catch (e) {
      console.warn("[RISK] RISK-CITATION-DUP-FIX failed (non-fatal):", (e as Error)?.message);
    }


    // BAND-REALIGNMENT-T2A (2026-07-26): stamp band-resolution telemetry on
    // _meta.internal so downstream QC / graders can distinguish V1→V2
    // resolved intakes from legacy-ambiguous inputs.
    (report_data as any)._meta = { ...((report_data as any)._meta ?? {}), prompt_version: stampPromptVersion("cppa-risk-assessment", "w15-risk-regwire@2026-07-24"), build_stamp: BUILD_STAMP };
    (report_data as any)._meta.internal = { ...((report_data as any)._meta?.internal ?? {}), band_v1_to_v2_resolved: { q1_revenue: bandResolution?.q1_v1_to_v2_resolved ?? null, q2_consumers: bandResolution?.q2_v1_to_v2_resolved ?? null }, band_legacy_ambiguous: { q1_revenue: !!bandResolution?.q1_legacy_ambiguous, q2_consumers: !!bandResolution?.q2_legacy_ambiguous } };



    // RC-B B1 — freeze open_items on first completed generation (idempotent).
    report_data = freezeOpenItemsOnFirstRun(report_data, (report_data as any).information_needed, "cppa_risk_assessment", false);



    // Stage 1: metering + version retention (written BEFORE status:complete).
    await recordRunMeterAndVersion(supabase, {
      toolType: "cppa_risk_assessment",
      assessmentId: assessment_id,
      userId: (row as any).user_id ?? null,
      intake: ((row as any).intake_data as Record<string, unknown>) ?? {},
      reportData: report_data,
    });

    try { const _prose = extractProseFromReport(report_data); const _roster = extractIntakeRoster((row as any).intake_data ?? {}); const _det = [...runFormatChecksGeneric(_prose, { intakeRoster: _roster }), ...runCppaHf1Checks(_prose)].map(x=>({...x, check_type:'deterministic' as const})); attachDeterministicChecks(report_data as any, _det as any); } catch(_) {}
    // ── LEAK-PREV-P1 — EMIT GATE (2026-07-25) ─────────────────────────
    // Runs AFTER every content-shaping pass (W6/W10/W12/fact-ledger/W18)
    // and IMMEDIATELY BEFORE the terminal complete-write; gate telemetry
    // lands on `_meta.internal.emit_gate`. Fail-visible; never blocks.
    try {
      const { runEmitGate } = await import("../_shared/emit-gate.ts");
      runEmitGate(report_data as any, {
        tool: "cppa_risk_assessment",
        intakeRoster: (row as any).intake_data ?? {},
      });
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] LEAK-PREV-P1 emit-gate wrapper failed (non-fatal):", (e as Error)?.message);
    }

    // ── T7-RISK-OPENING-PARAGRAPH-PILOT (2026-07-25) ─────────────────
    // Deterministic opening_summary slot per docs/design/OPENING-PARAGRAPH-DESIGN.md.
    // The model NEVER writes this slot; we OVERWRITE it here (post emit-gate,
    // pre serializer) so the schema whitelist emits the deterministic build.
    // Telemetry lands on `_meta.internal.risk_t7_opening`. Fail-visible; never blocks.
    try {
      const { buildRiskOpening, RISK_OPENING_VERSION } = await import("../_shared/openings/risk-opening.ts");
      const intake = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const built = buildRiskOpening(intake as any);
      (report_data as any).opening_summary = built.text;
      const _rd: any = report_data as any;
      const _meta = _rd._meta ?? (_rd._meta = {});
      const _internal = _meta.internal ?? (_meta.internal = {});
      _internal.risk_t7_opening = {
        version: RISK_OPENING_VERSION,
        overwrote_model_output: true,
        s0_criteria: built.provenance.s0_criteria,
        s1_triggers: built.provenance.s1_triggers,
        // T7-PILOT-FIX-2 (ledger item 97): telemetry-only counter for the
        // (B) rejection reason when sell/share is affirmative but the
        // intake carries no compliant bought/sold/shared count field.
        s0_b_rejected_reason: built.provenance.s0_b_rejected_reason,
        omitted: built.provenance.omitted,
        sources: built.provenance.sources,
        length: built.text.length,
        pilot: "T7-RISK-OPENING-PARAGRAPH-PILOT-2026-07-25",
        pilotfix2_stamp: "t7-risk-pilotfix2@2026-07-26T01:10:00Z",
      };
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] T7 opening builder failed (non-fatal):", (e as Error)?.message);
    }

    // ── T7-RISK-PILOT-FIX (2026-07-25) ───────────────────────────────
    // Deterministic post-emitter repair for the 7 emitter-mechanical
    // defect classes flagged by wave-26 first read (quality_run
    // 17fe2863, run 139). Runs AFTER the T7 opening builder (needs
    // s1_triggers provenance for F4/F6) and BEFORE the LEAK-PREV-P2
    // serializer. Fail-open. Telemetry lands at
    // `_meta.internal.risk_t7fix`; the LEAK-PREV-P2 serializer
    // preserves `_meta.internal` unmodified (item-32 gate).
    try {
      const { runT7RiskPilotFix, T7_RISK_PILOTFIX_VERSION, T7_RISK_PILOTFIX_STAMP } =
        await import("../_shared/openings/_t7_risk_pilotfix.ts");
      const _fix = runT7RiskPilotFix(report_data as any);
      const _rd: any = report_data as any;
      const _meta = _rd._meta ?? (_rd._meta = {});
      const _internal = _meta.internal ?? (_meta.internal = {});
      _internal.risk_t7fix = {
        version: T7_RISK_PILOTFIX_VERSION,
        stamp: T7_RISK_PILOTFIX_STAMP,
        build_stamp: BUILD_STAMP,
        resolved_triggers: _fix.resolved_triggers,
        ..._fix.counters,
      };
      console.log(`[run-cppa-risk-assessment] evt=t7_risk_pilotfix ${JSON.stringify({
        stamp: T7_RISK_PILOTFIX_STAMP, build_stamp: BUILD_STAMP, ..._fix.counters,
      })}`);
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] T7 pilot fix failed (non-fatal):", (e as Error)?.message);
    }


    // ── LTP WAVE-B COMPLETION (2026-07-27, item 154) ─────────────────
    // Deterministic post-generation surface closure for the three
    // Wave-B leaks (paraphrased purpose / meta-string priority_actions /
    // free-prose inconsistency_flags), the PII field-class rendering
    // rule (b), and the § 7120(b) per-prong cyber-audit crosswalk (c).
    // Runs AFTER T7 pilot fix and BEFORE the LTP shadow-mode telemetry
    // block. Fail-open. Telemetry lands at
    // `_meta.internal.waveb_completion`; LEAK-PREV-P2 preserves
    // `_meta.internal` unmodified. Post-render PII assertion result
    // recorded (never blocks — the scrubbers empty the surface first).
    try {
      const { applyWaveBCompletion, assertNoPiiInNarrative, WAVEB_COMPLETION_STAMP, WAVEB_COMPLETION_VERSION } =
        await import("../_shared/ltp/waveb-completion.ts");
      const _wbIntake = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const _wb = applyWaveBCompletion(report_data as any, _wbIntake as any);
      report_data = _wb.report as any;
      const _piiAssert = assertNoPiiInNarrative(report_data as any);
      const _rd: any = report_data as any;
      const _meta = _rd._meta ?? (_rd._meta = {});
      const _internal = _meta.internal ?? (_meta.internal = {});
      _internal.waveb_completion = {
        version: WAVEB_COMPLETION_VERSION,
        stamp: WAVEB_COMPLETION_STAMP,
        build_stamp: BUILD_STAMP,
        counters: _wb.counters,
        pii_narrative_assertion_errors: _piiAssert,
      };
      console.log(JSON.stringify({
        evt: "waveb_completion_applied", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, stamp: WAVEB_COMPLETION_STAMP,
        ..._wb.counters,
        pii_assert_errors: _piiAssert.length,
      }));
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] LTP WAVE-B COMPLETION failed (non-fatal):", (e as Error)?.message);
    }

    // ── LTP WAVE-B.2 CLOSURE (2026-07-27, item 157) ─────────────────
    // Deterministic post-render closure for the six run-146 citation-class
    // findings: token-truncation guard, information_needed self-
    // contradiction filter, attestation § 7157 anchor discipline.
    // Runs AFTER applyWaveBCompletion and BEFORE the LTP shadow-mode
    // telemetry block. Fail-open.
    try {
      const { applyWaveB2Closure, WAVEB2_CLOSURE_STAMP, WAVEB2_CLOSURE_VERSION } =
        await import("../_shared/ltp/waveb2-closure.ts");
      const _wb2 = applyWaveB2Closure(report_data as any);
      report_data = _wb2.report as any;
      const _rd: any = report_data as any;
      const _meta = _rd._meta ?? (_rd._meta = {});
      const _internal = _meta.internal ?? (_meta.internal = {});
      _internal.waveb2_closure = {
        version: WAVEB2_CLOSURE_VERSION,
        stamp: WAVEB2_CLOSURE_STAMP,
        build_stamp: BUILD_STAMP,
        counters: _wb2.counters,
      };
      console.log(JSON.stringify({
        evt: "waveb2_closure_applied", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, stamp: WAVEB2_CLOSURE_STAMP,
        ..._wb2.counters,
      }));
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] LTP WAVE-B.2 CLOSURE failed (non-fatal):", (e as Error)?.message);
    }

    // ── ITEM-204 (Defect B) — CYBER-AUDIT PHASE-IN SCHEDULE ───────────
    // CEO ruling 2026-07-27: no cohort computation; render full § 7121(a)
    // schedule from corpus, close with reserved-to-customer-and-counsel
    // framing. Supersedes the RISK-COHORT-DATE resolved-band truth-table
    // directive and retires the cohort-append conditional clause.
    // Item 195 cohort-append is now a permanent no-op (retained call
    // preserves telemetry key stability for controller audits).
    try {
      const { applyCyberAuditSchedule } = await import("../_shared/ltp/cyber-audit-schedule.ts");
      const _schedRes = applyCyberAuditSchedule(report_data);
      const _rdS: any = report_data as any;
      _rdS._meta = _rdS._meta ?? {};
      _rdS._meta.internal = _rdS._meta.internal ?? {};
      _rdS._meta.internal.cyber_audit_schedule = {
        build_stamp: BUILD_STAMP,
        stamp: _schedRes.stamp,
        version: _schedRes.version,
        emitted: _schedRes.emitted,
        reason: _schedRes.reason,
      };
      console.log(JSON.stringify({
        evt: "cyber_audit_schedule_ran", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, emitted: _schedRes.emitted, reason: _schedRes.reason,
      }));
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] cyber-audit-schedule failed (non-fatal):", (e as Error)?.message);
    }

    // ── STAGE-B CONTINUATION-4 COHORT APPEND-IF-ABSENT (item 195) ─────
    // RETIRED per ITEM-204 (Defect B). Call retained as no-op for
    // telemetry-key stability; see cohort-append.ts header.
    try {
      const { applyCohortAppendIfAbsent } = await import("../_shared/ltp/cohort-append.ts");
      const _cohortIntake = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const _cohortRes = applyCohortAppendIfAbsent(report_data, _cohortIntake);
      const _rdC: any = report_data as any;
      _rdC._meta = _rdC._meta ?? {};
      _rdC._meta.internal = _rdC._meta.internal ?? {};
      _rdC._meta.internal.cohort_append = {
        build_stamp: BUILD_STAMP,
        stamp: _cohortRes.stamp,
        version: _cohortRes.version,
        appended: _cohortRes.appended,
        reason: _cohortRes.reason,
      };
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] cohort-append failed (non-fatal):", (e as Error)?.message);
    }

    // ── ITEM-204 RESIDUAL — INFO-NEEDED NORMALIZE (id/topic) ──────────
    // Schema-conformance: every information_needed row carries id + topic.
    try {
      const { normalizeInformationNeeded } = await import("../_shared/ltp/info-needed-normalize.ts");
      const _inRes = normalizeInformationNeeded(report_data);
      const _rdI: any = report_data as any;
      _rdI._meta = _rdI._meta ?? {};
      _rdI._meta.internal = _rdI._meta.internal ?? {};
      _rdI._meta.internal.info_needed_normalize = {
        build_stamp: BUILD_STAMP, stamp: _inRes.stamp,
        normalized: _inRes.normalized, total: _inRes.total,
      };
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] info-needed-normalize failed (non-fatal):", (e as Error)?.message);
    }




    // ── LTP PHASE-2 SHADOW-MODE (2026-07-26, item 137) ──────────────
    // Runs the Legal Test Pipeline (Derive → Guide → deterministic
    // Render hooks → Verify-scaffold) over intake + report_data.
    // Telemetry only: writes under _meta.internal.legal_test_pipeline
    // which the LEAK-PREV-P2 whitelist serializer strips. Never mutates
    // customer-visible surfaces. Fail-open in all paths.
    try {
      const _ltpIntake = (row as any).intake_data ?? {};
      const _ltpTelemetry = runLegalTestPipelineShadow({
        intake: _ltpIntake,
        report_data: report_data as any,
        buildStamp: BUILD_STAMP,
      });
      const _rd: any = report_data as any;
      _rd._meta = _rd._meta ?? {};
      _rd._meta.internal = _rd._meta.internal ?? {};
      _rd._meta.internal.legal_test_pipeline = _ltpTelemetry;
      console.log(JSON.stringify({
        evt: "ltp_shadow_ran", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, ltp_stamp: LTP_STAMP,
        mode: _ltpTelemetry.mode, ran: _ltpTelemetry.ran,
        elapsed_ms: _ltpTelemetry.elapsed_ms,
        propositions: _ltpTelemetry.derive.propositions,
        gates_blocking: _ltpTelemetry.derive.gates_blocking,
        frame_entries: _ltpTelemetry.guide.frame_entries,
        empty_by_finding: _ltpTelemetry.guide.empty_by_finding,
        closeness: _ltpTelemetry.closeness.score,
        variant: _ltpTelemetry.closeness.variant,
        validator_issues: _ltpTelemetry.validators.total_issues,
      }));

      // ── T-M1 (Item 221): PASS-1 DERIVE AS AUTHORITATIVE ──────────────
      // The historical env gate (LTP_ENFORCE_ENABLED) is retired for
      // cppa-risk. Pass-1 (deterministic derive + LLM arm + V1–V8
      // validators) runs unconditionally with the CEO-ruled N=2 retry
      // budget (PASS1_MAX_ATTEMPTS) and the 75s per-attempt cap. On
      // success the RenderPlan is persisted as the authoritative artifact
      // at _meta.internal.render_plan; the legacy shadow-preview slot is
      // kept populated for one release for back-compat but downstream
      // wiring (T-M6) will read exclusively from render_plan. On terminal
      // failure Pass-1 returns conservative_write_around=true; the finalize
      // hook (below) records write_around_origin so the composer does NOT
      // silently fall through.
      try {
        const _rd2: any = report_data as any;
        const _elapsedBeforePass1 = Date.now() - t0;
        if (!hasBudgetForPostLintLLM(_elapsedBeforePass1)) {
          const _skipTelemetry = {
            manifest: PASS1_MANIFEST,
            telemetry: {
              ran: false,
              attempts: 0,
              ok: false,
              latency_ms: 0,
              write_around: false,
              validator_issues: 0,
              error: "skipped_budget",
            },
            skipped_budget: true,
            elapsed_ms: _elapsedBeforePass1,
            budget_ms: POST_LINT_LLM_BUDGET_MS,
          };
          _rd2._meta.internal.legal_test_pipeline.enforce_preview = _skipTelemetry;
          _rd2._meta.internal.render_plan = {
            authoritative: false,
            reason: "skipped_budget",
            manifest: PASS1_MANIFEST,
            telemetry: _skipTelemetry.telemetry,
          };
          console.warn(JSON.stringify({ evt: "ltp_pass1_skipped_budget", fn: "run-cppa-risk-assessment", elapsed_ms: _elapsedBeforePass1, budget_ms: POST_LINT_LLM_BUDGET_MS }));
        } else {
          // T-M9 (Item 230): worker LIVENESS TOUCH at pass1-start. Bumps
          // updated_at + records the pass1_start marker so a dead worker
          // is distinguishable from a slow one in under a minute (the T-M8
          // silent hang held updated_at FROZEN for 17+ minutes). Failure
          // to touch is not fatal — Pass-1 still proceeds.
          try {
            await supabase.from("cppa_assessments").update({
              updated_at: new Date().toISOString(),
            }).eq("id", assessment_id);
            console.log(JSON.stringify({
              evt: "worker_liveness_pass1_start", fn: "run-cppa-risk-assessment",
              assessment_id, build_stamp: BUILD_STAMP,
              pass1_timeout_enforced: PASS1_TIMEOUT_ENFORCED,
              per_attempt_timeout_ms: POST_LINT_PASS1_TIMEOUT_MS,
            }));
          } catch (e) {
            console.warn("[run-cppa-risk-assessment] worker_liveness_pass1_start touch failed (non-fatal):", (e as Error)?.message);
          }
          // T-M9.4 (Item 234) — STAGE TIMINGS. Capture per-stage elapsed
          // (relative to worker t0) so the next successful run tells us
          // where pre-Pass-1 time goes. Persisted under _meta.internal.
          const _stagePass1Start = Date.now() - t0;
          const _pass1 = await runPass1Llm({
            intake: _ltpIntake,
            report_data: report_data as any,
            buildStamp: BUILD_STAMP,
          }, { maxAttempts: PASS1_MAX_ATTEMPTS, timeoutMs: POST_LINT_PASS1_TIMEOUT_MS });
          const _stagePass1End = Date.now() - t0;
          const _planSummary = {
            plan_version: _pass1.plan.plan_version,
            propositions: _pass1.plan.propositions?.length ?? 0,
            gate_outcomes: _pass1.plan.gate_outcomes?.length ?? 0,
            write_around: _pass1.plan.conservative_write_around?.triggered ?? false,
          };
          // Legacy shadow-preview slot (retained for T-M2..T-M5 back-compat).
          _rd2._meta.internal.legal_test_pipeline.enforce_preview = {
            manifest: PASS1_MANIFEST,
            telemetry: _pass1.telemetry,
            plan_summary: _planSummary,
            timeout_ms: POST_LINT_PASS1_TIMEOUT_MS,
            max_attempts: PASS1_MAX_ATTEMPTS,
          };
          // AUTHORITATIVE RenderPlan artifact. Cutover consumer (T-M6) reads
          // _meta.internal.render_plan; this is the single input for downstream
          // body assembly once the composer swap lands.
          _rd2._meta.internal.render_plan = {
            authoritative: _pass1.telemetry.ok,
            manifest: PASS1_MANIFEST,
            plan: _pass1.plan,
            plan_summary: _planSummary,
            telemetry: _pass1.telemetry,
            build_stamp: BUILD_STAMP,
            model: PASS1_MODEL,
            max_attempts: PASS1_MAX_ATTEMPTS,
            timeout_ms: POST_LINT_PASS1_TIMEOUT_MS,
          };
          console.log(JSON.stringify({
            evt: "ltp_pass1_authoritative_ran", fn: "run-cppa-risk-assessment",
            build_stamp: BUILD_STAMP, pass1_model: PASS1_MODEL,
            pass1_ok: _pass1.telemetry.ok,
            attempts: _pass1.telemetry.attempts,
            write_around: _pass1.telemetry.write_around,
            validator_issues: _pass1.telemetry.validator_issues,
            latency_ms: _pass1.telemetry.latency_ms,
            error: _pass1.telemetry.error ?? null,
          }));
          // T-M6 (Item 226) — PASS-2 ASSEMBLER CUTOVER.
          // The assembler output IS report_data's body. Legacy Engine-A
          // composer call-site is retired. On terminal Pass-1 failure
          // (conservative_write_around), ship the Type-J reserved-judgment
          // body with origin telemetered — no fall-through to any legacy
          // path. _meta subtree is preserved (assembler never writes
          // there); shipped body top-level keys are overwritten.
          try {
            // T-M9.4 (Item 234) — VALID PLAN INVARIANT (belt-and-suspenders).
            // A successful, validator-clean RenderPlan is ALWAYS assembled
            // and shipped. The clock contract gates LLM retries only; the
            // Pass-2 assembler is deterministic and requires no LLM budget.
            // Type-J write-around fires ONLY on terminal Pass-1 failure
            // (abort×N, validator hard-reject, or model error). Pass-1's
            // upstream fix (pass1-llm.ts) forces triggered=false on ok,
            // and we re-assert here so a future regression cannot re-route
            // a valid plan to Type-J via a stray triggered=true.
            const _pass1Ok = !!_pass1.telemetry.ok;
            const _writeAround = _pass1Ok
              ? false
              : (!!_pass1.plan?.conservative_write_around?.triggered || !_pass1.telemetry.ok);
            // ITEM 236 fix (e) — wa_origin is NULL on pass1-ok runs. The
            // "unknown" sentinel is retired at the emission site; a
            // regression test in e2e-document.test.ts fails the suite if
            // an ok run ever telemeters an origin.
            // ITEM 240 (B) — origin classification lives in one place
            // (composition-hook-audit.classifyPass1WriteAroundOrigin);
            // the old inline union is retired so a new failure class
            // (e.g. pass1_validator_reject) is picked up automatically.
            const _origin: WriteAroundOrigin | null = _writeAround
              ? classifyPass1WriteAroundOrigin(_pass1.telemetry.error ?? null)
              : null;
            let _body: Record<string, unknown>;
            let _assemblerTele: any = null;
            let _assemblerVersion = PASS2_ASSEMBLER_VERSION;
            const _stageAssemblerStart = Date.now() - t0;
            if (_writeAround) {
              _body = buildTypeJWriteAroundBody({
                intake: _ltpIntake,
                origin: _origin ?? "unknown",
                buildStamp: BUILD_STAMP,
              });
            } else {
              // ITEM 236 fix (a) — Wire the T7 deterministic opening_summary
              // artifact into the assembler so the harvest guard evaluates
              // it and (when accepted) emits opening_summary from the
              // shipped body. Falls back silently to no harvest if the
              // builder failed earlier in the pipeline.
              let _openingHarvest: any = undefined;
              try {
                const _rdA: any = report_data as any;
                const _openingText = typeof _rdA?.opening_summary === "string" ? _rdA.opening_summary : "";
                const _openingProv = _rdA?._meta?.internal?.risk_t7_opening;
                if (_openingText && _openingProv) {
                  _openingHarvest = {
                    text: _openingText,
                    provenance: {
                      version: _openingProv.version,
                      s0_criteria: _openingProv.s0_criteria ?? [],
                      s1_triggers: _openingProv.s1_triggers ?? [],
                      omitted: _openingProv.omitted ?? [],
                      sources: _openingProv.sources ?? {},
                      s0_b_rejected_reason: _openingProv.s0_b_rejected_reason ?? null,
                    },
                  };
                }
              } catch { /* fall through to no harvest */ }
              const _assembler = assembleReport(
                _pass1.plan,
                _openingHarvest ? { opening_summary: _openingHarvest } : {},
              );
              _body = _assembler.report as Record<string, unknown>;
              _assemblerTele = _assembler.telemetry;
              _assemblerVersion = _assembler.version;
            }
            const _stageAssemblerEnd = Date.now() - t0;
            // Preserve _meta and any underscore-prefixed subtree; overwrite
            // every other top-level key from the assembler body.
            const _rdBefore: any = report_data as any;
            const _preserved: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(_rdBefore ?? {})) {
              if (k.startsWith("_")) _preserved[k] = v;
            }
            const _cutover: Record<string, unknown> = { ..._body, ..._preserved };
            report_data = _cutover as any;
            const _rd3: any = report_data as any;
            _rd3._meta = _rd3._meta ?? {};
            _rd3._meta.internal = _rd3._meta.internal ?? {};
            _rd3._meta.internal.assembler = {
              version: _assemblerVersion,
              build_stamp: BUILD_STAMP,
              write_around: _writeAround,
              write_around_origin: _origin,
              telemetry: _assemblerTele,
              body_source: _writeAround ? "type_j_write_around" : "pass2_assembler",
            };
            _rd3._meta.internal.composition_shape = {
              build_stamp: BUILD_STAMP,
              declared: COMPOSITION_SHAPE_DECLARATION,
              observed: {
                final_documents: 1,
                pass1_ran: _pass1.telemetry.ran,
                pass1_ok: _pass1.telemetry.ok,
                body_source: _writeAround ? "type_j_write_around" : "pass2_assembler",
              },
              conformant: true,
            };
            _rd3._meta.internal.stage_timings = {
              build_stamp: BUILD_STAMP,
              worker_start_ms: 0,
              pass1_start_ms: _stagePass1Start,
              pass1_end_ms: _stagePass1End,
              pass1_elapsed_ms: _stagePass1End - _stagePass1Start,
              assembler_start_ms: _stageAssemblerStart,
              assembler_end_ms: _stageAssemblerEnd,
              assembler_elapsed_ms: _stageAssemblerEnd - _stageAssemblerStart,
              cutover_end_ms: Date.now() - t0,
            };
            console.log(JSON.stringify({
              evt: "ltp_pass2_assembler_cutover_ran",
              fn: "run-cppa-risk-assessment",
              build_stamp: BUILD_STAMP,
              assembler_version: _assemblerVersion,
              write_around: _writeAround,
              write_around_origin: _origin,
              body_source: _writeAround ? "type_j_write_around" : "pass2_assembler",
              total_sections: _assemblerTele?.total_sections ?? null,
              emitted_sections: _assemblerTele?.emitted_sections ?? null,
              omitted_sections: _assemblerTele?.omitted_sections ?? null,
              structural_ok: _assemblerTele?.structural_completeness?.ok ?? null,
              structural_nonconformant: _assemblerTele?.structural_completeness?.nonconformant_keys ?? [],
              flat_certainty_rejections: _assemblerTele?.exit_checks?.flat_certainty_rejections?.length ?? 0,
              pii_rejections: _assemblerTele?.exit_checks?.pii_rejections?.length ?? 0,
              harvest_rejections: (_assemblerTele?.harvest_decisions ?? []).filter((d: any) => d.rejection_reason !== null).length,
              composition_shape_version: COMPOSITION_SHAPE_DECLARATION.version,
            }));
          } catch (e) {
            console.warn("[run-cppa-risk-assessment] LTP Pass-2 assembler cutover failed (non-fatal):", (e as Error)?.message);
          }
        }
      } catch (e) {
        console.warn("[run-cppa-risk-assessment] LTP Pass-1 authoritative failed (non-fatal):", (e as Error)?.message);
      }
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] LTP shadow-mode failed (non-fatal):", (e as Error)?.message);
    }

    // ── STAGE-B BLOCK-A COMPOSITION FINALIZER (2026-07-27, item 194) ──
    // SMOKE-HANG ROOT FIX (2026-07-27, this turn): call goes through
    // safeFinalizeComposition() which is guaranteed non-throwing and
    // wall-clock-telemetered. HARD INVARIANT: any failure here — including
    // an enforce-mode value-screen/surface-guard throw, a hook-audit throw,
    // or an outright bug in the finalize path — MUST NOT prevent persist.
    // Enforce-mode strictness applies to MEASUREMENT verdicts (recorded on
    // telemetry.enforce_violation), never to whether the document ships.
    try {
      const _rdF: any = report_data as any;
      _rdF._meta = _rdF._meta ?? {};
      _rdF._meta.internal = _rdF._meta.internal ?? {};
      const _hookValue = readForceWriteAroundOnce(Deno.env);
      const _ltpPreview = _rdF._meta.internal.legal_test_pipeline?.enforce_preview;
      // T-M9.4 (Item 234) — VALID PLAN INVARIANT (finalize-site guard).
      // Only enter write-around when Pass-1 actually failed. The upstream
      // plan_summary.write_around flag mirrors the model-emitted
      // conservative_write_around and can be a false positive on a clean
      // ok run. Gate on telemetry.ok === true → NEVER write-around.
      const _pass1TeleOk = _ltpPreview?.telemetry?.ok === true;
      const _writeAroundEntered = !_pass1TeleOk && !!_ltpPreview?.plan_summary?.write_around;
      const _pass1Err: string | undefined = _ltpPreview?.telemetry?.error;
      const _writeAroundOrigin: WriteAroundOrigin | undefined =
        _writeAroundEntered
          ? classifyPass1WriteAroundOrigin(_pass1Err ?? null)
          : undefined;
      const _mode = currentEnforceMode(Deno.env);
      const _safe = safeFinalizeComposition({
        reportData: report_data,
        hookValue: _hookValue,
        writeAroundEntered: _writeAroundEntered,
        writeAroundOrigin: _writeAroundOrigin,
        mode: _mode,
      });
      report_data = _safe.reportData as any;
      const _rdF2: any = report_data as any;
      _rdF2._meta = _rdF2._meta ?? {};
      _rdF2._meta.internal = _rdF2._meta.internal ?? {};
      _rdF2._meta.internal.composition_finalize = {
        build_stamp: BUILD_STAMP,
        version: COMPOSITION_FINALIZE_VERSION,
        safe_version: SAFE_FINALIZE_VERSION,
        ..._safe.telemetry,
        // ITEM 206 — per-hit path/context surfaced from ValueScreenError.
        hits: (_safe.telemetry.hits ?? []).map((h: any) => ({
          kind: h.kind, match: h.match, path: h.path, context: h.context,
        })),
        // ITEM 217 fix (b): prefer top-level fragment_omit_* (authoritative;
        // survives finalize throws) over inner (which reflects the inner
        // idempotent re-run on already-repaired input).
        fragment_omit_count: _safe.telemetry.fragment_omit_count,
        fragment_omit_paths: _safe.telemetry.fragment_omit_paths,
        write_around_origin: _writeAroundOrigin ?? null,
      };
      console.log(JSON.stringify({
        evt: "composition_finalize_ran", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, safe_version: SAFE_FINALIZE_VERSION,
        mode: _safe.telemetry.mode,
        errored: _safe.telemetry.errored,
        error_kind: _safe.telemetry.error_kind ?? null,
        enforce_violation: _safe.telemetry.enforce_violation,
        elapsed_ms: _safe.telemetry.elapsed_ms,
        budget_exceeded: _safe.telemetry.budget_exceeded,
        value_screen_hits: _safe.telemetry.inner?.value_screen_hits ?? null,
        value_screen_final_hits: _safe.telemetry.inner?.value_screen_final_hits ?? null,
        fragment_omit_count: _safe.telemetry.fragment_omit_count,
        fragment_omit_paths: _safe.telemetry.fragment_omit_paths,
        hits: (_safe.telemetry.hits ?? []).map((h: any) => ({ kind: h.kind, match: h.match, path: h.path })),
        surface_unowned_count: _safe.telemetry.inner?.surface_unowned_paths.length ?? null,
        surface_cut_violations: _safe.telemetry.inner?.surface_cut_violations.length ?? null,
        hook_present: _safe.telemetry.inner?.hook_value_present ?? null,
        write_around_entered: _safe.telemetry.inner?.write_around_entered ?? null,
        write_around_origin: _writeAroundOrigin ?? null,
      }));
    } catch (e) {
      // Belt-and-suspenders: safeFinalizeComposition is designed never to
      // throw, but if it somehow does (e.g. env access blocked), swallow
      // and telemeter — persist must not be blocked.
      try {
        const _rdE: any = report_data as any;
        _rdE._meta = _rdE._meta ?? {};
        _rdE._meta.internal = _rdE._meta.internal ?? {};
        _rdE._meta.internal.composition_finalize_error = {
          build_stamp: BUILD_STAMP,
          error: (e as Error)?.message ?? String(e),
          kind: (e as Error)?.name ?? "Error",
          escaped_safe_wrapper: true,
        };
      } catch { /* best-effort */ }
      console.warn(
        "[run-cppa-risk-assessment] composition-finalize escaped safe wrapper (non-fatal):",
        (e as Error)?.message,
      );
    }


    // ── FUTURE-BUILDING F0 — observation-only signature emit ─────────
    // Non-blocking, post-validation, PI-free. Writes a scenario signature
    // + pinned version block to public.pattern_observations when the LTP
    // validators emitted zero error-severity issues. Telemetry lands on
    // _meta.internal.future_building (stripped by LEAK-PREV-P2). Failure
    // of any step here NEVER affects the run — the report always ships.
    // NO pattern serving. NO compile-path changes. Observation only.
    try {
      const _rd: any = report_data as any;
      _rd._meta = _rd._meta ?? {};
      _rd._meta.internal = _rd._meta.internal ?? {};
      const _ltp = _rd._meta.internal.legal_test_pipeline;
      const _validatorErrors = Number(_ltp?.validators?.total_issues ?? 0);
      if (!_ltp || _validatorErrors > 0) {
        _rd._meta.internal.future_building = {
          observed: false,
          reason: !_ltp ? "ltp_missing" : "validator_errors_present",
          version: "f0",
        };
      } else {
        const _fbIntake = (row as any).intake_data ?? {};
        // Canonical enum/band bucket — booleans, numbers, and short strings only.
        // Anything longer than 64 chars is treated as free-text (presence only).
        const _fbEnums: Record<string, string | number | boolean | null> = {};
        const _fbFreeText: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(_fbIntake)) {
          if (v === null || v === undefined) { _fbEnums[k] = null; continue; }
          if (typeof v === "boolean" || typeof v === "number") { _fbEnums[k] = v; continue; }
          if (typeof v === "string") {
            if (v.length <= 64) _fbEnums[k] = v; else _fbFreeText[k] = v;
            continue;
          }
          _fbFreeText[k] = v;
        }
        const _fbGates: Record<string, "pass" | "block" | "not_applicable"> = {};
        for (const g of (_ltp?.derive?.gate_outcomes ?? []) as Array<{gate_id: string; outcome: string}>) {
          if (g?.gate_id && (g.outcome === "pass" || g.outcome === "block" || g.outcome === "not_applicable")) {
            _fbGates[g.gate_id] = g.outcome;
          }
        }
        const _sig = await computeScenarioSignature({
          product: "cppa-risk-assessment",
          jurisdictionTags: ["cppa-ca"],
          enums: _fbEnums,
          freeText: _fbFreeText,
          gateOutcomes: _fbGates,
        });
        const _fbRegistryVersions = {
          ltp_stamp: LTP_STAMP,
          legal_test_rev: "v2.3",
          factors: "cppa-risk-factors@phase-1",
          templates: "cppa-risk-templates@ltp-p2",
          corpus_batch: BUILD_STAMP,
        };
        // Async (non-awaited) write — never blocks the run. Errors are
        // swallowed inside the promise.
        supabase.from("pattern_observations").insert({
          product: "cppa-risk-assessment",
          signature: _sig.hash,
          plan_version: "v1",
          instrument_version: GRADER_CONTEXT_VERSION,
          registry_versions: _fbRegistryVersions,
          scenario_set: (row as any)?.scenario_set ?? null,
          run_ref: assessment_id ?? null,
        }).then(
          ({ error }) => {
            if (error) {
              console.warn("[run-cppa-risk-assessment] future-building insert failed (non-fatal):", error.message);
            }
          },
          (err: unknown) => {
            console.warn("[run-cppa-risk-assessment] future-building insert threw (non-fatal):", (err as Error)?.message);
          },
        );
        _rd._meta.internal.future_building = {
          observed: true,
          signature: _sig.hash,
          version: "f0",
        };
        console.log(JSON.stringify({
          evt: "future_building_observed", fn: "run-cppa-risk-assessment",
          product: "cppa-risk-assessment", signature: _sig.hash,
          build_stamp: BUILD_STAMP,
        }));
      }
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] future-building emit failed (non-fatal):", (e as Error)?.message);
      try {
        const _rd: any = report_data as any;
        _rd._meta = _rd._meta ?? {};
        _rd._meta.internal = _rd._meta.internal ?? {};
        _rd._meta.internal.future_building = { observed: false, reason: "emit_error", version: "f0" };
      } catch { /* best-effort */ }
    }


    // ── LEAK-PREV-P2 — SCHEMA-DRIVEN SERIALIZER (2026-07-25) ─────────
    // Whitelist emit: only schema-declared keys reach the customer. On
    // serializer crash, ship the report unchanged (previous behaviour)
    // so availability is never blocked. Telemetry lands on
    // `_meta.internal.serializer`.
    try {
      const { serializeCustomerReport } = await import("../_shared/report-serialize.ts");
      const { CPPA_RISK_REPORT_SCHEMA } = await import("../_shared/report-schemas/cppa-risk.ts");
      const { report: serialized, telemetry } = serializeCustomerReport(report_data as any, CPPA_RISK_REPORT_SCHEMA);
      if (!telemetry.crashed) report_data = serialized as any;
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] LEAK-PREV-P2 serializer failed (non-fatal):", (e as Error)?.message);
    }

    // ── ITEM 208 — POST-SERIALIZER SURFACE GUARD (SMOKE-#6 fix) ──────
    // The CutRulings execute at the LEAK-PREV-P2 serializer; the
    // finalize surface-guard checks the wrong grain against the wrong
    // object. Re-evaluate rulings by declared path + mode against the
    // SHIPPED (post-serializer) projection — the artifact that ships.
    // Telemetry-only at the wire-site (persist invariant): enforce
    // verdicts land on _meta.internal.shipped_surface_guard.
    try {
      const shippedEval = evaluateShippedSurfaceGuard(report_data);
      const _rdS: any = report_data as any;
      _rdS._meta = _rdS._meta ?? {};
      _rdS._meta.internal = _rdS._meta.internal ?? {};
      const _shippedMode = currentEnforceMode(Deno.env);
      _rdS._meta.internal.shipped_surface_guard = {
        build_stamp: BUILD_STAMP,
        mode: _shippedMode,
        cut_violations: shippedEval.cut_violations,
        unowned_paths: shippedEval.unowned_paths,
        enforce_violation:
          _shippedMode === "enforce"
          && (shippedEval.cut_violations.length > 0 || shippedEval.unowned_paths.length > 0),
      };
      console.log(JSON.stringify({
        evt: "shipped_surface_guard_ran", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, mode: _shippedMode,
        cut_violation_count: shippedEval.cut_violations.length,
        cut_violations: shippedEval.cut_violations,
        unowned_paths: shippedEval.unowned_paths,
      }));
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] shipped_surface_guard failed (non-fatal):", (e as Error)?.message);
    }

    // ── ITEM 215 — POST-SERIALIZER SHIPPED VALUE-SCREEN (SMOKE-#10 fix) ──
    // Same consolidation pattern as Items 211 (CUT) and 213 (unowned):
    // leak-lexicon / truncated-slot-value / statutory-text enforcement
    // authority lives on the SHIPPED (post-serializer) projection — the
    // artifact the customer receives. Pre-serializer scaffolding
    // (lint_warnings, retrieval_meta, legacy shims) may reference
    // retired-surface tokens without ever reaching the customer, and
    // the finalize pass records those only as telemetry. Wire-site is
    // telemetry-only for persist (never throws); enforce verdicts land
    // on _meta.internal.shipped_value_screen.
    try {
      // Fix (b) — scrub stale lint entries that reference retired
      // (CUT-listed) top-level surfaces before both the wire-site
      // screen and any downstream consumer. Retired-surface subjects
      // are removed by the serializer; a lint entry describing them
      // is stale.
      try {
        const _rdL: any = report_data as any;
        if (Array.isArray(_rdL.lint_warnings)) {
          const before = _rdL.lint_warnings.length;
          _rdL.lint_warnings = _rdL.lint_warnings.filter(
            (w: any) => !isRetiredSurfacePath(w?.field),
          );
          const dropped = before - _rdL.lint_warnings.length;
          if (dropped > 0) {
            console.log(JSON.stringify({
              evt: "lint_warnings_retired_surface_scrub",
              fn: "run-cppa-risk-assessment",
              build_stamp: BUILD_STAMP, dropped,
            }));
          }
        }
      } catch { /* best-effort scrub */ }

      const svsMode = currentEnforceMode(Deno.env);
      const svsEval = evaluateShippedValueScreen(report_data, { mode: svsMode });
      const _rdV: any = report_data as any;
      _rdV._meta = _rdV._meta ?? {};
      _rdV._meta.internal = _rdV._meta.internal ?? {};
      _rdV._meta.internal.shipped_value_screen = {
        build_stamp: BUILD_STAMP,
        version: SHIPPED_VALUE_SCREEN_VERSION,
        mode: svsEval.mode,
        hits: svsEval.hits.map((h) => ({
          kind: h.kind, match: h.match, path: h.path, context: h.context,
        })),
        enforce_violation: svsEval.enforce_violation,
      };
      console.log(JSON.stringify({
        evt: "shipped_value_screen_ran", fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP, version: SHIPPED_VALUE_SCREEN_VERSION,
        mode: svsEval.mode,
        hit_count: svsEval.hits.length,
        enforce_violation: svsEval.enforce_violation,
        hits: svsEval.hits.map((h) => ({ kind: h.kind, match: h.match, path: h.path })),
      }));
    } catch (e) {
      console.warn("[run-cppa-risk-assessment] shipped_value_screen failed (non-fatal):", (e as Error)?.message);
    }





    // ── T-M9.2 (Item 232) — RUNTIME SHAPE-CONFORMANCE ASSERT ────────
    // Declared shape (COMPOSITION_SHAPE_DECLARATION) allows exactly one
    // LLM call per document: pass1_derive. Any legacy Engine-A v4 call
    // is undeclared drift. Fail loud to status=error rather than ship
    // spend-wasted output.
    if (legacyLlmCallCount > 0) {
      const _driftDetail = `legacy_v4_call_count=${legacyLlmCallCount};labels=${legacyLlmCallLabels.slice(0, 8).join(",")}`;
      console.warn(JSON.stringify({
        evt: "composition_shape_drift_detected",
        fn: "run-cppa-risk-assessment",
        build_stamp: BUILD_STAMP,
        detail: _driftDetail,
      }));
      try {
        const _rdD: any = report_data as any;
        _rdD._meta = _rdD._meta ?? {};
        _rdD._meta.internal = _rdD._meta.internal ?? {};
        _rdD._meta.internal.composition_shape_drift = {
          build_stamp: BUILD_STAMP,
          legacy_v4_call_count: legacyLlmCallCount,
          labels: legacyLlmCallLabels,
        };
      } catch { /* best-effort */ }
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
        status: "error",
        report_data: { error: "composition_shape_drift", detail: _driftDetail },
        last_error: `composition_shape_drift:${_driftDetail}`,
      }, { fn: "run-cppa-risk-assessment", phase: "terminal_error_shape_drift" });
      return;
    }

    const completeWrite = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "complete", report_data }, { fn: "run-cppa-risk-assessment", phase: "terminal_complete" });
    if (!completeWrite.ok) {
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "error", report_data: { error: "complete_write_failed", message: completeWrite.message } }, { fn: "run-cppa-risk-assessment", phase: "terminal_fallback" });
    } else {
      console.log(JSON.stringify({ evt: "report_data_final_persisted", fn: "run-cppa-risk-assessment", build_stamp: BUILD_STAMP, completion_gate: REPORT_COMPLETION_GATE, elapsed_ms: Date.now() - t0 }));
    }

    // L2 — observe-only citation lint (never blocks, never mutates output).
    try {
      await observeCitations(
        supabase,
        "run-cppa-risk-assessment",
        assessment_id,
        JSON.stringify(report_data),
        citations ?? [],
      );
    } catch (obsErr) {
      console.error("[citation-observe] non-fatal:", String(obsErr));
    }


  } catch (e) {
    console.error("run-cppa-risk-assessment v4 error:", e);
    const isTimeout = e instanceof AnthropicTimeoutError
      || (e instanceof Error && ((e as any).code === "anthropic_attempt_abort" || (e as any).code === "generation_timeout_330s"));
    try {
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
        status: "error",
        report_data: isTimeout
          ? { error: "anthropic_attempt_abort", evidence: (e as Error).message, elapsed_ms: (e as any).elapsedMs ?? null, limit_ms: (e as any).limitMs ?? null, label: (e as any).label ?? null }
          : { error: String(e) },
      }, { fn: "run-cppa-risk-assessment", phase: "terminal_error_catch" });
    } catch { /* ignore */ }
    // Re-throw so the wrapped runner marks the fnRun failed via failFunctionRun.
    if (isTimeout) throw e;
  }
}

// ---------------------------------------------------------------------------
// HTTP entrypoint (unchanged contract: accepts { assessment_id }).
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  console.log(`[qb9-rcb1] run-cppa-risk-assessment build active · core=${PROMPT_CORE_VERSION}`);
  console.log("[run-cppa-risk-assessment] qb7 build active");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── MEASUREMENT-VALIDITY LAW (LEGAL-TEST-PIPELINE.md §16) ─────────
  // GET /?ping=1 returns the reported ltp_mode + build_stamp so a batch
  // harness can pre-assert the generator's configuration matches its
  // declared expectation before spending model credits. No side effects.
  const _url = new URL(req.url);
  if (req.method === "GET" && _url.searchParams.get("ping") === "1") {
    return new Response(JSON.stringify({
      fn: "run-cppa-risk-assessment",
      build_stamp: BUILD_STAMP,
      ltp_mode: LTP_MODE_BOOT,
      ltp_version: "ltp-risk-p2",
      // STAGE-B CONTINUATION-4 (item 195) — §16 composition-enforce surface.
      // Fleet asserts this at kickoff via mode-assert; observe-mode reversion
      // is a §16 abort, not a silent drift.
      composition_enforce: Deno.env.get("LTP_COMPOSITION_ENFORCE") === "1" ? "1" : "0",
      persist_first_retry: "retry-budget@2026-07-27-persistfirst",
      report_completion_gate: REPORT_COMPLETION_GATE,
      post_lint_llm_budget_ms: POST_LINT_LLM_BUDGET_MS,
      post_lint_llm_call_timeout_ms: POST_LINT_LLM_CALL_TIMEOUT_MS,
      post_lint_pass1_timeout_ms: POST_LINT_PASS1_TIMEOUT_MS,
      // T-M9 (Item 230): the declared per-attempt timeout is now a REAL
      // AbortController abort on every fetch leg — not a budget the caller
      // never observes. Kickoff mode-assert pings this to detect declared-
      // vs-actual abort-enforcement drift before spend.
      pass1_timeout_enforced: PASS1_TIMEOUT_ENFORCED,

      safe_finalize: SAFE_FINALIZE_VERSION,
      // T-M1 (Item 221) — Pass-1 authoritative surface. Kickoff mode-assert
      // pings this to detect declared-vs-actual model drift before spend.
      pass1_authoritative: "1",
      pass1_model: PASS1_MODEL,
      pass1_max_attempts: PASS1_MAX_ATTEMPTS,
      pass1_stamp: PASS1_MANIFEST.stamp,
      // T-M6 (Item 226) — Pass-2 assembler AUTHORITATIVE surface.
      pass2_assembler: PASS2_ASSEMBLER_VERSION,
      composition_shape: COMPOSITION_SHAPE_DECLARATION,
      // ITEM 235b (T-M9.5b) — LTP LAWS 1-3 landed as standing law.
      ltp_laws_1_3: "item235b-2026-07-28",
      // ITEM 236 (T-M9.6) — RUN #170 fixes: T7 harvest wire, chooseVariant
      // routing, deterministic boilerplate composers, exec-summary
      // projection fix, wa_origin null-on-ok.
      run170_fixes: "item236-2026-07-28",


    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  // POST-time header assertion — caller may declare `x-ltp-mode-expected`
  // and/or `x-ltp-pass1-model-expected`; a mismatch aborts before any
  // generation work runs (LEGAL-TEST-PIPELINE.md §16, T-M1 model-assert).
  const _modeExpected = req.headers.get("x-ltp-mode-expected");
  if (_modeExpected && _modeExpected !== LTP_MODE_BOOT) {
    console.log(JSON.stringify({
      evt: "ltp_mode_mismatch_abort", fn: "run-cppa-risk-assessment",
      expected: _modeExpected, actual: LTP_MODE_BOOT, build_stamp: BUILD_STAMP,
    }));
    return new Response(JSON.stringify({
      error: "ltp_mode_mismatch",
      expected: _modeExpected,
      actual: LTP_MODE_BOOT,
      build_stamp: BUILD_STAMP,
      law: "LEGAL-TEST-PIPELINE.md §16 measurement-validity",
    }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const _pass1ModelExpected = req.headers.get("x-ltp-pass1-model-expected");
  if (_pass1ModelExpected && _pass1ModelExpected !== PASS1_MODEL) {
    console.log(JSON.stringify({
      evt: "ltp_pass1_model_mismatch_abort", fn: "run-cppa-risk-assessment",
      expected: _pass1ModelExpected, actual: PASS1_MODEL, build_stamp: BUILD_STAMP,
    }));
    return new Response(JSON.stringify({
      error: "ltp_pass1_model_mismatch",
      expected: _pass1ModelExpected,
      actual: PASS1_MODEL,
      build_stamp: BUILD_STAMP,
      law: "LEGAL-TEST-PIPELINE.md §16 measurement-validity (T-M1 model-assert)",
    }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const caller = await verifyCaller(req, "user");
  if (!caller.ok) {
    return new Response(JSON.stringify({ error: caller.error ?? "Unauthorized" }), {
      status: caller.status ?? 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let assessment_id: string | undefined;
  let __body: any = {};
  try {
    __body = await req.json();
    assessment_id = __body?.assessment_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!assessment_id) {
    return new Response(JSON.stringify({ error: "assessment_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  // RC-B.1 — scoped-delta revision short-circuit. Owns the entire revision
  // path (patch application, advisory guard, status update, meter bump).
  // Full-regeneration on the revision path is GONE.
  {
    const __rev = await handleRevisionMode(supabase, __body, { toolType: "cppa_risk_assessment" });
    if (__rev) return __rev;
  }

  const ent = await requireEntitlement(caller, "cppa_risk_assessment", { rowId: assessment_id });
  if (!ent.ok) {
    console.log(JSON.stringify({ evt: "entitlement_denied", fn: "run-cppa-risk-assessment", reason: ent.reason }));
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fnRun = await startFunctionRun(supabase, "run-cppa-risk-assessment", {
    archetype: "background",
    trustClass: "user",
    invokedBy: "user",
    metadata: { assessment_id },
  });
  const httpProc = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "processing" }, { fn: "run-cppa-risk-assessment", phase: "pre_generation_http" });
  if (!httpProc.ok) {
    await failFunctionRun(supabase, fnRun, new Error(`lifecycle_write_failed: ${httpProc.message}`), { metadata: { assessment_id, phase: "pre_generation_http" } });
    return new Response(JSON.stringify({ error: "lifecycle_write_failed", message: httpProc.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const wrapped = (async () => {
    try {
      await runPipeline(assessment_id!);
      await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "cppa_assessments", sourceRowId: assessment_id! });
    } catch (e) {
      console.error("pipeline error:", e);
      const { data: maybeCompleted } = await supabase
        .from("cppa_assessments")
        .select("status, report_data")
        .eq("id", assessment_id!)
        .maybeSingle();
      if ((maybeCompleted as any)?.status === "complete" && (maybeCompleted as any)?.report_data) {
        await finishFunctionRun(supabase, fnRun, {
          status: "success",
          sourceTable: "cppa_assessments",
          sourceRowId: assessment_id!,
          metadata: { assessment_id, recovered_after_error: true, original_error: (e as Error)?.message ?? String(e) },
        });
      } else {
        // T-M9.1 (Item 231) — FAIL-LOUD: persist the error to the assessment
        // row itself so a dead background isolate cannot leave a row frozen
        // at status='processing' with last_error=NULL. Silent background
        // death is now structurally impossible: any uncaught throw in
        // runPipeline lands here and writes status='error' + last_error
        // BEFORE the isolate exits. Wrapped in its own try/catch so a DB
        // failure on the error-write path cannot re-throw and defeat the
        // guarantee.
        const errMsg = (e as Error)?.message ?? String(e);
        const errStack = (e as Error)?.stack?.slice(0, 2000) ?? null;
        try {
          await supabase.from("cppa_assessments").update({
            status: "error",
            last_error: `background_task_uncaught: ${errMsg}`,
            updated_at: new Date().toISOString(),
          }).eq("id", assessment_id!);
          console.error(JSON.stringify({
            evt: "background_task_persisted_error",
            fn: "run-cppa-risk-assessment",
            assessment_id, build_stamp: BUILD_STAMP,
            error: errMsg, stack: errStack,
          }));
        } catch (persistErr) {
          console.error(JSON.stringify({
            evt: "background_task_persist_error_failed",
            fn: "run-cppa-risk-assessment",
            assessment_id, build_stamp: BUILD_STAMP,
            original_error: errMsg,
            persist_error: (persistErr as Error)?.message ?? String(persistErr),
          }));
        }
        await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
      }
    }
  })();
  // @ts-ignore Deno Edge Runtime API
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) {
    er.waitUntil(wrapped);
  }


  return new Response(JSON.stringify({ accepted: true, assessment_id }), {
    status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
