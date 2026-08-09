/**
 * INTAKE-2 — hard asserts.
 *
 * The wording and prefill-confirm work is presentation-only: no persisted key,
 * no stored option value, and no answer shape may change. These tests fail if
 * any of them drift.
 */
import { describe, it, expect } from "vitest";
import { buildQuestionSet } from "@/data/us-notice-questions";
import { buildEuQuestionSections } from "@/data/eu-notice-questions";
import { ROPA_ACTIVITY_QUESTIONS } from "@/data/ropa-questions";
import { EU_PREFILL_RULES, US_PREFILL_RULES } from "@/data/notice-prefill";

const US_STATES = [
  "US_CA",
  "US_VA",
  "US_CO",
  "US_CT",
  "US_TX",
  "US_MD",
  "US_FL",
  "US_OR",
  "US_MT",
  "US_UT",
];

type Q = {
  key: string;
  type: string;
  options?: { value: string; label: string }[];
};

function shapeOf(questions: Q[]): string[] {
  return questions.map(
    (q) =>
      `${q.key}|${q.type}|${(q.options ?? []).map((o) => o.value).join(",")}`,
  );
}

describe("INTAKE-2 — persisted contract identity", () => {
  const usQuestions = buildQuestionSet(US_STATES) as unknown as Q[];
  const euQuestions = buildEuQuestionSections([
    "GDPR",
    "UK_GDPR",
    "LGPD",
    "APPI",
    "DPDPA",
    "POPIA",
    "PIPEDA",
  ] as never)
    .flatMap((s: { questions: Q[] }) => s.questions);

  it("US builder keys, types and stored option values are unchanged", () => {
    expect(shapeOf(usQuestions)).toMatchSnapshot();
  });

  it("EU/Global builder keys, types and stored option values are unchanged", () => {
    expect(shapeOf(euQuestions)).toMatchSnapshot();
  });

  it("RoPA activity keys, types and stored option values are unchanged", () => {
    expect(shapeOf(ROPA_ACTIVITY_QUESTIONS as unknown as Q[])).toMatchSnapshot();
  });

  it("every prefill rule targets an existing question and never invents keys", () => {
    const euKeys = new Set(euQuestions.map((q) => q.key));
    const usKeys = new Set(usQuestions.map((q) => q.key));
    for (const rule of EU_PREFILL_RULES) {
      expect(euKeys.has(rule.target)).toBe(true);
      for (const s of rule.sources) expect(euKeys.has(s)).toBe(true);
    }
    for (const rule of US_PREFILL_RULES) {
      expect(usKeys.has(rule.target)).toBe(true);
      for (const s of rule.sources) expect(usKeys.has(s)).toBe(true);
    }
  });

  it("RoPA access_controls keeps its key and shape while splitting presentation", () => {
    const q = (ROPA_ACTIVITY_QUESTIONS as unknown as (Q & {
      followUpPrompt?: string;
    })[]).find((x) => x.key === "access_controls");
    expect(q).toBeDefined();
    expect(q!.type).toBe("text_long");
    expect(q!.followUpPrompt).toBeTruthy();
  });
});
