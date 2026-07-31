/**
 * ITEM 317 — offline corpus pin for the biometric duty registry.
 *
 * Companion to `biometric-corpus-pin.test.ts` (which hits the live
 * `provision_texts` table). This one runs with no network: every
 * `verbatim_quote` in `BIOMETRIC_DUTY_ROWS` must be an exact substring of the
 * snapshot row named by its `corpus_key`. Hand-editing a quote — the exact
 * defect Item 317 found in the legacy `biometric-statute-registry.ts`, where
 * eleven "verbatim" strings were paraphrase — fails here.
 *
 * It also pins the reconciled legacy registry: after Item 317 every quote it
 * carries must likewise trace to the corpus, and the un-ingested private right
 * of action (740 ILCS 14/20) must be absent from it entirely.
 */
import { describe, expect, it } from "vitest";
import { BIOMETRIC_CORPUS_SNAPSHOT } from "./__fixtures__/biometric-corpus-snapshot";
import {
  BIOMETRIC_DUTY_ROWS,
  BIOMETRIC_DUTY_VERSION,
  BIPA_PRA_CORPUS_STATUS,
} from "../../../supabase/functions/_shared/registry/biometric-verified-authorities";
import { BIOMETRIC_STATUTE_REGISTRY } from "../../../supabase/functions/_shared/registry/biometric-statute-registry";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

describe("biometric duty registry — offline corpus pin", () => {
  it("is versioned", () => {
    expect(BIOMETRIC_DUTY_VERSION).toMatch(/item317/);
    expect(BIOMETRIC_DUTY_ROWS.length).toBeGreaterThan(20);
  });

  it("every duty row names a corpus row present in the snapshot", () => {
    for (const r of BIOMETRIC_DUTY_ROWS) {
      expect(
        Object.prototype.hasOwnProperty.call(BIOMETRIC_CORPUS_SNAPSHOT, r.corpus_key),
      ).toBe(true);
    }
  });

  it("every verbatim_quote is an exact substring of its corpus row", () => {
    for (const r of BIOMETRIC_DUTY_ROWS) {
      const corpus = norm(BIOMETRIC_CORPUS_SNAPSHOT[r.corpus_key] ?? "");
      expect(corpus).toContain(norm(r.verbatim_quote));
    }
  });

  it("row ids are unique", () => {
    const ids = BIOMETRIC_DUTY_ROWS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("the un-ingested BIPA private right of action is never quoted", () => {
    expect(BIPA_PRA_CORPUS_STATUS.ingested).toBe(false);
    // TX § 503.001(d) and RCW 19.375.030 ARE in corpus and may carry
    // enforcement rows. Illinois must not: 740 ILCS 14/20 was never ingested.
    for (const r of BIOMETRIC_DUTY_ROWS) {
      if (r.statute_key === "us_il_bipa") expect(r.kind).not.toBe("enforcement");
    }
  });

  it("the MHMD row is absent from the snapshot and from the registry", () => {
    for (const k of Object.keys(BIOMETRIC_CORPUS_SNAPSHOT)) {
      expect(k).not.toContain("19-373");
    }
    for (const r of BIOMETRIC_DUTY_ROWS) {
      expect(r.citation).not.toContain("19.373");
    }
  });
});

describe("legacy biometric-statute-registry — post-reconciliation", () => {
  const quotes = BIOMETRIC_STATUTE_REGISTRY.flatMap((s: any) =>
    (s.provisions ?? []).map((p: any) => p.verbatim_quote).filter(Boolean),
  ) as string[];

  it("carries no 740 ILCS 14/20 row (text not in corpus)", () => {
    const blob = norm(JSON.stringify(BIOMETRIC_STATUTE_REGISTRY));
    expect(blob).not.toContain("14/20");
  });

  it("every remaining quote traces to a snapshot corpus row", () => {
    const corpus = Object.values(BIOMETRIC_CORPUS_SNAPSHOT).map(norm);
    const unmatched = quotes.filter((q) => !corpus.some((c) => c.includes(norm(q))));
    expect(unmatched).toEqual([]);
  });
});
