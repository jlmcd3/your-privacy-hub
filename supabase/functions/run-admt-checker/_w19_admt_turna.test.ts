// WAVE19-FIX TURN A — colocated deno tests (A1–A4 + splice guard).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW19AdmtTurnA,
  downgradeUnverifiedPinpointsInCitation,
  reresolveFallbackOnEntry,
  scrubSpliceDebris,
  stripUnsupportedTimelineClaim,
  W19_ADMT_TURNA_STAMP,
} from "./_w19_admt_turna.ts";
import { ADMT_VERIFIED_AUTHORITIES } from "../_shared/registry/admt-verified-authorities.ts";

const FALLBACK = "the applicable ADMT-subchapter provision";

Deno.test("stamp exists", () => {
  assert(W19_ADMT_TURNA_STAMP.startsWith("w19-admt-turna@"));
});

// ── A1 ─────────────────────────────────────────────────────────────────
Deno.test("A1: entry with resolvable proposition_key + fallback citation → registry-stamp", () => {
  // scope_deadline is a well-known registry key that always resolves.
  const entry: any = {
    proposition_key: "scope_deadline",
    citation: FALLBACK,
    finding: `Confirm the deadline under ${FALLBACK}.`,
  };
  const d = reresolveFallbackOnEntry(entry);
  assertEquals(d.rewrote_citation, 1);
  assert(entry.citation !== FALLBACK, "citation must be rewritten off fallback");
  assert(entry.citation.startsWith("11 CCR §"), `expected registry-stamped cite, got: ${entry.citation}`);
  assert(!entry.finding.includes(FALLBACK), "fallback must be scrubbed from prose on the same entry");
});

Deno.test("A1: entry with no key AND no reverse resolution → fallback left alone", () => {
  const entry: any = { citation: FALLBACK, finding: `Under ${FALLBACK}.` };
  const d = reresolveFallbackOnEntry(entry);
  assertEquals(d.rewrote_citation, 0);
  assertEquals(entry.citation, FALLBACK);
});

// ── A2 ─────────────────────────────────────────────────────────────────
Deno.test("A2: splice debris 'the enumerated the applicable ADMT-subchapter provision' collapsed", () => {
  const bad = `Assess systems within the enumerated the applicable ADMT-subchapter provision categories.`;
  const r = scrubSpliceDebris(bad);
  assert(r.hits >= 1);
  assert(!/the\s+enumerated\s+the\s+applicable/i.test(r.out), r.out);
  assert(r.out.includes(FALLBACK));
});

Deno.test("A2: doubled-article 'the the applicable' collapsed", () => {
  const bad = `Cited under the the applicable ADMT-subchapter provision.`;
  const r = scrubSpliceDebris(bad);
  assert(r.hits >= 1);
  assert(!/\bthe\s+the\s+applicable\b/i.test(r.out));
});

Deno.test("A2: well-formed prose left untouched", () => {
  const ok = `Assess ADMT scope under the applicable ADMT-subchapter provision before first use.`;
  const r = scrubSpliceDebris(ok);
  assertEquals(r.hits, 0);
  assertEquals(r.out, ok);
});

// ── A3 ─────────────────────────────────────────────────────────────────
Deno.test("A3: unverified '11 CCR § 7150(b)(3)' pinpoint downgrades to section", () => {
  const r = downgradeUnverifiedPinpointsInCitation("11 CCR § 7150(b)(3)");
  assertEquals(r.downgrades, 1);
  assertEquals(r.out, "11 CCR § 7150");
});

Deno.test("A3: verified pinpoint left alone (no downgrade)", () => {
  // scope_deadline row's subsection is a registry-verified pinpoint; use its
  // subsection string as-is and confirm no downgrade occurs.
  const { ADMT_VERIFIED_AUTHORITIES } = await import("../_shared/registry/admt-verified-authorities.ts");
  const row = (ADMT_VERIFIED_AUTHORITIES as any)["scope_deadline"];
  assert(row, "scope_deadline row must exist");
  const r = downgradeUnverifiedPinpointsInCitation(row.subsection);
  assertEquals(r.downgrades, 0);
  assertEquals(r.out, row.subsection);
});

Deno.test("A3: mixed citations — downgrade only unverified parts, preserve verified", () => {
  const cit = "11 CCR § 7150(b)(3) + 11 CCR § 7150";
  const r = downgradeUnverifiedPinpointsInCitation(cit);
  assert(r.downgrades >= 1);
  assert(r.out.includes("11 CCR § 7150"));
  assert(!r.out.includes("(b)(3)"));
});

// ── A4 ─────────────────────────────────────────────────────────────────
Deno.test("A4: known statutory '10 business days' timeline passes through", () => {
  const s = "Confirm receipt within 10 business days.";
  const r = stripUnsupportedTimelineClaim(s, {});
  assertEquals(r.stripped, 0);
  assertEquals(r.out, s);
});

Deno.test("A4: unsupported '7 business days' timeline stripped when not in intake", () => {
  const s = "Acknowledge receipt within 7 business days.";
  const r = stripUnsupportedTimelineClaim(s, {});
  assertEquals(r.stripped, 1);
  assert(!/within\s+7\s+business\s+days/i.test(r.out));
  assert(r.out.includes("confirmation"));
});

Deno.test("A4: unsupported timeline PRESERVED when intake contains it verbatim", () => {
  const intake = { policy_notes: "we acknowledge within 7 business days per our SLA" };
  const s = "Acknowledge receipt within 7 business days.";
  const r = stripUnsupportedTimelineClaim(s, intake);
  assertEquals(r.stripped, 0);
  assertEquals(r.out, s);
});

// ── Orchestrator smoke ──────────────────────────────────────────────────
Deno.test("orchestrator: apply diag + no crash on empty report", () => {
  const d = applyW19AdmtTurnA({}, {});
  assertEquals(d.version, W19_ADMT_TURNA_STAMP);
});

Deno.test("orchestrator: full integration — A1+A2+A3+A4 fire and diag stamped on report", () => {
  const report: any = {
    top_3_actions: [
      {
        rank: 1,
        proposition_key: "scope_deadline",
        citation: FALLBACK,
        action: `Acknowledge receipt within 7 business days under ${FALLBACK}.`,
      },
      {
        rank: 2,
        citation: "11 CCR § 7150(b)(3)",
        action: `Assess systems within the enumerated the applicable ADMT-subchapter provision categories.`,
      },
    ],
  };
  const d = applyW19AdmtTurnA(report, {});
  assert(d.a1_citation_rewrites >= 1);
  assert(d.a2_splice_scrubs >= 1);
  assert(d.a3_subsection_downgrades >= 1);
  assert(d.a4_timelines_stripped >= 1);
  assertEquals(report.top_3_actions[1].citation, "11 CCR § 7150");
  assert(report.top_3_actions[0].information_needed === true);
  assert(!/the\s+enumerated\s+the\s+applicable/i.test(report.top_3_actions[1].action));
  assert((report as any)._w19_admt_turna?.version === W19_ADMT_TURNA_STAMP);
});
