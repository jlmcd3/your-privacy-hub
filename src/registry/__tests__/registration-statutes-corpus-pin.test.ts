// ITEM 303 — DATA-BROKER REGISTRATION STATUTE CORPUS PIN (permanent drift guard).
//
// Pins (a) the definitional sentence of "data broker" per state and (b) each
// registration window/term figure VERBATIM, against `public.provision_texts`:
//   ca-delete-act-1798-99-80 / -82 / -86  (US-CA)  leginfo.legislature.ca.gov
//   vt-9vsa-2430 / vt-9vsa-2446           (US-VT)  legislature.vermont.gov
//   tx-bc-510-001 / -003 / -005           (US-TX)  statutes.capitol.texas.gov
//   or-ors-646a-593                       (US-OR)  oregonlegislature.gov
//
// WHY PER-STATE DEFINITION PINS: the four definitions differ materially
// (CA = sells only + direct-relationship; VT = sells OR licenses +
// direct-relationship; TX = collects/processes/transfers, no sale element and
// no direct-relationship element; OR = collects and sells or licenses).
// The NEGATIVE pins below exist to catch CROSS-STATE BLEED — one state's
// definitional wording appearing inside another state's row.
//
// SCHEDULE-SURFACE LAW: window figures are pinned as enacted text only. No test
// here computes a customer deadline, and the engine must not either.
//
// AUTHORING RULE: definitional/operative sentences ONLY. Do NOT edit a pin to
// make a failing corpus pass; re-ingest the corpus from the official publisher.
//
// Skipped when the sandbox has no direct Postgres access (PGHOST unset).

import { describe, it, expect } from "vitest";

/** Normalize typography only — curly quotes/dashes, NBSP, whitespace runs. */
function norm(s: string): string {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** key → list of [label, verbatim substring]. */
const PINS: Readonly<Record<string, ReadonlyArray<readonly [string, string]>>> = {
  "ca-delete-act-1798-99-80": [
    [
      "CA definitional sentence — data broker",
      '"Data broker" means a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship.',
    ],
    [
      "CA exclusion — FCRA",
      "An entity to the extent that it is covered by the federal Fair Credit Reporting Act",
    ],
  ],
  "ca-delete-act-1798-99-82": [
    [
      "CA registration window — verbatim",
      "On or before January 31 following each year in which a business meets the definition of data broker as provided in this title, the business shall register with the California Privacy Protection Agency",
    ],
    [
      "CA fee — set by the Agency, not fixed in statute",
      "Pay a registration fee in an amount determined by the California Privacy Protection Agency",
    ],
  ],
  "ca-delete-act-1798-99-86": [
    [
      "CA DROP stand-up date",
      "By January 1, 2026, the California Privacy Protection Agency shall establish an accessible deletion mechanism",
    ],
    [
      "CA DROP broker access obligation — 45-day cadence",
      "Beginning August 1, 2026, a data broker shall access the accessible deletion mechanism established pursuant to subdivision (a) at least once every 45 days",
    ],
  ],
  "vt-9vsa-2430": [
    [
      "VT definitional sentence — data broker",
      '"Data broker" means a business, or unit or units of a business, separately or together, that knowingly collects and sells or licenses to third parties the brokered personal information of a consumer with whom the business does not have a direct relationship.',
    ],
  ],
  "vt-9vsa-2446": [
    [
      "VT registration window — verbatim",
      "Annually, on or before January 31 following a year in which a person meets the definition of data broker as provided in section 2430 of this title, a data broker shall:",
    ],
    ["VT statutory fee — $100.00", "pay a registration fee of $100.00"],
    ["VT registrar — Secretary of State", "register with the Secretary of State"],
  ],
  "tx-bc-510-001": [
    [
      "TX definitional sentence — data broker",
      '"Data broker" means a business entity that collects, processes, or transfers personal data that the business entity did not collect directly from the individual linked or linkable to the data.',
    ],
  ],
  "tx-bc-510-003": [
    [
      "TX threshold — 50 percent of revenue",
      "more than 50 percent of the data broker's revenue directly from processing or transferring personal data not collected by the data broker directly from the individuals to whom the data pertains",
    ],
    [
      "TX threshold — more than 50,000 individuals",
      "the personal data of more than 50,000 individuals not collected by the data broker directly from the individuals to whom the data pertains",
    ],
  ],
  "tx-bc-510-005": [
    [
      "TX registration term — rolling anniversary, verbatim",
      "A registration certificate expires on the first anniversary of its date of issuance.",
    ],
    [
      "TX fee — $300",
      "register with the secretary of state by filing a registration statement and paying a registration fee of $300",
    ],
    ["TX renewal fee — $300", "paying a renewal fee in the amount of $300"],
  ],
  "or-ors-646a-593": [
    [
      "OR definitional sentence — data broker",
      '"Data broker" means a business entity or part of a business entity that collects and sells or licenses brokered personal data to another person.',
    ],
    [
      "OR registration precondition — verbatim",
      "a data broker may not collect, sell or license brokered personal data within this state unless the data broker first registers with the Department of Consumer and Business Services",
    ],
    [
      "OR registration term — December 31, verbatim",
      "A registration under this section is valid until December 31 of the year in which the department approves the registration.",
    ],
  ],
};

/**
 * Cross-state bleed guards: phrases that must NOT appear in the named row.
 * Each phrase is a *different* state's definitional or fee wording.
 */
const NEGATIVE_PINS: Readonly<Record<string, ReadonlyArray<readonly [string, RegExp]>>> = {
  "ca-delete-act-1798-99-80": [
    ["VT 'sells or licenses' element bled into CA definition", /sells or licenses to third parties/i],
    ["TX 'collects, processes, or transfers' bled into CA definition", /collects, processes, or transfers/i],
  ],
  "vt-9vsa-2430": [
    ["TX 'collects, processes, or transfers' bled into VT definition", /collects, processes, or transfers/i],
    ["OR 'brokered personal data' bled into VT definition", /brokered personal data/i],
  ],
  "tx-bc-510-001": [
    ["CA/VT direct-relationship element bled into TX definition", /does not have a direct relationship/i],
  ],
  "or-ors-646a-593": [
    ["CA/VT direct-relationship element bled into OR definition", /does not have a direct relationship/i],
    ["VT/CA January 31 window bled into OR row", /January 31/i],
  ],
};

/** Rows whose jurisdiction tag is fixed by dispatch — no cross-tagging. */
const EXPECTED_JURISDICTION: Readonly<Record<string, string>> = {
  "ca-delete-act-1798-99-80": "US-CA",
  "ca-delete-act-1798-99-82": "US-CA",
  "ca-delete-act-1798-99-86": "US-CA",
  "vt-9vsa-2430": "US-VT",
  "vt-9vsa-2446": "US-VT",
  "tx-bc-510-001": "US-TX",
  "tx-bc-510-003": "US-TX",
  "tx-bc-510-005": "US-TX",
  "or-ors-646a-593": "US-OR",
};

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

describe.skipIf(!CAN_RUN)("Data-broker registration statutes — corpus pin", () => {
  it("definitions, windows and fees appear verbatim, per state, with no cross-state bleed", async () => {
    const { execFileSync } = await import("node:child_process");
    const keys = Object.keys(PINS);
    const sql =
      "SELECT key || E'\\x1f' || jurisdiction || E'\\x1f' || verbatim_excerpt || E'\\x1e' " +
      "FROM provision_texts WHERE status='approved' AND key = ANY(string_to_array($$" +
      keys.join("|") + "$$, '|'))";
    const out = execFileSync("psql", ["-tAX", "-c", sql], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });

    const corpus: Record<string, { jurisdiction: string; body: string }> = {};
    for (const rec of out.split("\x1e")) {
      const [k, j, body] = rec.split("\x1f");
      if (k && j && body) corpus[k.trim()] = { jurisdiction: j.trim(), body: norm(body) };
    }

    const missingRows = keys.filter((k) => !corpus[k]);
    expect(
      missingRows,
      `Corpus rows absent or not approved:\n  ${missingRows.join("\n  ")}`,
    ).toEqual([]);

    const badTags = keys.filter(
      (k) => corpus[k].jurisdiction !== EXPECTED_JURISDICTION[k],
    );
    expect(
      badTags,
      `Rows tagged to the wrong state:\n  ${badTags
        .map((k) => `${k} → ${corpus[k].jurisdiction} (expected ${EXPECTED_JURISDICTION[k]})`)
        .join("\n  ")}`,
    ).toEqual([]);

    const failures: string[] = [];
    for (const [key, pins] of Object.entries(PINS)) {
      const body = corpus[key].body;
      for (const [label, quote] of pins) {
        if (!body.includes(norm(quote))) failures.push(`${key} — ${label}`);
      }
    }
    expect(
      failures,
      `Pins missing from corpus (re-ingest from the official state publisher; do NOT edit the pin):\n  ${failures.join("\n  ")}`,
    ).toEqual([]);

    const bleed: string[] = [];
    for (const [key, negs] of Object.entries(NEGATIVE_PINS)) {
      const body = corpus[key]?.body ?? "";
      for (const [label, re] of negs) {
        if (re.test(body)) bleed.push(`${key} — ${label}`);
      }
    }
    expect(
      bleed,
      `Cross-state definitional bleed detected:\n  ${bleed.join("\n  ")}`,
    ).toEqual([]);
  }, 30_000);
});
