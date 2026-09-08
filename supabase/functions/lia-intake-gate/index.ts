// build-marker: lia-intake-gate-doc217-2026-09-08
console.log("[build-marker] lia-intake-gate doc217-2026-09-08");
//
// DOC 217 §3 — the LIA intake conformance gate. Codes only: this function
// never returns a sentence for the customer; the UI maps reason codes to
// ratified templates.
//
// ACTION { action: "gate", product: "lia", assessment_id?, fields: [...] }

import { verifyCaller } from "../_shared/verify-caller.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { precheckFields, type GateField } from "./_local/precheck.ts";
import { GATE_SCHEMA, GATE_SYSTEM, gatePromptHash, gateUserPrompt, sha256 } from "./_local/prompts.ts";
import { verifyGateItem, type GateResult } from "./_local/verify.ts";

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

export const GATE_MODEL = "claude-haiku-4-5-20251001";
const PRECHECK_MODEL = "code:precheck";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

/** Haiku, structured output, NO temperature / top_p, first text block. */
async function haikuCall(system: string, user: string, schema: Record<string, unknown>): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: GATE_MODEL,
      max_tokens: 8_000,
      output_config: { format: { type: "json_schema", schema } },
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const body = await r.json();
  const blocks = Array.isArray(body?.content) ? body.content : [];
  const text = blocks.find((b: { type?: string }) => b?.type === "text");
  if (!text || typeof text.text !== "string" || text.text.length === 0) {
    const types = blocks.map((b: { type?: string }) => String(b?.type ?? "unknown")).join(",") || "none";
    throw new Error(`Anthropic returned no text block (blocks=[${types}])`);
  }
  return String(text.text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const caller = await verifyCaller(req, "user");
  if (!caller.ok) return json({ error: caller.error ?? "unauthorized" }, caller.status ?? 401);

  const body = await req.json().catch(() => ({}));
  if (body?.action !== "gate") return json({ error: "unknown_action" }, 400);

  const product = String(body.product ?? "lia");
  const assessmentId = typeof body.assessment_id === "string" ? body.assessment_id : null;
  const fields: GateField[] = Array.isArray(body.fields) ? body.fields : [];
  if (fields.length === 0) return json({ error: "no_fields" }, 400);

  const db = admin();
  const promptHash = await gatePromptHash();
  const pre = precheckFields(fields);

  const results: Array<Record<string, unknown>> = [];
  const toModel: GateField[] = [];
  const answerHashes = new Map<string, string>();

  for (const f of fields) {
    const answerHash = await sha256(String(f.answer ?? ""));
    answerHashes.set(f.field_id, answerHash);

    const p = pre.get(f.field_id);
    if (p) {
      const { data: row } = await db.from("intake_gate_results").insert({
        product,
        assessment_id: assessmentId,
        field_id: f.field_id,
        question_text: f.question_text,
        answer_hash: answerHash,
        verdict: p.verdict,
        reason_codes: p.reason_codes,
        other_limb_field: null,
        model: PRECHECK_MODEL,
        prompt_hash: promptHash,
        raw: JSON.stringify(p),
        customer_action: "pending",
      }).select("id").maybeSingle();
      results.push({
        field_id: f.field_id,
        verdict: p.verdict,
        reason_codes: p.reason_codes,
        other_limb_field: null,
        evidence_span: null,
        source: "precheck",
        result_id: row?.id ?? null,
      });
      continue;
    }

    // Determinism: same answer_hash + prompt_hash + model → the stored row.
    const { data: stored } = await db
      .from("intake_gate_results")
      .select("id, verdict, reason_codes, other_limb_field")
      .eq("product", product)
      .eq("field_id", f.field_id)
      .eq("answer_hash", answerHash)
      .eq("prompt_hash", promptHash)
      .eq("model", GATE_MODEL)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (stored) {
      results.push({
        field_id: f.field_id,
        verdict: stored.verdict,
        reason_codes: stored.reason_codes ?? [],
        other_limb_field: stored.other_limb_field ?? null,
        evidence_span: null,
        source: "stored",
        result_id: stored.id,
      });
      continue;
    }
    toModel.push(f);
  }

  if (toModel.length > 0) {
    let raw = "";
    try {
      raw = await haikuCall(GATE_SYSTEM, gateUserPrompt(toModel), GATE_SCHEMA);
    } catch (e) {
      return json({ error: "model_call_failed", detail: (e as Error).message, results }, 502);
    }
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: "unparseable_model_output", results }, 502);
    }
    const items = Array.isArray((parsed as { results?: unknown })?.results)
      ? (parsed as { results: unknown[] }).results
      : [];
    const byId = new Map<string, GateResult>();
    for (const it of items) {
      const f = toModel.find((x) => x.field_id === (it as { field_id?: string })?.field_id);
      if (!f) continue;
      const v = verifyGateItem(it, String(f.answer ?? ""));
      if (v) byId.set(v.field_id, v);
    }

    for (const f of toModel) {
      const v = byId.get(f.field_id) ?? {
        field_id: f.field_id,
        verdict: "conforms" as const,
        reason_codes: [],
        other_limb_field: null,
        evidence_span: null,
        checks: { codes_ok: false, span_ok: true, other_limb_ok: true },
      };
      const { data: row } = await db.from("intake_gate_results").insert({
        product,
        assessment_id: assessmentId,
        field_id: f.field_id,
        question_text: f.question_text,
        answer_hash: answerHashes.get(f.field_id)!,
        verdict: v.verdict,
        reason_codes: v.reason_codes,
        other_limb_field: v.other_limb_field,
        model: GATE_MODEL,
        prompt_hash: promptHash,
        raw, // raw model text always persisted
        customer_action: "pending",
      }).select("id").maybeSingle();
      results.push({
        field_id: v.field_id,
        verdict: v.verdict,
        reason_codes: v.reason_codes,
        other_limb_field: v.other_limb_field,
        evidence_span: v.evidence_span,
        checks: v.checks,
        source: "model",
        result_id: row?.id ?? null,
      });
    }
  }

  return json({ product, prompt_hash: promptHash, model: GATE_MODEL, results });
});
