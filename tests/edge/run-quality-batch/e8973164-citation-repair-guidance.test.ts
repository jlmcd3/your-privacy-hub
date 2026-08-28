// E8973164 (2026-08-28, quality batch) — cppa-risk's tool run aborted:
// "Intake spec doesn't match cppa-risk's expected input ... (2/2 intakes
// failed validation) Deficiencies: lint: statute cite outside allowlist:
// § 7023 | lint: statute cite outside allowlist: § 7027". Both attempts
// invented a DIFFERENT out-of-allowlist section number rather than
// converging, because the repair instruction ("return this same object
// with the listed facts ADDED; change nothing else") is written for a
// MISSING fact, not a PRESENT-BUT-WRONG citation the model has no verified
// replacement for. `screenIntake` now adds an explicit citation-specific
// instruction telling the model to drop the citation and restate the fact
// in plain English, rather than guess another number.
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { screenIntake } from "../../../supabase/functions/run-quality-batch/index.ts";

// `screenIntake` calls `_generate` again for the SEPARATE contract-validation
// repair stage once the lint-repair candidate is checked against the real
// intake contract (which a bare fake object will always fail) — the guidance
// this test cares about is the FIRST call, for the lint-repair stage itself,
// so every call is recorded and only index 0 is asserted on.

Deno.test("E8973164 — a citation-allowlist rejection tells the repair to drop the cite, not replace it", async () => {
  const capturedGuidances: string[] = [];
  const fakeGenerate = async (_tool: string, _n: number, extraGuidance?: string) => {
    capturedGuidances.push(extraGuidance ?? "");
    return [{ ok: true }];
  };
  let lintCalls = 0;
  const lint = () => {
    lintCalls += 1;
    // First call: reject with the citation-allowlist reason. Second call
    // (the repair's own re-lint): accept, so the test isolates the
    // GUIDANCE TEXT sent to the lint-repair stage.
    return lintCalls === 1 ? { reason: "statute cite outside allowlist: § 7023" } : null;
  };
  await screenIntake("cppa-risk", { some: "item" }, lint, undefined, fakeGenerate, null);
  assert(capturedGuidances.length >= 1, "the lint-repair stage must have called generate");
  assertStringIncludes(capturedGuidances[0], "Do NOT replace it with a different section number");
  assertStringIncludes(capturedGuidances[0], "NO section-number citation at all");
});

Deno.test("E8973164 — an unrelated lint rejection does not get the citation-specific instruction", async () => {
  const capturedGuidances: string[] = [];
  const fakeGenerate = async (_tool: string, _n: number, extraGuidance?: string) => {
    capturedGuidances.push(extraGuidance ?? "");
    return [{ ok: true }];
  };
  let lintCalls = 0;
  const lint = () => {
    lintCalls += 1;
    return lintCalls === 1 ? { reason: "hedge pattern (further internal investigation is advisable)" } : null;
  };
  await screenIntake("cppa-risk", { some: "item" }, lint, undefined, fakeGenerate, null);
  assert(capturedGuidances.length >= 1, "the lint-repair stage must have called generate");
  assert(
    !capturedGuidances[0].includes("Do NOT replace it with a different section number"),
    "the citation-specific instruction must be scoped to citation-allowlist rejections only",
  );
});
