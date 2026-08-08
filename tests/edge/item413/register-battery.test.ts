// ITEM 413 — THE REGISTRATION REGISTER BATTERY (RG-1..RG-4) + R11.
//
// The work list came from the render walk of quality_run_documents
// ad4d1532-3d87-4386-8636-2dc94237c353. Each defect below is asserted twice:
// once as a unit repair, and once over a document assembled through the real
// engine + deliverables builder + finalize battery.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyRegistrationProseGold,
  detectHollowFacts,
  isProtectedRegistrationKey,
  REGISTRATION_PIPELINE_STAMP,
  repairApparatusOpener,
  repairGlyphJoiner,
  repairLabelColonLitany,
} from "../../../supabase/functions/_shared/ltp/registration-prose-gold.ts";
import { assembleRegistrationReport, PERFECT_INTAKE } from "./_assemble.ts";

// ── RG-1 ────────────────────────────────────────────────────────────────────

Deno.test("RG-1 — the bullet-glyph joiner becomes a sentence stop", () => {
  const before = "Offers goods/services to residents of UK • UK GDPR applies; ICO annual data-protection fee required";
  const after = repairGlyphJoiner(before);
  assert(!after.includes("•"), after);
  assertEquals(
    after,
    "Offers goods/services to residents of UK. UK GDPR applies; ICO annual data-protection fee required.",
  );
});

// ── RG-2 ────────────────────────────────────────────────────────────────────

Deno.test("RG-2 — the field-label litany becomes prose and loses no value", () => {
  const before = "Establishment in EU: yes Markets served include EU: not stated. Public authority: no";
  const after = repairLabelColonLitany(before);
  assert(!/: (yes|no|not stated)/.test(after), after);
  assert(after.toLowerCase().includes("establishment in eu"), after);
  assert(after.toLowerCase().includes("public authority"), after);
});

// ── RG-3 ────────────────────────────────────────────────────────────────────

Deno.test("RG-3 — the hollow fact is detected", () => {
  assertEquals(detectHollowFacts("The record does not state this.").length, 1);
  assertEquals(detectHollowFacts("The record does not state whether the entity sells personal data.").length, 0);
});

// ── RG-4 ────────────────────────────────────────────────────────────────────

Deno.test("RG-4 — the apparatus-first opener is repaired", () => {
  const after = repairApparatusOpener("This assessment examines whether Acme carries a duty.");
  assert(!after.startsWith("This assessment examines"), after);
});

// ── PROTECTED LEAVES ────────────────────────────────────────────────────────

Deno.test("determination machinery and corpus bytes are protected", () => {
  for (const k of ["verdict", "status", "citation", "standard", "rule_id", "code", "corpus_key", "met"]) {
    assert(isProtectedRegistrationKey(k), `${k} must be protected`);
  }
  const { report } = applyRegistrationProseGold({
    verdict: "registrable",
    rule_id: "R3_MARKET",
    standard: "\"Data broker\" means a business that knowingly collects and sells to third parties…",
    reasoning: "A • B",
  });
  assertEquals(report.verdict, "registrable");
  assertEquals(report.rule_id, "R3_MARKET");
  assertEquals(report.reasoning, "A. B.");
});

// ── OVER A FULLY ASSEMBLED DOCUMENT ─────────────────────────────────────────

Deno.test("assembled document carries no bullet-glyph joiners", () => {
  const { report } = assembleRegistrationReport(PERFECT_INTAKE);
  const dump = JSON.stringify(report);
  assert(!dump.includes("•"), "bullet-glyph joiner survived assembly");
});

Deno.test("assembled document carries no hollow facts", () => {
  const { report } = assembleRegistrationReport(PERFECT_INTAKE);
  assert(
    !JSON.stringify(report).includes("The record does not state this."),
    "hollow fact survived assembly",
  );
  const { report: degraded } = assembleRegistrationReport({ markets_served: ["US-CA"] });
  assert(
    !JSON.stringify(degraded).includes("The record does not state this."),
    "hollow fact survived assembly on a degraded record",
  );
});

Deno.test("assembled document carries no field-label litanies", () => {
  const { report } = assembleRegistrationReport(PERFECT_INTAKE);
  const dump = JSON.stringify(report);
  assert(!/: (yes|no|not stated) /.test(dump), "field-label litany survived assembly");
});

Deno.test("the overview opens with the verdict, not the method", () => {
  const { report } = assembleRegistrationReport(PERFECT_INTAKE);
  const overview = String(
    (report.narrative as Record<string, unknown> | undefined)?.overview ?? "",
  );
  assert(overview.length > 0, "no overview emitted");
  assert(
    !overview.startsWith("This assessment examines whether"),
    `apparatus-first opener survived: ${overview.slice(0, 120)}`,
  );
  assert(
    /is registrable|is not registrable|position is conditional|cannot be settled/.test(
      overview.slice(0, 240),
    ),
    `overview does not open with a verdict: ${overview.slice(0, 240)}`,
  );
});

Deno.test("internal rule tokens never reach a prose surface", () => {
  const { report } = assembleRegistrationReport(PERFECT_INTAKE);
  const offenders: string[] = [];
  const walk = (v: unknown, key: string, path: string): void => {
    if (typeof v === "string") {
      if (key === "rule_id" || key === "rule_ids" || key === "rules_fired") return;
      if (/\bR\d+_[A-Z_]{3,}\b/.test(v)) offenders.push(`${path}: ${v.slice(0, 80)}`);
      return;
    }
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, key, `${path}[${i}]`));
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, k, `${path}.${k}`);
    }
  };
  walk(report, "", "$");
  assertEquals(offenders.length, 0, offenders.join("\n"));
});

Deno.test("R11 assembled-prose lint reports no findings on a perfect record", () => {
  // Advisory findings are the lint's own conservative class (rule 5 flags any
  // capitalised citation-led clause, which a `label` field legitimately is);
  // the operative assertion is that no NON-advisory finding survives assembly.
  const { report, lint } = assembleRegistrationReport(PERFECT_INTAKE);
  // `narrative.determination` is a MULTI-PARAGRAPH composite: Article 3(2)
  // legitimately recurs once in the EU-representative paragraph and once in
  // the UK one. The lint reads the field as a single paragraph, so its
  // duplicate-pinpoint hit on that field is re-checked per paragraph below and
  // excluded here only when no single paragraph repeats a pinpoint.
  const determination = String(
    (report.narrative as Record<string, unknown> | undefined)?.determination ?? "",
  );
  const PIN = /(?:\d+\s*CCR\s*)?§+\s*\d[\d.]*(?:\([a-z0-9]+\))*|Art(?:icle|\.)\s*\d+(?:\(\d+\))*(?:\([a-z]\))?/gi;
  for (const para of determination.split(/\n\n+/)) {
    const pins = (para.match(PIN) ?? [])
      .map((x) => x.replace(/\s+/g, " ").trim().toLowerCase())
      .filter((x) => x.includes("("));
    assertEquals(new Set(pins).size, pins.length, `pinpoint repeated in one paragraph: ${pins.join(" | ")}`);
  }
  const operative = (lint?.findings ?? []).filter(
    (f) => !f.advisory && !(f.rule === "duplicate_pinpoint" && f.path.endsWith("narrative.determination")),
  );
  assertEquals(operative.length, 0, JSON.stringify(operative, null, 2));
});

Deno.test("the pipeline stamp is written at the finalize seam", () => {
  const { report } = assembleRegistrationReport(PERFECT_INTAKE);
  const meta = report._meta as Record<string, unknown>;
  const internal = meta.internal as Record<string, unknown>;
  assertEquals(internal.registration_pipeline_stamp, REGISTRATION_PIPELINE_STAMP);
  assertEquals(REGISTRATION_PIPELINE_STAMP, "registration-pipeline@item413-2026-08-08");
});
