// DOC 127 PART I (CEO-ratified 2026-08-31) — the disposition/materiality
// construct: the flat "do not proceed" band splits into remediable (path
// stated as Conditions for Reassessment) and redesign-required (critical
// inherent risk; no false promise that conditions alone could change the
// determination); named-but-unassessed risks are carried honestly instead of
// silently dropped, and gate an otherwise-favorable balance as "additional
// information required" (conservative-only precedence); discontinued
// processing projects "No Processing Decision Required" so the cover can
// never contradict the body. Every check here pins an output the CEO ruled
// on in doc 127 — see that doc's Part I and RESOLUTION.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildRiskLedgerTable,
  extractPathways,
  extractUnassessedPathways,
  runRiskFactorEngine,
} from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { deriveExecStatusPanel } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";

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

const HIGH_PATHWAY: Bag = {
  harm: "(E) Economic harms",
  likelihood: "Likely",
  severity: "Significant",
  data_involved: "Payment history",
  actor: "Third-party ad networks",
  cause: "Profile-based price steering",
};

const CRITICAL_PATHWAY: Bag = {
  harm: "(F) Physical harms",
  likelihood: "Likely",
  severity: "Severe",
  data_involved: "Precise geolocation",
  actor: "Unvetted data purchasers",
  cause: "Location resale",
};

const UNASSESSED_PATHWAY: Bag = {
  harm: "(G) Reputational harms",
  likelihood: "Likely",
  severity: "",
  data_involved: "Browsing history",
};

function engineOn(intake: Bag) {
  return runRiskFactorEngine(
    { processing_status: "Ongoing", ...intake } as never,
    REPORT as never,
    "2026-08-31",
  );
}

Deno.test("doc127 — a no-benefit stop is remediable, generates the benefit condition, and states its path", () => {
  const r = engineOn({ a5_harm_pathways: [LOW_PATHWAY] });
  assertEquals(r.exec_panel.disposition, "do not proceed - remediable");
  assertEquals(r.exec_panel.disposition_label, "Do Not Proceed");
  assert(
    (r.blocks["iv_determination:11"] ?? "").includes(
      "Identify at least one benefit of the Activity",
    ),
    "the no-benefit condition is missing from § 4.D",
  );
  assert(
    (r.factors.recommended_outcome ?? "").includes("To continue with the processing"),
    "the remediable stop does not state its path",
  );
  assert(
    (r.blocks["iv_determination:11"] ?? "").startsWith("Conditions for Reassessment."),
    "adverse § 4.D head is not Conditions for Reassessment",
  );
  assert(
    (r.blocks["executive_summary:10"] ?? "").includes("A different disposition depends on"),
    "exec compact conditions do not use the reassessment frame",
  );
  assert(
    r.exec_panel.path_forward !== null &&
      r.exec_panel.path_forward.includes("Conditions for Reassessment"),
    "cover path_forward missing for a remediable stop",
  );
});

Deno.test("doc127 — a critical inherent risk requires redesign and never promises conditions could change the determination", () => {
  const r = engineOn({ ...BENEFIT, a5_harm_pathways: [CRITICAL_PATHWAY] });
  assertEquals(r.exec_panel.disposition, "do not proceed - redesign required");
  assertEquals(r.exec_panel.disposition_label, "Do Not Proceed");
  const det = r.factors.determination_text ?? "";
  assert(!det.includes("could change the determination"), "redesign stop still promises conditions could change it");
  assert(det.includes('stated as "Do Not Proceed."'), "cross-label sentence missing or wrong");
  assert(
    (r.factors.recommended_outcome ?? "").includes("modifying the Activity itself"),
    "redesign stop does not state the Activity-redesign path",
  );
  assert(
    r.exec_panel.path_forward !== null &&
      r.exec_panel.path_forward.includes("modifying the Activity itself"),
    "cover path_forward missing the redesign path",
  );
});

Deno.test("doc127 — an untested safeguard driving a stop escalates to a condition and is not double-listed as a recommendation", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [HIGH_PATHWAY],
    a6_safeguards: [{
      harm: "(E) Economic harms",
      safeguard: "Encryption and access controls on payment history.",
      safeguard_status: "Implemented, not tested",
    }],
  });
  assertEquals(r.exec_panel.disposition, "do not proceed - remediable");
  assert(
    (r.blocks["iv_determination:11"] ?? "").includes("Obtain implementation and testing evidence"),
    "untested stop driver did not escalate to a condition",
  );
  assert(
    !(r.blocks["iv_determination:13"] ?? "").includes("credited without it"),
    "the escalated safeguard is still duplicated as a recommendation",
  );
});

Deno.test("doc127 — an unassessed named risk gates a favorable balance as additional information required", () => {
  const r = engineOn({ ...BENEFIT, a5_harm_pathways: [LOW_PATHWAY, UNASSESSED_PATHWAY] });
  assertEquals(r.exec_panel.disposition, "additional information required");
  assertEquals(r.exec_panel.disposition_label, "Additional Information Required");
  assert(r.exec_panel.has_unassessed, "has_unassessed not set");
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes(
      "Record the severity for the identified risk so it can be assessed: (G) Reputational harms",
    ),
    "missing-field follow-up absent",
  );
  const det = r.factors.determination_text ?? "";
  assert(det.includes("This conclusion is provisional"), "band-4 determination lacks the provisional qualifier");
  const exec = r.tables["executive_summary:6"];
  assert(
    exec !== null && exec !== undefined &&
      exec.rows.some((row) => row[0] === "(G) Reputational harms" && row[2] === "Not assessed"),
    "exec ledger lacks the Not assessed row",
  );
  assert(exec?.note?.includes("Not assessed"), "exec ledger note missing");
  // The § 4.A closer must not claim "no credible path" for the named harm.
  const closer = r.blocks["iv_determination:2"] ?? "";
  const noPath = /For [^.]*no credible path/.exec(closer)?.[0] ?? "";
  assert(!noPath.includes("(G) Reputational harms"), "closer denies a harm the Company named");
});

Deno.test("doc127 — conservative-only precedence: a stop stands even with an unassessed risk on the record", () => {
  const r = engineOn({ a5_harm_pathways: [LOW_PATHWAY, UNASSESSED_PATHWAY] });
  assertEquals(r.exec_panel.disposition, "do not proceed - remediable");
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("(G) Reputational harms"),
    "the unassessed risk is not named in the Follow-Ups on a stop",
  );
});

Deno.test("doc127 — discontinued processing projects No Processing Decision Required on the cover", () => {
  const r = engineOn({
    processing_status: "Discontinued",
    a5_harm_pathways: [CRITICAL_PATHWAY],
  });
  assertEquals(r.exec_panel.disposition, "no processing decision required");
  assertEquals(r.exec_panel.disposition_label, "No Processing Decision Required");
  assertEquals(r.exec_panel.path_forward, null);
});

Deno.test("doc127 — favorable bands keep the byte-identical Conditions to Proceed frame", () => {
  // Low pathway + material benefit, no safeguard: proceed with conditions
  // (the material-cut gap condition attaches).
  const r = engineOn({ ...BENEFIT, a5_harm_pathways: [LOW_PATHWAY] });
  assertEquals(r.exec_panel.disposition, "proceed with conditions");
  assertEquals(r.exec_panel.disposition_label, "Proceed with Conditions");
  assertEquals(r.exec_panel.path_forward, null);
  assert(
    (r.blocks["iv_determination:11"] ?? "").startsWith("Conditions to Proceed."),
    "favorable § 4.D head changed",
  );
  assert(
    (r.blocks["executive_summary:10"] ?? "").includes("The determination depends on"),
    "favorable compact conditions frame changed",
  );
});

Deno.test("doc127 — extraction: unassessed pathways carry, assessed extraction is unchanged", () => {
  const intake: Bag = { a5_harm_pathways: [LOW_PATHWAY, UNASSESSED_PATHWAY] };
  assertEquals(extractPathways(intake).length, 1);
  const u = extractUnassessedPathways(intake);
  assertEquals(u.length, 1);
  assertEquals(u[0].harm, "(G) Reputational harms");
  assertEquals([...u[0].missing], ["severity"]);
  const ledger = buildRiskLedgerTable(extractPathways(intake), "risk_ledger", u);
  assert(ledger !== null);
  assertEquals(ledger.rows.length, 2);
  assertEquals(ledger.rows[1][3], "Not assessed");
});

Deno.test("doc127 — the cover panel renders the controlled label, the path row, and the honest tier text", () => {
  const table = deriveExecStatusPanel({
    assessment_required: true,
    inherent: null,
    residual: null,
    disposition: "additional information required",
    disposition_label: "Additional Information Required",
    path_forward: "Provide the likelihood and severity for the risk or risks identified among the Follow-Ups in § 4.D, and update the assessment.",
    has_unassessed: true,
  });
  assert(table !== null);
  assertEquals(
    table.rows.find((r) => r[0] === "Assessment disposition")?.[1],
    "Additional Information Required",
  );
  assertEquals(
    table.rows.find((r) => r[0] === "Inherent privacy risk")?.[1],
    "Not assessed — risk information incomplete.",
  );
  assert(
    table.rows.some((r) => r[0] === "Path forward"),
    "Path forward row missing",
  );
});
