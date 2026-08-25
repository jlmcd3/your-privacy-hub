// ITEM 407 LEG D — CPPA CYBER REFINEMENT WIRING.
//
// The shared engine (refinement-core.ts) is untouched; these tests assert the
// CYBER CONFIG consumes it with every invariant the DPIA, cppa-risk, LIA, ADMT
// and Governance configs carry, and that every protected-leaf class enumerated
// in cyber-refinement.ts is refused by the deterministic splicer — with the
// § 7121(a) audit-schedule sentence and the typed tally as the named
// barred-leaf canaries.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CYBER_REFINEMENT_CONFIG,
  CYBER_REFINEMENT_VERSION,
  CYBER_CRITIC_SYSTEM_PROMPT,
  CYBER_VERIFIER_SYSTEM_PROMPT,
  CYBER_PROTECTED_LEAF_CLASSES,
  CYBER_PROTECTED_SPINE_SECTION_IDS,
  CYBER_PROTECTED_LEAF_KEYS,
  CYBER_PROTECTED_ROOTS,
  CYBER_WATCH_CLASSES,
  CYBER_REFINEMENT_CONFIG_VERSION,
  applyCyberSplices,
  isCyberProtectedPath,
  cyberProtectedReason,
  runCyberRefinement,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-refinement.ts";
import {
  CRITIC_PROMPT_BASE,
  MAX_SPLICES,
  VERIFIER_PROMPT_BASE,
  type CriticFinding,
} from "../../../supabase/functions/_shared/ltp/refinement-core.ts";
import { DPIA_REFINEMENT_CONFIG } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-refinement.ts";
import { RISK_REFINEMENT_CONFIG } from "../../../supabase/functions/run-cppa-risk-assessment/_local/ltp/risk-refinement.ts";
import { LIA_REFINEMENT_CONFIG } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-refinement.ts";
import { ADMT_REFINEMENT_CONFIG } from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-refinement.ts";
import { GOVERNANCE_REFINEMENT_CONFIG } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-refinement.ts";
import {
  CYBER_SECTION_SPECS,
  CYBER_PIPELINE_STAMP,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/prose/plans/cyber.spine.ts";
import { SCHEDULE_LITERALS } from "../../../supabase/functions/_shared/ltp/cyber-audit-schedule.ts";

const finding = (path: string, quote: string, replacement: string): CriticFinding => ({
  path,
  quote,
  class: "generic-boilerplate",
  anchor: "$.intake.additional_context",
  replacement,
  confidence: "high",
});

// ── 1. Config invariants ─────────────────────────────────────────────────────

Deno.test("ITEM 407 — the cyber config is the shared core with a product block", () => {
  assertEquals(CYBER_REFINEMENT_CONFIG.product, "cppa-cyber");
  assertEquals(CYBER_REFINEMENT_CONFIG.version, CYBER_REFINEMENT_VERSION);
  assert(CYBER_CRITIC_SYSTEM_PROMPT.startsWith(CRITIC_PROMPT_BASE));
  assert(CYBER_VERIFIER_SYSTEM_PROMPT.startsWith(VERIFIER_PROMPT_BASE));
  for (const w of CYBER_WATCH_CLASSES) {
    assert(CYBER_CRITIC_SYSTEM_PROMPT.includes(`${w.id} `), w.id);
  }
  assertEquals(CYBER_WATCH_CLASSES.length, 8);
  assert(CYBER_CRITIC_SYSTEM_PROMPT.includes("W-COPYEDIT"));
  assert(CYBER_VERIFIER_SYSTEM_PROMPT.includes("xp-cyber-1"));
  assert(CYBER_VERIFIER_SYSTEM_PROMPT.includes("xp-cyber-5"));
  assert(VERIFIER_PROMPT_BASE.includes('REJECT with reason "necessity"'));
  assertEquals(MAX_SPLICES, 12);
  assertEquals(CYBER_REFINEMENT_CONFIG_VERSION, "cyber-refine-config-2026-08-07-item406");
  // Re-pinned 2026-08-25: the stamp moved to item-so4 when the SO-4 skeleton
  // shipped (2026-08-10); this pin was stale since then (pre-existing failure
  // documented in the C0/C1.1a baselines).
  assertEquals(CYBER_PIPELINE_STAMP, "cyber-pipeline@item-so4-2026-08-10");
});

Deno.test("ITEM 407 — the cyber config does not disturb the other five configs", () => {
  assertEquals(DPIA_REFINEMENT_CONFIG.product, "dpia");
  assertEquals(RISK_REFINEMENT_CONFIG.product, "cppa-risk");
  assertEquals(LIA_REFINEMENT_CONFIG.product, "lia");
  assertEquals(ADMT_REFINEMENT_CONFIG.product, "cppa-admt");
  assertEquals(GOVERNANCE_REFINEMENT_CONFIG.product, "governance");
  for (
    const other of [
      DPIA_REFINEMENT_CONFIG,
      RISK_REFINEMENT_CONFIG,
      LIA_REFINEMENT_CONFIG,
      ADMT_REFINEMENT_CONFIG,
      GOVERNANCE_REFINEMENT_CONFIG,
    ]
  ) {
    assert(CYBER_REFINEMENT_CONFIG.criticSystemPrompt !== other.criticSystemPrompt);
    assert(CYBER_REFINEMENT_CONFIG.verifierSystemPrompt !== other.verifierSystemPrompt);
  }
});

Deno.test("ITEM 407 — the spine class is COMPUTED, never re-typed", () => {
  assertEquals([...CYBER_PROTECTED_SPINE_SECTION_IDS], CYBER_SECTION_SPECS.map((s) => s.id));
  for (const id of CYBER_PROTECTED_SPINE_SECTION_IDS) {
    assert(CYBER_PROTECTED_LEAF_KEYS.includes(id), id);
  }
  for (const r of CYBER_PROTECTED_ROOTS) assert(r.length > 0);
});

// ── 2. Splicer refusal, per protected class ──────────────────────────────────

Deno.test("ITEM 407 — the splicer refuses every enumerated protected leaf class", () => {
  const classes = Object.keys(CYBER_PROTECTED_LEAF_CLASSES);
  assertEquals(classes.length, 8);
  for (const [cls, keys] of Object.entries(CYBER_PROTECTED_LEAF_CLASSES)) {
    assert((keys as readonly string[]).length > 0, `${cls} empty`);
    for (const key of keys as readonly string[]) {
      const path = `$.probe.${key}`;
      assert(isCyberProtectedPath(path), `${cls}/${key} must be protected`);
      assertEquals(cyberProtectedReason(path), key, `${cls}/${key} reason`);
      const report: Record<string, unknown> = { probe: { [key]: "ORIGINAL VALUE" } };
      const res = applyCyberSplices(report, [finding(path, "ORIGINAL", "REWRITTEN")]);
      assertEquals(res.spliced, 0, `${cls}/${key} spliced`);
      assertEquals(res.protected_rejected.length, 1);
      assertEquals((report.probe as Record<string, unknown>)[key], "ORIGINAL VALUE");
    }
  }
});

Deno.test("ITEM 407 — BARRED-LEAF CANARY: the § 7121(a) audit-schedule sentences", () => {
  const scheduleText = Object.values(SCHEDULE_LITERALS).join("\n");
  assert(scheduleText.length > 0);
  const report: Record<string, unknown> = {
    audit_schedule: {
      schedule_literal: scheduleText,
      resolved_cohort_sentence: "The recorded band resolves to the § 7121(a) cohort stated above.",
      audit_cohort: "1 April 2028",
      independence_framing: "The auditor's independence is governed by 11 CCR § 7122.",
    },
  };
  const before = JSON.stringify(report);
  const res = applyCyberSplices(report, [
    finding("$.audit_schedule.schedule_literal", scheduleText.slice(0, 24), "Tightened schedule"),
    finding("$.audit_schedule.resolved_cohort_sentence", "recorded band", "reported band"),
    finding("$.audit_schedule.audit_cohort", "2028", "2029"),
    finding("$.audit_schedule.independence_framing", "§ 7122", "§ 7123"),
  ]);
  assertEquals(res.spliced, 0);
  assertEquals(res.protected_rejected.length, 4);
  assertEquals(JSON.stringify(report), before);
  assertEquals(res.protected_rejected[0].leaf_key_or_rule, "audit_schedule");
});

Deno.test("ITEM 407 — BARRED-LEAF CANARY: the typed tally, verdicts and _meta", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { secret: "internal telemetry" } },
    control_status_counts: { total_components: 18, scored_count: 18, mean_score: 81 },
    readiness_determination: { rating: "Not yet audit-ready", rating_basis: "Original basis." },
    disclaimer: "This document is not legal advice",
    controls: [{ citation: "11 CCR § 7123(c)(15)" }],
  };
  const res = applyCyberSplices(report, [
    finding("$._meta.internal.secret", "internal", "tampered"),
    finding("$.control_status_counts.mean_score", "81", "91"),
    finding("$.readiness_determination.rating_basis", "Original basis", "Rewritten basis"),
    finding("$.disclaimer", "not legal advice", "is legal advice"),
    finding("$.controls[0].citation", "§ 7123(c)(15)", "§ 7123(c)"),
  ]);
  assertEquals(res.spliced, 0);
  assertEquals(res.protected_rejected.length, 5);
  assertEquals(res.protected_rejected[0].leaf_key_or_rule, "_meta_subtree");
  assertEquals((report.control_status_counts as any).mean_score, 81);
  assertEquals((report.readiness_determination as any).rating_basis, "Original basis.");
});

Deno.test("ITEM 407 — DESIGNED-OUTPUT SPLICE CANARY: revisable prose splices, double-anchored", () => {
  const report: Record<string, unknown> = {
    controls: [{
      finding: "The intake records multi-factor authentication as documented.",
      status: "Documented",
    }],
  };
  const ok = applyCyberSplices(report, [
    finding(
      "$.controls[0].finding",
      "records multi-factor authentication as documented",
      "records Okta-enforced multi-factor authentication for all administrative accounts, evidenced by the March 2026 configuration export.",
    ),
  ]);
  assertEquals(ok.spliced, 1);
  assertEquals((report.controls as any)[0].status, "Documented");

  const again = applyCyberSplices(report, [
    finding("$.controls[0].finding", "records multi-factor authentication as documented", "x"),
  ]);
  assertEquals(again.spliced, 0);
  assertEquals(again.quote_drift, 1);
});

Deno.test("ITEM 407 — the 12-cap holds for cyber", () => {
  const report: Record<string, unknown> = { rows: [] as unknown[] };
  const findings: CriticFinding[] = [];
  for (let i = 0; i < 15; i++) {
    (report.rows as unknown[]).push({ prose: `sentence ${i} original` });
    findings.push(finding(`$.rows[${i}].prose`, `sentence ${i}`, `revised ${i}`));
  }
  const res = applyCyberSplices(report, findings);
  assertEquals(res.spliced, 12);
  assert(res.capped);
  assertEquals(res.cap_overflow, 3);
});

// ── 3. Fail-open + telemetry shape ───────────────────────────────────────────

const DOC = () => ({
  _meta: { internal: { secret: "never shown" } },
  controls: [{ finding: "Original prose that must survive." }],
});

Deno.test("ITEM 407 — FAIL-OPEN: critic error leaves the document byte-identical", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const tel = await runCyberRefinement(report as any, { profile: { entity_name: "Acme" } }, {
    critic: () => Promise.reject(new Error("boom")),
    verifier: () => Promise.reject(new Error("must not be called")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assert(String(tel.crashed).startsWith("critic_error:"));
  assertEquals(tel.version, CYBER_REFINEMENT_VERSION);
});

Deno.test("ITEM 407 — FAIL-OPEN: verifier error yields zero splices, document unchanged", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const critic = () =>
    Promise.resolve(JSON.stringify({
      findings: [finding("$.controls[0].finding", "Original prose", "Revised prose")],
      structural_findings: [],
    }));
  const tel = await runCyberRefinement(report as any, {}, {
    critic,
    verifier: () => Promise.reject(new Error("gpt down")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assertEquals(tel.verifier_rejected, 1);
  assert(String(tel.crashed).startsWith("verifier_error:"));
});

Deno.test("ITEM 407 — the critic never sees _meta, and telemetry carries findings_log", async () => {
  let criticUser = "";
  const report = DOC();
  const tel = await runCyberRefinement(report as any, { profile: { entity_name: "Acme" } }, {
    critic: (_s, u) => {
      criticUser = u;
      return Promise.resolve(JSON.stringify({
        findings: [
          finding("$.controls[0].finding", "Original prose", "Revised prose that is better."),
        ],
        structural_findings: [],
      }));
    },
    verifier: (_s, u) => {
      assert(u.includes("node_content"));
      return Promise.resolve(JSON.stringify({
        verdicts: [{ path: "$.controls[0].finding", verdict: "approve", reason: "clearer" }],
      }));
    },
  });
  assert(!criticUser.includes("never shown"));
  assert(!criticUser.includes("_meta"));
  assertEquals(tel.spliced, 1);
  assertEquals(tel.critic_findings, 1);
  assertEquals(tel.findings_log.length, 1);
  assertEquals(tel.spliced_paths, ["$.controls[0].finding"]);
  assertEquals(tel.enabled, true);
  assertEquals(tel.protected_rejected.count, 0);
  assertEquals(
    tel.spliced + tel.verifier_rejected + tel.protected_rejected.count +
      tel.quote_drift + tel.cap_overflow + tel.omission_unanchored,
    tel.critic_findings,
  );
});

Deno.test("ITEM 407 — impossible proposals are killed before the verifier call", async () => {
  let verifierCalled = false;
  const report = {
    ...DOC(),
    readiness_determination: { rating: "Not yet audit-ready" },
  };
  const tel = await runCyberRefinement(report as any, {}, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [
          finding("$.readiness_determination.rating", "Not yet", "Substantially"),
          finding("$.controls[0].finding", "text that is not there", "x"),
        ],
        structural_findings: [],
      })),
    verifier: () => {
      verifierCalled = true;
      return Promise.resolve("{}");
    },
  });
  assertEquals(verifierCalled, false);
  assertEquals(tel.protected_rejected.count, 1);
  assertEquals(tel.quote_drift, 1);
  assertEquals(tel.spliced, 0);
  assertEquals((report as any).readiness_determination.rating, "Not yet audit-ready");
});

Deno.test("ITEM 407 — the disabled flag returns empty telemetry and touches nothing", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const tel = await runCyberRefinement(report as any, {}, {
    critic: () => Promise.reject(new Error("must not be called")),
    verifier: () => Promise.reject(new Error("must not be called")),
  }, { enabled: false });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.enabled, false);
  assertEquals(tel.spliced, 0);
});

// ── 4. Call-site wiring ──────────────────────────────────────────────────────

Deno.test("ITEM 407 — the call site wires refinement before the deterministic battery", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-cppa-cybersecurity/index.ts", import.meta.url),
  );
  const iRefine = src.indexOf("runCyberRefinement(");
  const iGold = src.indexOf("applyCyberProseGold(report");
  const iLint = src.indexOf("attachProseLint(report");
  const iCsc = src.indexOf("attachCyberCsc(");
  const iCov = src.indexOf('"cyber_coverage"');
  const iGate = src.indexOf("computeRecordComplete({");
  assert(iRefine > 0 && iGold > 0 && iLint > 0 && iCsc > 0 && iCov > 0 && iGate > 0);
  assert(iRefine < iGold, "refinement before prose gold");
  assert(iGold < iLint && iLint < iCsc && iCsc < iCov && iCov < iGate, "battery order");
  // RESURRECTION-BUG CLASS — the model is resolved at the call site and passed
  // explicitly into the deps.
  assert(src.includes("const refineModel = currentGenerationModel();"));
  assert(src.includes("makeCyberRefinementDeps(assessment_id ?? currentSourceRowId() ?? null, refineModel)"));
  // Telemetry addresses.
  assert(src.includes("_rfi.cyber_refinement = refineTel;"));
  assert(src.includes("_rfi._refinement = refineTel;"));
});

Deno.test("ITEM 407 — the deps module meters one api_usage row per call, by product", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-refinement-deps.ts", import.meta.url),
  );
  assert(src.includes('product: "cppa-cyber"'));
  assert(src.includes("refine_critic"));
  assert(src.includes("refine_verifier"));
  assert(src.includes("source_row_id: rowId()"));
  assert(src.includes("export const CYBER_REFINEMENT_ENABLED = true;"));
});
