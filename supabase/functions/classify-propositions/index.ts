// build-marker: classify-propositions-doc217-2026-09-08
console.log("[build-marker] classify-propositions doc217-2026-09-08");
//
// DOC 217 §4 — two-leg proposition reading over LIA intake answers, plus the
// read-back write actions the customer UI needs (the four tables are
// service-role only; the browser never writes them directly).
//
// ACTIONS
//   { action: "classify",    product, field_id, question_text, answer, assessment_id? }
//   { action: "replay",      decision_id }
//   { action: "status",      product? }
//   { action: "dispose",     assessment_id, field_id, decision_id, prop_id, disposition,
//                            evidence_span, question_text, answer_hash, preview_token? }
//   { action: "gate_action", result_id, customer_action, assessment_id, preview_token? }
//   { action: "submit_state",assessment_id, intake_hash, readings_state, preview_token? }

import { verifyCaller } from "../_shared/verify-caller.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { runClassify, PRIMARY_MODEL, SECOND_MODEL, type ClassifyDeps } from "./_local/classify.ts";
import { classifyPromptHash, type InventoryRow } from "./_local/prompts.ts";

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

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const DAILY_CLASSIFY_LIMIT = 20;

/** Claude, structured output, NO temperature / top_p, first text block. */
async function claudeCall(
  model: string,
  system: string,
  user: string,
  schema: Record<string, unknown>,
): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8_000,
      output_config: { format: { type: "json_schema", schema } },
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const body = await r.json();
  const blocks = Array.isArray(body?.content) ? body.content : [];
  const text = blocks.find((b: { type?: string }) => b?.type === "text");
  if (!text || typeof text.text !== "string" || text.text.length === 0) {
    const types = blocks.map((b: { type?: string }) => String(b?.type ?? "unknown")).join(",") || "none";
    throw new Error(`Anthropic (${model}) returned no text block (blocks=[${types}])`);
  }
  return String(text.text);
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");
  const db = admin();

  // Signed-in identity when there is one; the preview path tolerates its absence.
  const caller = await verifyCaller(req, "user");
  const userId = caller.ok ? caller.userId : null;
  const previewToken = typeof body?.preview_token === "string" ? body.preview_token : null;
  const CUSTOMER_ACTIONS = ["dispose", "gate_action", "submit_state"];

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

    const deps: ClassifyDeps = {
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
      callModel: claudeCall,
    };

    const started = Date.now();
    let out;
    try {
      out = await runClassify({ product, field_id, question_text, answer }, deps);
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

  if (action === "replay") {
    const decision_id = String(body.decision_id ?? "");
    const { data } = await db
      .from("proposition_decisions")
      .select("*")
      .eq("decision_id", decision_id)
      .maybeSingle();
    if (!data) return json({ error: "decision_not_found" }, 404);
    return json({ decision: data, source: "store" });
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
    return json({
      product,
      counts_by_field: counts,
      last_20: (rows ?? []).slice(0, 20).map((r) => r.decision_id),
      prompt_hash: await classifyPromptHash(),
    });
  }

  if (action === "dispose") {
    const assessment_id = String(body.assessment_id ?? "");
    const auth = await authoriseRowWrite(db, assessment_id, userId, previewToken);
    if (!auth.ok) return json({ error: auth.error }, auth.status ?? 403);
    const disposition = String(body.disposition ?? "");
    if (!["confirmed", "corrected", "stood"].includes(disposition)) {
      return json({ error: "bad_disposition" }, 400);
    }
    const row = {
      product: String(body.product ?? "lia"),
      assessment_id,
      field_id: String(body.field_id ?? ""),
      question_text: String(body.question_text ?? ""),
      answer_hash: String(body.answer_hash ?? ""),
      decision_id: String(body.decision_id ?? ""),
      prop_id: String(body.prop_id ?? ""),
      evidence_span: String(body.evidence_span ?? ""),
      disposition,
      disposed_at: new Date().toISOString(),
    };
    const { data, error } = await db
      .from("intake_readings")
      .upsert(row, { onConflict: "assessment_id,field_id,decision_id,prop_id" })
      .select("id")
      .maybeSingle();
    if (error) return json({ error: "write_failed", detail: error.message }, 400);
    return json({ ok: true, reading_id: data?.id ?? null });
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
    if (typeof body.readings_state === "string") patch.readings_state = body.readings_state;
    if (Object.keys(patch).length === 0) return json({ error: "nothing_to_set" }, 400);
    const { error } = await db.from("li_assessments").update(patch).eq("id", assessment_id);
    if (error) return json({ error: "write_failed", detail: error.message }, 400);
    return json({ ok: true, ...patch });
  }

  return json({ error: "unknown_action" }, 400);
});
