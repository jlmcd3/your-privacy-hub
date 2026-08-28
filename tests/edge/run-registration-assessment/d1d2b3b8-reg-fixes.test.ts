// D1D2B3B8 (quality batch, 2026-08-27) — Registration fixes.
//   R1 [HIGH] the size-band label contradicted the record's own headcount
//      ("medium (50–249 employees)" against employee_count 310); the
//      recorded count now wins when it falls outside the recorded band.
//   R2 [HIGH ×2] Art. 37(1)(c) recited its test ("Branch (c) is engaged
//      where such processing is a CORE ACTIVITY on a LARGE SCALE") without
//      applying it; the why is now one conclusion-with-basis sentence, and
//      the headline/reasoning distinguish firm engagement from the
//      conservative-basis treatment.
//   R3 [HIGH ×2] the Art. 27(2) exemption recital rendered after the duty
//      was already disapplied on the establishment ground; it now renders
//      only where the duty question is live, and a UK determination cites
//      the UK instrument.
//   R4 [HIGH] the executive lead's duty count ignored duty questions the
//      body itself flags as corpus-pending (EU AI Act); the lead now counts
//      them.
//   R5 [MEDIUM] a named non-US market outside the assessed frameworks (AU)
//      earned silence; it now earns a scoped-out statement.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import {
  assembleRegistrationSkeletonDocument,
  buildRegistrationSlotValues,
  computeDutyCounts,
} from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

function aurabloomIntake(over: Bag = {}): Bag {
  return {
    organization_name: "Aurabloom Health Platforms Ltd",
    organization_country: "IE",
    organization_size: "medium",
    employee_count: 310,
    industry: "Healthcare",
    role: "controller",
    processes_personal_data: true,
    processes_special_categories: true,
    has_eu_establishment: true,
    has_uk_establishment: true,
    eu_lead_member_state: "IE",
    markets_served: ["IE", "UK", "AU"],
    acts_as_data_broker: false,
    large_scale_monitoring: false,
    is_public_authority: false,
    uses_ai_systems: true,
    ai_high_risk: true,
    ...over,
  };
}

function skeletonText(intake: Bag): string {
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const report: Bag = { registration_deliverables: d, ...d };
  return JSON.stringify(assembleRegistrationSkeletonDocument(report, intake));
}

Deno.test("R1 — a headcount outside the recorded band wins over the band label", () => {
  const v = buildRegistrationSlotValues(aurabloomIntake());
  assertEquals(v.orgSize, "310 employees");
});

Deno.test("R1 — an in-band headcount keeps the band label", () => {
  const v = buildRegistrationSlotValues(aurabloomIntake({ employee_count: 120 }));
  assertEquals(v.orgSize, "medium (50–249 employees)");
});

Deno.test("R1 — no headcount keeps the band label unchanged", () => {
  const v = buildRegistrationSlotValues(aurabloomIntake({ employee_count: undefined }));
  assertEquals(v.orgSize, "medium (50–249 employees)");
});

Deno.test("R2 — branch (c) states its conservative basis in one sentence, never the bare test recital", () => {
  const d = buildRegistrationDeliverables(aurabloomIntake() as never) as unknown as Bag;
  const dpo = d.dpo_determination as Bag;
  const findings = dpo.findings as Bag[];
  const c = findings.find((f) => String(f.key) === "dpo_trigger_special_categories");
  assert(c, "the branch (c) finding must exist");
  const app = String(c!.application);
  assert(
    !app.startsWith("Branch (c) is engaged where"),
    "the bare test recital must not lead the application",
  );
  assertStringIncludes(app, "The record evidences special-category processing");
  assertStringIncludes(app, "treated as engaged on a conservative basis");
});

Deno.test("R2 — a conservative-only engagement hedges the headline; reasoning separates the footings", () => {
  const d = buildRegistrationDeliverables(aurabloomIntake() as never) as unknown as Bag;
  const dpo = d.dpo_determination as Bag;
  // large_scale_monitoring false, not public → only branch (c), conservatively.
  assertStringIncludes(String(dpo.headline), "conservative reading");
  assertStringIncludes(String(dpo.reasoning), "Treated as engaged on a conservative basis");
  assert(
    !String(dpo.reasoning).match(/(?<!conservative basis: )Engaged: /),
    "no flat Engaged list when every engaged branch is conservative",
  );
});

Deno.test("R2 — a firm branch keeps the mandatory headline and lists footings separately", () => {
  const d = buildRegistrationDeliverables(aurabloomIntake({ large_scale_monitoring: true }) as never) as unknown as Bag;
  const dpo = d.dpo_determination as Bag;
  assertStringIncludes(String(dpo.headline), "A data protection officer must be designated");
  assertStringIncludes(String(dpo.headline), "treated as engaged on a conservative basis");
  assertStringIncludes(String(dpo.reasoning), "Engaged: ");
  assertStringIncludes(String(dpo.reasoning), "Treated as engaged on a conservative basis: ");
});

Deno.test("R3 — an established entity renders no Art. 27(2) exemption recital", () => {
  const d = buildRegistrationDeliverables(aurabloomIntake() as never) as unknown as Bag;
  const reps = d.representative_determinations as Bag[];
  for (const r of reps) {
    assertEquals(String(r.verdict), "not_applicable");
    assertEquals(String(r.exemption_analysis ?? ""), "");
  }
});

Deno.test("R3 — a live UK representative duty cites the UK instrument in its exemption analysis", () => {
  const d = buildRegistrationDeliverables(aurabloomIntake({
    organization_country: "US",
    has_eu_establishment: false,
    has_uk_establishment: false,
    markets_served: ["UK"],
    processes_special_categories: true,
    large_scale_monitoring: true,
  }) as never) as unknown as Bag;
  const reps = d.representative_determinations as Bag[];
  const uk = reps.find((r) => String(r.jurisdiction) === "UK");
  assert(uk, "a UK representative determination must exist");
  assertEquals(String(uk!.verdict), "engaged");
  const ex = String(uk!.exemption_analysis);
  assert(ex.length > 0, "a live duty carries the exemption analysis");
  assertStringIncludes(ex, "UK GDPR");
  assert(!/(?<!UK )GDPR Art\. 27/.test(ex), "the EU instrument label must not head the UK exemption recital");
});

Deno.test("R4 — the executive lead counts corpus-pending duty questions", () => {
  const intake = aurabloomIntake();
  const d = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const report: Bag = { registration_deliverables: d, ...d };
  const counts = computeDutyCounts(report);
  assert(counts.corpus_pending > 0, "the AI-systems fixture must flag a corpus-pending question");
  const text = JSON.stringify(assembleRegistrationSkeletonDocument(report, intake));
  assertStringIncludes(text, "flagged below but not yet assessable in this product's verified corpus");
});

Deno.test("R5 — a named non-US market outside the assessed frameworks earns a scoped-out statement", () => {
  const text = skeletonText(aurabloomIntake());
  assertStringIncludes(text, "No registration or notification regime for");
  assertStringIncludes(text, "is in this product's verified corpus");
});
