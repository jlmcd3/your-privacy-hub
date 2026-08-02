#!/usr/bin/env -S deno run --allow-read --allow-env
// ITEM 368(4) — SPAN-SAFE POLISH: OBSERVE-MODE BEFORE/AFTER SAMPLE.
//
// Renders the Item 363 acceptance fixture, then runs the polish pass in
// FORCED observe mode with a DETERMINISTIC, offline rewriter (no model call)
// so the CEO review sample is reproducible byte-for-byte. Nothing ships: the
// pass returns the deterministic text and the candidate side by side.
//
//   deno run --allow-read --allow-env scripts/prose/polish-sample.ts

import { CPPA_RISK_FRAMES, CPPA_RISK_PLAN } from "../../library/prose/load.ts";
import {
  composeCppaRisk,
  CPPA_RISK_MIN_PARAGRAPHS,
  CPPA_RISK_SECTION_ORDER,
} from "../../supabase/functions/_shared/prose/plans/cppa-risk.compose.ts";
import { renderDocumentFromPlan } from "../../supabase/functions/_shared/prose/plan-render.ts";
import { buildActivityAnalytics } from "../../supabase/functions/_shared/ltp/analytic-deliverables/build.ts";
import { buildEuAuthoritySection } from "../../supabase/functions/_shared/ltp/eu-authority/build.ts";
import { CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk.ts";
import {
  runSpanSafePolish,
  SPAN_SAFE_POLISH_VERSION,
} from "../../supabase/functions/_shared/prose/span-safe-polish.ts";

const fixture = CPPA_RISK_GOLDEN.find((f: { id: string }) => f.id === "risk-saas-clean-tuning") ??
  CPPA_RISK_GOLDEN[0];
const intake = fixture.intake as Record<string, unknown>;
const analytics = buildActivityAnalytics(intake)[0];

const frames = {
  ...CPPA_RISK_FRAMES,
  approved: true,
  frames: CPPA_RISK_FRAMES.frames.map((f) => ({ ...f, status: "approved" as const })),
};
const plan = {
  ...CPPA_RISK_PLAN,
  approved: true,
  sections: CPPA_RISK_PLAN.sections.map((s) => ({ ...s, status: "approved" as const })),
};

const composed = composeCppaRisk({
  intake,
  analytics,
  frames,
  euAuthority: buildEuAuthoritySection(intake, null),
});
const doc = renderDocumentFromPlan(plan, composed.inputs, {
  mentions: { primary: composed.entity, shortForm: "the company" },
  graph: composed.graph,
  strict: false,
});

/**
 * OFFLINE REWRITER — connective tissue only, and it never sees span text.
 * Stands in for the model so the sample is deterministic.
 */
const rewrite = (call: { segment: { text: string } }) =>
  Promise.resolve(
    call.segment.text
      // Connective tissue and rhythm only — no facts, numbers, names, dates.
      .replace(/\bIn addition,\s*/g, "Further, ")
      .replace(/\bIt is the case that\s*/g, "")
      .replace(/\bTaken together, this assessment establishes\b/g,
        "Taken together, the assessment establishes")
      .replace(/\bThat determination follows\b/g, "That determination therefore follows")
      .replace(/\bThis is because\b/g, "That follows because"),
  );

const res = await runSpanSafePolish(
  doc.sections.map((s) => ({
    section_id: s.section_id,
    title: s.title,
    text: s.text,
    spans: s.spans,
  })),
  {
    product: "cppa-risk",
    force: true, // observe-only; `force` never ships, it only runs the pass
    rewrite,
    lint: {
      entity: composed.entity,
      expected_order: CPPA_RISK_SECTION_ORDER,
      min_paragraphs: CPPA_RISK_MIN_PARAGRAPHS,
      analogy_section_id: "corpus_analogies",
      analogy_count: composed.analogies.items.length,
    },
  },
);

console.log(`# Span-safe polish — observe-mode sample`);
console.log(`\nversion: ${SPAN_SAFE_POLISH_VERSION}\nmode: ${res.mode}\nfixture: ${fixture.id}\n`);
for (const s of res.sections) {
  const changed = s.candidate !== null && s.candidate !== s.text;
  console.log(`\n## ${s.section_id}`);
  console.log(
    `ran=${s.ran} accepted=${s.accepted} shipped=${s.shipped_surface} changed=${changed} rejects=${s.reject_findings.length}`,
  );
  if (s.reject_findings.length) {
    console.log("\nrejected because:\n");
    for (const f of s.reject_findings.slice(0, 6)) console.log(`- ${f.rule}: ${f.detail}`);
  }
  if (changed) {
    console.log("\n### BEFORE\n\n" + s.text + "\n\n### AFTER (candidate, not shipped)\n\n" + s.candidate);
  }
}
const changedCount = res.sections.filter((s) => s.candidate && s.candidate !== s.text).length;
console.error(
  `sections=${res.sections.length} candidates=${res.sections.filter((s) => s.candidate).length} changed=${changedCount} accepted=${res.sections.filter((s) => s.accepted).length} shipped_polished=${res.sections.filter((s) => s.shipped_surface === "polished").length}`,
);
