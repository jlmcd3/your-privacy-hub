// DOC 272 §9 "Offline twin" — renders every panel fixture for every wired
// tool through `renderOffline` (no database, no network, no environment
// secrets) and asserts the structural minimum doc 272 §6.1 grades on: the
// document renders at all, carries no placeholder/undefined/NaN leak, names
// the fixture's own company, and is deterministic (two renders of the same
// fixture hash identically — doc 272 §6.6).
//
// This is NOT the grading battery itself (`product-test-grade`, doc 272 §6)
// — it is the pre-deploy smoke gate the grading battery's offline twin
// stands on: nothing here can render if the chain in dispatcher.ts is wrong.
//
// One Deno.test per wired tool, iterating its fifteen fixtures inside so a
// single failing fixture never hides the other fourteen.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PANEL_BY_TOOL, PANEL_SIZE, type PanelTool } from "../../../../src/lib/ptestPanels/index.ts";
import { renderOffline, WIRED_TOOLS, type WiredTool } from "./dispatcher.ts";

const DATE = "2026-09-18";

/** The intake key that carries the fixture's own named entity, per tool. */
const COMPANY_KEY: Record<WiredTool, string[]> = {
  "cppa-risk": ["entity_name"],
  "cppa-cyber": ["profile.entity_name"],
  "cppa-admt": ["organization_name"],
  "dpia": ["organization_name"],
  "lia": ["organization_name"],
  "governance": ["organization_name"],
};

const PLACEHOLDER_PATTERNS: ReadonlyArray<{ label: string; re: RegExp }> = [
  { label: "undefined", re: /\bundefined\b/ },
  { label: "[object Object]", re: /\[object Object\]/ },
  { label: "NaN", re: /\bNaN\b/ },
  { label: "unfilled {slot}", re: /\{[A-Za-z0-9_]+\}/ },
];

for (const tool of WIRED_TOOLS) {
  const panel = PANEL_BY_TOOL[tool as PanelTool];

  Deno.test(`render-all [${tool}] — every panel fixture renders offline, clean, deterministic, and names its own company`, async () => {
    assertEquals(panel.length, PANEL_SIZE, `${tool}: expected ${PANEL_SIZE} panel fixtures, found ${panel.length}`);

    for (const fixture of panel) {
      const intake = fixture.intake as Record<string, unknown>;

      let result;
      try {
        result = await renderOffline(tool, intake, DATE);
      } catch (e) {
        throw new Error(`${fixture.id}: renderOffline threw: ${(e as Error)?.message ?? String(e)}`);
      }
      assert(result.document, `${fixture.id}: no skeleton_document produced`);
      assert(result.text.length > 0, `${fixture.id}: reviewer text is empty`);

      for (const { label, re } of PLACEHOLDER_PATTERNS) {
        const m = result.text.match(re);
        assert(!m, `${fixture.id}: reviewer text contains ${label}${m ? ` ("${result.text.slice(Math.max(0, (m.index ?? 0) - 40), (m.index ?? 0) + 40)}")` : ""}`);
      }

      const second = await renderOffline(tool, intake, DATE);
      assertEquals(second.hash, result.hash, `${fixture.id}: two renders of the same fixture diverged (non-deterministic)`);

      assert(
        result.text.includes(fixture.company),
        `${fixture.id}: reviewer text does not contain the fixture's own company ("${fixture.company}")`,
      );

      // Sanity: the company key the panel gate itself checks (panels.test.ts
      // COMPANY_KEY) really does carry that same name on this fixture.
      const key = COMPANY_KEY[tool][0];
      const named = key.split(".").reduce<unknown>((cur, p) => (cur && typeof cur === "object" ? (cur as Record<string, unknown>)[p] : undefined), intake);
      assertEquals(String(named ?? "").trim(), fixture.company, `${fixture.id}: intake.${key} does not equal fixture.company`);
    }
  });
}
