// ITEM 298 — CPPA CYBERSECURITY-AUDIT CORPUS PIN (permanent drift guard).
//
// Pins definitional sentences of the cybersecurity-audit article against the
// ingested corpus rows in `public.provision_texts`:
//   cppa-7120 — § 7120(b) threshold operands
//   cppa-7121 — § 7121(a)(1)–(3) cohort boundaries (dollar figures verbatim)
//   cppa-7122 — § 7122(g) five-year retention rule
//   cppa-7123 — § 7123(c)(10) segmentation component (+ (c)(11), (c)(12)/(13), (d))
//   cppa-7124 — § 7124(b) certification deadline
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
  "cppa-7120": [
    [
      "§ 7120(b)(1) revenue-threshold operand",
      "The business meets the threshold set forth in Civil Code section 1798.140, subdivision (d)(1)(C), in the preceding calendar year",
    ],
    [
      "§ 7120(b)(2) size-threshold operand",
      "The business meets the threshold set forth in Civil Code section 1798.140, subdivision (d)(1)(A)",
    ],
    [
      "§ 7120(b)(2)(A) 250,000 consumers/households",
      "Processed the personal information of 250,000 or more consumers or households in the preceding calendar year",
    ],
    [
      "§ 7120(b)(2)(B) 50,000 sensitive-PI consumers",
      "Processed the sensitive personal information of 50,000 or more consumers in the preceding calendar year",
    ],
  ],
  "cppa-7121": [
    [
      "§ 7121(a)(1) cohort — >$100,000,000",
      "April 1, 2028, if the business's annual gross revenue for 2026 was more than one hundred million dollars ($100,000,000) as of January 1, 2027.",
    ],
    [
      "§ 7121(a)(2) cohort — $50,000,000–$100,000,000",
      "April 1, 2029, if the business's annual gross revenue for 2027 was between fifty million dollars ($50,000,000) and one hundred million dollars ($100,000,000) as of January 1, 2028.",
    ],
    [
      "§ 7121(a)(3) cohort — <$50,000,000",
      "April 1, 2030, if the business's annual gross revenue for 2028 was less than fifty million dollars ($50,000,000).",
    ],
  ],
  "cppa-7122": [
    [
      "§ 7122(g) five-year retention",
      "The business and the auditor must retain all documents relevant to each cybersecurity audit for a minimum of five (5) years after completion of the cybersecurity audit.",
    ],
    [
      "§ 7122(d) no primary reliance on management assertions",
      "No finding of any cybersecurity audit may rely primarily on assertions or attestations by the business's management.",
    ],
  ],
  "cppa-7123": [
    [
      "§ 7123(c)(10) segmentation — standalone component",
      "Segmentation of an information system",
    ],
    [
      "§ 7123(c)(11) ports, services, and protocols",
      "Limitation and control of ports, services, and protocols.",
    ],
    [
      "§ 7123(c)(12) cybersecurity awareness",
      "Cybersecurity awareness, including how the business maintains current knowledge of changing cybersecurity threats and countermeasures.",
    ],
    [
      "§ 7123(c)(13) cybersecurity education and training",
      "Cybersecurity education and training, including training for each employee, independent contractor, and any other personnel to whom the business provides access to its information system",
    ],
    [
      "§ 7123(d) non-enumerated components assessable",
      "Nothing in this section prohibits a cybersecurity audit from assessing components of a cybersecurity program that are not set forth in subsections (b) or (c).",
    ],
  ],
  "cppa-7124": [
    [
      "§ 7124(b) April 1 certification deadline",
      "The business must submit the certification no later than April 1 following any year that the business is required to complete a cybersecurity audit.",
    ],
  ],
};

/**
 * Negative pins: phrases that must NOT appear in the enacted corpus text.
 * - "zero trust" — deleted from § 7123(c)(10) per FSOR pp. 24–25.
 * - "permitted, restricted, or blocked" — generator paraphrase of § 7123(c)(11).
 */
const NEGATIVE_PINS: ReadonlyArray<readonly [string, RegExp]> = [
  ["zero-trust (deleted from § 7123(c)(10))", /zero[- ]trust/i],
  ["ports paraphrase 'permitted, restricted, or blocked'", /permitted, restricted, or blocked/i],
];

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

describe.skipIf(!CAN_RUN)("CPPA cybersecurity-audit article — corpus pin", () => {
  it("every pinned definitional sentence appears verbatim in provision_texts", async () => {
    const { execFileSync } = await import("node:child_process");
    const keys = Object.keys(PINS);
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
    for (const key of keys) {
      for (const [label, re] of NEGATIVE_PINS) {
        if (re.test(corpus[key] ?? "")) negatives.push(`${key} — ${label}`);
      }
    }
    expect(
      negatives,
      `Prohibited phrase found in enacted corpus text:\n  ${negatives.join("\n  ")}`,
    ).toEqual([]);
  }, 30_000);
});
