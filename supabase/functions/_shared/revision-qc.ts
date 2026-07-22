// RC-C1 C1.5 — Deterministic QC checks for revision contract enforcement.
// Called from run-quality-batch's revision_dispatch action after upstream
// completion to verify the on-disk row against the contract invariants.
// Scoped to contract-enabled tools (currently: cppa_risk_assessment; add as
// each per-tool courier lands).
import { candidateTargetPaths, resolveEffectiveTargetPath } from "./target-path-aliases.ts";
import { sourceFieldsForOpenItem } from "./open-items.ts";

export const CONTRACT_ENABLED_TOOLS = new Set<string>([
  "cppa_risk_assessment",
  "dpia_framework",         // core proven RC-B; C2.1–C2.4 hardens per-tool
  "li_assessment",          // RC-C2 C2.5 — LIA joins the contract
  "governance_assessment",  // RC-C3/RC-D.1 D-3 — governance revision QC on
  "cppa_cybersecurity",     // RC-C3/RC-D.1 D-3 — cyber revision QC on
  "cppa_admt",              // RC-C3/RC-D.1 D-3 — admt revision QC on
]);

export interface QcCheckResult {
  code: string;
  status: "green" | "red";
  detail: string;
  data?: Record<string, unknown>;
}

// qc_rc_1_contract_monotonicity — open_items ids stable + count non-increasing
// across the revision. Any addition or removal is RED.
export function qcContractMonotonicity(
  before: Array<{ id: string }>,
  after: Array<{ id: string }>,
): QcCheckResult {
  const beforeIds = before.map((i) => i.id);
  const afterIds = after.map((i) => i.id);
  const beforeSet = new Set(beforeIds);
  const afterSet = new Set(afterIds);
  const added = afterIds.filter((id) => !beforeSet.has(id));
  const removed = beforeIds.filter((id) => !afterSet.has(id));
  if (added.length > 0 || removed.length > 0) {
    return {
      code: "qc_rc_1_contract_monotonicity",
      status: "red",
      detail: `contract violation: added=${added.length} removed=${removed.length}`,
      data: { added, removed, before_count: beforeIds.length, after_count: afterIds.length },
    };
  }
  if (afterIds.length > beforeIds.length) {
    return {
      code: "qc_rc_1_contract_monotonicity",
      status: "red",
      detail: `count increased ${beforeIds.length} → ${afterIds.length}`,
      data: { before_count: beforeIds.length, after_count: afterIds.length },
    };
  }
  return {
    code: "qc_rc_1_contract_monotonicity",
    status: "green",
    detail: `ids stable; count ${beforeIds.length} → ${afterIds.length}`,
    data: { count: afterIds.length },
  };
}

// qc_rc_2_verdict_consistency — verdict count == answered count, and every
// item that flipped to 'resolved' has at least one changed_path whose target
// falls under that item's target.path prefix (real content change accompanies
// resolution). 'not_resolved' verdicts do not require a changed_path.
//
// W3-VENDOR-2 (2026-07-22): accepts an optional `informationNeeded` array so a
// prose-authored frozen target.path resolves through source_fields → alias
// map BEFORE the coverage check. Callers that omit it fall back to the raw
// target.path (prior behavior). Structural target paths are unaffected.
export function qcVerdictConsistency(
  answeredIds: string[],
  verdicts: Array<{ item_id: string; verdict: string }>,
  itemsAfter: Array<{ id: string; target?: { path?: string }; status?: string }>,
  changedPaths: string[],
  toolType?: string,
  informationNeeded?: unknown,
): QcCheckResult {
  if (verdicts.length !== answeredIds.length) {
    return {
      code: "qc_rc_2_verdict_consistency",
      status: "red",
      detail: `verdict/answered mismatch: verdicts=${verdicts.length} answered=${answeredIds.length}`,
      data: { verdicts: verdicts.length, answered: answeredIds.length },
    };
  }
  const answeredSet = new Set(answeredIds);
  const stray = verdicts.filter((v) => !answeredSet.has(v.item_id));
  if (stray.length > 0) {
    return {
      code: "qc_rc_2_verdict_consistency",
      status: "red",
      detail: `verdict for unanswered item(s): ${stray.map((v) => v.item_id).join(",")}`,
      data: { stray: stray.map((v) => v.item_id) },
    };
  }
  const itemById = new Map(itemsAfter.map((i) => [i.id, i]));
  const missingChange: string[] = [];
  const missingDetail: Array<{ item_id: string; target: string; effective: string; candidates: string[] }> = [];
  for (const v of verdicts) {
    if (v.verdict !== "resolved") continue;
    const it = itemById.get(v.item_id);
    const targetPath = it?.target?.path;
    if (!targetPath) continue; // narrative-target items not path-checked
    // RC-D.11 — translate ask-vocabulary target → write-vocabulary candidates
    // via the explicit per-tool alias map. No wildcards, no substring inference.
    // W3-VENDOR-2 — first resolve the effective target via source_fields when
    // the frozen path is prose (see resolveEffectiveTargetPath).
    const sourceFields = toolType && it
      ? sourceFieldsForOpenItem({ id: it.id }, informationNeeded)
      : null;
    const effectivePath = toolType
      ? resolveEffectiveTargetPath(toolType, targetPath, sourceFields)
      : targetPath;
    const candidates = toolType
      ? candidateTargetPaths(toolType, effectivePath)
      : [effectivePath];
    const touched = changedPaths.some((p) =>
      candidates.some((c) => p === c || p.startsWith(c + ".") || p.startsWith(c + "[")),
    );
    if (!touched) {
      missingChange.push(v.item_id);
      missingDetail.push({ item_id: v.item_id, target: targetPath, effective: effectivePath, candidates });
    }
  }
  if (missingChange.length > 0) {
    return {
      code: "qc_rc_2_verdict_consistency",
      status: "red",
      detail: `resolved verdict without corresponding changed_path: ${missingChange.join(",")}`,
      data: { missing_change: missingChange, missing_detail: missingDetail, changed_paths: changedPaths },
    };
  }
  return {
    code: "qc_rc_2_verdict_consistency",
    status: "green",
    detail: `${verdicts.length} verdicts match ${answeredIds.length} answered; all 'resolved' items have matching changed_paths`,
    data: { verdicts: verdicts.length, changed_paths: changedPaths.length },
  };
}

// RC-P3 §CHECK-A — changed_paths ALLOWLIST.
//
// Every changed_path emitted by the model patch must equal or descend from
// EITHER (a) a candidateTargetPaths() expansion of some answered item's
// target.path, OR (b) an entry in the per-tool DERIVED_PATHS below — an
// explicit, enumerated set of report sub-sections the revision generator
// legitimately re-derives ALONGSIDE an answer. No wildcards on path segments
// other than the reserved `[*]` numeric-index marker (matches any array index).
//
// Server-owned bookkeeping keys (see SERVER_OWNED_PATHS) are stripped from
// the check because revision-mode.ts overwrites them AFTER applyRevisionPatch
// (open_items, advisory_notes, information_needed, item_verdicts, lint_warnings);
// whatever the model wrote there is discarded and cannot leak into the row.
//
// Justifications for every DERIVED_PATHS entry cite the observed prod run id
// (public.quality_loop3_runs.qc_result -> upstream.changed_paths) so the
// audit trail is preserved.
export const SERVER_OWNED_PATHS: readonly string[] = [
  "open_items",
  "advisory_notes",
  "information_needed",
  "item_verdicts",
  "lint_warnings",
];

export const DERIVED_PATHS: Record<string, readonly string[]> = {
  // Observed run 3e5f3b45 (cppa-risk): patch touched
  // `cross_tool_recommendations.cybersecurity_audit_rationale` (aliased via
  // TARGET_PATH_ALIASES, rule (a)) AND `priority_actions` — a top-level
  // action-list section the risk generator re-derives when a trigger
  // intake band flips (§ 7152 record consequence). Rule (b) required.
  cppa_risk_assessment: [
    "priority_actions",
  ],
  // Observed run 08a71bcd (cppa-cyber): answering two `controls.<slug>` items
  // caused writes to that control's `.status` leaf (rule (a) via alias map)
  // AND its `.score`, `.finding`, `.priority`, `.remediation` peers, plus
  // the aggregate scoring/summary block the cyber generator recomputes when
  // any control changes. All entries verified against the run's changed_paths.
  cppa_cybersecurity: [
    "controls[*].score",
    "controls[*].finding",
    "controls[*].priority",
    "controls[*].remediation",
    "top_risks",
    "next_steps",
    "overall_score",
    "readiness_level",
    "methodology_note",
    "executive_summary",
    "control_status_counts.implemented",
    "control_status_counts.partially_implemented",
    "control_status_counts.insufficient_information",
  ],
  // No observed non-(a) writes on lia, dpia, governance, admt, dpa, ir,
  // biometric revision runs to date. Left as empty arrays so a future
  // contributor sees the sweep was done deliberately.
  li_assessment: [],
  dpia_framework: [],
  governance_assessment: [],
  cppa_admt: [],
  dpa_generator: [],
  ir_playbook: [],
  biometric_checker: [],
};

// Convert a DERIVED_PATHS pattern (which may contain "[*]" numeric-index
// wildcards) into a predicate: matches paths that are equal to the pattern
// or descend from it, with each "[*]" position matching any `[<digits>]`.
function matchesDerivedPattern(pattern: string, candidate: string): boolean {
  if (!pattern.includes("[*]")) {
    return candidate === pattern
      || candidate.startsWith(pattern + ".")
      || candidate.startsWith(pattern + "[");
  }
  // Split on the literal "[*]" token, escape each literal segment for regex,
  // and join with the numeric-index wildcard. Then require descend/equal.
  const parts = pattern.split("[*]").map((seg) =>
    seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const body = parts.join("\\[\\d+\\]");
  const re = new RegExp("^" + body + "(\\.|\\[|$)");
  return re.test(candidate);
}

// qc_rc_3_changed_paths_authorized — every declared changed_path must trace
// back to an answered item (rule a) OR to a per-tool DERIVED_PATHS entry
// (rule b). Server-owned bookkeeping keys are pre-stripped.
export function qcChangedPathsAuthorized(
  answeredItems: Array<{ target?: { path?: string } }>,
  changedPaths: string[],
  toolType: string,
): QcCheckResult {
  const derived = DERIVED_PATHS[toolType] ?? [];
  const serverOwned = new Set<string>(SERVER_OWNED_PATHS);
  // Build the union of authorized prefixes from answered items (rule a).
  const askPrefixes: string[] = [];
  for (const it of answeredItems) {
    const p = it?.target?.path;
    if (!p) continue;
    for (const c of candidateTargetPaths(toolType, p)) {
      if (c && !askPrefixes.includes(c)) askPrefixes.push(c);
    }
  }
  const unauthorized: Array<{ path: string; reason: string }> = [];
  for (const raw of changedPaths) {
    const p = String(raw ?? "");
    if (!p) continue;
    // Strip server-owned bookkeeping — revision-mode overwrites these.
    const root = p.split(/[.\[]/, 1)[0];
    if (serverOwned.has(root)) continue;
    // Rule (a): answered-item target coverage.
    const ruleA = askPrefixes.some((c) =>
      p === c || p.startsWith(c + ".") || p.startsWith(c + "[")
    );
    if (ruleA) continue;
    // Rule (b): derived-paths coverage.
    const ruleB = derived.some((pat) => matchesDerivedPattern(pat, p));
    if (ruleB) continue;
    unauthorized.push({ path: p, reason: "no_answered_target_or_derived_entry" });
  }
  if (unauthorized.length > 0) {
    return {
      code: "qc_rc_3_changed_paths_authorized",
      status: "red",
      detail: `unauthorized changed_path(s): ${unauthorized.map((u) => u.path).join(",")}`,
      data: {
        unauthorized,
        ask_prefixes: askPrefixes,
        derived_paths: derived,
      },
    };
  }
  return {
    code: "qc_rc_3_changed_paths_authorized",
    status: "green",
    detail: `${changedPaths.length} changed_path(s) all authorized`,
    data: { checked: changedPaths.length, ask_prefixes: askPrefixes.length, derived: derived.length },
  };
}
