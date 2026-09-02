// DOC 144 (2026-09-02) — the CEO-ratified CPPA Risk structure redesign,
// spine/assembler half (doc 143 is the design record):
//
//   1. Appendix restructure — necessity matrix folded into § 3.B, Appendix G
//      retired (aggregation list onto the checklist page), survivors
//      re-lettered A, B, C, old E→D, old F→E, old H→F; empty-register
//      suppression for the risk-register appendix.
//   2. The § 2.A customer-voice block (kind/surface `customer_voice`).
//   3. Landing rhythm — "[Q] " landing lines + "Governing requirement."
//      run-in paragraphs carrying the ratified law sentences verbatim.
//   4. The page-2 dashboard operands on the extended exec panel.
//   5. ENGINE_KEY_REMAP — the engine's v5.2.1 coordinates land on v5.3
//      spine blocks of the right kind.
//
// Engine invocation matches rk3-b: deterministic Pass-1, EMPTY_RISK_CORPUS —
// zero model calls, zero DB access.

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-corpus.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import {
  RISK_PLAIN_MEANING,
  SKELETON_SECTIONS,
} from "../../../supabase/functions/_shared/prose/plans/cppa-risk.spine.ts";
import {
  assembleRiskSkeletonDocument,
  buildCustomerVoiceBlock,
  ENGINE_KEY_REMAP,
  type RiskSkeletonResult,
} from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { DISPOSITION_LABEL } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const BUILD_STAMP = "doc144-structure-redesign";

async function assemble(intake: Bag): Promise<RiskSkeletonResult> {
  const result = await generateCppaRiskReport(intake, {
    pass1: "deterministic",
    riskCorpus: EMPTY_RISK_CORPUS,
    buildStamp: BUILD_STAMP,
    mode: "enforce",
  });
  return assembleRiskSkeletonDocument(result.report as Bag, intake);
}

/** A zero-risk sparse record: engaged trigger, no a5 rows, no ADMT. */
const SPARSE_INTAKE: Bag = {
  entity_name: "Sparse Co",
  primary_activity_name: "Basic web analytics",
  subject_anchor: "site visitors",
  primary_activity_purpose: "Understand aggregate site usage",
  q4_pi_categories: ["Device identifiers"],
  q5_sell_share: "Yes — sell only",
  processing_status: "Ongoing",
  processing_start_date: "2026-02-01",
};

// ── 1. Appendix restructure ─────────────────────────────────────────────────

Deno.test("doc144 — appendix set and re-lettering (full fixture)", async () => {
  const sk = await assemble(CPPA_RISK_PERFECT[0].intake as Bag);
  const titles = sk.document.sections
    .map((s) => s.title)
    .filter((t) => t.startsWith("Appendix"));
  assertEquals(titles, [
    "Appendix A — Factor, Determination, and Authority Matrix",
    "Appendix B — Persuasive Authority (Analogous Enforcement)",
    "Appendix C — Processing and Data Inventory",
    "Appendix D — Privacy Risk Register and Safeguard Mapping",
    "Appendix E — ADMT Technical and Decision Record",
    "Appendix F — Materials Considered",
  ].filter((t) => titles.includes(t)));
  // D (necessity) and G (submission support) are gone as appendices.
  assert(!titles.some((t) => t.includes("Necessity and Minimization")), "necessity matrix still an appendix");
  assert(!titles.some((t) => t.includes("Submission Support Record")), "Appendix G survived");
  const ids = sk.document.sections.map((s) => s.id);
  assert(!ids.includes("appendix_b"), "appendix_b section survived");
  assert(!ids.includes("appendix_e"), "appendix_e section survived");
  // The necessity determinations table now renders inside § 3.B.
  const iii = sk.document.sections.find((s) => s.id === "iii_analysis");
  assertExists(iii);
  assert(
    iii.paragraphs.some((p) => p.table?.surface === "necessity_matrix"),
    "necessity_matrix table absent from § 3",
  );
  // No stale letters anywhere in the assembled text.
  const body = skeletonDocumentToText(sk.document);
  assert(!body.includes("Appendix G"), "stale Appendix G reference");
  assert(!body.includes("Appendix H"), "stale Appendix H reference");
});

Deno.test("doc144 — empty-register suppression: zero-risk record drops the register appendix entirely", async () => {
  const sk = await assemble(SPARSE_INTAKE);
  const ids = sk.document.sections.map((s) => s.id);
  assert(!ids.includes("appendix_c"), "risk-register appendix rendered on a zero-risk record");
  const body = skeletonDocumentToText(sk.document);
  assert(
    body.includes("No risk to consumers’ privacy is identified in the information provided"),
    "§ 4.A inline zero-risk posture absent",
  );
});

Deno.test("doc144 — the checklist page carries the reporting-period aggregation list (both fixtures)", async () => {
  for (const intake of [CPPA_RISK_PERFECT[0].intake as Bag, SPARSE_INTAKE]) {
    const sk = await assemble(intake);
    const chk = sk.document.sections.find((s) => s.id === "agency_submission_checklist");
    assertExists(chk);
    const agg = chk.paragraphs.find((p) =>
      p.table?.surface === "business_level_submission_outstanding"
    )?.table;
    assertExists(agg, "aggregation table absent from the checklist page");
    assertEquals(agg.rows.length, 4);
    assert(agg.title.includes("reporting-period aggregation"), agg.title);
    // It sits between the § 7157(b) extract and the attestation paragraph.
    const kinds = chk.paragraphs.map((p) => p.table?.surface ?? p.kind);
    assertEquals(kinds, [
      "skeleton",
      "agency_submission_checklist",
      "business_level_submission_outstanding",
      "skeleton",
    ]);
  }
});

// ── 2. The customer-voice block ─────────────────────────────────────────────

Deno.test("doc144 — § 2.A customer-voice block: kind, attribution, quoted rows", async () => {
  const sk = await assemble(CPPA_RISK_PERFECT[0].intake as Bag);
  const ii = sk.document.sections.find((s) => s.id === "ii_information");
  assertExists(ii);
  const cv = ii.paragraphs.find((p) => p.kind === "customer_voice");
  assertExists(cv, "customer_voice paragraph absent");
  const lines = cv.text.split("\n");
  assertEquals(lines[0], "In Sierra Outfitters, Inc.’s words");
  assert(lines[1].startsWith("Processing. “") && lines[1].endsWith("”"), lines[1]);
  assert(lines[2].startsWith("Purpose. “") && lines[2].endsWith("”"), lines[2]);
  // The intro sentence rides with the block, and the specificity
  // determination still follows it.
  const texts = ii.paragraphs.map((p) => p.text);
  const introIdx = texts.findIndex((t) =>
    t.includes("The Company’s own statement of the processing and its purpose is recorded below and is quoted as given.")
  );
  const cvIdx = ii.paragraphs.findIndex((p) => p.kind === "customer_voice");
  assert(introIdx >= 0 && introIdx < cvIdx, "intro sentence must precede the block");
});

Deno.test("doc144 — customer-voice unit: fallback attribution and no-padding omission", () => {
  const both = buildCustomerVoiceBlock({
    entity_name: "Acme",
    primary_activity_name: "Thing.",
    primary_activity_purpose: "Why",
  });
  assertEquals(both, "In Acme’s words\nProcessing. “Thing”\nPurpose. “Why”");
  const noName = buildCustomerVoiceBlock({ primary_activity_purpose: "Why" });
  assertEquals(noName, "In the Company’s words\nPurpose. “Why”");
  assertEquals(buildCustomerVoiceBlock({ entity_name: "Acme" }), null);
});

// ── 3. Landing rhythm ───────────────────────────────────────────────────────

Deno.test("doc144 — [Q] landing lines and Governing-requirement paragraphs render", async () => {
  const sk = await assemble(CPPA_RISK_PERFECT[0].intake as Bag);
  const body = skeletonDocumentToText(sk.document);
  for (const q of [
    "[Q] What is being processed, about whom, and why — in the Company’s own words.",
    "[Q] Does the Company’s account satisfy each element the regulation tests?",
    "[Q] Who approved this assessment, when must it be revisited, and what must be submitted to the regulator?",
  ]) assert(body.includes(q), `landing line absent: ${q}`);
  for (const g of [
    "Governing requirement. Section 7152(a)(1) requires the assessment to state the Company’s purpose",
    "Governing requirement. Section 7152(a)(3)(A) requires the report to identify how the Company collects",
    "Governing requirement. Section 7152(a)(3)(F) requires the report to identify the service providers",
    "Governing requirement. Section 7152(a)(3)(B) requires the report to identify how long each category",
    "Governing requirement. Section 7150(b) enumerates the processing activities",
    "Governing requirement. Section 7152(a)(3)(E) requires the report to identify the disclosures",
    "Governing requirement. Section 7155(a)(1) requires a risk assessment before the Company initiates",
    "Governing requirement. Section 7155(a)(2) requires review at least once every three years",
    "Governing requirement. Section 7155(c) requires the Company to retain original and updated risk assessments",
  ]) assert(body.includes(g), `governing-requirement paragraph absent: ${g}`);
});

// ── 4. Dashboard operands ───────────────────────────────────────────────────

Deno.test("doc144 — extended exec panel: tallies + plain_meaning, projected onto the cover", async () => {
  const sk = await assemble(CPPA_RISK_PERFECT[0].intake as Bag);
  const panel = sk.exec_panel;
  assert(panel.triggers_engaged_count >= 1, "no engaged trigger counted on a perfect fixture");
  assert(panel.risks_identified_count >= 1, "no identified risk counted on a perfect fixture");
  assert(panel.benefits_credited_count >= 1, "no credited benefit counted on a perfect fixture");
  assertEquals(panel.plain_meaning, RISK_PLAIN_MEANING[panel.disposition]);
  const cover = sk.document.sections.find((s) => s.id === "cover");
  const table = cover?.paragraphs.find((p) => p.table?.surface === "exec_status_panel")?.table;
  assertExists(table);
  assertEquals(table.rows.find((r) => r[0] === "Triggers engaged")?.[1], String(panel.triggers_engaged_count));
  assertEquals(table.rows.find((r) => r[0] === "Risks identified")?.[1], String(panel.risks_identified_count));
  assertEquals(table.rows.find((r) => r[0] === "Benefits credited")?.[1], String(panel.benefits_credited_count));
  assertEquals(table.rows.find((r) => r[0] === "What this means")?.[1], panel.plain_meaning);
});

Deno.test("doc144 — zero tallies are skipped on the cover (no-padding), plain_meaning still renders", async () => {
  const sk = await assemble(SPARSE_INTAKE);
  const cover = sk.document.sections.find((s) => s.id === "cover");
  const table = cover?.paragraphs.find((p) => p.table?.surface === "exec_status_panel")?.table;
  assertExists(table);
  assertEquals(sk.exec_panel.risks_identified_count, 0);
  assert(!table.rows.some((r) => r[0] === "Risks identified"), "zero risk tally rendered");
  assert(!table.rows.some((r) => r[0] === "Benefits credited"), "zero benefit tally rendered");
  assertEquals(
    table.rows.find((r) => r[0] === "What this means")?.[1],
    RISK_PLAIN_MEANING["additional information required"],
  );
});

Deno.test("doc144 — RISK_PLAIN_MEANING covers exactly the engine's disposition vocabulary", () => {
  assertEquals(
    Object.keys(RISK_PLAIN_MEANING).sort(),
    Object.keys(DISPOSITION_LABEL).sort(),
  );
});

// ── 5. Engine coordinate translation ────────────────────────────────────────

Deno.test("doc144 — every engine-emitted key lands on a v5.3 spine block of the right family", async () => {
  const blockAt = new Map<string, string>();
  for (const s of SKELETON_SECTIONS) s.blocks.forEach((b, i) => blockAt.set(`${s.id}:${i}`, b.kind));
  for (const c of CPPA_RISK_PERFECT) {
    const sk = await assemble(c.intake as Bag);
    const engine = sk.factor_engine;
    for (const key of Object.keys(engine.blocks)) {
      const target = ENGINE_KEY_REMAP[key] ?? key;
      const kind = blockAt.get(target);
      assertExists(kind, `engine block key ${key} → ${target} has no spine block`);
      assert(
        kind !== "skeleton" && kind !== "table",
        `engine block key ${key} → ${target} points at a ${kind} block (composed prose would be dropped)`,
      );
    }
    for (const key of Object.keys(engine.tables)) {
      const target = ENGINE_KEY_REMAP[key] ?? key;
      assertEquals(
        blockAt.get(target),
        "table",
        `engine table key ${key} → ${target} does not point at a table block`,
      );
    }
  }
});

// ── § 4 persuasive-authority pointer ────────────────────────────────────────

Deno.test("doc144 — the § 4 Appendix B pointer composes iff Appendix B renders", async () => {
  // The rk3-b harness runs with EMPTY_RISK_CORPUS, so Appendix B never
  // attaches here and the pointer must be absent (no dangling pointer).
  const sk = await assemble(CPPA_RISK_PERFECT[0].intake as Bag);
  const ids = sk.document.sections.map((s) => s.id);
  const body = skeletonDocumentToText(sk.document);
  if (!ids.includes("appendix_i")) {
    assert(
      !body.includes("Appendix B collects enforcement outcomes"),
      "§ 4 pointer rendered without Appendix B",
    );
  } else {
    assert(
      body.includes("Appendix B collects enforcement outcomes"),
      "§ 4 pointer absent while Appendix B renders",
    );
  }
});
