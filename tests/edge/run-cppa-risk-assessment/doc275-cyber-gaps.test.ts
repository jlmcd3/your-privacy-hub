// DOC 275 §19.1 row 3 (CEO-approved 2026-09-19) — impact_intake.cyberGaps
// (Yes/No; form label "Have you identified cybersecurity gaps relevant to
// this processing?") was never read by the engine. A known cybersecurity
// gap is a source/cause of the unauthorised-access negative impact
// (§ 7152(a)(5)) and a deficiency in safeguards (§ 7152(a)(6)); this batch
// wires it into three existing places, in the § 7152(a) sequence the CEO
// required — (a)(5) negative impacts, then (a)(6) safeguards, then the
// § 7152(a)(7)-(8) weighing and follow-ups — without moving any likelihood,
// severity, credit, rating, or disposition:
//
//   1. § 7152(a)(5) — one sentence on the (A) Unauthorized access… risk's
//      own paragraph (in its source/cause prose), when a row for that harm
//      is on the record and cyberGaps is "Yes". Never invents a risk row:
//      where no (A) row exists, only item 2 fires.
//   2. § 7152(a)(6) — one sentence in the safeguards sub-part (the same
//      "iv_determination:2" block, printed after the (a)(5) paragraphs, so
//      document order still reads (a)(5) then (a)(6)): "Yes" with no a6
//      safeguard naming the gaps/(A) category states the deficiency; "Yes"
//      with one states the credit is already recorded above; "No" states
//      the fact (so it no longer reads like an unanswered question); blank
//      prints nothing.
//   3. § 4.D — a Follow-Up asking the record to be completed on "Yes".
//
// Two test styles, matching this suite's convention:
//   (a) unit-level, calling runRiskFactorEngine directly on a minimal
//       intake (doc142-zero-a5-air.test.ts's pattern) — precise sentence
//       and provenance-source assertions, and a byte-for-byte rating check;
//   (b) one integration-level render of the ptest panel fixture named in
//       the batch's own verification instructions
//       (cppa-risk-p01-retail-loyalty-share, whose recorded cyberGaps is
//       "No"), through the SAME offline deterministic call chain as
//       tests/edge/ptest/determinism.test.ts.
//
// NOT RUN by this agent (hard rule: no `deno test`). Run with:
//   deno test -A tests/edge/run-cppa-risk-assessment/doc275-cyber-gaps.test.ts

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-factor-engine.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { reviewTextOf } from "../../../supabase/functions/ptest-run-driver/_local/review/determinism.ts";
import { PANEL_CPPA_RISK } from "../../../src/lib/ptestPanels/cppa-risk.ts";

type Bag = Record<string, unknown>;

// ── Unit-level fixtures ─────────────────────────────────────────────────────

const REPORT: Bag = {};

const A_HARM = "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability";
const C_HARM = "(C) Impairment of consumer control over personal information";

const A_PATHWAY: Bag = {
  harm: A_HARM,
  likelihood: "Unlikely",
  severity: "Moderate",
  data_involved: "Customer payment tokens",
  actor: "An external attacker",
  cause: "A misconfigured storage bucket",
  source: "The billing database",
};

const C_PATHWAY: Bag = {
  harm: C_HARM,
  likelihood: "Possible",
  severity: "Minimal",
  data_involved: "Browsing history",
  actor: "The business itself",
  cause: "Notice ambiguity",
};

const SOURCE_SENTENCE =
  "The Company reports that it has identified cybersecurity gaps relevant to this processing, which is a source of this risk.";
const SAFEGUARDS_CREDITED_SENTENCE =
  "The Company reports identified cybersecurity gaps relevant to this processing and records the safeguards above against them.";
const SAFEGUARDS_UNCREDITED_SENTENCE =
  "The Company reports identified cybersecurity gaps relevant to this processing; no safeguard directed at those gaps is recorded.";
const SAFEGUARDS_NEGATIVE_SENTENCE =
  "The Company reports that it has not identified cybersecurity gaps relevant to this processing.";
const FOLLOW_UP_SENTENCE = "Describe the identified cybersecurity gaps and the safeguard that answers each one.";

function engineOn(intake: Bag) {
  return runRiskFactorEngine(
    { processing_status: "Ongoing", a5_harm_pathways: [A_PATHWAY, C_PATHWAY], ...intake } as never,
    REPORT as never,
    "2026-09-19",
  );
}

// ── Item 1 — § 7152(a)(5) source/cause sentence on the (A) risk paragraph ──

Deno.test("doc275 cyberGaps — item 1: cyberGaps Yes adds the source sentence to the (A) risk's own paragraph only", () => {
  const r = engineOn({ impact_intake: { cyberGaps: "Yes" } });
  const block = r.blocks["iv_determination:2"] ?? "";
  assertStringIncludes(block, SOURCE_SENTENCE);
  // Split on the harm-row markers so the sentence's placement can be
  // checked per-risk: it belongs to (A)'s paragraph, not (C)'s.
  const aParaStart = block.indexOf(A_HARM);
  const cParaStart = block.indexOf(C_HARM);
  assert(aParaStart !== -1 && cParaStart !== -1, "expected both risk paragraphs to render");
  const aPara = block.slice(aParaStart, cParaStart > aParaStart ? cParaStart : undefined);
  assertStringIncludes(aPara, SOURCE_SENTENCE);
  const cPara = block.slice(cParaStart);
  assert(!cPara.includes(SOURCE_SENTENCE), "the (C) risk paragraph must not carry the cyberGaps source sentence");
  // Placed in the source/cause prose: after the recorded source sentence,
  // before the likelihood/severity/rating sentence.
  const sourceIdx = aPara.indexOf("The source the Company records is");
  const likelihoodIdx = aPara.indexOf("The Company assesses the likelihood");
  const cyberIdx = aPara.indexOf(SOURCE_SENTENCE);
  assert(sourceIdx < cyberIdx && cyberIdx < likelihoodIdx, "cyberGaps source sentence must sit between the recorded source and the likelihood/severity sentence");
});

Deno.test("doc275 cyberGaps — item 1: cyberGaps No or blank adds no source sentence", () => {
  const rNo = engineOn({ impact_intake: { cyberGaps: "No" } });
  assert(!(rNo.blocks["iv_determination:2"] ?? "").includes(SOURCE_SENTENCE));
  const rBlank = engineOn({ impact_intake: {} });
  assert(!(rBlank.blocks["iv_determination:2"] ?? "").includes(SOURCE_SENTENCE));
  const rAbsent = engineOn({});
  assert(!(rAbsent.blocks["iv_determination:2"] ?? "").includes(SOURCE_SENTENCE));
});

Deno.test("doc275 cyberGaps — item 1: no unauthorised-access row on the record — never invents a risk row", () => {
  const r = engineOn({ a5_harm_pathways: [C_PATHWAY], impact_intake: { cyberGaps: "Yes" } });
  const block = r.blocks["iv_determination:2"] ?? "";
  assert(!block.includes(SOURCE_SENTENCE), "no (A) row exists, so item 1's sentence must not print anywhere");
  // Item 2 (the safeguards sub-part) still states the fact on its own.
  assert(
    block.includes(SAFEGUARDS_CREDITED_SENTENCE) || block.includes(SAFEGUARDS_UNCREDITED_SENTENCE),
    "item 2 must still state the cyberGaps fact even with no (A) row",
  );
});

// ── Item 2 — § 7152(a)(6) safeguards sub-part sentence ──────────────────────

Deno.test("doc275 cyberGaps — item 2: Yes with no a6 safeguard naming the gaps or the (A) category — uncredited sentence", () => {
  const r = engineOn({
    impact_intake: { cyberGaps: "Yes" },
    a6_safeguards: [{
      harm: C_HARM,
      safeguard: "Notice at Collection updated to name the vendor",
      safeguard_status: "Implemented and tested",
    }],
  });
  const block = r.blocks["iv_determination:2"] ?? "";
  assertStringIncludes(block, SAFEGUARDS_UNCREDITED_SENTENCE);
  assert(!block.includes(SAFEGUARDS_CREDITED_SENTENCE));
});

Deno.test("doc275 cyberGaps — item 2: Yes with an a6 safeguard whose text names 'gap' — credited sentence", () => {
  const r = engineOn({
    impact_intake: { cyberGaps: "Yes" },
    a6_safeguards: [{
      harm: C_HARM,
      safeguard: "A quarterly cybersecurity gap assessment with tracked remediation",
      safeguard_status: "Implemented and tested",
    }],
  });
  const block = r.blocks["iv_determination:2"] ?? "";
  assertStringIncludes(block, SAFEGUARDS_CREDITED_SENTENCE);
  assert(!block.includes(SAFEGUARDS_UNCREDITED_SENTENCE));
});

Deno.test("doc275 cyberGaps — item 2: Yes with an a6 safeguard linked to the (A) unauthorised-access category — credited sentence", () => {
  const r = engineOn({
    impact_intake: { cyberGaps: "Yes" },
    a6_safeguards: [{
      harm: A_HARM,
      safeguard: "Access to the billing database is role-scoped and logged",
      safeguard_status: "Implemented and tested",
    }],
  });
  const block = r.blocks["iv_determination:2"] ?? "";
  assertStringIncludes(block, SAFEGUARDS_CREDITED_SENTENCE);
  assert(!block.includes(SAFEGUARDS_UNCREDITED_SENTENCE));
});

Deno.test("doc275 cyberGaps — item 2: No states the fact as a negative, not silence", () => {
  const r = engineOn({ impact_intake: { cyberGaps: "No" } });
  assertStringIncludes(r.blocks["iv_determination:2"] ?? "", SAFEGUARDS_NEGATIVE_SENTENCE);
});

Deno.test("doc275 cyberGaps — item 2: blank or absent prints nothing", () => {
  const rBlank = engineOn({ impact_intake: { cyberGaps: "" } });
  const blockBlank = rBlank.blocks["iv_determination:2"] ?? "";
  assert(!blockBlank.includes(SAFEGUARDS_NEGATIVE_SENTENCE));
  assert(!blockBlank.includes(SAFEGUARDS_CREDITED_SENTENCE));
  assert(!blockBlank.includes(SAFEGUARDS_UNCREDITED_SENTENCE));
  const rAbsent = engineOn({});
  const blockAbsent = rAbsent.blocks["iv_determination:2"] ?? "";
  assert(!blockAbsent.includes(SAFEGUARDS_NEGATIVE_SENTENCE));
  assert(!blockAbsent.includes(SAFEGUARDS_CREDITED_SENTENCE));
  assert(!blockAbsent.includes(SAFEGUARDS_UNCREDITED_SENTENCE));
});

// ── Provenance — INTAKE:impact_intake.cyberGaps cited only when it prints ──

Deno.test("doc275 cyberGaps — provenance: the risk_paragraphs source is added only when a cyberGaps sentence actually prints", () => {
  const findRiskParagraphs = (r: ReturnType<typeof engineOn>) =>
    r.provenance.find((p) => p.factor_id === "risk_paragraphs");

  const yesRow = findRiskParagraphs(engineOn({ impact_intake: { cyberGaps: "Yes" } }));
  assert(yesRow, "expected a risk_paragraphs provenance row");
  assert(yesRow!.sources.includes("INTAKE:impact_intake.cyberGaps"));

  const noRow = findRiskParagraphs(engineOn({ impact_intake: { cyberGaps: "No" } }));
  assert(noRow, "expected a risk_paragraphs provenance row");
  assert(noRow!.sources.includes("INTAKE:impact_intake.cyberGaps"));

  const blankRow = findRiskParagraphs(engineOn({ impact_intake: {} }));
  assert(blankRow, "expected a risk_paragraphs provenance row");
  assert(!blankRow!.sources.includes("INTAKE:impact_intake.cyberGaps"));
});

// ── No rating or disposition ever moves ─────────────────────────────────────

Deno.test("doc275 cyberGaps — ratings, residuals, and disposition are unchanged by cyberGaps Yes/No/blank", () => {
  const rBlank = engineOn({});
  const rNo = engineOn({ impact_intake: { cyberGaps: "No" } });
  const rYes = engineOn({ impact_intake: { cyberGaps: "Yes" } });

  for (const r of [rNo, rYes]) {
    assertEquals(r.exec_panel.inherent, rBlank.exec_panel.inherent);
    assertEquals(r.exec_panel.residual, rBlank.exec_panel.residual);
    assertEquals(r.exec_panel.disposition, rBlank.exec_panel.disposition);
    assertEquals(r.exec_panel.disposition_label, rBlank.exec_panel.disposition_label);
    assertEquals(r.exec_panel.conditions, rBlank.exec_panel.conditions);
    assertEquals(r.tables["iv_determination:1"], rBlank.tables["iv_determination:1"]);
  }
  // The only exec_panel field this batch is allowed to move: the Follow-Up
  // tally, by exactly one, on "Yes".
  assertEquals(rNo.exec_panel.follow_ups_count, rBlank.exec_panel.follow_ups_count);
  assertEquals(rYes.exec_panel.follow_ups_count, rBlank.exec_panel.follow_ups_count + 1);
});

// ── Item 3 — § 4.D Follow-Up ─────────────────────────────────────────────────

Deno.test("doc275 cyberGaps — item 3: the Follow-Up prints only on Yes", () => {
  const rYes = engineOn({ impact_intake: { cyberGaps: "Yes" } });
  assertStringIncludes(rYes.blocks["iv_determination:12"] ?? "", FOLLOW_UP_SENTENCE);

  const rNo = engineOn({ impact_intake: { cyberGaps: "No" } });
  assert(!(rNo.blocks["iv_determination:12"] ?? "").includes(FOLLOW_UP_SENTENCE));

  const rBlank = engineOn({});
  assert(!(rBlank.blocks["iv_determination:12"] ?? "").includes(FOLLOW_UP_SENTENCE));
});

// ── Integration — the ptest panel fixture named in the batch instructions ──

const REPORT_DATE = "2031-03-05"; // injected, matches the determinism-test convention (not "today")

async function genRisk(intake: Bag, reportDate: string): Promise<Bag> {
  const gen = await generateCppaRiskReport(intake, {
    buildStamp: "doc275-cyber-gaps-test",
    runId: "doc275-cyber-gaps-test",
    mode: "enforce",
    pass1: "deterministic",
    pass2rEnabled: false,
    refinementEnabled: false,
    euCorpus: [],
    reportDate,
  });
  return gen.report as Bag;
}

const P01 = PANEL_CPPA_RISK.find((f) => f.id === "cppa-risk-p01-retail-loyalty-share");
assert(P01, "expected panel fixture cppa-risk-p01-retail-loyalty-share to exist");
const P01_INTAKE = P01!.intake as Bag;
assert(
  (P01_INTAKE.impact_intake as Bag)?.cyberGaps === "No",
  "fixture assumption drifted: p01 impact_intake.cyberGaps is no longer 'No'",
);
assert(
  (P01_INTAKE.a5_harm_pathways as Bag[]).some((row) => row.harm === A_HARM),
  "fixture assumption drifted: p01 no longer records an (A) unauthorised-access risk row",
);

Deno.test("doc275 cyberGaps — p01 fixture as recorded (No): the review text states the negative", async () => {
  const report = await genRisk(P01_INTAKE, REPORT_DATE);
  const { text } = reviewTextOf(report);
  assertStringIncludes(text, SAFEGUARDS_NEGATIVE_SENTENCE);
  assert(!text.includes(SOURCE_SENTENCE));
  assert(!text.includes(FOLLOW_UP_SENTENCE));
});

Deno.test("doc275 cyberGaps — p01 fixture with cyberGaps set to Yes: source sentence, safeguards sentence, and follow-up all render; ratings and disposition are byte-identical to the No render", async () => {
  const intakeYes: Bag = {
    ...P01_INTAKE,
    impact_intake: { ...(P01_INTAKE.impact_intake as Bag), cyberGaps: "Yes" },
  };
  const [reportNo, reportYes] = await Promise.all([
    genRisk(P01_INTAKE, REPORT_DATE),
    genRisk(intakeYes, REPORT_DATE),
  ]);
  const textNo = reviewTextOf(reportNo).text;
  const textYes = reviewTextOf(reportYes).text;

  assertStringIncludes(textYes, SOURCE_SENTENCE);
  assert(
    textYes.includes(SAFEGUARDS_CREDITED_SENTENCE) || textYes.includes(SAFEGUARDS_UNCREDITED_SENTENCE),
    "expected one of the two safeguards-sub-part variants to render",
  );
  assertStringIncludes(textYes, FOLLOW_UP_SENTENCE);

  // The ledger table rows (Privacy risk | Likelihood | Severity | Before
  // safeguards | Safeguard credited (status) | Remaining risk) must be
  // byte-identical between the No and Yes renders — no rating moved.
  function ledgerRows(t: string): string[] {
    const start = t.indexOf("Privacy risk | Likelihood | Severity | Before safeguards | Safeguard credited (status) | Remaining risk");
    assert(start !== -1, "expected the risk ledger table header");
    const rest = t.slice(start).split("\n\n")[0];
    return rest.split("\n").slice(1).filter((l) => l.trim().length > 0);
  }
  assertEquals(ledgerRows(textYes), ledgerRows(textNo));

  // The disposition sentence and executive result label are unchanged.
  const dispositionMarker = "In this report's executive result, that determination is stated as";
  const dispIdxNo = textNo.indexOf(dispositionMarker);
  const dispIdxYes = textYes.indexOf(dispositionMarker);
  assert(dispIdxNo !== -1 && dispIdxYes !== -1, "expected the disposition sentence in both renders");
  assertEquals(
    textNo.slice(dispIdxNo, dispIdxNo + 200),
    textYes.slice(dispIdxYes, dispIdxYes + 200),
  );
});
