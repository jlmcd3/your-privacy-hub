/**
 * ALL-PRODUCTS-TEST — dual-model grading for every product.
 *
 * Every product tested on /admin/all-products-test goes through the SAME
 * Claude + GPT scoring pass: the panel finishes a run, then calls
 * `grade-single-assessment` with the product slug and the generated row (or
 * session) id. The nine skeleton products are graded from their assessment
 * row; DPA from its document row; RoPA and the two Notice builders from their
 * session shape (assembled register / generated HTML), which the grader
 * fetches server-side. Grading is a dry run — it never writes a baseline.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ToolSlug } from "@/lib/sampleFixtures";

/** Panel slug → grade-single-assessment tool slug. */
export const SLUG_TO_GRADER_TOOL: Partial<Record<ToolSlug, string>> = {
  cppa_risk: "cppa-risk",
  cppa_cyber: "cppa-cyber",
  cppa_admt: "cppa-admt",
  governance: "governance",
  dpia: "dpia",
  li_assessment: "lia",
  ir_playbook: "ir-playbook",
  biometric: "biometric",
  dpa: "dpa",
  ropa: "ropa",
  us_notice: "us-notice",
  eu_notice: "eu-notice",
  // ALL-PRODUCTS GRADING FIX (2026-08-29): registration was the one
  // dispatchable product with no grader mapping, so panel runs logged
  // "grading skipped". grade-single-assessment now accepts it (fetches
  // intake_data + result_summary, status 'completed').
  registration: "registration",
};

export interface GradeResult {
  tool: string;
  claude: number | null;
  gpt: number | null;
  mean: number | null;
  error?: string;
  /** Full grade payload (dimension scores, findings counts, critical
   *  failures per model) — stored by the outcome table for the
   *  downloadable analysis. */
  payload?: unknown;
}

export async function gradeRun(
  slug: ToolSlug,
  sourceRowId: string,
  fixtureLabel: string,
): Promise<GradeResult | null> {
  const tool = SLUG_TO_GRADER_TOOL[slug];
  if (!tool) return null;
  try {
    const { data, error } = await supabase.functions.invoke("grade-single-assessment", {
      body: {
        tool,
        assessment_id: sourceRowId,
        fixture_label: fixtureLabel,
        dry_run: true,
      },
    });
    if (error) return { tool, claude: null, gpt: null, mean: null, error: error.message };
    const p = (data as any)?.payload ?? {};
    const claude = typeof p.claude?.overall_score === "number" ? p.claude.overall_score : null;
    const gpt = typeof p.gpt?.overall_score === "number" ? p.gpt.overall_score : null;
    const mean = typeof (data as any)?.mean_score === "number" ? (data as any).mean_score : null;
    const err = p.claude?.error ?? p.gpt?.error ?? (data as any)?.error;
    return { tool, claude, gpt, mean, payload: p, error: claude == null && gpt == null ? String(err ?? "no score") : undefined };
  } catch (e) {
    return { tool, claude: null, gpt: null, mean: null, error: (e as Error).message };
  }
}
