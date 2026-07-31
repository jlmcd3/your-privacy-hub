/**
 * ITEM 312 — pin tests for the ir-playbook analytic deliverables (Chapter 8).
 *
 * Four jobs:
 *  1. CORPUS PIN — every registry row the deliverables cite must be an exact
 *     substring of the approved corpus snapshot. A retyped quotation fails.
 *  2. SHAPE PIN — each determination carries the Op. 1 analysis shape
 *     (standard -> record fact -> application -> verdict), never a recitation.
 *  3. BEHAVIOUR PIN — the Art. 33(1) and Art. 34(1) tests are DIFFERENT
 *     standards and must be able to diverge; the Art. 34(3) limbs are all
 *     walked; content elements carry an owner and a source-of-truth.
 *  4. CONTRACT GUARD — every new golden case validates against the actual
 *     contract via validateIntake, and every field the builder reads is
 *     declared in that contract.
 */
import { describe, it, expect } from "vitest";
import { IR_CORPUS_SNAPSHOT } from "./__fixtures__/ir-corpus-snapshot";
import { IR_PLAYBOOK_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/ir-playbook-verified-authorities";
import {
  ANCHOR_KEYS,
  OWNERS,
} from "../../../supabase/functions/_shared/ltp/ir-playbook-deliverables/elements";
import {
  attachIrPlaybookDeliverables,
  buildArt34ExemptionAnalysis,
  buildContentOwnerMapping,
  buildDataSubjectCommunicationDetermination,
  buildIrPlaybookDeliverables,
  buildSaNotificationDetermination,
  separateExposure,
} from "../../../supabase/functions/_shared/ltp/ir-playbook-deliverables/build";
import { IR_PLAYBOOK_GOLDEN } from "../../../supabase/functions/_shared/golden/ir-playbook";
import { irPlaybookContract } from "../../../supabase/functions/_shared/intake-contracts/ir-playbook";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate";

const CORPUS = Object.values(IR_CORPUS_SNAPSHOT);
const inCorpus = (q: string) => CORPUS.some((t) => t.includes(q));

const g = (id: string) => IR_PLAYBOOK_GOLDEN.find((c) => c.id === id)!;
const PERFECT = g("ir-perfect-record");
const ENCRYPTED = g("ir-encrypted-backup-exemption");
const DIVERGENCE = g("ir-two-threshold-divergence");

describe("ITEM 312 — corpus pins", () => {
  it("dispatch corpus check holds: Art. 33 and Art. 34 are complete rows", () => {
    expect(IR_CORPUS_SNAPSHOT["eu-art-33"].length).toBe(1734);
    expect(IR_CORPUS_SNAPSHOT["eu-art-34"].length).toBe(1649);
    expect(IR_CORPUS_SNAPSHOT["eu-art-34"].trimEnd().endsWith(
      "may decide that any of the conditions referred to in paragraph 3 are met.",
    )).toBe(true);
  });

  it("every anchor the deliverables use resolves to a registry row", () => {
    for (const key of Object.values(ANCHOR_KEYS)) {
      expect(
        (IR_PLAYBOOK_VERIFIED_AUTHORITIES as Record<string, unknown>)[key],
        `missing registry row: ${key}`,
      ).toBeTruthy();
    }
  });

  it("every quoted anchor row is verbatim in the approved corpus", () => {
    const misses: string[] = [];
    for (const key of Object.values(ANCHOR_KEYS)) {
      const q = (IR_PLAYBOOK_VERIFIED_AUTHORITIES as Record<string, { verbatim_quote?: string }>)[key]?.verbatim_quote ?? "";
      if (q && !inCorpus(q)) misses.push(key);
    }
    expect(misses, `retyped (non-verbatim) quotes: ${misses.join(", ")}`).toEqual([]);
  });

  it("the standards the builder emits are corpus text, not paraphrase", () => {
    const built = buildIrPlaybookDeliverables(PERFECT.intake);
    expect(inCorpus(built.sa_notification_determination.standard)).toBe(true);
    expect(inCorpus(built.data_subject_communication_determination.standard)).toBe(true);
    for (const limb of built.art34_exemption_analysis.limbs) {
      expect(inCorpus(limb.standard), `limb ${limb.limb}`).toBe(true);
    }
    for (const el of built.content_owner_mapping.elements) {
      expect(inCorpus(el.requirement_verbatim), `element ${el.element}`).toBe(true);
    }
    expect(inCorpus(built.content_owner_mapping.phasing.authority_verbatim)).toBe(true);
    expect(inCorpus(built.content_owner_mapping.documentation.authority_verbatim)).toBe(true);
    expect(inCorpus(built.art34_exemption_analysis.sa_override_verbatim)).toBe(true);
  });

  it("a UK-only incident quotes the UK mirror rows, not the EU rows", () => {
    const built = buildIrPlaybookDeliverables(ENCRYPTED.intake);
    expect(built.sa_notification_determination.standard).toContain("the Commissioner");
    expect(built.sa_notification_determination.standard_citation).toContain("UK GDPR");
    expect(IR_CORPUS_SNAPSHOT["ukgdpr-art-33"]).toContain(built.sa_notification_determination.standard);
  });
});

describe("ITEM 312 — analysis shape (no recitation)", () => {
  it("both determinations carry standard / record fact / application / verdict", () => {
    for (const fixture of [PERFECT, ENCRYPTED, DIVERGENCE]) {
      const b = buildIrPlaybookDeliverables(fixture.intake);
      for (const d of [b.sa_notification_determination, b.data_subject_communication_determination]) {
        expect(d.standard.length).toBeGreaterThan(60);
        expect(d.record_fact.length).toBeGreaterThan(60);
        expect(d.application.length).toBeGreaterThan(120);
        expect(d.verdict).toBeTruthy();
        // APPLICATION must reason over the record, not restate the statute.
        expect(d.application).not.toBe(d.standard);
      }
    }
  });

  it("the Art. 33(1) determination names the risk factors it ran the test over", () => {
    const d = buildSaNotificationDetermination(PERFECT.intake);
    const factors = d.risk_factors.map((f) => f.factor).join(" | ");
    expect(factors).toMatch(/Health \/ medical records/);
    expect(factors).toMatch(/hostile actor/i);
    expect(d.risk_factors.every((f) => f.record_basis.length > 5)).toBe(true);
  });

  it("SEPARATION LAW relocates exposure framing out of obligation reasoning", () => {
    const sep = separateExposure(
      "Notification is required under Article 33(1). Failure to notify exposes the controller to an administrative fine.",
    );
    expect(sep.repairs).toBe(1);
    expect(sep.why).not.toMatch(/fine/i);
    expect(sep.exposure).toMatch(/fine/i);
    for (const fixture of [PERFECT, ENCRYPTED, DIVERGENCE]) {
      const b = buildIrPlaybookDeliverables(fixture.intake);
      expect(b.sa_notification_determination.why).not.toMatch(/\bfine|\bpenalt/i);
      expect(b.data_subject_communication_determination.why).not.toMatch(/\bfine|\bpenalt/i);
    }
  });
});

describe("ITEM 312 — TWO-THRESHOLD LAW", () => {
  it("Art. 33(1) is reasoned, not assumed: the exception can be established", () => {
    const d = buildSaNotificationDetermination(ENCRYPTED.intake);
    expect(d.verdict).toBe("notification_not_required_unlikely_risk");
    expect(d.unlikely_risk_established).toBe(true);
    expect(d.application).toContain("unlikely to result in a risk");
  });

  it("a record that omits the encryption facts degrades instead of assuming", () => {
    const { encryptionStatus: _e, ...withoutEncryption } = PERFECT.intake as Record<string, unknown>;
    const d = buildSaNotificationDetermination(withoutEncryption);
    expect(d.verdict).toBe("undetermined_on_the_record");
    expect(d.status).toBe("record_insufficient");
    expect(d.information_needed).toContain("encryptionStatus");
  });

  it("the two thresholds diverge: notifiable to the SA but no high risk", () => {
    const b = buildIrPlaybookDeliverables(DIVERGENCE.intake);
    expect(b.sa_notification_determination.verdict).toBe("notification_required");
    expect(b.data_subject_communication_determination.verdict).toBe("communication_not_required_no_high_risk");
    expect(b.data_subject_communication_determination.high_risk_established).toBe(false);
    expect(b.data_subject_communication_determination.threshold_separation_note).toMatch(/separate and higher/i);
  });

  it("the Art. 34(1) verdict is never inherited from the Art. 33(1) verdict", () => {
    const required = buildDataSubjectCommunicationDetermination(PERFECT.intake, "notification_required", false);
    const notRequired = buildDataSubjectCommunicationDetermination(
      PERFECT.intake,
      "notification_not_required_unlikely_risk",
      false,
    );
    expect(required.verdict).toBe("communication_required");
    expect(required.verdict).toBe(notRequired.verdict);
    expect(required.high_risk_established).toBe(true);
  });
});

describe("ITEM 312 — Art. 34(3) exemption analysis", () => {
  it("walks all three limbs on every record", () => {
    for (const fixture of [PERFECT, ENCRYPTED, DIVERGENCE]) {
      const a = buildArt34ExemptionAnalysis(fixture.intake);
      expect(a.limbs.map((l) => l.limb)).toEqual([
        "a_unintelligible",
        "b_subsequent_measures",
        "c_disproportionate_effort",
      ]);
      expect(a.sa_override_verbatim).toContain("may require it to do so");
    }
  });

  it("limb (a) is available only where the data are unintelligible AND the keys held", () => {
    expect(buildArt34ExemptionAnalysis(ENCRYPTED.intake).limbs[0].verdict).toBe("available");
    expect(buildArt34ExemptionAnalysis(PERFECT.intake).limbs[0].verdict).toBe("not_available");
    const keysGone = { ...(ENCRYPTED.intake as Record<string, unknown>), encryptionKeyStatus: "Keys compromised or possibly compromised" };
    const withKeysGone = buildArt34ExemptionAnalysis(keysGone);
    expect(withKeysGone.limbs[0].verdict).toBe("not_available");
    expect(withKeysGone.limbs[0].application).toMatch(/key/i);
  });

  it("limb (b) is not satisfied by containment alone", () => {
    const b = buildArt34ExemptionAnalysis(PERFECT.intake).limbs[1];
    expect(b.verdict).toBe("undetermined_on_the_record");
    expect(b.status).toBe("record_insufficient");
    expect(b.application).toMatch(/likely to materialise/i);
    expect(b.information_needed).toBeTruthy();
  });

  it("limb (c) carries the public-communication substitute the provision supplies", () => {
    const c = buildArt34ExemptionAnalysis(PERFECT.intake).limbs[2];
    expect(c.substitute_measure).toContain("public communication");
    expect(inCorpus(c.substitute_measure!)).toBe(true);
  });

  it("an available exemption excuses communication on exemption grounds, stated as such", () => {
    const b = buildIrPlaybookDeliverables(ENCRYPTED.intake);
    expect(b.data_subject_communication_determination.verdict).toBe("communication_excused_by_exemption");
    expect(b.data_subject_communication_determination.why).toMatch(/34\(3\)\(a\)/);
  });
});

describe("ITEM 312 — Art. 33(3) content/owner mapping", () => {
  it("maps each element (a)-(d) to an owner and a source of truth", () => {
    const m = buildContentOwnerMapping(PERFECT.intake);
    expect(m.elements.map((e) => e.element)).toEqual([
      "a_nature", "b_dpo_contact", "c_likely_consequences", "d_measures",
    ]);
    const owners = Object.values(OWNERS);
    for (const el of m.elements) {
      expect(owners).toContain(el.owner);
      expect(el.source_of_truth.length).toBeGreaterThan(30);
      expect(el.citation).toMatch(/Art\. 33\(3\)/);
    }
  });

  it("element (a) is satisfied only when BOTH approximate numbers are recorded", () => {
    const m = buildContentOwnerMapping(PERFECT.intake);
    expect(m.elements[0].status).toBe("analysed");
    expect(m.elements[0].record_value).toContain("41,800");
    expect(m.elements[0].record_value).toContain("63,400");
    const { affectedRecordCount: _r, ...noRecords } = PERFECT.intake as Record<string, unknown>;
    const degraded = buildContentOwnerMapping(noRecords).elements[0];
    expect(degraded.status).toBe("record_insufficient");
    expect(degraded.information_needed).toContain("affectedRecordCount");
  });

  it("the Art. 33(4) phasing plan defers exactly the unresolved elements", () => {
    const m = buildContentOwnerMapping(PERFECT.intake);
    const deferred = m.phasing.phased.map((p) => p.element);
    expect(deferred).toContain("b_dpo_contact");
    expect(deferred).toContain("d_measures");
    expect(m.phasing.first_tranche).toContain("a_nature");
    expect(m.phasing.phased.every((p) => p.reason.length > 20)).toBe(true);
  });

  it("the Art. 33(5) record carries facts, effects and remedial action", () => {
    const d = buildContentOwnerMapping(PERFECT.intake).documentation;
    expect(d.facts).toContain("41,800");
    expect(d.effects).toMatch(/Article 34\(1\)/);
    expect(d.remedial_action).toBeTruthy();
    expect(d.authority_verbatim).toContain("the facts relating to the personal data breach, its effects and the remedial action taken");
  });
});

describe("ITEM 312 — contract guard + attach", () => {
  it("every new golden case validates against the actual contract", () => {
    for (const fixture of [PERFECT, ENCRYPTED, DIVERGENCE]) {
      const res = validateIntake(irPlaybookContract, fixture.intake as Record<string, unknown>);
      expect(res.violations, `${fixture.id}: ${JSON.stringify(res.violations)}`).toEqual([]);
      expect(res.ok).toBe(true);
    }
  });

  it("the pre-existing golden cases still validate (no contract regression)", () => {
    for (const c of IR_PLAYBOOK_GOLDEN.filter((x) => !["ir-perfect-record", "ir-encrypted-backup-exemption", "ir-two-threshold-divergence"].includes(x.id))) {
      const res = validateIntake(irPlaybookContract, c.intake as Record<string, unknown>);
      expect(res.violations, `${c.id}: ${JSON.stringify(res.violations)}`).toEqual([]);
    }
  });

  it("every field the builder reads is declared in the contract", () => {
    const declared = new Set(irPlaybookContract.fields.map((f) => f.key));
    for (const k of [
      "organizationName", "cause", "dataTypes", "affectedCount", "contained",
      "jurisdictions", "processorInvolved", "processorName",
      "encryptionStatus", "encryptionKeyStatus",
      "affectedRecordCount", "affectedDataSubjectCount", "awarenessConfirmed",
    ]) {
      expect(declared.has(k), `builder reads undeclared field: ${k}`).toBe(true);
    }
  });

  it("attach writes the four keys and emits telemetry", () => {
    const report: Record<string, unknown> = {};
    const meta = attachIrPlaybookDeliverables(report, PERFECT.intake);
    expect(meta.ok).toBe(true);
    expect(meta.sa_verdict).toBe("notification_required");
    expect(meta.ds_verdict).toBe("communication_required");
    for (const k of [
      "sa_notification_determination",
      "data_subject_communication_determination",
      "art34_exemption_analysis",
      "content_owner_mapping",
    ]) {
      expect(report[k], `missing key ${k}`).toBeTruthy();
    }
  });

  it("attach is fail-open on a hostile record", () => {
    const report: Record<string, unknown> = {};
    const meta = attachIrPlaybookDeliverables(report, null);
    expect(meta.ok).toBe(true);
    expect(report.sa_notification_determination).toBeTruthy();
  });
});
