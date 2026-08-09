// ITEM 417-B — TIME-BUDGET FAIL-OPEN FOR THE IR REFINEMENT PASS.
//
// The first live invocation after the item417 leg-D deploy was killed by the
// platform mid-refinement: no error thrown, no persist, the row left
// `processing`. These tests pin the repaired class: refinement is budget-aware
// and fails open ON TIME, and the pass NEVER splices on a partial view.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  IR_CRITIC_BUDGET_MS,
  IR_CRITIC_MAX_DOC_CHARS,
  IR_ISOLATE_WALL_BUDGET_MS,
  IR_POST_REFINEMENT_RESERVE_MS,
  IR_VERIFIER_BUDGET_MS,
  irCriticInputChars,
  irRefinementAffordable,
  irVerifierAffordable,
  makeIrTimeBudget,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-time-budget.ts";
import {
  irSkippedTelemetry,
  runIrRefinement,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-refinement.ts";
import type { RefinementDeps } from "../../../supabase/functions/_shared/ltp/refinement-core.ts";

function doc(): Record<string, unknown> {
  return {
    standing_playbook: {
      sections: [
        { id: "s1", body: "The controller has not recorded a containment time for the incident." },
      ],
    },
  };
}

const APPROVE_ALL = '{"verdicts":[{"path":"$.standing_playbook.sections[0].body","verdict":"approve"}]}';
function criticFindings(): string {
  return JSON.stringify({
    findings: [{
      path: "$.standing_playbook.sections[0].body",
      class: "false-absence",
      confidence: "high",
      quote: "has not recorded a containment time",
      replacement: "recorded containment at 04:00 UTC",
      reason: "the record supplies a containment time",
    }],
  });
}

Deno.test("417b: budget arithmetic — a fresh budget affords the pass", () => {
  const b = makeIrTimeBudget(Date.now());
  const v = irRefinementAffordable(b, 1_000);
  assert(v.ok, JSON.stringify(v));
  assertEquals(v.reason, null);
  assertEquals(
    v.required_ms,
    IR_CRITIC_BUDGET_MS + IR_VERIFIER_BUDGET_MS + IR_POST_REFINEMENT_RESERVE_MS,
  );
});

Deno.test("417b: budget arithmetic — an exhausted budget refuses with time_budget", () => {
  const b = makeIrTimeBudget(Date.now() - (IR_ISOLATE_WALL_BUDGET_MS - 1_000));
  const v = irRefinementAffordable(b, 1_000);
  assertEquals(v.ok, false);
  assertEquals(v.reason, "time_budget");
});

Deno.test("417b: the honesty clause — an oversized document is SKIPPED, never truncated", () => {
  const b = makeIrTimeBudget(Date.now());
  const v = irRefinementAffordable(b, IR_CRITIC_MAX_DOC_CHARS + 1);
  assertEquals(v.ok, false);
  assertEquals(v.reason, "time_budget_doc_size");
});

Deno.test("417b: the live killer's shape — the 83,918-char monolith run refuses at +177s", () => {
  // Generation completed at +177s on the dead run; the document carried the
  // fleet's largest monolith. Both arms must refuse.
  const b = makeIrTimeBudget(Date.now() - 177_000);
  const v = irRefinementAffordable(b, 120_001);
  assertEquals(v.ok, false);
  assert(v.reason === "time_budget" || v.reason === "time_budget_doc_size");
});

Deno.test("417b: verifier gate — refuses when the critic consumed the budget", () => {
  const ok = irVerifierAffordable(makeIrTimeBudget(Date.now()));
  assertEquals(ok.ok, true);
  const spent = irVerifierAffordable(
    makeIrTimeBudget(Date.now() - (IR_ISOLATE_WALL_BUDGET_MS - 5_000)),
  );
  assertEquals(spent.ok, false);
  assertEquals(spent.reason, "time_budget_verifier");
});

Deno.test("417b: DIRECTION A — budget available ⇒ refinement RUNS and splices", async () => {
  const d = doc();
  const deps: RefinementDeps = {
    critic: () => Promise.resolve(criticFindings()),
    verifier: () => Promise.resolve(APPROVE_ALL),
  };
  const tel = await runIrRefinement(d, {}, deps, { budget: makeIrTimeBudget(Date.now()) });
  assertEquals(tel.skipped_reason, null);
  assertEquals(tel.critic_findings, 1);
  assertEquals(tel.spliced, 1);
});

Deno.test("417b: DIRECTION B — budget exhausted ⇒ SKIPPED, document byte-identical", async () => {
  const d = doc();
  const before = JSON.stringify(d);
  let criticCalled = false;
  const deps: RefinementDeps = {
    critic: () => {
      criticCalled = true;
      return Promise.resolve(criticFindings());
    },
    verifier: () => Promise.resolve(APPROVE_ALL),
  };
  const tel = await runIrRefinement(d, {}, deps, {
    budget: makeIrTimeBudget(Date.now() - (IR_ISOLATE_WALL_BUDGET_MS - 1_000)),
  });
  assertEquals(criticCalled, false, "the critic must never be called on an exhausted budget");
  assertEquals(tel.skipped_reason, "time_budget");
  assertEquals(JSON.stringify(d), before);
  // FULL ACCOUNTING — every bucket present and zeroed.
  assertEquals(tel.enabled, true);
  assertEquals(tel.critic_findings, 0);
  assertEquals(tel.verifier_approved, 0);
  assertEquals(tel.spliced, 0);
  assertEquals(tel.spliced_paths, []);
  assertEquals(tel.findings_log, []);
  assertEquals(tel.protected_rejected, { count: 0, items: [] });
  assertEquals(tel.leaf_guard_rejected, { count: 0, items: [] });
  assertEquals(tel.artifact_pass_mode, "single_pass_over_persisted_record");
  assert(tel.time_budget && tel.time_budget.ok === false);
});

Deno.test("417b: verifier-time skip ⇒ ZERO splices, document byte-identical, fail-open", async () => {
  const d = doc();
  const before = JSON.stringify(d);
  let verifierCalled = false;
  const deps: RefinementDeps = {
    // The critic 'consumes' the budget by moving the clock: simulated by a
    // budget that is already inside the verifier's refusal band.
    critic: () => Promise.resolve(criticFindings()),
    verifier: () => {
      verifierCalled = true;
      return Promise.resolve(APPROVE_ALL);
    },
  };
  const budget = {
    startedAtMs: 0,
    wallBudgetMs: IR_ISOLATE_WALL_BUDGET_MS,
    elapsedMs: () => 0,
    // affords the whole pass at gate 1, refuses at gate 2
    remainingMs: (() => {
      let n = 0;
      return () => (n++ === 0 ? IR_ISOLATE_WALL_BUDGET_MS : 1_000);
    })(),
  };
  const tel = await runIrRefinement(d, {}, deps, { budget });
  assertEquals(verifierCalled, false);
  assertEquals(tel.skipped_reason, "time_budget_verifier");
  assertEquals(tel.spliced, 0);
  assertEquals(tel.crashed, "verifier_error:time_budget");
  assertEquals(JSON.stringify(d), before);
});

Deno.test("417b: irSkippedTelemetry is a complete, honest record", () => {
  const t = irSkippedTelemetry("time_budget", null);
  assertEquals(t.skipped_reason, "time_budget");
  assertEquals(t.enabled, true);
  assertEquals(t.crashed, null);
  assertEquals(t.spliced, 0);
  assertEquals(t.span_spliced_paths, []);
  assert(t.monolith_paths_detected.includes("$.playbook_text"));
});

Deno.test("417b: irCriticInputChars measures the document WITHOUT _meta", () => {
  const a = irCriticInputChars({ x: "y" });
  const b = irCriticInputChars({ x: "y", _meta: { internal: { big: "z".repeat(5_000) } } });
  assertEquals(a, b);
});

// ── §3c — NO PATH LEAVES THE ROW `processing` ───────────────────────────────
// The terminal-write contract, asserted against the deployed source: every
// limb the function controls (complete, complete-write failure, background
// catch, and the last-resort finally guard) writes a terminal status.
Deno.test("417b: index.ts writes a terminal status on every controlled path", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/generate-ir-playbook/index.ts", import.meta.url),
  );
  for (const phase of ["terminal_complete", "terminal_fallback", "background_catch", "terminal_guard"]) {
    assert(src.includes(phase), `missing terminal write phase: ${phase}`);
  }
  assert(src.includes("terminated_without_terminal_write"));
  assert(/finally\s*{/.test(src), "the last-resort terminal guard must be in a finally block");
  assert(src.includes("makeIrTimeBudget()"), "the isolate clock must start at function entry");
});
