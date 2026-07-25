// T7-RISK-OPENING-PARAGRAPH-PILOT — green tests for the deterministic
// opening_summary slot builder. Runs via bunx vitest (project convention).

import { describe, it, expect } from "vitest";
import { buildRiskOpening, RISK_OPENING_VERSION } from "./risk-opening.ts";
import {
  CCPA_1798_140_D_1_A,
  CCPA_1798_140_D_1_B,
} from "./ccpa-1798-140-pin.ts";

const base = {
  entity_name: "Meridian SaaS Inc.",
  q1_revenue: "$25M–$50M",
  q2_consumers: "250,000–1 million",
  q5_sell_share: "No",
  q5b_profiling_observation: "No",
  q15_sensitive_pi: "No",
  q18_admt_use: "No",
  q18b_admt_training: "No",
  sensitive_location_basis: "Not applicable — no sensitive-location processing",
  q4_pi_categories: ["Contact identifiers (name, email, phone)"],
  i1_processing_purpose: "Deliver core SaaS analytics functionality.",
  i1b_min_pi: "We collect only identifiers necessary to provision accounts and bill customers.",
  i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
};

const AS_OF = "2026-07-25";

describe("buildRiskOpening — S0 CCPA applicability", () => {
  it("OMITS S0 entirely when no criterion unambiguously resolves ($25M–$50M straddles; sell/share = No)", () => {
    const r = buildRiskOpening(base, { asOfDate: AS_OF });
    expect(r.slots.S0).toBeNull();
    expect(r.provenance.s0_criteria).toEqual([]);
    expect(r.provenance.omitted).toContain("S0:no_criteria_unambiguously_resolved");
    expect(r.text).not.toMatch(/subject to the CCPA/);
  });

  it("ASSERTS (A) only when revenue band unambiguously clears the corpus figure", () => {
    const r = buildRiskOpening({ ...base, q1_revenue: "$50M–$100M" }, { asOfDate: AS_OF });
    expect(r.provenance.s0_criteria).toEqual(["A"]);
    expect(r.slots.S0).toContain("(A)");
    // Corpus figure VERBATIM including CPI-adjustment cross-reference — never hard-coded.
    expect(r.slots.S0).toContain(CCPA_1798_140_D_1_A);
    expect(r.slots.S0).toContain("as adjusted pursuant to subdivision (d) of Section 1798.199.95");
  });

  it("OMITS (A) on straddling band $25M–$50M", () => {
    const r = buildRiskOpening({ ...base, q1_revenue: "$25M–$50M", q5_sell_share: "Both" }, { asOfDate: AS_OF });
    expect(r.provenance.s0_criteria).not.toContain("A");
  });

  it("REJECTS (B) when consumers band >= 100k but sell/share = No (semantics gate)", () => {
    const r = buildRiskOpening(
      { ...base, q2_consumers: "1–10 million", q5_sell_share: "No" },
      { asOfDate: AS_OF },
    );
    expect(r.provenance.s0_criteria).not.toContain("B");
    expect(r.slots.S0).toBeNull();
  });

  it("ASSERTS (B) with verbatim corpus quote when consumers >= 100k AND sell/share affirmative", () => {
    const r = buildRiskOpening(
      { ...base, q2_consumers: "250,000–1 million", q5_sell_share: "Both" },
      { asOfDate: AS_OF },
    );
    expect(r.provenance.s0_criteria).toContain("B");
    expect(r.slots.S0).toContain(CCPA_1798_140_D_1_B);
    // Preserves buys/sells/shares disjunction + consumer-or-household object verbatim.
    expect(r.slots.S0).toContain("buys, sells, or shares");
    expect(r.slots.S0).toContain("100,000 or more consumers or households");
  });

  it("Enumerates multi-criteria in statutory order A,B (all-that-apply)", () => {
    const r = buildRiskOpening(
      { ...base, q1_revenue: "Over $500M", q2_consumers: "Over 10 million", q5_sell_share: "Both" },
      { asOfDate: AS_OF },
    );
    expect(r.provenance.s0_criteria).toEqual(["A", "B"]);
    const s0 = r.slots.S0 ?? "";
    expect(s0.indexOf("(A)")).toBeLessThan(s0.indexOf("(B)"));
    expect(s0.indexOf("(A)")).toBeGreaterThan(-1);
  });
});

describe("buildRiskOpening — S1 § 7150(b) triggers", () => {
  it("Emits triggers in statutory order (b)(1)..(b)(6)", () => {
    const r = buildRiskOpening(
      {
        ...base,
        q5_sell_share: "Both",
        q15_sensitive_pi: "Yes",
        q18_admt_use: "Yes",
        q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
        q18b_admt_training: "Yes",
      },
      { asOfDate: AS_OF },
    );
    expect(r.provenance.s1_triggers).toEqual([1, 2, 3, 4, 6]);
    const s1 = r.slots.S1 ?? "";
    expect(s1.indexOf("(1)")).toBeLessThan(s1.indexOf("(2)"));
    expect(s1.indexOf("(3)")).toBeLessThan(s1.indexOf("(4)"));
  });

  it("Omits S1 entirely when no trigger resolves", () => {
    const r = buildRiskOpening(base, { asOfDate: AS_OF });
    expect(r.slots.S1).toBeNull();
    expect(r.provenance.omitted).toContain("S1:no_trigger_resolved");
  });
});

describe("buildRiskOpening — S4 safeguards omission", () => {
  it("Omits S4 when intake safeguards silent (surfaces later as customer question, not in opening)", () => {
    const r = buildRiskOpening(
      { ...base, i4_disclosure_mechanisms: [], i1b_min_pi: "" },
      { asOfDate: AS_OF },
    );
    expect(r.slots.S4).toBeNull();
    expect(r.text).not.toMatch(/information needed|please provide|missing/i);
  });
});

describe("buildRiskOpening — S3 polarity locks", () => {
  it("Preserves 'does not sell or share' negation when q5_sell_share = No", () => {
    const r = buildRiskOpening(base, { asOfDate: AS_OF });
    expect(r.slots.S3).toContain("does not sell or share");
  });
  it("Preserves ADMT negation when q18_admt_use = No", () => {
    const r = buildRiskOpening(base, { asOfDate: AS_OF });
    expect(r.slots.S3).toContain("does not use ADMT");
  });
});

describe("buildRiskOpening — S5/S6 frame + date", () => {
  it("Always emits § 7152 frame and as-of date; version stamp attached", () => {
    const r = buildRiskOpening(base, { asOfDate: AS_OF });
    expect(r.slots.S5).toContain("\u00A7 7152");
    expect(r.slots.S6).toBe("As of 2026-07-25.");
    expect(r.provenance.version).toBe(RISK_OPENING_VERSION);
  });
});

describe("buildRiskOpening — corpus pin identity", () => {
  it("(A) quote is byte-identical to CCPA_1798_140_D_1_A", () => {
    const r = buildRiskOpening(
      { ...base, q1_revenue: "Over $500M" },
      { asOfDate: AS_OF },
    );
    expect(r.slots.S0).toContain(CCPA_1798_140_D_1_A);
  });
  it("(B) quote is byte-identical to CCPA_1798_140_D_1_B", () => {
    const r = buildRiskOpening(
      { ...base, q2_consumers: "Over 10 million", q5_sell_share: "Both" },
      { asOfDate: AS_OF },
    );
    expect(r.slots.S0).toContain(CCPA_1798_140_D_1_B);
  });
});
