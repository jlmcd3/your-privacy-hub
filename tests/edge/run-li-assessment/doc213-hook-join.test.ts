// DOC 213 TRACK H2 — OFFLINE ANALOGY HOOKS. Pins `directionFor` (the
// direction matrix, hook-types.ts) and `applyLiaHooks` (the hook join,
// hook-join.ts) against hand-built `AuthorityHook`/`TypedStateBag` fixtures,
// plus the wiring in `lia-persuasive-authority.ts` and the byte content of
// the three `[RATIFY]` blocks in `lia-hooks.ts`.
//
// `LIA_HOOKS` ships `[]` in production (doc 213 §3's first batch has not
// run) — every fixture hook below is injected directly through
// `applyLiaHooks`'s `hooks` parameter, never through `LIA_HOOKS` itself,
// the same discipline doc207-rule-pass.test.ts already uses for `LIA_RULES`.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  directionFor,
  type AuthorityHook,
  type HookPosture,
  type HookSettledness,
} from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import {
  applyLiaHooks,
  LIA_HOOKS_FACTOR_CAP,
  LIA_HOOKS_REPORT_CAP,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/hook-join.ts";
import {
  LIA_ATOM_PHRASES,
  LIA_HOOK_DIRECTION_MATRIX,
  LIA_HOOK_SHAPES,
  LIA_HOOKS,
  LIA_HOOKS_VERSION,
} from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts";
import { buildLiaPersuasiveAuthority } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-persuasive-authority.ts";
import { buildLiaRuleStates } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-states.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";

type Bag = Record<string, unknown>;

// ── Fixtures ─────────────────────────────────────────────────────────────

function baseStates(overrides: Partial<TypedStateBag> = {}): TypedStateBag {
  return {
    instrument: "EU GDPR",
    use_case_class: "fraud_prevention",
    relationship: "customer",
    data_categories: ["Contact data"],
    flags: [],
    verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" },
    states: {},
    ...overrides,
  };
}

function makeHook(overrides: Partial<AuthorityHook> & { hook_id: string }): AuthorityHook {
  return {
    profile_id: "profile-test",
    source_row_id: "row-test",
    fact_atoms: ["class:fraud_prevention"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    finding_span: "the balancing test failed on these facts",
    fact_pattern_paraphrase: "a controller processed personal data for fraud prevention",
    finding_paraphrase: "the balancing test could not be met",
    settledness: "R1",
    posture: "rejected",
    factor_id: "Balancing of interests, rights and freedoms",
    bears_on_element: "balancing",
    authority_label: "Test DPA, Test Matter, decision of 1 January 2024",
    regulator: "Test DPA",
    ...overrides,
  };
}

// ── directionFor — exhaustively, one case per matrix row (doc 213 §4) ───

Deno.test("directionFor — accepted: same -> S1 for any verdict/settledness; different/unknown -> omit", () => {
  for (const verdict of ["passes", "fails", "uncertain", null]) {
    for (const settledness of ["R1", "R2", "R3"] as const) {
      assertEquals(directionFor("accepted", "same", verdict, settledness), { shape: "S1" });
    }
  }
  assertEquals(directionFor("accepted", "different", "passes", "R1"), { omit: true });
  assertEquals(directionFor("accepted", "unknown", "passes", "R1"), { omit: true });
});

Deno.test("directionFor — rejected/conditional + same: fails/uncertain -> S2; passes/likely_passes -> omit(rule_missing)", () => {
  for (const posture of ["rejected", "conditional"] as const) {
    for (const verdict of ["fails", "uncertain", "likely_fails"]) {
      assertEquals(directionFor(posture, "same", verdict, "R1"), { shape: "S2" });
    }
    for (const verdict of ["passes", "likely_passes"]) {
      assertEquals(directionFor(posture, "same", verdict, "R1"), { omit: true, reason: "rule_missing" });
    }
  }
});

Deno.test("directionFor — rejected/conditional + different -> S3 for any verdict; + unknown -> omit", () => {
  for (const posture of ["rejected", "conditional"] as const) {
    for (const verdict of ["passes", "fails", "uncertain", null]) {
      assertEquals(directionFor(posture, "different", verdict, "R1"), { shape: "S3" });
    }
    assertEquals(directionFor(posture, "unknown", "fails", "R1"), { omit: true });
  }
});

Deno.test("directionFor — settledness R4 overrides posture: same/different -> S4; unknown -> omit", () => {
  const postures: readonly HookPosture[] = ["accepted", "conditional", "rejected", "contested"];
  for (const posture of postures) {
    assertEquals(directionFor(posture, "same", "passes", "R4"), { shape: "S4" });
    assertEquals(directionFor(posture, "different", "fails", "R4"), { shape: "S4" });
    assertEquals(directionFor(posture, "unknown", "fails", "R4"), { omit: true });
  }
});

Deno.test("directionFor — required_atoms nomination is the caller's job, not this function's: it is never called for a not-nominated hook (documented, not exercised here)", () => {
  // The "any | required_atoms not all held | not nominated" matrix row is
  // handled entirely in applyLiaHooks, upstream of directionFor — see the
  // hook-join.ts tests below for that row.
  assert(true);
});

Deno.test("directionFor — a contested posture without R4 settledness is not a matrix row: omits rather than guessing", () => {
  assertEquals(directionFor("contested", "same", "passes", "R1"), { omit: true });
  assertEquals(directionFor("contested", "different", "fails", "R2"), { omit: true });
});

// ── applyLiaHooks — nomination, fact agreement, rendering ───────────────

Deno.test("applyLiaHooks — not nominated (required_atoms not all held): no application, no flag", () => {
  const hook = makeHook({
    hook_id: "test/not-nominated",
    required_atoms: ["class:behavioral_advertising"],
  });
  const states = baseStates({ use_case_class: "fraud_prevention" });
  const result = applyLiaHooks([hook], states, states.verdicts, [], new Set());
  assertEquals(result.applications, []);
  assertEquals(result.flags, []);
});

Deno.test("applyLiaHooks — a source already cited as determinative suppresses its hook silently", () => {
  const hook = makeHook({ hook_id: "test/suppressed", source_row_id: "det-row", posture: "accepted" });
  const states = baseStates({ use_case_class: "fraud_prevention" });
  const result = applyLiaHooks([hook], states, states.verdicts, [], new Set(["det-row"]));
  assertEquals(result.applications, []);
  assertEquals(result.flags, []);
});

Deno.test("applyLiaHooks — accepted + same facts renders S1 with every slot resolved", () => {
  const hook = makeHook({
    hook_id: "test/s1",
    posture: "accepted",
    bears_on_element: "purpose",
    factor_id: "Interest legitimacy",
    fact_atoms: ["class:fraud_prevention"],
  });
  const states = baseStates({ use_case_class: "fraud_prevention" });
  const result = applyLiaHooks([hook], states, states.verdicts, [], new Set());
  assertEquals(result.flags, []);
  assertEquals(result.applications.length, 1);
  const app = result.applications[0];
  assertEquals(app.shape, "S1");
  assertEquals(app.fact_agreement, "same");
  assert(app.sentence.includes("its processing is carried out for fraud prevention"));
  assert(app.sentence.startsWith("The company has stated that"));
  assert(!/\{[a-z_]+\}/.test(app.sentence), app.sentence);
});

// ── The LinkedIn case (doc 213 §6) ───────────────────────────────────────

Deno.test("applyLiaHooks — LinkedIn case: required_atoms gates nomination; the opt-out distinguishing atom controls S3 vs omit(rule_missing)", () => {
  const linkedInHook = makeHook({
    hook_id: "test/linkedin",
    posture: "rejected",
    settledness: "R1",
    bears_on_element: "balancing",
    factor_id: "Balancing of interests, rights and freedoms",
    fact_atoms: ["class:behavioral_advertising"],
    distinguishing_atoms: [
      "state:intake.balancing_details.opt_out_available=Yes — unconditional, on request, with no consequence",
    ],
    required_atoms: ["class:behavioral_advertising"],
    authority_label: "DPC (Ireland), LinkedIn, decision of 22 October 2024",
    regulator: "DPC (Ireland)",
    fact_pattern_paraphrase: "a controller processed personal data for behavioural advertising without a valid legal basis",
    finding_paraphrase: "the balancing test could not be met",
  });

  // Against a fraud-prevention record: required_atoms not held -> not nominated.
  const fraudStates = baseStates({ use_case_class: "fraud_prevention" });
  const notNominated = applyLiaHooks([linkedInHook], fraudStates, fraudStates.verdicts, [], new Set());
  assertEquals(notNominated.applications, []);
  assertEquals(notNominated.flags, []);

  // With the requirement removed: behavioural-advertising + no opt-out
  // recorded -> "same" -> rejected + same + a passing balancing verdict ->
  // omit(rule_missing) ("omits otherwise").
  const hookNoRequirement: AuthorityHook = { ...linkedInHook, required_atoms: [] };
  const behavNoOptOut = baseStates({
    use_case_class: "behavioral_advertising",
    verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" },
  });
  const omitted = applyLiaHooks([hookNoRequirement], behavNoOptOut, behavNoOptOut.verdicts, [], new Set());
  assertEquals(omitted.applications, []);
  assertEquals(omitted.flags, [{ hook_id: "test/linkedin", reason: "rule_missing" }]);

  // With the opt-out distinguishing atom holding -> "different" -> S3.
  const behavWithOptOut = baseStates({
    use_case_class: "behavioral_advertising",
    verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_passes" },
    states: {
      "intake.balancing_details.opt_out_available": "Yes — unconditional, on request, with no consequence",
    },
  });
  const s3 = applyLiaHooks([hookNoRequirement], behavWithOptOut, behavWithOptOut.verdicts, [], new Set());
  assertEquals(s3.flags, []);
  assertEquals(s3.applications.length, 1);
  assertEquals(s3.applications[0].shape, "S3");
  assertEquals(s3.applications[0].fact_agreement, "different");
  assert(s3.applications[0].sentence.includes("an unconditional opt-out is available"));
});

// ── Caps: five per report, two per factor, settledness then rank order ──

Deno.test("applyLiaHooks — caps: five per report, two per factor, ordered by settledness then the ranked order given", () => {
  function acceptedHook(id: string, element: string, factorLabel: string, settledness: HookSettledness, sourceId: string): AuthorityHook {
    return makeHook({
      hook_id: id,
      posture: "accepted",
      settledness,
      bears_on_element: element,
      factor_id: factorLabel,
      fact_atoms: ["relationship:employee"],
      source_row_id: sourceId,
    });
  }
  const hooks: AuthorityHook[] = [
    acceptedHook("h1", "purpose", "Interest legitimacy", "R1", "s1"),
    acceptedHook("h2", "purpose", "Interest legitimacy", "R1", "s2"),
    acceptedHook("h3", "purpose", "Interest legitimacy", "R1", "s3"), // 3rd on "purpose" — exceeds the factor cap
    acceptedHook("h4", "necessity", "Necessity and less-intrusive means", "R2", "s4"),
    acceptedHook("h5", "necessity", "Necessity and less-intrusive means", "R2", "s5"),
    acceptedHook("h6", "balancing", "Balancing of interests, rights and freedoms", "R3", "s6"),
    acceptedHook("h7", "balancing", "Balancing of interests, rights and freedoms", "R3", "s7"), // would be the 6th application overall
  ];
  const rankedSourceIds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];
  const states = baseStates({ relationship: "employee" });
  const { applications } = applyLiaHooks(hooks, states, states.verdicts, rankedSourceIds, new Set());
  assertEquals(applications.map((a) => a.hook_id), ["h1", "h2", "h4", "h5", "h6"]);
  assertEquals(applications.length, LIA_HOOKS_REPORT_CAP);
  const purposeCount = applications.filter((a) => a.hook_id === "h1" || a.hook_id === "h2" || a.hook_id === "h3").length;
  assertEquals(purposeCount, LIA_HOOKS_FACTOR_CAP);
});

// ── In-path assertions: unresolved slot; adverse shape under a pass ─────

Deno.test("applyLiaHooks — an unresolved slot (no ratified phrase for a holding fact_atom) drops the application and flags it, never printing a broken sentence", () => {
  const hook = makeHook({
    hook_id: "test/unresolved",
    posture: "accepted",
    fact_atoms: ["flag:not_in_the_phrase_map"],
  });
  const states = baseStates({ flags: ["not_in_the_phrase_map"] });
  const result = applyLiaHooks([hook], states, states.verdicts, [], new Set());
  assertEquals(result.applications, []);
  assertEquals(result.flags, [{ hook_id: "test/unresolved", reason: "unresolved_slot" }]);
});

Deno.test("applyLiaHooks — a malformed atom marks the whole hook ineligible (invalid_atom), never throws", () => {
  const hook = makeHook({ hook_id: "test/malformed", fact_atoms: ["not-a-valid-atom-no-colon"] });
  const states = baseStates();
  const result = applyLiaHooks([hook], states, states.verdicts, [], new Set());
  assertEquals(result.applications, []);
  assertEquals(result.flags, [{ hook_id: "test/malformed", reason: "invalid_atom" }]);
});

Deno.test("applyLiaHooks — an adverse shape (S2) is never reached against a passing verdict: the S2/omit(rule_missing) boundary is exactly the passing line", () => {
  // Both `directionFor` and hook-join.ts's own defensive re-check
  // (doc 213 §6) key off the SAME computed verdict, so this boundary is
  // structurally guaranteed rather than merely tested for one input —
  // this test sweeps every verdict value the fixture uses to confirm no
  // combination ever prints S2 on a passing verdict.
  const hook = makeHook({
    hook_id: "test/boundary",
    posture: "rejected",
    bears_on_element: "balancing",
    fact_atoms: ["relationship:employee"],
  });
  const states = baseStates({ relationship: "employee" });
  for (const verdict of ["likely_fails", "uncertain", "fails"]) {
    const r = applyLiaHooks([hook], states, { purpose: "passes", necessity: "passes", balancing: verdict }, [], new Set());
    assertEquals(r.applications.length, 1, JSON.stringify(r));
    assertEquals(r.applications[0].shape, "S2");
  }
  for (const verdict of ["passes", "likely_passes"]) {
    const r = applyLiaHooks([hook], states, { purpose: "passes", necessity: "passes", balancing: verdict }, [], new Set());
    assertEquals(r.applications, []);
    assertEquals(r.flags, [{ hook_id: "test/boundary", reason: "rule_missing" }]);
  }
});

// ── Byte-pin: the three [RATIFY] blocks in lia-hooks.ts ─────────────────
//
// sha256 of JSON.stringify, computed once against this build's content and
// hardcoded here — any future edit to the matrix/phrase-map/shapes must
// deliberately update these constants, the same discipline other byte-pin
// tests in this fleet already use (doc 149's GRADER_CONTEXT_VERSION rule).

const EXPECTED_MATRIX_SHA256 = "8551d54249b26c51849d9022b7aebdc9d2b51653887accb40bf2388271ad4a95";
// RE-PIN 2026-09-07 (Track H2 orchestrator review): LIA_ATOM_PHRASES extended
// from 38 to 75 entries so it covers EVERY closed option the hook drafter's
// vocabulary admits (interest type ×8, Art. 9(2) condition ×12, necessity ×3,
// opt-out ×3, children/special-category booleans, six marketing channels ×2)
// — tests/edge/corpus/doc213-vocabulary-phrase-coverage.test.ts pins the two
// sets to each other. Prior pin:
// 4ff52b0379e2ebf81641bbcfc74dd7888b5ae0c632e9438ef6c98b0cf5a89764.
const EXPECTED_PHRASES_SHA256 = "4d85af6444248a14c6ba9d6e0e0dcc2e4d8321e92c355eac841dd4688214cf2f";
const EXPECTED_SHAPES_SHA256 = "3407f0eca43f9b0dfb10e673a3f78b54d684567f082ed5834b74673cf2d8ca46";

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("byte-pin — LIA_HOOK_DIRECTION_MATRIX / LIA_ATOM_PHRASES / LIA_HOOK_SHAPES are unchanged from this build", async () => {
  assertEquals(await sha256Hex(JSON.stringify(LIA_HOOK_DIRECTION_MATRIX)), EXPECTED_MATRIX_SHA256);
  assertEquals(await sha256Hex(JSON.stringify(LIA_ATOM_PHRASES)), EXPECTED_PHRASES_SHA256);
  assertEquals(await sha256Hex(JSON.stringify(LIA_HOOK_SHAPES)), EXPECTED_SHAPES_SHA256);
});

// ── The zero-hooks identity (LIA_HOOKS ships []) ────────────────────────

function buildFixture(intake: Bag): { report: Bag; typed: ReturnType<typeof buildThreePartTestTyped> } {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  return { report, typed };
}

Deno.test("doc213 — LIA_HOOKS ships empty: buildLiaPersuasiveAuthority is byte-identical whether or not the caller supplies ctx.states/ctx.verdicts", () => {
  assertEquals(LIA_HOOKS_VERSION, "lia-hooks-v0-empty-2026-09-07");
  assertEquals(LIA_HOOKS.length, 0);

  const intake = LIA_PERFECT_PINNED[0].intake as Bag;
  const { report, typed } = buildFixture(intake);
  const states = buildLiaRuleStates(report, intake, typed);

  const withoutCtx = buildLiaPersuasiveAuthority(report, false, { intake });
  const withCtx = buildLiaPersuasiveAuthority(report, false, { intake, states, verdicts: states.verdicts });

  assert(withoutCtx.body.length > 0, "the fixture must produce a non-empty persuasive body for this check to mean anything");
  assertEquals(withCtx.body, withoutCtx.body);
  assertEquals(withCtx.ledger, withoutCtx.ledger);
  assertEquals(withCtx.entry_count, withoutCtx.entry_count);
  assertEquals(withCtx.ranked, withoutCtx.ranked);
  assertEquals(withCtx.hook_flags, []);
  assertEquals(withoutCtx.hook_flags, []);
});
