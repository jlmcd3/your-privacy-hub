// DOC 177 (2026-09-04) — SYLLABUS & RECORD, IR Playbook (the eighth product
// migrated onto the fleet presentation system; doc 151, docs 170-176 landed
// the shared system + Risk/DPIA/LIA/Governance/ADMT v2/Cyber v4/
// Registration). Testing is scoped per the CEO's 2026-09-04 instruction:
// enough to know the product generates without error, plus the invariants
// that keep the two SR_PRODUCTS gates and the two renderers from drifting.
// IR Playbook is a two-part document (Part One standing playbook, Part Two
// a blank-by-design incident worksheet); the syllabus projects Part One's
// standing-preparedness determination only.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleIRSkeletonDocument, standingGapLedger } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { readSyllabus, SR_PRODUCTS, syllabusToText, toneForState } from "../../../supabase/functions/_shared/prose/syllabus.ts";
import { buildSkeletonGraderPayload } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";

type Bag = Record<string, unknown>;

const INTAKE: Bag = {
  organizationName: "Northwind Logistics Group",
  organisationType: "Healthcare provider",
  responseTeamRoster: [{ role: "Incident Lead", primary: "R. Delacroix", alternate: "M. O'Shea" }],
};

const REPORT_WITH_GAP: Bag = {
  standing_playbook: {
    status: "record_insufficient",
    sections: [
      { id: "response_team", heading: "Response team and alternates", status: "analysed" },
      { id: "key_contacts", heading: "Key contacts", status: "analysed" },
      {
        id: "testing_training",
        heading: "Testing and training",
        status: "record_insufficient",
        information_needed: "Record the date of the last tabletop exercise and the next scheduled one",
      },
    ],
  },
};

const REPORT_COMPLETE: Bag = {
  standing_playbook: {
    status: "analysed",
    sections: [
      { id: "response_team", heading: "Response team and alternates", status: "analysed" },
      { id: "key_contacts", heading: "Key contacts", status: "analysed" },
    ],
  },
};

const REPORT_NO_SECTIONS: Bag = { standing_playbook: { status: "analysed", sections: [] } };

async function pdfModule() {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown: async () => {}, addr: null });
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-stub");
  Deno.env.set("SUPABASE_ANON_KEY", "test-stub");
  return await import("../../../supabase/functions/generate-report-pdf/index.ts");
}
const RECORD = { id: "0abc1234-0000-4000-8000-000000000007", created_at: "2026-09-04T12:00:00Z" };

// ── The projection ──────────────────────────────────────────────────────────

Deno.test("doc177 — the IR Playbook assembler attaches a Determination Syllabus projected from its own determinations, and generates without error", () => {
  const sk = assembleIRSkeletonDocument(REPORT_WITH_GAP, INTAKE);
  const s = readSyllabus(sk.document);
  assert(s, "document.syllabus missing");
  assert(s!.prepared_for, "prepared_for empty");
  assert(s!.disposition, "disposition empty");
  assert(s!.paragraph, "disposition paragraph empty");
  assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
});

Deno.test("doc177 — the disposition is a three-bucket read of the standing gap ledger, and every label is a controlled word", () => {
  const gapDoc = assembleIRSkeletonDocument(REPORT_WITH_GAP, INTAKE).document;
  assertEquals(readSyllabus(gapDoc)!.disposition, "Not Ready");
  assertEquals(toneForState("Not Ready"), "hi");

  const completeDoc = assembleIRSkeletonDocument(REPORT_COMPLETE, INTAKE).document;
  assertEquals(readSyllabus(completeDoc)!.disposition, "Ready");
  assertEquals(toneForState("Ready"), "ok");

  const noSectionsDoc = assembleIRSkeletonDocument(REPORT_NO_SECTIONS, INTAKE).document;
  assertEquals(readSyllabus(noSectionsDoc)!.disposition, "No Determination Recorded");
  assertEquals(toneForState("No Determination Recorded"), "neutral");
});

Deno.test("doc177 — the syllabus's conditions are the standing gap ledger verbatim", () => {
  const sk = assembleIRSkeletonDocument(REPORT_WITH_GAP, INTAKE);
  const s = readSyllabus(sk.document)!;
  const gaps = standingGapLedger(REPORT_WITH_GAP);
  assertEquals(s.conditions.length, gaps.length);
  assertEquals(s.conditions[0].name, gaps[0].heading);
  assertEquals(s.conditions[0].text, gaps[0].completes);
});

Deno.test("doc177 — IR Playbook has no lettered appendices, so the record map is honestly empty", () => {
  const sk = assembleIRSkeletonDocument(REPORT_WITH_GAP, INTAKE);
  const s = readSyllabus(sk.document)!;
  assertEquals(s.record_map.length, 0);
});

// ── The PDF renderer ───────────────────────────────────────────────────────

Deno.test("doc177 — IR Playbook renders through Syllabus & Record: page one, no cover block, no raw tokens, no page-one/lead duplicate", async () => {
  const pdf = await pdfModule();
  for (const [label, report] of [["gap", REPORT_WITH_GAP], ["complete", REPORT_COMPLETE]] as const) {
    const sk = assembleIRSkeletonDocument(report as Bag, INTAKE);
    const html: string = pdf.buildSkeletonReportHTML(sk.document as never, RECORD, "Incident Response Playbook", "ir-playbook");
    assert(html.length > 5_000, `${label}: html too short`);
    assertStringIncludes(html, 'class="sr-syllabus"');
    assertStringIncludes(html, `<div class="dv">${readSyllabus(sk.document)!.disposition}</div>`);
    assert(!html.includes('class="header"'), `${label}: the navy cover block must not render`);
    assert(!html.includes("[Q] "), `${label}: raw [Q] token reached the PDF`);
    const secStart = html.indexOf('data-section="standing_playbook"');
    const secEnd = html.indexOf('data-section="', secStart + 1);
    const secHtml = html.slice(secStart, secEnd === -1 ? undefined : secEnd);
    // The paragraph carries an apostrophe ("company's"), HTML-escaped on
    // render — compare against the escaped form.
    const paragraphHtml = readSyllabus(sk.document)!.paragraph.replace(/'/g, "&#39;");
    assert(
      !secHtml.includes(paragraphHtml),
      `${label}: the disposition paragraph repeats inside the standing_playbook section`,
    );
  }
});

Deno.test("doc177 — IR Playbook still renders through the legacy template when the product string is withheld (byte-unchanged fallback path)", async () => {
  const pdf = await pdfModule();
  const sk = assembleIRSkeletonDocument(REPORT_WITH_GAP, INTAKE);
  const html: string = pdf.buildSkeletonReportHTML(sk.document as never, RECORD, "Incident Response Playbook");
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'));
});

// ── The grader payload ─────────────────────────────────────────────────────

Deno.test("doc177 — the skeleton grader payload leads with page one for IR Playbook and never carries the [Q] token", () => {
  const sk = assembleIRSkeletonDocument(REPORT_WITH_GAP, INTAKE);
  const p = buildSkeletonGraderPayload({ skeleton_document: sk.document });
  assertStringIncludes(p.text, "[kind=syllabus] === DETERMINATION SYLLABUS (page 1) ===");
  assertStringIncludes(p.text, `READINESS: ${readSyllabus(sk.document)!.disposition}`);
  assert(!p.text.includes("[Q] "), "raw [Q] token in the grader payload");
  assertStringIncludes(syllabusToText(readSyllabus(sk.document)!), "DETERMINATION SYLLABUS");
});

// ── Gate membership ─────────────────────────────────────────────────────────

Deno.test("doc177 — ir-playbook is a member of the shared SR_PRODUCTS gate", () => {
  assert(SR_PRODUCTS.has("ir-playbook"));
});
