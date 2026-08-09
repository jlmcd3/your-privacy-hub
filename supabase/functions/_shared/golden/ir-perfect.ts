// ITEM 415 LEG B — IR PLAYBOOK PERFECT FIXTURE (×1).
//
// A TRULY-COMPLETE-RECORD case for the Incident Response Playbook, authored
// against the live contract (`_shared/intake-contracts/ir-playbook.ts`) and
// the live item380-r5 `emptyAskedKeys` semantics:
//
//   * every ASKED field is non-empty. The IR contract declares NO
//     `conditional` fields and NO `emptyIsAnswer` fields, so "asked" here
//     means EVERY non-system contract key — the sixteen ITEM 312 / ITEM 369-IR
//     keys marked `required: "optional"` are asked and are answered, not
//     skipped. `processorInvolved` is answered TRUE so that `processorName`
//     carries a real counterparty rather than a vacuous string.
//   * every answer is SUFFICIENT: activation criteria stated as triggers with
//     the observation that fires them, a real severity matrix with escalation
//     routes, named roles with contact paths, notification obligations with
//     their clocks, evidence and forensics handling, recovery and the
//     post-incident review date.
//
// PRIMARY REGIME — UK GDPR + EU GDPR, with California as a US limb. The
// scenario is a cross-border retail energy supplier: it engages Art. 33/34
// against a lead supervisory authority, the UK's separate ICO duty, and a US
// state AG regime, so the notification-duty surfaces are genuinely exercised.
// HIPAA is deliberately NOT in scope — this organisation is not a covered
// entity, and asserting it would be an invented fact.
//
// FACT-EXEMPT RULE (item414 spine `REFERENCE_RENDER_TOKENS`): this scenario is
// entirely new. It carries zero token matches — nothing from the two walked
// renders (b6e26ca0-…, 333770f8-…) is seeded here as record truth.
//
// THE DEGRADED PILOT SOURCES, NAMED (nothing degraded is authored here):
//   * `GOLDEN_BY_TOOL["ir-playbook"] = IR_PLAYBOOK_GOLDEN`
//     (`_shared/golden/ir-playbook.ts`) — eight cases. Three QB-P20 originals
//     answer only the nine pre-ITEM-312 keys; five ITEM 312 additions add the
//     Chapter 8 keys but NONE of them answers a single ITEM 369-IR
//     standing-playbook key (`activationCriteria`, `severityMatrix`,
//     `responseTeamRoster`, `firstHourConfirmations`, `nextTabletopDate` …).
//     The case literally named `ir-perfect-record` is therefore perfect only
//     for the Chapter 8 determinations, not for the standing playbook: it is a
//     degraded record under the ITEM 369-IR two-artifact model, and it is the
//     reason yesterday's batch render carried an absence ledger.
//   * `MESSY_BY_TOOL["ir-playbook"]` — two adversarial thin-record entries
//     (`ir-messy-thin-forensic-record`, `ir-messy-mixed-eu-uk-parallel-duties`) that
//     exercise the honest-degradation direction.
// Both remain untouched and keep serving the degraded pilot.

import type { GoldenCase } from "./types.ts";

/** Harness recency rule (run-quality-batch L1165): discovery inside 7 days. */
const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const IR_PERFECT: GoldenCase[] = [
  {
    id: "ir-cross-border-energy-supplier-perfect",
    tool: "ir-playbook",
    set: "tuning",
    intake: {
      // ── The incident record (ITEM 312 / pre-312 keys) ────────────────
      // Named legal entity: the subject anchor every surface addresses.
      organizationName: "Kestrelfield Energy Supply Ltd",
      // Two days old: inside the harness recency rule, and far enough inside
      // the Art. 33(1) 72-hour window that the clock analysis is live rather
      // than academic.
      discoveryDateTime: isoDaysAgo(2),
      // Verbatim contract enum. Fixes the containment and forensics arcs.
      cause: "Phishing / credential compromise",
      // Verbatim enum members only. Three categories, none special-category:
      // the Art. 34 high-risk test must be reasoned, not assumed.
      dataTypes: [
        "Names and contact details",
        "Financial / payment data",
        "Passwords / credentials",
      ],
      // Verbatim enum. Sets the scale limb of the Art. 33(1) risk test.
      affectedCount: "10,000–100,000",
      // Three regimes, each with a different clock: UK ICO 72h, EU lead SA
      // 72h, California AG. Every notification-duty surface is exercised.
      jurisdictions: ["United Kingdom", "Ireland", "EU/EEA", "California"],
      // Answered TRUE so the processor limb of Art. 33(2) is live.
      processorInvolved: true,
      // The named processor — the Art. 28 counterparty whose notice clause the
      // contractual-deadline surface reads.
      processorName: "Aldermoor Billing Services Ltd",
      // Verbatim enum. "No" keeps the containment arc open, which is what
      // makes the standing playbook's isolation authority load-bearing.
      contained: "No",
      // Verbatim enum: a commercial supplier, not a public authority — this
      // decides whether an Art. 37 DPO is mandatory or nominated.
      organisationType: "Company",
      // Art. 34(3)(a): stated exactly, so the exemption analysis has a fact.
      encryptionStatus: "Some affected data encrypted",
      // The key limb of the same test — without it "encrypted" proves nothing.
      encryptionKeyStatus: "Keys not compromised",
      // Art. 33(3)(a) asks for approximate numbers of BOTH records and
      // subjects; the record supplies both, separately, with their basis.
      affectedRecordCount: "approx. 48,200 billing records across 3 customer databases",
      affectedDataSubjectCount: "approx. 31,600 residential and small-business account holders",
      // The confirmed-vs-assumed flag: this is what makes the 72-hour clock a
      // determinate date rather than an estimate.
      awarenessConfirmed:
        "Confirmed — discovery timestamp verified as the moment of awareness",

      // ── ITEM 369-IR standing-playbook record ─────────────────────────
      // Triggers, each stated as an observation that fires activation — not a
      // category label. This is what the activation surface renders verbatim.
      activationCriteria: [
        "Any confirmed or suspected unauthorised access to the billing platform, the customer identity store or the payment gateway.",
        "Any alert from the managed detection service graded Priority 1 or Priority 2 that involves customer personal data.",
        "Any report from a processor, supplier or regulator of a security incident affecting Kestrelfield customer data.",
        "Any ransomware indicator, mass credential-reset event, or unexplained bulk export exceeding 5,000 customer records.",
        "Any loss or theft of an unencrypted device or removable medium known to hold customer personal data.",
      ],
      // A real matrix: level, what it means, who it escalates to, how fast.
      severityMatrix: [
        {
          level: "SEV-1 — Critical",
          definition:
            "Confirmed unauthorised access to customer personal data at scale, or loss of the billing platform, with a credible statutory notification duty.",
          escalation:
            "Incident Lead notifies the Chief Executive and the Board's Audit and Risk Committee chair within 60 minutes; outside counsel engaged immediately.",
        },
        {
          level: "SEV-2 — Major",
          definition:
            "Confirmed compromise of a system holding personal data where scope is not yet bounded, or a processor has reported a breach affecting Kestrelfield data.",
          escalation:
            "Incident Lead notifies the Chief Information Security Officer and the Data Protection Officer within 2 hours; counsel on standby.",
        },
        {
          level: "SEV-3 — Contained",
          definition:
            "A security event affecting personal data that has been stopped at the perimeter with no evidence of access, exfiltration or alteration.",
          escalation:
            "Logged by the Security Operations Manager and reviewed at the weekly security forum; no executive escalation.",
        },
      ],
      // The numeric thresholds that decide which row of the matrix applies.
      severityThresholds: [
        "SEV-1: more than 1,000 data subjects affected, or any exposure of payment credentials or authentication secrets.",
        "SEV-2: between 100 and 1,000 data subjects affected, or any incident where the affected population cannot yet be bounded within 4 hours.",
        "SEV-3: fewer than 100 data subjects affected and no evidence of access to, or exfiltration of, personal data.",
      ],
      // Named humans with alternates: the roster surface asserts nothing the
      // organisation has not recorded, so it needs real names.
      responseTeamRoster: [
        { role: "Incident Lead", primary: "H. Ellery-Voss (Director of Operational Resilience)", alternate: "N. Cadwalader (Head of Service Continuity)" },
        { role: "Security / Forensics Lead", primary: "D. Ainsworth-Payne (Chief Information Security Officer)", alternate: "T. Rasmussen (Security Operations Manager)" },
        { role: "Data Protection Officer", primary: "S. Marchetti-Doyle (Data Protection Officer)", alternate: "J. Bhandari (Deputy DPO, Dublin)" },
        { role: "Legal", primary: "P. Rowntree (General Counsel)", alternate: "A. Fenwick-Osei (Senior Legal Counsel, Regulatory)" },
        { role: "Communications Lead", primary: "M. Larkspur (Director of Corporate Affairs)", alternate: "C. Idowu (Head of Customer Communications)" },
        { role: "IT Operations", primary: "R. Tenniel (Head of Platform Engineering)", alternate: "K. Osgood (Infrastructure Manager)" },
      ],
      // The external panel, each with a contact path rather than a name alone.
      outsideCounselName: "Thorne Bellamy LLP (Data Protection and Cyber Incident practice)",
      outsideCounselContact: "24-hour incident line +44 20 7946 0188; incident@thornebellamy.example; engagement partner E. Vasari-Hume",
      // TRUE: privilege is claimed from first instruction, which is what makes
      // the first-hour counsel step meaningful rather than decorative.
      privilegeProtocol: true,
      insurerContact:
        "Marchmont Specialty Cyber, policy MSC-CY-4471-26, notification condition 14 days; claims notification +44 20 7946 0233; cyberclaims@marchmontspecialty.example",
      forensicVendorContact:
        "Halstead Digital Forensics, retainer HDF-RET-2026-0114 with a 4-hour response SLA; dispatch +44 161 496 0044; ir@halsteadforensics.example",
      lawEnforcementContact:
        "Action Fraud reporting portal and the National Cyber Security Centre incident line 0300 123 2040; regional contact DS L. Quennell, North West Regional Cyber Crime Unit",
      // The systems the playbook must name to be operable in an incident.
      keySystems: [
        "Kestrelfield billing platform (SAP IS-U production instance, Manchester data centre)",
        "Customer identity store (Azure Entra ID tenant kestrelfield.onmicrosoft.example)",
        "Payment gateway integration (Adyen, tokenised card references only)",
        "Customer self-service portal (myKestrelfield, AWS eu-west-2)",
        "Smart-meter data collection service (DCC adapter, Reading)",
      ],
      // The log sources the preservation instruction has to reach.
      logSources: [
        "Azure Entra ID sign-in and audit logs (90-day retention, exported to the SIEM)",
        "Microsoft Sentinel SIEM workspace (13-month retention)",
        "AWS CloudTrail and VPC flow logs for eu-west-2 (12-month retention)",
        "SAP IS-U application and change-document logs (7-year retention)",
        "Palo Alto perimeter firewall and VPN concentrator logs (12-month retention)",
        "Mimecast email gateway message tracking and journaling (7-year retention)",
      ],
      // The standing authority the first-hour isolation step depends on.
      itIsolationAuthority:
        "The Head of Platform Engineering may isolate any system without further approval on the Incident Lead's instruction; where isolation would interrupt customer supply, the Chief Operating Officer must be informed within 30 minutes but isolation is not delayed.",
      // Contractual notice duties: counterparty, clock, and the clause.
      breachNoticeContracts: [
        { counterparty: "Aldermoor Billing Services Ltd (processor)", deadline: "Without undue delay and in any event within 24 hours of awareness", clause: "Data Processing Agreement cl. 9.2" },
        { counterparty: "Adyen N.V. (payment gateway)", deadline: "Within 24 hours of awareness of any incident affecting cardholder data", clause: "Merchant Services Agreement cl. 11.4 and PCI DSS req. 12.10" },
        { counterparty: "Data Communications Company (smart-meter network)", deadline: "Within 48 hours of awareness", clause: "Smart Energy Code section G8.11" },
        { counterparty: "Marchmont Specialty Cyber (insurer)", deadline: "Within 14 days of awareness", clause: "Policy MSC-CY-4471-26, notification condition 3(a)" },
      ],
      // Every first-hour step is confirmed in place, by id, so the checklist
      // surface renders a standing capability rather than an open question.
      firstHourConfirmations: [
        "fh_activate",
        "fh_clock",
        "fh_preserve",
        "fh_isolate",
        "fh_counsel",
        "fh_dpo",
        "fh_scope",
        "fh_insurer",
      ],
      // The post-incident review commitment, as a date the playbook can state.
      nextTabletopDate: "2026-11-18",
    },
    assertions: [
      { kind: "must_include", pattern: "Kestrelfield", flags: "i", label: "subject anchor named" },
      { kind: "must_include", pattern: "72\\s*hours?|Article\\s*33", flags: "i", label: "GDPR 72h clock reached" },
      { kind: "must_not_include", pattern: "\\[TO BE COMPLETED\\]", label: "no placeholder token on a complete record" },
    ],
  },
];
