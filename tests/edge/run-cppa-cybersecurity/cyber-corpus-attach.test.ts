// C1.3 (doc 67 §2) — attachCyberCorpus over the LIVE Wave-C3 CAM. No
// fixture map: the real cyber-corpus-map.ts is the thing under test, same
// discipline as the corpus battery's own pin tests.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachCyberCorpus } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-corpus-attach.ts";
import { CYBER_7123_COMPONENTS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";
import { CYBER_CORPUS_MAP, CYBER_S4_FRAMES } from "../../../supabase/functions/_shared/corpus/maps/cyber-corpus-map.ts";

Deno.test("attachCyberCorpus — one entry per rendered component, all 18 by default", () => {
  const all = attachCyberCorpus();
  assertEquals(all.length, 18);
  assertEquals(all.map((e) => e.slug), CYBER_7123_COMPONENTS.map((c) => c.slug));
  for (const e of all) assert(e.commentary.length >= 1, `${e.slug} has no commentary`);
});

Deno.test("attachCyberCorpus — respects a partial renderedSlugs set", () => {
  const one = attachCyberCorpus(new Set(["c1_auth"]));
  assertEquals(one.length, 1);
  assertEquals(one[0].slug, "c1_auth");
});

Deno.test("attachCyberCorpus — zero-row components (c4, c11, c18) get F_GEN verbatim, no others do", () => {
  const all = attachCyberCorpus();
  const s4Factors = new Set(
    CYBER_CORPUS_MAP.rows.filter((r) => r.render_surface === "S4" && r.role === "FC").map((r) => r.factor_id),
  );
  for (const comp of CYBER_7123_COMPONENTS) {
    const entry = all.find((e) => e.slug === comp.slug)!;
    const hasRows = s4Factors.has(comp.label) || s4Factors.has(comp.prior_label);
    if (hasRows) {
      assert(
        !entry.commentary.some((c) => c === CYBER_S4_FRAMES.F_GEN),
        `${comp.slug} has S4 rows but still got F_GEN`,
      );
    } else {
      assertEquals(entry.commentary, [CYBER_S4_FRAMES.F_GEN], `${comp.slug} should be F_GEN-only`);
    }
  }
});

Deno.test("attachCyberCorpus — every component with rows carries its OWN citation, never a neighbor's", () => {
  const all = attachCyberCorpus();
  for (const e of all) {
    if (e.commentary[0] === CYBER_S4_FRAMES.F_GEN) continue;
    for (const c of e.commentary) {
      assert(c.includes(e.citation), `${e.slug}: commentary does not cite ${e.citation}\n${c}`);
      // No other component's citation should appear (catches a mis-keyed row).
      for (const other of CYBER_7123_COMPONENTS) {
        if (other.slug === e.slug) continue;
        assert(
          !c.includes(other.citation) || other.citation === e.citation,
          `${e.slug}: commentary wrongly cites ${other.citation}\n${c}`,
        );
      }
    }
  }
});

Deno.test("attachCyberCorpus — bridged rows carry the F_BRIDGE caveat, non-bridged rows never do", () => {
  const all = attachCyberCorpus();
  const s4Rows = CYBER_CORPUS_MAP.rows.filter((r) => r.render_surface === "S4" && r.role === "FC");
  for (const row of s4Rows) {
    const comp = CYBER_7123_COMPONENTS.find((c) => c.label === row.factor_id || c.prior_label === row.factor_id);
    assert(comp, `no component matches CAM factor_id "${row.factor_id}"`);
    const entry = all.find((e) => e.slug === comp!.slug)!;
    const bridged = row.curation_note.includes("F-BRIDGE");
    const matching = entry.commentary.find((c) => c.includes(row.pinned_excerpt.slice(0, 60)));
    assert(matching, `${comp!.slug}: no rendered commentary matches row ${row.id}`);
    if (bridged) {
      assert(matching.includes("the final regulation locates this component at"), `${row.id} should carry the bridge caveat`);
    } else {
      assert(!matching.includes("references the proposal's numbering"), `${row.id} should NOT carry the bridge caveat`);
    }
  }
});

Deno.test("attachCyberCorpus — every CAM factor_id resolves to exactly one component (no orphan, no ambiguity)", () => {
  const s4Rows = CYBER_CORPUS_MAP.rows.filter((r) => r.render_surface === "S4" && r.role === "FC");
  for (const row of s4Rows) {
    const matches = CYBER_7123_COMPONENTS.filter((c) => c.label === row.factor_id || c.prior_label === row.factor_id);
    assertEquals(matches.length, 1, `factor_id "${row.factor_id}" (row ${row.id}) matched ${matches.length} components`);
  }
});

Deno.test("attachCyberCorpus — is pure: two calls over the same input are byte-identical", () => {
  const a = JSON.stringify(attachCyberCorpus());
  const b = JSON.stringify(attachCyberCorpus());
  assertEquals(a, b);
});
