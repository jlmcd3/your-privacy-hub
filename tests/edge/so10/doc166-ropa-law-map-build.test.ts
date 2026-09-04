// DOC 166 (2026-09-04) — RoPA seven-audit / model-vs-law build.
//
// Item 1 — employee_band and legal_entity_type reader-label maps were keyed
// to a vocabulary that never matched what RopaSetup.tsx actually writes
// (employee_band: DB CHECK constraint '<50'/'50-249'/'250-999'/'1000+';
// legal_entity_type: the option's own display text). Every real record fell
// through to the raw-value fallback; for employee_band that meant the
// literal comparison operator "<50" inside flowing prose.
//
// Item 2 — the per-activity Cross-border transfers cell asserted "None
// (mechanism)" whenever a mechanism was recorded without a destination —
// which was EVERY real record, since no question ever asked for a
// destination. transferDisplayForActivity is the fix.
//
// Item 3 — the Completeness Review invited the customer to "record" notices
// display / incident-log answers "for each activity" even when no recorded
// activity's own template could ever surface that question.
//
// Item 4 — the Article 30(5) note claimed headcount "is not recorded" even
// though employee_band is captured and available to the caller; a 250+
// employee record could never receive the determinate "unavailable
// regardless" reading Article 30(5) itself supplies.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleRopaRegister,
  buildSlotValues,
  type RopaActivityInput,
  type RopaAssembleInput,
} from "../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";
import { transferDisplayForActivity } from "../../../supabase/functions/generate-ropa-document/register/activity-answer-display.ts";
import { buildArt305Note } from "../../../supabase/functions/generate-ropa-document/register/art305-note.ts";

const BASE: RopaAssembleInput = {
  organisationName: "Halden Data Services Ltd",
  legalEntityType: "Limited company",
  incorporationJurisdiction: "England and Wales",
  registrationNumber: "09912345",
  registeredAddress: "18 Copperfield Row, London EC1V 4PW",
  isController: true,
  isProcessor: false,
  dpoName: "Ingrid Halden",
  dpoEmail: "dpo@haldendata.example",
  dpoPhone: "",
  euRepName: "",
  euRepEmail: "",
  ukRepName: "",
  ukRepEmail: "",
  homeBase: "EU_EEA",
  employeeBand: "<50",
  jurisdictionCodes: ["EU"],
  jurisdictionLabels: ["EU GDPR"],
  activities: [],
};

// ── Item 1 — the real form vocabulary now produces grammatical prose ───────

Deno.test("doc166 — employee_band '<50' (the real DB/UI value) never leaks the raw token into prose", () => {
  const values = buildSlotValues({ ...BASE, employeeBand: "<50" });
  assertEquals(values.employee_band, "fewer than fifty people");
  assert(!String(values.employee_band).includes("<50"));
});

Deno.test("doc166 — every real employee_band value resolves to prose, not a fallback code", () => {
  for (const band of ["<50", "50-249", "250-999", "1000+"]) {
    const values = buildSlotValues({ ...BASE, employeeBand: band });
    assert(
      !String(values.employee_band).match(/[<>]/),
      `band ${band} leaked a raw comparison operator: ${values.employee_band}`,
    );
  }
});

Deno.test("doc166 — every real legal_entity_type value from RopaSetup.tsx renders lower-case after the fixed 'is a' lead-in (LLC's acronym excepted)", () => {
  for (const entity of ["Limited company", "Partnership", "Sole trader", "Charity", "Public body", "Other"]) {
    const values = buildSlotValues({ ...BASE, legalEntityType: entity });
    const label = String(values.legal_entity_type);
    assert(label === label.toLowerCase(), `entity ${entity} did not lower-case: ${label}`);
    assert(!label.includes("_"), `entity ${entity} leaked a snake_case fragment: ${label}`);
  }
});

Deno.test("doc166 — 'LLC' is spelled out so 'is a LLC' (wrong article) can never render", () => {
  const values = buildSlotValues({ ...BASE, legalEntityType: "LLC" });
  assertEquals(values.legal_entity_type, "limited liability company (LLC)");
  assert(!/^llc$/i.test(String(values.legal_entity_type)), "bare acronym must not follow the fixed 'is a' article");
});

// ── Item 2 — the cross-border transfer cell never asserts "None (mechanism)" ─

Deno.test("doc166 — destination and mechanism both recorded renders coherently", () => {
  assertEquals(
    transferDisplayForActivity({ transfer_destination: "United States", transfer_mechanism: "sccs" }),
    "United States (sccs)",
  );
});

Deno.test("doc166 — mechanism recorded, NO destination (the pre-fix legacy case) never says 'None'", () => {
  const out = transferDisplayForActivity({ transfer_mechanism: "sccs" });
  assert(!out.toLowerCase().startsWith("none"), `must not assert absence beside a stated mechanism: "${out}"`);
  assertStringIncludes(out, "sccs");
  assertStringIncludes(out.toLowerCase(), "not recorded");
});

Deno.test("doc166 — neither destination nor mechanism recorded reads as genuinely none", () => {
  assertEquals(transferDisplayForActivity({}), "None recorded");
});

Deno.test("doc166 — destination alone (no mechanism) renders the destination only", () => {
  assertEquals(transferDisplayForActivity({ transfer_destination: "India" }), "India");
});

// ── Item 3 — completeness gap sentences only compose when the question is askable ─

function activity(over: Partial<RopaActivityInput>): RopaActivityInput {
  return {
    id: "a1",
    name: "Test Activity",
    owner: "Owner",
    purpose: "Purpose",
    lawfulBasis: "Consent",
    dataSubjects: "Customers",
    dataCategories: "Contact details",
    collectionSources: "Directly",
    processingOperations: "Collection",
    recipients: "None",
    retention: "1 year",
    retentionByCategory: null,
    security: "Encryption",
    accessControls: "Role-based",
    transferDestination: "",
    transferMechanism: "",
    transferBasis: "",
    rightsHandling: "Standard process",
    rightsOverride: "",
    relatedAssessments: [],
    noticesDisplayed: "",
    incidentLog: "",
    ...over,
  };
}

Deno.test("doc166 — a payroll activity (no notices/incident-log question on its form) draws no such gap sentence", () => {
  const input: RopaAssembleInput = {
    ...BASE,
    activities: [activity({ templateKey: "hr_payroll" })],
  };
  const reg = assembleRopaRegister(input);
  const body = reg.text;
  assert(!body.includes("does not state whether processing notices are displayed"), "hr_payroll cannot be asked about notices; the gap sentence must not appear");
  assert(!body.includes("No breach or incident register has been described"), "hr_payroll cannot be asked about an incident register; the gap sentence must not appear");
});

Deno.test("doc166 — an ops_facilities activity that left notices unanswered DOES draw the gap sentence", () => {
  const input: RopaAssembleInput = {
    ...BASE,
    activities: [activity({ templateKey: "ops_facilities" })],
  };
  const reg = assembleRopaRegister(input);
  assertStringIncludes(reg.text, "does not state whether processing notices are displayed");
});

Deno.test("doc166 — an ops_facilities activity that DID answer notices is credited, not flagged as a gap", () => {
  const input: RopaAssembleInput = {
    ...BASE,
    activities: [activity({ templateKey: "ops_facilities", noticesDisplayed: "Yes, posted at every entrance" })],
  };
  const reg = assembleRopaRegister(input);
  assertStringIncludes(reg.text, "posted at every entrance");
  assert(!reg.text.includes("does not state whether processing notices are displayed"));
});

Deno.test("doc166 — a legacy record with notices recorded on a non-ops_facilities template is still credited (positive facts never suppressed)", () => {
  const input: RopaAssembleInput = {
    ...BASE,
    activities: [activity({ templateKey: "hr_payroll", noticesDisplayed: "Signage posted at the office entrance" })],
  };
  const reg = assembleRopaRegister(input);
  assertStringIncludes(reg.text, "Signage posted at the office entrance");
});

// ── Item 4 — the Art. 30(5) note applies the headcount threshold it has ────

Deno.test("doc166 — 1000+ employees: the derogation is stated unavailable regardless of regularity", () => {
  const note = buildArt305Note([], {}, "1000+");
  assertStringIncludes(note.body, "unavailable regardless");
  assertStringIncludes(note.body, "not fewer than 250 persons");
  assert(!note.body.includes("this register does not record"), "headcount is recorded, so the note must not claim it is not");
});

Deno.test("doc166 — 250-999 employees: same determinate 'unavailable' reading", () => {
  const note = buildArt305Note([], {}, "250-999");
  assertStringIncludes(note.body, "unavailable regardless");
});

Deno.test("doc166 — under-250 employees: headcount does not defeat the derogation, but regularity still does not record", () => {
  const note = buildArt305Note([], {}, "<50");
  assertStringIncludes(note.body, "fewer than 250 persons");
  assertStringIncludes(note.body, "regularity of the Company's processing, which this register does not record");
  assert(!note.body.includes("unavailable regardless"));
});

Deno.test("doc166 — employee_band unrecorded: original honest 'does not record' text is unchanged (back-compatible default)", () => {
  const note = buildArt305Note([], {});
  assertStringIncludes(note.body, "the company's headcount and the regularity of its processing, which this register does not record");
});

Deno.test("doc166 — special-category branch is untouched by the employee_band threshold (Art. 9 defeats the derogation outright)", () => {
  const note = buildArt305Note(
    [{ id: "a1", display_name: "Occupational Health Records" }],
    { a1: { special_category_basis: "Article 9(2)(b) employment-law condition" } },
    "1000+",
  );
  assertStringIncludes(note.body, "does not turn on headcount alone");
  assert(!note.body.includes("unavailable regardless"), "the 1000+ headcount phrasing belongs to the negative branch only");
});
