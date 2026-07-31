// ITEM 318 — UK GDPR Art. 22 series + Chapter V (Arts. 44–49A) CORPUS PIN
// (permanent drift guard; twin of `cppa-admt-corpus-pin.test.ts`).
//
// PROVENANCE: King's Printer of Acts of Parliament, consolidated UK GDPR
// (Regulation (EU) 2016/679 as retained and amended for the United Kingdom):
//   https://www.legislation.gov.uk/eur/2016/679/article/<N>/data.xml
// Revision valid 2026-06-19; last modified 2026-06-22. Retrieved 2026-07-31.
//
// WHY THIS FILE EXISTS: the UK regime is NOT the EU regime with different
// branding. As currently in force:
//   • Art. 22   — OMITTED/SUBSTITUTED. Ch. 3 Section 4A (Arts. 22A–22D) was
//                 substituted for Art. 22 by the Data (Use and Access) Act
//                 2025 (c. 18), ss. 80(1), 142(1)(2)(h); S.I. 2026/82.
//   • Art. 44   — OMITTED (5.2.2026), DUAA 2025 Sch. 7 para. 2(1). The UK
//                 general principle now lives in Art. 44A.
//   • Art. 45   — OMITTED (5.2.2026), DUAA 2025 Sch. 7 para. 3. UK adequacy
//                 runs through Secretary-of-State regulations (Arts. 45A–45C)
//                 under "the data protection test", NOT Commission decisions.
//   • Art. 48   — OMITTED (31.12.2020), S.I. 2019/419 Sch. 1 para. 41.
// Citing EU Art. 22 / 44 / 45 / 48 for UK-scoped output is a live accuracy
// defect. These pins make that defect fail a test rather than ship.
//
// AUTHORING RULE: operative sentences ONLY, extracted from the fetched source.
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

/** provision_texts key → list of [label, verbatim operative substring]. */
const PINS: Readonly<Record<string, ReadonlyArray<readonly [string, string]>>> = {
  // ---- Chapter III Section 4A: the UK replacement for Art. 22 -------------
  "ukgdpr-art-22a": [
    [
      "Art. 22A(1)(a) meaningful-human-involvement definition",
      "a decision is based solely on automated processing if there is no meaningful human involvement in the taking of the decision",
    ],
    [
      "Art. 22A(1)(b) significant-decision definition",
      "a decision is a significant decision, in relation to a data subject, if",
    ],
    [
      "Art. 22A(2) profiling as a mandatory consideration",
      "a person must consider, among other things, the extent to which the decision is reached by means of profiling",
    ],
  ],
  "ukgdpr-art-22b": [
    [
      "Art. 22B(1) special-category prohibition",
      "A significant decision based entirely or partly on processing described in Article 9(1) (processing of special categories of personal data) may not be taken based solely on automated processing, unless one of the following conditions is met.",
    ],
    [
      "Art. 22B(2) first condition — explicit consent",
      "The first condition is that the decision is based entirely on processing of personal data to which the data subject has given explicit consent.",
    ],
    [
      "Art. 22B(4) Article 6(1)(ea) bar",
      "carried out entirely or partly in reliance on Article 6(1)(ea)",
    ],
  ],
  "ukgdpr-art-22c": [
    [
      "Art. 22C(1) safeguards duty (wrap-up clause)",
      "the controller must ensure that safeguards for the data subject's rights, freedoms and legitimate interests are in place which comply with paragraph 2 and any regulations under Article 22D(3)",
    ],
    [
      "Art. 22C(2)(c) human intervention",
      "enable the data subject to obtain human intervention on the part of the controller in relation to such decisions",
    ],
    [
      "Art. 22C(2)(d) contest",
      "enable the data subject to contest such decisions",
    ],
  ],
  "ukgdpr-art-22d": [
    [
      "Art. 22D(4) regulations may not amend Art. 22C",
      "Regulations under paragraph 3 may not amend Article 22C.",
    ],
  ],

  // ---- Chapter V: the UK international-transfers regime -------------------
  "ukgdpr-art-44a": [
    [
      "Art. 44A(2)(a) approval by regulations (not a Commission decision)",
      "is approved by regulations under Article 45A that are in force at the time of the transfer",
    ],
    [
      "Art. 44A(2)(b) appropriate safeguards route",
      "is made subject to appropriate safeguards (see Article 46)",
    ],
    [
      "Art. 44A(3) Art. 49A restriction override",
      "A transfer may not be made in reliance on paragraph 2(b) or (c) if, or to the extent that, it would breach a restriction in regulations under Article 49A.",
    ],
  ],
  "ukgdpr-art-45a": [
    [
      "Art. 45A(1) Secretary of State approves transfers by regulations",
      "the Secretary of State may by regulations approve transfers of personal data to",
    ],
    [
      "Art. 45A(2) data-protection-test precondition",
      "if the Secretary of State considers that the data protection test is met in relation to the transfers (see Article 45B)",
    ],
    [
      "Art. 45A(5) negative resolution procedure",
      "Regulations under this Article are subject to the negative resolution procedure.",
    ],
  ],
  "ukgdpr-art-45b": [
    [
      "Art. 45B(1) 'not materially lower' standard (NOT EU 'essentially equivalent')",
      "is not materially lower than the standard of the protection provided for data subjects by or under",
    ],
    [
      "Art. 45B(2)(a) rule of law and human rights",
      "respect for the rule of law and for human rights in the country or by the organisation",
    ],
    [
      "Art. 45B(2)(f) constitution, traditions and culture",
      "the constitution, traditions and culture of the country or organisation",
    ],
  ],
  "ukgdpr-art-45c": [
    [
      "Art. 45C(1) ongoing monitoring duty",
      "The Secretary of State must, on an ongoing basis, monitor developments in third countries and international organisations",
    ],
    [
      "Art. 45C(2) amend-or-revoke duty",
      "the Secretary of State must, to the extent necessary, amend or revoke the regulations",
    ],
  ],
  "ukgdpr-art-46": [
    [
      "Art. 46(1A)(a)(ii) controller's own reasonable-and-proportionate assessment",
      "the controller or processor, acting reasonably and proportionately, considers that the data protection test is met in relation to the transfer or that type of transfer",
    ],
    [
      "Art. 46(2)(c) Secretary-of-State standard clauses (Art. 47A(1))",
      "standard data protection clauses specified in regulations made by the Secretary of State under Article 47A(1) and for the time being in force",
    ],
    [
      "Art. 46(2)(d) Commissioner-issued clauses under s.119A DPA 2018",
      "specified in a document issued (and not withdrawn) by the Commissioner for the purposes of this Article under section 119A of the 2018 Act",
    ],
  ],
  "ukgdpr-art-47a": [
    [
      "Art. 47A(1) Secretary of State specifies standard clauses",
      "The Secretary of State may by regulations specify standard data protection clauses",
    ],
    [
      "Art. 47A(7) limits on amending Art. 46",
      "Regulations under paragraph 4 which amend Article 46 may do so only in the following ways",
    ],
  ],
  "ukgdpr-art-49": [
    [
      "Art. 49(1) derogations open on the Art. 45A/46 absence (not Art. 45)",
      "In the absence of approval by regulations under Article 45A and of compliance with Article 46 (appropriate safeguards)",
    ],
    [
      "Art. 49(6) documentation into the Article 30 records",
      "shall document the assessment as well as the suitable safeguards referred to in the second subparagraph of paragraph 1 of this Article in the records referred to in Article 30",
    ],
  ],
  "ukgdpr-art-49a": [
    [
      "Art. 49A(1) public-interest restriction power",
      "The Secretary of State may by regulations restrict the transfer of a category of personal data to a third country or international organisation",
    ],
    [
      "Art. 49A(3) urgency statement",
      "an urgency statement is a reasoned statement that the Secretary of State considers it desirable for the regulations to come into force without delay",
    ],
  ],
};

/**
 * Omission rows: provisions with NO UK text in force. The row must say so and
 * must NOT carry operative EU language that an engine could quote.
 */
const OMITTED: ReadonlyArray<readonly [string, string, string]> = [
  [
    "ukgdpr-art-22",
    "Data (Use and Access) Act 2025",
    "Ch. 3 Section 4A substituted for Art. 22",
  ],
  ["ukgdpr-art-44", "Data (Use and Access) Act 2025", "Art. 44 omitted (5.2.2026)"],
  ["ukgdpr-art-45", "Data (Use and Access) Act 2025", "Art. 45 omitted (5.2.2026)"],
  [
    "ukgdpr-art-48",
    "(EU Exit) Regulations 2019",
    "Art. 48 omitted (31.12.2020)",
  ],
];

/**
 * Negative pins — EU-regime vocabulary that must never appear in a UK row.
 * The UK mechanism runs on Secretary-of-State regulations and the Commissioner,
 * not on Commission adequacy decisions or the EDPB.
 */
const NEGATIVE_PINS: ReadonlyArray<readonly [string, RegExp]> = [
  ["EU Commission adequacy decision language", /\bthe Commission has decided\b/i],
  ["EDPB attribution", /European Data Protection Board/i],
  ["EU 'Member State' framing", /\bMember State\b/],
  ["EU 'Union law' framing", /\bUnion law\b/],
];

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

async function loadCorpus(keys: string[]): Promise<Record<string, string>> {
  const { execFileSync } = await import("node:child_process");
  const sql =
    "SELECT key || E'\\x1f' || verbatim_excerpt || E'\\x1e' " +
    "FROM provision_texts WHERE status='approved' AND jurisdiction='UK' AND key = ANY(string_to_array($$" +
    keys.join("|") +
    "$$, '|'))";
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

async function loadArticles(
  jurisdiction: "uk" | "eu",
  numbers: string[],
): Promise<Record<string, string>> {
  const { execFileSync } = await import("node:child_process");
  const sql =
    "SELECT article_number || E'\\x1f' || body_text || E'\\x1e' " +
    `FROM gdpr_articles WHERE jurisdiction='${jurisdiction}' AND article_number = ANY(string_to_array($$` +
    numbers.join("|") +
    "$$, '|'))";
  const out = execFileSync("psql", ["-tAX", "-c", sql], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const rows: Record<string, string> = {};
  for (const rec of out.split("\x1e")) {
    const [k, body] = rec.split("\x1f");
    if (k && body) rows[k.trim()] = norm(body);
  }
  return rows;
}

describe.skipIf(!CAN_RUN)("UK GDPR Art. 22 series + Chapter V — corpus pin", () => {
  it("every pinned operative sentence appears verbatim in provision_texts", async () => {
    const keys = Object.keys(PINS);
    const corpus = await loadCorpus(keys);

    const missingRows = keys.filter((k) => !corpus[k]);
    expect(
      missingRows,
      `UK corpus rows absent, not approved, or not tagged jurisdiction='UK':\n  ${missingRows.join("\n  ")}`,
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
      `Pins missing from corpus (re-ingest from legislation.gov.uk; do NOT edit the pin):\n  ${failures.join("\n  ")}`,
    ).toEqual([]);
  }, 30_000);

  it("omitted/substituted provisions carry the amendment provenance and no operative text", async () => {
    const keys = OMITTED.map(([k]) => k);
    const corpus = await loadCorpus(keys);

    const failures: string[] = [];
    for (const [key, instrument, marker] of OMITTED) {
      const body = corpus[key];
      if (!body) {
        failures.push(`${key} — row missing`);
        continue;
      }
      if (!body.includes(norm(instrument)))
        failures.push(`${key} — amending instrument "${instrument}" not recorded`);
      if (!body.includes(norm(marker)))
        failures.push(`${key} — omission marker "${marker}" not recorded`);
    }
    expect(failures, failures.join("\n  ")).toEqual([]);

    // The omission rows must not smuggle in EU operative language.
    const smuggled: string[] = [];
    for (const [key] of OMITTED) {
      const body = corpus[key] ?? "";
      if (/shall have the right not to be subject to a decision/i.test(body))
        smuggled.push(`${key} — EU Art. 22(1) operative clause present`);
      if (/adequate level of protection/i.test(body))
        smuggled.push(`${key} — EU adequacy clause present`);
    }
    expect(smuggled, smuggled.join("\n  ")).toEqual([]);
  }, 30_000);

  it("NEGATIVE: no UK row is byte-identical to its EU counterpart", async () => {
    const numbers = ["22", "44", "45", "46", "47", "48", "49"];
    const [uk, eu] = await Promise.all([
      loadArticles("uk", numbers),
      loadArticles("eu", numbers),
    ]);

    const present = numbers.filter((n) => uk[n] && eu[n]);
    expect(
      present.length,
      "expected overlapping UK/EU rows to compare",
    ).toBeGreaterThan(0);

    const identical = present.filter((n) => uk[n] === eu[n]);
    expect(
      identical,
      `UK row byte-identical to the EU row for Article(s) ${identical.join(", ")} — ` +
        "this means the EU text was ingested under a 'uk' tag, not the UK text. " +
        "Post-Brexit UK GDPR diverges from EU GDPR by design; identity is a defect, not a coincidence.",
    ).toEqual([]);
  }, 30_000);

  it("UK Chapter V rows carry no EU-regime vocabulary", async () => {
    const keys = [
      "ukgdpr-art-44a",
      "ukgdpr-art-45a",
      "ukgdpr-art-45b",
      "ukgdpr-art-45c",
      "ukgdpr-art-46",
      "ukgdpr-art-47a",
      "ukgdpr-art-49a",
    ];
    const corpus = await loadCorpus(keys);

    const hits: string[] = [];
    for (const key of keys) {
      const body = corpus[key] ?? "";
      for (const [label, re] of NEGATIVE_PINS) {
        if (re.test(body)) hits.push(`${key} — ${label}`);
      }
    }
    expect(
      hits,
      `EU-regime vocabulary found in a UK corpus row:\n  ${hits.join("\n  ")}`,
    ).toEqual([]);
  }, 30_000);

  it("every ingested UK row is jurisdiction-tagged", async () => {
    const { execFileSync } = await import("node:child_process");
    const out = execFileSync(
      "psql",
      [
        "-tAX",
        "-c",
        "SELECT count(*) FROM provision_texts WHERE key LIKE 'ukgdpr-art-%' AND (jurisdiction IS DISTINCT FROM 'UK' OR status <> 'approved')",
      ],
      { encoding: "utf8" },
    ).trim();
    expect(
      out,
      "every ukgdpr-art-* row must be jurisdiction='UK' and status='approved'",
    ).toBe("0");

    const ukArticles = execFileSync(
      "psql",
      [
        "-tAX",
        "-c",
        "SELECT count(*) FROM gdpr_articles WHERE jurisdiction='uk' AND article_number IN ('22','22A','22B','22C','22D','44','44A','45','45A','45B','45C','46','47','47A','48','49','49A')",
      ],
      { encoding: "utf8" },
    ).trim();
    expect(Number(ukArticles)).toBe(17);
  }, 30_000);
});
