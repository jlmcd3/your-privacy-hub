# ITEM 339 — DOCUMENT RE-PLANNING: BEFORE/AFTER — cppa-risk

Donor sample_report: `a7689621-63e6-42ad-90cc-7760e892eb6d`. Plan on disk remains `approved: false`; the AFTER render marks it approved in memory only, pending CEO sign-off.

## BEFORE — donor report, walked in key order

### Retrieval Meta

Enforcement Context Chars: 0; Longitudinal Synthesis Chars: 0

### Schema Version

v4-five-stage

### Priority Actions

Action: Document a specific, non-generic purpose for the automated risk-scoring activity, replacing the current formulation ('Service delivery, security, analytics, and support'). The assessment record must identify the concrete business function, the personal information used, and the outcome achieved — a formulation naming only broad business goals does not satisfy the § 7152(a)(1) specificity requirement. Marked Immediate because § 7152(a)(1) requires a specific, non-generic statement of purpose before the assessment can be relied on. The § 7155(b) compliance deadline for existing activities is December 31, 2027.; Deadline: 2027-12-31; Severity: Immediate; Deadline Basis: 11 CCR § 7155(b) …

### Strengthen Items

Item Id: S-1; Citation: § 1798.140(ag) (service provider); § 1798.140(j) (contractor); § 1798.140(ad) ('sell'); § 1798.140(ah) ('share'); 11 CCR § 7150(b)(1); Field Ids: i6_vendors; Recorded Basis: standard_template; Item Id: S-2; Citation: 11 CCR § 7152(a)(3) (minimum PI and retention criteria); 11 CCR § 7155(a) (timing and retention requirements); Field Ids: i2_retention_period; Recorded Basis: written_policy

### Document Metadata

Disclaimer: This document has been generated to assist in preparing a CPPA risk assessment. It does not constitute legal advice. Review with qualified privacy counsel before submission or reliance.; Assessment Version: 1.0; Compliance Deadline: December 31, 2027; Statutory Framework: Cal. Code Regs. tit. 11, §§ 7150–7157

### Normalised Intake

Impact: Harm Types: Unauthorised access, destruction, use, modification, or disclosure; Impairment of consumer control over personal information; Severity Of Harm: Moderate; Likelihood Of Harm: Possible; Benefits Outweigh Risks: Yes; Prior Assessments Conducted: true; Cybersecurity Gaps Identified: false; Vulnerable Populations Detail: No specific vulnerable population identified.; Benefits Outweigh Risks Rationale: Fraud prevention and service reliability benefits materially exceed the limited privacy impact after safeguards.; Triggers: Admt Involved: false; Sells Or Shares Pi: true; Targeted Advertising: false; High Volume Processing: false; Profiling Significant Effects: false; Sensitive …

### Assessment Summary

Sector: Believed-basis Pilot; Company Name: Syntara Believedbasis Corp.; Assessment Date: 2026-07-06; Exceptions Status: Material gaps identified; Exceptions Claimed: Fraud prevention / detection; Security and integrity of systems and data; Compliance with a legal obligation; Overall Risk Level: Moderate; Triggered Activities: Selling or sharing personal information (§ 7150(b)(1)); Corpus Enforcement Note: No enforcement actions from the CPPA have been supplied in the enforcement corpus for this assessment run. The CPPA Audits Division became operational in February 2026. Enforcement posture and priorities are described generically below under enforcement_context; for specific enforcement ac …

### Exception Analysis

Flags: Retention conflict: 90-day exception retention vs. 24-month general retention — see inconsistency_flags: retention-period conflict.; § 1798.145 provision citation absent from record.; Necessity documentation absent.; Claimed: true; Exception Name: Fraud prevention and detection; Scope Described: Automated fraud signals on account access and payment events.; Statutory Basis: see exception-citation note in priority_actions; Missing Elements: Specific Cal. Civ. Code § 1798.145 provision citation not provided in the assessment record.; The 90-day retention stated for this exception directly contradicts the 24-month general retention period recorded elsewhere; see inconsistency_flags: rete …

### Information Needed

Field: i1_processing_purpose; Enables: § 7152(a)(1) purpose documentation; the § 7154 benefits-outweigh-risks balancing conclusion; overall assessment reliance; Provision: 11 CCR § 7152(a)(1); Dimensions: The concrete business function performed by the automated risk-scoring activity, the specific personal information used in that function, and the outcome achieved for each stated purpose — distinct from broad business goals such as service delivery or security; Source Fields: i1_processing_purpose; Field: q2_consumers; Enables: § 7152(a)(1) processing summary; consumer-category documentation in scope_and_triggers and risk_assessment_by_activity; Provision: 11 CCR § 7152(a)(1); Dimensions: T …

### Record Sufficiency

Complete: false; Statement: The assessment record as provided is incomplete under 11 CCR §§ 7150–7157. The following § 7152(a) elements remain open: (1) § 7152(a)(1) — the processing purpose is stated in generic terms and does not satisfy the specificity requirement; consumer categories are not documented; (2) § 7152(a)(3) — recipient classification for AWS, Snowflake, and Zendesk is unresolved; the retention-period conflict between 90 days and 24 months is unresolved; (3) § 7154 balancing — insufficient basis to conclude benefits outweigh risks pending resolution of the purpose, recipient, and cross-context tracking gaps. Four inconsistency flags — on retention periods, cross-context tracki …

### Scope And Triggers

Scope Notes: This assessment addresses the single fixed processing activity: automated risk scoring of California customers in the Believed-basis Pilot. The scope is limited to selling or sharing personal information under § 7150(b)(1). Three business-purpose exceptions are claimed; their documentation status is assessed in exception_analysis. The intake records cross-context tracking as present alongside a negated profiling field; this contradiction is documented in inconsistency_flags and bears on whether the § 7150(b)(1) trigger is accurately scoped and whether any § 7150(b)(3) or § 7150(b)(4) trigger is separately required. The intake also records ADMT-related fields (rules-based scoring …

### Enforcement Context

Relevant Precedents: No specific enforcement actions have been provided in the enforcement corpus for this assessment run. Specific enforcement actions — naming parties, dates, outcomes, dockets, or fines — are not asserted from outside the supplied corpus. For specific CPPA enforcement orders and actions, consult the CPPA's public enforcement register.; Sector Specific Patterns: The CPPA has signalled through its rulemaking record and public statements that selling and sharing personal information — particularly where cross-context tracking and automated scoring are involved — are among its highest enforcement priorities. Businesses that cannot produce a complete, § 7152-compliant risk-asse …

### Inconsistency Flags

Description: The intake directly contradicts itself on retention period: a 90-day retention is stated as the safeguard for the fraud-prevention exception, while a 24-month general retention period is recorded in the § 7152(a) content fields. These two figures cannot both apply to the same data categories and purposes without a documented allocation. If they govern different data categories or purposes, the record must specify which period applies to which categories and under which conditions.; Source Fields: i2_retention_period; i2_retention_criteria; exceptions_intake; Intake Field 1: i2_retention_period; Intake Field 2: exceptions_intake; Regulatory Citation: 11 CCR § 7152(a)(3) (minimum …

### Legacy Shim Applied

true

### Cross Tool Recommendations

Admt Assessment: false; Cybersecurity Audit: true; Admt Assessment Rationale: An ADMT assessment is not triggered on the current record pending resolution of the inconsistency identified in inconsistency_flags: ADMT contradiction. The intake records substantive ADMT operational parameters alongside negated ADMT trigger fields. Until the controller resolves and documents whether the rules-based scoring system meets the § 7001(e) ADMT definition and whether any decisions fall within the decisions enumerated in § 7001(ddd), whether an ADMT assessment under § 7150(b)(3) or § 7150(b)(6) is required cannot be determined. If the ADMT trigger is confirmed, a separate ADMT assessment and § 7220 pre-u …

### Risk Assessment By Activity

Purpose: Required documentation: a specific, non-generic purpose identifying the concrete business function, the data used, and the outcome achieved — per § 7152(a)(1). The intake records 'Service delivery, security, analytics, and support,' which does not satisfy the § 7152(a)(1) specificity requirement as applied to the fixed assessment subject (automated risk scoring of California customers). A generic formulation naming only broad business goals does not satisfy § 7152(a)(1). The record must be supplemented with a specific, non-generic purpose statement before this assessment can be relied on.; Activity: Selling or sharing personal information — automated risk scoring of California custo …


## AFTER — planned document (headline → scope → record → analysis → duty → ask → remedy → close)

### Determination

Syntara Believedbasis Corp. records overall risk level of Moderate, because sector on the record is Believed-basis Pilot. In addition, assessment date on the record is 2026-07-06. However, exceptions status on the record is Material gaps identified. By contrast, exceptions claimed on the record is Fraud prevention / detection; Security and integrity of systems and data; Compliance with a legal obligation.

### Why this assessment is required *(degraded — no determination on the record)*

The record does not state enough for a determination in this section, because scope notes on the record is This assessment addresses the single fixed processing activity: automated risk scoring of California customers in the Believed-basis Pilot. The scope is limited …. In addition, triggered activities detail on the record is Activity: Selling or sharing personal information; Data Categories: Identifiers; Internet activity; Commercial information; Statutory Basis: 11 CCR § 7150(b)(1) ….

### The record as the company stated it

Impact on the record is Harm Types: Unauthorised access, destruction, use, modification, or disclosure; Impairment of consumer control over personal information; Severity Of Harm: Mode …. In addition, triggers on the record is Admt Involved: false; Sells Or Shares Pi: true; Targeted Advertising: false; High Volume Processing: false; Profiling Significant Effects: false; Sensitive Pi B …. However, exceptions on the record is Debugging: Claimed: false; Documented: false; Transient Use: Claimed: false; Documented: false; Fraud Detection: Scope: Automated fraud signals on account acces …. Further, org context on the record is Sector: Believed-basis Pilot; Company Name: Syntara Believedbasis Corp.; Board Level Oversight: false; Dpo Or Privacy Officer: false; Privacy Counsel Engaged: f ….

### Risk analysis by activity

Purpose: Required documentation: a specific, non-generic purpose identifying the concrete business function, the data used, and the outcome achieved — per § 7152(a)(1). The intake records 'Service del …

### Exceptions claimed

Flags: Retention conflict: 90-day exception retention vs. 24-month general retention — see inconsistency_flags: retention-period conflict.; § 1798.145 provision citation absent from record.; Necessity …

### Regulatory expectations bearing on this activity *(degraded — no determination on the record)*

The record does not state enough for a determination in this section, because relevant precedents on the record is No specific enforcement actions have been provided in the enforcement corpus for this assessment run. Specific enforcement actions — naming parties, dates, outc …. In addition, sector specific patterns on the record is The CPPA has signalled through its rulemaking record and public statements that selling and sharing personal information — particularly where cross-context trac …. Further, audit division priorities on the record is The CPPA Audits Division became operational in February 2026. Based on the agency's published rulemaking record, priority areas include: completeness of risk-as ….

### What the record does not yet state

The record states Field: i1_processing_purpose; Enables: § 7152(a)(1) purpose documentation; the § 7154 benefits-outweigh-risks balancing conclusion; overall assessment reliance; …

### What to do next

Action: Document a specific, non-generic purpose for the automated risk-scoring activity, replacing the current formulation ('Service delivery, security, analytics, and support'). The assessment recor …

### Related assessments *(degraded — no determination on the record)*

The record does not state enough for a determination in this section, because admt assessment on the record is false. In addition, cybersecurity audit on the record is true. Further, admt assessment rationale on the record is An ADMT assessment is not triggered on the current record pending resolution of the inconsistency identified in inconsistency_flags: ADMT contradiction. The int …. Separately, cybersecurity audit rationale on the record is The intake records annual gross revenue over $25 million and a California consumer volume over 100,000. Section 7120(b) requires a cybersecurity audit where a b ….
