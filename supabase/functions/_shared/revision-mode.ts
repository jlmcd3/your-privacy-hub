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
import { qcVerdictConsistency } from "./revision-qc.ts";
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

// RC-C2 microfix: tools whose row has no intake_data column. Must mirror
// regenerate-assessment/HAS_INTAKE_DATA. Selecting a non-existent column
// yields a row-load error → 404 → observed as 403-shaped ownership fail.
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

const DEFAULT_MODEL = "claude-sonnet-4-5";

// RC-B.2 stamp bump: verdict-cardinality contract + status revert on refusal.
// RC-C1 stamp bump: verdict cardinality + § 7157 record-register phrasing.
// RC-C2 stamp bump: DPIA Art. 35 register + LIA counsel-deferring register + DPIA unit-scope economy.
// RC-C2.2 stamp bump: pre-apply hollow-resolution guard + in-flight owner check + authoritative patch-verdict telemetry.
export const REVISION_PROMPT_STAMP = "rev-scope@rc-c.2.2";

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
  revision_context?: {
    answered_item_ids?: string[];
    answered_items?: Array<{ item_id: string; value: unknown; evidence?: string | null }>;
    processing_started_at?: string;
    previous_status?: string;
  };
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
    // RC-C2.1 — hollow-resolution guard. A 'resolved' verdict is a claim that the report's determination at the item's target.path has been re-determined; that re-determination MUST appear in this same patch.
    "RESOLUTION-CHANGE COUPLING — HARD CONTRACT: every 'resolved' verdict REQUIRES the re-determined content for that item's target.path (from open_items[].target.path) to appear in changed_paths (as that exact path or a descendant `path.leaf` / `path[i]`) with the new value in values{}. A 'resolved' verdict without a matching changed_path is a MALFORMED PATCH — the server runs qc_rc_2_verdict_consistency BEFORE applying and REJECTS the entire submission (409, no partial apply, row status reverts). Resolution and change arrive together, or not at all. If the answer clarified context without changing the determination, emit 'not_resolved' and explain in the reason.",
    // RC-C1 C1.2 — cppa-risk record-register rule (11 CCR § 7157 auditability).
    toolType === "cppa_risk_assessment"
      ? "§ 7157 RECORD REGISTER (cppa-risk): each item_verdicts[].reason MUST be written as a record entry — a certifiable statement of what the answer established (or failed to establish) on the § 7152 record. Use factual past-tense record phrasing (e.g. 'Established annual gross revenue band at $100M–$500M under § 7120(b)(1).' or 'Did not establish the § 7152(a)(5) severity dimension; response omitted concrete harm magnitude.'). Do NOT write conversational or advisory text ('you should...', 'consider...', 'we recommend...'). Every reason must be self-contained and cite the operative provision from the item's provision_key."
      : "",
    // RC-C2 C2.4 — dpia Art. 35 working-document register rule.
    toolType === "dpia_framework"
      ? "GDPR Art. 35 WORKING-DOCUMENT REGISTER (dpia): each item_verdicts[].reason MUST be phrased as a DPIA record entry that a controller could file verbatim in the Art. 35 working document. Cite the operative provision (from the item's provision_key slug, e.g. 'gdpr-art-9-2-j', 'edpb-wp248-c4') in past-tense factual language (e.g. 'Established the Art. 9(2)(j) research condition, citing controller's national derogation under Art. 89(2).' or 'Did not establish the Art. 28(3) processor-obligation coverage; response cited a DPA in draft but no signed instrument.'). No conversational or advisory phrasing; no 'you should…'; no 'we recommend…'. The reason IS the register entry."
      : "",
    // RC-C2 C2.5 — LIA counsel-deferring advisory register.
    toolType === "li_assessment"
      ? "LIA ADVISORY REGISTER (li_assessment): advisory_notes (cap 3) must be single suggestive sentences that route to a reassessment and defer to counsel — e.g. 'If your organization can document a data-subject expectation survey covering this cohort, a reassessment covering it may be worth considering, based on your counsel's advice.' Substantive balancing findings, contradictions, or 'must' language belong in the report body or in item_verdicts[].reason. Each item_verdicts[].reason should read as an assessment-register entry (past-tense, citation-anchored) — e.g. 'Established the necessity leg under Art. 6(1)(f) via the documented least-intrusive-means analysis.'"
      : "",
    dpiaUnitSubset && dpiaUnitSubset.length > 0
      ? `DPIA UNIT SUBSET (data-only routing): the following units are the ONLY units this revision may touch: ${dpiaUnitSubset.join(", ")}. Do not emit changed_paths outside these units. Prior-report context for units outside this subset has been elided for token economy — do not attempt to reconstruct it.`
      : "",
  ].filter(Boolean).join("\n");

  // RC-C2 C2.3 — UNIT-SCOPE ECONOMY: for DPIA revisions, pass ONLY the
  // affected sections of the prior report to the model. We keep:
  //   - report_metadata, open_items, advisory_notes (contract surface)
  //   - each answered item's target-path subtree (scoped delta surface)
  // Everything else is elided; token spend on the model call drops
  // proportionally, and api_usage.input_tokens records the delta (visible
  // in /admin/spend).
  const priorReportForPrompt =
    toolType === "dpia_framework" && dpiaUnitSubset && dpiaUnitSubset.length > 0
      ? pruneReportToTargets(storedReport, answeredItems.map((a) => a.item.target?.path).filter(Boolean) as string[])
      : storedReport;

  const user = [
    "ANSWERED_ITEMS:",
    JSON.stringify(answersBlock, null, 2),
    "",
    "PRIOR REPORT (JSON; ONLY change paths under determinations these items feed):",
    JSON.stringify(priorReportForPrompt, null, 2).slice(0, 60_000),
    "",
    "INTAKE (for reference; do NOT rewrite intake facts):",
    JSON.stringify(intake ?? {}, null, 2).slice(0, 15_000),
  ].join("\n");

  return { system, user };
}

// RC-C2 C2.3 — Prune a report to only the subtrees the answered items feed,
// plus contract-surface keys. Anything else is stripped so the prompt stays
// small. Safe for DPIA revision-mode where the untouched-hash guard still
// verifies byte-identity of stripped paths on the SERVER-SIDE full stored
// report (this pruning affects ONLY the prompt payload, not the row on disk).
function pruneReportToTargets(report: any, targetPaths: string[]): any {
  if (!report || typeof report !== "object") return report;
  const keep: any = {};
  // Always keep contract-surface keys the model needs to reason.
  for (const k of ["report_metadata", "open_items", "advisory_notes", "information_needed"]) {
    if (report[k] !== undefined) keep[k] = report[k];
  }
  // Also keep every top-level subtree that any answered item's target-path
  // ROOT names (so the model sees the section it's about to patch).
  const roots = new Set<string>();
  for (const p of targetPaths) {
    const root = String(p).split(/[.\[]/, 1)[0].trim();
    if (root) roots.add(root);
  }
  for (const root of roots) {
    if (report[root] !== undefined) keep[root] = report[root];
  }
  return keep;
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

  const hasIntakeCol = HAS_INTAKE_DATA[toolType] ?? true;
  const selectCols = hasIntakeCol
    ? "id, user_id, intake_data, report_data, status, updated_at"
    : "id, user_id, report_data, status, updated_at";
  const { data: row, error: loadErr } = await supabase
    .from(table)
    .select(selectCols)
    .eq("id", rowId)
    .maybeSingle();
  if (loadErr || !row) return jsonResp({ error: "revision_row_not_found", detail: loadErr?.message }, 404);
  // RC-C2.2 IN-FLIGHT GUARD — regenerate-assessment passes the exact
  // processing timestamp it just wrote. If this handler loads a processing row
  // whose updated_at does not match that token, this invocation is not the
  // owner of the current in-flight revision and must refuse without mutation.
  if (row.status === "processing") {
    const expectedProcessingAt = String(body.revision_context?.processing_started_at ?? "");
    const loadedProcessingAt = String((row as any).updated_at ?? "");
    const expectedMs = expectedProcessingAt ? new Date(expectedProcessingAt).getTime() : NaN;
    const loadedMs = loadedProcessingAt ? new Date(loadedProcessingAt).getTime() : NaN;
    if (!Number.isFinite(expectedMs) || !Number.isFinite(loadedMs) || expectedMs !== loadedMs) {
      console.warn(JSON.stringify({ evt: "revision_inflight_refused", tool: toolType, row: rowId, expected_processing_at: expectedProcessingAt || null, loaded_processing_at: loadedProcessingAt || null }));
      return jsonResp({ error: "revision_inflight", message: "another revision is in flight for this row" }, 409);
    }
  }

  // RC-B.2: capture prior status so we can revert on any refusal path.
  // Own in-flight revisions observe the processing status they just wrote;
  // their safe prior terminal state is complete.
  const priorStatus: string = row.status === "processing"
    ? String(body.revision_context?.previous_status ?? "complete")
    : (row.status ?? "complete");

  const storedReport = row.report_data ?? {};
  const openItems: OpenItem[] = Array.isArray(storedReport?.open_items) ? storedReport.open_items : [];
  if (openItems.length === 0) return jsonResp({ error: "revision_no_open_items" }, 400);
  const byId = new Map(openItems.map((o: OpenItem) => [o.id, o]));
  const missing = answeredIds.filter((id) => !byId.has(id));
  if (missing.length > 0) return jsonResp({ error: "revision_unknown_item_ids", missing }, 400);

  // Answers are folded into intake_data.supplemental_responses by
  // regenerate-assessment for tables that carry intake_data. For no-intake
  // tools (LIA), regenerate-assessment forwards the full answered payload
  // in body.revision_context.answered_items — consume that instead.
  const intake = (hasIntakeCol ? row.intake_data : null) ?? {};
  const inlineAnswered: any[] = Array.isArray(body?.revision_context?.answered_items)
    ? body!.revision_context!.answered_items!
    : [];
  const supps: any[] = hasIntakeCol
    ? (Array.isArray(intake?.supplemental_responses) ? intake.supplemental_responses : [])
    : inlineAnswered.map((a: any) => ({
        item_id: a?.item_id,
        response: typeof a?.value === "string" ? a.value : JSON.stringify(a?.value ?? ""),
        evidence: a?.evidence ?? null,
      }));
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

  // RC-C2.1 HOLLOW-RESOLUTION GUARD — run qc_rc_2 BEFORE applying. A 'resolved'
  // verdict without a matching changed_path is a malformed patch: refuse
  // entirely (409, no partial apply, prior status reverted). Symmetric to
  // the SHA-256 untouched-subtree guard: contract violations refuse, not annotate.
  {
    const wouldBeItems = updateOpenItemStatuses(openItems, verdictsRaw as any);
    const changedPathsIn: string[] = Array.isArray(patchJson.changed_paths) ? patchJson.changed_paths : [];
    const preQc = qcVerdictConsistency(
      answeredIds,
      verdictsRaw.map((v: any) => ({ item_id: String(v?.item_id ?? ""), verdict: String(v?.verdict ?? "") })),
      wouldBeItems as any,
      changedPathsIn,
    );
    if (preQc.status === "red") {
      console.error(`[revision:${toolType}] pre_apply_qc_red ${preQc.code}: ${preQc.detail}`);
      await revertStatus(supabase, table, rowId, priorStatus, toolType, `pre_apply_${preQc.code}`);
      return jsonResp({
        error: "revision_hollow_resolution",
        qc: preQc,
      }, 409);
    }
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
  let applied: Awaited<ReturnType<typeof applyRevisionPatch>>;
  try {
    applied = await applyRevisionPatch(storedReport, {
      changed_paths: Array.isArray(patchJson.changed_paths) ? patchJson.changed_paths : [],
      values: (patchJson.values ?? {}) as Record<string, unknown>,
      item_verdicts: [],
      advisory_notes: [],
    });
  } catch (e: any) {
    const changedPathsIn: string[] = Array.isArray(patchJson.changed_paths) ? patchJson.changed_paths : [];
    console.error(`[revision:${toolType}] patch_apply_failed`, e?.message, JSON.stringify({ changed_paths: changedPathsIn.slice(0, 20) }));
    await revertStatus(supabase, table, rowId, priorStatus, toolType, "patch_apply_failed");
    return jsonResp({
      error: "revision_patch_apply_failed",
      detail: e?.message ?? "patch apply failed",
      changed_paths: changedPathsIn,
    }, 409);
  }
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
