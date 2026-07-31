// ITEM 300 — GDPR REGISTRY CORPUS PIN (permanent drift/truncation guard).
//
// Pins definitional sentences of the EU registry rows in `public.provision_texts`
// against Regulation (EU) 2016/679 (CELEX 32016R0679, consolidated text):
//   gdpr-art-35   — 35(1) similar-processing sentence; 35(7)(a)–(d) incl. the
//                   "necessity and proportionality" phrase
//   gdpr-art-33   — 33(1) "without undue delay and, where feasible, not later
//                   than 72 hours" clause; 33(3)(a)–(d)
//   gdpr-art-34   — 34(1) high-risk trigger; 34(2) cross-reference
//   gdpr-art-22   — 22(1) sole-automated-decision right; 22(3)/22(4)
//   gdpr-art-5-2  — accountability phrase
//   gdpr-art-24 / -36 / -37 / -38 / -39 and recitals 85–88
//
// LENGTH PINS (truncation guard): Item 291 reported gdpr-art-22 and gdpr-art-34
// as "P0 TRUNCATED" against `gdpr_articles`. Item 300 disproved that: the
// registry rows are COMPLETE, and the deltas (25 / 69 chars) are exactly the
// trailing scrape artifacts carried by `gdpr_articles` ("Section 5\n\nRestrictions"
// and "Section 3\n\nData protection impact assessment and prior consultation"),
// which are the NEXT section's heading, not Article text. The pins below
// therefore lock the ARTICLE-ONLY lengths (1289 / 1649) — pinning 1314 / 1718
// would pin the artifact IN. Lengths are raw character counts of the stored
// verbatim_excerpt, un-normalized.
//
// AUTHORING RULE: definitional sentences ONLY. Do NOT edit a pin to make a
// failing corpus pass; re-ingest the corpus.
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
  "gdpr-art-5-2": [
    [
      "Art. 5(2) accountability",
      "The controller shall be responsible for, and be able to demonstrate compliance with, paragraph 1",
    ],
  ],
  "gdpr-art-22": [
    [
      "Art. 22(1) sole-automated-decision right",
      "The data subject shall have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning him or her or similarly significantly affects him or her.",
    ],
    [
      "Art. 22(3) safeguards",
      "at least the right to obtain human intervention on the part of the controller, to express his or her point of view and to contest the decision",
    ],
    [
      "Art. 22(4) special-category bar",
      "shall not be based on special categories of personal data referred to in Article 9(1)",
    ],
  ],
  "gdpr-art-24": [
    [
      "Art. 24(1) demonstrable-compliance duty",
      "implement appropriate technical and organisational measures to ensure and to be able to demonstrate that processing is performed in accordance with this Regulation",
    ],
  ],
  "gdpr-art-33": [
    [
      "Art. 33(1) 72-hour clause",
      "without undue delay and, where feasible, not later than 72 hours after having become aware of it",
    ],
    [
      "Art. 33(1) risk carve-out",
      "unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons",
    ],
    [
      "Art. 33(3)(a) nature of the breach",
      "describe the nature of the personal data breach including where possible, the categories and approximate number of data subjects concerned",
    ],
    [
      "Art. 33(3)(b) DPO contact point",
      "communicate the name and contact details of the data protection officer or other contact point where more information can be obtained",
    ],
    ["Art. 33(3)(c) likely consequences", "describe the likely consequences of the personal data breach"],
    [
      "Art. 33(3)(d) measures taken",
      "describe the measures taken or proposed to be taken by the controller to address the personal data breach",
    ],
  ],
  "gdpr-art-34": [
    [
      "Art. 34(1) high-risk communication trigger",
      "When the personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall communicate the personal data breach to the data subject without undue delay.",
    ],
    [
      "Art. 34(2) content cross-reference",
      "describe in clear and plain language the nature of the personal data breach and contain at least the information and measures referred to in points (b), (c) and (d) of Article 33(3)",
    ],
  ],
  "gdpr-art-35": [
    [
      "Art. 35(1) similar-processing sentence",
      "A single assessment may address a set of similar processing operations that present similar high risks.",
    ],
    [
      "Art. 35(7)(a) systematic description",
      "a systematic description of the envisaged processing operations and the purposes of the processing",
    ],
    [
      "Art. 35(7)(b) necessity and proportionality",
      "an assessment of the necessity and proportionality of the processing operations in relation to the purposes",
    ],
    [
      "Art. 35(7)(c) risk assessment",
      "an assessment of the risks to the rights and freedoms of data subjects referred to in paragraph 1",
    ],
    [
      "Art. 35(7)(d) measures envisaged",
      "the measures envisaged to address the risks, including safeguards, security measures and mechanisms to ensure the protection of personal data",
    ],
  ],
  "gdpr-art-36": [
    [
      "Art. 36(1) prior-consultation trigger",
      "The controller shall consult the supervisory authority prior to processing where a data protection impact assessment under Article 35 indicates that the processing would result in a high risk in the absence of measures taken by the controller to mitigate the risk.",
    ],
  ],
  "gdpr-art-37": [
    [
      "Art. 37(1)(b) regular and systematic monitoring",
      "require regular and systematic monitoring of data subjects on a large scale",
    ],
    [
      "Art. 37(5) expert knowledge",
      "on the basis of professional qualities and, in particular, expert knowledge of data protection law and practices",
    ],
  ],
  "gdpr-art-38": [
    [
      "Art. 38(3) no-instructions independence",
      "shall not receive any instructions regarding the exercise of those tasks",
    ],
  ],
  "gdpr-art-39": [
    [
      "Art. 39(1)(c) DPIA advice duty",
      "to provide advice where requested as regards the data protection impact assessment and monitor its performance pursuant to Article 35",
    ],
  ],
  "gdpr-recital-85": [
    [
      "Recital 85 72-hour expectation",
      "not later than 72 hours after having become aware of it",
    ],
  ],
  "gdpr-recital-86": [
    [
      "Recital 86 data-subject communication",
      "communicate to the data subject a personal data breach, without undue delay",
    ],
  ],
  "gdpr-recital-87": [
    [
      "Recital 87 promptness assessment",
      "whether all appropriate technological protection and organisational measures were implemented",
    ],
  ],
  "gdpr-recital-88": [
    [
      "Recital 88 law-enforcement interests",
      "take into account the legitimate interests of law-enforcement authorities",
    ],
  ],
};

/**
 * Raw (un-normalized) character-length pins for the two rows Item 291 wrongly
 * flagged as truncated. A silent re-truncation, or a re-ingest that reinstates
 * the `gdpr_articles` trailing section-heading artifact, breaks these.
 */
const LENGTH_PINS: Readonly<Record<string, number>> = {
  "gdpr-art-22": 1289,
  "gdpr-art-34": 1649,
};

/** Phrases that must never appear in an EU registry row (jurisdiction bleed). */
const NEGATIVE_PINS: ReadonlyArray<readonly [string, RegExp]> = [
  ["US/CA jurisdiction bleed", /\b(california|CCPA|CPPA|11 CCR|Civil Code section)\b/i],
];

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

describe.skipIf(!CAN_RUN)("GDPR EU registry — corpus pin", () => {
  it("every pinned provision appears verbatim, at full length, in provision_texts", async () => {
    const { execFileSync } = await import("node:child_process");
    const keys = Object.keys(PINS);
    const sql =
      "SELECT key || E'\\x1f' || verbatim_excerpt || E'\\x1e' " +
      "FROM provision_texts WHERE status='approved' AND jurisdiction='EU' " +
      "AND key = ANY(string_to_array($$" + keys.join("|") + "$$, '|'))";
    const out = execFileSync("psql", ["-tAX", "-c", sql], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });

    const raw: Record<string, string> = {};
    for (const rec of out.split("\x1e")) {
      const [k, body] = rec.split("\x1f");
      if (k && body) raw[k.trim()] = body;
    }

    const missingRows = keys.filter((k) => !raw[k]);
    expect(
      missingRows,
      `EU corpus rows absent or not approved:\n  ${missingRows.join("\n  ")}`,
    ).toEqual([]);

    const failures: string[] = [];
    for (const [key, pins] of Object.entries(PINS)) {
      const body = norm(raw[key] ?? "");
      for (const [label, quote] of pins) {
        if (!body.includes(norm(quote))) failures.push(`${key} — ${label}`);
      }
    }
    expect(
      failures,
      `Pins missing from EU corpus (re-ingest the corpus; do NOT edit the pin):\n  ${failures.join("\n  ")}`,
    ).toEqual([]);

    const lengthFailures: string[] = [];
    for (const [key, expected] of Object.entries(LENGTH_PINS)) {
      const actual = (raw[key] ?? "").trim().length;
      if (actual !== expected) {
        lengthFailures.push(`${key} — expected ${expected} chars, found ${actual}`);
      }
    }
    expect(
      lengthFailures,
      `Length pin broken (truncation or artifact re-introduced):\n  ${lengthFailures.join("\n  ")}`,
    ).toEqual([]);

    const negatives: string[] = [];
    for (const key of keys) {
      for (const [label, re] of NEGATIVE_PINS) {
        if (re.test(raw[key] ?? "")) negatives.push(`${key} — ${label}`);
      }
    }
    expect(
      negatives,
      `Non-EU content found in an EU registry row:\n  ${negatives.join("\n  ")}`,
    ).toEqual([]);
  }, 30_000);
});
