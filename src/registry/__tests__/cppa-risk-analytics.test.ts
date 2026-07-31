// ITEM 306 — CPPA-RISK ANALYTIC-DELIVERABLE PIN + REGRESSION TEST.
//
// Closes the test gap left by ITEM 305 (cppa-risk Chapter-1 rebuild), which
// shipped the five § 7152 analytic deliverables with no pin or regression
// coverage. Four assertions, per the Item 305 dispatch:
//
//   (a) HARM_CATALOGUE's eight entries are verbatim substrings of
//       `provision_texts` row `cppa-7152` (typography-normalized).
//   (b) `consequence.decision` is always one of the four enumerated values
//       and is never null/absent when `weighing[]` is populated.
//   (c) every `harm_causation[]` entry binds to a catalogue id via isHarmId.
//   (d) the four `weighing[]` records are STRUCTURALLY DISTINCT — not one
//       boilerplate sentence with the beneficiary class swapped (the Item 295
//       defect pattern).
//
// Plus the Item 306 fixture guard: every cppa-risk golden case must satisfy
// `cppaRiskContract`, so a contract addition fails here at commit time rather
// than aborting a quality batch at pin-validation.
//
// PLACEMENT: src/registry/__tests__/ — matches every corpus-pin test authored
// in Items 298–304; those tests likewise import Deno-side modules from
// supabase/functions/_shared/ by relative path.
//
// Test (a) is skipped when the sandbox has no direct Postgres access.
// Do NOT edit a pin to make a failing corpus pass; re-ingest the corpus.

import { describe, it, expect } from "vitest";

import {
  HARM_CATALOGUE,
  HARM_CATALOGUE_CORPUS_KEY,
  HARM_IDS,
  isHarmId,
  resolveHarmId,
} from "../../../supabase/functions/_shared/ltp/analytic-deliverables/harm-catalogue.ts";
import {
  buildActivityAnalytics,
} from "../../../supabase/functions/_shared/ltp/analytic-deliverables/build.ts";
import {
  BENEFICIARY_CLASSES,
  HARM_PATHWAY_OPTS,
} from "../../../supabase/functions/_shared/ltp/analytic-deliverables/enums.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";
import { CPPA_RISK_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

const DECISIONS = [
  "initiate",
  "initiate_with_conditions",
  "do_not_initiate_absent_change",
  "reserved_insufficient_record",
] as const;

/**
 * Typography-only normalization. Same shape as the Items 298–304 corpus pins,
 * plus ONE documented addition: the canonical PDF hyphenates across line
 * breaks ("non- medical" in § 7152(a)(5)(H)), so a word-internal hyphen
 * followed by whitespace is rejoined. The rule requires a word character
 * immediately BEFORE the hyphen, so en/em dashes normalized to " - " (e.g.
 * the running page header) are untouched. Applied to BOTH sides.
 */
function norm(s: string): string {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(\w)-\s+(\w)/g, "$1-$2")
    .trim();
}

/**
 * Sub-paragraph (D) carries a running page header mid-sentence in the
 * corpus row; harm-catalogue.ts excises it (documented in that file's
 * header). The pin therefore matches (D) as two contiguous fragments
 * separated by nothing but the pagination artifact.
 */
const D_SPLIT_AT = "personal information that is unnecessary";
const PAGE_HEADER =
  /^ ?CA PRIVACY PROTECTION AGENCY - TEXT OF REGULATIONS \(CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations\) Page \d+ of \d+ ?$/;

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

describe.skipIf(!CAN_RUN)("(a) § 7152(a)(5)(A)–(H) harm catalogue — corpus pin", () => {
  it("every catalogue entry is verbatim in provision_texts row cppa-7152", async () => {
    const { execFileSync } = await import("node:child_process");
    const out = execFileSync(
      "psql",
      [
        "-tAX",
        "-c",
        `SELECT verbatim_excerpt FROM provision_texts WHERE status='approved' AND key='${HARM_CATALOGUE_CORPUS_KEY}'`,
      ],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    expect(out.trim().length, `corpus row ${HARM_CATALOGUE_CORPUS_KEY} absent or not approved`)
      .toBeGreaterThan(1000);
    const corpus = norm(out);

    const failures: string[] = [];
    for (const entry of HARM_CATALOGUE) {
      const v = norm(entry.verbatim);
      if (entry.id === "D") {
        const cut = v.indexOf(D_SPLIT_AT);
        expect(cut, "(D) split anchor missing from catalogue text").toBeGreaterThan(0);
        const head = v.slice(0, cut).trimEnd();
        const tail = v.slice(cut);
        const hi = corpus.indexOf(head);
        const ti = corpus.indexOf(tail);
        if (hi < 0 || ti < 0 || ti < hi) {
          failures.push(`(D) fragments not both present in order (head@${hi}, tail@${ti})`);
          continue;
        }
        const gap = corpus.slice(hi + head.length, ti);
        if (!PAGE_HEADER.test(gap)) {
          failures.push(`(D) gap between fragments is not the pagination artifact: ${JSON.stringify(gap.slice(0, 160))}`);
        }
        continue;
      }
      if (!corpus.includes(v)) {
        failures.push(`(${entry.id}) not verbatim in corpus — first 90 chars: ${JSON.stringify(v.slice(0, 90))}`);
      }
    }
    expect(failures, `Catalogue/corpus divergence:\n  ${failures.join("\n  ")}`).toEqual([]);
  });
});

describe("harm-catalogue structure", () => {
  it("exposes exactly (A)–(H) with pinpoints and no duplicates", () => {
    expect(HARM_IDS).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(new Set(HARM_CATALOGUE.map((h) => h.verbatim)).size).toBe(8);
    for (const h of HARM_CATALOGUE) {
      expect(h.pinpoint).toBe(`11 CCR § 7152(a)(5)(${h.id})`);
      expect(h.verbatim.length).toBeGreaterThan(60);
    }
  });

  it("every intake harm-pathway option resolves to a catalogue id", () => {
    expect(HARM_PATHWAY_OPTS).toHaveLength(8);
    const resolved = HARM_PATHWAY_OPTS.map((o) => resolveHarmId(o));
    expect(resolved).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
  });

  it("rejects ids outside the closed set", () => {
    for (const bad of ["I", "a", "", "AA", null, 7, undefined]) {
      expect(isHarmId(bad as unknown)).toBe(false);
    }
  });
});

// ── Scenario intakes ────────────────────────────────────────────────────
const PERFECT = CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>;

const EMPTY_RECORD: Record<string, unknown> = {
  primary_activity_name: "Undescribed activity",
  primary_activity_purpose: "",
};

const MINIMISATION: Record<string, unknown> = {
  ...PERFECT,
  a9_approver_name: "Priya Raman",
  a9_approver_position: "General Counsel",
};

const HIGH_RESIDUAL: Record<string, unknown> = {
  ...PERFECT,
  a5_harm_pathways: [
    {
      harm: "(F) Physical harms",
      source: "Precise device location retained alongside account identity.",
      cause: "An exported location history could be used to locate a consumer physically.",
      likelihood: "Highly likely",
      severity: "Severe",
    },
  ],
  a6_safeguards: [
    {
      harm: "(F) Physical harms",
      safeguard: "A location-truncation job is scheduled for next quarter.",
      safeguard_status: "Planned, not yet implemented",
    },
  ],
};

const SCENARIOS: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
  ["perfect record", PERFECT],
  ["empty record", EMPTY_RECORD],
  ["minimisation candidate", MINIMISATION],
  ["high residual", HIGH_RESIDUAL],
  ["with secondary activity", { ...PERFECT, secondary_activities: [{ name: "Lookalike modelling", purpose: "Marketing" }] }],
];

describe("(b) consequence — closed decision domain, never absent", () => {
  for (const [label, intake] of SCENARIOS) {
    it(`${label}: every activity carries a decision from the enumerated four`, () => {
      const activities = buildActivityAnalytics(intake);
      expect(activities.length).toBeGreaterThan(0);
      for (const a of activities) {
        expect(a.weighing).toHaveLength(BENEFICIARY_CLASSES.length);
        // weighing[] is always populated ⇒ consequence must never be absent.
        expect(a.consequence).toBeTruthy();
        expect(a.consequence.decision).not.toBeNull();
        expect(DECISIONS).toContain(a.consequence.decision);
        expect(a.consequence.rule_ids.length).toBeGreaterThan(0);
        expect(a.consequence.citation).toBe("11 CCR § 7152(a)(7)");
      }
    });
  }

  it("degrades rather than deciding when the record is empty", () => {
    const [a] = buildActivityAnalytics(EMPTY_RECORD);
    expect(a.consequence.decision).toBe("reserved_insufficient_record");
    expect(a.consequence.approval_recorded).toBe(false);
  });

  it("a planned-only safeguard on a severe harm never yields a bare initiate", () => {
    const [a] = buildActivityAnalytics(HIGH_RESIDUAL);
    expect(a.consequence.decision).not.toBe("initiate");
    expect(a.consequence.conditions.length).toBeGreaterThan(0);
  });

  it("a secondary activity is degraded, never a copy of the primary analysis", () => {
    const acts = buildActivityAnalytics({
      ...PERFECT,
      secondary_activities: [{ name: "Lookalike modelling", purpose: "Marketing" }],
    });
    expect(acts).toHaveLength(2);
    const [primary, secondary] = acts;
    expect(secondary.is_primary).toBe(false);
    expect(secondary.consequence.decision).toBe("reserved_insufficient_record");
    expect(secondary.harm_causation).not.toEqual(primary.harm_causation);
    expect(secondary.necessity_analysis).not.toEqual(primary.necessity_analysis);
  });
});

describe("(c) harm_causation — catalogue membership", () => {
  for (const [label, intake] of SCENARIOS) {
    it(`${label}: every harm entry binds to an (A)–(H) catalogue id`, () => {
      for (const a of buildActivityAnalytics(intake)) {
        for (const h of a.harm_causation) {
          expect(isHarmId(h.harm_id), `harm_id ${JSON.stringify(h.harm_id)} outside (A)–(H)`).toBe(true);
          expect(h.harm_pinpoint).toBe(`11 CCR § 7152(a)(5)(${h.harm_id})`);
          const cat = HARM_CATALOGUE.find((c) => c.id === h.harm_id)!;
          expect(h.harm_verbatim).toBe(cat.verbatim);
        }
        for (const s of a.safeguard_map) {
          // safeguard_map[].harm_id is a foreign key into the same catalogue.
          expect(isHarmId(s.harm_id)).toBe(true);
        }
      }
    });
  }

  it("an off-catalogue harm label is dropped, never coerced", () => {
    const [a] = buildActivityAnalytics({
      ...PERFECT,
      a5_harm_pathways: [
        { harm: "(Z) Invented harm", source: "x", cause: "y", likelihood: "Possible", severity: "Minimal" },
      ],
    });
    expect(a.harm_causation.every((h) => isHarmId(h.harm_id))).toBe(true);
    expect(a.harm_causation.some((h) => /Invented harm/.test(h.harm_verbatim))).toBe(false);
  });
});

// ── (d) STRUCTURAL DISTINCTNESS ─────────────────────────────────────────
// The Item 295 defect: four "weighing" records that are one boilerplate
// sentence with the beneficiary class swapped. Difference alone does not
// catch it — the class name always differs. So the class tokens are STRIPPED
// first, then a token-overlap (Dice) ratio is computed over the remainder.
// Identical-modulo-class boilerplate scores 1.0; genuinely distinct analyses
// score well below the 0.60 bar.
const CLASS_TOKENS = new Set(
  BENEFICIARY_CLASSES.flatMap((c) => c.toLowerCase().split(/\s+/)).concat(["class", "beneficiary"]),
);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 0 && !CLASS_TOKENS.has(t));
}

/** Dice coefficient over token bigrams — 1.0 = shared boilerplate. */
function boilerplateRatio(a: string, b: string): number {
  const bigrams = (s: string) => {
    const t = tokens(s);
    const out = new Set<string>();
    for (let i = 0; i < t.length - 1; i++) out.add(`${t[i]} ${t[i + 1]}`);
    return out;
  };
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return tokens(a).join(" ") === tokens(b).join(" ") ? 1 : 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return (2 * shared) / (A.size + B.size);
}

describe("(d) weighing[] — structural distinctness across the four classes", () => {
  it("the boilerplate detector itself catches the Item 295 pattern", () => {
    const swapped = BENEFICIARY_CLASSES.map(
      (c) => `The processing produces a clear and material benefit to ${c} that outweighs the identified risks.`,
    );
    expect(boilerplateRatio(swapped[0], swapped[1])).toBeGreaterThan(0.95);
  });

  it("the golden 'perfect' record yields four distinct benefit analyses", () => {
    const [a] = buildActivityAnalytics(PERFECT);
    expect(a.weighing.map((w) => w.beneficiary_class)).toEqual([...BENEFICIARY_CLASSES]);

    const stated = a.weighing.filter((w) => w.sufficiency !== "benefit_not_stated");
    expect(stated.length, "the perfect fixture must state all four benefits").toBe(4);

    const failures: string[] = [];
    for (let i = 0; i < stated.length; i++) {
      for (let j = i + 1; j < stated.length; j++) {
        const r = boilerplateRatio(stated[i].benefit_statement, stated[j].benefit_statement);
        if (r >= 0.6) {
          failures.push(
            `${stated[i].beneficiary_class} vs ${stated[j].beneficiary_class}: boilerplate ratio ${r.toFixed(2)}`,
          );
        }
      }
    }
    expect(failures, `Class-swapped boilerplate detected:\n  ${failures.join("\n  ")}`).toEqual([]);
  });

  it("no beneficiary class is silently dropped and generic benefits are flagged", () => {
    const [a] = buildActivityAnalytics({
      ...PERFECT,
      a4_benefit_business: "Improving our service and analytics.",
    });
    expect(a.weighing).toHaveLength(4);
    const biz = a.weighing.find((w) => w.beneficiary_class === "the business")!;
    expect(biz.generic_benefit_flag).toBe(true);
    expect(biz.status).toBe("record_insufficient");
  });
});

// ── ITEM 306 fixture guard ──────────────────────────────────────────────
describe("cppa-risk golden fixtures satisfy the live intake contract", () => {
  for (const c of CPPA_RISK_GOLDEN) {
    it(`${c.id} passes validateIntake (quality-batch pin-validation parity)`, () => {
      const res = validateIntake(cppaRiskContract, c.intake as Record<string, unknown>);
      expect(
        res.violations.map((v) => `${v.key}: ${v.reason}`),
        `Pinned-fixture contract violations for cppa-risk / ${c.id}`,
      ).toEqual([]);
      expect(res.ok).toBe(true);
    });
  }
});
