// DOC 142 (2026-09-02) — CEO-ruled state change: a WHOLLY-ABSENT
// a5_harm_pathways (zero risk rows recorded — distinct from doc 127's
// named-but-unassessed case) yields "Additional Information Required"
// (the assessment-incomplete state) instead of a balancing outcome. CEO
// ruling verbatim: "Yes, a wholly-absent a5_harm_pathways yield 'Additional
// Information Required' instead of 'Do Not Proceed'." The ratified
// benefits-none stop cell continues to govern every record that DOES carry
// risk rows. Plus the doc-142 trigger-traceability invariant: every trigger
// rendered as Engaged carries a traceable normalized intake fact.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";

type Bag = Record<string, unknown>;

const REPORT: Bag = {};

const BENEFIT: Bag = {
  benefit_consumer_identified: "Yes",
  a4_benefit_consumer: "Consumers receive shipment updates without re-entering details",
  a4_benefit_consumer_fact: "Support tickets about lost shipments fell 30% in the pilot",
};

const LOW_PATHWAY: Bag = {
  harm: "(H) Psychological harms",
  likelihood: "Unlikely",
  severity: "Minimal",
  data_involved: "Contact identifiers",
  actor: "Internal analytics team",
  cause: "Over-notification",
};

const UNASSESSED_PATHWAY: Bag = {
  harm: "(G) Reputational harms",
  likelihood: "Likely",
  severity: "",
  data_involved: "Browsing history",
};

function engineOn(intake: Bag, report: Bag = REPORT) {
  return runRiskFactorEngine(
    { processing_status: "Ongoing", ...intake } as never,
    report as never,
    "2026-09-02",
  );
}

const RELIANCE =
  "The processing should not begin or continue in reliance on this assessment until the identified information is completed.";

Deno.test("doc142 — wholly-absent a5 with no benefit is Additional Information Required, not Do Not Proceed", () => {
  const r = engineOn({});
  assertEquals(r.exec_panel.disposition, "additional information required");
  assertEquals(r.exec_panel.disposition_label, "Additional Information Required");
  const outcome = r.factors.recommended_outcome ?? "";
  assert(outcome.includes(RELIANCE), "reliance sentence missing from the outcome");
  assert(
    outcome.includes("the substantive balance of benefits against risks is not determined"),
    "balance-not-determined sentence missing from the outcome",
  );
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes(
      "Identify and record the risk or risks to consumers’ privacy the Activity creates",
    ),
    "wholly-absent Follow-Up missing from § 4.D",
  );
  assert(
    r.exec_panel.path_forward !== null &&
      r.exec_panel.path_forward.includes("Identify and record the risk or risks"),
    "cover path_forward missing the wholly-absent gap",
  );
  const det = r.factors.determination_text ?? "";
  assert(det.includes("nothing to weigh on either side"), "no-record determination sentence lost");
  assert(det.includes('stated as "Additional Information Required."'), "cross-label sentence not AIR");
});

Deno.test("doc142 — wholly-absent a5 with a material benefit is also AIR; no favorable cell conclusion composes", () => {
  const r = engineOn({ ...BENEFIT });
  assertEquals(r.exec_panel.disposition, "additional information required");
  const det = r.factors.determination_text ?? "";
  assert(
    !det.includes("the benefits of the Activity outweigh"),
    "a favorable cell conclusion composed with zero risk rows",
  );
  assert(
    det.includes("identifies no risk under § 4.A") &&
      det.includes("the substantive balance of benefits against risks is not determined"),
    "incomplete-state determination sentence missing",
  );
  const execDet = r.blocks["executive_summary:8"] ?? "";
  assert(
    execDet.includes("No risk to consumers’ privacy is identified in the intake"),
    "exec determination still asserts a balance",
  );
  const balance = r.tables["iv_determination:8"];
  assert(balance, "balance summary table missing (benefit is on the record)");
  const flat = balance.rows.map((row) => row.join(" | ")).join("\n");
  assert(flat.includes("No risk identified in the intake"), "balance table right column overstated");
});

Deno.test("doc142 — scope limit: the benefits-none stop stays for records that DO carry a risk pathway", () => {
  const r = engineOn({ a5_harm_pathways: [LOW_PATHWAY] });
  assertEquals(r.exec_panel.disposition, "do not proceed - remediable");
  assertEquals(r.exec_panel.disposition_label, "Do Not Proceed");
});

Deno.test("doc142 — scope limit: the named-but-unassessed case keeps its doc-127 shape (not the wholly-absent one)", () => {
  const withBenefit = engineOn({ ...BENEFIT, a5_harm_pathways: [UNASSESSED_PATHWAY] });
  assertEquals(withBenefit.exec_panel.disposition, "additional information required");
  assert(
    withBenefit.exec_panel.path_forward !== null &&
      withBenefit.exec_panel.path_forward.includes("Provide the likelihood and severity"),
    "named-but-unassessed path_forward changed",
  );
  // Conservative-only precedence still holds: a stop stands over the
  // named-risk information gap (doc 127; only the ZERO-row case changed).
  const noBenefit = engineOn({ a5_harm_pathways: [LOW_PATHWAY, UNASSESSED_PATHWAY] });
  assertEquals(noBenefit.exec_panel.disposition, "do not proceed - remediable");
});

Deno.test("doc142 — precedence: discontinued processing still outranks the wholly-absent gap", () => {
  const r = engineOn({ processing_status: "Discontinued" });
  assertEquals(r.exec_panel.disposition, "no processing decision required");
  assertEquals(r.exec_panel.path_forward, null);
});

Deno.test("doc142 — banned register absent from the new wholly-absent surfaces", () => {
  const r = engineOn({ ...BENEFIT });
  const all = [
    ...Object.values(r.blocks),
    ...Object.values(r.factors),
    r.exec_panel.path_forward ?? "",
  ].join("\n").toLowerCase();
  for (
    const b of [
      "the record shows",
      "the record reflects",
      "the record indicates",
      "the record demonstrates",
      "the record establishes",
      "on this record",
    ]
  ) {
    assert(!all.includes(b), `banned register "${b}" composed`);
  }
});

// ── Trigger traceability ─────────────────────────────────────────────────────

const GENERIC_REPORT: Bag = {
  scope_and_triggers: {
    narrative: [
      "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.",
      "Engaged — 11 CCR § 7150(b)(6) (processing personal information to train an ADMT or identification technology): the record supports this trigger and this activity falls within the risk-assessment obligation.",
    ],
  },
};

Deno.test("doc142 — an Engaged row with the generic basis cites its qualifying intake answer", () => {
  const r = engineOn(
    {
      ...BENEFIT,
      a5_harm_pathways: [LOW_PATHWAY],
      q5_sell_share: "Yes — sell only",
      q18b_admt_training: "Yes",
    },
    GENERIC_REPORT,
  );
  const digest = r.tables["executive_summary:3"];
  assert(digest, "trigger digest missing");
  const b1 = digest.rows.find((row) => row[0].includes("7150(b)(1)"));
  assert(b1, "b(1) digest row missing");
  assert(
    b1[1].includes("the Company answers “Yes — sell only” on selling or sharing personal information (Q5)"),
    "b(1) digest row lacks the qualifying answer",
  );
  const b6 = digest.rows.find((row) => row[0].includes("7150(b)(6)"));
  assert(b6, "b(6) digest row missing");
  assert(b6[1].includes("(Q18b)"), "b(6) digest row lacks the qualifying answer");
  const analysis = r.blocks["iii_analysis:2"] ?? "";
  assert(
    analysis.includes("the Company answers “Yes — sell only” on selling or sharing personal information (Q5)"),
    "§ 3.A lacks the qualifying answer",
  );
  assert(
    !analysis.includes("the information provided supports this trigger"),
    "§ 3.A still renders the generic basis despite a derivable fact",
  );
});

Deno.test("doc142 — a fact-bearing basis is carried verbatim; an unaffirmed prong keeps the generic sentence", () => {
  const r = engineOn(
    {
      ...BENEFIT,
      a5_harm_pathways: [LOW_PATHWAY],
      q5_sell_share: "No",
    },
    {
      scope_and_triggers: {
        narrative: [
          "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the Company sells consumer profiles to ad networks.",
          "Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.",
        ],
      },
    },
  );
  const digest = r.tables["executive_summary:3"];
  assert(digest, "trigger digest missing");
  const b1 = digest.rows.find((row) => row[0].includes("7150(b)(1)"));
  assert(
    b1 && b1[1].includes("the Company sells consumer profiles to ad networks"),
    "fact-bearing basis bytes not carried verbatim",
  );
  // The stored intake does not affirm b(2): never fabricate a qualifying
  // answer — the generic (swept) sentence stays.
  const b2 = digest.rows.find((row) => row[0].includes("7150(b)(2)"));
  assert(
    b2 && b2[1].includes("the information provided supports this trigger"),
    "unaffirmed prong lost its generic basis",
  );
  assert(
    b2 && !b2[1].includes("the Company answers"),
    "a qualifying answer was fabricated for an unaffirmed prong",
  );
});
