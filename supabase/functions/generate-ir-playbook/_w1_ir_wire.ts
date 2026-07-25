// IR-PLAYBOOK-REGISTRY-WIRING — W1 deterministic post-pass (2026-07-25).
//
// Mirrors _w1_dpa_wire.ts (item 65), _w1_governance_wire.ts (item 62),
// _w1_lia_wire.ts (items 55/56), _w1_dpia_wire.ts (item 51).
//
// Runs AFTER model generation / deterministic scrubs and BEFORE
// `runEmitGate` + P2 serializer.
//
// Contract:
//   (1) REGISTRY-FIRST: any object anywhere in the report tree carrying a
//       `proposition_key` matching a row in IR_PLAYBOOK_VERIFIED_AUTHORITIES
//       gets its citation / subsection / verbatim_quote / governing_anchor
//       overwritten with registry-verified values and `citation_verified:
//       true`. The generator never authors a citation independently for
//       these propositions.
//   (2) WRITE-AROUND: `proposition_key` on IR_PLAYBOOK_UNANCHORED_PROPOSITIONS
//       gets citation fields scrubbed to null with `citation_verified:
//       false` and `write_around: true`. NEVER surfaces "information
//       needed" for citation-resolution gaps (LEAK-PREV rule — intake
//       gaps only).
//   (3) TELEMETRY: `report._meta.internal.ir_w1 = { version, stamp,
//       strings_scanned, propositions_seen, anchored_stamped,
//       unanchored_scrubbed, unknown_keys[], reserved_skips }`. Pre-
//       existing `_meta.internal.*` (emit_gate, serializer) preserved;
//       stamp survives P2 serialization via `_meta.internal` whitelist
//       reduction (item 32 doctrine).
//
// Fail-visible / fail-safe: on internal error the report ships unchanged
// with `_meta.internal.ir_w1.crashed = true`.

import {
  IR_PLAYBOOK_VERIFIED_AUTHORITIES,
  IR_PLAYBOOK_UNANCHORED_PROPOSITIONS,
  IR_PLAYBOOK_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/ir-playbook-verified-authorities.ts";

// Fresh-clock stamp (item 52 doctrine: no forward-projecting stamps).
export const W1_IR_WIRE_STAMP = "w1-ir-wire@2026-07-25T14:50:00Z";

export interface W1IrWireCounters {
  version: string;
  stamp: string;
  strings_scanned: number;
  propositions_seen: number;
  anchored_stamped: number;
  unanchored_scrubbed: number;
  unknown_keys: string[];
  reserved_skips: number;
  crashed?: boolean;
  crash_message?: string;
}

const UNANCHORED = new Set<string>(IR_PLAYBOOK_UNANCHORED_PROPOSITIONS);

// RESERVED containers — walk INTO structural bookkeeping is skipped
// entirely: their leaves are never citation carriers.
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
  const row = IR_PLAYBOOK_VERIFIED_AUTHORITIES[key];
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

function walk(node: unknown, c: W1IrWireCounters): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const it of node) walk(it, c);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  c.strings_scanned += 1;

  const pk = obj.proposition_key;
  if (typeof pk === "string" && pk.length > 0) {
    c.propositions_seen += 1;
    if (IR_PLAYBOOK_VERIFIED_AUTHORITIES[pk]) {
      applyRegistryRow(obj, pk);
      c.anchored_stamped += 1;
    } else if (UNANCHORED.has(pk)) {
      applyWriteAround(obj);
      c.unanchored_scrubbed += 1;
    } else {
      if (!c.unknown_keys.includes(pk)) c.unknown_keys.push(pk);
    }
  }

  for (const [k, v] of Object.entries(obj)) {
    if (SKIP_SUBTREE_KEYS.has(k)) {
      c.reserved_skips += 1;
      continue;
    }
    walk(v, c);
  }
}

/**
 * Public entry. Mutates report in place; returns telemetry counters.
 * Never throws — on internal error sets crashed=true and returns.
 */
export function applyW1IrWire(report: unknown): W1IrWireCounters {
  const c: W1IrWireCounters = {
    version: IR_PLAYBOOK_VERIFIED_AUTHORITY_VERSION,
    stamp: W1_IR_WIRE_STAMP,
    strings_scanned: 0,
    propositions_seen: 0,
    anchored_stamped: 0,
    unanchored_scrubbed: 0,
    unknown_keys: [],
    reserved_skips: 0,
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
      internal.ir_w1 = { ...c };
    } catch { /* never block emission */ }
  } catch (e) {
    c.crashed = true;
    c.crash_message = (e as Error)?.message ?? String(e);
  }
  return c;
}

export const _internals = { applyRegistryRow, applyWriteAround, walk };
