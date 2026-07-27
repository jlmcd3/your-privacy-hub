// PERFECT-INTAKE-EXPERIMENT-RISK kick helper (2026-07-26).
// AMENDED CORRECTIONS-BUNDLE 2026-07-27 (ledger item 173): §16 measurement-
// validity assertion — resolve the run's tool via quality_runs.tool and abort
// with 409 if the LTP-managed generator does not report the fleet-expected
// mode. Fail-loud; NEVER kicks a mismatched generator.
import { corsHeaders as cors } from "npm:@supabase/supabase-js@2/cors";
import { assertLtpModeForTools } from "../_shared/ltp/mode-assert.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const BUILD_STAMP = "kick-perfect-intake-mode-assert@2026-07-27T06:10:00Z";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const runId = String(body?.run_id ?? "");
  if (!runId) return new Response(JSON.stringify({ error: "run_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  // Resolve the tool slug for this run to know which generator to ping.
  let tool: string | null = null;
  try {
    const q = await fetch(`${SUPABASE_URL}/rest/v1/quality_runs?id=eq.${runId}&select=tool`, {
      headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY },
    });
    const arr = await q.json().catch(() => []);
    tool = Array.isArray(arr) && arr[0]?.tool ? String(arr[0].tool) : null;
  } catch { /* fall through — tool null => no assertion */ }

  const modeCheck = tool ? await assertLtpModeForTools([tool]) : { ok: true, checks: [] as const };
  if (!modeCheck.ok) {
    return new Response(JSON.stringify({
      error: "ltp_mode_mismatch",
      law: "LEGAL-TEST-PIPELINE.md §16 measurement-validity",
      mode_check: modeCheck,
      build_stamp: BUILD_STAMP,
    }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const r = await fetch(`${SUPABASE_URL}/functions/v1/run-quality-batch`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Content-Type": "application/json",
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ resume_run_id: runId }),
  });
  const txt = await r.text();
  return new Response(JSON.stringify({
    status: r.status, upstream: txt.slice(0, 500),
    mode_check: modeCheck, build_stamp: BUILD_STAMP,
  }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
});
