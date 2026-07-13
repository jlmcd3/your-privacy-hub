// RC-C1 C1.5 — Deterministic QC checks for revision contract enforcement.
// Called from run-quality-batch's revision_dispatch action after upstream
// completion to verify the on-disk row against the contract invariants.
// Scoped to contract-enabled tools (currently: cppa_risk_assessment; add as
// each per-tool courier lands).

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
export function qcVerdictConsistency(
  answeredIds: string[],
  verdicts: Array<{ item_id: string; verdict: string }>,
  itemsAfter: Array<{ id: string; target?: { path?: string }; status?: string }>,
  changedPaths: string[],
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
  for (const v of verdicts) {
    if (v.verdict !== "resolved") continue;
    const it = itemById.get(v.item_id);
    const targetPath = it?.target?.path;
    if (!targetPath) continue; // narrative-target items not path-checked
    const touched = changedPaths.some((p) => p === targetPath || p.startsWith(targetPath + ".") || p.startsWith(targetPath + "["));
    if (!touched) missingChange.push(v.item_id);
  }
  if (missingChange.length > 0) {
    return {
      code: "qc_rc_2_verdict_consistency",
      status: "red",
      detail: `resolved verdict without corresponding changed_path: ${missingChange.join(",")}`,
      data: { missing_change: missingChange, changed_paths: changedPaths },
    };
  }
  return {
    code: "qc_rc_2_verdict_consistency",
    status: "green",
    detail: `${verdicts.length} verdicts match ${answeredIds.length} answered; all 'resolved' items have matching changed_paths`,
    data: { verdicts: verdicts.length, changed_paths: changedPaths.length },
  };
}
