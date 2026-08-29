// ALL-PRODUCTS-TEST — source-level isolation + coverage tests.
//
// Proves the new page carries over /admin/SO-final-test exactly, adds the
// non-SO product harness, leaves the existing consoles untouched, and that
// every shipped product fixture passes intake preflight (the gate the panel
// enforces before it inserts or invokes anything).

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { SAMPLE_FIXTURES, type ToolSlug } from "@/lib/sampleFixtures";
import { preflightFixtures } from "@/lib/sampleFixturePreflight";
import { EXTENDED_SLUGS, SO_COVERED_SLUGS, SLUG_LABEL } from "@/components/admin/AllProductsPanel";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("ALL-PRODUCTS-TEST page", () => {
  const page = read("src/pages/admin/AllProductsTest.tsx");
  const app = read("src/App.tsx");
  const soPage = read("src/pages/admin/SOFinalTest.tsx");

  it("registers the route alongside the existing consoles", () => {
    expect(app).toContain('path="/admin/all-products-test"');
    expect(app).toContain('path="/admin/SO-final-test"');
    expect(app).toContain('path="/admin/final-test"');
  });

  it("carries over the SO console with identical grader props", () => {
    expect(page).toContain('graderMode="skeleton"');
    expect(page).toContain("toolsOverride={SO_SKELETON_TOOLS}");
    expect(page).toContain("showVariants");
    // Tool list is imported, never re-declared, so it cannot drift.
    expect(page).toContain('import { SO_SKELETON_TOOLS } from "./SOFinalTest"');
    expect(soPage).toContain("export const SO_SKELETON_TOOLS");
  });

  it("adds the non-SO product harness", () => {
    expect(page).toContain("AllProductsPanel");
  });

  it("leaves the legacy pages free of grader props", () => {
    expect(read("src/pages/admin/FinalTest.tsx")).not.toContain("graderMode");
    expect(read("src/pages/admin/QualityBatch.tsx")).not.toContain("graderMode");
  });
});

describe("ALL-PRODUCTS-TEST coverage", () => {
  it("covers every shipped product slug exactly once across the two groups", () => {
    const all = [...SO_COVERED_SLUGS, ...EXTENDED_SLUGS];
    expect(new Set(all).size).toBe(all.length);
    const shipped = new Set<ToolSlug>(SAMPLE_FIXTURES.map((f) => f.tool_slug));
    for (const slug of shipped) expect(all).toContain(slug);
    for (const slug of all) expect(shipped.has(slug)).toBe(true);
  });

  it("labels every slug", () => {
    for (const slug of [...SO_COVERED_SLUGS, ...EXTENDED_SLUGS]) {
      expect(SLUG_LABEL[slug]).toBeTruthy();
    }
  });

  it("ships at least one runnable fixture for each non-SO product", () => {
    for (const slug of EXTENDED_SLUGS) {
      expect(SAMPLE_FIXTURES.some((f) => f.tool_slug === slug)).toBe(true);
    }
  });
});

describe("ALL-PRODUCTS-TEST intake preflight gate", () => {
  it("passes for every sample fixture (no run can fail on intake data)", () => {
    const bad = preflightFixtures().filter((r) => !r.ok);
    const detail = bad
      .map((b) => `${b.label}: ${b.issues.map((i) => `${i.key} ${i.problem}`).join(", ")}`)
      .join(" | ");
    expect(bad, detail).toEqual([]);
  });

  it("flags a missing required key", async () => {
    const { preflightFixture } = await import("@/lib/sampleFixturePreflight");
    const lia = SAMPLE_FIXTURES.find((f) => f.tool_slug === "li_assessment")!;
    const clone = structuredClone(lia) as typeof lia;
    delete (clone.fixture as any).insert.organization_name;
    const res = preflightFixture(clone);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.key === "organization_name" && i.problem === "missing")).toBe(true);
  });

  it("flags a blank required key", async () => {
    const { preflightFixture } = await import("@/lib/sampleFixturePreflight");
    const dpia = SAMPLE_FIXTURES.find((f) => f.tool_slug === "dpia")!;
    const clone = structuredClone(dpia) as typeof dpia;
    (clone.fixture as any).insert.intake_data.purpose = "   ";
    const res = preflightFixture(clone);
    expect(res.ok).toBe(false);
    expect(res.issues.some((i) => i.key === "purpose" && i.problem === "blank")).toBe(true);
  });
});
