// ITEM 379r2 — regressions R1 (_meta leak), R2 (coverage false orphans),
// R3 (verifier rubber-stamp). All deterministic; models are stubbed.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applySplices,
  isProtectedPath,
  protectedReason,
  runDpiaRefinement,
} from "../../../supabase/functions/_shared/ltp/dpia-refinement.ts";
import { stripMeta } from "../../../supabase/functions/_shared/ltp/refinement-core.ts";
import { runCoverageMatrix } from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";

const INTAKE = { c1_controller_name: "Helvetia Occupational Health AG" };

function doc(): Record<string, unknown> {
  return {
    executive_summary: "The controller uses a scoring engine.",
    _meta: {
      internal: {
        dpia_deliverables: { art36: "internal telemetry text" },
        engagement_map: { entries: [{ status: "engaged" }] },
      },
    },
  };
}

// ── R1 ─────────────────────────────────────────────────────────────────────

Deno.test("R1 — the critic never receives the _meta subtree", async () => {
  const d = doc();
  let seen = "";
  await runDpiaRefinement(d, INTAKE, {
    critic: (_s, u) => {
      seen = u;
      return Promise.resolve(JSON.stringify({ findings: [], structural_findings: [] }));
    },
    verifier: () => Promise.reject(new Error("must not be called")),
  });
  assert(seen.length > 0, "the critic was called");
  assert(!seen.includes("_meta"), "the critic payload must not mention _meta");
  assert(!seen.includes("internal telemetry text"), "no internal telemetry may leak");
  assert(seen.includes("scoring engine"), "the customer document is still supplied");
  // and the helper itself is pure
  const stripped = stripMeta(d) as Record<string, unknown>;
  assertEquals("_meta" in stripped, false);
  assert("_meta" in d, "the original document is not mutated");
});

Deno.test("R1 — the splicer refuses any _meta path, counted as _meta_subtree", () => {
  const p = "$._meta.internal.dpia_deliverables.art36";
  assert(isProtectedPath(p));
  assertEquals(protectedReason(p), "_meta_subtree");
  const d = doc();
  const before = JSON.stringify(d);
  const res = applySplices(d, [{
    path: p,
    quote: "internal telemetry text",
    class: "generic-boilerplate",
    anchor: "x",
    replacement: "REWRITTEN",
    confidence: "high",
  }]);
  assertEquals(res.spliced, 0);
  assertEquals(res.protected_rejected[0].leaf_key_or_rule, "_meta_subtree");
  assertEquals(JSON.stringify(d), before);
});

// ── R3 ─────────────────────────────────────────────────────────────────────

Deno.test("R3 — a fabricated quote dies deterministically before the verifier", async () => {
  const d = doc();
  const before = JSON.stringify(d);
  const tel = await runDpiaRefinement(d, INTAKE, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [{
          path: "$.executive_summary",
          quote: "a sentence that appears nowhere in the document",
          class: "record-contradiction",
          anchor: "c1_controller_name",
          replacement: "REWRITTEN",
          confidence: "high",
        }],
        structural_findings: [],
      })),
    verifier: () => {
      throw new Error("the verifier must never see an unverifiable quote");
    },
  });
  assertEquals(tel.quote_drift, 1);
  assertEquals(tel.spliced, 0);
  assertEquals(tel.verifier_approved, 0);
  assertEquals(JSON.stringify(d), before);
});

Deno.test("R3 — the verifier message carries the exact node content per proposal", async () => {
  const d = doc();
  let seen = "";
  await runDpiaRefinement(d, INTAKE, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [{
          path: "$.executive_summary",
          quote: "scoring engine",
          class: "generic-boilerplate",
          anchor: "c1_controller_name",
          replacement: "The controller operates a rules-based scoring engine.",
          confidence: "high",
        }],
        structural_findings: [],
      })),
    verifier: (_s, u) => {
      seen = u;
      return Promise.resolve(JSON.stringify({
        verdicts: [{
          path: "$.executive_summary",
          verdict: "reject",
          reason: "The original is equally good; necessity is not met.",
        }],
      }));
    },
  });
  assert(seen.includes("node_content"), "node content is supplied");
  assert(seen.includes("quote_present_in_node"), "the deterministic check is reported");
  assert(!seen.includes("_meta"), "the verifier also never sees _meta");
});

Deno.test("R3 — necessity canary: an equal-quality replacement is rejected 'necessity'", async () => {
  const d = doc();
  const tel = await runDpiaRefinement(d, INTAKE, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [{
          path: "$.executive_summary",
          quote: "scoring engine",
          class: "generic-boilerplate",
          anchor: "c1_controller_name",
          replacement: "scoring engine",
          confidence: "medium",
        }],
        structural_findings: [],
      })),
    verifier: () =>
      Promise.resolve(JSON.stringify({
        verdicts: [{
          path: "$.executive_summary",
          verdict: "reject",
          reason: "The original is equally good; necessity is not met.",
        }],
      })),
  });
  assertEquals(tel.necessity_rejected, 1);
  assertEquals(tel.verifier_reject_reasons.necessity, 1);
  assertEquals(tel.spliced, 0);
});

// ── R2 ─────────────────────────────────────────────────────────────────────

Deno.test("R2 — a neutral-scaffold mitigated_risks is not a measure orphan", () => {
  const report = {
    risk_register: [{ risk_id: "R1", risk_label: "Systematic mapping of individual employee health history" }],
    section_4_risk_management: {
      inherent_risk_assessment: [{ risk: "Systematic mapping of individual employee health history" }],
      additional_mitigating_measures: [{
        measure: "Introduce episode-level access controls within the occupational-health module so historical employee records are not browsable.",
        mitigated_risks: "The record is silent here, and the question is carried forward.",
      }],
    },
    information_needed: [],
  };
  const cov = runCoverageMatrix("dpia", report, {});
  assertEquals(cov.orphans.filter((o) => o.type === "measure_without_risk").length, 0);
});

Deno.test("R2 — a confirmation ask on a drafted node is not an orphan", () => {
  const report = {
    section_2_analysis: {
      measures_other: [{
        implementation_status:
          "The Art. 28 processing agreement is executed and covers the occupational-health module; the encrypted certificate-scan document store is in scope pending confirmation.",
      }],
    },
    information_needed: [{
      field: "section_2_analysis.measures_other[0].implementation_status",
      dimensions: "confirm the Art. 28 DPA scope expressly covers the encrypted certificate-scan document store",
    }],
    risk_register: [],
    section_4_risk_management: {},
  };
  const cov = runCoverageMatrix("dpia", report, { p1_processors: "Arbeitsmedizin München GmbH under an Art. 28 DPA" });
  assertEquals(cov.orphans.filter((o) => o.type === "ask_against_supplied_fact").length, 0);
  assert(cov.counts.links_checked > 0);
});
