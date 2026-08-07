// ITEM 386 LEG 3 — LIA REFINEMENT WIRING.
//
// The shared engine (refinement-core.ts) is untouched; these tests assert the
// LIA CONFIG consumes it with every invariant the DPIA and cppa-risk configs
// carry, and that the protected-leaf classes enumerated in
// lia-refinement-config.ts are refused by the deterministic splicer.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LIA_REFINEMENT_CONFIG,
  LIA_REFINEMENT_VERSION,
  LIA_CRITIC_SYSTEM_PROMPT,
  LIA_VERIFIER_SYSTEM_PROMPT,
  applyLiaSplices,
  isLiaProtectedPath,
  liaProtectedReason,
  runLiaRefinement,
} from "../../../supabase/functions/_shared/ltp/lia-refinement.ts";
import {
  LIA_PROTECTED_LEAF_CLASSES,
  LIA_PROTECTED_SECTION_IDS,
  LIA_WATCH_CLASSES,
} from "../../../supabase/functions/_shared/ltp/lia-refinement-config.ts";
import {
  CRITIC_PROMPT_BASE,
  MAX_SPLICES,
  VERIFIER_PROMPT_BASE,
  type CriticFinding,
} from "../../../supabase/functions/_shared/ltp/refinement-core.ts";
import { DPIA_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/dpia-refinement.ts";
import { RISK_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/risk-refinement.ts";
import { LIA_SECTION_SPECS, LIA_PIPELINE_STAMP } from "../../../supabase/functions/_shared/prose/plans/lia.spine.ts";

const finding = (path: string, quote: string, replacement: string): CriticFinding => ({
  path,
  quote,
  class: "generic-boilerplate",
  anchor: "$.intake.processing_description",
  replacement,
  confidence: "high",
});

// ── 1. Config invariants ─────────────────────────────────────────────────────

Deno.test("ITEM 386 — the LIA config is the shared core with a product block", () => {
  assertEquals(LIA_REFINEMENT_CONFIG.product, "lia");
  assertEquals(LIA_REFINEMENT_CONFIG.version, LIA_REFINEMENT_VERSION);
  assert(LIA_CRITIC_SYSTEM_PROMPT.startsWith(CRITIC_PROMPT_BASE));
  assert(LIA_VERIFIER_SYSTEM_PROMPT.startsWith(VERIFIER_PROMPT_BASE));
  // The mined leg-2 watchlist, W1..W7, is what the critic actually receives.
  for (const w of LIA_WATCH_CLASSES) assert(LIA_CRITIC_SYSTEM_PROMPT.includes(`${w.id} `), w.id);
  assert(LIA_VERIFIER_SYSTEM_PROMPT.includes("xp-lia-1"));
  assert(LIA_VERIFIER_SYSTEM_PROMPT.includes("xp-lia-2"));
  // The necessity condition and the 12-cap are inherited, not re-declared.
  assert(VERIFIER_PROMPT_BASE.includes('REJECT with reason "necessity"'));
  assertEquals(MAX_SPLICES, 12);
});

Deno.test("ITEM 386 — the LIA config does not disturb the DPIA or risk configs", () => {
  assertEquals(DPIA_REFINEMENT_CONFIG.product, "dpia");
  assertEquals(RISK_REFINEMENT_CONFIG.product, "cppa-risk");
  assert(LIA_REFINEMENT_CONFIG.criticSystemPrompt !== DPIA_REFINEMENT_CONFIG.criticSystemPrompt);
  assert(LIA_REFINEMENT_CONFIG.criticSystemPrompt !== RISK_REFINEMENT_CONFIG.criticSystemPrompt);
});

Deno.test("ITEM 386 — the protected section-id class is the item382 spine, exactly", () => {
  assertEquals([...LIA_PROTECTED_SECTION_IDS], LIA_SECTION_SPECS.map((s) => s.id));
  assertEquals(LIA_PIPELINE_STAMP, "lia-pipeline@item399-2026-08-07");
});

// ── 2. Splicer refusal, per protected class ──────────────────────────────────

Deno.test("ITEM 386 — the splicer refuses every enumerated protected leaf class", () => {
  for (const [cls, keys] of Object.entries(LIA_PROTECTED_LEAF_CLASSES)) {
    for (const key of keys) {
      const path = `$.probe.${key}`;
      assert(isLiaProtectedPath(path), `${cls}/${key} must be protected`);
      assertEquals(liaProtectedReason(path), key, `${cls}/${key} reason`);
      const report: Record<string, unknown> = { probe: { [key]: "ORIGINAL VALUE" } };
      const res = applyLiaSplices(report, [finding(path, "ORIGINAL", "REWRITTEN")]);
      assertEquals(res.spliced, 0, `${cls}/${key} spliced`);
      assertEquals(res.protected_rejected.length, 1);
      assertEquals((report.probe as Record<string, unknown>)[key], "ORIGINAL VALUE");
    }
  }
});

Deno.test("ITEM 386 — BARRED-LEAF CANARY: _meta and the protected roots are refused", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { note: "internal telemetry" } },
    disclaimer: "This document is not legal advice",
    authority_exhibit: { heading: "Authorities relied on" },
  };
  const res = applyLiaSplices(report, [
    finding("$._meta.internal.note", "internal", "tampered"),
    finding("$.disclaimer", "not legal advice", "is legal advice"),
    finding("$.authority_exhibit.heading", "Authorities", "Tampered"),
  ]);
  assertEquals(res.spliced, 0);
  assertEquals(res.protected_rejected.length, 3);
  assertEquals(res.protected_rejected[0].leaf_key_or_rule, "_meta_subtree");
  assertEquals((report._meta as any).internal.note, "internal telemetry");
  assertEquals(report.disclaimer, "This document is not legal advice");
});

Deno.test("ITEM 386 — DESIGNED-OUTPUT SPLICE CANARY: revisable prose splices, double-anchored", () => {
  const report: Record<string, unknown> = {
    interest_legitimacy: {
      application: "The organisation applies a generic balancing approach.",
      verdict: "supported",
    },
  };
  const ok = applyLiaSplices(report, [
    finding(
      "$.interest_legitimacy.application",
      "a generic balancing approach",
      "the recorded fraud-prevention interest against the account-flag opt-out route.",
    ),
  ]);
  assertEquals(ok.spliced, 1);
  assertEquals((report.interest_legitimacy as any).verdict, "supported");

  // Double anchor: the same proposal cannot land twice — the quote is gone.
  const again = applyLiaSplices(report, [
    finding("$.interest_legitimacy.application", "a generic balancing approach", "x"),
  ]);
  assertEquals(again.spliced, 0);
  assertEquals(again.quote_drift, 1);
});

Deno.test("ITEM 386 — the 12-cap holds for LIA", () => {
  const report: Record<string, unknown> = { rows: [] as unknown[] };
  const findings: CriticFinding[] = [];
  for (let i = 0; i < 15; i++) {
    (report.rows as unknown[]).push({ prose: `sentence ${i} original` });
    findings.push(finding(`$.rows[${i}].prose`, `sentence ${i}`, `revised ${i}`));
  }
  const res = applyLiaSplices(report, findings);
  assertEquals(res.spliced, 12);
  assert(res.capped);
  assertEquals(res.cap_overflow, 3);
});

// ── 3. Fail-open + telemetry shape ───────────────────────────────────────────

const DOC = () => ({
  _meta: { internal: { secret: "never shown" } },
  interest_legitimacy: { application: "Original prose that must survive." },
});

Deno.test("ITEM 386 — FAIL-OPEN: critic error leaves the document byte-identical", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const tel = await runLiaRefinement(report as any, { organization_name: "Acme" }, {
    critic: () => Promise.reject(new Error("boom")),
    verifier: () => Promise.reject(new Error("must not be called")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assert(String(tel.crashed).startsWith("critic_error:"));
  assertEquals(tel.version, LIA_REFINEMENT_VERSION);
});

Deno.test("ITEM 386 — FAIL-OPEN: verifier error yields zero splices, document unchanged", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const critic = () =>
    Promise.resolve(JSON.stringify({
      findings: [finding("$.interest_legitimacy.application", "Original prose", "Revised prose")],
      structural_findings: [],
    }));
  const tel = await runLiaRefinement(report as any, {}, {
    critic,
    verifier: () => Promise.reject(new Error("gpt down")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assertEquals(tel.verifier_rejected, 1);
  assert(String(tel.crashed).startsWith("verifier_error:"));
});

Deno.test("ITEM 386 — the critic never sees _meta, and telemetry carries findings_log", async () => {
  let criticUser = "";
  const report = DOC();
  const tel = await runLiaRefinement(report as any, { organization_name: "Acme" }, {
    critic: (_s, u) => {
      criticUser = u;
      return Promise.resolve(JSON.stringify({
        findings: [finding("$.interest_legitimacy.application", "Original prose", "Revised prose that is better.")],
        structural_findings: [],
      }));
    },
    verifier: (_s, u) => {
      // R3 — the verifier receives per-proposal node content.
      assert(u.includes("node_content"));
      return Promise.resolve(JSON.stringify({
        verdicts: [{ path: "$.interest_legitimacy.application", verdict: "approve", reason: "clearer" }],
      }));
    },
  });
  assert(!criticUser.includes("never shown"));
  assert(!criticUser.includes("_meta"));
  assertEquals(tel.spliced, 1);
  assertEquals(tel.critic_findings, 1);
  assertEquals(tel.findings_log.length, 1);
  assertEquals(tel.findings_log[0].path, "$.interest_legitimacy.application");
  assertEquals(tel.spliced_paths, ["$.interest_legitimacy.application"]);
  assertEquals(tel.enabled, true);
  assertEquals(tel.protected_rejected.count, 0);
  // Full bucket accounting, as the other two products.
  assertEquals(
    tel.spliced + tel.verifier_rejected + tel.protected_rejected.count +
      tel.quote_drift + tel.cap_overflow + tel.omission_unanchored,
    tel.critic_findings,
  );
});

Deno.test("ITEM 386 — impossible proposals are killed before the verifier call", async () => {
  let verifierCalled = false;
  const report = DOC();
  const tel = await runLiaRefinement(report as any, {}, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [
          finding("$.interest_legitimacy.verdict", "supported", "unsupported"), // protected leaf
          finding("$.interest_legitimacy.application", "text that is not there", "x"), // quote drift
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
