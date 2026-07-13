// RC-B.1 B1.4 — client caller for the RC-B revision transport. Posts
// `mode:"revision"` + answered_items to regenerate-assessment, which folds
// answers into supplemental_responses (with item_id) and invokes the tool
// generator; the generator's revision-mode short-circuit does the rest.
import { supabase } from "@/integrations/supabase/client";

export interface AnsweredItem {
  item_id: string;
  value: unknown;
  evidence?: string;
}

export type SubmitRevisionOutcome =
  | { kind: "accepted"; answered: number }
  | { kind: "revisions_disabled" }
  | { kind: "unknown_item_id"; item_id: string }
  | { kind: "no_answered_items" }
  | { kind: "not_found_or_forbidden" }
  | { kind: "error"; message: string };

export async function submitRevisionAnswers(args: {
  toolType: string;
  assessmentId: string;
  answered: AnsweredItem[];
}): Promise<SubmitRevisionOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke("regenerate-assessment", {
      body: {
        tool_type: args.toolType,
        assessment_id: args.assessmentId,
        mode: "revision",
        answered_items: args.answered,
      },
    });
    if (error) {
      const ctx: any = (error as any).context;
      const status: number | undefined = ctx?.status;
      let bodyJson: any = null;
      try {
        if (ctx?.response && typeof ctx.response.json === "function") {
          bodyJson = await ctx.response.clone().json();
        }
      } catch { /* ignore */ }
      if (status === 409 && bodyJson?.error === "revisions_disabled") return { kind: "revisions_disabled" };
      if (bodyJson?.error === "unknown_item_id") return { kind: "unknown_item_id", item_id: bodyJson?.item_id ?? "" };
      if (bodyJson?.error === "no_answered_items") return { kind: "no_answered_items" };
      if (bodyJson?.error === "not_found_or_forbidden") return { kind: "not_found_or_forbidden" };
      return { kind: "error", message: error.message || bodyJson?.error || "request_failed" };
    }
    return { kind: "accepted", answered: (data as any)?.answered ?? args.answered.length };
  } catch (e: any) {
    return { kind: "error", message: e?.message ?? "unknown" };
  }
}
