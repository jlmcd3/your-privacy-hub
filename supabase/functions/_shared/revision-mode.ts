// RC-B.1 — Central revision-mode short-circuit for all 9 generators.
//
// Wired at each generator's HTTP entrypoint via `handleRevisionMode(...)`.
// Returns a Response when it handled the request (revision path); returns
// null when the request is a first-run or classic-revise — in which case
// the generator continues with its normal pipeline.
//
// Owns the entire scoped-delta contract:
//   1. Load stored report + intake.
//   2. Resolve answered items against frozen open_items.
//   3. (DPIA only) map items → units → limit generation surface.
//   4. Build REVISION SCOPE prompt (PATCH shape only).
//   5. Call the tool's model with a short focused prompt.
//   6. Parse PATCH, apply via applyRevisionPatch (untouched-subtree hash check).
//   7. Guard advisory notes (grounding + caps) + deterministic QC.
//   8. Update open_items statuses (statuses+resolutions ONLY, never reshape).
//   9. Snapshot already taken by regenerate-assessment before invoke.
//  10. Increment meter + write report + finish with a compact JSON response.
//
// This module NEVER changes the frozen open_items array shape or count.
import { applyRevisionPatch, ADVISORY_CAPS, guardAdvisoryNotes, checkAdvisoryGrounding } from "./revision-patch.ts";
import { updateOpenItemStatuses, type OpenItem } from "./open-items.ts";
import { callAnthropicWithContinuation } from "./anthropic-call.ts";
import { jsonrepair } from "https://esm.sh/jsonrepair@3.8.0";
import { mapItemsToUnits } from "./dpia-unit-map.ts";

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

const DEFAULT_MODEL = "claude-sonnet-4-5";

// RC-B.2 stamp bump: verdict-cardinality contract + status revert on refusal.
// RC-C1 stamp bump: verdict cardinality + § 7157 record-register phrasing.
export const REVISION_PROMPT_STAMP = "rev-scope@rc-c.1";

async function revertStatus(
  supabase: any, table: string, rowId: string, priorStatus: string | null,
  toolType: string, reason: string,
): Promise<void> {
  if (!priorStatus) return;
  try {
    await supabase
      .from(table)
      .update({ status: priorStatus, updated_at: new Date().toISOString() })
      .eq("id", rowId);
    console.warn(JSON.stringify({ evt: "revision_status_reverted", tool: toolType, row: rowId, to: priorStatus, reason }));
  } catch (e: any) {
    console.error(`[revision:${toolType}] status_revert_failed row=${rowId}`, e?.message);
  }
}

const TOOL_MODEL: Record<string, string> = {
  li_assessment: DEFAULT_MODEL,
  governance_assessment: DEFAULT_MODEL,
  dpia_framework: DEFAULT_MODEL,
  dpa_generator: DEFAULT_MODEL,
  ir_playbook: DEFAULT_MODEL,
  biometric_checker: DEFAULT_MODEL,
  cppa_admt: DEFAULT_MODEL,
  cppa_risk_assessment: DEFAULT_MODEL,
  cppa_cybersecurity: DEFAULT_MODEL,
};

export interface RevisionRequestBody {
  is_regeneration?: boolean;
  revision_mode?: boolean;
  revision_context?: { answered_item_ids?: string[] };
  assessment_id?: string;
  dpia_id?: string;
  [k: string]: unknown;
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

function parsePatchJson(text: string): any | null {
  if (!text) return null;
  let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  cleaned = cleaned.slice(start, end + 1);
  try { return JSON.parse(cleaned); }
  catch {
    try { return JSON.parse(jsonrepair(cleaned)); }
    catch { return null; }
  }
}

function buildRevisionPrompt(opts: {
  toolType: string;
  storedReport: any;
  intake: any;
  answeredItems: Array<{ item: OpenItem; response: string; evidence?: string | null }>;
  advisoryCap: number;
  dpiaUnitSubset?: string[];
}): { system: string; user: string } {
  const { toolType, storedReport, intake, answeredItems, advisoryCap, dpiaUnitSubset } = opts;

  const answersBlock = answeredItems.map((a) => ({
    id: a.item.id,
    target_path: a.item.target.path,
    ask: a.item.why_insufficient,
    provision: a.item.provision_key,
    user_response: a.response,
    evidence: a.evidence ?? null,
  }));

  const factRefWhitelist = [
    ...answeredItems.map((a) => `answered_item:${a.item.id}`),
    ...Object.keys(intake ?? {}).map((k) => `intake:${k}`),
  ];

  const answeredIdList = answeredItems.map((a) => a.item.id);
  const system = [
    `REVISION SCOPE [${REVISION_PROMPT_STAMP}] — this is a SCOPED-DELTA revision, NOT a re-generation.`,
    "You are re-determining ONLY the report determinations that the ANSWERED_ITEMS below feed. Untouched sections MUST NOT be re-written; the server enforces this with a SHA-256 hash comparison over the untouched subtree and will REJECT any patch whose untouched paths differ from the prior report.",
    "",
    "OUTPUT CONTRACT — return ONLY a single JSON object of this shape (no preamble, no code fences):",
    "{",
    '  "changed_paths": ["path.to.leaf", "another.path[0].leaf"],',
    '  "values": { "path.to.leaf": <new value>, "another.path[0].leaf": <new value> },',
    '  "item_verdicts": [ { "item_id": "<id>", "verdict": "resolved" | "not_resolved", "reason": "<short>" } ],',
    '  "advisory_notes": [ { "text": "<note>", "fact_ref": "answered_item:<id>" | "intake:<field>" } ]',
    "}",
    "",
    `ADVISORY CAP for ${toolType}: ${advisoryCap}. Every advisory_note MUST cite a fact_ref drawn from the whitelist below. Ungrounded or over-cap notes are stripped server-side and logged as a QC failure.`,
    `FACT_REF WHITELIST: ${factRefWhitelist.slice(0, 60).join(", ")}${factRefWhitelist.length > 60 ? " …" : ""}`,
    "",
    `ITEM VERDICTS — HARD CONTRACT: emit EXACTLY ONE verdict per answered item (${answeredItems.length} total). A missing verdict, a duplicate verdict, or a verdict for an unrecognised item_id is a MALFORMED PATCH and the server will REJECT the entire submission with no partial apply. Required item_ids: [${answeredIdList.join(", ")}]. 'resolved' means the user's response supplies the missing dimension; 'not_resolved' means it does not (explain briefly in reason). Contradictions with intake belong in the corresponding item's not_resolved reason, NEVER in advisory_notes.`,
    dpiaUnitSubset && dpiaUnitSubset.length > 0
      ? `DPIA UNIT SUBSET (data-only routing): the following units are the ONLY units this revision may touch: ${dpiaUnitSubset.join(", ")}. Do not emit changed_paths outside these units.`
      : "",
  ].filter(Boolean).join("\n");

  const user = [
    "ANSWERED_ITEMS:",
    JSON.stringify(answersBlock, null, 2),
    "",
    "PRIOR REPORT (JSON; ONLY change paths under determinations these items feed):",
    JSON.stringify(storedReport, null, 2).slice(0, 60_000),
    "",
    "INTAKE (for reference; do NOT rewrite intake facts):",
    JSON.stringify(intake ?? {}, null, 2).slice(0, 15_000),
  ].join("\n");

  return { system, user };
}

export interface HandleRevisionOpts {
  toolType: string;
  logStamp?: string;
}

export async function handleRevisionMode(
  supabase: any,
  body: RevisionRequestBody,
  opts: HandleRevisionOpts,
): Promise<Response | null> {
  const { toolType } = opts;
  const isRevision =
    body?.revision_mode === true ||
    (body?.is_regeneration === true && Array.isArray(body?.revision_context?.answered_item_ids) && body!.revision_context!.answered_item_ids!.length > 0);
  if (!isRevision) return null;

  const table = TABLE_MAP[toolType];
  if (!table) return jsonResp({ error: "revision_unknown_tool", toolType }, 400);

  const rowId = String(body.assessment_id ?? body.dpia_id ?? "");
  if (!rowId) return jsonResp({ error: "revision_missing_id" }, 400);

  const answeredIds: string[] = body.revision_context?.answered_item_ids ?? [];
  if (answeredIds.length === 0) return jsonResp({ error: "revision_no_items" }, 400);

  console.log(JSON.stringify({ evt: "revision_enter", tool: toolType, row: rowId, n: answeredIds.length }));

  const { data: row, error: loadErr } = await supabase
    .from(table)
    .select("id, user_id, intake_data, report_data, status")
    .eq("id", rowId)
    .maybeSingle();
  if (loadErr || !row) return jsonResp({ error: "revision_row_not_found", detail: loadErr?.message }, 404);
  // RC-B.2: capture prior status so we can revert on any refusal path.
  // regenerate-assessment set status='processing' before invoking us; the
  // "prior" status for revert purposes is 'complete' (the row was terminal
  // before this revision). Fall back to whatever we loaded if not processing.
  const priorStatus: string = row.status === "processing" ? "complete" : (row.status ?? "complete");

  const storedReport = row.report_data ?? {};
  const openItems: OpenItem[] = Array.isArray(storedReport?.open_items) ? storedReport.open_items : [];
  if (openItems.length === 0) return jsonResp({ error: "revision_no_open_items" }, 400);
  const byId = new Map(openItems.map((o: OpenItem) => [o.id, o]));
  const missing = answeredIds.filter((id) => !byId.has(id));
  if (missing.length > 0) return jsonResp({ error: "revision_unknown_item_ids", missing }, 400);

  // Answers were folded into intake_data.supplemental_responses by
  // regenerate-assessment before invoke; pull the responses back out.
  const intake = row.intake_data ?? {};
  const supps: any[] = Array.isArray(intake?.supplemental_responses) ? intake.supplemental_responses : [];
  const suppById = new Map(supps.filter((s) => s?.item_id).map((s) => [s.item_id, s]));

  const answeredPack = answeredIds.map((id) => {
    const item = byId.get(id)!;
    const s = suppById.get(id);
    return { item, response: String(s?.response ?? ""), evidence: s?.evidence ?? null };
  });

  // DPIA-only: constrain generation surface to units these items came from.
  let dpiaUnitSubset: string[] | undefined;
  if (toolType === "dpia_framework") {
    // Map persisted at report_data._revision.item_unit_map (survives the
    // _staging drop at terminal complete). Legacy fallback: _staging.shared.
    const unitMap =
      storedReport?._revision?.item_unit_map ??
      storedReport?._staging?.shared?.item_unit_map ??
      {};
    const { units } = mapItemsToUnits(answeredIds, unitMap);
    // U5 (consistency) always runs last on a revision.
    dpiaUnitSubset = Array.from(new Set([...units, "u5"]));
    console.log(JSON.stringify({ evt: "revision_dpia_units", units: dpiaUnitSubset, mapped_from: units }));
  }

  const advisoryCap = ADVISORY_CAPS[toolType] ?? 0;
  const { system, user } = buildRevisionPrompt({
    toolType, storedReport, intake, answeredItems: answeredPack, advisoryCap, dpiaUnitSubset,
  });

  const model = TOOL_MODEL[toolType] ?? DEFAULT_MODEL;
  let patchJson: any = null;
  const startedAt = Date.now();
  try {
    const res = await callAnthropicWithContinuation({
      model,
      system,
      user,
      maxTokens: 3000,
      timeoutMs: 180_000,
      label: `revision:${toolType}`,
      callerName: `revision-mode:${toolType}`,
      product: toolType,
      sourceRowId: rowId,
    });
    patchJson = parsePatchJson(res.text);
    if (!patchJson) {
      console.error(`[revision:${toolType}] parse_failed len=${res.text.length}`);
      await revertStatus(supabase, table, rowId, priorStatus, toolType, "parse_failed");
      return jsonResp({ error: "revision_parse_failed" }, 502);
    }
  } catch (e: any) {
    console.error(`[revision:${toolType}] model_call_failed`, e?.message);
    await revertStatus(supabase, table, rowId, priorStatus, toolType, "model_failed");
    return jsonResp({ error: "revision_model_failed", detail: e?.message }, 502);
  }

  // RC-B.2 VERDICT CARDINALITY — hard contract. Missing/extra/duplicate/unknown
  // verdicts = malformed patch, 409-class, NO partial apply.
  const verdictsRaw = Array.isArray(patchJson.item_verdicts) ? patchJson.item_verdicts : [];
  const verdictIds = verdictsRaw.map((v: any) => String(v?.item_id ?? ""));
  const verdictIdSet = new Set(verdictIds);
  const dupCount = verdictIds.length - verdictIdSet.size;
  const missingVerdicts = answeredIds.filter((id) => !verdictIdSet.has(id));
  const extraVerdicts = verdictIds.filter((id) => id && !answeredIds.includes(id));
  if (missingVerdicts.length > 0 || extraVerdicts.length > 0 || dupCount > 0 || verdictsRaw.length !== answeredIds.length) {
    console.error(`[revision:${toolType}] verdict_cardinality expected=${answeredIds.length} got=${verdictsRaw.length} missing=${missingVerdicts.length} extra=${extraVerdicts.length} dup=${dupCount}`);
    await revertStatus(supabase, table, rowId, priorStatus, toolType, "verdict_cardinality");
    return jsonResp({
      error: "revision_malformed_patch_verdicts",
      expected: answeredIds.length,
      got: verdictsRaw.length,
      missing: missingVerdicts,
      extra: extraVerdicts,
      duplicates: dupCount,
    }, 409);
  }

  // Advisory guard — grounding + cap.
  const allowedRefs = new Set<string>([
    ...answeredIds.map((id) => `answered_item:${id}`),
    ...Object.keys(intake ?? {}).map((k) => `intake:${k}`),
  ]);
  const advIn = Array.isArray(patchJson.advisory_notes) ? patchJson.advisory_notes : [];
  const advGuard = guardAdvisoryNotes(advIn, { cap: advisoryCap, allowedFactRefs: allowedRefs });
  if (advGuard.stripped > 0) {
    console.warn(JSON.stringify({ evt: "revision_advisory_stripped", tool: toolType, stripped: advGuard.stripped, reasons: advGuard.reasons }));
  }

  // Apply scoped-delta patch.
  const applied = await applyRevisionPatch(storedReport, {
    changed_paths: Array.isArray(patchJson.changed_paths) ? patchJson.changed_paths : [],
    values: (patchJson.values ?? {}) as Record<string, unknown>,
    item_verdicts: [],
    advisory_notes: [],
  });
  if (!applied.equal) {
    console.error(`[revision:${toolType}] untouched_hash_mismatch before=${applied.untouchedHashBefore.slice(0, 12)} after=${applied.untouchedHashAfter.slice(0, 12)}`);
    await revertStatus(supabase, table, rowId, priorStatus, toolType, "untouched_hash_mismatch");
    return jsonResp({
      error: "revision_untouched_subtree_mutated",
      hash_before: applied.untouchedHashBefore,
      hash_after: applied.untouchedHashAfter,
    }, 409);
  }

  // Fold in advisory + updated statuses.
  const nextReport = applied.next;
  nextReport.advisory_notes = advGuard.keep;
  const verdicts = verdictsRaw;
  nextReport.open_items = updateOpenItemStatuses(openItems, verdicts);

  // Deterministic QC: every surviving note must have fact_ref.
  const qc = checkAdvisoryGrounding(nextReport);
  if (!qc.ok) {
    console.error(`[revision:${toolType}] qc_advisory_red: ${qc.message}`);
    if (!Array.isArray(nextReport.lint_warnings)) nextReport.lint_warnings = [];
    nextReport.lint_warnings.push({ code: "advisory_grounding_red", message: qc.message });
  }

  // Persist.
  const { error: updErr } = await supabase
    .from(table)
    .update({
      report_data: nextReport,
      status: "complete",
      updated_at: new Date().toISOString(),
    })
    .eq("id", rowId);
  if (updErr) {
    console.error(`[revision:${toolType}] persist_failed`, updErr.message);
    await revertStatus(supabase, table, rowId, priorStatus, toolType, "persist_failed");
    return jsonResp({ error: "revision_persist_failed", detail: updErr.message }, 500);
  }

  // Meter: increment once per revision.
  try {
    const { data: meter } = await supabase
      .from("tool_run_meter")
      .select("runs_used, runs_allowed")
      .eq("tool_type", toolType)
      .eq("assessment_id", rowId)
      .maybeSingle();
    if (meter) {
      await supabase
        .from("tool_run_meter")
        .update({ runs_used: (meter.runs_used ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq("tool_type", toolType)
        .eq("assessment_id", rowId);
    }
  } catch (e: any) {
    console.warn(`[revision:${toolType}] meter_bump_failed`, e?.message);
  }

  const elapsed = Date.now() - startedAt;
  const resolvedCount = verdicts.filter((v: any) => v.verdict === "resolved").length;
  const stillOpen = (nextReport.open_items as OpenItem[]).filter((o) => o.status === "open").length;
  console.log(JSON.stringify({
    evt: "revision_ok",
    tool: toolType,
    row: rowId,
    elapsed_ms: elapsed,
    changed_paths: (patchJson.changed_paths ?? []).length,
    verdicts: verdicts.length,
    resolved: resolvedCount,
    still_open: stillOpen,
    advisory_kept: advGuard.keep.length,
    advisory_stripped: advGuard.stripped,
    dpia_units: dpiaUnitSubset ?? null,
  }));

  return jsonResp({
    ok: true,
    mode: "revision",
    changed_paths: patchJson.changed_paths ?? [],
    verdicts,
    advisory_notes_kept: advGuard.keep.length,
    advisory_notes_stripped: advGuard.stripped,
    still_open: stillOpen,
    untouched_hash: applied.untouchedHashAfter,
    elapsed_ms: elapsed,
  });
}
