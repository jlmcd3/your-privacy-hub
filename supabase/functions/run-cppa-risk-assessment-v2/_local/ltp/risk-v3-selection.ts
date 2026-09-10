// DOC 224 / 224A / 229 / 231 — THE CPPA RISK V3 SELECTION CALL SITE.
//
// The product-side orchestration LIA's `run-li-assessment/index.ts`
// performs inline (that file is off-limits to this build and cross-
// function imports are forbidden regardless) — reproduced here as its own
// module so `generate-cppa-risk.ts`'s finalize step stays a thin, fail-open
// try/catch around ONE call, matching every other step in that pipeline
// (doc 231 build log names the exact call site).
//
// THE INVARIANT THIS FILE EXISTS TO PROVE (doc 231 zero-call regression
// test): while `RISK_V3_ENABLED` is false OR `RISK_HOOKS` is empty,
// `attachRiskHookSelection` performs ZERO database reads and ZERO network
// calls — it returns before touching `opts.db` or `invokeGated` at all.
//
// LIVE SINCE 2026-09-10: neither condition holds any more. RISK_V3_ENABLED is
// on and RISK_HOOKS carries ratified rows (three as of doc 249), so this
// function DOES make the two-leg selection call — classify-propositions
// `select_hooks`, one request per leg (claude-sonnet-5 + gpt-4o), metered to
// api_usage under the customer's assessment id — whenever the planner names
// at least one pair whose agreement the record does not settle. Batch
// 66b383d8's Risk row recorded calls_this_generation=1. This is the ONLY
// model call on the Risk customer path; pass 1 and refinement are gated off
// separately in index.ts. Do not read this file as "pure code".
//
// FAIL-OPEN (matches every other finalize step in generate-cppa-risk.ts):
// any error — a DB read failure, a malformed response, a thrown client —
// is caught, recorded in the returned record's `error` field, and the
// caller proceeds with the V2 document. A selection call NEVER blocks or
// changes the deterministic report other than by adding ratified hook
// sentences / ROO entries when it succeeds.
//
// CALL DISCIPLINE (doc 224A §8, D1–D10): the planner (`planRiskHookSelection`,
// hook-join.ts) has already applied the matrix pre-filter (D1), the
// canonical-text hashing the content-addressed store keys on (D2), the
// unanswered-field skip (D4) and the cap check is applied here (D9) before
// any request is built. ONE request per leg, batched over every item the
// plan names (doc 224 §3) — never one request per hook.

import { RISK_V3_ENABLED } from "./risk-v3-flag.ts";
import { RISK_HOOKS } from "../corpus/maps/risk-hooks.ts";
import {
  applyRiskHooks,
  planRiskHookSelection,
  resolveHookSelections,
  type HookSelectionRow,
  type SelectionConsidered,
} from "./hook-join.ts";
import { buildRiskRuleStates } from "./v3/rule-states.ts";
import { invokeGated } from "../../../_shared/invoke-gated.ts";
import { RISK_ROO_UNSETTLED_TEMPLATE } from "./v3/readback-templates.ts";
import type { HookApplication } from "../../../_shared/corpus/hook-types.ts";
import { canonicalAnswerHash } from "../../../_shared/corpus/hook-selection.ts";

/** Minimal client shape used (Supabase-js compatible); injectable for tests
 *  so this module never needs a live network stub — same pattern as LIA's
 *  `ReadingsClientLike` (v3/load-readings.ts). */
export interface RiskV3DbClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): {
        eq(column2: string, value2: string): PromiseLike<{ data: unknown; error: unknown }>;
      } & PromiseLike<{ data: unknown; error: unknown }>;
    };
  };
}

export interface AttachRiskV3Options {
  readonly db?: RiskV3DbClient;
  readonly assessmentId: string;
  /** `tool_run_meter.runs_allowed` for this assessment (doc 224 §3 cap = 2×). */
  readonly runsAllowed: number;
  /** `tool_run_meter.runs_used` + 1 = this generation number. */
  readonly generationNo: number;
}

export interface RiskV3SelectionRecord {
  readonly enabled: boolean;
  readonly hooks_available: number;
  readonly generation_no: number | null;
  readonly cap: number | null;
  readonly calls_this_generation: number;
  readonly considered: readonly SelectionConsidered[];
  readonly applications: readonly HookApplication[];
  readonly information_needed_entries: readonly RiskV3InformationNeededEntry[];
  readonly error: string | null;
}

/** DOC 229 §8 default #5 — the ROO-target investigation (doc 231 build log
 *  "meter/ROO-path investigation result" carries the full finding).
 *  CONCLUSION: this does NOT yet ride CPPA Risk's live customer-facing
 *  `information_needed` surface. That array is composed at PASS-1/plan
 *  time (`computeRecordNeeds` / `composeInformationNeeded`,
 *  _local/ltp/section-composers/cppa-risk.ts ~1442-1539) as rendered
 *  `T.risk.documentation.gap` template instances, and pruned at serialize
 *  time to `RISK_ENTRY_KEYS` (report-schemas/cppa-risk.ts), which does NOT
 *  admit a raw entry's `question`/`label`/`need_id`/`kind` fields — an
 *  object appended here post-hoc would be silently stripped to near-
 *  nothing, not safely rendered. This build therefore writes these
 *  entries to `_meta.internal.risk_v3.information_needed_entries` ONLY
 *  (machine-readable audit record, doc 224 §4.A.5's requirement) and never
 *  pushes them onto `report.information_needed` itself. Riding the real
 *  surface is a scoped follow-up: either compute hook selection before
 *  Pass-1 (reordering questions doc 224's "final nominated hook set"
 *  model does not answer for this product), or extend `RecordNeed` /
 *  `composeInformationNeeded` with a hook-sourced variant. */
export interface RiskV3InformationNeededEntry {
  readonly field: string;
  readonly ask: string;
  readonly source: "hook_selection";
  readonly hook_id: string;
}

function emptyRecord(enabled: boolean, error: string | null = null): RiskV3SelectionRecord {
  return {
    enabled,
    hooks_available: RISK_HOOKS.length,
    generation_no: null,
    cap: null,
    calls_this_generation: 0,
    considered: [],
    applications: [],
    information_needed_entries: [],
    error,
  };
}

/**
 * The ONE call site. Returns the record `finalizeCppaRiskPayload` writes to
 * `_meta.internal.risk_v3` and the hook applications / ROO entries a
 * (currently nonexistent, since RISK_HOOKS is empty) render pass would
 * consume. `verdicts` is keyed by CAM factor_id (doc 229 §8 default #1) —
 * `[NEEDS]`: the exact deterministic per-factor source is not yet wired
 * (doc 231 build log); an empty `verdicts` map degrades safely (every hook
 * evaluates against `verdicts[factor] ?? null`, never throws) and changes
 * nothing while RISK_HOOKS is empty.
 */
export async function attachRiskHookSelection(
  intake: Record<string, unknown>,
  verdicts: Record<string, string>,
  rankedSourceIds: readonly string[],
  determinativeSourceIds: ReadonlySet<string>,
  opts: AttachRiskV3Options,
): Promise<RiskV3SelectionRecord> {
  // ── THE ZERO-CALL GUARANTEE — checked before anything else touches the
  // network or the database. ────────────────────────────────────────────
  if (!RISK_V3_ENABLED) return emptyRecord(false);
  if (RISK_HOOKS.length === 0) return emptyRecord(true); // nothing to select against yet

  try {
    const states = buildRiskRuleStates(intake);
    const cap = 2 * Math.max(0, opts.runsAllowed);

    // Prior selections for this assessment (doc 224 §1 step 3): agreed +
    // same canonical hash -> locked; disagreed + same hash -> lapsed;
    // different hash -> superseded (handled by the planner treating a
    // superseded row as absent — it is simply not in `priorRows` below).
    const priorRows = await loadPriorSelections(opts.db, opts.assessmentId);
    const { selections, unsettled } = resolveHookSelections(priorRows);
    const lapsed = await computeLapsed(priorRows, intake);

    const plan = planRiskHookSelection(
      RISK_HOOKS,
      states,
      verdicts,
      rankedSourceIds,
      determinativeSourceIds,
      intake,
      { selections, unsettled, lapsed },
    );

    let callsThisGeneration = 0;
    const newRows: HookSelectionRow[] = [];
    if (plan.items.length > 0 && opts.generationNo > 0) {
      if (callsThisGeneration + 1 > cap) {
        // Cap reached: the generation still completes with default entries
        // (doc 224 §3's "the generation still completes" rule); nothing
        // more is recorded than the plan itself.
      } else if (opts.db) {
        // ONE request per leg, batched over the whole plan (doc 224 §3).
        callsThisGeneration += 1;
        const resp = await invokeGated("classify-propositions", {
          action: "select_hooks",
          product: "cppa-risk",
          assessment_id: opts.assessmentId,
          generation_no: opts.generationNo,
          items: plan.items,
        }, { timeoutMs: 240_000, maxBodyChars: 0 });
        if (resp.ok) {
          const parsed = safeParseSelectHooksResponse(resp.body);
          for (const row of parsed) newRows.push(row);
        }
        // A non-2xx / thrown response is fail-open: no rows are added, the
        // plan's `considered` list still documents what was attempted, and
        // the default entry stands for every affected hook.
      }
    }

    const allRows = [...priorRows, ...newRows];
    const finalResolved = resolveHookSelections(allRows);

    const { applications } = applyRiskHooks(
      RISK_HOOKS,
      states,
      verdicts,
      rankedSourceIds,
      determinativeSourceIds,
      { selections: finalResolved.selections, unsettled: finalResolved.unsettled, lapsed },
    );

    const informationNeeded: RiskV3InformationNeededEntry[] = [];
    for (const hookId of finalResolved.unsettled) {
      const hook = RISK_HOOKS.find((h) => h.hook_id === hookId);
      if (!hook) continue;
      const fieldForAsk = plan.considered.find((c) => c.hook_id === hookId)?.field_ids?.[0];
      if (!fieldForAsk) continue;
      informationNeeded.push({
        field: fieldForAsk,
        ask: RISK_ROO_UNSETTLED_TEMPLATE,
        source: "hook_selection",
        hook_id: hookId,
      });
    }

    return {
      enabled: true,
      hooks_available: RISK_HOOKS.length,
      generation_no: opts.generationNo,
      cap,
      calls_this_generation: callsThisGeneration,
      considered: plan.considered,
      applications,
      information_needed_entries: informationNeeded,
      error: null,
    };
  } catch (e) {
    return emptyRecord(true, (e as Error)?.message ?? String(e));
  }
}

async function loadPriorSelections(db: RiskV3DbClient | undefined, assessmentId: string): Promise<HookSelectionRow[]> {
  if (!db) return [];
  try {
    const res = await db.from("hook_selections").select("*").eq("assessment_id", assessmentId).eq("product", "cppa-risk");
    if (res.error) return [];
    const rows = Array.isArray(res.data) ? res.data : [];
    // DOC 237 — only LIVE rows are prior selections. LIA's, DPIA's and
    // ADMT's loaders all filter `status in ("agreed", "disagreed")`; this
    // one read every row, so a `superseded` (answer since revised) or
    // `unsettled_final` (let go) row still carrying an `agreement` would
    // have resolved as a locked selection on the next generation. Filtered
    // client-side (the minimal `RiskV3DbClient` shape has no `.in()`); the
    // hash comparison that PRODUCES those statuses is still the open
    // `computeLapsed` [NEEDS] (doc 231A §7.3).
    const live = rows.filter((r) => {
      const status = (r as Record<string, unknown> | null)?.status;
      return status === undefined || status === null || status === "agreed" || status === "disagreed";
    });
    return live.map((r) => parseHookSelectionRow(r)).filter((r): r is HookSelectionRow => r !== null);
  } catch {
    return [];
  }
}

function parseHookSelectionRow(raw: unknown): HookSelectionRow | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (typeof o.hook_id !== "string" || typeof o.field_id !== "string") return null;
  const agreement = o.agreement === "same" || o.agreement === "different" ? o.agreement : "unknown";
  return {
    field_id: o.field_id,
    hook_id: o.hook_id,
    agreement,
    matched_atom: typeof o.matched_atom === "string" ? o.matched_atom : null,
    evidence_span: typeof o.evidence_span === "string" ? o.evidence_span : null,
    decision_id: typeof o.decision_id === "string" ? o.decision_id : "",
    legs_disagreed: o.status === "disagreed" || o.legs_disagreed === true,
    source: o.source === "store" ? "store" : "model",
  };
}

/** DOC 224A §3.4 — a disagreed row whose canonical answer text is UNCHANGED
 *  since it was recorded lapses (let go, no further ask); a changed answer
 *  is simply absent from `priorRows` under its old hash and is treated as
 *  a fresh `unknown` by the planner. Computing "unchanged" requires the
 *  row's own recorded answer_hash, which `hook_selections` carries but
 *  this minimal client projection does not yet read — `[NEEDS]`: doc 231
 *  build log. Until that column is read here, no row is ever marked
 *  lapsed (the conservative degrade: an unrevised disagreement re-asks
 *  rather than silently going quiet, which is safe — never a silent
 *  drop — but not yet the CEO's "let it go" behavior in the disagreed
 *  case specifically). */
// deno-lint-ignore require-await
async function computeLapsed(_priorRows: readonly HookSelectionRow[], _intake: Record<string, unknown>): Promise<ReadonlySet<string>> {
  return new Set();
}

function safeParseSelectHooksResponse(body: string): HookSelectionRow[] {
  try {
    const parsed = JSON.parse(body) as { rows?: unknown[] };
    if (!Array.isArray(parsed.rows)) return [];
    return parsed.rows.map((r) => parseHookSelectionRow(r)).filter((r): r is HookSelectionRow => r !== null);
  } catch {
    return [];
  }
}

// Re-exported so callers that already have a canonical hash (e.g. a future
// answer-hash comparison in `computeLapsed`) do not need a second import.
export { canonicalAnswerHash };
