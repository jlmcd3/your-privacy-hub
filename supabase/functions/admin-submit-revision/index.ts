// admin-submit-revision — quality-batch2 admin surface: submits answered
// open_items through regenerate-assessment's internal-verification branch,
// bypassing REVISIONS_ENABLED and customer ownership gates while leaving the
// customer path untouched. Admin-role-gated.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TABLE_MAP: Record<string, string> = {
  li_assessment: "li_assessments",
  governance_assessment: "governance_assessments",
  dpia_framework: "dpia_frameworks",
  cppa_admt: "cppa_assessments",
  cppa_risk_assessment: "cppa_assessments",
  cppa_cybersecurity: "cppa_assessments",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AnsweredItem { item_id: string; value: unknown; evidence?: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await verifyCaller(req, "admin");
  if (!auth.ok) return json({ error: auth.error }, auth.status ?? 401);

  let body: { tool_type?: string; assessment_id?: string; answered_items?: AnsweredItem[] };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const tool_type = String(body.tool_type ?? "");
  const assessment_id = String(body.assessment_id ?? "");
  const answered_items = Array.isArray(body.answered_items) ? body.answered_items : [];
  const table = TABLE_MAP[tool_type];
  if (!table || !assessment_id) return json({ error: "invalid_input" }, 400);
  if (answered_items.length === 0) return json({ error: "no_answered_items" }, 400);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Resolve the assessment's real owner so regenerate-assessment's meter and
  // ownership branches see a consistent user context.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: row, error: fErr } = await admin.from(table).select("user_id").eq("id", assessment_id).maybeSingle();
  if (fErr) return json({ error: "fetch_failed", detail: fErr.message }, 500);
  if (!row) return json({ error: "not_found" }, 404);
  const owner_id = (row as any).user_id ?? auth.userId;

  // Call regenerate-assessment with the internal-verification headers. This
  // is the same path run-quality-batch already uses for revision harness runs.
  // MUST forward a dispatch_nonce: cppa_assessments has a BEFORE UPDATE
  // trigger that overwrites updated_at, so the guardrail's timestamp
  // fallback is structurally impossible on that table (see
  // _shared/revision-mode.ts). Without a nonce, regenerate → runner returns
  // 409 revision_inflight (reason=timestamp_mismatch_no_nonce).
  const dispatch_nonce = crypto.randomUUID();
  const url = `${SUPABASE_URL}/functions/v1/regenerate-assessment`;
  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE}`,
        "apikey": SERVICE_ROLE,
        "x-internal-verification": "1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool_type,
        assessment_id,
        mode: "revision",
        answered_items,
        internal_user_id: owner_id,
        dispatch_nonce,
      }),
    });
  } catch (e) {
    // Return HTTP 200 with envelope so supabase.functions.invoke on the
    // client resolves with data (not error) — the reviewer UI then surfaces
    // the actual failure code from the envelope instead of the generic
    // "non-2xx status code" that FunctionsHttpError produces.
    return json({ ok: false, upstream_status: 0, payload: { error: "invoke_failed", detail: (e as Error).message }, dispatch_nonce }, 200);
  }
  const text = await resp.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text }; }
  return json({ ok: resp.ok, upstream_status: resp.status, payload, dispatch_nonce }, 200);
});
