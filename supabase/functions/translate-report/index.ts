// translate-report
// TRANSLATE-1 — Chunked async translation with function_runs telemetry.
//
// Async model:
//   POST /translate-report            → 202 with { status:'translating', translation_id, chunks_total }
//                                       Server runs translation in background (EdgeRuntime.waitUntil).
//   GET  /translate-report?report_type=..&report_id=..&language_code=..
//                                     → 200 with { status:'complete'|'translating'|'failed', ... }
//
// Backward-compat: when the client sends { poll:true } as POST body, we treat
// it as a status probe. This keeps the transport a single URL.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  translateDocument,
  TRANSLATION_ENGINE_VERSION,
  ANTHROPIC_MODEL,
} from "../_shared/translation-engine.ts";
import {
  startFunctionRun,
  finishFunctionRun,
  failFunctionRun,
} from "../_shared/function-run-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const ALLOWED_LANGUAGES = new Set([
  "fr","de","es","pt","ja","zh-CN","ar","ko","it","nl","pl","sv",
  "da","no","fi","cs","ro","el","tr","th","id","hi","he",
]);

const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French", de: "German", es: "Spanish", pt: "Portuguese",
  ja: "Japanese", "zh-CN": "Chinese (Simplified)", ar: "Arabic",
  ko: "Korean", it: "Italian", nl: "Dutch", pl: "Polish",
  sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish",
  cs: "Czech", ro: "Romanian", el: "Greek", tr: "Turkish",
  th: "Thai", id: "Indonesian", hi: "Hindi", he: "Hebrew",
};

const TRANSLATION_NOTICE =
  "Machine translation provided for convenience. The English original is the authoritative version of this document. Statutory citations refer to the official texts; official language versions are available from EUR-Lex or the issuing regulator.";

type ToolSource = {
  table: string;
  textColumns: string[];
  ownerVia?: { joinTable: string; joinColumn: string; ownerColumn: string };
};

const TOOL_SOURCES: Record<string, ToolSource> = {
  li_assessment:         { table: "li_assessments",         textColumns: ["report_data"] },
  dpia_framework:        { table: "dpia_frameworks",        textColumns: ["report_data"] },
  governance_assessment: { table: "governance_assessments", textColumns: ["report_data"] },
  dpa:                   { table: "dpa_documents",          textColumns: ["report_data", "document_text"] },
  ir_playbook:           { table: "ir_playbooks",           textColumns: ["report_data", "playbook_text"] },
  biometric:             { table: "biometric_assessments",  textColumns: ["report_data", "analysis_text"] },
  cppa_risk:             { table: "cppa_assessments",       textColumns: ["report_data", "document_a_text", "document_b_text"] },
  cppa_cyber:            { table: "cppa_assessments",       textColumns: ["report_data", "document_a_text", "document_b_text"] },
  ropa:        { table: "ropa_sessions",        textColumns: [], ownerVia: { joinTable: "clients", joinColumn: "client_id", ownerColumn: "owner_id" } },
  us_notice:   { table: "us_notice_sessions",   textColumns: [], ownerVia: { joinTable: "clients", joinColumn: "client_id", ownerColumn: "owner_id" } },
  eu_notice:   { table: "eu_notice_sessions",   textColumns: [], ownerVia: { joinTable: "clients", joinColumn: "client_id", ownerColumn: "owner_id" } },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  // --- Auth: user JWT required for both POST and GET ---
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  const user = userRes?.user;
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // ─── GET: poll status ──────────────────────────────────────────────────
  if (req.method === "GET") {
    const url = new URL(req.url);
    const tool_type = url.searchParams.get("report_type") ?? url.searchParams.get("tool_type");
    const report_id = url.searchParams.get("report_id");
    const language_code = url.searchParams.get("language_code");
    if (!tool_type || !report_id || !language_code) {
      return json({ error: "report_type, report_id, language_code required" }, 400);
    }
    const { data: row } = await admin
      .from("report_translations")
      .select("status, translated_content, chunks_total, chunks_done, error_message, user_id")
      .eq("report_type", tool_type).eq("report_id", report_id).eq("target_lang", language_code)
      .order("started_at", { ascending: false, nullsFirst: false })
      .limit(1).maybeSingle();
    if (!row) return json({ status: "not_found" }, 404);
    if (row.user_id && row.user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (row.status === "complete") {
      return json({
        status: "complete",
        translated_payload: row.translated_content,
        chunks_total: row.chunks_total,
        chunks_done: row.chunks_done,
      });
    }
    if (row.status === "failed") {
      return json({ status: "failed", error: row.error_message ?? "Translation failed" });
    }
    return json({
      status: "translating",
      chunks_total: row.chunks_total,
      chunks_done: row.chunks_done,
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // --- Body ---
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const tool_type = typeof body?.tool_type === "string" ? body.tool_type : null;
  const report_id = typeof body?.report_id === "string" ? body.report_id : null;
  const language_code = typeof body?.language_code === "string" ? body.language_code : null;
  if (!tool_type || !report_id || !language_code) {
    return json({ error: "tool_type, report_id, and language_code are required" }, 400);
  }

  if (language_code === "en") return json({ english: true });
  if (!ALLOWED_LANGUAGES.has(language_code)) {
    return json({ error: `Unsupported language: ${language_code}` }, 400);
  }
  const source = TOOL_SOURCES[tool_type];
  if (!source) return json({ error: `Unknown tool_type: ${tool_type}` }, 400);

  // --- Ownership + payload assembly ---
  const { data: row, error: rowErr } = await admin
    .from(source.table).select("*").eq("id", report_id).maybeSingle();
  if (rowErr) return json({ error: "Lookup failed", detail: rowErr.message }, 500);
  if (!row) return json({ error: "Report not found" }, 404);

  let isOwner = false;
  if (source.ownerVia) {
    const clientId = (row as any)[source.ownerVia.joinColumn];
    if (clientId) {
      const { data: joinRow } = await admin
        .from(source.ownerVia.joinTable)
        .select(source.ownerVia.ownerColumn).eq("id", clientId).maybeSingle();
      isOwner = !!joinRow && (joinRow as any)[source.ownerVia.ownerColumn] === user.id;
    }
  } else {
    isOwner = (row as any).user_id === user.id;
  }
  if (!isOwner) return json({ error: "Forbidden" }, 403);

  // --- Existing translation? ---
  const { data: existing } = await admin
    .from("report_translations")
    .select("status, translated_content, chunks_total, chunks_done, error_message")
    .eq("report_type", tool_type).eq("report_id", report_id).eq("target_lang", language_code)
    .order("started_at", { ascending: false, nullsFirst: false })
    .limit(1).maybeSingle();
  if (existing?.status === "complete" && existing.translated_content) {
    return json({
      status: "complete",
      translated_payload: existing.translated_content,
      from_cache: true,
    });
  }
  if (existing?.status === "translating") {
    return new Response(JSON.stringify({
      status: "translating",
      chunks_total: existing.chunks_total,
      chunks_done: existing.chunks_done,
    }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // --- 4-language cap (count COMPLETE translations only) ---
  const { count: completeCount } = await admin
    .from("report_translations")
    .select("target_lang", { count: "exact", head: true })
    .eq("report_type", tool_type).eq("report_id", report_id).eq("status", "complete");
  if ((completeCount ?? 0) >= 4) {
    return json(
      { error: "TRANSLATION_LIMIT: This report has reached its limit of 4 translated languages." },
      403,
    );
  }

  // --- Build payload ---
  const payload: Record<string, unknown> = {};
  for (const col of source.textColumns) {
    const v = (row as any)[col];
    if (v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "")) {
      payload[col] = v;
    }
  }
  if (Object.keys(payload).length === 0) {
    return json(
      { error: "NOT_TRANSLATABLE: This document type does not yet support translation." },
      400,
    );
  }

  if (!ANTHROPIC_KEY) return json({ error: "Translation service unavailable" }, 502);

  const languageName = LANGUAGE_NAMES[language_code] ?? language_code;
  const payloadJson = JSON.stringify(payload);
  const contentHash = await sha256(payloadJson);

  // --- Insert in-flight row (unique key: report_type/report_id/target_lang/content_hash) ---
  // If a previous 'failed' row exists for same hash, replace it.
  await admin.from("report_translations").delete()
    .eq("report_type", tool_type).eq("report_id", report_id)
    .eq("target_lang", language_code).eq("content_hash", contentHash)
    .in("status", ["failed"]);

  const startedAt = new Date().toISOString();
  const { data: inserted, error: insErr } = await admin
    .from("report_translations")
    .insert({
      user_id: user.id,
      report_type: tool_type,
      report_id,
      target_lang: language_code,
      source_lang: "en",
      content_hash: contentHash,
      status: "translating",
      chunks_total: null,
      chunks_done: 0,
      started_at: startedAt,
      model: ANTHROPIC_MODEL,
      translated_content: null,
    })
    .select("id")
    .single();
  if (insErr || !inserted) {
    return json({ error: "Failed to record translation", detail: insErr?.message }, 500);
  }
  const translationRowId = inserted.id as string;

  // --- Background execution: log function_run FIRST, then translate ---
  const runBackground = async () => {
    const run = await startFunctionRun(admin, "translate-report", {
      userId: user.id,
      invokedBy: "user",
      metadata: {
        event: "translate",
        tool_type,
        report_id,
        language_code,
        translation_row_id: translationRowId,
        engine: TRANSLATION_ENGINE_VERSION,
      },
    });

    try {
      const result = await translateDocument(payload, {
        apiKey: ANTHROPIC_KEY,
        languageCode: language_code,
        languageName,
        onProgress: async (done, total) => {
          await admin.from("report_translations").update({
            chunks_total: total,
            chunks_done: done,
          }).eq("id", translationRowId);
        },
      });

      // Disclaimer wrap
      let translated: any = result.translated;
      if (translated && typeof translated === "object" && !Array.isArray(translated)) {
        (translated as Record<string, unknown>).translation_notice = TRANSLATION_NOTICE;
      } else {
        translated = { content: translated, translation_notice: TRANSLATION_NOTICE };
      }

      await admin.from("report_translations").update({
        status: "complete",
        translated_content: translated,
        chunks_total: result.chunksTotal,
        chunks_done: result.chunksDone,
        error_message: null,
      }).eq("id", translationRowId);

      await finishFunctionRun(admin, run, {
        status: "success",
        sourceTable: "report_translations",
        sourceRowId: translationRowId,
        metadata: {
          event: "translate",
          tool_type,
          report_id,
          language_code,
          chunks_total: result.chunksTotal,
          chunks_done: result.chunksDone,
          units: result.units,
          engine: TRANSLATION_ENGINE_VERSION,
        },
      });
    } catch (e) {
      const msg = (e as Error).message ?? "unknown";
      console.error("[translate-report] background failure:", msg);
      await admin.from("report_translations").update({
        status: "failed",
        error_message: msg.slice(0, 1000),
      }).eq("id", translationRowId);
      await failFunctionRun(admin, run, e, {
        metadata: {
          event: "translate",
          tool_type, report_id, language_code,
          translation_row_id: translationRowId,
          engine: TRANSLATION_ENGINE_VERSION,
        },
      });
    }
  };

  if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
    EdgeRuntime.waitUntil(runBackground());
  } else {
    // Local/test fallback — fire and forget.
    runBackground().catch(() => {});
  }

  return new Response(JSON.stringify({
    status: "translating",
    translation_row_id: translationRowId,
  }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
