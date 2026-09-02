// DOC 137 FIX 2 — the Action plan's owner cell, and the Art. 33(3) content
// plan's owner clause, fell back to "[role] — assign on the recorded
// roster" when no roster entry matched the role. An external reviewer
// (ChatGPT A-Team) flagged that wording as readable as pointing to a
// COMPLETE roster the reader just needs to consult, when the actual state is
// that the roster itself is missing this role. Reworded to
// "[role] — assign a named holder when the response roster is completed."
//
// The MATCHED branch — a real person found on a real roster row, e.g. the
// EU/GDPR "Escalation roster" naming Declan Farrell, Harriet Okonkwo, etc.
// (see e8973164-ir-fixes.test.ts) — already names the person and is
// untouched by this fix; these tests assert that too.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

function usIntake(over: Bag = {}): Bag {
  return {
    organizationName: "Busted Sled Solutions, Inc.",
    organisationType: "Company",
    discoveryDateTime: "2026-08-20T10:00",
    cause: "Ransomware or malware",
    dataTypes: ["Government IDs / SSN", "Financial / payment data"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["California", "Texas"],
    contained: "No",
    responseTeamRoster: [
      { role: "Incident Lead", name: "J. Ortiz", alternate: "P. Chen" },
    ],
    outsideCounselName: "Vance & Arden LLP",
    breachNoticeContracts: [
      { party: "Acme Fulfilment", deadline: "48 hours from confirmation", clause: "cl. 11.4" },
    ],
    ...over,
  };
}

function euIntake(over: Bag = {}): Bag {
  return {
    organizationName: "Nordkyst Cold Chain A/S",
    organisationType: "Logistics operator",
    discoveryDateTime: "2026-08-29T14:00",
    cause: "Ransomware or malware",
    dataTypes: ["Names and contact details", "Biometric data"],
    affectedCount: "10,000–100,000",
    jurisdictions: ["Denmark"],
    contained: "Yes",
    processorInvolved: true,
    processorName: "Nordisk WMS ApS",
    ...over,
  };
}

function assemble(intake: Bag) {
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  return assembleIRSkeletonDocument(report, intake);
}

function tablesOf(out: ReturnType<typeof assembleIRSkeletonDocument>, sectionId: string) {
  const sec = out.document.sections.find((s) => s.id === sectionId);
  return (sec?.paragraphs ?? []).filter((p) => p.kind === "table" && p.table).map((p) => p.table!);
}

Deno.test("DOC 137 FIX 2: US Action plan — no forensics/security match reads the completed-roster wording, not 'assign on the recorded roster'", () => {
  const out = assemble(usIntake());
  const text = skeletonDocumentToText(out.document);
  assert(!text.includes("assign on the recorded roster"), "old wording resurfaced");
  const plan = tablesOf(out, "incident_worksheet").find((t) => t.title === "Action plan")!;
  const caRow = plan.rows.find((r) => String(r[1]).startsWith("Determine whether notification is required under the law of California"))!;
  assertEquals(caRow[4], "Security / Forensics Lead — assign a named holder when the response roster is completed");
});

Deno.test("DOC 137 FIX 2: US Action plan — a matched roster entry still names the real person, unaffected by the wording fix", () => {
  const out = assemble(usIntake());
  const plan = tablesOf(out, "incident_worksheet").find((t) => t.title === "Action plan")!;
  // The contract-notice row is an Incident Lead action, and the roster
  // names J. Ortiz for that role — the matched branch, untouched.
  assertStringIncludes(String(plan.rows[0][4]), "J. Ortiz");
  assert(!String(plan.rows[0][4]).includes("assign a named holder"), "matched row should not carry the unmatched fallback");
});

Deno.test("DOC 137 FIX 2: EU Art. 33(3) content-plan prose — no roster at all reads the completed-roster wording", () => {
  const out = assemble(euIntake());
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "The action plan, in the order the clocks run:");
  assert(!text.includes("assign on the recorded roster"), "old wording resurfaced in the EU prose path");
  assertStringIncludes(text, "assign a named holder when the response roster is completed");
});

Deno.test("DOC 137 FIX 2: EU Art. 33(3) content-plan prose — a recorded roster still names the real person for a matched role", () => {
  const out = assemble(euIntake({
    responseTeamRoster: [
      { role: "Data Protection Officer", name: "Declan Farrell", alternate: "" },
    ],
  }));
  const text = skeletonDocumentToText(out.document);
  assertStringIncludes(text, "Declan Farrell");
  assertStringIncludes(text, "on the recorded roster");
});
