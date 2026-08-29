// PHASE 2 — IR PLAYBOOK COMPOSITION-ONLY WAVE (2026-08-29, doc 101, CEO-
// approved in full: escalation SLA table, the two IR-G templates verbatim,
// and the 30-day lessons-learned default). Covers IR-A, IR-B, IR-C, IR-G,
// IR-H, IR-I. Doc 101 corrected two of doc 100's original scope predictions
// after a fresh re-read of the live code (IR-C's counsel/preservation items
// already existed; IR-G's regulator leg already existed via the EDPB Art.
// 33 template mapping) — this suite pins only what was actually built.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildStandingPlaybook,
  STANDING_SECTION_ORDER,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts";
import {
  buildIncidentWorksheet,
  WORKSHEET_FORM_ORDER,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/incident-worksheet.ts";

type Bag = Record<string, unknown>;

function section(pb: ReturnType<typeof buildStandingPlaybook>, id: string): Bag {
  const s = (pb.sections as Bag[]).find((x) => x.id === id);
  assert(s, `expected section "${id}" to be present`);
  return s as Bag;
}

function form(ws: ReturnType<typeof buildIncidentWorksheet>, id: string): Bag {
  const f = (ws.forms as Bag[]).find((x) => x.id === id);
  assert(f, `expected worksheet form "${id}" to be present`);
  return f as Bag;
}

const BASE_INTAKE = {
  organizationName: "Larkfield Building Society",
  discoveryDateTime: new Date(Date.now() - 86_400_000).toISOString(),
  cause: "Unauthorized external access / cyberattack",
  dataTypes: ["Financial / payment data", "Government IDs / SSN", "Names and contact details"],
  affectedCount: "10,000–100,000",
  jurisdictions: ["United Kingdom"],
  contained: "Yes",
  organisationType: "Financial institution",
};

// ── Section-order pins ───────────────────────────────────────────────────

Deno.test("Phase 2 — new standing-playbook section ids sit exactly where doc 101 placed them", () => {
  const order = STANDING_SECTION_ORDER;
  assertEquals(order.indexOf("data_sensitivity_tiers"), order.indexOf("severity_matrix") + 1);
  assertEquals(order.indexOf("escalation_sla"), order.indexOf("response_team") + 1);
  assert(order.indexOf("regulator_final_report") > order.indexOf("statutory_notification_determinations"));
  assertEquals(order.indexOf("individual_notice_template"), order.indexOf("regulator_final_report") + 1);
  assertEquals(order.indexOf("executive_briefing_template"), order.indexOf("individual_notice_template") + 1);
});

Deno.test("Phase 2 — new worksheet form ids sit exactly where doc 101 placed them", () => {
  const order = WORKSHEET_FORM_ORDER;
  assertEquals(order.indexOf("breach_register"), order.indexOf("decision_log") + 1);
  assertEquals(order.indexOf("incident_metrics"), order.indexOf("breach_register") + 1);
  assert(order.indexOf("incident_metrics") < order.indexOf("after_action_review"));
});

// ── IR-A — Escalation SLA table ──────────────────────────────────────────

Deno.test("IR-A — escalation SLA table has the 5 approved rows with correct functions and SLAs", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  const sla = section(pb, "escalation_sla");
  assertEquals(sla.kind, "table");
  assertEquals(sla.columns, ["Function", "Trigger", "Recommended-default SLA", "Assigned"]);
  const rows = sla.rows as string[][];
  assertEquals(rows.length, 5);
  const byFn = new Map(rows.map((r) => [r[0], r]));
  assertStringIncludes(byFn.get("Incident Lead")![2], "immediately on declaration");
  assertStringIncludes(byFn.get("Data Protection Officer / privacy contact")![2], "1 hour");
  assertStringIncludes(byFn.get("Legal (in-house or outside counsel)")![2], "2–4 hours");
  assertStringIncludes(byFn.get("Communications Lead")![2], "12–24 hours");
  assertStringIncludes(byFn.get("Customer support / help desk")![2], "before the notice goes out");
  assertEquals(sla.status, "analysed");
});

Deno.test("IR-A — Assigned column fuzzy-matches the roster by role, unmatched functions fall back to STANDING_TO_COMPLETE", () => {
  const pb = buildStandingPlaybook({
    ...BASE_INTAKE,
    responseTeamRoster: [
      { role: "Incident Lead", primary: "H. Okonkwo" },
      { role: "Data Protection Officer", primary: "D. Farrell" },
    ],
  });
  const rows = (section(pb, "escalation_sla").rows as string[][]);
  const byFn = new Map(rows.map((r) => [r[0], r]));
  assertEquals(byFn.get("Incident Lead")![3], "H. Okonkwo");
  assertEquals(byFn.get("Data Protection Officer / privacy contact")![3], "D. Farrell");
  assertEquals(byFn.get("Legal (in-house or outside counsel)")![3], "To be completed by the organisation");
  assertEquals(byFn.get("Communications Lead")![3], "To be completed by the organisation");
});

Deno.test("IR-A — Assigned column also matches the object-keyed roster shape (arbitrary camelCase keys + title)", () => {
  const pb = buildStandingPlaybook({
    ...BASE_INTAKE,
    responseTeamRoster: { privacyCounsel: { name: "J. Osei", title: "Legal Counsel" } },
  });
  const rows = (section(pb, "escalation_sla").rows as string[][]);
  const legal = rows.find((r) => r[0] === "Legal (in-house or outside counsel)")!;
  assertEquals(legal[3], "J. Osei");
});

Deno.test("IR-A — the SLA table renders even with no roster recorded at all", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  const sla = section(pb, "escalation_sla");
  assertEquals(sla.status, "analysed");
  for (const row of sla.rows as string[][]) {
    assertEquals(row[3], "To be completed by the organisation");
  }
});

// ── IR-B — Data-sensitivity tiers ────────────────────────────────────────

Deno.test("IR-B — no recorded data types degrades honestly with a named information_needed", () => {
  const pb = buildStandingPlaybook({ ...BASE_INTAKE, dataTypes: [] });
  const tiers = section(pb, "data_sensitivity_tiers");
  assertEquals(tiers.status, "record_insufficient");
  assert(String(tiers.information_needed).length > 0);
  assertEquals((tiers.rows as string[][]).length, 0);
});

Deno.test("IR-B — only the recorded data types appear, each in its correct tier", () => {
  const pb = buildStandingPlaybook({
    ...BASE_INTAKE,
    dataTypes: ["Special category data", "Government IDs / SSN", "Location data"],
  });
  const rows = (section(pb, "data_sensitivity_tiers").rows as string[][]);
  assertEquals(rows.length, 3);
  const byCat = new Map(rows.map((r) => [r[1], r]));
  assertEquals(byCat.get("Special category data")![0], "Highest");
  assertEquals(byCat.get("Government IDs / SSN")![0], "High");
  assertEquals(byCat.get("Location data")![0], "Moderate");
  // a category not on the record never appears
  assert(!byCat.has("Health / medical records"));
});

Deno.test("IR-B — every one of the intake's 9 DATA_TYPES values resolves to exactly one tier (no gaps, no double-counting)", () => {
  const ALL_NINE = [
    "Names and contact details", "Financial / payment data", "Health / medical records",
    "Government IDs / SSN", "Passwords / credentials", "Location data",
    "Children's data", "Biometric data", "Special category data",
  ];
  const pb = buildStandingPlaybook({ ...BASE_INTAKE, dataTypes: ALL_NINE });
  const rows = (section(pb, "data_sensitivity_tiers").rows as string[][]);
  assertEquals(rows.length, ALL_NINE.length, "every recorded category must appear exactly once");
  const seen = new Set(rows.map((r) => r[1]));
  for (const cat of ALL_NINE) assert(seen.has(cat), `"${cat}" missing from the tier table`);
});

// ── IR-C — cross-reference (folded into IR-A rather than duplicated) ────

Deno.test("IR-C — the first-hour checklist points at the Escalation SLA table instead of duplicating timing (R8: stated once, not repeated on first-24-hours too)", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  assertStringIncludes(String(section(pb, "first_hour_checklist").note), "Escalation SLA table above");
});

Deno.test("IR-C — the pre-existing canon items are still intact (counsel-before-substantive-discussion; preserve-before-isolate ordering)", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  const rows = (section(pb, "first_hour_checklist").rows as string[][]).map((r) => r[0]);
  const preserveIdx = rows.findIndex((r) => /preservation instruction/i.test(r));
  const isolateIdx = rows.findIndex((r) => /isolate affected systems/i.test(r));
  const counselIdx = rows.findIndex((r) => /outside counsel/i.test(r) && /privilege/i.test(r));
  assert(preserveIdx >= 0 && isolateIdx >= 0 && counselIdx >= 0);
  assert(preserveIdx < isolateIdx, "preservation must precede isolation");
});

// ── IR-G — the two templates ─────────────────────────────────────────────

Deno.test("IR-G — the individual notice template slots the organisation name and only the recorded data categories", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  const tpl = section(pb, "individual_notice_template");
  const body = (tpl.body as string[]).join("\n");
  assertStringIncludes(body, "Larkfield Building Society");
  assertStringIncludes(body, "Financial / payment data, Government IDs / SSN, Names and contact details");
  assertStringIncludes(String(tpl.scope_note), "reviewed by counsel before it is sent");
  assertEquals(tpl.status, "analysed");
});

Deno.test("IR-G — the individual notice template never invents a category the record didn't list", () => {
  const pb = buildStandingPlaybook({ ...BASE_INTAKE, dataTypes: ["Location data"] });
  const body = (section(pb, "individual_notice_template").body as string[]).join("\n");
  assertStringIncludes(body, "Location data");
  assert(!body.includes("Financial / payment data"));
});

Deno.test("IR-G — with no data types recorded, the individual notice template falls back to the generic bracketed instruction, not an empty list", () => {
  const pb = buildStandingPlaybook({ ...BASE_INTAKE, dataTypes: [] });
  const body = (section(pb, "individual_notice_template").body as string[]).join("\n");
  assertStringIncludes(body, "[LIST ONLY THE CATEGORIES OF YOUR PERSONAL INFORMATION THIS INCIDENT ACTUALLY INVOLVED.]");
});

Deno.test("IR-G — with no organisation name recorded, the notice and briefing fall back to the bracketed placeholder, never a blank", () => {
  const pb = buildStandingPlaybook({ ...BASE_INTAKE, organizationName: "" });
  const notice = (section(pb, "individual_notice_template").body as string[]);
  assertEquals(notice[notice.length - 1], "[ORGANIZATION NAME]");
  const briefing = (section(pb, "executive_briefing_template").body as string[]);
  assertStringIncludes(briefing[0], "[ORGANIZATION NAME]");
});

Deno.test("IR-G — the executive briefing template carries the fixed privilege-framing sentence and its own instruction line", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  const tpl = section(pb, "executive_briefing_template");
  const body = (tpl.body as string[]).join(" ");
  assertStringIncludes(body, "prepared for internal leadership review only");
  assertStringIncludes(body, "directed to counsel under the privilege protocol");
  assertStringIncludes(String(tpl.scope_note), "NOT YET ESTABLISHED");
});

Deno.test("IR-G — the EDPB Art. 33 regulator template (already-existing leg) is untouched and still lives at statutory_notification_determinations, not duplicated by the two new templates", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  const ids = (pb.sections as Bag[]).map((s) => s.id);
  assertEquals(ids.filter((id) => id === "individual_notice_template").length, 1);
  assertEquals(ids.filter((id) => id === "executive_briefing_template").length, 1);
  assert(ids.includes("statutory_notification_determinations"));
});

// ── IR-H — breach register, chain-of-custody, incident metrics ─────────

Deno.test("IR-H — the breach register form has the approved columns and 12 blank rows", () => {
  const ws = buildIncidentWorksheet("Larkfield Building Society");
  const reg = form(ws, "breach_register");
  assertEquals(reg.columns, ["Date discovered", "Brief description", "Notifiable? (Y/N)", "Rationale if N", "Notification date if Y", "Recorded by"]);
  assertEquals(reg.blank_rows, 12);
  assertStringIncludes(String(reg.instruction), "not notifiable");
  // the worksheet's operational register never cites statute (matches every
  // other worksheet form) — the documentation duty is stated as authority
  // in the standing playbook instead.
  assert(!String(reg.instruction).includes("Article 33"));
  assert(!String(reg.instruction).includes("Art. 33"));
});

Deno.test("IR-H — the incident metrics form defines all four metrics in its instruction and pre-fills no row cells", () => {
  const ws = buildIncidentWorksheet("Larkfield Building Society");
  const metrics = form(ws, "incident_metrics");
  assertEquals(metrics.columns, ["Metric", "Start event and time (UTC)", "End event and time (UTC)", "Elapsed", "Notes"]);
  assertEquals(metrics.blank_rows, 6);
  assert(!("rows" in metrics), "the worksheet form shape carries no pre-filled row data, only blank_rows count");
  const instruction = String(metrics.instruction);
  for (const term of ["Time to Detect (TTD)", "Time to Activate (TTA)", "Time to Contain (TTC)", "Time to Notify"]) {
    assertStringIncludes(instruction, term);
  }
});

Deno.test("IR-H — the two new worksheet forms never vary with intake content (blank-by-design law)", () => {
  const a = buildIncidentWorksheet("Org A");
  const b = buildIncidentWorksheet(undefined);
  const regA = form(a, "breach_register");
  const regB = form(b, "breach_register");
  assertEquals(regA.columns, regB.columns);
  assertEquals(regA.blank_rows, regB.blank_rows);
  const metA = form(a, "incident_metrics");
  const metB = form(b, "incident_metrics");
  assertEquals(metA.instruction, metB.instruction);
});

Deno.test("IR-H — the evidence-preservation note carries the chain-of-custody addendum", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  assertStringIncludes(String(section(pb, "evidence_preservation").note), "chain of custody");
  assertStringIncludes(String(section(pb, "evidence_preservation").note), "cryptographic hash");
});

// ── IR-I — supplemental notice, regulator final-report, lessons-learned ─

Deno.test("IR-I — the after-action-review form carries the new supplemental-notice prompt, 8 prompts total", () => {
  const ws = buildIncidentWorksheet("Larkfield Building Society");
  const aar = form(ws, "after_action_review");
  const prompts = aar.prompts as string[];
  assertEquals(prompts.length, 8);
  assertStringIncludes(prompts[prompts.length - 1], "supplemental notice");
});

Deno.test("IR-I — the regulator final-report section always renders; states not-presently-engaged when nothing is phased", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  const note = section(pb, "regulator_final_report");
  assertEquals(note.status, "analysed");
  assertStringIncludes((note.body as string[]).join(" "), "not presently engaged");
});

Deno.test("IR-I — the regulator final-report section states the affirmative Art. 33(4) duty when phasing actually applied", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE, {
    elements: [],
    phasing: {
      citation: "11 CCR § 7155",
      authority_verbatim: "",
      first_tranche: ["a_nature"],
      phased: [{ element: "c_likely_consequences", reason: "not yet established" }],
      status: "analysed",
    },
    documentation: {} as never,
    edpb_template: {} as never,
    status: "analysed",
  });
  const body = (section(pb, "regulator_final_report").body as string[]).join(" ");
  assertStringIncludes(body, "without undue further delay");
  assert(!body.includes("not presently engaged"));
});

Deno.test("IR-I — the testing/training section carries the 30-day lessons-learned default unconditionally", () => {
  const pb = buildStandingPlaybook(BASE_INTAKE);
  assertStringIncludes((section(pb, "testing_training").body as string[]).join(" "), "within 30 days of incident closure");
});

// ── Determinism ───────────────────────────────────────────────────────────

Deno.test("Phase 2 — determinism: identical input produces byte-identical standing-playbook output", () => {
  const a = JSON.stringify(buildStandingPlaybook(BASE_INTAKE));
  const b = JSON.stringify(buildStandingPlaybook(BASE_INTAKE));
  assertEquals(a, b);
});
