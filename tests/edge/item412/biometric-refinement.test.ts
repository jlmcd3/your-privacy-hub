// ITEM 412 LEG D — BIOMETRIC REFINEMENT WIRING.
//
// The shared engine (refinement-core.ts) is untouched; these tests assert the
// BIOMETRIC CONFIG consumes it with every invariant the DPIA, cppa-risk, LIA,
// ADMT, Governance and Cyber configs carry, and that every protected-leaf class
// enumerated in biometric-refinement.ts is refused by the deterministic
// splicer — with a VERIFIED REFERENCE PASSAGE and the four `emptyIsAnswer`
// approval fields as the named barred-leaf canaries.
//
// Identities:
//   item412 the biometric config is the shared core with a product block
//   item412 the biometric config does not disturb the other six configs
//   item412 the spine class is COMPUTED, never re-typed
//   item412 the splicer refuses every enumerated protected leaf class
//   item412 BARRED-LEAF CANARY: a verified reference passage and its citation
//   item412 BARRED-LEAF CANARY: the four emptyIsAnswer approval fields and _meta
//   item412 a reference passage is byte-identical through a FULL refinement pass
//   item412 DESIGNED-OUTPUT SPLICE CANARY: revisable prose splices, double-anchored
//   item412 the 12-cap holds for biometric
//   item412 FAIL-OPEN: critic error leaves the document byte-identical
//   item412 FAIL-OPEN: verifier error yields zero splices, document unchanged
//   item412 the critic never sees _meta, and telemetry carries findings_log
//   item412 impossible proposals are killed before the verifier call
//   item412 the disabled flag returns empty telemetry and touches nothing
//   item412 the call site wires refinement before the deterministic battery
//   item412 the deps module meters one api_usage row per call, by product
//   item412 refinement-core.ts is untouched by this leg

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BIOMETRIC_REFINEMENT_CONFIG,
  BIOMETRIC_REFINEMENT_VERSION,
  BIOMETRIC_CRITIC_SYSTEM_PROMPT,
  BIOMETRIC_VERIFIER_SYSTEM_PROMPT,
  BIOMETRIC_PROTECTED_LEAF_CLASSES,
  BIOMETRIC_PROTECTED_SPINE_SECTION_IDS,
  BIOMETRIC_PROTECTED_LEAF_KEYS,
  BIOMETRIC_PROTECTED_ROOTS,
  BIOMETRIC_WATCH_CLASSES,
  BIOMETRIC_REFINEMENT_CONFIG_VERSION,
  applyBiometricSplices,
  isBiometricProtectedPath,
  biometricProtectedReason,
  runBiometricRefinement,
} from "../../../supabase/functions/_shared/ltp/biometric-refinement.ts";
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
import { GOVERNANCE_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/governance-refinement.ts";
import { CYBER_REFINEMENT_CONFIG } from "../../../supabase/functions/_shared/ltp/cyber-refinement.ts";
import {
  BIOMETRIC_SECTION_SPECS,
  BIOMETRIC_PIPELINE_STAMP,
} from "../../../supabase/functions/_shared/prose/plans/biometric.spine.ts";
import type { ReferencePassage } from "../../../supabase/functions/_shared/prose/biometric-reference-passages.ts";

const finding = (path: string, quote: string, replacement: string): CriticFinding => ({
  path,
  quote,
  class: "generic-boilerplate",
  anchor: "$.intake.additional_context",
  replacement,
  confidence: "high",
});

/**
 * THE BARRED-LEAF CANARY. Passage-shaped bytes in the exact `ReferencePassage`
 * form the item409 layer renders onto the `standard` leaf. The assertion under
 * test is BYTE-IDENTITY through refinement, so the canary is typed to the real
 * contract and never mutated by the test.
 */
const PASSAGE: ReferencePassage = {
  id: "us_il_bipa.s15a_policy",
  corpus_key: "us_il_bipa.740_ilcs_14_15_a",
  citation: "740 ILCS 14/15(a)",
  pinpoint: "740 ILCS 14/15(a)",
  bytes:
    "A private entity in possession of biometric identifiers or biometric information must develop a written policy, made available to the public, establishing a retention schedule and guidelines for permanently destroying biometric identifiers and biometric information.",
};
const PASSAGE_TEXT = PASSAGE.bytes;

// ── 1. Config invariants ─────────────────────────────────────────────────────

Deno.test("item412 the biometric config is the shared core with a product block", () => {
  assertEquals(BIOMETRIC_REFINEMENT_CONFIG.product, "biometric");
  assertEquals(BIOMETRIC_REFINEMENT_CONFIG.version, BIOMETRIC_REFINEMENT_VERSION);
  assert(BIOMETRIC_CRITIC_SYSTEM_PROMPT.startsWith(CRITIC_PROMPT_BASE));
  assert(BIOMETRIC_VERIFIER_SYSTEM_PROMPT.startsWith(VERIFIER_PROMPT_BASE));
  for (const w of BIOMETRIC_WATCH_CLASSES) {
    assert(BIOMETRIC_CRITIC_SYSTEM_PROMPT.includes(`${w.id} `), w.id);
  }
  assertEquals(BIOMETRIC_WATCH_CLASSES.length, 8);
  assert(BIOMETRIC_CRITIC_SYSTEM_PROMPT.includes("W-COPYEDIT"));
  assert(BIOMETRIC_VERIFIER_SYSTEM_PROMPT.includes("xp-bio-1"));
  assert(BIOMETRIC_VERIFIER_SYSTEM_PROMPT.includes("xp-bio-5"));
  assert(VERIFIER_PROMPT_BASE.includes('REJECT with reason "necessity"'));
  assertEquals(MAX_SPLICES, 12);
  assertEquals(BIOMETRIC_REFINEMENT_CONFIG_VERSION, "biometric-refine-config-2026-08-08-item412");
  assertEquals(BIOMETRIC_PIPELINE_STAMP, "biometric-pipeline@item412d-2026-08-08");
});

Deno.test("item412 the biometric config does not disturb the other six configs", () => {
  assertEquals(DPIA_REFINEMENT_CONFIG.product, "dpia");
  assertEquals(RISK_REFINEMENT_CONFIG.product, "cppa-risk");
  assertEquals(LIA_REFINEMENT_CONFIG.product, "lia");
  assertEquals(ADMT_REFINEMENT_CONFIG.product, "cppa-admt");
  assertEquals(GOVERNANCE_REFINEMENT_CONFIG.product, "governance");
  assertEquals(CYBER_REFINEMENT_CONFIG.product, "cppa-cyber");
  for (
    const other of [
      DPIA_REFINEMENT_CONFIG,
      RISK_REFINEMENT_CONFIG,
      LIA_REFINEMENT_CONFIG,
      ADMT_REFINEMENT_CONFIG,
      GOVERNANCE_REFINEMENT_CONFIG,
      CYBER_REFINEMENT_CONFIG,
    ]
  ) {
    assert(BIOMETRIC_REFINEMENT_CONFIG.criticSystemPrompt !== other.criticSystemPrompt);
    assert(BIOMETRIC_REFINEMENT_CONFIG.verifierSystemPrompt !== other.verifierSystemPrompt);
  }
});

Deno.test("item412 the spine class is COMPUTED, never re-typed", () => {
  assertEquals([...BIOMETRIC_PROTECTED_SPINE_SECTION_IDS], BIOMETRIC_SECTION_SPECS.map((s) => s.id));
  for (const id of BIOMETRIC_PROTECTED_SPINE_SECTION_IDS) {
    assert(BIOMETRIC_PROTECTED_LEAF_KEYS.includes(id), id);
  }
  for (const r of BIOMETRIC_PROTECTED_ROOTS) assert(r.length > 0);
});

// ── 2. Splicer refusal, per protected class ──────────────────────────────────

Deno.test("item412 the splicer refuses every enumerated protected leaf class", () => {
  const classes = Object.keys(BIOMETRIC_PROTECTED_LEAF_CLASSES);
  assertEquals(classes.length, 8);
  for (const [cls, keys] of Object.entries(BIOMETRIC_PROTECTED_LEAF_CLASSES)) {
    assert((keys as readonly string[]).length > 0, `${cls} empty`);
    for (const key of keys as readonly string[]) {
      const path = `$.probe.${key}`;
      assert(isBiometricProtectedPath(path), `${cls}/${key} must be protected`);
      assertEquals(biometricProtectedReason(path), key, `${cls}/${key} reason`);
      const report: Record<string, unknown> = { probe: { [key]: "ORIGINAL VALUE" } };
      const res = applyBiometricSplices(report, [finding(path, "ORIGINAL", "REWRITTEN")]);
      assertEquals(res.spliced, 0, `${cls}/${key} spliced`);
      assertEquals(res.protected_rejected.length, 1);
      assertEquals((report.probe as Record<string, unknown>)[key], "ORIGINAL VALUE");
    }
  }
});

Deno.test("item412 BARRED-LEAF CANARY: a verified reference passage and its citation", () => {
  assert(PASSAGE_TEXT.length > 40, "the canary must be a real corpus passage");
  const report: Record<string, unknown> = {
    duty_findings: [{
      key: "il_bipa.15a_written_policy",
      standard: PASSAGE_TEXT,
      citation: PASSAGE.citation,
      application: "Revisable application prose sits alongside the pinned passage.",
    }],
  };
  const before = JSON.stringify(report);
  const res = applyBiometricSplices(report, [
    finding("$.duty_findings[0].standard", PASSAGE_TEXT.slice(0, 30), "Tightened statutory wording"),
    finding("$.duty_findings[0].citation", PASSAGE.citation.slice(0, 6), "a shorter cite"),
  ]);
  assertEquals(res.spliced, 0);
  assertEquals(res.protected_rejected.length, 2);
  assertEquals(JSON.stringify(report), before);
  assertEquals((report.duty_findings as any)[0].standard, PASSAGE_TEXT);
});

Deno.test("item412 BARRED-LEAF CANARY: the four emptyIsAnswer approval fields and _meta", () => {
  const report: Record<string, unknown> = {
    _meta: { internal: { secret: "internal telemetry" } },
    attestation: {
      approved_by_name: null,
      approved_by_title: null,
      approval_date: null,
      next_review_due: null,
      statement: "The record does not name an approver, so this assessment is unapproved.",
    },
    disclaimer: "This document is not legal advice",
    identifier_characterizations: [{ verdict: "is_a_biometric_identifier" }],
  };
  const res = applyBiometricSplices(report, [
    finding("$._meta.internal.secret", "internal", "tampered"),
    finding("$.attestation.statement", "does not name an approver", "was approved by the HR lead"),
    finding("$.attestation.approved_by_name", "", "Dana Whitfield"),
    finding("$.disclaimer", "not legal advice", "is legal advice"),
    finding("$.identifier_characterizations[0].verdict", "is_a", "is_not_a"),
  ]);
  assertEquals(res.spliced, 0);
  assertEquals(res.protected_rejected.length, 5);
  assertEquals(res.protected_rejected[0].leaf_key_or_rule, "_meta_subtree");
  assertEquals((report.attestation as any).approved_by_name, null);
  assert(String((report.attestation as any).statement).includes("does not name an approver"));
});

Deno.test("item412 a reference passage is byte-identical through a FULL refinement pass", async () => {
  const report: Record<string, unknown> = {
    duty_findings: [{
      key: "il_bipa.15b_informed_consent",
      standard: PASSAGE_TEXT,
      citation: PASSAGE.citation,
      application: "The record shows a release executed before collection.",
    }],
  };
  const tel = await runBiometricRefinement(report, { orgName: "Cascade Ridge" }, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [
          finding("$.duty_findings[0].standard", PASSAGE_TEXT.slice(0, 24), "REWRITTEN PASSAGE"),
          finding(
            "$.duty_findings[0].application",
            "shows a release executed before collection",
            "shows a standalone written release signed before the first fingerprint capture.",
          ),
        ],
        structural_findings: [],
      })),
    verifier: () =>
      Promise.resolve(JSON.stringify({
        verdicts: [
          { path: "$.duty_findings[0].standard", verdict: "approve", reason: "clearer" },
          { path: "$.duty_findings[0].application", verdict: "approve", reason: "specific" },
        ],
      })),
  });
  // The passage never reaches the verifier — it is killed deterministically.
  assertEquals((report.duty_findings as any)[0].standard, PASSAGE_TEXT);
  assertEquals((report.duty_findings as any)[0].citation, PASSAGE.citation);
  assertEquals(tel.protected_rejected.count, 1);
  assertEquals(tel.spliced, 1);
});

Deno.test("item412 DESIGNED-OUTPUT SPLICE CANARY: revisable prose splices, double-anchored", () => {
  const report: Record<string, unknown> = {
    duty_findings: [{
      application: "The record shows written notice given before collection.",
      verdict: "met",
    }],
  };
  const ok = applyBiometricSplices(report, [
    finding(
      "$.duty_findings[0].application",
      "shows written notice given before collection",
      "shows written notice given to each employee before the first fingerprint capture, in the enrolment packet the record describes.",
    ),
  ]);
  assertEquals(ok.spliced, 1);
  assertEquals((report.duty_findings as any)[0].verdict, "met");

  const again = applyBiometricSplices(report, [
    finding("$.duty_findings[0].application", "shows written notice given before collection", "x"),
  ]);
  assertEquals(again.spliced, 0);
  assertEquals(again.quote_drift, 1);
});

Deno.test("item412 the 12-cap holds for biometric", () => {
  const report: Record<string, unknown> = { rows: [] as unknown[] };
  const findings: CriticFinding[] = [];
  for (let i = 0; i < 15; i++) {
    (report.rows as unknown[]).push({ prose: `sentence ${i} original` });
    findings.push(finding(`$.rows[${i}].prose`, `sentence ${i}`, `revised ${i}`));
  }
  const res = applyBiometricSplices(report, findings);
  assertEquals(res.spliced, 12);
  assert(res.capped);
  assertEquals(res.cap_overflow, 3);
});

// ── 3. Fail-open + telemetry shape ───────────────────────────────────────────

const DOC = () => ({
  _meta: { internal: { secret: "never shown" } },
  duty_findings: [{ application: "Original prose that must survive." }],
});

Deno.test("item412 FAIL-OPEN: critic error leaves the document byte-identical", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const tel = await runBiometricRefinement(report as any, { orgName: "Acme" }, {
    critic: () => Promise.reject(new Error("boom")),
    verifier: () => Promise.reject(new Error("must not be called")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assert(String(tel.crashed).startsWith("critic_error:"));
  assertEquals(tel.version, BIOMETRIC_REFINEMENT_VERSION);
});

Deno.test("item412 FAIL-OPEN: verifier error yields zero splices, document unchanged", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const critic = () =>
    Promise.resolve(JSON.stringify({
      findings: [finding("$.duty_findings[0].application", "Original prose", "Revised prose")],
      structural_findings: [],
    }));
  const tel = await runBiometricRefinement(report as any, {}, {
    critic,
    verifier: () => Promise.reject(new Error("gpt down")),
  });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.spliced, 0);
  assertEquals(tel.verifier_rejected, 1);
  assert(String(tel.crashed).startsWith("verifier_error:"));
});

Deno.test("item412 the critic never sees _meta, and telemetry carries findings_log", async () => {
  let criticUser = "";
  const report = DOC();
  const tel = await runBiometricRefinement(report as any, { orgName: "Acme" }, {
    critic: (_s, u) => {
      criticUser = u;
      return Promise.resolve(JSON.stringify({
        findings: [
          finding("$.duty_findings[0].application", "Original prose", "Revised prose that is better."),
        ],
        structural_findings: [],
      }));
    },
    verifier: (_s, u) => {
      assert(u.includes("node_content"));
      return Promise.resolve(JSON.stringify({
        verdicts: [{ path: "$.duty_findings[0].application", verdict: "approve", reason: "clearer" }],
      }));
    },
  });
  assert(!criticUser.includes("never shown"));
  assert(!criticUser.includes("_meta"));
  assertEquals(tel.spliced, 1);
  assertEquals(tel.critic_findings, 1);
  assertEquals(tel.findings_log.length, 1);
  assertEquals(tel.spliced_paths, ["$.duty_findings[0].application"]);
  assertEquals(tel.enabled, true);
  assertEquals(tel.protected_rejected.count, 0);
  assertEquals(
    tel.spliced + tel.verifier_rejected + tel.protected_rejected.count +
      tel.quote_drift + tel.cap_overflow + tel.omission_unanchored,
    tel.critic_findings,
  );
});

Deno.test("item412 impossible proposals are killed before the verifier call", async () => {
  let verifierCalled = false;
  const report = {
    ...DOC(),
    duty_findings: [{ application: "Original prose that must survive.", verdict: "not_met" }],
  };
  const tel = await runBiometricRefinement(report as any, {}, {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [
          finding("$.duty_findings[0].verdict", "not_met", "met"),
          finding("$.duty_findings[0].application", "text that is not there", "x"),
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
  assertEquals((report as any).duty_findings[0].verdict, "not_met");
});

Deno.test("item412 the disabled flag returns empty telemetry and touches nothing", async () => {
  const report = DOC();
  const before = JSON.stringify(report);
  const tel = await runBiometricRefinement(report as any, {}, {
    critic: () => Promise.reject(new Error("must not be called")),
    verifier: () => Promise.reject(new Error("must not be called")),
  }, { enabled: false });
  assertEquals(JSON.stringify(report), before);
  assertEquals(tel.enabled, false);
  assertEquals(tel.spliced, 0);
});

// ── 4. Call-site wiring ──────────────────────────────────────────────────────

Deno.test("item412 the call site wires refinement before the deterministic battery", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/check-biometric-compliance/index.ts", import.meta.url),
  );
  const iRefine = src.indexOf("runBiometricRefinement(");
  const iGold = src.indexOf("applyBiometricProseGold(");
  const iLint = src.indexOf("lintAssembledProse({");
  const iCsc = src.indexOf("attachBiometricCsc(");
  const iCov = src.indexOf('"biometric_coverage"');
  const iGate = src.indexOf("computeRecordComplete({");
  assert(iRefine > 0 && iGold > 0 && iLint > 0 && iCsc > 0 && iCov > 0 && iGate > 0);
  assert(iRefine < iGold, "refinement before prose gold");
  assert(iGold < iLint && iLint < iCsc && iCsc < iCov && iCov < iGate, "battery order");
  // RESURRECTION-BUG CLASS — the model is resolved at the call site and passed
  // explicitly into the deps.
  assert(src.includes("const refineModel = currentGenerationModel();"));
  assert(
    src.includes(
      "makeBiometricRefinementDeps(body.assessment_id ?? currentSourceRowId() ?? null, refineModel)",
    ),
  );
  // `assessment_text` is attached for the pass and detached immediately after.
  assert(src.includes("refineDoc.assessment_text = assessment_text;"));
  assert(src.includes("delete refineDoc.assessment_text;"));
  // Telemetry addresses.
  assert(src.includes("_rfi.biometric_refinement = refineTel;"));
  assert(src.includes("_rfi._refinement = refineTel;"));
});

Deno.test("item412 the deps module meters one api_usage row per call, by product", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/_shared/ltp/biometric-refinement-deps.ts", import.meta.url),
  );
  assert(src.includes('product: "biometric"'));
  assert(src.includes("refine_critic"));
  assert(src.includes("refine_verifier"));
  assert(src.includes("source_row_id: rowId()"));
  assert(src.includes("export const BIOMETRIC_REFINEMENT_ENABLED = true;"));
});

Deno.test("item412 refinement-core.ts is untouched by this leg", async () => {
  // Acceptance: a zero-line diff on the core. The core carries no biometric
  // token of any kind — every product-specific byte lives in its own config.
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/_shared/ltp/refinement-core.ts", import.meta.url),
  );
  assertEquals(/biometric/i.test(src), false);
  assertEquals(src.includes("export const MAX_SPLICES = 12;"), true);
});
