// BATCH d573cc4f (2026-09-12) — ChatGPT's "Report Prose Review v6" plus
// Claude's independent code check agreed on three real DPIA defects.
//
// DPIA6-01 — HUMAN_INTERVENTION_NEGATED_RE's three alternatives all put the
// negation word BEFORE the human/review actor ("without human review", "not
// reviewed by a person"). A record can equally negate the VERB after naming
// the actor ("individual-level human review ... is not performed"), which
// slipped through undetected and was recorded as if it were the mitigating
// measure itself.
//
// DPIA6-02 — obligationsByProcessor() split a combined processor_obligations
// answer into per-processor segments by finding each processor's "lead" name
// followed by a colon. Two bugs: (1) lead-extraction only stripped a
// trailing description after a parenthetical, not after a bare " -- "
// separator; (2) colon-matching used exact-substring indexOf, which fails
// when the body text itself inserts a parenthetical between the name and
// its colon (e.g. "Nexlify Cloud (EU): ...").
//
// DPIA6-03 — the zero-transfer-flows sentinel's marker scan (processor name)
// and mechanism scan (processor_obligations text) are two INDEPENDENT open
// questions. The prior version treated them as alternatives — whichever
// fired first won — so a record with both signals silently dropped one from
// both the finding and the ask.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildProcessingInventory,
  buildSection2Coverage,
  obligationsByProcessor,
  readHumanInterventionSpan,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";

type Bag = Record<string, unknown>;

// ── DPIA6-01 ─────────────────────────────────────────────────────────────

Deno.test("DPIA6-01 — a negated-after-verb human-review mention ('review ... is not performed') is excluded", () => {
  const span = readHumanInterventionSpan({
    mitigating_measures: "Individual-level human review of each personalised ranking is not performed before it is served.",
  });
  assertEquals(span, "", "a denial of human review must not be read as the mitigating measure itself");
});

Deno.test("DPIA6-01 — the existing negated-before-actor pattern still works (no regression)", () => {
  const span = readHumanInterventionSpan({
    mitigating_measures: "Rankings are served without human review of individual outputs.",
  });
  assertEquals(span, "");
});

Deno.test("DPIA6-01 — a genuine positive human-review measure still resolves (no regression)", () => {
  const span = readHumanInterventionSpan({
    mitigating_measures: "Each flagged case is reviewed by a trained analyst before action is taken.",
  });
  assertStringIncludes(span, "reviewed by a trained analyst");
});

// ── DPIA6-02 ─────────────────────────────────────────────────────────────

Deno.test("DPIA6-02 — a body text inserting a parenthetical between the lead name and its colon still splits correctly", () => {
  const result = obligationsByProcessor(
    ["Nexlify Cloud", "Analytiq Systems"],
    "Nexlify Cloud (EU): infrastructure hosting only, no sub-processing. Analytiq Systems: analytics processing under a documented DPA.",
  );
  assert(result, "expected a per-processor split");
  assertStringIncludes(result!.get("Nexlify Cloud") ?? "", "infrastructure hosting only");
  assertStringIncludes(result!.get("Analytiq Systems") ?? "", "analytics processing under a documented DPA");
});

Deno.test("DPIA6-02 — a lead name with a bare ' -- ' description separator strips correctly (not just a parenthetical)", () => {
  const result = obligationsByProcessor(
    ["Braze -- marketing automation", "Zendesk -- support ticketing"],
    "Braze: sends transactional and marketing messages on documented instructions. Zendesk: support-ticket processing only.",
  );
  assert(result, "expected a per-processor split when names carry a ' -- ' description suffix");
  assertStringIncludes(result!.get("Braze -- marketing automation") ?? "", "transactional and marketing messages");
  assertStringIncludes(result!.get("Zendesk -- support ticketing") ?? "", "support-ticket processing only");
});

Deno.test("DPIA6-02 — the plain, no-parenthetical case still splits correctly (no regression)", () => {
  const result = obligationsByProcessor(
    ["Alpha Corp", "Beta Inc"],
    "Alpha Corp: does X. Beta Inc: does Y.",
  );
  assert(result);
  assertStringIncludes(result!.get("Alpha Corp") ?? "", "does X");
  assertStringIncludes(result!.get("Beta Inc") ?? "", "does Y");
});

// ── DPIA6-03 ─────────────────────────────────────────────────────────────

const DUAL_SIGNAL_BASE: Bag = {
  organization_name: "Really, Really North Gold Possibilities GmbH",
  controller_country: "DE",
  jurisdictions: ["EU"],
  purpose: "To produce ortho-rectified visual mosaics used to identify drill-target prospects",
  processing_activity_name: "Drone-based geological survey imagery capture",
  necessity_proportionality:
    "The blurring pipeline plus 30-day raw-frame deletion is the least-intrusive means; alternatives (ground surveys, satellite imagery at lower resolution) were considered and rejected as insufficient for drill-target identification",
  data_categories: ["Location data"],
  data_subjects: "residents along access roads",
  legal_basis_proposed: "Legitimate interests (Art. 6(1)(f))",
  transfer_flows: [],
};

Deno.test("DPIA6-03 — both signals (foreign-marker processor AND a different processor's SCC mention) are named together, not one dropped", () => {
  const intake = {
    ...DUAL_SIGNAL_BASE,
    third_party_processors: [
      "Glacier Peak Hosting GmbH (DE) cloud storage",
      "OrthoMosaic Alpine SA (CH) processing pipeline",
    ],
    processor_obligations: "Glacier Peak Hosting GmbH: Standard Contractual Clauses in place for any transfers outside the EEA.",
  };
  const inv = buildProcessingInventory(intake as never);
  const cov = buildSection2Coverage(intake as never, { processing_inventory: inv } as never) as unknown as Bag;
  const t = (cov.transfers as Array<Bag>)[0];
  assertEquals(t.status, "record_insufficient");
  const finding = String(t.finding);
  assertStringIncludes(finding, "OrthoMosaic Alpine SA (CH) processing pipeline");
  assertStringIncludes(finding, "a marker outside the EEA");
  assertStringIncludes(finding, "; separately, ");
  assertStringIncludes(finding, "a set of Standard Contractual Clauses");
  const ask = String(t.information_needed ?? "");
  assertStringIncludes(ask, "OrthoMosaic Alpine SA (CH) processing pipeline");
  assertStringIncludes(ask, ", or from ");
  assertStringIncludes(ask, "set of Standard Contractual Clauses");
});

Deno.test("DPIA6-03 — a single signal (marker only) keeps the prior single-signal wording byte-unchanged (no regression)", () => {
  const intake = {
    ...DUAL_SIGNAL_BASE,
    third_party_processors: [
      "Glacier Peak Hosting GmbH (DE) cloud storage",
      "OrthoMosaic Alpine SA (CH) processing pipeline",
    ],
    processor_obligations: "Glacier Peak Hosting GmbH: CDN and storage only, no sub-processing.",
  };
  const inv = buildProcessingInventory(intake as never);
  const cov = buildSection2Coverage(intake as never, { processing_inventory: inv } as never) as unknown as Bag;
  const t = (cov.transfers as Array<Bag>)[0];
  assertEquals(t.status, "record_insufficient");
  const finding = String(t.finding);
  assert(!finding.includes("; separately, "), "a single signal must not render the dual-signal joiner");
  assertStringIncludes(finding, "OrthoMosaic Alpine SA (CH) processing pipeline");
});
