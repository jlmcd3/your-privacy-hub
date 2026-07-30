// ITEM 272 — REGISTRY ↔ CORPUS PIN TEST (permanent drift guard).
//
// Purpose: the applicability registry in cppa-risk-conclusions.ts states the
// law on a legal surface. Before Item 272 it carried the DRAFT-era five-prong
// § 7150(b) set (draft "(b)(4) extensive profiling"; training miscited at
// (b)(5); sensitive-location inference missing entirely). This test makes
// that class of drift impossible to reintroduce silently.
//
// FIXTURE PROVENANCE — the subdivision text below is a VERBATIM COPY of
// provision_texts key='cppa-7150' (status=approved, jurisdiction=US-CA;
// source PDF SHA-256 7a34306cebf12ae9050490568b1d7ed532cfd38dc6ed8c7c3dc40afb23328650),
// § 7150(b)(1)–(6), read from the database on 2026-07-30.
//
// ⚠ RE-VERIFICATION REQUIRED ON ANY CORPUS UPDATE: if the cppa-7150 corpus
// row is re-ingested, amended, or superseded, this fixture MUST be re-copied
// from the new verbatim_excerpt in the same turn. Do not edit the fixture to
// make a failing registry pass — fix the registry.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CPPA_RISK_CONCLUSIONS } from "./cppa-risk-conclusions.ts";
import {
  CCPA_7150_B_1,
  CCPA_7150_B_2,
  CCPA_7150_B_3,
  CCPA_7150_B_4,
  CCPA_7150_B_5,
  CCPA_7150_B_6,
} from "../openings/ccpa-7150-pin.ts";

/** Corpus fixture: § 7150(b)(N) → verbatim subdivision text. */
const CORPUS_7150_B: Readonly<Record<string, string>> = {
  "11 CCR § 7150(b)(1)": CCPA_7150_B_1,
  "11 CCR § 7150(b)(2)": CCPA_7150_B_2,
  "11 CCR § 7150(b)(3)": CCPA_7150_B_3,
  "11 CCR § 7150(b)(4)": CCPA_7150_B_4,
  "11 CCR § 7150(b)(5)": CCPA_7150_B_5,
  "11 CCR § 7150(b)(6)": CCPA_7150_B_6,
};

/**
 * 40-character verbatim substrings of each subdivision, copied from the
 * corpus row. These pin the fixture itself against the openings constants,
 * so a silent edit to either side fails the suite.
 */
const PIN_40: Readonly<Record<string, string>> = {
  "11 CCR § 7150(b)(1)": "Selling or sharing personal information.",
  "11 CCR § 7150(b)(2)": "Processing sensitive personal informatio",
  "11 CCR § 7150(b)(3)": "Using ADMT for a significant decision co",
  "11 CCR § 7150(b)(4)": "based upon systematic observation of tha",
  "11 CCR § 7150(b)(5)": "presence in a sensitive location. \u201CInfer",
  "11 CCR § 7150(b)(6)": "intends to use to train an ADMT for a si",
};

/** Operative tokens each display_label must be faithful to. */
const OPERATIVE_TOKENS: Readonly<Record<string, readonly string[]>> = {
  "11 CCR § 7150(b)(1)": ["selling or sharing"],
  "11 CCR § 7150(b)(2)": ["sensitive personal information"],
  "11 CCR § 7150(b)(3)": ["admt", "significant decision"],
  "11 CCR § 7150(b)(4)": ["systematic observation"],
  "11 CCR § 7150(b)(5)": ["sensitive location"],
  "11 CCR § 7150(b)(6)": ["train"],
};

const applicability = CPPA_RISK_CONCLUSIONS.filter((c) => c.surface === "applicability");

Deno.test("(a) exactly six applicability rows pinned to § 7150(b)(1)–(b)(6)", () => {
  assertEquals(applicability.length, 6, `expected six § 7150(b) prongs, got ${applicability.length}`);
  const pins = applicability.map((c) => c.anchor.pinpoint).sort();
  assertEquals(pins, Object.keys(CORPUS_7150_B).slice().sort());
});

Deno.test("(b) every registry pinpoint exists in the corpus fixture, pin-verified", () => {
  for (const [pin, text] of Object.entries(CORPUS_7150_B)) {
    assert(text.includes(PIN_40[pin]), `40-char pin missing from corpus fixture for ${pin}`);
  }
});

Deno.test("(c) display_label carries the operative tokens of its subdivision", () => {
  for (const row of applicability) {
    const pin = row.anchor.pinpoint;
    const label = (row.display_label || "").toLowerCase();
    const subdivision = (CORPUS_7150_B[pin] || "").toLowerCase();
    for (const token of OPERATIVE_TOKENS[pin] ?? []) {
      assert(
        label.includes(token),
        `${row.id}: display_label "${row.display_label}" omits operative token "${token}" for ${pin}`,
      );
      assert(
        subdivision.includes(token),
        `fixture drift: token "${token}" absent from corpus text of ${pin}`,
      );
    }
  }
});

Deno.test("(d) no registry row cites a subdivision absent from the fixture", () => {
  for (const c of CPPA_RISK_CONCLUSIONS) {
    const pin = c.anchor.pinpoint;
    if (!/§\s*7150\(b\)\(\d\)/.test(pin)) continue;
    assert(pin in CORPUS_7150_B, `${c.id} cites ${pin}, which is not in the § 7150(b) corpus fixture`);
  }
});

Deno.test("negative: draft-era phrase 'extensive profiling' appears in NO applicability label", () => {
  for (const row of applicability) {
    assert(
      !/extensive profiling/i.test(row.display_label || ""),
      `${row.id}: draft-era phrase "extensive profiling" must not appear in a display_label`,
    );
  }
});
