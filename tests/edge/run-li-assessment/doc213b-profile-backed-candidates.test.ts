// DOC 213B TRACK H3 — PROFILE-BACKED PERSUASIVE CANDIDATES.
//
// Pins `hookCandidateRows`/`profileOf`/the ctx.hooks seam in
// lia-persuasive-authority.ts: a ratified hook becomes ONE ranking
// candidate (scored against the record like any CAM row, via its own
// `relevance` block), and a hook-backed candidate renders ONLY when
// hook-join.ts's `applyLiaHooks` produced an application for it — never the
// synthetic display text `apEntries` builds to satisfy its own shared
// PersuasiveEntry construction (doc 213B §1.3).
//
// TEST-SEAM NOTE: every test below drives `buildLiaPersuasiveAuthority`
// through `ctx.hooks` (never `LIA_HOOKS`, which ships empty — doc 213 §3's
// first batch has not run) and, where it needs the hook block to actually
// run, supplies `ctx.states`/`ctx.verdicts` too. `ctx.hooks` being supplied
// is itself what opens the gate `LIA_HOOKS_ENABLED` otherwise controls (see
// that field's own doc comment on `LiaPersuasiveContext`) — the standard
// sweep's `deno test <dir>` process freezes `LIA_HOOKS_ENABLED` to `false`
// at the first file that imports lia-persuasive-authority.ts
// (213A-TRACK-H2-BUILD-LOG-2026-09-07.md's Deviation 5), so no test in this
// file can ever observe the env flag itself flip true.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook, HookSettledness } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import { buildLiaPersuasiveAuthority } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-persuasive-authority.ts";
import { buildLiaRuleStates } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-states.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";

type Bag = Record<string, unknown>;

// The four doc-63 §6.1 release-1 CAM authority labels — used to prove they
// are still present alongside (or re-texted by) a hook-backed candidate.
const LINKEDIN_LABEL = "DPC (Ireland), LinkedIn, decision of 22 October 2024 — persuasive authority";
const CEGEDIM_LABEL = "CNIL (France), Cegedim, decision of 5 September 2024, ref. SAN-2024-013 — persuasive authority";
const GSMA_LABEL = "AEPD (Spain), GSMA Limited, decision of 31 May 2024, ref. EXP202201608 — persuasive authority";
const CAMARA_LABEL =
  "AEPD (Spain), Cámara Oficial de Comercio, Industria, Servicios y Navegación de España, decision of 27 December 2022, ref. EXP202301678 — persuasive authority";
const LINKEDIN_SOURCE_ID = "69eee35f-a280-47be-8159-bf778767ff31";

function makeStates(overrides: Partial<TypedStateBag> = {}): TypedStateBag {
  return {
    instrument: "EU GDPR",
    use_case_class: "fraud_prevention",
    relationship: "customer",
    data_categories: ["Contact data"],
    flags: [],
    verdicts: { purpose: "passes", necessity: "passes", balancing: "passes" },
    states: {},
    ...overrides,
  };
}

function makeHook(overrides: Partial<AuthorityHook> & { hook_id: string; source_row_id: string }): AuthorityHook {
  return {
    profile_id: "profile-doc213b-test",
    fact_atoms: [],
    distinguishing_atoms: [],
    not_distinguishable: true,
    required_atoms: [],
    finding_span: "the necessity test could not be met on these facts",
    fact_pattern_paraphrase: "a controller processed personal data without a valid legal basis",
    finding_paraphrase: "the necessity test could not be met",
    settledness: "R1",
    posture: "accepted",
    factor_id: "Necessity and less-intrusive means",
    bears_on_element: "necessity",
    authority_label: "Test DPA, Doc213B Matter, decision of 1 June 2025",
    regulator: "Test DPA",
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "accepted",
    },
    ...overrides,
  };
}

// A default report/intake pair engineered so exactly the four release-1 CAM
// authorities (LinkedIn/Cegedim/GSMA/Cámara) score above zero and rank —
// see the build log for the arithmetic (each profile's own factors,
// relationship "public", the shared "large_scale"/"special_category" flags
// and a broad data-category set together give every one of the four a
// positive score against this one query).
function makeReport(overrides: Bag = {}): Bag {
  return {
    precedent_class_posture: { use_case_class: "behavioral_advertising" },
    three_part_test: {
      purpose_test: { verdict: "likely_fails" },
      necessity_test: { verdict: "likely_fails" },
      balancing_test: { verdict: "likely_fails" },
    },
    scale_frequency_duration: { large_scale_indicated: true },
    ...overrides,
  };
}

function makeIntake(overrides: Bag = {}): Bag {
  return {
    jurisdictions: ["EU (GDPR)"],
    data_categories: [
      "Contact data",
      "Browsing/behavioural data",
      "Device/technical data",
      "Health or medical data",
      "Special category data",
    ],
    balancing_details: { relationship_category: "Member of the public — no relationship" },
    ...overrides,
  };
}

// ── 1. Flag off / hooks empty → byte-identical (doc 213B §4 item 1) ─────

function buildPinnedFixture(intake: Bag): { report: Bag } {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  return { report };
}

Deno.test("doc213b — flag off / hooks empty: ctx.hooks explicitly [] is byte-identical to omitting ctx.hooks (LIA_PERFECT_PINNED[0])", () => {
  const intake = LIA_PERFECT_PINNED[0].intake as Bag;
  const { report } = buildPinnedFixture(intake);
  const states = buildLiaRuleStates(report, intake, buildThreePartTestTyped(report, intake));

  const withoutHooks = buildLiaPersuasiveAuthority(report, false, { intake, states, verdicts: states.verdicts });
  const withEmptyHooks = buildLiaPersuasiveAuthority(report, false, {
    intake,
    states,
    verdicts: states.verdicts,
    hooks: [],
  });

  assert(withoutHooks.body.length > 0, "the fixture must produce a non-empty persuasive body for this check to mean anything");
  assertEquals(withEmptyHooks.body, withoutHooks.body);
  assertEquals(withEmptyHooks.ledger, withoutHooks.ledger);
  assertEquals(withEmptyHooks.entry_count, withoutHooks.entry_count);
  assertEquals(withEmptyHooks.ranked, withoutHooks.ranked);
  assertEquals(withEmptyHooks.hook_flags, []);
});

// ── 2. A ranked, applied hook renders its S1 sentence (doc 213B §4 item 2) ─

Deno.test("doc213b — a hook-backed candidate that ranks and applies renders its S1 sentence, joins the ledger, and the four CAM entries are still present", () => {
  const baseline = buildLiaPersuasiveAuthority(makeReport(), false, { intake: makeIntake() });

  const hook = makeHook({
    hook_id: "enforcement_actions:doc213b-test-2:v1",
    source_row_id: "doc213b-test-2",
    posture: "accepted",
    settledness: "R2",
    fact_atoms: ["class:fraud_prevention"],
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: "fraud_prevention",
      relationship: "customer",
      data_categories: ["Contact data"],
      flags: [],
      outcome_posture: "accepted",
    },
  });
  const states = makeStates({ use_case_class: "fraud_prevention" });
  const result = buildLiaPersuasiveAuthority(makeReport(), false, {
    intake: makeIntake(),
    hooks: [hook],
    states,
    verdicts: states.verdicts,
  });

  assertEquals(result.hook_flags, []);
  assertEquals(result.entry_count, baseline.entry_count + 1, "entry_count rises by exactly one");
  assert(result.ledger.includes(hook.authority_label), JSON.stringify(result.ledger));
  assert(
    result.body.includes("The company has stated that its processing is carried out for fraud prevention"),
    result.body,
  );
  for (const label of [LINKEDIN_LABEL, CEGEDIM_LABEL, GSMA_LABEL, CAMARA_LABEL]) {
    assert(result.ledger.includes(label), `${label} missing from ${JSON.stringify(result.ledger)}`);
  }
});

// ── 3. fact_agreement unknown → omitted, never rendered (doc 213B §4 item 3) ─

Deno.test("doc213b — fact_agreement unknown yields an omitted hook-backed entry, recorded as a flag, never rendered", () => {
  const baseline = buildLiaPersuasiveAuthority(makeReport(), false, { intake: makeIntake() });

  const hook = makeHook({
    hook_id: "enforcement_actions:doc213b-test-3:v1",
    source_row_id: "doc213b-test-3",
    posture: "accepted",
    fact_atoms: ["class:fraud_prevention"],
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: "fraud_prevention",
      relationship: "customer",
      data_categories: ["Contact data"],
      flags: [],
      outcome_posture: "accepted",
    },
  });
  // required_atoms is empty (nominated trivially), but fact_atoms does not
  // hold and there is no distinguishing atom either -> "unknown".
  const states = makeStates({ use_case_class: "direct_marketing" });
  const result = buildLiaPersuasiveAuthority(makeReport(), false, {
    intake: makeIntake(),
    hooks: [hook],
    states,
    verdicts: states.verdicts,
  });

  // DOC 224 — an unknown pair that ranked and could print is `selection_pending`
  // (the two-leg pass has not settled it); an unknown pair that could never
  // print is plainly `omitted`. Either way: a flag, never a rendered entry.
  assertEquals(result.hook_flags.length, 1);
  assertEquals(result.hook_flags[0].hook_id, hook.hook_id);
  assert(["selection_pending", "omitted"].includes(result.hook_flags[0].reason), result.hook_flags[0].reason);
  assertEquals(result.entry_count, baseline.entry_count);
  assert(!result.ledger.includes(hook.authority_label));
  assert(!result.body.includes(hook.authority_label));
});

// ── 4. Dedup + re-text against a real CAM row (doc 213B §4 item 4) ───────

Deno.test("doc213b — a hook whose source matches a render-eligible CAM row is not duplicated; the CAM entry is re-texted, not doubled", () => {
  const hook = makeHook({
    hook_id: `enforcement_actions:${LINKEDIN_SOURCE_ID}:v1`,
    source_row_id: LINKEDIN_SOURCE_ID,
    posture: "rejected",
    settledness: "R1",
    bears_on_element: "balancing",
    factor_id: "Balancing of interests, rights and freedoms",
    fact_atoms: ["class:behavioral_advertising"],
    authority_label: LINKEDIN_LABEL,
    fact_pattern_paraphrase: "a controller processed personal data for behavioural advertising without a valid legal basis",
    finding_paraphrase: "the balancing test could not be met",
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Balancing of interests, rights and freedoms"],
      use_case_class: "behavioral_advertising",
      relationship: "customer",
      data_categories: ["Browsing/behavioural data"],
      flags: ["large_scale"],
      outcome_posture: "rejected",
    },
  });
  const baseline = buildLiaPersuasiveAuthority(makeReport(), false, { intake: makeIntake() });
  const states = makeStates({
    use_case_class: "behavioral_advertising",
    verdicts: { purpose: "passes", necessity: "passes", balancing: "likely_fails" },
  });
  const result = buildLiaPersuasiveAuthority(makeReport(), false, {
    intake: makeIntake(),
    hooks: [hook],
    states,
    verdicts: states.verdicts,
  });

  assertEquals(result.entry_count, baseline.entry_count, "no new candidate is added for a source the CAM already covers");
  assertEquals(result.ledger.filter((l) => l === LINKEDIN_LABEL).length, 1, "the authority appears exactly once");
  assert(result.body.includes("its processing is for behavioural advertising"), result.body);
  assert(
    !result.body.includes("Ireland's Data Protection Commission fined LinkedIn"),
    "the hand-written CAM text must be replaced by the hook's sentence, not merely joined by it",
  );
});

// ── 5. Determinative suppression (doc 213B §4 item 5) ────────────────────

Deno.test("doc213b — a hook whose source is already cited as a fired rule's determinative authority is suppressed, not duplicated", () => {
  const detSourceId = "doc213b-determinative-source";
  const report = makeReport({
    rule_applications: [{
      effect: { kind: "override_outcome", element: "balancing" },
      changed: true,
      authority_citation: "Test DPA — determinative authority, doc213b test",
      sources: [{ row_id: detSourceId }],
      reason_sentence: "The rule's own reason sentence.",
    }],
  });
  const hook = makeHook({
    hook_id: `enforcement_actions:${detSourceId}:v1`,
    source_row_id: detSourceId,
    posture: "accepted",
    fact_atoms: ["class:fraud_prevention"],
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: "fraud_prevention",
      relationship: "customer",
      data_categories: ["Contact data"],
      flags: [],
      outcome_posture: "accepted",
    },
  });
  const states = makeStates({ use_case_class: "fraud_prevention" });
  const result = buildLiaPersuasiveAuthority(report, false, {
    intake: makeIntake(),
    hooks: [hook],
    states,
    verdicts: states.verdicts,
  });

  assertEquals(result.hook_flags, []);
  assert(!result.ledger.includes(hook.authority_label));
  assert(result.ledger.some((l) => l.includes("Test DPA — determinative authority, doc213b test")), JSON.stringify(result.ledger));
});

// ── 6. Caps: five per report, two per factor (doc 213B §4 item 6) ───────

Deno.test("doc213b — caps: six eligible hook candidates -> at most five entries render, at most two per element", () => {
  const report = makeReport({
    precedent_class_posture: { use_case_class: "fraud_prevention" },
    three_part_test: {
      purpose_test: { verdict: "" },
      necessity_test: { verdict: "" },
      balancing_test: { verdict: "" },
    },
    scale_frequency_duration: {},
  });
  const intake = makeIntake({
    data_categories: [],
    balancing_details: { relationship_category: "Employee" },
  });

  const BAL = "Balancing of interests, rights and freedoms";
  const NEC = "Necessity and less-intrusive means";
  function capHook(n: number, element: "balancing" | "necessity", factorLabel: string, settledness: HookSettledness): AuthorityHook {
    return makeHook({
      hook_id: `enforcement_actions:doc213b-cap-${n}:v1`,
      source_row_id: `doc213b-cap-${n}`,
      authority_label: `Test DPA, Doc213B Cap Hook ${n}, decision of 1 June 2025`,
      posture: "accepted",
      settledness,
      bears_on_element: element,
      factor_id: factorLabel,
      fact_atoms: ["class:fraud_prevention"],
      relevance: {
        instrument: "EU GDPR",
        factor_ids: [factorLabel],
        use_case_class: "fraud_prevention",
        relationship: "employee",
        data_categories: [],
        flags: [],
        outcome_posture: "accepted",
      },
    });
  }

  // Identical relevance scores for all six (tier "relevant") — ties resolve
  // by array/insertion order, so hooks 1-5 rank ahead of hook 6 by
  // construction, isolating the RANKING limit (five) from the JOIN's own
  // per-factor cap (two), which then trims hook 3 from the "balancing"
  // group of three that DID make the ranked top five.
  const hooks = [
    capHook(1, "balancing", BAL, "R1"),
    capHook(2, "balancing", BAL, "R1"),
    capHook(3, "balancing", BAL, "R2"),
    capHook(4, "necessity", NEC, "R1"),
    capHook(5, "necessity", NEC, "R1"),
    capHook(6, "balancing", BAL, "R2"),
  ];

  const states = makeStates({ use_case_class: "fraud_prevention" });
  const result = buildLiaPersuasiveAuthority(report, false, {
    intake,
    hooks,
    states,
    verdicts: states.verdicts,
  });

  assertEquals(result.entry_count, 4);
  const rendered = hooks.filter((h) => result.ledger.includes(h.authority_label)).map((h) => h.hook_id);
  assertEquals(
    rendered.sort(),
    [
      "enforcement_actions:doc213b-cap-1:v1",
      "enforcement_actions:doc213b-cap-2:v1",
      "enforcement_actions:doc213b-cap-4:v1",
      "enforcement_actions:doc213b-cap-5:v1",
    ].sort(),
  );
});

// ── 7. ctx.states/ctx.verdicts absent (doc 213B §4 item 7) ───────────────

Deno.test("doc213b — ctx.hooks supplied but ctx.states/ctx.verdicts absent: hook-backed entries never appear; CAM entries are unaffected", () => {
  const hook = makeHook({
    hook_id: "enforcement_actions:doc213b-test-7:v1",
    source_row_id: "doc213b-test-7",
    posture: "accepted",
    fact_atoms: ["class:fraud_prevention"],
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: "fraud_prevention",
      relationship: "customer",
      data_categories: ["Contact data"],
      flags: [],
      outcome_posture: "accepted",
    },
  });
  const baseline = buildLiaPersuasiveAuthority(makeReport(), false, { intake: makeIntake() });
  const withoutStates = buildLiaPersuasiveAuthority(makeReport(), false, { intake: makeIntake(), hooks: [hook] });

  assertEquals(withoutStates.body, baseline.body);
  assertEquals(withoutStates.ledger, baseline.ledger);
  assertEquals(withoutStates.entry_count, baseline.entry_count);
  assertEquals(withoutStates.hook_flags, []);
});

// ── 8. Scorer discrimination (doc 213B §4 item 8) ────────────────────────

Deno.test("doc213b — scorer discrimination: a fraud-prevention hook outranks a direct-marketing hook against a fraud-prevention record, by score not input order", () => {
  const fraudHook = makeHook({
    hook_id: "enforcement_actions:doc213b-test-8-fraud:v1",
    source_row_id: "doc213b-test-8-fraud",
    posture: "accepted",
    fact_atoms: ["class:fraud_prevention"],
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: "fraud_prevention",
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "accepted",
    },
  });
  const marketingHook = makeHook({
    hook_id: "enforcement_actions:doc213b-test-8-marketing:v1",
    source_row_id: "doc213b-test-8-marketing",
    posture: "accepted",
    fact_atoms: ["class:fraud_prevention"],
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: "direct_marketing",
      relationship: null,
      data_categories: ["Employment data"],
      flags: [],
      outcome_posture: "accepted",
    },
  });

  const report = makeReport({
    precedent_class_posture: { use_case_class: "fraud_prevention" },
    three_part_test: {
      purpose_test: { verdict: "" },
      necessity_test: { verdict: "" },
      balancing_test: { verdict: "" },
    },
    scale_frequency_duration: {},
  });
  const intake = makeIntake({ data_categories: ["Employment data"], balancing_details: {} });
  const states = makeStates({ use_case_class: "fraud_prevention" });

  // Marketing hook listed FIRST in the input array — proves the resulting
  // order is score-driven, not insertion order.
  const result = buildLiaPersuasiveAuthority(report, false, {
    intake,
    hooks: [marketingHook, fraudHook],
    states,
    verdicts: states.verdicts,
  });

  const fraudIndex = result.ranked.findIndex((r) => r.source_row_id === "doc213b-test-8-fraud");
  const marketingIndex = result.ranked.findIndex((r) => r.source_row_id === "doc213b-test-8-marketing");
  assert(fraudIndex >= 0 && marketingIndex >= 0, JSON.stringify(result.ranked));
  assert(fraudIndex < marketingIndex, `expected the fraud hook to outrank the marketing hook: ${JSON.stringify(result.ranked)}`);
});

// ── Beyond the spec's eight — a hook that ranks but is never nominated ───
//
// Not separately named in doc 213B §4, but necessary correctness the same
// §1.3 law demands: a hook can score well enough on `relevance` to enter
// the top-five ranking (competing on facts a customer's intake never
// asked) and still fail its OWN `required_atoms` gate against the record's
// actual typed states — hook-join.ts records neither an application nor a
// flag for a not-nominated hook (silent by design), so this is the one
// case `dropSourceIds` (built from flags) cannot catch on its own; only the
// "hook-backed and no application" filter can.

Deno.test("doc213b — a hook that ranks into the top five but fails its own required_atoms nomination is dropped, with no flag and no fallback text", () => {
  const hook = makeHook({
    hook_id: "enforcement_actions:doc213b-test-nom:v1",
    source_row_id: "doc213b-test-nom",
    posture: "accepted",
    required_atoms: ["class:behavioral_advertising"],
    fact_atoms: ["class:behavioral_advertising"],
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: "fraud_prevention",
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "accepted",
    },
  });
  const report = makeReport({
    precedent_class_posture: { use_case_class: "fraud_prevention" },
    three_part_test: {
      purpose_test: { verdict: "" },
      necessity_test: { verdict: "" },
      balancing_test: { verdict: "" },
    },
    scale_frequency_duration: {},
  });
  const intake = makeIntake({ data_categories: [], balancing_details: {} });
  // The relevance query matches on class ("fraud_prevention") so the hook
  // ranks; the record's ACTUAL typed state is also "fraud_prevention", so
  // required_atoms (which asks for behavioral_advertising) never holds.
  const states = makeStates({ use_case_class: "fraud_prevention" });
  const result = buildLiaPersuasiveAuthority(report, false, {
    intake,
    hooks: [hook],
    states,
    verdicts: states.verdicts,
  });

  assertEquals(result.hook_flags, []);
  assertEquals(result.entry_count, 0);
  assert(!result.body.includes(hook.authority_label));
});

// ── Orchestrator review (2026-09-07) — the production call site ──────────
//
// H2 wired the hook join INSIDE buildLiaPersuasiveAuthority but the one
// production caller (lia-skeleton-assemble.ts) kept passing `{ intake }`
// alone, so with the flag on and hooks ratified no hook could ever have
// fired in a real report. The wiring now passes `states` and `verdicts`.
// This test reads the assembler's source and pins two things: the call
// supplies both, and it never supplies `hooks` — that field is the test
// seam that opens the gate regardless of LIA_HOOKS_ENABLED (Deviation 1 in
// 213C), and production must reach hooks only through the flag.

Deno.test("doc213b — production call site passes states + verdicts to buildLiaPersuasiveAuthority and never the `hooks` seam", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts", import.meta.url),
  );
  const callStart = src.indexOf("buildLiaPersuasiveAuthority(report");
  assert(callStart >= 0, "the assembler must call buildLiaPersuasiveAuthority");
  const call = src.slice(callStart, src.indexOf("})", callStart) + 2);
  assert(/\bstates:\s*hookStates\b/.test(call), `states not passed: ${call}`);
  assert(/\bverdicts:\s*hookStates\?\.verdicts\b/.test(call), `verdicts not passed: ${call}`);
  assert(!/\bhooks\s*:/.test(call), `production must never pass the hooks seam: ${call}`);
  assert(src.includes('from "./lia-deliverables/rule-states.ts"'), "the assembler must build states through rule-states.ts");
});

// DOC 217 §5.2 (2026-09-07) — the same call-site law, one level further: the
// state bag the hook join reads must carry the SAME confirmed `props` the
// rule pass saw, so the assembler must forward its `readings` argument into
// its own buildLiaRuleStates call (index.ts passes the same `v3Readings` to
// both consumers — pinned in doc217-v3-engine.test.ts).

Deno.test("doc217 — the assembler forwards `readings` into its buildLiaRuleStates call (the hook join sees the props the rule pass saw)", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts", import.meta.url),
  );
  const m = /buildLiaRuleStates\(report, record, \{[\s\S]{0,400}?\}, readings\)/.exec(src);
  assert(m, "the assembler's buildLiaRuleStates call must pass `readings` as its fourth argument");
  assert(src.includes('from "./v3/readings.ts"'), "the assembler must type readings through v3/readings.ts");
});
