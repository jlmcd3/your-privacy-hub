/**
 * ITEM 315 — pin tests for the cppa-cyber analytic deliverables.
 *
 * Four duties:
 *   1. CORPUS PIN — every `standard` string the deliverables emit is an exact
 *      substring of the approved §§ 7122 / 7123 rows. This is the control that
 *      the prior ungrounded 18-component model had no answer to.
 *   2. COMPONENT RE-DERIVATION — the component list is the § 7123(c)
 *      enumeration (18 rows, numbered 1..18), and every prior slug survives.
 *   3. ANALYSIS SHAPE — standard → record fact → application → verdict, with
 *      degradation to a named `record_insufficient` rather than fabrication.
 *   4. DEMOTION LAW — the mean score is no longer the conclusion, and the
 *      "Perfect Data" fixture reaches "ready" cleanly.
 */
import { describe, expect, it } from "vitest";
import { CYBER_CORPUS_SNAPSHOT } from "./__fixtures__/cyber-corpus-snapshot";
import {
  CYBER_7122_CONDITIONS,
  CYBER_7123_COMPONENTS,
  CYBER_PROGRAM_OBLIGATIONS,
} from "../../../supabase/functions/_shared/ltp/cppa-cyber-deliverables/components";
import {
  attachCyberDeliverables,
  buildComponentCoverage,
  buildCyberDeliverables,
  buildEvidenceSufficiency,
  buildIndependenceDetermination,
  buildMeanScoreAid,
  CYBER_AUDITOR_ENGAGEMENT_OPTIONS,
  readCyberFacts,
} from "../../../supabase/functions/_shared/ltp/cppa-cyber-deliverables/build";
import { CPPA_CYBER_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-cyber";
import {
  CYBER_AUDITOR_ENGAGEMENT_OPTIONS as CONTRACT_ENGAGEMENT_OPTIONS,
  CYBER_CONTROL_SLUGS,
  cppaCybersecurityContract,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-cybersecurity";
import { CYBER_AUDITOR_ENGAGEMENT } from "../../../src/pages/CPPACybersecurity.enums";

const CORPUS = Object.values(CYBER_CORPUS_SNAPSHOT).join("\n\n").replace(/\s+/g, " ");

const perfect = CPPA_CYBER_GOLDEN.find((c) => c.id === "cyber-perfect-record")!;
const perfectIntake = perfect.intake as Record<string, unknown>;

describe("ITEM 315 — corpus pins", () => {
  it("snapshot lengths match the approved provision_texts rows", () => {
    expect(CYBER_CORPUS_SNAPSHOT["cppa-7122"].length).toBe(3990);
    expect(CYBER_CORPUS_SNAPSHOT["cppa-7123"].length).toBe(15370);
  });

  it("every § 7123(c) component verbatim is an exact corpus substring", () => {
    for (const c of CYBER_7123_COMPONENTS) {
      expect(CORPUS, `component ${c.number} (${c.slug})`).toContain(c.verbatim);
    }
  });

  it("every § 7123(b) program obligation verbatim is an exact corpus substring", () => {
    for (const o of CYBER_PROGRAM_OBLIGATIONS) {
      expect(CORPUS, o.key).toContain(o.verbatim);
    }
  });

  it("every § 7122 condition verbatim is an exact corpus substring", () => {
    for (const c of CYBER_7122_CONDITIONS) {
      expect(CORPUS, c.key).toContain(c.verbatim);
    }
  });

  it("every emitted `standard` on the perfect record traces to the corpus", () => {
    const built = buildCyberDeliverables(perfectIntake);
    const standards = [
      ...built.component_coverage,
      ...built.evidence_sufficiency,
      ...built.program_obligation_findings,
      ...built.independence_determination.findings,
    ].map((f) => f.standard);
    expect(standards.length).toBeGreaterThan(40);
    for (const s of standards) expect(CORPUS).toContain(s);
  });
});

describe("ITEM 315 — component model re-derivation", () => {
  it("carries exactly the 18 enumerated § 7123(c) components, numbered 1..18", () => {
    expect(CYBER_7123_COMPONENTS.length).toBe(18);
    expect(CYBER_7123_COMPONENTS.map((c) => c.number)).toEqual(
      Array.from({ length: 18 }, (_, i) => i + 1),
    );
  });

  it("every prior contract slug survives the re-key (no orphaned intake keys)", () => {
    const slugs = CYBER_7123_COMPONENTS.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(18);
    for (const s of CYBER_CONTROL_SLUGS) expect(slugs).toContain(s);
  });

  it("records the prior label and disposition for every component", () => {
    for (const c of CYBER_7123_COMPONENTS) {
      expect(c.prior_label.length).toBeGreaterThan(0);
      expect(["retained_verbatim", "retained_rekeyed"]).toContain(c.disposition);
    }
    // The re-key is the point of the rebuild: at least one label changed.
    expect(CYBER_7123_COMPONENTS.some((c) => c.disposition === "retained_rekeyed")).toBe(true);
  });

  it("every component cites its own subdivision — never a bare § 7123", () => {
    for (const c of CYBER_7123_COMPONENTS) {
      expect(c.citation).toBe(`11 CCR § 7123(c)(${c.number})`);
    }
  });
});

describe("ITEM 315 — enum parity", () => {
  it("engagement options match across form, contract, and builder", () => {
    expect([...CONTRACT_ENGAGEMENT_OPTIONS]).toEqual([...CYBER_AUDITOR_ENGAGEMENT]);
    expect([...CYBER_AUDITOR_ENGAGEMENT_OPTIONS]).toEqual([...CYBER_AUDITOR_ENGAGEMENT]);
  });

  it("the contract carries both Item 315 intake fields as optional", () => {
    const keys = cppaCybersecurityContract.fields.map((f) => f.key);
    expect(keys).toContain("profile.auditor_engagement_status");
    expect(keys).toContain("profile.prior_audit_scope");
    for (const k of ["profile.auditor_engagement_status", "profile.prior_audit_scope"]) {
      expect(cppaCybersecurityContract.fields.find((f) => f.key === k)!.required).toBe("optional");
    }
  });
});

describe("ITEM 315 — analysis shape and degradation", () => {
  it("coverage findings carry all four analysis parts", () => {
    for (const f of buildComponentCoverage(readCyberFacts(perfectIntake))) {
      expect(f.standard.length).toBeGreaterThan(20);
      expect(f.record_fact.length).toBeGreaterThan(20);
      expect(f.application).toContain("§ 7123(c)");
      expect(f.verdict).toBe("satisfied");
      expect(f.status).toBe("analysed");
    }
  });

  it("a missing component degrades to record_insufficient with a named need", () => {
    const thin = { profile: { entity_name: "X" }, controls: [] };
    const coverage = buildComponentCoverage(readCyberFacts(thin));
    expect(coverage.length).toBe(18);
    for (const f of coverage) {
      expect(f.status).toBe("record_insufficient");
      expect(f.verdict).toBe("record_insufficient");
      expect(f.information_needed!.length).toBeGreaterThan(10);
    }
  });

  it("evidence sufficiency is reasoned, not asserted", () => {
    const facts = readCyberFacts({
      profile: {},
      controls: [
        { key: "c1_auth", label: "Authentication", maturity: "Implemented across organization", notes: "MFA everywhere.", evidence: ["Policy / procedure document"] },
        { key: "c2_encryption", label: "Encryption", maturity: "Implemented across organization", notes: "AES-256.", evidence: ["None on file"] },
        { key: "c3_account_access", label: "Access", maturity: "Implemented across organization", notes: "RBAC.", evidence: ["Sample log / report"] },
      ],
    });
    const ev = buildEvidenceSufficiency(facts);
    const by = Object.fromEntries(ev.map((e) => [e.slug, e]));
    // Policy only → partial: documents intent, not operation.
    expect(by.c1_auth.sufficiency).toBe("partial");
    expect(by.c1_auth.assessable_on_record).toBe(true);
    // Declared none → insufficient, and it is a REASONED verdict.
    expect(by.c2_encryption.sufficiency).toBe("insufficient");
    expect(by.c2_encryption.assessable_on_record).toBe(false);
    expect(by.c2_encryption.application).toContain("§ 7122(d)");
    // Testable artefact → sufficient.
    expect(by.c3_account_access.sufficiency).toBe("sufficient");
    // Unnamed components → unknown, never a guess.
    expect(by.c18_continuity.sufficiency).toBe("unknown");
    expect(by.c18_continuity.assessable_on_record).toBeNull();
  });
});

describe("ITEM 315 — § 7122 independence", () => {
  const forStatus = (s: string) =>
    buildIndependenceDetermination(readCyberFacts({ profile: { auditor_engagement_status: s }, controls: [] }));

  it("an internal auditor reporting to the program owner fails § 7122(a)(3)", () => {
    const d = forStatus("Internal auditor engaged, reports to the executive responsible for the cybersecurity program");
    expect(d.auditor_type).toBe("internal");
    expect(d.verdict).toBe("not_satisfied");
    expect(d.unsatisfied_conditions).toContain("internal_auditor_reporting_line");
    expect(d.unsatisfied_conditions).toContain("impartiality_and_non_participation");
  });

  it("an independent internal reporting line satisfies § 7122(a)(3)", () => {
    const d = forStatus("Internal auditor engaged, reports to an executive without cybersecurity-program responsibility");
    expect(d.unsatisfied_conditions).not.toContain("internal_auditor_reporting_line");
  });

  it("the reporting-line condition does not bite on an external engagement", () => {
    const d = forStatus("External auditor engaged");
    expect(d.auditor_type).toBe("external");
    const rl = d.findings.find((f) => f.condition_key === "internal_auditor_reporting_line")!;
    expect(rl.verdict).toBe("not_applicable");
    expect(rl.applies).toBe(false);
  });

  it("an absent engagement status degrades rather than guesses", () => {
    const d = forStatus("");
    expect(d.status).toBe("record_insufficient");
    expect(d.verdict).toBe("record_insufficient");
  });
});

describe("ITEM 315 — readiness determination replaces the mean", () => {
  it("the perfect record concludes 'ready' cleanly", () => {
    const built = buildCyberDeliverables(perfectIntake);
    const r = built.readiness_determination;
    expect(r.conclusion).toBe("ready");
    expect(r.blocking_components).toEqual([]);
    expect(r.unassessable_components).toEqual([]);
    expect(r.status).toBe("analysed");
    expect(r.headline).toContain("ready");
    expect(r.citations).toContain("11 CCR § 7124");
  });

  it("an unimplemented component blocks readiness and is named", () => {
    const intake = JSON.parse(JSON.stringify(perfectIntake));
    intake.controls[5].maturity = "Not implemented";
    const r = buildCyberDeliverables(intake).readiness_determination;
    expect(r.conclusion).toBe("not_ready");
    expect(r.blocking_components.map((b) => b.slug)).toContain("c6_vuln_mgmt");
    expect(r.reasoning).toContain(CYBER_7123_COMPONENTS[5].label);
  });

  it("a thin record concludes record_insufficient, not 'not ready'", () => {
    const r = buildCyberDeliverables({ profile: {}, controls: [] }).readiness_determination;
    expect(r.conclusion).toBe("record_insufficient");
    expect(r.unassessable_components.length).toBe(18);
  });

  it("SEPARATION GUARD — the conclusion never restates the mean score", () => {
    const built = buildCyberDeliverables(perfectIntake, { mean_score: 92, scored_count: 18 });
    const blob = `${built.readiness_determination.headline} ${built.readiness_determination.reasoning}`;
    expect(blob).not.toMatch(/\bmean\b/i);
  });

  it("DEMOTION LAW — the mean survives only as a labelled read-aid", () => {
    const aid = buildMeanScoreAid({ mean_score: 92, scored_count: 18 })!;
    expect(aid.label).toContain("no statutory basis");
    expect(aid.caveat).toContain("readiness_determination");
    expect(aid.value).toBe(92);
  });

  it("attach writes every deliverable slot and reports the conclusion", () => {
    const report: Record<string, unknown> = { aggregates: { mean_score: 92, scored_count: 18 } };
    const telemetry = attachCyberDeliverables(report, perfectIntake) as Record<string, unknown>;
    expect(telemetry.ok).toBe(true);
    expect(telemetry.conclusion).toBe("ready");
    expect(telemetry.mean_demoted).toBe(true);
    for (const slot of [
      "component_coverage",
      "evidence_sufficiency",
      "program_obligation_findings",
      "independence_determination",
      "readiness_determination",
      "mean_score_readability_aid",
    ]) {
      expect(report[slot], slot).toBeDefined();
    }
    expect((report.component_coverage as unknown[]).length).toBe(18);
  });
});
