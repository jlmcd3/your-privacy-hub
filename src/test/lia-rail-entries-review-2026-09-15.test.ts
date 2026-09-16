// LI Assessment Intake Master Review (2026-09-15) — statute-rail guardrails.
//
// Locks the registry corrections in place: the seven focused fields that had no
// entry, the removal of every "…" placeholder from regulationText, a citationUrl
// on every entry, and the categorical legal claims the review asked us to
// qualify. String checks read the source file so a phrase cannot come back in a
// comment or in an entry the runtime map does not expose.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { LIA_RAIL } from "@/components/lia/LIARailEntries";

const SOURCE = readFileSync("src/components/lia/LIARailEntries.ts", "utf8");

const NEW_KEYS = [
  "device_access",
  "device_access_strictly_necessary",
  "marketing_channels",
  "marketing_consent_basis",
  "achievable_without_personal_data",
  "achievable_without_personal_data_rationale",
  "art9_condition",
] as const;

// Claims the review found categorical or unsupported. None may reappear.
const FORBIDDEN_PHRASES = [
  "generally makes legitimate interests the wrong basis",
  "rarely evidences",
  "commits no one",
  "gives an unconditional right to object",
] as const;

describe("LIA rail entries — master review 2026-09-15", () => {
  it("has an entry for every page-focused field that lacked one (F08)", () => {
    for (const key of NEW_KEYS) {
      expect(LIA_RAIL[key], `missing rail entry: ${key}`).toBeDefined();
      expect(LIA_RAIL[key].fieldLabel.length, `empty fieldLabel: ${key}`).toBeGreaterThan(0);
      expect(LIA_RAIL[key].citation.length, `empty citation: ${key}`).toBeGreaterThan(0);
    }
  });

  it("carries no placeholder regulationText (F09)", () => {
    for (const [key, entry] of Object.entries(LIA_RAIL)) {
      expect(entry.regulationText, `placeholder regulationText: ${key}`).not.toBe("…");
      expect(entry.regulationText, `placeholder regulationText: ${key}`).not.toBe("...");
    }
  });

  it("gives every entry an https citationUrl", () => {
    for (const [key, entry] of Object.entries(LIA_RAIL)) {
      expect(entry.citationUrl, `missing citationUrl: ${key}`).toBeDefined();
      expect(entry.citationUrl?.startsWith("https://"), `non-https citationUrl: ${key}`).toBe(true);
    }
  });

  it("no longer states the categorical claims the review flagged", () => {
    const haystack = SOURCE.toLowerCase();
    for (const phrase of FORBIDDEN_PHRASES) {
      expect(haystack.includes(phrase.toLowerCase()), `forbidden phrase present: ${phrase}`).toBe(false);
    }
  });

  it("separates direct-marketing objections from other Article 21 objections (F14)", () => {
    expect(LIA_RAIL.opt_out_mechanism.coachBody).toContain(
      "Distinguish direct-marketing objections from other Article 21 objections",
    );
  });
});
