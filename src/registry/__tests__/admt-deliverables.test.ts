// ITEM 308 — PIN TESTS for the three cppa-admt analytic deliverables
// (Chapter 3 (E)(3) of docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md).
//
// These tests assert GROUNDEDNESS, not prose quality:
//   1. Every notice_element_findings[] entry cites one of the five real
//      § 7220(c) elements, and carries element text that is a byte-identical
//      substring of the verified-authority registry row — never re-derived.
//   2. Every exception_qualification[] entry's condition_verbatim strings are
//      byte-identical substrings of the claimed exception's registry quote.
//   3. determination always separates "what is unlawful now" (lawfulness)
//      from "what is exposure" (exposure), and enforcement/penalty language
//      never appears in the lawfulness finding.
//
// Runtime: vitest (src/**/*.test.ts glob).

import { describe, it, expect } from "vitest";

import {
  ADMT_VERIFIED_AUTHORITIES,
} from "../../../supabase/functions/_shared/registry/admt-verified-authorities.ts";
import {
  NOTICE_ELEMENT_SPECS,
  EXCEPTION_SPECS,
} from "../../../supabase/functions/_shared/ltp/admt-deliverables/elements.ts";
import {
  buildAdmtDeliverables,
  buildNoticeElementFindings,
  buildExceptionQualification,
  normalizeDetermination,
} from "../../../supabase/functions/_shared/ltp/admt-deliverables/build.ts";

/** The five § 7220(c) element ids. Closed list — no sixth element exists. */
const FIVE_ELEMENTS = [
  "c1_purpose",
  "c2_optout",
  "c3_access",
  "c4_antiretaliation",
  "c5_howworks_and_alternative",
] as const;

const EMPTY_INTAKE = {};

const FULL_INTAKE = {
  system_name: "Applicant scoring model",
  notice_has_specific_purpose: "Yes",
  notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
  notice_has_access_desc: "Yes",
  notice_has_anti_retaliation: "Yes",
  notice_has_how_it_works: "Yes",
  notice_has_alternative_process: "Yes",
  notice_element_text: {
    purpose:
      "We use an automated scoring model to decide whether to approve your rental application.",
    optout:
      "You may opt out of this automated scoring at privacy.example.com/opt-out or by calling 1-800-555-0100.",
    access:
      "You may request access to how the scoring model evaluated you at privacy.example.com/access.",
    antiretaliation:
      "We will not retaliate against you for exercising any of your rights under the CCPA.",
    howworks_inputs:
      "The model reads your rental payment history, reported income, and prior tenancy records.",
    howworks_output:
      "The model returns a score from 0 to 100 which the leasing officer uses to approve or decline.",
    altprocess:
      "If you opt out, a leasing officer reviews your application manually within five business days.",
  },
  opt_out_exception: "Human appeal exception (§ 7221(b)(1))",
  opt_out_appeal_process:
    "The applicant replies to the decision email and a review officer decides within ten business days.",
  admt_detail: {
    appeal_reviewer_role: "Regional leasing manager",
    appeal_trained: "Yes",
    appeal_authority_overturn: "Yes",
    appeal_step_count: "2",
  },
};

describe("cppa-admt deliverables — § 7220(c) notice element findings", () => {
  it("the element registry is the closed five-element list", () => {
    expect(NOTICE_ELEMENT_SPECS.map((s) => s.element_id)).toEqual([...FIVE_ELEMENTS]);
  });

  it("every finding cites one of the five real § 7220(c) elements", () => {
    for (const intake of [EMPTY_INTAKE, FULL_INTAKE]) {
      const findings = buildNoticeElementFindings(intake);
      expect(findings.length).toBe(5);
      for (const f of findings) {
        expect(FIVE_ELEMENTS).toContain(f.element_id);
        expect(f.citation.startsWith("11 CCR § 7220")).toBe(true);
      }
      // No element is emitted twice, and none is silently dropped.
      expect(new Set(findings.map((f) => f.element_id)).size).toBe(5);
    }
  });

  it("element_verbatim is drawn from the verified registry, never re-derived", () => {
    for (const f of buildNoticeElementFindings(FULL_INTAKE)) {
      expect(f.proposition_keys.length).toBeGreaterThan(0);
      for (const k of f.proposition_keys) {
        const rowText = ADMT_VERIFIED_AUTHORITIES[k]?.verbatim_quote;
        expect(rowText, `unknown proposition_key ${k}`).toBeTruthy();
        expect(f.element_verbatim).toContain(rowText!);
      }
    }
  });

  it("an empty record degrades every element rather than asserting adequacy", () => {
    for (const f of buildNoticeElementFindings(EMPTY_INTAKE)) {
      expect(f.verdict).not.toBe("adequate");
      if (f.status === "record_insufficient") {
        expect(f.information_needed && f.information_needed.length).toBeGreaterThan(10);
      }
    }
  });

  it("a complete record produces no insufficient-record notice element", () => {
    const findings = buildNoticeElementFindings(FULL_INTAKE);
    expect(findings.filter((f) => f.verdict === "insufficient_record")).toEqual([]);
  });
});

describe("cppa-admt deliverables — § 7221(b) exception qualification", () => {
  it("every condition_verbatim is a byte-identical substring of its registry quote", () => {
    for (const spec of EXCEPTION_SPECS) {
      const rowText = ADMT_VERIFIED_AUTHORITIES[spec.proposition_key]?.verbatim_quote;
      expect(rowText, `unknown exception key ${spec.proposition_key}`).toBeTruthy();
      expect(spec.conditions.length).toBeGreaterThan(0);
      for (const c of spec.conditions) {
        expect(
          rowText!.includes(c.condition_verbatim),
          `${spec.proposition_key}/${c.condition_id} is not verbatim in the registry row`,
        ).toBe(true);
      }
    }
  });

  it("emitted conditions carry the verbatim text and never a paraphrase", () => {
    const entries = buildExceptionQualification(FULL_INTAKE);
    const claimed = entries.filter((e) => e.claimed_on_the_record);
    expect(claimed.length).toBe(1);
    const spec = EXCEPTION_SPECS.find((s) => s.proposition_key === claimed[0].proposition_key)!;
    const emitted = claimed[0].conditions.map((c) => c.condition_verbatim).sort();
    expect(emitted).toEqual(spec.conditions.map((c) => c.condition_verbatim).sort());
  });

  it("an unevidenced claim never rolls up to 'qualifies'", () => {
    const entries = buildExceptionQualification({
      opt_out_exception: "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
    });
    const claimed = entries.filter((e) => e.claimed_on_the_record);
    expect(claimed.length).toBeGreaterThan(0);
    for (const e of claimed) {
      expect(e.qualifies).not.toBe("qualifies");
      for (const c of e.conditions) expect(c.verdict).not.toBe("satisfied");
    }
  });
});

describe("cppa-admt deliverables — determination separation", () => {
  const ctx = () => ({
    activity_id: "a1",
    activity_name: "Applicant scoring model",
    notice: buildNoticeElementFindings(FULL_INTAKE),
    exceptions: buildExceptionQualification(FULL_INTAKE),
  });

  it("always emits both components, even from an empty model payload", () => {
    const d = normalizeDetermination(undefined, ctx());
    expect(typeof d.lawfulness.finding).toBe("string");
    expect(d.lawfulness.finding.length).toBeGreaterThan(20);
    expect(typeof d.exposure.statement).toBe("string");
    expect(d.exposure.statement.length).toBeGreaterThan(20);
    expect(d.source).toBe("degraded");
    expect(d.lawfulness.status).toBe("record_insufficient");
  });

  it("relocates enforcement/penalty language out of the lawfulness finding", () => {
    const d = normalizeDetermination(
      {
        lawfulness: {
          finding:
            "The pre-use notice omits the alternative process, so the current use does not meet the notice requirement. The business faces civil penalties of up to $7,500 per intentional violation.",
        },
        exposure: { statement: "" },
      },
      ctx(),
    );
    expect(d.separation_repairs).toBeGreaterThan(0);
    expect(d.lawfulness.finding).not.toMatch(/penalt|fine|\$|enforcement|civil action/i);
    expect(d.exposure.statement).toMatch(/penalt/i);
  });

  it("keeps a clean lawfulness finding intact and performs no repair", () => {
    const d = normalizeDetermination(
      {
        lawfulness: {
          finding:
            "The pre-use notice omits the alternative process for consumers who opt out, so the current use does not satisfy the notice requirement as the rules stand.",
        },
        exposure: {
          statement:
            "If the omission persists past the compliance date, the shortfall is enforceable against the business for every affected California consumer.",
        },
      },
      ctx(),
    );
    expect(d.separation_repairs).toBe(0);
    expect(d.source).toBe("model");
    expect(d.lawfulness.status).toBe("analysed");
    expect(d.exposure.status).toBe("analysed");
  });

  it("the envelope carries all three deliverables together", () => {
    const built = buildAdmtDeliverables(FULL_INTAKE, undefined);
    expect(built.notice_element_findings.length).toBe(5);
    expect(built.exception_qualification.length).toBeGreaterThan(0);
    expect(built.determination.lawfulness).toBeTruthy();
    expect(built.determination.exposure).toBeTruthy();
  });
});
