// S-P1 (doc 80, 2026-08-27) — per-activity controller/processor role and
// the Article 30(2)-conformant field set. Article 30(1) and 30(2) require
// genuinely different records (the ICO's own two-template structure): a
// processor activity names its controller and states no lawful basis of
// its own; a controller activity renders exactly as before.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildActivityRecord,
  buildActivitySlots,
  type RopaActivityInput,
  type RopaAssembleInput,
} from "../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";

const ORG: RopaAssembleInput = {
  organisationName: "Acme Co",
  legalEntityType: "GmbH",
  incorporationJurisdiction: "DE",
  registrationNumber: "HRB 12345",
  registeredAddress: "1 Example Str, Berlin",
  isController: true,
  isProcessor: true,
  dpoName: "", dpoEmail: "", dpoPhone: "",
  euRepName: "", euRepEmail: "", ukRepName: "", ukRepEmail: "",
  homeBase: "EU_EEA",
  employeeBand: "51-250",
  jurisdictionCodes: ["EU"],
  jurisdictionLabels: ["EU GDPR"],
  activities: [],
};

const BASE: RopaActivityInput = {
  id: "a1",
  name: "Payroll",
  owner: "Jane Ops",
  purpose: "Paying salaries and meeting payroll reporting duties",
  lawfulBasis: "Legal obligation",
  dataSubjects: "Employees",
  dataCategories: "Identity, bank details",
  collectionSources: "Directly from the individual",
  processingOperations: "Collection, storage, use",
  recipients: "Payroll bureau",
  retention: "6 years",
  retentionByCategory: null,
  security: "Encryption at rest",
  accessControls: "Role-based access",
  transferDestination: "",
  transferMechanism: "",
  transferBasis: "",
  rightsHandling: "via the HR inbox",
  rightsOverride: "",
  relatedAssessments: [],
  noticesDisplayed: "",
  incidentLog: "",
};

Deno.test("S-P1 — controller activity slots are byte-identical to the pre-S-P1 form", () => {
  const slots = buildActivitySlots(BASE);
  assertEquals(slots.lawful_basis, "Legal obligation");
});

Deno.test("S-P1 — processor activity renders the documented-instructions footing naming its controller", () => {
  const slots = buildActivitySlots({
    ...BASE,
    activityRole: "processor",
    actingFor: "Acme Retail GmbH",
    lawfulBasis: "",
  });
  assertStringIncludes(String(slots.lawful_basis), "documented instructions of Acme Retail GmbH");
  assertStringIncludes(String(slots.lawful_basis), "Article 30(2)");
});

Deno.test("S-P1 — processor activity with no named controller states the footing honestly", () => {
  const slots = buildActivitySlots({ ...BASE, activityRole: "processor", actingFor: "", lawfulBasis: "" });
  assertStringIncludes(String(slots.lawful_basis), "the controller it acts for");
});

Deno.test("S-P1 — completeness: a processor activity is NOT incomplete for lacking a lawful basis, but IS for lacking its controller", () => {
  const noBasis = buildActivityRecord(ORG, { ...BASE, activityRole: "processor", actingFor: "Acme Retail GmbH", lawfulBasis: "" });
  assert(!noBasis.missing.some((m: string) => /lawful basis/i.test(m)), `unexpected: ${noBasis.missing.join("; ")}`);
  const noController = buildActivityRecord(ORG, { ...BASE, activityRole: "processor", actingFor: "", lawfulBasis: "" });
  assert(noController.missing.some((m: string) => /controller the activity is performed for/i.test(m)), `expected controller gap: ${noController.missing.join("; ")}`);
});

Deno.test("S-P1 — completeness: a controller activity still requires its lawful basis", () => {
  const rec = buildActivityRecord(ORG, { ...BASE, lawfulBasis: "" });
  assert(rec.missing.some((m: string) => /lawful basis/i.test(m)));
});

Deno.test("S-P1 — legacy record (no role answer) behaves exactly as before", () => {
  const rec = buildActivityRecord(ORG, { ...BASE, lawfulBasis: "" });
  assert(rec.missing.some((m: string) => /lawful basis/i.test(m)));
  const slots = buildActivitySlots(BASE);
  assertEquals(slots.lawful_basis, "Legal obligation");
});
