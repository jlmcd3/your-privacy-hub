// GOVERNANCE-REGISTRY-WIRING — W1 deterministic post-pass (2026-07-25).
//
// Mirrors run-dpia-framework/_w1_dpia_wire.ts and
// run-li-assessment/_w1_lia_wire.ts (ledger items 51 / 55–56). Runs AFTER
// all model generation / stitching / engagement-map / post-scrub passes
// and BEFORE `runEmitGate` + the P2 serializer.
//
// Contract:
//   (1) REGISTRY-FIRST: any object anywhere in the report that carries a
//       `proposition_key` matching a row in GOVERNANCE_VERIFIED_AUTHORITIES
//       gets its `citation` / `subsection` / `verbatim_quote` /
//       `governing_anchor` overwritten with the registry-verified verbatim
//       values, and `citation_verified: true`. The generator may never
//       author a citation independently for these propositions.
//   (2) WRITE-AROUND: objects whose `proposition_key` is on the
//       GOVERNANCE_UNANCHORED_PROPOSITIONS list get their citation fields
//       scrubbed to null with `citation_verified: false` and
//       `write_around: true`. NEVER surfaces "information needed" for
//       citation-resolution gaps (RULE 2.7 S1 — intake gaps only).
//   (3) TELEMETRY: writes `report._meta.internal.governance_w1 = { version,
//       walked, resolved, unanchored_scrubbed, unresolved_keys[], stamp }`.
//       Preserves any pre-existing `_meta.internal.*` (emit_gate, etc.);
//       stamp survives P2 serialization via the whitelist.
//
// Fail-visible / fail-safe: on internal error the report ships unchanged
// with `_meta.internal.governance_w1.crashed = true`.

import {
  GOVERNANCE_VERIFIED_AUTHORITIES,
  GOVERNANCE_UNANCHORED_PROPOSITIONS,
  GOVERNANCE_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/governance-verified-authorities.ts";

export const W1_GOVERNANCE_WIRE_STAMP =
  "w1-governance-wire@2026-07-25T14:02:34Z";

export interface W1GovernanceWireCounters {
  version: string;
  stamp: string;
  walked: number;
  resolved: number;
  unanchored_scrubbed: number;
  unresolved_keys: string[];
  crashed?: boolean;
  crash_message?: string;
}

const UNANCHORED = new Set<string>(GOVERNANCE_UNANCHORED_PROPOSITIONS);

// Reserved keys — walk INTO them (they are structural containers) but never
// treat their own leaf strings as citation carriers. Includes the
// enforcement_* family, engagement_map, annotations, deterministic checks,
// lint warnings, citation ledger, and internal telemetry buckets.
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
  const row = GOVERNANCE_VERIFIED_AUTHORITIES[key];
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

function walk(node: unknown, c: W1GovernanceWireCounters): void {
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
    if (GOVERNANCE_VERIFIED_AUTHORITIES[pk]) {
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
 * Never throws — on internal error, sets crashed=true and returns.
 */
export function applyW1GovernanceWire(
  report: unknown,
): W1GovernanceWireCounters {
  const c: W1GovernanceWireCounters = {
    version: GOVERNANCE_VERIFIED_AUTHORITY_VERSION,
    stamp: W1_GOVERNANCE_WIRE_STAMP,
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
      internal.governance_w1 = { ...c };
    } catch { /* never block emission */ }
  } catch (e) {
    c.crashed = true;
    c.crash_message = (e as Error)?.message ?? String(e);
  }
  return c;
}

export const _internals = { applyRegistryRow, applyWriteAround, walk };
