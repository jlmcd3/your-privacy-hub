// Batch b83ea3c4 (2026-09-05) — three of the four GDPR companies answered
// special_category "No" beside special_categories_list ["Health data"] (the
// form only shows the pills on "Yes" but submitted their state regardless),
// and the report engaged Art. 37(1)(c) and defeated the Art. 30(5)
// derogation on special-category processing the company had denied. The
// categorical answer governs; the list is the "which categories" follow-up.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildArt30ExemptionDetermination,
  buildDpoDetermination,
  readGovernanceFacts,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { governanceContract } from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";

type Bag = Record<string, unknown>;

const VELANTRIX: Bag = {
  organization_name: "Velantrix Web Solutions Ltd",
  sector: "Technology/SaaS",
  org_size: "251-1000",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  eu_uk_data: "Yes",
  data_categories: ["Contact details", "Employee records", "Customer records", "Financial data", "Communications content"],
  special_category: "No",
  special_categories_list: ["Health data"],
  dpo_status: "Yes, formal DPO",
};

Deno.test("batch b83ea3c4 — a list beside a 'No' is not special-category processing", () => {
  const f = readGovernanceFacts(VELANTRIX);
  assertEquals(f.specialCategory, false);
  assertEquals(f.specialList, []);
  const yes = readGovernanceFacts({ ...VELANTRIX, special_category: "Yes" });
  assertEquals(yes.specialCategory, true);
  assertEquals(yes.specialList, ["Health data"]);
});

Deno.test("batch b83ea3c4 — Art. 37(1)(c) is not engaged on a 'No' with a leftover list; it is on a 'Yes'", () => {
  const no = buildDpoDetermination(VELANTRIX) as unknown as Bag;
  const noApp = String((no.designation_trigger as Bag).application ?? "");
  assert(!noApp.includes("(c) applies"), `limb (c) must not engage on a categorical No: ${noApp.slice(0, 200)}`);
  assert(!noApp.includes("Health data"), "the leftover list must not be quoted as the company's indication");

  const yes = buildDpoDetermination({ ...VELANTRIX, special_category: "Yes" }) as unknown as Bag;
  const yesApp = String((yes.designation_trigger as Bag).application ?? "");
  assert(yesApp.includes("(c) applies") && yesApp.includes("Health data"), "a categorical Yes with the list still engages (c)");
});

Deno.test("batch b83ea3c4 — the Art. 30(5) derogation does not fail on special-category processing the company denied", () => {
  const small = buildArt30ExemptionDetermination({ ...VELANTRIX, org_size: "11-50" }) as unknown as Bag;
  const text = JSON.stringify(small);
  assert(!text.includes("Health data"), `the leftover list must not surface in the Art. 30(5) determination: ${text.slice(0, 300)}`);
  const conditions = ((small.conditions ?? small.limbs ?? []) as Bag[]);
  const special = conditions.find((c) => c.condition === "special_category");
  if (special) assert(special.met !== true, `special_category condition must not be met on a categorical No: ${JSON.stringify(special)}`);
});

Deno.test("batch b83ea3c4 — the contract records the list as conditional on the categorical answer", () => {
  const field = governanceContract.fields.find((f) => f.key === "special_categories_list")!;
  assertEquals(field.required, "conditional");
  assertEquals(field.trigger, { key: "special_category", equals: ["Yes"] });
});

// The Syllabus & Record document numbers its sections 1–5; "Section III" was a
// pre-doc-173 remnant in two composers.
Deno.test("batch b83ea3c4 — no 'Section III' cross-reference survives in the governance composers", async () => {
  const root = new URL("../../../supabase/functions/run-governance-assessment/_local/ltp/", import.meta.url);
  for (const f of ["governance-domain-tables.ts", "governance-skeleton-assemble.ts"]) {
    const src = await Deno.readTextFile(new URL(f, root));
    const hits = src.split("\n").filter((l) => /Section III/.test(l) && !l.trim().startsWith("//"));
    assertEquals(hits, [], `${f}: ${hits.join(" | ")}`);
  }
});
