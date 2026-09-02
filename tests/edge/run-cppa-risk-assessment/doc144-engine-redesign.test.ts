// DOC 144 (2026-09-02) — CEO-ratified CPPA Risk report redesign, ENGINE half
// (doc 143 is the ratified analysis; the sibling change owns
// risk-skeleton-assemble.ts + cppa-risk.spine.ts):
//
//   1. Quote-discipline sweep (doc 143 §C): every intake-derived free-text
//      splice renders in typographic quotes with attribution — the § 3.E
//      human-review seam (the live :2213 defect), the § 2.E sources
//      fallback, essential vendors, necessity elements + justifications,
//      safeguard noun phrases, § 4.D item names, participants — and
//      multi-sentence quoted narratives are hardened through
//      `boundedPassage`.
//   2. Appendix D folded into § 3.B: landing ([Q] line + reader-first
//      sentence), "Governing requirement." paragraph with the verbatim
//      § 7152(a)(2) sentence, the per-element determinations table inline
//      (`iii_analysis:4`, surface `necessity_matrix`), reasoning at
//      `iii_analysis:5`.
//   3. § 4.A widened ledger (Likelihood / Severity / "Remaining risk" — the
//      SAME per-risk residual, no new rating) + landing + governing
//      requirement + the recorded source carried into the T1 paragraph.
//   4. Empty-register suppression: zero necessity elements / zero a5 rows ⇒
//      no empty-table deliverable; the body states the honest posture inline
//      (doc-142 zero-a5 AIR behavior unchanged — see doc142-zero-a5-air).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildNecessityMatrixTable,
  buildRiskAndSafeguardRegisterTable,
  runRiskFactorEngine,
} from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";

type Bag = Record<string, unknown>;

function engineOn(intake: Bag) {
  return runRiskFactorEngine(
    { processing_status: "Ongoing", ...intake } as never,
    {} as never,
    "2026-09-02",
  );
}

const RICH: Bag = {
  a2_necessity_set: [
    {
      element: "Contact identifiers",
      necessity: "Necessary to the stated purpose",
      justification: "we need the email to send the notice. Phone is the SMS fallback",
    },
    {
      element: "browsing history",
      necessity: "Collected but not necessary to the stated purpose",
      justification: "kept for future personalization ideas",
    },
  ],
  a5_harm_pathways: [
    {
      harm: "(A) Unauthorized access or disclosure",
      likelihood: "Likely",
      severity: "Significant",
      data_involved: "contact identifiers and delivery addresses. Some order metadata too",
      actor: "external attackers",
      source: "the shared notification vendor's API keys",
      cause: "credential stuffing against the vendor portal. Keys were reused",
    },
  ],
  a6_safeguards: [
    {
      harm: "(A) Unauthorized access or disclosure",
      safeguard: "API key rotation every 30 days. Rotation is logged centrally",
      safeguard_status: "Implemented, not tested",
    },
  ],
  recipients: [
    {
      recipient_name_or_category: "notifyCo LLC",
      recipient_type: "Service provider",
      contractual_protections: "No written contract",
    },
  ],
  vendor_dependency:
    "One or more vendors are essential — the processing could not continue without them",
  essential_vendors: "notifyCo LLC and shipFast Inc",
  section_7151_operational_participants: [
    {
      name: "Jane Roe",
      role: "head of logistics ops",
      processing_responsibility: "owns the notification pipeline. Approves vendor changes",
    },
  ],
  benefit_consumer_identified: "Yes",
  a4_benefit_consumer:
    "Consumers receive shipment updates without re-entering details. They also get delivery windows",
  a4_benefit_consumer_fact: "Support tickets fell 30% in the pilot. Satisfaction rose",
  q18_admt_use: "Yes",
  q19_admt_description: "a routing model that picks the notification channel",
  i5_admt_human_review: "Available on request",
};

// ── 1. Quote-discipline sweep ────────────────────────────────────────────────

Deno.test("doc144 — the § 3.E human-review splice carries quotes and a guaranteed closing stop", () => {
  const r = engineOn(RICH);
  const block = r.blocks["iii_analysis:16"] ?? "";
  assert(
    block.includes("The Company describes human review as follows: “Available on request”. The assessment relies on it"),
    "human-review splice not quoted with a closing stop",
  );
  assert(
    !block.includes("as follows: Available on request The assessment"),
    "the doc-143 fused-fragment defect survived",
  );
});

Deno.test("doc144 — § 2.E sources fallback, essential vendors, and participants are quoted with attribution", () => {
  const r = engineOn({ i4b_sources: "our web store checkout flow. Also the mobile app" });
  assert(
    (r.blocks["ii_information:8"] ?? "").includes(
      "E. Sources. The Company identifies the following source or sources: “our web store checkout flow. Also the mobile app”.",
    ),
    "sources fallback not quoted",
  );
  const rich = engineOn(RICH);
  assert(
    (rich.blocks["ii_information:12"] ?? "").includes(
      "the following vendors the Company records as essential: “notifyCo LLC and shipFast Inc”.",
    ),
    "essential vendors not quoted",
  );
  assert(
    (rich.blocks["ii_information:18"] ?? "").includes(
      "— Jane Roe, “head of logistics ops” — “owns the notification pipeline. Approves vendor changes”.",
    ),
    "participant narrative values not quoted",
  );
});

Deno.test("doc144 — § 4.D item names (elements, safeguards, recipients) are quoted; the imperative frame is kept", () => {
  const r = engineOn({
    ...RICH,
    a6_safeguards: [
      ...(RICH.a6_safeguards as Bag[]),
      {
        harm: "(A) Unauthorized access or disclosure",
        safeguard: "notification frequency cap",
        safeguard_status: "Planned, not yet implemented",
      },
    ],
  });
  const conditions = r.blocks["iv_determination:11"] ?? "";
  assert(
    conditions.includes("Complete implementation of the planned safeguard: “notification frequency cap”"),
    "planned-safeguard condition not quoted",
  );
  assert(
    conditions.includes("Cease processing, or establish the necessity of, “browsing history”."),
    "unnecessary-element condition not quoted",
  );
  const recs = r.blocks["iv_determination:13"] ?? "";
  assert(
    recs.includes("in place for “notifyCo LLC”, and record its terms"),
    "recipient recommendation not quoted",
  );
});

Deno.test("doc144 — unsure-element follow-up and untested-control recommendation name their subjects, quoted", () => {
  const r = engineOn({
    ...RICH,
    a2_necessity_set: [
      ...(RICH.a2_necessity_set as Bag[]),
      { element: "Device IDs", necessity: "Unsure", justification: "" },
    ],
  });
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("necessary to the stated purpose: “Device IDs”."),
    "unsure-element follow-up not quoted",
  );
  // A moderate risk keeps the untested safeguard below the stop-driver
  // escalation, so the RECOMMENDATION (not a condition) composes.
  const rec = engineOn({
    ...RICH,
    a5_harm_pathways: [{
      ...(RICH.a5_harm_pathways as Bag[])[0],
      likelihood: "Possible",
      severity: "Moderate",
    }],
  });
  assert(
    (rec.blocks["iv_determination:13"] ?? "").includes("— “API key rotation every 30 days” — so the assessment can rely on it at full weight"),
    "untested-control recommendation does not name the quoted control",
  );
});

Deno.test("doc144 — multi-sentence quoted narratives are bounded: customer periods stay inside the quotes", () => {
  const r = engineOn(RICH);
  const benefits = r.blocks["iii_analysis:20"] ?? "";
  assert(
    benefits.includes("the Company identifies “Consumers receive shipment updates without re-entering details. They also get delivery windows”, and supports it with"),
    "benefit narrative not passage-bounded inside quotes",
  );
  const t1 = r.blocks["iv_determination:2"] ?? "";
  assert(
    t1.includes("The Company identifies “contact identifiers and delivery addresses. Some order metadata too”, at risk from “external attackers”"),
    "risk-opening data narrative not passage-bounded inside quotes",
  );
  // Safeguard noun phrases quoted in the T1 branch.
  assert(
    t1.includes("The Company’s “API key rotation every 30 days” is directed at it"),
    "safeguard noun phrase not quoted in the T1 branch",
  );
});

// ── 2. § 3.B fold-in ─────────────────────────────────────────────────────────

Deno.test("doc144 — § 3.B carries the landing, the verbatim governing requirement, and the in-body determinations table", () => {
  const r = engineOn(RICH);
  const landing = r.blocks["iii_analysis:3"] ?? "";
  assert(landing.startsWith("B. Necessity and Minimization."), "§ 3.B head absent");
  assert(
    landing.includes("[Q] Does every data element the Company collects earn its place?"),
    "§ 3.B [Q] landing line absent",
  );
  assert(
    landing.includes(
      "Governing requirement. Section 7152(a)(2) requires the assessment to identify the minimum personal information necessary to achieve the Purpose.",
    ),
    "§ 3.B governing-requirement paragraph absent or not verbatim",
  );
  const table = r.tables["iii_analysis:4"];
  assert(table, "in-body necessity table absent");
  assertEquals(table.surface, "necessity_matrix");
  assertEquals(table.columns, ["Element", "Determination", "Basis"]);
  const flat = table.rows.map((row) => row.join(" | ")).join("\n");
  assert(
    flat.includes("“we need the email to send the notice. Phone is the SMS fallback”"),
    "basis cell not quoted",
  );
  // The reasoning prose relocated to iii_analysis:5, element names quoted,
  // and no appendix pointer composes from the § 3.B prose (the retired
  // "element-level record appears in Appendix D" sentence). Under the DOC
  // 144 re-lettering, "Appendix D" now names the RISK register — the § 4.A
  // landing legitimately points there — so the sweep is scoped to § 3.B.
  const prose = r.blocks["iii_analysis:5"] ?? "";
  assert(prose.includes("supports the necessity of “Contact identifiers”"), "supported element not quoted");
  assert(prose.includes("The necessity of “browsing history” is not established"), "unsupported element not quoted");
  const sect3b = [r.blocks["iii_analysis:3"], prose, r.blocks["iii_analysis:6"]].join("\n");
  assert(!sect3b.includes("Appendix"), "§ 3.B still emits an appendix pointer");
  const all = Object.values(r.blocks).join("\n");
  assert(!all.includes("element-level record appears in Appendix"), "the retired necessity-appendix pointer survived");
});

// ── 3. § 4.A widened ledger + landing ───────────────────────────────────────

Deno.test("doc144 — the § 4.A ledger carries Likelihood, Severity, and the per-risk Remaining risk", () => {
  const r = engineOn({
    ...RICH,
    a5_harm_pathways: [
      ...(RICH.a5_harm_pathways as Bag[]),
      { harm: "(G) Reputational harms", likelihood: "Likely", severity: "", data_involved: "Browsing history" },
    ],
  });
  const ledger = r.tables["iv_determination:1"];
  assert(ledger, "§ 4.A ledger absent");
  assertEquals(ledger.columns, [
    "Privacy risk",
    "Likelihood",
    "Severity",
    "Before safeguards",
    "Safeguard credited (status)",
    "Remaining risk",
  ]);
  const rowA = ledger.rows.find((row) => row[0].includes("(A)"));
  assert(rowA, "assessed row missing");
  assertEquals(rowA[1], "Likely");
  assertEquals(rowA[2], "Significant");
  assert(rowA[5].startsWith("High"), "per-risk residual not surfaced");
  const rowG = ledger.rows.find((row) => row[0].includes("(G)"));
  assert(rowG, "unassessed row missing");
  assertEquals(rowG[1], "Likely");
  assertEquals(rowG[2], "Not recorded");
  assertEquals(rowG[5], "Not assessed");
  // The exec compression is untouched (PANEL RISK-P3 / doc 127 §11).
  const exec = r.tables["executive_summary:6"];
  assert(exec, "exec ledger absent");
  assertEquals(exec.columns, ["Risk", "Safeguard Status", "Residual Risk"]);
});

Deno.test("doc144 — § 4.A opens with the landing and the verbatim § 7152(a)(5) governing requirement; the T1 paragraph carries the recorded source", () => {
  const r = engineOn(RICH);
  const landing = r.blocks["iv_determination:0"] ?? "";
  assert(landing.startsWith("A. The Risk Ledger."), "§ 4.A head absent");
  // DOC 144 reconciliation — the CEO-approved mockup wording, verbatim.
  assert(
    landing.includes("[Q] What could go wrong, how badly, and what stands in the way."),
    "§ 4.A [Q] landing line absent or off-mockup",
  );
  // Re-lettered register pointer (old E → D).
  assert(
    landing.includes("the full risk record appears in Appendix D."),
    "§ 4.A register pointer not re-lettered to Appendix D",
  );
  assert(
    landing.includes(
      "Governing requirement. Section 7152(a)(5) requires the assessment to identify the negative impacts the processing may create and their sources and causes; §§ 7152(a)(5)–(6) require those impacts to be considered together with the safeguards directed at them.",
    ),
    "§ 4.A governing-requirement paragraph absent or not verbatim",
  );
  assert(
    (r.blocks["iv_determination:2"] ?? "").includes(
      "The source the Company records is “the shared notification vendor's API keys”.",
    ),
    "recorded source not carried into the T1 paragraph",
  );
});

// ── 4. Empty-register suppression ───────────────────────────────────────────

Deno.test("doc144 — zero necessity elements: no table deliverable; § 3.B states the honest posture inline", () => {
  const r = engineOn({});
  assertEquals(buildNecessityMatrixTable({}), null);
  assertEquals(r.tables["iii_analysis:4"], null);
  const landing = r.blocks["iii_analysis:3"] ?? "";
  assert(
    landing.includes("contains no element-level necessity record"),
    "zero-necessity honest posture absent",
  );
  assert(!landing.includes("[Q]"), "a landing question composed over an empty record");
});

Deno.test("doc144 — zero a5 rows: no ledger/register deliverable; § 4.A states the honest posture inline; AIR unchanged", () => {
  const r = engineOn({});
  assertEquals(buildRiskAndSafeguardRegisterTable({}), null);
  assertEquals(r.tables["iv_determination:1"], null);
  const landing = r.blocks["iv_determination:0"] ?? "";
  assert(
    landing.includes("No risk to consumers’ privacy is identified in the information provided"),
    "zero-a5 honest posture absent",
  );
  // DOC 144 reconciliation — the register is Appendix D under the new
  // lettering; no register pointer of any letter may compose here.
  assert(
    !landing.includes("the full risk record appears in Appendix"),
    "register pointer composes over a suppressed register",
  );
  // The doc-142 CEO-ruled disposition is untouched.
  assertEquals(r.exec_panel.disposition, "additional information required");
});

Deno.test("doc144 — banned register absent from every composed surface", () => {
  const r = engineOn(RICH);
  const all = [...Object.values(r.blocks), ...Object.values(r.factors)].join("\n").toLowerCase();
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
