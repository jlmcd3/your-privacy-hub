// SO-FINAL-TEST — Part 2 isolation tests for the new admin page.
//
// Proves, at source level, that /admin/SO-final-test is additive and that
// /admin/final-test and /admin/quality-batch are untouched.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("SO-FINAL-TEST page isolation", () => {
  const soPage = read("src/pages/admin/SOFinalTest.tsx");
  const finalTest = read("src/pages/admin/FinalTest.tsx");
  const qualityBatch = read("src/pages/admin/QualityBatch.tsx");
  const app = read("src/App.tsx");
  const console_ = read("src/components/admin/quality-console/QualityConsole.tsx");

  it("registers the new route without disturbing the old one", () => {
    expect(app).toContain('path="/admin/SO-final-test"');
    expect(app).toContain('path="/admin/final-test"');
  });

  it("reuses the shared QualityConsole with the skeleton grader path", () => {
    expect(soPage).toContain("QualityConsole");
    expect(soPage).toContain('graderMode="skeleton"');
    expect(soPage).toContain("toolsOverride={SO_SKELETON_TOOLS}");
  });

  it("scopes the tool list to SO-migrated products with a batch slug", () => {
    for (const t of [
      "cppa-risk", "cppa-cyber", "cppa-admt", "governance", "dpia",
      "lia", "ir-playbook", "biometric-checker", "registration",
    ]) {
      expect(soPage).toContain(`"${t}"`);
    }
    // dpa-generator is not SO-migrated and must not appear.
    expect(soPage).not.toContain('"dpa-generator"');
  });

  it("leaves the legacy pages byte-identical in behaviour (no grader props)", () => {
    expect(finalTest).not.toContain("graderMode");
    expect(finalTest).not.toContain("toolsOverride");
    expect(qualityBatch).not.toContain("graderMode");
    expect(qualityBatch).not.toContain("toolsOverride");
  });

  it("defaults the shared console to the legacy grader partition", () => {
    expect(console_).toContain('graderMode = "legacy"');
    expect(console_).toContain('isSkeletonMode ? q.eq("grader_mode", "skeleton") : q.is("grader_mode", null)');
    expect(console_).toContain('...(isSkeletonMode ? { grader_mode: "skeleton" } : {}),');
  });
});
