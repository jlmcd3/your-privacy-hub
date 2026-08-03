// ITEM 371 (2026-08-03) — CORPUS-PIN CI FOR THE CYBER AUTHORITY RESOLVER.
//
// The hand-transcribed registry is retired. The resolver re-sources
// §§ 7120–7124 from `public.provision_texts` at generation time, so this pin
// test asserts BYTE-EXACT agreement between what the resolver returns and the
// DB row: every resolved `verbatim_quote` must be a contiguous substring of the
// approved corpus excerpt for its provision (after the resolver's own
// normalization, which is the same normalization applied to the corpus here).
//
// Runs against the live corpus over the Data API. Skipped when the sandbox has
// no network/credentials — corpus-pin is a CI/dev-only guard.

import { describe, it, expect, beforeAll } from "vitest";
import {
  CYBER_AUTHORITY_LOCATORS,
  CYBER_COMPONENT_LABELS,
  resolveCyberAuthorities,
  normalizeCorpusText,
  derive7123Components,
  type CyberAuthoritySource,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/registry/cyber-verified-authorities.ts";
import { makeCorpusProvisionClient, loadCyberProvisionRows } from "./corpus-client";

let rows: Record<string, any> | null = null;
let source: CyberAuthoritySource | null = null;

beforeAll(async () => {
  rows = await loadCyberProvisionRows();
  if (rows) source = await resolveCyberAuthorities(makeCorpusProvisionClient(rows) as any);
}, 60_000);

describe("CYBER authority resolver — corpus-pin", () => {
  it("resolves every locator byte-exactly out of the DB row", () => {
    if (!source || !rows) return; // corpus unreachable — guard skipped
    expect(source.unresolved).toEqual([]);
    expect(Object.keys(source.registry).length).toBe(CYBER_AUTHORITY_LOCATORS.length);

    const failures: string[] = [];
    for (const [key, row] of Object.entries(source.registry)) {
      const loc = CYBER_AUTHORITY_LOCATORS.find((l) => l.proposition_key === key)!;
      const corpus = normalizeCorpusText(String(rows[loc.provision_key]?.verbatim_excerpt ?? ""));
      if (!corpus.includes(row.verbatim_quote)) failures.push(`${key} (${row.subsection})`);
    }
    expect(
      failures,
      `Resolved quotes not found verbatim in the corpus row:\n  ${failures.join("\n  ")}`,
    ).toEqual([]);
  });

  it("serves no text at all when a provision is unapproved (no stale fallback)", async () => {
    if (!rows) return;
    const degradedRows = JSON.parse(JSON.stringify(rows));
    degradedRows["cppa-7123"].status = "pending";
    const degraded = await resolveCyberAuthorities(makeCorpusProvisionClient(degradedRows) as any);
    expect(degraded.degraded).toBe(true);
    expect(degraded.pending_notice).toBeTruthy();
    expect(degraded.components.length).toBe(0);
    for (const row of Object.values(degraded.registry)) {
      expect(row.citation.includes("7123")).toBe(false);
    }
  });

  it("derives exactly the eighteen § 7123(c) components from the corpus", () => {
    if (!source || !rows) return;
    expect(source.components.length).toBe(18);
    for (let n = 1; n <= 18; n++) {
      expect(source.components[n - 1].citation).toBe(`11 CCR § 7123(c)(${n})`);
    }
    expect(Object.keys(source.componentCitations).length).toBe(18);
    for (const label of CYBER_COMPONENT_LABELS) {
      expect(source.componentCitations[label]).toMatch(/^11 CCR § 7123\(c\)\(\d+\)$/);
    }
    // and the derivation is a pure function of the corpus row
    const again = derive7123Components(String(rows["cppa-7123"].verbatim_excerpt));
    expect(again.map((c) => c.verbatim)).toEqual(source.components.map((c) => c.verbatim));
  });
});
