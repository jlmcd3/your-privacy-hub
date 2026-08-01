// ITEM 324 — CPPA-RISK PINNED-FIXTURE CONTRACT PARITY GUARD.
//
// `run-quality-batch/index.ts` validates EVERY pinned intake against
// `cppaRiskContract` before the first case runs, and aborts the whole batch
// with "Pinned-fixture contract violations for cppa-risk (n/N)" on the first
// failure. Item 305 added eight `required: "always"` § 7152 operand fields;
// Item 306 refreshed only `_shared/golden/cppa-risk.ts`, leaving the three
// revision-contract fixtures stale and the batch un-runnable.
//
// This guard runs the SAME validator the batch runs, over BOTH pinned sets,
// so the two can never drift apart again. It also pins the ADMT conditional
// companions on the adversarial golden case (see the Item 324 note there).

import { describe, it, expect } from "vitest";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment";
import { CPPA_RISK_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-risk";
import { CPPA_RISK_CONTRACT_FIXTURES } from "../../../supabase/functions/_shared/cppa-risk-contract-fixtures";
import { MESSY_BY_TOOL } from "../../../supabase/functions/_shared/golden/messy-registry";

// ── ITEM 337 (§ OPEN-3 of Item 324) — DERIVED REQUIRED-ALWAYS COVERAGE ──────
// The list below is a HISTORICAL pin of the eight operands Item 305 added; it
// stays for provenance. Coverage is no longer policed by any hand-maintained
// list: the guard further down ENUMERATES `cppaRiskContract.fields` for
// `required: "always"` and asserts every pinned intake — golden, revision-
// contract, AND messy — supplies each derived key non-empty, naming the
// missing key when it does not. A future contract addition therefore fails
// here by name with no test edit.
//
// DERIVATION IS FOR DETECTION, NOT FILLING (Item 324 ruling): nothing here
// generates or defaults a fixture value. Activity-specific data stays
// authored; a new required-always key must be answered per fixture by a human.
const ITEM_305_ALWAYS = [
  "a2_necessity_set",
  "a4_benefit_business",
  "a4_benefit_consumer",
  "a4_benefit_other_stakeholders",
  "a4_benefit_public",
  "a5_harm_pathways",
  "a9_approver_name",
  "a9_approver_position",
] as const;

function fmt(v: { key: string; reason: string }[]): string {
  return v.map((x) => `${x.key}: ${x.reason}`).join("; ");
}

describe("cppa-risk pinned fixtures — contract parity", () => {
  it("every golden case validates with zero violations", () => {
    for (const g of CPPA_RISK_GOLDEN) {
      const res = validateIntake(cppaRiskContract, g.intake as Record<string, unknown>);
      expect(res.ok, `${g.id} → ${fmt(res.violations)}`).toBe(true);
    }
  });

  it("every revision-contract fixture validates with zero violations", () => {
    for (const f of CPPA_RISK_CONTRACT_FIXTURES) {
      const res = validateIntake(cppaRiskContract, f.intake as Record<string, unknown>);
      expect(res.ok, `${f.fixture_id} → ${fmt(res.violations)}`).toBe(true);
    }
  });

  it("both pinned sets carry every Item 305 required-always operand", () => {
    const intakes: Array<[string, Record<string, unknown>]> = [
      ...CPPA_RISK_GOLDEN.map((g) => [g.id, g.intake as Record<string, unknown>] as [string, Record<string, unknown>]),
      ...CPPA_RISK_CONTRACT_FIXTURES.map((f) => [f.fixture_id, f.intake] as [string, Record<string, unknown>]),
    ];
    for (const [id, intake] of intakes) {
      for (const key of ITEM_305_ALWAYS) {
        const v = intake[key];
        expect(v, `${id} missing ${key}`).toBeTruthy();
        if (Array.isArray(v)) expect(v.length, `${id}.${key} empty`).toBeGreaterThan(0);
      }
    }
  });

  it("harm pathways are traced to a source AND a cause — not label recitation", () => {
    const all = [
      ...CPPA_RISK_GOLDEN.map((g) => [g.id, g.intake as any] as const),
      ...CPPA_RISK_CONTRACT_FIXTURES.map((f) => [f.fixture_id, f.intake as any] as const),
    ];
    for (const [id, intake] of all) {
      for (const row of intake.a5_harm_pathways as Array<Record<string, string>>) {
        expect(row.harm, `${id} harm untagged`).toMatch(/^\([A-H]\) /);
        expect(row.source.length, `${id} ${row.harm} source too thin`).toBeGreaterThan(40);
        expect(row.cause.length, `${id} ${row.harm} cause too thin`).toBeGreaterThan(40);
      }
    }
  });

  // ── DERIVED GUARD ────────────────────────────────────────────────────────
  it("required-always keys are derived from the contract, not a hand list", () => {
    expect(alwaysKeys().length).toBeGreaterThanOrEqual(ITEM_305_ALWAYS.length);
    for (const k of ITEM_305_ALWAYS) {
      expect(alwaysKeys(), `contract lost required-always key ${k}`).toContain(k);
    }
  });

  it("every pinned cppa-risk intake supplies every contract required-always key", () => {
    const keys = alwaysKeys();
    expect(keys.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const [id, intake] of allPinnedIntakes()) {
      for (const key of keys) {
        for (const [where, value] of readContractPath(intake, key)) {
          if (isEmptyValue(value)) missing.push(`${id} → ${where}`);
        }
      }
    }
    expect(missing, `missing/empty required-always fields:\n${missing.join("\n")}`).toEqual([]);
  });

  it("the derived guard covers all three pinned sets", () => {
    const ids = allPinnedIntakes().map(([id]) => id);
    expect(ids.length).toBe(
      CPPA_RISK_GOLDEN.length + CPPA_RISK_CONTRACT_FIXTURES.length + MESSY_CPPA_RISK.length,
    );
    expect(CPPA_RISK_GOLDEN.length).toBeGreaterThan(0);
    expect(CPPA_RISK_CONTRACT_FIXTURES.length).toBeGreaterThan(0);
    expect(MESSY_CPPA_RISK.length).toBeGreaterThan(0);
  });

  it("the derived guard fails by NAME when a required-always key is unanswered", () => {
    const key = alwaysKeys().find((k) => !k.includes("[]"))!;
    const holed = { ...(CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>), [key]: "" };
    const hits = readContractPath(holed, key).filter(([, v]) => isEmptyValue(v));
    expect(hits.length).toBe(1);
    expect(hits[0][0]).toBe(key);
  });

  it("the adversarial golden case supplies its ADMT conditional companions", () => {
    const c = CPPA_RISK_GOLDEN.find((g) => g.id === "risk-consumer-boundary-adversarial")!;
    const intake = c.intake as Record<string, string>;
    expect(intake.q18_admt_use).toBe("Yes");
    for (const k of [
      "q19_admt_description",
      "q20_admt_opt_out",
      "i5_admt_logic",
      "i5_admt_human_review",
    ]) {
      expect(String(intake[k] ?? "").trim().length, `${k} empty`).toBeGreaterThan(0);
    }
  });
});
