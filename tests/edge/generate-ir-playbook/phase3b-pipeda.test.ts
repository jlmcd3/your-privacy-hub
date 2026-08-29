// PHASE 3b — PIPEDA'S BREACH-NOTIFICATION DUTIES (2026-08-29, doc 103,
// CEO-approved verbatim §3/§4). Every citation was verified fresh against
// the Justice Laws Website (laws.justice.gc.ca) during drafting. Before
// implementing, this session grepped the whole generate-ir-playbook
// directory for every existing pipeda/canada/quebec/alberta/ontario
// reference — applying the lesson the Phase 3a (HIPAA) mid-build catch
// taught proactively rather than reactively — and confirmed no live
// deterministic code (unlike HIPAA) already checks jurisdictions for
// Canada, so there was no stale placeholder to find and remove this time.
// Pins: the exact "Canada (PIPEDA)" gating (not "any Canadian
// jurisdiction"), the qualitative-trigger state-the-law design (no banded
// classifier, unlike HIPAA), the four duty rows, and the honest
// unverified-province fallback extending the existing "Other US State"
// pattern to Quebec/Alberta/British Columbia/Ontario.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildPipedaDuties, isPipedaJurisdiction } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/pipeda-duties.ts";
import { buildIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";

// ── Gating ────────────────────────────────────────────────────────────────

Deno.test("isPipedaJurisdiction — fires only on the exact 'Canada (PIPEDA)' value", () => {
  assert(isPipedaJurisdiction(["Canada (PIPEDA)"]));
  assert(!isPipedaJurisdiction(["Quebec (Law 25)"]));
  assert(!isPipedaJurisdiction(["Alberta (PIPA)"]));
  assert(!isPipedaJurisdiction([]));
  assert(!isPipedaJurisdiction(["California"]));
});

Deno.test("buildPipedaDuties — no rows at all when neither PIPEDA nor a recognized province is recorded", () => {
  const r = buildPipedaDuties(["California", "United Kingdom"]);
  assertEquals(r.length, 0);
});

// ── The four PIPEDA duties ───────────────────────────────────────────────

Deno.test("buildPipedaDuties — Canada (PIPEDA) produces exactly the four approved duty rows", () => {
  const r = buildPipedaDuties(["Canada (PIPEDA)"]);
  const labels = r.map((d) => d.state_label);
  assertEquals(labels, [
    "PIPEDA (Commissioner notice)",
    "PIPEDA (individual notice)",
    "PIPEDA (notice to other organizations)",
    "PIPEDA (record-keeping)",
  ]);
  for (const d of r) {
    assert(d.verified, `${d.state_label} must be verified`);
    assertEquals(d.jurisdiction, "Canada (PIPEDA)");
    assertStringIncludes(d.citation, "PIPEDA");
  }
});

Deno.test("buildPipedaDuties — Commissioner and individual notice both state the real-risk-of-significant-harm trigger and the as-soon-as-feasible timing, never a fixed day-count", () => {
  const r = buildPipedaDuties(["Canada (PIPEDA)"]);
  const commissioner = r.find((d) => d.state_label === "PIPEDA (Commissioner notice)")!;
  const individual = r.find((d) => d.state_label === "PIPEDA (individual notice)")!;
  for (const text of [commissioner.individual_deadline, individual.individual_deadline]) {
    // Grammatical role differs by row (verb phrase vs. compound adjective),
    // so the un-hyphenated and hyphenated forms are both correct — check
    // for either rather than one exact substring.
    assert(
      text.includes("real risk of significant harm") || text.includes("real-risk-of-significant-harm"),
      `must state the RROSH trigger in some form: "${text}"`,
    );
    assert(
      text.includes("as soon as feasible") || text.includes("as-soon-as-feasible"),
      `must state the "as soon as feasible" timing in some form: "${text}"`,
    );
    assert(!/\b\d+[\s-]*(day|hour)s?\b/i.test(text), `must never state a fixed deadline PIPEDA does not set on this record: "${text}"`);
  }
});

Deno.test("buildPipedaDuties — individual notice states the statutory 'significant harm' definition verbatim", () => {
  const r = buildPipedaDuties(["Canada (PIPEDA)"]);
  const individual = r.find((d) => d.state_label === "PIPEDA (individual notice)")!;
  for (const term of ["bodily harm", "humiliation", "identity theft", "damage to or loss of property"]) {
    assertStringIncludes(individual.individual_deadline, term);
  }
});

Deno.test("buildPipedaDuties — notice-to-other-organizations states its own dependency on the organisation's assessment, never resolved from the intake", () => {
  const r = buildPipedaDuties(["Canada (PIPEDA)"]);
  const otherOrg = r.find((d) => d.state_label === "PIPEDA (notice to other organizations)")!;
  assertStringIncludes(otherOrg.individual_deadline, "not resolved by the categories recorded on this intake");
  assertEquals(otherOrg.citation, "PIPEDA § 10.2");
});

Deno.test("buildPipedaDuties — record-keeping states the 24-month retention period, unconditional on notifiability", () => {
  const r = buildPipedaDuties(["Canada (PIPEDA)"]);
  const recordKeeping = r.find((d) => d.state_label === "PIPEDA (record-keeping)")!;
  assertStringIncludes(recordKeeping.individual_deadline, "24 months");
  assertStringIncludes(recordKeeping.individual_deadline, "regardless of whether it meets the real-risk-of-significant-harm notification threshold");
  assertEquals(recordKeeping.citation, "PIPEDA § 10.3, SOR/2018-64");
});

// ── The four Canadian provinces (Phase 3c, doc 103 continuation) — see
// phase3c-canadian-provinces.test.ts for the full per-province pin suite.
// These three stay here because they were written for Phase 3b's original
// honest-fallback design and are now updated to the Phase 3c real-duty-text
// behavior, keeping the file's own history legible.

Deno.test("buildPipedaDuties — each recognized Canadian province now carries real duty text, not the placeholder fallback", () => {
  const r = buildPipedaDuties(["Quebec (Law 25)"]);
  assertEquals(r.length, 1);
  assertEquals(r[0].verified, true);
  assertEquals(r[0].state_label, "Quebec");
  assertStringIncludes(r[0].individual_deadline, "Confirm the applicable thresholds and notice content with the CAI");
  assert(r[0].citation !== "[statutory reference to be confirmed]");
});

Deno.test("buildPipedaDuties — all four recognized provinces produce independent rows, deduplicated, alongside PIPEDA when both are recorded", () => {
  const r = buildPipedaDuties([
    "Canada (PIPEDA)",
    "Quebec (Law 25)",
    "Alberta (PIPA)",
    "British Columbia (PIPA)",
    "Ontario (PHIPA)",
    "Quebec (Law 25)", // duplicate on the intake — must not double-render
  ]);
  assertEquals(r.filter((d) => d.jurisdiction !== "Canada (PIPEDA)").map((d) => d.state_label).sort(), ["Alberta", "British Columbia", "Ontario", "Quebec"]);
  assertEquals(r.filter((d) => d.jurisdiction === "Canada (PIPEDA)").length, 4, "PIPEDA's own four rows still render alongside the provincial rows");
});

Deno.test("buildPipedaDuties — never invents a row for a province not in the recognized list", () => {
  const r = buildPipedaDuties(["Manitoba", "Saskatchewan"]);
  assertEquals(r.length, 0, "unrecognized Canadian jurisdictions get no row at all, never a guessed one");
});

// ── Integration: build.ts wiring ────────────────────────────────────────

Deno.test("buildIrPlaybookDeliverables — PIPEDA duties are appended to state_notification_duties, riding the same array as US-state and HIPAA rows", () => {
  const built = buildIrPlaybookDeliverables({
    organizationName: "Northern Retail Co-operative",
    discoveryDateTime: new Date(Date.now() - 86_400_000).toISOString(),
    cause: "Unauthorized external access / cyberattack",
    dataTypes: ["Names and contact details"],
    affectedCount: "1,000–10,000",
    jurisdictions: ["Canada (PIPEDA)", "Texas"],
    contained: "Yes",
    organisationType: "Company",
  });
  const jurisdictions = built.state_notification_duties.map((d) => d.jurisdiction);
  assertStringIncludes(jurisdictions.join("|"), "Texas");
  const pipedaCount = jurisdictions.filter((j) => j === "Canada (PIPEDA)").length;
  assertEquals(pipedaCount, 4);
});

Deno.test("buildIrPlaybookDeliverables — a record naming only a Canadian province (no PIPEDA, no healthcare signal) gets that province's own duty row and nothing else Canada-related", () => {
  const built = buildIrPlaybookDeliverables({
    organizationName: "Prairie Health Analytics",
    discoveryDateTime: new Date(Date.now() - 86_400_000).toISOString(),
    cause: "Accidental disclosure",
    dataTypes: ["Names and contact details"],
    affectedCount: "Fewer than 100",
    jurisdictions: ["Alberta (PIPA)"],
    contained: "Yes",
    organisationType: "Company",
  });
  const jurisdictions = built.state_notification_duties.map((d) => d.jurisdiction);
  assertEquals(jurisdictions, ["Alberta (PIPA)"]);
  assertEquals(built.state_notification_duties[0].verified, true);
});

// ── Determinism ───────────────────────────────────────────────────────────

Deno.test("Phase 3b — determinism: identical input produces byte-identical PIPEDA output", () => {
  const a = JSON.stringify(buildPipedaDuties(["Canada (PIPEDA)", "Quebec (Law 25)"]));
  const b = JSON.stringify(buildPipedaDuties(["Canada (PIPEDA)", "Quebec (Law 25)"]));
  assertEquals(a, b);
});
