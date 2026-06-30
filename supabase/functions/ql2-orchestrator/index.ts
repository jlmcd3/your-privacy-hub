// ql2-orchestrator — slow, transparent quality loop (one product per invocation)
//
// State machine: kickoff → awaiting_dummy → review (loop) → done
// Self-chains via EdgeRuntime.waitUntil + fetch back to itself with x-internal-resume:1.
// Anti-hang law: return 202 immediately, do one bounded unit, persist progress.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// product = start-stress-batch.selected_tools id
// sampleSlug = sample_reports.tool_slug (run-stress-job.TOOL_SLUG_MAP[product])
// applyKey = apply-quality-fix.TOOL_FILE_PATH key
const REGISTRY: Record<string, { sampleSlug: string; applyKey: string; label: string }> = {
  "governance":   { sampleSlug: "governance",    applyKey: "governance",           label: "Governance" },
  "dpa":          { sampleSlug: "dpa",           applyKey: "dpa-generator",        label: "DPA" },
  "ir-playbook":  { sampleSlug: "ir_playbook",   applyKey: "ir-playbook",          label: "IR Playbook" },
  "biometric":    { sampleSlug: "biometric",     applyKey: "biometric-checker",    label: "Biometric" },
  "registration": { sampleSlug: "registration",  applyKey: "registration",         label: "Registration" },
  "lia":          { sampleSlug: "li_assessment", applyKey: "lia",                  label: "LIA" },
  "dpia":         { sampleSlug: "dpia",          applyKey: "dpia",                 label: "DPIA" },
  "cppa-risk":    { sampleSlug: "cppa_risk",     applyKey: "cppa-risk",            label: "CPPA Risk" },
  "cppa-cyber":   { sampleSlug: "cppa_cyber",    applyKey: "cppa-cyber",           label: "CPPA Cyber" },
  "cppa-admt":    { sampleSlug: "cppa_admt",     applyKey: "cppa-admt",            label: "CPPA ADMT" },
  "ropa":         { sampleSlug: "ropa",          applyKey: "ropa",                 label: "RoPA" },
  "eu-notice":    { sampleSlug: "eu_notice",     applyKey: "global-privacy-notice",label: "EU Notice" },
  "us-notice":    { sampleSlug: "us_notice",     applyKey: "privacy-notice-us",    label: "US Notice" },
};
const DEFAULT_PRODUCTS = Object.keys(REGISTRY);

async function log(runId: string, message: string, opts: { level?: string; product?: string } = {}) {
  await admin().from("quality_loop2_log").insert({
    run_id: runId, message, level: opts.level ?? "info", product: opts.product ?? null,
  });
}

async function heartbeat(runId: string) {
  await admin().from("quality_loop2_runs").update({ last_heartbeat_at: new Date().toISOString() }).eq("id", runId);
}

function selfInvoke(runId: string) {
  // Fire-and-forget; caller wraps in EdgeRuntime.waitUntil.
  return fetch(`${SUPABASE_URL}/functions/v1/ql2-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ run_id: runId }),
  }).catch((e) => console.error("[ql2] self-invoke failed", e));
}

async function callReviewer(model: "gpt-4o" | "claude-sonnet-4-5-20250929", body: any): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 180_000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/review-test-output`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ ...body, model }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.warn(`[ql2] reviewer ${model} HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[ql2] reviewer ${model} threw`, (e as Error).message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

function meanScore(review: any): number | null {
  const scores = review?.review?.scores ?? review?.scores;
  if (!scores || typeof scores !== "object") return null;
  const vals = Object.values(scores).filter((v) => typeof v === "number") as number[];
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function extractChanges(review: any): Array<{ description?: string; location?: string; severity?: string }> {
  const c = review?.review?.changes ?? review?.changes;
  if (!Array.isArray(c)) return [];
  return c.map((ch: any) => {
    if (!ch || typeof ch !== "object") return {};
    // Reviewer schema is {location, problem, fix, severity}. Normalize to description.
    const problem = (ch.problem ?? "").toString().trim();
    const fix = (ch.fix ?? "").toString().trim();
    const desc = (ch.description ?? "").toString().trim()
      || [problem, fix].filter(Boolean).join(" → ")
      || problem
      || fix;
    return { description: desc, location: ch.location, severity: ch.severity };
  });
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function hasUsableReportData(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0 && value.trim() !== "null";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

function reportToText(report: any): string | null {
  if (hasText(report?.document_text)) return report.document_text.trim();
  if (hasUsableReportData(report?.report_data)) return JSON.stringify(report.report_data);
  return null;
}

async function runUnit(runId: string) {
  const db = admin();
  const { data: run } = await db.from("quality_loop2_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) return;
  if (run.status !== "running") { console.log("[ql2] not running, stop", run.status); return; }
  if (run.cancel_requested) {
    await db.from("quality_loop2_runs").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", runId);
    await log(runId, "Run cancelled by user");
    return;
  }
  await heartbeat(runId);

  const products: string[] = Array.isArray(run.products) ? run.products : [];

  if (run.phase === "kickoff") {
    // Should have been handled by start; just advance.
    await db.from("quality_loop2_runs").update({ phase: "awaiting_dummy" }).eq("id", runId);
    // @ts-ignore
    EdgeRuntime.waitUntil(selfInvoke(runId));
    return;
  }

  if (run.phase === "awaiting_dummy") {
    if (!run.stress_batch_id) {
      await db.from("quality_loop2_runs").update({ status: "failed", last_error: "missing stress_batch_id", completed_at: new Date().toISOString() }).eq("id", runId);
      await log(runId, "No stress_batch_id — failing", { level: "error" });
      return;
    }

    // Tool-by-tool progress: emit one log line per (tool, status) transition.
    const { data: jobs } = await db.from("static_stress_jobs")
      .select("tool_slug, status, error_message")
      .eq("batch_id", run.stress_batch_id);
    const jobList = jobs ?? [];
    if (jobList.length) {
      const { data: priorLogs } = await db.from("quality_loop2_log")
        .select("message").eq("run_id", runId).like("message", "dummy:%");
      const seen = new Set((priorLogs ?? []).map((r: any) => r.message as string));
      const counts: Record<string, number> = {};
      for (const j of jobList) {
        const slug = (j as any).tool_slug as string;
        const st = (j as any).status as string;
        counts[st] = (counts[st] ?? 0) + 1;
        const marker = `dummy:${slug}:${st}`;
        if (!seen.has(marker)) {
          const reg = Object.entries(REGISTRY).find(([, v]) => v.sampleSlug === slug || v.applyKey === slug);
          const label = reg?.[1].label ?? slug;
          const isErr = st === "failed" || st === "error";
          await log(runId,
            `${marker} — Dummy data for ${label}: ${st}${(j as any).error_message ? ` (${(j as any).error_message})` : ""}`,
            { level: isErr ? "warn" : "info", product: reg?.[0] ?? null });
        }
      }
      const summary = `dummy:summary:${Object.entries(counts).sort().map(([k, v]) => `${k}=${v}`).join(",")}`;
      if (!seen.has(summary)) {
        await log(runId, `${summary} — Dummy batch progress: ${jobList.length} job(s)`);
      }
    }

    const { data: batch } = await db.from("static_stress_batches").select("status").eq("id", run.stress_batch_id).maybeSingle();
    const st = batch?.status;
    if (st && ["complete", "failed", "cancelled"].includes(st)) {
      await db.from("quality_loop2_runs").update({ phase: "review" }).eq("id", runId);
      await log(runId, `Dummy batch ${st} — entering review`);
      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }
    const startedMs = run.started_at ? new Date(run.started_at).getTime() : Date.now();
    if (Date.now() - startedMs > 90 * 60_000) {
      await db.from("quality_loop2_runs").update({ status: "failed", last_error: "dummy batch did not complete in 90 min", completed_at: new Date().toISOString() }).eq("id", runId);
      await log(runId, "Dummy batch did not complete in 90 min — failing", { level: "error" });
      return;
    }
    // @ts-ignore
    EdgeRuntime.waitUntil((async () => {
      await new Promise((r) => setTimeout(r, 20_000));
      await selfInvoke(runId);
    })());
    return;
  }

  if (run.phase === "review") {
    // Pick next product without a results row.
    const { data: done } = await db.from("quality_loop2_results").select("product").eq("run_id", runId);
    const doneSet = new Set((done ?? []).map((r: any) => r.product));
    const next = products.find((p) => !doneSet.has(p));
    if (!next) {
      await db.from("quality_loop2_runs").update({ phase: "done", status: "complete", completed_at: new Date().toISOString() }).eq("id", runId);
      await log(runId, `Run complete — ${products.length} products reviewed`);
      return;
    }
    const idx = (doneSet.size) + 1;
    const reg = REGISTRY[next];
    if (!reg) {
      await db.from("quality_loop2_results").insert({
        run_id: runId, product: next, recommendation: "(unknown product — not in registry)", updatable: false,
      });
      await log(runId, `Unknown product ${next} — skipped`, { level: "warn", product: next });
      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }

    await log(runId, `Reviewing ${reg.label} (${idx}/${products.length})`, { product: next });
    await heartbeat(runId);

    // Load newest USABLE report by sample slug (skip null/empty-string document_text rows).
    const { data: reportRows } = await db.from("sample_reports")
      .select("id, document_text, report_data, status, created_at")
      .eq("tool_slug", reg.sampleSlug)
      .order("created_at", { ascending: false })
      .limit(25);
    const report = (reportRows ?? []).find((row: any) => reportToText(row)) ?? null;

    const text = reportToText(report);
    if (!text) {
      await db.from("quality_loop2_results").insert({
        run_id: runId, product: next,
        recommendation: "(no sample report)",
        updatable: false,
      });
      await log(runId, `${reg.label}: no sample report found for slug ${reg.sampleSlug}`, { level: "warn", product: next });
      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }

    const reviewerBody = {
      testId: `${runId}:${next}`,
      testLabel: next,
      output: text,
      mode: "improvement",
      target_tool: next,
    };
    const [openaiRes, claudeRes] = await Promise.all([
      callReviewer("gpt-4o", reviewerBody),
      callReviewer("claude-sonnet-4-5-20250929", reviewerBody),
    ]);

    const openaiScore = openaiRes ? meanScore(openaiRes) : null;
    const claudeScore = claudeRes ? meanScore(claudeRes) : null;
    const present = [openaiScore, claudeScore].filter((v): v is number => typeof v === "number");
    const avgScore = present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;

    if (!openaiRes) await log(runId, `${reg.label}: OpenAI review failed`, { level: "warn", product: next });
    if (!claudeRes) await log(runId, `${reg.label}: Claude review failed`, { level: "warn", product: next });

    // Union changes from both models, dedupe.
    const changes = [...extractChanges(openaiRes), ...extractChanges(claudeRes)];
    const seen = new Set<string>();
    const lines: string[] = [];
    let fixLocation = "system prompt";
    for (const ch of changes) {
      const d = (ch.description ?? "").trim();
      if (!d || seen.has(d)) continue;
      seen.add(d);
      lines.push(`- ${d}`);
      if (lines.length === 1 && ch.location) fixLocation = ch.location;
    }
    const recommendation = lines.length ? lines.join("\n") : "(no recommended changes)";

    // Persist per-product quality_runs + quality_check_results FIRST (audit B).
    const applyKey = reg.applyKey;
    const { data: qrun, error: qrunErr } = await db.from("quality_runs").insert({
      tool: applyKey,
      status: "complete",
      run_number: 1,
      mode: "manual",
    }).select("id").maybeSingle();
    if (qrunErr || !qrun) {
      await log(runId, `${reg.label}: failed to create quality_runs row: ${qrunErr?.message}`, { level: "error", product: next });
      await db.from("quality_loop2_results").insert({
        run_id: runId, product: next, claude_score: claudeScore, openai_score: openaiScore, avg_score: avgScore,
        recommendation, fix_location: fixLocation, updatable: false,
      });
      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }
    const checkId = `ql2:${next}`;
    const { data: chk, error: chkErr } = await db.from("quality_check_results").insert({
      run_id: qrun.id,
      tool: applyKey,
      run_number: 1,
      check_id: checkId,
      check_type: "ql2",
      dimension: "overall",
      severity: "medium",
      fail_count: 1,
      fail_rate: 1,
      proposed_fix: recommendation,
      fix_location: fixLocation,
    }).select("id").maybeSingle();
    if (chkErr || !chk) {
      await log(runId, `${reg.label}: failed to create quality_check_results row: ${chkErr?.message}`, { level: "error", product: next });
      await db.from("quality_loop2_results").insert({
        run_id: runId, product: next, claude_score: claudeScore, openai_score: openaiScore, avg_score: avgScore,
        recommendation, fix_location: fixLocation, quality_run_id: qrun.id, updatable: false,
      });
      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }

    // Step 8: write results row LAST.
    await db.from("quality_loop2_results").upsert({
      run_id: runId,
      product: next,
      claude_score: claudeScore,
      openai_score: openaiScore,
      avg_score: avgScore,
      recommendation,
      fix_location: fixLocation,
      check_result_id: chk.id,
      quality_run_id: qrun.id,
      updatable: true,
    }, { onConflict: "run_id,product" });
    await log(runId, `${reg.label} scored: claude=${claudeScore?.toFixed?.(1) ?? "—"} openai=${openaiScore?.toFixed?.(1) ?? "—"} avg=${avgScore?.toFixed?.(1) ?? "—"}`, { product: next });

    // @ts-ignore
    EdgeRuntime.waitUntil(selfInvoke(runId));
    return;
  }

  // phase done/unknown — nothing to do.
}

async function startRun(runBy: string | null, requestedProducts: string[] | undefined) {
  const db = admin();
  const products = (requestedProducts?.length ? requestedProducts : DEFAULT_PRODUCTS).filter((p) => REGISTRY[p]);
  const { data: run, error } = await db.from("quality_loop2_runs").insert({
    status: "running",
    phase: "kickoff",
    products,
    run_by: runBy,
  }).select("id").single();
  if (error || !run) throw new Error(`failed to create run: ${error?.message}`);
  await log(run.id, `Run started — ${products.length} product(s)`);

  // Invoke start-stress-batch.
  const ssbBody = {
    run_by: runBy,
    industries: [{ id: "technology", label: "Technology" }],
    geo_filter: "both",
    selected_tools: products,
  };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/start-stress-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "x-internal-resume": "1",
    },
    body: JSON.stringify(ssbBody),
  });
  const ssbText = await res.text();
  let ssbJson: any = null;
  try { ssbJson = JSON.parse(ssbText); } catch { /* */ }
  if (!res.ok || !ssbJson?.batch_id) {
    await db.from("quality_loop2_runs").update({
      status: "failed",
      last_error: `start-stress-batch failed: ${res.status} ${ssbText.slice(0, 300)}`,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    await log(run.id, `start-stress-batch failed (${res.status})`, { level: "error" });
    return run.id;
  }
  await db.from("quality_loop2_runs").update({
    stress_batch_id: ssbJson.batch_id,
    phase: "awaiting_dummy",
  }).eq("id", run.id);
  await log(run.id, `Dummy batch started: ${ssbJson.batch_id}`);
  // @ts-ignore
  EdgeRuntime.waitUntil(selfInvoke(run.id));
  return run.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  const isInternal = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;

  // Internal resume (self-chain or watchdog)
  if (isInternal && body?.run_id) {
    // @ts-ignore
    EdgeRuntime.waitUntil(runUnit(body.run_id).catch(async (e) => {
      console.error("[ql2] unit error", e);
      try {
        await admin().from("quality_loop2_log").insert({
          run_id: body.run_id, level: "error", message: `Unit error: ${(e as Error).message}`,
        });
      } catch {}
    }));
    return json({ ok: true }, 202);
  }

  // External (admin) call — start or cancel.
  if (!token) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;
  const { data: isAdmin } = await admin().rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) return json({ error: "Admin only" }, 403);

  if (body?.action === "cancel" && body?.run_id) {
    await admin().from("quality_loop2_runs").update({ cancel_requested: true }).eq("id", body.run_id);
    await log(body.run_id, "Cancel requested");
    return json({ ok: true }, 202);
  }

  if (body?.action === "start") {
    try {
      const runId = await startRun(userId, body?.products);
      return json({ run_id: runId }, 202);
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }

  // Status query
  if (body?.run_id) {
    const { data } = await admin().from("quality_loop2_runs").select("*").eq("id", body.run_id).maybeSingle();
    return json({ run: data });
  }

  return json({ error: "Unknown action" }, 400);
});
