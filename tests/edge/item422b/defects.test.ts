/**
 * ITEM 422-B — THE TWO PILOT DEFECTS.
 *
 * DEFECT 1: priority_actions[].citation is registry-resolved, never
 *           model-authored, and is never null.
 * DEFECT 2: an ask against a fact the record supplies is suppressed; the
 *           honest ask on a thin record survives byte-identical.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_ACTION_CITATION_VERSION,
  ADMT_SUBCHAPTER_FALLBACK,
  resolveAdmtActionCitations,
  sealAdmtActionCitations,
} from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-action-citations.ts";
import { normalizeAdmtPriorityActions } from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-action-records.ts";
import { ADMT_VERIFIED_AUTHORITIES } from "../../../supabase/functions/run-admt-checker/_local/registry/admt-verified-authorities.ts";
import {
  ADMT_ASK_HYGIENE_VERSION,
  runAdmtAskHygiene,
} from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-ask-hygiene.ts";
import { runCoverageMatrix } from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { ADMT_PIPELINE_STAMP } from "../../../supabase/functions/run-admt-checker/_local/prose/plans/admt.spine.ts";

const REG = ADMT_VERIFIED_AUTHORITIES as unknown as Record<string, { subsection: string }>;
const FIRST_KEY = Object.keys(REG)[0];

Deno.test("ITEM 422-B: stamps are the ratified values", () => {
  assertEquals(ADMT_PIPELINE_STAMP, "admt-pipeline@item422c-2026-08-09");
  assertEquals(ADMT_ACTION_CITATION_VERSION, "admt-action-citations@item422c-2026-08-09");
  assertEquals(ADMT_ASK_HYGIENE_VERSION, "admt-ask-hygiene@item422b-2026-08-09");
});

// ── DEFECT 1 ────────────────────────────────────────────────────────────────

Deno.test("ITEM 422-B D1: every citation byte-matches its proposition's registry pinpoint", () => {
  const report: Record<string, unknown> = {
    priority_actions: Object.keys(REG).slice(0, 5).map((pk, i) => ({
      rank: i + 1,
      action: `Do thing ${i + 1}.`,
      proposition_key: pk,
      // A model-authored pinpoint that MUST be overwritten by the registry.
      citation: "11 CCR § 7222(b)(3)",
    })),
  };
  const diag = resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(diag.resolved_by_key, 5);
  assertEquals(diag.anchor_downgraded, 0);
  for (const a of report.priority_actions as Record<string, string>[]) {
    assertEquals(a.citation, REG[a.proposition_key].subsection);
    assertEquals(a._citation_source, "registry_key");
  }
});

Deno.test("ITEM 422-B D1: null-citation impossibility + honest downgrade of a guessed pinpoint", () => {
  const report: Record<string, unknown> = {
    priority_actions: [
      { rank: 1, action: "Rank-1 with a null citation.", citation: null },
      { rank: 2, action: "Guessed pinpoint.", citation: "11 CCR § 9999(z)(42)" },
      { rank: 3, action: "Unknown key.", proposition_key: "no_such_key_at_all" },
    ],
  };
  const diag = resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(diag.total, 3);
  const pa = report.priority_actions as Record<string, unknown>[];
  for (const a of pa) {
    assert(typeof a.citation === "string" && (a.citation as string).length > 0, "citation is never null");
  }
  assertEquals(pa[0].citation, ADMT_SUBCHAPTER_FALLBACK);
  assertEquals(pa[1].citation, ADMT_SUBCHAPTER_FALLBACK, "a guessed pinpoint never ships");
  assertEquals(pa[1].proposition_key, "");
  assertEquals(pa[2].citation, ADMT_SUBCHAPTER_FALLBACK);
});

Deno.test("ITEM 422-B D1: keyless fill back-fills the proposition_key from the pinpoint", () => {
  const sub = REG[FIRST_KEY].subsection;
  const report: Record<string, unknown> = {
    priority_actions: [{ rank: 1, action: "Keyless.", citation: sub }],
  };
  const diag = resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(diag.keyless_filled + diag.resolved_by_key, 1);
  const a = (report.priority_actions as Record<string, unknown>[])[0];
  assertEquals(a.citation, REG[String(a.proposition_key)].subsection);
});

Deno.test("ITEM 422-B D1: top_3_actions is left byte-identical", () => {
  const report: Record<string, unknown> = {
    priority_actions: [{ rank: 1, action: "x", citation: "11 CCR § 9999(z)" }],
    top_3_actions: [{ rank: 1, action: "untouched", citation: "11 CCR § 9999(z)", proposition_key: "" }],
  };
  const before = JSON.stringify(report.top_3_actions);
  normalizeAdmtPriorityActions(report);
  resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(JSON.stringify(report.top_3_actions), before);
});

Deno.test("ITEM 422-B D1: fail-open on degenerate input", () => {
  assertEquals(resolveAdmtActionCitations(null, ADMT_VERIFIED_AUTHORITIES).total, 0);
  assertEquals(
    resolveAdmtActionCitations({ priority_actions: "nope" }, ADMT_VERIFIED_AUTHORITIES).total,
    0,
  );
});

// ── DEFECT 2 ────────────────────────────────────────────────────────────────

const SUPPLIED_INTAKE = {
  human_review: "Yes — reviewer knows how to interpret the output and can change the decision",
};

const ASK_AGAINST_SUPPLIED = {
  field: "human_review",
  dimensions: "whether human_review involves a reviewer with authority to change the outcome",
  provision: "11 CCR § 7221(b)(1)",
  enables: "the human-involvement element",
};

const HONEST_ASK = {
  field: "human_review",
  dimensions: "whether human_review involves a reviewer with authority to change the outcome",
  provision: "11 CCR § 7221(b)(1)",
  enables: "the human-involvement element",
};

Deno.test("ITEM 422-B D2: perfect record ⇒ no ask against a supplied fact", () => {
  const report: Record<string, unknown> = { information_needed: [{ ...ASK_AGAINST_SUPPLIED }] };
  const t = runAdmtAskHygiene(report, SUPPLIED_INTAKE);
  assertEquals(t.suppressed, 1);
  assertEquals(t.asks_out, 0);
  assertEquals(t.suppressed_keys, ["human_review"]);
  assertEquals((report.information_needed as unknown[]).length, 0);

  const cov = runCoverageMatrix("cppa-admt", report, SUPPLIED_INTAKE);
  assertEquals(
    cov.orphans.filter((o) => o.type === "ask_against_supplied_fact").length,
    0,
    "the detector is unchanged and now finds nothing to raise",
  );
});

Deno.test("ITEM 422-B D2: thin record ⇒ the honest ask survives byte-identical", () => {
  const report: Record<string, unknown> = { information_needed: [{ ...HONEST_ASK }] };
  const before = JSON.stringify(report.information_needed);
  const t = runAdmtAskHygiene(report, { human_review: "" });
  assertEquals(t.suppressed, 0);
  assertEquals(t.honest, 1);
  assertEquals(JSON.stringify(report.information_needed), before);
});

Deno.test("ITEM 422-B D2: a mixed ask is retained (the product never rewrites counsel's prose)", () => {
  const report: Record<string, unknown> = {
    information_needed: [{
      field: "human_review",
      dimensions: "human_review and access_logic_disclosure",
      provision: "11 CCR § 7222(b)(2)",
      enables: "the logic-disclosure element",
    }],
  };
  const before = JSON.stringify(report.information_needed);
  const t = runAdmtAskHygiene(report, SUPPLIED_INTAKE);
  assertEquals(t.suppressed, 0);
  assertEquals(t.retained_mixed, 1);
  assertEquals(JSON.stringify(report.information_needed), before);
});

Deno.test("ITEM 422-B D2: fail-open on degenerate input", () => {
  assertEquals(runAdmtAskHygiene(null, {}).asks_in, 0);
  assertEquals(runAdmtAskHygiene({ information_needed: "nope" }, {}).asks_in, 0);
});

/* ─── ITEM 422-C — THE PRESENT-BUT-UNRESOLVABLE KEY BRANCH ─────────────── */

Deno.test("ITEM 422-C: an unknown proposition_key never ships a null citation", () => {
  const report = {
    priority_actions: [
      { rank: 1, action: "Do the thing.", proposition_key: "no_such_key_at_all", citation: null },
    ],
  };
  const diag = resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  const e = report.priority_actions[0] as Record<string, unknown>;
  assertEquals(e.citation, ADMT_SUBCHAPTER_FALLBACK);
  assertEquals(e.proposition_key, "");
  assertEquals(e._citation_source, "registry_downgrade_unresolved_key");
  assertEquals(diag.anchor_downgraded, 1);
  assertEquals(diag.unresolved_key_downgraded, 1);
  assertEquals(diag.untouched, 0);
});

Deno.test("ITEM 422-C: human_involvement DOES resolve — no alias needed", () => {
  const report = {
    priority_actions: [
      { rank: 5, action: "Record the human-involvement standard.", proposition_key: "human_involvement" },
    ],
  };
  resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  const e = report.priority_actions[0] as Record<string, unknown>;
  assertEquals(e.proposition_key, "human_involvement");
  assert(typeof e.citation === "string" && (e.citation as string).includes("7001"));
});

Deno.test("ITEM 422-C: the terminal seal closes an anchor cleared downstream", () => {
  // Reproduces the pilot: the sole-§7001 discipline cleared the pinpoint to ""
  // while preserving the key.
  const report = {
    priority_actions: [
      { rank: 5, action: "Record the human-involvement standard.", proposition_key: "human_involvement", citation: "" },
      { rank: 6, action: "Keep this one.", proposition_key: "", citation: "11 CCR § 7221(a)" },
    ],
  };
  const diag = sealAdmtActionCitations(report);
  assertEquals(diag.sealed, 1);
  assertEquals(diag.total, 2);
  const [a, b] = report.priority_actions as Record<string, unknown>[];
  assertEquals(a.citation, ADMT_SUBCHAPTER_FALLBACK);
  assertEquals(a.proposition_key, "");
  assertEquals(b.citation, "11 CCR § 7221(a)");
});
