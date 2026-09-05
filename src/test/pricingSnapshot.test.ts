// QA batch 2026-09-05 — PRICE MIRROR DRIFT GUARD.
//
// Seven checkouts in the Codex purchase-flow review charged v11 amounts
// ($139 / $169 / $59 / $59 / $59 / $49 / $45) while the site displayed the v13
// prices ($179 / $239 / $99 / $99 / $89 / $69 / $79). Root cause: three edge
// functions each carried a hand-copied mirror of src/config/pricing.ts, and
// two of them had not been touched since 2026-06-11.
//
// The edge functions now read supabase/functions/_shared/pricing-snapshot.ts,
// a GENERATED projection of the master. This test regenerates the projection
// from the master at test time and fails when the committed snapshot differs —
// so a price change cannot ship without its mirror.
//
// To fix a failure:
//   deno run --allow-read --allow-write scripts/pricing/generate-pricing-snapshot.ts

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRICING, PRICING_REGISTRY } from "@/config/pricing";
import {
  SNAPSHOT_JSON_BEGIN,
  SNAPSHOT_JSON_END,
  canonicalJson,
  projectPricingSnapshot,
  renderSnapshotModule,
} from "@/config/pricingSnapshotProjection";

const SNAPSHOT_PATH = resolve(__dirname, "../../supabase/functions/_shared/pricing-snapshot.ts");
const REGENERATE = "deno run --allow-read --allow-write scripts/pricing/generate-pricing-snapshot.ts";

function readSnapshotFile(): string {
  return readFileSync(SNAPSHOT_PATH, "utf8");
}

function embeddedJson(text: string): unknown {
  const start = text.indexOf(SNAPSHOT_JSON_BEGIN);
  const end = text.indexOf(SNAPSHOT_JSON_END);
  if (start < 0 || end < 0) throw new Error("pricing-snapshot.ts has no SNAPSHOT-JSON markers");
  return JSON.parse(text.slice(start + SNAPSHOT_JSON_BEGIN.length, end).trim());
}

const projected = projectPricingSnapshot(
  PRICING_REGISTRY as unknown as Record<string, unknown>,
  PRICING.tools as unknown as Record<string, unknown>,
);
const projectedHash = createHash("sha256").update(canonicalJson(projected)).digest("hex");

describe("edge pricing snapshot mirrors the master price list", () => {
  it("the committed snapshot data equals the master projection (registry + tools)", () => {
    const committed = embeddedJson(readSnapshotFile()) as typeof projected;
    expect(committed.registry, `stale snapshot — run: ${REGENERATE}`).toEqual(projected.registry);
    expect(committed.tools, `stale snapshot — run: ${REGENERATE}`).toEqual(projected.tools);
  });

  it("the committed module is byte-identical to what the generator would write", () => {
    const text = readSnapshotFile();
    expect(text, `stale snapshot — run: ${REGENERATE}`).toBe(renderSnapshotModule(projected, projectedHash));
  });

  it("the source hash embedded in the snapshot matches the master", () => {
    const m = readSnapshotFile().match(/PRICING_SNAPSHOT_SOURCE_HASH = "([0-9a-f]{64})"/);
    expect(m, "snapshot lacks a source hash").not.toBeNull();
    expect(m![1], `stale snapshot — run: ${REGENERATE}`).toBe(projectedHash);
  });

  it("v13 launch amounts are what the snapshot carries (regression pin on the QA-observed drift)", () => {
    // The seven products whose Stripe amounts disagreed with the site.
    const cents = (k: string) => projected.registry[k].amountCents;
    expect(cents("cppa_risk_subscriber")).toBe(17900);   // observed $139
    expect(cents("cppa_cyber_subscriber")).toBe(23900);  // observed $169
    expect(cents("cppa_admt_subscriber")).toBe(9900);    // observed $59
    expect(cents("dpia_subscriber_v2")).toBe(9900);      // observed $59
    expect(cents("li_subscriber_v2")).toBe(8900);        // observed $59
    expect(cents("dpa_standalone_v2")).toBe(6900);       // observed $49
    expect(cents("registration_standalone")).toBe(7900); // observed $45
    expect(cents("registration_additional_filing")).toBe(4900);
  });

  it("every PRICING.tools stripePriceId resolves to a registry lookup key", () => {
    for (const [key, tool] of Object.entries(projected.tools)) {
      if (!tool.stripePriceId) continue;
      expect(projected.registry[tool.stripePriceId], `PRICING.tools.${key}.stripePriceId → ${tool.stripePriceId}`).toBeDefined();
    }
  });
});
