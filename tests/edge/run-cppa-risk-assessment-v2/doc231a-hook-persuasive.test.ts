// DOC 231A (2026-09-08) — the H3-style Persuasive Authority extension
// (eu-authority/hook-persuasive.ts): the CEO's scope ruling built. Closes
// doc 231 build-log NEED #3 (rankedSourceIds/determinativeSourceIds) and
// wires the "in ADDITION TO the hooks for FSOR content" source-table split.
//
// `RISK_HOOKS` ships `[]` in this build (doc 229 §5.3) — every fixture hook
// below is injected directly, exactly as doc231-hook-join.test.ts does.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook, HookApplication } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import {
  applyRiskPersuasiveHookSplice,
  rankRiskPersuasiveCandidates,
  riskDeterminativeSourceIds,
  riskHookCandidateRows,
  riskPersuasiveRankedSourceIds,
  RISK_HOOK_PERSUASIVE_SOURCE_TABLES,
  sourceTableForHookId,
} from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/eu-authority/hook-persuasive.ts";
import { RISK_HOOKS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts";

function makeHook(overrides: Partial<AuthorityHook> & { hook_id: string }): AuthorityHook {
  return {
    profile_id: "profile-test",
    source_row_id: "row-test",
    fact_atoms: [],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    finding_span: "x",
    fact_pattern_paraphrase: "x",
    finding_paraphrase: "x",
    settledness: "R3",
    posture: "rejected",
    factor_id: "Safeguards",
    bears_on_element: "Safeguards",
    authority_label: "Test DPA, Test Matter, decision of 1 January 2025",
    regulator: "Test DPA",
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Safeguards"],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    ...overrides,
  };
}

function application(hook_id: string): HookApplication {
  return {
    hook_id,
    profile_id: "p1",
    source_row_id: `row-${hook_id}`,
    fact_agreement: "same",
    shape: "S2",
    sentence: `Sentence for ${hook_id}.`,
    label: `Label for ${hook_id}`,
  };
}

// ── sourceTableForHookId ────────────────────────────────────────────────────

Deno.test("sourceTableForHookId: parses the '<source_table>:<row>:vN' prefix", () => {
  assertEquals(sourceTableForHookId("enforcement_actions:abc-123:v1"), "enforcement_actions");
  assertEquals(sourceTableForHookId("edpb_guidelines:abc-123:v2"), "edpb_guidelines");
  assertEquals(sourceTableForHookId("cppa_fsor_commentary:abc-123:v1"), "cppa_fsor_commentary");
});

Deno.test("sourceTableForHookId: an id with no ':' degrades to enforcement_actions rather than throw", () => {
  assertEquals(sourceTableForHookId("not-a-shaped-id"), "enforcement_actions");
});

Deno.test("RISK_HOOK_PERSUASIVE_SOURCE_TABLES: names exactly the three GDPR-regime tables, never cppa_fsor_commentary", () => {
  assertEquals([...RISK_HOOK_PERSUASIVE_SOURCE_TABLES].sort(), ["edpb_guidelines", "enforcement_actions", "regulatory_guidance"]);
  assert(!RISK_HOOK_PERSUASIVE_SOURCE_TABLES.has("cppa_fsor_commentary"));
});

// ── riskHookCandidateRows — the "in ADDITION TO the hooks for FSOR content" split ──

Deno.test("riskHookCandidateRows: an FSOR-sourced hook never becomes a ranking candidate here", () => {
  const hook = makeHook({ hook_id: "cppa_fsor_commentary:row-1:v1", source_row_id: "row-1" });
  const { rows, hookSourceIds } = riskHookCandidateRows([hook], new Set());
  assertEquals(rows, []);
  assertEquals(hookSourceIds.size, 0);
});

Deno.test("riskHookCandidateRows: an enforcement_actions hook becomes a synthetic AP candidate row", () => {
  const hook = makeHook({ hook_id: "enforcement_actions:row-2:v1", source_row_id: "row-2" });
  const { rows, profiles, hookSourceIds } = riskHookCandidateRows([hook], new Set());
  assertEquals(rows.length, 1);
  assertEquals(rows[0].role, "AP");
  assertEquals(rows[0].source_row_id, "row-2");
  assert(profiles.has(rows[0].id));
  assert(hookSourceIds.has("row-2"));
});

Deno.test("riskHookCandidateRows: a determinative source is never duplicated as a candidate", () => {
  const hook = makeHook({ hook_id: "enforcement_actions:row-3:v1", source_row_id: "row-3" });
  const { rows } = riskHookCandidateRows([hook], new Set(["row-3"]));
  assertEquals(rows, []);
});

Deno.test("riskHookCandidateRows: a hook whose source_row_id already names a render-eligible CAM AP row is not duplicated (the CAM row wins)", () => {
  // 8113274e-... is risk-corpus-map.ts's ap-01 source_row_id (enforcement_actions, render-eligible, has display).
  const hook = makeHook({ hook_id: "enforcement_actions:8113274e-135a-4a83-a874-23f2c8ca10cd:v1", source_row_id: "8113274e-135a-4a83-a874-23f2c8ca10cd" });
  const { rows, hookSourceIds } = riskHookCandidateRows([hook], new Set());
  assertEquals(rows, [], "the hook is not a NEW ranking candidate — the CAM row already covers this source");
  // Not excluded from hookSourceIds tracking is not asserted either way here — the
  // important, doc-213B-carried invariant is that no DUPLICATE row was built.
  void hookSourceIds;
});

// ── ranking — empty today, real once a candidate scores ────────────────────

Deno.test("rankRiskPersuasiveCandidates: RISK_HOOKS ships empty and no CAM row carries a profile — ranks nothing today", () => {
  const { ranked } = rankRiskPersuasiveCandidates({}, {}, RISK_HOOKS, new Set());
  assertEquals(ranked, []);
  assertEquals(riskPersuasiveRankedSourceIds({}, {}, RISK_HOOKS, new Set()), []);
});

Deno.test("rankRiskPersuasiveCandidates: an injected hook with a matching relevance block DOES rank (the scorer is real, not a stub)", () => {
  const hook = makeHook({
    hook_id: "enforcement_actions:row-9:v1",
    source_row_id: "row-9",
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Safeguards"],
      use_case_class: null,
      relationship: null,
      data_categories: ["Biometric information"],
      flags: ["biometric_data"],
      outcome_posture: "rejected",
    },
  });
  const intake = { q4_pi_categories: ["Biometric information"], q15_sensitive_pi: "No" };
  const { ranked } = rankRiskPersuasiveCandidates(intake, {}, [hook], new Set());
  assertEquals(ranked.length, 1);
  assertEquals(ranked[0].row.source_row_id, "row-9");
  assert(ranked[0].score > 0, "a matching data_category + flag must score above zero");
  assertEquals(riskPersuasiveRankedSourceIds(intake, {}, [hook], new Set()), ["row-9"]);
});

Deno.test("rankRiskPersuasiveCandidates: a determinative source is excluded from the candidate pool entirely", () => {
  const hook = makeHook({
    hook_id: "enforcement_actions:row-10:v1",
    source_row_id: "row-10",
    relevance: { instrument: "EU GDPR", factor_ids: ["Safeguards"], use_case_class: null, relationship: null, data_categories: [], flags: ["biometric_data"], outcome_posture: "rejected" },
  });
  // q4_pi_categories must actually include "Biometric information" for
  // buildRiskRuleStates to raise the "biometric_data" flag the hook's own
  // relevance.flags names — an empty categories list would score zero
  // regardless of exclusion, proving nothing about the exclusion itself.
  const intake = { q4_pi_categories: ["Biometric information"] };
  const withoutExclusion = rankRiskPersuasiveCandidates(intake, {}, [hook], new Set());
  assertEquals(withoutExclusion.ranked.length, 1);
  const withExclusion = rankRiskPersuasiveCandidates(intake, {}, [hook], new Set(["row-10"]));
  assertEquals(withExclusion.ranked, []);
});

// ── riskDeterminativeSourceIds — reuses the existing fired-state mechanism ──

Deno.test("riskDeterminativeSourceIds: a fired AP row's source_row_id is suppressed (same-authority-never-twice)", () => {
  const report = { scope_and_triggers: ["Engaged — 7150(b)(1) selling or sharing personal information."] };
  const ids = riskDeterminativeSourceIds(report, {});
  // cppa-risk/regulatory-trigger-and-applicability/ap-01's source_row_id,
  // render_when: ["trigger_engaged"] — fires whenever ANY 7150(b) trigger engages.
  assert(ids.has("8113274e-135a-4a83-a874-23f2c8ca10cd"));
});

Deno.test("riskDeterminativeSourceIds: with no 7150(b) trigger engaged, the trigger-gated AP row (ap-01, render_when ['trigger_engaged']) is not among the fired ids", () => {
  // deriveRiskFiredStates always adds "record_incomplete" for a bare {}
  // report (record_complete.value is not === true) — a fresh/incomplete
  // record genuinely fires SOME rows (any FC/AP/AOW row keyed only to
  // record_incomplete), so this asserts the SPECIFIC trigger-gated row is
  // absent, not that the whole set is empty (a stronger, correct claim).
  const ids = riskDeterminativeSourceIds({}, {});
  assert(!ids.has("8113274e-135a-4a83-a874-23f2c8ca10cd"), "ap-01 needs trigger_engaged, which nothing here fires");
});

// ── applyRiskPersuasiveHookSplice — the finalize-time write ─────────────────

Deno.test("applyRiskPersuasiveHookSplice: the real (production-default) flag is false — never writes, even with applications", () => {
  const report: Record<string, unknown> = { eu_persuasive_authority: { section_title: "x" } };
  const result = applyRiskPersuasiveHookSplice(report, [application("enforcement_actions:r1:v1")]);
  assertEquals(result, { eu_authorities_written: 0, fsor_hooks_written: 0 });
  assertEquals(report.eu_persuasive_authority, { section_title: "x" });
  assertEquals(report.persuasive_authority_hooks, undefined);
});

Deno.test("applyRiskPersuasiveHookSplice: enabledOverride=true + empty applications -> still no writes", () => {
  const report: Record<string, unknown> = {};
  const result = applyRiskPersuasiveHookSplice(report, [], true);
  assertEquals(result, { eu_authorities_written: 0, fsor_hooks_written: 0 });
  assertEquals(Object.keys(report), []);
});

Deno.test("applyRiskPersuasiveHookSplice: a GDPR-source application writes hook_authorities and preserves existing eu_persuasive_authority fields", () => {
  const report: Record<string, unknown> = {
    eu_persuasive_authority: { section_title: "Persuasive authority from EU practice", version: "v1", topics: [] },
  };
  const app = application("enforcement_actions:r1:v1");
  const result = applyRiskPersuasiveHookSplice(report, [app], true);
  assertEquals(result, { eu_authorities_written: 1, fsor_hooks_written: 0 });
  const section = report.eu_persuasive_authority as Record<string, unknown>;
  assertEquals(section.section_title, "Persuasive authority from EU practice");
  assertEquals(section.version, "v1");
  assertEquals(section.topics, []);
  const hookAuthorities = section.hook_authorities as unknown[];
  assertEquals(hookAuthorities.length, 1);
  assertEquals((hookAuthorities[0] as Record<string, unknown>).text, app.sentence);
  assertEquals(report.persuasive_authority_hooks, undefined, "an FSOR-only surface must not be created for a GDPR application");
});

Deno.test("applyRiskPersuasiveHookSplice: an FSOR-source application writes persuasive_authority_hooks only", () => {
  const report: Record<string, unknown> = {};
  const app = application("cppa_fsor_commentary:r2:v1");
  const result = applyRiskPersuasiveHookSplice(report, [app], true);
  assertEquals(result, { eu_authorities_written: 0, fsor_hooks_written: 1 });
  assertEquals(report.eu_persuasive_authority, undefined);
  const surface = report.persuasive_authority_hooks as Record<string, unknown>;
  const applications = surface.applications as unknown[];
  assertEquals(applications.length, 1);
  assertEquals((applications[0] as Record<string, unknown>).text, app.sentence);
});

Deno.test("applyRiskPersuasiveHookSplice: mixed GDPR + FSOR applications split correctly across both surfaces", () => {
  const report: Record<string, unknown> = {};
  const gdpr = application("edpb_guidelines:r3:v1");
  const fsor = application("cppa_fsor_commentary:r4:v1");
  const result = applyRiskPersuasiveHookSplice(report, [gdpr, fsor], true);
  assertEquals(result, { eu_authorities_written: 1, fsor_hooks_written: 1 });
  assertEquals(((report.eu_persuasive_authority as Record<string, unknown>).hook_authorities as unknown[]).length, 1);
  assertEquals(((report.persuasive_authority_hooks as Record<string, unknown>).applications as unknown[]).length, 1);
});

Deno.test("applyRiskPersuasiveHookSplice: enabledOverride=false suppresses writes even when applications exist (proves the flag, not the data, gates rendering)", () => {
  const report: Record<string, unknown> = {};
  const result = applyRiskPersuasiveHookSplice(report, [application("enforcement_actions:r5:v1")], false);
  assertEquals(result, { eu_authorities_written: 0, fsor_hooks_written: 0 });
  assertEquals(Object.keys(report), []);
});
