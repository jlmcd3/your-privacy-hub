// DOC 139 (2026-09-02, A-Team Batch 6 §12.1) — the standing "Notification
// clocks" table's individuals column previously read a bare "—" for every
// GDPR-family jurisdiction, which an external legal review found misleading:
// it reads as "no duty exists" when Article 34 is a real, conditional
// communication duty. The cell now states the Art. 34(1) trigger and points
// to this playbook's own per-incident determination — no fixed clock is
// invented (doc 113 S2.3's law is unchanged; Art. 34 genuinely has none).

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

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
    ...over,
  };
}

function tablesOf(out: ReturnType<typeof assembleIRSkeletonDocument>, sectionId: string) {
  const sec = out.document.sections.find((s) => s.id === sectionId);
  return (sec?.paragraphs ?? []).filter((p) => p.kind === "table" && p.table).map((p) => p.table!);
}

function assemble(intake: Bag) {
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  return assembleIRSkeletonDocument(report, intake);
}

Deno.test("doc139 — standing clock table states the Art. 34(1) conditional duty, not a bare dash", () => {
  const out = assemble(euIntake());
  const tables = tablesOf(out, "standing_sections");
  const clocks = tables.find((t) => t.title === "Notification clocks");
  assert(clocks, "notification clocks table missing");
  const row = clocks!.rows.find((r) => r[0] === "EU/EEA — GDPR (Regulation (EU) 2016/679)" || r[0].includes("GDPR"));
  assert(row, "GDPR-family row missing");
  assert(row![1] !== "—", "individuals cell must not be a bare dash");
  assertStringIncludes(row![1], "without undue delay");
  assertStringIncludes(row![1], "GDPR Art. 34(1)");
  assertStringIncludes(row![1], "individual-notification determination");
});

Deno.test("doc139 — UK-regime row cites UK GDPR Art. 34(1), not the EU citation", () => {
  const out = assemble(euIntake({ jurisdictions: ["United Kingdom"] }));
  const tables = tablesOf(out, "standing_sections");
  const clocks = tables.find((t) => t.title === "Notification clocks");
  assert(clocks, "notification clocks table missing");
  const row = clocks!.rows.find((r) => r[0].toLowerCase().includes("uk") || r[0].toLowerCase().includes("united kingdom"));
  assert(row, "UK row missing");
  assertStringIncludes(row![1], "UK GDPR Art. 34(1)");
});

Deno.test("doc139 — no fixed individual-notification deadline is invented (doc 113 S2.3 preserved)", () => {
  const out = assemble(euIntake());
  const tables = tablesOf(out, "standing_sections");
  const clocks = tables.find((t) => t.title === "Notification clocks");
  const row = clocks!.rows.find((r) => r[3].includes("Art. 33"));
  assert(row, "GDPR row missing");
  assert(!/\d+\s*hours/.test(row![1]), "no fixed-hour deadline should appear in the individuals cell");
});
