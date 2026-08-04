// DPIA UPGRADE (ITEM 7) — verification suite for the six build items.
//
// Item 1 — the two structural fields (assessment team; validation & approval).
// Item 3 — rail / guidance: adopted-status label and the two new entry keys.
// Item 4 — corpus (Arts. 35/36) + shared authority exhibit.
// Item 5 — document-wide ≤2 cap on the two controlled boilerplate literals.
// Item 6 — schema allow-list carries the new top-level key.
//
// Pure-module tests only: no network, no database, no model.

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  attachDpiaAttestation,
  buildDpiaAssessmentTeam,
  buildDpiaValidationApproval,
  parseTeamRoster,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/attestation.ts";

import {
  applyDpiaBoilerplateCap,
  countDpiaBoilerplate,
  DPIA_BOILERPLATE_CAP,
  INFO_NEEDED_LITERAL,
  NEUTRAL_DOWNGRADE_LITERAL,
} from "../../../supabase/functions/run-dpia-framework/_dpia_boilerplate_cap.ts";

import {
  buildDpiaCorpusLawBlock,
  DPIA_CORPUS_KEYS,
  dpiaCorpusProvisionsForExhibit,
  EMPTY_DPIA_CORPUS,
  isAllowedDpiaCitation,
} from "../../../supabase/functions/_shared/ltp/dpia-corpus.ts";

import { DPIA_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/dpia.ts";

// ── ITEM 1a — assessment team ────────────────────────────────────────────

Deno.test("ITEM 1a — a named roster with roles produces an analysed assessment team", () => {
  const team = buildDpiaAssessmentTeam({
    dpia_prepared_by:
      "A. Okonjo — Privacy Counsel (Responsible)\nD. Dasher — Data Protection Officer (Accountable)",
  });
  assertEquals(team.status, "analysed");
  assertEquals(team.members.length, 2);
  assertEquals(team.members[0].name, "A. Okonjo");
  assertStringIncludes(team.members[0].role, "Privacy Counsel");
  assert(team.raci_recorded, "RACI wording in the source must be recorded");
  assertStringIncludes(team.text, "A. Okonjo");
  assertEquals(team.information_needed, undefined);
  assertStringIncludes(team.template_ref, "§ 0.5 ¶6");
});

Deno.test("ITEM 1a — a missing roster degrades, it is never omitted and never invented", () => {
  const team = buildDpiaAssessmentTeam({});
  assertEquals(team.status, "record_insufficient");
  assertEquals(team.members.length, 0);
  assert(team.text.length > 0, "degraded record still carries prose");
  assert(team.information_needed, "degraded record names what is missing");
  assertStringIncludes(team.information_needed!, "dpia_prepared_by");
});

Deno.test("ITEM 1a — the legacy dpia_team RACI field is the fallback source", () => {
  const team = buildDpiaAssessmentTeam({
    dpia_team: "J. Halvorsen — Head of Survey Operations",
  });
  assertEquals(team.status, "analysed");
  assertEquals(team.members[0].name, "J. Halvorsen");
});

Deno.test("ITEM 1a — a name without a role is kept, and the missing role is flagged", () => {
  const team = buildDpiaAssessmentTeam({ dpia_prepared_by: "P. Raman" });
  assertEquals(team.members.length, 1);
  assertEquals(team.members[0].name, "P. Raman");
  assertEquals(team.members[0].role, "");
  assertEquals(team.status, "record_insufficient");
});

Deno.test("ITEM 1a — the roster parser is deterministic across separators", () => {
  const a = parseTeamRoster("X — Role A; Y — Role B");
  const b = parseTeamRoster("X — Role A\nY — Role B");
  assertEquals(a, b);
  assertEquals(a.length, 2);
});

// ── ITEM 1b — validation & approval ──────────────────────────────────────

Deno.test("ITEM 1b — name, title, date and basis produce an attested approval", () => {
  const v = buildDpiaValidationApproval({
    dpia_approved_by_name: "M. Ferrante",
    dpia_approved_by_title: "Managing Director",
    dpia_approval_date: "2026-04-14",
    dpia_signoff_basis: "Sections 3 and 4 as reviewed, two moderate residual risks accepted",
  });
  assertEquals(v.attested, true);
  assertEquals(v.status, "analysed");
  assertStringIncludes(v.text, "M. Ferrante");
  assertStringIncludes(v.text, "Managing Director");
  assertStringIncludes(v.text, "2026-04-14");
  assertEquals(v.information_needed, undefined);
  assertStringIncludes(v.template_ref, "§ 0.5 ¶10");
});

Deno.test("ITEM 1b — a partial approval is not attested and lists every missing part", () => {
  const v = buildDpiaValidationApproval({ dpia_approved_by_name: "M. Ferrante" });
  assertEquals(v.attested, false);
  assertEquals(v.status, "record_insufficient");
  assert(v.information_needed);
  assertStringIncludes(v.information_needed!, "dpia_approved_by_title");
  assertStringIncludes(v.information_needed!, "dpia_approval_date");
  assertStringIncludes(v.information_needed!, "dpia_signoff_basis");
  assert(
    !v.information_needed!.includes("dpia_approved_by_name"),
    "a field that IS on the record must not be listed as missing",
  );
});

Deno.test("ITEM 1b — an empty record is not attested and never fabricates an approver", () => {
  const v = buildDpiaValidationApproval({});
  assertEquals(v.attested, false);
  assertEquals(v.approved_by_name, "");
  assertEquals(v.approval_date, "");
  assert(v.text.length > 0);
});

// ── attachment: the fields ride the right sections ───────────────────────

Deno.test("ITEM 1 — attachment places each field in its EDPB section and is fail-open", () => {
  const report: Record<string, unknown> = {
    section_0_overview: { processing_name: "x" },
    section_6_conclusion: { decision: "proceed" },
  };
  const meta = attachDpiaAttestation(report, {
    dpia_prepared_by: "A. Okonjo — Privacy Counsel",
    dpia_approved_by_name: "M. Ferrante",
    dpia_approved_by_title: "Managing Director",
    dpia_approval_date: "2026-04-14",
    dpia_signoff_basis: "Sections 3 and 4 reviewed.",
  });
  assertEquals((meta as Record<string, unknown>).ok, true);
  const ov = report.section_0_overview as Record<string, unknown>;
  const cc = report.section_6_conclusion as Record<string, unknown>;
  assert(ov.assessment_team, "assessment_team rides section_0_overview");
  assert(cc.validation_approval, "validation_approval rides section_6_conclusion");
  assert(!("validation_approval" in ov), "attestation must not duplicate into overview");
  assert(!("assessment_team" in cc), "team must not duplicate into the conclusion");
  // Existing section keys survive.
  assertEquals(ov.processing_name, "x");
  assertEquals(cc.decision, "proceed");
});

Deno.test("ITEM 1 — attachment on a bare report creates the sections rather than throwing", () => {
  const report: Record<string, unknown> = {};
  const meta = attachDpiaAttestation(report, {}) as Record<string, unknown>;
  assertEquals(meta.ok, true);
  assert(report.section_0_overview);
  assert(report.section_6_conclusion);
});

// ── ITEM 5 — repetition defect ───────────────────────────────────────────

function docWith(literal: string, n: number): Record<string, unknown> {
  const leaves: Record<string, unknown> = {};
  for (let i = 0; i < n; i++) leaves[`leaf_${String(i).padStart(2, "0")}`] = literal;
  return { section_2_analysis: leaves };
}

Deno.test("ITEM 5 — twenty-one identical information-needed sentences are capped at two", () => {
  const doc = docWith(INFO_NEEDED_LITERAL, 21);
  applyDpiaBoilerplateCap(doc);
  const counts = countDpiaBoilerplate(doc);
  assertEquals(counts[INFO_NEEDED_LITERAL], DPIA_BOILERPLATE_CAP);
});

Deno.test("ITEM 5 — the neutral-downgrade literal is capped on the same rule", () => {
  const doc = docWith(NEUTRAL_DOWNGRADE_LITERAL, 9);
  applyDpiaBoilerplateCap(doc);
  assertEquals(countDpiaBoilerplate(doc)[NEUTRAL_DOWNGRADE_LITERAL], DPIA_BOILERPLATE_CAP);
});

Deno.test("ITEM 5 — nothing is deleted: every flagged leaf still carries prose", () => {
  const doc = docWith(INFO_NEEDED_LITERAL, 12);
  applyDpiaBoilerplateCap(doc);
  const leaves = (doc.section_2_analysis as Record<string, string>);
  for (const [k, v] of Object.entries(leaves)) {
    assert(typeof v === "string" && v.trim().length > 20, `leaf ${k} lost its flag`);
  }
});

Deno.test("ITEM 5 — the cap is deterministic: identical input, identical output", () => {
  const a = docWith(INFO_NEEDED_LITERAL, 15);
  const b = docWith(INFO_NEEDED_LITERAL, 15);
  applyDpiaBoilerplateCap(a);
  applyDpiaBoilerplateCap(b);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
});

Deno.test("ITEM 5 — a document already within the cap is left byte-identical", () => {
  const doc = docWith(INFO_NEEDED_LITERAL, 2);
  const before = JSON.stringify(doc);
  applyDpiaBoilerplateCap(doc);
  assertEquals(JSON.stringify(doc), before);
});

Deno.test("ITEM 5 — the cap is fail-open on a non-object document", () => {
  applyDpiaBoilerplateCap(null as unknown as Record<string, unknown>);
  applyDpiaBoilerplateCap("not a document" as unknown as Record<string, unknown>);
});

// ── ITEM 4 — corpus + authority exhibit ──────────────────────────────────

Deno.test("ITEM 4 — the DPIA corpus is keyed on Arts. 35 and 36", () => {
  assert(DPIA_CORPUS_KEYS.includes("gdpr-art-35"), "Art. 35 is the DPIA spine");
  assert(DPIA_CORPUS_KEYS.includes("gdpr-art-36"), "Art. 36 governs prior consultation");
});

Deno.test("ITEM 4 — an empty corpus yields no law block and no exhibit rows", () => {
  assertEquals(buildDpiaCorpusLawBlock(EMPTY_DPIA_CORPUS), "");
  assertEquals(dpiaCorpusProvisionsForExhibit(EMPTY_DPIA_CORPUS).length, 0);
});

Deno.test("ITEM 4 — a resolved corpus produces a law block quoting the resolved provisions", () => {
  const corpus = {
    ...EMPTY_DPIA_CORPUS,
    provisions: [
      {
        key: "gdpr-art-35",
        citation: "GDPR Art. 35",
        title: "Data protection impact assessment",
        text: "Where a type of processing is likely to result in a high risk…",
        plain_requirements: ["Carry out an assessment before the processing."],
        status: "approved",
      },
    ],
  } as unknown as Parameters<typeof buildDpiaCorpusLawBlock>[0];
  const block = buildDpiaCorpusLawBlock(corpus);
  assertStringIncludes(block, "GDPR Art. 35");
  assertStringIncludes(block, "Where a type of processing");
  const rows = dpiaCorpusProvisionsForExhibit(corpus);
  assertEquals(rows.length, 1);
  assertEquals(rows[0].key, "gdpr-art-35");
});

Deno.test("ITEM 4 — only resolved corpus citations are allowed", () => {
  const corpus = {
    ...EMPTY_DPIA_CORPUS,
    provisions: [
      {
        key: "gdpr-art-35",
        citation: "GDPR Art. 35",
        title: "Data protection impact assessment",
        text: "…",
        plain_requirements: [],
        status: "approved",
      },
    ],
  } as unknown as Parameters<typeof isAllowedDpiaCitation>[1];
  assert(isAllowedDpiaCitation("GDPR Art. 35", corpus));
  assert(!isAllowedDpiaCitation("GDPR Art. 99", corpus));
});

// ── ITEM 6 — schema ──────────────────────────────────────────────────────

Deno.test("ITEM 6 — the report schema is bumped and allow-lists the authority exhibit", () => {
  assertEquals(DPIA_REPORT_SCHEMA.tool, "dpia_framework");
  assertStringIncludes(DPIA_REPORT_SCHEMA.version, "upgrade6");
  assert(DPIA_REPORT_SCHEMA.topLevel.includes("authority_exhibit"));
  // The two structural fields ride existing section objects, which stay listed.
  assert(DPIA_REPORT_SCHEMA.topLevel.includes("section_0_overview"));
  assert(DPIA_REPORT_SCHEMA.topLevel.includes("section_6_conclusion"));
});
