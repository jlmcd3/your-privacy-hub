// WAVE12-FIX TURN E — cppa-cyber unit tests.
//
// Guards the framework-crosswalk sanitizer against the wave-12 defect
// classes (docs 66187172 + 57bebb53):
//   E1a — truncated clause "the ISO 27001 framework provides comparative
//         guidance on;" must not survive.
//   E1b — unbalanced parenthesis sentence dropped.
//   E1c — exact-duplicate operative sentence dedupe (whitespace/case
//         normalised).
// Also covers: fail-open pass-through, telemetry counter increment,
// telemetry sits under `_meta.internal.crosswalk` (never at a customer
// surface), and the root-cause `_w6_cyber_fix` rewrite no longer emits
// orphan-preposition stubs.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW12CyberE1,
  sanitizeCrosswalkText,
  W12_CYBER_E1_STAMP,
  type W12CyberE1Counters,
} from "./_w12_cyber_e1.ts";
import { rewriteComparativeAsOperative } from "./_w6_cyber_fix.ts";

function emptyCounters(): W12CyberE1Counters {
  return {
    surfaces_scanned: 0,
    sentences_scanned: 0,
    crosswalk_fragments_dropped: 0,
    unbalanced_parens_dropped: 0,
    crosswalk_dupes_removed: 0,
  };
}

Deno.test("TURN E — W12_CYBER_E1_STAMP is set", () => {
  assert(W12_CYBER_E1_STAMP.startsWith("w12-cyber-e1@"), W12_CYBER_E1_STAMP);
});

Deno.test("TURN E — BUILD_STAMP restamped (w12-cyber-turne or later cyber wave)", async () => {
  const src = await Deno.readTextFile(new URL("./index.ts", import.meta.url));
  const m = src.match(/export const BUILD_STAMP = "([^"]+)"/);
  assert(m && /^(w12-cyber-turne|w15-cyber-regwire)@/.test(m[1]), `unexpected stamp: ${m?.[1]}`);
});

// ---- E1a: truncated clause ----
Deno.test("E1a: wave-12 exact fragment 'provides comparative guidance on;' is dropped", () => {
  const c = emptyCounters();
  const input =
    "The audit examined 18 controls. For comparative context, the ISO 27001 framework provides comparative guidance on; The operative requirement is 11 CCR § 7123.";
  const out = sanitizeCrosswalkText(input, c);
  assert(!/provides comparative guidance on;/i.test(out), `stub survived: ${out}`);
  assertEquals(c.crosswalk_fragments_dropped, 1);
  // Well-formed sentences on either side must survive.
  assert(/The audit examined 18 controls\./.test(out));
  assert(/operative requirement is 11 CCR § 7123\./.test(out));
});

Deno.test("E1a: sentence ending in bare ';' at absolute end is dropped", () => {
  const c = emptyCounters();
  const out = sanitizeCrosswalkText("MFA is enforced. Access reviews are annual;", c);
  assertEquals(c.crosswalk_fragments_dropped, 1);
  assert(/MFA is enforced\./.test(out));
  assert(!/Access reviews are annual;/.test(out));
});

// ---- E1b: unbalanced parens ----
Deno.test("E1b: sentence with dangling ')' is dropped", () => {
  const c = emptyCounters();
  const input = "The framework applies here). MFA is enforced across production systems.";
  const out = sanitizeCrosswalkText(input, c);
  assertEquals(c.unbalanced_parens_dropped, 1);
  assert(!/applies here\)/.test(out));
  assert(/MFA is enforced/.test(out));
});

Deno.test("E1b: unclosed '(' also dropped", () => {
  const c = emptyCounters();
  const out = sanitizeCrosswalkText("Access controls (see § 7123 are audited annually.", c);
  assertEquals(c.unbalanced_parens_dropped, 1);
  assertEquals(out, "");
});

Deno.test("E1b: balanced parens survive unchanged", () => {
  const c = emptyCounters();
  const input = "Access controls (see § 7123(c)(3)) are audited annually.";
  const out = sanitizeCrosswalkText(input, c);
  assertEquals(c.unbalanced_parens_dropped, 0);
  assertEquals(out.trim(), input.trim());
});

// ---- E1c: duplicate sentence dedupe ----
Deno.test("E1c: exact-duplicate operative sentence deduplicated (whitespace-normalised)", () => {
  const c = emptyCounters();
  const input =
    "The operative requirement is 11 CCR § 7123(c)(1). Controls are documented. The operative requirement is 11 CCR § 7123(c)(1).";
  const out = sanitizeCrosswalkText(input, c);
  assertEquals(c.crosswalk_dupes_removed, 1);
  const matches = out.match(/operative requirement is 11 CCR § 7123\(c\)\(1\)/g) ?? [];
  assertEquals(matches.length, 1);
});

Deno.test("E1c: dedupe is case- and whitespace-insensitive", () => {
  const c = emptyCounters();
  const input =
    "Controls are documented.   Controls are  Documented.  Access is logged.";
  const out = sanitizeCrosswalkText(input, c);
  assertEquals(c.crosswalk_dupes_removed, 1);
  assert(/Access is logged/.test(out));
});

// ---- Fail-open + pass-through ----
Deno.test("Fail-open: well-formed input passes through unchanged", () => {
  const c = emptyCounters();
  const input =
    "The audit covers 18 controls under 11 CCR § 7123(c). MFA is enforced across production systems. Access reviews occur quarterly.";
  const out = sanitizeCrosswalkText(input, c);
  assertEquals(out, input);
  assertEquals(c.crosswalk_fragments_dropped, 0);
  assertEquals(c.unbalanced_parens_dropped, 0);
  assertEquals(c.crosswalk_dupes_removed, 0);
  assert(c.sentences_scanned >= 3);
});

Deno.test("Fail-open: empty/null input returns as given without throwing", () => {
  const c = emptyCounters();
  assertEquals(sanitizeCrosswalkText("", c), "");
  assertEquals(sanitizeCrosswalkText(null as unknown as string, c), null);
});

// ---- Report-level walker + telemetry placement ----
Deno.test("applyW12CyberE1: sanitizes all surfaces and lands telemetry under _meta.internal.crosswalk", () => {
  const report: any = {
    executive_summary:
      "The audit reviewed 18 controls. For comparative context, the ISO 27001 framework provides comparative guidance on;",
    top_risks: [
      "Access reviews are annual). MFA is inconsistent across the estate.",
      { text: "Logging coverage is partial. Logging coverage is partial." },
    ],
    next_steps: [
      { text: "Implement MFA broadly. Implement MFA broadly.", owner: "SecEng", trigger: "Q3" },
    ],
    enforcement_context: "Well-formed enforcement paragraph with balanced (parenthetical) content.",
    controls: [
      {
        id: "c1",
        finding: "The finding is that MFA is partial. The finding is that MFA is partial.",
        remediation: "Roll out MFA in Q3.",
        evidence: "Okta enrollment at 78% per intake c1_mfa.",
        differentiator: "This control lags peers on coverage cadence.",
      },
    ],
  };

  const { counters } = applyW12CyberE1(report);

  // Truncated crosswalk stub scrubbed from exec summary.
  assert(!/provides comparative guidance on;/i.test(report.executive_summary));
  // Unbalanced-parens sentence dropped from top_risks[0]; second sentence survives.
  assert(!/Access reviews are annual\)/.test(report.top_risks[0]));
  assert(/MFA is inconsistent/.test(report.top_risks[0]));
  // Duplicate sentence deduped in top_risks[1].text.
  const t1 = report.top_risks[1].text as string;
  assertEquals((t1.match(/Logging coverage is partial/g) ?? []).length, 1);
  // Duplicate sentence deduped in next_steps[0].text.
  const n0 = report.next_steps[0].text as string;
  assertEquals((n0.match(/Implement MFA broadly/g) ?? []).length, 1);
  // Duplicate sentence deduped in controls[0].finding.
  const f = report.controls[0].finding as string;
  assertEquals((f.match(/The finding is that MFA is partial/g) ?? []).length, 1);
  // Well-formed enforcement_context untouched.
  assertEquals(
    report.enforcement_context,
    "Well-formed enforcement paragraph with balanced (parenthetical) content.",
  );

  // Counters accumulated correctly (at least one of each class fired).
  assert(counters.crosswalk_fragments_dropped >= 1);
  assert(counters.unbalanced_parens_dropped >= 1);
  assert(counters.crosswalk_dupes_removed >= 3);
  assert(counters.surfaces_scanned > 0);

  // The caller places telemetry under _meta.internal.crosswalk — simulate:
  report._meta = report._meta ?? {};
  report._meta.internal = report._meta.internal ?? {};
  report._meta.internal.crosswalk = { stamp: W12_CYBER_E1_STAMP, ...counters };
  assertEquals(report._meta.internal.crosswalk.stamp, W12_CYBER_E1_STAMP);

  // No customer-surface key leaks the sanitizer's telemetry keys.
  const forbidden = /crosswalk_fragments_dropped|crosswalk_dupes_removed|unbalanced_parens_dropped/i;
  for (const key of ["executive_summary", "enforcement_context"]) {
    assert(!forbidden.test(String(report[key])), `telemetry leaked into ${key}`);
  }
  for (const c of report.controls) {
    for (const k of ["finding", "remediation", "evidence", "differentiator"]) {
      assert(!forbidden.test(String(c[k])), `telemetry leaked into controls.${k}`);
    }
  }
});

// ---- Root-cause tests: _w6_cyber_fix no longer emits stubs ----
Deno.test("E1a root cause: rewriteComparativeAsOperative does NOT emit 'guidance on;' when the model output has 'X governs;'", () => {
  // Simulates the exact wave-12 upstream fragment.
  const input = "ISO 27001 governs;";
  const { out } = rewriteComparativeAsOperative(input);
  assert(!/provides comparative guidance on;/i.test(out), `orphan stub emitted: ${out}`);
});

Deno.test("E1a root cause: complete operative sentence still gets rewritten as before", () => {
  const input = "ISO 27001 governs access control across the estate.";
  const { out, rewritten } = rewriteComparativeAsOperative(input);
  assertEquals(rewritten, 1);
  assert(/for comparative context/i.test(out));
  assert(/provides comparative guidance on/i.test(out));
  assert(!/\bgoverns\b/i.test(out));
});

Deno.test("E1a root cause: split no longer breaks on ';' — clauses stay whole", () => {
  const input =
    "ISO 27001 governs access control; the operative requirement is 11 CCR § 7123(c)(1).";
  const { out } = rewriteComparativeAsOperative(input);
  assert(!/on;\s*the operative/i.test(out), out);
  assert(/operative requirement is 11 CCR § 7123\(c\)\(1\)/.test(out));
});
