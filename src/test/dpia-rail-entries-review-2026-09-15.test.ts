// DPIA INTAKE MASTER REVIEW (2026-09-15) — pin tests for the DPIARailEntries
// and EdpbDpiaGuidance fixes: F12 (coaching for template entries), F13
// (missing automated_decision_nature mapping), F14 (verbatim-vs-placeholder
// regulationText), F15/F17 (no unqualified overstatements retained), and F16
// (EDPB template status is "for public consultation", not final adoption).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DPIA_RAIL } from "@/components/dpia/DPIARailEntries";
import { EDPB_DPIA_GUIDANCE, EDPB_DPIA_SOURCE } from "@/components/dpia/EdpbDpiaGuidance";
import { DPIA_VERIFIED_AUTHORITIES } from "../../supabase/functions/run-dpia-framework/_local/registry/dpia-verified-authorities";

const railSource = readFileSync("src/components/dpia/DPIARailEntries.ts", "utf8");

describe("DPIA INTAKE MASTER REVIEW (2026-09-15) — DPIARailEntries", () => {
  it("F13: adds a dedicated automated_decision_nature entry", () => {
    expect(DPIA_RAIL.automated_decision_nature).toBeTruthy();
    expect(DPIA_RAIL.automated_decision_nature.citation).toMatch(/22/);
  });

  it("F14: no entry's regulationText is a bare ellipsis placeholder", () => {
    for (const [key, entry] of Object.entries(DPIA_RAIL)) {
      expect(entry.regulationText, `${key} regulationText`).not.toBe("…");
      expect(entry.regulationText, `${key} regulationText`).not.toBe("...");
    }
  });

  it("every entry has a citationUrl starting with https://", () => {
    for (const [key, entry] of Object.entries(DPIA_RAIL)) {
      expect(entry.citationUrl, `${key} citationUrl`).toBeTruthy();
      expect(entry.citationUrl!.startsWith("https://"), `${key} citationUrl`).toBe(true);
    }
  });

  it("F15/F17: never ranks legal bases or claims missing data cannot be analysed elsewhere", () => {
    expect(railSource).not.toContain("poses lower risk than legitimate interests");
    expect(railSource).not.toContain("cannot be analysed elsewhere");
  });
});

describe("DPIA INTAKE MASTER REVIEW (2026-09-15) — EdpbDpiaGuidance", () => {
  it("F12: every template entry carries non-empty coachLead and coachBody", () => {
    for (const [key, entry] of Object.entries(EDPB_DPIA_GUIDANCE)) {
      expect(entry.coachLead, `${key} coachLead`).toBeTruthy();
      expect(entry.coachBody, `${key} coachBody`).toBeTruthy();
    }
  });

  it("F16: the source label identifies adoption for public consultation", () => {
    expect(EDPB_DPIA_SOURCE.label).toContain("public consultation");
  });

  it("verbatim entries keep guidance byte-identical to the registry's verbatim_quote", () => {
    const registry: Record<string, { verbatim_quote: string }> = DPIA_VERIFIED_AUTHORITIES;
    const verbatimEntries = Object.values(EDPB_DPIA_GUIDANCE).filter(
      (e) => e.verbatimPropositionKey,
    );
    expect(verbatimEntries.length).toBeGreaterThan(0);
    for (const entry of verbatimEntries) {
      const row = registry[entry.verbatimPropositionKey!];
      expect(row, `registry row for ${entry.verbatimPropositionKey}`).toBeTruthy();
      expect(entry.guidance).toBe(row.verbatim_quote);
    }
  });
});
