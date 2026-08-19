// RK1 — Pass-1 deterministic flip, FLAG-GATED (conversion spec §3, RK1).
//
// Pins:
//  (1) the v2 shell's Pass-1 mode is flag-gated on RISK_PASS1_DETERMINISTIC
//      (default "model" until the flag is set — the flip is a config action
//      gated on api_usage meter verification, doc 29 §4);
//  (2) the shell no longer hard-pins `pass1: "model"`;
//  (3) pass1_mode observability rides the boot line, the ping body, and the
//      v2_persist_first event;
//  (4) the engine records pass1_mode + deterministic pass1_telemetry in
//      `_meta.internal.ltp` when invoked deterministic — the flip's
//      per-document confirmation surface.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-corpus.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

const SHELL_PATH = new URL(
  "../../../supabase/functions/run-cppa-risk-assessment-v2/index.ts",
  import.meta.url,
);

Deno.test("RK1 — shell Pass-1 mode is flag-gated on RISK_PASS1_DETERMINISTIC", async () => {
  const src = await Deno.readTextFile(SHELL_PATH);
  assert(
    src.includes(`Deno.env.get("RISK_PASS1_DETERMINISTIC") === "1" ? "deterministic"`),
    "Shell must gate Pass-1 mode on RISK_PASS1_DETERMINISTIC=1",
  );
  assert(
    src.includes("pass1: PASS1_MODE"),
    "Shell options must pass the gated PASS1_MODE",
  );
});

Deno.test("RK1 — shell no longer hard-pins pass1 model", async () => {
  const src = await Deno.readTextFile(SHELL_PATH);
  assert(
    !src.includes(`pass1: "model"`),
    `Shell must not carry a hard-pinned pass1: "model" after RK1`,
  );
});

Deno.test("RK1 — pass1_mode observability: boot line, ping body, persist_first event", async () => {
  const src = await Deno.readTextFile(SHELL_PATH);
  assert(
    src.includes("pass1_mode=${PASS1_MODE}"),
    "Boot line must report pass1_mode",
  );
  assert(
    src.includes("pass1_mode: PASS1_MODE"),
    "Ping body and v2_persist_first must report pass1_mode",
  );
  // Both sites use the same `pass1_mode: PASS1_MODE` key; require two occurrences.
  const occurrences = src.split("pass1_mode: PASS1_MODE").length - 1;
  assertEquals(occurrences, 2, "pass1_mode rides BOTH the ping body and v2_persist_first");
});

Deno.test("RK1 — deterministic invocation records pass1_mode + deterministic telemetry", async () => {
  const intake = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;
  const res = await generateCppaRiskReport(intake, {
    pass1: "deterministic",
    riskCorpus: EMPTY_RISK_CORPUS,
    buildStamp: "rk1-flag-gate-test",
    mode: "enforce",
  });
  const internal = (
    ((res.report._meta as Record<string, unknown> | undefined)?.internal) ?? {}
  ) as Record<string, unknown>;
  const ltp = internal.ltp as Record<string, unknown> | undefined;
  assert(ltp, "_meta.internal.ltp absent");
  assertEquals(ltp.pass1_mode, "deterministic", "ltp.pass1_mode must record the mode");
  const p1t = ltp.pass1_telemetry as Record<string, unknown> | undefined;
  assert(p1t, "ltp.pass1_telemetry absent");
  assertEquals(p1t.deterministic, true, "pass1_telemetry.deterministic must be true");
  assertEquals(p1t.ok, true, "deterministic Pass-1 must report ok");
  assertEquals(ltp.type_j_origin ?? null, null, "no Type-J on the perfect fixture");
});

Deno.test("RK1 — engine default stays 'model' (the flag gates the shell, not the engine)", async () => {
  // The engine's own default is unchanged by RK1: options.pass1 ?? "model".
  // Pinned from source so an accidental engine-default flip is a loud failure.
  const engineSrc = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts", import.meta.url),
  );
  assert(
    engineSrc.includes(`options.pass1 ?? "model"`),
    "Engine default must remain 'model'; the RK1 flip is shell-config, not an engine change",
  );
});
