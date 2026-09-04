/**
 * DOC 168 (2026-09-04) — the browser intake (src/data/ropa-questions) and the
 * edge generator's reader-label maps
 * (supabase/functions/generate-ropa-document/register/answer-labels.ts) are two
 * files that must agree key-for-key: an option the form can store that the
 * generator cannot label would reach the rendered register as a raw code
 * (the doc-166-class "sccs" defect), and a label the form can never produce
 * is dead text. This test pins the two sides to each other.
 */
import { describe, it, expect } from "vitest";
import { getQuestionsForActivity } from "@/data/ropa-questions";
import { INTERNATIONAL_ORGANISATION_OPTION } from "@/data/countries";
import {
  INTERNATIONAL_ORGANISATION_VALUE,
  PROCESSING_REGULARITY_LABELS,
  RECIPIENT_CATEGORY_LABELS,
  SPECIAL_CATEGORY_BASIS_LABELS,
  TRANSFER_MECHANISM_LABELS,
} from "../../../supabase/functions/generate-ropa-document/register/answer-labels";

// Any template carries the base sequence; hr_payroll is the smallest.
const QS = getQuestionsForActivity("hr_payroll");
const valuesOf = (key: string): string[] => {
  const q = QS.find((x) => x.key === key);
  expect(q, `intake lacks ${key}`).toBeDefined();
  return (q!.options ?? []).map((o) => o.value).sort();
};

describe("DOC 168 — intake option codes and generator labels agree key-for-key", () => {
  it("special_category_basis", () => {
    expect(valuesOf("special_category_basis")).toEqual(Object.keys(SPECIAL_CATEGORY_BASIS_LABELS).sort());
  });
  it("recipient_categories", () => {
    expect(valuesOf("recipient_categories")).toEqual(Object.keys(RECIPIENT_CATEGORY_LABELS).sort());
  });
  it("processing_regularity", () => {
    expect(valuesOf("processing_regularity")).toEqual(Object.keys(PROCESSING_REGULARITY_LABELS).sort());
  });
  it("transfer_mechanism", () => {
    expect(valuesOf("transfer_mechanism")).toEqual(Object.keys(TRANSFER_MECHANISM_LABELS).sort());
  });
  it("the international-organisation marker value is the same string on both sides", () => {
    expect(INTERNATIONAL_ORGANISATION_OPTION.value).toBe(INTERNATIONAL_ORGANISATION_VALUE);
    expect(valuesOf("transfer_destination")).toContain(INTERNATIONAL_ORGANISATION_VALUE);
  });
  it("every generator label is reader prose, never a code fragment (no snake_case, no bare 'art9_2_x')", () => {
    for (const map of [SPECIAL_CATEGORY_BASIS_LABELS, RECIPIENT_CATEGORY_LABELS, PROCESSING_REGULARITY_LABELS, TRANSFER_MECHANISM_LABELS]) {
      for (const [code, label] of Object.entries(map)) {
        expect(label, `label for ${code} carries a code fragment`).not.toMatch(/_/);
        expect(label.trim().length, `label for ${code} is empty`).toBeGreaterThan(3);
      }
    }
  });
});
