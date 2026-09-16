// Cyber master review (2026-09-15/16) — parity + drift guard for the fields
// the review added: the dated threshold question (F06), the separate consumer
// and agency notice statuses (F07), the unknown incident count (F07) and the
// exclusive "no prior framework work" answer (F08). The page's enums file and
// the edge contract carry literal copies; this test fails if they drift.
import { describe, expect, it } from "vitest";
import {
  CYBER_AGENCY_NOTICE_STATUS_OPTIONS as C_AGENCY,
  CYBER_CONSUMER_NOTICE_STATUS_OPTIONS as C_CONSUMER,
  CYBER_IN_SCOPE_FRAMEWORK_OPTIONS as C_IN_SCOPE,
  CYBER_NO_PRIOR_FRAMEWORK_WORK as C_NO_PRIOR,
  CYBER_REVENUE_THRESHOLD_CHECK_OPTIONS as C_THRESHOLD,
  INCIDENTS_12MO_OPTIONS as C_INCIDENTS,
  cppaCybersecurityContract,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-cybersecurity";
import {
  CYBER_AGENCY_NOTICE_STATUS_OPTIONS as E_AGENCY,
  CYBER_CONSUMER_NOTICE_STATUS_OPTIONS as E_CONSUMER,
  CYBER_INCIDENTS_12MO_OPTIONS as E_INCIDENTS,
  CYBER_IN_SCOPE_FRAMEWORK_OPTIONS as E_IN_SCOPE,
  CYBER_NO_PRIOR_FRAMEWORK_WORK as E_NO_PRIOR,
  CYBER_REVENUE_STRADDLING_BAND,
  CYBER_REVENUE_THRESHOLD_CHECK_OPTIONS as E_THRESHOLD,
} from "@/pages/CPPACybersecurity.enums";

describe("Cyber master review (2026-09-15) — contract ↔ enums parity", () => {
  it("incident count options match, including the unknown state", () => {
    expect([...E_INCIDENTS]).toEqual([...C_INCIDENTS]);
    expect(E_INCIDENTS).toContain("Unknown / not yet reviewed");
  });
  it("threshold-check options match and the question is conditional on the straddling band", () => {
    expect([...E_THRESHOLD]).toEqual([...C_THRESHOLD]);
    const f = cppaCybersecurityContract.fields.find((x) => x.key === "profile.q1_revenue_threshold_check")!;
    expect(f.required).toBe("conditional");
    expect(f.trigger?.equals).toEqual([CYBER_REVENUE_STRADDLING_BAND]);
  });
  it("consumer and agency notice statuses match and are conditional on a reported incident", () => {
    expect([...E_CONSUMER]).toEqual([...C_CONSUMER]);
    expect([...E_AGENCY]).toEqual([...C_AGENCY]);
    for (const key of ["profile.consumer_notice_status", "profile.agency_notice_status"]) {
      const f = cppaCybersecurityContract.fields.find((x) => x.key === key)!;
      expect(f.required).toBe("conditional");
      expect(f.trigger?.equals).toEqual(["1", "2–5", "More than 5"]);
    }
    const legacy = cppaCybersecurityContract.fields.find((x) => x.key === "profile.incident_notifications")!;
    expect(legacy.required).toBe("optional");
    expect(legacy.superseded).toBe(true);
  });
  it("in-scope framework options match; the absence answer is exclusive and 'None / informal' keeps its meaning", () => {
    expect([...E_IN_SCOPE]).toEqual([...C_IN_SCOPE]);
    expect(E_NO_PRIOR).toBe(C_NO_PRIOR);
    expect(E_IN_SCOPE).toContain("None / informal");
    const f = cppaCybersecurityContract.fields.find((x) => x.key === "profile.in_scope_frameworks")!;
    expect(f.exclusive).toEqual([C_NO_PRIOR]);
  });
});
