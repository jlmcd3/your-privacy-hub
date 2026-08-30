// PANEL-BLOCKER REG-1 (2026-08-30) — the GDPR-wing applicability gate on the
// Art. 37 DPO walk. The expert-panel review caught the published US sample
// asserting "A data protection officer must be designated" (Art. 37(1)(b),
// large-scale monitoring) for a US-only organisation in the SAME document
// whose Art. 27 walk correctly found Article 3(2) not engaged. The DPO duty
// exists only where the GDPR/UK GDPR applies; the walk now gates on the same
// establishment/market facts the Art. 27 walk reads.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";

type Bag = Record<string, unknown>;

const base: Bag = {
  organization_name: "Busted Sled Solutions, Inc.",
  organization_country: "US",
  organization_size: "medium",
  employee_count: 120,
  industry: "Consumer software",
  markets_served: ["US-CA", "US-CO", "US-VA"],
  has_eu_establishment: false,
  has_uk_establishment: false,
  is_public_authority: false,
  large_scale_monitoring: true,
  processes_special_categories: false,
  acts_as_data_broker: false,
  uses_ai_systems: false,
};

function dpoFor(over: Bag = {}): Bag {
  const d = buildRegistrationDeliverables({ ...base, ...over } as never) as Bag;
  return d.dpo_determination as Bag;
}

Deno.test("REG-GATE: a US-only record never receives a GDPR DPO duty, even with large-scale monitoring recorded", () => {
  const dpo = dpoFor();
  assertEquals(dpo.verdict, "not_engaged");
  assertEquals((dpo.findings as unknown[]).length, 0);
  assertStringIncludes(String(dpo.headline), "not required under the GDPR or UK GDPR");
  assertStringIncludes(String(dpo.reasoning), "neither instrument reaches the organisation");
  assert(!String(dpo.headline).includes("must be designated"));
});

Deno.test("REG-GATE: the scoped-out prose never contradicts the Art. 27 walk's own language family", () => {
  const dpo = dpoFor();
  assertStringIncludes(
    String(dpo.reasoning),
    "not established in the Union or the United Kingdom",
  );
  // The branch walk must NOT run: no branch citation may appear anywhere.
  const all = JSON.stringify(dpo);
  assert(!all.includes("37(1)(a)") && !all.includes("37(1)(b)") && !all.includes("37(1)(c)"));
});

Deno.test("REG-GATE: EU establishment keeps the full three-branch walk byte-compatible", () => {
  const dpo = dpoFor({
    organization_name: "Misfit Toys Logistics Ltd",
    organization_country: "DE",
    markets_served: ["DE", "FR"],
    has_eu_establishment: true,
  });
  assertEquals(dpo.verdict, "engaged");
  assertEquals((dpo.findings as unknown[]).length, 3);
  assertStringIncludes(String(dpo.headline), "must be designated");
});

Deno.test("REG-GATE: EU market WITHOUT establishment still reaches the walk (Art. 3(2) offering signal)", () => {
  const dpo = dpoFor({ markets_served: ["US-CA", "DE"] });
  assertEquals((dpo.findings as unknown[]).length, 3);
});

Deno.test("REG-GATE: UK-only market keeps the walk under the UK GDPR label", () => {
  const dpo = dpoFor({ markets_served: ["UK"] });
  assertEquals((dpo.findings as unknown[]).length, 3);
  assertStringIncludes(String(dpo.headline), "UK GDPR Art. 37(1)");
});

Deno.test("REG-GATE: unknown establishment with no market signal degrades to record_insufficient, never asserts either way", () => {
  const dpo = dpoFor({ has_eu_establishment: null, has_uk_establishment: null });
  assertEquals(dpo.verdict, "record_insufficient");
  assertEquals((dpo.findings as unknown[]).length, 0);
  assertStringIncludes(String(dpo.information_needed ?? ""), "established in the Union or the United Kingdom");
  // The headline may NAME the question ("Whether a data protection officer
  // must be designated cannot be determined…") but must never ASSERT the duty.
  assert(!String(dpo.headline).startsWith("A data protection officer must be designated"));
  assertStringIncludes(String(dpo.headline), "cannot be determined");
});

Deno.test("REG-GATE: no double period when the organisation name ends with an abbreviation", () => {
  const dpo = dpoFor();
  assert(!String(dpo.headline).includes(".."));
  assert(!String(dpo.reasoning).includes(".."));
});

// PANEL QUOTE-HYGIENE — the ";." artifact: statutory verbatim quotes ending
// with the subparagraph's own ";" must not render as `;."` in the skeleton.
Deno.test("REG-GATE: skeleton quote splices carry no ';.' artifact on an EU record", async () => {
  const { assembleRegistrationSkeletonDocument } = await import(
    "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts"
  );
  const intake = {
    ...base,
    organization_name: "Misfit Toys Logistics Ltd",
    organization_country: "DE",
    markets_served: ["DE", "FR"],
    has_eu_establishment: true,
  };
  const deliverables = buildRegistrationDeliverables(intake as never) as Bag;
  const report: Bag = { deliverables, ...deliverables };
  const doc = assembleRegistrationSkeletonDocument(report as never, intake as never);
  const text = JSON.stringify(doc);
  assert(!text.includes(';."'), "found the ;.\" artifact in rendered skeleton");
  assert(!text.includes(";."), "found a ;. splice in rendered skeleton");
});
