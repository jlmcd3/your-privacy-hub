/**
 * ITEM 426 — MIRROR PARITY. src/lib/risk-exceptions.ts must return the same
 * verdicts as the edge contract for every shape in the wild.
 */
import { describe, expect, it } from "vitest";
import { coerceExceptionView, exceptionViewText, isRiskException } from "@/lib/risk-exceptions";

const TYPED = {
  exception_name: "Transient use",
  claimed: true,
  statutory_basis: "Cal. Civ. Code § 1798.140(e)(4)",
  scope_described: "s",
  safeguards_described: "g",
  documentation_status: "d",
  missing_elements: [],
  validity_assessment: "v",
  flags: [],
};

describe("ITEM 426 exception view (frontend mirror)", () => {
  it("discriminates all five states", () => {
    expect(coerceExceptionView(undefined).shape).toBe("absent");
    expect(coerceExceptionView([]).shape).toBe("empty");
    expect(coerceExceptionView(["a"]).shape).toBe("strings");
    expect(coerceExceptionView([{ statutory_basis: "x" }]).shape).toBe("legacy_objects");
    expect(coerceExceptionView([TYPED]).shape).toBe("typed");
  });

  it("preserves a hole defect verbatim", () => {
    const hole = "The assessment record includes  as required by 11 CCR § 7150(b)(1).";
    expect(coerceExceptionView([hole]).texts).toEqual([hole]);
  });

  it("projects object rows to prose so no row is dropped", () => {
    const text = exceptionViewText(coerceExceptionView([TYPED]));
    expect(text).toHaveLength(1);
    expect(text[0]).toContain("Transient use");
    expect(text[0]).toContain("1798.140(e)(4)");
  });

  it("recognises the canonical nine-leaf record", () => {
    expect(isRiskException(TYPED)).toBe(true);
    expect(isRiskException({ exception_name: "x" })).toBe(false);
  });
});
