// W6-ADMT-FIX unit tests.
import { assertEquals, assert } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import {
  applyW6AdmtFix,
  capSec7001Depth,
  resolvePropositionalFallback,
  repairFallbackSplice,
  stripCounselReferrals,
  stripInternalNoteBlocks,
  stripScopeReasoningLeaks,
  softenBareRoleAssertions,
  rewriteSilenceAsFact,
} from "./_w6_admt_fix.ts";

Deno.test("W6 (2) — § 7001(ddd)(1) depth-capped to § 7001(ddd)", () => {
  const { out, capped } = capSec7001Depth("as defined in 11 CCR § 7001(ddd)(1)");
  assertEquals(out, "as defined in 11 CCR § 7001(ddd)");
  assertEquals(capped, 1);
});

Deno.test("W6 (2) — § 7001(e)(1) is preserved; § 7001(e)(1)(A) capped to (e)(1)", () => {
  const a = capSec7001Depth("§ 7001(e)(1)");
  assertEquals(a.out, "§ 7001(e)(1)");
  assertEquals(a.capped, 0);
  const b = capSec7001Depth("§ 7001(e)(1)(A)");
  assertEquals(b.out, "§ 7001(e)(1)");
  assertEquals(b.capped, 1);
});

Deno.test("W6 (2) — non-7001 pinpoints untouched", () => {
  const s = "under § 7221(b)(2) and § 7222(b)(3)(A)";
  assertEquals(capSec7001Depth(s).out, s);
});

Deno.test("W6 (1) — hiring-exception fallback resolves to § 7221(b)(2)", () => {
  const s = "The employment exception under the applicable ADMT-subchapter provision applies.";
  const { out, resolved } = resolvePropositionalFallback(s);
  assertEquals(resolved, 1);
  assert(out.includes("§ 7221(b)(2)"));
  assert(!out.includes("the applicable ADMT-subchapter provision"));
});

Deno.test("W6 (1) — significant-decision definition fallback resolves to § 7001(ddd)", () => {
  const s = "The significant-decision definition in the applicable ADMT-subchapter provision governs.";
  const { out, resolved } = resolvePropositionalFallback(s);
  assertEquals(resolved, 1);
  assert(out.includes("§ 7001(ddd)"));
});

Deno.test("W6 (1) — unresolvable fallback is kept, not misresolved", () => {
  const s = "The obligation attaches per the applicable ADMT-subchapter provision.";
  const { out, resolved, kept } = resolvePropositionalFallback(s);
  assertEquals(resolved, 0);
  assertEquals(kept, 1);
  assert(out.includes("the applicable ADMT-subchapter provision"));
});

Deno.test("W6 (1b) — garbled 'full the applicable...' splice is repaired", () => {
  const s = "The full the applicable ADMT-subchapter provision ADMT obligations attach.";
  const out = repairFallbackSplice(s);
  assertEquals(out, "The full range of ADMT obligations attach.");
});

Deno.test("W6 (3) — 'legal counsel advises' stripped from body prose", () => {
  const s = "Revisit this disclosure if the employment exception is later confirmed and legal counsel advises removal.";
  const out = stripCounselReferrals(s);
  assert(!/legal counsel/i.test(out), out);
});

Deno.test("W6 (4) — [INTERNAL WORKFLOW NOTE:...] bracketed block stripped", () => {
  const s = "See body. [INTERNAL WORKFLOW NOTE: coordinate with Ops before shipping] Continue.";
  const out = stripInternalNoteBlocks(s);
  assert(!/INTERNAL WORKFLOW/i.test(out), out);
});

Deno.test("W6 (4) — [INTERNAL SOP ...] with no closing bracket also stripped", () => {
  const s = "Prose. [INTERNAL SOP route via Legal";
  const out = stripInternalNoteBlocks(s);
  assert(!/INTERNAL SOP/i.test(out), out);
});

Deno.test("W6 (5) — '(analyzed below)' and 'on this record' hedges stripped", () => {
  const s = "The service is not in scope (analyzed below), on this record.";
  const out = stripScopeReasoningLeaks(s);
  assert(!/analyzed below/i.test(out));
  assert(!/on this record/i.test(out));
});

Deno.test("W6 (5) — canonical 'the record' phrasing preserved", () => {
  const s = "The record does not identify the ADMT purpose.";
  const out = stripScopeReasoningLeaks(s);
  assertEquals(out, s);
});

Deno.test("W6 (6a) — bare 'The CISO and HR Lead must ...' softened to Suggested owner", () => {
  const { out, softened } = softenBareRoleAssertions(
    "The CISO and HR Lead must jointly produce the risk register.",
    new Set(),
  );
  assertEquals(softened, 1);
  assert(out.startsWith("Suggested owner (confirm): CISO / HR Lead — "));
});

Deno.test("W6 (6a) — role assertion preserved when role appears in intake", () => {
  const { out, softened } = softenBareRoleAssertions(
    "The CISO must supply the security artifacts.",
    new Set(["CISO"]),
  );
  assertEquals(softened, 0);
  assert(out.startsWith("The CISO must supply"));
});

Deno.test("W6 (6b) — 'explicitly notes X is not described' → 'does not describe X'", () => {
  const s = "The record explicitly notes that the 15-business-day opt-out process is not described.";
  const out = rewriteSilenceAsFact(s);
  assert(/does not describe the 15-business-day opt-out process/i.test(out), out);
  assert(!/explicitly notes/i.test(out));
});

Deno.test("W6 orchestrator — end-to-end scope_analysis strips leaks; counsel_close preserved", () => {
  const report: any = {
    scope_analysis: {
      summary: "In scope (analyzed below), on this record — the applicable ADMT-subchapter provision governs the significant-decision definition.",
      is_admt_reasoning: "The ADMT is defined per the applicable ADMT-subchapter provision.",
    },
    counsel_close: "Consult with legal counsel before deploying this language.",
    notice_gaps: [
      {
        element: "x",
        finding: "The CISO and HR Lead must jointly document this. Revisit if legal counsel advises removal. [INTERNAL WORKFLOW NOTE: ping ops]",
        remediation: "As defined in 11 CCR § 7001(ddd)(1), draft the notice.",
      },
    ],
  };
  const diag = applyW6AdmtFix(report, { organization_name: "Acme" });

  // (5) scope leaks removed
  assert(!/analyzed below/i.test(report.scope_analysis.summary));
  assert(!/on this record/i.test(report.scope_analysis.summary));
  // (1) propositional resolution
  assert(/§ 7001\(ddd\)/.test(report.scope_analysis.summary));
  assert(/§ 7001\(e\)/.test(report.scope_analysis.is_admt_reasoning));
  // (3) counsel_close preserved
  assert(/legal counsel/i.test(report.counsel_close));
  // (2) depth cap
  assert(/§ 7001\(ddd\)/.test(report.notice_gaps[0].remediation));
  assert(!/§ 7001\(ddd\)\(1\)/.test(report.notice_gaps[0].remediation));
  // (6a) role softened, (3) counsel stripped, (4) INTERNAL stripped
  assert(/Suggested owner \(confirm\): CISO \/ HR Lead/.test(report.notice_gaps[0].finding));
  assert(!/legal counsel/i.test(report.notice_gaps[0].finding));
  assert(!/INTERNAL WORKFLOW/i.test(report.notice_gaps[0].finding));
  // Diagnostics populated
  assert(diag.fallback_resolved >= 2);
  assert(diag.depth_capped_7001 >= 1);
  assert(diag.roles_softened >= 1);
  assert(diag.internal_blocks_stripped_fields >= 1);
});
