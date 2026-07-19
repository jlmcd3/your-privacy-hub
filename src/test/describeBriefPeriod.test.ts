import { describe, it, expect } from "vitest";
import { describeBriefPeriod } from "@/pages/Dashboard";

describe("describeBriefPeriod", () => {
  it("returns same-month format", () => {
    // 6-day window ending 2026-07-13 → 2026-07-07 to 2026-07-13
    expect(describeBriefPeriod("2026-07-13T12:00:00Z")).toBe("Jul 7–13, 2026");
  });

  it("returns cross-month same-year format", () => {
    // Ends 2026-09-03 → starts 2026-08-28
    expect(describeBriefPeriod("2026-09-03T12:00:00Z")).toBe("Aug 28 – Sep 3, 2026");
  });

  it("returns cross-year format", () => {
    // Ends 2027-01-04 → starts 2026-12-29
    expect(describeBriefPeriod("2027-01-04T12:00:00Z")).toBe("Dec 29, 2026 – Jan 4, 2027");
  });

  it("falls back for invalid input", () => {
    expect(describeBriefPeriod(undefined)).toBe("the past 7 days");
    expect(describeBriefPeriod(null)).toBe("the past 7 days");
    expect(describeBriefPeriod("")).toBe("the past 7 days");
    expect(describeBriefPeriod("not-a-date")).toBe("the past 7 days");
  });
});
