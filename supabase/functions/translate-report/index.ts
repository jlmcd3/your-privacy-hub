// translate-report
// TRANSLATE-2 — Resumable chunked translation.
//
// Transports:
//   POST /translate-report                  → 202 { status:'translating', translation_row_id, chunks_total }
//                                            Starts (or continues) a background slice; may self-continue.
//   GET  /translate-report?report_type=..&report_id=..&language_code=..
//                                          → 200 { status:'complete'|'translating'|'failed', ... }
//   Internal resume: POST with headers
//     Authorization: Bearer <SERVICE_ROLE>
//     x-internal-resume: 1
//     body: { resume: true, translation_row_id }
//                                          → 202 { status:'translating'|'complete', ... }
//
// Persistence:
//   Every chunk result lands in report_translations.translated_chunks[index]
//   immediately (same UPDATE that bumps chunks_done + last_progress_at).
//   Terminal assembly builds translated_content from translated_chunks.
//
// Bounded slice: process chunks while Date.now() - sliceStart < SLICE_BUDGET_MS.
// If chunks remain, self-invoke with x-internal-resume and exit cleanly.
// Loop until done or resume_count exceeds MAX_RESUMES.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  TRANSLATION_ENGINE_VERSION,
  ANTHROPIC_MODEL,
  computeChunksTotal,
  runTranslationSlice,
  assembleTranslated,
  type PersistedChunk,
} from "../_shared/translation-engine.ts";
import {
  startFunctionRun,
  finishFunctionRun,
  failFunctionRun,
} from "../_shared/function-run-logger.ts";

export const BUILD_STAMP = "translate-2-resumable@2026-07-18";
export const SLICE_BUDGET_MS = 3.5 * 60_000;   // 3.5 min per background slice
export const MAX_RESUMES = 8;                   // ceiling on self-continuations
export const RESUME_HEADER = "x-internal-resume";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-resume",
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

/** Build the source payload for a translation row (same rules as initial POST). */
function buildPayload(row: any, source: ToolSource): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const col of source.textColumns) {
    const v = (row as any)[col];
    if (v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "")) {
      payload[col] = v;
    }
  }
  return payload;
}

/** Fire the internal self-continuation and return without waiting. */
async function kickResume(
  supabaseUrl: string,
  serviceKey: string,
  translationRowId: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/translate-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        [RESUME_HEADER]: "1",
      },
      body: JSON.stringify({ resume: true, translation_row_id: translationRowId }),
    });
    const text = (await resp.text().catch(() => "")).slice(0, 300);
    return { ok: resp.ok, status: resp.status, body: text };
  } catch (e) {
    return { ok: false, status: 0, body: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // ── INTERNAL RESUME PATH ─────────────────────────────────────────────
  // POST + x-internal-resume:1 + Authorization: Bearer <SR key>.
  // Body: { resume:true, translation_row_id }.
  const isResumeHeader = req.headers.get(RESUME_HEADER) === "1";
  const authHeader = req.headers.get("authorization") ?? "";
  const looksLikeService = authHeader === `Bearer ${SERVICE_KEY}`;
  if (req.method === "POST" && isResumeHeader && looksLikeService) {
    if (!ANTHROPIC_KEY) return json({ error: "Translation service unavailable" }, 502);
    let body: any = {};
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
    const translationRowId = typeof body?.translation_row_id === "string" ? body.translation_row_id : null;
    if (!translationRowId) return json({ error: "translation_row_id required" }, 400);
    return await handleSliceRequest(admin, SUPABASE_URL, SERVICE_KEY, ANTHROPIC_KEY, translationRowId, /*isInitial*/ false);
  }

  // ── User-facing paths require a user JWT ─────────────────────────────
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
      .select("status, translated_content, chunks_total, chunks_done, error_message, user_id, slice_count, resume_count")
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
        slice_count: row.slice_count,
        resume_count: row.resume_count,
      });
    }
    if (row.status === "failed") {
      return json({ status: "failed", error: row.error_message ?? "Translation failed" });
    }
    return json({
      status: "translating",
      chunks_total: row.chunks_total,
      chunks_done: row.chunks_done,
      slice_count: row.slice_count,
      resume_count: row.resume_count,
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Initial POST from user ───────────────────────────────────────────
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

  // Ownership + payload assembly
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

  // Existing translation?
  const { data: existing } = await admin
    .from("report_translations")
    .select("id, status, translated_content, chunks_total, chunks_done, error_message")
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
      translation_row_id: existing.id,
      chunks_total: existing.chunks_total,
      chunks_done: existing.chunks_done,
    }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 4-language cap
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

  const payload = buildPayload(row, source);
  if (Object.keys(payload).length === 0) {
    return json(
      { error: "NOT_TRANSLATABLE: This document type does not yet support translation." },
      400,
    );
  }
  if (!ANTHROPIC_KEY) return json({ error: "Translation service unavailable" }, 502);

  const payloadJson = JSON.stringify(payload);
  const contentHash = await sha256(payloadJson);
  const chunksTotal = computeChunksTotal(payload);

  // Replace any prior 'failed' row for same hash.
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
      chunks_total: chunksTotal,
      chunks_done: 0,
      slice_count: 0,
      resume_count: 0,
      translated_chunks: {},
      started_at: startedAt,
      last_progress_at: startedAt,
      model: ANTHROPIC_MODEL,
      translated_content: null,
    })
    .select("id")
    .single();
  if (insErr || !inserted) {
    return json({ error: "Failed to record translation", detail: insErr?.message }, 500);
  }
  const translationRowId = inserted.id as string;

  // Kick the first slice in background.
  const run = await startFunctionRun(admin, "translate-report", {
    userId: user.id,
    invokedBy: "user",
    metadata: {
      event: "translate_start",
      tool_type, report_id, language_code,
      translation_row_id: translationRowId,
      chunks_total: chunksTotal,
      engine: TRANSLATION_ENGINE_VERSION,
    },
  });
  await finishFunctionRun(admin, run, {
    status: "success",
    sourceTable: "report_translations",
    sourceRowId: translationRowId,
    metadata: {
      event: "translate_start",
      outcome: "kicked",
      tool_type, report_id, language_code,
      translation_row_id: translationRowId,
      chunks_total: chunksTotal,
      engine: TRANSLATION_ENGINE_VERSION,
    },
  });

  const runSlice = () => handleSliceRequest(admin, SUPABASE_URL, SERVICE_KEY, ANTHROPIC_KEY, translationRowId, /*isInitial*/ true)
    .catch((e) => console.error("[translate-report] initial slice threw:", (e as Error).message));
  if (typeof EdgeRuntime !== "undefined" && typeof EdgeRuntime.waitUntil === "function") {
    EdgeRuntime.waitUntil(runSlice());
  } else {
    runSlice();
  }

  return new Response(JSON.stringify({
    status: "translating",
    translation_row_id: translationRowId,
    chunks_total: chunksTotal,
    build_stamp: BUILD_STAMP,
  }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

// ─────────────────────────────────────────────────────────────────────────
// Slice handler — shared by initial-invocation and internal-resume paths.
// Runs one bounded slice, persists per-chunk, then either finalises or
// self-continues.
// ─────────────────────────────────────────────────────────────────────────
async function handleSliceRequest(
  admin: any,
  supabaseUrl: string,
  serviceKey: string,
  anthropicKey: string,
  translationRowId: string,
  isInitial: boolean,
): Promise<Response> {
  const sliceStart = Date.now();
  const deadlineMs = sliceStart + SLICE_BUDGET_MS;

  // Load row.
  const { data: trow, error: loadErr } = await admin
    .from("report_translations")
    .select("id, user_id, report_type, report_id, target_lang, content_hash, status, translated_chunks, chunks_total, chunks_done, slice_count, resume_count, translated_content")
    .eq("id", translationRowId).maybeSingle();
  if (loadErr || !trow) {
    return json({ error: "translation row not found", detail: loadErr?.message }, 404);
  }
  if (trow.status === "complete") {
    return json({ status: "complete", translation_row_id: translationRowId, from: "already_complete" });
  }
  if (trow.status === "failed") {
    return json({ status: "failed", translation_row_id: translationRowId, from: "already_failed" });
  }

  const toolSource = TOOL_SOURCES[trow.report_type];
  if (!toolSource) {
    await markFailed(admin, translationRowId, `unknown tool_type: ${trow.report_type}`);
    return json({ error: "unknown_tool_type" }, 400);
  }

  // Reload the source payload from its parent table.
  const { data: parentRow, error: parentErr } = await admin
    .from(toolSource.table).select("*").eq("id", trow.report_id).maybeSingle();
  if (parentErr || !parentRow) {
    await markFailed(admin, translationRowId, `source report row missing: ${parentErr?.message ?? "not_found"}`);
    return json({ error: "source_missing" }, 404);
  }
  const payload = buildPayload(parentRow, toolSource);
  const payloadHash = await sha256(JSON.stringify(payload));
  if (trow.content_hash && payloadHash !== trow.content_hash) {
    // Source moved under us — fail rather than emit a mixed translation.
    await markFailed(admin, translationRowId, "source payload changed mid-run (content_hash mismatch)");
    return json({ error: "content_hash_mismatch" }, 409);
  }

  const languageName = LANGUAGE_NAMES[trow.target_lang] ?? trow.target_lang;
  const persisted: Record<string, PersistedChunk> = (trow.translated_chunks ?? {}) as any;

  // Log slice start.
  const run = await startFunctionRun(admin, "translate-report", {
    userId: trow.user_id,
    invokedBy: isInitial ? "user" : "internal_resume",
    metadata: {
      event: "translate_slice",
      tool_type: trow.report_type,
      report_id: trow.report_id,
      language_code: trow.target_lang,
      translation_row_id: translationRowId,
      slice_index: (trow.slice_count ?? 0) + 1,
      resume_count: trow.resume_count ?? 0,
      chunks_done_before: Object.keys(persisted).length,
      chunks_total: trow.chunks_total,
      engine: TRANSLATION_ENGINE_VERSION,
      is_initial: isInitial,
    },
  });

  let sliceResult;
  try {
    sliceResult = await runTranslationSlice(payload, persisted, {
      apiKey: anthropicKey,
      languageCode: trow.target_lang,
      languageName,
      deadlineMs,
      onChunkComplete: async ({ index, chunk, chunksDone, chunksTotal }) => {
        // Merge-write the chunk index. Read-modify-write; races are avoided
        // because a single slice owns the row for its budget window.
        const { data: cur } = await admin
          .from("report_translations")
          .select("translated_chunks")
          .eq("id", translationRowId).maybeSingle();
        const merged = { ...((cur?.translated_chunks ?? {}) as Record<string, PersistedChunk>) };
        if (merged[String(index)] !== undefined) return; // idempotent no-op
        merged[String(index)] = chunk;
        await admin.from("report_translations").update({
          translated_chunks: merged,
          chunks_done: chunksDone,
          chunks_total: chunksTotal,
          last_progress_at: new Date().toISOString(),
        }).eq("id", translationRowId);
      },
    });
  } catch (e) {
    const msg = (e as Error).message ?? "unknown";
    console.error("[translate-report] slice failed:", msg);
    await markFailed(admin, translationRowId, msg.slice(0, 1000));
    await failFunctionRun(admin, run, e, {
      metadata: {
        event: "translate_slice",
        outcome: "failed",
        translation_row_id: translationRowId,
        engine: TRANSLATION_ENGINE_VERSION,
      },
    });
    return json({ status: "failed", error: msg }, 500);
  }

  // Increment slice_count after the slice.
  await admin.rpc; // (no-op reference; keep for future rpc use)
  const newSliceCount = (trow.slice_count ?? 0) + 1;

  if (sliceResult.allDone) {
    // Terminal assembly.
    let translated: any;
    try {
      const { data: cur } = await admin
        .from("report_translations")
        .select("translated_chunks")
        .eq("id", translationRowId).maybeSingle();
      translated = assembleTranslated(payload, (cur?.translated_chunks ?? {}) as any);
    } catch (e) {
      const msg = (e as Error).message ?? "assemble failed";
      await markFailed(admin, translationRowId, msg);
      await failFunctionRun(admin, run, e, {
        metadata: {
          event: "translate_slice", outcome: "assemble_failed",
          translation_row_id: translationRowId, engine: TRANSLATION_ENGINE_VERSION,
        },
      });
      return json({ status: "failed", error: msg }, 500);
    }
    if (translated && typeof translated === "object" && !Array.isArray(translated)) {
      (translated as Record<string, unknown>).translation_notice = TRANSLATION_NOTICE;
    } else {
      translated = { content: translated, translation_notice: TRANSLATION_NOTICE };
    }
    await admin.from("report_translations").update({
      status: "complete",
      translated_content: translated,
      chunks_done: sliceResult.chunksDone,
      chunks_total: sliceResult.chunksTotal,
      slice_count: newSliceCount,
      last_progress_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", translationRowId);

    await finishFunctionRun(admin, run, {
      status: "success",
      sourceTable: "report_translations",
      sourceRowId: translationRowId,
      metadata: {
        event: "translate_slice",
        outcome: "completed",
        translation_row_id: translationRowId,
        tool_type: trow.report_type, report_id: trow.report_id, language_code: trow.target_lang,
        chunks_done: sliceResult.chunksDone,
        chunks_total: sliceResult.chunksTotal,
        processed_this_slice: sliceResult.processedThisSlice,
        slice_count: newSliceCount,
        resume_count: trow.resume_count ?? 0,
        engine: TRANSLATION_ENGINE_VERSION,
      },
    });
    return json({ status: "complete", translation_row_id: translationRowId, chunks_done: sliceResult.chunksDone });
  }

  // More chunks remain — persist slice_count, then self-continue.
  const resumeCountBefore = trow.resume_count ?? 0;
  if (resumeCountBefore >= MAX_RESUMES) {
    const msg = `max_resumes_exceeded (${resumeCountBefore})`;
    await markFailed(admin, translationRowId, msg);
    await failFunctionRun(admin, run, new Error(msg), {
      metadata: { event: "translate_slice", outcome: "max_resumes", translation_row_id: translationRowId },
    });
    return json({ status: "failed", error: msg }, 500);
  }

  await admin.from("report_translations").update({
    slice_count: newSliceCount,
    resume_count: resumeCountBefore + 1,
    last_progress_at: new Date().toISOString(),
  }).eq("id", translationRowId);

  const kick = await kickResume(supabaseUrl, serviceKey, translationRowId);

  await finishFunctionRun(admin, run, {
    status: kick.ok ? "success" : "error",
    sourceTable: "report_translations",
    sourceRowId: translationRowId,
    metadata: {
      event: "translate_slice",
      outcome: kick.ok ? "continued" : "continue_kick_failed",
      translation_row_id: translationRowId,
      tool_type: trow.report_type, report_id: trow.report_id, language_code: trow.target_lang,
      chunks_done: sliceResult.chunksDone,
      chunks_total: sliceResult.chunksTotal,
      processed_this_slice: sliceResult.processedThisSlice,
      slice_count: newSliceCount,
      resume_count: resumeCountBefore + 1,
      kick_status: kick.status,
      engine: TRANSLATION_ENGINE_VERSION,
    },
  });
  return new Response(JSON.stringify({
    status: "translating",
    translation_row_id: translationRowId,
    chunks_done: sliceResult.chunksDone,
    chunks_total: sliceResult.chunksTotal,
    slice_count: newSliceCount,
    resume_count: resumeCountBefore + 1,
    continued: kick.ok,
  }), { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function markFailed(admin: any, id: string, msg: string) {
  await admin.from("report_translations").update({
    status: "failed",
    error_message: msg.slice(0, 1000),
    last_progress_at: new Date().toISOString(),
  }).eq("id", id);
}
