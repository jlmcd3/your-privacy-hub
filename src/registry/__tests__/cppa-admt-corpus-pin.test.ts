// ITEM 307 — CPPA ADMT ARTICLE CORPUS PIN (permanent drift guard).
//
// Twin of `cppa-cyber-corpus-pin.test.ts`, covering Article 11 (ADMT):
//   cppa-7200 — § 7200(a) Article-11 usage trigger + § 7200(b) compliance dates
//   cppa-7222 — § 7222 right to ACCESS ADMT (response content, withholding,
//               verification, aggregate-response rule)
//   cppa-7220 — cross-reference integrity only (row ingested earlier)
//
// PROVENANCE: OAL-approved regulations PDF
// https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf
// SHA-256 7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650
// (hash re-verified 2026-07-31 before extraction).
//
// AUTHORING RULE: definitional sentences ONLY — never illustrative examples.
// Do NOT edit a pin to make a failing corpus pass; re-ingest the corpus.
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

/** key → list of [label, verbatim definitional substring]. */
const PINS: Readonly<Record<string, ReadonlyArray<readonly [string, string]>>> = {
  "cppa-7200": [
    [
      "§ 7200(a) Article-11 usage trigger",
      "A business that uses ADMT to make a significant decision concerning a consumer must comply with the requirements of this Article.",
    ],
    [
      "§ 7200(b) pre-2027 compliance date",
      "A business that uses ADMT for a significant decision prior to January 1, 2027, must be in compliance with the requirements of this Article no later than January 1, 2027.",
    ],
    [
      "§ 7200(b) on-or-after-2027 continuing duty",
      "A business that uses ADMT on or after January 1, 2027, must be in compliance with the requirements of this Article any time it is using ADMT for a significant decision.",
    ],
  ],
  "cppa-7222": [
    [
      "§ 7222(a) access-right trigger",
      "A business that uses ADMT to make a significant decision must provide a consumer with information about this use when responding to a consumer's request to access ADMT.",
    ],
    [
      "§ 7222(b) plain-language response duty",
      "When responding to a consumer's request to access ADMT, a business must provide plain language explanations of the following information to the consumer",
    ],
    [
      "§ 7222(b)(1) specific-purpose, no generic terms",
      "The specific purpose for which the business used ADMT with respect to the consumer. The business must not describe the purpose in generic terms",
    ],
    [
      "§ 7222(b)(2) logic explanation",
      "Information about the logic of the ADMT. Such information must enable a consumer to understand how the ADMT processed their personal information to generate an output with respect to them",
    ],
    [
      "§ 7222(b)(3) outcome + human-involvement boundary",
      "The outcome of the decisionmaking process for the consumer, including how the business used the output of the ADMT to make a significant decision with respect to the consumer.",
    ],
    [
      "§ 7222(c)(1) trade-secret carve-out",
      "Trade secrets, as defined in Civil Code section 3426.1, subdivision (d)",
    ],
    [
      "§ 7222(d) dark-patterns prohibition",
      "A business's methods for consumers to submit requests to access ADMT must be easy to use and must not use dark patterns.",
    ],
    [
      "§ 7222(e) Article 5 verification",
      "A business must comply with the verification requirements set forth in Article 5 for requests to access ADMT.",
    ],
    [
      "§ 7222(g) transmission security",
      "A business must use reasonable security measures when transmitting the requested information to the consumer.",
    ],
    [
      "§ 7222(j) aggregate-response threshold",
      "A business that used an ADMT with respect to a consumer more than four times within a 12-month period may provide an aggregate-level response to the consumer's request to access ADMT.",
    ],
    [
      "§ 7222(k) no-retaliation",
      "A business must not retaliate against a consumer because the consumer exercised their right to access ADMT",
    ],
  ],
};

/**
 * Negative pins: phrases that must NOT appear in the enacted Article-11 text.
 * - § 7222 governs ACCESS, not opt-out — the opt-out duty lives in § 7221.
 */
const NEGATIVE_PINS: ReadonlyArray<readonly [string, RegExp]> = [
  ["opt-out duty misattributed to § 7222", /request to opt-out of ADMT/i],
];

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

async function loadCorpus(keys: string[]): Promise<Record<string, string>> {
  const { execFileSync } = await import("node:child_process");
  const sql =
    "SELECT key || E'\\x1f' || verbatim_excerpt || E'\\x1e' " +
    "FROM provision_texts WHERE status='approved' AND key = ANY(string_to_array($$" +
    keys.join("|") + "$$, '|'))";
  const out = execFileSync("psql", ["-tAX", "-c", sql], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const corpus: Record<string, string> = {};
  for (const rec of out.split("\x1e")) {
    const [k, body] = rec.split("\x1f");
    if (k && body) corpus[k.trim()] = norm(body);
  }
  return corpus;
}

describe.skipIf(!CAN_RUN)("CPPA ADMT article (Article 11) — corpus pin", () => {
  it("every pinned definitional sentence appears verbatim in provision_texts", async () => {
    const keys = Object.keys(PINS);
    const corpus = await loadCorpus(keys);

    const missingRows = keys.filter((k) => !corpus[k]);
    expect(
      missingRows,
      `Corpus rows absent or not approved:\n  ${missingRows.join("\n  ")}`,
    ).toEqual([]);

    const failures: string[] = [];
    for (const [key, pins] of Object.entries(PINS)) {
      const body = corpus[key] ?? "";
      for (const [label, quote] of pins) {
        if (!body.includes(norm(quote))) failures.push(`${key} — ${label}`);
      }
    }
    expect(
      failures,
      `Pins missing from corpus (re-ingest the corpus; do NOT edit the pin):\n  ${failures.join("\n  ")}`,
    ).toEqual([]);

    const negatives: string[] = [];
    for (const [label, re] of NEGATIVE_PINS) {
      if (re.test(corpus["cppa-7222"] ?? "")) negatives.push(`cppa-7222 — ${label}`);
    }
    expect(
      negatives,
      `Prohibited phrase found in enacted corpus text:\n  ${negatives.join("\n  ")}`,
    ).toEqual([]);
  }, 30_000);

  it("§ 7220(a) cross-references § 7200(a) verbatim on both sides", async () => {
    const corpus = await loadCorpus(["cppa-7200", "cppa-7220"]);

    // Referring side: § 7220(a) names the trigger clause explicitly.
    expect(corpus["cppa-7220"] ?? "").toContain(
      norm(
        "A business that uses ADMT as set forth in section 7200, subsection (a), must provide consumers with a Pre-use Notice.",
      ),
    );

    // Referenced side: § 7200(a) is in fact the ADMT-usage trigger clause.
    expect(corpus["cppa-7200"] ?? "").toContain(
      norm(
        "(a) A business that uses ADMT to make a significant decision concerning a consumer must comply with the requirements of this Article.",
      ),
    );
  }, 30_000);
});
