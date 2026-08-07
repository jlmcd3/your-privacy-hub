// ITEM 403 LEG D — GOVERNANCE REFINEMENT WIRING.
//
// The shared engine (refinement-core.ts) is untouched; these tests assert the
// GOVERNANCE CONFIG consumes it with every invariant the DPIA, cppa-risk, LIA
// and ADMT configs carry, and that every protected-leaf class enumerated in
// governance-refinement.ts is refused by the deterministic splicer — with the
// readiness rating as the named barred-leaf canary.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  GOVERNANCE_REFINEMENT_CONFIG,
  GOVERNANCE_REFINEMENT_VERSION,
  GOVERNANCE_CRITIC_SYSTEM_PROMPT,
  GOVERNANCE_VERIFIER_SYSTEM_PROMPT,
  GOVERNANCE_PROTECTED_LEAF_CLASSES,
  GOVERNANCE_PROTECTED_SPINE_SECTION_IDS,
  GOVERNANCE_PROTECTED_LEAF_KEYS,
  GOVERNANCE_PROTECTED_ROOTS,
  GOVERNANCE_WATCH_CLASSES,
  applyGovernanceSplices,
  isGovernanceProtectedPath,
  governanceProtectedReason,
  runGovernanceRefinement,
} from "../../../supabase/functions/_shared/ltp/governance-refinement.ts";
import {
  GOVERNANCE_PROTECTED_ROOT_KEYS,
  GOVERNANCE_PROTECTED_LEAF_KEYS as CONFIG_LEAF_KEYS,
  GOVERNANCE_REFINEMENT_CONFIG_VERSION,
} from "../../../supabase/functions/_shared/ltp/governance-refinement-config.ts";
import {
  CRITIC_PROMPT_BASE,
  MAX_SPLICES,
  VERIFIER_PROMPT_BASE,
  type CriticFinding,
} from "../../../supabase/functions/_shared/ltp/refinement-core.ts";
import { DPIA_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/dpia-refinement.ts";
import { RISK_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/risk-refinement.ts";
import { LIA_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/lia-refinement.ts";
import { ADMT_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/admt-refinement.ts";
import {
  GOVERNANCE_SECTION_SPECS,
  GOVERNANCE_PIPELINE_STAMP,
} from "../../../supabase/functions/_shared/prose/plans/governance.spine.ts";

const finding = (path: string, quote: string, replacement: string): CriticFinding => ({
  path,
  quote,
  class: "generic-boilerplate",
  anchor: "$.intake.additional_context",
  replacement,
  confidence: "high",
});

// ── 1. Config invariants ─────────────────────────────────────────────────────

Deno.test("ITEM 403 — the governance config is the shared core with a product block", () => {
  assertEquals(GOVERNANCE_REFINEMENT_CONFIG.product, "governance");
  assertEquals(GOVERNANCE_REFINEMENT_CONFIG.version, GOVERNANCE_REFINEMENT_VERSION);
  assert(GOVERNANCE_CRITIC_SYSTEM_PROMPT.startsWith(CRITIC_PROMPT_BASE));
  assert(GOVERNANCE_VERIFIER_SYSTEM_PROMPT.startsWith(VERIFIER_PROMPT_BASE));
  for (const w of GOVERNANCE_WATCH_CLASSES) {
    assert(GOVERNANCE_CRITIC_SYSTEM_PROMPT.includes(`${w.id} `), w.id);
  }
  assert(GOVERNANCE_CRITIC_SYSTEM_PROMPT.includes("W-COPYEDIT"));
  assert(GOVERNANCE_VERIFIER_SYSTEM_PROMPT.includes("xp-gov-1"));
  assert(GOVERNANCE_VERIFIER_SYSTEM_PROMPT.includes("xp-gov-4"));
  assert(VERIFIER_PROMPT_BASE.includes('REJECT with reason "necessity"'));
  assertEquals(MAX_SPLICES, 12);
  assertEquals(
    GOVERNANCE_REFINEMENT_CONFIG_VERSION,
    "governance-refine-config-2026-08-07-item402",
  );
});

Deno.test("ITEM 403 — the governance config does not disturb the other four configs", () => {
  assertEquals(DPIA_REFINEMENT_CONFIG.product, "dpia");
  assertEquals(RISK_REFINEMENT_CONFIG.product, "cppa-risk");
  assertEquals(LIA_REFINEMENT_CONFIG.product, "lia");
  assertEquals(ADMT_REFINEMENT_CONFIG.product, "cppa-admt");
  for (
    const other of [
      DPIA_REFINEMENT_CONFIG,
      RISK_REFINEMENT_CONFIG,
      LIA_REFINEMENT_CONFIG,
      ADMT_REFINEMENT_CONFIG,
    ]
  ) {
    assert(GOVERNANCE_REFINEMENT_CONFIG.criticSystemPrompt !== other.criticSystemPrompt);
    assert(GOVERNANCE_REFINEMENT_CONFIG.verifierSystemPrompt !== other.verifierSystemPrompt);
  }
});

Deno.test("ITEM 403 — leg C is never narrowed; the spine class is computed; stamp pinned", () => {
  for (const k of CONFIG_LEAF_KEYS) assert(GOVERNANCE_PROTECTED_LEAF_KEYS.includes(k), k);
  for (const k of GOVERNANCE_PROTECTED_ROOT_KEYS) assert(GOVERNANCE_PROTECTED_ROOTS.includes(k), k);
  assertEquals(
    [...GOVERNANCE_PROTECTED_SPINE_SECTION_IDS],
    GOVERNANCE_SECTION_SPECS.map((s) => s.id),
  );
  assertEquals(GOVERNANCE_PIPELINE_STAMP, "governance-pipeline@item403-2026-08-07");
});

// ── 2. Splicer refusal, per protected class ──────────────────────────────────

Deno.test("ITEM 403 — the splicer refuses every enumerated protected leaf class", () => {
  const classes = Object.keys(GOVERNANCE_PROTECTED_LEAF_CLASSES);
  assertEquals(classes.length, 7);
  for (const [cls, keys] of Object.entries(GOVERNANCE_PROTECTED_LEAF_CLASSES)) {
    assert((keys as readonly string[]).length > 0, `${cls} empty`);
    for (const key of keys as readonly string[]) {
      const path = `$.probe.${key}`;
      assert(isGovernanceProtectedPath(path), `${cls}/${key} must be protected`);
      assertEquals(governanceProtectedReason(path), key, `${cls}/${key} reason`);
      const report: Record<string, unknown> = { probe: { [key]: "ORIGINAL VALUE" } };
      const res = applyGovernanceSplices(report, [finding(path, "ORIGINAL", "REWRITTEN")]);
      assertEquals(res.spliced, 0, `${cls}/${key} spliced`);
      assertEquals(res.protected_rejected.length, 1);
      assertEquals((report.probe as Record<string, unknown>)[key], "ORIGINAL VALUE");
    }
  }
});

Deno.test("ITEM 403 — BARRED-LEAF CANARY: readiness_determination.rating cannot be reworded", () => {
  const report: Record<string, unknown> = {
    readiness_determination: {
      rating: "Accountability partly evidenced",
      rating_basis:
        'The accountability determination is "partly evidenced" and no determination read alongside it is adverse.',
      determined_from: ["accountability_determination:partly_evidenced"],
    },
    governance_readiness_line: "Accountability partly evidenced",
  };
  const before = JSON.stringify(report);
  const res = applyGovernanceSplices(report, [
    finding("$.readiness_determination.rating", "partly evidenced", "substantially evidenced"),
    finding("$.readiness_determination.rating_basis", "no determination", "several determinations"),
    finding("$.readiness_determination.determined_from[0]", "partly_evidenced", "evidenced"),
    finding("$.governance_readiness_line", "partly evidenced", "fully evidenced"),
  ]);
  assertEquals(res.spliced, 0);
  assertEquals(res.protected_rejected.length, 4);
  assertEquals(JSON.stringify(report), before);
  assertEquals(
    res.protected_rejected[0].leaf_key_or_rule,
    "readiness_determination",
  );
});

Deno.test("ITEM 403 — BARRED-LEAF CANARY: _meta, disclaimer, determinations and authorities", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { note: "internal telemetry" } },
    disclaimer: "This document is not legal advice",
    authority_exhibit: { heading: "Authorities relied on" },
    accountability_determination: { verdict: "partly_evidenced", reasoning: "Original reasoning." },
    domain_findings: [{ citation: "UK GDPR Art. 30(1)(a)" }],
  };
  const res = applyGovernanceSplices(report, [
    finding("$._meta.internal.note", "internal", "tampered"),
    finding("$.disclaimer", "not legal advice", "is legal advice"),
    finding("$.authority_exhibit.heading", "Authorities", "Tampered"),
    finding("$.accountability_determination.reasoning", "Original reasoning", "Rewritten"),
    finding("$.domain_findings[0].citation", "Art. 30(1)(a)", "Art. 30"),
  ]);
  assertEquals(res.spliced, 0);
  assertEquals(res.protected_rejected.length, 5);
  assertEquals(res.protected_rejected[0].leaf_key_or_rule, "_meta_subtree");
  assertEquals((report._meta as any).internal.note, "internal telemetry");
  assertEquals(report.disclaimer, "This document is not legal advice");
  assertEquals((report.accountability_determination as any).reasoning, "Original reasoning.");
});

Deno.test("ITEM 403 — DESIGNED-OUTPUT SPLICE CANARY: revisable prose splices, double-anchored", () => {
  const report: Record<string, unknown> = {
    domain_findings: [{
      finding: "The organisation maintains records of processing activities.",
      severity: "Medium",
    }],
  };
  const ok = applyGovernanceSplices(report, [
    finding(
      "$.domain_findings[0].finding",
      "maintains records of processing activities",
      "maintains an Art. 30 record in the named inventory tool, last reviewed 12 March 2026.",
    ),
  ]);
  assertEquals(ok.spliced, 1);
  assertEquals((report.domain_findings as any)[0].severity, "Medium");

  const again = applyGovernanceSplices(report, [
    finding("$.domain_findings[0].finding", "maintains records of processing activities", "x"),
  ]);
  assertEquals(again.spliced, 0);
  assertEquals(again.quote_drift, 1);
});

Deno.test("ITEM 403 — the 12-cap holds for governance", () => {
  const report: Record<string, unknown> = { rows: [] as unknown[] };
  const findings: CriticFinding[] = [];
  for (let i = 0; i < 15; i++) {
    (report.rows as unknown[]).push({ prose: `sentence ${i} original` });
    findings.push(finding(`$.rows[${i}].prose`, `sentence ${i}`, `revised ${i}`));
  }
  const res = applyGovernanceSplices(report, findings);
  assertEquals(res.spliced, 12);
  assert(res.capped);
  assertEquals(res.cap_overflow, 3);
});

// ── 3. Fail-open + telemetry shape ───────────────────────────────────────────

const DOC = () => ({
  _meta: { internal: { secret: "never shown" } },
  domain_findings: [{ finding: "Original prose that must survive." }],
});

Deno.test("ITEM 403 — FAIL-OPEN: critic error leaves the document byte-identical", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const tel = await runGovernanceRefinement(report as any, { organisation_name: "Acme" }, {
    critic: () => Promise.reject(new Error("boom")),
    verifier: () => Promise.reject(new Error("must not be called")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assert(String(tel.crashed).startsWith("critic_error:"));
  assertEquals(tel.version, GOVERNANCE_REFINEMENT_VERSION);
});

Deno.test("ITEM 403 — FAIL-OPEN: verifier error yields zero splices, document unchanged", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const critic = () =>
    Promise.resolve(JSON.stringify({
      findings: [finding("$.domain_findings[0].finding", "Original prose", "Revised prose")],
      structural_findings: [],
    }));
  const tel = await runGovernanceRefinement(report as any, {}, {
    critic,
    verifier: () => Promise.reject(new Error("gpt down")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assertEquals(tel.verifier_rejected, 1);
  assert(String(tel.crashed).startsWith("verifier_error:"));
});

Deno.test("ITEM 403 — the critic never sees _meta, and telemetry carries findings_log", async () => {
  let criticUser = "";
  const report = DOC();
  const tel = await runGovernanceRefinement(report as any, { organisation_name: "Acme" }, {
    critic: (_s, u) => {
      criticUser = u;
      return Promise.resolve(JSON.stringify({
        findings: [
          finding("$.domain_findings[0].finding", "Original prose", "Revised prose that is better."),
        ],
        structural_findings: [],
      }));
    },
    verifier: (_s, u) => {
      assert(u.includes("node_content"));
      return Promise.resolve(JSON.stringify({
        verdicts: [{ path: "$.domain_findings[0].finding", verdict: "approve", reason: "clearer" }],
      }));
    },
  });
  assert(!criticUser.includes("never shown"));
  assert(!criticUser.includes("_meta"));
  assertEquals(tel.spliced, 1);
  assertEquals(tel.critic_findings, 1);
  assertEquals(tel.findings_log.length, 1);
  assertEquals(tel.findings_log[0].path, "$.domain_findings[0].finding");
  assertEquals(tel.spliced_paths, ["$.domain_findings[0].finding"]);
  assertEquals(tel.enabled, true);
  assertEquals(tel.protected_rejected.count, 0);
  assertEquals(
    tel.spliced + tel.verifier_rejected + tel.protected_rejected.count +
      tel.quote_drift + tel.cap_overflow + tel.omission_unanchored,
    tel.critic_findings,
  );
});

Deno.test("ITEM 403 — impossible proposals are killed before the verifier call", async () => {
  let verifierCalled = false;
  const report = {
    ...DOC(),
    readiness_determination: { rating: "Accountability partly evidenced" },
  };
  const tel = await runGovernanceRefinement(report as any, {}, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [
          finding("$.readiness_determination.rating", "partly evidenced", "fully evidenced"),
          finding("$.domain_findings[0].finding", "text that is not there", "x"),
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
  assertEquals((report as any).readiness_determination.rating, "Accountability partly evidenced");
});

Deno.test("ITEM 403 — the disabled flag returns empty telemetry and touches nothing", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const tel = await runGovernanceRefinement(report as any, {}, {
    critic: () => Promise.reject(new Error("must not be called")),
    verifier: () => Promise.reject(new Error("must not be called")),
  }, { enabled: false });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.enabled, false);
  assertEquals(tel.spliced, 0);
});
