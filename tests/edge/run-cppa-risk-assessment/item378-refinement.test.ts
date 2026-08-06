// ITEM 378 — CPPA RISK REFINEMENT PASS (Deliverable 2), stubbed models.
//
// Mirrors the ratified item376/item377 DPIA suite: containment, full bucket
// accounting, protected leaves, prompt-content pins, and a canary asserting
// that a deliberately fabricated proposal is rejectable end-to-end.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  RISK_REFINEMENT_VERSION,
  RISK_CRITIC_SYSTEM_PROMPT,
  RISK_VERIFIER_SYSTEM_PROMPT,
  RISK_CRITIC_WATCHLIST,
  RISK_VERIFIER_EXEMPLARS,
  RISK_PROTECTED_LEAF_KEYS,
  riskProtectedReason,
  runRiskRefinement,
  type RefinementTelemetry,
} from "../../../supabase/functions/_shared/ltp/risk-refinement.ts";
import {
  CRITIC_PROMPT_BASE,
  VERIFIER_PROMPT_BASE,
} from "../../../supabase/functions/_shared/ltp/refinement-core.ts";
import {
  CRITIC_SYSTEM_PROMPT as DPIA_CRITIC_PROMPT,
  VERIFIER_SYSTEM_PROMPT as DPIA_VERIFIER_PROMPT,
} from "../../../supabase/functions/_shared/ltp/dpia-refinement.ts";

const stub = (payload: unknown) => () => Promise.resolve(JSON.stringify(payload));

function bucketSum(t: RefinementTelemetry): number {
  return t.spliced + t.verifier_rejected + t.protected_rejected.count + t.quote_drift + t.cap_overflow;
}

function baseReport() {
  return {
    executive_summary: "Sierra Outfitters screens store-financing applications.",
    priority_actions: [{ rank: 1, action: "Document the human-review path." }],
    activity_analytics: [{
      activity_name: "Store-financing eligibility screening",
      necessity_analysis: [{ element: "Income", necessity: "Necessary to the stated purpose" }],
      harm_causation: [{ harm_id: "A", likelihood: "Possible", severity: "Significant" }],
      safeguard_map: [{ safeguard: "MFA", safeguard_status: "Implemented and tested" }],
    }],
  };
}

Deno.test("item378 — prompts share the DPIA core and carry the risk blocks verbatim", () => {
  assert(RISK_CRITIC_SYSTEM_PROMPT.startsWith(CRITIC_PROMPT_BASE));
  assert(RISK_VERIFIER_SYSTEM_PROMPT.startsWith(VERIFIER_PROMPT_BASE));
  assertStringIncludes(RISK_CRITIC_SYSTEM_PROMPT, RISK_CRITIC_WATCHLIST);
  assertStringIncludes(RISK_VERIFIER_SYSTEM_PROMPT, RISK_VERIFIER_EXEMPLARS);
  // Byte-verbatim spot checks on the CEO-specified text.
  assertStringIncludes(
    RISK_CRITIC_WATCHLIST,
    "W1 Invented business facts: revenue figures, user counts, vendors, systems, workflows, or beneficiaries not in the intake",
  );
  assertStringIncludes(
    RISK_CRITIC_WATCHLIST,
    "W6 Generic § 7152(a)(4) recitals: benefits citations naming no benefit, no beneficiary, and no concrete outcome.",
  );
  assertStringIncludes(
    RISK_VERIFIER_EXEMPLARS,
    "the § 7152 four-value likelihood/severity enums (terseness is designed)",
  );
  assertEquals(RISK_REFINEMENT_VERSION, "refine-risk-2026-08-05-item378");
});

Deno.test("item378 — DPIA prompts are untouched by the generalisation", () => {
  // DPIA keeps its own watchlist; risk text must never leak into it.
  assertStringIncludes(DPIA_CRITIC_PROMPT, "DPIA-SPECIFIC WATCHLIST");
  assert(!DPIA_CRITIC_PROMPT.includes("W6 Generic § 7152(a)(4) recitals"));
  assertStringIncludes(DPIA_VERIFIER_PROMPT, "DESIGNED-OUTPUT PATTERNS");
  assert(!DPIA_VERIFIER_PROMPT.includes("strengthen_item_ids pointer arrays"));
});

Deno.test("item378 — risk protected leaves reject splices on structured values", () => {
  for (const k of ["rank", "likelihood", "severity", "harm", "safeguard_status", "element", "necessity"]) {
    assert(RISK_PROTECTED_LEAF_KEYS.includes(k), `missing protected leaf ${k}`);
    assertEquals(riskProtectedReason(`$.activity_analytics[0].rows[0].${k}`), k);
  }
  assertEquals(riskProtectedReason("$.executive_summary"), null);
});

Deno.test("item378 — bucket accounting: critic_findings === sum of all buckets", async () => {
  const report = baseReport();
  const findings = [
    // spliced
    { path: "$.executive_summary", quote: "Sierra Outfitters", class: "W1", anchor: "intake.entity_name", replacement: "Sierra Outfitters, Inc. screens store-financing applications.", confidence: "high" },
    // protected leaf
    { path: "$.priority_actions[0].rank", quote: "1", class: "W5", anchor: "x", replacement: "2", confidence: "high" },
    // quote drift
    { path: "$.priority_actions[0].action", quote: "NOT PRESENT", class: "W5", anchor: "x", replacement: "y", confidence: "low" },
    // verifier-rejected
    { path: "$.activity_analytics[0].activity_name", quote: "Store-financing", class: "W1", anchor: "x", replacement: "Something else", confidence: "low" },
  ];
  const tel = await runRiskRefinement(report as any, { entity_name: "Sierra Outfitters, Inc." }, {
    critic: stub({ findings }),
    verifier: stub({
      verdicts: findings.map((f, i) => ({
        path: f.path,
        verdict: i === 3 ? "reject" : "approve",
        reason: "r",
      })),
    }),
  });
  assertEquals(tel.critic_findings, 4);
  assertEquals(bucketSum(tel), 4);
  assertEquals(tel.spliced, 1);
  assertEquals(tel.protected_rejected.count, 1);
  assertEquals(tel.protected_rejected.items[0].leaf_key_or_rule, "rank");
  assertEquals(tel.quote_drift, 1);
  assertEquals(tel.verifier_rejected, 1);
  assertEquals(report.priority_actions[0].rank, 1); // structured leaf untouched
  assertEquals(tel.findings_log.length, 4);
});

Deno.test("item378 — CANARY: a fabricated-anchor proposal is rejectable end-to-end", async () => {
  const report = baseReport();
  const before = JSON.stringify(report);
  const fabricated = {
    path: "$.executive_summary",
    quote: "Sierra Outfitters screens store-financing applications.",
    class: "W1",
    anchor: "intake.a4_benefit_business (fabricated: names a vendor absent from the record)",
    replacement: "Sierra Outfitters screens store-financing applications with Acme Fraud Systems, generating $92M in incremental revenue.",
    confidence: "high",
  };
  const tel = await runRiskRefinement(report as any, { entity_name: "Sierra Outfitters, Inc." }, {
    critic: stub({ findings: [fabricated] }),
    verifier: stub({ verdicts: [{ path: fabricated.path, verdict: "reject", reason: "anchor not in the record" }] }),
  });
  assertEquals(tel.spliced, 0);
  assertEquals(tel.verifier_rejected, 1);
  assertEquals(bucketSum(tel), tel.critic_findings);
  assertEquals(JSON.stringify(report), before); // byte-identical
});

Deno.test("item378 — fail-open on critic and verifier failure", async () => {
  const report = baseReport();
  const before = JSON.stringify(report);
  const boom = () => Promise.reject(new Error("network"));

  const t1 = await runRiskRefinement(report as any, {}, { critic: boom, verifier: stub({ verdicts: [] }) });
  assertEquals(t1.spliced, 0);
  assert(String(t1.crashed).startsWith("critic_error"));

  const t2 = await runRiskRefinement(report as any, {}, {
    critic: stub({ findings: [{ path: "$.executive_summary", quote: "Sierra", class: "W1", anchor: "a", replacement: "z", confidence: "high" }] }),
    verifier: boom,
  });
  assertEquals(t2.spliced, 0);
  assertEquals(t2.verifier_rejected, 1);
  assertEquals(bucketSum(t2), t2.critic_findings);
  assertEquals(JSON.stringify(report), before);
});

Deno.test("item378 — disabled flag short-circuits the pass", async () => {
  const tel = await runRiskRefinement(baseReport() as any, {}, {
    critic: () => Promise.reject(new Error("must not be called")),
    verifier: () => Promise.reject(new Error("must not be called")),
  }, { enabled: false });
  assertEquals(tel.enabled, false);
  assertEquals(tel.version, RISK_REFINEMENT_VERSION);
});

Deno.test("item378 — refinement calls are metered (wrapper, never raw fetch)", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-cppa-risk-assessment/index.ts", import.meta.url),
  );
  assertStringIncludes(src, "run-cppa-risk-assessment:refine_critic");
  assertStringIncludes(src, "run-cppa-risk-assessment:refine_verifier");
  assertStringIncludes(src, "callAnthropicWithContinuation({");
  assertStringIncludes(src, "recordApiUsage({");
  // ITEM 378 (CORRECTION) — the stamp is now single-sourced in _shared so the
  // routed LTP finalize point writes the identical value.
  const stampSrc = await Deno.readTextFile(
    new URL("../../../supabase/functions/_shared/ltp/risk-stamp.ts", import.meta.url),
  );
  assertStringIncludes(stampSrc, 'export const RISK_PIPELINE_STAMP = "risk-pipeline@item390-2026-08-06";');
  assertStringIncludes(src, 'from "../_shared/ltp/risk-stamp.ts"');
  // The refinement module itself never calls a model directly.
  const mod = await Deno.readTextFile(
    new URL("../../../supabase/functions/_shared/ltp/risk-refinement.ts", import.meta.url),
  );
  assert(!mod.includes("fetch("), "risk-refinement.ts must not call fetch directly");
});
