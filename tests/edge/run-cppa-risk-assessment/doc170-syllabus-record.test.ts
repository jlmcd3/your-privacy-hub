// DOC 170 (2026-09-04) — SYLLABUS & RECORD, Phase 0 + CPPA Risk page one.
//
// The CEO-ratified fleet presentation system (doc 151; canonical record
// docs/design/SYLLABUS-RECORD-DESIGN-SYSTEM.md) lands as a shared,
// product-gated render mode in BOTH renderers, with CPPA Risk as the first
// product: page one is the Determination Syllabus (a projection the
// assembler persists as document.syllabus), the cover block and the
// "Contents" page are gone, the body renders on the one rail geometry, the
// Supporting Assessment Record sits behind the divider, and the grader
// payload grades page one and never sees the "[Q] " render token.
//
// Testing is scoped per the CEO's 2026-09-04 instruction: enough to know the
// product generates without error, plus the invariants that keep the two
// renderers and the two SR_PRODUCTS gates from drifting.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleRiskSkeletonDocument, riskConditionName } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { readSyllabus, SR_PRODUCTS, syllabusToText, toneForState } from "../../../supabase/functions/_shared/prose/syllabus.ts";
import { buildSkeletonGraderPayload } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";

type Bag = Record<string, unknown>;
const fixture = (rel: string): Bag =>
  JSON.parse(Deno.readTextFileSync(new URL(rel, import.meta.url))) as Bag;
const VELOSPAN = fixture("../fixtures/batch14/velospan.json");
const LUMINARY = fixture("../fixtures/batch13/luminary.json");
const NESTGRID = fixture("../fixtures/batch13/nestgrid.json");
const B1 = "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const B2 = "Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const REPORT = { scope_and_triggers: { narrative: [B1, B2] } } as never;

// The PDF entrypoint calls Deno.serve and builds a Supabase client at module
// scope; both are stubbed so the builder can be imported without serving or
// contacting anything (the same stubs the local render harness uses).
async function pdfModule() {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown: async () => {}, addr: null });
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-stub");
  Deno.env.set("SUPABASE_ANON_KEY", "test-stub");
  return await import("../../../supabase/functions/generate-report-pdf/index.ts");
}
const RECORD = { id: "0abc1234-0000-4000-8000-000000000000", created_at: "2026-09-04T12:00:00Z" };

// ── The projection ──────────────────────────────────────────────────────────

Deno.test("doc170 — the Risk assembler attaches a Determination Syllabus projected from its own determinations", () => {
  const res = assembleRiskSkeletonDocument(REPORT, LUMINARY as never);
  const s = readSyllabus(res.document);
  assert(s, "document.syllabus missing");
  assertEquals(s!.disposition, res.exec_panel.disposition_label);
  assertEquals(s!.prepared_for, String(LUMINARY.entity_name));
  assertStringIncludes(s!.instrument_line, "11 CCR §§ 7150–7157");
  // The disposition paragraph IS the executive determination lead, verbatim.
  const lead = res.document.sections.find((x) => x.id === "executive_summary")?.paragraphs.find((p) => p.kind === "lead")?.text?.trim();
  assertEquals(s!.paragraph, lead);
  // Conditions are the engine's § 4.D array, verbatim, count-matched.
  assertEquals(s!.conditions.length, res.exec_panel.conditions_count);
  for (const c of s!.conditions) assert(c.name && !/^Condition \d+$/.test(c.name), `unnamed condition: ${c.text.slice(0, 60)}`);
  // Counts under ten are words; the record map covers every appendix letter.
  assert(s!.rows.some(([k, v]) => k === "Assessment required" && /^Yes — (one|two|three|four|five|six) § 7150\(b\) trigger/.test(v)), JSON.stringify(s!.rows));
  assertEquals(s!.record_map.map((r) => r[0]).join(""), "ABCDEF");
  assert(s!.key_dates.some(([k]) => k === "Three-year review"));
  // Sections, hash pin and conformance are untouched by the projection.
  assertEquals(res.conformance.length, 0, JSON.stringify(res.conformance));
});

Deno.test("doc170 — condition names derive from the fixed closure templates, never from free text", () => {
  assertEquals(riskConditionName("Cease processing, or establish the necessity of, “Precise home address (GPS coordinates)” for the assessed Purpose; the Company’s own record states it is collected but not necessary.", 1), "Necessity of “Precise home address (GPS coordinates)”");
  assertEquals(riskConditionName("Complete implementation of the planned safeguard: “A banner” (addresses: (C) Impairment of consumer control over personal information and (G) Reputational harms).", 0), "Planned safeguard — (C) Impairment of consumer control over personal information and (G) Reputational harms");
  assertEquals(riskConditionName("Obtain implementation and testing evidence for the safeguard credited against the risk: (G) Reputational harms.", 2), "Testing evidence — (G) Reputational harms");
  assertEquals(riskConditionName("Something the templates do not produce.", 3), "Condition 4");
});

Deno.test("doc170 — the state lexicon tints only controlled words", () => {
  assertEquals(toneForState("Proceed with Conditions"), "hold");
  assertEquals(toneForState("Do Not Proceed"), "hi");
  assertEquals(toneForState("Engaged"), "ok");
  assertEquals(toneForState("Not engaged"), "neutral");
  assertEquals(toneForState("The Company records a High risk"), null);
});

// ── The PDF renderer ───────────────────────────────────────────────────────

Deno.test("doc170 — CPPA Risk renders through Syllabus & Record: page one, no cover block, no Contents page, no raw tokens, divider present", async () => {
  const pdf = await pdfModule();
  for (const [label, intake] of [["Velospan", VELOSPAN], ["NestGrid", NESTGRID], ["Luminary", LUMINARY]] as const) {
    const res = assembleRiskSkeletonDocument(REPORT, intake as never);
    const html: string = pdf.buildSkeletonReportHTML(res.document as never, RECORD, "CPPA Privacy Risk Assessment", "cppa-risk");
    assert(html.length > 50_000, `${label}: html too short`);
    assertStringIncludes(html, 'class="sr-syllabus"');
    assertStringIncludes(html, `<div class="dv">${res.exec_panel.disposition_label}</div>`);
    assertStringIncludes(html, "Supporting Assessment Record");
    assert(!html.includes(">Contents<"), `${label}: the Contents page must not render`);
    assert(!html.includes('class="header"'), `${label}: the navy cover block must not render`);
    assert(!html.includes("[Q] "), `${label}: raw [Q] token reached the PDF`);
    assert(!html.includes("risk-glance-panel"), `${label}: the doc-144 glance panel is replaced by page one`);
    assertStringIncludes(html, 'data-sr-runhead="CPPA PRIVACY RISK ASSESSMENT');
    assertStringIncludes(html, 'data-sr-footer="EndUserPrivacy.com · CPPA Privacy Risk Assessment"');
    assert((html.match(/class="rail/g) ?? []).length >= 8, `${label}: governing-requirement rails missing`);
    assert(html.includes("<u>"), `${label}: run-in titles are underline-only`);
    assert(!/<strong[^>]*>\s*<span style="text-decoration:underline[^>]*>[A-Z]\.<\/span>/.test(html), `${label}: a marker is underlined`);
  }
});

Deno.test("doc170 — a non-S&R product is byte-unchanged (the legacy template still renders the cover block)", async () => {
  const pdf = await pdfModule();
  const res = assembleRiskSkeletonDocument(REPORT, LUMINARY as never);
  const html: string = pdf.buildSkeletonReportHTML(res.document as never, RECORD, "Some Other Product", "cppa-cyber");
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'));
});

// ── The grader payload ─────────────────────────────────────────────────────

Deno.test("doc170 — the skeleton grader payload leads with page one and never carries the [Q] token", () => {
  const res = assembleRiskSkeletonDocument(REPORT, VELOSPAN as never);
  const p = buildSkeletonGraderPayload({ skeleton_document: res.document });
  assertStringIncludes(p.text, "[kind=syllabus] === DETERMINATION SYLLABUS (page 1) ===");
  assertStringIncludes(p.text, `ASSESSMENT DISPOSITION: ${res.exec_panel.disposition_label}`);
  assert(!p.text.includes("[Q] "), "raw [Q] token in the grader payload");
  assertStringIncludes(p.text, "What is being processed, about whom, and why");
  assertEquals(p.truncated, false);
  assertStringIncludes(syllabusToText(readSyllabus(res.document)!), "KEY DATES");
});

// ── Twin parity ────────────────────────────────────────────────────────────

Deno.test("doc170 — the web mirror's SR_PRODUCTS gate and state lexicon match the edge module", async () => {
  const web = await Deno.readTextFile(new URL("../../../src/lib/syllabus-record.ts", import.meta.url));
  const edge = await Deno.readTextFile(new URL("../../../supabase/functions/_shared/prose/syllabus.ts", import.meta.url));
  const gate = (src: string) => [...(/SR_PRODUCTS[^=]*=\s*new Set<string>\(\[([\s\S]*?)\]\)/.exec(src)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
  assertEquals(gate(web), gate(edge));
  assertEquals(gate(edge), [...SR_PRODUCTS].sort());
  const lexicon = (src: string) => /SR_STATE_TONES[\s\S]*?\];/.exec(src)?.[0].replace(/\s+/g, " ");
  assertEquals(lexicon(web), lexicon(edge), "state lexicon drifted between the two renderers");
  // The payload mirror is a verbatim copy of the source after its header.
  const src = (await Deno.readTextFile(new URL("../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts", import.meta.url))).replace(/\r\n/g, "\n");
  const mirror = (await Deno.readTextFile(new URL("../../../supabase/functions/grade-single-assessment/_local/grader/skeleton-payload-mirror.ts", import.meta.url))).replace(/\r\n/g, "\n");
  assertEquals(mirror.split("\n").slice(7).join("\n"), src);
});
