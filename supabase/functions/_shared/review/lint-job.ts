// /all-ptest v2 (DOC 261, 2026-09-14) — STAGE 1 LINT AS A JOB.
//
// No model. Reads the persisted report, runs the deterministic lint against
// the product's profile, and persists the hits as a `LINT` review row (so the
// batch page lists it beside the workers) and as ptest_findings rows with
// fix_class "presentation" pre-set. Also records the document hash (Stage 0)
// so a rerun can compare.

import { fetchReviewDocument, type ReviewTool } from "./document-source.ts";
import { lintDocument, type LintHit } from "./lint.ts";
import { lintProfileFor } from "./lint-profiles.ts";
import { documentHash } from "./determinism.ts";
import { PTEST_V2_PROMPT_VERSION } from "./prompts-v2.ts";
import type { RenderedSkeletonDocument } from "../prose/skeleton-render.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

export interface LintJobOpts {
  tool: ReviewTool;
  assessmentId: string;
  batchId: string;
  companyName?: string | null;
  userId?: string | null;
  jobId?: string | null;
}

/** A lint hit in the finding shape the page and the classifier read. */
export function lintHitToFinding(h: LintHit, i: number) {
  return {
    id: `lint-${i + 1}`,
    section: h.section_id,
    defect_type: "editorial",
    severity: h.severity === "defect" ? "editorial" : "review",
    confidence: "high",
    quote: h.quote,
    why: `${h.rule}/${h.check}: ${h.detail}`,
    block_key: h.block_key,
    rule: h.rule,
    check: h.check,
    lint_severity: h.severity,
  };
}

export async function runLintJob(admin: Admin, opts: LintJobOpts): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const doc = await fetchReviewDocument(admin, opts.tool, opts.assessmentId);
  if ("error" in doc) return { ok: false, status: doc.status, body: { error: doc.error } };
  const rd = (doc.report && typeof doc.report === "object") ? doc.report as Record<string, unknown> : {};
  const skeleton = rd.skeleton_document as RenderedSkeletonDocument | undefined;
  const profile = lintProfileFor(opts.tool);
  const hash = await documentHash(rd);

  const common = {
    batch_id: opts.batchId,
    tool_slug: opts.tool,
    assessment_id: doc.id,
    company_name: opts.companyName ?? null,
    reviewer: "LINT",
    worker: "LINT",
    vendor: null,
    prompt_version: PTEST_V2_PROMPT_VERSION,
    run_by: opts.userId ?? null,
    model: null,
    effort: null,
    overall: null,
    dimension_scores: null,
    overall_score: null,
    score_source: "derived_only",
    dropped_unlocatable: 0,
  };

  if (!skeleton || !profile) {
    const note = !skeleton ? "no skeleton document on the record" : `no lint profile for ${opts.tool}`;
    const { error } = await admin.from("ptest_reviews").insert({
      ...common, findings: [], double_check: note, derived_score: null,
      usage: { document_chars: doc.originalLength, document_hash: hash.hash, lint_version: null },
      score_notes: note, error: null,
    });
    if (error) console.error(`[ptest-lint] persist failed — ${error.message}`);
    return { ok: true, status: 200, body: { ok: true, skipped: note, document_hash: hash.hash } };
  }

  const r = lintDocument(skeleton, profile, (doc.intake && typeof doc.intake === "object") ? doc.intake as Record<string, unknown> : undefined);
  const findings = r.hits.map(lintHitToFinding);
  const { error } = await admin.from("ptest_reviews").insert({
    ...common,
    findings,
    double_check: `${r.defects} defect(s), ${r.reviews} review item(s); ${r.version}`,
    derived_score: Math.max(0, 100 - r.defects * 2),
    score_notes: null,
    usage: { document_chars: doc.originalLength, document_hash: hash.hash, lint_version: r.version, by_rule: r.by_rule },
    error: null,
  });
  if (error) console.error(`[ptest-lint] review persist failed — ${error.message}`);

  if (r.hits.length) {
    const rows = r.hits.map((h, i) => ({
      batch_id: opts.batchId,
      tool_slug: opts.tool,
      assessment_id: doc.id,
      worker: "LINT",
      vendor: null,
      job_id: opts.jobId ?? null,
      finding_id: `lint-${i + 1}`,
      status: "validated",
      kind: h.check,
      severity: h.severity === "defect" ? "editorial" : "review",
      block_key: h.block_key,
      quote: h.quote,
      why: h.detail,
      fix_class: "presentation",
      rule_ref: `${h.rule}/${h.check}`,
      lint_rule: h.rule,
    }));
    const { error: fErr } = await admin.from("ptest_findings").insert(rows);
    if (fErr) console.error(`[ptest-lint] findings persist failed — ${fErr.message}`);
  }
  return { ok: true, status: 200, body: { ok: true, defects: r.defects, reviews: r.reviews, by_rule: r.by_rule, document_hash: hash.hash } };
}
