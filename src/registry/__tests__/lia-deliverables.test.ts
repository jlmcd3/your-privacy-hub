/**
 * ITEM 311 — pin tests for the lia analytic deliverables (Chapter 7 rebuild).
 *
 * Three jobs:
 *  1. CORPUS PIN — every registry row the deliverables cite must be an exact
 *     substring of the approved corpus snapshot. A retyped quotation fails.
 *  2. SHAPE PIN — each deliverable carries the Op. 1 analysis shape
 *     (standard -> record fact -> application -> verdict), never a recitation.
 *  3. BEHAVIOUR PIN — the determinations the CEO asked for actually flip on
 *     the facts they are supposed to turn on, and the Op. 5 mitigation defect
 *     (measures the GDPR already requires counted as mitigations) stays fixed.
 */
import { describe, it, expect } from "vitest";
import {
  EDPB_1_2024_EXCERPTS,
  GDPR_PROVISION_EXCERPTS,
  UK_GDPR_PROVISION_EXCERPTS,
} from "./__fixtures__/lia-corpus-snapshot";
import {
  LIA_VERIFIED_AUTHORITIES,
  LIA_UNANCHORED_PROPOSITIONS,
} from "../../../supabase/functions/_shared/registry/lia-verified-authorities";
import {
  buildChildFactor,
  buildDetermination,
  buildLiaDeliverables,
  buildPublicAuthorityExclusion,
  buildReasonableExpectations,
  classifyRecordedMitigations,
} from "../../../supabase/functions/_shared/ltp/lia-deliverables/build";
import { ANCHOR_KEYS } from "../../../supabase/functions/_shared/ltp/lia-deliverables/elements";
import { LIA_GOLDEN } from "../../../supabase/functions/_shared/golden/lia";

const CORPUS = [
  ...Object.values(EDPB_1_2024_EXCERPTS),
  ...Object.values(GDPR_PROVISION_EXCERPTS),
  // ITEM 326 — UK Arts. 22A-22D / Art. 6(1)(ea) rows are pinned to the UK
  // corpus, not the EU one; the two regimes' texts differ.
  ...Object.values(UK_GDPR_PROVISION_EXCERPTS),
];

function inCorpus(quote: string): boolean {
  return CORPUS.some((t) => t.includes(quote));
}

const PERFECT = LIA_GOLDEN.find((c) => c.id === "lia-perfect-record")!;

describe("ITEM 311 — corpus pins", () => {
  it("every anchor the deliverables use resolves to a registry row", () => {
    for (const key of Object.values(ANCHOR_KEYS)) {
      const row = (LIA_VERIFIED_AUTHORITIES as Record<string, unknown>)[key];
      expect(row, `missing registry row: ${key}`).toBeTruthy();
    }
  });

  it("every quoted anchor row is verbatim in the approved corpus", () => {
    const misses: string[] = [];
    for (const key of Object.values(ANCHOR_KEYS)) {
      const row = (LIA_VERIFIED_AUTHORITIES as Record<string, { verbatim_quote?: string }>)[key];
      const q = row?.verbatim_quote ?? "";
      if (!q) continue;
      if (!inCorpus(q)) misses.push(key);
    }
    expect(misses, `retyped (non-verbatim) quotes: ${misses.join(", ")}`).toEqual([]);
  });

  it("the retired unanchored propositions are gone from the unanchored list", () => {
    expect(LIA_UNANCHORED_PROPOSITIONS).not.toContain("recital_47_three_part_test");
    expect(LIA_UNANCHORED_PROPOSITIONS).not.toContain("edpb_1_2024_three_step_test");
  });
});

describe("ITEM 311 — reasonable expectations", () => {
  it("degrades loudly, with a named ask, when collection context is absent", () => {
    const f = buildReasonableExpectations({
      relationship_type: "Existing customer",
      balancing_details: { reasonable_expectation: "Yes" },
    });
    expect(f.verdict).toBe("undetermined_on_the_record");
    expect(f.status).toBe("record_insufficient");
    expect(f.information_needed).toContain("collection_context");
  });

  it("downgrades a notice-only record to partly expected", () => {
    const f = buildReasonableExpectations({
      relationship_type: "Existing customer",
      balancing_details: {
        reasonable_expectation: "Yes",
        collection_context: "The use is disclosed in our privacy notice, which the customer accepts at sign-up.",
      },
    });
    expect(f.notice_only_support).toBe(true);
    expect(f.verdict).toBe("partly_expected");
  });

  it("carries the Op. 1 analysis shape and quotes the standard verbatim", () => {
    const f = buildReasonableExpectations(PERFECT.intake);
    expect(f.verdict).toBe("reasonably_expected");
    expect(f.notice_only_support).toBe(false);
    expect(inCorpus(f.standard)).toBe(true);
    // record fact quotes the record; application runs the standard over it.
    expect(f.record_fact).toContain("Existing customer");
    expect(f.application.length).toBeGreaterThan(120);
    expect(f.status).toBe("analysed");
  });
});

describe("ITEM 311 — child factor", () => {
  it("is an explicit determination, not silence, when the answer is no", () => {
    const f = buildChildFactor(PERFECT.intake);
    expect(f.determination).toBe("children_not_in_scope");
    expect(f.record_fact).toContain("child");
  });

  it("finds children from the vulnerable-groups answer alone", () => {
    const f = buildChildFactor({
      balancing_details: { vulnerable_subjects: ["Children under 16"] },
    });
    expect(f.determination).toBe("children_in_scope");
  });

  it("is undetermined when nothing on the record answers it", () => {
    const f = buildChildFactor({ balancing_details: {} });
    expect(f.determination).toBe("undetermined_on_the_record");
    expect(f.status).toBe("record_insufficient");
  });
});

describe("ITEM 311 — public-authority exclusion", () => {
  it("removes the basis when an authority processes in performance of its tasks", () => {
    const f = buildPublicAuthorityExclusion({
      purpose_details: { controller_is_public_authority: "Yes", public_task_processing: "Yes" },
    });
    expect(f.determination).toBe("exclusion_applies");
    expect(f.basis_unavailable).toBe(true);
  });

  it("does not apply to a private controller", () => {
    const f = buildPublicAuthorityExclusion(PERFECT.intake);
    expect(f.determination).toBe("exclusion_does_not_apply");
    expect(f.basis_unavailable).toBe(false);
  });

  it("is undetermined and asks for the status when the record is silent", () => {
    const f = buildPublicAuthorityExclusion({ purpose_details: {} });
    expect(f.determination).toBe("undetermined_on_the_record");
    expect(f.information_needed).toContain("controller_is_public_authority");
  });
});

describe("ITEM 311 — determination and the Op. 5 mitigation fix", () => {
  it("does not count measures the GDPR already requires", () => {
    const ms = classifyRecordedMitigations({
      balancing_details: {
        additional_mitigations:
          "Encryption at rest across the pipeline; an unconditional standing opt-out from scoring that we are not required to offer",
      },
    });
    expect(ms.length).toBe(2);
    expect(ms.filter((m) => m.goes_beyond_gdpr_obligation).length).toBe(1);
    const excluded = ms.find((m) => !m.goes_beyond_gdpr_obligation)!;
    expect(excluded.measure.toLowerCase()).toContain("encryption");
    expect(inCorpus(excluded.authority_verbatim)).toBe(true);
  });

  it("the exclusion carries the EDPB authority verbatim, not a paraphrase", () => {
    const built = buildLiaDeliverables(PERFECT.intake);
    for (const m of built.lia_determination.mitigations) {
      expect(inCorpus(m.authority_verbatim), `paraphrased authority: ${m.citation}`).toBe(true);
    }
  });

  it("returns pass/fail plus mitigations that would flip a failing balance", () => {
    const failing = {
      ...PERFECT.intake,
      balancing_details: {
        ...(PERFECT.intake as any).balancing_details,
        reasonable_expectation: "No — we have no relationship with these individuals; they would not expect this",
      },
    };
    const built = buildLiaDeliverables(failing);
    const d = built.lia_determination;
    expect(d.outcome).toBe("available_only_with_mitigations");
    expect(d.rebalance_required).toBe(true);
    expect(d.driving_factors).toContain("reasonable_expectations");
    const flip = d.mitigations.find((m) => m.factor === "reasonable_expectations")!;
    expect(flip.goes_beyond_gdpr_obligation).toBe(true);
    expect(flip.why_it_moves_the_balance.length).toBeGreaterThan(80);
  });

  it("the exclusion overrides the balance entirely", () => {
    const built = buildLiaDeliverables({
      ...PERFECT.intake,
      purpose_details: {
        ...(PERFECT.intake as any).purpose_details,
        controller_is_public_authority: "Yes",
        public_task_processing: "Yes",
      },
    });
    expect(built.lia_determination.outcome).toBe("legitimate_interests_not_available");
    expect(built.public_authority_exclusion.basis_unavailable).toBe(true);
  });

  it("is open, not falsely favourable, when the record is thin", () => {
    const built = buildLiaDeliverables({ balancing_details: {}, purpose_details: {} });
    expect(built.lia_determination.outcome).toBe("undetermined_on_the_record");
    expect(built.lia_determination.status).toBe("record_insufficient");
    expect(built.lia_determination.information_needed).toBeTruthy();
  });
});

describe("ITEM 311 — perfect-data fixture is measurable", () => {
  it("supplies every field the Chapter 7 rebuild added", () => {
    const b = (PERFECT.intake as any).balancing_details;
    const p = (PERFECT.intake as any).purpose_details;
    expect(b.collection_context).toBeTruthy();
    expect(b.children_data_subjects).toBeTruthy();
    expect(b.additional_mitigations).toBeTruthy();
    expect(p.controller_is_public_authority).toBeTruthy();
    expect(p.public_task_processing).toBeTruthy();
  });

  it("runs the analysed path end to end with no record_insufficient deliverable", () => {
    const built = buildLiaDeliverables(PERFECT.intake);
    const statuses = [
      built.reasonable_expectations.status,
      built.child_factor.status,
      built.public_authority_exclusion.status,
      built.lia_determination.status,
    ];
    expect(statuses).toEqual(["analysed", "analysed", "analysed", "analysed"]);
    expect(built.lia_determination.outcome).toBe("legitimate_interests_available");
  });

  it("keeps exposure prose out of the determination (separation guard)", () => {
    const d = buildDetermination(
      PERFECT.intake,
      buildReasonableExpectations(PERFECT.intake),
      buildChildFactor(PERFECT.intake),
      buildPublicAuthorityExclusion(PERFECT.intake),
    );
    expect(d.why).not.toMatch(/fine|penalt|enforcement risk/i);
  });
});
