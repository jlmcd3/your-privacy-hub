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
  provision_key: string;    // SLUG (matches provision_texts.key); free-text preserved on `citation`
  citation?: string;        // RC-C2 C2.1 — original citation string as authored by the model
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

export function slugify(s: string, max = 40): string {
  return String(s || "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max) || "x";
}

// W3-VENDOR-2 (2026-07-22) — bridge from frozen open_items back to the live
// information_needed for source_fields lookup. buildOpenItems constructs
// `${prefix}-${slugify(field)}-${slugify(norm.key, 24)}` (see below), so we
// recover the info_needed entry by slugging each entry's `field` and matching
// against the item id. Deterministic; no fuzzy matching.
//
// Returns:
//   - the entry's `source_fields` array when it is a non-empty string array;
//   - otherwise `[entry.field]` when the entry has a non-empty `field`;
//   - `null` when no matching entry is found or when both are unusable.
export function sourceFieldsForOpenItem(
  item: { id: string },
  informationNeeded: unknown,
): string[] | null {
  if (!Array.isArray(informationNeeded)) return null;
  const id = String(item?.id ?? "");
  if (!id) return null;
  for (const raw of informationNeeded as any[]) {
    if (!raw || typeof raw !== "object") continue;
    const field = String(raw.field ?? "");
    if (!field) continue;
    const slug = slugify(field);
    // Item id embeds `-${slug}-` (there is always a provision-slug tail),
    // and for de-duped variants the tail is `-${slug}-...-<n>`.
    if (!id.includes(`-${slug}-`) && !id.endsWith(`-${slug}`)) continue;
    const sfRaw = Array.isArray(raw.source_fields) ? raw.source_fields : null;
    if (sfRaw) {
      const sf = sfRaw
        .filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0);
      if (sf.length > 0) return sf;
    }
    return [field];
  }
  return null;
}

// W3-F (2026-07-16, ratified): the "Your inputs established the surrounding
// context for '<field>'" scaffolding lead-in read as platform-internal
// mechanism-referencing prose across ALL tools (batch evidence originated
// on cppa-risk in batch 4de60a82; W3-A introduced a per-tool branch as an
// interim). This retires the branch and makes the plain missing-dimensions
// sentence the sole phrasing path for every tool. Which asks are emitted
// changes for NO tool — only how a residual is phrased.
export function creditFirstPhrasing(field: string, dimensions: string, enables: string, _toolType?: string): string {
  const dim = String(dimensions || "").trim();
  const en = String(enables || "").trim();
  const need = dim ? `The record still needs ${dim}` : `The record still needs more detail on "${field}"`;
  const tail = en ? ` to enable ${en}.` : `.`;
  return need + tail;
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
    bought_sold_shared_count: { enum_ref: "cppa_risk_assessment:bought_sold_shared_count" },
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
  // RC-C2 C2.2 — DPIA banded/enumerated intake leaves.
  dpia_framework: {
    data_categories:      { enum_ref: "dpia_framework:data_categories" },
    jurisdictions:        { enum_ref: "dpia_framework:jurisdictions" },
    legal_basis_proposed: { enum_ref: "dpia_framework:legal_basis_proposed" },
    article_9_condition:  { enum_ref: "dpia_framework:article_9_condition" },
    reasons_to_conduct:   { enum_ref: "dpia_framework:reasons_to_conduct" },
    existing_safeguards:  { enum_ref: "dpia_framework:existing_safeguards" },
    processors:           { enum_ref: "dpia_framework:processors" },
  },
  // RC-C2 C2.5 — LIA banded/enumerated intake leaves.
  li_assessment: {
    data_categories:   { enum_ref: "li_assessment:data_categories" },
    relationship_type: { enum_ref: "li_assessment:relationship_type" },
    jurisdictions:     { enum_ref: "li_assessment:jurisdictions" },
  },
  // RC-C3.CLOSE-1 — cyber controls carry a shared maturity enum. All 18
  // dotted ask paths (controls.<slug>) route to a single enum_ref so the
  // refine surface renders the maturity re-select from the intake page
  // (src/pages/CPPACybersecurity.tsx MATURITY). FROZEN rows are not
  // migrated; this only affects future first-gens.
  cppa_cybersecurity: {
    "controls.c1_auth":           { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c2_encryption":     { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c3_account_access": { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c4_inventory":      { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c5_secure_config":  { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c6_vuln_mgmt":      { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c7_audit_logs":     { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c8_network_mon":    { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c9_anti_malware":   { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c10_segmentation":  { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c11_port_protocol": { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c12_awareness":     { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c13_training":      { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c14_secure_dev":    { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c15_third_party":   { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c16_retention":     { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c17_incident":      { enum_ref: "cppa_cybersecurity:maturity" },
    "controls.c18_continuity":    { enum_ref: "cppa_cybersecurity:maturity" },
  },
};

// i3-COMPOSITION FIX — cppa_risk_assessment i3_ca_consumer_band captures a
// single band literal (CONSUMER_OPTS) and cannot express category composition
// (patients / caregivers / staff / etc). The band key stays registered as a
// re-select so historical open_items continue to resolve against
// CONSUMER_OPTS unchanged. NEW open_items about composition MUST use
// `i3_ca_consumer_band_composition`, which is routed here to `structured`.
const STRUCTURED_FIELDS: Record<string, Set<string>> = {
  cppa_risk_assessment: new Set(["i3_ca_consumer_band_composition"]),
};

// Per-tool per-field input-spec dispatch. Small, safe defaults; extend via
// T_CLASS_FIELDS as UX-1 enums grow. NEVER emit `re-select` for a field
// without a registered enum_ref — the refine surface would render a broken
// select with no options.
function pickInputSpec(toolType: string, field: string): OpenItemInputSpec {
  const f = String(field || "").trim();
  if (STRUCTURED_FIELDS[toolType]?.has(f)) {
    return { kind: "structured" };
  }
  const tClass = T_CLASS_FIELDS[toolType]?.[f];
  if (tClass) {
    return { kind: "re-select", enum_ref: tClass.enum_ref };
  }
  // N-class aggregate/narrative fields — always bounded-narrative (or structured
  // if the intake actually stores an object/array). Everything not matched
  // above falls through the heuristics below.
  const N_CLASS_HINTS: Record<string, Set<string>> = {
    cppa_risk_assessment: new Set([
      "activity_details", "activity_description", "exceptions",
      "org_context", "content_detail", "cybersecurity_audit_rationale",
    ]),
  };
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

// RC-C2 C2.1 — DPIA provision-key SLUG NORMALIZATION.
// DPIA generators author provision_key as free-text citations
// (e.g. "GDPR Art. 9(1) (special categories …); EDPB WP248 rev.01 criterion 4").
// The provision-store schema keys off short slugs (gdpr-art-9-1, edpb-wp248-c4).
// We split: primary slug → provision_key; full authored string → citation.
// Recognised patterns cover GDPR articles/recitals/paragraphs and EDPB WP248
// criteria; anything unrecognised falls through to a generic slug so nothing
// is silently discarded. Applied for DPIA only; other tools already emit slugs.
export function normalizeProvisionKey(
  rawKey: string,
  toolType: string,
): { key: string; citation?: string } {
  const raw = String(rawKey ?? "").trim();
  if (!raw || raw === "unknown") return { key: "unknown" };
  if (toolType !== "dpia_framework") return { key: raw };
  // First segment before ';' or '+' or ' / ' is the primary citation.
  const primary = raw.split(/;|\s\/\s|\s\+\s/)[0].trim();
  // GDPR Art. N(x)(y)  → gdpr-art-N-x-y
  const artMatch = primary.match(/\b(?:GDPR\s+)?Art(?:icle|\.)?\s*(\d+)([a-z]?)((?:\s*\([^)]+\))*)/i);
  if (artMatch) {
    const num = artMatch[1];
    const letter = artMatch[2] ? artMatch[2].toLowerCase() : "";
    const parens = (artMatch[3] || "").match(/\(([^)]+)\)/g) ?? [];
    const parts = parens.map((p) => p.replace(/[()\s]/g, "").toLowerCase());
    const slug = ["gdpr", "art", `${num}${letter}`, ...parts].filter(Boolean).join("-");
    return { key: slug, citation: raw };
  }
  // GDPR Recital N → gdpr-rec-N
  const recMatch = primary.match(/\bRecital\s*(\d+)/i);
  if (recMatch) return { key: `gdpr-rec-${recMatch[1]}`, citation: raw };
  // EDPB WP248 (rev.NN) criterion K → edpb-wp248-cK
  const wpMatch = primary.match(/WP\s*248[^0-9]*criterion\s*(\d+)/i);
  if (wpMatch) return { key: `edpb-wp248-c${wpMatch[1]}`, citation: raw };
  // EDPB Guidelines N/YYYY → edpb-guidelines-N-YYYY
  const gdMatch = primary.match(/EDPB\s+Guidelines?\s*(\d+)\/(\d{4})/i);
  if (gdMatch) return { key: `edpb-guidelines-${gdMatch[1]}-${gdMatch[2]}`, citation: raw };
  // Fallback: generic slug from the primary citation (bounded).
  const fallback = slugify(primary, 48) || "unknown";
  return { key: fallback, citation: raw };
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
    const rawProvision = String(e?.provision ?? e?.provision_key ?? "unknown");
    const norm = normalizeProvisionKey(rawProvision, toolType);
    const baseId = `${prefix}-${slugify(field)}-${slugify(norm.key, 24)}`;
    let id = baseId;
    let n = 1;
    while (seen.has(id)) { id = `${baseId}-${++n}`; }
    seen.add(id);
    const item: OpenItem = {
      id,
      class: cls,
      target: { kind: "field", path: field },
      why_insufficient: creditFirstPhrasing(field, String(e?.dimensions ?? ""), String(e?.enables ?? ""), toolType),
      provision_key: norm.key,
      input_spec: pickInputSpec(toolType, field),
      status: "open",
    };
    if (norm.citation && norm.citation !== norm.key) item.citation = norm.citation;
    out.push(item);
  });
  return out;
}

// i3-EMITTER FIX — cppa_risk_assessment only. When the LLM emits an ask
// targeting `i3_ca_consumer_band` but the intake has ALREADY answered the
// volume band (annual_consumer_volume / i3_ca_consumer_band non-empty), the
// real defect is that the CATEGORY MIX (patients / caregivers / staff / etc.)
// is missing — not the volume band. Rewrite the field to the composition
// key so buildOpenItems routes it to `structured` input.
//
// Historical docs are UNAFFECTED: this only rewrites information_needed
// BEFORE freeze; once open_items are frozen, no rewrite is possible.
export function isVolumeBandAnswered(intake: any): boolean {
  const candidates = [
    intake?.i3_ca_consumer_band,
    intake?.annual_consumer_volume,
    intake?.normalised_intake?.annual_consumer_volume,
    intake?.triggers?.q2_consumers,
    intake?.q2_consumers,
  ];
  return candidates.some((v) => {
    if (typeof v !== "string") return false;
    const trimmed = v.trim();
    return trimmed.length > 0 && trimmed.toLowerCase() !== "unsure";
  });
}

export function rewriteI3CompositionAsks(
  informationNeeded: unknown,
  intake: any,
): unknown {
  if (!Array.isArray(informationNeeded)) return informationNeeded;
  if (!isVolumeBandAnswered(intake)) return informationNeeded;
  let mutated = false;
  const out = informationNeeded.map((e: any) => {
    if (!e || typeof e !== "object") return e;
    if (e.field === "i3_ca_consumer_band") {
      mutated = true;
      return { ...e, field: "i3_ca_consumer_band_composition" };
    }
    return e;
  });
  return mutated ? out : informationNeeded;
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
