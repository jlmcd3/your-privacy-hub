// PROMPT 8B (CEO-ratified 2026-08-12) — DPIA SPINE conformance battery.
// Updated for v4.6 (CEO-ratified 2026-08-21): the citation-review pass over
// v4.5.1's fixed prose plus Appendix A (factor/intake/determination/authority
// matrix), replacing the Table of Authorities.
//
// Covers: the byte-pin over the ratified fixed prose, the section order against
// the EDPB harmonised template, every table surface having a builder, the
// no-padding law (including Appendix A row suppression), the design/incident
// risk split, and the re-homed composed blocks landing on the right section
// indices.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DPIA_SKELETON_CONTENT_HASH,
  DPIA_SKELETON_CONTENT_HASH_V4,
  DPIA_SKELETON_PINPOINTS,
  DPIA_SKELETON_SECTIONS,
  DPIA_SKELETON_TABLE_SURFACES,
  DPIA_SPINE_HASH,
  serializeDpiaSpine,
} from "../../_shared/prose/plans/dpia.spine.ts";
import {
  buildDpiaSkeletonTables,
  buildDpiaTablesBySurface,
} from "../../_shared/ltp/dpia-skeleton-tables.ts";
import { assembleDpiaSkeletonDocument } from "../../_shared/ltp/dpia-skeleton-assemble.ts";
import { DPIA_RISK_SPECS } from "../../run-dpia-framework/_local/ltp/dpia-deliverables/elements.ts";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const EDPB_ORDER = [
  "executive_summary",
  "section_0_overview",
  "section_1_description",
  "section_2_analysis",
  "section_3_necessity_proportionality",
  "section_4_risk_management",
  "section_5_interested_parties",
  "section_6_conclusion",
  "table_of_authorities",
];

Deno.test("spine v4.6 — fixed prose is byte-pinned to the ratified hash", async () => {
  const text = DPIA_SKELETON_SECTIONS
    .flatMap((s) => s.blocks.filter((b) => b.kind === "skeleton").map((b) => b.text))
    .join("\n");
  assertEquals(await sha256(text), DPIA_SKELETON_CONTENT_HASH);
});

Deno.test("spine v4.1 — the superseded v4 hash is retained for the audit trail", () => {
  assertEquals(
    DPIA_SKELETON_CONTENT_HASH_V4,
    "011f9f425d4cc275bdf023a97be89cafa46d9b561d0c5ca24e7957426d411cae",
  );
  assert((DPIA_SKELETON_CONTENT_HASH as string) !== DPIA_SKELETON_CONTENT_HASH_V4);
});

// PROMPT 9I (CEO-ratified 2026-08-15) — the redline's replacement text for the
// Section 1 opener drops its {organizationName} slot ("Pursuant to that
// requirement, the company identifies below: ..."). That is the ONLY inventory
// movement in v4.3; every other slot is carried through unchanged.
//
// v4.6 (CEO-ratified 2026-08-21) — the citation-review pass rewrote the
// lawful-basis opener (Section 2) and the transfers closer (now "Operational
// Compliance.") without a {regimeName} slot; both of its two occurrences are
// gone. No other slot inventory changed.
Deno.test("spine v4.6 — the slot inventory drops regimeName entirely", () => {
  const slots = DPIA_SKELETON_SECTIONS
    .flatMap((s) => s.blocks.filter((b) => b.kind === "skeleton").map((b) => b.text))
    .flatMap((t) => [...t.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]))
    .sort();
  assertEquals(slots, [
    "ART36_SENTENCE",
    "DPO_ADVICE_SENTENCE",
    "LAUNCH_CLAUSE",
    "VERSION_CLAUSE",
    "dataSubjectsViews",
    "description",
    "functionalDescription",
    "natureScopeContext",
    "organizationName",
    "organizationName",
    "organizationName",
    "reasonsToConduct",
    "supportingAssets",
  ]);
});

Deno.test("spine v4.6 — the ratified wording edits are the shipped bytes", () => {
  const fixed = DPIA_SKELETON_SECTIONS
    .flatMap((s) => s.blocks.filter((b) => b.kind === "skeleton").map((b) => b.text));
  // v4.6 adds one new skeleton block in Section 2 and one new skeleton block
  // as the Appendix A intro (replacing what was a "rule"-kind ToA block, which
  // never counted toward this "skeleton" filter) -- 16 -> 18.
  assertEquals(fixed.length, 18);
  assertStringIncludes(fixed[0], "Article 35(3) identifies three cases in which a DPIA is required in particular");
  assertStringIncludes(fixed[1], "Articles 24 and 28 require the controller to remain accountable for the processing");
  assertStringIncludes(fixed[2], "Below, the company identifies the reasons the assessment was undertaken");
  assertStringIncludes(fixed[3], "The assessment team and the approval process are reproduced as identified by the company.");
  assertStringIncludes(fixed[4], "including the legitimate interest pursued by the controller where applicable");
  assertStringIncludes(fixed[5], "On the nature, scope and context of the processing, the company has stated the following:");
  // CEO item 1 (2026-08-21) -- the doubled "and" is gone: "...and, where
  // information is lacking, what remains..." not "...and, where information
  // is lacking, and what remains...".
  assertStringIncludes(
    fixed[6],
    "Each subsequent table states what {organizationName} has recorded, what that supports, and, where information is lacking, what remains to be established.",
  );
  assertStringIncludes(fixed[7], "in addition to an Article 6 lawful basis");
  // v4.6's new Section 2 block -- did not exist before this pass.
  assertStringIncludes(fixed[8], "requires purpose limitation, data minimisation, accuracy, and storage limitation.");
  assertStringIncludes(fixed[9], "Operational Compliance. The GDPR also requires the controller to address several operational compliance measures");
  assertStringIncludes(fixed[10], "That analysis is informed by the Article 5 principles");
  assertStringIncludes(fixed[11], "Article 35(7)(d) then requires the DPIA to identify the measures envisaged to address those risks");
  assertStringIncludes(fixed[12], "Risk Assessments. The first register captures design risk");
  assertStringIncludes(fixed[13], "Article 35(9) requires the controller, where appropriate, to seek the views of data subjects");
  assertStringIncludes(fixed[14], "Article 35(11) also requires the controller to review the DPIA where necessary");
  assertStringIncludes(fixed[15], "the negative branch states that prior consultation is not required on this assessment's determination");
  assertStringIncludes(fixed[16], "could not determine from the company's answers");
  // Appendix A intro (replaces the Table of Authorities). v4.6.1 (CEO-ratified
  // 2026-08-22): 3 columns, not 4 -- intake data and report language merge
  // into one Report Determination sentence per factor.
  assertStringIncludes(fixed[17], "Internal field keys, variable names, and reasoning traces are never printed in the customer report.");

  const all = fixed.join("\n");
  // regimeName is gone entirely (CEO item 3a/3b context -- the citation-review
  // pass rewrote both blocks that carried it without the slot).
  assert(!all.includes("{regimeName}"));
  // The pre-fix doubled "and" must not reappear.
  assert(!all.includes("where information is lacking, and what remains"));
  // The v4 wording must be gone.
  assert(!all.includes("has indicated that this assessment is required"));
  assert(!all.includes("the record does not carry the point"));
  // The v4.2 wording must be gone.
  assert(!all.includes("not a finding against the company"));
  assert(!all.includes("that absence is noted rather than filled"));
  // The v4.3 wording must be gone.
  assert(!all.includes("but whether the same purpose could be achieved by means that are less intrusive"));
  assert(!all.includes("Pursuant to that requirement, the company identifies below:"));
});

Deno.test("spine v4.1 — sections follow the EDPB harmonised order", () => {
  assertEquals(DPIA_SKELETON_SECTIONS.map((s) => s.id), EDPB_ORDER);
});

Deno.test("spine v4.1 — the retired v3 sections are gone", () => {
  const ids = new Set(DPIA_SKELETON_SECTIONS.map((s) => s.id));
  for (const retired of ["the_processing", "lawfulness", "risks_and_measures", "consultation_and_signoff"]) {
    assert(!ids.has(retired), `retired v3 section still present: ${retired}`);
  }
});

Deno.test("spine v4.1 — every table surface has a builder", () => {
  const built = buildDpiaTablesBySurface({}, {});
  // v4.6 — Appendix A's "factor_authority_matrix" surface is populated by its
  // own dedicated composer in dpia-skeleton-assemble.ts (buildDpiaFactor
  // AuthorityMatrixTable, positionally keyed as "table_of_authorities:1"),
  // not by the generic by-surface builder — same pattern as CPPA Risk's
  // Appendix G and CPPA ADMT's Appendix B matrices.
  for (const surface of DPIA_SKELETON_TABLE_SURFACES) {
    if (surface === "factor_authority_matrix") continue;
    assert(surface in built, `no builder for table surface ${surface}`);
  }
});

Deno.test("spine v4.1 — pinpoints carry only corpus keys, no literal statute text", () => {
  for (const p of DPIA_SKELETON_PINPOINTS) {
    assert(/^[a-z0-9-]+$/.test(p.corpus_key), `bad corpus key ${p.corpus_key}`);
    assert(p.citation.length < 40, `pinpoint citation looks like quoted text: ${p.citation}`);
  }
  const keys = DPIA_SKELETON_PINPOINTS.map((p) => p.corpus_key);
  for (const k of ["gdpr-art-28", "gdpr-art-44", "gdpr-art-46"]) {
    assert(keys.includes(k), `missing PROMPT 8 pinpoint ${k}`);
  }
  assert(!keys.includes("gdpr-art-9-2"), "gdpr-art-9-2 has no corpus row and must not be pinned");
  assert(!keys.includes("gdpr-art-45"), "no EU gdpr-art-45 row exists; adequacy stays out of fixed prose");
});

Deno.test("risk specs — every spec carries exactly one ratified risk class", () => {
  const design = DPIA_RISK_SPECS.filter((r) => r.risk_class === "design").map((r) => r.risk_id);
  const incident = DPIA_RISK_SPECS.filter((r) => r.risk_class === "incident").map((r) => r.risk_id);
  assertEquals(design.length + incident.length, DPIA_RISK_SPECS.length);
  assertEquals(incident.sort(), [
    "r1_unauthorised_access",
    "r5_third_country_transfer",
    "r6_processor_chain",
  ]);
  assertEquals(design.length, 6);
});

Deno.test("no-padding law — an empty surface yields no table", () => {
  const built = buildDpiaTablesBySurface({}, {});
  assertEquals(built["gap_ledger"], null);
  assertEquals(built["risk_register"], null);
  assertEquals(built["processing_inventory.data_items"], null);
  assertEquals(built["assessment_particulars"], null);
});

Deno.test("absence is a determination — processors and transfers still render one row", () => {
  const built = buildDpiaTablesBySurface({ processing_inventory: { processors: [] }, section2_coverage: {} }, {});
  const processors = built["processing_inventory.processors"];
  assert(processors, "processor determination row missing");
  assertEquals(processors!.rows.length, 1);
  assertStringIncludes(processors!.rows[0][0], "No processor is recorded");

  const other = built["section2_coverage.measures_other"];
  assert(other, "transfers determination row missing");
  assertStringIncludes(other!.rows[0][1], "No cross-border transfer is on the record");
});

Deno.test("risk split — design and incident rows are disjoint and both appear in the full register", () => {
  const report = {
    risk_register: [
      { risk_id: "r3_children", risk_label: "Children", risk_class: "design", severity: "Severe", source: "x", affected_rights: "y", residual_band: "high", measures: [] },
      { risk_id: "r1_unauthorised_access", risk_label: "Access", risk_class: "incident", severity: "Moderate", source: "x", affected_rights: "y", residual_band: "low", measures: ["Encryption"] },
    ],
  };
  const built = buildDpiaTablesBySurface(report, {});
  assertEquals(built["risk_register.design"]!.rows.length, 1);
  assertEquals(built["risk_register.incident"]!.rows.length, 1);
  assertEquals(built["risk_register"]!.rows.length, 2);
});

Deno.test("legacy registers without risk_class still render once, under Section 4", () => {
  const report = { risk_register: [{ risk_label: "Legacy", severity: "Severe", source: "x", affected_rights: "y", measures: [] }] };
  const built = buildDpiaTablesBySurface(report, {});
  assertEquals(built["risk_register.design"], null);
  assertEquals(built["risk_register.incident"]!.rows.length, 1);
});

Deno.test("keyed tables land on the spine's own table block indices", () => {
  const keys = Object.keys(buildDpiaSkeletonTables({}, {}));
  assert(keys.includes("section_0_overview:1"));
  assert(keys.includes("risk_register") === false, "surfaces must be keyed by section:index");
  for (const key of keys) {
    const [id, idx] = key.split(":");
    const section = DPIA_SKELETON_SECTIONS.find((s) => s.id === id)!;
    assertEquals(section.blocks[Number(idx)].kind, "table");
  }
});

Deno.test("assembly — re-homed composers land on their v4.1 blocks and tables render", () => {
  const report = {
    decision: { determination: "approved", conditions: [], blockers: [], why: "Nothing is left open.", citation: "GDPR Art. 35" },
    art36_consultation: { determination: "consultation_not_required", why: "" },
    necessity_findings: [{ operation_id: "o1", why: "The purpose could not be met by less intrusive means.", verdict: "least_intrusive_means_supported" }],
    proportionality: [],
    risk_register: [
      { risk_id: "r3_children", risk_label: "Children", risk_class: "design", severity: "Severe", source: "x", affected_rights: "y", residual_band: "moderate", measures: ["Age gating"] },
    ],
    gap_ledger: [{ field: "retention_period", dimensions: "the retention period for the triage scores", provision: "GDPR Art. 5(1)(e)", enables: "the retention determination" }],
    authority_exhibit: { entries: [{ citation: "GDPR Art. 35", authority_class: "regulation" }] },
  };
  const intake = {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    description: "A scoring model applied at intake.",
    nature_scope_context: "The processing runs across three urgent-care sites.",
    functional_description: "Scores are computed at check-in.",
    supporting_assets: "A hosted scoring service and the patient record system.",
    data_subjects_views: "A patient panel was consulted in June.",
  };

  const { document, conformance, register_findings } = assembleDpiaSkeletonDocument(report, intake);
  assertEquals(conformance.length, 0);
  assertEquals(register_findings, []);
  assertEquals(document.sections.map((s) => s.id), EDPB_ORDER);

  const byId = (id: string) => document.sections.find((s) => s.id === id)!;
  const s3 = byId("section_3_necessity_proportionality").paragraphs.map((p) => p.text).join(" ");
  assertStringIncludes(s3, "On the stated test \u2014 whether a realistic, less intrusive method could achieve the same purpose \u2014 each alternative the company considered was rejected for the reasons recorded, and the processing is supported as necessary to achieve the stated goal.");
  const s6 = byId("section_6_conclusion").paragraphs.map((p) => p.text).join(" ");
  assertStringIncludes(s6, "The sign-off determination recorded is");
  // v4.6 (2026-08-21) — composeArt36Sentence's "not required" branch wording.
  assertStringIncludes(s6, "prior consultation with the supervisory authority under Article 36(1) is not required");

  const s1 = byId("section_1_description").paragraphs.map((p) => p.text).join(" ");
  assertStringIncludes(s1, "three urgent-care sites");
  const s5 = byId("section_5_interested_parties").paragraphs.map((p) => p.text).join(" ");
  assertStringIncludes(s5, "A patient panel was consulted in June");

  const gapTable = byId("section_6_conclusion").paragraphs.find((p) => p.kind === "table" && p.table?.surface === "gap_ledger");
  assert(gapTable, "gap ledger table did not render");
  assertEquals(gapTable!.table!.rows.length, 1);

  // No slot may leak into the customer document.
  const whole = document.sections.flatMap((s) => s.paragraphs.map((p) => p.text)).join("\n");
  assert(!/\{[A-Za-z_]/.test(whole), "an unfilled slot reached the document");
});

// v4.6 (CEO-ratified 2026-08-21) — Appendix A replaces the Table of
// Authorities; v4.6.1 (CEO-ratified 2026-08-22) merges intake data and report
// language into one Report Determination column. Rows for factors that did
// not compose (no-padding law) must not print.
Deno.test("Appendix A — title, column headers, and row suppression match the CEO's ratification", () => {
  const report = {
    decision: { determination: "approved", conditions: [], blockers: [], why: "Nothing is left open.", citation: "GDPR Art. 35" },
    art36_consultation: { determination: "consultation_not_required", why: "" },
    necessity_findings: [{ operation_id: "o1", why: "The purpose could not be met by less intrusive means.", verdict: "least_intrusive_means_supported" }],
    proportionality: [],
    risk_register: [
      { risk_id: "r3_children", risk_label: "Children", risk_class: "design", severity: "Severe", source: "x", affected_rights: "y", residual_band: "moderate", measures: ["Age gating"] },
    ],
    gap_ledger: [{ field: "retention_period", dimensions: "the retention period for the triage scores", provision: "GDPR Art. 5(1)(e)", enables: "the retention determination" }],
    // Deliberately no report.legal_basis — "Lawful basis" must be suppressed.
  };
  const intake = {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    description: "A scoring model applied at intake.",
    nature_scope_context: "The processing runs across three urgent-care sites.",
    functional_description: "Scores are computed at check-in.",
    supporting_assets: "A hosted scoring service and the patient record system.",
    data_subjects_views: "A patient panel was consulted in June.",
  };

  const { document } = assembleDpiaSkeletonDocument(report, intake);
  const appendix = document.sections.find((s) => s.id === "table_of_authorities")!;
  assertEquals(appendix.title, "Appendix A — Factor, Determination, and Authority Matrix");

  const matrix = appendix.paragraphs.find((p) => p.kind === "table")!.table!;
  assertEquals(matrix.columns, ["Factor", "Report Determination", "Primary Authority"]);
  assert(!matrix.columns.some((c) => c.includes("Deterministic")), "column header must not say Deterministic");
  assert(!matrix.columns.includes("Customer Intake Data"), "intake-data column must be merged away, not present");

  const labels = matrix.rows.map((r) => r[0]);
  // Present: description/purpose composed from the supplied nature/scope text.
  assert(labels.includes("Systematic description and purposes"), "a composed factor was wrongly suppressed");
  // Suppressed: no report.legal_basis was supplied, so the table never built.
  assert(!labels.includes("Lawful basis"), "an uncomposed factor printed a row (no-padding law violated)");
  assert(matrix.rows.length > 0 && matrix.rows.length < 22, "expected partial suppression, not all-or-nothing");
});

Deno.test("assembly — no table block renders an empty grid", () => {
  const { document } = assembleDpiaSkeletonDocument({}, { organization_name: "Acme Ltd" });
  for (const section of document.sections) {
    for (const p of section.paragraphs) {
      if (p.kind !== "table") continue;
      assert(p.table && p.table.rows.length > 0, `empty table rendered in ${section.id}`);
    }
  }
});

// PROMPT 8E item 8(b) — the v4.2 wide-basis pin gains its consumer. Until now
// DPIA_SPINE_HASH was declared and never asserted.
Deno.test("spine v4.2 — the wide-basis serialization matches DPIA_SPINE_HASH", async () => {
  assertEquals(await sha256(serializeDpiaSpine()), DPIA_SPINE_HASH);
});
