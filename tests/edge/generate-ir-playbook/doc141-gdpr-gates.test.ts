// DOC 141 (2026-09-02) — two narrow IR fixes:
//
//   FIX 1 — the standing playbook's first-24-hours checklist appended one row
//   per `content_owner_mapping` element (the four GDPR Art. 33(3)(a)-(d)
//   actions) regardless of jurisdiction, because the mapping is computed
//   unconditionally upstream. The rows are now gated on GDPR-family
//   engagement inside buildFirst24Hours (standing-playbook.ts), the single
//   point both consumers (index.ts and the ir-csc rebuild) pass through.
//
//   FIX 2 — the notification-clocks table's EU row read only the generic
//   regime label; the intake's own recorded member states (e.g. Ireland,
//   Germany) appeared nowhere in the document. The row label now echoes the
//   recorded selections. Label wiring only — no statutory content was added.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { buildStandingPlaybook } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts";
import { assembleIRSkeletonDocument } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

function baseIntake(over: Bag = {}): Bag {
  return {
    organizationName: "Halcyon Freight Systems",
    organisationType: "Logistics operator",
    discoveryDateTime: "2026-08-30T10:00",
    cause: "Ransomware or malware",
    dataTypes: ["Names and contact details"],
    affectedCount: "10,000–100,000",
    contained: "Yes",
    itIsolationAuthority: "Head of IT Operations",
    ...over,
  };
}

const US_ONLY = baseIntake({ jurisdictions: ["California", "Texas"] });
const EU_TWO_STATES = baseIntake({ jurisdictions: ["Ireland", "Germany"] });

/** Mirrors index.ts: the mapping handed to buildStandingPlaybook is the one
 * attachIrPlaybookDeliverables wrote onto the report (unconditionally). */
function standingPlaybookFor(intake: Bag) {
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  return buildStandingPlaybook(intake, report.content_owner_mapping as never);
}

function first24RowsFor(intake: Bag): string[][] {
  const sp = standingPlaybookFor(intake);
  const sec = sp.sections.find((s) => s.id === "first_24_hours_checklist") as { rows: string[][]; note?: string };
  assert(sec, "first-24-hours checklist missing");
  return sec.rows;
}

function clocksTableFor(intake: Bag) {
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  const out = assembleIRSkeletonDocument(report, intake);
  const sec = out.document.sections.find((s) => s.id === "standing_sections");
  const tables = (sec?.paragraphs ?? []).filter((p) => p.kind === "table" && p.table).map((p) => p.table!);
  return tables.find((t) => t.title === "Notification clocks");
}

// ── FIX 1 — GDPR-family gate on the Art. 33(3) element rows ─────────────────

Deno.test("doc141 fix1 — US-only record: no GDPR Art. 33 citation in the first-24-hours rows", () => {
  const rows = first24RowsFor(US_ONLY);
  for (const r of rows) {
    assert(!/Art\.\s*33/.test(r.join(" ")), `US-only row carries a GDPR citation: ${r[0]}`);
    assert(!/GDPR/.test(r.join(" ")), `US-only row carries GDPR: ${r[0]}`);
  }
});

Deno.test("doc141 fix1 — US-only record: the non-GDPR rows and section note carry no Art. 33(4) reference", () => {
  const sp = standingPlaybookFor(US_ONLY);
  const sec = sp.sections.find((s) => s.id === "first_24_hours_checklist") as { rows: string[][]; note?: string };
  assert(sec.rows.length > 0, "the base first-24-hours rows must still render");
  assert(
    sec.rows.some((r) => r[0].startsWith("Confirm who may authorise isolation")),
    "the isolation-authority row must still render",
  );
  assert(!/Article 33\(4\)/.test(sec.note ?? ""), "the US-only note must not cite Article 33(4)");
});

Deno.test("doc141 fix1 — EU record: the four Art. 33(3)(a)-(d) rows render as before", () => {
  const sec = standingPlaybookFor(EU_TWO_STATES).sections.find(
    (s) => s.id === "first_24_hours_checklist",
  ) as { rows: string[][]; note?: string };
  const content = sec.rows.map((r) => r[0]).filter((a) => /Art\. 33\(3\)/.test(a));
  assertEquals(content.length, 4, "the four element rows must render on a GDPR-engaged record");
  assertStringIncludes(sec.note ?? "", "Article 33(4)");
});

// ── FIX 2 — recorded member states echoed on the EU clocks row ──────────────

Deno.test("doc141 fix2 — EU record with Ireland + Germany: the clocks row names both", () => {
  const clocks = clocksTableFor(EU_TWO_STATES);
  assert(clocks, "notification clocks table missing");
  const row = clocks!.rows.find((r) => r[0].includes("EU/EEA — GDPR"));
  assert(row, "EU regime row missing");
  assertStringIncludes(row![0], "recorded jurisdictions: Ireland, Germany");
});

Deno.test("doc141 fix2 — US-only record: clocks table carries no EU row and no recorded-jurisdictions suffix", () => {
  const clocks = clocksTableFor(US_ONLY);
  assert(clocks, "notification clocks table missing (state rows expected)");
  for (const r of clocks!.rows) {
    assert(!r[0].includes("EU/EEA"), `unexpected EU row on a US-only record: ${r[0]}`);
    assert(!r[0].includes("recorded jurisdictions"), `unexpected suffix: ${r[0]}`);
  }
});
