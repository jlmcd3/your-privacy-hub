// PROMPT 8B (CEO-ratified 2026-08-12) — DPIA SPINE v4.1 conformance battery.
// v4.1 is a fixed-prose revision only: the byte-pin moves, the structure and the
// slot inventory do not.
//
// Covers: the byte-pin over the ratified fixed prose, the section order against
// the EDPB harmonised template, every table surface having a builder, the
// no-padding law, the design/incident risk split, and the re-homed composed
// blocks landing on the right section indices.
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import {
  DPIA_SKELETON_CONTENT_HASH,
  DPIA_SKELETON_CONTENT_HASH_V4,
  DPIA_SKELETON_PINPOINTS,
  DPIA_SKELETON_SECTIONS,
  DPIA_SKELETON_TABLE_SURFACES,
  DPIA_SPINE_HASH,
  serializeDpiaSpine,
} from "../prose/plans/dpia.spine.ts";
import {
  buildDpiaSkeletonTables,
  buildDpiaTablesBySurface,
} from "../ltp/dpia-skeleton-tables.ts";
import { assembleDpiaSkeletonDocument } from "../ltp/dpia-skeleton-assemble.ts";
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

Deno.test("spine v4.1 — fixed prose is byte-pinned to the ratified hash", async () => {
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
  assert(DPIA_SKELETON_CONTENT_HASH !== DPIA_SKELETON_CONTENT_HASH_V4);
});

Deno.test("spine v4.1 — the slot inventory is identical to v4", () => {
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
    "organizationName",
    "organizationName",
    "reasonsToConduct",
    "supportingAssets",
  ]);
});

Deno.test("spine v4.1 — the ratified wording edits are the shipped bytes", () => {
  const fixed = DPIA_SKELETON_SECTIONS
    .flatMap((s) => s.blocks.filter((b) => b.kind === "skeleton").map((b) => b.text));
  assertEquals(fixed.length, 16);
  assertStringIncludes(fixed[0], "{organizationName} believes that this assessment may be required because");
  assertStringIncludes(fixed[1], "the absence of that information is noted rather than assumed.");
  assertStringIncludes(fixed[3], "reproduced as identified by the company.");
  assertStringIncludes(fixed[4], "the company identifies below:");
  assertStringIncludes(fixed[6], "the sufficiency of the record itself, not a finding assessed against the company.");
  assertStringIncludes(fixed[8], "Chapter V's conditions for such transfer are satisfied");
  assertStringIncludes(fixed[9], "means that are less intrusive.");
  assertStringIncludes(fixed[10], "The risks inherent in the processing's design \u2014 that is,");
  assertStringIncludes(fixed[11], "in light of the protective or mitigating measures it identifies.");
  // PROMPT 9I item 1 — the v4.3 ratified edits are the shipped bytes.
  assertStringIncludes(fixed[8], "the subject-matter and duration of the processing, the nature and purpose of the processing, the type of personal data and categories of data subjects and the obligations and rights of the controller");
  assertStringIncludes(fixed[11], "Article 35(7)(d) requires an assessment of the measures planned to address them");
  assertStringIncludes(fixed[12], "the company states: {dataSubjectsViews");
  assertStringIncludes(fixed[15], "could not determine from the company's answers");
  // The v4 wording must be gone.
  const all = fixed.join("\n");
  assert(!all.includes("has indicated that this assessment is required"));
  assert(!all.includes("the record does not carry the point"));
  // The v4.2 wording must be gone.
  assert(!all.includes("not a finding against the company"));
  assert(!all.includes("that absence is noted rather than filled"));
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
  for (const surface of DPIA_SKELETON_TABLE_SURFACES) {
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
  assertStringIncludes(s3, "less intrusive means");
  const s6 = byId("section_6_conclusion").paragraphs.map((p) => p.text).join(" ");
  assertStringIncludes(s6, "The sign-off determination recorded is");
  assertStringIncludes(s6, "no prior consultation with the supervisory authority");

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
