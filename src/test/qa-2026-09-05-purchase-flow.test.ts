// QA batch 2026-09-05 — Codex automated buy-path review (three passes, 14
// products). Client-side rules extracted into pure modules so the defects the
// review found stay pinned:
//   RA 01 / AD 03  blank first render autosaved over the server draft
//   ROPA 01        advisory flags counted as "open flags"
//   EU 02          Review page counted questions the route never showed
import { describe, expect, it } from "vitest";
import { hasContent } from "@/lib/draftContent";
import { countsAsOpenFlag } from "@/lib/ropaFlags";
import { evaluateShowIf } from "@/data/eu-notice-questions/showIf";
import { GDPR_ART13_QUESTIONS } from "@/data/eu-notice-questions/gdpr-questions";

describe("RA 01 / AD 03 — hasContent (the autosave blank-payload guard)", () => {
  it("rejects the empty shapes the Risk and ADMT intakes render on first paint", () => {
    expect(hasContent({})).toBe(false);
    expect(hasContent({ organizationName: "", decisionDomains: [], noticeElementText: {} })).toBe(false);
    expect(hasContent({ q1: "", q4: [], processingMethods: { collection_method: "" }, retentionByPiCategory: [{ pi_category: "", retention_period: "" }] })).toBe(false);
    expect(hasContent({ a: "   " })).toBe(false);
    expect(hasContent(null)).toBe(false);
    expect(hasContent(undefined)).toBe(false);
  });

  it("accepts a payload once any scalar is filled", () => {
    expect(hasContent({ organizationName: "EUP QA Fictional Retail LLC" })).toBe(true);
    expect(hasContent({ decisionDomains: ["Housing"] })).toBe(true);
    expect(hasContent({ nested: { deeper: { value: 1 } } })).toBe(true);
    expect(hasContent({ flag: false })).toBe(true); // a chosen boolean is an answer
  });
});

describe("ROPA 01 — countsAsOpenFlag", () => {
  it("advisory flags never count as open", () => {
    expect(countsAsOpenFlag("cross_sell")).toBe(false);
    expect(countsAsOpenFlag("recommendation")).toBe(false);
  });
  it("blocking and warning flags count", () => {
    expect(countsAsOpenFlag("missing_required")).toBe(true);
    expect(countsAsOpenFlag("retention_undefined")).toBe(true);
    expect(countsAsOpenFlag("high_risk_activity")).toBe(true);
  });
  it("an unknown or absent type is treated as open (conservative)", () => {
    expect(countsAsOpenFlag(undefined)).toBe(true);
    expect(countsAsOpenFlag(null)).toBe(true);
    expect(countsAsOpenFlag("something_new")).toBe(true);
  });
});

describe("EU 02 — representative questions follow the establishment answer", () => {
  const euRep = GDPR_ART13_QUESTIONS.find((q) => q.key === "gdpr_controller_representative")!;
  const ukRep = GDPR_ART13_QUESTIONS.find((q) => q.key === "gdpr_uk_representative")!;

  it("an EU/EEA-established controller is not asked about an EU representative", () => {
    expect(evaluateShowIf(euRep, { establishment_jurisdiction: "eea" })).toBe(false);
    expect(evaluateShowIf(euRep, { establishment_jurisdiction: "uk" })).toBe(true);
    expect(evaluateShowIf(euRep, { establishment_jurisdiction: "outside" })).toBe(true);
  });

  it("a UK-established controller is not asked about a UK representative", () => {
    expect(evaluateShowIf(ukRep, { establishment_jurisdiction: "uk" })).toBe(false);
    expect(evaluateShowIf(ukRep, { establishment_jurisdiction: "eea" })).toBe(true);
  });

  it("with no establishment answer yet, both questions stay visible (conservative)", () => {
    expect(evaluateShowIf(euRep, {})).toBe(true);
    expect(evaluateShowIf(ukRep, {})).toBe(true);
  });

  it("evaluateShowIf honours equals / not_equals / contains", () => {
    const base = { key: "x", text: "", whyWeAsk: "", type: "text_short", isRequired: false } as const;
    expect(evaluateShowIf({ ...base, showIf: { questionKey: "a", operator: "equals", value: "yes" } } as never, { a: "yes" })).toBe(true);
    expect(evaluateShowIf({ ...base, showIf: { questionKey: "a", operator: "equals", value: "yes" } } as never, { a: "no" })).toBe(false);
    expect(evaluateShowIf({ ...base, showIf: { questionKey: "a", operator: "contains", value: ["b", "c"] } } as never, { a: ["c"] })).toBe(true);
    expect(evaluateShowIf({ ...base, showIf: { questionKey: "a", operator: "contains", value: ["b"] } } as never, { a: "b" })).toBe(false);
    expect(evaluateShowIf(base as never, {})).toBe(true);
  });
});
