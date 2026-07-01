// deploy-check v2 — editable-columns merge
// regenerate-assessment: single client-initiated path for every run after the first.
// Stage 1 Prompt 1.6 — gated entry that enforces meter budget + locked-field policy,
// merges non-locked edits into intake_data, and re-invokes the generator.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getUserFromAuthHeader(req: Request): Promise<{ id: string } | null> {
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data, error } = await anonClient.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id };
}

const TABLE_MAP: Record<string, string> = {
  li_assessment: "li_assessments",
  governance_assessment: "governance_assessments",
  dpia_framework: "dpia_frameworks",
  dpa_generator: "dpa_documents",
  ir_playbook: "ir_playbooks",
  biometric_checker: "biometric_assessments",
  cppa_admt: "cppa_assessments",
  cppa_risk_assessment: "cppa_assessments",
  cppa_cybersecurity: "cppa_assessments",
};

const FN_MAP: Record<string, string> = {
  li_assessment: "run-li-assessment",
  governance_assessment: "run-governance-assessment",
  dpia_framework: "run-dpia-framework",
  dpa_generator: "generate-dpa",
  ir_playbook: "generate-ir-playbook",
  biometric_checker: "check-biometric-compliance",
  cppa_admt: "run-admt-checker",
  cppa_risk_assessment: "run-cppa-risk-assessment",
  cppa_cybersecurity: "run-cppa-cybersecurity",
};

// Per-tool allow-list of intake keys that also exist as dedicated columns on the
// assessment row. Audit summary (generators reading dedicated columns vs. intake_data):
//   li_assessment           → dedicated: processing_description, data_categories,
//                             relationship_type, jurisdictions, sector, stated_purpose,
//                             alternatives_considered, purpose_details, necessity_details,
//                             balancing_details, organization_name, subject_anchor
//   governance_assessment   → dedicated: organization_name (rest via intake_data)
//   dpia_framework          → dedicated: organization_name (rest via intake_data)
//   ir_playbook             → dedicated: organization_name (rest via intake_data)
//   biometric_checker       → dedicated: jurisdictions (rest via intake_data)
//   dpa_generator           → intake_data only
//   cppa_admt / cppa_risk_assessment / cppa_cybersecurity → intake_data only
const EDITABLE_COLUMNS: Record<string, string[]> = {
  li_assessment: [
    "processing_description", "data_categories", "relationship_type",
    "jurisdictions", "sector", "stated_purpose", "alternatives_considered",
    "purpose_details", "necessity_details", "balancing_details",
    "organization_name", "subject_anchor",
  ],
  governance_assessment: ["organization_name"],
  dpia_framework: ["organization_name"],
  dpa_generator: [],
  ir_playbook: ["organization_name"],
  biometric_checker: ["jurisdictions"],
  cppa_admt: [],
  cppa_risk_assessment: [],
  cppa_cybersecurity: [],
};

// li_assessments has NO intake_data column — its intake lives in dedicated columns only.
// Including a non-existent column causes PostgREST to reject the ENTIRE update.
const HAS_INTAKE_DATA: Record<string, boolean> = {
  li_assessment: false,
  governance_assessment: true,
  dpia_framework: true,
  dpa_generator: true,
  ir_playbook: true,
  biometric_checker: true,
  cppa_admt: true,
  cppa_risk_assessment: true,
  cppa_cybersecurity: true,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let payload: { tool_type?: string; assessment_id?: string; edited_fields?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const { tool_type, assessment_id, edited_fields } = payload;
  if (!tool_type || !assessment_id) return json({ error: "missing_params" }, 400);

  const authedUser = await getUserFromAuthHeader(req);
  if (!authedUser) return json({ error: "unauthenticated" }, 401);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: meter } = await supabase
    .from("tool_run_meter")
    .select("*")
    .eq("tool_type", tool_type)
    .eq("assessment_id", assessment_id)
    .maybeSingle();

  if (!meter || meter.user_id !== authedUser.id) {
    return json({ error: "not_found_or_forbidden" }, 403);
  }
  if (meter.runs_used >= meter.runs_allowed) {
    return json({
      error: "budget_exhausted",
      can_extend: true,
      extension_price_note: "4 more generations at 50% of the tool price",
    }, 402);
  }

  // Lock enforcement — no locked field may change.
  const locked = (meter.locked_fields ?? {}) as Record<string, unknown>;
  const edits = (edited_fields ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(locked)) {
    if (k in edits && JSON.stringify(edits[k]) !== JSON.stringify(locked[k])) {
      return json({ error: "locked_field_changed", field: k }, 409);
    }
  }

  const table = TABLE_MAP[tool_type];
  if (!table) return json({ error: "unknown_tool" }, 400);

  const { data: row } = await supabase
    .from(table)
    .select("intake_data")
    .eq("id", assessment_id)
    .single();

  const mergedIntake = { ...((row?.intake_data as Record<string, unknown>) ?? {}), ...edits };

  // Filter edits down to keys that exist as dedicated columns on this tool's
  // table so generators reading columns directly (e.g. LIA reads
  // processing_description, data_categories, jurisdictions from row columns)
  // see the updated values. Unknown keys are dropped to avoid Postgres errors.
  const allowedCols = EDITABLE_COLUMNS[tool_type] ?? [];
  const columnEdits: Record<string, unknown> = {};
  for (const k of allowedCols) {
    if (k in edits) columnEdits[k] = edits[k];
  }

  await supabase
    .from(table)
    .update({ intake_data: mergedIntake, ...columnEdits })
    .eq("id", assessment_id);

  const bodyKey = tool_type === "dpia_framework" ? "dpia_id" : "assessment_id";
  // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
  EdgeRuntime.waitUntil(
    supabase.functions.invoke(FN_MAP[tool_type], {
      body: { [bodyKey]: assessment_id, is_regeneration: true },
    }),
  );

  return json({ ok: true, runs_remaining: meter.runs_allowed - meter.runs_used - 1 });
});
