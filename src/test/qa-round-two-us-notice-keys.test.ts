// QA round two (US-A-01, 2026-09-06) — "No retention period specified" shown
// over a fully answered questionnaire, for customer A and again for customer B.
//
// The review panel read `data_retention_period`. That key is written by no US
// notice question; the retention questions are `retention_general` (Q9) and
// `retention_criteria` (Q10). All eight keys that panel's computed checks read
// turned out to be from a superseded vocabulary — this file pins both the
// corrected retention rule and the absence of phantom keys.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { retentionDisclosureMissing } from "@/lib/usNoticeReviewChecks";

describe("US-A-01 — retention warning follows the answers actually collected", () => {
  it("does not warn when a retention period is supplied (the reported false warning)", () => {
    expect(
      retentionDisclosureMissing({
        retention_general:
          "Live coordinates 24 hours; account identifiers until closure plus 30 days; invoices 7 years.",
      }),
    ).toBe(false);
  });

  it("does not warn when only the § 7012(e)(4) criteria limb is supplied", () => {
    // A business that cannot state a fixed period may state the criteria
    // instead; warning here would tell a compliant customer they are
    // incomplete.
    expect(
      retentionDisclosureMissing({
        retention_criteria: "As long as the account is active, plus the contract limitation period.",
      }),
    ).toBe(false);
  });

  it("warns only when BOTH limbs are absent", () => {
    expect(retentionDisclosureMissing({})).toBe(true);
    expect(retentionDisclosureMissing({ retention_general: "", retention_criteria: "   " })).toBe(true);
    expect(retentionDisclosureMissing({ retention_general: [], retention_criteria: null })).toBe(true);
  });

  it("ignores the superseded key, so a stale answer cannot suppress a real warning", () => {
    expect(retentionDisclosureMissing({ data_retention_period: "24 hours" })).toBe(true);
  });
});

describe("US-A-01 — the review panel reads only keys the questionnaire writes", () => {
  const questionKeys = (() => {
    const dir = resolve(__dirname, "../data/us-notice-questions");
    const keys = new Set<string>();
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".ts")) continue;
      const s = readFileSync(resolve(dir, f), "utf8");
      for (const m of s.matchAll(/key:\s*["'`]([\w.]+)["'`]/g)) keys.add(m[1]);
    }
    return keys;
  })();

  it("finds the question set (guards against the parser matching nothing)", () => {
    expect(questionKeys.size).toBeGreaterThan(20);
    expect(questionKeys.has("retention_general")).toBe(true);
    expect(questionKeys.has("retention_criteria")).toBe(true);
    // The key the panel used to read is genuinely not a question.
    expect(questionKeys.has("data_retention_period")).toBe(false);
  });

  it("has no literal answers[...] lookup on a key no question writes", () => {
    const src = readFileSync(resolve(__dirname, "../pages/us-notices/USNoticeReview.tsx"), "utf8");
    // Ignore the comment block that names the removed phantom keys as history.
    const code = src.replace(/\/\/[^\n]*/g, "");
    const read = new Set([...code.matchAll(/answers\[\s*["'`]([\w.]+)["'`]\s*\]/g)].map((m) => m[1]));
    const phantom = [...read].filter((k) => !questionKeys.has(k));
    expect(
      phantom,
      `USNoticeReview reads keys the questionnaire never writes, so these checks can only misfire: ${phantom.join(", ")}`,
    ).toEqual([]);
  });
});
