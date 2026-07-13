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

// RC-C1 C1.1 — Per-tool T-class field registry. Fields listed here MUST render
// as `re-select` with options sourced from the intake page's own constants
// (never bounded-narrative for banded/enum fields). N-class (activity_details,
// exceptions, org_context, narratives) fall through to bounded-narrative.
// enum_ref values are content-anchored to src/pages/*.enums / intake constants
// via src/components/refine/fieldEnums.ts (getEnumOptions consumes them).
const T_CLASS_FIELDS: Record<string, Record<string, { enum_ref: string }>> = {
  cppa_risk_assessment: {
    q1_revenue:               { enum_ref: "cppa_risk_assessment:q1_revenue" },
    q2_consumers:             { enum_ref: "cppa_risk_assessment:q2_consumers" },
    i3_ca_consumer_band:      { enum_ref: "cppa_risk_assessment:i3_ca_consumer_band" },
    annual_consumer_volume:   { enum_ref: "cppa_risk_assessment:annual_consumer_volume" },
    q5_sell_share:            { enum_ref: "cppa_risk_assessment:q5_sell_share" },
    q5c_share_revenue_50pct:  { enum_ref: "cppa_risk_assessment:q5c_share_revenue_50pct" },
    q15_sensitive_pi:         { enum_ref: "cppa_risk_assessment:q15_sensitive_pi" },
    q15c_spi_volume:          { enum_ref: "cppa_risk_assessment:q15c_spi_volume" },
    q18_admt_use:             { enum_ref: "cppa_risk_assessment:q18_admt_use" },
    q20_admt_opt_out:         { enum_ref: "cppa_risk_assessment:q20_admt_opt_out" },
    "impact.likelihood_of_harm":     { enum_ref: "cppa_risk_assessment:impact.likelihood_of_harm" },
    "impact.severity_of_harm":       { enum_ref: "cppa_risk_assessment:impact.severity_of_harm" },
    "impact.benefits_outweigh_risks":{ enum_ref: "cppa_risk_assessment:impact.benefits_outweigh_risks" },
    "impact.cybersecurity_gaps_identified": { enum_ref: "cppa_risk_assessment:impact.cybersecurity_gaps_identified" },
    "triggers.q1_revenue":     { enum_ref: "cppa_risk_assessment:q1_revenue" },
    "triggers.q2_consumers":   { enum_ref: "cppa_risk_assessment:q2_consumers" },
    "triggers.q5_sell_share":  { enum_ref: "cppa_risk_assessment:q5_sell_share" },
    "triggers.q15_sensitive_pi": { enum_ref: "cppa_risk_assessment:q15_sensitive_pi" },
    "triggers.q18_admt_use":   { enum_ref: "cppa_risk_assessment:q18_admt_use" },
  },
};

// N-class aggregate/narrative fields — always bounded-narrative (or structured
// if the intake actually stores an object/array). Kept for documentation +
// deliberate audit: everything not in T_CLASS_FIELDS routes here.
const N_CLASS_HINTS: Record<string, Set<string>> = {
  cppa_risk_assessment: new Set([
    "activity_details", "activity_description", "exceptions",
    "org_context", "content_detail", "cybersecurity_audit_rationale",
  ]),
};

// Per-tool per-field input-spec dispatch. Small, safe defaults; extend via
// T_CLASS_FIELDS as UX-1 enums grow. NEVER emit `re-select` for a field
// without a registered enum_ref — the refine surface would render a broken
// select with no options.
function pickInputSpec(toolType: string, field: string): OpenItemInputSpec {
  const f = String(field || "").trim();
  const tClass = T_CLASS_FIELDS[toolType]?.[f];
  if (tClass) {
    return { kind: "re-select", enum_ref: tClass.enum_ref };
  }
  // Legacy heuristic: intake enum fields that carry the standard qN_/sector/
  // jurisdictions naming AND that we haven't registered yet still get
  // re-select with a computed enum_ref (safe when the enum is added later).
  if (/^(sector|jurisdictions?|relationship_type|significant_decision_domain)$/.test(f)) {
    return { kind: "re-select", enum_ref: `${toolType}:${f}` };
  }
  // Structured (array/object shapes): categories / actors / measures.
  if (/(categories|actors|measures|safeguards|recipients|transfers|systems)$/.test(f)) {
    return { kind: "structured" };
  }
  // Boolean + evidence: explicit yes/no with a short citation.
  if (/^(has_|is_|does_|can_)/.test(f)) {
    return { kind: "boolean+evidence", max_chars: 400 };
  }
  // N-class fall-through: aggregates / narratives — bounded-narrative 1200.
  const _nHint = N_CLASS_HINTS[toolType]?.has(f); // documented no-op for audit
  void _nHint;
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

// RC-C1 C1.3 — IDENTITY IMMUTABILITY. Belt-and-braces: even if the upstream
// insufficient-info-guard misses a locked/identity re-ask, the builder MUST
// NOT construct an open_item that targets one. Keys mirror
// LOCKED_FIELDS_MAP + the shared IDENTITY_FIELDS set.
const IDENTITY_LOCKED_FIELDS: Record<string, Set<string>> = {
  cppa_risk_assessment: new Set([
    "entity_name", "subject_anchor", "company_name", "organization_name",
    "q1_revenue", "q2_consumers", "q3_sector", "sector",
    "significant_decision_domain", "system_name",
  ]),
  cppa_admt: new Set([
    "entity_name", "subject_anchor", "organization_name", "system_name",
    "system_type", "significant_decision_domain",
  ]),
  cppa_cybersecurity: new Set(["entity_name", "subject_anchor", "organization_name"]),
  li_assessment: new Set(["organization_name", "subject_anchor", "relationship_type", "jurisdictions", "data_categories"]),
  governance_assessment: new Set(["organization_name", "jurisdiction"]),
  dpia_framework: new Set(["organization_name", "name", "jurisdictions"]),
  ir_playbook: new Set(["organizationName", "organisationType", "jurisdictions"]),
  biometric_checker: new Set(["orgName", "biometricTypes", "jurisdictions", "purpose"]),
  dpa_generator: new Set(["controllerName", "controllerJurisdiction", "processorName", "processorJurisdiction"]),
};

function fieldRootLocked(toolType: string, field: string): boolean {
  const set = IDENTITY_LOCKED_FIELDS[toolType];
  if (!set) return false;
  const root = String(field || "").split(/[.\[]/, 1)[0].trim();
  return set.has(field) || set.has(root);
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
    // RC-C1 C1.3 — belt-and-braces identity/locked guard at construction.
    if (fieldRootLocked(toolType, field)) {
      console.warn(JSON.stringify({ evt: "open_item_locked_field_stripped", tool: toolType, field }));
      return;
    }
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
