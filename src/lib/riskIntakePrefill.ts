/**
 * ITEM 321 (PROMPT C) — cppa-risk intake PREFILL handoff.
 *
 * The § 7156(a) follow-up panel starts a NEW cppa-risk assessment whose
 * PRIMARY activity is the secondary activity that was recommended for
 * separate assessment. The handoff rides sessionStorage (the payload can
 * contain long free text, and it must not leak into shareable URLs) plus a
 * `?prefill=1` marker so the intake page knows to consume it.
 */
export const RISK_PREFILL_KEY = "cppa_risk_intake_prefill";
export const RISK_PREFILL_PARAM = "prefill";

export interface RiskIntakePrefill {
  primary_activity_name: string;
  primary_activity_purpose: string;
  /** Assessment the recommendation came from — provenance only. */
  source_assessment_id?: string;
}

export function stashRiskPrefill(prefill: RiskIntakePrefill): void {
  try {
    sessionStorage.setItem(RISK_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    /* private-mode / quota — the intake simply starts blank. */
  }
}

/** Reads and CLEARS the prefill so a later plain visit starts blank. */
export function consumeRiskPrefill(): RiskIntakePrefill | null {
  try {
    const raw = sessionStorage.getItem(RISK_PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(RISK_PREFILL_KEY);
    const parsed = JSON.parse(raw) as Partial<RiskIntakePrefill>;
    const name = typeof parsed?.primary_activity_name === "string" ? parsed.primary_activity_name : "";
    if (!name.trim()) return null;
    return {
      primary_activity_name: name,
      primary_activity_purpose:
        typeof parsed?.primary_activity_purpose === "string" ? parsed.primary_activity_purpose : "",
      source_assessment_id:
        typeof parsed?.source_assessment_id === "string" ? parsed.source_assessment_id : undefined,
    };
  } catch {
    return null;
  }
}
