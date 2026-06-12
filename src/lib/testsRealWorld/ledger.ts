// Ledger helpers for /admin/tests-realworld.
// Records every artifact the harness produces so we can list & delete them
// without ever touching real subscriber data.

import { supabase } from "@/integrations/supabase/client";

export type ToolType =
  | "lia"
  | "dpia"
  | "governance"
  | "biometric"
  | "dpa"
  | "ir-playbook"
  | "brief";

export interface RecordArtifactInput {
  runId: string;
  adminUserId: string;
  toolType: ToolType;
  targetTable: string;
  targetId: string;
  label?: string;
}

export interface HarnessArtifact {
  id: string;
  run_id: string;
  admin_user_id: string;
  tool_type: ToolType;
  target_table: string;
  target_id: string;
  label: string | null;
  created_at: string;
}

export async function recordArtifact(input: RecordArtifactInput): Promise<void> {
  const { error } = await supabase.from("harness_artifacts").insert({
    run_id: input.runId,
    admin_user_id: input.adminUserId,
    tool_type: input.toolType,
    target_table: input.targetTable,
    target_id: input.targetId,
    label: input.label ?? null,
  });
  if (error) {
    console.warn("[harness] failed to record artifact", error);
  }
}

export async function listArtifacts(adminUserId: string): Promise<HarnessArtifact[]> {
  const { data, error } = await supabase
    .from("harness_artifacts")
    .select("*")
    .eq("admin_user_id", adminUserId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[harness] list failed", error);
    return [];
  }
  return (data || []) as HarnessArtifact[];
}

export async function deleteArtifact(artifactId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("harness-delete", {
    body: { artifact_id: artifactId },
  });
  if (error) throw error;
}

export async function deleteAllArtifacts(): Promise<number> {
  const { data, error } = await supabase.functions.invoke("harness-delete", {
    body: { delete_all: true },
  });
  if (error) throw error;
  return (data as { deleted?: number })?.deleted ?? 0;
}
