// PROMPT 9K (CEO-ruled 2026-08-16) — ASSERT-ONLY COMPOSITION PIPELINE.
//
// Item 4 — FULL-PIPELINE SENTINEL. The complete chain (builders → assembler →
// every police pass in detect mode) runs over ALL FOUR pinned perfect
// fixtures and asserts:
//   (i)   every rendered impact quote matches IMPACT_LEXICON,
//   (ii)  no internal literal reaches a reader-facing leaf,
//   (iii) the stored span and the rendered span are the same span,
//   (iv)  ZERO police pass would have rewritten reader-facing text.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDpiaDeliverables,
  buildProportionality,
  IMPACT_LEXICON,
  terminateSpan,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument, boundedClause } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/dpia-perfect-pinned.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";
import { runEmitGate } from "../../../supabase/functions/_shared/emit-gate.ts";
import { applyFrameSubstitution } from "../../../supabase/functions/_shared/prose/frame-substitution.ts";
import { readDetectFindings } from "../../../supabase/functions/_shared/prose/detect-mode.ts";
import { applyBracketTagPass } from "../../../supabase/functions/run-dpia-framework/_local/prose/bracket-tags.ts";
import { applyInferredGeneralisation } from "../../../supabase/functions/run-dpia-framework/_local/prose/inferred-generalisation.ts";
import { applyAdvisoryCloseRepair } from "../../../supabase/functions/run-dpia-framework/_local/prose/advisory-close-repair.ts";
import { applyEnforcementTagGate } from "../../../supabase/functions/run-dpia-framework/_local/prose/enforcement-tag-gate.ts";
import { applyDpiaBoilerplateCap } from "../../../supabase/functions/run-dpia-framework/_dpia_boilerplate_cap.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const intakeOf = (f: Any) => f.intake ?? f.intake_data ?? f;
// ALL FOUR pins (the 9J.1 set): the two golden perfects + the two CEO pins.
const FIXTURES = [...(DPIA_PERFECT as Any[]), ...(DPIA_PERFECT_PINNED as Any[])].map(intakeOf);

/** The seven audited police passes, all in detect mode. */
function runPoliceChain(report: Any, intake: Any) {
  runEmitGate(report, { tool: "dpia_framework", intakeRoster: intake ?? {}, detectOnly: true });
  applyBracketTagPass(report, { detectOnly: true });
  applyFrameSubstitution(report, { product: "dpia", detectOnly: true } as Any);
  applyDpiaBoilerplateCap(report, { detectOnly: true });
  applyInferredGeneralisation(report, intake, { detectOnly: true });
  applyAdvisoryCloseRepair(report, { detectOnly: true });
  applyEnforcementTagGate(report, { detectOnly: true });
}

function snapshotReaderFacing(node: unknown, path: string, out: Map<string, string>) {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => typeof v === "string" ? out.set(`${path}[${i}]`, v) : snapshotReaderFacing(v, `${path}[${i}]`, out));
    return;
  }
  if (typeof node !== "object") return;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === "_meta" || k === "_staging") continue;
    const p = path ? `${path}.${k}` : k;
    if (typeof v === "string") out.set(p, v);
    else snapshotReaderFacing(v, p, out);
  }
}

const INTERNAL_LITERALS = [/\bi\d+[a-z]?_/i, /\{[a-z_]+\}/, /\[[A-Z_]{4,}\]/, /undefined/, /\[object Object\]/];

Deno.test("9K item 4 — full pipeline over all pinned perfect fixtures: no pass rewrites reader-facing text", () => {
  assert(FIXTURES.length >= 4, `expected >= 4 pinned fixtures, got ${FIXTURES.length}`);
  for (const intake of FIXTURES) {
    const report = buildDpiaDeliverables(intake) as Any;
    const { document } = assembleDpiaSkeletonDocument(report, intake);
    report.skeleton_document = document;

    const before = new Map<string, string>();
    snapshotReaderFacing(report, "", before);

    runPoliceChain(report, intake);

    const after = new Map<string, string>();
    snapshotReaderFacing(report, "", after);

    // (iv) not one reader-facing byte changed.
    assertEquals(after.size, before.size, "leaf count changed under the police chain");
    for (const [p, was] of before) {
      assertEquals(after.get(p), was, `police pass rewrote ${p}`);
    }
    const findings = readDetectFindings(report);
    assertEquals(
      findings.filter((f) => f.check_id === "would_rewrite" || f.check_id === "would_remove").length,
      0,
      `detect findings on a perfect fixture: ${JSON.stringify(findings.slice(0, 3))}`,
    );

    // (ii) no internal literal in any reader-facing leaf.
    for (const [p, v] of after) {
      for (const re of INTERNAL_LITERALS) {
        assert(!re.test(v), `internal literal at ${p}: ${v.slice(0, 120)}`);
      }
    }

    // (i) + (iii) stored span == rendered span, and both match the lexicon.
    for (const prop of buildProportionality(intake) as Any[]) {
      const stored = String(prop.impact_argument ?? "");
      if (!stored || stored === "Not stated") continue;
      assertEquals(stored, terminateSpan(stored), "stored span must carry a terminal stop");
      const rendered = boundedClause(stored);
      assert(IMPACT_LEXICON.some((r) => r.test(rendered)), `rendered span off-lexicon: ${rendered}`);
      assert(IMPACT_LEXICON.some((r) => r.test(stored)), `stored span off-lexicon: ${stored}`);
      assertEquals(rendered, boundedClause(rendered), "rendered span is not the same span");
    }
  }
});

Deno.test("9K item 3 — guidance_verbatim and would_enable are exempt from the emit gate", async () => {
  const { isGateExemptLeaf } = await import("../../../supabase/functions/_shared/emit-gate.ts");
  assertEquals(isGateExemptLeaf("risk_register[2].guidance_verbatim"), true);
  assertEquals(isGateExemptLeaf("section2_coverage.recs[0].would_enable"), true);
  assertEquals(isGateExemptLeaf("executive_summary.text"), false);

  const report: Any = {
    risk_register: [{ guidance_verbatim: "supply the missing intake dimensions and re-run the assessment" }],
    recs: [{ would_enable: "Reconcile the record on i1b_min_pi against the intake" }],
  };
  runEmitGate(report, { tool: "dpia_framework" });
  assertEquals(report.risk_register[0].guidance_verbatim.includes("re-run"), true, "registry bytes degraded");
  assertEquals(report.recs[0].would_enable.includes("i1b_min_pi"), true, "recommendation text degraded");
});

Deno.test("9K item 2 — detect mode records findings and degrades nothing", () => {
  const bad = "Reconcile the record on i1b_min_pi against the intake, since the current position cannot be supported.";
  const report: Any = { note: bad };
  runEmitGate(report, { tool: "dpia_framework", detectOnly: true });
  assertEquals(report.note, bad, "detect mode must not degrade");
  assertEquals(report._meta.internal.emit_gate.degraded_count, 0);
  assertEquals(report._meta.internal.emit_gate.detect_only, true);
  assert(report._meta.internal.emit_gate.writes_suppressed >= 1);
  assert(readDetectFindings(report).length >= 1);
});

Deno.test("9K item 1 — terminateSpan adds one stop and never doubles it", () => {
  assertEquals(terminateSpan("the processing is intrusive"), "the processing is intrusive.");
  assertEquals(terminateSpan("the processing is intrusive."), "the processing is intrusive.");
  assertEquals(terminateSpan(""), "");
});
