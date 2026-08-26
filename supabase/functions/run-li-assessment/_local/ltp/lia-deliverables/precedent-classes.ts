// LIA precedent-class posture table — doc 73 §4 (R2), CEO-ratified
// 2026-08-25/26. THIS is the resolution of PN-L2: enforcement decisions
// inform the deterministic engine as a class-level, sourced posture keyed
// to the SAME use-case vocabulary Stage 1 classifies against
// (lia-use-case-classifier.ts), never as a numeric fine-derived weight and
// never as an override of the record's own three-part-test outcome. One
// curation serves both planes: the engine states the posture as a
// disclosed presumption the record's own facts then confirm or
// distinguish; the report renders the posture with its authorities and a
// ToA trail.
//
// CEO amendments (2026-08-26, ratifying doc 73 §5 items 2/3): this table
// MUST be understood by the code as periodically updatable — new verified
// corpus items get folded in as they're ingested, not treated as a frozen
// snapshot. See "HOW TO ADD A ROW" below; bump LIA_PRECEDENT_CLASSES_VERSION
// on every change. The standing watch query that surfaces new candidates
// lives at _shared/corpus/lia-li-relevant-watch.sql (doc 50 §4 T2 lane).
//
// COVERAGE IS DELIBERATELY PARTIAL. Two classes are ratified-ready today
// (behavioral_advertising, employee_monitoring) because doc 73's live
// sweep found strong, verified, cleanly-on-point authorities for them. The
// other six use-case classes (direct_marketing, fraud_prevention,
// research_analytics, it_security, contractual_administration,
// product_improvement) have NO row here — that is the correct, honest
// no-padding state (doc 04/48's discipline: an absent posture is not a
// defect), not a gap to paper over with a weaker citation. Filling them is
// T3 curation work (doc 50 §4), not this landing's job. `other` never gets
// a posture row — it is the classifier's catch-all, not a use case.
//
// RATIFICATION GATE: LIA_PRECEDENT_CLASS_RATIFIED gates whether
// precedent-class.ts's finding reaches the skeleton document at all. The
// posture/authorities below are DRAFTED (not yet CEO-approved as
// customer-facing bytes) until that flag flips — set it true only after
// the CEO has ratified the exact `what_happened` sentences at a redline,
// per doc 04 §6 ("CEO ratification of every customer-facing byte").
//
// REGISTER (CEO ruling, 2026-08-26 — fleet prose/formatting rules apply
// here): no depicted reasoning grid (doc 71 §9 PN-V5-1) — this table is
// never rendered as a table; the builder turns each row into prose. Show,
// don't announce (doc 71 §10 item 3) — the rendered sentence states the
// substantive finding only; it never narrates that a "ratified table" or
// "precedent-class posture" mechanism produced it. LIA's own existing
// register ("the record states...") is kept for continuity within the
// document rather than importing CPPA Risk's "on the information
// provided" phrasing wholesale — doc 71 §9 item 6 rules the PRINCIPLES
// fleet-wide "to the extent reasonable per document," not a mechanical
// find-replace of a phrase LIA never used. Citation form matches the
// fleet's CF-ENF constant (doc 63 §1): no GDPR-vs-CCPA clause (LIA is
// GDPR-native, so that clause never applies here, unlike CPPA products).
//
// HOW TO ADD A ROW (T3 curation session):
//   1. Verify the enforcement_actions row live (id, regulator, subject,
//      jurisdiction, decision_date, case_reference if docket-shaped,
//      fine_eur_equivalent, verification_status='verified').
//   2. Draft `what_happened` from key_compliance_failure/raw_text —
//      summarize, never invent; no fine amount unless fine_verified=true.
//   3. Name the doc 58 §1 factor_ids this class posture bears on.
//   4. Add the PrecedentClassRow; bump LIA_PRECEDENT_CLASSES_VERSION.
//   5. `LIA_PRECEDENT_CLASS_RATIFIED` stays whatever it already was — a
//      new/edited row needs its OWN redline before it renders; the flag is
//      an all-or-nothing gate today (see precedent-class.ts's own note on
//      per-row gating if that becomes necessary once coverage grows).

import type { PrecedentClassAuthority, PrecedentClassPosture } from "./types.ts";

export const LIA_PRECEDENT_CLASSES_VERSION = "lia-precedent-classes-v1-2026-08-26";

/** Flipped TRUE 2026-08-26 under the CEO's delegated ratification (the LIA
 * Conversion completion directive): the `what_happened` prose below and
 * the POSTURE_SENTENCE templates (precedent-class.ts) are ratified bytes.
 * The Factor-Bearing Law's ToA/appendix trail now exists — the skeleton's
 * Persuasive Authority section (lia-persuasive-authority.ts) carries the
 * cited decisions with composed authority labels, and the ToA lists them
 * iff cited. Rendering is additionally confined to the deterministic path
 * (LIA_DETERMINISTIC_ENABLED) so the legacy model path stays byte-frozen. */
export const LIA_PRECEDENT_CLASS_RATIFIED = true;

export interface PrecedentClassRow {
  readonly use_case_class: string;
  readonly posture: PrecedentClassPosture;
  readonly factor_ids: readonly string[];
  readonly authorities: readonly PrecedentClassAuthority[];
}

export const LIA_PRECEDENT_CLASSES: readonly PrecedentClassRow[] = [
  {
    use_case_class: "behavioral_advertising",
    posture: "rejected",
    // Factor 1 (Interest legitimacy) — the basis fails outright; Factor 4
    // (Balancing) — where the interest survives factor 1, balancing has
    // still gone against the controller at this scale.
    factor_ids: ["Interest legitimacy", "Balancing of interests, rights and freedoms"],
    authorities: [
      {
        source_row_id: "69eee35f-a280-47be-8159-bf778767ff31",
        regulator: "DPC (Ireland)",
        subject: "LinkedIn",
        jurisdiction: "Ireland",
        decision_date: "2024-10-22",
        fine_eur: 310_000_000,
        what_happened:
          "Ireland's Data Protection Commission fined LinkedIn €310,000,000 for processing personal data for behavioural analysis and targeted advertising without a valid legal basis, with insufficient transparency.",
      },
    ],
  },
  {
    use_case_class: "employee_monitoring",
    posture: "rejected",
    // Factor 6 (Relationship with the individual) — the employment power
    // imbalance; Factor 7 (Potential harms) — the intrusiveness the
    // decision actually penalized.
    factor_ids: ["Relationship with the individual", "Potential harms and severity"],
    authorities: [
      {
        source_row_id: "e7ad2d7a-bce7-493d-8cd9-b8966fb9114d",
        regulator: "CNIL (France)",
        subject: "Amazon France Logistique",
        jurisdiction: "France",
        decision_date: "2023-12-07",
        case_reference: "SAN-2023-021",
        fine_eur: 32_000_000,
        what_happened:
          "France's CNIL fined Amazon France Logistique €32,000,000 for extensively monitoring employee activity and performance using scanners and video surveillance, finding violations of data minimisation, the legitimate-interests basis, and transparency principles.",
      },
    ],
  },
];

/** Lookup by use-case class; undefined means no ratified posture exists
 * for this class yet (the honest, correct default for six of eight
 * classes today). */
export function precedentClassRow(useCaseClass: string): PrecedentClassRow | undefined {
  return LIA_PRECEDENT_CLASSES.find((r) => r.use_case_class === useCaseClass);
}
