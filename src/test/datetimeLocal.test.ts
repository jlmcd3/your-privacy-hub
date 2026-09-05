// QA batch 2026-09-05 (IR 01) — the IR Playbook's default discovery time was
// the UTC wall clock pasted into a datetime-local input, so users west of UTC
// saw "The discovery date cannot be in the future" without touching the field.
import { describe, expect, it } from "vitest";
import { toDatetimeLocalValue } from "@/lib/datetimeLocal";

describe("toDatetimeLocalValue", () => {
  it("renders the LOCAL wall clock, not UTC", () => {
    const d = new Date(2026, 8, 5, 8, 26); // local 2026-09-05 08:26
    expect(toDatetimeLocalValue(d)).toBe("2026-09-05T08:26");
  });

  it("round-trips through the Date constructor as the same local instant (never in the future)", () => {
    const now = new Date();
    const parsed = new Date(toDatetimeLocalValue(now));
    // Truncated to the minute, so it is at or before `now`.
    expect(parsed.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(now.getTime() - parsed.getTime()).toBeLessThan(60_000);
  });

  it("zero-pads every component", () => {
    expect(toDatetimeLocalValue(new Date(2026, 0, 3, 4, 7))).toBe("2026-01-03T04:07");
  });
});
