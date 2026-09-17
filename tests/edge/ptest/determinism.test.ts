// /all-ptest v2 (DOC 261, 2026-09-14) — STAGE 0 DETERMINISM CHECK, offline.
//
// Each of the three CPPA engines is run on its `*_PERFECT` golden cases
// through the SAME call chain production uses on the deterministic path
// (risk: generateCppaRiskReport in pass-1 deterministic mode with 2R and
// refinement off; ADMT: computeAdmtV2 → gatherCitations →
// buildAuthorityExhibit → assembleAdmtV2Document; cyber:
// buildCyberDeliverables → buildCyberComponentRecommendations →
// buildCyberNextSteps → assembleCyberSkeletonDocumentV4), with the report
// date INJECTED. Three assertions per case:
//
//   (1) two runs with the same injected date hash identically — the engine
//       is deterministic on a fixed input;
//   (2) no run leaks the wall clock — the reviewer text never contains
//       today's date in either form the products print;
//   (3) the injected date is honoured — risk and cyber print it, and a
//       different injected date changes the text; ADMT has no clock, so its
//       text is identical under any date.
//
// Offline means: no database, no network. Corpus-sourced inputs (the risk
// §§ 7150–7157 corpus, the cyber § 7121 phase-in excerpt, the authority
// exhibits) are empty here; the production check (the ptest driver) covers
// them by regenerating through the product functions themselves.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  documentHash,
  firstDivergence,
  longDate,
  reviewTextOf,
  todayIso,
} from "../../../supabase/functions/ptest-run-driver/_local/review/determinism.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts";
import { ADMT_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { CYBER_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { gatherCitations } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-citations.ts";
import { vaRegistryAsProvisions } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-corpus.ts";
import { buildAuthorityExhibit } from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import {
  buildCyberComponentRecommendations,
  buildCyberNextSteps,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";

type Bag = Record<string, unknown>;

// Two injected dates, neither of which is today (guarded below).
const DATE_A = "2031-03-05";
const DATE_B = "2032-07-19";
const TODAY = todayIso();
const TODAY_LONG = longDate(TODAY);
assert(TODAY !== DATE_A && TODAY !== DATE_B, "pick injected dates that are not today");

// ── Generators (production call chains, deterministic path) ────────────────

async function genRisk(intake: Bag, reportDate: string): Promise<Bag> {
  const gen = await generateCppaRiskReport(intake, {
    buildStamp: "ptest-determinism",
    runId: "ptest-determinism",
    mode: "enforce",
    pass1: "deterministic",
    pass2rEnabled: false,
    refinementEnabled: false,
    euCorpus: [],
    reportDate,
  });
  return gen.report as Bag;
}

function genAdmt(intake: Bag): Bag {
  const computed = computeAdmtV2(intake);
  const organizationName = String(intake.organization_name ?? "").trim();
  const systemName = String(intake.system_name ?? "").trim();
  const citations = gatherCitations(computed.allFindings.map((f) => f.authority).filter(Boolean));
  const exhibit = buildAuthorityExhibit(citations, vaRegistryAsProvisions());
  const skeleton = assembleAdmtV2Document({ intake, computed, exhibit, organizationName, systemName });
  return { skeleton_document: skeleton };
}

function genCyber(intake: Bag, reportDate: string): Bag {
  const d = buildCyberDeliverables(intake);
  const recommendations = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, [], reportDate);
  const owner = String(((intake.profile ?? {}) as Bag).remediation_owner ?? "");
  const nextSteps = buildCyberNextSteps(recommendations, owner);
  const report: Bag = {
    ...(d as unknown as Bag),
    authority_exhibit: { entries: [] },
    _meta: { internal: { cyber_recommendations: { recommendations, next_steps: nextSteps } } },
  };
  const sk = assembleCyberSkeletonDocumentV4(report, intake, "", reportDate);
  return { skeleton_document: sk.document };
}

// ── Shared assertions ───────────────────────────────────────────────────────

async function assertIdentical(label: string, a: Bag, b: Bag): Promise<void> {
  const ha = await documentHash(a);
  const hb = await documentHash(b);
  assertEquals(ha.field, "skeleton_document", `${label}: expected a skeleton document, got ${ha.field}`);
  assert(ha.chars > 2_000, `${label}: reviewer text is implausibly short (${ha.chars} chars)`);
  if (ha.hash !== hb.hash) {
    const d = firstDivergence(reviewTextOf(a).text, reviewTextOf(b).text);
    throw new Error(`${label}: two runs on the same input diverge at line ${d?.line}:\n  A: ${d?.a}\n  B: ${d?.b}`);
  }
}

function assertNoClockLeak(label: string, report: Bag): void {
  const { text } = reviewTextOf(report);
  assert(!text.includes(TODAY), `${label}: reviewer text contains today's date (${TODAY}) — a clock read is not injected`);
  assert(!text.includes(TODAY_LONG), `${label}: reviewer text contains today's date (${TODAY_LONG}) — a clock read is not injected`);
}

// ── cppa-risk ───────────────────────────────────────────────────────────────

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`determinism [cppa-risk] ${c.id} — same input + same date ⇒ identical text; no clock leak; date honoured`, async () => {
    const a1 = await genRisk(c.intake, DATE_A);
    const a2 = await genRisk(c.intake, DATE_A);
    await assertIdentical(c.id, a1, a2);
    assertNoClockLeak(c.id, a1);

    // The deterministic surface shipped, with no model pass.
    const ltp = ((a1._meta as Bag)?.internal as Bag)?.ltp as Bag | undefined;
    assertEquals(ltp?.pass1_mode, "deterministic", `${c.id}: pass-1 mode`);
    assertEquals((ltp?.pass1_telemetry as Bag)?.deterministic, true, `${c.id}: pass-1 telemetry`);

    // The injected date is the assessment date the document prints.
    const text = reviewTextOf(a1).text;
    assertStringIncludes(text, DATE_A, `${c.id}: injected assessment date not printed`);
    const b = await genRisk(c.intake, DATE_B);
    assert((await documentHash(b)).hash !== (await documentHash(a1)).hash, `${c.id}: a different date must change the text`);
    assert(!reviewTextOf(b).text.includes(DATE_A), `${c.id}: the previous date must not survive a date change`);
  });
}

// ── cppa-admt ───────────────────────────────────────────────────────────────

for (const c of ADMT_PERFECT) {
  Deno.test(`determinism [cppa-admt] ${c.id} — same input ⇒ identical text; no clock read at all`, async () => {
    const a1 = genAdmt(c.intake);
    const a2 = genAdmt(c.intake);
    await assertIdentical(c.id, a1, a2);
    assertNoClockLeak(c.id, a1);
  });
}

// ── cppa-cyber ──────────────────────────────────────────────────────────────

for (const c of CYBER_PERFECT) {
  Deno.test(`determinism [cppa-cyber] ${c.id} — same input + same date ⇒ identical text; no clock leak; date honoured`, async () => {
    const a1 = genCyber(c.intake, DATE_A);
    const a2 = genCyber(c.intake, DATE_A);
    await assertIdentical(c.id, a1, a2);
    assertNoClockLeak(c.id, a1);

    const text = reviewTextOf(a1).text;
    assertStringIncludes(text, longDate(DATE_A), `${c.id}: injected report date not printed on the cover`);
    const b = genCyber(c.intake, DATE_B);
    assert((await documentHash(b)).hash !== (await documentHash(a1)).hash, `${c.id}: a different date must change the text`);
  });
}
