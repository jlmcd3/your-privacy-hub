// DOC 178 (2026-09-04) — SYLLABUS & RECORD, RoPA (the ninth and FINAL
// product migrated onto the fleet presentation system; doc 151, docs
// 170-177 landed the shared system + the other eight products). RoPA is
// architecturally different from every other product: it renders its own
// standalone HTML (never through generate-report-pdf's shared renderer) and
// is a file-driven download (PDF/DOCX/XLSX), not a live in-app web page.
// Page one is built from the new shared `_shared/prose/syllabus-page-html.ts`
// module (extracted from generate-report-pdf so the same implementation
// serves both renderers) and wired directly into RoPA's own `buildHtml()`,
// unconditionally — every RoPA register carries a syllabus once assembled,
// so there is no product gate to test here, only the projection itself and
// the rendered page.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleRopaRegister,
  type RopaActivityInput,
  type RopaAssembleInput,
} from "../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";
import { readSyllabus, syllabusToText, toneForState } from "../../../supabase/functions/_shared/prose/syllabus.ts";

const ACTIVITY: RopaActivityInput = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Customer support ticketing",
  owner: "Head of Customer Operations",
  purpose: "resolving support requests and tracking service quality",
  lawfulBasis: "Legitimate interests",
  dataSubjects: "customers and prospective customers",
  dataCategories: "identity data, contact data, correspondence content",
  collectionSources: "the individual directly and the company's web forms",
  processingOperations: "collection, storage, consultation, erasure",
  recipients: "Zendesk, Inc. (support platform)",
  retention: "24 months from ticket closure",
  retentionByCategory: null,
  security: "encryption in transit and at rest, logging, annual penetration testing",
  accessControls: "role-based access limited to the support team, reviewed quarterly",
  transferDestination: "United States",
  transferMechanism: "EU Commission standard contractual clauses (2021/914)",
  transferBasis: "Art. 46(2)(c) GDPR",
  rightsHandling: "through a central privacy inbox within one month",
  rightsOverride: "",
  relatedAssessments: ["Legitimate Interest Assessment — Customer support ticketing (2026-05-04)"],
  noticesDisplayed: "the customer privacy notice, linked at the point of collection",
  incidentLog: "maintained in the incident register; no incidents in the period",
};

const INPUT: RopaAssembleInput = {
  organisationName: "Halden Data Services Ltd",
  legalEntityType: "private_limited",
  incorporationJurisdiction: "England and Wales",
  registrationNumber: "09912345",
  registeredAddress: "18 Copperfield Row, London EC1V 4PW",
  isController: true,
  isProcessor: false,
  dpoName: "Ingrid Halden",
  dpoEmail: "dpo@haldendata.example",
  dpoPhone: "+44 20 7946 0102",
  euRepName: "Halden Data Ireland Ltd",
  euRepEmail: "eurep@haldendata.example",
  ukRepName: "",
  ukRepEmail: "",
  homeBase: "EU_EEA",
  employeeBand: "50-249",
  jurisdictionCodes: ["EU", "UK"],
  jurisdictionLabels: ["EU GDPR", "UK GDPR"],
  activities: [ACTIVITY],
};

// A second activity missing several required Art. 30 elements, so the
// register is incomplete on its face.
const GAPPY_ACTIVITY: RopaActivityInput = {
  ...ACTIVITY,
  id: "22222222-2222-4222-8222-222222222222",
  name: "Marketing analytics",
  retention: "",
  security: "",
};

// ── The projection ──────────────────────────────────────────────────────────

Deno.test("doc178 — the RoPA assembler attaches a Determination Syllabus projected from its own determinations, and generates without error", () => {
  const out = assembleRopaRegister(INPUT);
  const s = readSyllabus(out.document);
  assert(s, "document.syllabus missing");
  assert(s!.prepared_for, "prepared_for empty");
  assert(s!.disposition, "disposition empty");
  assert(s!.paragraph, "disposition paragraph empty");
  assertEquals(out.conformance.ok, true, JSON.stringify(out.conformance.findings));
});

Deno.test("doc178 — the disposition is a three-bucket read of completeness, and every label is a controlled word", () => {
  const complete = assembleRopaRegister(INPUT);
  assertEquals(readSyllabus(complete.document)!.disposition, "Complete");
  assertEquals(toneForState("Complete"), "ok");

  const incomplete = assembleRopaRegister({ ...INPUT, activities: [ACTIVITY, GAPPY_ACTIVITY] });
  assertEquals(readSyllabus(incomplete.document)!.disposition, "Incomplete");
  assertEquals(toneForState("Incomplete"), "hi");

  const empty = assembleRopaRegister({ ...INPUT, activities: [] });
  assertEquals(readSyllabus(empty.document)!.disposition, "No Determination Recorded");
  assertEquals(toneForState("No Determination Recorded"), "neutral");
});

Deno.test("doc178 — the syllabus's conditions are completeness.missing_by_activity verbatim", () => {
  const out = assembleRopaRegister({ ...INPUT, activities: [ACTIVITY, GAPPY_ACTIVITY] });
  const s = readSyllabus(out.document)!;
  assertEquals(s.conditions.length, out.completeness.missing_by_activity.length);
  assertEquals(s.conditions[0].name, out.completeness.missing_by_activity[0].activity);
  assert(s.conditions[0].text.includes(out.completeness.missing_by_activity[0].missing[0]));
});

Deno.test("doc178 — RoPA has no lettered appendices and no key dates, so the syllabus is honest about it", () => {
  const out = assembleRopaRegister(INPUT);
  const s = readSyllabus(out.document)!;
  assertEquals(s.record_map.length, 0);
  assertEquals(s.key_dates.length, 0);
});

Deno.test("doc178 — the paragraph is composeCompletenessLead's own text, byte-identical to the completeness_review lead block", () => {
  const out = assembleRopaRegister(INPUT);
  const s = readSyllabus(out.document)!;
  const sec = out.document.sections.find((x) => x.id === "completeness_review");
  const lead = sec?.paragraphs.find((p) => p.kind === "lead")?.text;
  assertEquals(s.paragraph, lead);
});

// ── The rendered page (RoPA's own standalone HTML generator) ───────────────

async function ropaModule() {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown: async () => {}, addr: null });
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-stub");
  Deno.env.set("SUPABASE_ANON_KEY", "test-stub");
  return await import("../../../supabase/functions/generate-ropa-document/index.ts");
}

function assembledData(register: ReturnType<typeof assembleRopaRegister>) {
  return {
    session: { id: "0abc1234-0000-4000-8000-000000000008", created_at: "2026-09-04T12:00:00Z", version_number: 1 },
    client: { name: "Halden Data Services Ltd", sector: "Professional Services" },
    profile: { is_controller: true, is_processor: false },
    jurisdictions: ["EU", "UK"],
    activities: INPUT.activities.map((a) => ({ id: a.id, display_name: a.name, category: "general" })),
    answersByActivity: {},
    flags: [],
    refreshNotes: [],
    settings: { documentDate: "September 4, 2026", authorName: "", internalReference: null, approvedByName: null, approvedByTitle: null, approvalDate: null, nextReviewDue: "September 4, 2027" },
    register,
  };
}

Deno.test("doc178 — RoPA renders a Syllabus & Record page one: no navy cover block, no raw tokens, no page-one/register duplicate", async () => {
  const mod = await ropaModule();
  const out = assembleRopaRegister(INPUT);
  const html: string = mod.buildHtml(assembledData(out) as never);
  assert(html.length > 5_000, "html too short");
  assertStringIncludes(html, 'class="sr-syllabus"');
  assertStringIncludes(html, `<div class="dv">${readSyllabus(out.document)!.disposition}</div>`);
  assert(!html.includes('class="header"'), "the navy cover block must not render");
  assert(!html.includes("[Q] "), "raw [Q] token reached the HTML");
  const secStart = html.indexOf('<h2>Completeness Review</h2>');
  assert(secStart !== -1, "Completeness Review section missing");
  const secEnd = html.indexOf("<h2>", secStart + 1);
  const secHtml = html.slice(secStart, secEnd === -1 ? undefined : secEnd);
  const paragraphHtml = readSyllabus(out.document)!.paragraph.replace(/'/g, "&#39;");
  assert(!secHtml.includes(paragraphHtml), "the disposition paragraph repeats inside the Completeness Review section");
});

Deno.test("doc178 — a syllabus-less (pre-doc178) register falls back to the legacy navy header honestly", async () => {
  const mod = await ropaModule();
  const out = assembleRopaRegister(INPUT);
  const legacyDoc = { ...out.document, syllabus: undefined };
  const html: string = mod.buildHtml(assembledData({ ...out, document: legacyDoc }) as never);
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'));
});
