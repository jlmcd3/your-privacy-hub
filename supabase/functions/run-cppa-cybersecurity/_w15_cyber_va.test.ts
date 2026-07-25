// W15 CYBER-REGISTRY-WIRING — colocated wiring tests for
// run-cppa-cybersecurity's L1 verified-authority pipeline.
//
// Guards:
//   1. BUILD_STAMP restamped to w15-cyber-regwire@<iso>.
//   2. Cyber verified-authority registry (cyber-va-w1) imported at
//      module-init and rendered into the injected system context via
//      buildCyberVerifiedAuthorityBlock.
//   3. Retention re-anchor: § 7122(g) (proposition_key
//      "cyber_retention_5yr") is the pinpoint for the five-year
//      audit-record retention rule, NEVER § 7123(e).
//   4. Resolver honours the whitelist gate (unknown proposition_key →
//      unresolved, no fabrication).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CYBER_VERIFIED_AUTHORITIES,
  CYBER_VERIFIED_AUTHORITY_VERSION,
} from "../_shared/registry/cyber-verified-authorities.ts";
import {
  resolveByPropositionKey,
  registrySize,
} from "../_shared/verified-authority-resolver.ts";

Deno.test("W15: BUILD_STAMP is w15-cyber-regwire@<iso> or w15-cyber-factledger@<iso>", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  const m = src.match(/export const BUILD_STAMP = "([^"]+)"/);
  assert(m && /^(w15-cyber-regwire|w15-cyber-factledger|w16-cyber-flfix)@\d{4}-\d{2}-\d{2}T/.test(m[1]), `unexpected stamp: ${m?.[1]}`);
});

Deno.test("W15: index.ts imports cyber registry + resolver + injects VA block", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  assert(src.includes("cyber-verified-authorities.ts"), "registry import missing");
  assert(src.includes("resolveByPropositionKey"), "resolver import missing");
  assert(src.includes("buildCyberVerifiedAuthorityBlock"), "block builder missing");
  assert(src.includes("CYBER_VERIFIED_AUTHORITY_BLOCK"), "block constant missing");
  // Block is injected into the system context.
  assert(
    /cyberInjectedParts\.push\(CYBER_VERIFIED_AUTHORITY_BLOCK\)/.test(src),
    "VA block not appended to cyberInjectedParts",
  );
  // Post-generation stamp pass and telemetry surface exist.
  assert(src.includes("cyber_va_stamp_pass"), "stamp-pass telemetry missing");
  assert(src.includes("meta.internal.cyber_va"), "cyber_va telemetry key missing");
});

Deno.test("W15: registry version stamp is cyber-va-w1 and non-empty", () => {
  assert(CYBER_VERIFIED_AUTHORITY_VERSION.startsWith("cyber-va-w1-"), CYBER_VERIFIED_AUTHORITY_VERSION);
  assert(registrySize(CYBER_VERIFIED_AUTHORITIES) >= 40, "registry too small");
});

Deno.test("W15: retention anchor row resolves to 11 CCR § 7122(g) — NOT § 7123(e)", () => {
  const row = resolveByPropositionKey(CYBER_VERIFIED_AUTHORITIES, "cyber_retention_5yr");
  assert(row, "cyber_retention_5yr row missing");
  assertEquals(row!.subsection, "11 CCR \u00a7 7122(g)");
  assert(!/7123\(e\)/.test(row!.subsection), "retention row must not anchor to § 7123(e)");
});

Deno.test("W15: unknown proposition_key resolves to null (never fabricates)", () => {
  assertEquals(resolveByPropositionKey(CYBER_VERIFIED_AUTHORITIES, "does_not_exist_xyz"), null);
});

Deno.test("W15: system-context injection block names retention rule + § 7122(g)", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  // The rendered rules must state the retention anchor plainly.
  assert(src.includes("cyber_retention_5yr"), "block/rules must reference cyber_retention_5yr");
  assert(/§\s*7122\(g\)/.test(src), "block/rules must name § 7122(g)");
});
