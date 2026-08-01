/**
 * ITEM 340 (PROSE PROGRAM 4 of 4) — POLISH ROLLOUT FLAGS.
 *
 * One flag per product. A flag is flipped ONLY after that product's
 * acceptance-rate report is recorded in docs/pipeline-state.md — the
 * calibration-before-rollout rule from the Item 340 dispatch.
 *
 * `dpa-generator` is OUT OF SCOPE by dispatch and carries no flag at all, so
 * no future edit can switch it on by accident.
 *
 * Products gated by the Item 245 hold keep their flag off regardless of
 * calibration; the hold outranks this file.
 */

export const POLISH_FLAGS_VERSION = "prose-polish-flags-2026-08-01-item340";

export const POLISH_PRODUCTS = [
  "cppa-risk",
  "cppa-admt",
  "cppa-cyber",
  "dpia",
  "lia",
  "governance",
  "registration",
  "ir-playbook",
  "biometric",
  "ropa",
  "eu-notice",
  "us-notice",
] as const;
export type PolishProduct = typeof POLISH_PRODUCTS[number];

export interface PolishFlag {
  /** Master switch. False = the polish stage never runs for this product. */
  readonly enabled: boolean;
  /**
   * "shadow" runs the pass and records telemetry but ALWAYS ships the
   * deterministic text. "live" ships an accepted polish. A product enters
   * shadow first, always.
   */
  readonly mode: "shadow" | "live";
  /** Ledger item that authorised the current state. */
  readonly authority: string;
  /** Acceptance rate recorded at the last calibration, or null if never run. */
  readonly last_acceptance_rate: number | null;
}

const OFF = (authority: string): PolishFlag => ({
  enabled: false,
  mode: "shadow",
  authority,
  last_acceptance_rate: null,
});

/**
 * ALL PRODUCTS OFF at landing. cppa-risk is the designated first rollout and
 * is calibrated in this turn, but its analytic sections sit on the LTP path,
 * which the **Item 245 hold** still gates — so it lands OFF too, and stays
 * off until the hold is released.
 */
export const POLISH_FLAGS: Readonly<Record<PolishProduct, PolishFlag>> = {
  "cppa-risk": OFF("Item 340 — calibrated, shadow-ready; blocked by the Item 245 hold"),
  "cppa-admt": OFF("Item 340 — not calibrated"),
  "cppa-cyber": OFF("Item 340 — not calibrated"),
  dpia: OFF("Item 340 — not calibrated"),
  lia: OFF("Item 340 — not calibrated"),
  governance: OFF("Item 340 — not calibrated"),
  registration: OFF("Item 340 — not calibrated"),
  "ir-playbook": OFF("Item 340 — not calibrated"),
  biometric: OFF("Item 340 — not calibrated"),
  ropa: OFF("Item 340 — not calibrated"),
  "eu-notice": OFF("Item 340 — not calibrated"),
  "us-notice": OFF("Item 340 — not calibrated"),
};

export function polishEnabledFor(product: string): boolean {
  const f = (POLISH_FLAGS as Record<string, PolishFlag | undefined>)[product];
  return Boolean(f?.enabled);
}

export function polishShipsFor(product: string): boolean {
  const f = (POLISH_FLAGS as Record<string, PolishFlag | undefined>)[product];
  return Boolean(f?.enabled && f.mode === "live");
}
