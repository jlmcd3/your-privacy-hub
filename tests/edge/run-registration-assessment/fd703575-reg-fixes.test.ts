// FD703575 (quality batch, 2026-08-27) — Registration fixes.
// The batch's registration document (row 5b5afa52, scored 85.9):
//   R1 the executive lead said "2 registration duties attach … none is
//      presently satisfied" while the body identified only one concrete
//      filing (California data broker) — the second counted duty (DPO
//      designation) was analysed with no closing act. The lead now NAMES
//      the counted duties, and an engaged DPO determination carries its
//      closing act (written designation + the Art. 37(7) follow-up, named
//      but never quoted — its text is not in the verified corpus).
//   R2 markets naming Colorado and Virginia earned silence: only California
//      was addressed and nothing said whether the other named states were
//      assessed. A named US-state market outside the four registries now
//      earns a corpus-bounded scope statement (the biometric S-B5
//      honest-posture pattern).
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

function vantecorIntake(): Bag {
  return {
    organization_name: "Vantecor Analytics GmbH",
    organization_country: "DE",
    organization_size: "51-250",
    industry: "AdTech / MarTech",
    role: "controller",
    processes_personal_data: true,
    has_eu_establishment: true,
    has_uk_establishment: false,
    markets_served: ["DE", "FR", "NL", "US-CA", "US-CO", "US-VA"],
    acts_as_data_broker: true,
    sells_or_licenses_brokered_data: true,
    collects_data_not_directly_from_individuals: true,
    has_direct_relationship_with_data_subjects: false,
    large_scale_monitoring: true,
    processes_special_categories: false,
    is_public_authority: false,
  };
}

function skeletonText(): string {
  const intake = vantecorIntake();
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const report: Bag = { registration_deliverables: d, ...d };
  const sk = assembleRegistrationSkeletonDocument(report, intake);
  return JSON.stringify(sk);
}

Deno.test("R1 — the executive lead names every counted duty", () => {
  const text = skeletonText();
  const lead = text.match(/Based on the information supplied, [^"]*registration dut[^"]*/)?.[0] ?? "";
  assert(lead.length > 0, "the duties-attach lead must render");
  assertStringIncludes(lead, "data-broker registration in California");
  assertStringIncludes(lead, "the designation of a data protection officer");
});

Deno.test("R1 — an engaged DPO determination states its closing act without quoting an un-ingested provision", () => {
  const d = buildRegistrationDeliverables(vantecorIntake() as never) as unknown as Bag;
  const dpo = d.dpo_determination as Bag;
  assert(String(dpo.verdict) === "engaged", "fixture must engage the DPO duty (Art. 37(1)(b))");
  // 3E9AD759-R2 — the closing act rides its own field so the skeleton's
  // 3-sentence reasoning budget can never truncate it (which is exactly
  // what happened to the reasoning-appended version in batch 3e9ad759).
  const act = String(dpo.closing_act ?? "");
  assertStringIncludes(act, "What closes the duty is a written designation");
  assertStringIncludes(act, "communicating them to the supervisory authority");
  // RE-PIN PANEL LEAK-1 (2026-08-30).
  assertStringIncludes(act, "not yet among the authorities relied on in this assessment and is not quoted");
});

Deno.test("R2 — named US-state markets outside the four registries earn a corpus-bounded scope statement", () => {
  const text = skeletonText();
  assertStringIncludes(text, "Colorado (US)");
  assertStringIncludes(text, "Virginia (US)");
  assertStringIncludes(text, "No data-broker registration statute for those states is among the four state registries covered by this assessment");
});

Deno.test("R2 — no scope statement renders when every named US market is a registry state", () => {
  const intake = { ...vantecorIntake(), markets_served: ["DE", "US-CA"] };
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const sk = assembleRegistrationSkeletonDocument({ registration_deliverables: d, ...d }, intake);
  const text = JSON.stringify(sk);
  assert(!text.includes("is among the four state registries in the verified statutory corpus behind this assessment"), "the parity sentence must not render without an unregistered named state");
});
