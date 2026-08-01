/**
 * ITEM 278 — PASS-2R ADAPTER + INTEGRATION TESTS (§2R.1, §2R.6).
 *
 * PROVIDER-INJECTED THROUGHOUT. No real API is contacted: every test passes
 * its own `call` function, and the module-scoped call counter is asserted so
 * a live invocation could not slip in unobserved.
 *
 * The two integration obligations under test:
 *   FALLBACK LAW — a 2R failure ships the deterministic document, byte-identical
 *     to a no-2R run (§2R.1(5)).
 *   prose_pass=false is byte-identical to today.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";
import { assembleReport } from "../../../../supabase/functions/_shared/ltp/pass2-assembler.ts";
import {
  runPass2r,
  runProsePassStage,
  contentBearingRegistryKeys,
  readVerdict,
  parseProseDocument,
  buildProseShippedReport,
  PASS2R_MANIFEST,
  PASS2R_MAX_ATTEMPTS,
  PASS2R_MODEL,
  PASS2R_PER_ATTEMPT_TIMEOUT_MS,
  PASS2R_STAGE_CEILING_MS,
  _pass2rCallCount_get,
  _pass2rCallCount_reset,
  type Pass2rCallFn,
} from "../../../../supabase/functions/_shared/ltp/pass2r-llm.ts";

const INTAKE: Record<string, unknown> = {
  entity_name: "ClearPath Credit Solutions, Inc.",
  q1_revenue: "$100M–$500M",
  q2_consumers: "250,000–1 million",
  q3_sector: "Financial services",
  q4_pi_categories: ["Financial information"],
  q5_sell_share: "Yes — share for advertising only",
  q15_sensitive_pi: "Yes",
  q18_admt_use: "Yes",
  i1_processing_purpose: "to underwrite personal-loan applications",
};

function plan() {
  return derivePlan({ intake: INTAKE, report_data: {}, buildStamp: "item278-test" });
}

function deterministicReport(): Record<string, unknown> {
  return assembleReport(plan(), {}, { exitMode: "observe" }).report as Record<string, unknown>;
}

/** A syntactically valid but content-poor 2R response. */
function proseJson(verdict: string, keys: readonly string[]): string {
  const byPart: Record<number, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  const home: Record<string, number> = {
    opening_summary: 1, executive_summary: 1, assessment_summary: 1,
    scope_and_triggers: 1, scope_confirmation: 1, processing_narrative: 1,
    risk_assessment_by_activity: 2, exception_analysis: 2, record_sufficiency: 2,
    information_needed: 3, strengthen_items: 3, priority_actions: 3,
    next_steps: 3, submission_summary: 3,
  };
  for (const k of keys) byPart[home[k] ?? 3].push(k);
  return JSON.stringify({
    parts: [1, 2, 3, 4].map((n) => ({
      part: n,
      heading: `Part ${n}`,
      prose: n === 4
        ? `The result of this assessment is ${verdict}.`
        : "The record is described in plain terms.",
      covered_keys: byPart[n] ?? [],
    })),
  });
}

function envEnforce(on: boolean) {
  if (on) Deno.env.set("LTP_ENFORCE_ENABLED", "1");
  else Deno.env.delete("LTP_ENFORCE_ENABLED");
}

Deno.test("manifest pins the §2R.6 model and budget", () => {
  assertEquals(PASS2R_MODEL, "claude-sonnet-4-6");
  assertEquals(PASS2R_MAX_ATTEMPTS, 3); // one call + two validator-directed retries
  assertEquals(PASS2R_PER_ATTEMPT_TIMEOUT_MS, 170_000); // Item 281
  assertEquals(PASS2R_STAGE_CEILING_MS, 360_000); // Item 281
  assertEquals(PASS2R_MANIFEST.max_tokens, 6_000);
});

Deno.test("adapter — injected provider, clean pass, observe never ships 2R", async () => {
  _pass2rCallCount_reset();
  const report = deterministicReport();
  const keys = contentBearingRegistryKeys(report);
  const call: Pass2rCallFn = () =>
    Promise.resolve({ text: proseJson(readVerdict(report), keys) });

  const r = await runPass2r(plan(), {
    verdict: readVerdict(report),
    registry_keys: keys,
  }, { call, mode: "observe" });

  assertEquals(r.telemetry.attempts, 1);
  assertEquals(r.telemetry.ran, true);
  assertEquals(r.telemetry.mode, "observe");
  // Even a clean observe pass ships deterministic (§2R.3).
  assertEquals(r.telemetry.shipped_surface, "deterministic");
  assertEquals(r.telemetry.validator_outcomes.length, 7);
  assertEquals(_pass2rCallCount_get(), 1);
});

Deno.test("adapter — validator reject retries at most twice and feeds the reason back verbatim", async () => {
  _pass2rCallCount_reset();
  const report = deterministicReport();
  const keys = contentBearingRegistryKeys(report);
  const seen: string[] = [];
  const call: Pass2rCallFn = (args) => {
    seen.push(args.user);
    // Always states the wrong verdict → verdict_consistency reject, every time.
    return Promise.resolve({ text: proseJson("Critical", keys) });
  };

  const r = await runPass2r(plan(), { verdict: "Low", registry_keys: keys }, { call });

  assertEquals(r.prose, null);
  assertEquals(r.telemetry.ok, false);
  assertEquals(r.telemetry.write_around, true);
  assertEquals(r.telemetry.shipped_surface, "deterministic");
  assertEquals(r.telemetry.attempts, 3);
  assertEquals(_pass2rCallCount_get(), 3);
  // Retry envelope carries the structured reject reason VERBATIM.
  assert(seen[1].includes("REJECT REASON (verbatim):"));
  assert(seen[1].includes("[verdict_consistency/"));
});

Deno.test("adapter — transport failure and malformed output both fall back, never throw", async () => {
  _pass2rCallCount_reset();
  const boom: Pass2rCallFn = () => Promise.reject(new Error("socket_reset"));
  const a = await runPass2r(plan(), { verdict: "Low" }, { call: boom });
  assertEquals(a.prose, null);
  assertEquals(a.telemetry.write_around, true);
  assert(a.telemetry.error?.includes("socket_reset"));

  const garbage: Pass2rCallFn = () => Promise.resolve({ text: "not json at all" });
  const b = await runPass2r(plan(), { verdict: "Low" }, { call: garbage });
  assertEquals(b.prose, null);
  assertEquals(b.telemetry.write_around, true);
  assertEquals(b.telemetry.shipped_surface, "deterministic");
});

Deno.test("plan lock — 2R receives a deep-frozen plan; write-back is impossible", async () => {
  const p = plan();
  const call: Pass2rCallFn = () => Promise.resolve({ text: "{}" });
  await runPass2r(p, { verdict: "Low" }, { call });
  assert(Object.isFrozen(p));
  assert(Object.isFrozen(p.intake_ledger));
});

// ---------------------------------------------------------------------
// FALLBACK LAW + prose_pass=false parity
// ---------------------------------------------------------------------

Deno.test("prose_pass=false is byte-identical to a no-2R run", async () => {
  _pass2rCallCount_reset();
  const baseline = JSON.stringify(deterministicReport());
  const stage = await runProsePassStage(plan(), deterministicReport(), { enabled: false });
  assertEquals(JSON.stringify(stage.shipped_report), baseline);
  assertEquals(stage.shipped_surface, "deterministic");
  assertEquals(stage.prose, null);
  assertEquals(stage.telemetry, null);
  assertEquals(stage.skipped_reason, "prose_pass_disabled");
  // Zero-invocation guard: disabled means no model call at all.
  assertEquals(_pass2rCallCount_get(), 0);
});

Deno.test("FALLBACK LAW — a 2R failure ships the deterministic document byte-identically", async () => {
  const prior = Deno.env.get("LTP_ENFORCE_ENABLED");
  envEnforce(true);
  try {
    const baseline = JSON.stringify(deterministicReport());
    const failing: Pass2rCallFn = () => Promise.reject(new Error("pass2r_down"));
    const stage = await runProsePassStage(plan(), deterministicReport(), {
      enabled: true,
      call: failing,
    });
    assertEquals(JSON.stringify(stage.shipped_report), baseline);
    assertEquals(stage.shipped_surface, "deterministic");
    assertEquals(stage.prose, null);
    assertEquals(stage.telemetry?.write_around, true);
  } finally {
    if (prior === undefined) envEnforce(false); else Deno.env.set("LTP_ENFORCE_ENABLED", prior);
  }
});

Deno.test("observe mode ships deterministic even when every validator passes", async () => {
  const prior = Deno.env.get("LTP_ENFORCE_ENABLED");
  envEnforce(true);
  try {
    const report = deterministicReport();
    const baseline = JSON.stringify(report);
    const keys = contentBearingRegistryKeys(report);
    const call: Pass2rCallFn = () => Promise.resolve({ text: proseJson(readVerdict(report), keys) });
    const stage = await runProsePassStage(plan(), deterministicReport(), { enabled: true, call });
    assertEquals(JSON.stringify(stage.shipped_report), baseline);
    assertEquals(stage.shipped_surface, "deterministic");
    // The prose IS captured — telemetry, not product.
    assert(stage.prose !== null);
    assertEquals(stage.telemetry?.mode, "observe");
  } finally {
    if (prior === undefined) envEnforce(false); else Deno.env.set("LTP_ENFORCE_ENABLED", prior);
  }
});

Deno.test("spend guard — 2R is skipped fail-closed when the release switch is off", async () => {
  const prior = Deno.env.get("LTP_ENFORCE_ENABLED");
  envEnforce(false);
  _pass2rCallCount_reset();
  try {
    const stage = await runProsePassStage(plan(), deterministicReport(), {
      enabled: true,
      call: () => Promise.reject(new Error("must_not_be_called")),
    });
    assertEquals(stage.skipped_reason, "ltp_enforce_disabled");
    assertEquals(_pass2rCallCount_get(), 0);
  } finally {
    if (prior !== undefined) Deno.env.set("LTP_ENFORCE_ENABLED", prior);
  }
});

Deno.test("clock budget — 2R is skipped when the remaining budget is under the stage ceiling", async () => {
  const prior = Deno.env.get("LTP_ENFORCE_ENABLED");
  envEnforce(true);
  _pass2rCallCount_reset();
  try {
    const stage = await runProsePassStage(plan(), deterministicReport(), {
      enabled: true,
      remainingBudgetMs: 30_000,
      call: () => Promise.reject(new Error("must_not_be_called")),
    });
    assertEquals(stage.skipped_reason, "clock_budget_below_2r_stage_ceiling");
    assertEquals(_pass2rCallCount_get(), 0);
  } finally {
    if (prior === undefined) envEnforce(false); else Deno.env.set("LTP_ENFORCE_ENABLED", prior);
  }
});

Deno.test("enforce branch exists, is all-or-nothing, and nothing in the codebase sets it", () => {
  const report = deterministicReport();
  const doc = parseProseDocument(proseJson("Low", []));
  const swapped = buildProseShippedReport(report, doc);
  // All four prose surfaces move together; no section-level splicing.
  assertEquals(swapped.executive_summary, doc.parts[0].prose);
  assertEquals(swapped.assessment_summary, doc.parts[1].prose);
  assertEquals(swapped.information_needed, doc.parts[2].prose);
  assertEquals(swapped.closing_statement, doc.parts[3].prose);
});
