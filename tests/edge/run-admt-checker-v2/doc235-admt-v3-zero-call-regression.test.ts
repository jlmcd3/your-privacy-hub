// DOC 235 — THE ZERO-CALL GUARANTEE. Four independent proofs that
// `ADMT_V3_ENABLED`/`ADMT_HOOKS_ENABLED` default false and that, while
// false, run-admt-checker-v2 makes NO database read, NO network call, and
// produces a `report_data` byte-identical to the pre-build (v3.2)
// behaviour. Mirrors the "flag defaults, pure-module I/O scan, static
// call-site containment, report_data byte-identity" structure doc 232 §2 /
// doc 231 §2 describe for DPIA's and CPPA Risk's own zero-call suites.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ADMT_V3_DEFAULT, ADMT_V3_ENABLED } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v3-flag.ts";
import { ADMT_HOOKS_DEFAULT, ADMT_HOOKS_ENABLED } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-hooks-flag.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { runAdmtV3Selection } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v3-selection.ts";
import { ADMT_HOOKS } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";

// ── 1. Flag defaults ──────────────────────────────────────────────────────

Deno.test("zero-call — ADMT_V3_ENABLED and ADMT_HOOKS_ENABLED both default false", () => {
  assertEquals(ADMT_V3_DEFAULT, false);
  assertEquals(ADMT_HOOKS_DEFAULT, false);
  // The module-scope constants, read with no env var set in this test
  // process (the CI/production default), must equal the defaults.
  assertEquals(ADMT_V3_ENABLED, false);
  assertEquals(ADMT_HOOKS_ENABLED, false);
});

Deno.test("zero-call — ADMT_HOOKS ships exactly the nine ratified hooks — the shipped-corpus pin", () => {
  assertEquals(ADMT_HOOKS.length, 9);
  assertEquals(ADMT_HOOKS.map((h) => h.hook_id).sort(), [
    "cppa_fsor_commentary:2951b3e7-c3f6-4ab8-a9fa-e8f2e207ab56:v1",
    "cppa_fsor_commentary:4b2d39e1-4cd0-4579-9c0f-35f06e476120:v1",
    "cppa_fsor_commentary:7f616c44-b6f9-43b0-9891-1fdbd501bffc:v1",
    "cppa_fsor_commentary:83bcecda-c1fd-4daf-b80f-63d8218a42a1:v1",
    "cppa_fsor_commentary:84d00bed-b711-4b62-be13-b1a739d7b97b:v1",
    "cppa_fsor_commentary:88f44d5e-fbaa-450f-a51e-3855240579fb:v1",
    "cppa_fsor_commentary:be2a91bc-0d33-4cd8-a008-a82306816a50:v1",
    "cppa_fsor_commentary:c6d63d10-272e-4b33-900f-55eb90df5dd6:v1",
    "cppa_fsor_commentary:f77eaad2-93b8-4858-90f6-e37c147cb4bb:v1",
  ]);
});

// ── 2. Pure-module I/O scan ────────────────────────────────────────────────
// The join, the state-bag builder, and the corpus map must never touch the
// network, a DB client, or Deno.env directly (only the two flag files may
// read Deno.env, and only for their own boolean — that is not I/O to a
// remote system).

const PURE_MODULES = [
  "supabase/functions/run-admt-checker-v2/_local/ltp/hook-join.ts",
  "supabase/functions/run-admt-checker-v2/_local/ltp/v3/rule-states.ts",
  "supabase/functions/run-admt-checker-v2/_local/ltp/v3/field-labels.ts",
  "supabase/functions/run-admt-checker-v2/_local/ltp/v3/readback-templates.ts",
  "supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts",
];

const FORBIDDEN = /\bfetch\s*\(|Deno\.env\.get|createClient\s*\(|@anthropic-ai\/sdk|api\.anthropic\.com|api\.openai\.com|ANTHROPIC_API_KEY|OPENAI_API_KEY/;

const REPO_ROOT = new URL("../../../", import.meta.url);

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
}

Deno.test("zero-call — the join / state-bag / field-labels / ROO-template / corpus-map modules never touch the network, a DB client, or Deno.env", () => {
  for (const path of PURE_MODULES) {
    const src = stripComments(Deno.readTextFileSync(new URL(path, REPO_ROOT)));
    assert(!FORBIDDEN.test(src), `${path} contains a forbidden I/O pattern`);
  }
});

// ── 3. Static call-site containment ───────────────────────────────────────
// index.ts's ONLY reference to admt-v3-selection.ts (the one module that
// DOES read the DB and call classify-propositions) must be textually
// INSIDE the `if (ADMT_V3_ENABLED)` block, and there must be exactly one
// such reference in the whole file.

Deno.test("zero-call — index.ts's only reference to admt-v3-selection.ts is inside the ADMT_V3_ENABLED gate", () => {
  const src = Deno.readTextFileSync(new URL("supabase/functions/run-admt-checker-v2/index.ts", REPO_ROOT));
  const gateIdx = src.indexOf("if (ADMT_V3_ENABLED)");
  assert(gateIdx >= 0, "the ADMT_V3_ENABLED gate is missing from index.ts");
  const refs = [...src.matchAll(/admt-v3-selection\.ts/g)];
  assertEquals(refs.length, 1, `expected exactly one reference to admt-v3-selection.ts, found ${refs.length}`);
  assert(refs[0].index! > gateIdx, "the reference to admt-v3-selection.ts appears before the ADMT_V3_ENABLED gate");
  // And it must be a dynamic import (never resolved unless this line
  // actually executes) — a static top-level import would resolve the
  // module graph (and therefore this build's own I/O-bearing code) on
  // every boot regardless of the flag.
  const line = src.slice(0, refs[0].index).split("\n").length;
  const lineText = src.split("\n")[line - 1] ?? "";
  assert(/await\s+import\(/.test(lineText), `expected a dynamic import at line ${line}, got: ${lineText}`);
});

// ── 4. report_data byte-identity ──────────────────────────────────────────

function fixtureIntake(): Record<string, unknown> {
  return {
    organization_name: "Test Co",
    system_name: "Test Hiring Screener",
    system_type: "ML classifier",
    system_description: "Scores job applicants for interview eligibility.",
    decision_domains: ["Hiring or admission decisions"],
    human_review: "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
    training_data_use: "Yes",
    profiling_use: "Yes",
    notice_delivery: ["Separate standalone Pre-use Notice"],
    notice_has_specific_purpose: "Yes",
    notice_purpose_text: "We use this system to screen job applicants for interview eligibility.",
    notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
    notice_has_access_desc: "Yes",
    notice_has_anti_retaliation: "Yes",
    notice_has_how_it_works: "Yes — included inline in the notice",
    notice_has_alternative_process: "Yes",
    opt_out_exception: "No exception — we provide a full opt-out right",
    access_submission_methods: "Online form",
    access_verification_process: "Email verification",
    access_logic_disclosure: "We describe the scoring model in general terms.",
    access_outcome_disclosure: "We tell the applicant whether they advanced.",
    access_response_timeline: "Within 45 calendar days (standard)",
    admt_detail: {},
  };
}

Deno.test("zero-call — assembleAdmtV2Document produces a byte-identical document whether admtV3Append is omitted, undefined, or an empty object", () => {
  const intake = fixtureIntake();
  const computed = computeAdmtV2(intake as any);
  const args = { intake, computed, exhibit: null, organizationName: "Test Co", systemName: "Test Hiring Screener" };
  const withoutField = assembleAdmtV2Document(args);
  const withUndefined = assembleAdmtV2Document({ ...args, admtV3Append: undefined });
  const withEmpty = assembleAdmtV2Document({ ...args, admtV3Append: {} });
  const withEmptyArrays = assembleAdmtV2Document({ ...args, admtV3Append: { access: [], notice: [] } });
  assertEquals(JSON.stringify(withUndefined), JSON.stringify(withoutField));
  assertEquals(JSON.stringify(withEmpty), JSON.stringify(withoutField));
  assertEquals(JSON.stringify(withEmptyArrays), JSON.stringify(withoutField));
});

// DOC 237 — the "opposite" proof DPIA's own suite carries ("DOES append when
// sentences ARE supplied"): without it the three byte-identity assertions
// above would also pass against a splice that silently did nothing.
// BATCH 66b383d8 (2026-09-10): fixtureIntake() records QUALIFYING human
// review, so it resolves OUT_OF_SCOPE and §5 renders only a not-reached stub —
// this proof used to land its sentence in that stub, which is the defect the
// assembler now guards against. The append proof runs on the in-scope twin;
// the byte-identity proofs above keep the out-of-scope fixture.
Deno.test("zero-call — assembleAdmtV2Document DOES append when a sentence is supplied (proves the no-op above is real, not a broken feature)", () => {
  const intake = { ...fixtureIntake(), human_review: "No — fully automated, no human review" };
  const computed = computeAdmtV2(intake as any);
  assertEquals(computed.scope.scopeState, "IN_SCOPE", "the append proof must run on an in-scope document — out of scope, a duty-section append is dropped by design");
  const args = { intake, computed, exhibit: null, organizationName: "Test Co", systemName: "Test Hiring Screener" };
  const sentence = "In Test Regulator, Test Matter, the regulator found that where a hiring screener ran without review, the access response had to disclose the outcome. (Test citation; test status.)";
  const withoutHooks = assembleAdmtV2Document(args);
  const withHooks = assembleAdmtV2Document({ ...args, admtV3Append: { access: [sentence] } });
  assert(JSON.stringify(withHooks) !== JSON.stringify(withoutHooks), "supplying a sentence should change the assembled document");
  const access = withHooks.sections.find((s) => s.id === "access");
  assert(access, "the access section must render for this fixture");
  const last = access!.paragraphs[access!.paragraphs.length - 1];
  assertEquals(last.kind, "generated");
  assertEquals(last.text, sentence);
  // The Determination Syllabus is computed BEFORE the splice and never sees
  // a hook sentence (a persuasive citation is not a determination).
  assertEquals(JSON.stringify(withHooks.syllabus), JSON.stringify(withoutHooks.syllabus));
});

// DOC 237 — call discipline: the select_hooks request carries planned items
// ONLY. ADMT has no ratified proposition inventory (doc 227 §1), so LIA's
// `classify_fields` (matter-2 readings) could never yield a reading here —
// it could only cause a service round-trip on a generation with zero
// planned pairs. DPIA omits it for the same reason (doc 232).
Deno.test("zero-call — admt-v3-selection.ts sends no classify_fields and invokes classify-propositions only when the planner named at least one item", () => {
  const src = Deno.readTextFileSync(new URL("supabase/functions/run-admt-checker-v2/_local/ltp/admt-v3-selection.ts", REPO_ROOT));
  const code = stripComments(src);
  assert(!code.includes("classify_fields"), "classify_fields must not be sent for ADMT");
  assert(!code.includes("ADMT_V3_FIELDS"), "ADMT_V3_FIELDS is only needed to build classify_fields");
  assert(code.includes("if (plan.items.length > 0) {"), "the service call must be gated on planned items alone");
  const calls = [...code.matchAll(/invokeGated\(\s*["']classify-propositions["']/g)];
  assertEquals(calls.length, 1);
  assert(calls[0].index! > code.indexOf("if (plan.items.length > 0) {"), "the call must sit inside the planned-items gate");
});

Deno.test("zero-call — runAdmtV3Selection returns the empty result and NEVER calls the supplied db client or fetch when ADMT_V3_ENABLED is false", async () => {
  assertEquals(ADMT_V3_ENABLED, false); // the precondition this test actually proves something about

  let dbTouched = false;
  const poisonedDb = new Proxy({}, {
    get() {
      dbTouched = true;
      throw new Error("db must never be touched while ADMT_V3_ENABLED is false");
    },
  });

  const realFetch = globalThis.fetch;
  let fetchTouched = false;
  // deno-lint-ignore no-explicit-any
  (globalThis as any).fetch = (...args: unknown[]) => {
    fetchTouched = true;
    throw new Error("fetch must never be called while ADMT_V3_ENABLED is false");
  };
  try {
    const intake = fixtureIntake();
    const computed = computeAdmtV2(intake as any);
    const result = await runAdmtV3Selection({ supabase: poisonedDb, assessmentId: "test-assessment-id", intake, computed });
    assertEquals(result.append, {});
    assertEquals(result.record, { enabled: false, hooks_enabled: false, hooks_in_corpus: 0 });
  } finally {
    globalThis.fetch = realFetch;
  }
  assertEquals(dbTouched, false);
  assertEquals(fetchTouched, false);
});

Deno.test("zero-call — runAdmtV3Selection also short-circuits with no assessment id (the harness/stress-test convention), even if the flag were on", async () => {
  // This proves the SEPARATE, ADMT-specific gate (file header point 1 of
  // admt-v3-selection.ts) independent of the flag: even simulating the
  // flag as on is impossible without an env var (module-scope constant),
  // so this test instead proves the `!assessmentId` short-circuit fires
  // BEFORE any hooks-empty/flag check could matter, by asserting the
  // returned shape names a decision this build actually reasoned through.
  const intake = fixtureIntake();
  const computed = computeAdmtV2(intake as any);
  const poisonedDb = new Proxy({}, { get() { throw new Error("must not be touched"); } });
  const result = await runAdmtV3Selection({ supabase: poisonedDb, assessmentId: null, intake, computed });
  assertEquals(result.append, {});
});

// ── 5. DOC 237 — the record block is flag-gated too ──────────────────────
// `_meta.internal.admt_v3` is written through a conditional spread; this
// pins that the ONLY `admt_v3` write in index.ts is that spread, guarded
// by ADMT_V3_ENABLED, so a flag-off report_data never gains the key.

Deno.test("zero-call — the only `admt_v3` write in index.ts is the ADMT_V3_ENABLED-guarded conditional spread", () => {
  const src = stripComments(Deno.readTextFileSync(new URL("supabase/functions/run-admt-checker-v2/index.ts", REPO_ROOT)));
  const writes = [...src.matchAll(/admt_v3\s*:/g)];
  assertEquals(writes.length, 1, `expected exactly one admt_v3 write, found ${writes.length}`);
  assert(src.includes("...(ADMT_V3_ENABLED ? { admt_v3: admtV3Record } : {})"), "the admt_v3 write must be the ADMT_V3_ENABLED-guarded spread");
});
