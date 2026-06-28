// validate-fix — OPTIONAL PILOT of FIX_quality_loop_actually_improving.
//
// Biometric-only per-fix held-out A/B validation. Generates a small set of
// held-out biometric intakes, runs check-biometric-compliance TWICE per intake
// (baseline = current production prompt; override = candidate fix applied),
// asks Claude to compare the two outputs, and records a delta. A fix is
// "validated" only if override - baseline > 0 with no per-intake regression.
//
// Body: { tool: "biometric-checker", check_id: string, system_prompt_override: string,
//         intake_count?: number, run_id?: string }
//
// Service-role / admin only. The override is forwarded with x-internal-resume so
// check-biometric-compliance treats the caller as internal and honors the override.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const DEFAULT_INTAKE_COUNT = 5;

function tryParse(t: string): any | null {
  const c = (t ?? "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(c); } catch { /* */ }
  const m = c.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function claude(system: string, user: string, maxTokens = 4000): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.content?.[0]?.text ?? "";
}

const BIOMETRIC_INTAKE_SCHEMA = `Required camelCase fields:
- orgName (string)
- orgType (sector string, e.g. "Retail","Healthcare","Workforce")
- biometricTypes (array — e.g. ["facial geometry"], ["fingerprint","hand geometry"], ["iris scan"])
- purpose (string — e.g. "Loss prevention","Workforce time and attendance","Physical access control")
- jurisdictions (array of US-state codes / regions — e.g. ["US-IL"], ["US-TX"], ["US-WA"], ["EU","US-CA"])
- enrolledCount (string range — "Fewer than 500","500-5,000","5,000-50,000","50,000-500,000","More than 500,000")`;

async function generateHoldoutIntakes(n: number): Promise<any[]> {
  const raw = await claude(
    "You generate realistic biometric-compliance test intakes. Return ONLY a JSON array, no markdown. Vary jurisdictions, sectors, and compliance posture. These are HELD-OUT scenarios used to validate prompt fixes — vary them away from typical examples.",
    `Generate ${n} varied biometric-checker intakes.\n\n${BIOMETRIC_INTAKE_SCHEMA}\n\nReturn a JSON array of exactly ${n} objects.`,
    8000,
  );
  const parsed = tryParse(raw.startsWith("[") ? raw : (raw.match(/\[[\s\S]*\]/)?.[0] ?? "[]"));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`Holdout intake generator returned no usable data (len=${raw?.length ?? 0})`);
  }
  return parsed.slice(0, n);
}

async function callBiometric(intake: any, override: string | null): Promise<{ output: any; ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/check-biometric-compliance`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        "x-internal-resume": "1", // verifyCaller treats this as internal — required to honor system_prompt_override.
      },
      body: JSON.stringify({
        ...intake,
        user_id: null,
        stress_run: false,
        ...(override ? { system_prompt_override: override } : {}),
      }),
      signal: AbortSignal.timeout(240_000),
    });
    const txt = await r.text();
    // Strip keep-alive whitespace then parse the trailing JSON.
    const trimmed = txt.replace(/^\s+/, "");
    try { return { output: JSON.parse(trimmed), ok: r.ok }; }
    catch { return { output: { raw: trimmed.slice(0, 2000) }, ok: false, error: "parse_failed" }; }
  } catch (e) {
    return { output: null, ok: false, error: (e as Error).message };
  }
}

const COMPARE_SYSTEM = `You are evaluating whether a candidate prompt fix improves a biometric compliance assessment WITHOUT introducing regressions. You will see one intake plus two assessments: A=BASELINE (current production prompt) and B=OVERRIDE (candidate fix applied).

Score each on a 0-100 quality scale considering accuracy, citation correctness, hallucination, analytical depth, and formatting. Then decide whether B is strictly better, equivalent, or worse.

Return ONLY JSON:
{ "baseline_score": 0-100, "override_score": 0-100, "verdict": "better"|"equivalent"|"worse", "rationale": "1-2 sentences naming the concrete difference" }`;

async function compareOutputs(intake: any, baseline: any, override: any): Promise<{ baseline_score: number; override_score: number; verdict: string; rationale: string }> {
  const user = [
    `INTAKE:\n${JSON.stringify(intake).slice(0, 2000)}`,
    `\n\nA — BASELINE OUTPUT:\n${JSON.stringify(baseline).slice(0, 8000)}`,
    `\n\nB — OVERRIDE OUTPUT:\n${JSON.stringify(override).slice(0, 8000)}`,
  ].join("");
  const raw = await claude(COMPARE_SYSTEM, user, 1500);
  const parsed = tryParse(raw);
  if (!parsed || typeof parsed.baseline_score !== "number" || typeof parsed.override_score !== "number") {
    return { baseline_score: 0, override_score: 0, verdict: "equivalent", rationale: "compare_parse_failed" };
  }
  return parsed;
}

async function runValidation(rowId: string, body: { tool: string; check_id: string; system_prompt_override: string; intake_count?: number; run_id?: string | null }) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const upd = (data: any) => admin.from("quality_validate_fix_runs").update(data).eq("id", rowId);

  try {
    if (body.tool !== "biometric-checker") {
      throw new Error(`Pilot is scoped to biometric-checker only (got: ${body.tool})`);
    }
    const n = Math.max(2, Math.min(10, body.intake_count ?? DEFAULT_INTAKE_COUNT));
    await upd({ status: "generating_intakes", intake_count: n });
    const intakes = await generateHoldoutIntakes(n);

    await upd({ status: "running_assessments" });
    const perIntake: any[] = [];
    let baselineTotal = 0, overrideTotal = 0, validatedAll = true;
    for (let i = 0; i < intakes.length; i++) {
      const intake = intakes[i];
      const [baseline, override] = await Promise.all([
        callBiometric(intake, null),
        callBiometric(intake, body.system_prompt_override),
      ]);
      if (!baseline.ok || !override.ok) {
        perIntake.push({ idx: i, error: baseline.error ?? override.error ?? "unknown", baseline_ok: baseline.ok, override_ok: override.ok });
        validatedAll = false;
        continue;
      }
      const cmp = await compareOutputs(intake, baseline.output, override.output).catch(e => ({
        baseline_score: 0, override_score: 0, verdict: "equivalent" as const, rationale: `compare_failed: ${(e as Error).message}`,
      }));
      baselineTotal += cmp.baseline_score;
      overrideTotal += cmp.override_score;
      if (cmp.verdict === "worse" || cmp.override_score < cmp.baseline_score) validatedAll = false;
      perIntake.push({ idx: i, intake_summary: { orgType: intake.orgType, jurisdictions: intake.jurisdictions }, ...cmp });
    }

    const done = perIntake.filter(p => typeof p.baseline_score === "number").length;
    const baselineAvg = done > 0 ? baselineTotal / done : 0;
    const overrideAvg = done > 0 ? overrideTotal / done : 0;
    const delta = overrideAvg - baselineAvg;
    await upd({
      status: validatedAll && delta > 0 ? "validated" : "rejected",
      baseline_score: Math.round(baselineAvg * 100) / 100,
      override_score: Math.round(overrideAvg * 100) / 100,
      delta: Math.round(delta * 100) / 100,
      per_intake: perIntake,
      completed_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[validate-fix] failed:", e);
    await upd({ status: "error", error: (e as Error).message?.slice(0, 500), completed_at: new Date().toISOString() }).catch(() => {});
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
  EdgeRuntime.waitUntil(runValidation(row.id, { tool, check_id: checkId, system_prompt_override: override, intake_count: body?.intake_count, run_id: body?.run_id }));
  return json({ accepted: true, validate_run_id: row.id }, 202);
});
