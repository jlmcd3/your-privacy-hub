// DOC 235 — THE ADMT V3 SELECTION ORCHESTRATOR. The ONE call site
// `run-admt-checker-v2/index.ts` invokes, dark behind `ADMT_V3_ENABLED`,
// fail-open. Mirrors CPPA Risk's own `risk-v3-selection.ts` (doc 231 §2 —
// "the V3 call site is its own module... invoked as one more fail-open
// step, rather than inline code," the pattern this build follows given
// ADMT's own index.ts is a small, synchronous pipeline much closer in
// shape to Risk's modular decomposition than to LIA's single 2,700-line
// index.ts) and reconstructs the SAME lock/lapse/supersede -> plan -> call
// -> resolve -> join sequence LIA's index.ts implements inline (doc 224 /
// 224A) — see that file's own extensive comments for the full rationale of
// each step; this file's comments focus on what is ADMT-SPECIFIC.
//
// ADMT-SPECIFIC DEPARTURES FROM LIA/DPIA/RISK, DISCLOSED:
//  1. Gated on a real `assessment_id` in addition to the flag — the
//     harness/stress-test direct-intake calling convention has no
//     `hook_selections`/`tool_run_meter` row to key off (admt-v3-flag.ts's
//     own comment explains why this is safe to skip rather than guess at).
//  2. `rankedSourceIds` is every hook's own `source_row_id`, unranked — NOT
//     a relevance scorer. Doc 216 §1(f) explicitly recommends AGAINST
//     building one yet ("given only one AP row exists, a relevance-ranking
//     scorer... is not worth building yet... leave the single AP row's
//     unconditional display alone until the pool grows") — this build
//     follows that instruction rather than over-building for a corpus this
//     thin. `[NEEDS]`: replace with a real ranker (mirroring CPPA Risk's
//     doc 231A `hook-persuasive.ts`) once ADMT's AP/FSOR pool grows past a
//     handful of rows.
//  3. `determinativeSourceIds` IS a real, wired computation (not a stub) —
//     ADMT already has the exact mechanism CPPA Risk had to build from
//     scratch in its own 231A follow-up (`deriveRiskFiredStates` +
//     `attachCorpusRows`): `deriveAdmtFiredStates`/`attachCorpusRows` are
//     ALREADY shipped, dark, unconditional functions
//     (admt-v2-assemble.ts) that this file reuses read-only to find every
//     CAM row already cited on the S4 (Regulatory Interpretation
//     subsections) or S5 (Persuasive Authority appendix) surfaces, so the
//     same authority is never cited twice under two different mechanisms.
//  4. NO customer-facing ROO surface exists — ADMT's report schema
//     (report-schemas/admt-v2.ts) carries no `information_needed` key at
//     all (unlike LIA/DPIA/Risk). This file records a disagreed-hook ask
//     ONLY in the returned record block (`_meta.internal.admt_v3.roo_asks`,
//     the doc 224 §4.A.5 audit record) — see doc 235's build log for the
//     full "ROO surface" investigation and why this build does not invent
//     one.

import type { AuthorityHook, HookApplication } from "../../../_shared/corpus/hook-types.ts";
import { canonicalAnswerHash, canonicalAnswerText } from "../../../_shared/corpus/hook-selection.ts";
import type { AdmtV2Computed } from "./admt-v2-deterministic.ts";
import { deriveAdmtFiredStates } from "./admt-v2-assemble.ts";
import { attachCorpusRows } from "../../../_shared/corpus/cam-attach.ts";
import { ADMT_CORPUS_MAP } from "../corpus/maps/admt-corpus-map.ts";
import { ADMT_HOOKS } from "../corpus/maps/admt-hooks.ts";
import {
  applyAdmtHooks,
  planAdmtHookSelection,
  resolveHookSelections,
  ADMT_SECTION_ID_FOR_ELEMENT,
  type HookSelectionRow,
} from "./hook-join.ts";
import { buildAdmtRuleStates } from "./v3/rule-states.ts";
import { admtV3Answer, admtV3FieldLabel, ADMT_V3_FIELDS } from "./v3/field-labels.ts";
import { ADMT_ROO_UNSETTLED_TEMPLATE } from "./v3/readback-templates.ts";
import { ADMT_V3_ENABLED } from "./admt-v3-flag.ts";
import { ADMT_HOOKS_ENABLED } from "./admt-hooks-flag.ts";

/** DOC 235 — the "append these sentences into the assembled document"
 *  contract, threaded into `assembleAdmtV2Document`'s `AssembleArgs` as a
 *  purely-additive optional parameter, mirroring DPIA's own
 *  `DpiaV3SkeletonAppend` (doc 232 §5). Keyed by the `admt-v2-assemble.ts`
 *  section id ("applicability" | "notice" | "optout" | "access" | "vendor")
 *  a hook's factor maps to (`ADMT_SECTION_ID_FOR_ELEMENT`, hook-join.ts). */
export type AdmtV3SkeletonAppend = Readonly<Record<string, readonly string[]>>;

export interface AdmtV3SelectionResult {
  /** Sentences to splice into the assembled document, by section id. Empty
   *  object while `ADMT_HOOKS_ENABLED` is false or nothing settled — the
   *  assembler treats an absent/empty key as "nothing to append," never a
   *  padded empty paragraph. */
  readonly append: AdmtV3SkeletonAppend;
  /** The full accounting written to `_meta.internal.admt_v3` — mirrors
   *  LIA's `acct`/DPIA's/Risk's own record blocks. */
  readonly record: Record<string, unknown>;
}

const EMPTY_RESULT: AdmtV3SelectionResult = {
  append: {},
  record: { enabled: false, hooks_enabled: false, hooks_in_corpus: 0 },
};

/** Determinative source ids: every CAM row already cited (unconditionally)
 *  on the S4 "Regulatory Interpretation" subsections or the S5 Persuasive
 *  Authority appendix — the same authority a hook could ALSO cite must not
 *  be cited twice by two different mechanisms. Pure, read-only reuse of the
 *  already-shipped `deriveAdmtFiredStates`/`attachCorpusRows` (see file
 *  header point 3). */
function admtDeterminativeSourceIds(computed: AdmtV2Computed): ReadonlySet<string> {
  const fired = deriveAdmtFiredStates(computed);
  const out = new Set<string>();
  for (const surface of ["S4", "S5"] as const) {
    for (const row of attachCorpusRows(ADMT_CORPUS_MAP, surface, fired)) {
      if (row.role === "FC" || row.role === "AP") out.add(row.source_row_id);
    }
  }
  return out;
}

/** Every hook's own source, unranked (see file header point 2). */
function admtRankedSourceIds(hooks: readonly AuthorityHook[]): readonly string[] {
  return hooks.map((h) => h.source_row_id);
}

/**
 * DOC 231 §12 ("a TS2589 excessively deep type instantiation... fixed by
 * typing the option `unknown` and casting only at the point of use") —
 * this build applies that same fix from the start rather than rediscovering
 * it: `supabase` is typed `unknown` here and cast (`as AdmtDbLike`, a
 * minimal duck-typed surface for exactly the two calls this file makes) at
 * each point of use, never as the full generic `SupabaseClient` type.
 */
export interface RunAdmtV3SelectionArgs {
  readonly supabase: unknown;
  readonly assessmentId: string | null;
  readonly intake: Record<string, unknown>;
  readonly computed: AdmtV2Computed;
}

interface AdmtDbLike {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: unknown): {
        eq(col: string, val: unknown): { maybeSingle(): Promise<{ data: unknown }> };
        in(col: string, vals: readonly string[]): Promise<{ data: unknown }>;
      };
    };
    update(patch: Record<string, unknown>): { in(col: string, vals: readonly string[]): Promise<unknown> };
  };
}

/**
 * The one entry point `run-admt-checker-v2/index.ts` calls. Fail-open: any
 * error inside the try block below leaves every pair pending and the V2
 * document ships unchanged — the record block names the error, exactly as
 * LIA's/DPIA's/Risk's own selection blocks do. Returns `EMPTY_RESULT`
 * (never throws) when the flag is off, no assessment id exists, or
 * `ADMT_HOOKS` is empty — the last of these is the state production is in
 * TODAY, verified by this build's own zero-call regression suite.
 */
export async function runAdmtV3Selection(args: RunAdmtV3SelectionArgs): Promise<AdmtV3SelectionResult> {
  if (!ADMT_V3_ENABLED) return EMPTY_RESULT;
  if (!args.assessmentId) return EMPTY_RESULT; // see file header point 1
  if (ADMT_HOOKS.length === 0) {
    return { append: {}, record: { enabled: true, hooks_enabled: ADMT_HOOKS_ENABLED, hooks_in_corpus: 0 } };
  }

  const { assessmentId, intake, computed } = args;
  const db = args.supabase as AdmtDbLike;
  const selStarted = Date.now();
  const acct: Record<string, unknown> = {
    enabled: true, hooks_enabled: ADMT_HOOKS_ENABLED, hooks_in_corpus: ADMT_HOOKS.length,
    generation_no: null, cap: null, hooks_in_play: 0, items_planned: 0,
    calls_made: 0, from_store: 0, from_model: 0, locked: 0, lapsed: 0, superseded: 0,
    unsettled: [], conflicts: [], applications_rendered: 0, roo_asks: [] as Record<string, unknown>[],
    considered: [], error: null,
  };
  const append: Record<string, string[]> = {};

  try {
    const states = buildAdmtRuleStates(intake, computed);
    const rankedSourceIds = admtRankedSourceIds(ADMT_HOOKS);
    const determinativeSourceIds = admtDeterminativeSourceIds(computed);

    // Generation number = the meter's runs_used + 1 (no row yet -> 1); the
    // cap is 2 calls per generation x runs_allowed, same as LIA/Risk (doc
    // 224 §3). Pre-read BEFORE this generation's own
    // recordRunMeterAndVersion call in index.ts (doc 231 NEED #4's fix,
    // built correctly from the start here rather than left as a follow-up).
    let generationNo = 1;
    let runsAllowed = 4;
    try {
      const { data: meterRow } = await db
        .from("tool_run_meter").select("runs_used,runs_allowed")
        .eq("tool_type", "cppa_admt").eq("assessment_id", assessmentId).maybeSingle();
      if (meterRow) {
        generationNo = Number((meterRow as any).runs_used ?? 0) + 1;
        runsAllowed = Number((meterRow as any).runs_allowed ?? 4);
      }
    } catch { /* first generation — defaults stand */ }
    acct.generation_no = generationNo;
    acct.cap = 2 * runsAllowed;

    // Prior rows: lock (agreed, same canonical answer hash) / let go
    // (disagreed, same hash -> unsettled_final) / supersede (hash changed).
    const priorRes = await db.from("hook_selections")
      .select("id,field_id,hook_id,answer_hash,decision_id,agreement,matched_atom,evidence_span,legs_disagreed,status,generation_no")
      .eq("assessment_id", assessmentId).in("status", ["agreed", "disagreed"]);
    const prior = Array.isArray(priorRes.data) ? priorRes.data as any[] : [];
    const hashByField = new Map<string, string>();
    const hashOf = async (field_id: string): Promise<string> => {
      let h = hashByField.get(field_id);
      if (h === undefined) {
        h = await canonicalAnswerHash(admtV3Answer(intake, field_id));
        hashByField.set(field_id, h);
      }
      return h;
    };
    const lockedRows: HookSelectionRow[] = [];
    const lapsed = new Set<string>();
    const supersededIds: string[] = [];
    const lapsedIds: string[] = [];
    for (const r of prior) {
      const cur = await hashOf(String(r.field_id));
      if (cur !== String(r.answer_hash ?? "")) { supersededIds.push(String(r.id)); continue; }
      if (r.status === "agreed") {
        lockedRows.push({
          field_id: String(r.field_id), hook_id: String(r.hook_id),
          agreement: r.agreement === "same" || r.agreement === "different" ? r.agreement : "unknown",
          matched_atom: r.matched_atom ?? null, evidence_span: r.evidence_span ?? null,
          decision_id: String(r.decision_id ?? ""), legs_disagreed: false, source: "store",
        });
      } else {
        lapsed.add(String(r.hook_id));
        lapsedIds.push(String(r.id));
      }
    }
    const nowIso = new Date().toISOString();
    if (supersededIds.length) await db.from("hook_selections").update({ status: "superseded", updated_at: nowIso }).in("id", supersededIds);
    if (lapsedIds.length) await db.from("hook_selections").update({ status: "unsettled_final", updated_at: nowIso }).in("id", lapsedIds);
    const locked = resolveHookSelections(lockedRows);
    acct.locked = locked.selections.size;
    acct.lapsed = lapsed.size;
    acct.superseded = supersededIds.length;

    // Plan: only the pairs the matrix says could print, on fields the
    // customer actually answered, with no stored decision.
    const plan = planAdmtHookSelection(
      ADMT_HOOKS, states, states.verdicts, rankedSourceIds, determinativeSourceIds, intake,
      { selections: locked.selections, lapsed },
    );
    acct.hooks_in_play = new Set(ADMT_HOOKS.map((h) => h.hook_id)).size;
    acct.items_planned = plan.items.length;
    acct.considered = plan.considered;

    const classifyFields = ADMT_V3_FIELDS
      .map((f) => ({ field_id: f.field_id, question_text: f.label, answer: canonicalAnswerText(admtV3Answer(intake, f.field_id)) }))
      .filter((f) => f.answer.length >= 12);

    const rows: HookSelectionRow[] = [...lockedRows];
    if (plan.items.length > 0 || classifyFields.length > 0) {
      const { invokeGated } = await import("../../../_shared/invoke-gated.ts");
      const r = await invokeGated("classify-propositions", {
        action: "select_hooks", product: "admt", assessment_id: assessmentId, generation_no: generationNo,
        items: plan.items, classify_fields: classifyFields,
      }, { timeoutMs: 240_000, maxBodyChars: 0 });
      if (!r.ok) {
        acct.error = `select_hooks ${r.status}: ${String(r.error ?? r.body).slice(0, 300)}`;
      } else {
        const body = JSON.parse(r.body || "{}");
        acct.calls_made = Number(body.calls_made ?? 0);
        acct.from_store = Number(body.from_store ?? 0);
        acct.from_model = Number(body.from_model ?? 0);
        acct.cap_reached = body.cap_reached === true;
        for (const x of Array.isArray(body.rows) ? body.rows : []) {
          rows.push({
            field_id: String(x.field_id), hook_id: String(x.hook_id),
            agreement: x.agreement === "same" || x.agreement === "different" ? x.agreement : "unknown",
            matched_atom: x.matched_atom ?? null, evidence_span: x.evidence_span ?? null,
            decision_id: String(x.decision_id ?? ""), legs_disagreed: x.legs_disagreed === true,
            source: x.source === "model" ? "model" : "store",
          });
        }
      }
    }
    const resolved = resolveHookSelections(rows);
    acct.unsettled = [...resolved.unsettled];
    acct.conflicts = resolved.conflicts;

    const { applications, flags } = applyAdmtHooks(
      ADMT_HOOKS, states, states.verdicts, rankedSourceIds, determinativeSourceIds,
      { selections: resolved.selections, unsettled: resolved.unsettled, lapsed },
    );
    acct.flags = flags;
    acct.applications_rendered = applications.length;

    // Splice rendered sentences into the append map, keyed by section id —
    // ONLY while ADMT_HOOKS_ENABLED (the separate render gate). A settled
    // selection with the render flag off is stored/computed but never
    // reaches the document (matches admt-hooks-flag.ts's own law).
    if (ADMT_HOOKS_ENABLED) {
      const hookById = new Map(ADMT_HOOKS.map((h) => [h.hook_id, h] as const));
      for (const app of applications as HookApplication[]) {
        const hook = hookById.get(app.hook_id);
        const sectionId = hook ? ADMT_SECTION_ID_FOR_ELEMENT[hook.bears_on_element] : undefined;
        if (!sectionId) continue; // a factor with no section mapping never appends (unresolved slot, not a crash)
        (append[sectionId] ??= []).push(app.sentence);
      }
    }

    // ROO ask — recorded ONLY in the internal audit block (file header
    // point 4; no customer-facing surface exists for ADMT today).
    const asked = new Set<string>();
    for (const hookId of resolved.unsettled) {
      const row = rows.find((x) => x.hook_id === hookId && x.legs_disagreed) ?? rows.find((x) => x.hook_id === hookId);
      const field = row?.field_id;
      if (!field || asked.has(field)) continue;
      asked.add(field);
      (acct.roo_asks as Record<string, unknown>[]).push({
        field, question: admtV3FieldLabel(field), ask: ADMT_ROO_UNSETTLED_TEMPLATE,
        source: "hook_selection", hook_id: hookId,
      });
    }
  } catch (e) {
    acct.error = String((e as Error)?.message ?? e);
    console.warn("[run-admt-checker-v2] hook selection failed (non-fatal):", (e as Error)?.message);
  }
  acct.elapsed_ms = Date.now() - selStarted;
  return { append, record: acct };
}
