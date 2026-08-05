// ITEM 376 — DPIA REFINEMENT PASS. Colocated regression locks.
//
// No live API calls: the critic and verifier are stubbed callers.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  applySplices,
  DPIA_REFINEMENT_VERSION,
  isProtectedPath,
  MAX_SPLICES,
  parsePath,
  readPath,
  runDpiaRefinement,
  type CriticFinding,
} from "../../../supabase/functions/_shared/ltp/dpia-refinement.ts";

const INTAKE = { organization_name: "Acme GmbH", processing_purpose: "fraud scoring" };

function doc(): Record<string, unknown> {
  return {
    executive_summary: "The controller leverages a robust scoring engine.",
    risk_register: [
      { risk_id: "R1", source: "Profiling of applicants.", severity: "Severe", citation: "GDPR Art. 35(7)(c)" },
    ],
    section_6_conclusion: {
      validation_approval: { approved_by_name: "Jane Roe", approval_date: "2026-01-02" },
    },
    framework_disclaimer:
      "This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance.",
    honest_absence: "The record does not state who approved the assessment.",
  };
}

function stub(payload: unknown) {
  return () => Promise.resolve(JSON.stringify(payload));
}

function approveAll(paths: string[]) {
  return () =>
    Promise.resolve(JSON.stringify({
      verdicts: paths.map((p) => ({ path: p, verdict: "approve", reason: "ok" })),
    }));
}

const F = (o: Partial<CriticFinding>): CriticFinding => ({
  path: "$.executive_summary",
  quote: "leverages",
  class: "register-defect",
  anchor: "register rule: avoid leverage",
  replacement: "The controller uses a scoring engine.",
  confidence: "high",
  ...o,
});

Deno.test("parsePath handles array indices and nested keys", () => {
  assertEquals(parsePath("$.risk_register[0].source"), ["risk_register", 0, "source"]);
  assertEquals(parsePath("risk_register"), null);
  assertEquals(readPath(doc(), "$.risk_register[0].source"), "Profiling of applicants.");
});

Deno.test("TEST 1 — splicer double anchor: stale quote yields quote_drift and no change", () => {
  const d = doc();
  const before = JSON.stringify(d);
  const res = applySplices(d, [F({ quote: "text that is no longer there" })]);
  assertEquals(res.spliced, 0);
  assertEquals(res.quote_drift, 1);
  assertEquals(JSON.stringify(d), before);
  assert(res.rejected.some((r) => r.reason === "quote_drift"));
});

Deno.test("TEST 2 — protected-surface proposal rejected in code even when approved", async () => {
  const d = doc();
  const before = JSON.stringify(d);
  const paths = [
    "$.framework_disclaimer",
    "$.risk_register[0].citation",
    "$.risk_register[0].severity",
    "$.section_6_conclusion.validation_approval.approved_by_name",
  ];
  for (const p of paths) assert(isProtectedPath(p), `${p} should be protected`);

  const findings = paths.map((p) => F({ path: p, quote: String(readPath(d, p)), replacement: "REWRITTEN" }));
  const tel = await runDpiaRefinement(d, INTAKE, {
    critic: stub({ findings, structural_findings: [] }),
    verifier: approveAll(paths),
  });
  assertEquals(tel.spliced, 0);
  assertEquals(tel.verifier_approved, paths.length);
  assertEquals(JSON.stringify(d), before);
});

Deno.test("TEST 3 — byte-identity outside spliced paths", async () => {
  const d = doc();
  const control = doc();
  const tel = await runDpiaRefinement(d, INTAKE, {
    critic: stub({ findings: [F({})], structural_findings: [] }),
    verifier: approveAll(["$.executive_summary"]),
  });
  assertEquals(tel.spliced, 1);
  assertEquals(tel.spliced_paths, ["$.executive_summary"]);
  assertEquals(d.executive_summary, "The controller uses a scoring engine.");
  const { executive_summary: _a, ...restNew } = d as Record<string, unknown>;
  const { executive_summary: _b, ...restOld } = control as Record<string, unknown>;
  assertEquals(JSON.stringify(restNew), JSON.stringify(restOld));
});

Deno.test("TEST 4 — honest degradation: a rejected absence-statement proposal never splices", async () => {
  const d = doc();
  const before = JSON.stringify(d);
  const finding = F({
    path: "$.honest_absence",
    quote: "The record does not state who approved the assessment.",
    class: "unsupported-assertion",
    replacement: "The assessment was approved by the data protection officer.",
  });
  const tel = await runDpiaRefinement(d, INTAKE, {
    critic: stub({ findings: [finding], structural_findings: [] }),
    verifier: stub({
      verdicts: [{ path: "$.honest_absence", verdict: "reject", reason: "record is silent; absence statement is correct" }],
    }),
  });
  assertEquals(tel.verifier_approved, 0);
  assertEquals(tel.verifier_rejected, 1);
  assertEquals(tel.spliced, 0);
  assertEquals(JSON.stringify(d), before);
});

Deno.test("TEST 5 — cap at 12 splices", () => {
  const d: Record<string, unknown> = { nodes: [] as string[] };
  const findings: CriticFinding[] = [];
  for (let i = 0; i < 15; i++) {
    (d.nodes as string[]).push(`original ${i} text`);
    findings.push(F({ path: `$.nodes[${i}]`, quote: `original ${i}`, replacement: `revised ${i}` }));
  }
  const res = applySplices(d, findings);
  assertEquals(res.spliced, MAX_SPLICES);
  assert(res.capped);
  assertEquals((d.nodes as string[])[12], "original 12 text");
});

Deno.test("TEST 6 — fail-open on critic and verifier errors", async () => {
  const d = doc();
  const before = JSON.stringify(d);

  const criticErr = await runDpiaRefinement(d, INTAKE, {
    critic: () => Promise.reject(new Error("timeout")),
    verifier: () => Promise.reject(new Error("unused")),
  });
  assertEquals(criticErr.spliced, 0);
  assert(String(criticErr.crashed).startsWith("critic_error"));

  const criticJunk = await runDpiaRefinement(d, INTAKE, {
    critic: () => Promise.resolve("not json at all"),
    verifier: () => Promise.reject(new Error("unused")),
  });
  assertEquals(criticJunk.crashed, "critic_unparseable");

  const verifierErr = await runDpiaRefinement(d, INTAKE, {
    critic: stub({ findings: [F({})], structural_findings: [] }),
    verifier: () => Promise.reject(new Error("502")),
  });
  assertEquals(verifierErr.spliced, 0);
  assertEquals(verifierErr.verifier_rejected, 1);
  assert(String(verifierErr.crashed).startsWith("verifier_error"));

  assertEquals(JSON.stringify(d), before);
});

Deno.test("TEST 7 — telemetry shape and disabled flag", async () => {
  const d = doc();
  const off = await runDpiaRefinement(d, INTAKE, {
    critic: () => Promise.reject(new Error("must not be called")),
    verifier: () => Promise.reject(new Error("must not be called")),
  }, { enabled: false });
  assertEquals(off.enabled, false);
  assertEquals(off.version, DPIA_REFINEMENT_VERSION);
  assertEquals(Object.keys(off).sort(), [
    "capped", "crashed", "critic_findings", "enabled", "quote_drift",
    "spliced", "spliced_paths", "structural_findings", "verifier_approved",
    "verifier_rejected", "version",
  ]);
});

Deno.test("TEST 8 — battery runs after the splice (order asserted in the wiring)", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-dpia-framework/index.ts", import.meta.url),
  );
  const refine = src.indexOf("runDpiaRefinement");
  const frames = src.indexOf("applyFrameSubstitution");
  const csc = src.indexOf("attachDpiaCsc");
  const cap = src.indexOf("applyDpiaBoilerplateCap");
  assert(refine > 0 && frames > 0 && csc > 0 && cap > 0);
  assert(refine < frames, "refinement must precede frame substitution");
  assert(frames < cap, "frame substitution must precede the boilerplate cap");
  assert(cap < csc, "boilerplate cap must precede the consistency check");
  assert(src.includes('DPIA_PIPELINE_STAMP = "dpia-pipeline@item376-refinement-2026-08-04"'));
  assert(src.includes("const DPIA_REFINEMENT_ENABLED = true"));
});
