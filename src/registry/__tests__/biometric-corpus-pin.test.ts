// ITEM 314 — BIOMETRIC STATUTE CORPUS PIN (permanent drift guard).
//
// Covers the three statutes ingested verbatim in Item 314:
//   il-bipa-740-14-10   — BIPA definitions INCLUDING the exclusions list
//                         (the most-litigated boundary in the product's corpus)
//   il-bipa-740-14-15-* — retention schedule, written release, no-profit,
//                         disclosure limits, reasonable standard of care
//   tx-cubi-503-001-c   — the one-year destruction rule
//   wa-rcw-19-375-010   — the "enroll" definition
//
// PROVENANCE (official publishers only):
//   IL  https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004&ChapterID=57
//   TX  https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm
//   WA  https://app.leg.wa.gov/rcw/default.aspx?cite=19.375&full=true
//   (all retrieved and extracted 2026-07-31)
//
// AUTHORING RULE: statute text only. NO exposure/litigation characterizations
// live in the registry rows — BIPA's private right of action makes that the
// product's highest-risk framing surface and it is reserved to the generator.
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

/** key → list of [label, verbatim substring that must appear]. */
const PINS: Readonly<Record<string, ReadonlyArray<readonly [string, string]>>> = {
  "il-bipa-740-14-10": [
    [
      "§ 10 biometric identifier — inclusion list",
      '"Biometric identifier" means a retina or iris scan, fingerprint, voiceprint, or scan of hand or face geometry.',
    ],
    [
      "§ 10 exclusions — writing samples / photographs / demographic data",
      "Biometric identifiers do not include writing samples, written signatures, photographs, human biological samples used for valid scientific testing or screening, demographic data, tattoo descriptions, or physical descriptions such as height, weight, hair color, or eye color.",
    ],
    [
      "§ 10 exclusions — donated organs / transplant blood or serum",
      "Biometric identifiers do not include donated organs, tissues, or parts as defined in the Illinois Anatomical Gift Act or blood or serum stored on behalf of recipients or potential recipients of living or cadaveric transplants and obtained or stored by a federally designated organ procurement agency.",
    ],
    [
      "§ 10 exclusions — Genetic Information Privacy Act materials",
      "Biometric identifiers do not include biological materials regulated under the Genetic Information Privacy Act.",
    ],
    [
      "§ 10 exclusions — HIPAA treatment/payment/operations",
      "Biometric identifiers do not include information captured from a patient in a health care setting or information collected, used, or stored for health care treatment, payment, or operations under the federal Health Insurance Portability and Accountability Act of 1996.",
    ],
    [
      "§ 10 exclusions — diagnostic imaging",
      "Biometric identifiers do not include an X-ray, roentgen process, computed tomography, MRI, PET scan, mammography, or other image or film of the human anatomy used to diagnose, prognose, or treat an illness or other medical condition or to further validate scientific testing or screening.",
    ],
    [
      "§ 10 biometric information — derivative definition",
      '"Biometric information" means any information, regardless of how it is captured, converted, stored, or shared, based on an individual\'s biometric identifier used to identify an individual. Biometric information does not include information derived from items or procedures excluded under the definition of biometric identifiers.',
    ],
    [
      "§ 10 written release — employment-condition limb",
      '"Written release" means informed written consent, electronic signature, or, in the context of employment, a release executed by an employee as a condition of employment.',
    ],
    [
      "§ 10 private entity — government exclusion",
      "A private entity does not include a State or local government agency.",
    ],
  ],
  "il-bipa-740-14-15-a": [
    [
      "§ 15(a) 3-year outer limit",
      "when the initial purpose for collecting or obtaining such identifiers or information has been satisfied or within 3 years of the individual's last interaction with the private entity, whichever occurs first",
    ],
  ],
  "il-bipa-740-14-15-b": [
    [
      "§ 15(b)(3) written release precondition",
      "receives a written release executed by the subject of the biometric identifier or biometric information or the subject's legally authorized representative.",
    ],
  ],
  "il-bipa-740-14-15-c": [
    [
      "§ 15(c) profit prohibition",
      "No private entity in possession of a biometric identifier or biometric information may sell, lease, trade, or otherwise profit from a person's or a customer's biometric identifier or biometric information.",
    ],
  ],
  "il-bipa-740-14-15-d": [
    [
      "§ 15(d)(1) consent limb",
      "the subject of the biometric identifier or biometric information or the subject's legally authorized representative consents to the disclosure or redisclosure",
    ],
  ],
  "il-bipa-740-14-15-e": [
    [
      "§ 15(e)(1) reasonable standard of care within the industry",
      "using the reasonable standard of care within the private entity's industry",
    ],
  ],
  "tx-cubi-503-001-a": [
    [
      "§ 503.001(a)(2) biometric identifier definition",
      '"Biometric identifier" means a retina or iris scan, fingerprint, voiceprint, or record of hand or face geometry.',
    ],
  ],
  "tx-cubi-503-001-b": [
    [
      "§ 503.001(b) inform-then-consent",
      "A person may not capture a biometric identifier of an individual for a commercial purpose unless the person: (1) informs the individual before capturing the biometric identifier; and (2) receives the individual's consent to capture the biometric identifier.",
    ],
  ],
  "tx-cubi-503-001-c": [
    [
      "§ 503.001(c)(3) one-year destruction rule",
      "shall destroy the biometric identifier within a reasonable time, but not later than the first anniversary of the date the purpose for collecting the identifier expires, except as provided by Subsection (c-1).",
    ],
    [
      "§ 503.001(c-1) longer-retention document exception",
      "not later than the first anniversary of the date the instrument or document is no longer required to be maintained by law.",
    ],
    [
      "§ 503.001(c-2) employer security-purpose presumption",
      "the purpose for collecting the identifier under Subsection (c)(3) is presumed to expire on termination of the employment relationship.",
    ],
  ],
  "tx-cubi-503-001-e": [
    [
      "§ 503.001(e)(1) financial-institution voiceprint exception",
      "voiceprint data retained by a financial institution or an affiliate of a financial institution, as those terms are defined by 15 U.S.C. Section 6809",
    ],
  ],
  "wa-rcw-19-375-010": [
    [
      "RCW 19.375.010(5) enroll definition",
      '"Enroll" means to capture a biometric identifier of an individual, convert it into a reference template that cannot be reconstructed into the original output image, and store it in a database that matches the biometric identifier to a specific individual.',
    ],
    [
      "RCW 19.375.010(1) biometric identifier exclusion — photographs/recordings",
      '"Biometric identifier" does not include a physical or digital photograph, video or audio recording or data generated therefrom, or information collected, used, or stored for health care treatment, payment, or operations under the federal health insurance portability and accountability act of 1996.',
    ],
    [
      "RCW 19.375.010(4) commercial purpose — security/law-enforcement carve-out",
      '"Commercial purpose" does not include a security or law enforcement purpose.',
    ],
  ],
  "wa-rcw-19-375-020": [
    [
      "RCW 19.375.020(1) enrollment trigger",
      "A person may not enroll a biometric identifier in a database for a commercial purpose, without first providing notice, obtaining consent, or providing a mechanism to prevent the subsequent use of a biometric identifier for a commercial purpose.",
    ],
  ],
  "wa-rcw-19-375-030": [
    [
      "RCW 19.375.030(2) AG-only enforcement",
      "This chapter may be enforced solely by the attorney general under the consumer protection act, chapter 19.86 RCW.",
    ],
  ],
};

/**
 * Negative pins: the registry carries STATUTE TEXT ONLY. No litigation- or
 * exposure-framing may leak into an ingested row (reserved-framing rule).
 */
const NEGATIVE_PINS: ReadonlyArray<readonly [string, RegExp]> = [
  ["exposure characterization", /\b(exposure|class action|litigation risk|damages exposure)\b/i],
  ["editorial hedging", /\b(we recommend|likely to be found|best practice)\b/i],
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

async function loadJurisdictions(): Promise<Record<string, string>> {
  const { execFileSync } = await import("node:child_process");
  const out = execFileSync("psql", [
    "-tAX",
    "-c",
    "SELECT key || '|' || coalesce(jurisdiction,'') || '|' || status FROM provision_texts " +
      "WHERE key LIKE 'il-bipa%' OR key LIKE 'tx-cubi%' OR key LIKE 'wa-rcw%'",
  ], { encoding: "utf8" });
  const map: Record<string, string> = {};
  for (const line of out.split("\n")) {
    const [k, j, s] = line.split("|");
    if (k?.trim()) map[k.trim()] = `${j}|${s}`;
  }
  return map;
}

describe.skipIf(!CAN_RUN)("biometric statutes (IL BIPA / TX CUBI / WA 19.375) — corpus pin", () => {
  it("every pinned statutory sentence appears verbatim in provision_texts", async () => {
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
  }, 30_000);

  it("no ingested row carries exposure or editorial framing (statute text only)", async () => {
    const corpus = await loadCorpus(Object.keys(PINS));
    const offenders: string[] = [];
    for (const [key, body] of Object.entries(corpus)) {
      for (const [label, re] of NEGATIVE_PINS) {
        if (re.test(body)) offenders.push(`${key} — ${label}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  }, 30_000);

  it("carries a per-statute jurisdiction tag on every row", async () => {
    const map = await loadJurisdictions();
    const bad: string[] = [];
    for (const [key, val] of Object.entries(map)) {
      const [j] = val.split("|");
      const expected = key.startsWith("il-") ? "US-IL" : key.startsWith("tx-") ? "US-TX" : "US-WA";
      if (j !== expected) bad.push(`${key} → "${j}" (expected ${expected})`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  }, 30_000);

  // ITEM 323 — flipped guard. RCW 19.373 was ingested verbatim from
  // app.leg.wa.gov, hash-compared across two independent pulls, and promoted
  // to 'approved'. The CLOSED-SET rule now renders it.
  it("RCW 19.373 (My Health My Data) is IN the active corpus and approved", async () => {
    const map = await loadJurisdictions();
    const keys = Object.keys(map).filter((k) => k.startsWith("wa-rcw-19-373"));
    expect(keys.length, "MHMDA corpus rows missing").toBeGreaterThanOrEqual(5);
    for (const k of keys) {
      const [j, status] = map[k].split("|");
      expect(j, `${k} jurisdiction`).toBe("US-WA");
      expect(status, `${k} status`).toBe("approved");
    }
  }, 30_000);
});

// ITEM 323 — live byte-exact pin for the MHMDA duty rows. Same discipline as
// the Item 314/317 pins: every verbatim_quote in the registry must be an exact
// substring of the approved corpus row it names. Re-ingest the corpus rather
// than editing a quote to make this pass.
describe("RCW 19.373 (MHMDA) — live corpus pin", () => {
  it("every MHMDA duty row is verbatim against its approved corpus row", async () => {
    const { BIOMETRIC_DUTY_ROWS } = await import("../../../supabase/functions/check-biometric-compliance/_local/registry/biometric-verified-authorities"
    );
    const rows = BIOMETRIC_DUTY_ROWS.filter((r) => r.statute_key === "us_wa_19373");
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const corpus = await loadCorpus([...new Set(rows.map((r) => r.corpus_key))]);
    const bad: string[] = [];
    for (const r of rows) {
      const body = corpus[r.corpus_key];
      if (!body) { bad.push(`${r.id} → corpus row ${r.corpus_key} missing or not approved`); continue; }
      if (!body.includes(norm(r.verbatim_quote))) bad.push(`${r.id} → quote not verbatim in ${r.corpus_key}`);
    }
    expect(bad, bad.join("\n")).toEqual([]);
  }, 30_000);
});
