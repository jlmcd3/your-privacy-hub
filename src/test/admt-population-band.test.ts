// ADMT master review (2026-09-15, F02) — the population-band suggestion never
// turns an estimate into a different number. The review's own cases: commas,
// ranges, zero, negatives, decimals, units, and a cross-band range.
import { describe, expect, it } from "vitest";
import { bandFor, parsePopulationEstimate, suggestPopulationBand } from "@/lib/admtPopulationBand";

describe("parsePopulationEstimate", () => {
  it("reads whole numbers with thousands separators and unit suffixes", () => {
    expect(parsePopulationEstimate("1,500")).toEqual({ kind: "number", value: 1500 });
    expect(parsePopulationEstimate("20k")).toEqual({ kind: "number", value: 20_000 });
    expect(parsePopulationEstimate("1.5 million")).toEqual({ kind: "number", value: 1_500_000 });
    expect(parsePopulationEstimate("about 45,000 people")).toEqual({ kind: "number", value: 45_000 });
  });
  it("reads a range as two numbers, never as one concatenated number", () => {
    expect(parsePopulationEstimate("1,000–2,000")).toEqual({ kind: "range", low: 1000, high: 2000 });
    expect(parsePopulationEstimate("1k to 2k")).toEqual({ kind: "range", low: 1000, high: 2000 });
    expect(parsePopulationEstimate("between 500 and 400")).toEqual({ kind: "range", low: 400, high: 500 });
  });
  it("rejects negatives, bare decimals and zero without altering them", () => {
    expect(parsePopulationEstimate("-5")).toEqual({ kind: "invalid", reason: "negative" });
    expect(parsePopulationEstimate("1.5")).toEqual({ kind: "invalid", reason: "decimal" });
    expect(parsePopulationEstimate("0")).toEqual({ kind: "invalid", reason: "zero" });
    expect(parsePopulationEstimate("lots")).toEqual({ kind: "invalid", reason: "unparseable" });
    expect(parsePopulationEstimate("")).toEqual({ kind: "empty" });
  });
});

describe("suggestPopulationBand", () => {
  it("suggests a band only when the whole estimate sits in one band", () => {
    expect(suggestPopulationBand("1,500")).toEqual({ kind: "band", band: "1,000 – 10,000" });
    expect(suggestPopulationBand("1,000–2,000")).toEqual({ kind: "band", band: "1,000 – 10,000" });
    expect(suggestPopulationBand("9,000 - 12,000")).toEqual({ kind: "cross-band", low: "1,000 – 10,000", high: "10,001 – 100,000" });
  });
  it("the review's headline case: 1,000–2,000 is not 'Over 1,000,000'", () => {
    const s = suggestPopulationBand("1,000–2,000");
    expect(s.kind).toBe("band");
    expect(s.kind === "band" && s.band).not.toBe("Over 1,000,000");
  });
  it("never suggests from an invalid estimate", () => {
    expect(suggestPopulationBand("-5")).toEqual({ kind: "invalid", reason: "negative" });
    expect(suggestPopulationBand("1.5")).toEqual({ kind: "invalid", reason: "decimal" });
  });
  it("band edges follow the option labels", () => {
    expect(bandFor(999)).toBe("Under 1,000");
    expect(bandFor(1000)).toBe("1,000 – 10,000");
    expect(bandFor(10_000)).toBe("1,000 – 10,000");
    expect(bandFor(10_001)).toBe("10,001 – 100,000");
    expect(bandFor(1_000_000)).toBe("100,001 – 1,000,000");
    expect(bandFor(1_000_001)).toBe("Over 1,000,000");
  });
});
