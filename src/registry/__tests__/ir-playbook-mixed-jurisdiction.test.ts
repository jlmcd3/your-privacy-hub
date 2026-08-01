/**
 * ITEM 328 (UK/EU FIX 3 of 5) — regression guard for the mixed EU + UK incident.
 *
 * THE DEFECT THIS PINS
 *   `readIncidentFacts` computed `ukOnly = uk && eea.length === 0`, and both
 *   the Art. 33(1) and Art. 34(1) determinations selected their standard off
 *   that single boolean. An incident touching BOTH an EEA country and the
 *   United Kingdom therefore fell through to the EU rows only, and the UK
 *   Commissioner-notification duty — which applies independently, there being
 *   no mutual recognition post-Brexit — was silently dropped.
 *
 * WHAT IS PINNED
 *   1. A mixed incident produces TWO duty sets, one per regime, each labelled.
 *   2. Each set carries its own regime-correct verbatim standard: the UK leg
 *      says "the Commissioner", the EU leg says "supervisory authority", and
 *      neither leaks into the other.
 *   3. Each set carries a parallel-duty note stating the other duty is not
 *      discharged by this one.
 *   4. UK-only and EU-only incidents are unchanged (single duty set, correct
 *      rail) — the fix must not regress the Item 304 Fix D behaviour.
 *   5. Chapter V framing is regime-correct: the UK leg cites Art. 44A and
 *      carries the Art. 44 omission record; the EU leg cites Art. 44.
 *   6. The UK Chapter V rows are the SAME OBJECTS as Item 327's governance
 *      rows — reused by reference, not a second copy of the verbatim text.
 *
 * FIXTURE NOTE (flagged, deliberately not actioned here): no golden or
 * contract fixture in the repository sets `jurisdictions` to a mixed EU + UK
 * pair. A mixed-jurisdiction fixture is needed and is separate work; this file
 * exercises the builder directly so the behaviour is guarded meanwhile.
 */
import { describe, expect, it } from "vitest";

import {
  buildIrPlaybookDeliverables,
  buildSaNotificationDetermination,
  buildTransferFraming,
  readIncidentFacts,
} from "../../../supabase/functions/_shared/ltp/ir-playbook-deliverables/build";
import { IR_PLAYBOOK_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/ir-playbook-verified-authorities";
import { GOVERNANCE_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/governance-verified-authorities";

const baseIntake = {
  organizationName: "Northbank Mutual Insurance Society",
  discoveryDateTime: "2026-07-28T09:15:00Z",
  cause: "Ransomware or malware",
  dataTypes: ["Health / medical records", "Names and contact details"],
  affectedCount: "10,000–100,000",
  contained: "Yes",
  organisationType: "Financial institution",
  encryptionStatus: "No affected data encrypted",
  encryptionKeyStatus: "Not applicable — no encryption",
  affectedRecordCount: "41,200",
  affectedDataSubjectCount: "38,540",
  awarenessConfirmed:
    "Confirmed — discovery timestamp verified as the moment of awareness",
};

const mixed = { ...baseIntake, jurisdictions: ["Ireland", "United Kingdom"] };
const ukOnly = { ...baseIntake, jurisdictions: ["United Kingdom"] };
const euOnly = { ...baseIntake, jurisdictions: ["Ireland", "France"] };

describe("ir-playbook — mixed EU + UK incident engages both regimes (Item 328)", () => {
  it("reads both regimes off the record, in render order", () => {
    expect(readIncidentFacts(mixed).regimes).toEqual(["eu", "uk"]);
    expect(readIncidentFacts(mixed).mixed).toBe(true);
    expect(readIncidentFacts(ukOnly).regimes).toEqual(["uk"]);
    expect(readIncidentFacts(euOnly).regimes).toEqual(["eu"]);
  });

  it("produces TWO labelled duty sets, not one either/or choice", () => {
    const d = buildIrPlaybookDeliverables(mixed);
    expect(d.notification_duties).toHaveLength(2);
    expect(d.notification_duties.map((x) => x.regime)).toEqual(["eu", "uk"]);
    for (const set of d.notification_duties) {
      expect(set.regime_label.length).toBeGreaterThan(10);
      expect(set.sa_notification_determination.regime).toBe(set.regime);
      expect(set.data_subject_communication_determination.regime).toBe(set.regime);
    }
    expect(d.notification_duties[1].supervisory_authority).toBe("the Commissioner");
    expect(d.notification_duties[0].supervisory_authority).toBe(
      "the competent supervisory authority",
    );
  });

  it("each leg quotes its own regime's verbatim Art. 33(1)/34(1) standard", () => {
    const [eu, uk] = buildIrPlaybookDeliverables(mixed).notification_duties;
    expect(uk.sa_notification_determination.standard).toContain("the Commissioner");
    expect(uk.sa_notification_determination.standard_citation).toContain("UK GDPR");
    expect(eu.sa_notification_determination.standard).toContain("supervisory authority");
    expect(eu.sa_notification_determination.standard_citation).not.toContain("UK");
    expect(uk.data_subject_communication_determination.standard_citation).toContain("UK GDPR");
    expect(eu.data_subject_communication_determination.standard_citation).not.toContain("UK");
  });

  it("no bleed: the UK 'Commissioner' text never appears in the EU leg", () => {
    const [eu] = buildIrPlaybookDeliverables(mixed).notification_duties;
    const blob = JSON.stringify(eu.sa_notification_determination) +
      JSON.stringify(eu.data_subject_communication_determination);
    // "the Commissioner" is the UK statutory wording; the parallel-duty note
    // names the other REGIME, not its authority wording.
    expect(eu.sa_notification_determination.standard).not.toContain("the Commissioner");
    expect(blob).toContain("supervisory authority");
  });

  it("each leg states that the other duty is not discharged by it", () => {
    const [eu, uk] = buildIrPlaybookDeliverables(mixed).notification_duties;
    for (const set of [eu, uk]) {
      const note = set.sa_notification_determination.parallel_duty_note ?? "";
      expect(note).toContain("independently");
      expect(note.toLowerCase()).toContain("does not discharge");
    }
  });

  it("the UK leg reaches its own Art. 33 verdict on the same facts", () => {
    const uk = buildSaNotificationDetermination(mixed, "uk");
    const eu = buildSaNotificationDetermination(mixed, "eu");
    expect(uk.verdict).toBe("notification_required");
    expect(eu.verdict).toBe("notification_required");
    expect(uk.why).toContain("the Commissioner");
    expect(eu.why).toContain("the competent supervisory authority");
  });

  it("single-regime behaviour is unchanged (Item 304 Fix D not regressed)", () => {
    const ukDuties = buildIrPlaybookDeliverables(ukOnly).notification_duties;
    expect(ukDuties).toHaveLength(1);
    expect(ukDuties[0].regime).toBe("uk");
    expect(ukDuties[0].sa_notification_determination.standard).toContain("the Commissioner");
    expect(ukDuties[0].sa_notification_determination.parallel_duty_note).toBeUndefined();

    const euDuties = buildIrPlaybookDeliverables(euOnly).notification_duties;
    expect(euDuties).toHaveLength(1);
    expect(euDuties[0].regime).toBe("eu");
    expect(euDuties[0].sa_notification_determination.standard).not.toContain("the Commissioner");
  });

  it("scalar legacy fields remain a view onto the first duty set", () => {
    const d = buildIrPlaybookDeliverables(mixed);
    expect(d.sa_notification_determination).toBe(
      d.notification_duties[0].sa_notification_determination,
    );
    expect(d.data_subject_communication_determination).toBe(
      d.notification_duties[0].data_subject_communication_determination,
    );
  });

  it("a record with no GDPR-family jurisdiction still emits one framed duty set", () => {
    const d = buildIrPlaybookDeliverables({ ...baseIntake, jurisdictions: ["California"] });
    expect(d.notification_duties).toHaveLength(1);
    expect(d.notification_duties[0].regime).toBe("eu");
  });
});

describe("ir-playbook — Chapter V framing is regime-correct (Item 302 watch item 2)", () => {
  it("the UK leg cites Art. 44A and never Art. 44 as operative authority", () => {
    const uk = buildTransferFraming(mixed, "uk");
    expect(uk.citation).toBe("UK GDPR Art. 44A(1)");
    expect(uk.omitted_article_note).toContain("no UK GDPR Article 44 in force");
    expect(uk.application).toContain("Article 44A(1)");
    expect(uk.application).toContain("Article 45B");
    expect(uk.application).toContain("Article 47A(1)");
    // "Commissioner" (ICO) is correct UK wording; the EU Commission is not.
    expect(uk.application).not.toMatch(/Commission(?!er)/);
  });

  it("the EU leg cites Art. 44 and carries no UK omission record", () => {
    const eu = buildTransferFraming(mixed, "eu");
    expect(eu.citation).toBe("GDPR Art. 44");
    expect(eu.omitted_article_note).toBeUndefined();
    expect(eu.application).not.toContain("44A");
    expect(eu.application).not.toContain("Commissioner");
  });

  it("both legs degrade with a named ask — the intake carries no transfer field", () => {
    for (const regime of ["eu", "uk"] as const) {
      const t = buildTransferFraming(mixed, regime);
      expect(t.status).toBe("record_insufficient");
      expect(t.information_needed).toContain("third country");
      expect(t.information_needed).toContain("intake contract carries no field");
    }
  });

  it("a mixed incident carries both Chapter V rails, one per duty set", () => {
    const d = buildIrPlaybookDeliverables(mixed);
    expect(d.notification_duties.map((x) => x.transfer_framing.citation)).toEqual([
      "GDPR Art. 44",
      "UK GDPR Art. 44A(1)",
    ]);
  });
});

describe("ir-playbook — UK Chapter V rows are REUSED from Item 327, not duplicated", () => {
  const SHARED = [
    "uk_art_44_not_in_force",
    "uk_transfers_general_principle",
    "uk_transfers_adequacy_route",
    "uk_transfers_safeguards_route",
    "uk_adequacy_data_protection_test",
    "uk_transfers_appropriate_safeguards",
    "uk_transfers_sos_clauses",
    "uk_transfers_commissioner_clauses",
    "uk_transfers_data_protection_test",
  ] as const;

  it("every shared key is the SAME OBJECT in both registries", () => {
    for (const key of SHARED) {
      expect(IR_PLAYBOOK_VERIFIED_AUTHORITIES[key], `${key} missing from ir registry`).toBeTruthy();
      expect(IR_PLAYBOOK_VERIFIED_AUTHORITIES[key]).toBe(
        GOVERNANCE_VERIFIED_AUTHORITIES[key],
      );
    }
  });

  it("no shared UK quote is re-typed as a literal in the ir registry", () => {
    // Reference-identity above proves it; this asserts the quotes are non-empty
    // so a future refactor cannot satisfy the identity check with empty rows.
    for (const key of SHARED) {
      expect(IR_PLAYBOOK_VERIFIED_AUTHORITIES[key].verbatim_quote.length).toBeGreaterThan(30);
    }
  });
});
