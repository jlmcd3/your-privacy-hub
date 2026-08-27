// IR CONVERSION (doc 15, closed 2026-08-27) — retires the three-call model
// monolith (`generateHalves`/`callClaude`) + its repair chain + the ITEM 417
// critic/verifier refinement pass behind `IR_DETERMINISTIC_ENABLED`. Unlike
// DPA/Governance's cutover flags, flipping this one changes NO customer-
// facing byte: the render dispatch has preferred `report_data.skeleton_
// document` unconditionally since the SO-7 wire-in (2026-08-10), so
// `playbook_text` has been vestigial for every row generated since. This
// suite pins the flag wiring itself via source assertions (the established
// pattern for this file's Deno.serve handler, matching S-D1/S-G3's own
// flag-existence tests) — the skeleton assembly's OWN correctness is
// covered by the so7/item417/item428 suites, untouched by this landing.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/generate-ir-playbook/index.ts", import.meta.url),
);

Deno.test("IR — the flag defaults false and reads IR_DETERMINISTIC_ENABLED", () => {
  assertStringIncludes(SRC, 'Deno.env.get("IR_DETERMINISTIC_ENABLED") ?? "false"');
});

Deno.test("IR — the model-call chain is gated: generateHalves only runs when the flag is off", () => {
  assertStringIncludes(SRC, "if (!IR_DETERMINISTIC_ENABLED) {");
  const gateIdx = SRC.indexOf("if (!IR_DETERMINISTIC_ENABLED) {");
  const callIdx = SRC.indexOf('await generateHalves("");');
  assert(gateIdx > -1 && callIdx > -1 && gateIdx < callIdx, "the gate must precede the model call");
});

Deno.test("IR — the deterministic branch supplies empty assembled/playbook_text/parsedAnnotations/lintWarnings", () => {
  assertStringIncludes(SRC, 'assembled = { playbook_text: "", parsedAnnotations: [] };');
  assertStringIncludes(SRC, 'playbook_text = "";');
  assertStringIncludes(SRC, "parsedAnnotations = [];");
  assertStringIncludes(SRC, "lintWarnings = [];");
});

Deno.test("IR — the refinement pass is skipped on the deterministic path (nothing to critique)", () => {
  const refIdx = SRC.indexOf('await import("./_local/ltp/ir-refinement.ts")');
  assert(refIdx > -1, "refinement import not found");
  const before = SRC.slice(Math.max(0, refIdx - 200), refIdx);
  assert(/if \(!IR_DETERMINISTIC_ENABLED\)\s*\n\s*try \{/.test(before), before);
});

Deno.test("IR — the deterministic path derives playbook_text from the skeleton's own rendered text, never leaves it empty in the persisted row", () => {
  assertStringIncludes(SRC, "import { skeletonDocumentToText } from \"../_shared/prose/skeleton-render.ts\";");
  assertStringIncludes(SRC, "if (IR_DETERMINISTIC_ENABLED) playbook_text = skeletonDocumentToText(sk.document);");
  // The override must come AFTER skeleton_document is assigned, and both
  // must come after the (still-unconditional) typed-builder/skeleton-
  // assembly machinery that every branch shares.
  const skDocIdx = SRC.indexOf("(report_data as any).skeleton_document = sk.document;");
  const overrideIdx = SRC.indexOf("if (IR_DETERMINISTIC_ENABLED) playbook_text = skeletonDocumentToText(sk.document);");
  assert(skDocIdx > -1 && overrideIdx > skDocIdx);
});

Deno.test("IR — the typed-builder / corpus / finalize-battery / emit-gate / serializer / skeleton-assembly chain is unconditional (shared by both branches)", () => {
  for (const needle of [
    "attachIrPlaybookDeliverables(",
    "buildStandingPlaybook(",
    "buildIncidentWorksheet(",
    "loadIrCorpus(supabase)",
    "runIrFinalizeBattery(",
    "runEmitGate(report_data as any",
    "serializeCustomerReport(report_data as any",
    "assembleIRSkeletonDocument(",
  ]) {
    assertStringIncludes(SRC, needle);
    // None of these call sites should be preceded by their own
    // IR_DETERMINISTIC_ENABLED guard — a regression here would mean one
    // branch silently stopped building the customer document.
    const idx = SRC.indexOf(needle);
    const windowStart = Math.max(0, idx - 400);
    const window = SRC.slice(windowStart, idx);
    assert(
      !/if \(!?IR_DETERMINISTIC_ENABLED\)[^}]*$/.test(window.split("\n").slice(-3).join("\n")),
      `${needle} appears to be behind its own flag guard — it should run on both branches`,
    );
  }
});
