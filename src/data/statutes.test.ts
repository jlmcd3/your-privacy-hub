import { describe, it, expect } from "vitest";
import comparison from "./us_state_comparison.json";
import { STATUTES } from "./statutes";
import { QUALIFIER_NOTES } from "./statuteQualifiers";

/**
 * STATES-1a validation suite.
 *
 * These tests are the deterministic net for the U.S. state comparison matrix.
 * They enforce structural invariants — number of provision cells, cite-presence
 * for every non-"no" cell, string-vocabulary discipline, effective-date
 * canonicalization, and law-abbreviation alignment. They intentionally do NOT
 * re-verify the underlying statutory content; that is the reviewer's job.
 */

const PROVISION_COUNT = comparison.provisions.length; // 12
const AUTHORITY_INDEX = PROVISION_COUNT - 1; // last column is enforcement authority
const ALLOWED_STRING_MARKS = new Set(["yes", "no", "limited", "conditional"]);

describe("us_state_comparison.json — structural invariants", () => {
  it("has 12 provisions", () => {
    expect(PROVISION_COUNT).toBe(12);
  });

  it("every state has exactly 12 provision cells", () => {
    for (const s of comparison.states) {
      expect(s.provisions.length, `${s.abbr}: wrong provision count`).toBe(PROVISION_COUNT);
    }
  });

  it("every state has a valid ISO effective date", () => {
    for (const s of comparison.states) {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(s.effective), `${s.abbr}: ${s.effective}`).toBe(true);
      expect(Number.isNaN(new Date(s.effective).getTime()), `${s.abbr}`).toBe(false);
    }
  });

  it("state abbreviations are unique and 2 letters", () => {
    const seen = new Set<string>();
    for (const s of comparison.states) {
      expect(s.abbr).toMatch(/^[A-Z]{2}$/);
      expect(seen.has(s.abbr), `duplicate ${s.abbr}`).toBe(false);
      seen.add(s.abbr);
    }
  });
});

describe("us_state_comparison.json — provision-cell vocabulary", () => {
  it("provision cells (indices 0..10) are boolean or an allowed string", () => {
    for (const s of comparison.states) {
      for (let pi = 0; pi < AUTHORITY_INDEX; pi++) {
        const v = s.provisions[pi];
        if (typeof v === "boolean") continue;
        expect(typeof v, `${s.abbr}:${pi} type`).toBe("string");
        expect(
          ALLOWED_STRING_MARKS.has(String(v).toLowerCase()),
          `${s.abbr}:${pi} value "${v}" not in allowed vocabulary`,
        ).toBe(true);
      }
    }
  });

  it("authority column (index 11) is a non-empty string", () => {
    for (const s of comparison.states) {
      const v = s.provisions[AUTHORITY_INDEX];
      expect(typeof v).toBe("string");
      expect((v as string).length > 0, `${s.abbr}`).toBe(true);
    }
  });
});

describe("STATUTES map — cite/URL discipline", () => {
  it("every STATUTES entry has a non-empty cite and an https URL", () => {
    for (const [key, entry] of Object.entries(STATUTES)) {
      expect(entry.cite && entry.cite.length > 0, `${key}: empty cite`).toBe(true);
      expect(/^https?:\/\//.test(entry.url), `${key}: bad URL ${entry.url}`).toBe(true);
    }
  });

  it("no STATUTES entry key targets the authority column", () => {
    for (const key of Object.keys(STATUTES)) {
      const [, pi] = key.split(":");
      expect(Number(pi), `${key} targets authority column`).toBeLessThan(AUTHORITY_INDEX);
    }
  });

  it("every non-'no' provision cell either has a STATUTES entry or is unconfirmed (structural)", () => {
    // This is a soft-invariant: cells that are true/limited/conditional should
    // ideally have a STATUTES entry. We surface, but do not fail, cells that
    // lack one — except where the courier's own record confirms an entry MUST
    // exist. See per-state whitelist below.
    const missing: string[] = [];
    for (const s of comparison.states) {
      for (let pi = 0; pi < AUTHORITY_INDEX; pi++) {
        const v = s.provisions[pi];
        const isNo = v === false || (typeof v === "string" && v.toLowerCase() === "no");
        if (isNo) continue;
        const key = `${s.abbr}:${pi}`;
        if (!STATUTES[key]) missing.push(key);
      }
    }
    // Known-acceptable gaps (documented in statutes.ts headnotes):
    //   FL:2  — portability absent (false); no cite
    //   IA:3  — correction absent (false); no cite
    //   IA:6  — profiling opt-out absent (false); no cite
    //   UT:3  — correction absent (false); no cite
    //   UT:6  — profiling opt-out absent (false); no cite
    // (Those cells are `false`, so already excluded above.)
    // Any residual entry here is a real gap the reviewer must close.
    expect(missing, `Missing STATUTES entries: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("Vermont (VDPOSA) — presence", () => {
  const vt = comparison.states.find((s) => s.abbr === "VT");
  it("is present as an enacted state", () => {
    expect(vt).toBeDefined();
    expect(vt!.status).toBe("enacted");
  });
  it("has effective date 2028-01-01", () => {
    expect(vt!.effective).toBe("2028-01-01");
  });
  it("has no private right of action", () => {
    expect(vt!.provisions[10]).toBe(false);
  });
  it("has VT:10 cite pointing at § 2415j(a)", () => {
    expect(STATUTES["VT:10"].cite).toMatch(/§\s*2415j\(a\)/);
  });
});

describe("Correctness spot-checks (STATES-1a courier)", () => {
  const byAbbr = Object.fromEntries(comparison.states.map((s) => [s.abbr, s]));

  it("CA private right of action is 'limited' with a § 1798.150 cite", () => {
    expect(byAbbr.CA.provisions[10]).toBe("limited");
    expect(STATUTES["CA:10"].cite).toMatch(/§\s*1798\.150/);
  });

  it("CA data-broker registration cite is § 1798.99.82", () => {
    expect(STATUTES["CA:9"].cite).toMatch(/§\s*1798\.99\.82/);
  });

  it("DE DPIA is 'conditional' with a § 12D-108 cite", () => {
    expect(byAbbr.DE.provisions[8]).toBe("conditional");
    expect(STATUTES["DE:8"].cite).toMatch(/§\s*12D-108/);
  });

  it("MN uses Ch. 325M cites (not 325O)", () => {
    for (const pi of [0, 1, 2, 3, 4, 5, 6, 7, 8, 10]) {
      const c = STATUTES[`MN:${pi}`]?.cite ?? "";
      expect(c, `MN:${pi} cite "${c}"`).toMatch(/§\s*325M\./);
      expect(c, `MN:${pi} still uses 325O`).not.toMatch(/§\s*325O\./);
    }
  });

  it("NE consumer-rights cites live at § 87-1107(2) — not (1)", () => {
    for (const pi of [0, 1, 2, 3, 4, 5, 6]) {
      const c = STATUTES[`NE:${pi}`].cite;
      expect(c, `NE:${pi}`).toMatch(/§\s*87-1107\(2\)/);
      expect(c, `NE:${pi} still targets subsection (1)`).not.toMatch(/§\s*87-1107\(1\)/);
    }
  });

  it("NE DPIA cite exists at § 87-1112", () => {
    expect(STATUTES["NE:8"]?.cite ?? "").toMatch(/§\s*87-1112/);
  });

  it("MT law abbreviation is MTCDPA (Consumer Data Privacy Act)", () => {
    expect(byAbbr.MT.law).toBe("MTCDPA");
  });

  it("Oregon data-broker registration is true with an ORS § 646A.362 cite", () => {
    expect(byAbbr.OR.provisions[9]).toBe(true);
    expect(STATUTES["OR:9"].cite).toMatch(/§\s*646A\.362/);
  });

  it("MD effective date is 2025-10-01", () => {
    expect(byAbbr.MD.effective).toBe("2025-10-01");
  });

  it("NE effective date is 2025-01-01", () => {
    expect(byAbbr.NE.effective).toBe("2025-01-01");
  });

  it("MN effective date is 2025-07-31", () => {
    expect(byAbbr.MN.effective).toBe("2025-07-31");
  });

  it("FL private right of action is false with § 501.72(8) cite", () => {
    expect(byAbbr.FL.provisions[10]).toBe(false);
    expect(STATUTES["FL:10"].cite).toMatch(/§\s*501\.72\(8\)/);
  });
});

describe("Qualifier notes", () => {
  it("every QUALIFIER_NOTES key targets a real STATUTES entry", () => {
    for (const key of Object.keys(QUALIFIER_NOTES)) {
      expect(STATUTES[key], `QUALIFIER_NOTES ${key} lacks a STATUTES entry`).toBeDefined();
    }
  });

  it("every 'limited'/'conditional' cell has a qualifier note", () => {
    for (const s of comparison.states) {
      for (let pi = 0; pi < AUTHORITY_INDEX; pi++) {
        const v = s.provisions[pi];
        if (v !== "limited" && v !== "conditional") continue;
        const key = `${s.abbr}:${pi}`;
        expect(QUALIFIER_NOTES[key], `${key} missing qualifier note`).toBeDefined();
      }
    }
  });
});

describe("DPIA (index 8) — cite-required invariant (STATES-1b)", () => {
  const DPIA = 8;
  it("every DPIA cell that is not a hard 'no' has a STATUTES entry with a non-empty cite", () => {
    const missing: string[] = [];
    for (const s of comparison.states) {
      const v = s.provisions[DPIA];
      const isNo = v === false || (typeof v === "string" && v.toLowerCase() === "no");
      if (isNo) continue;
      const key = `${s.abbr}:${DPIA}`;
      const entry = STATUTES[key];
      if (!entry || !entry.cite || entry.cite.trim().length === 0) missing.push(key);
    }
    expect(missing, `Uncited DPIA cells: ${missing.join(", ")}`).toEqual([]);
  });
});
