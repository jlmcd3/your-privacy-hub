#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * PRICING SNAPSHOT GENERATOR
 * ==========================
 * Projects the master price list (src/config/pricing.ts) into the plain-data
 * module the edge functions read (supabase/functions/_shared/pricing-snapshot.ts).
 *
 *   deno run --allow-read --allow-write scripts/pricing/generate-pricing-snapshot.ts
 *   deno run --allow-read               scripts/pricing/generate-pricing-snapshot.ts --check
 *
 * `--check` exits 1 when the committed snapshot is stale (same check the vitest
 * suite src/test/pricingSnapshot.test.ts performs).
 *
 * PROCEDURE — how a price change reaches Stripe (QA batch 2026-09-05):
 *   1. Edit amountCents / displayPrice in src/config/pricing.ts.
 *   2. Run this script. Commit pricing.ts AND pricing-snapshot.ts together.
 *      (`npm test` fails on a stale snapshot, so step 2 cannot be skipped.)
 *   3. Deploy the edge functions. create-tool-checkout charges the snapshot
 *      amount immediately — Stripe's Price objects are NOT consulted for the
 *      amount any more, only logged when they drift.
 *   4. Run sync-pricing (Admin → Pricing → Sync) once per Stripe environment
 *      so the Stripe Price objects / lookup keys / product descriptions match
 *      the registry again; verify on /admin/pricing-reconciliation.
 */

import { PRICING, PRICING_REGISTRY } from "../../src/config/pricing.ts";
import {
  canonicalJson,
  projectPricingSnapshot,
  renderSnapshotModule,
} from "../../src/config/pricingSnapshotProjection.ts";

const OUT_URL = new URL("../../supabase/functions/_shared/pricing-snapshot.ts", import.meta.url);

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const snapshot = projectPricingSnapshot(
  PRICING_REGISTRY as unknown as Record<string, unknown>,
  PRICING.tools as unknown as Record<string, unknown>,
);
const hash = await sha256Hex(canonicalJson(snapshot));
const rendered = renderSnapshotModule(snapshot, hash);

const check = Deno.args.includes("--check");
let existing: string | null = null;
try {
  existing = await Deno.readTextFile(OUT_URL);
} catch {
  existing = null;
}

if (check) {
  if (existing === rendered) {
    console.log(`✓ pricing-snapshot.ts is current (hash ${hash.slice(0, 12)}…)`);
    Deno.exit(0);
  }
  console.error("✖ pricing-snapshot.ts is STALE — src/config/pricing.ts changed without regenerating the snapshot.");
  console.error("  Run: deno run --allow-read --allow-write scripts/pricing/generate-pricing-snapshot.ts");
  Deno.exit(1);
}

if (existing === rendered) {
  console.log(`= pricing-snapshot.ts unchanged (hash ${hash.slice(0, 12)}…)`);
} else {
  await Deno.writeTextFile(OUT_URL, rendered);
  console.log(`✓ wrote ${OUT_URL.pathname} (${Object.keys(snapshot.registry).length} registry entries, ${Object.keys(snapshot.tools).length} tools, hash ${hash.slice(0, 12)}…)`);
  console.log("  Next: commit it with pricing.ts, deploy edge functions, then run sync-pricing per Stripe environment.");
}
