// RK3-A3 GROUP 1 — Priority 3 intake fields (doc 31 §2c)
// Pins the two remaining §2c NEW-A fields end to end:
//   a6_safeguards[].risk_pathway_ids — multi-enum child field on
//     the existing safeguards repeater, linking each safeguard
//     to the harm-pathway categories it addresses.
//   harm_category_review_status — EUP internal QA tracker, never
//     printed; one row per HARM_PATHWAY_OPTS category with
//     review_status (Identified/Considered-none/Not yet assessed).
//
// Files touched: cppa-risk-assessment.ts (contract)
//                CPPARiskAssessment.enums.ts (parity enum)
//                CPPARiskAssessment.tsx (form)
//                CPPARiskRailEntries.ts (rail)

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  cppaRiskContract,
  HARM_CATEGORY_REVIEW_STATUS_OPTS,
  HARM_PATHWAY_OPTS,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";

const PAGE_PATH = new URL(
  "../../../src/pages/CPPARiskAssessment.tsx",
  import.meta.url,
);
const RAIL_PATH = new URL(
  "../../../src/components/cppa/CPPARiskRailEntries.ts",
  import.meta.url,
);
const ENUMS_PATH = new URL(
  "../../../src/pages/CPPARiskAssessment.enums.ts",
  import.meta.url,
);

const field = (key: string) => cppaRiskContract.fields.find((f) => f.key === key);

// ── CONTRACT — a6_safeguards[].risk_pathway_ids ───────────────────────────────

Deno.test("RK3-A3 g1 — contract carries a6_safeguards[].risk_pathway_ids as multi-enum, optional", () => {
  const f = field("a6_safeguards[].risk_pathway_ids");
  assert(f, "a6_safeguards[].risk_pathway_ids missing from cppaRiskContract");
  assertEquals(f!.required, "optional", "risk_pathway_ids must be optional at the data layer");
  assertEquals(f!.kind, "multi-enum", "risk_pathway_ids must be kind=multi-enum");
});

Deno.test("RK3-A3 g1 — risk_pathway_ids options match HARM_PATHWAY_OPTS exactly", () => {
  const f = field("a6_safeguards[].risk_pathway_ids");
  assertEquals(
    [...(f!.options as readonly string[])],
    [...HARM_PATHWAY_OPTS],
    "risk_pathway_ids options must equal HARM_PATHWAY_OPTS",
  );
});

// ── CONTRACT — harm_category_review_status ────────────────────────────────────

Deno.test("RK3-A3 g1 — contract carries harm_category_review_status as structured, optional", () => {
  const f = field("harm_category_review_status");
  assert(f, "harm_category_review_status missing from cppaRiskContract");
  assertEquals(f!.required, "optional");
  assertEquals(f!.kind, "structured");
});

Deno.test("RK3-A3 g1 — harm_category_review_status children carry correct options", () => {
  const catField = field("harm_category_review_status[].harm_category");
  const statusField = field("harm_category_review_status[].review_status");
  assert(catField, "harm_category_review_status[].harm_category missing");
  assert(statusField, "harm_category_review_status[].review_status missing");
  assertEquals([...(catField!.options as readonly string[])], [...HARM_PATHWAY_OPTS]);
  assertEquals(
    [...(statusField!.options as readonly string[])],
    [...HARM_CATEGORY_REVIEW_STATUS_OPTS],
  );
});

Deno.test("RK3-A3 g1 — HARM_CATEGORY_REVIEW_STATUS_OPTS parity: contract === enums.ts", async () => {
  const src = await Deno.readTextFile(ENUMS_PATH);
  assert(
    src.includes('HARM_CATEGORY_REVIEW_STATUS_OPTS = ["Identified", "Considered-none", "Not yet assessed"]'),
    "enums.ts must export HARM_CATEGORY_REVIEW_STATUS_OPTS with the correct values",
  );
});

// ── FORM ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A3 g1 — form emits harm_category_review_status in the intake memo", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(
    src.includes("harm_category_review_status:"),
    "intake memo must emit harm_category_review_status",
  );
});

Deno.test("RK3-A3 g1 — form initialises a6Safeguards rows with risk_pathway_ids array", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(
    src.includes("risk_pathway_ids: []"),
    "initial a6Safeguards state must include risk_pathway_ids: []",
  );
});

Deno.test("RK3-A3 g1 — form includes harm_category_review_status QA panel in step 5", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(
    src.includes('data-rail-key="harm_review_status"'),
    "step 5 must include the harm_review_status rail block",
  );
  assert(
    src.includes("harmCategoryReviewStatus"),
    "form must reference harmCategoryReviewStatus state",
  );
});

Deno.test("RK3-A3 g1 — applyRestore hydrates harmCategoryReviewStatus", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(
    src.includes("d.harmCategoryReviewStatus") && src.includes("setHarmCategoryReviewStatus"),
    "applyRestore must hydrate harmCategoryReviewStatus",
  );
});

Deno.test("RK3-A3 g1 — INITIAL_DRAFT_JSON includes harmCategoryReviewStatus", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(
    src.includes("harmCategoryReviewStatus: {} as Record<string, string>"),
    "INITIAL_DRAFT_JSON must include harmCategoryReviewStatus: {}",
  );
});

// ── RAIL ──────────────────────────────────────────────────────────────────────

Deno.test("RK3-A3 g1 — statute rail carries the harm_review_status entry citing 7152(a)(5)", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("harm_review_status: {"), "rail must define harm_review_status");
  assert(
    src.includes("7152(a)(5)"),
    "rail entry must reference § 7152(a)(5)",
  );
  assert(
    src.includes("never printed"),
    "rail entry must note that the field is never printed",
  );
});
