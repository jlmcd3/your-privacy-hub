// PROMPT 5B (2026-08-11) — typed-surface splicer bar + count integrity.
//
// Evidence: run 24de247c spliced model rewrites into $.decision.why,
// $.risk_count_note.note, $.art36_consultation.*, $.legal_basis[].justification
// and $.engagement_map[].rationale. The bar below is the enforcement.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DPIA_REFINEMENT_CONFIG,
  DPIA_PROTECTED_PATH_PREFIXES,
  applySplices,
} from "../../run-dpia-framework/_local/ltp/dpia-refinement.ts";
import { protectedReasonFor } from "../ltp/refinement-core.ts";
import {
  buildRiskCountNote,
  reconcileRiskCountNote,
} from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";

const BARRED_PATHS = [
  "$.decision.determination",
  "$.decision.why",
  "$.risk_count_note.note",
  "$.art36_consultation.determination",
  "$.art36_consultation.why",
  "$.legal_basis[0].justification",
  "$.section_2_analysis.legal_basis[0].justification",
  "$.engagement_map[2].rationale",
  "$.gap_ledger[0].dimensions",
  "$.necessity_findings[1].finding",
  "$.proportionality[0].finding",
  "$.risk_register[0].rationale",
  "$.processing_inventory[0].purpose",
  "$.section2_coverage.summary",
  "$.authority_exhibit.entries[0].note",
  "$.skeleton_document.body",
];

Deno.test("5B: every typed surface is barred, at any depth", () => {
  for (const p of BARRED_PATHS) {
    const reason = protectedReasonFor(p, DPIA_REFINEMENT_CONFIG);
    assert(reason !== null, `unprotected: ${p}`);
    assert(String(reason).startsWith("typed_surface:"), `${p} -> ${reason}`);
  }
});

Deno.test("5B: narrative sections stay spliceable", () => {
  assertEquals(protectedReasonFor("$.section_3_necessity_proportionality", DPIA_REFINEMENT_CONFIG), null);
  assertEquals(protectedReasonFor("$.executive_summary", DPIA_REFINEMENT_CONFIG), null);
});

Deno.test("5B: a verifier-approved decision.why rewrite is refused by the splicer", () => {
  const report: Record<string, unknown> = {
    decision: { determination: "approved", why: "Original deterministic why." },
    executive_summary: "Original summary text.",
  };
  const res = applySplices(report, [
    {
      path: "$.decision.why",
      quote: "Original deterministic why.",
      class: "generic-boilerplate",
      anchor: "intake.purpose",
      replacement: "Model-authored rewrite.",
      confidence: "high",
    },
    {
      path: "$.executive_summary",
      quote: "Original summary text.",
      class: "generic-boilerplate",
      anchor: "intake.purpose",
      replacement: "Improved summary text.",
      confidence: "high",
    },
  ]);
  assertEquals((report.decision as any).why, "Original deterministic why.");
  assertEquals(report.executive_summary, "Improved summary text.");
  assertEquals(res.spliced, 1);
  assertEquals(res.spliced_paths, ["$.executive_summary"]);
  assertEquals(res.protected_rejected.length, 1);
  assertEquals(res.protected_rejected[0].path, "$.decision.why");
  assertEquals(res.protected_rejected[0].leaf_key_or_rule, "typed_surface:decision");
});

Deno.test("5B: the prefix bar is a no-op for a config that sets none", () => {
  const cfg = {
    product: "other",
    version: "v",
    criticSystemPrompt: "",
    verifierSystemPrompt: "",
    protectedRootKeys: [],
    protectedLeafKeys: [],
  };
  assertEquals(protectedReasonFor("$.decision.why", cfg), null);
});

Deno.test("5B: the bar list is exactly the ratified roots", () => {
  assertEquals([...DPIA_PROTECTED_PATH_PREFIXES], [
    "necessity_findings",
    "proportionality",
    "risk_register",
    "art36_consultation",
    "legal_basis",
    "decision",
    "gap_ledger",
    "risk_count_note",
    "engagement_map",
    "processing_inventory",
    "section2_coverage",
    "authority_exhibit",
    "skeleton_document",
  ]);
});

// ── COUNT INTEGRITY ───────────────────────────────────────────────────────
const INTAKE = { residual_risks: "Three residual risks remain after mitigation." };

Deno.test("5B: note rebuilt against the FINAL register after a CSC row drop", () => {
  const four = [1, 2, 3, 4].map((i) => ({ risk_id: `R${i}` }));
  const report: Record<string, unknown> = {
    risk_register: four,
    risk_count_note: buildRiskCountNote(INTAKE, four as never),
  };
  assertEquals((report.risk_count_note as any).register_count, 4);
  // CSC C3 removes one row.
  report.risk_register = four.slice(0, 3);
  const meta = reconcileRiskCountNote(report, INTAKE);
  assertEquals(meta.diverged, true);
  // Stated 3 now equals register 3 -> the note is no longer warranted.
  assertEquals(report.risk_count_note, undefined);
  assertEquals(meta.note_present, 0);
});

Deno.test("5B invariant: register_count === risk_register.length at persist", () => {
  const five = [1, 2, 3, 4, 5].map((i) => ({ risk_id: `R${i}` }));
  const report: Record<string, unknown> = {
    risk_register: five,
    risk_count_note: buildRiskCountNote(INTAKE, five as never),
  };
  report.risk_register = five.slice(0, 4);
  reconcileRiskCountNote(report, INTAKE);
  const note = report.risk_count_note as any;
  assert(note, "note should persist while counts disagree");
  assertEquals(note.register_count, (report.risk_register as unknown[]).length);
  assertEquals(note.stated_count, 3);
});
