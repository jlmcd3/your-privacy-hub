// PROMPT 9G item 1 (2026-08-15) — CEO-PINNED PERFECT DPIA FIXTURES.
//
// The CEO's verification layer enumerated the complete perfect-intake
// acceptance predicate from the shipped code and PROVED these two intakes
// clean through every gate (fixture lint, intake contract, closed-loop
// perfect check, full skeleton assembly) at mirror HEAD 0c471e283.
//
// BYTE-EXACT. These objects are a mechanical transcription of the two
// attached intake JSONs — no value is retyped, reformatted, corrected or
// "improved". The secondary-use alternatives entry matches byte-equal on an
// em dash; editing any character here is a silent regression, which is why
// the item-2 pin guard re-runs checkPerfectDpiaIntake over every pinned
// perfect fixture at commit time.

import type { GoldenCase } from "./types.ts";

export const DPIA_PERFECT_PINNED: GoldenCase[] = [
  {
    id: "dpia-perfect-uk-harrowgate-underwriting",
    tool: "dpia",
    set: "tuning",
    intake: {
          "organization_name": "Harrowgate Mutual Insurance Ltd",
          "processing_activity_name": "Motor Policy Underwriting Decisioning",
          "description": "An underwriting decisioning system that produces a policy eligibility and pricing decision for each motor insurance application, using the applicant's declared details, vehicle data and claims history.",
          "purpose": "The primary purpose is to produce an accurate underwriting decision for each motor insurance application within one working day, so that applicants receive a firm quotation quickly and the company prices cover in line with the risk each policy presents.",
          "data_categories": [
                "Customer records",
                "Financial data",
                "Contact details"
          ],
          "data_subjects": "Policyholders and applicants for Harrowgate motor insurance policies in the United Kingdom, all of whom are party to, or taking pre-contractual steps toward, a contract of insurance with the company.",
          "volume_frequency": "Approximately 3,500 applications are decided each month; each decision is computed once at application and re-computed only when the applicant amends the application.",
          "third_party_processors": [
                "Quotewise Analytics Ltd (quotation platform)",
                "Veridata Claims Bureau Ltd (claims history checks)"
          ],
          "existing_safeguards": [
                "Encryption at rest",
                "Encryption in transit",
                "Access controls",
                "Pseudonymisation",
                "Staff training",
                "DPA signed with processor",
                "Data minimisation"
          ],
          "jurisdictions": [
                "United Kingdom (UK GDPR)"
          ],
          "legal_basis_proposed": "Contract (Art. 6(1)(b))",
          "article_9_condition": "",
          "necessity_proportionality": "Underwriting each application individually is necessary to conclude the contract of insurance the applicant has requested: a quotation cannot be produced without assessing the specific risk the applicant presents, and the company has confirmed that no less data-intensive method produces a decision an underwriter can stand behind. The impact of the processing on the data subjects is stated separately from the benefit: applicants are subject to an automated pricing decision they cannot avoid once they apply, some applicants would not expect their claims history from previous insurers to affect the premium offered, and an applicant declined at this stage loses access to cover from the company on standard terms. That impact is limited by the measures recorded in this assessment: the decision uses only the declared details, vehicle data and claims history needed for the quotation, and every declined applicant is offered a manual review by a named underwriter.",
          "retention_period": "Seven years from the end of the policy term, running from policy expiry or lapse",
          "retention_record_type": "Underwriting decision records",
          "controller_contact": "Harrowgate Mutual Insurance Ltd, 14 Leadenhall Market, London EC3V 1LR — privacy@harrowgatemutual.co.uk",
          "dpo_info": "Priya Ramanathan, Data Protection Officer, dpo@harrowgatemutual.co.uk, +44 20 7946 0810",
          "processor_obligations": "Each processor acts only on the company's documented instructions under a signed processing contract covering the subject matter, duration, nature and purpose of the processing, the data and data subjects concerned, security measures, sub-processing controls, and return or deletion of data at the end of the engagement.",
          "processing_version": "3.2",
          "estimated_launch_date": "2026-09-01",
          "estimated_end_date": "",
          "dpia_team": "Priya Ramanathan (DPO), Mark Ellery (Head of Underwriting), Sofia Grant (Information Security Lead), external counsel from Fenwick Chambers on the transfer provisions.",
          "dpia_prepared_by": "Mark Ellery, Head of Underwriting, with the assessment team named above.",
          "dpia_approved_by_name": "Eleanor Vance",
          "dpia_approved_by_title": "Chief Risk Officer",
          "dpia_approval_date": "2026-07-30",
          "dpia_signoff_basis": "Approved on the basis of the full assessment record: the risk register, the mitigating measures recorded for each risk, the transfer analysis for each recorded flow, and the advice of the Data Protection Officer.",
          "reference_materials": "ICO guidance on insurance underwriting and pricing; the company's underwriting policy manual, version 12; model validation report MV-2026-04.",
          "reasons_to_conduct": [
                "Evaluation or scoring (incl. profiling / prediction)",
                "Automated decision-making with legal or significant effect",
                "Data processed on a large scale"
          ],
          "dpia_scope_note": "This assessment covers the underwriting decisioning system for new motor policies and mid-term amendments. Renewals pricing is assessed separately.",
          "publication_intent": "A summary of this assessment will be published on the company's website; the full assessment is available to the supervisory authority on request.",
          "secondary_uses": "Quarterly portfolio pricing calibration: underwriting decisions and their outcomes are analysed each quarter to recalibrate the pricing model. The legal basis for this secondary operation is Article 6(1)(f): the company's legitimate interest in pricing accuracy, a basis stated separately from the contractual basis of the primary operation. The impact of this secondary use on the data subjects, stated separately from its benefit to the company: policyholders would not expect their individual claims records to shape future pricing models after their own policy has ended, and they cannot avoid their records' inclusion in the calibration set while data is retained; the effect on any individual is limited because calibration operates on pseudonymised records and produces no decision about any individual policyholder.",
          "nature_scope_context": "The processing operates within the company's UK retail motor insurance business. Data is collected directly from applicants at quotation, supplemented by claims history checks from Veridata Claims Bureau, and processed in the company's underwriting platform hosted in the United Kingdom.",
          "functional_description": "The applicant submits an application; the platform validates the declared details, retrieves claims history, computes a risk score, and returns an eligibility decision and premium. A named underwriter reviews every declined application on request.",
          "supporting_assets": "The underwriting platform (UK-hosted), the Quotewise quotation service, the Veridata claims history service, and the DataRobot model management environment.",
          "codes_of_conduct": "The company subscribes to the Association of British Insurers' data standards for underwriting.",
          "data_minimisation_justification": "Each data item collected is required for the quotation decision: declared applicant details establish identity and eligibility, vehicle data establishes the insured risk, and claims history establishes prior loss experience. No browsing, marketing or telematics data enters the underwriting decision.",
          "data_quality_measures": "Declared details are validated against format and range checks at entry; claims history is refreshed from the bureau at each application; a quarterly accuracy audit samples one hundred decisions and traces every input to its source, with corrections applied within five working days.",
          "data_subject_rights_mechanisms": "Applicants can exercise access, rectification, erasure, restriction, portability and objection rights through the privacy portal or by writing to the DPO; identity is verified against the application record; responses are issued within one calendar month by the customer rights team.",
          "dp_by_design_measures": "Pseudonymisation of analytical datasets was implemented at the platform's launch in January 2024; role-based access controls were implemented in March 2024; data minimisation review of the application form was completed in May 2026.",
          "dpo_advice": "Priya Ramanathan advised on 18 July 2026 that the processing may proceed as described: the measures recorded address the risks identified, and the remaining risk levels recorded in this assessment sit below the threshold at which prior consultation with the Information Commissioner would be required.",
          "data_subjects_views_sought": "Yes — a panel survey of 400 recent applicants was run in May 2026.",
          "data_subjects_views": "Surveyed applicants supported faster decisions; a minority expressed concern about automated pricing and asked for a clear route to human review, which the company provides through the named-underwriter review offered to every declined applicant.",
          "alternatives_considered": [
                {
                      "processing_operation": "Motor Policy Underwriting Decisioning",
                      "alternative": "Manual underwriting of every application by the underwriting team without automated scoring",
                      "rejection_reason": "Manual review of every application was piloted in 2023 and produced a nine-working-day average decision time, which applicants in the pilot rated unacceptable; it also produced materially less consistent pricing between underwriters for equivalent risks."
                },
                {
                      "processing_operation": "Motor Policy Underwriting Decisioning",
                      "alternative": "Scoring on a reduced data set excluding claims history",
                      "rejection_reason": "Excluding claims history was tested in model validation report MV-2026-04 and mispriced high-risk applications to a degree the company's reinsurers would not accept, so the reduced data set cannot achieve the pricing accuracy the contract requires."
                },
                {
                      "processing_operation": "Motor Policy Underwriting Decisioning — secondary use",
                      "alternative": "Calibrating the pricing model on aggregated cohort statistics rather than pseudonymised individual records",
                      "rejection_reason": "Cohort-level calibration was evaluated in MV-2026-04 and could not detect the pricing drift that individual-level calibration detects; the model's accuracy degraded within two quarters in back-testing, so aggregated calibration cannot achieve the stated interest in pricing accuracy."
                }
          ],
          "residual_risks": "The company identifies two remaining risks after the measures recorded. First, an applicant could be mispriced where bureau claims data is stale; the remaining exposure is limited by the refresh at each application and the named-underwriter review. Second, unauthorised access to the underwriting data store could expose applicant financial details; the remaining exposure is limited by encryption and role-based access controls.",
          "controller_country": "GB",
          "controller_land": "",
          "controller_sector": "Insurance",
          "central_administration_country": "GB",
          "eu_decision_establishment_country": "",
          "transfer_flows": [
                {
                      "recipient": "Quotewise Analytics Ltd",
                      "destination_country": "GB",
                      "transfer_mechanism": "Domestic United Kingdom processing under the signed processing contract; no cross-border transfer.",
                      "notes": "Quotation platform hosted in AWS eu-west-2 (London)."
                },
                {
                      "recipient": "DataRobot Inc",
                      "destination_country": "US",
                      "transfer_mechanism": "UK Extension to the EU-US Data Privacy Framework; DataRobot Inc holds an active UK Extension certification.",
                      "notes": "Model management environment in AWS us-east-1.",
                      "uk_extension_certified": true
                },
                {
                      "recipient": "Veridata Claims Bureau Ltd (US archive)",
                      "destination_country": "US",
                      "transfer_mechanism": "UK International Data Transfer Agreement (IDTA) countersigned by both parties on 2025-04-22 (reference HMI-IDTA-2025-04). A transfer risk assessment for this flow was completed on 2025-04-15, reference HMI-TRA-2025-02, and is held on file.",
                      "notes": "Quarterly archive of claims-check audit records."
                }
          ],
          "source_assessment_id": ""
    },
    assertions: [],
  },
  {
    id: "dpia-perfect-eu-solferino-occupational-health",
    tool: "dpia",
    set: "tuning",
    intake: {
          "organization_name": "Clinique Solférino SAS",
          "processing_activity_name": "Occupational Health Fitness-for-Duty Assessment",
          "description": "A structured occupational health assessment that records the medical fitness-for-duty conclusion for each employee in safety-critical roles, as occupational medicine law requires, and routes the conclusion to the employer as a fitness verdict without underlying medical detail.",
          "purpose": "The primary purpose is to record and communicate a lawful fitness-for-duty conclusion for each employee in a safety-critical role, so that the company meets its occupational medicine obligations and employees are assigned only to duties they are medically fit to perform.",
          "data_categories": [
                "Health or medical data",
                "Employee records",
                "Contact details"
          ],
          "data_subjects": "Employees of Clinique Solférino SAS in safety-critical clinical and technical roles; each employee is party to an employment contract with the company and attends assessments scheduled under it.",
          "volume_frequency": "Approximately 90 assessments per month across two sites; each employee is assessed on hiring and then annually.",
          "third_party_processors": [
                "Medisys Occupational Records SARL (records platform)"
          ],
          "existing_safeguards": [
                "Encryption at rest",
                "Encryption in transit",
                "Access controls",
                "Pseudonymisation",
                "Staff training",
                "DPA signed with processor",
                "Data minimisation"
          ],
          "jurisdictions": [
                "EU (GDPR)"
          ],
          "legal_basis_proposed": "Legal obligation (Art. 6(1)(c))",
          "article_9_condition": "Preventive/occupational medicine, health or social care (Art. 9(2)(h))",
          "necessity_proportionality": "Recording an individual fitness-for-duty conclusion for each employee is necessary to comply with the occupational medicine obligations in the French Labour Code (Code du travail, Articles L. 4624-1 to L. 4624-8), which require periodic medical follow-up for employees in safety-critical roles; the obligation attaches to each employee individually and cannot be met with aggregate data. The impact of the processing on the data subjects is stated separately from that obligation: employees cannot avoid the assessment while they hold a safety-critical role, some employees would not expect the occupational physician's records to persist after they change roles, and an employee assessed as unfit loses eligibility for the affected duties. That impact is limited by the measures recorded: the employer receives only the fitness verdict and never the underlying medical detail, records are pseudonymised in the analytics store, and access is restricted to the occupational health team.",
          "retention_period": "The duration of employment plus five years, running from the end of the employment contract",
          "retention_record_type": "Occupational health assessment records",
          "controller_contact": "Clinique Solférino SAS, 22 rue de Solférino, 75007 Paris — privacy@clinique-solferino.fr",
          "dpo_info": "Laurent Mercier, Délégué à la protection des données, dpo@clinique-solferino.fr, +33 1 44 18 60 22",
          "processor_obligations": "Medisys Occupational Records SARL processes only on documented instructions under a signed processing contract covering subject matter, duration, nature and purpose, data and data subjects, security measures, sub-processing approval, and deletion at contract end.",
          "processing_version": "2.0",
          "estimated_launch_date": "2026-10-01",
          "estimated_end_date": "",
          "dpia_team": "Laurent Mercier (DPO), Dr Amélie Fontaine (occupational physician), Théo Vasseur (IT security officer).",
          "dpia_prepared_by": "Laurent Mercier, Délégué à la protection des données, with the assessment team named above.",
          "dpia_approved_by_name": "Isabelle Charpentier",
          "dpia_approved_by_title": "Directrice Générale",
          "dpia_approval_date": "2026-08-05",
          "dpia_signoff_basis": "Approved on the full assessment record: the statutory obligation identified, the risk register and mitigating measures, the Article 9(2)(h) condition recorded, and the advice of the Data Protection Officer.",
          "reference_materials": "CNIL guidance on occupational health records; Code du travail Articles L. 4624-1 to L. 4624-8; the company's occupational health protocol, version 4.",
          "reasons_to_conduct": [
                "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
                "Sensitive or highly personal data",
                "Data concerning vulnerable subjects"
          ],
          "dpia_scope_note": "This assessment covers the fitness-for-duty assessment process for safety-critical roles at both Paris sites. General HR record-keeping is assessed separately.",
          "publication_intent": "The assessment is held internally and made available to the CNIL on request.",
          "secondary_uses": "None",
          "nature_scope_context": "The processing operates within the company's occupational health service under French occupational medicine law. Data is collected directly from employees during scheduled assessments and held in the Medisys records platform hosted in France.",
          "functional_description": "The occupational physician records the assessment in the Medisys platform; the platform computes the follow-up schedule required by the Code du travail and issues the fitness verdict to the employer's HR system as a verdict only.",
          "supporting_assets": "The Medisys records platform (hosted in France), the occupational health team's clinical workstations, and the HR system that receives fitness verdicts.",
          "codes_of_conduct": "The service follows the CNIL reference framework for occupational health data.",
          "data_minimisation_justification": "Each data item is required by the statutory assessment: identity establishes the employee and role, the clinical record supports the physician's conclusion, and the verdict is the only element shared with the employer. No data beyond the statutory assessment set is collected.",
          "data_quality_measures": "Clinical entries are recorded by the examining physician at the point of assessment; identity and role data are synchronised weekly from the HR system; an annual audit samples fifty records for accuracy and completeness, with corrections applied within ten working days.",
          "data_subject_rights_mechanisms": "Employees can exercise access, rectification, erasure, restriction, portability and objection rights through the occupational health service or the DPO; identity is verified in person or against the employment record; responses are issued within one calendar month.",
          "dp_by_design_measures": "Verdict-only disclosure to the employer was implemented at the platform's deployment in February 2025; pseudonymisation of the analytics store was implemented in April 2025; role-based access for the occupational health team was implemented in February 2025.",
          "dpo_advice": "Laurent Mercier advised on 28 July 2026 that the processing may proceed as described: the statutory basis is established, the Article 9(2)(h) condition applies to the occupational health team's processing, and the remaining risk levels recorded in this assessment sit below the threshold at which prior consultation with the CNIL would be required.",
          "data_subjects_views_sought": "Yes — the works council (comité social et économique) was consulted in June 2026.",
          "data_subjects_views": "The works council supported the verdict-only disclosure design; members expressed concern about retention of clinical detail after role changes and asked that the analytics store hold pseudonymised records only, which the company has implemented.",
          "alternatives_considered": [
                {
                      "processing_operation": "Occupational Health Fitness-for-Duty Assessment",
                      "alternative": "Recording only aggregate fitness statistics per site without individual assessment records",
                      "rejection_reason": "The Code du travail obligation attaches to each employee individually: an aggregate record cannot evidence the individual medical follow-up the law requires, so the statutory obligation cannot be met with aggregate data."
                },
                {
                      "processing_operation": "Occupational Health Fitness-for-Duty Assessment",
                      "alternative": "Holding full clinical records in the HR system alongside the fitness verdict",
                      "rejection_reason": "Rejected as more intrusive than necessary: the employer needs only the verdict, and holding clinical detail in HR systems would expose medical data beyond the occupational health team without any addition to the statutory purpose."
                }
          ],
          "residual_risks": "The company identifies two remaining risks after the measures recorded. First, unauthorised access to clinical records could expose employee health data; the remaining exposure is limited by encryption, role-based access and the verdict-only disclosure design. Second, a stale role assignment could schedule an employee for the wrong assessment cadence; the remaining exposure is limited by the weekly HR synchronisation and the physician's review at each assessment.",
          "controller_country": "FR",
          "controller_land": "",
          "controller_sector": "Healthcare",
          "central_administration_country": "FR",
          "eu_decision_establishment_country": "FR",
          "transfer_flows": [],
          "source_assessment_id": ""
    },
    assertions: [],
  },
  // PROMPT 12I (2026-08-17) — two NOVEL verification-authored pins, APPENDED
  // after the existing entries so positions 0..1 stay stable. Byte-exact
  // transcriptions of the attached intake JSONs; do not reformat or edit.
  {
    id: "dpia-perfect-eu-nordfracht-telematics",
    tool: "dpia",
    set: "tuning",
    intake: {
          "organization_name": "Nordfracht Logistik GmbH",
          "processing_activity_name": "Fleet telematics route planning",
          "description": "Route planning for the controller's own delivery fleet from live vehicle positions reported by installed telematics units. All systems are hosted in the controller's Frankfurt data centre; no personal data leaves Germany.",
          "purpose": "Reduce fleet fuel consumption and missed delivery windows by planning next-day routes from actual vehicle positions and traffic history.",
          "data_categories": [
                "Location data",
                "Employee records",
                "Contact details"
          ],
          "data_subjects": "Employed delivery drivers of the controller who operate telematics-equipped vehicles during working hours.",
          "volume_frequency": "310 drivers; positions recorded every 90 seconds during shifts only.",
          "jurisdictions": [
                "EU (GDPR)"
          ],
          "legal_basis_proposed": "Legitimate interest (Art. 6(1)(f))",
          "article_9_condition": "",
          "necessity_proportionality": "The interest pursued is stated above as an outcome: fewer missed delivery windows and lower fuel consumption across the fleet. Route planning needs actual vehicle positions because plans built from depot schedules alone do not reflect roadworks, breakdowns or late customer access. The impact of the processing on the data subjects is stated separately from the benefit: drivers cannot avoid position recording while on shift, and some drivers would not expect movement data to be reviewed beyond the day it is collected. That impact is reduced by recording positions only during shifts, by aggregating traces older than seven days into route statistics that carry no driver identifier, and by barring use of the data for performance management under the works agreement.",
          "data_minimisation_justification": "Only vehicle position, timestamp and vehicle identifier are recorded; no cab audio, no video, and no off-shift recording. Traces older than seven days survive only as aggregated route statistics without a driver identifier.",
          "retention_period": "Identifiable traces 7 days, then aggregated; aggregates retained 24 months.",
          "existing_safeguards": [
                "Encryption at rest",
                "Encryption in transit",
                "Access controls",
                "Data minimisation",
                "Pseudonymisation",
                "Staff training",
                "DPA signed with processor",
                "Contractual restrictions"
          ],
          "third_party_processors": [
                "Other: Telematics platform operator (RheinTrack Systems GmbH)"
          ],
          "reasons_to_conduct": [
                "Data concerning vulnerable subjects",
                "Data processed on a large scale"
          ],
          "alternatives_considered": [
                {
                      "processing_operation": "",
                      "alternative": "Plan routes from depot departure schedules and postcode-level traffic feeds without vehicle positions",
                      "rejection_reason": "Schedule-based plans cannot react to roadworks, breakdowns or late customer access on the day, so the stated interest of fewer missed windows and lower fuel use would not be achieved."
                },
                {
                      "processing_operation": "",
                      "alternative": "Record positions only at delivery stops rather than continuously during the shift",
                      "rejection_reason": "Stop-only recording cannot support en-route replanning between stops, which is where the fuel and missed-window gains arise, so the purpose would not be achieved with materially less data than the 90-second interval already limited to shift hours."
                }
          ],
          "dpo_advice": "The DPO advised that off-shift recording be technically impossible rather than policy-barred and that the works agreement bar on performance-management use be referenced in the driver notice; both were implemented before this assessment was finalised.",
          "data_subjects_views_sought": "Yes — views sought",
          "data_subjects_views": "The works council consulted the driver body in February; the principal concern was use of traces for performance review, which the works agreement bar and the seven-day aggregation address.",
          "controller_country": "DE",
          "controller_land": "Hesse",
          "controller_sector": "private",
          "central_administration_country": "DE",
          "eu_decision_establishment_country": "DE",
          "controller_contact": "Nordfracht Logistik GmbH, Gutleutstraße 82, 60329 Frankfurt am Main, Germany — privacy@nordfracht.example",
          "dpo_info": "L. Brandt, Data Protection Officer — dpo@nordfracht.example, +49 69 4440 0",
          "processor_obligations": "Art. 28 data-processing agreement with RheinTrack Systems GmbH: processing on documented instructions only, staff confidentiality undertakings, no sub-processors without prior written approval, processing within Germany only, audit rights, and deletion of all fleet data within 30 days of contract end.",
          "processing_version": "1.3",
          "estimated_launch_date": "2026-06-15",
          "estimated_end_date": "2028-06-15",
          "dpia_team": "J. Weiss, Privacy Counsel (lead drafter); K. Sørensen, fleet operations manager; T. Adeyemi, telematics platform owner; L. Brandt, Data Protection Officer (advisory).",
          "reference_materials": "EDPB Guidelines on Data Protection Impact Assessment (WP248 rev.01); DSK guidance on employee location data; works agreement on telematics of 3 February 2026; internal Fleet Data Handling Standard v2.",
          "dpia_scope_note": "Covers telematics route planning for the controller's own German delivery fleet. The customer-facing parcel-tracking service is out of scope and is assessed in its own DPIA. This assessment is reviewed every 24 months or on material change; the end date above is the scheduled review boundary, not a termination of the processing.",
          "publication_intent": "Internal document; a summary is available to the works council on request.",
          "secondary_uses": "None. Position traces are not used for any purpose beyond route planning; fuel-efficiency reporting uses only the aggregated route statistics that carry no driver identifier.",
          "nature_scope_context": "Nature: automated collection of vehicle positions during shifts, short-term identifiable storage, aggregation, and scheduled deletion. Scope: about 310 drivers, positions at 90-second intervals during shift hours only, aggregated after seven days. Context: processing occurs inside an employment relationship with an acknowledged power imbalance; the works council was consulted and its concern about performance-management use is addressed by the works agreement bar; all systems are hosted in the Frankfurt data centre and no data leaves Germany.",
          "functional_description": "Telematics units report vehicle position every 90 seconds during shifts; the route-planning module builds next-day plans overnight and proposes en-route replanning during the day; a scheduled job aggregates traces older than seven days into route statistics without driver identifiers.",
          "supporting_assets": "Fleet telematics module of the LogiSuite platform (on-premises, Frankfurt data centre); encrypted trace store; planning engine of RheinTrack Systems GmbH under the Art. 28 agreement.",
          "codes_of_conduct": "No approved Art. 40 code of conduct applies. The controller follows the DSK guidance on employee location data, and the processor holds ISO 27001 certification.",
          "data_quality_measures": "Positions are recorded by the telematics unit itself; unit clock drift is corrected daily against the platform time source; drivers can flag misattributed traces through the depot office, and corrections are applied by the fleet operations manager.",
          "data_subject_rights_mechanisms": "Access, rectification and erasure requests via privacy@nordfracht.example, answered within one month; objection may be raised directly with the DPO or through the works council; the driver notice accompanies each vehicle assignment.",
          "dp_by_design_measures": "Recording is technically disabled outside shift hours; identifiable traces are held only in the trace store under named dispatcher accounts; route planning after seven days uses pseudonymised aggregates; an automated job enforces the seven-day aggregation; access logs are reviewed quarterly by the DPO.",
          "transfer_flows": [],
          "retention_record_type": "Retention schedule entry FL-04 in the corporate records-retention register.",
          "residual_risks": "Two moderate risks remain after the measures above. Dispatchers with trace access could view a driver's movements for a purpose outside route planning; it is accepted because access is limited to named dispatcher accounts, the works agreement bars performance-management use, and access logs are reviewed quarterly. A telematics unit fault could keep recording briefly after a shift ends; it is accepted because recording is technically bound to shift status, faults surface in the daily clock-drift reconciliation, and any stray trace falls inside the seven-day aggregation window.",
          "dpia_prepared_by": "J. Weiss — Privacy Counsel (Responsible); K. Sørensen — Fleet Operations Manager (Consulted); L. Brandt — Data Protection Officer (Accountable)",
          "dpia_approved_by_name": "R. Steiner",
          "dpia_approved_by_title": "Chief Operating Officer",
          "dpia_approval_date": "2026-05-28",
          "dpia_signoff_basis": "Sections 3 and 4 as reviewed on 26 May 2026, acceptance of two moderate residual risks, and the condition that off-shift recording remains technically disabled and the works agreement bar stays in force."
    },
    assertions: [],
  },
  {
    id: "dpia-perfect-uk-caledonia-claims",
    tool: "dpia",
    set: "tuning",
    intake: {
          "organization_name": "Caledonia Home Cover Ltd",
          "processing_activity_name": "Home-emergency claims handling",
          "description": "Handling of home-emergency insurance claims for policyholders: claim intake, engineer dispatch, invoice settlement and complaint follow-up. Core systems are hosted in the controller's Edinburgh data centre; the claims-workflow platform is operated by a certified United States processor.",
          "purpose": "Assess and settle home-emergency claims and dispatch approved engineers under each policyholder's policy.",
          "data_categories": [
                "Customer records",
                "Contact details",
                "Financial data"
          ],
          "data_subjects": "Policyholders of the controller who notify a home-emergency claim.",
          "volume_frequency": "88,000 policyholders; roughly 1,900 claims per month.",
          "jurisdictions": [
                "United Kingdom (UK GDPR)"
          ],
          "legal_basis_proposed": "Contract (Art. 6(1)(b))",
          "article_9_condition": "",
          "necessity_proportionality": "The processing rests on the home-emergency policy: each policyholder is a party to that contract, and claim assessment, engineer dispatch and settlement are the performance the contract requires, so the claim details, property address and payment particulars are necessary to perform it. The impact of the processing on the data subjects is stated separately from the benefit: policyholders cannot avoid providing claim and payment details if they wish to be indemnified, and some policyholders would not expect their claim history to be visible to the workflow platform operator. That impact is reduced by limiting the platform record to the claim particulars needed for dispatch and settlement, by the certified-transfer safeguards described in the transfer section, and by excluding claim history from any marketing use.",
          "data_minimisation_justification": "Only the claim particulars, property address, policy number and settlement details are processed; bank details are held in the payment vault, not the workflow record, and call recordings are retained separately under their own schedule.",
          "retention_period": "6 years from claim closure, per the limitation period, then deleted.",
          "existing_safeguards": [
                "Encryption at rest",
                "Encryption in transit",
                "Access controls",
                "Data minimisation",
                "Pseudonymisation",
                "Staff training",
                "DPA signed with processor",
                "Contractual restrictions"
          ],
          "third_party_processors": [
                "Other: Claims-workflow platform (Beacon Claims Cloud, Inc.)"
          ],
          "reasons_to_conduct": [
                "Data processed on a large scale",
                "Risk management / accountability (beneficial)"
          ],
          "alternatives_considered": [
                {
                      "processing_operation": "",
                      "alternative": "Handle claims entirely by telephone and post without a shared workflow platform",
                      "rejection_reason": "Manual handling cannot meet the policy's 24-hour emergency-response commitment at 1,900 claims per month, so the purpose of settling claims and dispatching engineers within the contractual service window would not be achieved."
                },
                {
                      "processing_operation": "",
                      "alternative": "Give the engineer network direct access to the full policy record instead of a claim extract",
                      "rejection_reason": "Direct access would not reduce the intrusion, it widens it: engineers would see policy and payment particulars they do not need, so the alternative would not achieve the purpose with less impact on the policyholder."
                }
          ],
          "dpo_advice": "The DPO advised that bank details never enter the workflow platform and that the transfer rest on the processor's certification under the UK Extension with a documented fallback clause; both points were implemented before this assessment was finalised.",
          "data_subjects_views_sought": "Yes — views sought",
          "data_subjects_views": "The controller's customer panel of 200 policyholders was surveyed in April; the principal concern was overseas visibility of claim details, which the certified-transfer limits and the claim-extract design address.",
          "controller_country": "GB",
          "controller_land": "",
          "controller_sector": "private",
          "central_administration_country": "GB",
          "eu_decision_establishment_country": "",
          "controller_contact": "Caledonia Home Cover Ltd, 14 Rutland Square, Edinburgh EH1 2AS, United Kingdom — privacy@caledoniacover.example",
          "dpo_info": "F. MacLeod, Data Protection Officer — dpo@caledoniacover.example, +44 131 5550 0",
          "processor_obligations": "Art. 28 data-processing agreement with Beacon Claims Cloud, Inc.: processing on documented instructions only, staff confidentiality undertakings, no sub-processors without prior written approval, audit rights, breach notification within 48 hours, and deletion of all claim data within 30 days of contract end.",
          "processing_version": "3.0",
          "estimated_launch_date": "2026-07-01",
          "estimated_end_date": "2028-07-01",
          "dpia_team": "S. Grant, Privacy Counsel (lead drafter); P. Whitfield, claims operations director; N. Osei, platform owner; F. MacLeod, Data Protection Officer (advisory).",
          "reference_materials": "ICO DPIA guidance; ICO international-transfers guidance on the UK Extension to the EU-US Data Privacy Framework; internal Claims Data Handling Standard v4; SOC 2 Type II report of Beacon Claims Cloud, Inc. (2026).",
          "dpia_scope_note": "Covers home-emergency claims handling for all UK policyholders. The underwriting and renewal-pricing activities are out of scope and are assessed in their own DPIAs. This assessment is reviewed every 24 months or on material change; the end date above is the scheduled review boundary, not a termination of the processing.",
          "publication_intent": "Internal document; a summary is available to policyholders on request.",
          "secondary_uses": "None. Claim data is not used for any purpose beyond assessment, dispatch, settlement and complaint follow-up; claim history is excluded from marketing selections and from renewal-pricing models, which are assessed separately.",
          "nature_scope_context": "Nature: structured claim intake, workflow processing, engineer dispatch, settlement and scheduled deletion. Scope: about 1,900 claims per month across 88,000 policyholders; the processed items are claim particulars, property address, policy number and settlement details. Context: policyholders engage the processing at a moment of urgency in their own homes; the customer panel was consulted and its concern about overseas visibility is addressed by the claim-extract design and the certified transfer; core systems are hosted in Edinburgh with the workflow platform operated in the United States under the safeguards recorded in the transfer section.",
          "functional_description": "A policyholder notifies a claim by phone or portal; the claims handler records the claim particulars in the workflow platform; the platform dispatches an approved engineer and tracks completion; settlement is executed from the Edinburgh payment vault; a scheduled job deletes each claim six years after closure.",
          "supporting_assets": "Claims-workflow platform of Beacon Claims Cloud, Inc. under the Art. 28 agreement; Edinburgh policy-administration system; payment vault; engineer-network portal.",
          "codes_of_conduct": "No approved Art. 40 code of conduct applies. The controller follows ICO claims-handling and international-transfers guidance, and the processor holds SOC 2 Type II attestation.",
          "data_quality_measures": "Claim particulars are read back to the policyholder at intake; property address is verified against the policy record before dispatch; settlement amounts are reconciled weekly between the workflow platform and the payment vault, and corrections are applied by the claims operations team.",
          "data_subject_rights_mechanisms": "Access, rectification and erasure requests via privacy@caledoniacover.example, answered within one month; objection and complaints may be raised with the DPO or the Financial Ombudsman Service; the claims privacy notice is provided at claim intake.",
          "dp_by_design_measures": "The workflow platform receives only the claim extract, never the full policy record or bank details; platform access is limited to named claims-handler accounts; engineer dispatch uses job identifiers rather than policy numbers; an automated job enforces the six-year deletion; access logs are reviewed quarterly by the DPO.",
          "transfer_flows": [
                {
                      "destination_country": "US",
                      "recipient": "Beacon Claims Cloud, Inc. (claims-workflow platform operator)",
                      "transfer_mechanism": "UK Extension to the EU-US Data Privacy Framework",
                      "uk_extension_certified": true
                }
          ],
          "retention_record_type": "Retention schedule entry CL-02 in the corporate records-retention register.",
          "residual_risks": "Two moderate risks remain after the measures above. A claims handler could view a claim outside their allocated queue; it is accepted because access is limited to named accounts, queue allocation is logged, and access logs are reviewed quarterly. The workflow platform operator could suffer an incident affecting claim extracts; it is accepted because the extract excludes bank details, the transfer rests on the operator's certification under the UK Extension with breach notification within 48 hours, and the SOC 2 report is reviewed annually.",
          "dpia_prepared_by": "S. Grant — Privacy Counsel (Responsible); P. Whitfield — Claims Operations Director (Consulted); F. MacLeod — Data Protection Officer (Accountable)",
          "dpia_approved_by_name": "E. Drummond",
          "dpia_approved_by_title": "Chief Executive Officer",
          "dpia_approval_date": "2026-06-10",
          "dpia_signoff_basis": "Sections 3 and 4 as reviewed on 8 June 2026, acceptance of two moderate residual risks, and the condition that bank details remain outside the workflow platform and the UK Extension certification is verified at each annual review."
    },
    assertions: [],
  },
];
