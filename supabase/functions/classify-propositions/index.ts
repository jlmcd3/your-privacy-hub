// build-marker: classify-propositions-doc224-2026-09-08
console.log("[build-marker] classify-propositions doc224-2026-09-08");
//
// DOC 217 §4 (two-leg proposition reading) + DOC 224 §3–§4.B (two-leg HOOK
// SELECTION, the ROO's store). The construct (CEO, 2026-09-08 — ledger 210
// A10-6): readings are NEVER shown to a customer; there is no customer
// disposition of a reading. The four tables are service-role only; the
// browser never writes them directly.
//
// ACTIONS
//   { action: "classify",     product, field_id, question_text, answer, assessment_id? }
//   { action: "select_hooks", product, assessment_id, generation_no, items:[SelectionItem],
//                             classify_fields?:[{field_id, question_text, answer}] }
//   { action: "replay",       decision_id }
//   { action: "status",       product? }
//   { action: "gate_action",  result_id, customer_action, assessment_id, preview_token? }
//   { action: "submit_state", assessment_id, intake_hash, preview_token? }
//
// THE RULE (doc 224 §1): a model is called for a pair iff no stored decision
// exists for its exact input. `select_hooks` makes at most ONE request per
// leg per generation (every miss in one bundle), never at preview, and
// never past the assessment's ceiling of 2 × runs_allowed (D9 — an
// invariant, not a limiter; a reached cap returns store-only).

import { verifyCaller } from "../_shared/verify-caller.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runClassify, PRIMARY_MODEL, SECOND_MODEL, type ClassifyDeps } from "./_local/classify.ts";
import { classifyPromptHash, type InventoryRow } from "./_local/prompts.ts";
import { callModelJson } from "./_local/model-call.ts";
import { runSelectHooks, type SelectDeps } from "./_local/select.ts";
import {
  answerIsUsable,
  canonicalAnswerHash,
  canonicalAnswerText,
  type SelectionCandidate,
  type SelectionItem,
} from "../_shared/corpus/hook-selection.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token, x-driver-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const DAILY_CLASSIFY_LIMIT = 20;
const SELECT_FUNCTION_NAME = "classify-propositions:select_hooks";

/** One caller for both vendors (Claude structured output; GPT-4o strict
 *  json_schema) — the grader's own code and keys, see _local/model-call.ts. */
async function modelCall(model: string, system: string, user: string, schema: Record<string, unknown>): Promise<string> {
  const r = await callModelJson({ model, system, user, schema, schemaName: "structured_output" });
  return r.text;
}

type Db = ReturnType<typeof admin>;

/**
 * Write authorisation for the customer-facing actions: either the request JWT's
 * user owns the li_assessments row, or the anonymous preview token matches a row
 * that has no owner yet.
 */
async function authoriseRowWrite(
  db: Db,
  assessmentId: string,
  userId: string | null,
  previewToken: string | null,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const { data: row } = await db
    .from("li_assessments")
    .select("id, user_id, preview_token")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!row) return { ok: false, status: 404, error: "assessment_not_found" };
  if (userId && row.user_id === userId) return { ok: true };
  if (
    !row.user_id && previewToken && row.preview_token &&
    previewToken === row.preview_token
  ) return { ok: true };
  return { ok: false, status: 403, error: "not_row_owner" };
}

function classifyDeps(db: Db): ClassifyDeps {
  return {
    async loadInventory(product, field_id) {
      const { data } = await db
        .from("proposition_inventory")
        .select("prop_id, label, definition, positive_examples, negative_examples, sibling_group, version")
        .eq("product", product)
        .eq("field_id", field_id)
        .is("retired_at", null)
        .not("ratified_by", "is", null)
        .not("ratified_at", "is", null)
        .not("ledger_ref", "is", null)
        .order("prop_id");
      return (data ?? []) as InventoryRow[];
    },
    async findDecision(decision_id) {
      const { data } = await db
        .from("proposition_decisions")
        .select("decision_id, readings, conformance, inventory_version, created_at")
        .eq("decision_id", decision_id)
        .maybeSingle();
      return (data as never) ?? null;
    },
    async saveDecision(row) {
      await db.from("proposition_decisions").upsert(row, { onConflict: "decision_id" });
    },
    callModel: modelCall,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Validate the engine's items (doc 224 §3) — shape only; content is the
 *  planner's. Anything malformed is dropped by name. */
function parseItems(raw: unknown): { items: SelectionItem[]; dropped: string[] } {
  const items: SelectionItem[] = [];
  const dropped: string[] = [];
  for (const it of Array.isArray(raw) ? raw : []) {
    const o = (it ?? {}) as Record<string, unknown>;
    const field_id = str(o.field_id);
    const question_text = str(o.question_text);
    const answer = canonicalAnswerText(o.answer);
    const candidates: SelectionCandidate[] = [];
    for (const c of Array.isArray(o.candidates) ? o.candidates : []) {
      const co = (c ?? {}) as Record<string, unknown>;
      const hook_id = str(co.hook_id);
      if (!hook_id) continue;
      candidates.push({
        hook_id,
        hook_version: typeof co.hook_version === "number" ? co.hook_version : null,
        fact_pattern_paraphrase: str(co.fact_pattern_paraphrase),
        fact_atoms: Array.isArray(co.fact_atoms) ? co.fact_atoms.map(String) : [],
        distinguishing_atoms: Array.isArray(co.distinguishing_atoms) ? co.distinguishing_atoms.map(String) : [],
      });
    }
    if (!field_id || !question_text || !answerIsUsable(answer) || candidates.length === 0) {
      dropped.push(field_id || "(no field_id)");
      continue;
    }
    items.push({ field_id, question_text, answer, candidates });
  }
  return { items, dropped };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const db = admin();

  // Signed-in identity when there is one; the preview path tolerates its absence.
  const caller = await verifyCaller(req, "user");
  const userId = caller.ok ? caller.userId : null;
  const previewToken = typeof body?.preview_token === "string" ? body.preview_token : null;
  const CUSTOMER_ACTIONS = ["gate_action", "submit_state"];

  if (!CUSTOMER_ACTIONS.includes(action) && !caller.ok) {
    return json({ error: caller.error ?? "unauthorized" }, caller.status ?? 401);
  }

  if (action === "classify") {
    const product = String(body.product ?? "lia");
    const field_id = String(body.field_id ?? "");
    const question_text = String(body.question_text ?? "");
    const answer = String(body.answer ?? "");
    const assessment_id = typeof body.assessment_id === "string" ? body.assessment_id : null;
    if (!field_id || !question_text || !answer) return json({ error: "missing_input" }, 400);

    if (assessment_id) {
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count } = await db
        .from("api_usage")
        .select("id", { count: "exact", head: true })
        .eq("function_name", "classify-propositions")
        .eq("source_row_id", assessment_id)
        .gte("created_at", since);
      if ((count ?? 0) >= DAILY_CLASSIFY_LIMIT) {
        return json({ error: "daily_classify_limit_reached", limit: DAILY_CLASSIFY_LIMIT }, 429);
      }
    }

    const started = Date.now();
    let out;
    try {
      out = await runClassify({ product, field_id, question_text, answer }, classifyDeps(db));
    } catch (e) {
      return json({ error: "classify_failed", detail: (e as Error).message }, 502);
    }
    if (out.source === "model" && assessment_id) {
      await db.from("api_usage").insert({
        function_name: "classify-propositions",
        product,
        model: `${PRIMARY_MODEL}+${SECOND_MODEL}`,
        source_row_id: assessment_id,
        duration_ms: Date.now() - started,
      });
    }
    return json(out);
  }

  // ── DOC 224 §3 / §4.B — THE TWO-LEG HOOK SELECTION (+ the proposition
  // readings for the same generation) ────────────────────────────────────
  if (action === "select_hooks") {
    const product = String(body.product ?? "lia");
    const assessment_id = String(body.assessment_id ?? "");
    const generation_no = Number.isInteger(body.generation_no) ? Number(body.generation_no) : 1;
    if (!assessment_id) return json({ error: "missing_assessment_id" }, 400);
    const { items, dropped } = parseItems(body.items);
    const started = Date.now();

    // The ceiling: 2 calls per generation × runs_allowed (doc 224 §3, D9).
    let runsAllowed = 4;
    try {
      const { data: meter } = await db.from("tool_run_meter").select("runs_allowed")
        .eq("tool_type", "li_assessment").eq("assessment_id", assessment_id).maybeSingle();
      if (meter && typeof (meter as { runs_allowed?: unknown }).runs_allowed === "number") runsAllowed = (meter as { runs_allowed: number }).runs_allowed;
    } catch { /* first generation: no meter row yet */ }
    const cap = 2 * runsAllowed;
    const { count: made } = await db.from("api_usage").select("id", { count: "exact", head: true })
      .eq("function_name", SELECT_FUNCTION_NAME).eq("source_row_id", assessment_id);
    const capReached = (made ?? 0) >= cap;

    const selectDeps: SelectDeps = {
      primaryModel: PRIMARY_MODEL,
      secondModel: SECOND_MODEL,
      async findDecision(decision_id) {
        const { data } = await db.from("hook_selection_decisions").select("decision_id, readings").eq("decision_id", decision_id).maybeSingle();
        return (data as never) ?? null;
      },
      async saveDecision(row) {
        await db.from("hook_selection_decisions").upsert(row, { onConflict: "decision_id" });
      },
      callModel: modelCall,
    };

    let out;
    try {
      out = await runSelectHooks({ product, items }, selectDeps, { storeOnly: capReached });
    } catch (e) {
      return json({ error: "select_failed", detail: (e as Error).message }, 502);
    }

    // Meter the calls (one api_usage row per leg) — the cap reads this.
    if (out.calls_made > 0) {
      const elapsed = Date.now() - started;
      await db.from("api_usage").insert([
        { function_name: SELECT_FUNCTION_NAME, product, model: PRIMARY_MODEL, source_row_id: assessment_id, duration_ms: elapsed },
        { function_name: SELECT_FUNCTION_NAME, product, model: SECOND_MODEL, source_row_id: assessment_id, duration_ms: elapsed },
      ]);
    }

    // Rows for the engine, and the `hook_selections` store for the ROO:
    // settled → agreed; legs disagreed → disagreed; unknown → no row.
    const rows: Record<string, unknown>[] = [];
    const storeRows: Record<string, unknown>[] = [];
    const byField = new Map(items.map((it) => [it.field_id, it] as const));
    for (const res of out.items) {
      const item = byField.get(res.field_id);
      if (!item) continue;
      const answer_hash = await canonicalAnswerHash(item.answer);
      const versionOf = new Map(item.candidates.map((c) => [c.hook_id, c.hook_version] as const));
      for (const r of res.readings) {
        rows.push({
          field_id: res.field_id, hook_id: r.hook_id, agreement: r.fact_agreement,
          matched_atom: r.matched_atom, evidence_span: r.evidence_span, decision_id: res.decision_id,
          legs_disagreed: r.legs_disagreed, source: res.source,
        });
        const settled = r.fact_agreement !== "unknown";
        if (!settled && !r.legs_disagreed) continue;
        storeRows.push({
          product, assessment_id, generation_no, field_id: res.field_id, hook_id: r.hook_id,
          hook_version: versionOf.get(r.hook_id) ?? null, answer_hash, decision_id: res.decision_id,
          agreement: r.fact_agreement, matched_atom: r.matched_atom, evidence_span: r.evidence_span,
          legs_disagreed: r.legs_disagreed, status: settled ? "agreed" : "disagreed",
          source: res.source, updated_at: new Date().toISOString(),
        });
      }
    }
    let storeError: string | null = null;
    if (storeRows.length > 0) {
      const { error } = await db.from("hook_selections").upsert(storeRows, { onConflict: "assessment_id,generation_no,field_id,hook_id" });
      if (error) storeError = error.message;
    }

    // Matter 2 — proposition readings for the same generation: fields with
    // a ratified inventory only (`runClassify` returns empty_inventory
    // otherwise, no call), store first; rows written as agreed / disagreed
    // — never a customer disposition (readings are never shown).
    let readingsWritten = 0;
    let readingsTouched = 0;
    let classifyCalls = 0;
    const classifyErrors: string[] = [];
    const cdeps = classifyDeps(db);
    for (const f of Array.isArray(body.classify_fields) ? body.classify_fields : []) {
      const fo = (f ?? {}) as Record<string, unknown>;
      const field_id = str(fo.field_id);
      const question_text = str(fo.question_text);
      const answer = canonicalAnswerText(fo.answer);
      if (!field_id || !question_text || !answerIsUsable(answer)) continue;
      if (capReached) break;
      try {
        const c = await runClassify({ product, field_id, question_text, answer }, cdeps);
        if (c.source === "empty_inventory" || !c.decision_id) continue;
        if (c.source === "model") {
          classifyCalls += 2;
          await db.from("api_usage").insert({ function_name: "classify-propositions", product, model: `${PRIMARY_MODEL}+${SECOND_MODEL}`, source_row_id: assessment_id, duration_ms: 0 });
        }
        const answer_hash = await canonicalAnswerHash(answer);
        // Supersede prior rows for this field whose answer changed; let go
        // prior disagreed rows whose answer did not (224A §3.4).
        const { data: priorRows } = await db.from("intake_readings").select("id,answer_hash,disposition")
          .eq("assessment_id", assessment_id).eq("field_id", field_id).in("disposition", ["agreed", "disagreed"]);
        const supersede: string[] = [];
        const letGo: string[] = [];
        for (const p of Array.isArray(priorRows) ? priorRows as any[] : []) {
          if (String(p.answer_hash ?? "") !== answer_hash) supersede.push(String(p.id));
          else if (p.disposition === "disagreed") letGo.push(String(p.id));
        }
        const nowIso = new Date().toISOString();
        if (supersede.length) { await db.from("intake_readings").update({ disposition: "superseded", disposed_at: nowIso }).in("id", supersede); readingsTouched += supersede.length; }
        if (letGo.length) { await db.from("intake_readings").update({ disposition: "unsettled_final", disposed_at: nowIso }).in("id", letGo); readingsTouched += letGo.length; }
        const newRows = c.readings
          .filter((r) => r.stance === "asserted" || r.legs_agree === false)
          .map((r) => ({
            product, assessment_id, field_id, question_text, answer_hash, decision_id: c.decision_id,
            prop_id: r.prop_id, evidence_span: r.evidence_span ?? "",
            disposition: r.stance === "asserted" ? "agreed" : "disagreed",
            disposed_at: nowIso, revision_no: generation_no,
          }));
        if (newRows.length > 0) {
          const { error } = await db.from("intake_readings").upsert(newRows, { onConflict: "assessment_id,field_id,decision_id,prop_id" });
          if (error) classifyErrors.push(`${field_id}: ${error.message}`);
          else readingsWritten += newRows.length;
        }
      } catch (e) {
        classifyErrors.push(`${field_id}: ${(e as Error).message}`);
      }
    }

    return json({
      ok: true,
      assessment_id,
      generation_no,
      items_received: items.length,
      items_dropped: dropped,
      rows,
      calls_made: out.calls_made,
      from_store: out.from_store,
      from_model: out.from_model,
      cap,
      cap_reached: capReached,
      store_rows: storeRows.length,
      store_error: storeError,
      readings_written: readingsWritten,
      readings_touched: readingsTouched,
      classify_calls: classifyCalls,
      classify_errors: classifyErrors,
      prompt_hash: out.prompt_hash,
      models: { primary: PRIMARY_MODEL, second: SECOND_MODEL },
      duration_ms: Date.now() - started,
    });
  }

  if (action === "replay") {
    const decision_id = String(body.decision_id ?? "");
    const { data } = await db
      .from("proposition_decisions")
      .select("*")
      .eq("decision_id", decision_id)
      .maybeSingle();
    if (data) return json({ decision: data, source: "store" });
    const { data: sel } = await db.from("hook_selection_decisions").select("*").eq("decision_id", decision_id).maybeSingle();
    if (!sel) return json({ error: "decision_not_found" }, 404);
    return json({ decision: sel, source: "store", kind: "hook_selection" });
  }

  if (action === "status") {
    const product = String(body.product ?? "lia");
    const { data: rows } = await db
      .from("proposition_decisions")
      .select("decision_id, field_id, created_at")
      .eq("product", product)
      .order("created_at", { ascending: false })
      .limit(2000);
    const counts: Record<string, number> = {};
    for (const r of rows ?? []) counts[r.field_id] = (counts[r.field_id] ?? 0) + 1;
    const { count: selectionCalls } = await db.from("api_usage").select("id", { count: "exact", head: true })
      .eq("function_name", SELECT_FUNCTION_NAME);
    return json({
      product,
      counts_by_field: counts,
      last_20: (rows ?? []).slice(0, 20).map((r) => r.decision_id),
      prompt_hash: await classifyPromptHash(),
      selection_calls_total: selectionCalls ?? 0,
      models: { primary: PRIMARY_MODEL, second: SECOND_MODEL },
    });
  }

  if (action === "gate_action") {
    const assessment_id = String(body.assessment_id ?? "");
    const auth = await authoriseRowWrite(db, assessment_id, userId, previewToken);
    if (!auth.ok) return json({ error: auth.error }, auth.status ?? 403);
    const customer_action = String(body.customer_action ?? "");
    if (!["revised", "stood", "pending"].includes(customer_action)) {
      return json({ error: "bad_customer_action" }, 400);
    }
    const { error } = await db
      .from("intake_gate_results")
      .update({ customer_action })
      .eq("id", String(body.result_id ?? ""))
      .eq("assessment_id", assessment_id);
    if (error) return json({ error: "write_failed", detail: error.message }, 400);
    return json({ ok: true });
  }

  if (action === "submit_state") {
    const assessment_id = String(body.assessment_id ?? "");
    const auth = await authoriseRowWrite(db, assessment_id, userId, previewToken);
    if (!auth.ok) return json({ error: auth.error }, auth.status ?? 403);
    const patch: Record<string, unknown> = {};
    if (typeof body.intake_hash === "string") patch.intake_hash = body.intake_hash;
    if (Object.keys(patch).length === 0) return json({ error: "nothing_to_set" }, 400);
    const { error } = await db.from("li_assessments").update(patch).eq("id", assessment_id);
    if (error) return json({ error: "write_failed", detail: error.message }, 400);
    return json({ ok: true, ...patch });
  }

  return json({ error: "unknown_action" }, 400);
});
