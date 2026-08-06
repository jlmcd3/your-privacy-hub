// ITEM 377 — DPIA REFINEMENT v1.1. Bucket accounting, telemetry, prompts, metering.
// No live API calls: critic and verifier are stubbed callers.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  CRITIC_SYSTEM_PROMPT,
  DPIA_REFINEMENT_VERSION,
  FINDINGS_LOG_QUOTE_MAX,
  MAX_SPLICES,
  runDpiaRefinement,
  VERIFIER_SYSTEM_PROMPT,
  type RefinementTelemetry,
} from "../../../supabase/functions/_shared/ltp/dpia-refinement.ts";

const INTAKE = { organization_name: "Acme GmbH" };

function doc(): Record<string, unknown> {
  return {
    executive_summary: "The controller leverages a robust scoring engine.",
    other_prose: "A second sentence that can be spliced.",
    risk_register: [
      { risk_id: "R1", source: "Profiling of applicants.", severity: "Severe" },
    ],
    framework_disclaimer:
      "This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance.",
  };
}

function stubText(payload: unknown) {
  return () => Promise.resolve(JSON.stringify(payload));
}

function finding(path: string, quote: string, replacement: string) {
  return { path, quote, class: "record_contradiction", anchor: "organization_name", replacement, confidence: "high" };
}

function approveAll() {
  return (_s: string, u: string) => {
    const paths = [...u.matchAll(/"path"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    return Promise.resolve(JSON.stringify({
      verdicts: [...new Set(paths)].map((p) => ({ path: p, verdict: "approve", reason: "ok" })),
    }));
  };
}

function sumBuckets(t: RefinementTelemetry): number {
  return t.spliced + t.verifier_rejected + t.protected_rejected.count + t.quote_drift + t.cap_overflow;
}

Deno.test("item377 (a) — bucket accounting: critic_findings === sum of all buckets", async () => {
  const report = doc();
  const findings = [
    finding("$.executive_summary", "robust scoring engine", "The controller operates a scoring engine."),
    // protected surface (root key)
    finding("$.framework_disclaimer", "not legal advice", "tampered"),
    // quote drift (quote no longer present)
    finding("$.other_prose", "text that is absent", "irrelevant"),
    // protected leaf key
    finding("$.risk_register[0].severity", "Severe", "Moderate"),
  ];
  const tel = await runDpiaRefinement(report, INTAKE, {
    critic: stubText({ findings, structural_findings: [] }),
    verifier: approveAll(),
  });
  assertEquals(tel.critic_findings, 4);
  assertEquals(sumBuckets(tel), tel.critic_findings);
  assertEquals(tel.spliced, 1);
  assertEquals(tel.protected_rejected.count, 2);
  assertEquals(tel.quote_drift, 1);
  assertEquals(tel.cap_overflow, 0);
});

Deno.test("item377 (a2) — accounting holds on verifier failure and on cap overflow", async () => {
  const many = Array.from({ length: MAX_SPLICES + 3 }, (_, i) =>
    finding("$.executive_summary", "robust", `rewrite ${i}`));
  const tel = await runDpiaRefinement(doc(), INTAKE, {
    critic: stubText({ findings: many, structural_findings: [] }),
    verifier: () => Promise.reject(new Error("boom")),
  });
  assertEquals(tel.critic_findings, MAX_SPLICES + 3);
  assertEquals(tel.cap_overflow, 3);
  assertEquals(tel.verifier_rejected, MAX_SPLICES);
  assertEquals(sumBuckets(tel), tel.critic_findings);
  assert(tel.crashed?.startsWith("verifier_error"));
});

Deno.test("item377 (b) — protected_rejected items carry path + reason", async () => {
  const tel = await runDpiaRefinement(doc(), INTAKE, {
    critic: stubText({
      findings: [finding("$.risk_register[0].severity", "Severe", "Moderate")],
      structural_findings: [],
    }),
    verifier: approveAll(),
  });
  assertEquals(tel.protected_rejected.count, 1);
  assertEquals(tel.protected_rejected.items[0].path, "$.risk_register[0].severity");
  assertEquals(tel.protected_rejected.items[0].leaf_key_or_rule, "severity");
});

Deno.test("item377 (c) — findings_log present and quote-truncated to 160 chars", async () => {
  const long = "x".repeat(400);
  const tel = await runDpiaRefinement(doc(), INTAKE, {
    critic: stubText({
      findings: [finding("$.executive_summary", long, "y")],
      structural_findings: [],
    }),
    verifier: approveAll(),
  });
  assertEquals(tel.findings_log.length, 1);
  assertEquals(tel.findings_log[0].quote.length, FINDINGS_LOG_QUOTE_MAX);
  assertEquals(tel.findings_log[0].path, "$.executive_summary");
  assertEquals(tel.findings_log[0].class, "record_contradiction");
  assertEquals(tel.findings_log[0].confidence, "high");
});

Deno.test("item377 (d) — watchlist byte-verbatim in critic prompt", () => {
  const WATCHLIST = `DPIA-SPECIFIC WATCHLIST (from this product's verified defect history — verify each specifically; report ONLY what you actually find, with evidence; watchlist findings carry no privilege: same anchors, same verification):
W1 Invented entities: processors, vendors, technologies, certifications, or workflows not in the intake (history: invented monitoring vendors and HR-review workflows).
W2 Basis contradictions: the stated legal basis, Art. 9 condition, or Art. 35(3) trigger contradicted elsewhere in the document (history: legal_basis vs article_35_3_trigger; engagement map vs metadata).
W3 False absence: any claim that the record does not supply something the intake in fact supplies. Check the intake both ways — an absence statement about a genuinely silent record is CORRECT and must not be flagged.
W4 Leaked candidacy markers: "CANDIDATE —" or "[TO COMPLETE — …]" where the record supplies the answer. A placeholder is correct ONLY when the record is silent on that item.
W5 Interchangeable filler: near-identical stock sentences repeated across risk rows or sections where fact-specific reasoning belongs.
W6 Mis-attached citations: a real citation attached to the wrong proposition or instrument.`;
  assertStringIncludes(CRITIC_SYSTEM_PROMPT, WATCHLIST);
});

Deno.test("item377 (d2) — designed-output exemplars byte-verbatim in verifier prompt", () => {
  const BLOCK = `DESIGNED-OUTPUT PATTERNS (these are deliberate product output; a proposal altering any of them fails condition 4 and must be REJECTED): the final disclaimer; quoted statutory text; "[TO BE COMPLETED …]"/"[TO BE ASSESSED]" placeholders where the intake is silent on the item; "(default — confirm)" markers; the canonical closes "…further clarification is advisable." / "…further internal investigation is advisable."; drafting-voice references to "the record"; the EDPB DPIA template v1.0 structure and its § 0.5 assessment-team/validation fields; plain-prose FSOR/Agency-position citations; corpus-verified recent law (SB 446 notice windows; Cal. Civ. Code § 1798.140(ag); UK GDPR Art. 6(11) per the DUAA 2025). Conversely: a placeholder or absence statement covering something the intake DOES supply is NOT protected — that is a record-contradiction, and its correction should be APPROVED when conditions 1–3 hold.`;
  assertStringIncludes(VERIFIER_SYSTEM_PROMPT, BLOCK);
});

Deno.test("item377 (e) — critic call uses the metered Anthropic wrapper, not raw fetch", async () => {
  const idx = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-dpia-framework/index.ts", import.meta.url),
  );
  const start = idx.indexOf("async function refinementCriticCall");
  const end = idx.indexOf("async function refinementVerifierCall");
  assert(start > 0 && end > start, "refinement callers not found");
  const critic = idx.slice(start, end);
  assertStringIncludes(critic, "callAnthropicWithContinuation(");
  assertStringIncludes(critic, "refine_critic");
  assert(!/await fetch\(/.test(critic), "critic must not use raw fetch");
  const verifier = idx.slice(end, end + 2000);
  assertStringIncludes(verifier, "recordApiUsage(");
  assertStringIncludes(verifier, "refine_verifier");
});

Deno.test("item377 — version + pipeline stamp bumped", async () => {
  assertEquals(DPIA_REFINEMENT_VERSION, "refine-2026-08-05-item377-v1.1");
  const idx = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-dpia-framework/index.ts", import.meta.url),
  );
  assertStringIncludes(idx, `DPIA_PIPELINE_STAMP = "dpia-pipeline@item391-2026-08-06"`);
});
