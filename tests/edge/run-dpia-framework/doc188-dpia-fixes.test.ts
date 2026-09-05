// DOC 188 (2026-09-05) — all-products batch e38460 (pinned data), DPIA items.
//
//   P5  The Section 2 "Article 9." framing paragraph ("… are set forth
//       below.") rendered with nothing under it on a record with no
//       special-category data. The PROMPT 12J conditional-intro mechanism now
//       covers the special-category table too; the spine bytes are untouched.
//   P6  The executive opener named "the General Data Protection Regulation
//       for the EU and UK (“GDPR”)" on an EU-only record. Spine v4.10: the
//       instrument is the {gdprInstrument} slot — EU-only, UK-only, or the
//       former literal where the record names both.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleDpiaSkeletonDocument,
  CONDITIONAL_INTRO_TABLE_SURFACES,
  DPIA_GDPR_INSTRUMENT_BY_SCOPE,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { buildDpiaDeliverables, readDpiaRegimeScope } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { DPIA_SKELETON_SECTIONS, DPIA_SKELETON_VERSION } from "../../../supabase/functions/_shared/prose/plans/dpia.spine.ts";
import { DPIA_SLOT_MAP } from "../../../supabase/functions/_shared/prose/plans/dpia.slotmap.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

// The batch's EU-only drone-survey record, reduced to what the two items read.
function intake(over: Bag = {}): Bag {
  return {
    organization_name: "Really, Really North Gold Possibilities GmbH",
    processing_activity_name: "Drone-based geological survey imagery capture",
    description: "Drones capture aerial imagery over prospecting permits; transit corridors incidentally capture residential property boundaries.",
    purpose: "To produce ortho-rectified mosaics for exploration geologists.",
    data_categories: ["Location data", "Other"],
    data_subjects: "Residents of properties along survey transit corridors.",
    volume_frequency: "4–6 campaigns per year.",
    retention_period: "Raw frames 30 days; blurred mosaics for the permit life.",
    existing_safeguards: ["Data minimisation", "Anonymisation"],
    jurisdictions: ["EU (GDPR)"],
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    article_9_condition: "",
    necessity_proportionality: "Blurring plus 30-day deletion is the least-intrusive means.",
    controller_sector: "private",
    controller_country: "DE",
    reasons_to_conduct: ["systematic_monitoring"],
    ...over,
  };
}

function render(over: Bag = {}) {
  const i = intake(over);
  const { document } = assembleDpiaSkeletonDocument(buildDpiaDeliverables(i) as unknown as Bag, i);
  return { document, text: skeletonDocumentToText(document) };
}

const ART9_INTRO_HEAD = "Article 9. Where special categories of personal data are processed";

// ── P5 ───────────────────────────────────────────────────────────────────────

Deno.test("doc188 P5 — the special-category table is a conditional-intro surface beside the design table", () => {
  assertEquals([...CONDITIONAL_INTRO_TABLE_SURFACES], ["risk_register.design", "section2_coverage.special_category_conditions"]);
  // The spine itself still carries the intro block (bytes untouched).
  const s2 = DPIA_SKELETON_SECTIONS.find((s) => s.id === "section_2_analysis")!;
  assert(s2.blocks.some((b) => b.kind === "skeleton" && b.text.startsWith(ART9_INTRO_HEAD)));
});

Deno.test("doc188 P5 — the Article 9 framing paragraph is dropped on a record with no special-category data", () => {
  const { document, text } = render();
  assert(!text.includes(ART9_INTRO_HEAD), "the intro rendered with nothing under it");
  const s2 = document.sections.find((s) => s.id === "section_2_analysis")!;
  assert(!s2.paragraphs.some((p) => p.table?.surface === "section2_coverage.special_category_conditions"));
});

Deno.test("doc188 P5 — the Article 9 framing paragraph renders when the special-category table renders", () => {
  // The form's own labels (dpia-section2-coverage.test.ts uses the same pair).
  const { document, text } = render({
    data_categories: ["Health or medical data", "Location data"],
    article_9_condition: "Health or social care (Art. 9(2)(h))",
  });
  const s2 = document.sections.find((s) => s.id === "section_2_analysis")!;
  const tableIdx = s2.paragraphs.findIndex((p) => p.table?.surface === "section2_coverage.special_category_conditions");
  assert(tableIdx > 0, "the special-category table must render for a special-category record");
  assertStringIncludes(text, ART9_INTRO_HEAD);
  assert(String(s2.paragraphs[tableIdx - 1].text ?? "").startsWith(ART9_INTRO_HEAD), "the intro immediately precedes its table");
});

// ── P6 ───────────────────────────────────────────────────────────────────────

Deno.test("doc188 P6 — readDpiaRegimeScope reads EU-only, UK-only and both from the record", () => {
  assertEquals(readDpiaRegimeScope({ jurisdictions: ["EU (GDPR)"] }), "EU");
  assertEquals(readDpiaRegimeScope({ jurisdictions: ["United Kingdom (UK GDPR)"] }), "UK");
  assertEquals(readDpiaRegimeScope({ jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"] }), "EU+UK");
  assertEquals(readDpiaRegimeScope({ jurisdictions: ["United States"] }), "EU", "the readDpiaRegime default");
  assertEquals(readDpiaRegimeScope({}), "EU");
});

Deno.test("doc188 P6 — the executive opener names the record's own instrument", () => {
  const eu = render().text;
  assertStringIncludes(eu, "Article 35(1) of the General Data Protection Regulation (“GDPR”) requires a data protection impact assessment");
  assert(!eu.includes("for the EU and UK"), "an EU-only record must not name the UK");

  const uk = render({ jurisdictions: ["United Kingdom (UK GDPR)"], controller_country: "GB", controller_land: "" }).text;
  assertStringIncludes(uk, "Article 35(1) of the UK General Data Protection Regulation (“UK GDPR”) requires");

  const both = render({ jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"] }).text;
  assertStringIncludes(both, "Article 35(1) of the General Data Protection Regulation for the EU and UK (“GDPR”) requires");
});

Deno.test("doc188 P6 — v4.10: the slot is declared, mapped and versioned", () => {
  assertEquals(DPIA_SKELETON_VERSION, "dpia-v4.10-2026-09-05");
  const exec = DPIA_SKELETON_SECTIONS.find((s) => s.id === "executive_summary")!;
  assert(exec.blocks.some((b) => b.kind === "skeleton" && b.text.includes("{gdprInstrument")));
  assert(!exec.blocks.some((b) => b.text.includes("for the EU and UK")), "the literal left the spine");
  assert(DPIA_SLOT_MAP.some((b) => b.slot === "gdprInstrument" && b.source === "jurisdictions"));
  assertEquals(Object.keys(DPIA_GDPR_INSTRUMENT_BY_SCOPE).sort(), ["EU", "EU+UK", "UK"]);
  assertEquals(DPIA_GDPR_INSTRUMENT_BY_SCOPE["EU+UK"], "General Data Protection Regulation for the EU and UK (“GDPR”)");
});
