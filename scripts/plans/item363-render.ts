#!/usr/bin/env -S deno run --allow-read --allow-env
// ITEM 363 — ACCEPTANCE RENDER + FULL LINT BATTERY.
//
// Renders the cppa-risk document through the NEW Item 363 plan and the revised
// frame set on the complete fixture `risk-saas-clean-tuning`, then runs every
// acceptance check the CEO named:
//
//   Item 347 checks — connective-edge, no field-name subjects, no ellipses,
//                     banner logic, no flattening (frame coverage)
//   Item 363 checks — style lints (no quoted intake values, attribution
//                     integrity, banned record register, pluralisation,
//                     punctuation collisions), section order, sentence-level
//                     duplication, paragraph segmentation, analogy lints
//
// Exit code 0 = every check passed and the pair may be archived.
//
//   deno run --allow-read --allow-env scripts/plans/item363-render.ts

import { CPPA_RISK_FRAMES, CPPA_RISK_PLAN } from "../../library/prose/load.ts";
import {
  composeCppaRisk,
  CPPA_RISK_MIN_PARAGRAPHS,
  CPPA_RISK_SECTION_ORDER,
} from "../../supabase/functions/_shared/prose/plans/cppa-risk.compose.ts";
import {
  auditSectionConnectives,
  renderDocumentFromPlan,
} from "../../supabase/functions/_shared/prose/plan-render.ts";
import { buildActivityAnalytics } from "../../supabase/functions/_shared/ltp/analytic-deliverables/build.ts";
import { buildEuAuthoritySection } from "../../supabase/functions/_shared/ltp/eu-authority/build.ts";
import { CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk.ts";
import { lintFrameSet } from "../../supabase/functions/_shared/prose/frames.ts";
import { lintPlan } from "../../supabase/functions/_shared/prose/plan.ts";
import { lintDocumentStyle } from "../../supabase/functions/_shared/prose/style-lint.ts";
import {
  checkCoverage,
  collectCoverageAtoms,
} from "../../supabase/functions/_shared/prose/frame-coverage.ts";
import { resolveEngineConclusion } from "../../supabase/functions/_shared/prose/engine-conclusions.ts";

const fixture = CPPA_RISK_GOLDEN.find((f: { id: string }) => f.id === "risk-saas-clean-tuning") ??
  CPPA_RISK_GOLDEN[0];
const intake = fixture.intake as Record<string, unknown>;
const analytics = buildActivityAnalytics(intake)[0];

// Approval is simulated IN MEMORY for the render. The on-disk flip is a
// separate, recorded act once every check below is clean.
const framesInMemory = {
  ...CPPA_RISK_FRAMES,
  approved: true,
  frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
};
const planInMemory = {
  ...CPPA_RISK_PLAN,
  approved: true,
  sections: CPPA_RISK_PLAN.sections.map((s) => ({ ...s, status: "approved" as const })),
};

const composed = composeCppaRisk({
  intake,
  analytics,
  frames: framesInMemory,
  euAuthority: buildEuAuthoritySection(intake, null),
});

const doc = renderDocumentFromPlan(planInMemory, composed.inputs, {
  mentions: { primary: composed.entity, shortForm: "the company" },
  graph: composed.graph,
  strict: false,
});

// ── THE DOCUMENT ─────────────────────────────────────────────────────────
const body = doc.sections
  .map((s) => `## ${s.title}${s.degraded ? "  *(degraded)*" : ""}\n\n${s.text}`)
  .join("\n\n");
console.log(body);

// ── CHECKS ───────────────────────────────────────────────────────────────
const failures: string[] = [];
const note = (ok: boolean, name: string, detail = "") => {
  console.error(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
};

// 1. Library lints.
const frameFindings = lintFrameSet(framesInMemory);
note(frameFindings.length === 0, "frame-set lint", frameFindings.map((f) => f.detail).join(" | "));
const planFindings = lintPlan(planInMemory);
note(planFindings.length === 0, "plan lint", planFindings.map((f) => f.detail).join(" | "));

// 2. Item 347 render lints (field-name subjects, ellipses, connective edges).
const renderLint = doc.sections.flatMap((s) => s.lint);
note(
  renderLint.length === 0,
  "Item 347 render lint",
  renderLint.map((f) => `${f.section_id}/${f.rule}: ${f.detail}`).join(" | "),
);
for (const s of doc.sections) {
  const audit = auditSectionConnectives(s);
  if (audit.findings.length) {
    note(false, `connective-edge (${s.section_id})`, JSON.stringify(audit.findings));
  }
}
note(true, "connective-edge rule");

// 3. Banner logic — no section carries the banner on a complete record.
const banner = doc.sections.filter((s) => s.degraded).map((s) => s.section_id);
note(banner.length === 0, "degradation banner logic", banner.join(", "));

// 4. No flattening — every engine determination reaches the prose.
const atoms = collectCoverageAtoms({ analytics });
const coverage = checkCoverage(atoms, doc.sections.map((s) => s.text).join("\n"), {
  clauseFor: (k: string) => resolveEngineConclusion("cppa-risk", k),
});
note(
  coverage.ok && coverage.total > 0,
  "no flattening (frame coverage)",
  coverage.findings.slice(0, 6).map((f) => `${f.atom.path}=${f.atom.value}`).join(" | "),
);

// 5. Item 363 style battery.
const style = lintDocumentStyle(
  doc.sections.map((s) => ({
    section_id: s.section_id,
    title: s.title,
    text: s.text,
    spans: s.spans,
  })),
  {
    entity: composed.entity,
    expected_order: CPPA_RISK_SECTION_ORDER,
    min_paragraphs: CPPA_RISK_MIN_PARAGRAPHS,
    analogy_section_id: "corpus_analogies",
    analogy_count: composed.analogies.items.length,
  },
);
const byRule = new Map<string, string[]>();
for (const f of style) {
  const arr = byRule.get(f.rule) ?? [];
  arr.push(`${f.section_id}: ${f.detail}`);
  byRule.set(f.rule, arr);
}
for (
  const rule of [
    "quoted_intake_value",
    "banned_record_phrase",
    "attribution_missing",
    "attribution_vocabulary_thin",
    "mechanical_verb_rotation",
    "pluralisation_artifact",
    "punctuation_collision",
    "section_order",
    "sentence_duplication",
    "paragraph_segmentation",
    "analogy_missing_why",
    "analogy_missing_impact",
    "analogy_outcome_predictive",
    "analogy_empty_sentence",
  ]
) {
  const hits = byRule.get(rule) ?? [];
  note(hits.length === 0, `style/${rule}`, hits.slice(0, 4).join(" | "));
}

// 6. Span tracking is live — the verbatim guarantee survived losing the quotes.
const spanTotal = doc.sections.reduce((n, s) => n + s.spans.length, 0);
note(spanTotal > 0, "span tracking present", `${spanTotal} record-derived spans`);

console.error(
  failures.length === 0
    ? "\nITEM 363 ACCEPTANCE: ALL CHECKS PASSED"
    : `\nITEM 363 ACCEPTANCE: ${failures.length} FAILING CHECK(S)`,
);
if (failures.length) Deno.exit(1);
