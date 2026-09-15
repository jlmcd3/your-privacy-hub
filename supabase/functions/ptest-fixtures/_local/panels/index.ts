// /all-ptest fixture panel — registry and random selection.
//
// Importable only by the function that needs the fixtures (ptest-fixtures);
// the panels are ~2 MB of source and must not ride in any other bundle.

import { PANEL_SIZE, PANEL_TOOLS, type PanelFixture, type PanelTool } from "./types.ts";
import { PANEL_CPPA_RISK } from "./cppa-risk.ts";
import { PANEL_CPPA_CYBER } from "./cppa-cyber.ts";
import { PANEL_CPPA_ADMT } from "./cppa-admt.ts";
import { PANEL_DPIA } from "./dpia.ts";
import { PANEL_LIA } from "./lia.ts";
import { PANEL_GOVERNANCE } from "./governance.ts";
import { PANEL_IR_PLAYBOOK } from "./ir-playbook.ts";
import { PANEL_BIOMETRIC } from "./biometric.ts";
import { PANEL_DPA } from "./dpa.ts";
import { PANEL_ROPA } from "./ropa.ts";
import { PANEL_US_NOTICE } from "./us-notice.ts";
import { PANEL_EU_NOTICE } from "./eu-notice.ts";
import { PANEL_REGISTRATION } from "./registration.ts";

export type { PanelFixture, PanelTool } from "./types.ts";
export { PAGE_SLUG_TO_PANEL_TOOL, PANEL_SIZE, PANEL_TOOL_GEO, PANEL_TOOLS } from "./types.ts";

export const PANEL_BY_TOOL: Readonly<Record<PanelTool, readonly PanelFixture[]>> = {
  "cppa-risk": PANEL_CPPA_RISK,
  "cppa-cyber": PANEL_CPPA_CYBER,
  "cppa-admt": PANEL_CPPA_ADMT,
  "dpia": PANEL_DPIA,
  "lia": PANEL_LIA,
  "governance": PANEL_GOVERNANCE,
  "ir-playbook": PANEL_IR_PLAYBOOK,
  "biometric": PANEL_BIOMETRIC,
  "dpa": PANEL_DPA,
  "ropa": PANEL_ROPA,
  "us-notice": PANEL_US_NOTICE,
  "eu-notice": PANEL_EU_NOTICE,
  "registration": PANEL_REGISTRATION,
};

export function isPanelTool(x: unknown): x is PanelTool {
  return typeof x === "string" && (PANEL_TOOLS as readonly string[]).includes(x);
}

/** A seedable PRNG (mulberry32) so a pick can be reproduced from its seed. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Numeric seed from any string (FNV-1a), so a batch id can seed a pick. */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export interface PanelPick {
  readonly tool: PanelTool;
  readonly fixture: PanelFixture;
}

/**
 * Pick `perProduct` distinct fixtures at random from each requested product's
 * panel. `rng` defaults to Math.random; pass seededRandom(...) to reproduce.
 */
export function pickFixtures(
  tools: readonly PanelTool[],
  perProduct = 1,
  rng: () => number = Math.random,
): PanelPick[] {
  const out: PanelPick[] = [];
  for (const tool of tools) {
    const pool = [...(PANEL_BY_TOOL[tool] ?? [])];
    const n = Math.max(0, Math.min(perProduct, pool.length));
    // Partial Fisher–Yates: the first n positions are a uniform random sample.
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(rng() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
      out.push({ tool, fixture: pool[i] });
    }
  }
  return out;
}

/** Catalogue view (no intakes) for the page. */
export function panelCatalogue(): Array<{ tool: PanelTool; size: number; expected: number; fixtures: Array<{ id: string; label: string; company: string; sector: string; geo: string }> }> {
  return PANEL_TOOLS.map((tool) => ({
    tool,
    size: PANEL_BY_TOOL[tool].length,
    expected: PANEL_SIZE,
    fixtures: PANEL_BY_TOOL[tool].map((f) => ({ id: f.id, label: f.label, company: f.company, sector: f.sector, geo: f.geo })),
  }));
}

/** The static_stress_jobs rows a set of picks becomes (pure; the launch action inserts them). */
export function fixtureJobRows(batchId: string, picks: readonly PanelPick[]): Record<string, unknown>[] {
  return picks.map(({ tool, fixture }) => ({
    batch_id: batchId,
    company_id: fixture.id,
    company_name: fixture.company,
    industry: fixture.sector,
    geo: fixture.geo,
    tool_slug: tool,
    fixture_data: fixture.intake,
    status: "pending",
  }));
}
