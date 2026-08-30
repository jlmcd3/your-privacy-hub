// Spine v5.2 pin tests (the Memorandum Redesign, CEO-ratified 2026-08-26).
//
// Pins the v5.2 encode: section structure, rendering behaviour over both
// CPPA_RISK_PERFECT fixtures (skeleton + slots + generated blocks + tables),
// the ADMT gate (§ III.E and Appendix F carry a not-applicable record for
// the non-ADMT fixture), and the deterministic DERIVED builders.
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
  deriveSubmissionSupportRecord,
} from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const BUILD_STAMP = "spine-v52-pins";

// ── Spine structure pins ──────────────────────────────────────────────────────

Deno.test("v5.2 — spine version is the 2026-08-26 memorandum encode", () => {
  assertEquals(RISK_SKELETON_VERSION, "cppa-risk-v5.2-2026-08-26");
});

Deno.test("v5.2 — section ids, in document order", () => {
  // The memorandum structure: Exec Summary → I. Method → II. Information →
  // III. Analysis → IV. Balance/Determination → V. Governance → signature
  // pages → Appendices A–H. Appendix section ids are CARRIED from the v4.x
  // encode (the PDF renderer page-breaks on "table_of_authorities", and the
  // corpus wiring keys on "appendix_i").
  assertEquals(SKELETON_SECTIONS.map((s) => s.id), [
    "cover",
    "executive_summary",
    "i_method",
    "ii_information",
    "iii_analysis",
    "iv_determination",
    "v_governance",
    "review_and_approval",
    "agency_submission_checklist",
    "table_of_authorities",
    "appendix_i",
    "appendix_a",
    "appendix_b",
    "appendix_c",
    "appendix_d",
    "appendix_e",
    "appendix_f",
  ]);
});

Deno.test("v5.2 — Appendix A keeps the id the PDF renderer page-breaks on", () => {
  const appA = SKELETON_SECTIONS.find((s) =>
    s.title === "Appendix A — Factor, Determination, and Authority Matrix"
  );
  assertExists(appA);
  assertEquals(appA.id, "table_of_authorities");
});

Deno.test("v5.2 — the banned register never appears in fixed prose", () => {
  const banned = [
    "the record shows",
    "the record reflects",
    "the record indicates",
    "the record demonstrates",
    "the record establishes",
    "on this record",
    "as the record makes clear",
    "on the present record",
    "structured record",
    "risk pathway",
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

// ── Rendering over the perfect fixtures ──────────────────────────────────────

const PRESENT_ALWAYS = [
  "cover",
  "executive_summary",
  "i_method",
  "ii_information",
  "iii_analysis",
  "iv_determination",
  "v_governance",
  "review_and_approval",
  "agency_submission_checklist",
  "table_of_authorities",
  "appendix_a",
  "appendix_b",
  "appendix_c",
  "appendix_d",
  "appendix_e",
  "appendix_f",
];

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`v5.2 — memorandum rendering — ${c.id}`, async (t) => {
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

    await t.step("document carries the v5.2 spine version", () => {
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

    await t.step("ADMT gate — § III.E and Appendix F carry full content iff ADMT, a not-applicable record otherwise", () => {
      if (isAdmt) {
        assert(body.includes("E. Automated Decisionmaking Technology. Section 7152(a)(3)(G)"), "ADMT § III.E intro absent on ADMT fixture");
      } else {
        assert(
          body.includes("does not identify automated decisionmaking technology"),
          "non-ADMT § III.E not-applicable record absent",
        );
        assert(body.includes("no ADMT technical and decision record is required"), "non-ADMT Appendix F placeholder absent");
        assert(!body.includes("It classifies the system as"), "non-ADMT body leaks ADMT prose");
      }
    });

    await t.step("no placeholder or sentinel leakage", () => {
      assert(!body.includes("{{"), "spine placeholder notation leaked");
      assert(!body.includes("[GENERATED"), "generated block marker leaked");
      assert(!body.includes("[CONDITIONAL"), "conditional block marker leaked");
      assert(!body.includes(String.fromCharCode(0)), "sentinel leaked");
    });

    await t.step("key v5.2 fixed literals render", () => {
      for (const literal of [
        "A. Activity Assessed.",
        "B. Why a Risk Assessment Is Required.",
        "C. The Balancing Test.",
        "I. HOW THIS ASSESSMENT DECIDES",
        "A. The Question.",
        // RE-PIN PANEL LEAK-1 (2026-08-30): EUP expanded at first use.
        "B. The EndUserPrivacy (EUP) Decision Logic.",
        "Step 1 — Triggers.",
        "Step 5 — The balance.",
        "C. Qualitative Refinement.",
        "II. THE INFORMATION PROVIDED",
        "A. Purpose and Scope.",
        "B. How the Processing Operates.",
        "F. Recipients and Disclosures.",
        "G. Retention.",
        "III. ANALYSIS",
        "A. The Triggers, Applied.",
        "B. Necessity and Minimization.",
        "D. Practical Consumer Control.",
        "F. Benefits.",
        "IV. THE BALANCE AND THE DETERMINATION",
        "A. The Risk Ledger.",
        "B. What Weighs For, and What Weighs Against.",
        "C. The Determination.",
        "D. Conditions, Follow-Ups, and Recommendations.",
        "V. GOVERNANCE, REVIEW, AND SUBMISSION",
        "D. Retention of the Assessment Record.",
        "E. CPPA Submission Support (§ 7157).",
      ]) {
        assert(body.includes(literal), `missing fixed literal: ${literal}`);
      }
    });

    await t.step("the defined terms are introduced in the executive summary", () => {
      assert(body.includes("(the “Company”)"), "Company defined term absent");
      assert(body.includes("(the “Activity”)"), "Activity defined term absent");
      assert(body.includes("(the “Purpose”)"), "Purpose defined term absent");
    });

    await t.step("intake facts reach the document", () => {
      const intake = c.intake as Bag;
      assert(body.includes(String(intake.entity_name)), "entity name absent");
      assert(body.includes(String(intake.primary_activity_name)), "activity name absent");
      assert(body.includes(String(intake.processing_entry_point)), "processing entry point absent");
      assert(body.includes(String(intake.i8_certifying_exec_name)), "certifying exec absent");
    });

    await t.step("the determination renders once, in the re-registered voice", () => {
      assert(
        body.includes("Based on the information provided by the Company"),
        "re-registered determination string absent",
      );
      assert(!body.includes("on the present record"), "retired register leaked");
    });

    await t.step("the risk ledger and balance summary tables render", () => {
      assert(body.includes("Privacy risk | Before safeguards | Safeguard credited (status) | Remaining"), "risk ledger columns absent");
      assert(body.includes("Benefits established (weight) | Risks remaining (level)"), "balance summary columns absent");
      // PANEL RISK-P3 (2026-08-30): the exec summary carries the compressed
      // two-column ledger; the four-column table prints once, in § IV.A.
      assert(body.includes("Privacy risk | Remaining risk"), "compressed exec ledger columns absent");
      const fullHeaderCount = body.split("Privacy risk | Before safeguards | Safeguard credited (status) | Remaining").length - 1;
      assert(fullHeaderCount === 1, `full ledger header must print exactly once, saw ${fullHeaderCount}`);
    });

    await t.step("§ 7150(b) triggers derive and render", () => {
      const triggers = deriveApplicable7150Triggers(report);
      assertExists(triggers, "no engaged trigger derived on a perfect fixture");
      assert(
        body.includes("On the information provided, the Activity engages the following trigger or triggers:"),
        "trigger lead absent from the executive summary",
      );
    });

    await t.step("benefit paragraphs render branch-complete (Annex T2)", () => {
      assert(
        body.includes("benefit carries material weight") || body.includes("benefit carries limited weight"),
        "no T2 benefit paragraph rendered",
      );
    });

    await t.step("appendix table blocks compose", () => {
      assert(body.includes("Personal-information categories (this activity)"), "Appendix C inventory absent");
      assert(body.includes("Applicable § 7150(b) trigger(s)"), "Appendix G submission record absent");
      assert(body.includes("Business-level § 7157 submission items requiring reporting-period aggregation"), "Appendix G outstanding checklist absent");
      assert(body.includes("CPPA risk-assessment intake record"), "Appendix H materials index absent");
      // RE-PIN PANEL LEAK-1 (2026-08-30): generation metadata stays for
      // reperformance, labelled as the generation record.
      assert(body.includes(`Report generation record — assessment engine ${RISK_SKELETON_VERSION}`), "Appendix H generation-record line absent");
      if (isAdmt) {
        assert(body.includes("System description"), "Appendix F ADMT facts absent on ADMT fixture");
      }
    });
  });
}

// ── DERIVED builder unit pins ────────────────────────────────────────────────

Deno.test("v5.2 — deriveInitialAssessmentDeadline (§ 7155 timing rules)", () => {
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

Deno.test("v5.2 — deriveNextReviewDate adds the three-year review rule", () => {
  assertEquals(deriveNextReviewDate("2026-08-18"), "2029-08-18");
  assertEquals(deriveNextReviewDate("2028-02-29"), "2031-03-01");
});

Deno.test("v5.2 — deriveAssessmentRetentionEnd (§ 7155 later-of rule)", () => {
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

Deno.test("v5.2 — SPI inventory maps the canonical taxonomy with the q15 fallback", () => {
  const sierra = CPPA_RISK_PERFECT[0].intake as Bag;
  const locus = CPPA_RISK_PERFECT[1].intake as Bag;
  const locusSpi = deriveActivitySpiInventory(locus);
  assert(locusSpi?.includes("Precise geolocation"), locusSpi ?? "");
  const sierraSpi = deriveActivitySpiInventory(sierra);
  // RE-PIN PANEL RISK-P2 (2026-08-30): the q15-Yes fallback was the circular
  // placeholder "the sensitive personal information the Company has
  // identified in its submission"; it now states the limitation honestly.
  assert(
    sierraSpi?.includes("the specific categories are not named in the activity record"),
    sierraSpi ?? "",
  );
  assertEquals(
    deriveActivitySpiInventory({ q4_pi_categories: ["Financial information"], q15_sensitive_pi: "No" }),
    null,
  );
});

Deno.test("v5.2 — PI inventory carries the canonical California mapping", () => {
  const sierra = CPPA_RISK_PERFECT[0].intake as Bag;
  const inv = deriveActivityPiInventory(sierra);
  assert(inv?.includes("canonical California category"), inv ?? "");
  assert(inv?.includes("Professional or employment-related information"), inv ?? "");
  assertEquals(deriveActivityPiInventory({}), null);
});

Deno.test("v5.2 — Appendix C / G / H builders compose from established facts only", () => {
  const sierra = CPPA_RISK_PERFECT[0].intake as Bag;
  const invA = deriveProcessingAndDataInventory(sierra);
  assertExists(invA);
  assertEquals(invA.columns, ["Item", "Detail"]);
  assert(
    invA.rows.some((r) => r[0] === "Recipient" && r[1].includes("Experian")),
    JSON.stringify(invA.rows),
  );
  assert(
    invA.rows.some((r) => r[0] === "Processing lifecycle (operational sequence)"),
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
  // v5.2 — the engine-version line moved off the cover into Appendix H.
  assert(idx.rows.some((r) => r[0].includes("Report generation record — assessment engine")), JSON.stringify(idx.rows));
});

Deno.test("v5.2 — Appendix F ADMT facts compose iff ADMT", () => {
  const sierra = CPPA_RISK_PERFECT[0].intake as Bag;
  const locus = CPPA_RISK_PERFECT[1].intake as Bag;
  const facts = deriveAdmtTechnicalFacts(sierra);
  assertExists(facts);
  assertEquals(facts.columns, ["Field", "Detail"]);
  assert(facts.rows.some((r) => r[0] === "System description"), JSON.stringify(facts.rows));
  assert(facts.rows.some((r) => r[0] === "Human review"), JSON.stringify(facts.rows));
  assertEquals(deriveAdmtTechnicalFacts(locus), null);
});
