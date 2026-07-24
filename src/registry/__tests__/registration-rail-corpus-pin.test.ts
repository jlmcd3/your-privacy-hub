// REGISTRATION-INTAKE-CONTRACT-RAIL-MAP (2026-07-24) — rail corpus-pin.
//
// For every REGISTRATION_RAIL entry tagged `corpusPinned: true`, assert
// that the regulationText appears (after light normalization) as a
// contiguous substring of cppa_authorities.full_text for the matching
// `citation`, status='current'. Untagged entries (e.g. CA Delete Act)
// are exempt and printed as skipped.
//
// The test is skipped when the sandbox has no direct Postgres access
// (PGHOST unset) — corpus-pin is a CI/dev-only guard.

import { describe, it, expect } from "vitest";
import { REGISTRATION_RAIL } from "../../components/registration/RegistrationRailEntries";

function norm(s: string): string {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

describe.skipIf(!CAN_RUN)("Registration rail — corpus-pin (opt-in)", () => {
  it("every corpusPinned row appears verbatim in cppa_authorities.full_text", async () => {
    const { execFileSync } = await import("node:child_process");
    const pinned = Object.entries(REGISTRATION_RAIL).filter(([, r]) => r.corpusPinned);
    const skipped = Object.entries(REGISTRATION_RAIL)
      .filter(([, r]) => !r.corpusPinned)
      .map(([k]) => k);
    // eslint-disable-next-line no-console
    console.log(`[registration-rail-corpus-pin] skipped (untagged): ${skipped.join(", ")}`);

    const citations = [...new Set(pinned.map(([, r]) => r.citation))];
    const sql =
      "SELECT citation || E'\\x1f' || full_text || E'\\x1e' " +
      "FROM cppa_authorities WHERE status='current' AND citation = ANY(string_to_array($$" +
      citations.join("|") + "$$, '|'))";
    const out = execFileSync("psql", ["-tAX", "-c", sql], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    const corpus: Record<string, string> = {};
    for (const rec of out.split("\x1e")) {
      const [cit, body] = rec.split("\x1f");
      if (cit && body) corpus[cit.trim()] = norm(body);
    }

    const failures: string[] = [];
    for (const [key, row] of pinned) {
      const body = corpus[row.citation] ?? "";
      const q = norm(row.regulationText);
      if (!(body.length > 0 && body.includes(q))) {
        failures.push(`${key} (${row.citation})`);
      }
    }
    expect(
      failures,
      `Registration rail rows failed corpus-pin — paraphrasing is prohibited on pinned rows:\n  ${failures.join("\n  ")}`,
    ).toEqual([]);
  }, 30_000);
});
