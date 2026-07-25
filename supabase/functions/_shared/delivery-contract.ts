// DELIVERY SENTINEL — DS-T1
// Shared helper for creating/advancing/heartbeating/terminating delivery
// contracts. Contract = one row per user-initiated product run OR quality-
// batch harness run. Both classes share the sweep machinery; SLAs and
// escalation paths differ.
//
// Recovery ≠ measurement: this module never touches grades. It only
// records WHEN stages complete and provides checkpoints for resume.
//
// Build stamp: ds-t2c@2026-07-25T04:53:00Z

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DELIVERY_CONTRACT_STAMP = "ds-t2c@2026-07-25T04:53:00Z";

export type RunClass = "customer" | "harness";
export type ContractStage = "generate" | "assemble" | "validate" | "render" | "deliver";
export type FailureClass =
  | "model_timeout"
  | "pdf_render"
  | "rate_limited"
  | "validator_reject"
  | "delivery_failure"
  | "harness_stall";
export type TerminalState =
  | "delivered"
  | "delivered_html_pdf_queued"
  | "admin_escalated"
  | "harness_stalled";

export interface CreateContractInput {
  runClass: RunClass;
  tool: string;                 // e.g. "dpia", "admt", "cppa-risk", "cppa-cyber", "governance"
  subjectTable: string;         // e.g. "dpia_frameworks", "quality_runs"
  subjectId: string;            // pk of the subject row
  userId?: string | null;       // required for customer, null for harness
  initialStage?: ContractStage; // default "generate"
  checkpointRef?: Record<string, unknown>;
}

export interface AdvanceContractInput {
  contractId: string;
  toStage: ContractStage;
  checkpointRef?: Record<string, unknown>;   // merged into existing
  failureClassClear?: boolean;               // set true to clear on successful advance
}

export interface HeartbeatInput {
  contractId: string;
  checkpointRef?: Record<string, unknown>;
}

export interface FailureInput {
  contractId: string;
  failureClass: FailureClass;
  lastError: string;
  attemptStage?: ContractStage;              // increments attempts[stage]
}

export interface TerminalInput {
  contractId: string;
  terminalState: TerminalState;
  lastError?: string;
}

export interface ContractRow {
  id: string;
  run_class: RunClass;
  user_id: string | null;
  tool: string;
  subject_table: string;
  subject_id: string;
  stage: ContractStage;
  stage_deadline_at: string;
  overall_deadline_at: string;
  heartbeat_at: string;
  checkpoint_ref: Record<string, unknown>;
  attempts: Record<string, number>;
  failure_class: FailureClass | null;
  last_error: string | null;
  terminal_state: TerminalState | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────
// SLA TABLE — seconds
// Class-scoped. Customer SLAs favor honest user-facing status;
// harness SLAs are tighter so ERROR cells never linger unattributed.
// ─────────────────────────────────────────────────────────────────
interface StageSla {
  stageSeconds: number;
  overallSeconds: number;
}

const CUSTOMER_SLA_BY_TOOL: Record<string, StageSla> = {
  // multi-unit tools
  dpia:          { stageSeconds: 300, overallSeconds: 1200 },
  admt:          { stageSeconds: 300, overallSeconds: 1200 },
  lia:           { stageSeconds: 240, overallSeconds:  900 },
  // single-shot tools
  governance:    { stageSeconds: 180, overallSeconds:  600 },
  "cppa-risk":   { stageSeconds: 180, overallSeconds:  600 },
  "cppa-cyber":  { stageSeconds: 180, overallSeconds:  600 },
  ir:            { stageSeconds: 180, overallSeconds:  600 },
  dpa:           { stageSeconds: 180, overallSeconds:  600 },
  // multi-answer intake
  ropa:          { stageSeconds: 300, overallSeconds: 1800 },
  eu_notice:     { stageSeconds: 300, overallSeconds: 1800 },
  us_notice:     { stageSeconds: 300, overallSeconds: 1800 },
  registration:  { stageSeconds: 240, overallSeconds: 1200 },
  biometric:     { stageSeconds: 180, overallSeconds:  600 },
};
const CUSTOMER_SLA_DEFAULT: StageSla = { stageSeconds: 240, overallSeconds: 900 };

// Harness runs get a wide window sized to a real campaign wave: 3 tools ×
// batch 3 at ~6–8 min/doc-unit ≈ 35–45 min. Under-sized SLAs guarantee
// false kills (DS-T2c hotfix). stage=900s (15 min per generate/grade
// stage), overall=5400s (90 min ceiling). Customer SLAs untouched.
const HARNESS_SLA: StageSla = { stageSeconds: 900, overallSeconds: 5400 };

export function slaFor(runClass: RunClass, tool: string): StageSla {
  if (runClass === "harness") return HARNESS_SLA;
  return CUSTOMER_SLA_BY_TOOL[tool] ?? CUSTOMER_SLA_DEFAULT;
}

// ─────────────────────────────────────────────────────────────────
// Client bootstrap — service role only. This module never runs client-side.
// ─────────────────────────────────────────────────────────────────
function svc(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("delivery-contract: SUPABASE_URL / SERVICE_ROLE_KEY missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

function isoInSeconds(sec: number): string {
  return new Date(Date.now() + sec * 1000).toISOString();
}

// ─────────────────────────────────────────────────────────────────
// createContract — idempotent by (subject_table, subject_id, run_class)
// Returns the existing live contract if one already exists (unfinished).
// This lets a resumed worker call create() safely without duplicating.
// ─────────────────────────────────────────────────────────────────
export async function createContract(input: CreateContractInput): Promise<ContractRow> {
  const c = svc();
  const sla = slaFor(input.runClass, input.tool);
  const stage: ContractStage = input.initialStage ?? "generate";

  // Look for an existing non-terminal contract for the same subject.
  const { data: existing } = await c
    .from("delivery_contracts")
    .select("*")
    .eq("run_class", input.runClass)
    .eq("subject_table", input.subjectTable)
    .eq("subject_id", input.subjectId)
    .is("terminal_state", null)
    .maybeSingle();

  if (existing) return existing as ContractRow;

  const { data, error } = await c
    .from("delivery_contracts")
    .insert({
      run_class: input.runClass,
      user_id: input.userId ?? null,
      tool: input.tool,
      subject_table: input.subjectTable,
      subject_id: input.subjectId,
      stage,
      stage_deadline_at: isoInSeconds(sla.stageSeconds),
      overall_deadline_at: isoInSeconds(sla.overallSeconds),
      heartbeat_at: new Date().toISOString(),
      checkpoint_ref: input.checkpointRef ?? {},
      attempts: {},
    })
    .select("*")
    .single();

  if (error) throw new Error(`delivery-contract create failed: ${error.message}`);
  return data as ContractRow;
}

// ─────────────────────────────────────────────────────────────────
// advanceContract — move to next stage, reset stage deadline, heartbeat.
// Does NOT bump overall deadline (that's a wall-clock guarantee).
// ─────────────────────────────────────────────────────────────────
export async function advanceContract(input: AdvanceContractInput): Promise<ContractRow> {
  const c = svc();
  const { data: cur, error: readErr } = await c
    .from("delivery_contracts").select("*").eq("id", input.contractId).single();
  if (readErr || !cur) throw new Error(`advanceContract: contract ${input.contractId} not found`);

  const sla = slaFor((cur as ContractRow).run_class, (cur as ContractRow).tool);
  const nextCheckpoint = {
    ...(cur.checkpoint_ref ?? {}),
    ...(input.checkpointRef ?? {}),
  };

  const patch: Record<string, unknown> = {
    stage: input.toStage,
    stage_deadline_at: isoInSeconds(sla.stageSeconds),
    heartbeat_at: new Date().toISOString(),
    checkpoint_ref: nextCheckpoint,
  };
  if (input.failureClassClear) {
    patch.failure_class = null;
    patch.last_error = null;
  }

  const { data, error } = await c
    .from("delivery_contracts")
    .update(patch)
    .eq("id", input.contractId)
    .is("terminal_state", null)         // don't reanimate finished contracts
    .select("*")
    .single();
  if (error) throw new Error(`advanceContract failed: ${error.message}`);
  return data as ContractRow;
}

// ─────────────────────────────────────────────────────────────────
// heartbeat — cheapest write path; call frequently from long stages.
// ─────────────────────────────────────────────────────────────────
export async function heartbeatContract(input: HeartbeatInput): Promise<void> {
  const c = svc();
  const patch: Record<string, unknown> = { heartbeat_at: new Date().toISOString() };
  if (input.checkpointRef) {
    const { data: cur } = await c.from("delivery_contracts")
      .select("checkpoint_ref").eq("id", input.contractId).single();
    patch.checkpoint_ref = { ...((cur?.checkpoint_ref as object | undefined) ?? {}), ...input.checkpointRef };
  }
  await c.from("delivery_contracts").update(patch)
    .eq("id", input.contractId)
    .is("terminal_state", null);
}

// ─────────────────────────────────────────────────────────────────
// recordFailure — increments attempts[stage], sets failure_class + error.
// Does NOT terminate; the sentinel decides whether to retry / escalate.
// ─────────────────────────────────────────────────────────────────
export async function recordFailure(input: FailureInput): Promise<ContractRow | null> {
  const c = svc();
  const { data: cur } = await c.from("delivery_contracts")
    .select("attempts, stage").eq("id", input.contractId).maybeSingle();
  if (!cur) return null;
  const stageKey = input.attemptStage ?? (cur.stage as ContractStage);
  const attempts = { ...((cur.attempts as Record<string, number>) ?? {}) };
  attempts[stageKey] = (attempts[stageKey] ?? 0) + 1;

  const { data, error } = await c.from("delivery_contracts").update({
    failure_class: input.failureClass,
    last_error: input.lastError.slice(0, 4000),
    attempts,
    heartbeat_at: new Date().toISOString(),
  }).eq("id", input.contractId)
    .is("terminal_state", null)
    .select("*").maybeSingle();

  if (error) throw new Error(`recordFailure failed: ${error.message}`);
  return (data ?? null) as ContractRow | null;
}

// ─────────────────────────────────────────────────────────────────
// terminate — final write, sets terminal_state; ignored if already terminal.
// ─────────────────────────────────────────────────────────────────
export async function terminateContract(input: TerminalInput): Promise<void> {
  const c = svc();
  const patch: Record<string, unknown> = {
    terminal_state: input.terminalState,
    heartbeat_at: new Date().toISOString(),
  };
  if (input.lastError) patch.last_error = input.lastError.slice(0, 4000);
  await c.from("delivery_contracts").update(patch)
    .eq("id", input.contractId)
    .is("terminal_state", null);
}

// ─────────────────────────────────────────────────────────────────
// findLive — sentinel-sweep helper (DS-T2 will call this).
// ─────────────────────────────────────────────────────────────────
export async function findStaleContracts(nowIso?: string): Promise<ContractRow[]> {
  const c = svc();
  const cutoff = nowIso ?? new Date().toISOString();
  const { data, error } = await c
    .from("delivery_contracts")
    .select("*")
    .is("terminal_state", null)
    .lt("heartbeat_at", cutoff)
    .order("stage_deadline_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(`findStaleContracts: ${error.message}`);
  return (data ?? []) as ContractRow[];
}

// ─────────────────────────────────────────────────────────────────
// Test surfaces — pure functions, no I/O
// ─────────────────────────────────────────────────────────────────
export function _testables() {
  return { slaFor, isoInSeconds, HARNESS_SLA, CUSTOMER_SLA_BY_TOOL, CUSTOMER_SLA_DEFAULT };
}
