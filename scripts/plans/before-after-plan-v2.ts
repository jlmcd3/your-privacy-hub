#!/usr/bin/env -S deno run --allow-read --allow-env
// ITEM 347 — BEFORE/AFTER DOCUMENT PAIR for CEO sign-off, FULL STACK.
//
// BEFORE = the REJECTED Item 339 render, reproduced from the same defects the
//          CEO called out (field-name subjects, ellipsis truncation, connectives
//          with no computed edge, a degradation banner over live determinations).
// AFTER  = the reworked Item 347 plan composed with the Item 346 frame set on
//          the SAME complete fixture: conclusion-first, thematic grouping and
//          referring expressions KEPT; connectives only where the engine's
//          reasoning graph carries a computed edge; structured record values as
//          labeled card lines; full analytic depth, nothing truncated; the
//          banner only where the determination is actually record_insufficient.
//
//   deno run --allow-read --allow-env scripts/plans/before-after-plan-v2.ts

import { CPPA_RISK_PLAN, CPPA_RISK_FRAMES } from "../../library/prose/load.ts";
import { composeCppaRisk } from "../../supabase/functions/_shared/prose/plans/cppa-risk.compose.ts";

import {
  auditSectionConnectives,
  renderDocumentFromPlan,
} from "../../supabase/functions/_shared/prose/plan-render.ts";
import { buildActivityAnalytics } from "../../supabase/functions/_shared/ltp/analytic-deliverables/build.ts";
import { CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk.ts";
import {
  checkCoverage,
  collectCoverageAtoms,
} from "../../supabase/functions/_shared/prose/frame-coverage.ts";
import { resolveEngineConclusion } from "../../supabase/functions/_shared/prose/engine-conclusions.ts";

// COMPLETE FIXTURE — every required record value present, so nothing renders as
// an omission and the pair judges the PROSE.
const fixture = CPPA_RISK_GOLDEN[0];
const intake = fixture.intake as Record<string, unknown>;
const analytics = buildActivityAnalytics(intake)[0];

// Approval is simulated IN MEMORY ONLY. On disk the plan and the frame set both
// stay `approved: false` until the CEO sign-off is recorded in the ledger.
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

const composed = composeCppaRisk({ intake, analytics, frames: framesInMemory });

const doc = renderDocumentFromPlan(planInMemory, composed.inputs, {
  mentions: { primary: composed.entity, shortForm: "the company" },
  graph: composed.graph,
});

// ── BEFORE: the rejected render, reproduced ──────────────────────────────────
const before = `### Determination *(degraded — no determination on the record)*

The company records overall risk level of Moderate, because sector is Believed-basis Pilot. In addition, triggers on the record is Admt Involved: false; Sensitive Pi: true; Public Profiling: false. However, safeguards on the record is Encryption At Rest: true; Access Control: role-based; Retention …

### Risk analysis by activity *(degraded — no determination on the record)*

Negative impacts on the record is Harm: unauthorised access; Likelihood: possible; Severity: material …. In addition, benefits on the record is Beneficiary: consumer; Statement: improved service …. As a result, weighing on the record is Outcome: benefits outweigh …`;

console.log("# ITEM 347 — cppa-risk document plan, before/after on a COMPLETE fixture\n");
console.log(`Fixture: \`${fixture.id}\` (all required record values present)`);
console.log(
  `Engine determinations: necessity=\`${composed.determinations.necessity}\`, weighing=\`${composed.determinations.weighing}\`, consequence=\`${composed.determinations.consequence}\``,
);
console.log(
  `Reasoning graph: ${composed.graph.size} computed edge(s) — ${
    composed.graph.edges.map((e) => `${e.from}→${e.to} (${e.kind}, ${e.basis})`).join("; ") || "none"
  }`,
);
if (composed.omitted_frames.length) {
  console.log(`Frames omitted (FILL-OR-OMIT): ${composed.omitted_frames.join("; ")}`);
}

console.log(`\n## BEFORE — the REJECTED Item 339 render\n\n${before}\n`);
console.log(
  "_Defects: a fabricated causal claim (\"because sector is …\"), field names as grammatical subjects, mid-content ellipsis truncation, and a degradation banner over sections that hold determinations._\n",
);

console.log(`\n## AFTER — the reworked plan + the Item 346 frames (${doc.arc.join(" → ")})\n`);

let allText = "";
let lintTotal = 0;
let connTotal = 0;
let auditFail = 0;
for (const s of doc.sections) {
  const banner = s.degraded ? " *(degraded — the engine reached no determination on this record)*" : "";
  console.log(`### ${s.title}${banner}\n`);
  console.log(`${s.text}\n`);
  const audit = auditSectionConnectives(s);
  if (!audit.ok) auditFail += audit.findings.length;
  connTotal += s.connectives.length;
  lintTotal += s.lint.length;
  allText += "\n" + s.text;
  const conn = s.connectives.length
    ? s.connectives.map((c) => `"${c.word}" ← ${c.from}→${c.to} (${c.basis})`).join("; ")
    : "none";
  console.log(
    `_status: ${s.determination_status} | connectives: ${conn} | emitted-vs-licensed: ${audit.emitted.length}/${s.connectives.length} | lint: ${s.lint.length}_\n`,
  );
}

// ── ACCEPTANCE CHECKS ────────────────────────────────────────────────────────
const atoms = collectCoverageAtoms({ analytics });
const coverage = checkCoverage(atoms, allText, {
  clauseFor: (k) => resolveEngineConclusion("cppa-risk", k),
});
const ellipsis = /(?:\u2026|\.\.\.)/.test(allText);
const fieldSubjects = /\bon the record is\b/i.test(allText);
const bannerOnLive = doc.sections.some(
  (s) => s.degraded && s.determination_status !== "record_insufficient",
);

console.log("\n## ACCEPTANCE CHECKS\n");
console.log(`1. CONNECTIVE-EDGE RULE — connectives emitted: ${connTotal}; unlicensed: ${auditFail} → ${auditFail === 0 ? "PASS" : "FAIL"}`);
console.log(`2. NO FIELD-NAME SUBJECTS — pseudo-sentences found: ${fieldSubjects ? "yes" : "none"}; render lint findings: ${lintTotal} → ${!fieldSubjects && lintTotal === 0 ? "PASS" : "FAIL"}`);
console.log(`3. NO ELLIPSIS TRUNCATION — ellipsis present: ${ellipsis ? "yes" : "no"} → ${ellipsis ? "FAIL" : "PASS"}`);
console.log(`4. DEGRADATION BANNER — banners over live determinations: ${bannerOnLive ? "yes" : "none"} → ${bannerOnLive ? "FAIL" : "PASS"}`);
console.log(`5. NO FLATTENING (Item 346 coverage) — atoms ${coverage.covered}/${coverage.total}, dropped ${coverage.findings.length} → ${coverage.ok ? "PASS" : "FAIL"}`);
for (const f of coverage.findings) console.log(`   DROPPED ${f.atom.kind} @ ${f.atom.path}: ${f.atom.value}`);

const ok = auditFail === 0 && !fieldSubjects && lintTotal === 0 && !ellipsis && !bannerOnLive &&
  coverage.ok;
console.log(`\nRESULT: ${ok ? "PASS — the pair meets the acceptance bar" : "FAIL"}`);
console.log(
  "\n_The plan and the frame set remain `approved: false` on disk; this render simulates approval in memory only._",
);
if (!ok) Deno.exit(1);
