// PRODUCT PAGE REDESIGN — WAVE 1 (central sources), 2026-09-01.
//
// Single source of truth for the US state privacy-law counts that appear in
// marketing copy. Product pages previously hard-coded "all 20 states" and a
// literal pending list ("Kentucky (eff. 2026)"), both of which go stale
// silently as laws take effect.
//
// Rows mirror the `us_state_privacy_laws` registry that drives the US Notice
// Builder itself, so page copy and the builder can never disagree. Keep this
// file in sync with that table when a new state law is enacted.

export interface UsStateNoticeLaw {
  code: string;
  name: string;
  law: string;
  /** ISO date the law takes effect; null for enacted-but-unscheduled. */
  effective: string | null;
  framework: "ccpa" | "virginia_model" | "florida" | "maryland" | "pending";
  active: boolean;
}

export const US_STATE_NOTICE_LAWS: UsStateNoticeLaw[] = [
  { code: "VA", name: "Virginia", law: "VCDPA", effective: "2023-01-01", framework: "virginia_model", active: true },
  { code: "CA", name: "California", law: "CCPA/CPRA", effective: "2023-01-01", framework: "ccpa", active: true },
  { code: "CO", name: "Colorado", law: "CPA", effective: "2023-07-01", framework: "virginia_model", active: true },
  { code: "CT", name: "Connecticut", law: "CTDPA", effective: "2023-07-01", framework: "virginia_model", active: true },
  { code: "UT", name: "Utah", law: "UCPA", effective: "2023-12-31", framework: "virginia_model", active: true },
  { code: "OR", name: "Oregon", law: "OCPA", effective: "2024-07-01", framework: "virginia_model", active: true },
  { code: "TX", name: "Texas", law: "TDPSA", effective: "2024-07-01", framework: "virginia_model", active: true },
  { code: "FL", name: "Florida", law: "FDBR", effective: "2024-07-01", framework: "florida", active: true },
  { code: "MT", name: "Montana", law: "MTCDPA", effective: "2024-10-01", framework: "virginia_model", active: true },
  { code: "DE", name: "Delaware", law: "DPDPA", effective: "2025-01-01", framework: "virginia_model", active: true },
  { code: "IA", name: "Iowa", law: "ICDPA", effective: "2025-01-01", framework: "virginia_model", active: true },
  { code: "NE", name: "Nebraska", law: "NDPA", effective: "2025-01-01", framework: "virginia_model", active: true },
  { code: "NH", name: "New Hampshire", law: "NHDPA", effective: "2025-01-01", framework: "virginia_model", active: true },
  { code: "NJ", name: "New Jersey", law: "NJDPA", effective: "2025-01-15", framework: "virginia_model", active: true },
  { code: "TN", name: "Tennessee", law: "TIPA", effective: "2025-07-01", framework: "virginia_model", active: true },
  { code: "MN", name: "Minnesota", law: "MCDPA", effective: "2025-07-31", framework: "virginia_model", active: true },
  { code: "MD", name: "Maryland", law: "MODPA", effective: "2025-10-01", framework: "maryland", active: true },
  { code: "IN", name: "Indiana", law: "ICDPA", effective: "2026-01-01", framework: "virginia_model", active: true },
  { code: "RI", name: "Rhode Island", law: "RIDTPPA", effective: "2026-01-01", framework: "virginia_model", active: true },
  { code: "KY", name: "Kentucky", law: "KCDPA", effective: "2026-01-01", framework: "virginia_model", active: true },
  { code: "PA", name: "Pennsylvania", law: "Pending — CDPA", effective: null, framework: "pending", active: false },
  { code: "IL", name: "Illinois", law: "Pending — IPRA", effective: null, framework: "pending", active: false },
  { code: "MA", name: "Massachusetts", law: "Pending — MIPSA", effective: null, framework: "pending", active: false },
  { code: "NY", name: "New York", law: "Pending — NYDPA", effective: null, framework: "pending", active: false },
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Enacted state laws the builder covers (in force or scheduled). */
export function coveredStates(): UsStateNoticeLaw[] {
  return US_STATE_NOTICE_LAWS.filter((s) => s.active);
}

/** Enacted laws already in force on `asOf`. */
export function statesInEffect(asOf: Date = new Date()): UsStateNoticeLaw[] {
  return coveredStates().filter((s) => !!s.effective && s.effective <= iso(asOf));
}

/** Enacted laws not yet in force on `asOf`. */
export function statesPending(asOf: Date = new Date()): UsStateNoticeLaw[] {
  return coveredStates().filter((s) => !s.effective || s.effective > iso(asOf));
}

/** The number to use wherever copy says "all N states". */
export const US_STATE_COUNT: number = coveredStates().length;

export function usStateCount(): number {
  return US_STATE_COUNT;
}

/** e.g. "all 20 US state privacy laws" */
export function usStateCoveragePhrase(): string {
  return `all ${US_STATE_COUNT} US state privacy laws`;
}

/** e.g. ["Kentucky (eff. 2026)"] — empty once every enacted law is in force. */
export function pendingStateLabels(asOf: Date = new Date()): string[] {
  return statesPending(asOf).map((s) =>
    s.effective ? `${s.name} (eff. ${s.effective.slice(0, 4)})` : `${s.name} (enacted)`,
  );
}

/** Virginia-model states — the shared notice structure, excluding CA/FL/MD. */
export function virginiaModelStates(): UsStateNoticeLaw[] {
  return coveredStates().filter((s) => s.framework === "virginia_model");
}

export const VIRGINIA_MODEL_COUNT: number = virginiaModelStates().length;

export default US_STATE_NOTICE_LAWS;
