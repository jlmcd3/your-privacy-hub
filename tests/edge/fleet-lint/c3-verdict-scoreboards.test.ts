// BATCH 19a (Wave C3 — doc 111 queue, doc 109 §1.3 verdict-first fleet law,
// doc 113 Part C seam rulings S3.1–S3.4, S3.6). The Executive Summary
// scoreboards: LIA three-test strip, Governance programme scoreboard,
// Registration duty-status table, Cyber readiness snapshot + cover verdict
// row, and the ADMT PDF fallback retitle. Biometric and IR received theirs
// in Batches 18a/18b; Risk and ADMT covers already conform.

import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import {
  LIA_SKELETON_CONTENT_HASH,
  LIA_SKELETON_PARAGRAPHS,
} from "../../../supabase/functions/run-li-assessment/_local/prose/plans/lia.spine.ts";
import { assembleGovernanceSkeletonDocument } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { CPPA_CYBER_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";

type Bag = Record<string, unknown>;

function execTables(doc: { sections: readonly { id: string; paragraphs: readonly { kind: string; table?: { title: string; columns: readonly string[]; rows: readonly (readonly string[])[]; hideHeader?: boolean } }[] }[] }, id = "executive_summary") {
  const sec = doc.sections.find((s) => s.id === id);
  return (sec?.paragraphs ?? []).filter((p) => p.kind === "table" && p.table).map((p) => p.table!);
}

Deno.test("C3/S3.1: LIA deterministic path carries the three-test strip; the v1 legacy path stays table-free; hash unchanged", async () => {
  const joined = LIA_SKELETON_PARAGRAPHS.join("\n");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(joined));
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  assertEquals(hex, LIA_SKELETON_CONTENT_HASH);

  const report: Bag = {
    three_part_test: {
      purpose_test: { verdict: "passes" },
      necessity_test: { verdict: "likely_passes" },
      balancing_test: { verdict: "cannot_be_resolved" },
    },
    lia_determination: { outcome: "qualified", why: "The balancing test is unresolved on the facts provided." },
  };
  const intake: Bag = { organizationName: "North Pole Manual Mining Ltd", jurisdictions: ["EU (GDPR)"] };
  const det = assembleLiaSkeletonDocument(report, intake, { deterministic: true });
  const strip = execTables(det.document).find((t) => t.title === "Three-part test");
  assertExists(strip, "verdict strip missing on the deterministic path");
  assert(strip.hideHeader === true);
  assertEquals(strip.rows, [["Purpose test", "Met"], ["Necessity test", "Met"], ["Balancing test", "Determination Pending"]]);

  const legacy = assembleLiaSkeletonDocument(report, intake);
  assert(
    !legacy.document.sections.some((s) => s.paragraphs.some((p) => p.kind === "table")),
    "the v1 legacy path must stay byte-frozen and table-free",
  );
});

Deno.test("C3/S3.2: the Governance scoreboard rows read the typed counts and skip absent surfaces", () => {
  const report: Bag = {
    readiness_determination: { rating: "partially_evidenced" },
    executive_summary: "The programme is partly evidenced on the company's answers.",
    demonstrability_findings: Array.from({ length: 8 }, (_, i) => ({ artifact_present: i < 6 ? "yes" : "no" })),
    art30_element_findings: [
      { element: "a", verdict: "satisfied" },
      { element: "b", verdict: "satisfied" },
      { element: "c", verdict: "satisfied" },
      { element: "d", verdict: "satisfied" },
      { element: "e", verdict: "record_insufficient" },
      { element: "f", verdict: "not_satisfied" },
      { element: "g", verdict: "record_insufficient" },
    ],
    domain_findings: Array.from({ length: 10 }, (_, i) => ({
      domain_name: `Domain ${i + 1}`,
      severity: i === 0 ? "compliant" : "medium",
      gap_description: "A recorded gap.",
    })),
    remediation_plan: Array.from({ length: 7 }, () => ({})),
  };
  const out = assembleGovernanceSkeletonDocument(report, { organization_name: "Busted Sled Solutions, Inc." });
  const board = execTables(out.document).find((t) => t.title === "Programme scoreboard");
  assertExists(board);
  assertEquals(board.rows, [
    ["Duties with an identified supporting artifact", "6 of 8"],
    ["Article 30(1) elements evidenced", "4 of 7"],
    ["Domains not fully evidenced", "9 of 10"],
    ["Remediation items recorded", "7"],
  ]);
  // Absent surfaces skip their rows; an empty record has no scoreboard.
  const bare = assembleGovernanceSkeletonDocument(
    { readiness_determination: { rating: "not_determinable" } },
    { organization_name: "Bare Co" },
  );
  assertEquals(execTables(bare.document), []);
});

Deno.test("C3/S3.3: the Registration duty-status table spans all four typed surfaces with mapped statuses", () => {
  const intake: Bag = {
    organization_name: "Meridian Analytics, Inc.",
    organization_country: "US",
    industry: "Data analytics",
    role: "controller",
    processes_personal_data: true,
    markets_served: ["US", "US-CA", "US-VT", "DE"],
    acts_as_data_broker: true,
    sells_or_licenses_brokered_data: true,
    collects_data_not_directly_from_individuals: true,
    has_direct_relationship_with_data_subjects: false,
    has_eu_establishment: false,
    large_scale_monitoring: true,
    uses_ai_systems: true,
    ai_high_risk: true,
    is_public_authority: false,
  };
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const out = assembleRegistrationSkeletonDocument({ registration_deliverables: d, ...d }, intake);
  const table = execTables(out.document).find((t) => t.title === "Duty status");
  assertExists(table);
  assertEquals(table.columns, ["Duty", "Jurisdiction", "Status", "Information required"]);
  // A-TEAM S4 RULING S2.17 (doc 119): the status vocabulary is the reader's
  // ("Required on reported facts" / "Additional information required"), not
  // the engine's ("Attaches" / "Reserved").
  assert(table.rows.some((r) => r[0] === "Data-broker registration" && r[1] === "California" && r[2] === "Required on reported facts"));
  assert(table.rows.some((r) => r[0] === "Article 27 representative" && r[1] === "European Union" && r[2] === "Required on reported facts"));
  assert(table.rows.some((r) => r[0] === "Data protection officer" && r[2] === "Required on reported facts" && r[3] === "Written designation and the Art. 37(7) steps"));
  const ai = table.rows.find((r) => r[0] === "EU AI Act registration");
  assertExists(ai);
  assertEquals(ai[2], "Additional information required");
  assertStringIncludes(ai[3], "under its own name or trademark");
});

Deno.test("C3/S3.4: the Cyber exec carries the readiness snapshot after the lead, and the cover carries the verdict row", () => {
  const intake = CPPA_CYBER_GOLDEN[0].intake as Bag;
  const report: Bag = { ...buildCyberDeliverables(intake), authority_exhibit: { entries: [] } };
  const out = assembleCyberSkeletonDocumentV4(report, intake, "", "2026-08-30");
  const exec = out.document.sections.find((s) => s.id === "executive_summary");
  assertExists(exec);
  const kinds = exec.paragraphs.map((p) => p.kind);
  assertEquals(kinds.slice(0, 3), ["skeleton", "lead", "table"], "snapshot table must directly follow the determination lead");
  const snapshot = exec.paragraphs[2].table!;
  assertEquals(snapshot.title, "Readiness snapshot");
  assert(snapshot.hideHeader === true);
  assert(snapshot.rows.some((r) => r[0] === "Company"));
  assert(snapshot.rows.some((r) => r[0] === "Evidence posture"));
  // The debug-looking label stack is retired from the prose.
  const prose = exec.paragraphs.filter((p) => p.kind === "generated").map((p) => p.text).join(" ");
  assert(!prose.includes("Company / operating context:"), "orphan label line resurfaced in prose");
  assert(!prose.includes("Evidence posture:"), "orphan label line resurfaced in prose");

  const cover = out.document.sections.find((s) => s.id === "cover");
  const coverTable = cover?.paragraphs.find((p) => p.kind === "table")?.table;
  assertExists(coverTable);
  const verdictRow = coverTable.rows.find((r) => r[0] === "Overall assessment");
  assertExists(verdictRow, "cover verdict row missing");
  assertEquals(verdictRow[1], "No readiness conclusion on the information provided");
});

Deno.test("C3/S3.6: the retired ADMT product name never resurfaces in the PDF renderer", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/generate-report-pdf/index.ts", import.meta.url),
  );
  assert(!src.includes("CPPA ADMT Compliance Audit"), "old ADMT title resurfaced");
  assertStringIncludes(src, '"CPPA ADMT Compliance Assessment", "cppa-admt-v2"');
});
