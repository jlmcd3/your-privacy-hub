// RC-B B1 — OPEN ITEMS. Frozen after first completed generation.
// Revisions may ONLY update status and append resolutions; never add/remove/rewrite.
// Enhancement-class items NEVER become open items.

export type OpenItemClass = "verdict-blocking" | "record-completeness";
export type OpenItemStatus = "open" | "resolved" | "not_resolved";

export interface OpenItemInputSpec {
  kind: "re-select" | "structured" | "bounded-narrative" | "boolean+evidence";
  max_chars?: number; // bounded-narrative default 1200
  enum_ref?: string;  // re-select → fieldEnums key
}

export interface OpenItem {
  id: string;
  class: OpenItemClass;
  target: { kind: "field" | "narrative"; path: string };
  why_insufficient: string; // CREDIT-FIRST phrasing
  provision_key: string;
  input_spec: OpenItemInputSpec;
  status: OpenItemStatus;
  resolutions?: Array<{ at: string; verdict: "resolved" | "not_resolved"; reason: string }>;
}

const TOOL_PREFIX: Record<string, string> = {
  li_assessment: "lia",
  governance_assessment: "gov",
  dpia_framework: "dpia",
  dpa_generator: "dpa",
  ir_playbook: "ir",
  biometric_checker: "bio",
  cppa_admt: "admt",
  cppa_risk_assessment: "risk",
  cppa_cybersecurity: "cyber",
};

function slugify(s: string, max = 40): string {
  return String(s || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max) || "x";
}

// CREDIT-FIRST: state what intake DID establish before the residual.
export function creditFirstPhrasing(field: string, dimensions: string, enables: string): string {
  const dim = String(dimensions || "").trim();
  const en = String(enables || "").trim();
  const base = `Your inputs established the surrounding context for "${field}"`;
  const gap = dim ? `, but the record still needs ${dim}` : `, but the record needs more detail`;
  const tail = en ? ` to enable ${en}.` : `.`;
  return base + gap + tail;
}

// Per-tool per-field input-spec dispatch. Small, safe defaults; extend as UX-1 enums grow.
function pickInputSpec(toolType: string, field: string): OpenItemInputSpec {
  const f = String(field || "").toLowerCase();
  // Re-select: fields that map to intake enums (StructuredFieldEditor + fieldEnums).
  if (/^(q\d+_|sector|jurisdictions?|relationship_type|significant_decision_domain)/.test(f)) {
    return { kind: "re-select", enum_ref: `${toolType}:${field}` };
  }
  // Structured (array/object shapes): categories / actors / measures.
  if (/(categories|actors|measures|safeguards|recipients|transfers|systems)$/.test(f)) {
    return { kind: "structured" };
  }
  // Boolean + evidence: explicit yes/no with a short citation.
  if (/^(has_|is_|does_|can_)/.test(f)) {
    return { kind: "boolean+evidence", max_chars: 400 };
  }
  return { kind: "bounded-narrative", max_chars: 1200 };
}

function classify(entry: any): OpenItemClass | null {
  // PROPORTIONATE ASKS classes: verdict-blocking | record-completeness | enhancement
  const c = String(entry?.class ?? entry?.priority ?? "").toLowerCase();
  if (c.includes("enhance")) return null;
  if (c.includes("verdict") || c.includes("block")) return "verdict-blocking";
  if (c.includes("record") || c.includes("complete")) return "record-completeness";
  // Default: record-completeness (safe — non-blocking).
  return "record-completeness";
}

export function buildOpenItems(
  informationNeeded: unknown,
  toolType: string,
): OpenItem[] {
  const arr = Array.isArray(informationNeeded) ? informationNeeded : [];
  const prefix = TOOL_PREFIX[toolType] ?? "x";
  const out: OpenItem[] = [];
  const seen = new Set<string>();
  arr.forEach((e: any, idx: number) => {
    const cls = classify(e);
    if (!cls) return; // enhancement dropped
    const field = String(e?.field ?? e?.target ?? `item-${idx}`);
    const provision = String(e?.provision ?? e?.provision_key ?? "unknown");
    const baseId = `${prefix}-${slugify(field)}-${slugify(provision, 24)}`;
    let id = baseId;
    let n = 1;
    while (seen.has(id)) { id = `${baseId}-${++n}`; }
    seen.add(id);
    out.push({
      id,
      class: cls,
      target: { kind: "field", path: field },
      why_insufficient: creditFirstPhrasing(field, String(e?.dimensions ?? ""), String(e?.enables ?? "")),
      provision_key: provision,
      input_spec: pickInputSpec(toolType, field),
      status: "open",
    });
  });
  return out;
}

// Idempotent freeze — never overwrites an existing open_items array.
export function freezeOpenItemsOnFirstRun(
  reportData: any,
  informationNeeded: unknown,
  toolType: string,
  isRegeneration: boolean,
): any {
  if (!reportData || typeof reportData !== "object") return reportData;
  if (isRegeneration) return reportData; // never rebuild on revision
  if (Array.isArray(reportData.open_items)) return reportData;
  const items = buildOpenItems(informationNeeded ?? reportData.information_needed, toolType);
  return { ...reportData, open_items: items };
}

export interface ItemVerdict {
  item_id: string;
  verdict: "resolved" | "not_resolved";
  reason: string;
}

// FROZEN update: statuses only + resolution notes appended. Never add/remove/reshape.
export function updateOpenItemStatuses(items: OpenItem[], verdicts: ItemVerdict[]): OpenItem[] {
  if (!Array.isArray(items)) return items;
  const by = new Map(verdicts.map((v) => [v.item_id, v]));
  const now = new Date().toISOString();
  return items.map((it) => {
    const v = by.get(it.id);
    if (!v) return it;
    return {
      ...it,
      status: v.verdict === "resolved" ? "resolved" : "not_resolved",
      resolutions: [...(it.resolutions ?? []), { at: now, verdict: v.verdict, reason: v.reason }],
    };
  });
}
