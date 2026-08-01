// ITEM 327 — GOVERNANCE UK GDPR CHAPTER V REGISTRY PIN.
//
// Twin of `lia-uk-art22-corpus-pin.test.ts`, pointed at the governance
// registry: every UK Chapter V row added at Item 327 must remain a
// byte-exact substring of its `provision_texts` row. If the corpus is
// re-ingested and the text moves, this fails instead of the report
// shipping a quote that no longer exists.
//
// WHY IT MATTERS: UK Art. 44 is OMITTED (DUAA 2025, s. 142(1), Sch. 7
// para. 2(1); S.I. 2026/82) — the UK general principle is Art. 44A. UK
// adequacy is made by the Secretary of State under Art. 45A against the
// Art. 45B "not materially lower" test, not the EU essential-equivalence
// standard, and UK Art. 46 clause sets come from the Secretary of State
// (Art. 47A(1)) or the Commissioner (s. 119A DPA 2018) — the IDTA and the
// Addendum — not Commission SCCs. Citing the EU chapter for a UK-scoped
// transfer leg is an accuracy defect.
//
// Corpus assertions are skipped when the sandbox has no direct Postgres
// access (PGHOST unset); the branching assertions always run.

import { describe, it, expect } from "vitest";
import { GOVERNANCE_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/governance-verified-authorities.ts";
import {
  buildTransferAnalysis,
  readTransferFacts,
} from "../../../supabase/functions/_shared/ltp/governance-deliverables/build.ts";
import {
  EU_JURISDICTION,
  UK_JURISDICTION,
} from "../../../supabase/functions/_shared/ltp/governance-deliverables/elements.ts";

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
  uk_art_44_not_in_force: "ukgdpr-art-44",
  uk_transfers_general_principle: "ukgdpr-art-44a",
  uk_transfers_adequacy_route: "ukgdpr-art-44a",
  uk_transfers_safeguards_route: "ukgdpr-art-44a",
  uk_transfers_art_49a_restriction: "ukgdpr-art-44a",
  uk_adequacy_regulations_power: "ukgdpr-art-45a",
  uk_adequacy_data_protection_test: "ukgdpr-art-45b",
  uk_adequacy_test_factors: "ukgdpr-art-45b",
  uk_transfers_appropriate_safeguards: "ukgdpr-art-46",
  uk_transfers_exporter_own_assessment: "ukgdpr-art-46",
  uk_transfers_sos_clauses: "ukgdpr-art-46",
  uk_transfers_commissioner_clauses: "ukgdpr-art-46",
  uk_transfers_bcr_mechanism: "ukgdpr-art-46",
  uk_transfers_data_protection_test: "ukgdpr-art-46",
  uk_transfers_reasonable_and_proportionate: "ukgdpr-art-46",
  uk_bcr_commissioner_approval: "ukgdpr-art-47",
  uk_standard_clauses_secretary_of_state: "ukgdpr-art-47a",
};

const HAS_DB = !!process.env.PGHOST && !!process.env.PGDATABASE;
const d = HAS_DB ? describe : describe.skip;

/** Same psql transport as the LIA pin test — no pg dependency. */
async function loadCorpus(): Promise<Record<string, string>> {
  const { execFileSync } = await import("node:child_process");
  const keys = Array.from(new Set(Object.values(ROW_FOR)));
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

d("ITEM 327 — governance UK Chapter V rows are pinned to the corpus", () => {
  let corpus: Record<string, string> = {};

  it("loads every referenced provision_texts row", async () => {
    corpus = await loadCorpus();
    for (const key of new Set(Object.values(ROW_FOR))) {
      expect(corpus[key], `missing corpus row ${key}`).toBeTruthy();
    }
  });

  for (const [propKey, rowKey] of Object.entries(ROW_FOR)) {
    it(`${propKey} is verbatim in ${rowKey}`, () => {
      const row = GOVERNANCE_VERIFIED_AUTHORITIES[propKey];
      expect(row, `registry row ${propKey} missing`).toBeTruthy();
      expect(corpus[rowKey]).toContain(norm(row.verbatim_quote));
    });
  }

  it("every UK row carries a UK citation and the UK governing anchor", () => {
    for (const propKey of Object.keys(ROW_FOR)) {
      const row = GOVERNANCE_VERIFIED_AUTHORITIES[propKey];
      expect(row.citation).toMatch(/^UK GDPR/);
      expect(row.governing_anchor).toContain("UK GDPR");
      expect(row.primary_source_url).toContain("legislation.gov.uk");
    }
  });
});

describe("ITEM 327 — transfer analysis branches to the correct chapter", () => {
  const ukIntake = {
    jurisdictions: [UK_JURISDICTION],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "UK IDTA",
  };
  const euIntake = {
    jurisdictions: [EU_JURISDICTION],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
  };

  it("UK-only: cites Art. 44A, never Art. 44 as the operative principle", () => {
    const out = buildTransferAnalysis(ukIntake);
    expect(out.regime).toBe("uk");
    expect(out.citation).toContain("44A");
    expect(out.citations_used.some((c) => c.includes("44A"))).toBe(true);
    // The only permitted Art. 44 reference is the omission row.
    expect(out.application).toContain("There is no UK GDPR Article 44 in force");
    expect(out.application).not.toMatch(
      /standard data protection clauses adopted by the Commission/,
    );
  });

  it("UK-only safeguards leg: UK clause sets and the Art. 46(6) benchmark", () => {
    const out = buildTransferAnalysis(ukIntake);
    expect(out.benchmark_citation).toContain("46(6)");
    expect(out.application).toContain("Article 47A(1)");
    expect(out.application).toContain("section 119A of the 2018 Act");
  });

  it("UK adequacy leg: Art. 45A power and the Art. 45B benchmark", () => {
    const out = buildTransferAnalysis({
      ...ukIntake,
      transfer_mechanism: "UK adequacy regulations",
    });
    expect(out.benchmark_citation).toContain("45B");
    expect(out.benchmark_verbatim).toContain("not materially lower");
    expect(out.application).toContain("Secretary of State");
    expect(out.application).not.toContain("essential equivalence");
  });

  it("EU-only: cites the EU chapter and no UK material bleeds in", () => {
    const out = buildTransferAnalysis(euIntake);
    expect(out.regime).toBe("eu");
    expect(out.citation).toBe("GDPR Art. 44");
    expect(out.application).not.toMatch(/44A|45A|45B|47A|IDTA|Commissioner/);
  });

  it("dual: both chapters are stated without merging", () => {
    const out = buildTransferAnalysis({
      jurisdictions: [EU_JURISDICTION, UK_JURISDICTION],
      transfer_status: "Yes, US-based tools",
      transfer_mechanism: "UK Addendum to EU SCCs",
    });
    expect(out.regime).toBe("dual");
    expect(out.application).toContain("Article 44A(1)");
    expect(out.citations_used).toContain("GDPR Art. 44");
  });

  it("flags a mechanism recorded under a chapter that is not in scope", () => {
    const out = buildTransferAnalysis({
      jurisdictions: [UK_JURISDICTION],
      transfer_status: "Yes, US-based tools",
      transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
    });
    expect(out.mechanism_regime).toBe("eu");
    expect(out.mechanism_regime_mismatch).toBe(true);
    expect(out.verdict).toBe("partially_satisfied");
  });

  it("no EU/UK jurisdiction: no Chapter V analysis is asserted", () => {
    const out = buildTransferAnalysis({
      jurisdictions: ["California (CCPA/CPRA)"],
      transfer_status: "n/a",
      transfer_mechanism: "n/a",
    });
    expect(out.regime).toBe("not_engaged");
    expect(out.verdict).toBe("not_applicable");
    // Nothing is cited and no standard is asserted: the only Article
    // reference permitted is the disclaimer that no such duty applies.
    expect(out.citations_used).toEqual([]);
    expect(out.standard).toBe("");
    expect(out.citation).toBe("");
    expect(out.application).toContain(
      "impose no Article 45/46-style transfer-mechanism requirement",
    );
  });

  it("transfers recorded as staying in the EEA/UK are not applicable", () => {
    const out = buildTransferAnalysis({
      jurisdictions: [UK_JURISDICTION],
      transfer_status: "All tools store data in EU/UK",
      transfer_mechanism: "n/a",
    });
    expect(out.verdict).toBe("not_applicable");
    expect(out.mechanism).toBe("");
  });

  it("degrades when transfer status is unrecorded", () => {
    const out = buildTransferAnalysis({ jurisdictions: [UK_JURISDICTION] });
    expect(out.status).toBe("record_insufficient");
    expect(out.information_needed).toBeTruthy();
  });

  it("readTransferFacts reads closed lexicons only", () => {
    const f = readTransferFacts({
      jurisdictions: [UK_JURISDICTION],
      transfer_status: "Unsure",
      transfer_mechanism: "n/a",
    });
    expect(f.occurring).toBeNull();
    expect(f.mechanism).toBe("");
    expect(f.mechanismRegime).toBe("unrecorded");
  });
});
