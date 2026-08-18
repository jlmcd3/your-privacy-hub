// RK2 — Pass-2R retirement + refinement off + csc/prose detect-only (conversion spec §3, RK2).
//
// PN-RK1 ruled: RETIRE Pass-2R. RK2 implements that ruling and retires refinement:
//   - RISK_PASS2R_ENABLED flag gate (shell) — defaults OFF; re-enable only for rollback.
//   - RISK_POST_PASS_DETECT_ONLY flag gate (shell) — defaults OFF; set ON alongside
//     RISK_PASS2R_ENABLED for the clean zero-model-call deterministic path.
//   - RISK_REFINEMENT_ENABLED (risk-refinement-deps.ts) — env-gated, defaults OFF.
//   - CSC R1–R3 detect-only: checks run, no document mutations when detectOnly=true.
//   - Prose passes (rehome, prose-gold, voice) detect-only: observe without mutating.
//
// The zero-model-call proof is a CEO action (replay harness over stored rows after
// the flags are set), not a test-suite assertion. This battery pins the flag gates,
// observability, and detect-only engine behavior; the engine-default unchanged pin
// is analogous to the RK1 engine-default pin for pass1.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport, runCppaRiskPass2R } from "../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/_shared/ltp/risk-corpus.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

const SHELL_PATH = new URL(
  "../../../supabase/functions/run-cppa-risk-assessment-v2/index.ts",
  import.meta.url,
);
const DEPS_PATH = new URL(
  "../../../supabase/functions/_shared/ltp/risk-refinement-deps.ts",
  import.meta.url,
);

// ── SOURCE-LEVEL PINS ────────────────────────────────────────────────────────

Deno.test("RK2 — shell has RISK_PASS2R_ENABLED flag gate, defaults off", async () => {
  const src = await Deno.readTextFile(SHELL_PATH);
  assert(
    src.includes(`Deno.env.get("RISK_PASS2R_ENABLED") === "1"`),
    "Shell must gate Pass-2R on RISK_PASS2R_ENABLED=1",
  );
  assert(
    src.includes("pass2rEnabled: PASS2R_ENABLED"),
    "Shell options must wire pass2rEnabled to the gate",
  );
});

Deno.test("RK2 — shell has RISK_POST_PASS_DETECT_ONLY flag gate, defaults off", async () => {
  const src = await Deno.readTextFile(SHELL_PATH);
  assert(
    src.includes(`Deno.env.get("RISK_POST_PASS_DETECT_ONLY") === "1"`),
    "Shell must gate post-pass detect-only on RISK_POST_PASS_DETECT_ONLY=1",
  );
  assert(
    src.includes("postPassDetectOnly: POST_PASS_DETECT_ONLY"),
    "Shell options must wire postPassDetectOnly to the gate",
  );
});

Deno.test("RK2 — pass2r_enabled + post_pass_detect_only observability on ping and persist_first", async () => {
  const src = await Deno.readTextFile(SHELL_PATH);
  assert(src.includes("pass2r_enabled: PASS2R_ENABLED"), "pass2r_enabled must appear in observability");
  assert(src.includes("post_pass_detect_only: POST_PASS_DETECT_ONLY"), "post_pass_detect_only must appear in observability");
  assert(src.includes("pass2r_enabled=${PASS2R_ENABLED}"), "Boot line must report pass2r_enabled");
  assert(src.includes("post_pass_detect_only=${POST_PASS_DETECT_ONLY}"), "Boot line must report post_pass_detect_only");
});

Deno.test("RK2 — RISK_REFINEMENT_ENABLED is env-gated in risk-refinement-deps.ts (defaults off)", async () => {
  const src = await Deno.readTextFile(DEPS_PATH);
  assert(
    src.includes(`RISK_REFINEMENT_ENABLED = Deno.env.get("RISK_REFINEMENT_ENABLED") === "1"`),
    "RISK_REFINEMENT_ENABLED must be env-gated (default false)",
  );
  assert(
    !src.includes("RISK_REFINEMENT_ENABLED = true"),
    "RISK_REFINEMENT_ENABLED must not be hard-pinned to true after RK2",
  );
});

// ── FUNCTIONAL PINS ──────────────────────────────────────────────────────────

Deno.test("RK2 — pass2rEnabled:false → deterministic surface + explicit skip reason", async () => {
  const intake = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;
  const gen = await generateCppaRiskReport(intake, {
    pass1: "deterministic",
    pass2rEnabled: false,
    riskCorpus: EMPTY_RISK_CORPUS,
    buildStamp: "rk2-retire-flags-test",
    mode: "enforce",
  });
  // runCppaRiskPass2R with pass2rEnabled:false must not attempt the LLM call
  // and must return deterministic surface with an explicit skip reason.
  const p2 = await runCppaRiskPass2R(gen, {
    pass1: "deterministic",
    pass2rEnabled: false,
    riskCorpus: EMPTY_RISK_CORPUS,
    buildStamp: "rk2-retire-flags-test",
    mode: "enforce",
  });
  assertEquals(p2.shipped_surface, "deterministic", "retired Pass-2R ships deterministic surface");
  const skipReason = p2.meta.pass2r_skipped_reason;
  assert(
    typeof skipReason === "string" && skipReason.length > 0,
    `pass2r_skipped_reason must be set; got: ${JSON.stringify(skipReason)}`,
  );
});

Deno.test("RK2 — postPassDetectOnly:true → risk_csc.repairs === 0 on perfect intake", async () => {
  const intake = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;
  const res = await generateCppaRiskReport(intake, {
    pass1: "deterministic",
    pass2rEnabled: false,
    postPassDetectOnly: true,
    riskCorpus: EMPTY_RISK_CORPUS,
    buildStamp: "rk2-detect-only-test",
    mode: "enforce",
  });
  const internal = (
    ((res.report._meta as Record<string, unknown> | undefined)?.internal) ?? {}
  ) as Record<string, unknown>;
  const csc = internal.risk_csc as Record<string, unknown> | undefined;
  assert(csc, "_meta.internal.risk_csc absent");
  assertEquals(csc.crashed, false, "CSC must not crash in detect-only mode");
  assertEquals(csc.repairs, 0, "detect-only: CSC must record zero repairs (no mutations)");
});

Deno.test("RK2 — postPassDetectOnly:true → engine runs without error, pass1_mode recorded", async () => {
  const intake = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;
  const res = await generateCppaRiskReport(intake, {
    pass1: "deterministic",
    pass2rEnabled: false,
    postPassDetectOnly: true,
    riskCorpus: EMPTY_RISK_CORPUS,
    buildStamp: "rk2-detect-only-engine-test",
    mode: "enforce",
  });
  const internal = (
    ((res.report._meta as Record<string, unknown> | undefined)?.internal) ?? {}
  ) as Record<string, unknown>;
  const ltp = internal.ltp as Record<string, unknown> | undefined;
  assert(ltp, "_meta.internal.ltp absent");
  assertEquals(ltp.pass1_mode, "deterministic", "ltp.pass1_mode must be recorded in detect-only mode");
  assertEquals(res.typeJOrigin, null, "no Type-J on the perfect fixture with detect-only");
});
