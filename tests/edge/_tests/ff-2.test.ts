// FF-2 T1/T3 unit tests — blacklist trigger + export done-marker.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { detectBlacklistPhrases, formatBlacklistRetrySuffix } from "../../../supabase/functions/_shared/blacklist-phrases.ts";

Deno.test("FF-2 T1: detects all five phrases in user-facing prose (case-insensitive)", () => {
  const doc = {
    executive_summary: "This finding provides Insufficient Basis on the record.",
    section_1: { prose: "The claim is NOT SUBSTANTIATED yet." },
    section_2: "The § 7120(b)(1) prong cannot be confirmed on the current record.",
    priority_actions: [{ text: "There is no basis to assess this determination." }],
    conclusion: "The record shows the controller is in the clear.",
  };
  const hits = detectBlacklistPhrases(doc);
  const matches = hits.map((h) => h.match.toLowerCase()).sort();
  assertEquals(matches, ["cannot be confirmed", "in the clear", "insufficient basis", "no basis to assess", "not substantiated"]);
});

Deno.test("FF-2 T1: ignores machine fields (lint_warnings, source_fields, signature chrome)", () => {
  const doc = {
    lint_warnings: [{ code: "x", context: "insufficient basis" }],
    information_needed: [{ field: "q1", source_fields: ["not substantiated"] }],
    _meta: { note: "cannot be confirmed" },
    enforcement_meta: { detail: "in the clear" },
    generated_at: "insufficient basis",
    executive_summary: "clean prose",
  };
  const hits = detectBlacklistPhrases(doc);
  assertEquals(hits.length, 0, `unexpected hits: ${JSON.stringify(hits)}`);
});

Deno.test("FF-2 T1: retry suffix quotes offending passages verbatim", () => {
  const doc = { executive_summary: "This provides insufficient basis on the record." };
  const hits = detectBlacklistPhrases(doc);
  const suffix = formatBlacklistRetrySuffix(hits);
  assert(suffix.includes("insufficient basis"));
  assert(suffix.includes("advocate-drafter voice"));
});

Deno.test("FF-2 T1: over-budget/still-hits path — caller emits blacklist_phrase_shipped lint", () => {
  // Simulate the caller pattern: after retry (or when skipped), residual hits
  // get pushed into lint_warnings as { code: 'blacklist_phrase_shipped', … }.
  const parsed: any = { executive_summary: "insufficient basis remains here.", lint_warnings: [] };
  const residual = detectBlacklistPhrases(parsed);
  for (const h of residual) {
    parsed.lint_warnings.push({ code: "blacklist_phrase_shipped", field: h.path, match: h.match, context: h.context });
  }
  assert(parsed.lint_warnings.some((w: any) => w.code === "blacklist_phrase_shipped" && w.match.toLowerCase() === "insufficient basis"));
});

// FF-2-HF1 — enum-value field exclusion.
Deno.test("FF-2-HF1: enum-value fields do NOT trigger detector", () => {
  const doc = {
    overall_risk_level: "Insufficient basis",
    exceptions_status: "Insufficient basis to assess",
    benefits_outweigh_risks_conclusion: "Insufficient basis",
    readiness_level: "Insufficient basis to assess",
    // nested / arrayed enum fields still excluded by leaf name.
    domains: [{ readiness_level: "Insufficient basis to assess" }],
    section: { overall_risk_level: "Insufficient basis" },
  };
  const hits = detectBlacklistPhrases(doc);
  assertEquals(hits.length, 0, `unexpected hits: ${JSON.stringify(hits)}`);
});

Deno.test("FF-2-HF1: same phrase in a prose field is still detected", () => {
  const doc = {
    overall_risk_level: "Insufficient basis", // excluded (enum)
    executive_summary: "This finding provides Insufficient Basis on the record.", // prose — detected
  };
  const hits = detectBlacklistPhrases(doc);
  assertEquals(hits.length, 1);
  assertEquals(hits[0].path, "executive_summary");
});


// FF-2 T3 — done-marker skip logic (pure predicate, mirrors sweep gate).
type LogRow = { message: string };
function shouldSkipForDoneMarker(logs: LogRow[]): boolean {
  return logs.some((r) => (r.message ?? "").startsWith("pdf_export_done"));
}

Deno.test("FF-2 T3: sweep skips batch when a pdf_export_done marker exists", () => {
  const logs = [{ message: "pdf_export_retry: attempt 1/3" }, { message: "pdf_export_done: abc inserted=5" }];
  assert(shouldSkipForDoneMarker(logs));
});

Deno.test("FF-2 T3: sweep does NOT skip when only retry rows exist (no done marker)", () => {
  const logs = [{ message: "pdf_export_retry: attempt 1/3" }];
  assert(!shouldSkipForDoneMarker(logs));
});
