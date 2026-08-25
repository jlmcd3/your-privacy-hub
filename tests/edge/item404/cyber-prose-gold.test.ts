// ITEM 404 — CPPA CYBER FLEET-TEMPLATE PACKAGE, LEG A.
//
// Batteries:
//   1. plan fidelity  — the spine encode against the approved plan JSON
//   2. register       — banned register, reference-render fact exemption
//   3. the two named defects, both directions
//   4. the typed aggregate restoration, both directions
//   5. hollow-field omission
//   6. audit-schedule BYTE PRESERVATION (the § 7121/§ 7122 pinned sentences)
//   7. enforcement_context legacy byte-identity through the tolerant reader
//   8. seam battery + the R11 assembled-prose lint over a fully assembled doc
//   9. the stamp survives the LEAK-PREV-P2 serializer

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  CYBER_PIPELINE_STAMP,
  CYBER_PLAN_PRODUCT,
  CYBER_PLAN_ROW_ID,
  CYBER_REFERENCE_RENDER_IDS,
  CYBER_SECTION_SPECS,
  CYBER_THESIS,
  CYBER_BANNED_REGISTER,
  REFERENCE_RENDER_TOKENS,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/prose/plans/cyber.spine.ts";

import {
  applyCyberCustomerRegister,
  applyCyberHollowOmission,
  applyCyberProseGold,
  attachControlStatusCounts,
  computeControlStatusCounts,
  CYBER_METHODOLOGY_NOTE,
  CYBER_PROSE_GOLD_VERSION,
  CYBER_TALLY_POINTER,
  CYBER_TOTAL_COMPONENTS,
  enforcementContextNarrative,
  isProtectedCyberString,
  normalizeCyberEnforcementContext,
  repairComparativeCitation,
  stripAggregateArithmetic,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-prose-gold.ts";

import { lintAssembledProse } from "../../../supabase/functions/_shared/prose/assembled-prose-lint.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { CPPA_CYBER_REPORT_SCHEMA } from "../../../supabase/functions/run-cppa-cybersecurity/_local/report-schemas/cppa-cyber.ts";

const planJson = JSON.parse(
  await Deno.readTextFile(new URL("../../../library/prose/plans/cyber.plan.json", import.meta.url)),
);

// ── 1. PLAN FIDELITY ────────────────────────────────────────────────────────

Deno.test("item404 · plan row identity is pinned", () => {
  assertEquals(planJson.product, CYBER_PLAN_PRODUCT);
  // The row id is assigned by the database on insert and pinned in the encode.
  assert(/^[0-9a-f-]{36}$/.test(CYBER_PLAN_ROW_ID));
  // Approval lives in the DB column only (prose-seed-approval-guard).
  assertEquals(planJson.seed_default_approved, false);
  assert(String(planJson.approval_authority).includes("review panel"));
  assertEquals(planJson.thesis, CYBER_THESIS);
  assertEquals(planJson.banned_register, [...CYBER_BANNED_REGISTER]);
});

Deno.test("item404 · provenance records both walked renders and the delegation verbatim", () => {
  const prov = JSON.stringify(planJson.provenance);
  for (const id of CYBER_REFERENCE_RENDER_IDS) assert(prov.includes(id), `missing render ${id}`);
  assert(prov.includes("panel-delegated approval per CEO delegation 2026-08-06"));
});

Deno.test("item404 · spine encode matches the plan row section-for-section", () => {
  const rows = planJson.sections as Array<Record<string, unknown>>;
  assertEquals(CYBER_SECTION_SPECS.length, rows.length);
  rows.forEach((row, i) => {
    const spec = CYBER_SECTION_SPECS[i];
    assertEquals(spec.id, row.id);
    assertEquals(spec.title, row.title);
    assertEquals(spec.arc_stage, row.arc_stage);
    assertEquals(spec.lead, row.lead);
    assertEquals(spec.source_key, row.source_key);
    assertEquals([...spec.themes], row.themes);
  });
});

Deno.test("item404 · the arc runs headline → close and ids are unique", () => {
  const ids = CYBER_SECTION_SPECS.map((s) => s.id);
  assertEquals(new Set(ids).size, ids.length);
  assertEquals(CYBER_SECTION_SPECS[0].arc_stage, "headline");
  assertEquals(CYBER_SECTION_SPECS[CYBER_SECTION_SPECS.length - 1].arc_stage, "close");
});

// ── 2. REGISTER + FACT EXEMPTION ────────────────────────────────────────────

Deno.test("item404 · banned register is non-empty and excludes the word gap in new copy", () => {
  assert(CYBER_BANNED_REGISTER.length > 0);
  // The pointer sentence and methodology note are new user-facing copy.
  for (const banned of CYBER_BANNED_REGISTER) {
    assert(!CYBER_TALLY_POINTER.toLowerCase().includes(banned.toLowerCase()));
    assert(!CYBER_METHODOLOGY_NOTE.toLowerCase().includes(banned.toLowerCase()));
  }
});

Deno.test("item404 · FACT-EXEMPT — no reference-render fact reaches a builder literal", async () => {
  const files = [
    "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-prose-gold.ts",
    "../../../supabase/functions/run-cppa-cybersecurity/_local/prose/plans/cyber.spine.ts",
  ];
  for (const f of files) {
    const src = await Deno.readTextFile(new URL(f, import.meta.url));
    // Strip comments: the exemption rule is about EMITTED literals, and the
    // rule itself must be documentable in prose.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      // The token list itself must name the facts it bars; exclude its own
      // declaration from the scan.
      .replace(/REFERENCE_RENDER_TOKENS[\s\S]*?\];/, "");
    for (const token of REFERENCE_RENDER_TOKENS) {
      assert(
        !code.includes(token),
        `${f} carries reference-render fact "${token}"`,
      );
    }
  }
});

// ── 3. DEFECT (a) — AGGREGATE CORRUPTION, BOTH DIRECTIONS ───────────────────

const DEFECT_A =
  "This readiness assessment rates Meridian SaaS Inc. Mean of 81 across the 14 scored components (excluding 4 Insufficient-information components). The programme is not yet audit-ready.";

Deno.test("item404 · defect (a) — arithmetic leaves prose and the tally pointer replaces it", () => {
  const { out, removed } = stripAggregateArithmetic(DEFECT_A);
  assert(removed >= 1);
  assert(!/Mean of 81/.test(out));
  assert(out.includes(CYBER_TALLY_POINTER));
  assert(out.includes("not yet audit-ready"));
});

Deno.test("item404 · defect (a) NEGATIVE — clean prose is untouched, and the pass is idempotent", () => {
  const clean = "The programme is not yet audit-ready on the record supplied. Counsel should review the third-party oversight findings before the audit is commissioned.";
  assertEquals(stripAggregateArithmetic(clean), { out: clean, removed: 0 });
  const once = stripAggregateArithmetic(DEFECT_A).out;
  assertEquals(stripAggregateArithmetic(once).out, once);
});

// ── 3b. DEFECT (b) — GARBLED CITATION, BOTH DIRECTIONS ──────────────────────

const DEFECT_B =
  "Document the third-party oversight programme, corresponding to the NIST CSF 2.0 provides comparative guidance on and Identify functions; the operative requirement is 11 CCR § 7123(c)(15).";

Deno.test("item404 · defect (b) — the fused comparative clause is repaired", () => {
  const { out, repaired } = repairComparativeCitation(DEFECT_B);
  assert(repaired >= 1);
  assert(!out.includes("guidance on and Identify"));
  assert(!out.includes("corresponding to the NIST"));
  // The operative citation survives byte-for-byte.
  assert(out.includes("the operative requirement is 11 CCR § 7123(c)(15)"));
});

Deno.test("item404 · defect (b) NEGATIVE — a correct comparative sentence is untouched", () => {
  const ok =
    "The operative requirement is 11 CCR § 7123(c)(15); NIST CSF 2.0 Govern and Identify functions provide comparative guidance.";
  assertEquals(repairComparativeCitation(ok), { out: ok, repaired: 0 });
});

// ── 4. THE TYPED AGGREGATE RESTORATION, BOTH DIRECTIONS ─────────────────────

const CONTROLS = [
  ...Array.from({ length: 10 }, (_, i) => ({ control: `c${i}`, status: "Implemented", score: 85 })),
  ...Array.from({ length: 4 }, (_, i) => ({ control: `p${i}`, status: "Partial", score: 60 })),
  ...Array.from({ length: 4 }, (_, i) => ({ control: `x${i}`, status: "Insufficient information" })),
];

Deno.test("item404 · control_status_counts is typed, deterministic and excludes insufficients", () => {
  const c = computeControlStatusCounts(CONTROLS);
  assertEquals(c.total_components, CYBER_TOTAL_COMPONENTS);
  assertEquals(c.scored_count, 14);
  assertEquals(c.insufficient_count, 4);
  assertEquals(c.mean_score, Math.round((10 * 85 + 4 * 60) / 14));
  assertEquals(c.by_status["Insufficient information"], 4);
  assertEquals(c.methodology_note, CYBER_METHODOLOGY_NOTE);
  // Deterministic: same input, same output.
  assertEquals(computeControlStatusCounts(CONTROLS), c);
});

Deno.test("item404 · NEGATIVE — no scored component yields a null mean, never a zero", () => {
  const c = computeControlStatusCounts([{ status: "Insufficient information" }]);
  assertEquals(c.mean_score, null);
  assertEquals(c.scored_count, 0);
});

Deno.test("item404 · the tally is attached before prose is swept", () => {
  const report: Record<string, unknown> = { controls: CONTROLS, executive_summary: DEFECT_A };
  applyCyberProseGold(report);
  const counts = report.control_status_counts as Record<string, unknown>;
  assert(counts, "control_status_counts missing");
  assertEquals(counts.scored_count, 14);
  assert(!/Mean of 81/.test(String(report.executive_summary)));
});

Deno.test("item404 · the tally survives the customer serializer", () => {
  const report: Record<string, unknown> = { controls: CONTROLS, executive_summary: "The programme is not yet audit-ready." };
  attachControlStatusCounts(report);
  const out = serializeCustomerReport(report, CPPA_CYBER_REPORT_SCHEMA).report as Record<string, unknown>;
  assert(out.control_status_counts, "serializer dropped control_status_counts");
});

// ── 5. HOLLOW-FIELD OMISSION ────────────────────────────────────────────────

Deno.test("item404 · hollow reader leaves are omitted, populated ones are kept", () => {
  const report: Record<string, unknown> = {
    controls: [
      { control: "a", status: "Gap", finding: "  ", remediation: "Document the retention schedule." },
      { control: "b", status: "Gap", finding: "N/A", remediation: "" },
    ],
  };
  const res = applyCyberHollowOmission(report);
  const list = report.controls as Array<Record<string, unknown>>;
  assert(!("finding" in list[0]));
  assertEquals(list[0].remediation, "Document the retention schedule.");
  assert(!("finding" in list[1]));
  assert(!("remediation" in list[1]));
  assertEquals(res.omitted.length, 3);
  // Machine-keyed status is never touched.
  assertEquals(list[0].status, "Gap");
});

// ── 6. AUDIT-SCHEDULE BYTE PRESERVATION ─────────────────────────────────────

const PINNED_SCHEDULE = [
  "A business whose annual gross revenue exceeded $100 million in 2026 must complete its first cybersecurity audit and submit the § 7124 certification by April 1, 2028, under 11 CCR § 7121(a).",
  "The audit must be conducted by a qualified, objective, independent professional under 11 CCR § 7122(a), with an average score across the reviewed components of 100 recorded nowhere in the report.",
];

Deno.test("item404 · byte-pinned audit-schedule sentences pass through unchanged", () => {
  const report: Record<string, unknown> = {
    controls: CONTROLS,
    audit_schedule: { narrative: PINNED_SCHEDULE[0], note: PINNED_SCHEDULE[1] },
    executive_summary: DEFECT_A,
  };
  applyCyberProseGold(report);
  const sched = report.audit_schedule as Record<string, string>;
  assertEquals(sched.narrative, PINNED_SCHEDULE[0]);
  assertEquals(sched.note, PINNED_SCHEDULE[1]);
});

Deno.test("item404 · a marker-bearing string is protected wherever it appears", () => {
  const pinned = PINNED_SCHEDULE.filter((s) => isProtectedCyberString(s));
  for (const s of pinned) {
    assertEquals(stripAggregateArithmetic(s), { out: s, removed: 0 });
    assertEquals(repairComparativeCitation(s), { out: s, repaired: 0 });
  }
});

// ── 7. enforcement_context — READERS FIRST, LEGACY BYTE-IDENTITY ────────────

Deno.test("item404 · the tolerant reader renders both shapes byte-identically", () => {
  const narrative = "The CPPA has brought two enforcement actions turning on unaudited third-party access.";
  assertEquals(enforcementContextNarrative(narrative), narrative);
  assertEquals(enforcementContextNarrative({ narrative }), narrative);
  assertEquals(enforcementContextNarrative(undefined), "");
  assertEquals(enforcementContextNarrative({}), "");
});

Deno.test("item404 · the writer normalises a legacy string to the fleet object shape", () => {
  const narrative = "Two enforcement actions turned on unaudited third-party access.";
  const legacy: Record<string, unknown> = { enforcement_context: narrative };
  const res = normalizeCyberEnforcementContext(legacy);
  assertEquals(res.normalised, true);
  assertEquals((legacy.enforcement_context as Record<string, string>).narrative, narrative);
  // What the reader renders is byte-identical before and after.
  assertEquals(enforcementContextNarrative(legacy.enforcement_context), narrative);
  // Idempotent: a second pass sees the object and leaves it alone.
  assertEquals(normalizeCyberEnforcementContext(legacy).already_object, true);
});

Deno.test("item404 · an empty legacy string is omitted, never shipped as a hollow object", () => {
  const r: Record<string, unknown> = { enforcement_context: "   " };
  normalizeCyberEnforcementContext(r);
  assert(!("enforcement_context" in r));
});

// ── 8. SEAM BATTERY + R11 OVER A FULLY ASSEMBLED DOCUMENT ───────────────────

function assembledCyberDocument(): Record<string, unknown> {
  const report: Record<string, unknown> = {
    readiness_level: "Not yet audit-ready",
    overall_score: 78,
    readiness_determination: { status: "not_ready", decision: "NOT_READY", rule_ids: ["cy-r1"] },
    executive_summary: DEFECT_A,
    controls: CONTROLS.map((c, i) =>
      i === 0
        ? { ...c, finding: "Third-party oversight is documented but not tested.", remediation: DEFECT_B }
        : { ...c, finding: `Component ${i} is evidenced by policy.`, remediation: "Retain the current evidence." }
    ),
    audit_schedule: { narrative: PINNED_SCHEDULE[0] },
    enforcement_context: "Two enforcement actions turned on unaudited third-party access.",
    top_risks: [{ risk_type: "Third-party access", finding: "record_insufficient", remediation: "  " }],
    next_steps: [{ action: "Commission the independence confirmation in writing." }],
    disclaimer:
      "This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance.",
  };
  applyCyberProseGold(report);
  return report;
}

Deno.test("item404 · R11 assembled-prose lint is clean on a fully assembled cyber document", () => {
  const doc = assembledCyberDocument();
  const res = lintAssembledProse(doc);
  assertEquals(res.crashed, false);
  assertEquals(
    res.blocking,
    0,
    `blocking findings: ${JSON.stringify(res.findings.filter((f) => !f.advisory))}`,
  );
});

Deno.test("item404 · R11 catches a bare aggregate token inside prose (the new rule)", () => {
  const bad = { executive_summary: DEFECT_A };
  const res = lintAssembledProse(bad);
  assert(
    res.findings.some((f) => f.rule === "bare_aggregate_token"),
    `expected bare_aggregate_token, got ${JSON.stringify(res.findings)}`,
  );
});

Deno.test("item404 · seam battery — openers, enums, litany, duplicates, wrong field", () => {
  const doc = assembledCyberDocument();
  const summary = String(doc.executive_summary);

  // opening 12 words: the verdict, not arithmetic and not the entity walk.
  const opening = summary.split(/\s+/).slice(0, 12).join(" ");
  assert(!/\d/.test(opening), `arithmetic in the opening twelve words: "${opening}"`);

  // bare enum: no machine token on any reader surface.
  const readerBlob = JSON.stringify({
    executive_summary: doc.executive_summary,
    controls: doc.controls,
    top_risks: doc.top_risks,
    next_steps: doc.next_steps,
  });
  for (const token of ["record_insufficient", "insufficient_basis", "RESOLVED_MET", "INDETERMINATE"]) {
    assert(!readerBlob.includes(token), `bare enum "${token}" survived onto a reader surface`);
  }
  // …while the determination machinery keeps its machine keys.
  assertEquals((doc.readiness_determination as Record<string, string>).status, "not_ready");
  assertEquals((doc.readiness_determination as Record<string, string>).decision, "NOT_READY");

  // splice: no fused comparative fragment anywhere.
  assert(!readerBlob.includes("guidance on and "));

  // litany + duplicate sentence: no reader sentence repeats within a surface.
  const sentences = summary.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  assertEquals(new Set(sentences).size, sentences.length, "duplicate sentence in the executive summary");

  // wrong field: the tally lives in control_status_counts, never in prose.
  assert(doc.control_status_counts, "tally missing from its typed home");
  assert(!/Mean of \d/.test(readerBlob), "arithmetic recited on a reader surface");
});

Deno.test("item404 · customer register rewrites internal vocabulary on reader surfaces only", () => {
  const report: Record<string, unknown> = {
    top_risks: [{ finding: "record_insufficient" }],
    readiness_determination: { status: "record_insufficient" },
  };
  const res = applyCyberCustomerRegister(report);
  assert(res.rewrites >= 1);
  assert(!String((report.top_risks as Array<Record<string, string>>)[0].finding).includes("record_insufficient"));
  assertEquals((report.readiness_determination as Record<string, string>).status, "record_insufficient");
});

// ── 9. THE STAMP SURVIVES THE SERIALIZER ────────────────────────────────────

Deno.test("item404 · cyber_pipeline_stamp survives the LEAK-PREV-P2 serializer", () => {
  const report: Record<string, unknown> = {
    controls: CONTROLS,
    executive_summary: "The programme is not yet audit-ready on the record supplied.",
    _meta: { internal: { cyber_pipeline_stamp: CYBER_PIPELINE_STAMP }, build_stamp: "x" },
  };
  const out = serializeCustomerReport(report, CPPA_CYBER_REPORT_SCHEMA).report as Record<string, unknown>;
  const meta = out._meta as Record<string, unknown>;
  const internal = meta?.internal as Record<string, unknown>;
  assertEquals(internal?.cyber_pipeline_stamp, CYBER_PIPELINE_STAMP);
});

Deno.test("item404 · the stamp and version constants are the item404 values", () => {
  // ITEM 406 leg C bumps the PIPELINE stamp; the prose-gold module version is
  // unchanged because item406 alters no prose-gold behaviour (it only exports
  // the absence-label phrasing class the CSC detector is built from).
  // Re-pinned 2026-08-25: the stamp moved to item-so4 when the SO-4 skeleton
  // shipped (2026-08-10); this pin was stale since then (pre-existing failure
  // documented in the C0/C1.1a baselines).
  assertEquals(CYBER_PIPELINE_STAMP, "cyber-pipeline@item-so4-2026-08-10");
  assertEquals(CYBER_PROSE_GOLD_VERSION, "cyber-prose-gold-2026-08-07-item404");
});
