// DOC 217 §4 — per-leg code checks and the two-leg merge.

import type { InventoryRow } from "./prompts.ts";

export interface LegReading {
  prop_id: string;
  stance: "asserted" | "abstain";
  evidence_span: string | null;
  confidence: number;
  span_verified: boolean;
}

export interface MergedReading {
  prop_id: string;
  label: string;
  stance: "asserted" | "abstain";
  evidence_span: string | null;
  confidence: number;
  legs_agree: boolean;
  span_verified: boolean;
}

/** Byte-substring check over the UTF-8 encodings. */
export function isByteSubstring(span: string, answer: string): boolean {
  const enc = new TextEncoder();
  const s = enc.encode(span);
  const a = enc.encode(answer);
  if (s.length === 0 || s.length > a.length) return false;
  outer: for (let i = 0; i + s.length <= a.length; i++) {
    for (let j = 0; j < s.length; j++) if (a[i + j] !== s[j]) continue outer;
    return true;
  }
  return false;
}

/**
 * Verifies one leg: unknown prop_ids dropped; an assertion without a verbatim
 * span becomes an abstention; within a sibling_group more than one assertion
 * abstains the WHOLE group.
 */
export function verifyLeg(
  raw: unknown,
  inventory: InventoryRow[],
  answer: string,
): Map<string, LegReading> {
  const byId = new Map(inventory.map((p) => [p.prop_id, p]));
  const out = new Map<string, LegReading>();
  const items = Array.isArray((raw as { readings?: unknown })?.readings)
    ? (raw as { readings: unknown[] }).readings
    : [];

  for (const it of items) {
    const o = (it ?? {}) as Record<string, unknown>;
    const prop_id = typeof o.prop_id === "string" ? o.prop_id : "";
    if (!byId.has(prop_id) || out.has(prop_id)) continue;
    const span = typeof o.evidence_span === "string" && o.evidence_span.length > 0
      ? o.evidence_span
      : null;
    const wantsAsserted = o.stance === "asserted";
    const span_verified = span !== null && isByteSubstring(span, answer);
    const asserted = wantsAsserted && span_verified;
    out.set(prop_id, {
      prop_id,
      stance: asserted ? "asserted" : "abstain",
      evidence_span: asserted ? span : null,
      confidence: typeof o.confidence === "number" ? o.confidence : 0,
      span_verified: wantsAsserted ? span_verified : true,
    });
  }

  // Sibling exclusivity.
  const groups = new Map<string, string[]>();
  for (const [prop_id, r] of out) {
    const g = byId.get(prop_id)?.sibling_group;
    if (!g || r.stance !== "asserted") continue;
    groups.set(g, [...(groups.get(g) ?? []), prop_id]);
  }
  for (const [g, ids] of groups) {
    if (ids.length <= 1) continue;
    for (const p of inventory.filter((x) => x.sibling_group === g)) {
      const r = out.get(p.prop_id);
      if (r) out.set(p.prop_id, { ...r, stance: "abstain", evidence_span: null });
    }
  }

  // Every inventory proposition gets a reading.
  for (const p of inventory) {
    if (!out.has(p.prop_id)) {
      out.set(p.prop_id, {
        prop_id: p.prop_id,
        stance: "abstain",
        evidence_span: null,
        confidence: 0,
        span_verified: true,
      });
    }
  }
  return out;
}

/** Asserted only when BOTH legs assert the same prop_id with verified spans. */
export function mergeLegs(
  primary: Map<string, LegReading>,
  second: Map<string, LegReading>,
  inventory: InventoryRow[],
): MergedReading[] {
  return inventory.map((p) => {
    const a = primary.get(p.prop_id);
    const b = second.get(p.prop_id);
    const agree = !!a && !!b && a.stance === b.stance;
    const asserted = !!a && !!b && a.stance === "asserted" && b.stance === "asserted";
    return {
      prop_id: p.prop_id,
      label: p.label,
      stance: asserted ? "asserted" : "abstain",
      evidence_span: asserted ? (a!.evidence_span ?? b!.evidence_span) : null,
      confidence: asserted ? Math.min(a!.confidence, b!.confidence) : 0,
      legs_agree: agree,
      span_verified: asserted,
    };
  });
}
