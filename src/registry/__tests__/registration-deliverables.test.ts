/**
 * ITEM 316 — pin tests for the registration duty registry and deliverables.
 *
 * Five duties:
 *   1. CORPUS PIN — every `verbatim_quote` in the duty registry is an exact
 *      substring of its approved corpus row. Nothing was typed by hand.
 *   2. CROSS-STATE BLEED PIN — each state's definitional sentence belongs to
 *      that state and appears in NO other state's row. This is the named
 *      hazard for this product: the four definitions differ materially and a
 *      determination built on the wrong state's text is simply wrong.
 *   3. ANALYSIS SHAPE — every finding carries standard → record fact →
 *      application → verdict, and degrades to a named `record_insufficient`
 *      rather than asserting. No bare booleans survive.
 *   4. SCHEDULE-SURFACE LAW — the builder states statutory windows and never
 *      computes a filing date, enforced both behaviourally and by source scan.
 *   5. CONTRACT GUARD — the fields the builder reads exist in the intake
 *      contract, and the golden fixtures satisfy it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REGISTRATION_CORPUS_SNAPSHOT } from "./__fixtures__/registration-corpus-snapshot";
import {
  REGISTRATION_DUTY_AUTHORITIES,
  dutyRow,
  dutyRowsFor,
} from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-verified-authorities";
import {
  buildRegistrationDeliverables,
  stateInScope,
} from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build";
import { registrationContract } from "../../../archive/unwired/_shared/intake-contracts/registration-assessment";
import { REGISTRATION_GOLDEN } from "../../../supabase/functions/_shared/golden/registration";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

// ── Records used across the behavioural tests ──────────────────────────────

/** CA + VT broker: every limb of both definitions met. */
const CA_VT_BROKER = {
  organization_name: "Halyard Audience Data LLC",
  organization_country: "US",
  markets_served: ["US-CA", "US-VT"],
  is_public_authority: false,
  acts_as_data_broker: true,
  sells_or_shares_personal_info: true,
  collects_data_not_directly_from_individuals: true,
  has_direct_relationship_with_data_subjects: false,
  sells_or_licenses_brokered_data: true,
  brokered_data_individual_count: 4_200_000,
  brokered_data_revenue_share_pct: 88,
  data_broker_exemption_claimed: "none",
  filing_contact_details_ready: true,
  filing_opt_out_mechanism_documented: true,
  filing_minors_data_practices_documented: true,
  filing_metrics_documented: true,
  filing_rights_instructions_documented: true,
  has_eu_establishment: false,
  has_uk_establishment: false,
  large_scale_monitoring: true,
  processes_special_categories: false,
};

/** TX only: revenue limb FAILS (31%), volume limb PASSES (310k). */
const TX_VOLUME_ONLY = {
  organization_name: "Brazos Identity Resolution Inc.",
  organization_country: "US",
  markets_served: ["US-TX"],
  is_public_authority: false,
  collects_data_not_directly_from_individuals: true,
  has_direct_relationship_with_data_subjects: true,
  sells_or_licenses_brokered_data: false,
  brokered_data_individual_count: 310_000,
  brokered_data_revenue_share_pct: 31,
  data_broker_exemption_claimed: "none",
  filing_contact_details_ready: true,
  has_eu_establishment: false,
  has_uk_establishment: false,
  large_scale_monitoring: false,
  processes_special_categories: false,
};

/** CA only, direct relationship: definition FAILS. */
const CA_NOT_REGISTRABLE = {
  organization_name: "Trailhead Outfitters Co.",
  organization_country: "US",
  markets_served: ["US-CA"],
  is_public_authority: false,
  sells_or_shares_personal_info: true,
  collects_data_not_directly_from_individuals: false,
  has_direct_relationship_with_data_subjects: true,
  sells_or_licenses_brokered_data: true,
  brokered_data_individual_count: 900_000,
  brokered_data_revenue_share_pct: 4,
  data_broker_exemption_claimed: "none",
  has_eu_establishment: false,
  has_uk_establishment: false,
  large_scale_monitoring: false,
  processes_special_categories: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. CORPUS PIN
// ═══════════════════════════════════════════════════════════════════════════

describe("ITEM 316 — corpus pin", () => {
  it("carries 28 duty rows across six jurisdictions", () => {
    expect(REGISTRATION_DUTY_AUTHORITIES.length).toBe(28);
    expect(new Set(REGISTRATION_DUTY_AUTHORITIES.map((r) => r.jurisdiction))).toEqual(
      new Set(["US-CA", "US-OR", "US-TX", "US-VT", "EU", "UK"]),
    );
    for (const code of ["US-CA", "US-OR", "US-TX", "US-VT"]) {
      expect(dutyRowsFor(code).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("every verbatim_quote is an exact substring of its approved corpus row", () => {
    for (const row of REGISTRATION_DUTY_AUTHORITIES) {
      const source = REGISTRATION_CORPUS_SNAPSHOT[row.corpus_key];
      expect(source, `no snapshot for ${row.corpus_key}`).toBeTruthy();
      expect(
        source.includes(row.verbatim_quote),
        `${row.key} is not a substring of ${row.corpus_key}`,
      ).toBe(true);
    }
  });

  it("every row names a citation, an official source URL and a verification date", () => {
    for (const row of REGISTRATION_DUTY_AUTHORITIES) {
      expect(row.citation.length).toBeGreaterThan(8);
      expect(row.primary_source_url).toMatch(/^https:\/\//);
      expect(row.verified_on).toBe("2026-07-31");
      expect(row.verbatim_quote.length).toBeGreaterThan(20);
    }
  });

  it("dutyRow throws on an unknown key rather than returning an empty citation", () => {
    expect(() => dutyRow("no_such_authority")).toThrow(/unknown authority key/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. CROSS-STATE BLEED PIN
// ═══════════════════════════════════════════════════════════════════════════

describe("ITEM 316 — cross-state bleed", () => {
  const DEFS = {
    "US-CA": "ca_data_broker_definition",
    "US-OR": "or_data_broker_definition",
    "US-TX": "tx_data_broker_definition",
    "US-VT": "vt_data_broker_definition",
  } as const;

  it("each state's definitional sentence appears in that state's corpus row and no other", () => {
    const stateRows: Record<string, string[]> = {
      "US-CA": ["ca-delete-act-1798-99-80", "ca-delete-act-1798-99-82"],
      "US-OR": ["or-ors-646a-593"],
      "US-TX": ["tx-bc-510-001", "tx-bc-510-003", "tx-bc-510-005"],
      "US-VT": ["vt-9vsa-2430", "vt-9vsa-2446"],
    };
    for (const [code, key] of Object.entries(DEFS)) {
      const quote = dutyRow(key).verbatim_quote;
      for (const [otherCode, corpusKeys] of Object.entries(stateRows)) {
        const found = corpusKeys.some((ck) => REGISTRATION_CORPUS_SNAPSHOT[ck].includes(quote));
        expect(found, `${key} in ${otherCode}`).toBe(code === otherCode);
      }
    }
  });

  it("the four definitions are materially different texts, not variants of one another", () => {
    const quotes = Object.values(DEFS).map((k) => dutyRow(k).verbatim_quote);
    expect(new Set(quotes).size).toBe(4);
    // The distinguishing features the engine reasons from.
    expect(dutyRow("ca_data_broker_definition").verbatim_quote).toContain(
      "does not have a direct relationship",
    );
    expect(dutyRow("vt_data_broker_definition").verbatim_quote).toContain(
      "does not have a direct relationship",
    );
    // Oregon has NO direct-relationship carve-out.
    expect(dutyRow("or_data_broker_definition").verbatim_quote).not.toContain(
      "direct relationship",
    );
    // Texas reaches processing/transfer and never says "sells".
    expect(dutyRow("tx_data_broker_definition").verbatim_quote).toContain(
      "collects, processes, or transfers",
    );
    expect(dutyRow("tx_data_broker_definition").verbatim_quote).not.toContain("sells");
    // Vermont reaches licensing as well as sale.
    expect(dutyRow("vt_data_broker_definition").verbatim_quote).toContain("sells or licenses");
  });

  it("a CA/VT record cites no Oregon or Texas authority, and a TX record cites no other state", () => {
    const caVt = buildRegistrationDeliverables(CA_VT_BROKER as never);
    const caVtCites = caVt.determinations.flatMap((d) => d.citations).join(" ");
    expect(caVtCites).toContain("1798.99.82");
    expect(caVtCites).toContain("2446");
    expect(caVtCites).not.toMatch(/646A|510\./);

    const tx = buildRegistrationDeliverables(TX_VOLUME_ONLY as never);
    const txCites = tx.determinations.flatMap((d) => d.citations).join(" ");
    expect(txCites).toContain("510.003");
    expect(txCites).not.toMatch(/1798\.99|2430|2446|646A/);
  });

  it("scope selection only reaches states the record actually touches", () => {
    expect(stateInScope(CA_VT_BROKER as never, "US-CA")).toBe(true);
    expect(stateInScope(CA_VT_BROKER as never, "US-OR")).toBe(false);
    expect(stateInScope(TX_VOLUME_ONLY as never, "US-TX")).toBe(true);
    expect(stateInScope(TX_VOLUME_ONLY as never, "US-CA")).toBe(false);
    // A US-wide market plus broker activity reaches all four.
    const usWide = { markets_served: ["US"], acts_as_data_broker: true };
    for (const c of ["US-CA", "US-OR", "US-TX", "US-VT"]) {
      expect(stateInScope(usWide as never, c)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. ANALYSIS SHAPE — no bare booleans, reasoned verdicts, honest degradation
// ═══════════════════════════════════════════════════════════════════════════

describe("ITEM 316 — analysis shape", () => {
  it("every determination reaches registrable with reasoning that names the limbs", () => {
    const out = buildRegistrationDeliverables(CA_VT_BROKER as never);
    expect(out.determinations.map((d) => d.verdict)).toEqual(["registrable", "registrable"]);
    for (const d of out.determinations) {
      expect(d.headline).toContain("required to register");
      expect(d.reasoning.length).toBeGreaterThan(200);
      expect(d.threshold.limbs.length).toBeGreaterThanOrEqual(3);
      for (const limb of d.threshold.limbs) {
        expect(limb.standard.length).toBeGreaterThan(5);
        expect(limb.record_fact.length).toBeGreaterThan(5);
        expect(limb.reasoning.length).toBeGreaterThan(20);
      }
      expect(d.requirement.standard).toBe(dutyRow(
        d.jurisdiction === "US-CA" ? "ca_registration_requirement" : "vt_registration_requirement",
      ).verbatim_quote);
      expect(d.open_questions).toEqual([]);
    }
  });

  it("Texas turns on the volume limb alone when the revenue limb fails", () => {
    const out = buildRegistrationDeliverables(TX_VOLUME_ONLY as never);
    const tx = out.determinations[0];
    expect(tx.jurisdiction).toBe("US-TX");
    expect(tx.verdict).toBe("registrable");
    const [definitional, revenue, volume] = tx.threshold.limbs;
    expect(definitional.met).toBe(true);
    expect(revenue.met).toBe(false);
    expect(volume.met).toBe(true);
    expect(volume.reasoning).toContain("50,000");
    // A direct relationship does NOT defeat Texas.
    expect(tx.headline).toContain("required to register");
  });

  it("a direct relationship defeats the California duty, and the limb is named", () => {
    const out = buildRegistrationDeliverables(CA_NOT_REGISTRABLE as never);
    const ca = out.determinations[0];
    expect(ca.verdict).toBe("not_registrable");
    expect(ca.headline).toContain("not required to register");
    expect(ca.threshold.application).toContain("direct relationship");
    expect(ca.requirement.verdict).toBe("not_engaged");
    // SCHEDULE SUPPRESSION — no filing schedule where no duty attaches.
    expect(out.schedules.length).toBe(0);
    expect(out.filing_readiness.length).toBe(0);
  });

  it("degrades to record_insufficient with a named information_needed rather than guessing", () => {
    const bare = { organization_name: "Unknown Co", markets_served: ["US-CA"] };
    const out = buildRegistrationDeliverables(bare as never);
    const ca = out.determinations[0];
    expect(ca.verdict).toBe("record_insufficient");
    expect(ca.status).toBe("record_insufficient");
    expect(ca.threshold.information_needed).toBeTruthy();
    expect(ca.open_questions.length).toBeGreaterThan(0);
    expect(ca.headline).toContain("cannot be determined");
  });

  it("a claimed exclusion produces a conditional verdict, never an auto-accepted one", () => {
    const out = buildRegistrationDeliverables({
      ...CA_VT_BROKER,
      data_broker_exemption_claimed: "glba_financial",
    } as never);
    for (const d of out.determinations) {
      expect(d.verdict).toBe("conditional");
      expect(d.threshold.exclusion_claimed).toBe("glba_financial");
      expect(d.threshold.exclusion_analysis).toContain("recorded, not accepted");
      expect(d.open_questions.join(" ")).toContain("substantiate");
    }
  });

  it("EU/UK representative and DPO determinations are reasoned, not booleans", () => {
    const out = buildRegistrationDeliverables({
      ...CA_VT_BROKER,
      markets_served: ["US-CA", "DE", "UK"],
    } as never);
    const [eu, uk] = out.representative_determinations;
    expect(eu.verdict).toBe("engaged");
    expect(uk.verdict).toBe("engaged");
    for (const r of [eu, uk]) {
      expect(r.standard).toContain("designate in writing a representative");
      expect(r.application.length).toBeGreaterThan(80);
      expect(r.exemption_analysis).toContain("Art. 27(2)");
    }
    const dpo = out.dpo_determination;
    expect(dpo.findings.length).toBe(3);
    expect(dpo.verdict).toBe("engaged");
    expect(dpo.engaged_branches).toContain("GDPR Art. 37(1)(b)");
    for (const f of dpo.findings) {
      expect(f.standard.length).toBeGreaterThan(40);
      expect(f.application.length).toBeGreaterThan(30);
    }
  });

  it("ITEM 329 — both EU and UK engaged raises the combined flag and one callout", () => {
    const out = buildRegistrationDeliverables({
      ...CA_VT_BROKER,
      markets_served: ["US-CA", "DE", "UK"],
    } as never);
    const [eu, uk] = out.representative_determinations;
    expect(eu.verdict).toBe("engaged");
    expect(uk.verdict).toBe("engaged");

    expect(out.both_representatives_required).toBe(true);
    expect(out.combined_representative_callout).toBeTruthy();
    expect(out.combined_representative_callout).toContain("TWO separate representatives");
    expect(out.combined_representative_callout).toContain("United Kingdom");
    expect(out.combined_representative_callout).toContain("GDPR Art. 27(1)");

    // The callout leads the representative section — it precedes, and does not
    // replace, the two individual determinations.
    const d = out.narrative.determination;
    const calloutAt = d.indexOf(out.combined_representative_callout!);
    expect(calloutAt).toBeGreaterThan(-1);
    expect(calloutAt).toBeLessThan(d.indexOf(`${eu.label}: `));
    expect(calloutAt).toBeLessThan(d.indexOf(`${uk.label}: `));
    expect(d).toContain(eu.application);
    expect(d).toContain(uk.application);
  });

  it("ITEM 329 — one leg engaged only: no combined flag, no combined callout", () => {
    // EU markets only: the UK leg cannot reach "engaged".
    const euOnly = buildRegistrationDeliverables({
      ...CA_VT_BROKER,
      markets_served: ["US-CA", "DE"],
    } as never);
    expect(euOnly.representative_determinations[0].verdict).toBe("engaged");
    expect(euOnly.representative_determinations[1].verdict).not.toBe("engaged");
    expect(euOnly.both_representatives_required).toBe(false);
    expect(euOnly.combined_representative_callout).toBeUndefined();
    expect(euOnly.narrative.determination).not.toContain("TWO separate representatives");

    // UK market only: mirror case.
    const ukOnly = buildRegistrationDeliverables({
      ...CA_VT_BROKER,
      markets_served: ["US-CA", "UK"],
    } as never);
    expect(ukOnly.representative_determinations[1].verdict).toBe("engaged");
    expect(ukOnly.representative_determinations[0].verdict).not.toBe("engaged");
    expect(ukOnly.both_representatives_required).toBe(false);
    expect(ukOnly.combined_representative_callout).toBeUndefined();
    expect(ukOnly.narrative.determination).not.toContain("TWO separate representatives");

    // Established in the EU and UK-facing: EU leg not_applicable, no combined flag.
    const established = buildRegistrationDeliverables({
      ...CA_VT_BROKER,
      has_eu_establishment: true,
      markets_served: ["US-CA", "DE", "UK"],
    } as never);
    expect(established.both_representatives_required).toBe(false);
    expect(established.combined_representative_callout).toBeUndefined();
  });

  it("no Art. 27 duty where the organisation is established in the territory", () => {
    const out = buildRegistrationDeliverables({
      ...CA_VT_BROKER,
      has_eu_establishment: true,
      markets_served: ["US-CA", "DE"],
    } as never);
    expect(out.representative_determinations[0].verdict).toBe("not_applicable");
    expect(out.representative_determinations[0].application).toContain("Article 3(2)");
  });

  it("the AI Act question is flagged as corpus-pending and carries no verdict field", () => {
    const out = buildRegistrationDeliverables({ ...CA_VT_BROKER, uses_ai_systems: true } as never);
    expect(out.corpus_pending.length).toBe(1);
    const flag = out.corpus_pending[0];
    expect(flag.status).toBe("record_insufficient");
    expect(flag.note).toContain("corpus pending");
    expect(flag.named_provisions.join(" ")).toContain("2024/1689");
    expect((flag as unknown as Record<string, unknown>).verdict).toBeUndefined();
    // Absent any AI indicator, no flag is raised at all.
    expect(buildRegistrationDeliverables(CA_VT_BROKER as never).corpus_pending.length).toBe(0);
  });

  it("emits a Part-1 overview and a Part-4 determination — the prose surface the product lacked", () => {
    const out = buildRegistrationDeliverables(CA_VT_BROKER as never);
    expect(out.narrative.overview.length).toBeGreaterThan(400);
    expect(out.narrative.determination.length).toBeGreaterThan(600);
    expect(out.narrative.overview).toContain("Halyard Audience Data LLC");
    expect(out.narrative.determination).toContain("California");
    expect(out.narrative.determination).toContain("Data protection officer");
  });

  it("filing readiness is reasoned per the jurisdiction's own required-contents list", () => {
    const ready = buildRegistrationDeliverables(CA_VT_BROKER as never);
    expect(ready.filing_readiness.length).toBe(2);
    for (const f of ready.filing_readiness) {
      expect(f.ready_to_file).toBe(true);
      expect(f.standard).toBe(
        dutyRow(f.jurisdiction === "US-CA" ? "ca_filing_content" : "vt_filing_content").verbatim_quote,
      );
    }
    const notReady = buildRegistrationDeliverables({
      ...CA_VT_BROKER,
      filing_minors_data_practices_documented: false,
    } as never);
    for (const f of notReady.filing_readiness) {
      expect(f.ready_to_file).toBe(false);
      expect(f.summary).toContain("not ready");
    }
    const silent = buildRegistrationDeliverables({
      ...CA_VT_BROKER,
      filing_opt_out_mechanism_documented: undefined,
    } as never);
    expect(silent.filing_readiness[0].ready_to_file).toBeNull();
    expect(silent.filing_readiness[0].status).toBe("record_insufficient");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. SCHEDULE-SURFACE LAW
// ═══════════════════════════════════════════════════════════════════════════

describe("ITEM 316 — schedule-surface law", () => {
  it("states the statutory window verbatim and computes no filing date", () => {
    const out = buildRegistrationDeliverables(CA_VT_BROKER as never);
    expect(out.schedules.length).toBe(2);
    for (const s of out.schedules) {
      expect(s.window_standard).toBeTruthy();
      expect(norm(s.window_standard as string)).toContain("January 31");
      expect(s.window_note).toContain("does not convert that window into a specific filing date");
      // No resolved calendar date anywhere in the emitted schedule.
      const blob = JSON.stringify(s);
      expect(blob).not.toMatch(/\b20\d{2}-\d{2}-\d{2}\b/);
      expect(blob).not.toMatch(/January 31, 20\d{2}/);
    }
  });

  it("states a fee only where the operative text states one", () => {
    const tx = buildRegistrationDeliverables(TX_VOLUME_ONLY as never).schedules[0];
    expect(tx.fee_stated_amount).toBe("$300");
    expect(tx.fee_standard).toContain("registration fee of $300");
    const ca = buildRegistrationDeliverables(CA_VT_BROKER as never).schedules.find(
      (s) => s.jurisdiction === "US-CA",
    )!;
    expect(ca.fee_stated_amount).toBeNull();
    expect(ca.fee_note).toContain("does not state a fixed amount");
  });

  it("the builder source contains no clock or date arithmetic at all", () => {
    const src = readFileSync(
      resolve(
        __dirname,
        "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts",
      ),
      "utf8",
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(code).not.toMatch(/new Date|Date\.now|getFullYear|setDate/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. CONTRACT GUARD
// ═══════════════════════════════════════════════════════════════════════════

describe("ITEM 316 — contract guard", () => {
  const keys = new Set(registrationContract.fields.map((f) => f.key));

  it("every Item 316 intake field the builder reads is declared in the contract", () => {
    for (const k of [
      "collects_data_not_directly_from_individuals",
      "has_direct_relationship_with_data_subjects",
      "sells_or_licenses_brokered_data",
      "brokered_data_individual_count",
      "brokered_data_revenue_share_pct",
      "data_broker_exemption_claimed",
      "filing_contact_details_ready",
      "filing_opt_out_mechanism_documented",
      "filing_minors_data_practices_documented",
    ]) {
      expect(keys.has(k), `${k} missing from registrationContract`).toBe(true);
    }
  });

  it("the extension adds no required field, so existing records still run", () => {
    for (const f of registrationContract.fields) {
      if (f.key.startsWith("brokered_") || f.key.startsWith("filing_") || f.key.startsWith("collects_")) {
        expect(f.required).toBe("optional");
      }
    }
  });

  it("the new golden fixtures exist, are non-generic, and carry the threshold fields", () => {
    const ids = REGISTRATION_GOLDEN.map((g) => g.id);
    for (const id of [
      "reg-ca-vt-broker-perfect-record",
      "reg-tx-volume-limb-tuning",
      "reg-ca-not-registrable-adversarial",
    ]) {
      expect(ids).toContain(id);
    }
    const perfect = REGISTRATION_GOLDEN.find((g) => g.id === "reg-ca-vt-broker-perfect-record")!;
    const intake = perfect.intake as Record<string, unknown>;
    expect(intake.organization_name).toBe("Halyard Audience Data LLC");
    expect(intake.brokered_data_individual_count).toBe(4_200_000);
    for (const key of Object.keys(intake)) {
      expect(keys.has(key) || ["employee_count", "processes_personal_data", "eu_lead_member_state"].includes(key)).toBe(true);
    }
  });

  it("each new fixture reaches the verdict its assertions describe", () => {
    const byId = Object.fromEntries(REGISTRATION_GOLDEN.map((g) => [g.id, g.intake]));
    expect(
      buildRegistrationDeliverables(byId["reg-ca-vt-broker-perfect-record"] as never)
        .determinations.every((d) => d.verdict === "registrable"),
    ).toBe(true);
    expect(
      buildRegistrationDeliverables(byId["reg-tx-volume-limb-tuning"] as never)
        .determinations[0].verdict,
    ).toBe("registrable");
    expect(
      buildRegistrationDeliverables(byId["reg-ca-not-registrable-adversarial"] as never)
        .determinations[0].verdict,
    ).toBe("not_registrable");
  });
});
