// ITEM 330 — DPIA UK GDPR Art. 35 / 36 REGISTRY PIN + REASONING-INVARIANCE.
//
// Fix 5 of 5 in the UK/EU accuracy series. Unlike Items 326-328, this one is
// a CITATION-ACCURACY fix only: UK Art. 35 is word-identical to EU Art. 35
// except that "the Commissioner" replaces "the supervisory authority", and
// Art. 35(3)(a) does not cross-reference Article 22 by number in either
// regime — so the UK Art. 22A-22D divergence pinned at Item 326 does NOT
// reach the DPIA trigger. A DPIA is required on the same facts under both.
//
// This file therefore asserts two things:
//   1. Every `uk_*` row added to `_shared/registry/dpia-verified-authorities.ts`
//      is a byte-exact substring of its `provision_texts` row (psql; skipped
//      when the sandbox has no direct Postgres access).
//   2. The builder's OUTPUT is identical between EU-scoped and UK-scoped
//      intake apart from citation/verbatim fields — no trigger, threshold,
//      likelihood, band, verdict or determination moves.

import { describe, it, expect } from "vitest";
import { DPIA_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/dpia-verified-authorities.ts";
import {
  buildDpiaDeliverables,
  readDpiaRegime,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";

/** Typography-only normalisation — curly quotes/dashes, NBSP, whitespace. */
function norm(s: string): string {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** registry proposition_key → provision_texts key holding its source text. */
const ROW_FOR: Readonly<Record<string, string>> = {
  uk_dpia_when_required: "ukgdpr-art-35",
  uk_dpia_similar_operations: "ukgdpr-art-35",
  uk_dpia_dpo_advice: "ukgdpr-art-35",
  uk_consultation_of_data_subjects_35_9: "ukgdpr-art-35",
  uk_dpia_mandatory_intro: "ukgdpr-art-35",
  uk_dpia_mandatory_evaluation: "ukgdpr-art-35",
  uk_dpia_mandatory_special_categories: "ukgdpr-art-35",
  uk_dpia_mandatory_public_monitoring: "ukgdpr-art-35",
  uk_dpia_min_content_intro: "ukgdpr-art-35",
  uk_dpia_content_description: "ukgdpr-art-35",
  uk_dpia_content_necessity: "ukgdpr-art-35",
  uk_dpia_content_risks: "ukgdpr-art-35",
  uk_dpia_content_measures: "ukgdpr-art-35",
  uk_dpia_review_on_change: "ukgdpr-art-35",
  uk_prior_consultation_art_36: "ukgdpr-art-36",
  uk_prior_consultation_materials_art_36_3: "ukgdpr-art-36",
};

const HAS_DB = !!process.env.PGHOST && !!process.env.PGDATABASE;
const d = HAS_DB ? describe : describe.skip;

async function loadCorpus(): Promise<Record<string, string>> {
  const { execFileSync } = await import("node:child_process");
  const keys = Array.from(new Set(Object.values(ROW_FOR)));
  const sql =
    "SELECT key || E'\\x1f' || verbatim_excerpt || E'\\x1e' " +
    "FROM provision_texts WHERE status='approved' AND key = ANY(string_to_array($$" +
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

d("ITEM 330 — DPIA UK Art. 35/36 registry rows are pinned to the corpus", () => {
  let corpus: Record<string, string> = {};

  it("loads every referenced provision_texts row", async () => {
    corpus = await loadCorpus();
    for (const key of new Set(Object.values(ROW_FOR))) {
      expect(corpus[key], `missing corpus row ${key}`).toBeTruthy();
    }
  });

  for (const [propKey, rowKey] of Object.entries(ROW_FOR)) {
    it(`${propKey} is verbatim in ${rowKey}`, () => {
      const row = DPIA_VERIFIED_AUTHORITIES[propKey];
      expect(row, `registry row ${propKey} missing`).toBeTruthy();
      expect(corpus[rowKey]).toContain(norm(row.verbatim_quote));
    });
  }
});

describe("ITEM 330 — UK rows exist and are labelled as UK authority", () => {
  for (const propKey of Object.keys(ROW_FOR)) {
    it(`${propKey} cites UK GDPR`, () => {
      const row = DPIA_VERIFIED_AUTHORITIES[propKey];
      expect(row).toBeTruthy();
      expect(row.citation.startsWith("UK GDPR Art.")).toBe(true);
      expect(row.subsection.startsWith("UK GDPR Art.")).toBe(true);
    });
  }

  it("UK Art. 36 rows say 'the Commissioner', never 'supervisory authority'", () => {
    for (const k of ["uk_prior_consultation_art_36", "uk_prior_consultation_materials_art_36_3"]) {
      const q = DPIA_VERIFIED_AUTHORITIES[k].verbatim_quote;
      expect(q).toContain("the Commissioner");
      expect(q).not.toContain("supervisory authority");
    }
  });

  it("UK Art. 35(3)(a) does not cross-reference Article 22", () => {
    const q = DPIA_VERIFIED_AUTHORITIES.uk_dpia_mandatory_evaluation.verbatim_quote;
    expect(q).not.toMatch(/Article\s*22/);
    expect(DPIA_VERIFIED_AUTHORITIES.dpia_mandatory_evaluation.verbatim_quote)
      .not.toMatch(/Article\s*22/);
  });

  it("the EU and UK Art. 35(3)(a) triggers are textually identical", () => {
    expect(norm(DPIA_VERIFIED_AUTHORITIES.uk_dpia_mandatory_evaluation.verbatim_quote))
      .toBe(norm(DPIA_VERIFIED_AUTHORITIES.dpia_mandatory_evaluation.verbatim_quote));
  });
});

describe("ITEM 330 — regime selector", () => {
  it("UK-only intake selects UK", () => {
    expect(readDpiaRegime({ jurisdictions: ["United Kingdom (UK GDPR)"] })).toBe("UK");
  });
  it("EU-only intake selects EU", () => {
    expect(readDpiaRegime({ jurisdictions: ["EU (GDPR)"] })).toBe("EU");
  });
  it("mixed EU+UK intake stays on the EU citation rail", () => {
    expect(readDpiaRegime({ jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"] })).toBe("EU");
  });
  it("no jurisdiction stated defaults to EU", () => {
    expect(readDpiaRegime({})).toBe("EU");
  });
});

describe("ITEM 330 — the DPIA determination is unchanged; only citations differ", () => {
  const base = {
    processing_activity_name: "Automated candidate screening",
    purpose: "Rank applicants for interview using an automated scoring model",
    secondary_uses: "Aggregate reporting on hiring funnel performance",
    necessity_proportionality:
      "Screening is necessary to process application volume; it is intrusive and affects the data subjects' prospects, but delivers a benefit no manual review can achieve at this volume.",
    data_categories: ["Health or medical data", "Children's data"],
    safeguards: ["Encryption at rest", "Access controls"],
    processors: ["Applicant tracking vendor"],
    transfers: [{ destination: "United States" }],
    reasons: ["Evaluation or scoring"],
    volume_frequency: "Approximately 40,000 applications per year",
    data_subjects: "Job applicants",
  };
  const eu = buildDpiaDeliverables({ ...base, jurisdictions: ["EU (GDPR)"] });
  const uk = buildDpiaDeliverables({ ...base, jurisdictions: ["United Kingdom (UK GDPR)"] });

  /** Strip every citation/verbatim surface; what remains is the reasoning. */
  const strip = (v: unknown): unknown =>
    JSON.parse(
      JSON.stringify(v, (k, val) =>
        /citation|verbatim|authority|procedural_note|^why$/.test(k) ? undefined : val,
      ),
    );

  it("produces the identical reasoning payload under both regimes", () => {
    expect(strip(uk)).toEqual(strip(eu));
  });

  it("names the Commissioner on the UK rail in the consultation reasoning", () => {
    expect(uk.art36_consultation.why).toContain("the Commissioner");
    expect(uk.art36_consultation.why).not.toContain("supervisory authority");
    expect(eu.art36_consultation.why).toContain("supervisory authority");
  });

  it("reaches the same Art. 36 consultation determination", () => {
    expect(uk.art36_consultation.determination).toBe(eu.art36_consultation.determination);
  });

  it("produces the same risk register bands", () => {
    expect(uk.risk_register.map((r) => [r.risk_id, r.residual_band]))
      .toEqual(eu.risk_register.map((r) => [r.risk_id, r.residual_band]));
  });

  it("cites UK GDPR on the UK rail and plain GDPR on the EU rail", () => {
    expect(uk.art36_consultation.citation).toBe("UK GDPR Art. 36(1)");
    expect(eu.art36_consultation.citation).toBe("GDPR Art. 36(1)");
    expect(uk.art36_consultation.authority_verbatim).toContain("the Commissioner");
    expect(eu.art36_consultation.authority_verbatim).toContain("supervisory authority");
    for (const n of uk.necessity_findings) expect(n.citation).toBe("UK GDPR Art. 35(7)(b)");
    for (const n of eu.necessity_findings) expect(n.citation).toBe("GDPR Art. 35(7)(b)");
  });
});
