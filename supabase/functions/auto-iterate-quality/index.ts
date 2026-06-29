// auto-iterate-quality
// Orchestrator that runs improve-tool-quality cycles sequentially across a
// list of tool_slugs. For each tool, it starts ONE cycle with
// max_iterations and target_score (defaults: 7 / 98). The cycle itself
// already loops internally until the target is reached or max_iterations
// is hit; this orchestrator only needs to (a) start the next cycle when
// the previous one terminates, and (b) advance to the next tool.
//
// State lives in long_running_jobs.result:
//   { tools: string[], idx: number, max_iterations, target_score,
//     current: { tool, cycle_id, started_at } | null,
//     history: Array<{ tool, cycle_id, status, current_score, iteration }> }
//
// Self-reinvokes every ~30s. Stops when the queue is exhausted.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

function admin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const TERMINAL = new Set(["complete", "completed", "failed", "error", "cancelled", "canceled"]);

async function startCycle(tool: string, max_iterations: number, target_score: number, userId: string | null) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/improve-tool-quality`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      "x-internal-resume": "1",
      "x-internal-caller": "auto-iterate-quality",
      ...(userId ? { "x-acting-user": userId } : {}),
    },
    body: JSON.stringify({ tool_slug: tool, max_iterations, target_score, started_by: userId }),
  });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* */ }
  if (!res.ok) throw new Error(`improve-tool-quality ${res.status}: ${text.slice(0, 300)}`);
  return body?.cycle_id as string | undefined;
}

async function selfReinvoke(jobId: string, delayMs = 30_000) {
  await new Promise((r) => setTimeout(r, delayMs));
  await fetch(`${SUPABASE_URL}/functions/v1/auto-iterate-quality`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      "x-internal-caller": "auto-iterate-quality-tick",
    },
    body: JSON.stringify({ job_id: jobId, tick: true }),
  });
}

async function tick(jobId: string) {
  const db = admin();
  const { data: job, error } = await db
    .from("long_running_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  if (error || !job) throw new Error(`job ${jobId} not found: ${error?.message}`);
  if (TERMINAL.has(job.status)) return;

  const state = (job.result ?? {}) as any;
  const tools: string[] = state.tools ?? [];
  const idx: number = state.idx ?? 0;
  const max_iterations: number = state.max_iterations ?? 7;
  const target_score: number = state.target_score ?? 98;
  const history: any[] = state.history ?? [];
  let current = state.current as { tool: string; cycle_id: string; started_at: string } | null;
  const userId: string | null = job.requested_by ?? null;

  // All tools done?
  if (idx >= tools.length) {
    await db.from("long_running_jobs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      progress: `Done. ${history.length} cycle(s) completed.`,
      result: { ...state, current: null, history },
    }).eq("id", jobId);
    return;
  }

  const tool = tools[idx];

  // No active cycle for this tool — start one.
  if (!current || current.tool !== tool) {
    const started_at = new Date().toISOString();
    let cycle_id: string | undefined;
    try {
      cycle_id = await startCycle(tool, max_iterations, target_score, userId);
    } catch (e) {
      history.push({ tool, cycle_id: null, status: "start_failed", error: String((e as Error).message) });
      await db.from("long_running_jobs").update({
        progress: `[${idx + 1}/${tools.length}] ${tool}: start failed → advancing`,
        result: { ...state, idx: idx + 1, current: null, history },
      }).eq("id", jobId);
      await selfReinvoke(jobId, 5_000);
      return;
    }
    current = { tool, cycle_id: cycle_id!, started_at };
    await db.from("long_running_jobs").update({
      status: "running",
      progress: `[${idx + 1}/${tools.length}] ${tool}: cycle ${cycle_id?.slice(0, 8)} started`,
      result: { ...state, current, history },
    }).eq("id", jobId);
    await selfReinvoke(jobId, 30_000);
    return;
  }

  // Poll current cycle.
  const { data: cycle } = await db
    .from("tool_improvement_cycles")
    .select("id, status, phase, iteration, current_score, last_error")
    .eq("id", current.cycle_id)
    .single();

  if (!cycle) {
    history.push({ tool, cycle_id: current.cycle_id, status: "missing" });
    await db.from("long_running_jobs").update({
      progress: `[${idx + 1}/${tools.length}] ${tool}: cycle missing → advancing`,
      result: { ...state, idx: idx + 1, current: null, history },
    }).eq("id", jobId);
    await selfReinvoke(jobId, 5_000);
    return;
  }

  if (TERMINAL.has(cycle.status)) {
    history.push({
      tool,
      cycle_id: cycle.id,
      status: cycle.status,
      current_score: cycle.current_score,
      iteration: cycle.iteration,
      last_error: cycle.last_error,
    });
    await db.from("long_running_jobs").update({
      progress: `[${idx + 1}/${tools.length}] ${tool}: ${cycle.status} score=${cycle.current_score ?? "?"} iter=${cycle.iteration} → next`,
      result: { ...state, idx: idx + 1, current: null, history },
    }).eq("id", jobId);
    await selfReinvoke(jobId, 5_000);
    return;
  }

  // Still running — update progress and poll again.
  await db.from("long_running_jobs").update({
    progress: `[${idx + 1}/${tools.length}] ${tool}: phase=${cycle.phase} iter=${cycle.iteration} score=${cycle.current_score ?? "—"}`,
    result: { ...state, current, history },
  }).eq("id", jobId);
  await selfReinvoke(jobId, 45_000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  // Tick path (from self-reinvoke).
  if (body?.tick && body?.job_id) {
    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(tick(body.job_id).catch(async (e) => {
      const db = admin();
      await db.from("long_running_jobs").update({
        status: "error",
        error: String((e as Error).message ?? e),
        completed_at: new Date().toISOString(),
      }).eq("id", body.job_id);
    }));
    return json({ accepted: true });
  }

  // Status query.
  if (body?.status_of) {
    const { data } = await admin().from("long_running_jobs").select("*").eq("id", body.status_of).single();
    return json({ job: data });
  }

  // Start a new orchestration.
  // Auth: require admin user via Authorization bearer (Lovable preview auto-injects).
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes } = await userClient.auth.getUser();
  const userId = userRes?.user?.id ?? null;
  if (!userId) return json({ error: "Unauthorized" }, 401);
  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) return json({ error: "Admin only" }, 403);

  const ALL_TOOLS = [
    "biometric", "dpia", "li_assessment", "ropa", "eu_notice", "us_notice",
    "cppa_risk", "cppa_cyber", "cppa_admt", "dpa", "governance",
    "ir_playbook", "registration",
  ];
  const tools: string[] = Array.isArray(body?.tools) && body.tools.length ? body.tools : ALL_TOOLS;
  const max_iterations: number = Number(body?.max_iterations ?? 7);
  const target_score: number = Number(body?.target_score ?? 98);

  const db = admin();
  const { data: job, error } = await db.from("long_running_jobs").insert({
    kind: "auto_iterate_quality",
    status: "pending",
    requested_by: userId,
    progress: `Queued ${tools.length} tool(s)`,
    result: {
      tools, idx: 0, max_iterations, target_score,
      current: null, history: [],
    },
  }).select("id").single();
  if (error) return json({ error: error.message }, 500);

  // @ts-ignore EdgeRuntime
  EdgeRuntime.waitUntil(selfReinvoke((job as any).id, 1_000));
  return json({ accepted: true, job_id: (job as any).id, tools }, 202);
});
