// adminRevisionApi — quality-batch2 admin surface: submits open-item answers
// via the admin-submit-revision edge proxy. Separate from
// src/lib/revisionApi.ts (customer path) by design; the customer path stays
// untouched and gated by REVISIONS_ENABLED.
import { supabase } from "@/integrations/supabase/client";

export interface AdminAnsweredItem {
  item_id: string;
  value: unknown;
  evidence?: string;
}

export type AdminSubmitRevisionOutcome =
  | { kind: "accepted"; payload: unknown }
  | { kind: "error"; status: number; message: string; payload?: unknown };

export async function adminSubmitRevisionAnswers(args: {
  toolType: string;
  assessmentId: string;
  answered: AdminAnsweredItem[];
}): Promise<AdminSubmitRevisionOutcome> {
  try {
    // admin-submit-revision now always returns HTTP 200 with an envelope
    // { ok, upstream_status, payload, dispatch_nonce }. This avoids
    // FunctionsHttpError swallowing the upstream error code.
    const { data, error } = await supabase.functions.invoke("admin-submit-revision", {
      body: {
        tool_type: args.toolType,
        assessment_id: args.assessmentId,
        answered_items: args.answered,
      },
    });
    if (error) {
      return { kind: "error", status: 0, message: error.message };
    }
    const env = data as { ok?: boolean; upstream_status?: number; payload?: any } | null;
    if (env && env.ok === false) {
      const p = env.payload ?? {};
      const code = p?.error ?? "unknown_error";
      const msg = p?.message ? `${code}: ${p.message}` : code;
      return { kind: "error", status: env.upstream_status ?? 500, message: msg, payload: env.payload };
    }
    return { kind: "accepted", payload: env?.payload ?? data };
  } catch (e: any) {
    return { kind: "error", status: 0, message: e?.message ?? "unknown" };
  }
}

export interface AdminAssessment {
  id: string;
  user_id: string | null;
  status: string;
  intake: Record<string, unknown>;
  report_data: any;
  open_items: any[];
  info_needed: any[];
}

export async function adminFetchAssessment(args: {
  toolType: string;
  assessmentId: string;
}): Promise<{ kind: "ok"; row: AdminAssessment } | { kind: "error"; message: string }> {
  const { data, error } = await supabase.functions.invoke("admin-fetch-assessment", {
    body: { tool_type: args.toolType, assessment_id: args.assessmentId },
  });
  if (error) return { kind: "error", message: error.message };
  return { kind: "ok", row: data as AdminAssessment };
}

export async function adminSeedQualityBatch2(args: {
  toolType: string;
  fixtureId?: string;
}): Promise<{ kind: "ok"; assessmentId: string; payload: any } | { kind: "error"; message: string }> {
  const { data, error } = await supabase.functions.invoke("admin-quality-batch2-seed", {
    body: { tool_type: args.toolType, fixture_id: args.fixtureId },
  });
  if (error) return { kind: "error", message: error.message };
  return { kind: "ok", assessmentId: (data as any)?.assessment_id, payload: data };
}
