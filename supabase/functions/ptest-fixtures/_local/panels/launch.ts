// /all-ptest fixture panel — LAUNCH helpers (pure; used by ptest-fixtures and tests).

import { PAGE_SLUG_TO_PANEL_TOOL, PANEL_BY_TOOL, isPanelTool, pickFixtures, seedFromString, seededRandom, type PanelPick, type PanelTool } from "./index.ts";

/** Page slugs (cppa_risk …) or harness ids (cppa-risk …) → panel tools, deduped, unknowns dropped. */
export function resolvePanelTools(inputs: readonly unknown[]): PanelTool[] {
  const out: PanelTool[] = [];
  for (const raw of inputs) {
    const s = String(raw ?? "").trim();
    const tool = isPanelTool(s) ? s : PAGE_SLUG_TO_PANEL_TOOL[s];
    if (tool && !out.includes(tool)) out.push(tool);
  }
  return out;
}

export interface LaunchPlan {
  readonly seed: number;
  readonly picks: PanelPick[];
  /** Products asked for that have no fixtures on the panel yet. */
  readonly empty: PanelTool[];
}

/**
 * Pick `perProduct` fixtures per product. The seed (number, or any string
 * such as a batch id) makes the pick reproducible; omitted ⇒ random seed,
 * returned so the batch can record it.
 */
export function planLaunch(tools: readonly PanelTool[], perProduct: number, seed?: number | string): LaunchPlan {
  const n = Math.max(1, Math.min(8, Math.floor(perProduct || 1)));
  const s = seed === undefined ? Math.floor(Math.random() * 0xffffffff) : typeof seed === "string" ? seedFromString(seed) : seed >>> 0;
  const picks = pickFixtures(tools, n, seededRandom(s));
  const empty = tools.filter((t) => (PANEL_BY_TOOL[t]?.length ?? 0) === 0);
  return { seed: s, picks, empty };
}

/** The request body for start-stress-batch `action: "from_fixtures"`. */
export function fromFixturesBody(runBy: string, plan: LaunchPlan, label?: string): Record<string, unknown> {
  return {
    action: "from_fixtures",
    run_by: runBy,
    label: label ?? `fixture panel · seed ${plan.seed}`,
    jobs: plan.picks.map(({ tool, fixture }) => ({
      tool_slug: tool,
      fixture_id: fixture.id,
      company_id: fixture.id,
      company_name: fixture.company,
      industry: fixture.sector,
      geo: fixture.geo,
      fixture_data: fixture.intake,
    })),
  };
}
