// SO-9 battery — CCPA / CPRA Scope Assessment deterministic encode.
//
// Covers: byte-pinned spine hash, shard integrity (slot substitution is
// reversible), determinism, register lint, iff-cited Table of Authorities,
// and the three deterministic [GENERATED] composers.

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import {
  SCOPE_SPINE,
  SCOPE_SPINE_SHA256,
  SCOPE_PIPELINE_STAMP,
  SCOPE_STATUTORY_REGISTRY,
} from "@/lib/scope/scope-spine";
import {
  renderScopeDocument,
  lintScopeDocument,
  scopeState,
  type ScopeAnswers,
  type ScopeEvaluation,
} from "@/lib/scope/scope-skeleton-render";

const PERFECT: ScopeAnswers = {
  entity_name: "Halden Data Services, Inc.",
  q1: "Yes",
  q2: "$100M–$500M",
  q2_legacy_confirm: "",
  q3: "Over 1 million",
  q4: "Both",
  q5: "Yes",
  q6: "Yes",
  q7: "Yes",
  q9_250k: "Yes",
  q10_spi_50k: "Yes",
  q8a_meets_definition: "Yes",
  q8b_registered_cppa: "No",
};

const EVAL: ScopeEvaluation = {
  inScopeConfident: true,
  inScopeUnsure: false,
  cyberScope: "required",
  riskAssessment: "required",
  sensitiveResult: "required",
  admtResult: "required",
  brokerObligation: "required",
  cyberDeadline: { label: "April 1, 2028", needsBandConfirmation: false },
};

const OUT_OF_SCOPE: ScopeAnswers = {
  ...PERFECT,
  entity_name: "Small Shop LLC",
  q2: "Under $26.625 million",
  q3: "Fewer than 100,000",
  q4: "No",
  q5: "No",
  q6: "No",
  q7: "No",
  q9_250k: "No",
  q10_spi_50k: "No",
  q8a_meets_definition: "No",
  q8b_registered_cppa: "N/A — not a data broker",
};

const OUT_EVAL: ScopeEvaluation = {
  inScopeConfident: false,
  inScopeUnsure: false,
  cyberScope: "not_triggered_on_answers",
  riskAssessment: "not_triggered_on_answers",
  sensitiveResult: "not_triggered_on_answers",
  admtResult: "not_triggered_on_answers",
  brokerObligation: "not_triggered_on_answers",
  cyberDeadline: { label: "April 1, 2030", needsBandConfirmation: false },
};

const UNDETERMINED: ScopeAnswers = {
  ...OUT_OF_SCOPE,
  entity_name: "Meridian Analytics Ltd.",
  q2: "Unsure",
  q3: "Unsure",
  q5: "Unsure",
  q6: "Unsure",
  q7: "Unsure",
  q8a_meets_definition: "Unsure",
};

const UNDET_EVAL: ScopeEvaluation = {
  ...OUT_EVAL,
  cyberScope: "needs_counsel_review",
  riskAssessment: "needs_counsel_review",
  cyberDeadline: { label: "Confirm revenue band to determine deadline", needsBandConfirmation: true },
};

const AT = { generatedAt: "2026-08-10T00:00:00.000Z" };

describe("SO-9 — byte-pinned spine", () => {
  it("spine is 20 paragraphs", () => {
    expect(SCOPE_SPINE).toHaveLength(20);
  });

  it("SHA-256 over the joined spine matches the CEO certification", () => {
    const h = createHash("sha256").update(SCOPE_SPINE.join("\n")).digest("hex");
    expect(h).toBe(SCOPE_SPINE_SHA256);
    expect(h).toBe("21d6feb4eca175b687e1d99df060b88d6de354a6a2da0783c1eb8b510170fe40");
  });

  it("spine is pure ASCII with straight quotes and no entities", () => {
    const joined = SCOPE_SPINE.join("\n");
    // eslint-disable-next-line no-control-regex
    expect(/[^\x00-\x7F]/.test(joined)).toBe(false);
    expect(joined).not.toMatch(/&#x|&amp;|&quot;/);
  });

  it("stamp is the SO-9 pipeline stamp", () => {
    expect(SCOPE_PIPELINE_STAMP).toBe("scope-pipeline@item-so9-2026-08-10");
  });
});

describe("SO-9 — shard integrity (slotted paragraphs)", () => {
  it("slot substitution in P8 is reversible to the certified paragraph", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    const p8 = doc.paragraphs.find((p) => p.index === 8)!;
    const fixedShards = SCOPE_SPINE[8].split(/\{[^}]*\}/);
    // Every fixed shard survives verbatim, in order.
    let cursor = 0;
    for (const shard of fixedShards) {
      if (!shard) continue;
      const at = p8.text.indexOf(shard, cursor);
      expect(at).toBeGreaterThanOrEqual(0);
      cursor = at + shard.length;
    }
  });

  it("slot substitution in P11 preserves every fixed shard verbatim", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    const p11 = doc.paragraphs.find((p) => p.index === 11)!;
    let cursor = 0;
    for (const shard of SCOPE_SPINE[11].split(/\{[^}]*\}/)) {
      if (!shard) continue;
      const at = p11.text.indexOf(shard, cursor);
      expect(at).toBeGreaterThanOrEqual(0);
      cursor = at + shard.length;
    }
  });

  it("fixed paragraphs emit byte-identically", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    for (const i of [0, 1, 3, 5, 7, 9, 13, 15, 18]) {
      expect(doc.paragraphs.find((p) => p.index === i)!.text).toBe(SCOPE_SPINE[i]);
    }
  });

  it("the register guide (P2) and the ToA assembly rule (P19) never reach the reader", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    const indices = doc.paragraphs.map((p) => p.index);
    expect(indices).not.toContain(2);
    expect(indices).not.toContain(19);
  });
});

describe("SO-9 — deterministic composition (no model step)", () => {
  it("two renders of the same input are byte-identical", () => {
    const a = renderScopeDocument(PERFECT, EVAL, AT);
    const b = renderScopeDocument(PERFECT, EVAL, AT);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("all three [GENERATED] paragraphs are composed, not dropped", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    for (const i of [6, 12, 17]) {
      const p = doc.paragraphs.find((x) => x.index === i)!;
      expect(p.kind).toBe("generated");
      expect(p.text.length).toBeGreaterThan(80);
      expect(p.text).not.toContain("[GENERATED]");
    }
  });

  it("all three [DETERMINATION LEAD] paragraphs are single-sentence verdicts", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    for (const i of [4, 10, 16]) {
      const p = doc.paragraphs.find((x) => x.index === i)!;
      expect(p.kind).toBe("lead");
      expect(p.text).not.toContain("[DETERMINATION LEAD]");
      expect(p.text.trim().endsWith(".")).toBe(true);
    }
  });

  it("the closing paragraph ends on a single next act", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    expect(doc.paragraphs.find((p) => p.index === 17)!.text).toContain("The single next act is to");
  });
});

describe("SO-9 — determination correctness", () => {
  it("in-scope verdict names the satisfied limbs", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    const lead = doc.paragraphs.find((p) => p.index === 4)!.text;
    expect(lead).toContain("Halden Data Services, Inc. is a business within the scope of the CCPA");
    expect(lead).toContain("the annual-gross-revenue limb");
  });

  it("out-of-scope verdict is stated without assuming", () => {
    const doc = renderScopeDocument(OUT_OF_SCOPE, OUT_EVAL, AT);
    expect(doc.paragraphs.find((p) => p.index === 4)!.text).toContain(
      "is not a business within the scope of the CCPA on the answers given",
    );
    expect(scopeState(OUT_OF_SCOPE).state).toBe("not_in_scope");
  });

  it("Unsure never becomes a finding either way", () => {
    const doc = renderScopeDocument(UNDETERMINED, UNDET_EVAL, AT);
    const lead = doc.paragraphs.find((p) => p.index === 4)!.text;
    expect(lead).toContain("scope is not determinable on the answers given");
    expect(scopeState(UNDETERMINED).state).toBe("not_determinable");
  });

  it("undetermined limbs are named with what would settle them", () => {
    const body = renderScopeDocument(UNDETERMINED, UNDET_EVAL, AT)
      .paragraphs.find((p) => p.index === 12)!.text;
    expect(body).toContain("What would settle it is");
    expect(body).toContain("$26,625,000");
  });

  it("legacy straddling revenue band folds a confirmation clause into the nexus paragraph", () => {
    const doc = renderScopeDocument(
      { ...PERFECT, q2: "$25M–$100M", q2_legacy_confirm: "AboveThreshold" },
      EVAL,
      AT,
    );
    expect(doc.paragraphs.find((p) => p.index === 8)!.text).toContain(
      "having confirmed that prior-calendar-year gross revenue stood at or above the CPI-adjusted threshold of $26,625,000",
    );
  });

  it("statutory figures come from the verified registry", () => {
    expect(SCOPE_STATUTORY_REGISTRY.revenue.figure).toBe("$26,625,000");
    expect(SCOPE_STATUTORY_REGISTRY.consumers.figure).toBe("100,000");
    expect(SCOPE_STATUTORY_REGISTRY.saleShare.figure).toBe("50 percent");
  });
});

describe("SO-9 — conditional obligations (P14)", () => {
  it("each attaching obligation gets its own sentence", () => {
    const t = renderScopeDocument(PERFECT, EVAL, AT).paragraphs.find((p) => p.index === 14)!.text;
    expect(t).toContain("Section 1798.121");
    expect(t).toContain("Section 7220");
    expect(t).toContain("Section 1798.99.82");
    expect(t).toContain("Section 7120(b)");
  });

  it("where none attaches, one honest sentence says so", () => {
    const t = renderScopeDocument(OUT_OF_SCOPE, OUT_EVAL, AT).paragraphs.find((p) => p.index === 14)!.text;
    expect(t).toContain("None of the processing-specific obligations in this section attaches");
    expect(t.split(". ").length).toBe(1);
  });
});

describe("SO-9 — Table of Authorities is iff-cited", () => {
  it("every listed authority appears in the prose", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    // Prose uses the counsel register form ("Section 1798.121"); the table uses
    // the reporter form ("Cal. Civ. Code § 1798.121"). Compare on the section
    // number itself, which is identical in both.
    const prose = doc.paragraphs.map((p) => p.text).join(" ");
    for (const a of doc.authorities) {
      const num = a.pinpoint.replace(/^.*?\u00A7\u00A7?\s*/, "").split(/[\u2013\u2014]/)[0].trim();
      expect(num.length).toBeGreaterThan(0);
      expect(prose.includes(num)).toBe(true);
    }
  });


  it("uncited obligations never reach the table", () => {
    const doc = renderScopeDocument(OUT_OF_SCOPE, OUT_EVAL, AT);
    const pins = doc.authorities.map((a) => a.pinpoint);
    expect(pins).not.toContain("Cal. Civ. Code \u00A7 1798.121");
    expect(pins).not.toContain("11 CCR \u00A7 7220");
    expect(pins).not.toContain("11 CCR \u00A7 7121");
  });

  it("grouped in brief order with regulations first", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    const groups = doc.authorities.map((a) => a.group);
    const firstStatute = groups.indexOf("Statutes");
    const lastReg = groups.lastIndexOf("Regulations");
    expect(lastReg).toBeLessThan(firstStatute);
  });

  it("authorities carry section back-references", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    for (const a of doc.authorities) expect(a.backrefs.length).toBeGreaterThan(0);
  });

  it("nothing is labelled binding under the persuasive group", () => {
    const doc = renderScopeDocument(PERFECT, EVAL, AT);
    for (const a of doc.authorities) {
      if (a.group === "Guidance and Persuasive Authority") expect(a.persuasive).toBe(true);
    }
  });
});

describe("SO-9 — counsel register lint", () => {
  it("no banned phrase, unfilled slot, marker, or rhetorical question in any fixture", () => {
    for (const [a, e] of [
      [PERFECT, EVAL],
      [OUT_OF_SCOPE, OUT_EVAL],
      [UNDETERMINED, UNDET_EVAL],
    ] as const) {
      expect(lintScopeDocument(renderScopeDocument(a, e, AT))).toEqual([]);
    }
  });

  it("facts are attributed to the company, never to a record", () => {
    const prose = renderScopeDocument(PERFECT, EVAL, AT)
      .paragraphs.map((p) => p.text)
      .join(" ")
      .toLowerCase();
    expect(prose).toContain("the company has");
    expect(prose).not.toContain("the record");
  });

  it("proper nouns and abbreviations survive intact", () => {
    const prose = renderScopeDocument(PERFECT, EVAL, AT).paragraphs.map((p) => p.text).join(" ");
    expect(prose).toContain("Halden Data Services, Inc.");
    expect(prose).toContain("California Privacy Protection Agency");
    expect(prose).toContain("CCPA");
  });

  it("falls back to a neutral subject when no entity name is given", () => {
    const doc = renderScopeDocument({ ...PERFECT, entity_name: "" }, EVAL, AT);
    expect(doc.paragraphs.find((p) => p.index === 4)!.text).toContain("The company is a business");
  });
});
