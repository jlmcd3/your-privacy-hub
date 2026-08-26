// PN-A3 pathway render battery (doc 75 §4 + NR-19 recommendation,
// CEO-directed 2026-08-26): the never-reviewed rendering pathways — the
// full-opt-out family (§4.1), the employment/education exception family
// (§4.3), the out-of-scope document shape, and the unable-to-assess
// composition — are now exercised as FULL document renders on every test
// run, permanently. Each render is swept for the defect classes doc 75
// surfaced: banned register, the DRAFT tripwire, double periods, the
// DEF-1 verb agreement, the NR-75 mid-sentence splice break, and the
// NR-08 missing-facts misstatement.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";

type Bag = Record<string, unknown>;

function renderText(intake: Bag): string {
  const computed = computeAdmtV2(intake as never);
  const doc = assembleAdmtV2Document({
    intake: intake as never,
    computed,
    exhibit: null,
    organizationName: String(intake.organization_name ?? ""),
    systemName: String(intake.system_name ?? ""),
  });
  return doc.sections
    .map((s) =>
      [s.title, ...s.paragraphs.map((p: Bag) =>
        p.kind === "table" && p.table
          ? [(p.table as Bag).title, ...((p.table as { rows: string[][] }).rows ?? []).map((r) => r.join(" | "))].join("\n")
          : String(p.text ?? "")
      )].join("\n")
    )
    .join("\n\n");
}

/** The doc-75 defect-class sweep every pathway render must pass. */
function sweep(text: string, label: string) {
  for (const banned of [
    "on the record as documented",
    "the record shows",
    "on this record",
    "DRAFT",
    "requirements is not currently supported", // DEF-1
    "used in not reported", // NR-75
    "method(s)", // NR-34
  ]) {
    assert(!text.includes(banned), `${label}: rendered document carries "${banned}"`);
  }
  assert(!/[a-z)]\.\./.test(text), `${label}: double period rendered (DEF-4 class)`);
}

const BASE: Bag = {
  organization_name: "Pathway Test Co",
  system_name: "PathSys",
  system_type: "Ranking / recommender",
  system_description: "PathSys ranks candidates for the covered decision.",
  decision_domains: ["Hiring or admission decisions"],
  human_review: "No — fully automated, no human review",
  notice_delivery: ["Separate standalone Pre-use Notice"],
  notice_has_specific_purpose: "Yes",
  notice_purpose_text: "PathSys is used to rank applicants for warehouse roles.",
  notice_has_opt_out_desc: "Yes",
  notice_has_access_desc: "Yes",
  notice_has_anti_retaliation: "Yes",
  notice_has_how_it_works: "Yes",
  notice_has_alternative_process: "Yes",
  access_submission_method: "Consumers submit requests through the careers portal.",
  access_verification: "Identity is verified against the application record.",
  access_response_timeline: "Within 45 days, extendable to 90",
};

Deno.test("PN-A3 render — the full-opt-out pathway (§4.1) assembles clean", () => {
  const intake: Bag = {
    ...BASE,
    opt_out_exception: "No exception — we provide a full opt-out right",
    opt_out_methods: ["Web form", "Email"],
    opt_out_no_cookie_banner: "We offer ADMT-specific routes",
    opt_out_no_account_required: "No account is required",
    opt_out_confirmation_mechanism: "A confirmation email is sent when the opt-out is processed.",
    opt_out_15_day_process: "The ADMT flag is cleared within 15 business days.",
  };
  const text = renderText(intake);
  sweep(text, "full-opt-out");
  assertStringIncludes(text, "4.1 Full Opt-Out Pathway");
  assertStringIncludes(text, "full opt-out right rather than relying on a § 7221(b) exception");
  // NR-34: proper pluralization in the rendered table.
  assertStringIncludes(text, "2 methods selected");
});

Deno.test("PN-A3 render — the hiring/admission exception (§4.3) assembles clean", () => {
  const intake: Bag = {
    ...BASE,
    opt_out_exception:
      "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
    exception_sole_use: "Yes",
    exception_testing: "Yes — testing performed and documented",
    exception_fairness_doc: "Adverse-impact analysis completed annually; documentation retained.",
  };
  const text = renderText(intake);
  sweep(text, "hiring-exception");
  assertStringIncludes(text, "Hiring / admission exception");
  assertStringIncludes(text, "hiring/admission exception under § 7221(b)(2)");
});

Deno.test("PN-A3 render — the out-of-scope document shape (NR-19) assembles clean", () => {
  const intake: Bag = {
    ...BASE,
    human_review:
      "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
  };
  const text = renderText(intake);
  sweep(text, "out-of-scope");
  assertStringIncludes(text, "out of scope");
  assertStringIncludes(text, "qualifying human involvement");
});

Deno.test("PN-A3 render — unable-to-assess names ONLY the missing fact (NR-08 + DEF-2 end to end)", () => {
  // Domain SELECTED, human review unsure: the old sentence falsely claimed
  // the decision category was missing.
  const unsureIntake: Bag = { ...BASE, human_review: "Not applicable / unsure" };
  const unsureText = renderText(unsureIntake);
  sweep(unsureText, "unable-to-assess (unsure)");
  assertStringIncludes(unsureText, "The key missing fact is the human role.");
  assert(
    !unsureText.includes("The key missing facts are the decision category and the human role."),
    "unable-to-assess text still misstates the selected decision category as missing",
  );
  assert(!unsureText.includes("No human review reported"), "DEF-2 prefix collision resurfaced");

  // Neither fact supplied: the both-facts form still renders.
  const blankIntake: Bag = { ...BASE, decision_domains: [], human_review: "" };
  const blankText = renderText(blankIntake);
  sweep(blankText, "unable-to-assess (blank)");
  assertStringIncludes(blankText, "The key missing facts are the decision category and the human role.");
  // NR-75: the blank-domains sentence degrades honestly, never mid-splices.
  assertStringIncludes(blankText, "has not identified the decision domain");
});

Deno.test("PN-A3 render — the §4.1/§4.3 ratified fixed blocks render in situ (doc 75 §4)", () => {
  const fullOptOut = renderText({
    ...BASE,
    opt_out_exception: "No exception — we provide a full opt-out right",
    opt_out_methods: ["Web form", "Email"],
  });
  const hiring = renderText({
    ...BASE,
    opt_out_exception:
      "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
  });
  // The fixed legal blocks are long single paragraphs anchored on their
  // pinpoints; presence of the pinpoint inside the pathway section is the
  // in-situ render check doc 75 §4 asked for.
  assertStringIncludes(fullOptOut, "§ 7221");
  assertStringIncludes(hiring, "§ 7221(b)(2)");
});
