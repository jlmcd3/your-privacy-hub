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

// C2-2 — Startup drift-lint for ICO_FIGURES.
//
// enforcement_actions currently lacks an entity_name column, so matter-level
// diffing is not possible. This lint therefore enforces two invariants:
//   (1) STALENESS: every ICO figure's lastVerified must be within 365 days;
//       older entries are re-verify candidates and warn loudly.
//   (2) SHAPE: amountFormatted must start with "£" (GBP-only per the guard
//       above) and parse to a positive integer amount when commas stripped.
// Never throws. Fires once per warm instance.

let _icoLinted = false;

export function verifyIcoFiguresDrift(): void {
  if (_icoLinted) return;
  _icoLinted = true;
  const now = Date.now();
  const STALENESS_MS = 365 * 24 * 60 * 60 * 1000;
  for (const f of ICO_FIGURES) {
    // (1) Staleness.
    const verifiedAt = Date.parse(f.lastVerified);
    if (Number.isNaN(verifiedAt)) {
      console.warn(`[ico-figures-drift] ${f.id}: unparseable lastVerified=${f.lastVerified}`);
    } else if (now - verifiedAt > STALENESS_MS) {
      const days = Math.floor((now - verifiedAt) / (24 * 60 * 60 * 1000));
      console.warn(`[ico-figures-drift] ${f.id}: STALE — lastVerified=${f.lastVerified} (${days} days ago); re-verify against ${f.verifyAgainst}`);
    }
    // (2) Shape.
    if (!f.amountFormatted.startsWith("£")) {
      console.warn(`[ico-figures-drift] ${f.id}: amountFormatted=${f.amountFormatted} — expected GBP £ prefix`);
    }
    const numeric = Number(f.amountFormatted.replace(/[£,]/g, ""));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      console.warn(`[ico-figures-drift] ${f.id}: amountFormatted=${f.amountFormatted} does not parse to a positive number`);
    }
  }
}

