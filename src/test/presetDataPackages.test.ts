// PRE-SET DATA PACKAGES — every derived dataset must be as complete and as
// contract-conformant as the canonical fixture it is derived from.
import { describe, expect, it } from "vitest";
import { SAMPLE_FIXTURES } from "@/lib/sampleFixtures";
import {
  DERIVED_PROFILES,
  PRESET_DATASET_COUNT,
  datasetsFor,
  pickPresetDatasets,
} from "@/lib/sampleDataPackages";
import { preflightFixture } from "@/lib/sampleFixturePreflight";
import { contractCheckFixture } from "@/lib/sampleFixtureContractCheck";

const CANONICAL = SAMPLE_FIXTURES.filter((f) => !f.variant.endsWith("-supplemental"));

describe("preset data packages", () => {
  it("produces exactly 5 datasets per canonical fixture, dataset 1 being the fixture", () => {
    for (const f of CANONICAL) {
      const ds = datasetsFor(f);
      expect(ds).toHaveLength(PRESET_DATASET_COUNT);
      expect(ds[0]).toBe(f);
      expect(new Set(ds.map((d) => d.variant)).size).toBe(PRESET_DATASET_COUNT);
    }
  });

  it("keeps every derived dataset passing shape preflight", () => {
    for (const f of SAMPLE_FIXTURES) {
      const baseOk = preflightFixture(f).ok;
      for (const d of datasetsFor(f).slice(1)) {
        expect(`${d.variant}:${preflightFixture(d).ok}`).toBe(`${d.variant}:${baseOk}`);
      }
    }
  });

  it("keeps every derived dataset passing the canonical contract check", () => {
    for (const f of SAMPLE_FIXTURES) {
      const base = contractCheckFixture(f);
      for (const d of datasetsFor(f).slice(1)) {
        const got = contractCheckFixture(d);
        expect(
          `${d.variant}:${got.ok}:${got.violations.map((v) => v.key).join(",")}`,
        ).toBe(`${d.variant}:${base.ok}:${base.violations.map((v) => v.key).join(",")}`);
      }
    }
  });

  it("gives each dataset a distinct corporate identity", () => {
    for (const f of CANONICAL) {
      const ds = datasetsFor(f);
      const blobs = ds.map((d) => JSON.stringify(d.fixture));
      expect(new Set(blobs).size).toBe(PRESET_DATASET_COUNT);
      // Each derived dataset must mention its own organisation somewhere.
      ds.slice(1).forEach((d, i) => {
        expect(blobs[i + 1]).toContain(DERIVED_PROFILES[i].orgShort);
      });
    }
  });

  it("selects randomly below 5 and caps at 5 above", () => {
    const base = CANONICAL[0];
    const seq = [0.9, 0.1, 0.5, 0.2, 0.7];
    let i = 0;
    const rng = () => seq[i++ % seq.length];
    const three = pickPresetDatasets(base, 3, rng);
    expect(three).toHaveLength(3);
    expect(new Set(three.map((d) => d.variant)).size).toBe(3);
    expect(pickPresetDatasets(base, 5)).toHaveLength(5);
    expect(pickPresetDatasets(base, 12)).toHaveLength(5);
    expect(pickPresetDatasets(base, 1)).toHaveLength(1);
  });
});
