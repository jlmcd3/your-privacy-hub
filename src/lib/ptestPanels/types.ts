// /all-ptest — THE FIXTURE PANEL (CEO instruction 2026-09-14): fifteen
// complete, internally consistent dummy intakes per product sold on
// enduserprivacy.com. A product test at /all-ptest picks ONE fixture per
// product at random from its panel (see src/lib/ptestPanels) and runs
// the stress harness on it — the same generation path as the Claude-intake
// mode, with a fixed, reviewable input.
//
// A panel fixture is the exact object the stress harness accepts as
// `static_stress_jobs.fixture_data` for its tool (what
// generate-stress-fixtures returns under TOOL_FIXTURE_KEY[tool]), so
// run-stress-job's per-tool arm consumes it unchanged.
//
// "Perfect" means: every contract field a real organisation could answer is
// answered, every enum value is a verbatim form option, and nothing in the
// record contradicts anything else in it. tests/edge/ptest/panels.test.ts
// enforces the checkable part of that.

/** The stress-harness tool ids, i.e. run-stress-job's `job.tool_slug`. */
export const PANEL_TOOLS = [
  "cppa-risk",
  "cppa-cyber",
  "cppa-admt",
  "dpia",
  "lia",
  "governance",
  "ir-playbook",
  "biometric",
  "dpa",
  "ropa",
  "us-notice",
  "eu-notice",
  "registration",
] as const;

export type PanelTool = typeof PANEL_TOOLS[number];

/** Which geo each tool's harness arm serves (start-stress-batch ALL_TOOLS). */
export const PANEL_TOOL_GEO: Readonly<Record<PanelTool, "us" | "eu" | "both">> = {
  "cppa-risk": "us",
  "cppa-cyber": "us",
  "cppa-admt": "us",
  "dpia": "eu",
  "lia": "eu",
  "governance": "eu",
  "ir-playbook": "both",
  "biometric": "both",
  "dpa": "both",
  "ropa": "eu",
  "us-notice": "us",
  "eu-notice": "eu",
  "registration": "eu",
};

/** /all-ptest page slugs (sampleFixtures ToolSlug) → panel tool ids. */
export const PAGE_SLUG_TO_PANEL_TOOL: Readonly<Record<string, PanelTool>> = {
  cppa_risk: "cppa-risk",
  cppa_cyber: "cppa-cyber",
  cppa_admt: "cppa-admt",
  dpia: "dpia",
  li_assessment: "lia",
  governance: "governance",
  ir_playbook: "ir-playbook",
  biometric: "biometric",
  dpa: "dpa",
  ropa: "ropa",
  us_notice: "us-notice",
  eu_notice: "eu-notice",
  registration: "registration",
};

export interface PanelFixture {
  /** `${tool}-p${NN}-${slug}`, NN = 01..15, unique across the whole panel set. */
  readonly id: string;
  readonly tool: PanelTool;
  /** One line a reviewer recognises the scenario by. */
  readonly label: string;
  /** The named legal entity in the intake (must equal the intake's own entity/organisation name). */
  readonly company: string;
  /** Sector in plain words (for the run log and the stress job's `industry`). */
  readonly sector: string;
  /** The company's geo for the harness (`us` | `eu`); must be allowed by PANEL_TOOL_GEO. */
  readonly geo: "us" | "eu";
  /** Two or three sentences describing the scenario and the branches it exercises. */
  readonly summary: string;
  /** The harness fixture, verbatim. */
  readonly intake: Record<string, unknown>;
}

export const PANEL_SIZE = 15;
