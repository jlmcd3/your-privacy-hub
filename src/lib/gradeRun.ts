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
import type { ToolSlug } from "@/lib/sampleFixtures";
import { invokeWithTimeout } from "@/lib/sampleGenerators";

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
  /** DOC 252 H1 — the grader instrument (GRADER_CONTEXT_VERSION) that
   *  produced these scores, as reported by grade-single-assessment. */
  graderContextVersion?: string | null;
}

export async function gradeRun(
  slug: ToolSlug,
  sourceRowId: string,
  fixtureLabel: string,
): Promise<GradeResult | null> {
  const tool = SLUG_TO_GRADER_TOOL[slug];
  if (!tool) return null;
  try {
    // FREEZE FIX (2026-08-30): grading runs two model calls server-side and
    // was awaited inline in the batch loop with NO client timeout — a hung
    // grading connection froze the entire remaining batch. Dual-model
    // grading legitimately takes 1–3 minutes; 5 minutes of silence is a
    // failure of THIS grade, never of the batch.
    // BATCH bcf0a706 (2026-09-11): seven grades of one company fired in the
    // same second and every one came back "Failed to send a request to the
    // Edge Function" — a transport failure before the function ran, not a
    // grading result. A send failure is retried twice with a short backoff;
    // a timeout or a function error is not.
    // BOOT_ERROR RETRY (2026-09-11, Lovable): a redeploy landing mid-batch
    // can make one cold start fail with 503 BOOT_ERROR even though the
    // function is healthy. That transient blip used to lose the grade for
    // that product. Merged 2026-09-11: both transient classes share the one
    // retry loop (two retries, backoff); a timeout or a real function error
    // is still never retried.
    const isBootError = (msg: string) =>
      /BOOT_ERROR/i.test(msg) || /\b503\b/.test(msg) || /failed to start/i.test(msg);
    let data: unknown = null;
    let error: { message: string } | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const r = await invokeWithTimeout(
        "grade-single-assessment",
        {
          tool,
          assessment_id: sourceRowId,
          fixture_label: fixtureLabel,
          dry_run: true,
        },
        300_000,
      );
      data = r.data;
      error = r.error;
      const msg = error?.message ?? "";
      const transient = !!error && !r.timedOut && (/failed to send a request/i.test(msg) || isBootError(msg));
      if (!transient || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, 4_000 * attempt));
    }
    if (error) return { tool, claude: null, gpt: null, mean: null, error: error.message };
    const p = (data as any)?.payload ?? {};
    const claude = typeof p.claude?.overall_score === "number" ? p.claude.overall_score : null;
    const gpt = typeof p.gpt?.overall_score === "number" ? p.gpt.overall_score : null;
    const mean = typeof (data as any)?.mean_score === "number" ? (data as any).mean_score : null;
    const err = p.claude?.error ?? p.gpt?.error ?? (data as any)?.error;
    const version = (data as any)?.grader_context_version ?? p.grader_context_version;
    return {
      tool,
      claude,
      gpt,
      mean,
      payload: p,
      graderContextVersion: typeof version === "string" && version ? version : null,
      error: claude == null && gpt == null ? String(err ?? "no score") : undefined,
    };
  } catch (e) {
    return { tool, claude: null, gpt: null, mean: null, error: (e as Error).message };
  }
}
