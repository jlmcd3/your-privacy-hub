// regrade-frozen-baseline — QB-P20 item 8 worker (per-doc + aggregate).
//
// Chunked variant: each invocation processes ONE doc (3 Claude + 1 GPT via
// 3 grade-single-assessment calls), persisting its raw per-doc payload as
// a quality_loop2_notes row with kind='regrade_frozen_baseline_v1_partial'
// carrying the session_id. A final `aggregate` invocation loads all partials
// for the session_id, computes per-dimension stddev, Claude-GPT correlation,
// and the implied noise floor, and stores the summary as a note with
// kind='regrade_frozen_baseline_v1'.
//
// Chunking is required because Supabase edge functions time out background
// tasks (>90s per doc × 10 docs > runtime budget) — first attempt with
// waitUntil got killed mid-run after 3 docs.
//
// DEVIATION: courier said "digest table". quality_campaign_digests is
// campaign/wave scoped and cannot represent a standalone variance
// instrument. quality_loop2_notes is the durable ad-hoc grader result store
// (grade-single-assessment writes there too).
//
// Auth: internal cron path (x-internal-cron:1 + ADMIN_SECRET_TOKEN | SR).
// Admin USER JWT also accepted for manual runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const BUILD_STAMP = "regrade-frozen-baseline-v1-chunked@2026-07-23T22:50:00Z";
console.log(`[regrade-frozen-baseline] boot ${BUILD_STAMP}`);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ADMIN_SECRET_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-cron",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const DIMS = ["accuracy", "citation", "hallucination", "analysis", "intelligence", "formatting"] as const;
type Dim = typeof DIMS[number];

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1);
  return Math.sqrt(v);
}
function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx, b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

async function callGrader(assessmentId: string, tool: string) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/grade-single-assessment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ assessment_id: assessmentId, tool, dry_run: true, fixture_label: "regrade_frozen_baseline_v1" }),
    signal: AbortSignal.timeout(250_000),
  });
  const text = await r.text();
  if (!r.ok) return { __err: `grader_http_${r.status}: ${text.slice(0, 200)}` };
  try { return JSON.parse(text); } catch { return { __err: "grader_bad_json" }; }
}

function pullSide(payload: any, key: "claude" | "gpt") {
  const v = payload?.[key];
  if (!v || typeof v.overall_score !== "number") return { val: null as any, err: String(v?.error ?? `${key}_missing`) };
  const d = v.dimension_scores ?? {};
  return {
    val: { overall: Number(v.overall_score), dims: Object.fromEntries(DIMS.map((k) => [k, Number(d[k] ?? 60)])) as Record<Dim, number> },
    err: null as string | null,
  };
}

async function gradeOneDoc(sessionId: string, docSourceRowId: string, toolRaw: string, toolGrader: string) {
  const claude_runs: Array<{ overall: number; dims: Record<Dim, number> }> = [];
  const claude_errors: string[] = [];
  let gpt_run: { overall: number; dims: Record<Dim, number> } | null = null;
  let gpt_error: string | null = null;
  for (let i = 0; i < 3; i++) {
    const r: any = await callGrader(docSourceRowId, toolGrader);
    if (r.__err) {
      claude_errors.push(r.__err);
      if (i === 0) gpt_error = r.__err;
      continue;
    }
    const p = r?.payload;
    const c = pullSide(p, "claude");
    if (c.val) claude_runs.push(c.val); else if (c.err) claude_errors.push(c.err);
    if (i === 0) {
      const g = pullSide(p, "gpt");
      if (g.val) gpt_run = g.val; else gpt_error = g.err;
    }
  }
  const partial = {
    session_id: sessionId, doc_source_row_id: docSourceRowId,
    tool_raw: toolRaw, tool_grader: toolGrader,
    claude_runs, claude_errors, gpt_run, gpt_error,
    created_at: new Date().toISOString(),
  };
  await admin().from("quality_loop2_notes").insert({
    kind: "regrade_frozen_baseline_v1_partial", note: JSON.stringify(partial),
  });
  return partial;
}

async function aggregateSession(sessionId: string) {
  const db = admin();
  const { data: rows, error } = await db.from("quality_loop2_notes")
    .select("id, note, created_at")
    .eq("kind", "regrade_frozen_baseline_v1_partial")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return { ok: false, error: error.message };
  const partials: any[] = [];
  for (const r of (rows ?? []) as any[]) {
    try {
      const p = JSON.parse(r.note);
      if (p?.session_id === sessionId) partials.push(p);
    } catch { /* skip */ }
  }
  if (partials.length === 0) return { ok: false, error: "no_partials_for_session", session_id: sessionId };

  const perDimSD: Record<string, number> = {};
  for (const dim of DIMS) {
    const sds: number[] = [];
    for (const p of partials) {
      const cr = p.claude_runs ?? [];
      if (cr.length >= 2) sds.push(stddev(cr.map((c: any) => c.dims[dim])));
    }
    perDimSD[dim] = sds.length ? Math.round((sds.reduce((a, b) => a + b, 0) / sds.length) * 1000) / 1000 : 0;
  }
  const overallSDs: number[] = [];
  for (const p of partials) {
    const cr = p.claude_runs ?? [];
    if (cr.length >= 2) overallSDs.push(stddev(cr.map((c: any) => c.overall)));
  }
  const noise_floor = overallSDs.length ? Math.round((overallSDs.reduce((a, b) => a + b, 0) / overallSDs.length) * 1000) / 1000 : 0;

  const xs: number[] = [], ys: number[] = [];
  for (const p of partials) {
    if ((p.claude_runs?.length ?? 0) >= 1 && p.gpt_run) {
      xs.push(p.claude_runs.reduce((a: number, b: any) => a + b.overall, 0) / p.claude_runs.length);
      ys.push(p.gpt_run.overall);
    }
  }
  const rc = pearson(xs, ys);
  const corr = rc == null ? null : Math.round(rc * 1000) / 1000;

  const summary = {
    build_stamp: BUILD_STAMP,
    session_id: sessionId,
    finished_at: new Date().toISOString(),
    docs_measured: partials.length,
    tools_spanned: [...new Set(partials.map((p) => p.tool_raw))].sort(),
    per_dimension_avg_sd_claude_3x: perDimSD,
    noise_floor_single_run_overall: noise_floor,
    claude_gpt_correlation: corr,
    correlation_n: xs.length,
    per_doc: partials.map((p) => ({
      doc_source_row_id: p.doc_source_row_id,
      tool_raw: p.tool_raw,
      tool_grader: p.tool_grader,
      claude_overalls: (p.claude_runs ?? []).map((c: any) => Math.round(c.overall * 100) / 100),
      claude_overall_sd: (p.claude_runs?.length ?? 0) >= 2
        ? Math.round(stddev(p.claude_runs.map((c: any) => c.overall)) * 1000) / 1000 : null,
      claude_errors: p.claude_errors ?? [],
      gpt_overall: p.gpt_run ? Math.round(p.gpt_run.overall * 100) / 100 : null,
      gpt_error: p.gpt_error,
    })),
    note: "Per-dimension SD = sample stdev across 3 Claude repeats per doc, averaged over docs with >=2 Claude runs. Noise floor = same aggregation on composite overall score. Claude-GPT correlation = Pearson r of per-doc mean-Claude-overall vs per-doc GPT-overall.",
  };
  const { data: ins, error: insErr } = await db.from("quality_loop2_notes")
    .insert({ kind: "regrade_frozen_baseline_v1", note: JSON.stringify(summary) })
    .select("id").single();
  if (insErr) return { ok: false, error: insErr.message, summary };
  return { ok: true, stored_note_id: ins?.id ?? null, summary };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const isCron = req.headers.get("x-internal-cron") === "1" && (
    token === SERVICE_KEY || (!!ADMIN_SECRET_TOKEN && token === ADMIN_SECRET_TOKEN)
  );
  if (!isCron) {
    if (!token) return json({ error: "missing_authorization" }, 401);
    const uc = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: u, error: ue } = await uc.auth.getUser(token);
    if (ue || !u?.user) return json({ error: "invalid_jwt" }, 401);
    const { data: isAdmin } = await uc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "admin_only" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  if (body?.action === "ping") return json({ ok: true, build_stamp: BUILD_STAMP });

  if (body?.action === "grade_one") {
    const { session_id, doc_source_row_id, tool_raw, tool_grader } = body;
    if (!session_id || !doc_source_row_id || !tool_raw || !tool_grader) {
      return json({ error: "missing_fields", need: ["session_id","doc_source_row_id","tool_raw","tool_grader"] }, 400);
    }
    const p = await gradeOneDoc(String(session_id), String(doc_source_row_id), String(tool_raw), String(tool_grader));
    return json({ ok: true, build_stamp: BUILD_STAMP, partial: p });
  }

  if (body?.action === "aggregate") {
    if (!body?.session_id) return json({ error: "missing_session_id" }, 400);
    const r = await aggregateSession(String(body.session_id));
    return json({ ...r, build_stamp: BUILD_STAMP });
  }

  return json({ error: "unknown_action", build_stamp: BUILD_STAMP }, 400);
};

export { handler };
if (import.meta.main) Deno.serve(handler);
