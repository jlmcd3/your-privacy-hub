// DOC 137 (2026-09-02) — ICO fee never wired into the "no filing required"
// summary.
//
// Root cause: the UK ICO annual data-protection fee is computed by
// resolveIcoFeeTier (index.ts) and tagged via Rule R4
// (_local/registration-engine.ts, obligation string "ico_fee") onto the
// TOP-LEVEL `result_summary.jurisdictions[]` array. computeDutyCounts()
// (registration-skeleton-assemble.ts) drives the executive Duty-status
// table and the "No filing is required" summary sentence, but it only ever
// walked the three `registration_deliverables` surfaces (data-broker
// `determinations`, `representative_determinations`, `dpo_determination`)
// — it never read `report.jurisdictions`, so a real, mandatory, fully
// resolved UK Tier-3 (£3,763) ICO fee rendered as "No filing is required."
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleRegistrationSkeletonDocument,
  computeDutyCounts,
  deriveDutyStatusTable,
} from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

// A report shape mirroring what index.ts actually persists: `jurisdictions`
// top-level (engine + fee resolution), `registration_deliverables` +
// spread top-level (the reasoned-determinations surface computeDutyCounts
// already read before this fix). No US data-broker exposure, no EU/UK
// representative or DPO duty — a UK-only ICO-fee-only record, matching the
// bug's live scenario (a real filing duty with nothing else attached).
function ukIcoFeeOnlyReport(): Bag {
  const deliverables: Bag = {
    determinations: [],
    representative_determinations: [],
    dpo_determination: { verdict: "not_engaged" },
    filing_readiness: [],
  };
  return {
    registration_deliverables: deliverables,
    ...deliverables,
    obligations_summary: {},
    jurisdictions: [
      {
        code: "UK",
        name: "United Kingdom",
        obligations: ["ico_fee"],
        filing_fee_cents: 376_300, // Tier 3, £3,763.00
        notes: "ICO Data-Protection Fee resolved to Tier 3 (£3,763.00) from staff count 800 and turnover ≈ £58,000,000.",
      },
    ],
  };
}

Deno.test("DOC 137 — an ICO-fee-only UK record counts as an attached duty, not zero", () => {
  const counts = computeDutyCounts(ukIcoFeeOnlyReport());
  assertEquals(counts.ico_fee_attached, 1);
  assertEquals(counts.attached, 1, "the ICO fee must be folded into the overall attached count");
  assertEquals(
    counts.attached_names.some((n) => n.includes("ICO annual data-protection fee")),
    true,
    "the attached-duty names must identify the ICO fee by name",
  );
});

Deno.test("DOC 137 — the assembled skeleton document does not claim no filing is required", () => {
  const intake: Bag = { organization_name: "Northbridge Analytics Ltd", organization_country: "UK" };
  const doc = assembleRegistrationSkeletonDocument(ukIcoFeeOnlyReport(), intake);
  const text = JSON.stringify(doc.document);
  assertEquals(
    text.includes("No filing is required"),
    false,
    "a resolved, mandatory ICO fee must not render as \"No filing is required\"",
  );
  assertStringIncludes(text, "registration duty attaches");
});

Deno.test("DOC 137 — the Duty-status table gets an ICO fee row with tier amount", () => {
  const table = deriveDutyStatusTable(ukIcoFeeOnlyReport());
  const rows = table?.rows ?? [];
  const icoRow = rows.find((r) => r[0].includes("ICO annual data-protection fee"));
  if (!icoRow) throw new Error("expected an ICO annual data-protection fee row in the Duty-status table");
  assertEquals(icoRow[1], "United Kingdom");
  assertEquals(icoRow[2], "Required on reported facts");
  assertStringIncludes(icoRow[3], "£3,763.00");
});

Deno.test("DOC 137 — no ico_fee tag means no ICO row and no change to the existing three surfaces", () => {
  const deliverables: Bag = {
    determinations: [{ verdict: "registrable", jurisdiction: "US-CA", state_name: "California" }],
    representative_determinations: [],
    dpo_determination: { verdict: "not_engaged" },
    filing_readiness: [],
  };
  const report: Bag = {
    registration_deliverables: deliverables,
    ...deliverables,
    obligations_summary: {},
    jurisdictions: [{ code: "US-CA", name: "California", obligations: ["registration"] }],
  };
  const counts = computeDutyCounts(report);
  assertEquals(counts.ico_fee_attached, 0);
  assertEquals(counts.attached, 1, "the pre-existing California data-broker duty is unaffected");
  const table = deriveDutyStatusTable(report);
  const rows = table?.rows ?? [];
  assertEquals(rows.some((r) => r[0].includes("ICO annual data-protection fee")), false);
});
