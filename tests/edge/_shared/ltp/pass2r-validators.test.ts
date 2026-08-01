/**
 * ITEM 278 — PASS-2R VALIDATOR UNIT TESTS (§2R.3).
 *
 * Each of the seven validators gets: one PASS case, one REJECT case, and
 * the observe-mode no-op assertion (observe never becomes `effective`).
 *
 * No model is contacted anywhere in this file.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildPass2rWhitelist,
  runPass2rValidators,
  validateAtomicToken,
  validateCitationWhitelist,
  validateEntityWhitelist,
  validateNoSelfContradiction,
  validateNumericDateWhitelist,
  validateSectionStructure,
  validateVerdictConsistency,
  PASS2R_DEFAULT_MODE,
  PASS2R_VALIDATOR_IDS,
  type Pass2rProseDocument,
  type Pass2rWhitelist,
} from "./pass2r-validators.ts";

const WL: Pass2rWhitelist = {
  citations: ["11 CCR § 7152(a)(5)", "11 CCR § 7156(a)"],
  numerics: ["250,000", "seven years", "April 1, 2028", "2028"],
  entities: ["ClearPath Credit Solutions, Inc.", "Experian", "Plaid", "Chief Privacy Officer"],
  verdict: "Moderate",
  verdict_alternatives: ["Low", "High", "Critical", "Insufficient basis"],
  close_outcome: false,
  registry_keys: ["executive_summary", "risk_assessment_by_activity", "next_steps"],
  stated_facts: ["seven years", "ClearPath Credit Solutions, Inc."],
};

function doc(parts: Partial<Record<1 | 2 | 3 | 4, { prose: string; keys?: string[] }>>): Pass2rProseDocument {
  const mk = (n: 1 | 2 | 3 | 4, defaults: string, keys: string[]) => ({
    part: n,
    heading: `Part ${n}`,
    prose: parts[n]?.prose ?? defaults,
    covered_keys: parts[n]?.keys ?? keys,
  });
  return {
    parts: [
      mk(1, "The record concerns ClearPath Credit Solutions, Inc.", ["executive_summary"]),
      mk(2, "The engaged trigger is analysed under 11 CCR § 7152(a)(5).", ["risk_assessment_by_activity"]),
      mk(3, "The record does not state who reviews the retention schedule.", ["next_steps"]),
      mk(4, "The result of this assessment is Moderate.", []),
    ],
  };
}

// (1) CITATION WHITELIST -----------------------------------------------
Deno.test("citation whitelist — passes on a plan-carried pinpoint", () => {
  assert(validateCitationWhitelist(doc({}), WL).passed);
});
Deno.test("citation whitelist — rejects a pinpoint the plan does not carry", () => {
  const o = validateCitationWhitelist(
    doc({ 2: { prose: "Analysed under 11 CCR § 7999(z)." } }),
    WL,
  );
  assertEquals(o.passed, false);
  assertEquals(o.rejections[0].code, "citation_not_plan_carried");
});

// (2) NUMERIC / DATE WHITELIST -----------------------------------------
Deno.test("numeric whitelist — passes on plan-carried values", () => {
  assert(validateNumericDateWhitelist(
    doc({ 1: { prose: "Retention runs seven years and the record covers 250,000 consumers." } }),
    WL,
  ).passed);
});
Deno.test("numeric whitelist — rejects an invented number", () => {
  const o = validateNumericDateWhitelist(
    doc({ 1: { prose: "The activity touches 4,821,904 consumers." } }),
    WL,
  );
  assertEquals(o.passed, false);
  assertEquals(o.rejections[0].code, "number_or_date_not_in_plan");
});

// (3) ENTITY WHITELIST + OWNER-SLOT PII ---------------------------------
Deno.test("entity whitelist — passes on plan-carried entities", () => {
  assert(validateEntityWhitelist(
    doc({ 1: { prose: "The vendors of record are Experian and Plaid." } }),
    WL,
  ).passed);
});
Deno.test("entity whitelist — rejects an entity outside the plan", () => {
  const o = validateEntityWhitelist(
    doc({ 1: { prose: "The vendors of record are Experian and Snowflake." } }),
    WL,
  );
  assertEquals(o.passed, false);
  assert(o.rejections.some((r) => r.code === "entity_not_in_plan"));
});
Deno.test("entity whitelist — rejects a personal name in an owner slot (Item 273)", () => {
  const o = validateEntityWhitelist(
    doc({ 3: { prose: "Owner: Dana Whitfield" } }),
    { ...WL, entities: [...WL.entities, "Dana Whitfield"] },
  );
  assertEquals(o.passed, false);
  assert(o.rejections.some((r) => r.code === "owner_slot_pii"));
});

// (4) VERDICT CONSISTENCY ----------------------------------------------
Deno.test("verdict consistency — passes when Part 4 states the plan verdict", () => {
  assert(validateVerdictConsistency(doc({}), WL).passed);
});
Deno.test("verdict consistency — rejects a prose-derived verdict", () => {
  const o = validateVerdictConsistency(
    doc({ 4: { prose: "The result of this assessment is Critical." } }),
    WL,
  );
  assertEquals(o.passed, false);
  assert(o.rejections.some((r) => r.code === "verdict_not_stated"));
});
Deno.test("verdict consistency — rejects a count-driven firm negative (§2R.4(3))", () => {
  const wl = { ...WL, verdict: "High", verdict_alternatives: ["Low", "Moderate", "Critical"] };
  const o = validateVerdictConsistency(
    doc({
      2: { prose: "There are more negative impact factors than benefit factors, so the impacts outweigh." },
      4: { prose: "The result of this assessment is High." },
    }),
    wl,
  );
  assertEquals(o.passed, false);
  assert(o.rejections.some((r) => r.code === "count_driven_firm_negative"));
});

// (5) SECTION STRUCTURE -------------------------------------------------
Deno.test("section structure — passes with four ordered parts covering every key", () => {
  assert(validateSectionStructure(doc({}), WL).passed);
});
Deno.test("section structure — rejects an orphaned registry key", () => {
  const o = validateSectionStructure(doc({ 3: { prose: "Nothing further.", keys: [] } }), WL);
  assertEquals(o.passed, false);
  assert(o.rejections.some((r) => r.code === "registry_key_orphaned"));
});
Deno.test("section structure — rejects cross-part duplication of a key", () => {
  const o = validateSectionStructure(
    doc({ 3: { prose: "Steps follow.", keys: ["next_steps", "executive_summary"] } }),
    WL,
  );
  assertEquals(o.passed, false);
  assert(o.rejections.some((r) => r.code === "section_cross_duplication"));
});

// (6) ATOMIC TOKEN + REGISTER ------------------------------------------
Deno.test("atomic token — passes on clean prose", () => {
  assert(validateAtomicToken(doc({})).passed);
});
Deno.test("atomic token — rejects markdown literals, case-folded acronyms and truncation", () => {
  const o = validateAtomicToken(doc({
    1: { prose: "**Overview** of the aDMT posture and a sentence cut mid" },
  }));
  assertEquals(o.passed, false);
  const codes = o.rejections.map((r) => r.code);
  assert(codes.includes("markdown_literal"));
  assert(codes.includes("acronym_case_folded"));
  assert(codes.includes("not_sentence_boundary"));
});

// (7) NO SELF-CONTRADICTION --------------------------------------------
Deno.test("no self-contradiction — passes when Part 3 asks only for absent facts", () => {
  assert(validateNoSelfContradiction(doc({}), WL).passed);
});
Deno.test("no self-contradiction — rejects a Part-3 ask for a stated fact", () => {
  const o = validateNoSelfContradiction(
    doc({ 3: { prose: "Provide the retention period of seven years for the record." } }),
    WL,
  );
  assertEquals(o.passed, false);
  assertEquals(o.rejections[0].code, "part3_requests_stated_fact");
});

// OBSERVE-MODE NO-OP ----------------------------------------------------
Deno.test("observe mode is the default and is never effective", () => {
  assertEquals(PASS2R_DEFAULT_MODE, "observe");
  const bad = doc({ 4: { prose: "The result of this assessment is Critical." } });
  const observed = runPass2rValidators(bad, WL);
  assertEquals(observed.mode, "observe");
  assertEquals(observed.ok, false);
  // The lifecycle guarantee: an observing validator cannot touch shipped output.
  assertEquals(observed.effective, false);
  const enforced = runPass2rValidators(bad, WL, { mode: "enforce" });
  assertEquals(enforced.effective, true);
  // Same findings either way — observe changes reach, never judgment.
  assertEquals(
    observed.rejections.map((r) => r.code),
    enforced.rejections.map((r) => r.code),
  );
});

Deno.test("runner reports all seven validators every time", () => {
  const r = runPass2rValidators(doc({}), WL);
  assertEquals(r.outcomes.map((o) => o.validator), [...PASS2R_VALIDATOR_IDS]);
  assertEquals(r.ok, true);
  assertEquals(r.reject_reason, "");
});

Deno.test("whitelist is built from the locked plan only", () => {
  const plan = {
    plan_version: "v1",
    product: "cppa-risk-assessment",
    build_stamp: "test",
    jurisdiction_tag: "cppa-ca",
    intake_ledger: [{ ledger_id: "L.entity_name", intake_field: "entity_name", value: "Acme LLC", display: "Acme LLC" }],
    citation_bindings: [{ pinpoint_ref: "P1", corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)", jurisdiction_tag: "cppa-ca" }],
    propositions: [],
    factor_table: [],
    weighing_frame: [],
    gate_outcomes: [],
    conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
  } as unknown as Parameters<typeof buildPass2rWhitelist>[0];
  const wl = buildPass2rWhitelist(plan, { verdict: "Low", registry_keys: ["executive_summary"] });
  assertEquals(wl.citations, ["11 CCR § 7152(a)"]);
  assert(wl.entities.includes("Acme LLC"));
  assertEquals(wl.verdict, "Low");
  assert(!wl.verdict_alternatives.includes("Low"));
});
