// ITEM 326 — LIA UK GDPR Art. 22A–22D / Art. 6(1)(ea) REGISTRY PIN.
//
// Twin of `uk-gdpr-corpus-pin.test.ts`, but pointed at the registry rather
// than at hand-authored strings: every UK row added to
// `_shared/registry/lia-verified-authorities.ts` at Item 326 must remain a
// byte-exact substring of its `provision_texts` row. If the corpus is
// re-ingested and the text moves, this fails instead of the report shipping
// a quote that no longer exists.
//
// WHY IT MATTERS: EU Art. 22(1) is prohibition-by-default. UK Arts. 22A–22C
// invert that for non-Article-9(1) data (permitted subject to safeguards),
// and UK law adds Art. 6(1)(ea), which Art. 22B(4) then bars from grounding
// a solely automated significant decision. Citing the EU rule for UK-scoped
// LIA output is an accuracy defect.
//
// ANNEX 1 SCOPE LIMIT: Annex 1 is not in the corpus. This file also asserts
// that no Annex 1 CONDITION is stated anywhere in the registry rows or in
// the builder's narrative — only that the basis is conditioned on Annex 1
// and that the conditions are reserved to review.
//
// Skipped when the sandbox has no direct Postgres access (PGHOST unset).

import { describe, it, expect } from "vitest";
import {
  LIA_VERIFIED_AUTHORITIES,
  LIA_UNANCHORED_PROPOSITIONS,
} from "../../../supabase/functions/_shared/registry/lia-verified-authorities.ts";
import {
  buildAutomatedDecisionAnalysis,
} from "../../../supabase/functions/_shared/ltp/lia-deliverables/build.ts";
import {
  ANNEX_1_RESERVED_NOTE,
  EU_JURISDICTION,
  UK_JURISDICTION,
} from "../../../supabase/functions/_shared/ltp/lia-deliverables/elements.ts";

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
  uk_art_22_substituted: "ukgdpr-art-22",
  uk_art_22a_solely_automated_definition: "ukgdpr-art-22a",
  uk_art_22a_significant_decision_definition: "ukgdpr-art-22a",
  uk_art_22a_profiling_consideration: "ukgdpr-art-22a",
  uk_art_22b_special_category_restriction: "ukgdpr-art-22b",
  uk_art_22b_recognised_li_bar: "ukgdpr-art-22b",
  uk_art_22c_safeguards_duty: "ukgdpr-art-22c",
  uk_art_22c_safeguard_measures: "ukgdpr-art-22c",
  uk_art_22d_safeguard_regulations: "ukgdpr-art-22d",
  uk_art_6_1_ea_recognised_li: "ukgdpr-art-6",
  uk_art_6_ea_annex_1_condition: "ukgdpr-art-6",
  uk_art_6_1_f_legitimate_interests: "ukgdpr-art-6",
};

const HAS_DB = !!process.env.PGHOST && !!process.env.PGDATABASE;
const d = HAS_DB ? describe : describe.skip;

/** Same psql transport as `uk-gdpr-corpus-pin.test.ts` — no pg dependency. */
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

d("ITEM 326 — LIA UK Art. 22 registry rows are pinned to the corpus", () => {
  let corpus: Record<string, string> = {};

  it("loads every referenced provision_texts row", async () => {
    corpus = await loadCorpus();
    for (const key of new Set(Object.values(ROW_FOR))) {
      expect(corpus[key], `missing corpus row ${key}`).toBeTruthy();
    }
  });

  for (const [propKey, rowKey] of Object.entries(ROW_FOR)) {
    it(`${propKey} is verbatim in ${rowKey}`, () => {
      const row = LIA_VERIFIED_AUTHORITIES[propKey];
      expect(row, `registry row ${propKey} missing`).toBeTruthy();
      expect(corpus[rowKey]).toContain(norm(row.verbatim_quote));
    });
  }
});

describe("ITEM 326 — Annex 1 scope limit is respected", () => {
  const ukIntake = { jurisdictions: [UK_JURISDICTION] };
  const euIntake = { jurisdictions: [EU_JURISDICTION] };

  it("records Annex 1 as an unanchored proposition", () => {
    expect(LIA_UNANCHORED_PROPOSITIONS).toContain(
      "uk_annex_1_recognised_li_conditions",
    );
  });

  it("has no Annex 1 condition text in any registry row", () => {
    for (const [k, r] of Object.entries(LIA_VERIFIED_AUTHORITIES)) {
      if (!/annex/i.test(r.verbatim_quote)) continue;
      // The only permitted Annex 1 mention is the pointer that the basis is
      // conditioned on it — never what the condition is.
      expect(k).toBe("uk_art_6_ea_annex_1_condition");
    }
  });

  it("emits the reserved note, and nothing more, when UK is engaged", () => {
    const out = buildAutomatedDecisionAnalysis(ukIntake);
    expect(out.annex_1_reserved_note).toBe(ANNEX_1_RESERVED_NOTE);
    const annexSentences = out.application
      .split(/(?<=\.)\s+/)
      .filter((s) => /annex/i.test(s));
    for (const s of annexSentences) {
      expect(ANNEX_1_RESERVED_NOTE).toContain(s.trim());
    }
  });

  it("never mentions Annex 1 when only the EU regime is engaged", () => {
    const out = buildAutomatedDecisionAnalysis(euIntake);
    expect(out.annex_1_reserved_note).toBe("");
    expect(/annex/i.test(out.application)).toBe(false);
  });
});

describe("ITEM 326 — jurisdiction branching states the correct default", () => {
  it("UK-only: permitted with safeguards, not the EU prohibition", () => {
    const out = buildAutomatedDecisionAnalysis({
      jurisdictions: [UK_JURISDICTION],
    });
    expect(out.regime).toBe("uk");
    expect(out.default_position).toBe("permitted_with_safeguards");
    expect(out.recognised_li_barred).toBe(true);
    expect(out.safeguards_verbatim).toContain("human intervention");
    expect(out.application).not.toContain("Article 22(2)");
  });

  it("EU-only: prohibition by default, and no UK material bleeds in", () => {
    const out = buildAutomatedDecisionAnalysis({
      jurisdictions: [EU_JURISDICTION],
    });
    expect(out.regime).toBe("eu");
    expect(out.default_position).toBe("prohibited_unless_excepted");
    expect(out.recognised_li_barred).toBe(false);
    expect(out.safeguards_verbatim).toBe("");
    expect(out.application).not.toMatch(/22A|22B|22C|6\(1\)\(ea\)/);
  });

  it("both: states both defaults without merging them", () => {
    const out = buildAutomatedDecisionAnalysis({
      jurisdictions: [EU_JURISDICTION, UK_JURISDICTION],
    });
    expect(out.regime).toBe("dual");
    expect(out.default_position).toBe("both_defaults_stated");
    expect(out.application).toContain("Article 22(2)");
    expect(out.application).toContain("Article 22C");
  });

  it("neither: no Article 22-family analysis is asserted", () => {
    const out = buildAutomatedDecisionAnalysis({
      jurisdictions: ["Brazil (LGPD)"],
    });
    expect(out.regime).toBe("not_engaged");
    expect(out.default_position).toBe("not_applicable");
    expect(out.recognised_li_barred).toBe(false);
  });

  it("UK + special-category data engages the Art. 22B(1) restriction", () => {
    const out = buildAutomatedDecisionAnalysis({
      jurisdictions: [UK_JURISDICTION],
      balancing_details: { special_category_data: true },
    });
    expect(out.special_category_restriction).toBe(true);
    expect(out.application).toContain("Article 9(1)");
  });
});
