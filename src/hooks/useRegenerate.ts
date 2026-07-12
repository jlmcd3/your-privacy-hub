import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TABLE_MAP } from "./useRefineMode";

export type RegenerateOutcome =
  | { kind: "accepted"; runsRemaining?: number }
  | { kind: "budget_exhausted" }
  | { kind: "locked_field_changed"; field: string }
  | { kind: "error"; message: string };

// Proven pattern from the meter test harness: 60s AbortController; on timeout,
// probe the meter — if runs_used advanced or status went to 'processing', the
// call was accepted (background invocation) and we should navigate to result,
// not retry (a blind retry double-spends a run). Never auto-retry any 4xx.
export function useRegenerate() {
  const [busy, setBusy] = useState(false);

  async function regenerate(args: {
    toolType: string;
    assessmentId: string;
    editedFields: Record<string, unknown>;
    priorRunsUsed: number;
    // WS6 v2.1: supplemental capture on regeneration. Absent/empty →
    // omitted from payload entirely (preserves first-run parity).
    supplementalResponses?: Array<{ ref_field?: string; ask: string; response: string }>;
    supplementalContext?: string;
  }): Promise<RegenerateOutcome> {
    setBusy(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60_000);
    try {
      // WS6: fold supplementals into the edits payload under stable keys so
      // regenerate-assessment routes them per tool (intake_data for the 8
      // JSON-intake tools; dedicated columns for LIA).
      const supplementalEdits: Record<string, unknown> = {};
      const suppList = (args.supplementalResponses ?? []).filter(
        (e) => e && typeof e.response === "string" && e.response.trim().length > 0,
      );
      if (suppList.length > 0) supplementalEdits.supplemental_responses = suppList;
      const suppCtx = (args.supplementalContext ?? "").trim();
      if (suppCtx.length > 0) supplementalEdits.supplemental_context = suppCtx;

      const { data, error } = await supabase.functions.invoke("regenerate-assessment", {
        body: {
          tool_type: args.toolType,
          assessment_id: args.assessmentId,
          edited_fields: { ...args.editedFields, ...supplementalEdits },
        },
      });
      if (error) {
        // supabase-js surfaces edge non-2xx as FunctionsHttpError; inspect context.
        const ctx: any = (error as any).context;
        const status: number | undefined = ctx?.status;
        let bodyJson: any = null;
        try {
          if (ctx?.response && typeof ctx.response.json === "function") {
            bodyJson = await ctx.response.clone().json();
          }
        } catch {/* ignore */}
        if (status === 402) return { kind: "budget_exhausted" };
        if (status === 409) {
          return { kind: "locked_field_changed", field: bodyJson?.field ?? "(unknown)" };
        }
        // Timeout / network → probe meter before giving up.
        const probed = await probeAccepted(args);
        if (probed) return { kind: "accepted" };
        return { kind: "error", message: error.message || "request_failed" };
      }
      return { kind: "accepted", runsRemaining: (data as any)?.runs_remaining };
    } catch (e: any) {
      if (e?.name === "AbortError") {
        const probed = await probeAccepted(args);
        if (probed) return { kind: "accepted" };
        return { kind: "error", message: "timeout" };
      }
      return { kind: "error", message: e?.message ?? "unknown" };
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }

  return { regenerate, busy };
}

async function probeAccepted(args: {
  toolType: string;
  assessmentId: string;
  priorRunsUsed: number;
}): Promise<boolean> {
  try {
    const [{ data: meter }, { data: row }] = await Promise.all([
      (supabase as any)
        .from("tool_run_meter")
        .select("runs_used")
        .eq("tool_type", args.toolType)
        .eq("assessment_id", args.assessmentId)
        .maybeSingle(),
      (supabase as any)
        .from(TABLE_MAP[args.toolType])
        .select("status")
        .eq("id", args.assessmentId)
        .maybeSingle(),
    ]);
    if (meter?.runs_used && meter.runs_used > args.priorRunsUsed) return true;
    if (row?.status === "processing") return true;
    return false;
  } catch {
    return false;
  }
}
