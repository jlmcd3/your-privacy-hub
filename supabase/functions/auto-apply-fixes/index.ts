// auto-apply-fixes — B5 of Workstream B (Phase 2 Quality Loop Augmentation).
//
// Input: { run_id }. For every quality_fix_deliberations row in the run whose
// verdict = "auto_eligible" and auto_applied = false, commits the patch to the
// per-tool target branch (default `quality-auto`) via the shared github-apply
// helper. Service-role only — never calls the admin-gated apply-quality-fix.
//
// Per-tool guardrails (quality_autoapply_tool_state):
//   - enabled            : tool-level kill switch (Halt from the UI sets false)
//   - runs_used vs cap   : 15 loop runs per tool by default
//   - target_branch      : default "quality-auto" — auto-apply NEVER targets main
//   - last_score_overall : circuit breaker; if score regresses after an apply,
//                          set enabled=false and log
//
// One invocation = one "loop run" for each tool that has eligible rows. runs_used
// increments by 1 per tool per run, regardless of how many patches were applied.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applyPatchToBranch, ensureBranch } from "../_shared/github-apply.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Mirror of apply-quality-fix.TOOL_FILE_PATH — keep these maps in sync.
const TOOL_FILE_PATH: Record<string, string> = {
  "cppa-admt":            "supabase/functions/run-admt-checker/index.ts",
  "cppa-risk":            "supabase/functions/run-cppa-risk-assessment/index.ts",
  "cppa-cyber":           "supabase/functions/run-cppa-cybersecurity/index.ts",
  "lia":                  "supabase/functions/run-li-assessment/index.ts",
  "dpia":                 "supabase/functions/run-dpia-framework/index.ts",
  "governance":           "supabase/functions/run-governance-assessment/index.ts",
  "biometric-checker":    "supabase/functions/check-biometric-compliance/index.ts",
  "dpa-generator":        "supabase/functions/generate-dpa/index.ts",
  "ir-playbook":          "supabase/functions/generate-ir-playbook/index.ts",
  "rofa":                 "supabase/functions/run-rofa/index.ts",
  "privacy-notice-us":    "supabase/functions/generate-us-notice/index.ts",
  "global-privacy-notice":"supabase/functions/generate-eu-notice/index.ts",
  "ropa":                 "supabase/functions/generate-ropa-document/index.ts",
  "registration":         "supabase/functions/generate-registration-docs/index.ts",
  "ask-privacy":          "supabase/functions/ask-privacy/index.ts",
  "weekly-brief":         "supabase/functions/generate-weekly-brief/index.ts",
  "custom-brief":         "supabase/functions/generate-custom-brief/index.ts",
  "trend-report":         "supabase/functions/generate-trend-report/index.ts",
  "state-law":            "supabase/functions/check-state-privacy-laws/index.ts",
};

type Summary = {
  tool: string;
  applied: number;
  skipped: number;
  errors: number;
  enabled_after: boolean;
  runs_used_after: number;
  branch: string;
};

async function autoApplyRun(runId: string): Promise<Summary[]> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const summaries: Summary[] = [];

  const { data: run } = await admin.from("quality_runs")
    .select("id, tool, score_overall").eq("id", runId).maybeSingle();
  if (!run) { console.warn("[auto-apply] run not found", runId); return summaries; }

  const { data: eligible } = await admin
    .from("quality_fix_deliberations")
    .select("*")
    .eq("run_id", runId)
    .eq("verdict", "auto_eligible")
    .eq("auto_applied", false);

  if (!eligible?.length) {
    console.log("[auto-apply] nothing eligible for run", runId);
    return summaries;
  }

  // Group by tool.
  const byTool = new Map<string, any[]>();
  for (const d of eligible) {
    if (!byTool.has(d.tool)) byTool.set(d.tool, []);
    byTool.get(d.tool)!.push(d);
  }

  for (const [tool, rows] of byTool) {
    // Per-tool state — insert defaults if missing.
    let { data: state } = await admin
      .from("quality_autoapply_tool_state")
      .select("*").eq("tool", tool).maybeSingle();
    if (!state) {
      const ins = await admin.from("quality_autoapply_tool_state")
        .insert({ tool }).select("*").single();
      state = ins.data;
    }

    const branch: string = state?.target_branch ?? "quality-auto";
    const cap: number = state?.cap ?? 15;
    const runsUsed: number = state?.runs_used ?? 0;
    const enabled: boolean = state?.enabled ?? true;

    if (!enabled) {
      console.log(`[auto-apply] tool=${tool} disabled — skipping`);
      summaries.push({ tool, applied: 0, skipped: rows.length, errors: 0, enabled_after: false, runs_used_after: runsUsed, branch });
      continue;
    }
    if (runsUsed >= cap) {
      await admin.from("quality_autoapply_tool_state")
        .update({ enabled: false, updated_at: new Date().toISOString() }).eq("tool", tool);
      console.log(`[auto-apply] tool=${tool} at cap (${runsUsed}/${cap}) — disabling`);
      summaries.push({ tool, applied: 0, skipped: rows.length, errors: 0, enabled_after: false, runs_used_after: runsUsed, branch });
      continue;
    }

    const filePath = TOOL_FILE_PATH[tool];
    if (!filePath) {
      console.warn(`[auto-apply] no file path for tool=${tool}`);
      summaries.push({ tool, applied: 0, skipped: 0, errors: rows.length, enabled_after: enabled, runs_used_after: runsUsed, branch });
      continue;
    }

    try { await ensureBranch(branch); } catch (e) {
      console.warn(`[auto-apply] ensureBranch(${branch}) failed: ${(e as Error).message}`);
      summaries.push({ tool, applied: 0, skipped: 0, errors: rows.length, enabled_after: enabled, runs_used_after: runsUsed, branch });
      continue;
    }

    let applied = 0, skipped = 0, errors = 0;
    for (const row of rows) {
      const fix = row.recommended_change ?? "";
      if (!fix) { skipped++; continue; }

      const result = await applyPatchToBranch({
        filePath,
        proposedFix: fix,
        fixLocation: row.change_location ?? "",
        checkId: row.check_id,
        branch,
        commitMessage:
          `fix(quality-loop/auto): ${row.check_id} [tool=${tool}]\n\n` +
          `Auto-applied via auto-apply-fixes — verdict=auto_eligible (Claude + GPT cross-review agreed; all four teams approved).`,
      });

      if ("commit_sha" in result) {
        applied++;
        await admin.from("quality_fix_deliberations").update({
          auto_applied: true, status: "auto_applied", reviewed_at: new Date().toISOString(),
        }).eq("id", row.id);
        await admin.from("quality_applied_patches").insert({
          run_id: runId,
          tool,
          edge_function: filePath.split("/")[2] ?? tool,
          file_path: filePath,
          check_id: row.check_id,
          patch_description: `Auto-applied via ${branch} (deliberation ${row.id})`,
          old_text: "(see commit diff)",
          new_text: fix,
          commit_sha: result.commit_sha,
          commit_url: result.commit_url,
        });
      } else if ("skipped" in result) {
        skipped++;
        console.warn(`[auto-apply] ${row.check_id} skipped: ${result.reason}`);
      } else {
        errors++;
        console.warn(`[auto-apply] ${row.check_id} error: ${result.error}`);
      }
    }

    // Circuit breaker: if the current score regressed vs the last-recorded score,
    // disable auto-apply for this tool.
    const last = state?.last_score_overall;
    const current = run.score_overall ?? null;
    const regressed = last != null && current != null && current < last;
    const newRunsUsed = runsUsed + 1;
    const reachedCap = newRunsUsed >= cap;
    const enabledNext = !regressed && !reachedCap;

    if (regressed) console.warn(`[auto-apply] circuit breaker tripped for tool=${tool}: ${current} < ${last}`);

    await admin.from("quality_autoapply_tool_state").update({
      runs_used: newRunsUsed,
      enabled: enabledNext,
      last_score_overall: current,
      updated_at: new Date().toISOString(),
    }).eq("tool", tool);

    summaries.push({
      tool, applied, skipped, errors,
      enabled_after: enabledNext, runs_used_after: newRunsUsed, branch,
    });
  }

  console.log("[auto-apply] complete", JSON.stringify(summaries));
  return summaries;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const runId: string = body?.run_id;
  if (!runId) return json({ error: "run_id required" }, 400);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  const isInternal = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;

  if (!isInternal) {
    const { data: claims, error: claimsErr } = await createClient(SUPABASE_URL, ANON_KEY).auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized", detail: claimsErr?.message ?? "no claims" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);
  }

  // @ts-ignore
  EdgeRuntime.waitUntil(autoApplyRun(runId));
  return json({ accepted: true, run_id: runId }, 202);
});
