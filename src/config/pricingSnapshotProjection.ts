/**
 * PRICING SNAPSHOT PROJECTION — the one function that turns the master price
 * list (src/config/pricing.ts) into the plain-data snapshot the edge
 * functions consume (supabase/functions/_shared/pricing-snapshot.ts).
 *
 * QA batch 2026-09-05 (Codex purchase-flow review): seven observed checkouts
 * disagreed with their displayed prices because three edge functions
 * (create-tool-checkout, get-tool-price, sync-pricing) each carried a
 * HAND-COPIED mirror of the registry and two of them had not been updated
 * since v11 (2026-06-11). The v13 launch repricing (2026-08-29) changed the
 * master and the website; Stripe kept charging the v11 amounts.
 *
 * The fix is structural: no edge function carries its own cents any more.
 *   1. `deno run --allow-read --allow-write scripts/pricing/generate-pricing-snapshot.ts`
 *      projects the master through THIS module and writes the snapshot file.
 *   2. src/test/pricingSnapshot.test.ts re-runs the projection at test time
 *      and fails the battery when the snapshot is stale.
 *   3. The edge functions read cents from the snapshot only.
 *
 * This module is imported by BOTH the Deno generator and the vitest suite, so
 * it must stay dependency-free and runtime-neutral (no Node, no Deno, no DOM).
 */

export interface SnapshotRegistryEntry {
  lookupKey: string;
  productKey: string;
  productName: string;
  description: string;
  amountCents: number;
  currency: string;
  displayPrice: string;
  displaySuffix?: string;
  kind: string;
  recurringInterval?: "month" | "year";
  active: boolean;
  parentLookupKey?: string;
  addonReason?: string;
  maxQuantity?: number | null;
  unitLabel?: string;
}

export interface SnapshotToolEntry {
  name: string;
  dollars: number;
  cents: number;
  display: string;
  stripePriceId: string | null;
}

export interface PricingSnapshot {
  registry: Record<string, SnapshotRegistryEntry>;
  tools: Record<string, SnapshotToolEntry>;
}

const REGISTRY_FIELDS: ReadonlyArray<keyof SnapshotRegistryEntry> = [
  "lookupKey",
  "productKey",
  "productName",
  "description",
  "amountCents",
  "currency",
  "displayPrice",
  "displaySuffix",
  "kind",
  "recurringInterval",
  "active",
  "parentLookupKey",
  "addonReason",
  "maxQuantity",
  "unitLabel",
];

/** Project the master registry + PRICING.tools into plain, sorted data. */
export function projectPricingSnapshot(
  registry: Record<string, unknown>,
  tools: Record<string, unknown>,
): PricingSnapshot {
  const outRegistry: Record<string, SnapshotRegistryEntry> = {};
  for (const key of Object.keys(registry).sort()) {
    const raw = registry[key] as Record<string, unknown>;
    const entry: Record<string, unknown> = {};
    for (const f of REGISTRY_FIELDS) {
      if (raw[f] !== undefined) entry[f] = raw[f];
    }
    if (typeof entry.lookupKey !== "string" || typeof entry.amountCents !== "number") {
      throw new Error(`pricing snapshot: registry entry "${key}" lacks lookupKey/amountCents`);
    }
    if (entry.lookupKey !== key) {
      throw new Error(`pricing snapshot: registry key "${key}" does not match its lookupKey "${String(entry.lookupKey)}"`);
    }
    outRegistry[key] = entry as unknown as SnapshotRegistryEntry;
  }

  const outTools: Record<string, SnapshotToolEntry> = {};
  for (const key of Object.keys(tools).sort()) {
    const raw = tools[key] as Record<string, unknown>;
    const dollars = Number(raw.dollars ?? 0);
    outTools[key] = {
      name: String(raw.name ?? key),
      dollars,
      cents: Math.round(dollars * 100),
      display: String(raw.display ?? ""),
      stripePriceId: typeof raw.stripePriceId === "string" ? raw.stripePriceId : null,
    };
  }

  return { registry: outRegistry, tools: outTools };
}

/** Deterministic JSON (sorted keys at every level) — the hashing input. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortKeys((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}

export const SNAPSHOT_JSON_BEGIN = "/* SNAPSHOT-JSON-BEGIN */";
export const SNAPSHOT_JSON_END = "/* SNAPSHOT-JSON-END */";

/** Render the generated edge module. Kept here so generator and test agree byte-for-byte. */
export function renderSnapshotModule(snapshot: PricingSnapshot, sourceHash: string): string {
  const json = JSON.stringify(snapshot, null, 2);
  return `// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Source of truth: src/config/pricing.ts (PRICING_REGISTRY + PRICING.tools).
// Regenerate after ANY price change:
//   deno run --allow-read --allow-write scripts/pricing/generate-pricing-snapshot.ts
// Guarded by src/test/pricingSnapshot.test.ts — the vitest battery fails when
// this file is stale, so a price change cannot ship without its mirror.
//
// Consumers: supabase/functions/_shared/pricing.ts (tool catalog), and through
// it create-tool-checkout, get-tool-price, create-registration-checkout and
// sync-pricing. None of them carries its own cents.

export interface SnapshotRegistryEntry {
  lookupKey: string;
  productKey: string;
  productName: string;
  description: string;
  amountCents: number;
  currency: string;
  displayPrice: string;
  displaySuffix?: string;
  kind: string;
  recurringInterval?: "month" | "year";
  active: boolean;
  parentLookupKey?: string;
  addonReason?: string;
  maxQuantity?: number | null;
  unitLabel?: string;
}

export interface SnapshotToolEntry {
  name: string;
  dollars: number;
  cents: number;
  display: string;
  stripePriceId: string | null;
}

/** SHA-256 of the canonical JSON of the master projection at generation time. */
export const PRICING_SNAPSHOT_SOURCE_HASH = "${sourceHash}";

const SNAPSHOT: { registry: Record<string, SnapshotRegistryEntry>; tools: Record<string, SnapshotToolEntry> } = ${SNAPSHOT_JSON_BEGIN} ${json} ${SNAPSHOT_JSON_END};

export const PRICING_REGISTRY_SNAPSHOT: Readonly<Record<string, SnapshotRegistryEntry>> = SNAPSHOT.registry;
export const TOOL_STANDALONE_SNAPSHOT: Readonly<Record<string, SnapshotToolEntry>> = SNAPSHOT.tools;

/** Cents for a registry lookup key. Throws on an unknown key — a typo must fail loudly, never charge $0. */
export function registryCents(lookupKey: string): number {
  const entry = PRICING_REGISTRY_SNAPSHOT[lookupKey];
  if (!entry) throw new Error(\`pricing-snapshot: unknown lookup key "\${lookupKey}"\`);
  return entry.amountCents;
}

/** Every registry entry, in lookup-key order. */
export function registryEntries(): SnapshotRegistryEntry[] {
  return Object.values(PRICING_REGISTRY_SNAPSHOT);
}
`;
}
