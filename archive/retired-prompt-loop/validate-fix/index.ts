// validate-fix — PHASE 2 / V2 of the Closed-Loop Quality System.
//
// Per-fix held-out A/B validation against DETERMINISTIC golden cases.
// Replaces the prior Claude-judged subjective compare. Loops the biometric
// holdout set, runs check-biometric-compliance twice per case (baseline + override),
// scores with evaluateGolden (pure code), and writes per-case rows into
// `golden_results`. A fix is "validated" iff sum(candidate) > sum(baseline)
// AND no per-case regression (candidate.passed < baseline.passed).
//
// Body: { tool: "biometric-checker", check_id: string, system_prompt_override: string, run_id?: string }
// Service-role / admin only. Forwards x-internal-resume so the generator honors the override.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { BIOMETRIC_GOLDEN } from "../_shared/golden/biometric.ts";
import { evaluateGolden } from "../_shared/golden/evaluate.ts";
import type { GoldenCase } from "../_shared/golden/types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function goldenFor(tool: string): GoldenCase[] {
  if (tool === "biometric-checker") return BIOMETRIC_GOLDEN.filter(c => c.set === "holdout");
  return [];
}

async function callGenerator(tool: string, intake: any, override: string | null): Promise<{ text: string; ok: boolean; error?: string }> {
  if (tool !== "biometric-checker") return { text: "", ok: false, error: "unsupported_tool" };
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/check-biometric-compliance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({
        ...intake,
        user_id: null,
        stress_run: true, // do not persist into biometric_assessments
        ...(override ? { system_prompt_override: override } : {}),
      }),
      signal: AbortSignal.timeout(240_000),
    });
    const txt = await r.text();
    if (!r.ok) return { text: "", ok: false, error: `HTTP ${r.status}: ${txt.slice(0, 200)}` };
    // Response is JSON: { assessment_text, ... }. Score the human-readable assessment_text.
    try {
      const parsed = JSON.parse(txt.replace(/^\s+/, ""));
      const text = String(parsed.assessment_text ?? parsed.report_data?.html ?? "");
      return { text, ok: text.length > 0 };
    } catch {
      return { text: txt, ok: true };
    }
  } catch (e) {
    return { text: "", ok: false, error: (e as Error).message };
  }
}

async function runValidation(
  rowId: string,
  body: { tool: string; check_id: string; system_prompt_override: string; run_id?: string | null },
) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const upd = (data: any) => admin.from("quality_validate_fix_runs").update(data).eq("id", rowId);

  try {
    const cases = goldenFor(body.tool);
    if (cases.length === 0) {
      throw new Error(`No golden holdout set for tool '${body.tool}'`);
    }

    await upd({ status: "running_assessments", intake_count: cases.length });

    let basePassedTotal = 0, candPassedTotal = 0, assertionsTotal = 0;
    const regressions: any[] = [];
    const perCase: any[] = [];

    for (const c of cases) {
      const [baseline, candidate] = await Promise.all([
        callGenerator(body.tool, c.intake, null),
        callGenerator(body.tool, c.intake, body.system_prompt_override),
      ]);

      if (!baseline.ok || !candidate.ok) {
        perCase.push({
          case_id: c.id, error: baseline.error ?? candidate.error ?? "unknown",
          baseline_ok: baseline.ok, candidate_ok: candidate.ok,
        });
        continue;
      }

      const baseEval = evaluateGolden(baseline.text, c);
      const candEval = evaluateGolden(candidate.text, c);

      basePassedTotal += baseEval.passed;
      candPassedTotal += candEval.passed;
      assertionsTotal += baseEval.total;

      // Persist both into golden_results so the trend dashboard can chart them.
      await admin.from("golden_results").insert([
        {
          run_id: body.run_id ?? null, tool: body.tool, case_id: c.id, scenario_set: "holdout_baseline",
          assertions_total: baseEval.total, assertions_passed: baseEval.passed,
          failed_labels: baseEval.failed,
        },
        {
          run_id: body.run_id ?? null, tool: body.tool, case_id: c.id, scenario_set: "holdout_candidate",
          assertions_total: candEval.total, assertions_passed: candEval.passed,
          failed_labels: candEval.failed,
        },
      ]).catch(() => {});

      if (candEval.passed < baseEval.passed) {
        regressions.push({
          case_id: c.id,
          baseline_passed: baseEval.passed,
          candidate_passed: candEval.passed,
          newly_failed: candEval.failed.filter(l => !baseEval.failed.includes(l)),
        });
      }
      perCase.push({
        case_id: c.id,
        baseline_passed: baseEval.passed,
        candidate_passed: candEval.passed,
        total: baseEval.total,
        baseline_failed: baseEval.failed,
        candidate_failed: candEval.failed,
      });
    }

    const delta = candPassedTotal - basePassedTotal;
    const validated = delta > 0 && regressions.length === 0;

    await upd({
      status: validated ? "validated" : "rejected",
      baseline_score: basePassedTotal,
      override_score: candPassedTotal,
      delta,
      per_intake: { assertions_total: assertionsTotal, per_case: perCase, regressions },
      completed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[validate-fix] failed:", e);
    await upd({
      status: "error",
      error: (e as Error).message?.slice(0, 500),
      completed_at: new Date().toISOString(),
    }).catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const tool = String(body?.tool ?? "");
  const checkId = String(body?.check_id ?? "");
  const override = String(body?.system_prompt_override ?? "");
  if (!tool || !checkId || !override) {
    return json({ error: "tool, check_id, and system_prompt_override required" }, 400);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
  if (!isAdmin) return json({ error: "Admin only" }, 403);

  const { data: row, error: insErr } = await admin.from("quality_validate_fix_runs").insert({
    tool, check_id: checkId,
    run_id: body?.run_id ?? null,
    requested_by: claims.claims.sub,
    status: "pending",
    system_prompt_override: override,
  }).select("id").single();
  if (insErr || !row) return json({ error: `insert: ${insErr?.message}` }, 500);

  // @ts-ignore
  EdgeRuntime.waitUntil(runValidation(row.id, {
    tool, check_id: checkId, system_prompt_override: override, run_id: body?.run_id,
  }));
  return json({ accepted: true, validate_run_id: row.id }, 202);
});
