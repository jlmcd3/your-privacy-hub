// DOC 73 §4 (R2), CEO-ratified 2026-08-25/26 — precedent-class posture
// finding. Pins the deterministic classifier, the builder's ANALYSIS
// SHAPE + degradation law, the ratification gate, and the shared-
// classifier dedup between the free preview and the paid engine.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { precedentClassSentence } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { LIA_REPORT_SCHEMA } from "../../../supabase/functions/run-li-assessment/_local/report-schemas/lia.ts";
import {
  classifyLiaUseCase,
  USE_CASE_LABELS,
} from "../../../supabase/functions/_shared/lia/lia-use-case-classifier.ts";
import {
  attachPrecedentClassPosture,
  buildPrecedentClassPosture,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import {
  LIA_PRECEDENT_CLASS_RATIFIED,
  LIA_PRECEDENT_CLASSES,
  LIA_PRECEDENT_CLASSES_VERSION,
  precedentClassRow,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-classes.ts";

// ── Classifier ──────────────────────────────────────────────────────────

Deno.test("classifyLiaUseCase: behavioral_advertising keywords classify correctly", () => {
  assertEquals(
    classifyLiaUseCase("We run behavioural advertising and cross-service targeting for advertisers."),
    "behavioral_advertising",
  );
});

Deno.test("classifyLiaUseCase: employee_monitoring keywords classify correctly", () => {
  assertEquals(
    classifyLiaUseCase("Employee workplace monitoring of staff devices for security purposes."),
    "employee_monitoring",
  );
});

Deno.test("classifyLiaUseCase: no keyword match falls back to 'other'", () => {
  assertEquals(classifyLiaUseCase("We run a community garden noticeboard."), "other");
});

Deno.test("classifyLiaUseCase: empty description is 'other', never throws", () => {
  assertEquals(classifyLiaUseCase(""), "other");
});

// ── Ratified table shape ───────────────────────────────────────────────

Deno.test("precedent-classes: 'other' never carries a ratified row (it is the classifier's catch-all, not a use case)", () => {
  assertEquals(precedentClassRow("other"), undefined);
});

Deno.test("precedent-classes: every authority names a verified, real enforcement_actions id (format sanity)", () => {
  for (const row of LIA_PRECEDENT_CLASSES) {
    for (const a of row.authorities) {
      assert(/^[0-9a-f-]{36}$/.test(a.source_row_id), `${row.use_case_class}: not a uuid: ${a.source_row_id}`);
      assert(a.what_happened.trim().length > 0, `${row.use_case_class}: empty what_happened`);
      assert(row.factor_ids.length > 0, `${row.use_case_class}: no factor_ids`);
    }
  }
});

// ── Builder — ANALYSIS SHAPE + degradation law ──────────────────────────

Deno.test("buildPrecedentClassPosture: empty processing_description degrades to record_insufficient", () => {
  const f = buildPrecedentClassPosture({});
  assertEquals(f.status, "record_insufficient");
  assertEquals(f.posture, "not_assessed");
  assert(f.information_needed?.includes("processing_description"));
});

Deno.test("buildPrecedentClassPosture: behavioral_advertising resolves the ratified LinkedIn posture", () => {
  const f = buildPrecedentClassPosture({
    processing_description: "Behavioural advertising and cross-service profiling for ad targeting.",
  });
  assertEquals(f.status, "analysed");
  assertEquals(f.use_case_class, "behavioral_advertising");
  assertEquals(f.posture, "rejected");
  assertEquals(f.authorities.length, 1);
  assertEquals(f.authorities[0].subject, "LinkedIn");
  assert(f.factor_ids.includes("Interest legitimacy"));
  assert(f.application.includes("LinkedIn"), "the authority's subject should appear in the rendered application text");
  assert(f.application.includes("€310,000,000"), "the LinkedIn fine should appear in the rendered application text");
});

Deno.test("buildPrecedentClassPosture: employee_monitoring resolves the ratified Amazon France Logistique posture", () => {
  const f = buildPrecedentClassPosture({
    processing_description: "Employee monitoring of warehouse staff using workplace scanners.",
  });
  assertEquals(f.status, "analysed");
  assertEquals(f.use_case_class, "employee_monitoring");
  assertEquals(f.posture, "rejected");
  assertEquals(f.authorities[0].subject, "Amazon France Logistique");
  assert(f.factor_ids.includes("Relationship with the individual"));
});

Deno.test("buildPrecedentClassPosture: a class with no ratified row is 'analysed'/'not_assessed', NEVER record_insufficient", () => {
  // fraud_prevention has no ratified row today (doc 73 §4 coverage note) —
  // this must be an honest, complete, non-gap answer, not a false record
  // gap asking the customer for more information that would not help.
  const f = buildPrecedentClassPosture({
    processing_description: "Fraud prevention and anti-money-laundering risk scoring for transactions.",
  });
  assertEquals(f.use_case_class, "fraud_prevention");
  assertEquals(f.status, "analysed");
  assertEquals(f.posture, "not_assessed");
  assertEquals(f.authorities.length, 0);
  assertEquals(f.information_needed, undefined);
});

Deno.test("buildPrecedentClassPosture: use_case_label matches USE_CASE_LABELS for the resolved class", () => {
  const f = buildPrecedentClassPosture({ processing_description: "Behavioural advertising targeting." });
  assertEquals(f.use_case_label, USE_CASE_LABELS[f.use_case_class]);
});

Deno.test("buildPrecedentClassPosture: map_version is stamped", () => {
  const f = buildPrecedentClassPosture({ processing_description: "Behavioural advertising targeting." });
  assertEquals(f.map_version, LIA_PRECEDENT_CLASSES_VERSION);
});

Deno.test("buildPrecedentClassPosture: never throws on malformed input", () => {
  const f1 = buildPrecedentClassPosture(null);
  assertEquals(f1.status, "record_insufficient");
  const f2 = buildPrecedentClassPosture("not an object" as unknown);
  assertEquals(f2.status, "record_insufficient");
});

// ── attach / telemetry ───────────────────────────────────────────────────

Deno.test("attachPrecedentClassPosture: writes report.precedent_class_posture and returns telemetry", () => {
  const report: Record<string, unknown> = {};
  const meta = attachPrecedentClassPosture(report, {
    processing_description: "Behavioural advertising targeting.",
  });
  assertEquals(meta.ok, true);
  assertEquals(meta.posture, "rejected");
  assert(typeof report.precedent_class_posture === "object");
  assertEquals((report.precedent_class_posture as { use_case_class: string }).use_case_class, "behavioral_advertising");
});

Deno.test("attachPrecedentClassPosture: fail-open on builder throw", () => {
  // A getter that throws simulates an internal builder fault without
  // touching production code paths.
  const hostile = {
    get processing_description(): string {
      throw new Error("boom");
    },
  };
  const meta = attachPrecedentClassPosture({}, hostile);
  assertEquals(meta.ok, false);
  assert(typeof meta.error === "string");
});

// ── Ratification gate (doc 73 §4 R5) ────────────────────────────────────

Deno.test("LIA_PRECEDENT_CLASS_RATIFIED is false — the finding is banked, not yet customer-facing", () => {
  assertEquals(LIA_PRECEDENT_CLASS_RATIFIED, false);
});

// ── Skeleton wiring guard (doc 73 §4 R5) ────────────────────────────────
// While the gate is closed this MUST be a true no-op, regardless of how
// complete or well-formed the underlying finding is — proves the splice
// in lia-skeleton-assemble.ts (balancing_test:6) cannot leak unratified
// prose even if a future edit to the finding's shape changes.

Deno.test("precedentClassSentence: closed gate — a fully analysed, real-posture finding still renders nothing", () => {
  const report = {
    precedent_class_posture: {
      status: "analysed",
      posture: "rejected",
      application: "Regulators have rejected this class of processing under legitimate interests.",
    },
  };
  assertEquals(precedentClassSentence(report), "");
});

Deno.test("precedentClassSentence: closed gate — even a malformed/hostile finding shape renders nothing", () => {
  assertEquals(precedentClassSentence({ precedent_class_posture: { status: "analysed", posture: "rejected", application: "x".repeat(10_000) } }), "");
  assertEquals(precedentClassSentence({}), "");
  assertEquals(precedentClassSentence({ precedent_class_posture: null }), "");
});

// ── R4: one classifier, both surfaces (doc 73 §4) ───────────────────────
// The free preview must import the SAME classifier as the paid engine,
// not a re-inlined copy — this is what "no drift between the free-preview
// signal and what the deterministic engine computes" actually enforces.

Deno.test("ITEM 73/1 — report schema declares precedent_class_posture, else the P2 serializer silently strips it", () => {
  assert(
    LIA_REPORT_SCHEMA.topLevel.includes("precedent_class_posture"),
    "precedent_class_posture must be in the top-level allow-list",
  );
  const keys = LIA_REPORT_SCHEMA.objects?.precedent_class_posture;
  assert(keys, "precedent_class_posture needs a nested key declaration");
  for (const k of ["use_case_class", "use_case_label", "posture", "authorities", "factor_ids", "map_version", "status"]) {
    assert(keys!.includes(k as never), `schema missing key: ${k}`);
  }
});

Deno.test("WIRING GUARD — preview-li-assessment imports the shared classifier, not an inline copy", async () => {
  const src = await Deno.readTextFile(
    new URL(
      "../../../supabase/functions/preview-li-assessment/index.ts",
      import.meta.url,
    ),
  );
  assert(
    src.includes('from "../_shared/lia/lia-use-case-classifier.ts"'),
    "preview-li-assessment must import classifyLiaUseCase from the shared module",
  );
  assert(
    !/function classifyUseCase\s*\(/.test(src),
    "preview-li-assessment must not re-define its own classifier function",
  );
});
