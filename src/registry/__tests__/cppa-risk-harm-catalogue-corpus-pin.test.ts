// ITEM 305 (retro-fitted) — § 7152(a)(5)(A)–(H) HARM-CATALOGUE CORPUS PIN.
//
// Item 305 rebuilt the cppa-risk five-deliverable engine around a CLOSED
// catalogue of the statutory negative-impact examples, but shipped without a
// pin. This is that pin: every `verbatim` string in
// `_shared/ltp/analytic-deliverables/harm-catalogue.ts` must be an exact
// substring of the approved `provision_texts` row `cppa-7152`.
//
// PROVENANCE: OAL-approved regulations PDF
// https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf
// ingested as key `cppa-7152`, citation
// "11 CCR § 7152 (OAL-approved text, eff. 2026-01-01)".
//
// PAGINATION ARTIFACT: the canonical PDF breaks sub-paragraph (D) across
// pages 103/104 and the running header
//   "CA PRIVACY PROTECTION AGENCY – TEXT OF REGULATIONS
//    (CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations)
//    Page 104 of 127"
// sits inside the ingested text. The header is pagination, not statutory
// text, and `harm-catalogue.ts` documents its excision. This pin therefore
// asserts (D) in two contiguous halves — one on each side of the header —
// and separately asserts the header is the ONLY thing between them.
//
// AUTHORING RULE: do NOT edit a pin to make a failing corpus pass; and do NOT
// edit `harm-catalogue.ts` to make a failing pin pass. Re-ingest the corpus.
//
// Skipped when the sandbox has no direct Postgres access (PGHOST unset).

import { describe, it, expect } from "vitest";
import {
  HARM_CATALOGUE,
  HARM_CATALOGUE_CITATION,
  HARM_CATALOGUE_CORPUS_KEY,
  HARM_CATALOGUE_VERSION,
  HARM_IDS,
} from "../../../supabase/functions/_shared/ltp/analytic-deliverables/harm-catalogue";

import {
  joinHyphenLineBreaks,
  normTypography as norm,
  normCorpus,
} from "./helpers/corpus-normalize";

const PAGE_HEADER = norm(
  "CA PRIVACY PROTECTION AGENCY – TEXT OF REGULATIONS " +
    "(CCPA Updates, Cyber, Risk, ADMT, and Insurance Regulations) " +
    "Page 104 of 127",
);

/** The (D) split points, stated explicitly so the excision is auditable. */
const D_HEAD_TAIL = "acquisition or use of an online service upon their disclosure of";
const D_TAIL_HEAD = "personal information that is unnecessary to the expected";

const CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

async function loadCorpusRow(key: string): Promise<string | null> {
  const { execFileSync } = await import("node:child_process");
  const sql =
    "SELECT verbatim_excerpt FROM provision_texts " +
    `WHERE status='approved' AND key = $$${key}$$`;
  const out = execFileSync("psql", ["-tAX", "-c", sql], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const body = out.trim();
  return body ? normCorpus(body) : null;
}

describe("§ 7152(a)(5)(A)–(H) harm catalogue — structural invariants", () => {
  it("is versioned and names its corpus row", () => {
    expect(HARM_CATALOGUE_VERSION).toMatch(/item305/);
    expect(HARM_CATALOGUE_CORPUS_KEY).toBe("cppa-7152");
    expect(HARM_CATALOGUE_CITATION).toBe("11 CCR § 7152(a)(5)");
  });

  it("is the closed set (A)–(H), in order, with no gaps or extras", () => {
    expect(HARM_IDS).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(HARM_CATALOGUE).toHaveLength(8);
  });

  it("every entry carries its own pinpoint and a non-empty verbatim", () => {
    for (const h of HARM_CATALOGUE) {
      expect(h.pinpoint).toBe(`11 CCR § 7152(a)(5)(${h.id})`);
      expect(h.verbatim.trim().length).toBeGreaterThan(40);
      // The short label is a handle, never the statutory text itself.
      expect(h.label).not.toBe(h.verbatim);
    }
  });

  it("carries no pagination artifact in any verbatim string", () => {
    for (const h of HARM_CATALOGUE) {
      expect(norm(h.verbatim)).not.toContain("Page 104 of 127");
      expect(norm(h.verbatim)).not.toContain("CA PRIVACY PROTECTION AGENCY");
    }
  });
});

describe.skipIf(!CAN_RUN)("§ 7152(a)(5)(A)–(H) harm catalogue — live corpus pin", () => {
  it("the corpus row exists and is approved", async () => {
    const body = await loadCorpusRow(HARM_CATALOGUE_CORPUS_KEY);
    expect(
      body,
      `provision_texts row '${HARM_CATALOGUE_CORPUS_KEY}' absent or not approved`,
    ).toBeTruthy();
    expect((body ?? "").length).toBeGreaterThan(4000);
  }, 30_000);

  it("every catalogue verbatim is byte-exact against the corpus", async () => {
    const body = (await loadCorpusRow(HARM_CATALOGUE_CORPUS_KEY)) ?? "";

    const failures: string[] = [];
    for (const h of HARM_CATALOGUE) {
      if (h.id === "D") continue; // asserted in halves below (page-break artifact)
      if (!body.includes(norm(h.verbatim))) failures.push(`(${h.id}) ${h.label}`);
    }
    expect(
      failures,
      "Harm-catalogue entries not found verbatim in cppa-7152 " +
        "(re-ingest the corpus; do NOT edit the catalogue):\n  " +
        failures.join("\n  "),
    ).toEqual([]);
  }, 30_000);

  it("(D) matches the corpus on both sides of the page-break header", async () => {
    const body = (await loadCorpusRow(HARM_CATALOGUE_CORPUS_KEY)) ?? "";
    const d = norm(HARM_CATALOGUE.find((h) => h.id === "D")!.verbatim);

    const cut = d.indexOf(D_HEAD_TAIL);
    expect(cut, "(D) split point drifted — re-derive the excision").toBeGreaterThan(0);
    const head = d.slice(0, cut + D_HEAD_TAIL.length);
    const tailStart = d.indexOf(D_TAIL_HEAD);
    expect(tailStart, "(D) tail anchor drifted").toBeGreaterThan(cut);
    const tail = d.slice(tailStart);

    expect(body, "(D) head half not verbatim in corpus").toContain(head);
    expect(body, "(D) tail half not verbatim in corpus").toContain(tail);

    // The ONLY thing excised between the two halves is the running header.
    const between = body.slice(
      body.indexOf(head) + head.length,
      body.indexOf(tail, body.indexOf(head)),
    );
    expect(
      norm(between),
      "(D) excision removed more than the pagination header",
    ).toBe(PAGE_HEADER);
  }, 30_000);

  it("the enumerated (A)–(H) markers are all present in the corpus row", async () => {
    const body = (await loadCorpusRow(HARM_CATALOGUE_CORPUS_KEY)) ?? "";
    const missing = HARM_IDS.filter((id) => !body.includes(`(${id}) `));
    expect(missing, `sub-paragraph markers missing: ${missing.join(", ")}`).toEqual([]);
  }, 30_000);
});
