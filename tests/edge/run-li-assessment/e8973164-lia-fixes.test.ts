// E8973164 (2026-08-28, quality batch) — three LIA defects on one document:
//
// 1. HIGH x2 hallucination — a fixture spelling out each alternative as
//    "Alternative considered: <X>. Rejected because: <Y>." inside one long
//    run-on paragraph was shredded by the generic sentence-boundary line
//    splitter: every internal sentence break produced its own "line", and
//    the marker words themselves tripped the generic label:reason regex,
//    turning 5 real alternatives into 14 counted, with one real recorded
//    reason reported as missing.
//
// 2. HIGH hallucination — the balancing-test application sentence said
//    "characterises the worst case as significant" when the intake's own
//    word was "Moderate" — true of the INTERNAL grading tier (a ratified
//    bijection, FD703575-L1) but read as putting words in the record's
//    mouth, since the record never said "significant".
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildAlternativesConsidered,
  buildPotentialHarms,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

const ALT_TEXT =
  'PRIMARY OPERATION — RouteIQ nightly behavioural profiling: Alternative considered: manual route planning by dispatch coordinators using static timetables stored in the legacy TMS system (FreightCore v2, decommissioned 2024). Rejected because: manual planning cannot process the volume in real time and historically produced 23% higher fuel costs. Alternative considered: aggregate-only network analysis without individual client shipment linkage. Rejected because: aggregate analysis cannot generate client-specific predictive delay alerts, which are a contractually committed service-level feature.\n\nSECONDARY OPERATION A — Aggregated shipment-pattern reporting: Alternative considered: providing consolidated financial KPIs only, without any shipment-pattern data. Rejected because: the fund reporting obligations require operational volume metrics, and financial KPIs alone do not satisfy the LP-level disclosure requirements per their legal counsel’s written opinion dated 2026-03-12.';

Deno.test("E8973164-L1 — the 'Alternative considered / Rejected because' marker format parses one alternative per pair, not per sentence", () => {
  const f = buildAlternativesConsidered({
    alternatives_considered: ALT_TEXT,
  } as never);
  assertEquals(f.alternatives.length, 3, `expected exactly 3 alternatives: ${JSON.stringify(f.alternatives.map((a) => a.alternative))}`);
  assert(f.alternatives.every((a) => a.rationale_recorded), "every marker-pair alternative carries its recorded reason");
  assertStringIncludes(f.record_fact, "3 alternatives");
  assertStringIncludes(f.record_fact, "3 of which");
});

Deno.test("E8973164-L1 — the Rheinhold rationale (with an internal counsel citation) is not reported as missing", () => {
  const f = buildAlternativesConsidered({
    alternatives_considered: ALT_TEXT,
  } as never);
  const rheinhold = f.alternatives.find((a) => /consolidated financial KPIs/i.test(a.alternative));
  assert(rheinhold, "the Rheinhold alternative must parse");
  assert(rheinhold!.rationale_recorded, "its rationale must be recorded, not flagged unexplained");
  assertStringIncludes(rheinhold!.why_inadequate, "legal counsel");
});

Deno.test("E8973164-L1 — the old em-dash-per-line format still parses unchanged (no marker text present)", () => {
  const f = buildAlternativesConsidered({
    necessity_details: {
      alternatives:
        "Manual inspections — sample only 2% of routes and cannot observe in-cab behaviour. Event-only cameras — miss the fatigue patterns that precede incidents.",
    },
  } as never);
  assertEquals(f.alternatives.length, 2);
  assert(f.alternatives.every((a) => a.rationale_recorded));
});

Deno.test("E8973164-L2 — the balancing application names the record's OWN word, not just the internal grading tier", () => {
  const f = buildPotentialHarms({
    balancing_details: {
      potential_harms: ["financial harm", "reputational harm", "distress"],
      potential_harm: "Moderate",
    },
  } as never);
  assertEquals(f.worst_case_severity, "significant", "the internal bijection (FD703575-L1) is unchanged");
  assertStringIncludes(f.application, '"Moderate"');
  assertStringIncludes(f.application, "significant");
  assertStringIncludes(f.record_fact, '"Moderate"');
});
