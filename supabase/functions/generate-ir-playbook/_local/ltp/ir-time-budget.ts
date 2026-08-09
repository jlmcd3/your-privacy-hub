/**
 * ITEM 417-B — THE ISOLATE TIME BUDGET FOR THE IR REFINEMENT PASS.
 *
 * WHY THIS FILE EXISTS. On the first live invocation after the item417 leg-D
 * deploy the isolate VANISHED mid-run: boot line present, generation complete
 * at +177s, the item414 deliverables telemetry written at +177.2s, then
 * silence — no error, no persist, no `background error` line, the row left
 * `processing`. That is the platform kill signature: the runtime tears the
 * isolate down on the wall-clock / CPU ceiling WITHOUT throwing, so no catch
 * block runs and no fail-open path fires.
 *
 * THE CLASS. Fail-open on ERROR is not fail-open on TIME. A pass that cannot
 * finish inside the isolate's remaining life must not be STARTED. The IR
 * playbook is the fleet's worst case for this: `playbook_text` is the largest
 * monolith in the fleet (83,918 chars on the last complete document) and it
 * rides on top of an already-long three-part generation. Critic (Claude,
 * continuation-capable) + verifier (GPT-4o) on that document is minutes of
 * additional wall clock appended to a run that had already spent ~3 minutes.
 *
 * THE RULE. Before the refinement pass — and again before the verifier call
 * inside it — the elapsed time since FUNCTION ENTRY is checked against a
 * conservative budget. If the remaining budget cannot absorb the pass, the
 * pass is SKIPPED fail-open with full telemetry accounting. The deterministic
 * battery, the fail-closed gate and the persist all still run.
 *
 * HONESTY CLAUSE (item417-B §3b). The critic input is NEVER silently
 * truncated. If the document exceeds what the budget can carry, the pass is
 * SKIPPED — a critic that saw half the document proposes drift.
 */

/**
 * Conservative ceiling for the whole background task, measured from function
 * entry. Deliberately below the platform's real wall-clock limit: the observed
 * kill left no trace, so the margin has to be ours, not the platform's.
 */
export const IR_ISOLATE_WALL_BUDGET_MS = 360_000;

/** Reserved for everything AFTER refinement: gold → CSC → coverage → R11 → gate → serialize → meter → persist. */
export const IR_POST_REFINEMENT_RESERVE_MS = 60_000;

/** Budgeted cost of the critic call (Claude, continuation-capable, large input). */
export const IR_CRITIC_BUDGET_MS = 120_000;

/** Budgeted cost of the verifier call (GPT-4o, 120s client timeout in the deps). */
export const IR_VERIFIER_BUDGET_MS = 60_000;

/**
 * The largest critic input this pass will carry. Beyond it we SKIP — never
 * truncate. Sized so the critic call itself stays inside its budget line.
 */
export const IR_CRITIC_MAX_DOC_CHARS = 120_000;

export interface IrTimeBudget {
  readonly startedAtMs: number;
  readonly wallBudgetMs: number;
  elapsedMs(): number;
  remainingMs(): number;
}

/** Record the isolate start time at function entry. */
export function makeIrTimeBudget(
  startedAtMs: number = Date.now(),
  wallBudgetMs: number = IR_ISOLATE_WALL_BUDGET_MS,
): IrTimeBudget {
  return {
    startedAtMs,
    wallBudgetMs,
    elapsedMs: () => Date.now() - startedAtMs,
    remainingMs: () => wallBudgetMs - (Date.now() - startedAtMs),
  };
}

export interface IrBudgetVerdict {
  ok: boolean;
  reason: string | null;
  elapsed_ms: number;
  remaining_ms: number;
  required_ms: number;
  doc_chars: number;
  max_doc_chars: number;
}

/**
 * Can the remaining budget absorb a FULL refinement pass (critic + verifier +
 * splice) AND leave the post-refinement reserve intact?
 */
export function irRefinementAffordable(
  budget: IrTimeBudget,
  docChars: number,
): IrBudgetVerdict {
  const required = IR_CRITIC_BUDGET_MS + IR_VERIFIER_BUDGET_MS + IR_POST_REFINEMENT_RESERVE_MS;
  const remaining = budget.remainingMs();
  const base = {
    elapsed_ms: budget.elapsedMs(),
    remaining_ms: remaining,
    required_ms: required,
    doc_chars: docChars,
    max_doc_chars: IR_CRITIC_MAX_DOC_CHARS,
  };
  if (remaining < required) return { ok: false, reason: "time_budget", ...base };
  // §3b — the honesty clause. Oversized document => SKIP, never splice on a
  // partial view.
  if (docChars > IR_CRITIC_MAX_DOC_CHARS) {
    return { ok: false, reason: "time_budget_doc_size", ...base };
  }
  return { ok: true, reason: null, ...base };
}

/** The second gate: is there still room for the verifier call plus the reserve? */
export function irVerifierAffordable(budget: IrTimeBudget): IrBudgetVerdict {
  const required = IR_VERIFIER_BUDGET_MS + IR_POST_REFINEMENT_RESERVE_MS;
  const remaining = budget.remainingMs();
  return {
    ok: remaining >= required,
    reason: remaining >= required ? null : "time_budget_verifier",
    elapsed_ms: budget.elapsedMs(),
    remaining_ms: remaining,
    required_ms: required,
    doc_chars: 0,
    max_doc_chars: IR_CRITIC_MAX_DOC_CHARS,
  };
}

/** Deterministic measure of what the critic would actually be handed. */
export function irCriticInputChars(report: Record<string, unknown>): number {
  try {
    return JSON.stringify(report, (k, v) => (k === "_meta" || k === "_staging" ? undefined : v))
      ?.length ?? 0;
  } catch {
    return Number.MAX_SAFE_INTEGER;
  }
}
