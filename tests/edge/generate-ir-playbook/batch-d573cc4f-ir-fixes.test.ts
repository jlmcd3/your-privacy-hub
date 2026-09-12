// BATCH d573cc4f (2026-09-12) — ChatGPT's "Report Prose Review v6" plus
// Claude's independent code check agreed on three real IR Playbook defects.
//
// IR6-01 — the fallback note for a jurisdiction this playbook does not cover
// read as if it might be assuring the reader no notification duty exists
// ("no clock is stated for it and its position remains for separate
// advice"), rather than clearly flagging that the absence is a coverage gap,
// not a legal conclusion.
//
// IR6-02 — buildSaNotificationDetermination() computes a lead-authority note
// and appends it to `sa.application` (a field SEPARATE from `sa.why`), but
// the renderer (composeNotificationAnalysis) only ever read `sa.why` —
// structurally unreachable in the customer document. Same defect class as
// the previously-fixed parallel Art. 34 (`ds.application`) issue.
//
// IR6-05 — Florida's five data-element intake types (SSN/gov-ID, financial,
// health, biometric, location) used to share ONE combined element_limbs
// entry whose text was the FULL disjunctive statutory list; any single
// recorded type triggered printing of all five as if matched. Split into
// five limbs, reusing only pre-existing verbatim statutory phrases.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachIrPlaybookDeliverables, buildSaNotificationDetermination } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument, UNCOVERED_JURISDICTION_NOTE } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

function baseIntake(over: Bag = {}): Bag {
  return {
    organizationName: "Velorix Digital Services Ltd",
    organisationType: "SaaS platform",
    discoveryDateTime: "2026-09-01T10:00",
    cause: "Ransomware or malware",
    dataTypes: ["Passwords / credentials"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["EU/EEA", "United Kingdom"],
    contained: "Yes",
    ...over,
  };
}

function fullText(over: Bag = {}): string {
  const intake = baseIntake(over);
  const report: Bag = {};
  attachIrPlaybookDeliverables(report, intake);
  return skeletonDocumentToText(assembleIRSkeletonDocument(report, intake).document);
}

// ── IR6-01 ───────────────────────────────────────────────────────────────

Deno.test("IR6-01 — the uncovered-jurisdiction note flags a coverage gap, not a legal conclusion", () => {
  assertStringIncludes(UNCOVERED_JURISDICTION_NOTE, "coverage does not extend to this jurisdiction");
  assertStringIncludes(UNCOVERED_JURISDICTION_NOTE, "Do not treat that as an assurance that no notification duty exists");
  // The pinned "separate advice" substring survives the reword.
  assertStringIncludes(UNCOVERED_JURISDICTION_NOTE, "separate advice");
});

// ── IR6-02 ───────────────────────────────────────────────────────────────

Deno.test("IR6-02 — the EU lead-authority note is now reachable in the rendered notification analysis", () => {
  const text = fullText({ jurisdictions: ["Germany"] });
  // buildSaNotificationDetermination's leadAuthorityNote() text for a
  // named-member-state record names the lead supervisory authority rule.
  assertStringIncludes(text, "lead supervisory authority for cross-border processing");
  assertStringIncludes(text, "The recorded EU jurisdictions are Germany.");
});

Deno.test("IR6-02 — buildSaNotificationDetermination's computed application field carries the lead-authority note (source of truth)", () => {
  const sa = buildSaNotificationDetermination(baseIntake({ jurisdictions: ["Germany"] }), "eu") as unknown as Bag;
  assertStringIncludes(String(sa.application), "lead supervisory authority for cross-border processing");
});

// ── IR6-05 ───────────────────────────────────────────────────────────────

Deno.test("IR6-05 — Florida: a record naming only Financial data does not print the other four elements' language", () => {
  const text = fullText({ jurisdictions: ["Florida"], dataTypes: ["Financial / payment data"] });
  assertStringIncludes(text, "a financial account or card number together with any required security code");
  assertStringIncludes(text, "§ 501.171(1)(g)1.a");
  assert(!text.includes("a social security number"), "SSN language must not appear when SSN was not recorded");
  assert(!text.includes("medical history or treatment information"), "medical language must not appear when health data was not recorded");
  assert(!text.includes("biometric data (§ 501.171"), "biometric language must not appear when biometric data was not recorded");
  assert(!text.includes("geolocation information"), "location language must not appear when location data was not recorded");
});

Deno.test("IR6-05 — Florida: a record naming only Biometric data prints only the biometric limb", () => {
  const text = fullText({ jurisdictions: ["Florida"], dataTypes: ["Biometric data"] });
  assertStringIncludes(text, "biometric data (§ 501.171(1)(g)1.a)");
  assert(!text.includes("a financial account or card number"), "financial language must not appear when financial data was not recorded");
  assert(!text.includes("a social security number"), "SSN language must not appear when SSN was not recorded");
});

Deno.test("IR6-05 — Florida: the old combined disjunctive limb text no longer appears anywhere", () => {
  const text = fullText({ jurisdictions: ["Florida"], dataTypes: ["Government IDs / SSN"] });
  assert(
    !text.includes(
      "a social security number; a government-issued identification number; a financial account or card number together with any required security code; medical history or treatment information; a health insurance policy number; biometric data; or geolocation information",
    ),
    "the retired combined disjunctive limb string must not render",
  );
});

Deno.test("IR6-05 — Florida: recording all five element types still renders every one of them (no regression)", () => {
  const text = fullText({
    jurisdictions: ["Florida"],
    dataTypes: [
      "Government IDs / SSN", "Financial / payment data", "Health / medical records",
      "Biometric data", "Location data",
    ],
  });
  assertStringIncludes(text, "a social security number; or a government-issued identification number");
  assertStringIncludes(text, "a financial account or card number together with any required security code");
  assertStringIncludes(text, "medical history or treatment information; or a health insurance policy number");
  assertStringIncludes(text, "biometric data (§ 501.171(1)(g)1.a)");
  assertStringIncludes(text, "geolocation information (§ 501.171(1)(g)1.a)");
});
