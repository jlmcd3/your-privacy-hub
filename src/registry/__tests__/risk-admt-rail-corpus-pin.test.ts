// CORPUS PIN FOR THE RISK + ADMT INTAKE RAILS (doc 52 §8; the same class
// of guard as cyber-rail-corpus-pin.test.ts / registration-rail-corpus-
// pin.test.ts, extended per doc 48 §II.4a rule 1: "rail verbatim text
// joins the corpus-pin law").
//
// UNLIKE the two sibling tests, this one checks against a COMMITTED
// SNAPSHOT FIXTURE (tests/edge/corpus/__snapshots__/provision-snapshot-
// rail.json) rather than a live fetch through corpus-client.ts. That is
// a deliberate deviation from the sibling tests' pattern, not an
// oversight: doc 52 §0.5/§1 standardizes phase-1 corpus pin checks on
// committed snapshots (live Supabase reachability inside this sandbox is
// unreliable — the same lesson the deno-side _w15 baseline already
// recorded), and this test's own risk/admt snapshot was captured this
// session via the Lovable MCP `query_database` tool, verbatim.
//
// Placed under src/registry/__tests__/ (not tests/edge/corpus/) because
// CPPARiskRailEntries.ts and admtRailEntries.ts import through the `@/`
// Vite alias and only resolve under the project's vitest config
// (vitest.config.ts: include "src/**/*.{test,spec}.{ts,tsx}") — a deno
// test in tests/edge/ cannot import them at all.
//
// Scope: doc 52 §8 asks for "each entry's verbatim regulation text"; this
// landing checks a REPRESENTATIVE SAMPLE (5 Risk + 2 ADMT entries) rather
// than exhaustively snapshotting every citation in both ~130-citation
// files — quality over coverage, consistent with landings 1-3's judgment
// calls. Widening the sample is mechanical: add a rail key + citation to
// SAMPLE_ENTRIES and, if a new provision, extend the snapshot fixture.
//
// Comparison is quote-STYLE-insensitive (stripQuotesForCompare): the same
// nested phrase is sometimes rendered with straight double quotes in the
// corpus and re-nested as single quotes in the rail's prose (to avoid
// double-double nesting) — a typographic choice on both sides, not a
// content mismatch, so it must not register as a pin failure. Only the
// words are compared.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CPPA_RISK_RAIL } from "@/components/cppa/CPPARiskRailEntries";
import { ADMT_RAIL } from "@/components/admt/admtRailEntries";
import type { RailEntry } from "@/components/intake/StatuteRail";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = path.resolve(
  __dirname,
  "../../../tests/edge/corpus/__snapshots__/provision-snapshot-rail.json",
);

interface Snapshot {
  captured_at: string;
  rows: Record<string, { citation: string; status: string; verbatim_excerpt: string }>;
}

const snapshot: Snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, "utf-8"));

function normalizeCorpusText(s: string): string {
  return String(s ?? "")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/ /g, " ")
    .replace(/[\s\f]+/g, " ")
    .trim();
}

/** Every double-quoted span in a (normalized) regulationText string. Rail
 * entries that are NOT quote-wrapped (a bare paraphrase, e.g. i9_dpia
 * below) yield zero spans — callers must check for that case themselves,
 * since zero spans is itself the finding for those entries. */
function quotedSpans(regulationText: string): string[] {
  const normalized = normalizeCorpusText(regulationText);
  return [...normalized.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** For the containment CHECK only (never for span extraction): drop all
 * quote marks entirely. A nested value inside a quoted sentence is
 * sometimes rendered with straight double quotes in the corpus
 * (provision_texts) and re-nested as single quotes in the rail's prose
 * (to avoid ambiguous double-double nesting) — legitimate typographic
 * choices on both sides that must not register as a pin mismatch. Word
 * content, not quote-mark style, is what this guard cares about. */
function stripQuotesForCompare(s: string): string {
  return s.replace(/["'‘’‚‛′“”„‟″]/g, "");
}

interface SampleEntry {
  readonly rail: Record<string, RailEntry>;
  readonly key: string;
  /** provision_texts keys this entry's quoted spans may draw from. */
  readonly provisions: readonly string[];
  /** Expected outcome, verified by hand against the snapshot at authoring
   * time — turns a silent pass/fail into an assertion that the test
   * itself still finds what this session found. */
  readonly expect: "pins" | "known_gap";
}

const SAMPLE_ENTRIES: readonly SampleEntry[] = [
  { rail: CPPA_RISK_RAIL, key: "primary_activity", provisions: ["cppa-7150", "cppa-7155"], expect: "pins" },
  { rail: CPPA_RISK_RAIL, key: "processing_record", provisions: ["cppa-7152"], expect: "pins" },
  { rail: CPPA_RISK_RAIL, key: "comparable_set", provisions: ["cppa-7156"], expect: "pins" },
  { rail: CPPA_RISK_RAIL, key: "sensitive_location_basis", provisions: ["cppa-7150"], expect: "pins" },
  // PN-CORPUS-L-RISK-1 (2026-08-22) — the § 7150(b)(2)(A) carve-out entry
  // added with the carve-out build; verbatim from the same cppa-7150 excerpt.
  { rail: CPPA_RISK_RAIL, key: "q15d_hr_carveout", provisions: ["cppa-7150"], expect: "pins" },
  // RESOLVED 2026-08-22 (phase-2 redline): i9_dpia's regulationText was a
  // PARAPHRASE ("cross-referencing", "identifies the portions ... of this
  // Article") that did not appear in § 7156(b)'s actual text. Rewritten to
  // the genuine verbatim quote ("utilize a risk assessment ... prepared
  // for another purpose ... paired with the outstanding information
  // necessary for, compliance with section 7152"); plainSummary/
  // fscrContext updated to match without changing the substantive guidance.
  { rail: CPPA_RISK_RAIL, key: "i9_dpia", provisions: ["cppa-7156"], expect: "pins" },
  // KNOWN GAP (real finding): the cppa-7001 provision_texts excerpt is
  // explicitly scoped "[PARTIAL EXCERPT — subdivisions (bbb) and (ddd)
  // only]" — it does NOT include subdivision (e), the ADMT definition
  // itself, even though this is arguably the single most load-bearing
  // definition for the ADMT product. The rail entry's citation ("11 CCR
  // § 7001(e)") and its regulationText (the real ADMT definition) are
  // correct; the CORPUS excerpt is what's incomplete. Feeds the growth
  // review (doc 50's periodic-review plan), not a decision-queue entry —
  // this is a curation gap, not a logic gap.
  { rail: ADMT_RAIL, key: "scope_does_business_use_admt", provisions: ["cppa-7001"], expect: "known_gap" },
  { rail: ADMT_RAIL, key: "scope_significant_decision_domain", provisions: ["cppa-7001"], expect: "pins" },
];

const RAIL_KNOWN_GAPS = new Set(
  SAMPLE_ENTRIES.filter((e) => e.expect === "known_gap").map((e) => e.key),
);

describe("Risk + ADMT intake rail — corpus pin (phase-1 sample)", () => {
  for (const entry of SAMPLE_ENTRIES) {
    it(`${entry.key}: regulationText quoted spans resolve against ${entry.provisions.join("/")} (${entry.expect})`, () => {
      const railEntry = entry.rail[entry.key];
      expect(railEntry, `rail key "${entry.key}" not found`).toBeTruthy();
      expect(railEntry.regulationText, `${entry.key} has no regulationText`).toBeTruthy();

      const corpus = entry.provisions
        .map((p) => {
          const row = snapshot.rows[p];
          expect(row, `snapshot has no row for ${p}`).toBeTruthy();
          expect(row.status, `${p} is not approved`).toBe("approved");
          return normalizeCorpusText(row.verbatim_excerpt);
        })
        .join("\n");

      const spans = quotedSpans(railEntry.regulationText!);

      const strippedCorpus = stripQuotesForCompare(corpus);
      const isResolved = (s: string) => strippedCorpus.includes(stripQuotesForCompare(s));

      if (entry.expect === "pins") {
        expect(spans.length, `${entry.key}: no quoted spans found in regulationText`).toBeGreaterThan(0);
        const unresolved = spans.filter((s) => !isResolved(s));
        expect(
          unresolved,
          `${entry.key}: quoted span(s) not found verbatim (quote-style-insensitive) in ${entry.provisions.join("/")}`,
        ).toEqual([]);
      } else {
        // known_gap: assert the gap is STILL a gap (staleness guard — if a
        // future rail edit makes this verbatim, the test starts failing
        // until it's moved out of RAIL_KNOWN_GAPS).
        const fullyResolved = spans.length > 0 && spans.every(isResolved);
        expect(
          fullyResolved,
          `${entry.key}: now resolves verbatim — remove it from RAIL_KNOWN_GAPS, the gap this test tracked has closed`,
        ).toBe(false);
      }
    });
  }

  it("RAIL_KNOWN_GAPS entries are exactly the ones marked known_gap above", () => {
    expect([...RAIL_KNOWN_GAPS]).toEqual(["scope_does_business_use_admt"]);
  });
});
