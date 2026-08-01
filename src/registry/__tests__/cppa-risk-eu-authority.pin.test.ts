// ITEM 341 — EU PERSUASIVE-AUTHORITY SECTION (cppa-risk).
//
// Two duties are asserted here:
//
//   1. PIN LAW — every `verbatim_quote` in
//      `_shared/ltp/eu-authority/pinned-guidance.ts` is a byte-exact
//      contiguous substring of the `excerpt_text` of its identified
//      `edpb_guidelines` row (psql; skipped where the sandbox has no direct
//      Postgres access).
//   2. MANDATORY DEGRADATION LAW — with no corpus, with an empty corpus, and
//      with a corpus carrying no VERIFIED enforcement match, the section is
//      still emitted and says so in terms. It never paraphrases a dropped
//      pin and never cites an unverified enforcement row.

import { describe, it, expect } from "vitest";
import {
  EU_GUIDANCE_PINS,
  pinsForTopic,
} from "../../../supabase/functions/_shared/ltp/eu-authority/pinned-guidance.ts";
import { buildEuAuthoritySection } from "../../../supabase/functions/_shared/ltp/eu-authority/build.ts";
import { deriveEuTopics } from "../../../supabase/functions/_shared/ltp/eu-authority/topics.ts";
import { parseProvisions } from "../../../supabase/functions/_shared/ltp/eu-authority/fetch.ts";
import type {
  EuAuthorityCorpus,
} from "../../../supabase/functions/_shared/ltp/eu-authority/types.ts";

const HAS_DB = !!process.env.PGHOST && !!process.env.PGDATABASE;
const d = HAS_DB ? describe : describe.skip;

async function loadGuidelineRows(): Promise<Record<string, string>> {
  const { execFileSync } = await import("node:child_process");
  const ids = Array.from(new Set(EU_GUIDANCE_PINS.map((p) => p.corpus_row_id)));
  const sql =
    "SELECT id || E'\\x1f' || excerpt_text || E'\\x1e' FROM edpb_guidelines " +
    "WHERE id = ANY(string_to_array($$" + ids.join("|") + "$$, '|')::uuid[])";
  const out = execFileSync("psql", ["-tAX", "-c", sql], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const rows: Record<string, string> = {};
  for (const rec of out.split("\x1e")) {
    const i = rec.indexOf("\x1f");
    if (i < 0) continue;
    rows[rec.slice(0, i).trim()] = rec.slice(i + 1);
  }
  return rows;
}

/** Full intake that engages every topic rule. */
const ALL_TOPIC_INTAKE: Record<string, unknown> = {
  q5_sell_share: "Both",
  q5b_profiling_observation: "Yes — behavioural profiling",
  q15_sensitive_pi: "Yes",
  q15b_under16_knowledge: "Yes — we knowingly process under-16 data",
  q18_admt_use: "Yes",
  i2_retention_period: "24 months",
  i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
};

d("ITEM 341 — EDPB pins are byte-exact against edpb_guidelines", () => {
  let rows: Record<string, string> = {};
  it("loads the pinned corpus rows", async () => {
    rows = await loadGuidelineRows();
    expect(Object.keys(rows).length).toBeGreaterThan(0);
  });

  for (const pin of EU_GUIDANCE_PINS) {
    it(`${pin.pin_id} is a verbatim substring of ${pin.guideline_ref}`, () => {
      const text = rows[pin.corpus_row_id];
      expect(text, `corpus row ${pin.corpus_row_id} missing`).toBeTruthy();
      expect(text.includes(pin.verbatim_quote)).toBe(true);
    });
  }

  it("builds a section whose every quote is byte-exact against the live corpus", () => {
    const corpus: EuAuthorityCorpus = {
      guidance_excerpts: Object.fromEntries(
        EU_GUIDANCE_PINS.map((p) => [p.pin_id, rows[p.corpus_row_id] ?? ""]),
      ),
      oss_counts: {},
      verified_enforcement: [],
    };
    const section = buildEuAuthoritySection(ALL_TOPIC_INTAKE, corpus);
    const quotes = section.topics.flatMap((t) => t.guidance);
    expect(quotes.length).toBe(EU_GUIDANCE_PINS.length);
    for (const q of quotes) {
      expect(rows[q.corpus_row_id].includes(q.verbatim_quote)).toBe(true);
      expect(q.authority_weight).toBe("persuasive_non_binding");
      expect(q.regime).toBe("EU/EEA (GDPR)");
    }
  });
});

describe("ITEM 341 — deterministic topic matching", () => {
  it("engages only the topics the record supports", () => {
    const bare = deriveEuTopics({ q18_admt_use: "No", q15_sensitive_pi: "No" });
    expect(bare.map((t) => t.rule.topic_id)).toEqual(["risk_methodology"]);
  });

  it("engages every topic on a full record, with an explainable trigger", () => {
    const all = deriveEuTopics(ALL_TOPIC_INTAKE);
    expect(all.length).toBe(7);
    for (const t of all) {
      expect(t.triggers.length).toBeGreaterThan(0);
      for (const trig of t.triggers) {
        expect(trig.intake_key).toBeTruthy();
        expect(trig.rule_id).toBeTruthy();
      }
    }
  });

  it("is a pure function of the intake — identical input, identical output", () => {
    const a = buildEuAuthoritySection(ALL_TOPIC_INTAKE, null);
    const b = buildEuAuthoritySection(ALL_TOPIC_INTAKE, null);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("parses GDPR provisions deterministically from enforcement text", () => {
    expect(parseProvisions("Art. 32 (1) b), (2) GDPR", "Article 6 GDPR"))
      .toEqual(["Article 32", "Article 6"].sort());
  });
});

describe("ITEM 341 — MANDATORY DEGRADATION LAW", () => {
  it("emits the section with an honest note when no corpus is available", () => {
    const s = buildEuAuthoritySection(ALL_TOPIC_INTAKE, null);
    expect(s.status).toBe("no_qualifying_authority");
    expect(s.information_needed).toContain("not available");
    expect(s.topics.every((t) => t.guidance.length === 0)).toBe(true);
    expect(s.topics.every((t) => t.verified_precedents.length === 0)).toBe(true);
  });

  it("drops a pin whose corpus text no longer matches, rather than paraphrasing", () => {
    const pin = pinsForTopic("sensitive_data")[0];
    const corpus: EuAuthorityCorpus = {
      guidance_excerpts: { [pin.pin_id]: "the corpus row has been re-ingested and reworded" },
      oss_counts: {},
      verified_enforcement: [],
    };
    const s = buildEuAuthoritySection(ALL_TOPIC_INTAKE, corpus);
    const topic = s.topics.find((t) => t.topic_id === "sensitive_data")!;
    expect(topic.guidance).toEqual([]);
    expect(topic.status).toBe("no_qualifying_authority");
    expect(topic.information_needed).toContain("byte-for-byte");
    // No fragment of the pinned text may survive anywhere in the section.
    expect(JSON.stringify(s)).not.toContain(pin.verbatim_quote.slice(0, 40));
  });

  it("says so when no VERIFIED enforcement decision matches the fact pattern", () => {
    const corpus: EuAuthorityCorpus = {
      guidance_excerpts: {},
      oss_counts: {},
      verified_enforcement: [],
    };
    const s = buildEuAuthoritySection(ALL_TOPIC_INTAKE, corpus);
    for (const t of s.topics) {
      expect(t.verified_precedents).toEqual([]);
      expect(t.information_needed).toContain("no VERIFIED enforcement decision");
    }
  });

  it("admits a verified precedent only on a provision match", () => {
    const corpus: EuAuthorityCorpus = {
      guidance_excerpts: {},
      oss_counts: { "provision:Article 22": 51 },
      verified_enforcement: [
        {
          subject: "Example Controller SA",
          regulator: "CNIL",
          jurisdiction: "France",
          decision_date: "2024-06-01",
          provisions: ["Article 22"],
          fine_eur: 100000,
          source_url: "https://example.org/decision",
          verification_status: "verified",
          authority_weight: "persuasive_non_binding",
        },
      ],
    };
    const s = buildEuAuthoritySection(ALL_TOPIC_INTAKE, corpus);
    const admt = s.topics.find((t) => t.topic_id === "automated_decision_making")!;
    expect(admt.verified_precedents.map((p) => p.subject)).toEqual(["Example Controller SA"]);
    expect(admt.pattern_observations[0].decision_count).toBe(51);
    // A topic keyed to other provisions gets nothing.
    const retention = s.topics.find((t) => t.topic_id === "retention")!;
    expect(retention.verified_precedents).toEqual([]);
  });
});

describe("ITEM 341 — persuasion framing is mandatory and separate", () => {
  it("marks the whole section persuasive, non-binding and regime-labelled", () => {
    const s = buildEuAuthoritySection(ALL_TOPIC_INTAKE, null);
    expect(s.section_title).toBe("Persuasive authority from EU practice");
    expect(s.framing.persuasive_note).toContain("persuasive authority only");
    expect(s.framing.persuasive_note).toContain("not binding");
    expect(s.framing.regime_label).toContain("different legal regime");
    expect(s.framing.weight_reservation).toContain("reserved to the Company and its counsel");
    expect(s.framing.carve_out_note).toContain("§ 7156(a)");
    expect(s.framing.carve_out_note).toContain("does not extend");
  });
});
