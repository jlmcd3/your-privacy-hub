// LIA-REGISTRY-WIRING — W1 deterministic post-pass (2026-07-25).
//
// Mirrors run-dpia-framework/_w1_dpia_wire.ts pattern (ledger item 51).
// Runs AFTER all model generation / stitching / engagement-map passes and
// BEFORE `runEmitGate` + P2 serializer.
//
// Contract:
//   (1) REGISTRY-FIRST: any object anywhere in the report that carries a
//       `proposition_key` matching a row in LIA_VERIFIED_AUTHORITIES gets
//       its `citation` / `subsection` / `verbatim_quote` / `governing_anchor`
//       overwritten with the registry-verified verbatim values. The generator
//       may never author a citation independently for these propositions.
//   (2) WRITE-AROUND: objects whose `proposition_key` is on the
//       LIA_UNANCHORED_PROPOSITIONS list get the write-around treatment —
//       any invented `citation` / `subsection` / `verbatim_quote` is scrubbed
//       to null so the customer surface never carries a paraphrased or
//       fabricated pinpoint for the item-52 unanchorable list. `information
//       _needed` is NEVER surfaced for citation-resolution gaps (per dispatch
//       and per RULE 2.7 S1 — intake gaps only).
//   (3) TELEMETRY: writes `report._meta.internal.lia_w1 = { version,
//       stamp, registry_hits, write_around_hits, unresolved_keys[],
//       nodes_scanned }`. Never surfaces to the customer — P2 serializer
//       preserves `_meta.internal` verbatim; digests can confirm build-of-
//       record from doc telemetry (wave-21 admt telemetry gap lesson,
//       ledger items 47/49).
//
// Fail-visible: on internal error the report is returned unchanged with
// `_meta.internal.lia_w1.crashed = true`; availability is never blocked.

import {
  LIA_VERIFIED_AUTHORITIES,
  LIA_UNANCHORED_PROPOSITIONS,
  LIA_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/lia-verified-authorities.ts";

export const W1_LIA_WIRE_STAMP = "w1-lia-wire@2026-07-25T12:59:37Z";

export interface W1LiaWireCounters {
  version: string;
  stamp: string;
  registry_hits: number;
  write_around_hits: number;
  unresolved_keys: string[];
  nodes_scanned: number;
  crashed?: boolean;
  crash_message?: string;
}

const UNANCHORED = new Set<string>(LIA_UNANCHORED_PROPOSITIONS);

// Reserved keys — walk INTO them (they are structural containers) but never
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
  const row = LIA_VERIFIED_AUTHORITIES[key];
  if (!row) return;
  node.citation = row.citation;
  node.subsection = row.subsection;
  node.verbatim_quote = row.verbatim_quote;
  node.governing_anchor = row.governing_anchor;
  node.citation_verified = true;
}

function applyWriteAround(node: Record<string, unknown>): void {
  // Scrub any paraphrased / fabricated pinpoint on unanchorable propositions.
  // NEVER surface information_needed here — citation-resolution gaps use the
  // WRITE-AROUND treatment; intake gaps remain the only trigger for
  // information_needed on this tool.
  node.citation = null;
  node.subsection = null;
  node.verbatim_quote = null;
  node.governing_anchor = null;
  node.citation_verified = false;
  node.write_around = true;
}

function walk(node: unknown, c: W1LiaWireCounters): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const it of node) walk(it, c);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  c.nodes_scanned += 1;

  const pk = obj.proposition_key;
  if (typeof pk === "string" && pk.length > 0) {
    if (LIA_VERIFIED_AUTHORITIES[pk]) {
      applyRegistryRow(obj, pk);
      c.registry_hits += 1;
    } else if (UNANCHORED.has(pk)) {
      applyWriteAround(obj);
      c.write_around_hits += 1;
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
 * Never throws — on internal error, sets crashed=true and returns.
 */
export function applyW1LiaWire(report: unknown): W1LiaWireCounters {
  const c: W1LiaWireCounters = {
    version: LIA_VERIFIED_AUTHORITY_VERSION,
    stamp: W1_LIA_WIRE_STAMP,
    registry_hits: 0,
    write_around_hits: 0,
    unresolved_keys: [],
    nodes_scanned: 0,
  };
  try {
    if (report && typeof report === "object") walk(report, c);
    try {
      const r = report as Record<string, unknown>;
      const meta = (r._meta = (r._meta && typeof r._meta === "object")
        ? r._meta as Record<string, unknown>
        : {});
      const internal = (meta.internal = (meta.internal && typeof meta.internal === "object")
        ? meta.internal as Record<string, unknown>
        : {});
      internal.lia_w1 = { ...c };
    } catch { /* never block emission */ }
  } catch (e) {
    c.crashed = true;
    c.crash_message = (e as Error)?.message ?? String(e);
  }
  return c;
}

export const _internals = { applyRegistryRow, applyWriteAround, walk };
