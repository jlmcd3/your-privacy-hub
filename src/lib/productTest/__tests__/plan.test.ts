// Pure planning + arithmetic tests for /admin/product-test (doc 272).
// No Supabase, no network — everything here is a pure function from
// src/lib/productTest/plan.ts.
import { describe, expect, it } from "vitest";
import {
  DETERMINISTIC_TOOLS,
  clampCopies,
  distinctFixtureIndexes,
  evaluateLaunchBars,
  goldenVariant,
  isDeterministicTool,
  normalizeVariantKinds,
  overallSummary,
  planDocumentUnits,
  planFixturePicks,
  selectVariantsByKind,
  stabilitySeverityFor,
  summaryFromDocuments,
  toolSummary,
  wantsMessyVariants,
  admtSectionForKey,
  notReachedSections,
} from "../plan";
import type { PanelTool, Variant } from "../types";

function v(id: string, kind: Variant["kind"]): Variant {
  return {
    variant_id: id,
    kind,
    description: id,
    intake: {},
    removed_keys: [],
    expectations: { must_report_not_recorded: [], must_not_contain: [], must_contain: [] },
  };
}

describe("clampCopies", () => {
  it("clamps into 1-15", () => {
    expect(clampCopies(0)).toBe(1);
    expect(clampCopies(-5)).toBe(1);
    expect(clampCopies(1)).toBe(1);
    expect(clampCopies(15)).toBe(15);
    expect(clampCopies(20)).toBe(15);
    expect(clampCopies(7.6)).toBe(8);
  });
  it("falls back to 1 for non-finite input", () => {
    expect(clampCopies(NaN)).toBe(1);
  });
});

describe("planFixturePicks — copies and repeat logic (doc 272 §2)", () => {
  it("cycles through the 15-fixture panel by (k-1) % 15 when not repeating", () => {
    const picks = planFixturePicks(["dpia"], 4, false);
    expect(picks).toEqual([
      { tool: "dpia", copyIndex: 1, fixtureIndex: 0 },
      { tool: "dpia", copyIndex: 2, fixtureIndex: 1 },
      { tool: "dpia", copyIndex: 3, fixtureIndex: 2 },
      { tool: "dpia", copyIndex: 4, fixtureIndex: 3 },
    ]);
  });

  it("wraps at panel size", () => {
    const picks = planFixturePicks(["dpia"], 3, false, 2);
    expect(picks.map((p) => p.fixtureIndex)).toEqual([0, 1, 0]);
  });

  it("uses fixture 0 for every copy when repeatSameFixture is true", () => {
    const picks = planFixturePicks(["lia"], 5, true);
    expect(picks.every((p) => p.fixtureIndex === 0)).toBe(true);
    expect(picks.map((p) => p.copyIndex)).toEqual([1, 2, 3, 4, 5]);
  });

  it("plans independently per tool", () => {
    const picks = planFixturePicks(["dpia", "lia"], 2, false);
    expect(picks.filter((p) => p.tool === "dpia")).toHaveLength(2);
    expect(picks.filter((p) => p.tool === "lia")).toHaveLength(2);
  });

  it("a re-run with the same settings reproduces the same picks (determinism)", () => {
    const a = planFixturePicks(["governance"], 6, false);
    const b = planFixturePicks(["governance"], 6, false);
    expect(a).toEqual(b);
  });
});

describe("distinctFixtureIndexes", () => {
  it("dedupes repeated (tool, fixture) pairs", () => {
    const picks = planFixturePicks(["lia"], 5, true); // all fixtureIndex 0
    expect(distinctFixtureIndexes(picks)).toEqual([{ tool: "lia", fixtureIndex: 0 }]);
  });

  it("keeps every distinct pair when not repeating", () => {
    const picks = planFixturePicks(["lia"], 3, false);
    expect(distinctFixtureIndexes(picks)).toEqual([
      { tool: "lia", fixtureIndex: 0 },
      { tool: "lia", fixtureIndex: 1 },
      { tool: "lia", fixtureIndex: 2 },
    ]);
  });
});

describe("normalizeVariantKinds / wantsMessyVariants (doc 272 §3-§4)", () => {
  it("always includes golden even when not requested", () => {
    expect(normalizeVariantKinds([])).toEqual(["golden"]);
  });
  it("cannot be removed by explicit omission and orders kinds stably", () => {
    const kinds = normalizeVariantKinds(["wrong-regime", "thin-all"]);
    expect(kinds).toEqual(["golden", "thin-all", "wrong-regime"]);
  });
  it("golden-only is not messy", () => {
    expect(wantsMessyVariants(["golden"])).toBe(false);
    expect(wantsMessyVariants([])).toBe(false);
  });
  it("any non-golden kind makes the plan messy", () => {
    expect(wantsMessyVariants(["contradict"])).toBe(true);
  });
});

describe("selectVariantsByKind", () => {
  it("keeps only variants whose kind was selected, including duplicates of a kind", () => {
    const all = [v("g", "golden"), v("t1", "thin-one"), v("t2", "thin-one"), v("c1", "contradict")];
    const kept = selectVariantsByKind(all, ["thin-one"]);
    expect(kept.map((x) => x.variant_id)).toEqual(["g", "t1", "t2"]); // golden always kept too
  });
});

describe("goldenVariant", () => {
  it("builds a golden variant with empty expectations and no removed keys", () => {
    const g = goldenVariant({ a: 1 });
    expect(g.variant_id).toBe("golden");
    expect(g.kind).toBe("golden");
    expect(g.intake).toEqual({ a: 1 });
    expect(g.removed_keys).toEqual([]);
    expect(g.expectations).toEqual({ must_report_not_recorded: [], must_not_contain: [], must_contain: [] });
  });
});

describe("planDocumentUnits", () => {
  it("expands each pick by its fixture's variants", () => {
    const picks = planFixturePicks(["dpia"], 2, false);
    const map = new Map<string, Variant[]>([
      ["dpia#0", [v("golden", "golden")]],
      ["dpia#1", [v("golden", "golden"), v("c1", "contradict")]],
    ]);
    const units = planDocumentUnits(picks, map);
    expect(units).toHaveLength(3);
    expect(units.filter((u) => u.fixtureIndex === 1)).toHaveLength(2);
  });

  it("produces no units for a pick with no known variants", () => {
    const picks = planFixturePicks(["dpia"], 1, false);
    const units = planDocumentUnits(picks, new Map());
    expect(units).toHaveLength(0);
  });
});

describe("isDeterministicTool / stabilitySeverityFor (doc 272 §0, §6.6)", () => {
  it("the six deterministic tools are exactly the engine-rendered ones (governance excluded until its production flag is confirmed)", () => {
    expect([...DETERMINISTIC_TOOLS].sort()).toEqual(
      ["cppa-admt", "cppa-cyber", "cppa-risk", "dpia", "lia", "registration"].sort(),
    );
    expect(stabilitySeverityFor("governance")).toBe("editorial");
  });
  it("stability severity is high for deterministic tools, editorial otherwise", () => {
    expect(stabilitySeverityFor("dpia")).toBe("high");
    expect(stabilitySeverityFor("cppa-risk")).toBe("high");
    expect(isDeterministicTool("dpa" as PanelTool)).toBe(false);
    expect(stabilitySeverityFor("dpa" as PanelTool)).toBe("editorial");
    expect(stabilitySeverityFor("ropa" as PanelTool)).toBe("editorial");
  });
});

describe("toolSummary — summary arithmetic (doc 272 §6 'Score')", () => {
  it("computes document and check pass rates", () => {
    const docs = [{ document_pass: true }, { document_pass: true }, { document_pass: false }, { document_pass: null }];
    const checks = [
      { passed: true, severity: "critical" as const },
      { passed: false, severity: "critical" as const },
      { passed: false, severity: "high" as const },
      { passed: true, severity: "editorial" as const },
      { passed: false, severity: "editorial" as const },
    ];
    const s = toolSummary(docs, checks);
    expect(s.documents).toBe(4);
    // document_pass_rate excludes the still-pending (null) document: 2/3.
    expect(s.document_pass_rate).toBeCloseTo(2 / 3);
    expect(s.checks_total).toBe(5);
    expect(s.checks_passed).toBe(2);
    expect(s.check_pass_rate).toBeCloseTo(2 / 5);
    expect(s.critical).toBe(1);
    expect(s.high).toBe(1);
    expect(s.editorial).toBe(1);
  });

  it("is vacuously 100% with no documents or checks", () => {
    const s = toolSummary([], []);
    expect(s.document_pass_rate).toBe(1);
    expect(s.check_pass_rate).toBe(1);
  });
});

describe("overallSummary", () => {
  it("aggregates per-tool summaries into totals with a true ratio, not an average of rates", () => {
    const perTool = {
      "cppa-risk": toolSummary(
        [{ document_pass: true }, { document_pass: true }],
        [{ passed: true, severity: "high" as const }, { passed: true, severity: "high" as const }],
      ),
      "dpia": toolSummary(
        [{ document_pass: false }, { document_pass: true }],
        [{ passed: false, severity: "critical" as const }, { passed: true, severity: "high" as const }],
      ),
    };
    const overall = overallSummary(perTool);
    expect(overall.documents).toBe(4);
    expect(overall.document_pass_rate).toBeCloseTo(3 / 4);
    expect(overall.checks_total).toBe(4);
    expect(overall.checks_passed).toBe(3);
    expect(overall.check_pass_rate).toBeCloseTo(3 / 4);
    expect(overall.critical).toBe(1);
  });
});

describe("evaluateLaunchBars (doc 272 §6 table)", () => {
  it("golden runs need 100% document pass, messy runs need 98%; checks always need 98%", () => {
    const perfect = { document_pass_rate: 1, check_pass_rate: 1 };
    expect(evaluateLaunchBars(perfect, false).documentBarMet).toBe(true);
    expect(evaluateLaunchBars(perfect, false).documentBar).toBeCloseTo(1);

    const ninetyNine = { document_pass_rate: 0.99, check_pass_rate: 0.99 };
    expect(evaluateLaunchBars(ninetyNine, false).documentBarMet).toBe(false); // golden bar is 100%
    expect(evaluateLaunchBars(ninetyNine, true).documentBarMet).toBe(true); // messy bar is 98%

    const belowCheckBar = { document_pass_rate: 1, check_pass_rate: 0.97 };
    expect(evaluateLaunchBars(belowCheckBar, false).checkBarMet).toBe(false);

    const atCheckBar = { document_pass_rate: 1, check_pass_rate: 0.98 };
    expect(evaluateLaunchBars(atCheckBar, false).checkBarMet).toBe(true);
  });
});

describe("toolSummary — failed generation (lead fix 2026-09-18, run 72e9a63c)", () => {
  it("a document that failed to generate counts as a failed document, never as unscored", () => {
    const ts = toolSummary(
      [{ document_pass: null, status: "failed" }, { document_pass: true, status: "graded" }],
      [{ passed: true, severity: "editorial" }],
    );
    expect(ts.documents).toBe(2);
    expect(ts.document_pass_rate).toBeCloseTo(0.5);
  });
  it("all documents failed to generate gives 0%, not a vacuous 100%", () => {
    const ts = toolSummary([{ document_pass: null, status: "failed" }], []);
    expect(ts.document_pass_rate).toBe(0);
  });
});

describe("summaryFromDocuments — from the document rows' own columns (lead fix 2026-09-18, run 8e0f2e5c)", () => {
  it("sums the grading function's columns and adds the page-written rows", () => {
    const docs = [
      { document_pass: true, status: "graded", checks_total: 48, checks_failed: 0, critical: 0, high: 0, editorial: 0 },
      { document_pass: false, status: "graded", checks_total: 48, checks_failed: 2, critical: 1, high: 1, editorial: 0 },
      { document_pass: null, status: "pending" },
      { document_pass: null, status: "failed" },
    ];
    const page = [{ passed: true, severity: "high" as const }, { passed: false, severity: "high" as const }];
    const s = summaryFromDocuments(docs, page);
    expect(s.documents).toBe(4);
    expect(s.document_pass_rate).toBeCloseTo(1 / 3); // pending excluded; failed counts as failed
    expect(s.checks_total).toBe(98);
    expect(s.checks_passed).toBe(95);
    expect(s.critical).toBe(1);
    expect(s.high).toBe(2);
  });
});

describe("ADMT not-reached gate (run 6001444d)", () => {
  it("maps notice, opt-out, access and vendor keys to their sections and leaves scope keys ungated", () => {
    expect(admtSectionForKey("notice_purpose_text")).toBe("notice");
    expect(admtSectionForKey("opt_out_methods")).toBe("optout");
    expect(admtSectionForKey("appeal_reviewer_authority")).toBe("optout");
    expect(admtSectionForKey("access_trade_secret_policy")).toBe("access");
    expect(admtSectionForKey("admt_detail.vendor_status")).toBe("vendor");
    expect(admtSectionForKey("admt_detail.v_incident")).toBe("vendor");
    expect(admtSectionForKey("third_party_admt")).toBe("vendor");
    expect(admtSectionForKey("human_review")).toBeNull();
    expect(admtSectionForKey("admt_detail.hi_reviewer_present")).toBeNull();
    expect(admtSectionForKey("role_roster")).toBeNull();
  });
  it("reads the Not reached stubs from a rendered skeleton and nothing else", () => {
    const skeleton = { sections: [
      { id: "scope", paragraphs: [{ text: "On the Company's reported facts the System is out of scope." }] },
      { id: "notice", paragraphs: [{ text: "Not reached. On the Company's reported facts the System is outside Article 11 for this decision (Section 2), so the Pre-use Notice requirements are not assessed in this report." }] },
      { id: "optout", paragraphs: [{ text: "Not reached, for the reason stated in Section 3: the opt-out and exception requirements are not assessed in this report." }] },
      { id: "vendor", paragraphs: [{ text: "The Company does not use a third-party ADMT." }] },
    ] };
    expect([...notReachedSections(skeleton)].sort()).toEqual(["notice", "optout"]);
    expect(notReachedSections(undefined).size).toBe(0);
    expect(notReachedSections({ sections: "nope" }).size).toBe(0);
  });
});
