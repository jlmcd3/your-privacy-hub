// PANEL-BLOCKER IR-4 (2026-08-30) — the Art. 34(1) "no high risk" reasoning
// must never deny facts the record carries. The published EU sample said
// "neither scale nor a hostile actor is recorded" on a record whose own
// worksheet stated a ransomware cause and 1,000–10,000 affected individuals.
// The verdict logic is unchanged; the stated basis now acknowledges the
// recorded aggravators and explains why, without a high-risk category, they
// do not reach the Article 34(1) bar.
// Also pins the PANEL leak-class fix: the communication verdict renders as
// drafted prose, never as the raw enum with underscores stripped.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

function docFor(over: Bag = {}): { report: Bag; text: string } {
  const intake: Bag = {
    organizationName: "Nordlys Analytics ApS",
    discoveryDateTime: "2026-08-29T14:00",
    cause: "Ransomware or malware",
    dataTypes: ["Names and contact details"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["Denmark"],
    contained: "Yes",
    organisationType: "Company",
    ...over,
  };
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  return { report, text: JSON.stringify(assembleIRSkeletonDocument(report, intake)) };
}

Deno.test("IR-34: a ransomware record's no-high-risk basis acknowledges the hostile actor instead of denying it", () => {
  const { report } = docFor();
  const ds = JSON.stringify((report as Bag).notification_duties ?? report);
  assert(!ds.includes("neither scale nor a hostile actor is recorded"),
    "the false denial rendered on a record with a recorded hostile cause");
  assertStringIncludes(ds, "The record does show a hostile actor");
});

Deno.test("IR-34: the truly-quiet record keeps the original negative sentence (it is true there)", () => {
  const { report } = docFor({ cause: "Accidental disclosure", affectedCount: "Fewer than 100" });
  const ds = JSON.stringify((report as Bag).notification_duties ?? report);
  assertStringIncludes(ds, "neither scale nor a hostile actor is recorded");
});

Deno.test("IR-34: the rendered document never carries the raw communication verdict enum", () => {
  const { text } = docFor();
  assert(!text.includes("communication not required no high risk"),
    "raw enum splice rendered in customer document");
  assertStringIncludes(text, "no communication is required, because the Article 34(1) high-risk threshold is not reached");
});

Deno.test("IR-34: the customer framing note carries no authoring directive", () => {
  const { text } = docFor();
  assert(!text.includes("may never be reworded"));
  assertStringIncludes(text, "drafting scaffolding and not legal authority");
});
