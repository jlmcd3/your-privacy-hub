// regrade-frozen-baseline — QB-P20 item 8 worker.
//
// Instrument-variance baseline: pick 10 stored complete documents spanning
// >=5 tools, re-grade EACH doc with BOTH judges (Claude + GPT) using the
// SAME rubric path as live grading (delegates to grade-single-assessment).
// Repeat each doc's Claude evaluation 3 times to measure single-run noise.
//
// Reports:
//   - per-dimension standard deviation of Claude scores (avg across docs)
//   - Pearson correlation between mean-Claude-overall and GPT-overall
//   - implied noise floor for single-run overall scores
//
// Persistence: quality_loop2_notes rows (kind: 'regrade_frozen_baseline_v1').
// DEVIATION: courier said "digest table" (quality_campaign_digests). That
// schema is per-wave, per-run, campaign-scoped, and cannot represent a
// standalone variance instrument. quality_loop2_notes is the durable ad-hoc
// results store used by grade-single-assessment for the same class of
// out-of-campaign measurements.
//
// Auth: admin USER JWT (has_role admin) OR internal cron path
// (x-internal-cron:1 + ADMIN_SECRET_TOKEN | SERVICE_ROLE).
//
// No product-code effects. Read-only over the source tables. Grader model
// paths are the live paths (grade-single-assessment invokes the exact same
// Claude/GPT calls used by run-quality-batch).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const BUILD_STAMP = "regrade-frozen-baseline-v1@2026-07-23T22:35:00Z";
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

// Map quality_run_documents.tool → grade-single-assessment tool slug.
const TOOL_ALIAS: Record<string, string> = {
  "biometric-checker": "biometric",
  "dpa-generator": "dpa",
  // registration is NOT supported by grade-single-assessment; excluded from selection.
};
const KNOWN_GRADER_TOOLS = new Set([
  "governance", "cppa-risk", "cppa-cyber", "cppa-admt",
  "dpia", "lia", "ir-playbook", "biometric", "dpa",
]);

const DIMS = ["accuracy", "citation", "hallucination", "analysis", "intelligence", "formatting"] as const;
type Dim = typeof DIMS[number];

type ClaudeRun = { overall: number; dims: Record<Dim, number> };
type GptRun = { overall: number; dims: Record<Dim, number> };
type DocResult = {
  doc_id: string;
  tool_raw: string;
  tool_grader: string;
  source_table: string;
  source_row_id: string;
  claude_runs: ClaudeRun[];
  claude_errors: string[];
  gpt_run: GptRun | null;
  gpt_error: string | null;
};

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) * (b - m), 0) / (xs.length - 1); // sample SD
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

async function callGrader(assessmentId: string, tool: string): Promise<
  { claude: ClaudeRun | null; claudeErr: string | null; gpt: GptRun | null; gptErr: string | null }
> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/grade-single-assessment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "x-internal-resume": "1",
    },
    body: JSON.stringify({
      assessment_id: assessmentId,
      tool,
      dry_run: true,
      fixture_label: "regrade_frozen_baseline_v1",
    }),
    signal: AbortSignal.timeout(240_000),
  });
  const text = await r.text();
  if (!r.ok) {
    return { claude: null, claudeErr: `grader_http_${r.status}: ${text.slice(0, 200)}`, gpt: null, gptErr: `grader_http_${r.status}` };
  }
  let body: any;
  try { body = JSON.parse(text); } catch { return { claude: null, claudeErr: "grader_bad_json", gpt: null, gptErr: "grader_bad_json" }; }
  const p = body?.payload;
  let claude: ClaudeRun | null = null;
  let claudeErr: string | null = null;
  if (p?.claude && typeof p.claude.overall_score === "number") {
    const d = p.claude.dimension_scores ?? {};
    claude = {
      overall: Number(p.claude.overall_score),
      dims: Object.fromEntries(DIMS.map((k) => [k, Number(d[k] ?? 60)])) as Record<Dim, number>,
    };
  } else {
    claudeErr = String(p?.claude?.error ?? "claude_missing");
  }
  let gpt: GptRun | null = null;
  let gptErr: string | null = null;
  if (p?.gpt && typeof p.gpt.overall_score === "number") {
    const d = p.gpt.dimension_scores ?? {};
    gpt = {
      overall: Number(p.gpt.overall_score),
      dims: Object.fromEntries(DIMS.map((k) => [k, Number(d[k] ?? 60)])) as Record<Dim, number>,
    };
  } else {
    gptErr = String(p?.gpt?.error ?? "gpt_missing");
  }
  return { claude, claudeErr, gpt, gptErr };
}

async function selectDocs(db: ReturnType<typeof admin>): Promise<Array<{
  doc_id: string; tool_raw: string; tool_grader: string; source_table: string; source_row_id: string;
}>> {
  // Prefer 5 diverse tools × 2 most-recent complete docs each.
  const preferred = ["cppa-risk", "cppa-cyber", "dpia", "lia", "biometric-checker"];
  const picked: Array<{ doc_id: string; tool_raw: string; tool_grader: string; source_table: string; source_row_id: string }> = [];
  for (const t of preferred) {
    const { data } = await db
      .from("quality_run_documents")
      .select("id, tool, source_table, source_row_id, created_at")
      .eq("status", "complete")
      .eq("tool", t)
      .not("report_data", "is", null)
      .not("source_row_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(2);
    for (const r of (data ?? []) as any[]) {
      const grader = TOOL_ALIAS[t] ?? t;
      if (!KNOWN_GRADER_TOOLS.has(grader)) continue;
      picked.push({
        doc_id: r.id,
        tool_raw: t,
        tool_grader: grader,
        source_table: r.source_table,
        source_row_id: r.source_row_id,
      });
    }
  }
  return picked;
}

async function runBaseline(): Promise<any> {
  const db = admin();
  const startedAt = new Date().toISOString();
  const docs = await selectDocs(db);
  const tools = new Set(docs.map((d) => d.tool_raw));
  if (docs.length < 10 || tools.size < 5) {
    return {
      ok: false, error: "insufficient_docs",
      selected: docs.length, tool_span: tools.size,
    };
  }

  const results: DocResult[] = [];
  for (const d of docs) {
    const res: DocResult = {
      doc_id: d.doc_id, tool_raw: d.tool_raw, tool_grader: d.tool_grader,
      source_table: d.source_table, source_row_id: d.source_row_id,
      claude_runs: [], claude_errors: [], gpt_run: null, gpt_error: null,
    };
    // 3 Claude runs. grade-single-assessment always calls both judges each
    // invocation; keep the first invocation's GPT result and discard the
    // GPT results from the two extra Claude repeats (variance instrument
    // only measures Claude repeat variance).
    for (let i = 0; i < 3; i++) {
      const g = await callGrader(d.source_row_id, d.tool_grader);
      if (g.claude) res.claude_runs.push(g.claude);
      if (g.claudeErr) res.claude_errors.push(g.claudeErr);
      if (i === 0) {
        if (g.gpt) res.gpt_run = g.gpt;
        if (g.gptErr) res.gpt_error = g.gptErr;
      }
    }
    results.push(res);
    console.log(`[regrade-frozen-baseline] doc=${d.doc_id} tool=${d.tool_raw} claude_runs=${res.claude_runs.length} gpt=${res.gpt_run ? "ok" : "err"}`);
  }

  // ---- Aggregate stats ----
  // Per-dimension SD across the 3 Claude runs per doc, then averaged over docs.
  const perDimAvgSD: Record<string, number> = {};
  for (const dim of DIMS) {
    const perDocSDs: number[] = [];
    for (const r of results) {
      if (r.claude_runs.length >= 2) {
        perDocSDs.push(stddev(r.claude_runs.map((c) => c.dims[dim])));
      }
    }
    perDimAvgSD[dim] = perDocSDs.length
      ? Math.round((perDocSDs.reduce((a, b) => a + b, 0) / perDocSDs.length) * 1000) / 1000
      : 0;
  }
  // Overall SD across 3 Claude runs per doc, averaged over docs = noise floor
  // for a single-run overall score.
  const perDocOverallSDs: number[] = [];
  for (const r of results) {
    if (r.claude_runs.length >= 2) perDocOverallSDs.push(stddev(r.claude_runs.map((c) => c.overall)));
  }
  const noise_floor_single_run_overall = perDocOverallSDs.length
    ? Math.round((perDocOverallSDs.reduce((a, b) => a + b, 0) / perDocOverallSDs.length) * 1000) / 1000
    : 0;

  // Claude-GPT correlation: mean-Claude-overall (per doc) vs GPT-overall (per doc).
  const claudeMeans: number[] = [];
  const gptOveralls: number[] = [];
  for (const r of results) {
    if (r.claude_runs.length && r.gpt_run) {
      const m = r.claude_runs.reduce((a, b) => a + b.overall, 0) / r.claude_runs.length;
      claudeMeans.push(m);
      gptOveralls.push(r.gpt_run.overall);
    }
  }
  const rawCorr = pearson(claudeMeans, gptOveralls);
  const claude_gpt_correlation = rawCorr == null ? null : Math.round(rawCorr * 1000) / 1000;

  const finishedAt = new Date().toISOString();
  const summary = {
    build_stamp: BUILD_STAMP,
    started_at: startedAt,
    finished_at: finishedAt,
    docs_selected: docs.length,
    tools_spanned: [...tools],
    per_dimension_avg_sd_claude_3x: perDimAvgSD,
    noise_floor_single_run_overall,
    claude_gpt_correlation,
    correlation_n: claudeMeans.length,
    per_doc: results.map((r) => ({
      doc_id: r.doc_id,
      tool_raw: r.tool_raw,
      tool_grader: r.tool_grader,
      source_row_id: r.source_row_id,
      claude_overalls: r.claude_runs.map((c) => c.overall),
      claude_overall_sd: r.claude_runs.length >= 2 ? Math.round(stddev(r.claude_runs.map((c) => c.overall)) * 1000) / 1000 : null,
      claude_errors: r.claude_errors,
      gpt_overall: r.gpt_run?.overall ?? null,
      gpt_error: r.gpt_error,
    })),
    note: "Per-dimension SD is the sample SD across the 3 Claude repeats for each doc, then averaged across docs with >=2 successful Claude runs. Noise floor is the same aggregation applied to the composite overall score. Claude-GPT correlation is Pearson r between per-doc mean-Claude-overall and per-doc GPT-overall.",
  };

  // Persistence — see file header DEVIATION note.
  const { data: noteRow, error: noteErr } = await db
    .from("quality_loop2_notes")
    .insert({ kind: "regrade_frozen_baseline_v1", note: JSON.stringify(summary) })
    .select("id")
    .single();
  if (noteErr) {
    return { ok: false, error: `note_insert_failed: ${noteErr.message}`, summary };
  }
  return { ok: true, stored_note_id: noteRow?.id ?? null, summary };
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
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid_jwt" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "admin_only" }, 403);
  }

  let body: { action?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  if (body?.action === "ping") return json({ ok: true, build_stamp: BUILD_STAMP });

  // Default action = run baseline. Long-running (~5-10 min). Kick off in
  // background and return 202 with a marker so callers don't time out.
  if (body?.action === "run" || body?.action === undefined) {
    const p = runBaseline()
      .then((r) => console.log(`[regrade-frozen-baseline] done ok=${(r as any).ok} note=${(r as any).stored_note_id ?? "-"}`))
      .catch((e) => console.error("[regrade-frozen-baseline] error", (e as Error).message));
    // @ts-ignore edge runtime
    if (typeof EdgeRuntime !== "undefined" && (EdgeRuntime as any).waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(p);
    }
    return json({ ok: true, action: "run", build_stamp: BUILD_STAMP, note: "baseline running; results in quality_loop2_notes kind=regrade_frozen_baseline_v1" }, 202);
  }

  // Synchronous mode for callers willing to hold the connection.
  if (body?.action === "run_sync") {
    const r = await runBaseline();
    return json({ ...r, build_stamp: BUILD_STAMP });
  }

  return json({ error: "unknown_action", build_stamp: BUILD_STAMP }, 400);
};

export { handler };
if (import.meta.main) Deno.serve(handler);
