// E8973164 (2026-08-28, quality batch) — two registration defects:
//
// 1. HIGH hallucination — `buildRepresentative`'s "occasional exemption
//    unavailable" sentence recited ALL THREE defeating conditions
//    (large-scale monitoring, special categories, broker activity)
//    disjunctively regardless of which were actually true, so a record
//    where only large_scale_monitoring was true still read as if it
//    "involves large-scale monitoring, special categories or brokered
//    data" — an overclaim the intake's own false fields contradicted.
//
// 2. MEDIUM boilerplate — `composeExecPosture` asserted "No
//    jurisdiction-level determination was produced ... so this assessment
//    asserts no filing posture" whenever the US state data-broker
//    determination array was empty, even when the EU/UK representative or
//    DPO determinations were live — directly contradicted by the
//    document's own body.
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

const baseIntake = (overrides: Record<string, unknown> = {}) => ({
  organization_name: "Halverson Digital Freight GmbH",
  organization_country: "DE",
  markets_served: ["UK"],
  is_public_authority: false,
  has_eu_establishment: false,
  has_uk_establishment: false,
  large_scale_monitoring: true,
  processes_special_categories: false,
  acts_as_data_broker: false,
  ...overrides,
});

Deno.test("E8973164-R1 — the engaged sentence names only the ground(s) actually true", () => {
  const built = buildRegistrationDeliverables(baseIntake() as never);
  const uk = built.representative_determinations.find((r) => r.jurisdiction === "UK")!;
  assertStringIncludes(uk.application, "large-scale monitoring");
  assert(!uk.application.includes("special categories"), `must not assert a false ground: ${uk.application}`);
  assert(!uk.application.includes("brokered data"), `must not assert a false ground: ${uk.application}`);
});

Deno.test("E8973164-R1 — two true grounds are both named, joined with 'and'", () => {
  const built = buildRegistrationDeliverables(
    baseIntake({ processes_special_categories: true }) as never,
  );
  const uk = built.representative_determinations.find((r) => r.jurisdiction === "UK")!;
  assertStringIncludes(uk.application, "large-scale special-category processing");
  assertStringIncludes(uk.application, "large-scale monitoring");
  assertStringIncludes(uk.application, " and ");
});

Deno.test("E8973164-R2 — the exec posture never contradicts a live EU/UK or DPO determination", () => {
  const intake = baseIntake();
  const built = buildRegistrationDeliverables(intake as never);
  const report = { registration_deliverables: built };
  const result = assembleRegistrationSkeletonDocument(report as never, intake as never);
  const text = skeletonDocumentToText(result.document);
  assert(
    !text.includes("No jurisdiction-level determination was produced"),
    `must not claim no determination exists when representative/DPO determinations are live: ${text.slice(0, 2000)}`,
  );
});
