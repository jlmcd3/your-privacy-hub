// deploy-check RC-A — revision gate + version snapshotting + errata mode
// regenerate-assessment: single client-initiated path for every run after the first.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { REVISIONS_ENABLED, REVISIONS_DISABLED_MESSAGE } from "../_shared/revision-gate.ts";
import { snapshotPriorReport } from "../_shared/report-versions.ts";
import { writeActionLog } from "../_shared/write-action-log.ts";
import { LOCKED_FIELDS_MAP } from "../_shared/locked-fields.ts";

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

const EDITABLE_COLUMNS: Record<string, string[]> = {
  li_assessment: [
    "processing_description", "data_categories", "relationship_type",
    "jurisdictions", "sector", "stated_purpose", "alternatives_considered",
    "purpose_details", "necessity_details", "balancing_details",
    "organization_name", "subject_anchor",
    "supplemental_responses", "supplemental_context",
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

// RC-A A3 — identity fields whose root token can never be errata-corrected
// (rejects sit alongside per-tool LOCKED_FIELDS_MAP).
const IDENTITY_FIELDS = new Set([
  "entity_name", "subject_anchor", "company_name", "organization_name",
  "system_name", "sector", "q3_sector", "significant_decision_domain",
]);

// Walk a nested value, replacing every string leaf that equals `oldValue`
// with `newValue`. Returns [patched, count].
function replaceVerbatim(val: unknown, oldValue: string, newValue: string): { out: unknown; count: number } {
  let count = 0;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") {
      if (v === oldValue) { count++; return newValue; }
      // also patch appearances embedded in longer strings (verbatim substring)
      if (oldValue.length > 0 && v.includes(oldValue)) {
        const parts = v.split(oldValue);
        count += parts.length - 1;
        return parts.join(newValue);
      }
      return v;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const o: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = walk(x);
      return o;
    }
    return v;
  };
  return { out: walk(val), count };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const reqId = crypto.randomUUID();
  console.log(JSON.stringify({ evt: "regen_enter", req_id: reqId, method: req.method }));

  const logExit = (status: number, extra: Record<string, unknown> = {}) => {
    console.log(JSON.stringify({ evt: "regen_exit", req_id: reqId, status, ...extra }));
  };

  let payload: {
    tool_type?: string;
    assessment_id?: string;
    edited_fields?: Record<string, unknown>;
    mode?: "revise" | "errata" | "revision";
    corrections?: Array<{ field_path: string; new_value: unknown }>;
    answered_items?: Array<{ item_id: string; value: unknown; evidence?: string }>;
    // RC-B.1 verification — optional owner override for service-role internal calls.
    internal_user_id?: string;
  };
  try {
    payload = await req.json();
  } catch {
    logExit(400, { error: "invalid_json" });
    return json({ error: "invalid_json" }, 400);
  }
  const { tool_type, assessment_id, edited_fields, mode, corrections, answered_items, internal_user_id } = payload;

  if (!tool_type || !assessment_id) {
    logExit(400, { error: "missing_params" });
    return json({ error: "missing_params" }, 400);
  }

  // RC-B.1 — Internal verification bypass. Permanent harness plumbing:
  // callers presenting `x-internal-verification: 1` AND a service-role bearer
  // are treated as authenticated and exempted from REVISIONS_ENABLED. Any
  // request missing the header OR the service-role key follows the normal
  // customer path (401 on auth, 409 on gate). Errata is already gate-exempt.
  const internalHdr = req.headers.get("x-internal-verification") === "1";
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
  const isInternalVerification = internalHdr && bearer === SERVICE_ROLE;
  if (internalHdr && !isInternalVerification) {
    logExit(401, { error: "internal_verification_requires_service_role" });
    return json({ error: "internal_verification_requires_service_role" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const table = TABLE_MAP[tool_type];
  if (!table) {
    logExit(400, { error: "unknown_tool" });
    return json({ error: "unknown_tool" }, 400);
  }

  let authedUser: { id: string } | null = null;
  if (isInternalVerification) {
    if (internal_user_id) authedUser = { id: internal_user_id };
    else {
      const { data } = await supabase.from(table).select("user_id").eq("id", assessment_id).maybeSingle();
      if ((data as any)?.user_id) authedUser = { id: (data as any).user_id };
    }
    console.log(JSON.stringify({ evt: "regen_internal_verification", req_id: reqId, user: authedUser?.id ?? null }));
  } else {
    authedUser = await getUserFromAuthHeader(req);
  }
  if (!authedUser) {
    logExit(401, { error: "unauthenticated" });
    return json({ error: "unauthenticated" }, 401);
  }

  // ---------------------------------------------------------------------
  // RC-A A3 — ERRATA MODE
  // ---------------------------------------------------------------------
  if (mode === "errata") {
    const list = Array.isArray(corrections) ? corrections : [];
    if (list.length === 0) {
      logExit(400, { error: "no_corrections" });
      return json({ error: "no_corrections", message: "errata mode requires a non-empty corrections array" }, 400);
    }
    const locked = new Set<string>([
      ...IDENTITY_FIELDS,
      ...(LOCKED_FIELDS_MAP[tool_type] ?? []),
    ]);
    for (const c of list) {
      if (!c || typeof c.field_path !== "string") {
        logExit(400, { error: "bad_correction" });
        return json({ error: "bad_correction" }, 400);
      }
      const root = c.field_path.split(".")[0];
      if (locked.has(root)) {
        logExit(400, { error: "field_locked_for_errata", field_path: c.field_path });
        return json({ error: "field_locked_for_errata", field_path: c.field_path, message: "Locked or identity fields cannot be corrected via errata. Use a revision run (once re-enabled) or contact support." }, 400);
      }
    }

    // Ownership check (source-row user_id must match caller).
    const { data: srcRow } = await supabase
      .from(table)
      .select("user_id, intake_data, report_data")
      .eq("id", assessment_id)
      .maybeSingle();
    if (!srcRow || (srcRow as any).user_id !== authedUser.id) {
      logExit(403, { error: "not_found_or_forbidden" });
      return json({ error: "not_found_or_forbidden" }, 403);
    }

    // Snapshot the prior report before we mutate it (A2).
    await snapshotPriorReport(supabase, { toolType: tool_type, assessmentId: assessment_id, ownerUserId: authedUser.id });

    // Apply corrections to intake + report_data (verbatim replace).
    const allowedCols = EDITABLE_COLUMNS[tool_type] ?? [];
    const hasIntake = HAS_INTAKE_DATA[tool_type] ?? true;
    const priorIntake = ((srcRow as any).intake_data as Record<string, unknown>) ?? {};
    let nextIntake: Record<string, unknown> = { ...priorIntake };
    const columnEdits: Record<string, unknown> = {};
    let nextReport: any = (srcRow as any).report_data;

    const perField: Array<{ field_path: string; verbatim_replacements: number; needs_revision: boolean }> = [];
    for (const c of list) {
      // Read current value from intake (top-level key only in this stopgap;
      // deeper paths are supported via jsonb walk below).
      const root = c.field_path.split(".")[0];
      const oldVal = (priorIntake as any)[root];
      // Patch intake value.
      if (hasIntake) {
        // Top-level replace; nested path support arrives with Courier 2.
        (nextIntake as any)[root] = c.new_value;
      }
      if (allowedCols.includes(root)) {
        columnEdits[root] = c.new_value;
      }
      // Verbatim scan/replace in report_data.
      let replaced = 0;
      if (nextReport && typeof oldVal === "string" && typeof c.new_value === "string") {
        const r = replaceVerbatim(nextReport, oldVal, c.new_value);
        nextReport = r.out;
        replaced = r.count;
      }
      perField.push({
        field_path: c.field_path,
        verbatim_replacements: replaced,
        needs_revision: replaced === 0, // derived-only correction; caller must run a revision (once enabled)
      });
    }

    // Persist. Errata never flips status — it patches in place.
    const updateObj: Record<string, unknown> = {
      ...(hasIntake ? { intake_data: nextIntake } : {}),
      ...columnEdits,
      report_data: nextReport,
      updated_at: new Date().toISOString(),
    };
    const { error: updErr } = await supabase.from(table).update(updateObj).eq("id", assessment_id);
    if (updErr) {
      logExit(500, { error: "errata_update_failed", detail: updErr.message });
      return json({ error: "errata_update_failed", detail: updErr.message }, 500);
    }

    await writeActionLog(supabase, {
      actor_user_id: authedUser.id,
      action: "errata_applied",
      target_table: table,
      target_id: assessment_id,
      payload: { tool_type, corrections: list },
      result: { per_field: perField },
      ok: true,
    });

    const anyNeedsRev = perField.some((f) => f.needs_revision);
    logExit(200, { ok: true, mode: "errata", needs_revision: anyNeedsRev });
    return json({
      ok: true,
      mode: "errata",
      per_field: perField,
      needs_revision: anyNeedsRev,
      message: anyNeedsRev ? "Some corrections did not appear verbatim in the report — a revision run is required to propagate them (revisions are currently disabled)." : "All corrections applied verbatim.",
    });
  }

  // ---------------------------------------------------------------------
  // RC-B B3 — REVISION MODE (scoped-delta). Gate-guarded like classic revise.
  // Rejects any edited_fields (open items are the editable surface). Answers
  // ride the WS6 supplemental_responses rail carrying { item_id, ask, response }.
  // ---------------------------------------------------------------------
  if (mode === "revision") {
    if (!REVISIONS_ENABLED && !isInternalVerification) {
      logExit(409, { error: "revisions_disabled" });
      return json({ error: "revisions_disabled", message: REVISIONS_DISABLED_MESSAGE }, 409);
    }
    if (edited_fields && Object.keys(edited_fields).length > 0) {
      logExit(400, { error: "edits_not_allowed_on_revision" });
      return json({ error: "edits_not_allowed_on_revision", message: "Revision runs answer open items only; free-form edits are not permitted." }, 400);
    }
    const items = Array.isArray(answered_items) ? answered_items : [];
    if (items.length === 0) {
      logExit(400, { error: "no_answered_items" });
      return json({ error: "no_answered_items" }, 400);
    }
    // Ownership + open_items membership check.
    const { data: row } = await supabase
      .from(table)
      .select("user_id, intake_data, report_data")
      .eq("id", assessment_id)
      .maybeSingle();
    if (!row || (row as any).user_id !== authedUser.id) {
      logExit(403, { error: "not_found_or_forbidden" });
      return json({ error: "not_found_or_forbidden" }, 403);
    }
    const openItems: any[] = Array.isArray((row as any).report_data?.open_items) ? (row as any).report_data.open_items : [];
    const openIds = new Set(openItems.map((o: any) => o.id));
    for (const a of items) {
      if (!openIds.has(a.item_id)) {
        logExit(400, { error: "unknown_item_id", item_id: a.item_id });
        return json({ error: "unknown_item_id", item_id: a.item_id }, 400);
      }
    }
    // Snapshot FIRST (RC-A A2).
    await snapshotPriorReport(supabase, { toolType: tool_type, assessmentId: assessment_id, ownerUserId: authedUser.id });
    // Fold answered_items into the WS6 supplemental_responses rail with item_id.
    const priorIntake = ((row as any).intake_data as Record<string, unknown>) ?? {};
    const priorSupps = Array.isArray((priorIntake as any).supplemental_responses) ? (priorIntake as any).supplemental_responses : [];
    const nextSupps = [
      ...priorSupps,
      ...items.map((a) => ({
        item_id: a.item_id,
        ref_field: openItems.find((o: any) => o.id === a.item_id)?.target?.path ?? null,
        ask: openItems.find((o: any) => o.id === a.item_id)?.why_insufficient ?? "",
        response: typeof a.value === "string" ? a.value : JSON.stringify(a.value),
        evidence: a.evidence ?? null,
      })),
    ];
    const nextIntake = { ...priorIntake, supplemental_responses: nextSupps };
    const hasIntakeCol = HAS_INTAKE_DATA[tool_type] ?? true;
    const updateObj: Record<string, unknown> = {
      ...(hasIntakeCol ? { intake_data: nextIntake } : {}),
      status: "processing",
      updated_at: new Date().toISOString(),
    };
    const { error: updErrRev } = await supabase.from(table).update(updateObj).eq("id", assessment_id);
    if (updErrRev) {
      logExit(500, { error: "revision_update_failed", detail: updErrRev.message });
      return json({ error: "revision_update_failed", detail: updErrRev.message }, 500);
    }
    const bodyKeyRev = tool_type === "dpia_framework" ? "dpia_id" : "assessment_id";
    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(
      supabase.functions.invoke(FN_MAP[tool_type], {
        body: {
          [bodyKeyRev]: assessment_id,
          is_regeneration: true,
          revision_mode: true,
          revision_context: { answered_item_ids: items.map((a) => a.item_id) },
        },
      }),
    );
    await writeActionLog(supabase, {
      actor_user_id: authedUser.id,
      action: "revision_started",
      target_table: table,
      target_id: assessment_id,
      payload: { tool_type, answered_item_ids: items.map((a) => a.item_id) },
      ok: true,
    });
    logExit(200, { ok: true, mode: "revision", answered: items.length });
    return json({ ok: true, mode: "revision", answered: items.length });
  }

  // ---------------------------------------------------------------------
  // RC-A A1 — REVISION GATE for non-errata paths
  // ---------------------------------------------------------------------
  if (!REVISIONS_ENABLED && !isInternalVerification) {
    logExit(409, { error: "revisions_disabled" });
    return json({ error: "revisions_disabled", message: REVISIONS_DISABLED_MESSAGE }, 409);
  }

  const { data: meter } = await supabase
    .from("tool_run_meter")
    .select("*")
    .eq("tool_type", tool_type)
    .eq("assessment_id", assessment_id)
    .maybeSingle();

  if (!meter || meter.user_id !== authedUser.id) {
    logExit(403, { error: "not_found_or_forbidden" });
    return json({ error: "not_found_or_forbidden" }, 403);
  }
  if (meter.runs_used >= meter.runs_allowed) {
    logExit(402, { error: "budget_exhausted", runs_used: meter.runs_used, runs_allowed: meter.runs_allowed });
    return json({
      error: "budget_exhausted",
      can_extend: true,
      extension_price_note: "4 more generations at 50% of the tool price",
    }, 402);
  }

  const locked = (meter.locked_fields ?? {}) as Record<string, unknown>;
  const edits = (edited_fields ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(locked)) {
    if (k in edits && JSON.stringify(edits[k]) !== JSON.stringify(locked[k])) {
      logExit(409, { error: "locked_field_changed", field: k });
      return json({ error: "locked_field_changed", field: k }, 409);
    }
  }

  const hasIntake = HAS_INTAKE_DATA[tool_type] ?? true;
  let mergedIntake: Record<string, unknown> | undefined;
  if (hasIntake) {
    const { data: row } = await supabase
      .from(table)
      .select("intake_data")
      .eq("id", assessment_id)
      .single();

    mergedIntake = { ...((row?.intake_data as Record<string, unknown>) ?? {}), ...edits };
  }

  const allowedCols = EDITABLE_COLUMNS[tool_type] ?? [];
  const columnEdits: Record<string, unknown> = {};
  for (const k of allowedCols) {
    if (k in edits) columnEdits[k] = edits[k];
  }

  // RC-A A2 — snapshot the prior report before overwriting via re-generation.
  await snapshotPriorReport(supabase, { toolType: tool_type, assessmentId: assessment_id, ownerUserId: authedUser.id });

  const updateObj = {
    ...(hasIntake ? { intake_data: mergedIntake } : {}),
    ...columnEdits,
    status: "processing",
    updated_at: new Date().toISOString(),
  };
  const { error: updErr } = await supabase
    .from(table)
    .update(updateObj)
    .eq("id", assessment_id);

  if (updErr) {
    console.error("regen intake update failed:", updErr.message);
    logExit(500, { error: "intake_update_failed", detail: updErr.message });
    return json({ error: "intake_update_failed", detail: updErr.message }, 500);
  }

  const bodyKey = tool_type === "dpia_framework" ? "dpia_id" : "assessment_id";
  // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
  EdgeRuntime.waitUntil(
    supabase.functions.invoke(FN_MAP[tool_type], {
      body: { [bodyKey]: assessment_id, is_regeneration: true },
    }),
  );

  logExit(200, { ok: true, runs_remaining: meter.runs_allowed - meter.runs_used - 1 });
  return json({ ok: true, runs_remaining: meter.runs_allowed - meter.runs_used - 1 });
});
