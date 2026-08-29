// ADMT-1 (2026-08-28, doc 96/100 of the spine-vs-prompt comparison
// program) — MECHANICAL ADVERTISING-EXCLUSION GATE.
//
// The v2 deterministic engine already computed an advertisingEffect factor
// (WEIGHS_AGAINST, cited to 11 CCR § 7001(ddd)(6)) whenever
// admt_detail.solely_advertising = "Yes", but never consulted it in the
// scopeState composite unless decision_domains ALSO had a value (the
// advertisingConflict branch). A record with decision_domains EMPTY and
// solely_advertising = Yes — the ordinary shape for a business whose System
// is used only for advertising, since the domains enum has no "advertising"
// member to select — fell into the same UNABLE_TO_ASSESS bucket as a
// business that answered nothing at all, and raised a spurious "human
// review not resolved" ask despite human review being irrelevant to a
// decision this System doesn't make. This suite pins the fix: that specific
// record now resolves OUT_OF_SCOPE with the advertising exclusion as its
// basis, and every adjacent case (a real domain present, no advertising
// answer, "No" answer, the domain+advertising conflict case) is unchanged.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeScope } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";

type Bag = Record<string, unknown>;

function scopeFor(opts: {
  decision_domains?: string[];
  human_review?: string;
  solely_advertising?: string;
}) {
  return computeScope({
    organization_name: "Test Co",
    system_name: "AdPicker",
    decision_domains: opts.decision_domains ?? [],
    human_review: opts.human_review ?? "",
    admt_detail: { solely_advertising: opts.solely_advertising ?? "" },
  } as never);
}

Deno.test("ADMT-1 — empty domains + solely_advertising=Yes resolves OUT_OF_SCOPE via the advertising exclusion", () => {
  const s = scopeFor({ solely_advertising: "Yes — solely advertising", human_review: "Not applicable / unsure" });
  assertEquals(s.scopeState, "OUT_OF_SCOPE");
  assertEquals(s.advertisingEffect, "WEIGHS_AGAINST");
});

Deno.test("ADMT-1 — the spurious human-involvement finding is suppressed once the advertising exclusion is established", () => {
  const s = scopeFor({ solely_advertising: "Yes — solely advertising", human_review: "Not applicable / unsure" });
  assert(
    !s.findings.some((f: Bag) => f.criterion === "Human involvement"),
    `expected no human-involvement ask once the record is OUT_OF_SCOPE via advertising; got ${JSON.stringify(s.findings)}`,
  );
});

Deno.test("ADMT-1 — the gate fires even when human_review is completely blank, not just 'unsure'", () => {
  const s = scopeFor({ solely_advertising: "Yes — solely advertising", human_review: "" });
  assertEquals(s.scopeState, "OUT_OF_SCOPE");
  assertEquals(s.findings.length, 0);
});

Deno.test("ADMT-1 — the gate fires regardless of a qualifying human_review answer being present too (advertising exclusion is dispositive on its own)", () => {
  const s = scopeFor({
    solely_advertising: "Yes — solely advertising",
    human_review: "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
  });
  assertEquals(s.scopeState, "OUT_OF_SCOPE");
});

Deno.test("ADMT-1 — unchanged: empty domains + solely_advertising='No' still yields UNABLE_TO_ASSESS with the human-involvement ask", () => {
  const s = scopeFor({ solely_advertising: "No", human_review: "" });
  assertEquals(s.scopeState, "UNABLE_TO_ASSESS");
  assert(s.findings.some((f: Bag) => f.criterion === "Human involvement"));
});

Deno.test("ADMT-1 — unchanged: empty domains + solely_advertising unanswered still yields UNABLE_TO_ASSESS", () => {
  const s = scopeFor({ human_review: "" });
  assertEquals(s.scopeState, "UNABLE_TO_ASSESS");
});

Deno.test("ADMT-1 — unchanged: a real regulated domain with solely_advertising=Yes is still the INCONSISTENT_RECORD conflict, not this gate", () => {
  const s = scopeFor({
    decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
    solely_advertising: "Yes — solely advertising",
    human_review: "Not applicable / unsure",
  });
  assertEquals(s.scopeState, "INCONSISTENT_RECORD");
  assert(s.findings.some((f: Bag) => f.criterion === "Scope conflict"));
});

Deno.test("ADMT-1 — unchanged: a real regulated domain with no advertising answer resolves on human_review as before", () => {
  const s = scopeFor({
    decision_domains: ["Hiring or admission decisions"],
    human_review: "No — fully automated, no human review",
  });
  assertEquals(s.scopeState, "IN_SCOPE");
});

Deno.test("ADMT-1 — determinism: identical input produces byte-identical output", () => {
  const input = { solely_advertising: "Yes — solely advertising", human_review: "" };
  const a = JSON.stringify(scopeFor(input));
  const b = JSON.stringify(scopeFor(input));
  assertEquals(a, b);
});
