// DOC 263 run 3 (2026-09-17, batch 3edc00df, paid ptest review, lia · Vantpoint
// Cyber Defense Ltd, assessment 7f162ba8-d197-41ca-9a69-daa4b34c3fe8) —
// fixes f8/f16/f17/f18/f19/f20.
//
// Root cause (buildAlternativesConsidered, build-upgrade4.ts):
//   1. necessity_details.alternatives is answered as ONE semicolon-joined
//      line ("A; B; C."). The line splitter only breaks after ".;" when
//      followed by a CAPITAL letter, so a plain lower-case-continuation
//      semicolon list never split — the whole line became ONE bare
//      alternative with no rationale, long enough to trip the leak-detector
//      fallback in the "Alternatives" table (f18/f19), and the three real
//      alternatives never appeared by name (f20).
//   2. The top-level free-text summary alternatives_considered ("Vantpoint
//      considered relying on client-side alerting alone and a lower-fidelity
//      aggregate-only log feed; both are addressed with their rejection
//      reasons in the necessity record") was parsed as if it were itself an
//      alternative, producing "2 carry a reason and 1 does not" (f16) and
//      quoting the summary as "the alternative left unexplained" (f17).
//
// Fixed by: (a) a bare-semicolon-list split scoped to
// necessity_details.alternatives only (bareAlternativesListSegments /
// parseAlternatives(text, { allowBareSemicolonSplit: true })), pairing each
// named alternative with its own recorded rationale via the existing
// cross-source token-overlap dedup; (b) the ¶19 "alternatives" slot
// (lia-skeleton-assemble.ts) now prefers necessity_details.alternatives over
// the flat alternatives_considered summary, so the summary is never quoted
// as if it were one of the alternatives.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildAlternativesConsidered } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { buildDocumentationTyped, buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

// The panel fixture's own values (src/lib/ptestPanels/lia.ts, lia-p02 —
// Vantpoint Cyber Defense Ltd), reproduced verbatim.
const VANTPOINT_NECESSITY: Bag = {
  alternatives_considered:
    "Vantpoint considered relying on client-side alerting alone and a lower-fidelity aggregate-only log feed; both are addressed with their rejection reasons in the necessity record.",
  necessity_details: {
    alternatives:
      "Client-side alerting without a central SOC; an aggregate-only log feed with no per-account detail; sampling a subset of authentication events rather than a full feed.",
    alternatives_rationale:
      "Client-side alerting alone — most clients lack the in-house capacity to triage alerts around the clock, which is the specific gap the managed SOC service fills.\nAggregate-only feed — a privileged-account compromise is only visible when a specific account's pattern is compared over time, which an aggregate feed cannot show.\nSampling — an intrusion attempt can be a single anomalous login; sampling would miss the majority of real attempts.",
    why_consent_not_used:
      "Consent from every individual whose account might generate a log event is not practicable across 90 client networks and would let an attacker's own account simply decline monitoring.",
  },
};

const THREE_NAMES = [
  "Client-side alerting without a central SOC",
  "an aggregate-only log feed with no per-account detail",
  "sampling a subset of authentication events rather than a full feed",
];

Deno.test("doc263 3edc00df LIA-1 — Vantpoint: the three recorded alternatives are named and each carries its own recorded reason", () => {
  const f = buildAlternativesConsidered(VANTPOINT_NECESSITY);
  const byName = new Map(f.alternatives.map((a) => [a.alternative, a]));

  for (const name of THREE_NAMES) {
    const entry = byName.get(name);
    assert(entry, `expected an alternative named "${name}"; got ${JSON.stringify(f.alternatives.map((a) => a.alternative))}`);
    assert(entry!.rationale_recorded, `${name}: expected rationale_recorded`);
    assert(entry!.why_inadequate.trim().length > 0, `${name}: expected a non-empty why_inadequate`);
  }
  // f18/f19 — no alternative reads "Not recorded" or the leak-detector's
  // fallback; every alternative this test names has an actual reason.
  for (const name of THREE_NAMES) {
    assert(!byName.get(name)!.why_inadequate.includes("could not verify this item"), name);
  }
  // f16/f17/f20 — the top-level free-text summary never survives as its own
  // unexplained "alternative" (whole or split on its semicolon): every
  // entry in the final, deduped list carries a recorded reason.
  assertEquals(
    f.alternatives.filter((a) => !a.rationale_recorded).map((a) => a.alternative),
    [],
    "no alternative should be left unexplained (the free-text summary must not survive as a bare entry)",
  );
});

Deno.test("doc263 3edc00df LIA-1 — Vantpoint: 3 of 3 named alternatives are explained (never '2 carry a reason and 1 does not')", () => {
  const f = buildAlternativesConsidered(VANTPOINT_NECESSITY);
  const named = f.alternatives.filter((a) => THREE_NAMES.includes(a.alternative));
  assertEquals(named.length, 3, `expected all three named alternatives to survive dedup: ${JSON.stringify(f.alternatives.map((a) => a.alternative))}`);
  assertEquals(named.filter((a) => a.rationale_recorded).length, 3, "3 of 3 named alternatives must carry a recorded reason");
  assert(!f.application.includes("do not"), `application must not claim an unexplained alternative: ${f.application}`);
  assert(!f.application.includes("does not"), `application must not claim an unexplained alternative: ${f.application}`);
});

type RenderedDoc = { document: { sections: Array<{ id?: string; paragraphs: Array<{ key?: string; text: string }> }> } };

function vantpointReport(): { report: Bag; assembled: RenderedDoc } {
  const intake: Bag = {
    organization_name: "Vantpoint Cyber Defense Ltd",
    relationship_type: "B2B contact",
    jurisdictions: ["United Kingdom (UK GDPR)", "EU (GDPR)"],
    stated_purpose: "Detect and escalate unauthorised access attempts on client networks before an intrusion succeeds.",
    ...VANTPOINT_NECESSITY,
    purpose_details: {
      interest_type: "Security / fraud prevention",
      interest_holder: "Our organisation and a third party (e.g. business partner)",
      interest_statement:
        "Vantpoint's managed-security clients contract for intrusion detection across their networks; correlating authentication events by named account is what makes a privileged-account compromise visible in time to act.",
      specific_benefit:
        "In Q2 2026 Vantpoint's SOC escalated 46 confirmed intrusion attempts across its client base, with a median time-to-escalation of 9 minutes from first anomalous event.",
      beneficiary: "Our business and a third party",
      controller_is_public_authority: "No",
    },
    balancing_details: {
      reasonable_expectation: "Probably — disclosed in privacy notice and consistent with the relationship",
      reasonable_expectation_detail:
        "Each client's own IT-use policy discloses network security monitoring to its staff; individuals whose accounts are monitored are the client's own employees or contractors, not Vantpoint's customers directly.",
      collection_context:
        "Authentication events are collected automatically by the client's identity system and forwarded to Vantpoint's SOC platform in real time under the managed-security services contract.",
      potential_harm: "Limited — minor inconvenience or unwanted contact",
      potential_harm_detail: "A false-positive alert can result in a client's IT team temporarily locking an account pending verification, causing a short access delay for the individual.",
      potential_harms: ["Loss of autonomy or control over data"],
      safeguards: ["Encryption at rest and in transit", "Access controls / least privilege", "Retention limits", "Vendor due diligence"],
    },
  };
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if ((typed as Bag).determination_override) report.lia_determination = (typed as Bag).determination_override;
  report.information_needed = (typed as Bag).information_needed;
  report.documentation_recommendations = buildDocumentationTyped(report, "Test disclaimer.");
  const assembled = assembleLiaSkeletonDocument(report, intake, { deterministic: true }) as unknown as RenderedDoc;
  return { report, assembled };
}

Deno.test("doc263 3edc00df LIA-1 — Vantpoint render: necessity_test:1 names the three alternatives, not the free-text summary", () => {
  const { assembled } = vantpointReport();
  const sec = assembled.document.sections.find((s) => s.id === "necessity_test")!;
  const p1 = sec.paragraphs.find((p) => p.key === "necessity_test:1")!;
  assert(p1, "necessity_test:1 must render");
  for (const name of THREE_NAMES) assertStringIncludes(p1.text, name);
  assert(
    !p1.text.includes("Vantpoint considered relying on client-side alerting alone"),
    "the free-text summary must not be quoted as if it were an alternative",
  );
});

Deno.test("doc263 3edc00df LIA-1 — Vantpoint render: necessity resolves (never '2 carry a reason and 1 does not')", () => {
  const { report } = vantpointReport();
  const tpt = (report as Bag).three_part_test as Bag;
  assertEquals((tpt.necessity_test as Bag).verdict, "passes");
  const sec = ((report as Bag).alternatives_considered) as Bag;
  assertEquals(sec.count_with_rationale, (sec.alternatives as unknown[]).length);
});
