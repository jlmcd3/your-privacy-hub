// RC-B.1 B1.2 — DPIA item→unit mapping. Persisted on first-run inside
// report_data._staging.shared.item_unit_map (DATA-ONLY per the standing
// RLS rule; no prompt text lives in _staging). Revision-mode uses this to
// re-run ONLY the units that emitted answered items, plus U5 last.
//
// Shape: { [item_id]: "u1" | "u2" | "u3" | "u4" | "u5" }.

export type DpiaUnitId = "u1" | "u2" | "u3" | "u4" | "u5";

// Best-effort mapping from an information_needed.field to the unit that
// most likely produced it. Used at first-run freeze when the generator
// itself hasn't already recorded the origin.
const FIELD_UNIT_HINTS: Array<{ re: RegExp; unit: DpiaUnitId }> = [
  { re: /(controller|dpo|main_establishment|representative|dpia_metadata)/i, unit: "u1" },
  { re: /(processing|purpose|categor|retention|recipient|international_transfer)/i, unit: "u2" },
  { re: /(necess|proportion|legal_basis|art\.?_?6|art\.?_?9)/i, unit: "u3" },
  { re: /(risk|likelihood|severity|measure|safeguard|mitigation)/i, unit: "u4" },
  { re: /(consult|conclusion|interested_part|approval|blocker)/i, unit: "u5" },
];

export function inferUnitForField(field: string): DpiaUnitId {
  const f = String(field ?? "");
  for (const { re, unit } of FIELD_UNIT_HINTS) if (re.test(f)) return unit;
  return "u4"; // default to risk assessment; safest surface to re-touch
}

export function buildItemUnitMap(
  openItems: Array<{ id: string; target?: { path?: string } }>,
): Record<string, DpiaUnitId> {
  const out: Record<string, DpiaUnitId> = {};
  for (const it of openItems ?? []) {
    if (!it?.id) continue;
    out[it.id] = inferUnitForField(String(it.target?.path ?? ""));
  }
  return out;
}

export function mapItemsToUnits(
  answeredIds: string[],
  itemUnitMap: Record<string, DpiaUnitId | string> | null | undefined,
): { units: DpiaUnitId[]; itemsPerUnit: Record<string, string[]> } {
  const map = itemUnitMap ?? {};
  const unitsSet = new Set<DpiaUnitId>();
  const itemsPerUnit: Record<string, string[]> = {};
  for (const id of answeredIds) {
    const u = (map[id] as DpiaUnitId) ?? "u4";
    unitsSet.add(u);
    (itemsPerUnit[u] ??= []).push(id);
  }
  // Deterministic order U1..U5.
  const order: DpiaUnitId[] = ["u1", "u2", "u3", "u4", "u5"];
  const units = order.filter((u) => unitsSet.has(u));
  return { units, itemsPerUnit };
}
