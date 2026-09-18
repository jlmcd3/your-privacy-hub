// /admin/product-test — client for the `product-test-grade` edge function
// (doc 272 §4, §6, §9). Two actions, exactly the contract in the task brief:
//   { action: "variants", tool, fixture_id, intake } -> { variants: Variant[] }
//   { action: "grade", run_id, document_id, tool, fixture_id, variant_id,
//     intake, output, expectations, panel_companies } -> GradeResponse
//
// No model call anywhere in this module or in the function it calls (doc
// 272 §6/§8). Retry/backoff mirrors assertionRunner's invokeWithRetry
// (429 exponential backoff, abortable) — reimplemented locally rather than
// imported, since this task's edits to assertionRunner.ts are scoped to
// extracting generateForTool only (see generate.ts's header comment).

import { supabase } from "@/integrations/supabase/client";
import type { PanelTool } from "@/lib/ptestPanels/types";
import type { Check, GradeResponse, GradeSummary, Variant, VariantExpectations } from "./types";

const FN_NAME = "product-test-grade";
const RATE_LIMIT_BACKOFFS_MS = [2000, 4000, 8000];

async function invokeWithRetry(
  fn: string,
  body: Record<string, unknown>,
  abortSignal: AbortSignal,
): Promise<{ data: unknown; error: null } | { data: null; error: Error }> {
  for (let attempt = 0; attempt <= RATE_LIMIT_BACKOFFS_MS.length; attempt++) {
    if (abortSignal.aborted) return { data: null, error: new Error("Aborted") };

    const { data, error } = await supabase.functions.invoke(fn, { body });

    if (
      error &&
      (error.message?.includes("429") || (error as any)?.status === 429) &&
      attempt < RATE_LIMIT_BACKOFFS_MS.length
    ) {
      const delay = RATE_LIMIT_BACKOFFS_MS[attempt];
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        abortSignal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Aborted")); }, { once: true });
      });
      continue;
    }

    if (error) return { data: null, error: error as unknown as Error };
    return { data, error: null };
  }
  return { data: null, error: new Error("Rate limit — max retries exceeded") };
}

export async function fetchVariants(
  tool: PanelTool,
  fixtureId: string,
  intake: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Variant[]> {
  const { data, error } = await invokeWithRetry(
    FN_NAME,
    { action: "variants", tool, fixture_id: fixtureId, intake },
    signal,
  );
  if (error) throw new Error(`product-test-grade variants (${tool}/${fixtureId}): ${error.message}`);
  const d = data as { variants?: Variant[] } | null;
  if (!d?.variants) throw new Error(`product-test-grade variants (${tool}/${fixtureId}): no variants returned`);
  return d.variants;
}

export interface GradeDocumentArgs {
  runId: string;
  documentId: string;
  tool: PanelTool;
  fixtureId: string;
  variantId: string;
  intake: Record<string, unknown>;
  output: Record<string, unknown>;
  expectations: VariantExpectations;
  panelCompanies: string[];
}

export async function gradeDocument(args: GradeDocumentArgs, signal: AbortSignal): Promise<GradeResponse> {
  const { data, error } = await invokeWithRetry(
    FN_NAME,
    {
      action: "grade",
      run_id: args.runId,
      document_id: args.documentId,
      tool: args.tool,
      fixture_id: args.fixtureId,
      variant_id: args.variantId,
      intake: args.intake,
      output: args.output,
      expectations: args.expectations,
      panel_companies: args.panelCompanies,
    },
    signal,
  );
  if (error) throw new Error(`product-test-grade grade (${args.tool}/${args.fixtureId}/${args.variantId}): ${error.message}`);
  const d = data as { checks?: Check[]; summary?: GradeSummary; persist_error?: string } | null;
  if (!d?.checks || !d?.summary) throw new Error(`product-test-grade grade (${args.tool}/${args.fixtureId}/${args.variantId}): malformed response`);
  return { checks: d.checks, summary: d.summary, persist_error: d.persist_error };
}
