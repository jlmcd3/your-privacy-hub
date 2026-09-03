// DOC 141 (2026-09-02) — closure_condition prose guard.
//
// The §8.1 "Closure condition" and §8.2 "What resolves it" table columns
// render each finding's closure_condition VERBATIM (admt-v2-assemble.ts
// buildActionsSection). The deterministic grader proved raw intake tokens
// ("opt_out_exception", "access_readiness.b1_purpose_ready",
// "b2_logic_ready", "b3_output_use_ready") reaching customer PDFs through
// that pathway. This file proves, for every golden fixture plus hand-built
// variants that force the specific findings the grader flagged, that no
// closure_condition routed to §8.1/§8.2 carries a raw field token.
//
// Scope note (per-instance rule): two closures intentionally keep their
// token form because their findings can only ever route to §8.3
// Recommendations, whose table renders no closure column — the opt-out
// designated-methods finding (always GAP/priority-2) and the vendor
// independent-coverage finding (always PARTIAL/priority-3). The sweep here
// mirrors the assemble routing exactly, so those stay out of scope.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";

// The exact tokens the grader proved in rendered PDFs, plus every sibling
// field prefix authored in the same closure strings, plus a general
// snake_case sweep — customer prose never carries an underscore.
const RAW_TOKEN_RE = /\b(opt_out_exception|access_readiness|b\d_\w+_ready|admt_detail\.\w+|human_review|decision_domains|notice_delivery|notice_has_\w+|opt_out_\w+|access_\w+)\b/;
const SNAKE_CASE_RE = /[A-Za-z0-9]+_[A-Za-z0-9]+/;

// Deterministic-sweep banned phrases — never introduced by the DOC 141
// rewording.
const BANNED_PHRASES = [
  "the record shows", "the record reflects", "the record indicates",
  "the record demonstrates", "the record establishes", "on this record",
];

type Finding = {
  area: string; criterion: string; priority: number;
  substantive_state: string; closure_condition: string;
};

// Mirrors buildActionsSection's routing: §8.1 = priority 1; §8.2 =
// INSUFFICIENT_RECORD with priority != 1. §8.3 does not render closures.
function renderedClosureFindings(findings: Finding[]): Finding[] {
  return findings.filter((f) => f.priority === 1 || (f.substantive_state === "INSUFFICIENT_RECORD" && f.priority !== 1));
}

function scanFindings(findings: Finding[], source: string, hits: string[]) {
  for (const f of renderedClosureFindings(findings)) {
    const c = String(f.closure_condition ?? "");
    if (RAW_TOKEN_RE.test(c) || SNAKE_CASE_RE.test(c)) {
      hits.push(`[${source}] ${f.area}/${f.criterion}: raw token in rendered closure: "${c}"`);
    }
    const lower = c.toLowerCase();
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase)) hits.push(`[${source}] ${f.area}/${f.criterion}: banned phrase "${phrase}" in closure: "${c}"`);
    }
  }
}

Deno.test("DOC141 — no golden fixture renders a raw-token closure condition into §8.1/§8.2", () => {
  const hits: string[] = [];
  for (const g of CPPA_ADMT_GOLDEN) {
    const c = computeAdmtV2(g.intake as Record<string, unknown>);
    scanFindings(c.allFindings as Finding[], g.id, hits);
  }
  assertEquals(hits, [], `raw tokens reached a rendered closure column:\n${hits.join("\n")}`);
});

// ---------------------------------------------------------------------------
// Targeted variants forcing the exact findings the grader flagged, so the
// guard holds even if no golden fixture happens to fire them.
// ---------------------------------------------------------------------------

const BASE_INTAKE: Record<string, unknown> = {
  organization_name: "Closure Prose Co",
  system_name: "ClosureCheck",
  system_type: "ML classifier",
  system_description: "Synthetic intake exercising the closure-condition pathways; not a real customer record.",
  decision_domains: ["Hiring or admission decisions"],
  human_review: "No — fully automated, no human review",
  notice_delivery: ["Separate standalone Pre-use Notice"],
  opt_out_exception: "No exception — we provide a full opt-out right",
};

Deno.test("DOC141 — unresolved opt-out pathway closure is prose, not the opt_out_exception token", () => {
  const c = computeAdmtV2({ ...BASE_INTAKE, opt_out_exception: "Something else entirely" });
  const f = (c.allFindings as Finding[]).find((x) => x.area === "Opt-Out" && x.criterion === "Selected pathway");
  assert(f, "expected the unresolved-pathway finding to fire");
  assertEquals(f!.closure_condition, "The Company confirms which opt-out pathway or § 7221(b) exception it relies on");
  assert(!RAW_TOKEN_RE.test(f!.closure_condition) && !SNAKE_CASE_RE.test(f!.closure_condition), `raw token: "${f!.closure_condition}"`);
});

Deno.test("DOC141 — all six access-readiness closures are prose built from the element's human label", () => {
  // No access_readiness answers → all six fire as INSUFFICIENT_RECORD
  // follow-ups, which §8.2 renders. DOC 158 added the § 7222(b)(4) element.
  const c = computeAdmtV2({ ...BASE_INTAKE });
  const readinessFindings = (c.allFindings as Finding[]).filter((x) => x.area === "Access" && x.criterion.startsWith("Explanation readiness"));
  assertEquals(readinessFindings.length, 6, "expected all six readiness elements to fire");
  const expectedLabels = ["Specific purpose", "Logic / parameters", "Output and use", "Outcome / future use", "Human role", "Anti-retaliation and other rights"];
  for (const label of expectedLabels) {
    const f = readinessFindings.find((x) => x.criterion === `Explanation readiness — ${label}`);
    assert(f, `missing readiness finding for "${label}"`);
    assertEquals(f!.closure_condition, `The Company confirms it can produce the "${label}" element of the access explanation`);
    assert(!RAW_TOKEN_RE.test(f!.closure_condition) && !SNAKE_CASE_RE.test(f!.closure_condition), `raw token: "${f!.closure_condition}"`);
  }
});

Deno.test("DOC141 — human-appeal, employment-exception, vendor-gap, and conflict closures are prose", () => {
  const hits: string[] = [];
  const variants: Record<string, Record<string, unknown>> = {
    "human-appeal": {
      ...BASE_INTAKE,
      opt_out_exception: "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision",
      admt_detail: { appeal_trained: "No", appeal_authority_overturn: "No", appeal_step_count: "" },
    },
    "employment-exception": {
      ...BASE_INTAKE,
      opt_out_exception: "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
      admt_detail: { sole_use_attestation: "No — the output is also used for other purposes", nondiscrimination_testing: "No testing performed" },
    },
    "vendor-gap": {
      ...BASE_INTAKE,
      third_party_admt: "Acme ADMT Platform",
      admt_detail: { hosting: "Hosted by the vendor", v_optout: "No", v_assist: "No" },
    },
    "advertising-conflict": {
      ...BASE_INTAKE,
      admt_detail: { solely_advertising: "Yes — behavioral advertising only" },
    },
    "unresolved-human-review": {
      ...BASE_INTAKE,
      human_review: "",
    },
  };
  for (const [name, intake] of Object.entries(variants)) {
    const c = computeAdmtV2(intake);
    scanFindings(c.allFindings as Finding[], name, hits);
  }
  assertEquals(hits, [], `raw tokens reached a rendered closure column:\n${hits.join("\n")}`);
});
