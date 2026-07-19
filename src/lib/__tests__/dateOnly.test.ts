import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  formatDateOnlyLong,
  formatDateOnlyShort,
  formatTimestampDateOnly,
} from "../dateOnly";

/**
 * STATES-1b date-only regression: `new Date("YYYY-MM-DD")` parses as UTC
 * midnight, so any US timezone renders the previous calendar day. These tests
 * pin the formatter's output in America/New_York (UTC-5/-4) and Pacific/Apia
 * (historically UTC-11) to prove the fix is timezone-invariant.
 */

const orig = process.env.TZ;

describe("dateOnly — timezone invariance", () => {
  afterAll(() => { process.env.TZ = orig; });

  const cases: Array<[string, string]> = [
    ["2026-06-09", "June 9, 2026"],
    ["2026-01-01", "January 1, 2026"],
    ["2028-12-31", "December 31, 2028"],
  ];

  for (const tz of ["America/New_York", "Pacific/Apia", "UTC"]) {
    describe(`TZ=${tz}`, () => {
      beforeAll(() => { process.env.TZ = tz; });
      for (const [iso, expected] of cases) {
        it(`formatDateOnlyLong("${iso}") === "${expected}"`, () => {
          expect(formatDateOnlyLong(iso)).toBe(expected);
        });
      }
      it('formatDateOnlyShort("2026-06-09") === "Jun 9, 2026"', () => {
        expect(formatDateOnlyShort("2026-06-09")).toBe("Jun 9, 2026");
      });
      it("formatTimestampDateOnly strips the time and renders the same calendar date", () => {
        expect(formatTimestampDateOnly("2026-06-09T23:30:00.000Z")).toBe("Jun 9, 2026");
      });
    });
  }
});

describe("dateOnly — degenerate inputs", () => {
  it("returns em-dash for null/undefined/blank", () => {
    expect(formatDateOnlyLong(null)).toBe("—");
    expect(formatDateOnlyLong(undefined)).toBe("—");
    expect(formatDateOnlyLong("")).toBe("—");
  });
  it("returns raw input if not YYYY-MM-DD parseable", () => {
    expect(formatDateOnlyLong("not-a-date")).toBe("—");
  });
});
