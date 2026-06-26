// FORK-R1 Phase 1 — Shared registry of canonical regulator penalty figures.
// Home for figures that were previously hardcoded across multiple generators
// (IR, DPA, biometric, governance, DPIA, fetch-updates). Phase 1 wires this
// only into generate-ir-playbook (and is reachable from any other generator
// that wants to inject it via buildSystemContent's `injected` param).
//
// PRINCIPLE: every entry carries `lastVerified` + `verifyAgainst`. The
// renderer also emits the training-data guard verbatim (load-bearing per
// Team 3 review): "never state a figure not in your enforcement block; never
// use training-data figures."

export type EnforcementFigure = {
  id: string;
  authority: "ICO" | string;
  matter: string;
  year: number;
  amountFormatted: string;
  trainingTrap?: string; // common wrong figure from training data, if any
  verifyAgainst: string;
  lastVerified: string; // YYYY-MM-DD
};

export const ICO_FIGURES: EnforcementFigure[] = [
  {
    id: "ico-clearview-2022",
    authority: "ICO",
    matter: "Clearview AI",
    year: 2022,
    amountFormatted: "£7,552,800",
    trainingTrap: "£9M",
    verifyAgainst: "https://ico.org.uk/action-weve-taken/enforcement/",
    lastVerified: "2026-06-26",
  },
  {
    id: "ico-british-airways-2020",
    authority: "ICO",
    matter: "British Airways",
    year: 2020,
    amountFormatted: "£20,000,000",
    verifyAgainst: "https://ico.org.uk/action-weve-taken/enforcement/",
    lastVerified: "2026-06-26",
  },
  {
    id: "ico-interserve-2022",
    authority: "ICO",
    matter: "Interserve",
    year: 2022,
    amountFormatted: "£4,400,000",
    trainingTrap: "£5.03M",
    verifyAgainst: "https://ico.org.uk/action-weve-taken/enforcement/",
    lastVerified: "2026-06-26",
  },
  {
    id: "ico-capita-2024",
    authority: "ICO",
    matter: "Capita Pension Solutions",
    year: 2024,
    amountFormatted: "£6,090,000",
    trainingTrap: "£6.88M",
    verifyAgainst: "https://ico.org.uk/action-weve-taken/enforcement/",
    lastVerified: "2026-06-26",
  },
];

/**
 * Renderable block for injection into IR / DPA / biometric / governance / DPIA
 * system prompts. Emits ICO figures (currency = GBP £) and the training-trap
 * guard verbatim. Does not mutate any other renderer (P5).
 */
export function renderIcoPenaltyFigures(): string {
  const lines: string[] = [];
  lines.push(
    "ICO ENFORCEMENT FIGURES (authoritative — use ONLY these GBP £ amounts; never EUR):",
  );
  for (const f of ICO_FIGURES) {
    const trap = f.trainingTrap ? ` (NOT ${f.trainingTrap})` : "";
    lines.push(
      `- ${f.authority} ${f.matter} (${f.year}): ${f.amountFormatted}${trap}.`,
    );
  }
  lines.push(
    "MONETARY PENALTY GUARD: Never state a figure that is not in your ENFORCEMENT PRECEDENTS block or in this registry; never use training-data figures. If a case is relevant but no verified amount is available, write \"[fine — verify at ico.org.uk/action-weve-taken/enforcement]\" rather than estimating.",
  );
  return lines.join("\n");
}
