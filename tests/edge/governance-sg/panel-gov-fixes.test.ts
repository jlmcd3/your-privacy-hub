// PANEL FIX BATCH 2 (2026-08-30) — governance defects from the expert-panel
// review (doc 108), each verified against the published samples before
// fixing:
//   GOV-1  the accountability insufficiency reasoning cited "0 of 8
//          accountability duties are unanswered" as its own grounds and the
//          ask ordered completing unanswered duties that did not exist —
//          grounds and ask are now composed from the leg(s) actually open;
//   GOV-2  an ANSWERED designation question with an unrecognised value
//          printed the false "The record does not answer the DPO question."
//          + the identical ask, twice (Arts. 38 and 39 fallbacks);
//   GOV-6  a degraded regulatory_basis (emit-gate substitution literal)
//          spliced into "The provisions engaged are ___." — an error string
//          rendered as a citation, twice, on the published US sample.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildAccountabilityDetermination,
  buildDpoDetermination,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";

type Bag = Record<string, unknown>;
type Finding = { verdict: string; status?: string; information_needed?: string };

const evidencedDuty = (duty: string) => ({
  duty,
  artifact_present: "yes" as const,
  artifact: "Named artifact",
  citation: "GDPR Art. 5(2)",
});

const analysedFinding = (verdict: string): Finding => ({ verdict, status: "analysed" });

Deno.test("GOV-1: review-leg insufficiency states the review leg, never '0 of N duties are unanswered'", () => {
  const demonstrability = Array.from({ length: 8 }, (_, i) => evidencedDuty(`duty-${i}`)) as never;
  const det = buildAccountabilityDetermination(
    {},
    demonstrability,
    analysedFinding("satisfied") as never,
    { verdict: "record_insufficient", status: "record_insufficient" } as never,
  );
  assertEquals(det.status, "record_insufficient");
  assert(!det.reasoning.includes("0 of 8"), "cited a zero-count as grounds");
  assert(!det.reasoning.includes("duties are unanswered"), "claimed unanswered duties on a fully-answered record");
  assertStringIncludes(det.reasoning, "the Article 24(1) review evidence is incomplete");
  assertStringIncludes(String(det.information_needed ?? ""), "review evidence");
  assert(!String(det.information_needed ?? "").includes("unanswered accountability duties"));
});

Deno.test("GOV-1: demonstrability-leg insufficiency keeps the duty count and the Article 5(2) burden sentence", () => {
  const demonstrability = [
    ...Array.from({ length: 3 }, (_, i) => evidencedDuty(`duty-${i}`)),
    ...Array.from({ length: 5 }, (_, i) => ({ duty: `open-${i}`, artifact_present: "unknown" as const, artifact: "", citation: "GDPR Art. 5(2)" })),
  ] as never;
  const det = buildAccountabilityDetermination(
    {},
    demonstrability,
    analysedFinding("satisfied") as never,
    analysedFinding("satisfied") as never,
  );
  assertEquals(det.status, "record_insufficient");
  assertStringIncludes(det.reasoning, "5 of 8 accountability duties are unanswered");
  assertStringIncludes(det.reasoning, "Article 5(2) places the burden on the controller");
  assertStringIncludes(String(det.information_needed ?? ""), "unanswered accountability duties");
});

Deno.test("GOV-2: an unrecognised designation answer is stated as unrecognised, never as unanswered, with differentiated asks", () => {
  const dpo = buildDpoDetermination({
    dpo_status: "Privacy lead appointed",
    org_size: "201-1000",
    sector: "AdTech",
  }) as Bag;
  const art38 = dpo.position_and_independence as Bag;
  const art39 = dpo.task_coverage as Bag;
  assertStringIncludes(String(art38.record_fact), 'answers the designation question "Privacy lead appointed"');
  assertStringIncludes(String(art38.record_fact), "does not match a designation state this assessment recognises");
  assert(!String(art38.record_fact).includes("does not answer the DPO question"));
  assert(!String(art39.record_fact).includes("does not answer the DPO question"));
  // The two asks must not be verbatim duplicates.
  assert(String(art38.information_needed) !== String(art39.information_needed));
});

Deno.test("GOV-6: a degraded regulatory_basis never renders as 'The provisions engaged are …'", async () => {
  const { assembleGovernanceSkeletonDocument } = await import(
    "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts"
  );
  const domain_findings = {
    data_submission: {
      domain: "data_submission",
      domain_name: "Data Submission Risk",
      severity: "Compliant",
      current_state: "Technical controls are actively enforced.",
      gap_description: "",
      regulatory_basis: "We could not verify this item from the information provided; it is listed under information needed.",
      recommended_action: "Keep the control coverage aligned with the tools list as it changes.",
    },
    tool_inventory: {
      domain: "tool_inventory",
      domain_name: "Tool Inventory and Sanctioning",
      severity: "Compliant",
      current_state: "The company maintains a tool inventory.",
      gap_description: "",
      regulatory_basis: "GDPR Arts. 5(2), 24(1), 30",
      recommended_action: "Keep the inventory audit cadence.",
    },
  };
  const sk = assembleGovernanceSkeletonDocument(
    { domain_findings, readiness_determination: {} } as never,
    { organization_name: "Vortex AdTech SE" } as never,
  );
  const text = JSON.stringify(sk.document);
  assert(!text.includes("The provisions engaged are We could not verify"), "error literal rendered as citation");
  assertStringIncludes(text, "The provisions engaged are GDPR Arts. 5(2), 24(1), 30.");
});
