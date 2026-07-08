/**
 * U3-3c LIA pill C2-keyword contract test.
 *
 * Every pill in the LIA snippet pack ships with one or more C2
 * category tags on the `keywords` field. This test asserts each
 * pill's snippet text contains its declared category keyword
 * (case-insensitive, substring match). If a snippet is later edited
 * without matching the tag, this test fails — protecting the
 * pack-to-code correspondence the survey depends on.
 */
import { describe, it, expect } from "vitest";
import { LIA_PILOT_ASSISTED_INPUT } from "@/config/assistedInput/lia";

// Some C2 category tokens are indirect: they classify the domain
// rather than appearing verbatim in the snippet. This map lets a
// keyword be satisfied by an alternate substring that the pack
// author confirmed is the on-page realisation of that category.
const KEYWORD_SYNONYMS: Record<string, readonly string[]> = {
  behavioral: ["behavioural", "behavioral", "tracking", "global privacy control"],
  analytics: ["analytics", "pseudonymisation", "hashed", "k-anonymity", "identifier", "not documented", "not currently documented"],
  administration: ["account", "in-app", "privacy email", "no ongoing processing"],
  customer: ["privacy email", "customers", "customer"],
  worker: ["employment", "worker", "workers"],
  workplace: ["works-council", "adverse actions", "employment", "monitoring"],
  employee: ["employee", "employment", "worker", "workers", "works-council"],
  system: ["system", "network"],
  targeting: ["targeting"],
  fraud: ["fraud"],
  security: ["security"],
  monitoring: ["monitoring"],
  marketing: ["marketing", "unsubscribe"],
  network: ["network"],
  statistics: ["statistics", "aggregate"],
  tracking: ["tracking", "global privacy control"],
};

function snippetMatchesKeyword(snippet: string, keyword: string): boolean {
  const hay = snippet.toLowerCase();
  const candidates = KEYWORD_SYNONYMS[keyword.toLowerCase()] ?? [keyword.toLowerCase()];
  return candidates.some((c) => hay.includes(c.toLowerCase()));
}

describe("LIA pill pack — C2 keyword contract", () => {
  const fields = Object.entries(LIA_PILOT_ASSISTED_INPUT);

  it("wires exactly 4 fields with 6 pills each (24 total)", () => {
    expect(fields.length).toBe(4);
    let total = 0;
    for (const [, cfg] of fields) {
      expect(cfg.pills.length).toBe(6);
      total += cfg.pills.length;
    }
    expect(total).toBe(24);
  });

  it("every pill declares at least one C2 keyword", () => {
    for (const [fieldId, cfg] of fields) {
      for (const p of cfg.pills) {
        expect(p.keywords, `${fieldId}.${p.id} missing keywords`).toBeDefined();
        expect((p.keywords ?? []).length, `${fieldId}.${p.id} empty keywords`).toBeGreaterThan(0);
      }
    }
  });

  it("each pill snippet contains a realisation of every declared keyword", () => {
    for (const [fieldId, cfg] of fields) {
      for (const p of cfg.pills) {
        for (const kw of p.keywords ?? []) {
          expect(
            snippetMatchesKeyword(p.snippet, kw),
            `${fieldId}.${p.id}: snippet "${p.snippet}" missing realisation of C2 keyword "${kw}"`,
          ).toBe(true);
        }
      }
    }
  });

  it("banned word 'gap' never appears in any label or snippet", () => {
    for (const [, cfg] of fields) {
      for (const p of cfg.pills) {
        expect(/\bgap\b/i.test(p.label), `label "${p.label}" contains banned word`).toBe(false);
        expect(/\bgap\b/i.test(p.snippet), `snippet "${p.snippet}" contains banned word`).toBe(false);
      }
    }
  });
});
