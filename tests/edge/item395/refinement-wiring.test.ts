// ITEM 395 LEG D — ADMT REFINEMENT WIRING.
//
// The shared engine (refinement-core.ts) is untouched; these tests assert the
// ADMT CONFIG consumes it with every invariant the DPIA, cppa-risk and LIA
// configs carry, and that every protected-leaf class enumerated in
// admt-refinement-config.ts is refused by the deterministic splicer.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_REFINEMENT_CONFIG,
  ADMT_REFINEMENT_VERSION,
  ADMT_CRITIC_SYSTEM_PROMPT,
  ADMT_VERIFIER_SYSTEM_PROMPT,
  applyAdmtSplices,
  isAdmtProtectedPath,
  admtProtectedReason,
  runAdmtRefinement,
} from "../../../supabase/functions/_shared/ltp/admt-refinement.ts";
import {
  ADMT_PROTECTED_LEAF_CLASSES,
  ADMT_PROTECTED_SPINE_SECTION_IDS,
  ADMT_WATCH_CLASSES,
} from "../../../supabase/functions/_shared/ltp/admt-refinement-config.ts";
import {
  CRITIC_PROMPT_BASE,
  MAX_SPLICES,
  VERIFIER_PROMPT_BASE,
  type CriticFinding,
} from "../../../supabase/functions/_shared/ltp/refinement-core.ts";
import { DPIA_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/dpia-refinement.ts";
import { RISK_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/risk-refinement.ts";
import { LIA_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/lia-refinement.ts";
import {
  ADMT_SECTION_SPECS,
  ADMT_PIPELINE_STAMP,
} from "../../../supabase/functions/_shared/prose/plans/admt.spine.ts";

const finding = (path: string, quote: string, replacement: string): CriticFinding => ({
  path,
  quote,
  class: "generic-boilerplate",
  anchor: "$.intake.admt_description",
  replacement,
  confidence: "high",
});

// ── 1. Config invariants ─────────────────────────────────────────────────────

Deno.test("ITEM 395 — the ADMT config is the shared core with a product block", () => {
  assertEquals(ADMT_REFINEMENT_CONFIG.product, "cppa-admt");
  assertEquals(ADMT_REFINEMENT_CONFIG.version, ADMT_REFINEMENT_VERSION);
  assert(ADMT_CRITIC_SYSTEM_PROMPT.startsWith(CRITIC_PROMPT_BASE));
  assert(ADMT_VERIFIER_SYSTEM_PROMPT.startsWith(VERIFIER_PROMPT_BASE));
  for (const w of ADMT_WATCH_CLASSES) assert(ADMT_CRITIC_SYSTEM_PROMPT.includes(`${w.id} `), w.id);
  assert(ADMT_VERIFIER_SYSTEM_PROMPT.includes("xp-admt-1"));
  assert(ADMT_VERIFIER_SYSTEM_PROMPT.includes("xp-admt-4"));
  assert(VERIFIER_PROMPT_BASE.includes('REJECT with reason "necessity"'));
  assertEquals(MAX_SPLICES, 12);
});

Deno.test("ITEM 395 — the ADMT config does not disturb the other three configs", () => {
  assertEquals(DPIA_REFINEMENT_CONFIG.product, "dpia");
  assertEquals(RISK_REFINEMENT_CONFIG.product, "cppa-risk");
  assertEquals(LIA_REFINEMENT_CONFIG.product, "lia");
  for (const other of [DPIA_REFINEMENT_CONFIG, RISK_REFINEMENT_CONFIG, LIA_REFINEMENT_CONFIG]) {
    assert(ADMT_REFINEMENT_CONFIG.criticSystemPrompt !== other.criticSystemPrompt);
    assert(ADMT_REFINEMENT_CONFIG.verifierSystemPrompt !== other.verifierSystemPrompt);
  }
});

Deno.test("ITEM 395 — the spine class is the item392 arc, exactly; stamp pinned", () => {
  assertEquals([...ADMT_PROTECTED_SPINE_SECTION_IDS], ADMT_SECTION_SPECS.map((s) => s.id));
  assertEquals(ADMT_PIPELINE_STAMP, "admt-pipeline@item395-2026-08-06");
});

// ── 2. Splicer refusal, per protected class ──────────────────────────────────

Deno.test("ITEM 395 — the splicer refuses every enumerated protected leaf class", () => {
  const classes = Object.keys(ADMT_PROTECTED_LEAF_CLASSES);
  assertEquals(classes.length, 7);
  for (const [cls, keys] of Object.entries(ADMT_PROTECTED_LEAF_CLASSES)) {
    assert((keys as readonly string[]).length > 0, `${cls} empty`);
    for (const key of keys as readonly string[]) {
      const path = `$.probe.${key}`;
      assert(isAdmtProtectedPath(path), `${cls}/${key} must be protected`);
      assertEquals(admtProtectedReason(path), key, `${cls}/${key} reason`);
      const report: Record<string, unknown> = { probe: { [key]: "ORIGINAL VALUE" } };
      const res = applyAdmtSplices(report, [finding(path, "ORIGINAL", "REWRITTEN")]);
      assertEquals(res.spliced, 0, `${cls}/${key} spliced`);
      assertEquals(res.protected_rejected.length, 1);
      assertEquals((report.probe as Record<string, unknown>)[key], "ORIGINAL VALUE");
    }
  }
});

Deno.test("ITEM 395 — BARRED-LEAF CANARY: _meta and the protected roots are refused", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { note: "internal telemetry" } },
    disclaimer: "This document is not legal advice",
    authority_exhibit: { heading: "Authorities relied on" },
    deadline_table: { rows: ["1 January 2027"] },
  };
  const res = applyAdmtSplices(report, [
    finding("$._meta.internal.note", "internal", "tampered"),
    finding("$.disclaimer", "not legal advice", "is legal advice"),
    finding("$.authority_exhibit.heading", "Authorities", "Tampered"),
    finding("$.deadline_table.rows[0]", "1 January 2027", "1 January 2028"),
  ]);
  assertEquals(res.spliced, 0);
  assertEquals(res.protected_rejected.length, 4);
  assertEquals(res.protected_rejected[0].leaf_key_or_rule, "_meta_subtree");
  assertEquals((report._meta as any).internal.note, "internal telemetry");
  assertEquals(report.disclaimer, "This document is not legal advice");
  assertEquals((report.deadline_table as any).rows[0], "1 January 2027");
});

Deno.test("ITEM 395 — DESIGNED-OUTPUT SPLICE CANARY: revisable prose splices, double-anchored", () => {
  const report: Record<string, unknown> = {
    scope_analysis: {
      finding: "The business deploys an automated decision-making technology.",
      conclusion: "in_scope",
    },
  };
  const ok = applyAdmtSplices(report, [
    finding(
      "$.scope_analysis.finding",
      "an automated decision-making technology",
      "the Tenancy Fit Index scoring model on all rental applications.",
    ),
  ]);
  assertEquals(ok.spliced, 1);
  assertEquals((report.scope_analysis as any).conclusion, "in_scope");

  const again = applyAdmtSplices(report, [
    finding("$.scope_analysis.finding", "an automated decision-making technology", "x"),
  ]);
  assertEquals(again.spliced, 0);
  assertEquals(again.quote_drift, 1);
});

Deno.test("ITEM 395 — the 12-cap holds for ADMT", () => {
  const report: Record<string, unknown> = { rows: [] as unknown[] };
  const findings: CriticFinding[] = [];
  for (let i = 0; i < 15; i++) {
    (report.rows as unknown[]).push({ prose: `sentence ${i} original` });
    findings.push(finding(`$.rows[${i}].prose`, `sentence ${i}`, `revised ${i}`));
  }
  const res = applyAdmtSplices(report, findings);
  assertEquals(res.spliced, 12);
  assert(res.capped);
  assertEquals(res.cap_overflow, 3);
});

// ── 3. Fail-open + telemetry shape ───────────────────────────────────────────

const DOC = () => ({
  _meta: { internal: { secret: "never shown" } },
  scope_analysis: { finding: "Original prose that must survive." },
});

Deno.test("ITEM 395 — FAIL-OPEN: critic error leaves the document byte-identical", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const tel = await runAdmtRefinement(report as any, { business_name: "Acme" }, {
    critic: () => Promise.reject(new Error("boom")),
    verifier: () => Promise.reject(new Error("must not be called")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assert(String(tel.crashed).startsWith("critic_error:"));
  assertEquals(tel.version, ADMT_REFINEMENT_VERSION);
});

Deno.test("ITEM 395 — FAIL-OPEN: verifier error yields zero splices, document unchanged", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const critic = () =>
    Promise.resolve(JSON.stringify({
      findings: [finding("$.scope_analysis.finding", "Original prose", "Revised prose")],
      structural_findings: [],
    }));
  const tel = await runAdmtRefinement(report as any, {}, {
    critic,
    verifier: () => Promise.reject(new Error("gpt down")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assertEquals(tel.verifier_rejected, 1);
  assert(String(tel.crashed).startsWith("verifier_error:"));
});

Deno.test("ITEM 395 — the critic never sees _meta, and telemetry carries findings_log", async () => {
  let criticUser = "";
  const report = DOC();
  const tel = await runAdmtRefinement(report as any, { business_name: "Acme" }, {
    critic: (_s, u) => {
      criticUser = u;
      return Promise.resolve(JSON.stringify({
        findings: [finding("$.scope_analysis.finding", "Original prose", "Revised prose that is better.")],
        structural_findings: [],
      }));
    },
    verifier: (_s, u) => {
      assert(u.includes("node_content"));
      return Promise.resolve(JSON.stringify({
        verdicts: [{ path: "$.scope_analysis.finding", verdict: "approve", reason: "clearer" }],
      }));
    },
  });
  assert(!criticUser.includes("never shown"));
  assert(!criticUser.includes("_meta"));
  assertEquals(tel.spliced, 1);
  assertEquals(tel.critic_findings, 1);
  assertEquals(tel.findings_log.length, 1);
  assertEquals(tel.findings_log[0].path, "$.scope_analysis.finding");
  assertEquals(tel.spliced_paths, ["$.scope_analysis.finding"]);
  assertEquals(tel.enabled, true);
  assertEquals(tel.protected_rejected.count, 0);
  assertEquals(
    tel.spliced + tel.verifier_rejected + tel.protected_rejected.count +
      tel.quote_drift + tel.cap_overflow + tel.omission_unanchored,
    tel.critic_findings,
  );
});

Deno.test("ITEM 395 — impossible proposals are killed before the verifier call", async () => {
  let verifierCalled = false;
  const report = { ...DOC(), scope_analysis: { finding: "Original prose that must survive.", conclusion: "in_scope" } };
  const tel = await runAdmtRefinement(report as any, {}, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [
          finding("$.scope_analysis.conclusion", "in_scope", "out_of_scope"), // protected leaf
          finding("$.scope_analysis.finding", "text that is not there", "x"), // quote drift
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
});

Deno.test("ITEM 395 — the disabled flag returns empty telemetry and touches nothing", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const tel = await runAdmtRefinement(report as any, {}, {
    critic: () => Promise.reject(new Error("must not be called")),
    verifier: () => Promise.reject(new Error("must not be called")),
  }, { enabled: false });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.enabled, false);
  assertEquals(tel.spliced, 0);
});
