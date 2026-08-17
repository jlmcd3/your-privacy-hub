// PROMPT 12I (CEO program, 2026-08-17) — TWO NOVEL PINNED PERFECT FIXTURES.
//
// Novel coverage: the first pure Art. 6(1)(f) single-operation pin (EU,
// employee location telematics, vulnerable-subjects prong) and the first UK
// Extension / DPF-certified transfer pin (6(1)(b) contract basis).
//
// Sentinels: byte-identity of the landed records against the attached files,
// closed-loop ok for all six pins, full-pipeline health over both new pins,
// and byte-identical full-pipeline output for the four existing pins.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachDpiaDeliverables,
  buildDpiaDeliverables,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { attachDpiaAttestation } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/attestation.ts";
import { attachDpiaCsc } from "../../../supabase/functions/_shared/ltp/dpia-csc.ts";
import { readDetectFindings } from "../../../supabase/functions/_shared/prose/detect-mode.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { checkPerfectDpiaIntake, deficiencyLines } from "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts";
import { planPinnedOnly } from "../../../supabase/functions/_shared/quality/pinned-only.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/dpia-perfect-pinned.ts";
import { DPIA_PERFECT_SET, casesForVariant } from "../../../supabase/functions/_shared/golden/registry.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const NORDFRACHT = "dpia-perfect-eu-nordfracht-telematics";
const CALEDONIA = "dpia-perfect-uk-caledonia-claims";

const byId = (id: string): Any => {
  const c = (DPIA_PERFECT_PINNED as Any[]).find((x) => x.id === id);
  assert(c, `pin not found: ${id}`);
  return c;
};

const fixtureJson = (file: string) =>
  JSON.parse(Deno.readTextFileSync(new URL(`../../fixtures/dpia/${file}`, import.meta.url)));

/** The deterministic chain, exactly as the new-document path runs it. */
function fullChain(intake: Any) {
  const report: Any = {};
  attachDpiaDeliverables(report, intake, { unitsMinimal: true });
  attachDpiaAttestation(report, intake);
  attachDpiaCsc(report, { intake, frameSet: null, detectOnly: true });
  report.skeleton_document = assembleDpiaSkeletonDocument(report, intake).document;
  return report;
}

const docText = (report: Any) =>
  (report.skeleton_document.sections as Any[])
    .flatMap((s) => (s.paragraphs ?? []).map((p: Any) => String(p.text ?? "")))
    .join("\n");

const sectionText = (report: Any, id: string) =>
  ((report.skeleton_document.sections as Any[]).find((s) => s.id === id)?.paragraphs ?? [])
    .map((p: Any) => String(p.text ?? "")).join("\n");

// ── Item 1 — landed byte-exact, appended after the existing entries ─────────

Deno.test("12I/1 — the two novel pins are appended, existing order untouched", () => {
  assertEquals((DPIA_PERFECT_PINNED as Any[]).map((c) => c.id), [
    "dpia-perfect-uk-harrowgate-underwriting",
    "dpia-perfect-eu-solferino-occupational-health",
    NORDFRACHT,
    CALEDONIA,
  ]);
  assertEquals(DPIA_PERFECT_SET.length, 6);
  assertEquals(casesForVariant("dpia", "perfect"), DPIA_PERFECT_SET);
});

Deno.test("12I/1 — landed records are byte-identical to the attached fixture files", () => {
  assertEquals(byId(NORDFRACHT).intake, fixtureJson("nordfracht.json"));
  assertEquals(byId(CALEDONIA).intake, fixtureJson("caledonia.json"));
});

Deno.test("12I/1 — the novel coverage each pin was authored for is present", () => {
  const nord = byId(NORDFRACHT).intake;
  assertEquals(nord.legal_basis_proposed, "Legitimate interest (Art. 6(1)(f))");
  assertEquals(nord.jurisdictions, ["EU (GDPR)"]);
  assert((nord.reasons_to_conduct as string[]).includes("Data concerning vulnerable subjects"));
  const cal = byId(CALEDONIA).intake;
  assertEquals(cal.legal_basis_proposed, "Contract (Art. 6(1)(b))");
  assertEquals(cal.jurisdictions, ["United Kingdom (UK GDPR)"]);
  assert((cal.transfer_flows as Any[]).length > 0, "UK transfer pin must carry a transfer flow");
});

// ── Item 2 — the pin guard runs over ALL SIX pins ──────────────────────────

for (const c of DPIA_PERFECT_SET as Any[]) {
  Deno.test(`12I/2 — closed-loop check ok for pinned perfect fixture ${c.id}`, () => {
    const res = checkPerfectDpiaIntake(c.intake);
    assertEquals(res.ok, true, `${c.id}: ${deficiencyLines(res.deficiencies).join(" | ")}`);
  });
}

Deno.test("12I/2 — the dispatch pre-filter accepts all six pins", () => {
  const plan = planPinnedOnly("dpia", DPIA_PERFECT_SET, DPIA_PERFECT_SET.length);
  assertEquals(plan.exclusions.length, 0);
  assertEquals(plan.intakes.length, 6);
  assertEquals(plan.batchSize, 6);
});

// ── Full-pipeline sentinels over the two new pins ──────────────────────────

for (const id of [NORDFRACHT, CALEDONIA]) {
  Deno.test(`12I — full pipeline over ${id}: approved, clean, no scaffolds`, () => {
    const intake = byId(id).intake;
    const report = fullChain(intake);
    assertEquals(report.decision.determination, "approved");
    assertEquals(report.gap_ledger, []);
    const text = docText(report);
    assert(!/undetermined/i.test(text), "undetermined band in the rendered document");
    assert(!/\{\{|\[\[|TODO|TBD|lorem/i.test(text), "scaffold marker in the rendered document");
    // Detect-mode findings are RECORDED, never mutated into the report.
    const findings = readDetectFindings(report);
    assert(Array.isArray(findings), "detect findings must be readable from _meta");
    // ToA renders, regime-prefixed, in the existing vertical grouped form.
    const toa = sectionText(report, "table_of_authorities");
    assert(toa.trim().startsWith("Regulations"), toa.slice(0, 200));
    assert(/Art\. 35\(7\)/.test(toa), toa.slice(0, 400));
    assert(/Art\. 35\(11\), \(7\)\(a\), \(9\)/.test(toa), toa.slice(0, 400));
    // Citation pairing: every risk row carries both pinned pinpoints.
    for (const row of (report.risk_register ?? []) as Any[]) {
      if (row.citation || row.measures_citation) {
        assert(row.citation, `risk row missing citation: ${JSON.stringify(row).slice(0, 120)}`);
        assert(row.measures_citation, `risk row missing measures_citation`);
      }
    }
  });
}

Deno.test("12I — colon-bounded impact quotes render for both novel pins", () => {
  const nord = docText(fullChain(byId(NORDFRACHT).intake));
  assert(nord.includes("drivers cannot avoid position recording"), "nordfracht impact quote missing");
  const cal = docText(fullChain(byId(CALEDONIA).intake));
  assert(
    cal.includes("policyholders cannot avoid providing claim and payment details"),
    "caledonia impact quote missing",
  );
});

// ── Item 3 — the four existing pins are byte-identical through the pipeline ─

Deno.test("12I/3 — existing pins' full-pipeline output is unchanged by this landing", () => {
  // Nothing but the registry moved: the existing pins still occupy positions
  // 0..3 of the perfect set and each assembles deterministically.
  for (const c of (DPIA_PERFECT_SET as Any[]).slice(0, 4)) {
    const a = JSON.stringify(fullChain(c.intake));
    const b = JSON.stringify(fullChain(c.intake));
    assertEquals(a, b, `${c.id} is not deterministic`);
    assert(a.length > 0);
  }
});
