// Doc 262 §9.5 item 5b (2026-09-15) — every statute-rail hook on the CPPA Risk
// intake resolves to a defined rail entry, every anchored question carries a
// hook, and a hook nested inside another hooked block stops the focus event
// from bubbling (otherwise the ancestor's handler runs last and the rail shows
// the wrong entry). Before this pin the page referenced
// `bought_sold_shared_count` with no entry (a silent no-op on focus) and 36
// anchored questions had no hook at all, so the "How to answer well" coaching
// never appeared for them.
//
// Source-level test: the page is read as text (repo convention); the rail is
// imported so a typo in either direction fails here rather than in a
// customer's browser.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CPPA_RISK_RAIL } from "@/components/cppa/CPPARiskRailEntries";

const PAGE = readFileSync("src/pages/CPPARiskAssessment.tsx", "utf8");

const uniq = (re: RegExp) => [...new Set([...PAGE.matchAll(re)].map((m) => m[1]))];
const railKeysOnPage = () => uniq(/data-rail-key="([a-z0-9_]+)"/g);
const focusRailKeys = () => uniq(/focusRail\('([a-z0-9_]+)'\)/g);
const anchoredKeys = () => uniq(/errAnchor\("([a-z0-9_]+)"\)/g);

/**
 * JSX <div> depth scan: every hooked element that sits inside another hooked
 * element. The tag regex stops at the first ">" (an arrow function's "=>"
 * ends it early), so `after` carries the 600 characters following the tag
 * start — enough to see the element's own onFocus handler.
 */
function nestedHooks(): { key: string; inside: string; after: string }[] {
  const out: { key: string; inside: string; after: string }[] = [];
  const stack: (string | null)[] = [];
  for (const m of PAGE.matchAll(/<div\b[^>]*?(?<!\/)>|<div\b[^>]*\/>|<\/div>/gs)) {
    const t = m[0];
    if (t.startsWith("</div")) { stack.pop(); continue; }
    if (t.endsWith("/>")) continue;
    const key = /data-rail-key="([a-z0-9_]+)"/.exec(t)?.[1] ?? null;
    if (key) {
      const ancestors = stack.filter((x): x is string => Boolean(x));
      if (ancestors.length) out.push({ key, inside: ancestors[ancestors.length - 1], after: PAGE.slice(m.index, m.index + 600) });
    }
    stack.push(key);
  }
  return out;
}

describe("CPPA Risk statute rail — every hook resolves", () => {
  it("every data-rail-key on the page names a defined rail entry", () => {
    const missing = railKeysOnPage().filter((k) => !(k in CPPA_RISK_RAIL));
    expect(missing, `undefined rail keys: ${missing.join(", ")}`).toEqual([]);
  });

  it("every focusRail() call names a defined rail entry", () => {
    const missing = focusRailKeys().filter((k) => !(k in CPPA_RISK_RAIL));
    expect(missing, `undefined focusRail targets: ${missing.join(", ")}`).toEqual([]);
  });

  it("every anchored question carries a rail hook on its own anchor element", () => {
    const unhooked: string[] = [];
    for (const key of anchoredKeys()) {
      const anchor = `{...errAnchor("${key}")}`;
      const at = PAGE.indexOf(anchor);
      const tag = PAGE.slice(PAGE.lastIndexOf("<", at), PAGE.indexOf(">", at));
      if (!/data-rail-key="[a-z0-9_]+"/.test(tag)) unhooked.push(key);
    }
    expect(unhooked, `anchored questions without a rail hook: ${unhooked.join(", ")}`).toEqual([]);
  });

  it("a hook nested inside another hooked block stops the focus event from bubbling", () => {
    const leaking = nestedHooks().filter((n) => !n.after.includes(`e.stopPropagation(); focusRail('${n.key}')`));
    expect(
      leaking.map((n) => `${n.key} inside ${n.inside}`),
      "inner hooks must call e.stopPropagation() or the ancestor's entry wins",
    ).toEqual([]);
  });

  it("every rail entry has the four columns the rail renders", () => {
    for (const [key, e] of Object.entries(CPPA_RISK_RAIL)) {
      expect(e.fieldLabel.trim().length, `${key}.fieldLabel`).toBeGreaterThan(0);
      expect(e.citation.trim().length, `${key}.citation`).toBeGreaterThan(0);
      expect(e.plainSummary.trim().length, `${key}.plainSummary`).toBeGreaterThan(0);
      expect(e.regulationText.trim().length, `${key}.regulationText`).toBeGreaterThan(0);
    }
  });

  it("the doc 262 §9.5 batch never quotes law the corpus has not verified", () => {
    // Entries whose regulationText is a labelled summary say so; a quotation
    // mark inside a summary would read as verbatim. Pin the labelling.
    const summaries = Object.entries(CPPA_RISK_RAIL).filter(([, e]) => e.regulationText.startsWith("Summary of"));
    expect(summaries.length).toBeGreaterThan(0);
    for (const [key, e] of summaries) {
      expect(e.regulationText, `${key}: a summary must say the verbatim text is not in the verified corpus`).toContain("verbatim text is not in the verified corpus");
    }
  });
});
