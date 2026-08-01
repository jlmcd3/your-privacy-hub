// deploy-check RC-A — revision gate + version snapshotting + errata mode
// regenerate-assessment: single client-initiated path for every run after the first.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { REVISIONS_ENABLED, REVISIONS_DISABLED_MESSAGE } from "./_local/revision-gate.ts";
import { invokeGated } from "../_shared/invoke-gated.ts";
import { snapshotPriorReport } from "./_local/report-versions.ts";
import { writeActionLog } from "../_shared/write-action-log.ts";
import { LOCKED_FIELDS_MAP } from "../_shared/locked-fields.ts";
import { resolveEnumRef } from "../_shared/field-enums.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// RC-D.9 ADDENDUM: BUILD_STAMP is the CEO's external-verification anchor.
// Value = git short-sha + ISO timestamp. Update in the same edit that
// changes behavior in this file.
// RC-D.11: bumped for the CPPA-PATH-1 alias fix (via _shared) + error-path stamp.
// RC-P3: bumped for answered_items value validation (§CHECK-B) + shared changed_paths allowlist plumbing.
export const BUILD_STAMP = "a2565fe2-rcP3@2026-07-14T21:30Z";

function json(body: unknown, status = 200) {
  // RC-D.11.4 — stamp EVERY response, including error bodies, so upstream
  // (run-quality-batch / ql3-orchestrator) can always attribute the artifact
  // that produced any 4xx/5xx. Only splice into plain object bodies.
  let stamped: unknown = body;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const b = body as Record<string, unknown>;
    if (!("build_stamp" in b)) stamped = { ...b, build_stamp: BUILD_STAMP };
  }
  return new Response(JSON.stringify(stamped), {
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
    // RC-D.8 end-to-end idempotency nonce (present on internal ql3→rqb→regen path).
    dispatch_nonce?: string;
  };
  try {
    payload = await req.json();
  } catch {
    logExit(400, { error: "invalid_json" });
    return json({ error: "invalid_json" }, 400);
  }
  const { tool_type, assessment_id, edited_fields, mode, corrections, answered_items, internal_user_id, dispatch_nonce } = payload;

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
    const rowSelect = (HAS_INTAKE_DATA[tool_type] ?? true)
      ? "user_id, intake_data, report_data"
      : "user_id, report_data";
    const { data: srcRow } = await supabase
      .from(table)
      .select(rowSelect)
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
    // RC-D.4 hardening: reject silently-empty answered_items BEFORE any
    // snapshot/meter/version side-effects. Missing `value` key OR empty-string
    // value can never be a valid revision input; substantive-but-insufficient
    // answers remain honest via the not_resolved verdict path downstream.
    for (const a of items) {
      if (!a || typeof a !== "object" || !("value" in (a as any))) {
        logExit(400, { error: "answered_item_missing_value", item_id: (a as any)?.item_id ?? null });
        return json({ error: "answered_item_missing_value", item_id: (a as any)?.item_id ?? null, message: "Each answered_items entry must include a `value` key." }, 400);
      }
      const v = (a as any).value;
      if (typeof v === "string" && v.trim().length === 0) {
        logExit(400, { error: "answered_item_missing_value", item_id: (a as any).item_id ?? null, reason: "empty_string" });
        return json({ error: "answered_item_missing_value", item_id: (a as any).item_id ?? null, message: "answered_items.value cannot be an empty string." }, 400);
      }
    }
    // Ownership + open_items membership check.
    const rowSelect = (HAS_INTAKE_DATA[tool_type] ?? true)
      ? "user_id, intake_data, report_data, status"
      : "user_id, report_data, status";
    const { data: row } = await supabase
      .from(table)
      .select(rowSelect)
      .eq("id", assessment_id)
      .maybeSingle();
    if (!row || (row as any).user_id !== authedUser.id) {
      logExit(403, { error: "not_found_or_forbidden" });
      return json({ error: "not_found_or_forbidden" }, 403);
    }
    // RC-C2.2 IN-FLIGHT GUARD — refuse (409) if a prior revision on this row
    // is still in flight. Prevents the write-race where two near-simultaneous
    // dispatches both invoke run-* and the loser's late apply overwrites the
    // winner. This is the correct layer for the guard: at handleRevisionMode
    // in run-*, we've already flipped status=processing ourselves and can no
    // longer distinguish our transition from a competing dispatch's.
    if ((row as any).status === "processing") {
      logExit(409, { error: "revision_inflight" });
      return json({ error: "revision_inflight", message: "another revision is in flight for this row" }, 409);
    }
    const openItems: any[] = Array.isArray((row as any).report_data?.open_items) ? (row as any).report_data.open_items : [];
    const openIds = new Set(openItems.map((o: any) => o.id));
    // RC-C2.2 UPSTREAM OPEN-STATUS VALIDATION — answering a resolved or
    // not_resolved item is a 400 here, before any generation. Prevents the
    // qc_rc_2 false-red spam we saw on 486eb7ec where already-resolved items
    // were re-answered and the dispatcher status-diff yielded verdicts=0.
    const openStatusById = new Map(openItems.map((o: any) => [o.id, String(o?.status ?? "open")]));
    for (const a of items) {
      if (!openIds.has(a.item_id)) {
        logExit(400, { error: "unknown_item_id", item_id: a.item_id });
        return json({ error: "unknown_item_id", item_id: a.item_id }, 400);
      }
      const st = openStatusById.get(a.item_id) ?? "open";
      if (st !== "open") {
        logExit(400, { error: "item_not_open", item_id: a.item_id, status: st });
        return json({ error: "item_not_open", item_id: a.item_id, status: st, message: "answered_items must reference open items; already resolved/not_resolved items may not be re-answered" }, 400);
      }
    }
    // RC-P3 §CHECK-B — ANSWERED-VALUE VALIDATION. Enforce the frozen
    // open_item.input_spec against the posted value BEFORE any side-effect
    // (snapshot, meter, status flip). Same shape as answered_item_missing_value:
    // 400 { error: "invalid_answer_value", item_id, reason }.
    //
    // Refine surface (src/components/refine/OpenItemsList.tsx L107-119) posts
    // boolean+evidence as `{ item_id, value: boolean, evidence?: string }` —
    // the boolean rides on `value`, evidence rides on a separate top-level
    // field (NOT wrapped inside value). Both flat and legacy wrapped
    // `{ value:boolean, evidence?:string }` shapes are accepted here.
    const openItemById = new Map(openItems.map((o: any) => [o.id, o]));
    for (const a of items) {
      const item: any = openItemById.get(a.item_id);
      const spec = item?.input_spec ?? {};
      const kind = String(spec?.kind ?? "").toLowerCase();
      const v = (a as any).value;
      if (kind === "re-select") {
        const opts = resolveEnumRef(spec?.enum_ref) ?? null;
        if (!opts || opts.length === 0) {
          // Server config error, not user error. Do NOT 400 the user.
          console.error(JSON.stringify({
            evt: "invalid_answer_value_config",
            item_id: a.item_id,
            enum_ref: spec?.enum_ref ?? null,
            reason: "enum_ref_unresolved_or_empty",
          }));
          logExit(500, { error: "invalid_answer_value_config", item_id: a.item_id });
          return json({
            error: "invalid_answer_value_config",
            item_id: a.item_id,
            reason: "enum_ref_unresolved_or_empty",
            message: "Server enum registry did not resolve this item's enum_ref. Not a client error.",
          }, 500);
        }
        const optSet = new Set(opts as readonly string[]);
        if (Array.isArray(v)) {
          for (const el of v) {
            if (typeof el !== "string" || !optSet.has(el)) {
              logExit(400, { error: "invalid_answer_value", item_id: a.item_id, reason: "enum_member_not_in_options", value: el });
              return json({ error: "invalid_answer_value", item_id: a.item_id, reason: `enum member "${String(el)}" is not in the input_spec enum` }, 400);
            }
          }
        } else if (typeof v === "string") {
          if (!optSet.has(v)) {
            logExit(400, { error: "invalid_answer_value", item_id: a.item_id, reason: "enum_not_in_options", value: v });
            return json({ error: "invalid_answer_value", item_id: a.item_id, reason: `value "${v}" is not in the input_spec enum` }, 400);
          }
        } else {
          logExit(400, { error: "invalid_answer_value", item_id: a.item_id, reason: "enum_wrong_shape" });
          return json({ error: "invalid_answer_value", item_id: a.item_id, reason: "re-select value must be a string or string[]" }, 400);
        }
      } else if (kind === "bounded-narrative") {
        if (typeof v !== "string") {
          logExit(400, { error: "invalid_answer_value", item_id: a.item_id, reason: "narrative_wrong_shape" });
          return json({ error: "invalid_answer_value", item_id: a.item_id, reason: "bounded-narrative value must be a string" }, 400);
        }
        const cap = Number(spec?.max_chars ?? 1200);
        if (v.length > cap) {
          logExit(400, { error: "invalid_answer_value", item_id: a.item_id, reason: "narrative_over_cap" });
          return json({ error: "invalid_answer_value", item_id: a.item_id, reason: `narrative exceeds max_chars=${cap}` }, 400);
        }
      } else if (kind === "boolean+evidence") {
        let boolVal: unknown = v;
        if (v && typeof v === "object" && !Array.isArray(v)) {
          if (typeof (v as any).value !== "boolean") {
            logExit(400, { error: "invalid_answer_value", item_id: a.item_id, reason: "boolean_wrong_shape" });
            return json({ error: "invalid_answer_value", item_id: a.item_id, reason: "boolean+evidence wrapped shape requires value:boolean" }, 400);
          }
          boolVal = (v as any).value;
        }
        if (typeof boolVal !== "boolean") {
          logExit(400, { error: "invalid_answer_value", item_id: a.item_id, reason: "boolean_wrong_shape" });
          return json({ error: "invalid_answer_value", item_id: a.item_id, reason: "boolean+evidence requires a boolean value" }, 400);
        }
      } else if (kind === "structured") {
        // Shape-only: must be a non-null object or array. P1 contract-field
        // key validation deferred (target.path→contract field mapping is
        // per-tool; safe default until QL3 confirms per-path shapes).
        if (v === null || typeof v !== "object") {
          logExit(400, { error: "invalid_answer_value", item_id: a.item_id, reason: "structured_wrong_shape" });
          return json({ error: "invalid_answer_value", item_id: a.item_id, reason: "structured value must be an object or array" }, 400);
        }
      }
      // Unknown kinds pass through unchanged.
    }

    // RC-D.8 IDEMPOTENCY CLAIM — before ANY side-effect (snapshot, meter,
    // status flip), atomically claim the dispatch_nonce. Duplicate deliveries
    // (at-least-once gateway retries, or writer races) fail the insert and
    // return a no-side-effect 409 idempotent_replay. Admin/manual dispatches
    // arrive without a nonce and keep today's behavior (already gated by
    // status='processing' 409 above).
    let dispatchNonceClaimed: string | null = null;
    if (dispatch_nonce && typeof dispatch_nonce === "string") {
      const { data: claim, error: claimErr } = await supabase
        .from("revision_dispatch_ledger")
        .insert({
          nonce: dispatch_nonce,
          assessment_id,
          tool_type,
          action: "revision_dispatch",
        })
        .select("nonce")
        .maybeSingle();
      if (claimErr) {
        // 23505 unique_violation → nonce already claimed by a prior delivery.
        const code = (claimErr as any).code;
        if (code === "23505") {
          logExit(409, { error: "idempotent_replay", dispatch_nonce });
          return json({ error: "idempotent_replay", dispatch_nonce, message: "duplicate delivery — original dispatch already accepted; no side-effect performed" }, 409);
        }
        logExit(500, { error: "ledger_claim_failed", detail: claimErr.message });
        return json({ error: "ledger_claim_failed", detail: claimErr.message }, 500);
      }
      if (!claim) {
        // ON CONFLICT DO NOTHING via unique PK → treat as replay.
        logExit(409, { error: "idempotent_replay", dispatch_nonce });
        return json({ error: "idempotent_replay", dispatch_nonce }, 409);
      }
      dispatchNonceClaimed = dispatch_nonce;
      console.log(JSON.stringify({ evt: "revision_dispatch_ledger_claimed", req_id: reqId, dispatch_nonce }));
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
    const processingStartedAt = new Date().toISOString();
    const updateObj: Record<string, unknown> = {
      ...(hasIntakeCol ? { intake_data: nextIntake } : {}),
      status: "processing",
      updated_at: processingStartedAt,
    };
    const { error: updErrRev } = await supabase.from(table).update(updateObj).eq("id", assessment_id);
    if (updErrRev) {
      logExit(500, { error: "revision_update_failed", detail: updErrRev.message });
      return json({ error: "revision_update_failed", detail: updErrRev.message }, 500);
    }
    const bodyKeyRev = tool_type === "dpia_framework" ? "dpia_id" : "assessment_id";
    const invokeBody = {
      [bodyKeyRev]: assessment_id,
      is_regeneration: true,
      revision_mode: true,
      revision_context: {
        answered_item_ids: items.map((a) => a.item_id),
        processing_started_at: processingStartedAt,
        previous_status: String((row as any).status ?? "complete"),
        // RC-D.8: forward the claimed nonce so revision-mode.ts can compare
        // by nonce rather than updated_at (which is clobbered by the
        // BEFORE UPDATE update_updated_at_column trigger on cppa_assessments,
        // making the timestamp guard structurally impossible to satisfy).
        ...(dispatchNonceClaimed ? { dispatch_nonce: dispatchNonceClaimed } : {}),
        // For no-intake tools (e.g. LIA) supps aren't persisted; forward
        // the full payload so revision-mode.ts can reconstruct answers.
        ...(hasIntakeCol ? {} : { answered_items: items }),
      },
    };
    const logRevisionStarted = () => writeActionLog(supabase, {
      actor_user_id: authedUser.id,
      action: "revision_started",
      target_table: table,
      target_id: assessment_id,
      payload: { tool_type, answered_item_ids: items.map((a) => a.item_id), processing_started_at: processingStartedAt },
      ok: true,
    });

    // RC-D.7 D-REGEN-ORPHAN-1: if the run-* invoke fails (fetch throws OR
    // upstream non-2xx) we MUST revert status back to previous_status in the
    // same handler — otherwise the row is orphaned in `processing` with no
    // worker and reap-stuck-generations is the only backstop.
    const previousStatus = String((row as any).status ?? "complete");
    const revertProcessing = async (reason: string) => {
      const { error: revErr } = await supabase
        .from(table)
        .update({ status: previousStatus, updated_at: new Date().toISOString() })
        .eq("id", assessment_id)
        .eq("status", "processing"); // race guard: don't clobber a worker that DID land
      if (revErr) console.error(`[regen] revert failed (${reason}):`, revErr.message);
      else console.log(`[regen] reverted ${assessment_id} processing→${previousStatus} (${reason})`);
    };

    // Internal verification dispatches are synchronous so run-quality-batch can
    // QC against the generator's authoritative PATCH summary (item_verdicts[]
    // and changed_paths), not a derived status diff.
    if (isInternalVerification) {
      let invokeStatus = 0;
      let invokeData: any = null;
      let invokeErr: any = null;
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/${FN_MAP[tool_type]}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_ROLE}`,
            "apikey": SERVICE_ROLE,
          },
          body: JSON.stringify(invokeBody),
        });
        invokeStatus = r.status;
        const txt = await r.text();
        try { invokeData = txt ? JSON.parse(txt) : null; } catch { invokeData = { raw: txt }; }
      } catch (e: any) {
        invokeStatus = 502;
        invokeErr = e;
      }
      await logRevisionStarted();
      if (invokeErr) {
        await revertProcessing("invoke_threw");
        const detail = invokeErr?.message ?? "revision_invoke_failed";
        logExit(502, { error: "revision_invoke_failed", detail });
        return json({ error: "revision_invoke_failed", detail }, 502);
      }
      if (invokeStatus < 200 || invokeStatus >= 300) {
        await revertProcessing(`upstream_${invokeStatus}`);
        logExit(invokeStatus, { error: invokeData?.error ?? "revision_refused", upstream_status: invokeStatus });
        return json(invokeData ?? { error: "revision_refused" }, invokeStatus);
      }
      logExit(200, { ok: true, mode: "revision", answered: items.length, synchronous: true });
      return json({ ok: true, mode: "revision", answered: items.length, ...(invokeData ?? {}), build_stamp: BUILD_STAMP });
    }
    // Async customer path — wrap the invoke so a failure reverts status
    // instead of leaving the row orphaned in processing.
    // INC-3: swap SDK invoke → invokeGated (raw fetch + explicit service-role
    // Authorization) so the verifyCaller-gated run-* callee doesn't silent-401.
    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil((async () => {
      const r = await invokeGated(FN_MAP[tool_type], invokeBody);
      if (!r.ok) {
        console.error("[regen] async revision invoke failed:", r.status, r.error ?? r.body);
        await revertProcessing("async_invoke_failed");
      }
    })());
    await logRevisionStarted();
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
  const fn = FN_MAP[tool_type];
  const invokeBody = { [bodyKey]: assessment_id, is_regeneration: true };
  // INC-3: swap SDK invoke → invokeGated (raw fetch + explicit service-role
  // Authorization) so the verifyCaller-gated run-* callee doesn't silent-401.
  // On failure, flip the row to 'error' with last_error so retry-failed-
  // generations rescues it (mirrors payments-webhook dispatchGenerator).
  // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
  EdgeRuntime.waitUntil((async () => {
    const r = await invokeGated(fn, invokeBody);
    if (!r.ok) {
      const detail = r.error ?? `status=${r.status} body=${r.body}`;
      console.error(JSON.stringify({
        evt: "regen_async_invoke_non_2xx", fn, table, row_id: assessment_id,
        status: r.status, detail,
      }));
      await supabase.from(table).update({
        status: "error",
        last_error: `regenerate-assessment invoke ${fn} → ${detail}`.slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", assessment_id);
    }
  })());

  logExit(200, { ok: true, runs_remaining: meter.runs_allowed - meter.runs_used - 1 });
  return json({ ok: true, runs_remaining: meter.runs_allowed - meter.runs_used - 1 });
});
