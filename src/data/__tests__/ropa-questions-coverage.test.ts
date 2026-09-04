/**
 * DOC 166 (2026-09-04) — RoPA seven-audit / model-vs-law build, intake side.
 *
 * `generate-ropa-document` reads `special_category_basis`, `transfer_destination`
 * and `processor_platform` for every activity, but before this doc none of
 * ropa-questions/index.ts's 24 activity templates could ever produce
 * `special_category_basis` or `transfer_destination`, and 17 of 24 templates
 * could never produce `processor_platform` — a required (not "where
 * applicable") Article 30(1)(d) element per REQUIRED_ART30 in
 * ropa-skeleton-assemble.ts. These asserts fail if that coverage regresses.
 */
import { describe, it, expect } from "vitest";
import { ROPA_QUESTION_REGISTRY, getQuestionsForActivity } from "@/data/ropa-questions";

const ALL_TEMPLATE_KEYS = Object.keys(ROPA_QUESTION_REGISTRY);

function keysFor(templateKey: string): string[] {
  return getQuestionsForActivity(templateKey).map((q) => q.key);
}

describe("DOC 166 — every activity template can record every Article 30 required element", () => {
  it("every template's question set includes processor_platform's gate (uses_processors) — Art. 30(1)(d) is not qualified 'where applicable'", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      expect(keysFor(key), `template "${key}" is missing uses_processors`).toContain("uses_processors");
      expect(keysFor(key), `template "${key}" is missing processor_platform`).toContain("processor_platform");
    }
  });

  it("no template asks uses_processors / processor_platform twice (base sequence de-duplicated against per-template extras)", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      const ks = keysFor(key);
      expect(ks.filter((k) => k === "uses_processors").length, `template "${key}" duplicates uses_processors`).toBe(1);
      expect(ks.filter((k) => k === "processor_platform").length, `template "${key}" duplicates processor_platform`).toBe(1);
    }
  });

  it("every template can record special_category_basis — the Art. 30(5) derogation note reads it for every activity, not only some templates", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      expect(keysFor(key), `template "${key}" is missing special_category_basis`).toContain("special_category_basis");
    }
  });

  it("the dedicated third_party_transfers template asks for the destination before the mechanism — Art. 30(1)(e) requires identifying the third country", () => {
    const qs = getQuestionsForActivity("third_party_transfers");
    const destIdx = qs.findIndex((q) => q.key === "transfer_destination");
    const mechIdx = qs.findIndex((q) => q.key === "transfer_mechanism");
    expect(destIdx, "transfer_destination must be askable on third_party_transfers").toBeGreaterThanOrEqual(0);
    expect(mechIdx, "transfer_mechanism must be askable on third_party_transfers").toBeGreaterThanOrEqual(0);
    expect(destIdx).toBeLessThan(mechIdx);
  });

  it("transfer_destination is NOT asked on templates with no dedicated cross-border framing (scope stays as-audited, not over-broadened)", () => {
    for (const key of ALL_TEMPLATE_KEYS) {
      if (key === "third_party_transfers") continue;
      expect(keysFor(key), `template "${key}" unexpectedly asks transfer_destination`).not.toContain("transfer_destination");
    }
  });
});
