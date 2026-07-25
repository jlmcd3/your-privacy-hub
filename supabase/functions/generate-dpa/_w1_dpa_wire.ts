// DPA-REGISTRY-WIRING — W1 deterministic post-pass (2026-07-25).
//
// Mirrors _w1_dpia_wire.ts / _w1_lia_wire.ts / _w1_governance_wire.ts
// (ledger items 51 / 55–56 / 62). Runs AFTER all model generation and
// scrubs and BEFORE `runEmitGate` + the P2 serializer.
//
// Contract:
//   (1) REGISTRY-FIRST: any object anywhere in the report tree carrying a
//       `proposition_key` matching a row in DPA_VERIFIED_AUTHORITIES gets
//       its citation / subsection / verbatim_quote / governing_anchor
//       overwritten with registry-verified values and `citation_verified:
//       true`. The generator never authors a citation independently for
//       these propositions.
//   (2) WRITE-AROUND: objects whose `proposition_key` is on
//       DPA_UNANCHORED_PROPOSITIONS get citation fields scrubbed to null
//       with `citation_verified: false` and `write_around: true`. NEVER
//       surfaces "information needed" for citation-resolution gaps (RULE
//       2.7 S1 — intake gaps only, customer-question phrased).
//   (3) TELEMETRY: `report._meta.internal.dpa_w1 = { version, walked,
//       resolved, unanchored_scrubbed, unresolved_keys[], stamp }`.
//       Pre-existing `_meta.internal.*` (emit_gate, etc.) preserved;
//       stamp survives P2 serialization via the `_meta.internal`
//       whitelist reduction (item 32 doctrine).
//
// Fail-visible / fail-safe: on internal error the report ships unchanged
// with `_meta.internal.dpa_w1.crashed = true`.

import {
  DPA_VERIFIED_AUTHORITIES,
  DPA_UNANCHORED_PROPOSITIONS,
  DPA_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/dpa-verified-authorities.ts";

// Fresh-clock stamp (item 52 doctrine: no forward-projecting stamps).
export const W1_DPA_WIRE_STAMP = "w1-dpa-wire@2026-07-25T14:18:00Z";

export interface W1DpaWireCounters {
  version: string;
  stamp: string;
  walked: number;
  resolved: number;
  unanchored_scrubbed: number;
  unresolved_keys: string[];
  crashed?: boolean;
  crash_message?: string;
}

const UNANCHORED = new Set<string>(DPA_UNANCHORED_PROPOSITIONS);

// RESERVED containers — walk INTO them (they are structural) but never
// treat their own leaf strings as citation carriers.
const SKIP_SUBTREE_KEYS = new Set<string>([
  "_meta",
  "_staging",
  "_drafting_record",
  "_normalized_intake",
  "_revision",
  "deterministic_checks",
  "annotations",
  "lint_warnings",
  "engagement_map",
  "enforcement_meta",
  "enforcement_precedents",
  "enforcement_context",
  "citation_ledger",
]);

function applyRegistryRow(node: Record<string, unknown>, key: string): void {
  const row = DPA_VERIFIED_AUTHORITIES[key];
  if (!row) return;
  node.citation = row.citation;
  node.subsection = row.subsection;
  node.verbatim_quote = row.verbatim_quote;
  node.governing_anchor = row.governing_anchor;
  node.citation_verified = true;
}

function applyWriteAround(node: Record<string, unknown>): void {
  node.citation = null;
  node.subsection = null;
  node.verbatim_quote = null;
  node.governing_anchor = null;
  node.citation_verified = false;
  node.write_around = true;
}

function walk(node: unknown, c: W1DpaWireCounters): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const it of node) walk(it, c);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  c.walked += 1;

  const pk = obj.proposition_key;
  if (typeof pk === "string" && pk.length > 0) {
    if (DPA_VERIFIED_AUTHORITIES[pk]) {
      applyRegistryRow(obj, pk);
      c.resolved += 1;
    } else if (UNANCHORED.has(pk)) {
      applyWriteAround(obj);
      c.unanchored_scrubbed += 1;
    } else {
      if (!c.unresolved_keys.includes(pk)) c.unresolved_keys.push(pk);
    }
  }

  for (const [k, v] of Object.entries(obj)) {
    if (SKIP_SUBTREE_KEYS.has(k)) continue;
    walk(v, c);
  }
}

/**
 * Public entry. Mutates report in place; returns telemetry counters.
 * Never throws — on internal error sets crashed=true and returns.
 */
export function applyW1DpaWire(report: unknown): W1DpaWireCounters {
  const c: W1DpaWireCounters = {
    version: DPA_VERIFIED_AUTHORITY_VERSION,
    stamp: W1_DPA_WIRE_STAMP,
    walked: 0,
    resolved: 0,
    unanchored_scrubbed: 0,
    unresolved_keys: [],
  };
  try {
    if (report && typeof report === "object") walk(report, c);
    try {
      const r = report as Record<string, unknown>;
      const meta = (r._meta = (r._meta && typeof r._meta === "object")
        ? r._meta as Record<string, unknown>
        : {});
      const internal = (meta.internal =
        (meta.internal && typeof meta.internal === "object")
          ? meta.internal as Record<string, unknown>
          : {});
      internal.dpa_w1 = { ...c };
    } catch { /* never block emission */ }
  } catch (e) {
    c.crashed = true;
    c.crash_message = (e as Error)?.message ?? String(e);
  }
  return c;
}

export const _internals = { applyRegistryRow, applyWriteAround, walk };
