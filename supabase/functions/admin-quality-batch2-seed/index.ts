// admin-quality-batch2-seed — quality-batch2 admin surface: seed a single
// fresh assessment row from an existing revision-contract fixture, under the
// calling admin's own user_id, then invoke the appropriate tool runner. This
// avoids driving the full quality-batch orchestrator for a one-doc probe.
//
// Scope note (deviation): only tools with static contract-fixture files are
// supported (cppa_risk_assessment, cppa_admt, cppa_cybersecurity,
// governance_assessment). dpia_framework and li_assessment do not have such
// static fixtures; seed returns `unsupported_tool` for them.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { CPPA_RISK_CONTRACT_FIXTURES } from "../_shared/cppa-risk-contract-fixtures.ts";
import { ADMT_CONTRACT_FIXTURES } from "../_shared/admt-contract-fixtures.ts";
import { CYBER_CONTRACT_FIXTURES } from "../_shared/cyber-contract-fixtures.ts";
import { GOVERNANCE_CONTRACT_FIXTURES } from "../_shared/governance-contract-fixtures.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Supabase Edge Runtime host-provided global (waitUntil for background work).
declare const EdgeRuntime: { waitUntil: (p: Promise<unknown>) => void };


function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ToolType = "cppa_risk_assessment" | "cppa_admt" | "cppa_cybersecurity" | "governance_assessment";

const FIXTURES: Record<ToolType, { fixture_id: string; intake: Record<string, unknown> }[]> = {
  cppa_risk_assessment: CPPA_RISK_CONTRACT_FIXTURES as any,
  cppa_admt: ADMT_CONTRACT_FIXTURES as any,
  cppa_cybersecurity: CYBER_CONTRACT_FIXTURES as any,
  governance_assessment: GOVERNANCE_CONTRACT_FIXTURES as any,
};

const TABLE_FOR: Record<ToolType, string> = {
  cppa_risk_assessment: "cppa_assessments",
  cppa_admt: "cppa_assessments",
  cppa_cybersecurity: "cppa_assessments",
  governance_assessment: "governance_assessments",
};

const MODULE_FOR: Partial<Record<ToolType, string>> = {
  cppa_risk_assessment: "risk_assessment",
  cppa_admt: "admt",
  cppa_cybersecurity: "cybersecurity",
};

const RUNNER_FOR: Record<ToolType, { name: string; body: (id: string) => Record<string, unknown> }> = {
  cppa_risk_assessment: { name: "run-cppa-risk-assessment-v2", body: (id) => ({ assessment_id: id }) },
  cppa_admt: { name: "run-admt-checker", body: (id) => ({ assessment_id: id }) },
  cppa_cybersecurity: { name: "run-cppa-cybersecurity", body: (id) => ({ assessment_id: id }) },
  governance_assessment: { name: "run-governance-assessment", body: (id) => ({ assessment_id: id }) },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await verifyCaller(req, "admin");
  if (!auth.ok) return json({ error: auth.error }, auth.status ?? 401);
  const admin_user_id = auth.userId;
  if (!admin_user_id) return json({ error: "admin_user_required" }, 400);

  let body: { tool_type?: string; fixture_id?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const tool_type = String(body.tool_type ?? "") as ToolType;
  if (!(tool_type in FIXTURES)) return json({ error: "unsupported_tool", tool_type }, 400);

  const set = FIXTURES[tool_type];
  const fix = body.fixture_id
    ? set.find((f) => f.fixture_id === body.fixture_id)
    : set[0];
  if (!fix) return json({ error: "fixture_not_found" }, 404);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  const table = TABLE_FOR[tool_type];
  const row: Record<string, unknown> = {
    user_id: admin_user_id,
    status: "processing",
    intake_data: fix.intake,
  };
  const mod = MODULE_FOR[tool_type];
  if (mod) row.module = mod;

  const { data: inserted, error: iErr } = await supa.from(table).insert(row).select("id").single();
  if (iErr) return json({ error: "insert_failed", detail: iErr.message }, 500);
  const new_id = (inserted as any).id as string;

  const runner = RUNNER_FOR[tool_type];
  // Fire-and-forget: the runner can take 2+ minutes (Anthropic generation +
  // retries). Awaiting its response blocks the seed's HTTP reply past the
  // browser/gateway timeout and surfaces as "Edge Function returned a non-2xx
  // status code" client-side. Dispatch via EdgeRuntime.waitUntil so the
  // outbound request survives after we return 202 to the admin UI, which
  // then polls list mode.
  const dispatch = fetch(`${SUPABASE_URL}/functions/v1/${runner.name}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_ROLE}`,
      "apikey": SERVICE_ROLE,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(runner.body(new_id)),
  })
    .then(async (r) => {
      const text = (await r.text()).slice(0, 400);
      console.log(JSON.stringify({
        evt: "seed_runner_dispatched",
        tool_type, assessment_id: new_id, runner: runner.name,
        status: r.status, body: text,
      }));
    })
    .catch((e) => {
      console.error(JSON.stringify({
        evt: "seed_runner_dispatch_failed",
        tool_type, assessment_id: new_id, runner: runner.name,
        error: e instanceof Error ? e.message : String(e),
      }));
    });

  try { EdgeRuntime.waitUntil(dispatch); } catch { /* runtime missing waitUntil — fetch already in-flight */ }

  return new Response(JSON.stringify({
    ok: true,
    tool_type,
    assessment_id: new_id,
    fixture_id: fix.fixture_id,
    runner: runner.name,
    dispatched: true,
  }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

