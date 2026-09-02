// DOC 141 (2026-09-02) — three confirmed Governance bugs.
//
// BUG 1 — Authorities Cited omitted UK GDPR Arts. 44A/45A even when the body
// quoted them verbatim. Three cooperating causes:
//   (a) the citation harvester's number token (`[\d.]+`) could not carry a
//       letter suffix, so "UK GDPR Art. 44A(1)" harvested truncated as
//       "UK GDPR Art. 44" — which is exactly the genuinely omitted UK
//       provision the ToA suppresses;
//   (b) the ToA's iff-cited check was a raw `body.includes(citation)`, but
//       the body spells UK Chapter V provisions un-prefixed ("Article
//       44A(1)"), never "UK GDPR Art. 44A(1)";
//   (c) the consolidated body-scan fallback used `(\d{1,2})\b` (digit→letter
//       is not a word boundary, so 44A never matched), hardcoded its output
//       row as bare "GDPR Art. ${n}", and had NO negation guard — so the
//       disclaimer sentence "There is no UK GDPR Article 44 in force"
//       manufactured an "Art. 44" row (coincidentally right on dual-regime
//       reports, wrong on a UK-only report).
//
// BUG 2 — Remediation register rows 1-5 rendered a blank Action cell:
//   (i)  `actionFor` in deriveRemediationRegisterTable matched remediation
//        `p.domain` (GovernanceDomain vocabulary) against `domain_findings`
//        operational-domain keys — disjoint sets, dead code;
//   (ii) the demonstrability partial/not-discharged branches set no
//        information_needed;
//   (iii) the transfers no-mechanism branch set none either.
//
// BUG 3 — the LLM refinement pass spliced into a ratified recommended-action
// sentence on the Maris run (moved the "(GDPR Art. 24(1); Art. 32(1)(d))"
// citation onto a record-production rationale and invented "at minimum
// annual"). `recommended_action` is now a protected leaf.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleGovernanceSkeletonDocument,
  deriveRemediationRegisterTable,
  harvestGovernanceCitations,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import {
  buildGovernanceDeliverables,
  buildTransferAnalysis,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { GOVERNANCE_PROTECTED_LEAF_KEYS as CONFIG_LEAF_KEYS } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-refinement-config.ts";
import { isGovernanceProtectedPath } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-refinement.ts";
import {
  GOVERNANCE_PROTECTED_FIXED_PROSE,
  GOVERNANCE_SKELETON_CONTENT_HASH,
} from "../../../supabase/functions/run-governance-assessment/_local/prose/plans/governance.spine.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── BUG 1(a) — harvester preserves letter-suffixed UK articles ──────────────

Deno.test("DOC 141 BUG 1(a) — harvester preserves 'UK GDPR Art. 44A(1)' intact, pinpoints included", () => {
  const cites = harvestGovernanceCitations({
    citations_used: [
      "UK GDPR Art. 44A(1)",
      "UK GDPR Art. 44A(2)(a)",
      "UK GDPR Art. 44A(2)(b)",
      "UK GDPR Art. 45A(2)",
      "GDPR Art. 46(2)(c)",
    ],
  });
  for (
    const expected of [
      "UK GDPR Art. 44A(1)",
      "UK GDPR Art. 44A(2)(a)",
      "UK GDPR Art. 44A(2)(b)",
      "UK GDPR Art. 45A(2)",
      "GDPR Art. 46(2)(c)",
    ]
  ) {
    assert(cites.includes(expected), `expected "${expected}" in ${JSON.stringify(cites)}`);
  }
  // The old truncation artifact must be gone: no bare "UK GDPR Art. 44".
  assert(!cites.includes("UK GDPR Art. 44"), JSON.stringify(cites));
});

Deno.test("DOC 141 BUG 1(a) — the SO-FT FIX 2 negation guard still holds after the suffix fix", () => {
  const cites = harvestGovernanceCitations({
    application: "There is no UK GDPR Article 44 in force; the UK Chapter V general principle must not be cited to Art. 44.",
  });
  assertEquals(cites.length, 0, JSON.stringify(cites));
});

// ── BUG 1(b)/(c) — ToA renders UK 44A rows; negation manufactures nothing ───

function ukOnlyReport(): Bag {
  return {
    readiness_determination: { rating: "partly_evidenced", reasoning: "Partly evidenced." },
    accountability_determination: { verdict: "partially_satisfied", reasoning: "Partly evidenced." },
    executive_summary: "The programme is partly evidenced.",
    transfer_analysis: {
      record_fact: 'The record states the jurisdictions in scope as "United Kingdom (UK GDPR)".',
      application:
        'The UK chapter is a different body of law, not the EU chapter under another name. There is no UK GDPR Article 44 in force; the UK Chapter V general principle must not be cited to Art. 44. The operative UK general principle is Article 44A(1): "A controller or processor may transfer personal data to a third country or an international organisation only if", and the condition is met only where the transfer is approved by adequacy regulations, is made subject to appropriate safeguards, or relies on a derogation — Article 44A(2)(a): "is approved by regulations under Article 45A that are in force at the time of the transfer," ; Article 44A(2)(b): "is made subject to appropriate safeguards (see Article 46), or"',
      regime: "uk",
    },
  };
}

function toaLines(report: Bag, intake: Bag): string[] {
  const res = assembleGovernanceSkeletonDocument(report, intake);
  return skeletonDocumentToText(res.document).split("\n").map((l) => l.trim());
}

Deno.test("DOC 141 BUG 1(b) — verified UK GDPR 44A ledger rows render in the ToA when the body cites them un-prefixed", () => {
  const report = {
    ...ukOnlyReport(),
    authority_exhibit: {
      entries: [
        { citation: "UK GDPR Art. 44A(1)", authority_class: "regulation" },
        { citation: "UK GDPR Art. 44A(2)(a)", authority_class: "regulation" },
        { citation: "UK GDPR Art. 44", authority_class: "regulation" },
      ],
    },
  };
  const intake = { organization_name: "Maris Ltd", jurisdictions: ["United Kingdom (UK GDPR)"] };
  const lines = toaLines(report, intake);
  assert(lines.includes("UK GDPR Art. 44A(1)"), "expected the 44A(1) row to render");
  assert(lines.includes("UK GDPR Art. 44A(2)(a)"), "expected the 44A(2)(a) row to render");
  // The genuinely omitted provision stays suppressed — exact, no suffix.
  assert(!lines.includes("UK GDPR Art. 44"), "the omitted UK Art. 44 must stay out of the ToA");
  assert(!lines.includes("GDPR Art. 44"), "no bare EU Art. 44 row on a UK-only report");
});

Deno.test("DOC 141 BUG 1(c) — the negation sentence alone manufactures no Art. 44 row (UK-only latent bug)", () => {
  // No ledger entries at all: any Art. 44 row could only come from the
  // consolidated body scan — which must now skip the negated mention.
  const intake = { organization_name: "Maris Ltd", jurisdictions: ["United Kingdom (UK GDPR)"] };
  const lines = toaLines(ukOnlyReport(), intake);
  assert(!lines.includes("GDPR Art. 44"), "the negation sentence must not manufacture an EU Art. 44 row");
  assert(!lines.includes("UK GDPR Art. 44"), "the negation sentence must not manufacture a UK Art. 44 row");
});

Deno.test("DOC 141 BUG 1(c) — the body scan preserves the UK prefix on letter-suffixed articles", () => {
  const report: Bag = {
    ...ukOnlyReport(),
    transfer_analysis: {
      record_fact: "The record puts the UK chapter in scope.",
      application: "The exporter's route runs under UK GDPR Art. 46A on this fixture; UK GDPR Art. 45B sets the benchmark.",
      regime: "uk",
    },
  };
  const intake = { organization_name: "Maris Ltd", jurisdictions: ["United Kingdom (UK GDPR)"] };
  const lines = toaLines(report, intake);
  assert(lines.includes("UK GDPR Art. 45B"), "scan row must keep the UK prefix and the letter suffix");
  assert(!lines.includes("GDPR Art. 45"), "no truncated, mislabelled EU row");
});

Deno.test("DOC 141 BUG 1 — the EU leg's GDPR Art. 44 remains listed on a dual-regime report", () => {
  const base = ukOnlyReport();
  const report: Bag = {
    ...base,
    transfer_analysis: {
      ...(base.transfer_analysis as Bag),
      application: 'Under the EU chapter the general principle in Article 44 governs: "..." ' +
        s((base.transfer_analysis as Bag).application),
      regime: "dual",
    },
    authority_exhibit: {
      entries: [
        // formatCitation()'s long form for a bare "GDPR Art. 44" harvest.
        { citation: "Regulation (EU) 2016/679 (General Data Protection Regulation) art. 44", authority_class: "regulation" },
        { citation: "UK GDPR Art. 44A(1)", authority_class: "regulation" },
      ],
    },
  };
  const intake = {
    organization_name: "Maris Ltd",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  };
  const lines = toaLines(report, intake);
  assert(
    lines.includes("Regulation (EU) 2016/679 (General Data Protection Regulation) art. 44"),
    "the EU Art. 44 ledger row must render on a dual-regime report",
  );
  assert(lines.includes("UK GDPR Art. 44A(1)"), "the UK 44A(1) ledger row must render too");
});

function s(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// ── BUG 2 — remediation register Action cells ───────────────────────────────

function registerIntake(): Bag {
  return {
    organization_name: "Maris Ltd",
    jurisdictions: ["United Kingdom (UK GDPR)"],
    // demonstrability: one partial, one not discharged
    privacy_policy: "Yes, but outdated",
    dpia_status: "No DPIAs completed",
    // transfers: restricted transfer recorded, NO mechanism recorded
    transfer_status: "Yes, US-based tools",
    tools: ["Microsoft 365 / Copilot", "Shopify Plus"],
  };
}

Deno.test("DOC 141 BUG 2(ii) — demonstrability partial and not-discharged findings carry information_needed", () => {
  const del = buildGovernanceDeliverables(registerIntake());
  const partial = del.demonstrability_findings.find((d) => d.artifact_present === "partial");
  assert(partial, "expected a partial demonstrability finding");
  assert(partial!.information_needed, "partial finding must carry information_needed");
  assertStringIncludes(partial!.information_needed!, "Complete, and make producible");
  assertStringIncludes(partial!.information_needed!, partial!.evidencing_artifact.charAt(0).toLowerCase() + partial!.evidencing_artifact.slice(1));

  const absent = del.demonstrability_findings.find((d) => d.artifact_present === "no");
  assert(absent, "expected a not-discharged demonstrability finding");
  assert(absent!.information_needed, "not-discharged finding must carry information_needed");
  assertStringIncludes(absent!.information_needed!, "Prepare, and make producible");
  assertStringIncludes(absent!.information_needed!, "Article 5(2)");
});

Deno.test("DOC 141 BUG 2(iii) — transfers with a restricted transfer and no mechanism carries an executed-instrument action", () => {
  const transfer = buildTransferAnalysis(registerIntake());
  assertEquals(transfer.verdict, "not_satisfied");
  assert(transfer.information_needed, "expected an information_needed remediation string");
  assertStringIncludes(transfer.information_needed!, "Adopt and execute a transfer mechanism");
  assertStringIncludes(transfer.information_needed!, "Microsoft 365 / Copilot, Shopify Plus");
  assertStringIncludes(transfer.information_needed!, "IDTA or the Addendum");
});

Deno.test("DOC 141 BUG 2 — the rendered register rows for those findings carry non-empty Action text", () => {
  const del = buildGovernanceDeliverables(registerIntake());
  const table = deriveRemediationRegisterTable({
    remediation_plan: del.remediation_plan,
    domain_element_findings: del.domain_element_findings,
  } as Bag);
  assert(table, "expected a remediation register table");
  const fixedKeys = new Set<string>([
    ...del.demonstrability_findings
      .filter((d) => d.artifact_present === "partial" || d.artifact_present === "no")
      .map((d) => d.key),
    del.transfer_analysis.key,
  ]);
  let checked = 0;
  del.remediation_plan.forEach((p, i) => {
    if (!fixedKeys.has(p.finding_key)) return;
    checked++;
    const action = table!.rows[i][2];
    assert(action !== "—" && action.trim().length > 0, `blank Action cell for ${p.finding_key}`);
  });
  assert(checked >= 3, `expected at least 3 fixed rows checked, got ${checked}`);
});

// ── BUG 3 — recommended_action is a protected refinement leaf ───────────────

Deno.test("DOC 141 BUG 3 — recommended_action is in the protected-leaf config and the path guard enforces it", () => {
  assert(CONFIG_LEAF_KEYS.includes("recommended_action"));
  assert(isGovernanceProtectedPath("$.domain_findings.tool_inventory.recommended_action"));
  assert(isGovernanceProtectedPath("$.domain_element_findings[3].recommended_action"));
});

// ── Spine untouched — the ratified fixed prose hash is unchanged ────────────

Deno.test("DOC 141 — governance spine fixed prose hash is untouched by this batch", async () => {
  const text = GOVERNANCE_PROTECTED_FIXED_PROSE.join("\n");
  assertEquals(await sha256(text), GOVERNANCE_SKELETON_CONTENT_HASH);
});
