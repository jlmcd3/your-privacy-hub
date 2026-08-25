// RK3-B — Spine 4.3 pin tests (Phase B).
//
// Pins the Spine 4.3 encode: section structure, Phase B rendering behaviour
// over both CPPA_RISK_PERFECT fixtures (skeleton + INTAKE/FINAL/SYSTEM slots +
// DERIVED rule blocks; FACTOR blocks honestly absent), the ADMT gate
// (section V and Appendix D fully absent for the non-ADMT fixture), and the
// deterministic DERIVED builders introduced for the 4.3 appendices.
//
// Engine invocation matches the RK0.5 harness: deterministic Pass-1,
// EMPTY_RISK_CORPUS, no refinementDeps — zero model calls, zero DB access.

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-corpus.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import {
  RISK_SKELETON_VERSION,
  SKELETON_SECTIONS,
} from "../../../supabase/functions/_shared/prose/plans/cppa-risk.spine.ts";
import {
  assembleRiskSkeletonDocument,
  deriveActivityPiInventory,
  deriveActivitySpiInventory,
  deriveAdmtTechnicalFacts,
  deriveApplicable7150Triggers,
  deriveAssessmentRetentionEnd,
  deriveBusinessLevelOutstanding,
  deriveInitialAssessmentDeadline,
  deriveMaterialsConsideredIndex,
  deriveNextReviewDate,
  deriveProcessingAndDataInventory,
  deriveProcessingLifecycleNarrative,
  deriveSubmissionSupportRecord,
} from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const BUILD_STAMP = "rk3-b-spine-pins";

// ── Spine structure pins ──────────────────────────────────────────────────────

Deno.test("RK3-B — spine version is the v4.7.1 encode (CEO report review: signature pages)", () => {
  assertEquals(RISK_SKELETON_VERSION, "cppa-risk-v4.7.1-2026-08-24");
});

Deno.test("RK3-B — Spine 4.3 section ids, in document order", () => {
  // CEO report review 2026-08-23/24: table_of_authorities (Appendix A,
  // formerly "G") and appendix_i (Appendix B, formerly "I") now lead the
  // appendix set; appendix_a-f follow, reletterd C-H. appendix_h (EUP
  // Methodology, never triggered) is retired — no longer a valid id.
  // CEO report review 2026-08-24: two new signature pages, "review_and_
  // approval" and "agency_submission_checklist", sit between x_governance
  // and table_of_authorities — neither is titled "Appendix ...".
  assertEquals(SKELETON_SECTIONS.map((s) => s.id), [
    "cover",
    "executive_summary",
    "i_purpose_scope",
    "ii_processing_context",
    "iii_necessity",
    "iv_consumer_transparency",
    "v_admt",
    "vi_benefits",
    "vii_risks",
    "viii_safeguards",
    "ix_balancing",
    "x_governance",
    "review_and_approval",
    "agency_submission_checklist",
    "table_of_authorities",
    // v4.6 — corpus phase 2 (doc 49 A.2.4): the S5 persuasive-authority
    // surface; fully conditional, drops when no precedent row attaches.
    "appendix_i",
    "appendix_a",
    "appendix_b",
    "appendix_c",
    "appendix_d",
    "appendix_e",
    "appendix_f",
  ]);
});

Deno.test("RK3-B — Appendix A (formerly \"G\") keeps the id the PDF renderer page-breaks on", () => {
  const appA = SKELETON_SECTIONS.find((s) =>
    s.title === "Appendix A — Factor, Determination, and Authority Matrix"
  );
  assertExists(appA);
  assertEquals(appA.id, "table_of_authorities");
});

Deno.test("RK3-B — the v3 banned register never appears in fixed prose", () => {
  const banned = [
    "the record shows",
    "the record reflects",
    "the record indicates",
    "the record demonstrates",
    "the record establishes",
    "on this record",
    "as the record makes clear",
  ];
  for (const section of SKELETON_SECTIONS) {
    for (const block of section.blocks) {
      if (block.kind !== "skeleton") continue;
      const lower = block.text.toLowerCase();
      for (const b of banned) {
        assert(!lower.includes(b), `banned register "${b}" in ${section.id} fixed prose`);
      }
    }
  }
});

// ── Phase B rendering over the perfect fixtures ──────────────────────────────

const PRESENT_ALWAYS = [
  "cover",
  "executive_summary",
  "i_purpose_scope",
  "ii_processing_context",
  "iii_necessity",
  "iv_consumer_transparency",
  "vi_benefits",
  "vii_risks",
  "viii_safeguards",
  "ix_balancing",
  "x_governance",
  // CEO report review 2026-08-24 — signature pages, always present.
  "review_and_approval",
  "agency_submission_checklist",
  "appendix_a",
  // RK3-C: the factor engine now composes the necessity matrix and the risk
  // register, so both factor appendices render on a perfect fixture.
  "appendix_b",
  "appendix_c",
  "appendix_e",
  "appendix_f",
];

// CEO report review 2026-08-23/24: the EUP-methodology appendix (formerly
// id "appendix_h") is RETIRED from the spine entirely — it never composed
// (its trigger, {{SYSTEM.include_methodology_appendix}}, no fixture ever
// set) and "appendix_h" is no longer even a section this array can
// produce, so there is nothing left to assert absent here.
const ABSENT_PHASE_B: string[] = [];

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`RK3-B — Spine 4.3 rendering — ${c.id}`, async (t) => {
    const result = await generateCppaRiskReport(c.intake, {
      pass1: "deterministic",
      riskCorpus: EMPTY_RISK_CORPUS,
      buildStamp: BUILD_STAMP,
      mode: "enforce",
    });
    const report = result.report as Bag;
    const sk = assembleRiskSkeletonDocument(report, c.intake as Bag);
    const doc = sk.document;
    const ids = doc.sections.map((x) => x.id);
    const body = skeletonDocumentToText(doc);
    const isAdmt = /^yes\b/i.test(String((c.intake as Bag).q18_admt_use ?? ""));

    await t.step("document carries the 4.3 spine version", () => {
      assertEquals(doc.spine_version, RISK_SKELETON_VERSION);
    });

    await t.step("zero conformance findings", () => {
      assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
    });

    await t.step("zero register findings", () => {
      assertEquals(sk.register_findings.length, 0, JSON.stringify(sk.register_findings));
    });

    await t.step("always-applicable sections render", () => {
      for (const id of PRESENT_ALWAYS) {
        assert(ids.includes(id), `expected section ${id}; got ${ids.join(", ")}`);
      }
    });

    await t.step("untriggered sections stay honestly absent", () => {
      for (const id of ABSENT_PHASE_B) {
        assert(!ids.includes(id), `section ${id} must be absent`);
      }
    });

    await t.step("ADMT gate — Section V and Appendix D render iff ADMT", () => {
      assertEquals(ids.includes("v_admt"), isAdmt, `v_admt presence on ${c.id}`);
      assertEquals(ids.includes("appendix_d"), isAdmt, `appendix_d presence on ${c.id}`);
      if (!isAdmt) {
        assert(!body.includes("AUTOMATED DECISIONMAKING TECHNOLOGY"), "non-ADMT body leaks the Section V title");
        assert(!body.includes("The Company describes the relevant automated system as"), "non-ADMT body leaks ADMT prose");
        assert(!body.includes("ADMT Technical and Decision Record"), "non-ADMT body leaks Appendix D");
      }
    });

    await t.step("Appendix A (formerly \"G\") renders", () => {
      assert(ids.includes("table_of_authorities"), "Appendix A (factor/determination matrix) section absent");
    });

    await t.step("no placeholder or sentinel leakage", () => {
      assert(!body.includes("{{"), "spine placeholder notation leaked");
      assert(!body.includes("[GENERATED"), "generated block marker leaked");
      assert(!body.includes("[CONDITIONAL"), "conditional block marker leaked");
      assert(!body.includes("\u0000"), "sentinel leaked");
    });

    await t.step("key Spine 4.3 fixed literals render", () => {
      for (const literal of [
        "Activity Assessed.",
        "Why a Risk Assessment Is Required.",
        "A. Processing Purpose.",
        "D. Basis for the Assessment.",
        "E. Record Sufficiency.",
        "A. How the Processing Works.",
        "A. The Necessity Question.",
        "A. Consumer Perspective.",
        "A. How Benefits Are Considered.",
        "A. How Risk Is Evaluated.",
        "A. Role of Safeguards.",
        "A. The Decision.",
        "B. Assessment Timing.",
        "C. Review and Material Changes.",
        "D. Retention of the Assessment Record.",
        "E. CPPA Submission Support Record (§ 7157).",
      ]) {
        assert(body.includes(literal), `missing fixed literal: ${literal}`);
      }
    });

    await t.step("intake facts reach the document", () => {
      const intake = c.intake as Bag;
      assert(body.includes(String(intake.entity_name)), "entity name absent");
      assert(body.includes(String(intake.primary_activity_name)), "activity name absent");
      assert(body.includes(String(intake.processing_entry_point)), "processing entry point absent");
      assert(body.includes(String(intake.consumer_interaction_purpose)), "interaction purpose absent");
      assert(body.includes(String(intake.i8_certifying_exec_name)), "certifying exec absent");
    });

    await t.step("SPI conditional renders for a sensitive-PI record", () => {
      assert(
        body.includes("The activity includes the following sensitive personal information:"),
        "SPI conditional absent on a q15=Yes fixture",
      );
    });

    await t.step("benefit gates render the identified branch, never the no-benefit branch", () => {
      assert(body.includes("The Company identifies:"), "identified-benefit lead absent");
      assert(
        !body.includes("has been established on the present record"),
        "no-benefit branch rendered on a fixture with all four benefits identified",
      );
    });

    await t.step("§ 7150(b) triggers derive and render", () => {
      const triggers = deriveApplicable7150Triggers(report);
      assertExists(triggers, "no engaged trigger derived on a perfect fixture");
      assert(
        body.includes("The activity triggers the requirement under"),
        "trigger sentence absent from the executive summary",
      );
    });

    await t.step("appendix table blocks compose", () => {
      // Part B item 3 (2026-08-21, CEO-confirmed, presentation only):
      // Appendices A, D, E and F now render as tables (skeletonTableToText
      // joins each row's cells with " | ", not a trailing colon on the
      // label) instead of a joined "rule" string. Facts unchanged.
      assert(body.includes("Personal-information categories (this activity)"), "Appendix A inventory absent");
      assert(body.includes("Applicable § 7150(b) trigger(s)"), "Appendix E submission record absent");
      assert(body.includes("Outstanding business-level § 7157 submission elements"), "Appendix E outstanding checklist absent");
      assert(body.includes("CPPA risk-assessment intake record"), "Appendix F materials index absent");
      if (isAdmt) {
        assert(body.includes("System description"), "Appendix D ADMT facts absent on ADMT fixture");
      }
    });
  });
}

// ── DERIVED builder unit pins ────────────────────────────────────────────────

Deno.test("RK3-B — deriveInitialAssessmentDeadline (§ 7155 timing rules)", () => {
  assertEquals(deriveInitialAssessmentDeadline({}), null);
  const planned = deriveInitialAssessmentDeadline({
    processing_status: "Planned",
    planned_start_date: "2026-11-01",
  });
  assert(planned?.includes("before the processing is initiated"), planned ?? "");
  assert(planned?.includes("2026-11-01"), planned ?? "");
  const pre2026 = deriveInitialAssessmentDeadline({
    processing_status: "Ongoing",
    processing_start_date: "2024-03-01",
  });
  assert(pre2026?.includes("December 31, 2027"), pre2026 ?? "");
  const post2026 = deriveInitialAssessmentDeadline({
    processing_status: "Ongoing",
    processing_start_date: "2026-02-01",
  });
  assert(post2026?.includes("before initiation of the processing"), post2026 ?? "");
});

Deno.test("RK3-B — deriveNextReviewDate adds the three-year review rule", () => {
  assertEquals(deriveNextReviewDate("2026-08-18"), "2029-08-18");
  assertEquals(deriveNextReviewDate("2028-02-29"), "2031-03-01");
});

Deno.test("RK3-B — deriveAssessmentRetentionEnd (§ 7155 later-of rule)", () => {
  assertEquals(deriveAssessmentRetentionEnd({}), null);
  assert(
    deriveAssessmentRetentionEnd({ processing_status: "Discontinued" })
      ?.includes("five years after completion"),
  );
  assert(
    deriveAssessmentRetentionEnd({ processing_status: "Ongoing" })
      ?.includes("not yet determinable"),
  );
});

Deno.test("RK3-B — SPI inventory maps the canonical taxonomy with the q15 fallback", () => {
  const sierra = CPPA_RISK_PERFECT[0].intake as Bag;
  const locus = CPPA_RISK_PERFECT[1].intake as Bag;
  // Locus carries a mapped SPI category.
  const locusSpi = deriveActivitySpiInventory(locus);
  assert(locusSpi?.includes("Precise geolocation"), locusSpi ?? "");
  // Sierra answers q15=Yes with no SPI-mapped q4 category → fallback [R3].
  const sierraSpi = deriveActivitySpiInventory(sierra);
  assert(sierraSpi?.includes("sensitive personal information"), sierraSpi ?? "");
  // No SPI at all → null.
  assertEquals(
    deriveActivitySpiInventory({ q4_pi_categories: ["Financial information"], q15_sensitive_pi: "No" }),
    null,
  );
});

Deno.test("RK3-B — PI inventory carries the canonical California mapping", () => {
  const sierra = CPPA_RISK_PERFECT[0].intake as Bag;
  const inv = deriveActivityPiInventory(sierra);
  assert(inv?.includes("canonical California category"), inv ?? "");
  assert(inv?.includes("Professional or employment-related information"), inv ?? "");
  assertEquals(deriveActivityPiInventory({}), null);
});

Deno.test("RK3-B — lifecycle narrative sequences the company's own first sentences", () => {
  const sierra = CPPA_RISK_PERFECT[0].intake as Bag;
  const n = deriveProcessingLifecycleNarrative(sierra);
  assertExists(n);
  assert(n.includes("point of sale"), n);
  assertEquals(deriveProcessingLifecycleNarrative({}), null);
});

// Part B item 3 (2026-08-21, CEO-confirmed, presentation only): these five
// builders now return a RenderedTable (columns + rows) instead of a joined
// string, so the renderer gives them real <table> treatment instead of
// falling through to the plain-paragraph branch. Facts and computation are
// unchanged — only the shape of the return value is.
Deno.test("RK3-B — Appendix A / E / F builders compose from established facts only", () => {
  const sierra = CPPA_RISK_PERFECT[0].intake as Bag;
  const invA = deriveProcessingAndDataInventory(sierra);
  assertExists(invA);
  assertEquals(invA.columns, ["Item", "Detail"]);
  assert(
    invA.rows.some((r) => r[0] === "Recipient" && r[1].includes("Experian")),
    JSON.stringify(invA.rows),
  );
  assert(
    invA.rows.some((r) => r[0] === "Retention" && r[1].includes("Financial information: Statutory or regulatory retention requirement")),
    JSON.stringify(invA.rows),
  );

  const subE = deriveSubmissionSupportRecord(sierra, {
    scope_and_triggers: { narrative: ["Engaged — Section 7150(b)(3): significant-decision ADMT."] },
  }, "2026-08-18");
  assertEquals(subE.columns, ["Item", "Detail"]);
  assert(
    subE.rows.some((r) => r[0] === "Applicable § 7150(b) trigger(s)" && r[1].includes("Section 7150(b)(3)")),
    JSON.stringify(subE.rows),
  );
  assert(
    subE.rows.some((r) => r[0] === "Certifying executive identified" && r[1].includes("L. Whitcomb, Chief Compliance Officer")),
    JSON.stringify(subE.rows),
  );

  const outstanding = deriveBusinessLevelOutstanding();
  assert(outstanding.title.includes("§ 7157"), outstanding.title);
  assertEquals(outstanding.rows.length, 4);

  const idx = deriveMaterialsConsideredIndex(sierra);
  assert(idx.rows.some((r) => r[0].includes("intake record")), JSON.stringify(idx.rows));
  assert(idx.rows.some((r) => r[0].includes("https://www.sierraoutfitters.example/privacy")), JSON.stringify(idx.rows));
});

Deno.test("RK3-B — Appendix D ADMT facts compose iff ADMT", () => {
  const sierra = CPPA_RISK_PERFECT[0].intake as Bag;
  const locus = CPPA_RISK_PERFECT[1].intake as Bag;
  const facts = deriveAdmtTechnicalFacts(sierra);
  assertExists(facts);
  assertEquals(facts.columns, ["Field", "Detail"]);
  assert(facts.rows.some((r) => r[0] === "System description"), JSON.stringify(facts.rows));
  assert(facts.rows.some((r) => r[0] === "Human review"), JSON.stringify(facts.rows));
  assertEquals(deriveAdmtTechnicalFacts(locus), null);
});
