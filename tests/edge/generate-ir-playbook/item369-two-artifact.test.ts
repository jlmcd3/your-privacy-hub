// ITEM 369-IR (Master Spec §4.2) — two-artifact deliverables + schema coverage.
//
// PRESENCE-ONLY assertions throughout: this suite proves the SHAPE of the two
// artifacts and the completeness of the schema allow-list. It does not assert
// the wording of any section, because wording is builder-owned and would make
// the suite a copy of the builder rather than a check on it.
//
// Run: deno test --allow-read --no-check tests/edge/generate-ir-playbook/item369-two-artifact.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildStandingPlaybook,
  STANDING_SECTION_ORDER,
} from "../../../supabase/functions/_shared/ltp/ir-playbook-deliverables/standing-playbook.ts";
import {
  buildIncidentWorksheet,
  WORKSHEET_FORM_ORDER,
} from "../../../supabase/functions/_shared/ltp/ir-playbook-deliverables/incident-worksheet.ts";
import {
  IR_PLAYBOOK_REPORT_SCHEMA,
  IR_STANDING_SECTION_KEYS,
  IR_WORKSHEET_FORM_KEYS,
} from "../../../supabase/functions/_shared/report-schemas/ir-playbook.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";

const FULL_INTAKE = {
  organizationName: "Larkfield Building Society",
  discoveryDateTime: new Date(Date.now() - 86_400_000).toISOString(),
  cause: "Unauthorized external access / cyberattack",
  dataTypes: ["Financial / payment data", "Government IDs / SSN"],
  affectedCount: "10,000–100,000",
  jurisdictions: ["United Kingdom", "Ireland"],
  contained: "Yes",
  organisationType: "Financial institution",
  activationCriteria: ["Any confirmed unauthorised access to the core banking database"],
  severityMatrix: [{ level: "SEV-1", definition: "Member data exfiltrated", escalation: "Board within 1 hour" }],
  responseTeamRoster: [{ role: "Incident Lead", primary: "H. Okonkwo", alternate: "R. Vasilev" }],
  outsideCounselName: "Hetherington Vance LLP",
  outsideCounselContact: "24-hour incident line, ref HV-2026-114",
  privilegeProtocol: true,
  insurerContact: "Marchmont MSC-88214, 72-hour condition",
  forensicVendorContact: "Greywater Forensics, GF-2025-07",
  lawEnforcementContact: "Regional Cyber Crime Unit SPOC",
  keySystems: ["Core banking platform"],
  logSources: ["Identity provider sign-in logs"],
  itIsolationAuthority: "Head of Information Security",
  breachNoticeContracts: [{ counterparty: "Ashcombe Ltd", deadline: "24 hours", clause: "MSA sch. 4, cl. 8.3" }],
  firstHourConfirmations: ["fh_activate", "fh_clock"],
  nextTabletopDate: "2026-11-19",
};

// A LEGACY row: nothing but the fields that existed before Item 369. These rows
// are already in ir_playbooks and must still generate.
const LEGACY_INTAKE = {
  organizationName: "Kestrel Community Trust",
  discoveryDateTime: new Date(Date.now() - 2 * 86_400_000).toISOString(),
  cause: "Accidental disclosure",
  dataTypes: ["Names and contact details"],
  affectedCount: "Fewer than 100",
  jurisdictions: ["Ireland"],
  contained: "Yes",
  organisationType: "Company",
};

Deno.test("ITEM369 — standing playbook renders every declared section, in the declared order", () => {
  const pb = buildStandingPlaybook(FULL_INTAKE);
  assertEquals(pb.artifact, "standing_playbook");
  const ids = pb.sections.map((s) => s.id);
  for (const id of STANDING_SECTION_ORDER) {
    assert(ids.includes(id), `declared section "${id}" was not emitted`);
  }
  // Order contract: emitted ids appear in the declared relative order.
  const declaredPositions = ids
    .map((id) => STANDING_SECTION_ORDER.indexOf(id))
    .filter((i) => i >= 0);
  const sorted = [...declaredPositions].sort((a, b) => a - b);
  assertEquals(declaredPositions, sorted, "sections emitted out of declared order");
});

Deno.test("ITEM369 — a fully populated record produces no degradation", () => {
  const pb = buildStandingPlaybook(FULL_INTAKE);
  assertEquals(pb.information_needed.length, 0, `unexpected degradation: ${pb.information_needed.join(" | ")}`);
  assertEquals(pb.status, "analysed");
});

Deno.test("ITEM369 — a legacy row still generates, and degrades HONESTLY", () => {
  const pb = buildStandingPlaybook(LEGACY_INTAKE);
  assert(pb.sections.length > 0, "legacy row produced no sections");
  assert(pb.information_needed.length > 0, "legacy row degraded silently");
  assertEquals(pb.status, "record_insufficient");
  // Every degraded section NAMES what is missing rather than vanishing.
  for (const s of pb.sections) {
    if (s.status === "record_insufficient") {
      assert(
        typeof s.information_needed === "string" && s.information_needed.length > 0,
        `section "${s.id}" degraded without naming what is needed`,
      );
    }
  }
});

Deno.test("ITEM369 — the incident worksheet is BLANK BY DESIGN", () => {
  const ws = buildIncidentWorksheet("Larkfield Building Society");
  assertEquals(ws.artifact, "incident_worksheet");
  assertEquals(ws.blank_by_design, true);
  const ids = ws.forms.map((f) => f.id);
  for (const id of WORKSHEET_FORM_ORDER) assert(ids.includes(id), `worksheet form "${id}" missing`);
  for (const f of ws.forms) {
    // No form may carry pre-filled cells. Table forms declare blank_rows and
    // never rows; narrative forms declare prompts and never answers.
    assert(!("rows" in f), `form "${f.id}" carries pre-filled rows`);
    if ((f.columns ?? []).length > 0) assert((f.blank_rows ?? 0) > 0, `form "${f.id}" has columns but no blank rows`);
  }
});

Deno.test("ITEM369 — the worksheet never varies with intake content", () => {
  const a = JSON.stringify(buildIncidentWorksheet("Org A").forms);
  const b = JSON.stringify(buildIncidentWorksheet("Org B").forms);
  assertEquals(a, b, "worksheet forms varied with the organisation — they must not");
});

Deno.test("ITEM369 — schema allow-lists every key the builders emit (both directions)", () => {
  const pb = buildStandingPlaybook(FULL_INTAKE);
  const ws = buildIncidentWorksheet("Larkfield Building Society");

  const pbKeys = new Set(Object.keys(pb));
  const declaredPb = new Set(IR_PLAYBOOK_REPORT_SCHEMA.objects!.standing_playbook);
  for (const k of pbKeys) assert(declaredPb.has(k), `standing_playbook.${k} is emitted but not allow-listed`);

  const wsKeys = new Set(Object.keys(ws));
  const declaredWs = new Set(IR_PLAYBOOK_REPORT_SCHEMA.objects!.incident_worksheet);
  for (const k of wsKeys) assert(declaredWs.has(k), `incident_worksheet.${k} is emitted but not allow-listed`);

  const sectionKeys = new Set<string>();
  for (const s of pb.sections) for (const k of Object.keys(s)) sectionKeys.add(k);
  for (const k of sectionKeys) {
    assert(IR_STANDING_SECTION_KEYS.includes(k), `section key "${k}" is emitted but not allow-listed`);
  }

  const formKeys = new Set<string>();
  for (const f of ws.forms) for (const k of Object.keys(f)) formKeys.add(k);
  for (const k of formKeys) {
    assert(IR_WORKSHEET_FORM_KEYS.includes(k), `worksheet form key "${k}" is emitted but not allow-listed`);
  }
});

Deno.test("ITEM369 — the serializer keeps both artifacts and drops an unreviewed nested key", () => {
  const pb = buildStandingPlaybook(FULL_INTAKE) as unknown as Record<string, unknown>;
  const sections = (pb.sections as Record<string, unknown>[]).map((s) => ({ ...s, smuggled_key: "x" }));
  const report = {
    standing_playbook: { ...pb, sections, smuggled_top: "x" },
    incident_worksheet: buildIncidentWorksheet("Larkfield Building Society"),
    authority_exhibit: { version: "ax", heading: "Appendix", entries: [] },
    generated_at: new Date().toISOString(),
    not_declared: "x",
  };
  const { report: out, telemetry } = serializeCustomerReport(report, IR_PLAYBOOK_REPORT_SCHEMA);
  const o = out as Record<string, any>;
  assert(o.standing_playbook, "standing_playbook was dropped");
  assert(o.incident_worksheet, "incident_worksheet was dropped");
  assert(o.authority_exhibit, "authority_exhibit was dropped");
  assertEquals(o.not_declared, undefined);
  assertEquals(o.standing_playbook.smuggled_top, undefined);
  assertEquals(o.standing_playbook.sections[0].smuggled_key, undefined, "nested unreviewed key shipped");
  assert(telemetry.dropped_count > 0);
});
