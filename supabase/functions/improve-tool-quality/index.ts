// improve-tool-quality — Quality Loop "Back to Framework v2" orchestrator.
//
// One press of the per-tool "Run improvement cycle" button calls this with
// { tool_slug }. We create a `tool_improvement_cycles` row and self-chain
// via EdgeRuntime.waitUntil through phased work units so no single isolate
// holds the 400s edge wall-clock.
//
// Phases (each invocation does ONE phase then re-invokes itself):
//   init           → load latest static_stress_batches row for the tool;
//                     P2 fixture-drift gate marks degraded rows as excluded.
//   reviewing      → for each clean sample_report, run gpt-4o + claude-sonnet
//                     reviewers via review-test-output (1 report/invocation
//                     to stay well inside wall-clock).
//   ranking        → consensus top-10 (changes BOTH reviewers raised,
//                     ranked by severity × frequency).
//   deliberating   → seed quality_runs + quality_check_results from top-10
//                     and invoke deliberate-quality-fixes (Team-3 decisive).
//   rerunning      → start-stress-batch for THIS tool only against the
//                     current prompts (which now include staged auto-fixes).
//   reviewing/...  → loop until score ≥ target, or max_iterations hit,
//                     or no improvement for two iterations.
//   complete | failed

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const REVIEWER_MODELS = [
  { provider: "openai",    model: "gpt-4o" },
  { provider: "anthropic", model: "claude-sonnet-4-5-20250929" },
];

// Map UI/stress tool ids → sample_reports.tool_slug (mirrors run-stress-job).
const TOOL_SLUG_MAP: Record<string, string> = {
  "lia": "li_assessment", "dpia": "dpia", "governance": "governance",
  "biometric": "biometric", "dpa": "dpa", "ir-playbook": "ir_playbook",
  "ropa": "ropa", "us-notice": "us_notice", "eu-notice": "eu_notice",
  "cppa-risk": "cppa_risk", "cppa-cyber": "cppa_cyber", "cppa-admt": "cppa_admt",
  "registration": "registration",
};
function toSampleSlug(s: string): string { return TOOL_SLUG_MAP[s] ?? s; }
function toStressId(slug: string): string {
  const entry = Object.entries(TOOL_SLUG_MAP).find(([, v]) => v === slug);
  return entry?.[0] ?? slug;
}

type Admin = ReturnType<typeof createClient>;

async function adminClient(): Promise<Admin> {
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}

async function appendLog(admin: Admin, cycleId: string, msg: string) {
  const ts = new Date().toISOString();
  const { data } = await admin.from("tool_improvement_cycles").select("log").eq("id", cycleId).maybeSingle();
  const log = Array.isArray((data as any)?.log) ? (data as any).log : [];
  log.push({ ts, msg });
  await admin.from("tool_improvement_cycles").update({ log: log.slice(-200) }).eq("id", cycleId);
  console.log(`[improve-tool-quality][${cycleId}] ${msg}`);
}

async function selfReinvoke(cycleId: string, phase?: string): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/improve-tool-quality`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, "x-internal-resume": "1" },
      body: JSON.stringify({ cycle_id: cycleId, phase }),
    });
  } catch (e) {
    console.warn("[improve-tool-quality] self-reinvoke failed:", (e as Error).message);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function invokeFn(name: string, body: unknown, timeoutMs = 240_000): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, "x-internal-resume": "1" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${name} ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  return d;
}

// ─── P2 fixture-drift gate ────────────────────────────────────────────────────
function isDegradedReport(report: any): { degraded: boolean; reason?: string } {
  const text: string = report?.document_text ?? "";
  const rd = report?.report_data ?? {};
  if (!text && !Object.keys(rd ?? {}).length) return { degraded: true, reason: "empty output" };
  if (text && text.length < 800) return { degraded: true, reason: `short output (${text.length} chars)` };
  const hay = (text + " " + JSON.stringify(rd)).toLowerCase();
  const fallbackMarkers = [
    "the applicable law in this jurisdiction",
    "regulations typically require",
    "based on the provided",
    "the applicable statute",
  ];
  for (const m of fallbackMarkers) if (hay.includes(m)) return { degraded: true, reason: `generic-fallback marker: "${m}"` };
  return { degraded: false };
}

// ─── Score aggregation ───────────────────────────────────────────────────────
function avgScores(reviews: any[]): number {
  const vals: number[] = [];
  for (const r of reviews) {
    if (typeof r.overall_score === "number") vals.push(r.overall_score);
    const s = r.scores ?? {};
    for (const k of Object.keys(s)) if (typeof s[k] === "number") vals.push(s[k]);
  }
  if (!vals.length) return 0;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

// ─── Phases ───────────────────────────────────────────────────────────────────

async function phaseInit(admin: Admin, cycleId: string) {
  const { data: cycle } = await admin.from("tool_improvement_cycles").select("*").eq("id", cycleId).single();
  if (!cycle) throw new Error("cycle not found");
  const toolSlug = (cycle as any).tool_slug as string;

  // P1: most recent static_stress_batches batch that produced sample_reports for this tool.
  const { data: latestBatch } = await admin
    .from("static_stress_batches")
    .select("id, created_at, completed_at, status, selected_tools")
    .order("created_at", { ascending: false })
    .limit(20);
  let batchId: string | null = null;
  for (const b of latestBatch ?? []) {
    const tools: string[] = (b as any).selected_tools ?? [];
    if (tools.includes(toStressId(toolSlug)) || tools.includes(toolSlug)) {
      batchId = (b as any).id;
      break;
    }
  }
  if (!batchId) {
    await admin.from("tool_improvement_cycles").update({
      status: "failed", phase: "init", last_error: "no recent static_stress_batch for this tool — run static-stress first",
      completed_at: new Date().toISOString(),
    }).eq("id", cycleId);
    return;
  }
  await admin.from("tool_improvement_cycles").update({
    baseline_batch_id: batchId, current_batch_id: batchId, phase: "reviewing", status: "running",
  }).eq("id", cycleId);
  await appendLog(admin, cycleId, `Phase 1 — using static-stress batch ${batchId.slice(0, 8)}`);
  await selfReinvoke(cycleId);
}

async function phaseReviewing(admin: Admin, cycleId: string) {
  const { data: cycle } = await admin.from("tool_improvement_cycles").select("*").eq("id", cycleId).single();
  if (!cycle) throw new Error("cycle not found");
  const toolSlug = (cycle as any).tool_slug as string;
  const batchId = (cycle as any).current_batch_id as string;
  const iteration = (cycle as any).iteration as number;

  // Pull all sample_reports tied to this batch's jobs.
  const { data: jobs } = await admin
    .from("static_stress_jobs")
    .select("source_table, source_row_id, status, tool_slug, company_name")
    .eq("batch_id", batchId)
    .eq("tool_slug", toStressId(toolSlug));

  const sampleSlug = toSampleSlug(toolSlug);
  // sample_reports link via source_row_id which is uuid; jobs.source_row_id is text.
  const rowIds = (jobs ?? []).map((j: any) => j.source_row_id).filter(Boolean);
  let reports: any[] = [];
  if (rowIds.length) {
    const { data } = await admin
      .from("sample_reports")
      .select("id, source_row_id, document_text, report_data, fixture, title")
      .eq("tool_slug", sampleSlug)
      .in("source_row_id", rowIds);
    reports = data ?? [];
  } else {
    // fallback: recent sample_reports for this tool
    const { data } = await admin
      .from("sample_reports")
      .select("id, source_row_id, document_text, report_data, fixture, title")
      .eq("tool_slug", sampleSlug)
      .order("created_at", { ascending: false })
      .limit(20);
    reports = data ?? [];
  }

  // P2: drift gate
  const jobByRowId = new Map((jobs ?? []).map((j: any) => [j.source_row_id, j]));
  const excluded: any[] = [];
  const clean: any[] = [];
  for (const r of reports) {
    const job = jobByRowId.get(r.source_row_id);
    if (job && job.status !== "complete") {
      excluded.push({ report_id: r.id, reason: `stress job status=${job.status}` });
      continue;
    }
    const d = isDegradedReport(r);
    if (d.degraded) excluded.push({ report_id: r.id, reason: d.reason });
    else clean.push(r);
  }
  await admin.from("tool_improvement_cycles").update({ excluded_rows: excluded }).eq("id", cycleId);

  if (clean.length === 0) {
    await appendLog(admin, cycleId, `All ${reports.length} report(s) excluded by P2 fixture-drift gate. Iteration ${iteration}.`);
    await admin.from("tool_improvement_cycles").update({
      status: "failed", phase: "reviewing",
      last_error: "all rows excluded as degraded fixtures — fix generate-stress-fixtures and rerun static-stress",
      completed_at: new Date().toISOString(),
    }).eq("id", cycleId);
    return;
  }

  // Process ONE clean report per invocation (× 2 reviewers) to stay inside wall-clock.
  const { data: alreadyReviewed } = await admin
    .from("quality_reviews")
    .select("sample_report_id, model")
    .eq("cycle_id", cycleId)
    .eq("iteration", iteration);
  const doneMap = new Map<string, Set<string>>();
  for (const row of alreadyReviewed ?? []) {
    const set = doneMap.get((row as any).sample_report_id) ?? new Set<string>();
    set.add((row as any).model);
    doneMap.set((row as any).sample_report_id, set);
  }

  // Find next report needing either reviewer.
  let next: any | null = null;
  for (const r of clean) {
    const set = doneMap.get(r.id) ?? new Set<string>();
    if (set.size < REVIEWER_MODELS.length) { next = r; break; }
  }

  if (!next) {
    // All clean reports reviewed by both models — proceed.
    await appendLog(admin, cycleId, `Iteration ${iteration}: reviewed ${clean.length} clean report(s) with dual models. Excluded ${excluded.length}.`);
    await admin.from("tool_improvement_cycles").update({ phase: "ranking" }).eq("id", cycleId);
    await selfReinvoke(cycleId);
    return;
  }

  const outputText = next.document_text || JSON.stringify(next.report_data ?? {});
  const set = doneMap.get(next.id) ?? new Set<string>();
  for (const r of REVIEWER_MODELS) {
    if (set.has(r.model)) continue;
    try {
      const resp = await invokeFn("review-test-output", {
        testId: next.id,
        testLabel: next.title ?? next.id,
        output: outputText,
        target_tool: sampleSlug,
        mode: "improvement",
        model: r.model,
        assertions: [],
        log: [],
      }, 180_000);
      const rev = resp?.review ?? {};
      await admin.from("quality_reviews").insert({
        cycle_id: cycleId,
        iteration,
        sample_report_id: next.id,
        tool_slug: sampleSlug,
        model: r.model,
        overall_score: typeof rev.overall === "number" ? rev.overall : null,
        scores: rev.scores ?? {},
        changes: rev.changes ?? [],
        strengths: rev.strengths ?? [],
        critical_failures: rev.critical_failures ?? [],
      });
    } catch (e) {
      await admin.from("quality_reviews").insert({
        cycle_id: cycleId,
        iteration,
        sample_report_id: next.id,
        tool_slug: sampleSlug,
        model: r.model,
        error: String((e as Error).message).slice(0, 500),
      });
      await appendLog(admin, cycleId, `Reviewer ${r.model} failed on ${next.id.slice(0, 8)}: ${(e as Error).message.slice(0, 120)}`);
    }
  }
  await selfReinvoke(cycleId);
}

function similarChange(a: any, b: any): boolean {
  const la = String(a.location ?? "").toLowerCase().trim();
  const lb = String(b.location ?? "").toLowerCase().trim();
  const pa = String(a.problem ?? "").toLowerCase().trim();
  const pb = String(b.problem ?? "").toLowerCase().trim();
  if (la && lb && la === lb) return true;
  // crude n-gram overlap on problem text
  const tokensA = new Set(pa.split(/\W+/).filter(t => t.length > 4));
  const tokensB = new Set(pb.split(/\W+/).filter(t => t.length > 4));
  if (!tokensA.size || !tokensB.size) return false;
  let inter = 0; for (const t of tokensA) if (tokensB.has(t)) inter++;
  return inter / Math.min(tokensA.size, tokensB.size) >= 0.5;
}

const SEVERITY_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

async function phaseRanking(admin: Admin, cycleId: string) {
  const { data: cycle } = await admin.from("tool_improvement_cycles").select("*").eq("id", cycleId).single();
  if (!cycle) throw new Error("cycle not found");
  const iteration = (cycle as any).iteration as number;
  const toolSlug = (cycle as any).tool_slug as string;
  const sampleSlug = toSampleSlug(toolSlug);

  const { data: reviews } = await admin
    .from("quality_reviews")
    .select("sample_report_id, model, scores, overall_score, changes")
    .eq("cycle_id", cycleId)
    .eq("iteration", iteration)
    .is("error", null);

  const reviewList = (reviews ?? []) as any[];
  const score = avgScores(reviewList);

  // Group changes per report by model
  const perReport = new Map<string, { openai: any[]; anthropic: any[] }>();
  for (const r of reviewList) {
    const key = r.sample_report_id;
    const slot = perReport.get(key) ?? { openai: [], anthropic: [] };
    const bucket = /^gpt-|^o[0-9]/i.test(r.model) ? "openai" : "anthropic";
    slot[bucket].push(...(Array.isArray(r.changes) ? r.changes : []));
    perReport.set(key, slot);
  }

  // P4: keep only changes BOTH reviewers raised (per report), then aggregate.
  const consensusBucket = new Map<string, { count: number; severity: number; sample: any }>();
  for (const slot of perReport.values()) {
    for (const a of slot.openai) {
      for (const b of slot.anthropic) {
        if (similarChange(a, b)) {
          const key = `${(a.location ?? "").slice(0, 80)}::${(a.problem ?? "").slice(0, 80)}`;
          const sev = Math.max(SEVERITY_WEIGHT[String(a.severity).toLowerCase()] ?? 1, SEVERITY_WEIGHT[String(b.severity).toLowerCase()] ?? 1);
          const cur = consensusBucket.get(key) ?? { count: 0, severity: sev, sample: a };
          cur.count++;
          cur.severity = Math.max(cur.severity, sev);
          consensusBucket.set(key, cur);
        }
      }
    }
  }
  const ranked = [...consensusBucket.values()]
    .sort((x, y) => (y.severity * y.count) - (x.severity * x.count))
    .slice(0, 10);

  const topChanges = ranked.map(({ severity, count, sample }) => ({
    target_tool: sample.target_tool ?? sampleSlug,
    location: sample.location ?? "",
    problem: sample.problem ?? "",
    fix: sample.fix ?? "",
    severity_weight: severity,
    frequency: count,
  }));

  const history = ((cycle as any).score_history ?? []) as any[];
  history.push({ iteration, score, top_changes: topChanges.length });
  const baselineScore = (cycle as any).baseline_score ?? score;

  await admin.from("tool_improvement_cycles").update({
    current_score: score,
    baseline_score: baselineScore,
    top_changes: topChanges,
    score_history: history,
    phase: "deliberating",
  }).eq("id", cycleId);
  await appendLog(admin, cycleId, `Iteration ${iteration}: score=${score} · ${topChanges.length} agreed change(s)`);

  // Early-exit checks
  if (score >= ((cycle as any).target_score ?? 98)) {
    await appendLog(admin, cycleId, `✓ Target reached (${score} ≥ ${(cycle as any).target_score})`);
    await admin.from("tool_improvement_cycles").update({
      status: "complete", phase: "complete", completed_at: new Date().toISOString(),
    }).eq("id", cycleId);
    return;
  }
  if (iteration >= ((cycle as any).max_iterations ?? 6)) {
    await appendLog(admin, cycleId, `Max iterations (${(cycle as any).max_iterations}) reached at score=${score}`);
    await admin.from("tool_improvement_cycles").update({
      status: "complete", phase: "complete", completed_at: new Date().toISOString(),
    }).eq("id", cycleId);
    return;
  }
  // Halt if no improvement for two iterations
  if (history.length >= 3) {
    const a = history[history.length - 1].score;
    const b = history[history.length - 2].score;
    const c = history[history.length - 3].score;
    if (a <= b && b <= c) {
      await appendLog(admin, cycleId, `Stopped — no improvement for 2 iterations (${c} → ${b} → ${a})`);
      await admin.from("tool_improvement_cycles").update({
        status: "complete", phase: "complete", completed_at: new Date().toISOString(),
      }).eq("id", cycleId);
      return;
    }
  }
  if (topChanges.length === 0) {
    await appendLog(admin, cycleId, `No consensus changes from dual reviewers — stopping at score=${score}`);
    await admin.from("tool_improvement_cycles").update({
      status: "complete", phase: "complete", completed_at: new Date().toISOString(),
    }).eq("id", cycleId);
    return;
  }
  await selfReinvoke(cycleId);
}

async function phaseDeliberating(admin: Admin, cycleId: string) {
  const { data: cycle } = await admin.from("tool_improvement_cycles").select("*").eq("id", cycleId).single();
  if (!cycle) throw new Error("cycle not found");
  const toolSlug = (cycle as any).tool_slug as string;
  const sampleSlug = toSampleSlug(toolSlug);
  const topChanges: any[] = ((cycle as any).top_changes ?? []) as any[];

  // Create a quality_runs row + quality_check_results rows for deliberate-quality-fixes to consume.
  let runId = (cycle as any).quality_run_id as string | null;
  if (!runId) {
    const { data: qr, error } = await admin.from("quality_runs").insert({
      tool: sampleSlug,
      status: "deliberating",
      mode: "improvement_cycle",
    }).select("id").single();
    if (error) {
      // Fail loud: a seed/handoff failure must stop the cycle, not silently spin.
      const msg = `quality_runs insert failed (${error.message}) — cycle aborted`;
      await appendLog(admin, cycleId, msg);
      await admin.from("tool_improvement_cycles").update({
        status: "failed",
        phase: "complete",
        last_error: msg,
        completed_at: new Date().toISOString(),
      }).eq("id", cycleId);
      return; // do NOT self-reinvoke
    }
    runId = (qr as any).id;
    await admin.from("tool_improvement_cycles").update({ quality_run_id: runId }).eq("id", cycleId);
  }

  // Insert quality_check_results — one row per top-10 change.
  const sevMap = ["", "low", "medium", "high", "critical"];
  for (let i = 0; i < topChanges.length; i++) {
    const c = topChanges[i];
    const sevLabel = sevMap[Math.min(4, Math.max(1, c.severity_weight ?? 2))];
    const { error: upsertErr } = await admin.from("quality_check_results").upsert({
      run_id: runId,
      tool: sampleSlug,
      check_id: `cycle:${cycleId.slice(0, 8)}:${i + 1}`,
      run_number: 1,
      check_type: "llm",
      dimension: "accuracy",
      severity: sevLabel,
      pass_count: 0,
      fail_count: c.frequency ?? 1,
      fail_rate: 1,
      sample_evidence: [{ location: c.location, problem: c.problem }],
      proposed_fix: c.fix,
      fix_location: c.location,
      cross_review_category: "agree",
    }, { onConflict: "run_id,check_id" });
    if (upsertErr) {
      const msg = `quality_check_results upsert failed (${upsertErr.message}) — cycle aborted`;
      await appendLog(admin, cycleId, msg);
      await admin.from("tool_improvement_cycles").update({
        status: "failed", phase: "complete", last_error: msg, completed_at: new Date().toISOString(),
      }).eq("id", cycleId);
      return;
    }
  }

  // Fire deliberate-quality-fixes; it self-chains.
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/deliberate-quality-fixes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ run_id: runId, offset: 0 }),
    });
    await appendLog(admin, cycleId, `Team deliberation kicked off (run ${runId.slice(0, 8)}, ${topChanges.length} changes). Team 3 decides.`);
  } catch (e) {
    await appendLog(admin, cycleId, `deliberate-quality-fixes invoke failed: ${(e as Error).message}`);
  }

  await admin.from("tool_improvement_cycles").update({ phase: "rerunning" }).eq("id", cycleId);
  // Give deliberation a head start; the rerunning phase will check verdicts.
  await sleep(30_000); await selfReinvoke(cycleId);
}

async function phaseRerunning(admin: Admin, cycleId: string) {
  const { data: cycle } = await admin.from("tool_improvement_cycles").select("*").eq("id", cycleId).single();
  if (!cycle) throw new Error("cycle not found");
  const toolSlug = (cycle as any).tool_slug as string;
  const iteration = (cycle as any).iteration as number;
  const runId = (cycle as any).quality_run_id as string;

  // Wait until deliberations finish. The correct target is the count of
  // ACTIONABLE candidates (fail_count>0 AND proposed_fix IS NOT NULL) — every
  // such candidate yields a quality_fix_deliberations row. registry_proposals
  // are only written when Team 2's stance is "registry", so using that as the
  // target undercounts and causes premature advance.
  //
  // Self-healing: deliberate-quality-fixes chunks candidates and chains via
  // fire-and-forget fetch. If the edge runtime kills it mid-chain, the next
  // chunk never starts and we'd poll forever. Re-kick on every wait tick —
  // the function is idempotent (upsert with onConflict) and skips already-
  // processed checks.
  if (runId) {
    const { data: candidates } = await admin
      .from("quality_check_results")
      .select("check_id")
      .eq("run_id", runId)
      .gt("fail_count", 0)
      .not("proposed_fix", "is", null);
    const { data: delibs } = await admin.from("quality_fix_deliberations").select("check_id, verdict").eq("run_id", runId);
    const { data: proposals } = await admin.from("registry_proposals").select("check_id").eq("run_id", runId);
    const target = candidates?.length ?? 0;
    const done = delibs?.length ?? 0;
    const proposalsCount = proposals?.length ?? 0;
    if (target > 0 && done < target) {
      await appendLog(admin, cycleId, `Deliberation ${done}/${target} — waiting (re-kicking chain; registry_proposals=${proposalsCount})`);
      // Re-kick deliberate-quality-fixes (idempotent). Resumes any dropped chain.
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/deliberate-quality-fixes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_KEY}`,
            "x-internal-resume": "1",
          },
          body: JSON.stringify({ run_id: runId, offset: 0 }),
        });
      } catch (e) {
        await appendLog(admin, cycleId, `deliberate-quality-fixes re-kick failed: ${(e as Error).message}`);
      }
      await sleep(30_000); await selfReinvoke(cycleId);
      return;
    }
    const staged = (delibs ?? []).filter((d: any) => d.verdict === "auto_eligible").length;
    const dropped = (delibs ?? []).filter((d: any) => d.verdict === "reject").length;
    await appendLog(admin, cycleId, `Team 3 ruled: ${staged} staged to quality-auto, ${dropped} dropped, ${done - staged - dropped} human-review (proposals=${proposalsCount}/${target}).`);
  }


  // P6: kick a fresh stress batch limited to THIS tool. Inherits all anti-fail
  // machinery (9-min/tool timeout, watchdog, EdgeRuntime.waitUntil, token ceilings).
  //
  // ROOT-CAUSE FIX (2026-06-29): generate-stress-fixtures only emits a non-null
  // `biometric` payload when the industry label matches /healthcare|life science|
  // clinical|medical|pharma|financial|security/i. A generic "Improvement cycle"
  // label produced fixtures.biometric === null, so the biometric tool's job row
  // was filtered out (.filter(j => j.payload)) leaving the batch with 0 jobs.
  // The rerun cannot validate prompt changes if no fixture exists for the tool,
  // so each tool must use a label the fixture generator will populate.
  const TOOL_STRESS_INDUSTRY: Record<string, { id: string; label: string; geo: "us" | "eu" }> = {
    biometric:    { id: "healthcare",  label: "Healthcare",                geo: "us" },
    dpia:         { id: "healthcare",  label: "Healthcare",                geo: "eu" },
    li_assessment:{ id: "adtech",      label: "AdTech / Marketing",        geo: "eu" },
    ropa:         { id: "healthcare",  label: "Healthcare",                geo: "eu" },
    eu_notice:    { id: "saas",        label: "SaaS",                      geo: "eu" },
    us_notice:    { id: "saas",        label: "SaaS",                      geo: "us" },
    cppa_risk:    { id: "adtech",      label: "AdTech / Marketing",        geo: "us" },
    cppa_cyber:   { id: "financial",   label: "Financial services",        geo: "us" },
    cppa_admt:    { id: "financial",   label: "Financial services",        geo: "us" },
    dpa:          { id: "saas",        label: "SaaS",                      geo: "us" },
    governance:   { id: "saas",        label: "SaaS",                      geo: "us" },
    ir_playbook:  { id: "saas",        label: "SaaS",                      geo: "us" },
    registration: { id: "saas",        label: "SaaS",                      geo: "us" },
  };
  try {
    const stressId = toStressId(toolSlug);
    const ind = TOOL_STRESS_INDUSTRY[toolSlug] ?? { id: "saas", label: "SaaS", geo: "us" as const };
    const { data: batch, error } = await admin.from("static_stress_batches").insert({
      run_by: (cycle as any).started_by,
      status: "pending",
      industries: [ind.label],
      geo_filter: ind.geo,
      total_jobs: 0,
      setup_total: 1,
      setup_done: 0,
      selected_tools: [stressId],
      companies: [{ industryId: ind.id, industryLabel: ind.label, geo: ind.geo, slot: 1 }],
    }).select("id").single();
    if (error || !batch) throw new Error(`batch insert: ${error?.message}`);
    const newBatchId = (batch as any).id;
    fetch(`${SUPABASE_URL}/functions/v1/start-stress-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}`, "x-internal-resume": "1" },
      body: JSON.stringify({ batch_id: newBatchId, company_index: 0 }),
    }).catch(() => {/* fire-and-forget */});
    await appendLog(admin, cycleId, `Iteration ${iteration + 1}: kicked stress batch ${newBatchId.slice(0, 8)} for re-review (industry=${ind.label}, geo=${ind.geo})`);
    await admin.from("tool_improvement_cycles").update({
      iteration: iteration + 1,
      current_batch_id: newBatchId,
      quality_run_id: null,
      phase: "awaiting_rerun",
    }).eq("id", cycleId);
    await sleep(60_000); await selfReinvoke(cycleId);
  } catch (e) {
    await admin.from("tool_improvement_cycles").update({
      status: "failed", last_error: (e as Error).message, completed_at: new Date().toISOString(),
    }).eq("id", cycleId);
  }
}

async function phaseAwaitingRerun(admin: Admin, cycleId: string) {
  const { data: cycle } = await admin.from("tool_improvement_cycles").select("*").eq("id", cycleId).single();
  if (!cycle) throw new Error("cycle not found");
  const batchId = (cycle as any).current_batch_id as string;
  const { data: batch } = await admin
    .from("static_stress_batches")
    .select("status, total_jobs, completed_jobs, failed_jobs, error_log")
    .eq("id", batchId)
    .single();
  const status = (batch as any)?.status ?? "pending";
  if (status === "complete" || status === "failed" || status === "cancelled") {
    const totalJobs = Number((batch as any)?.total_jobs ?? 0);
    if (totalJobs === 0) {
      const reason = `Stress batch ${batchId.slice(0, 8)} finished with 0 jobs; rerun cannot validate prompt changes.`;
      await appendLog(admin, cycleId, reason);
      await admin.from("tool_improvement_cycles").update({
        status: "failed",
        phase: "awaiting_rerun",
        last_error: `${reason} Create or run a static-stress batch that generates jobs for this tool before starting an improvement cycle.`,
        completed_at: new Date().toISOString(),
      }).eq("id", cycleId);
      return;
    }
    await admin.from("tool_improvement_cycles").update({ phase: "reviewing" }).eq("id", cycleId);
    await appendLog(admin, cycleId, `Stress batch ${batchId.slice(0, 8)} → ${status}; re-reviewing`);
    await selfReinvoke(cycleId);
    return;
  }
  // Still running — poll again in 60s.
  await sleep(60_000); await selfReinvoke(cycleId);
}

async function dispatch(cycleId: string, phaseOverride?: string) {
  const admin = await adminClient();
  try {
    const { data: cycle } = await admin.from("tool_improvement_cycles").select("phase, status").eq("id", cycleId).single();
    if (!cycle) return;
    if ((cycle as any).status === "complete" || (cycle as any).status === "failed" || (cycle as any).status === "cancelled") return;
    const phase = phaseOverride ?? (cycle as any).phase;
    switch (phase) {
      case "init":            await phaseInit(admin, cycleId); break;
      case "reviewing":       await phaseReviewing(admin, cycleId); break;
      case "ranking":         await phaseRanking(admin, cycleId); break;
      case "deliberating":    await phaseDeliberating(admin, cycleId); break;
      case "rerunning":       await phaseRerunning(admin, cycleId); break;
      case "awaiting_rerun":  await phaseAwaitingRerun(admin, cycleId); break;
      default:                console.warn(`[improve-tool-quality] unknown phase: ${phase}`);
    }
  } catch (e) {
    console.error("[improve-tool-quality] dispatch error:", (e as Error).message);
    try {
      await admin.from("tool_improvement_cycles").update({
        status: "failed", last_error: (e as Error).message, completed_at: new Date().toISOString(),
      }).eq("id", cycleId);
    } catch { /* ignore */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  const isInternal = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;

  let userId: string | null = null;
  if (!isInternal) {
    const { data: claims, error } = await createClient(SUPABASE_URL, ANON_KEY).auth.getClaims(token);
    if (error || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    userId = claims.claims.sub;
    const admin = await adminClient();
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);
  }

  // Resume an in-progress cycle.
  if (body?.cycle_id) {
    // @ts-ignore
    EdgeRuntime.waitUntil(dispatch(body.cycle_id, body.phase));
    return json({ accepted: true, cycle_id: body.cycle_id }, 202);
  }

  // Start a new cycle.
  const toolSlug: string = String(body?.tool_slug ?? "").trim();
  if (!toolSlug) return json({ error: "tool_slug required" }, 400);

  const admin = await adminClient();
  const { data: cycle, error } = await admin.from("tool_improvement_cycles").insert({
    tool_slug: toolSlug,
    started_by: userId,
    status: "running",
    phase: "init",
    iteration: 0,
    max_iterations: Number(body?.max_iterations ?? 6),
    target_score: Number(body?.target_score ?? 98),
  }).select("id").single();
  if (error) return json({ error: error.message }, 500);

  const cycleId = (cycle as any).id;
  // @ts-ignore
  EdgeRuntime.waitUntil(dispatch(cycleId));
  return json({ accepted: true, cycle_id: cycleId }, 202);
});
