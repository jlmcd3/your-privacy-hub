// DOC 135 (Batch 4 A-Team review, 2026-09-01) — regression guards for the
// confirmed-live bugs fixed this batch across Governance, RoPA, CPPA Cyber,
// DPIA, LIA, and CPPA ADMT. See doc 135 for the full triage (including
// items flagged as stale/already-fixed, deferred pending a larger design
// decision, or where the team disagrees with the external reviewer).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

type Bag = Record<string, unknown>;

// ── Governance — "record insufficient" raw-token leak ───────────────────────

import { deriveReadinessDetermination } from "../../../supabase/functions/_shared/ltp/governance-readiness.ts";

Deno.test("doc135 — Governance: rationale never prints the raw 'record insufficient' token", () => {
  const report = {
    accountability_determination: { status: "record_insufficient" },
    demonstrability_findings: { status: "not_satisfied" },
  };
  const rd = deriveReadinessDetermination(report);
  assert(rd);
  assert(!rd.rationale.includes('"record insufficient"'), `leaked raw token: ${rd.rationale}`);
  assert(rd.rationale.includes('"additional information required"'));
});

Deno.test("doc135 — Governance: a satisfied primary with no adverse siblings still reads cleanly (unchanged)", () => {
  const report = { accountability_determination: { status: "satisfied" } };
  const rd = deriveReadinessDetermination(report);
  assert(rd);
  assertEquals(rd.rating, "Evidenced");
  assert(rd.rationale.includes('"satisfied"'));
});

// ── RoPA — "intake" vocabulary + finality contradiction ─────────────────────

import { assembleRopaRegister } from "../../../supabase/functions/generate-ropa-document/register/ropa-skeleton-assemble.ts";

function minimalRopaInput(over: Partial<Bag> = {}): Bag {
  return {
    activities: [],
    legalEntityType: null,
    incorporationJurisdiction: null,
    registeredAddress: null,
    roles: [],
    isController: true,
    isProcessor: false,
    dpoAppointed: null,
    euRepresentative: null,
    homeBase: null,
    jurisdictionLabels: [],
    employeeBand: "51-250",
    ...over,
  };
}

Deno.test("doc135 — RoPA: 'intake' never appears in the rendered document text", () => {
  // deno-lint-ignore no-explicit-any
  const doc = assembleRopaRegister(minimalRopaInput() as any);
  assert(!/\bintake\b/i.test(doc.text), "customer-facing 'intake' vocabulary leak");
});

Deno.test("doc135 — RoPA: completeness.complete is exposed for the caller's opening-caution branch", () => {
  // deno-lint-ignore no-explicit-any
  const doc = assembleRopaRegister(minimalRopaInput() as any);
  // No activities recorded => not complete on its face.
  assertEquals(doc.completeness.complete, false);
});

// ── LIA — alternatives-table parity (stripSeam re-terminates) ───────────────

import { buildAlternativesConsidered } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

Deno.test("doc135 — LIA: a long, correctly-recorded consent rejection is never degraded to 'could not verify'", () => {
  // >=120 chars, no natural terminal punctuation before the seam-hygiene
  // trim — the exact shape that tripped emit-gate's unterminatedSentence()
  // once the trailing period was stripped to nothing.
  const whyConsent =
    "Workers are in a clear power imbalance with the employer, so consent could not be freely given for safety monitoring applied uniformly across all underground shifts";
  const intake = { necessity_details: { why_consent_not_used: whyConsent } };
  const result = buildAlternativesConsidered(intake);
  const consentRow = result.alternatives.find((a) => /consent/i.test(a.alternative));
  assert(consentRow, "consent alternative row missing");
  assertEquals(consentRow!.why_inadequate, `${whyConsent}.`);
  assert(/[.!?]$/.test(consentRow!.why_inadequate), "why_inadequate left without terminal punctuation");
});

Deno.test("doc135 — LIA: a reason already ending in terminal punctuation is not double-punctuated", () => {
  const why = "Zone sensors would not detect any medical event at all, only unauthorised entry!";
  const intake = { necessity_details: { alternatives: `Alternative considered: Zone sensors\nRejected because: ${why}` } };
  const result = buildAlternativesConsidered(intake);
  const row = result.alternatives.find((a) => /zone sensors/i.test(a.alternative));
  assert(row);
  assertEquals(row!.why_inadequate, why);
});

// ── CPPA ADMT — pathway-dependent findings now flow through ────────────────

import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";

Deno.test("doc135 — ADMT: a pathway-dependent record's per-duty findings are no longer suppressed", () => {
  const base = CPPA_ADMT_GOLDEN.find((g) => g.id === "admt-hr-significant-tuning")!.intake as Bag;
  const pathwayIntake: Bag = {
    ...base,
    system_description:
      "TalentRank scores résumés against role profiles; scores below 40 are automatically declined and scores above 85 are automatically approved, with human review only in between.",
  };
  const computed = computeAdmtV2(pathwayIntake);
  assert(computed.scope.pathwayDependent, "fixture did not trigger pathwayDependent — check the auto-decline/approve regex");
  assertEquals(computed.scope.scopeState, "OUT_OF_SCOPE");
  // Before the fix, allFindings for an OUT_OF_SCOPE record carried only
  // scope.findings; the notice/optOut/access computations were dropped
  // even though the automated pathways are in scope.
  assert(
    computed.allFindings.length >= computed.scope.findings.length,
    "allFindings did not grow to include duty-level findings for the automated pathways",
  );
});

Deno.test("doc135 — ADMT: a plain (non-pathway-dependent) out-of-scope record is unaffected", () => {
  const base = CPPA_ADMT_GOLDEN.find((g) => g.id === "admt-hr-significant-tuning")!.intake as Bag;
  const plainOutOfScope: Bag = { ...base, human_review: "Yes — fully qualifying review, no automated pathway" };
  const computed = computeAdmtV2(plainOutOfScope);
  assertEquals(computed.scope.pathwayDependent, false);
  assertEquals(computed.scope.scopeState, "OUT_OF_SCOPE");
  assertEquals(computed.allFindings, [...computed.scope.findings]);
});

// ── CPPA Cyber — applicability gates ahead of auditor engagement ───────────

Deno.test("doc135 — Cyber: applicability-first gating source is present ahead of the auditor-engagement gate", async () => {
  const src = await Deno.readTextFile(
    new URL(
      "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts",
      import.meta.url,
    ),
  );
  const applicabilityIdx = src.indexOf("applicabilityUnresolved");
  const auditorIdx = src.indexOf("auditorEngagementGating");
  assert(applicabilityIdx > -1 && auditorIdx > -1, "gating variables missing");
  assert(applicabilityIdx < auditorIdx, "applicability gate must be checked before the auditor-engagement gate");
  assert(src.includes("resolveCyberApplicability"));
});

// ── DPIA — Art. 28 existence-vs-coverage wording, sign-off band summary ────

Deno.test("doc135 — DPIA: processor-inventory gap now uses the terms-coverage ask class, not the existence ask class", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts", import.meta.url),
  );
  // The Section-1 processors-inventory producer (previously stale) must now
  // read ask_processor_terms_coverage, matching the Tier-1c block.
  const idx = src.indexOf('information_needed: ASK_PROCESSOR_OBLIGATIONS');
  assert(idx > -1, "processor-obligations gap block not found");
  const nearby = src.slice(idx, idx + 900);
  assert(nearby.includes('"ask_processor_terms_coverage"'), "still wired to the stale ask_processor_contract class");
});

Deno.test("doc135 — DPIA: sign-off guard now names the current residual-risk band counts", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts", import.meta.url),
  );
  assert(src.includes("bandSummary"), "current-band summary variable missing from composeSignoffBody");
});
