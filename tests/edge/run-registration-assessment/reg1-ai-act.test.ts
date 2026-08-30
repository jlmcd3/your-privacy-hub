// REG-1 (doc 106, 2026-08-29) — EU AI Act Art. 49 registration determination.
//
// The four branches of buildAiActRegistration, the narrowed GPAI
// corpus-pending flag, the null no-signal case, the CMP-B8 ledger approval
// of the three aiact-* corpus keys, and the substring law (every registry
// verbatim_quote used by the branches is checked against the corpus rows by
// the pre-existing fail-loud machinery; here we pin the registry rows'
// presence and the composed render).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";
import {
  dutyRow,
  REGISTRATION_DUTY_AUTHORITIES,
} from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-verified-authorities.ts";
import { findUnapprovedRegistrationCorpusKeys } from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-corpus-approval-ledger.ts";

type Bag = Record<string, unknown>;

function intake(over: Bag = {}): Bag {
  return {
    organization_name: "Meridian Analytics GmbH",
    organization_country: "DE",
    role: "controller",
    processes_personal_data: true,
    has_eu_establishment: true,
    markets_served: ["DE", "FR"],
    is_public_authority: false,
    ...over,
  };
}

function build(over: Bag = {}): Bag {
  return buildRegistrationDeliverables(intake(over) as never) as unknown as Bag;
}

function aiAct(over: Bag = {}): Bag {
  return (build(over).ai_act_registration ?? {}) as Bag;
}

// ── Branch A — public-authority deployer ────────────────────────────────────

Deno.test("REG-1 A: public authority + high-risk → Art. 49(3) engaged on a conservative basis", () => {
  const d = aiAct({ ai_high_risk: true, is_public_authority: true });
  assertEquals(d.verdict, "conditional");
  assertEquals(d.status, "analysed");
  assertStringIncludes(String(d.headline), "public authority");
  assertStringIncludes(String(d.reasoning), "Article 49(3)");
  assertStringIncludes(String(d.reasoning), "conservative basis");
  // The point-2 exception is named, never resolved.
  assertStringIncludes(String(d.reasoning), "Article 49(5)");
  assertStringIncludes(String(d.closing_act), "Annex III point");
  const findings = d.findings as Bag[];
  assertEquals(findings.length, 2);
  assertEquals(findings[0].citation, "AI Act Art. 49(3)");
  assertEquals(findings[1].citation, "AI Act Art. 49(5)");
});

// ── Branch B — provider-vs-deployer allocation ──────────────────────────────

Deno.test("REG-1 B: high-risk, not public → the duty is allocated to the provider, never attributed", () => {
  const d = aiAct({ ai_high_risk: true });
  assertEquals(d.verdict, "conditional");
  assertStringIncludes(String(d.reasoning), "Article 49(1)");
  assertStringIncludes(String(d.reasoning), "does not attribute it");
  assertStringIncludes(String(d.closing_act), "under its own name or trademark");
  const findings = d.findings as Bag[];
  const provider = findings.find((f) => f.citation === "AI Act Art. 49(1)");
  const deployer = findings.find((f) => f.citation === "AI Act Art. 49(3)");
  assert(provider && deployer);
  assertEquals(deployer!.verdict, "not_engaged");
  // The Annex VIII Section A filing content is named in the application.
  assertStringIncludes(String(provider!.application), "Annex VIII, Section A");
});

// ── Branch C — GPAI scope negative ──────────────────────────────────────────

Deno.test("REG-1 C: GPAI provider alone → definitive no-Art.-49-duty, grounded on Art. 49 itself", () => {
  const d = aiAct({ ai_general_purpose_provider: true });
  assertEquals(d.verdict, "not_engaged");
  assertEquals(d.status, "analysed");
  assertStringIncludes(String(d.headline), "does not, by itself, engage");
  assertStringIncludes(String(d.reasoning), "Article 6(3)");
});

Deno.test("REG-1 C2: GPAI + high-risk → the high-risk branch wins; the GPAI flag still fires", () => {
  const built = build({ ai_general_purpose_provider: true, ai_high_risk: true });
  const d = (built.ai_act_registration ?? {}) as Bag;
  assertStringIncludes(String(d.reasoning), "Article 49(1)");
  const pending = built.corpus_pending as Bag[];
  assertEquals(pending.length, 1);
  assertStringIncludes(String(pending[0].topic), "general-purpose AI model duties");
});

// ── Branch D — uses_ai only ─────────────────────────────────────────────────

Deno.test("REG-1 D: uses-AI only → no duty established; the Art. 6(3) question is named, not assumed", () => {
  const d = aiAct({ uses_ai_systems: true });
  assertEquals(d.verdict, "not_engaged");
  assertStringIncludes(String(d.headline), "no EU-database registration duty is established");
  assertStringIncludes(String(d.closing_act), "Article 6(3)");
  const findings = d.findings as Bag[];
  assertEquals(findings[0].citation, "AI Act Art. 49(2)");
});

// ── Null and narrowed-flag law ──────────────────────────────────────────────

Deno.test("REG-1: no AI signal → no determination and no flag", () => {
  const built = build();
  assertEquals(built.ai_act_registration, undefined);
  assertEquals((built.corpus_pending as Bag[]).length, 0);
});

Deno.test("REG-1: the pending flag never fires without the GPAI signal", () => {
  for (const over of [{ ai_high_risk: true }, { uses_ai_systems: true }, { ai_high_risk: true, is_public_authority: true }]) {
    assertEquals((build(over).corpus_pending as Bag[]).length, 0, JSON.stringify(over));
  }
});

// ── EU-exposure conditionality ──────────────────────────────────────────────

Deno.test("REG-1: a record with no EU establishment or EU market carries the territorial-scope conditional", () => {
  const d = aiAct({ ai_high_risk: true, has_eu_establishment: false, markets_served: ["US"] });
  assertStringIncludes(String(d.reasoning), "territorial scope");
  const eu = aiAct({ ai_high_risk: true });
  assert(!String(eu.reasoning).includes("territorial scope"), "an EU-established record needs no scope hedge");
});

// ── Registry + ledger law ───────────────────────────────────────────────────

Deno.test("REG-1: the six aiact registry rows exist and their corpus keys are ledger-approved", () => {
  const keys = [
    "aiact_registration_provider",
    "aiact_registration_not_high_risk",
    "aiact_registration_public_deployer",
    "aiact_registration_national_level",
    "aiact_eu_database",
    "aiact_filing_content_provider",
  ];
  for (const k of keys) {
    const row = dutyRow(k);
    assert(row.verbatim_quote.length > 0, k);
    assertEquals(row.jurisdiction, "EU", k);
  }
  const unapproved = findUnapprovedRegistrationCorpusKeys(
    REGISTRATION_DUTY_AUTHORITIES.filter((r) => r.corpus_key.startsWith("aiact-")),
  );
  assertEquals(unapproved, []);
});

// ── Render ──────────────────────────────────────────────────────────────────

Deno.test("REG-1: the determination renders as its own block with the verbatim standard quoted", () => {
  const built = build({ ai_high_risk: true });
  const report: Bag = { registration_deliverables: built, ...built };
  const text = JSON.stringify(assembleRegistrationSkeletonDocument(report, intake({ ai_high_risk: true })));
  // RE-PIN BATCH 18b (doc 113 S2.16): the run-in label became the h3
  // heading chunk "EU AI Act registration — <citation>".
  assertStringIncludes(text, "EU AI Act registration — AI Act Art. 49(1)");
  assertStringIncludes(text, "AI Act Art. 49(1)");
  // The verbatim standard from the approved corpus row renders in the findings line.
  assertStringIncludes(text, "Before placing on the market or putting into service a high-risk AI system listed in Annex III");
  // The completing-fact sentence survives the reasoning budget (own field).
  assertStringIncludes(text, "under its own name or trademark");
});
