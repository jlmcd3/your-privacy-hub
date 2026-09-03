// DOC 160 (2026-09-03) — DPIA model-vs-law build: the deterministic path
// (attachDpiaDeliverables → assembleDpiaSkeletonDocument) read against GDPR /
// UK GDPR Arts. 35–36 and Art. 6(1) (verbatim from gdpr_articles), with the
// seven audits of doc 154 Part A. One test per designed state the build
// introduced; each names the provision it applies.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DPIA_IMAGERY_CAPTURE,
  DPIA_IMAGERY_SPACES,
  dpiaFrameworkContract,
} from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { IMAGERY_CAPTURE, IMAGERY_SPACES } from "../../../src/pages/DPIAFramework.enums.ts";
import { FIELD_ENUM_MIRROR } from "../../../supabase/functions/_shared/field-enums.ts";
import { FIELD_LABELS } from "../../../supabase/functions/_shared/customer-messages.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/dpia.ts";
import { emptyAskedKeys } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import {
  attachDpiaDeliverables,
  namesGdprJurisdiction,
  readDpiaRegime,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import {
  ART36_DPO_DISCLOSURE,
  ART36_DPO_DISCLOSURE_UK,
  DPIA_NON_GDPR_JURISDICTION_SENTENCE,
  assembleDpiaSkeletonDocument,
  supervisoryAuthorityNoun,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { DPIA_RAIL } from "../../../src/components/dpia/DPIARailEntries.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));

const EU = () => clone(DPIA_PERFECT.find((g) => g.id === "dpia-perfect-eu-complete")!.intake);
const UK = () => clone(DPIA_PERFECT.find((g) => g.id.startsWith("dpia-perfect-uk"))!.intake);

function render(intake: Bag): { text: string; report: Bag; doc: ReturnType<typeof assembleDpiaSkeletonDocument> } {
  const report: Bag = {};
  attachDpiaDeliverables(report, intake, { unitsMinimal: true });
  const doc = assembleDpiaSkeletonDocument(report, intake);
  return { text: skeletonDocumentToText(doc.document), report, doc };
}

/** Force the Art. 36(1) consultation_required state onto a rendered report. */
function forceConsultation(report: Bag): void {
  report.art36_consultation = {
    ...(report.art36_consultation as Bag),
    determination: "consultation_required",
    status: "determined",
  };
  report.decision = { ...(report.decision as Bag), determination: "consultation_required" };
}

// ── R2: UK GDPR Art. 36(1) names "the Commissioner" ─────────────────────────

Deno.test("doc160 — one resolver for the regime's authority noun", () => {
  assertEquals(supervisoryAuthorityNoun("EU"), "the supervisory authority");
  assertEquals(supervisoryAuthorityNoun("EU", "competent"), "the competent supervisory authority");
  assertEquals(supervisoryAuthorityNoun("UK"), "the Commissioner");
  assertEquals(supervisoryAuthorityNoun("UK", "competent"), "the Commissioner");
});

Deno.test("doc160 — a UK record's Art. 36 sentence, sign-off lead and decision table name the Commissioner", () => {
  const uk = UK();
  assertEquals(readDpiaRegime(uk), "UK");
  const { text } = render(uk);
  assert(!/supervisory authority under Article 36\(1\)/.test(text), "EU noun in the UK Art. 36 sentence");
  assertStringIncludes(text, "prior consultation with the Commissioner under Article 36(1)");

  // Forced consultation_required: lead, table label and warning seam.
  const report: Bag = {};
  attachDpiaDeliverables(report, uk, { unitsMinimal: true });
  forceConsultation(report);
  const forced = skeletonDocumentToText(assembleDpiaSkeletonDocument(report, uk).document);
  assertStringIncludes(forced, "prior consultation with the Commissioner before the processing begins");
  assertStringIncludes(forced, "Prior consultation with the Commissioner required");
  assert(!forced.includes("Prior consultation with the supervisory authority required"), forced.slice(0, 400));
});

Deno.test("doc160 — an EU record keeps the ratified EU bytes", () => {
  const { text } = render(EU());
  assertStringIncludes(text, "prior consultation with the supervisory authority under Article 36(1) is not required");
  assert(!text.includes("the Commissioner"));
});

Deno.test("doc160 — the DPO-advice disclosure has a UK twin with the same bytes otherwise", () => {
  assertEquals(ART36_DPO_DISCLOSURE_UK, ART36_DPO_DISCLOSURE.replace("the supervisory authority", "the Commissioner"));
  const uk = UK();
  const report: Bag = {};
  attachDpiaDeliverables(report, uk, { unitsMinimal: true });
  report.art36_consultation = { ...(report.art36_consultation as Bag), dpo_recommends_consultation: true };
  const text = skeletonDocumentToText(assembleDpiaSkeletonDocument(report, uk).document);
  assertStringIncludes(text, "has advised that the Commissioner be consulted");
  assert(!text.includes("has advised that the supervisory authority be consulted"));
});

// ── R2: Appendix A and the gap ledger carry the regime prefix ───────────────

Deno.test("doc160 — a UK record's Appendix A and information-required citations read UK GDPR throughout", () => {
  const { text } = render(UK());
  const appendix = text.slice(text.indexOf("Appendix A"));
  assert(appendix.length > 100, "Appendix A not found");
  assert(!/\| GDPR Art/.test(appendix), "bare GDPR prefix left in a UK Appendix A row");
  assert(/\| UK GDPR Art\. 36\(1\)–\(3\)/.test(appendix), "prior-consultation row lacks the UK prefix");
  assert(!/\bGDPR Arts\. 24, 28/.test(appendix) || /UK GDPR Arts\. 24, 28/.test(appendix));
  // No row is double-prefixed.
  assert(!text.includes("UK UK GDPR"));
});

Deno.test("doc160 — an EU record's Appendix A keeps the GDPR prefix", () => {
  const { text } = render(EU());
  const appendix = text.slice(text.indexOf("Appendix A"));
  assert(/\| GDPR Art\. 36\(1\)–\(3\)/.test(appendix));
  assert(!appendix.includes("UK GDPR"));
});

// ── R3: the warning seam ────────────────────────────────────────────────────

Deno.test("doc160 — the consultation warning no longer doubles the stop at the spine seam", () => {
  const eu = EU();
  const report: Bag = {};
  attachDpiaDeliverables(report, eu, { unitsMinimal: true });
  forceConsultation(report);
  const text = skeletonDocumentToText(assembleDpiaSkeletonDocument(report, eu).document);
  assertStringIncludes(text, "Article 36(1)");
  assert(!text.includes(".."), `double stop present: ${text.match(/.{60}\.\..{20}/)?.[0]}`);
});

// ── R4: the regime-basis sentence ───────────────────────────────────────────

Deno.test("doc160 — a record naming no EU/EEA or UK jurisdiction states the GDPR default once, first", () => {
  const intake = EU();
  intake.jurisdictions = ["United States — Federal", "California (CCPA/CPRA)"];
  assertEquals(namesGdprJurisdiction(intake), false);
  assertEquals(readDpiaRegime(intake), "EU");
  const { text } = render(intake);
  const first = text.indexOf(DPIA_NON_GDPR_JURISDICTION_SENTENCE);
  assert(first >= 0, "basis sentence missing");
  assertEquals(text.indexOf(DPIA_NON_GDPR_JURISDICTION_SENTENCE, first + 1), -1, "basis sentence repeated");
  assert(first < text.indexOf("Section 1"), "basis sentence must open the executive summary");
});

Deno.test("doc160 — the regime-basis sentence never fires for EU, UK, or a blank jurisdictions answer", () => {
  assert(namesGdprJurisdiction(EU()));
  assert(namesGdprJurisdiction(UK()));
  assert(!render(EU()).text.includes(DPIA_NON_GDPR_JURISDICTION_SENTENCE));
  assert(!render(UK()).text.includes(DPIA_NON_GDPR_JURISDICTION_SENTENCE));
  const blank = EU();
  blank.jurisdictions = [];
  assert(!render(blank).text.includes(DPIA_NON_GDPR_JURISDICTION_SENTENCE));
});

// ── R5: Art. 6(1)(d) is a scenario, not a data category ─────────────────────

function basisFinding(intake: Bag): Bag {
  const report: Bag = {};
  attachDpiaDeliverables(report, intake, { unitsMinimal: true });
  const rows = report.legal_basis as Bag[];
  const row = rows.find((r) => String(r.basis_sub ?? r.subsection ?? r.basis ?? "").includes("6(1)(d)")) ?? rows[0];
  return row;
}

Deno.test("doc160 — Art. 6(1)(d) with health data but no life or safety circumstance is undetermined", () => {
  const intake = EU();
  intake.legal_basis_proposed = "Vital interests (Art. 6(1)(d))";
  if (!(intake.data_categories as string[]).includes("Health or medical data")) {
    (intake.data_categories as string[]).push("Health or medical data");
    intake.article_9_condition = "Explicit consent (Art. 9(2)(a))";
  }
  const row = basisFinding(intake);
  const blob = JSON.stringify(row);
  assert(!blob.includes("Basis supported"), blob);
  assertStringIncludes(blob, "does not by itself describe one");
  assert(!/on this record/i.test(blob), blob);
});

Deno.test("doc160 — Art. 6(1)(d) with a stated emergency circumstance is supported", () => {
  const intake = EU();
  intake.legal_basis_proposed = "Vital interests (Art. 6(1)(d))";
  intake.description = `${intake.description} Location data is used to dispatch help in a medical emergency when a lone worker triggers the alarm.`;
  const blob = JSON.stringify(basisFinding(intake));
  assertStringIncludes(blob, "life or safety scenario");
});

// ── R1: the imagery questions ───────────────────────────────────────────────

Deno.test("doc160 — form option mirrors equal the contract's imagery enums byte-for-byte", () => {
  assertEquals([...IMAGERY_CAPTURE], [...DPIA_IMAGERY_CAPTURE]);
  assertEquals([...IMAGERY_SPACES], [...DPIA_IMAGERY_SPACES]);
  assertEquals([...(FIELD_ENUM_MIRROR["dpia_framework:imagery_capture"] ?? [])], [...DPIA_IMAGERY_CAPTURE]);
  assertEquals([...(FIELD_ENUM_MIRROR["dpia_framework:imagery_capture_spaces"] ?? [])], [...DPIA_IMAGERY_SPACES]);
});

Deno.test("doc160 — imagery_capture_spaces carries a VALUE-EQUALS trigger and is asked only when capture is reported", () => {
  const spec = dpiaFrameworkContract.fields.find((f) => f.key === "imagery_capture_spaces")!;
  assertEquals(spec.required, "conditional");
  assertEquals(spec.trigger?.key, "imagery_capture");
  assertEquals([...(spec.trigger?.equals ?? [])], [DPIA_IMAGERY_CAPTURE[1], DPIA_IMAGERY_CAPTURE[2]]);

  const none = EU();
  none.imagery_capture = DPIA_IMAGERY_CAPTURE[0];
  none.imagery_capture_spaces = "";
  assert(!emptyAskedKeys(dpiaFrameworkContract, none).includes("imagery_capture_spaces"));

  const subjects = EU();
  subjects.imagery_capture = DPIA_IMAGERY_CAPTURE[1];
  subjects.imagery_capture_spaces = "";
  assert(emptyAskedKeys(dpiaFrameworkContract, subjects).includes("imagery_capture_spaces"));
});

Deno.test("doc160 — subjects recorded with the spaces question open lists the answer among the information required", () => {
  const intake = EU();
  intake.imagery_capture = DPIA_IMAGERY_CAPTURE[1];
  intake.imagery_capture_spaces = "";
  const { report, text } = render(intake);
  const ledger = report.gap_ledger as Bag[];
  const entry = ledger.find((e) => e.field === "imagery_capture_spaces");
  assert(entry, "ledger entry missing");
  assertEquals(entry!.provision, "GDPR Art. 35(3)(c)");
  assertStringIncludes(text, "Article 35(3)(c)");
});

Deno.test("doc160 — the same open question on a UK record cites UK GDPR", () => {
  const intake = UK();
  intake.imagery_capture = DPIA_IMAGERY_CAPTURE[1];
  intake.imagery_capture_spaces = "";
  const { report } = render(intake);
  const entry = (report.gap_ledger as Bag[]).find((e) => e.field === "imagery_capture_spaces");
  assertEquals(entry?.provision, "UK GDPR Art. 35(3)(c)");
});

Deno.test("doc160 — rail entries and labels exist for the three imagery keys", () => {
  for (const k of ["imagery_capture", "imagery_capture_spaces", "imagery_capture_detail"]) {
    assert(DPIA_RAIL[k], `rail entry ${k}`);
    assertEquals(DPIA_RAIL[k].citation, "GDPR Art. 35(3)(c)");
    assert(FIELD_LABELS[k], `label ${k}`);
  }
});

// ── Instrument ──────────────────────────────────────────────────────────────

Deno.test("doc160 — grader instrument carries the DPIA law-map amendment", () => {
  assert(GRADER_CONTEXT_VERSION.includes("+dpia-law-map-2026-09-03"), GRADER_CONTEXT_VERSION);
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-2026-08-28-skeleton-cal-3-item204["), GRADER_CONTEXT_VERSION);
});

Deno.test("doc160 — every golden record still renders register-clean", () => {
  for (const g of DPIA_PERFECT) {
    const { doc, text } = render(clone(g.intake));
    assertEquals(doc.register_findings.length, 0, `${g.id}: ${JSON.stringify(doc.register_findings)}`);
    assert(!text.includes(".."), `${g.id}: double stop`);
    assert(!/\bon this record\b/i.test(text), `${g.id}: banned register`);
  }
});
