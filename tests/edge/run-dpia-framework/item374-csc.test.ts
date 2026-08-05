// ITEM 374 — DPIA REPORT-PIPELINE FIXES + CROSS-SURFACE CONSISTENCY CHECK.
//
// Colocated regression locks. Every test restates a defect observed in batch
// 646e3bf3, so a change that reintroduces it fails here.
//
// TEST 2 is the HONEST-DEGRADATION GUARD: over a genuinely incomplete record
// the gap frames must STILL render and the consistency check must perform ZERO
// repairs. The machinery is only allowed to suppress absence language when the
// record actually supplies the fact.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { DPIA_PERFECT, DPIA_GOLDEN } from "../../../supabase/functions/_shared/golden/dpia.ts";
import {
  applyFrameSubstitution,
  INFO_NEEDED_LITERAL,
} from "../../../supabase/functions/_shared/prose/frame-substitution.ts";
import { DPIA_FRAMES } from "../../../library/prose/load.ts";
import {
  attachDpiaAttestation,
  buildDpiaAssessmentTeam,
  parseTeamRoster,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/attestation.ts";
import {
  ASK_CATEGORY_INTAKE_KEYS,
  filterCategoriesAgainstRecord,
} from "../../../supabase/functions/_shared/prose/ask-categories.ts";
import { runDpiaCsc } from "../../../supabase/functions/_shared/ltp/dpia-csc.ts";

const EU = DPIA_PERFECT.find((c) => c.id === "dpia-perfect-eu-complete")!.intake as Record<string, unknown>;
const UK = DPIA_PERFECT.find((c) => c.id === "dpia-perfect-uk-complete")!.intake as Record<string, unknown>;
const DEGRADED = DPIA_GOLDEN.find((c) => c.id === "dpia-eu-health-tuning")!.intake as Record<string, unknown>;

const GAP_BODY_FRAGMENT = "The record does not name who prepared";

function statusesFor(intake: unknown): Record<string, string> {
  const meta = attachDpiaAttestation({}, intake) as Record<string, unknown>;
  return {
    assessment_team: String(meta.team_status ?? ""),
    prepared_by: String(meta.team_status ?? ""),
    validation_approval: String(meta.validation_status ?? ""),
    approval_date: String(meta.validation_status ?? ""),
    signoff_basis: String(meta.validation_status ?? ""),
  };
}

const STRUCTURED_LEAVES = [
  "name", "role", "approved_by_name", "approved_by_title",
  "approval_date", "status", "citation", "template_ref",
  "risk_id", "rule_id", "likelihood", "severity",
];

/** A report shaped like the assembled DPIA, with the defects injected. */
function defectiveReport(intake: Record<string, unknown>) {
  const report: Record<string, unknown> = {};
  attachDpiaAttestation(report, intake);
  // DEFECT: the emit gate degrades the analysed surfaces after the builder ran.
  (report.section_0_overview as Record<string, unknown>).assessment_team = {
    ...(report.section_0_overview as any).assessment_team,
    text: INFO_NEEDED_LITERAL,
  };
  (report.section_6_conclusion as Record<string, unknown>).validation_approval = {
    ...(report.section_6_conclusion as any).validation_approval,
    text: INFO_NEEDED_LITERAL,
  };
  report.dpia_metadata = {
    document_name: "Test DPIA",
    article_35_3_trigger: "Art. 35(3)(b) — large-scale special-category data",
  };
  report.engagement_map = {
    entries: [
      { rule_id: "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES", status: "not_engaged", rationale: "" },
    ],
  };
  report.risk_register = [
    { risk_id: "R1", source: "The record describes secondary uses of the certificate data.", rationale: "Further processing beyond the stated purpose." },
    { risk_id: "R3", source: "Access to the diagnosis category inside the employer.", rationale: "Power imbalance in the employment relationship." },
  ];
  return report;
}

// ---------------------------------------------------------------- DEFECT 1

Deno.test("defect 1 — a gap frame never lands on a surface the builder analysed", () => {
  const report = defectiveReport(EU);
  const counters = applyFrameSubstitution(report, {
    product: "dpia",
    frameSet: DPIA_FRAMES,
    contract: "dpia_framework",
    values: { "org_context.company_name": "Helvetia Occupational Health AG" },
    surfaceStatuses: statusesFor(EU),
    structuredLeafKeys: STRUCTURED_LEAVES,
  });
  const json = JSON.stringify(report);
  assertEquals(json.includes(GAP_BODY_FRAGMENT), false, "gap frame reached an analysed surface");
  assert(counters.gated_by_status > 0, "status gate never fired");
});

Deno.test("defect 1 — substitution never writes into a structured leaf", () => {
  const report: Record<string, unknown> = {
    section_0_overview: {
      assessment_team: {
        text: INFO_NEEDED_LITERAL,
        members: [{ name: "A. Okonjo", role: INFO_NEEDED_LITERAL }],
      },
    },
  };
  const counters = applyFrameSubstitution(report, {
    product: "dpia",
    frameSet: DPIA_FRAMES,
    values: { "org_context.company_name": "Northwind Health Ltd" },
    structuredLeafKeys: STRUCTURED_LEAVES,
  });
  const role = (report as any).section_0_overview.assessment_team.members[0].role;
  assertEquals(role, INFO_NEEDED_LITERAL, "structured leaf was rewritten");
  assert(counters.gated_structured > 0, "structured-leaf guard never fired");
});

Deno.test("defect 1(d) — re-asserting the builder restores the analysed surfaces", () => {
  const report = defectiveReport(EU);
  attachDpiaAttestation(report, EU);
  const team = (report as any).section_0_overview.assessment_team;
  assertEquals(team.status, "analysed");
  assertStringIncludes(team.text, "This assessment was prepared by");
  assertEquals((report as any).section_6_conclusion.validation_approval.attested, true);
});

// ---------------------------------------------------------------- DEFECT 2

Deno.test("defect 2 — a category the record answers is not a missing foundation", () => {
  const cats = [
    { id: "accountability_owner", label: "Who prepared this assessment and who has approved it", count: 1 },
    { id: "identity", label: "The legal identity of the controller", count: 1 },
    { id: "transparency", label: "How the processing is explained to the people affected", count: 1 },
  ] as never[];
  const kept = filterCategoriesAgainstRecord(cats, EU).map((c: any) => c.id);
  assertEquals(kept.includes("accountability_owner"), false);
  assertEquals(kept.includes("identity"), false);
  // ITEM 380 r3 — transparency is now MAPPED (data_subject_rights_mechanisms +
  // nature_scope_context), so the perfect EU record answers it and it is
  // dropped. The "unmapped categories are never suppressed" guarantee is still
  // proven by `unspecified` in tests/edge/item380/r3-transparency.test.ts.
  assertEquals(kept.includes("transparency"), false, "the EU record answers transparency");
});

Deno.test("defect 2 — the same categories survive on a record that omits the keys", () => {
  const cats = [
    { id: "accountability_owner", label: "Who prepared this assessment and who has approved it", count: 1 },
  ] as never[];
  assertEquals(filterCategoriesAgainstRecord(cats, DEGRADED).length, 1);
});

Deno.test("defect 2 — every mapped key is a real DPIA intake key on the perfect record", () => {
  const keys = new Set(Object.keys(EU).concat(Object.keys(UK)));
  for (const [cat, mapped] of Object.entries(ASK_CATEGORY_INTAKE_KEYS)) {
    for (const k of mapped) {
      assert(keys.has(k), `${cat} maps unknown intake key ${k}`);
    }
  }
});

// ---------------------------------------------------------------- DEFECT 3

Deno.test("defect 3 — a role ending in a parenthetical stays balanced", () => {
  const members = parseTeamRoster(
    "A. Okonjo — Privacy Counsel (Responsible); D. Dasher — Data Protection Officer (Accountable)",
  );
  assertEquals(members[0].role, "Privacy Counsel (Responsible)");
  assertEquals(members[1].role, "Data Protection Officer (Accountable)");
});

Deno.test("defect 3 — a parenthesis used as the delimiter is still consumed", () => {
  const members = parseTeamRoster("H. Vogel (HR systems owner)");
  assertEquals(members[0].name, "H. Vogel");
  assertEquals(members[0].role, "HR systems owner");
});

Deno.test("defect 3 — the perfect EU roster parses with balanced roles", () => {
  const team = buildDpiaAssessmentTeam(EU);
  assertEquals(team.status, "analysed");
  for (const m of team.members) {
    assertEquals((m.role.match(/\(/g) ?? []).length, (m.role.match(/\)/g) ?? []).length, m.role);
  }
});

// ---------------------------------------------- DELIVERABLE 2 — CSC C1..C4

Deno.test("C1 — intake-selected Art. 35(3)(b) repairs a not_engaged entry", () => {
  const report = defectiveReport(EU);
  const t = runDpiaCsc(report, { intake: EU, frameSet: DPIA_FRAMES });
  const c1 = t.violations.filter((v) => v.check_id === "c1_engagement_vs_metadata_vs_intake");
  assertEquals(c1.length, 1);
  assertEquals(c1[0].repaired, true);
  assertEquals((report as any).engagement_map.entries[0].status, "engaged");
});

Deno.test("C2 — absence language on a backed surface is repaired to the builder's output", () => {
  const report = defectiveReport(EU);
  (report as any).section_0_overview.assessment_team.text =
    "The record does not name who prepared this assessment for Helvetia Occupational Health AG.";
  const t = runDpiaCsc(report, { intake: EU, frameSet: DPIA_FRAMES });
  const c2 = t.violations.filter((v) => v.check_id === "c2_absence_claim_vs_record");
  assert(c2.length >= 1);
  assert(c2.every((v) => v.repaired));
  assertStringIncludes(
    (report as any).section_0_overview.assessment_team.text,
    "This assessment was prepared by",
  );
  assertEquals((report as any).section_6_conclusion.validation_approval.attested, true);
});

Deno.test("C3 — a secondary-use row against a 'None' record is removed without renumbering", () => {
  const report = defectiveReport(EU);
  const t = runDpiaCsc(report, { intake: EU, frameSet: DPIA_FRAMES });
  const c3 = t.violations.filter((v) => v.check_id === "c3_secondary_use_predicate");
  assertEquals(c3.length, 1);
  const ids = (report.risk_register as any[]).map((r) => r.risk_id);
  assertEquals(ids, ["R3"], "surviving risk ids must NOT be renumbered");
});

Deno.test("C4 — a frame body in members[].role is flagged and the surface restored", () => {
  // Built clean, so C2 has nothing to repair and C4 is the check under test.
  const report: Record<string, unknown> = {};
  attachDpiaAttestation(report, EU);
  (report as any).section_0_overview.assessment_team.members[1].role =
    "The record does not name who prepared this assessment for Helvetia Occupational Health AG.";
  const t = runDpiaCsc(report, { intake: EU, frameSet: DPIA_FRAMES });
  const c4 = t.violations.filter((v) => v.check_id === "c4_structured_leaf_hygiene");
  assert(c4.length >= 1, "structured-leaf violation not raised");
  assert(c4.every((v) => v.repaired));
  for (const m of (report as any).section_0_overview.assessment_team.members) {
    assertEquals(/does not name who prepared/.test(m.role), false);
  }
});

Deno.test("CSC telemetry is deterministic over identical inputs", () => {
  const a = runDpiaCsc(defectiveReport(UK), { intake: UK, frameSet: DPIA_FRAMES });
  const b = runDpiaCsc(defectiveReport(UK), { intake: UK, frameSet: DPIA_FRAMES });
  assertEquals(JSON.stringify(a), JSON.stringify(b));
});

// ------------------------------------------- HONEST-DEGRADATION GUARD (2)

Deno.test("honest degradation — gap frames STILL render on a genuinely incomplete record", () => {
  const report: Record<string, unknown> = {};
  attachDpiaAttestation(report, DEGRADED);
  (report.section_0_overview as any).assessment_team.text = INFO_NEEDED_LITERAL;
  const counters = applyFrameSubstitution(report, {
    product: "dpia",
    frameSet: DPIA_FRAMES,
    contract: "dpia_framework",
    values: { "org_context.company_name": "Test AG" },
    surfaceStatuses: statusesFor(DEGRADED),
    structuredLeafKeys: STRUCTURED_LEAVES,
  });
  assertEquals(counters.gated_by_status, 0, "the gate must not fire on a degraded record");
  assert(counters.atoms_applied + counters.scaffolds_applied > 0, "no absence language rendered");
  assertEquals(counters.literals_remaining, 0);
});

Deno.test("honest degradation — CSC performs ZERO repairs on the degraded fixture", () => {
  const report: Record<string, unknown> = {};
  attachDpiaAttestation(report, DEGRADED);
  (report.section_0_overview as any).assessment_team.text =
    "The record does not name who prepared this assessment for Test AG.";
  report.engagement_map = {
    entries: [
      { rule_id: "R_ART_35_3_B_LARGE_SCALE_SPECIAL_CATEGORIES", status: "not_engaged", rationale: "" },
    ],
  };
  report.risk_register = [
    { risk_id: "R1", source: "The record describes secondary uses.", rationale: "" },
  ];
  const t = runDpiaCsc(report, { intake: DEGRADED, frameSet: DPIA_FRAMES });
  assertEquals(t.crashed, false);
  assertEquals(t.repairs, 0, "the check repaired something on an incomplete record");
  assertEquals((report.risk_register as any[]).length, 1, "C3 must not fire without a 'None' record");
});
