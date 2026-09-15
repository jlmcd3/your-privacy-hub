// /all-ptest fixture panel — us-notice. Fifteen complete, internally consistent
// intakes authored 2026-09-14 (see ./types.ts and scripts/ptest/PANEL-BRIEF.md).
// Validated by tests/edge/ptest/panels.test.ts.
//
// Contract: supabase/functions/run-stress-job/_local/intake-contracts/us-notice.ts
// (usNoticeContract) — only its own keys are used here (business_name,
// business_description, contact_email, data_categories, collection_purposes,
// third_party_sharing, third_party_categories, sale_or_sharing,
// retention_general, retention_criteria, data_sources, ccpa_sensitive_data,
// ccpa_minors, ccpa_financial_incentive, ccpa_admt, entity_name,
// company_name). The intake is flat — run-stress-job writes one
// us_notice_answers row per top-level key.

import type { PanelFixture } from "./types.ts";

export const PANEL_US_NOTICE: PanelFixture[] = [
  {
    id: "us-notice-p01-cometgrove-retail-loyalty",
    tool: "us-notice",
    label: "Apparel e-commerce retailer with a paid loyalty rewards program",
    company: "Comet Grove Retail, Inc.",
    sector: "E-commerce / apparel retail",
    geo: "us",
    summary:
      "Comet Grove Retail sells women's apparel online to customers across California, Colorado, Texas, and Virginia and runs a points-based loyalty program that is a financial incentive under CCPA. Exercises sell_and_share, sensitive PI (precise geolocation and payment-card fragments), a financial incentive, and no ADMT.",
    intake: {
      business_name: "Comet Grove Retail, Inc.",
      entity_name: "Comet Grove Retail, Inc.",
      company_name: "Comet Grove Retail, Inc.",
      business_description:
        "Comet Grove Retail operates cometgrove.com, a direct-to-consumer apparel storefront shipping to all fifty states, with concentrated customer bases in California, Colorado, Texas, and Virginia.",
      contact_email: "privacy@cometgroveretail.example",
      data_categories:
        "Identifiers (name, email, shipping address, phone); commercial information (order history, returns); payment-card fragments (last four digits and card type, tokenized); precise geolocation from the mobile app's store-locator feature; internet activity on cometgrove.com; photographs uploaded to size-fit reviews.",
      collection_purposes:
        "Processing and fulfilling orders, operating the Comet Rewards loyalty program, personalizing product recommendations, preventing return fraud, and sending order and shipping notifications.",
      third_party_sharing: "yes",
      third_party_categories:
        "Fulfillment and shipping carriers, payment processor, email marketing platform, advertising networks (for retargeting), and a return-fraud detection vendor.",
      sale_or_sharing: "sell_and_share",
      retention_general:
        "Order and account records are kept for the life of the account plus 7 years for tax and warranty purposes; browsing and app geolocation logs are kept 13 months.",
      retention_criteria:
        "Retention periods are set by the shorter of (a) the statutory recordkeeping period for sales tax and consumer-warranty claims, or (b) the point at which the data no longer serves the loyalty-program or fraud-prevention purpose for which it was collected.",
      data_sources:
        "Directly from customers at checkout and account signup; automatically from the cometgrove.com website and mobile app; from the payment processor (tokenized card confirmations).",
      ccpa_sensitive_data: "yes",
      ccpa_minors: "no",
      ccpa_financial_incentive: "yes",
      ccpa_admt: "no",
    },
  },
  {
    id: "us-notice-p02-larkspur-health-analytics",
    tool: "us-notice",
    label: "Hospital readmission-risk analytics vendor, no sale or sharing",
    company: "Larkspur Health Analytics, LLC",
    sector: "Healthcare data analytics",
    geo: "us",
    summary:
      "Larkspur Health Analytics processes hospital patient records under contract to build readmission-risk scores and never sells or shares personal information. Exercises sale_or_sharing = no, sensitive PI (health data), an automated decision-making risk score, and no financial incentive.",
    intake: {
      business_name: "Larkspur Health Analytics, LLC",
      entity_name: "Larkspur Health Analytics, LLC",
      company_name: "Larkspur Health Analytics, LLC",
      business_description:
        "Larkspur Health Analytics is a business-to-business software vendor that ingests de-identified and identified patient records from contracted California and Texas hospital systems to build 30-day readmission-risk scores for care-management teams.",
      contact_email: "privacy@larkspurhealth.example",
      data_categories:
        "Health and medical information (diagnoses, medications, lab results, vitals); identifiers (patient name, medical record number, date of birth); insurance and billing information.",
      collection_purposes:
        "Generating readmission-risk scores for care-management teams, quality-improvement reporting to contracted hospital systems, and regulatory reporting required by hospital customers' accreditation obligations.",
      third_party_sharing: "yes",
      third_party_categories:
        "Cloud hosting provider (HIPAA business associate), a statistical-modeling contractor, and the contracted hospital systems that supply and receive the data as joint controllers of their own patient records.",
      sale_or_sharing: "no",
      retention_general:
        "Patient records are retained for the term of the hospital services agreement plus 6 years, matching the hospital customers' own medical-records retention schedules.",
      retention_criteria:
        "Retention tracks the underlying hospital system's medical-record retention obligation for each patient, since Larkspur processes the record only as a service provider on the hospital's behalf.",
      data_sources:
        "Received from contracted hospital systems' electronic health record exports; no data is collected directly from patients.",
      ccpa_sensitive_data: "yes",
      ccpa_minors: "no",
      ccpa_financial_incentive: "no",
      ccpa_admt: "yes",
    },
  },
  {
    id: "us-notice-p03-ferncrest-financial-underwriting",
    tool: "us-notice",
    label: "Online consumer lender with automated credit underwriting",
    company: "Ferncrest Financial Corp.",
    sector: "Consumer lending / fintech",
    geo: "us",
    summary:
      "Ferncrest Financial originates unsecured personal loans online and shares application data with ad networks for retargeting without selling it outright. Exercises sale_or_sharing = share_only, sensitive PI (Social Security number and financial account data), automated credit-decisioning, and no minors.",
    intake: {
      business_name: "Ferncrest Financial Corp.",
      entity_name: "Ferncrest Financial Corp.",
      company_name: "Ferncrest Financial Corp.",
      business_description:
        "Ferncrest Financial is a direct-to-consumer online lender offering unsecured personal loans to residents of California, Texas, Colorado, and Virginia through ferncrestloans.com.",
      data_categories:
        "Social Security numbers, government identification numbers, financial account and income information, credit-report data, identifiers (name, address, phone, email), and internet activity on the loan-application funnel.",
      collection_purposes:
        "Underwriting and pricing loan applications, verifying identity and preventing fraud, servicing funded loans, and remarketing unfinished applications through advertising partners.",
      third_party_sharing: "yes",
      third_party_categories:
        "Credit-reporting bureaus, an identity-verification vendor, a loan-servicing platform, and advertising networks that retarget visitors who abandoned an application.",
      sale_or_sharing: "share_only",
      retention_general:
        "Funded-loan files are retained for 7 years after payoff to satisfy federal lending recordkeeping rules; abandoned applications are retained 24 months for remarketing and fraud analysis.",
      retention_criteria:
        "Retention is set by the longer of the applicable lending-recordkeeping statute for funded loans or the operational window in which an abandoned application remains eligible for remarketing.",
      data_sources:
        "Directly from applicants on the loan application; from credit bureaus; from the identity-verification vendor's document-scan results.",
      contact_email: "privacy@ferncrestfinancial.example",
      ccpa_sensitive_data: "yes",
      ccpa_minors: "no",
      ccpa_financial_incentive: "no",
      ccpa_admt: "yes",
    },
  },
  {
    id: "us-notice-p04-briarwood-streaming-kids",
    tool: "us-notice",
    label: "Ad-supported video streaming service with a kids profile mode",
    company: "Briarwood Streaming Media, Inc.",
    sector: "Media / video streaming",
    geo: "us",
    summary:
      "Briarwood Streaming sells viewing-history segments to advertising partners and shares data for cross-context behavioral ads, and offers a dedicated kids profile mode. Exercises sale_or_sharing = sell_and_share, minors = yes, no sensitive PI, and no ADMT.",
    intake: {
      business_name: "Briarwood Streaming Media, Inc.",
      entity_name: "Briarwood Streaming Media, Inc.",
      company_name: "Briarwood Streaming Media, Inc.",
      business_description:
        "Briarwood Streaming Media operates an ad-supported video-on-demand service reaching subscribers nationwide, including a dedicated Kids Profile mode with age-gated content and verified-parental-consent account controls.",
      contact_email: "privacy@briarwoodstreaming.example",
      data_categories:
        "Identifiers (name, email, household account ID); viewing history and content preferences; device and advertising identifiers; approximate location (derived from IP address); for Kids Profiles, a child's first name and birth year provided by the consenting parent.",
      collection_purposes:
        "Delivering and recommending video content, serving and measuring advertising, managing subscriptions and billing, and administering the Kids Profile parental-consent workflow.",
      third_party_sharing: "yes",
      third_party_categories:
        "Programmatic advertising exchanges, an ad-measurement vendor, cloud video-hosting infrastructure, and a payment processor.",
      sale_or_sharing: "sell_and_share",
      retention_general:
        "Viewing-history data is retained 18 months on a rolling basis; Kids Profile data is retained only while the child profile remains active and is deleted within 30 days of profile removal.",
      retention_criteria:
        "General viewing and advertising data is retained only as long as it remains useful for content recommendation and ad measurement; Kids Profile data is retained no longer than the profile itself under the platform's children's-privacy commitments.",
      data_sources:
        "Directly from subscribers at signup and during viewing; automatically from the streaming app and connected-TV clients; from advertising partners' pixel and SDK integrations.",
      ccpa_sensitive_data: "no",
      ccpa_minors: "yes",
      ccpa_financial_incentive: "no",
      ccpa_admt: "no",
    },
  },
  {
    id: "us-notice-p05-quietwater-fitness-app",
    tool: "us-notice",
    label: "Early-stage fitness app still assessing its CCPA sale/share status",
    company: "Quietwater Fitness Corp.",
    sector: "Fitness / wellness mobile app",
    geo: "us",
    summary:
      "Quietwater Fitness is a two-year-old workout-tracking app that has not finished classifying its ad-network integrations under CCPA. Exercises sale_or_sharing = not_sure, sensitive PI (fitness and heart-rate data), a referral financial incentive, and an unsure ADMT answer for its plan-matching algorithm.",
    intake: {
      business_name: "Quietwater Fitness Corp.",
      entity_name: "Quietwater Fitness Corp.",
      company_name: "Quietwater Fitness Corp.",
      business_description:
        "Quietwater Fitness publishes a workout-tracking mobile app used by consumers in California, Colorado, and Texas to log exercise sessions, heart-rate data synced from wearables, and personalized workout plans.",
      contact_email: "privacy@quietwaterfitness.example",
      data_categories:
        "Fitness and exercise activity data; heart-rate and calorie data synced from third-party wearables; identifiers (name, email); precise geolocation for outdoor run tracking; referral-program contact information.",
      collection_purposes:
        "Tracking workouts and generating personalized workout plans, operating a friend-referral rewards program, and improving the app's plan-matching recommendations.",
      third_party_sharing: "yes",
      third_party_categories:
        "A mobile analytics SDK vendor, cloud hosting provider, and several third-party advertising SDKs embedded in the free app tier that Quietwater has not yet fully audited.",
      sale_or_sharing: "not_sure",
      retention_general:
        "Workout and heart-rate history is retained while the account is active and for 12 months after account deletion in case of reactivation.",
      retention_criteria:
        "Retention is tied to the active-account window plus a 12-month reactivation grace period; Quietwater has not yet set a separate criterion for the advertising-SDK data pending its ongoing vendor audit.",
      data_sources:
        "Directly from users in the app; automatically from connected wearable devices via their manufacturer APIs; automatically from the embedded advertising SDKs.",
      ccpa_sensitive_data: "yes",
      ccpa_minors: "no",
      ccpa_financial_incentive: "yes",
      ccpa_admt: "unsure",
    },
  },
  {
    id: "us-notice-p06-hollowridge-k12-edtech",
    tool: "us-notice",
    label: "K-12 classroom learning platform sold to schools, no ads",
    company: "Hollowridge EdTech, Inc.",
    sector: "K-12 education technology",
    geo: "us",
    summary:
      "Hollowridge EdTech licenses a classroom learning platform to school districts and contractually prohibits advertising or resale of student data. Exercises sale_or_sharing = no, minors = yes, no sensitive PI, and no ADMT beyond simple progress tracking.",
    intake: {
      business_name: "Hollowridge EdTech, Inc.",
      entity_name: "Hollowridge EdTech, Inc.",
      company_name: "Hollowridge EdTech, Inc.",
      business_description:
        "Hollowridge EdTech licenses a K-12 classroom learning platform directly to school districts in California, Texas, and Colorado under district-signed data-privacy agreements that prohibit advertising and resale of student records.",
      contact_email: "privacy@hollowridgeedtech.example",
      data_categories:
        "Student identifiers (name, school-issued ID, grade level); assignment and assessment results; teacher-entered progress notes; login and usage logs.",
      collection_purposes:
        "Delivering classroom lessons and assignments, generating progress reports for teachers and parents, and providing districts with aggregate usage reporting for their own compliance needs.",
      third_party_sharing: "yes",
      third_party_categories:
        "Cloud hosting provider and a single-sign-on vendor used for district authentication, both bound by student-data-privacy addenda.",
      sale_or_sharing: "no",
      retention_general:
        "Student records are retained for the school year plus one additional year, then deleted or returned to the district under the district data-privacy agreement.",
      retention_criteria:
        "Retention is set entirely by each district's data-privacy agreement, which requires deletion or return of student records no later than one year after the student stops using the platform.",
      data_sources:
        "Directly from teachers and district administrators during class setup; from students during classroom use; from the district's roster-management system via the single-sign-on integration.",
      ccpa_sensitive_data: "no",
      ccpa_minors: "yes",
      ccpa_financial_incentive: "no",
      ccpa_admt: "no",
    },
  },
  {
    id: "us-notice-p07-palisade-adtech-exchange",
    tool: "us-notice",
    label: "Programmatic advertising exchange selling and sharing audience data",
    company: "Palisade AdTech Networks, LLC",
    sector: "Advertising technology / programmatic exchange",
    geo: "us",
    summary:
      "Palisade AdTech operates a real-time bidding exchange that both sells audience segments to demand-side platforms and shares device data for cross-context advertising. Exercises sale_or_sharing = sell_and_share, sensitive PI (precise geolocation), automated bidding decisions, and no minors.",
    intake: {
      business_name: "Palisade AdTech Networks, LLC",
      entity_name: "Palisade AdTech Networks, LLC",
      company_name: "Palisade AdTech Networks, LLC",
      business_description:
        "Palisade AdTech Networks operates a real-time bidding exchange connecting publisher inventory across California, Colorado, Texas, and Virginia to demand-side advertising platforms.",
      contact_email: "privacy@palisadeadtech.example",
      data_categories:
        "Device and advertising identifiers, precise geolocation, browsing and app-usage history, inferred interest segments, and IP addresses.",
      collection_purposes:
        "Building audience segments for advertisers, operating the real-time bidding auction, measuring ad performance, and detecting invalid traffic.",
      third_party_sharing: "yes",
      third_party_categories:
        "Demand-side platforms, data-management-platform partners, publisher partners supplying bid requests, and an invalid-traffic-detection vendor.",
      sale_or_sharing: "sell_and_share",
      retention_general:
        "Bid-stream logs are retained 30 days; derived audience segments are retained 90 days on a rolling basis.",
      retention_criteria:
        "Raw bid-stream data is purged as soon as it is no longer needed for auction reconciliation and fraud detection; audience segments expire after 90 days to keep targeting current and limit stale-data risk.",
      data_sources:
        "Automatically from publisher partners' bid requests; automatically from Palisade's own tracking pixels and SDKs embedded in participating apps and websites.",
      ccpa_sensitive_data: "yes",
      ccpa_minors: "no",
      ccpa_financial_incentive: "no",
      ccpa_admt: "yes",
    },
  },
  {
    id: "us-notice-p08-stonegate-insurance-telematics",
    tool: "us-notice",
    label: "Auto insurer with a telematics discount program and data licensing",
    company: "Stonegate Insurance Services, Corp.",
    sector: "Property and casualty insurance",
    geo: "us",
    summary:
      "Stonegate Insurance licenses aggregated driving-behavior data to actuarial data brokers for a fee and runs a telematics-based safe-driving discount. Exercises sale_or_sharing = sell_only, sensitive PI (driver's license and precise geolocation), a financial incentive, and automated rate underwriting.",
    intake: {
      business_name: "Stonegate Insurance Services, Corp.",
      entity_name: "Stonegate Insurance Services, Corp.",
      company_name: "Stonegate Insurance Services, Corp.",
      business_description:
        "Stonegate Insurance Services underwrites personal auto and homeowners policies in California, Texas, Colorado, and Virginia, and offers an optional telematics app that tracks driving behavior in exchange for a premium discount.",
      contact_email: "privacy@stonegateinsurance.example",
      data_categories:
        "Driver's license numbers, precise geolocation and trip data from the telematics app, vehicle identification numbers, claims history, and identifiers (name, address, phone, email).",
      collection_purposes:
        "Underwriting and pricing policies, administering claims, operating the telematics safe-driving discount program, and licensing de-identified, aggregated driving-behavior statistics to actuarial data brokers.",
      third_party_sharing: "yes",
      third_party_categories:
        "The telematics-app vendor, an actuarial data-licensing broker, a claims-adjustment vendor, and a payment processor.",
      sale_or_sharing: "sell_only",
      retention_general:
        "Policy and claims records are retained for 7 years after policy termination to satisfy state insurance-recordkeeping requirements; telematics trip data is retained 24 months.",
      retention_criteria:
        "Policy and claims retention is set by state insurance-department recordkeeping rules; telematics trip data is retained only as long as needed to recalculate the rolling safe-driving discount score.",
      data_sources:
        "Directly from applicants and policyholders; automatically from the telematics app installed with the policyholder's consent; from third-party motor-vehicle and claims-history databases.",
      ccpa_sensitive_data: "yes",
      ccpa_minors: "no",
      ccpa_financial_incentive: "yes",
      ccpa_admt: "yes",
    },
  },
  {
    id: "us-notice-p09-windmere-grocery-loyalty",
    tool: "us-notice",
    label: "Grocery chain licensing purchase data to CPG brands for a fee",
    company: "Windmere Grocery Co., Inc.",
    sector: "Grocery retail",
    geo: "us",
    summary:
      "Windmere Grocery licenses shopper purchase-history data to consumer packaged-goods brands for a fee through its loyalty app but does not run cross-context behavioral advertising. Exercises sale_or_sharing = sell_only, a loyalty financial incentive, no sensitive PI, and no minors.",
    intake: {
      business_name: "Windmere Grocery Co., Inc.",
      entity_name: "Windmere Grocery Co., Inc.",
      company_name: "Windmere Grocery Co., Inc.",
      business_description:
        "Windmere Grocery Co. operates 64 grocery stores across California, Colorado, and Texas along with a companion loyalty app that issues weekly digital coupons and tracks purchase history.",
      contact_email: "privacy@windmeregrocery.example",
      data_categories:
        "Identifiers (name, email, loyalty account number); purchase history by item category; digital coupon redemption data; approximate store-visit location from the loyalty app.",
      collection_purposes:
        "Operating the loyalty rewards and digital-coupon program, personalizing weekly offers, category-level sales analytics, and licensing aggregated purchase-pattern data to consumer packaged-goods brands.",
      third_party_sharing: "yes",
      third_party_categories:
        "A loyalty-platform vendor, a consumer-packaged-goods data-licensing partner, and a digital-coupon distribution vendor.",
      sale_or_sharing: "sell_only",
      retention_general:
        "Loyalty and purchase-history data is retained for the life of the loyalty account plus 24 months of inactivity before automatic deletion.",
      retention_criteria:
        "Retention runs until 24 months of loyalty-account inactivity, matching the point at which the purchase history is no longer useful for personalized offers or the data-licensing program.",
      data_sources:
        "Directly from shoppers at loyalty enrollment and checkout; automatically from the loyalty app's coupon-clip and store-locator features.",
      ccpa_sensitive_data: "no",
      ccpa_minors: "no",
      ccpa_financial_incentive: "yes",
      ccpa_admt: "no",
    },
  },
  {
    id: "us-notice-p10-thornbury-legal-docprep",
    tool: "us-notice",
    label: "Online legal document preparation service still assessing vendors",
    company: "Thornbury Legal Services, LLC",
    sector: "Legal services / document preparation",
    geo: "us",
    summary:
      "Thornbury Legal Services helps consumers prepare wills, LLC filings, and small-claims paperwork online and has not yet completed its assessment of whether its e-signature vendor's data use counts as a sale or sharing. Exercises sale_or_sharing = not_sure, sensitive PI (Social Security numbers in estate documents), and no ADMT.",
    intake: {
      business_name: "Thornbury Legal Services, LLC",
      entity_name: "Thornbury Legal Services, LLC",
      company_name: "Thornbury Legal Services, LLC",
      business_description:
        "Thornbury Legal Services operates thornburylegal.com, a self-service platform where consumers in California, Virginia, and Texas prepare wills, single-member LLC formation documents, and small-claims filings.",
      contact_email: "privacy@thornburylegal.example",
      data_categories:
        "Social Security numbers and financial-account information entered into estate and beneficiary-designation documents; identifiers (name, address, email, phone); payment-card fragments.",
      collection_purposes:
        "Generating personalized legal documents, processing payments for document packages, and maintaining a copy of completed documents for the customer's account history.",
      third_party_sharing: "yes",
      third_party_categories:
        "An e-signature and document-storage vendor, a payment processor, and a customer-support ticketing platform; Thornbury is still completing a vendor-by-vendor review of whether the e-signature vendor's analytics use constitutes a sale or share.",
      sale_or_sharing: "not_sure",
      retention_general:
        "Completed documents and account records are retained for 10 years to support potential future amendments or disputes over estate documents.",
      retention_criteria:
        "The 10-year period matches the outer range of state statutes of limitation that could apply to a dispute over a will or beneficiary designation prepared on the platform.",
      data_sources:
        "Directly from customers completing the document-preparation questionnaire; from the payment processor for billing confirmation.",
      ccpa_sensitive_data: "yes",
      ccpa_minors: "no",
      ccpa_financial_incentive: "no",
      ccpa_admt: "no",
    },
  },
  {
    id: "us-notice-p11-cinderpeak-gaming-teens",
    tool: "us-notice",
    label: "Mobile game publisher with an in-game ad network and known teen players",
    company: "Cinderpeak Gaming Studios, Inc.",
    sector: "Mobile gaming",
    geo: "us",
    summary:
      "Cinderpeak Gaming Studios publishes a free-to-play mobile game with an in-game advertising network and a large teen player base that it verifies through age-screening at signup. Exercises sale_or_sharing = sell_and_share, minors = yes, a referral financial incentive, and no ADMT.",
    intake: {
      business_name: "Cinderpeak Gaming Studios, Inc.",
      entity_name: "Cinderpeak Gaming Studios, Inc.",
      company_name: "Cinderpeak Gaming Studios, Inc.",
      business_description:
        "Cinderpeak Gaming Studios publishes Ember Realms, a free-to-play mobile strategy game with an age-screening signup flow that identifies a substantial population of players between 13 and 17 across California, Texas, and Colorado.",
      contact_email: "privacy@cinderpeakgaming.example",
      data_categories:
        "Identifiers (username, email, device ID); in-game activity and purchase history; advertising identifiers; age-band self-reported at signup; referral-program contact information for friend invites.",
      collection_purposes:
        "Operating gameplay and matchmaking, serving and measuring in-game advertising, administering the friend-referral rewards program, and applying age-appropriate content and ad-targeting restrictions.",
      third_party_sharing: "yes",
      third_party_categories:
        "An in-game advertising network, a mobile analytics SDK vendor, and cloud hosting infrastructure.",
      sale_or_sharing: "sell_and_share",
      retention_general:
        "Gameplay and purchase history is retained for the life of the account; advertising-identifier data tied to teen players is retained no longer than 6 months under Cinderpeak's teen-data minimization policy.",
      retention_criteria:
        "General account and gameplay data is retained for the life of the account to preserve progress; advertising data for known teen accounts is shortened to 6 months specifically because of their age band.",
      data_sources:
        "Directly from players at account signup and during gameplay; automatically from the in-game advertising SDK.",
      ccpa_sensitive_data: "no",
      ccpa_minors: "yes",
      ccpa_financial_incentive: "yes",
      ccpa_admt: "no",
    },
  },
  {
    id: "us-notice-p12-redglen-hr-screening",
    tool: "us-notice",
    label: "Applicant tracking system with automated resume screening",
    company: "Redglen HR Technologies, Corp.",
    sector: "Human resources software",
    geo: "us",
    summary:
      "Redglen HR Technologies sells an applicant tracking system that ranks job applicants with an automated resume-screening model and never sells or shares applicant data. Exercises sale_or_sharing = no, sensitive PI (Social Security numbers for background checks), automated decision-making, and no minors.",
    intake: {
      business_name: "Redglen HR Technologies, Corp.",
      entity_name: "Redglen HR Technologies, Corp.",
      company_name: "Redglen HR Technologies, Corp.",
      business_description:
        "Redglen HR Technologies licenses an applicant tracking system to mid-size employers in California, Colorado, and Texas, including an automated resume-screening feature that ranks applicants against a job description before a recruiter reviews the shortlist.",
      contact_email: "privacy@redglenhr.example",
      data_categories:
        "Social Security numbers and government identification numbers collected during background checks, resumes and employment history, identifiers (name, address, phone, email), and interview-scheduling data.",
      collection_purposes:
        "Operating the applicant tracking and resume-screening workflow for employer customers, coordinating background checks, and scheduling interviews.",
      third_party_sharing: "yes",
      third_party_categories:
        "A background-check vendor, cloud hosting provider, and a calendar-integration vendor used for interview scheduling.",
      sale_or_sharing: "no",
      retention_general:
        "Applicant records are retained for 4 years after a hiring decision to satisfy federal equal-employment recordkeeping requirements applicable to Redglen's employer customers.",
      retention_criteria:
        "The 4-year period matches the federal recordkeeping requirement for employment-selection records that Redglen's employer customers must satisfy, since Redglen holds the data as their service provider.",
      data_sources:
        "Directly from job applicants who submit an application through an employer customer's careers page; from the background-check vendor.",
      ccpa_sensitive_data: "yes",
      ccpa_minors: "no",
      ccpa_financial_incentive: "no",
      ccpa_admt: "yes",
    },
  },
  {
    id: "us-notice-p13-marrowbay-telehealth-triage",
    tool: "us-notice",
    label: "Adult telehealth platform with an AI symptom-triage assistant",
    company: "Marrow Bay Telehealth, LLC",
    sector: "Telehealth",
    geo: "us",
    summary:
      "Marrow Bay Telehealth connects adult patients with licensed physicians over video and uses an AI assistant to suggest triage priority, a use it has not yet finished evaluating against the CCPA ADMT rules. Exercises sale_or_sharing = no, sensitive PI (health data), an unsure ADMT answer, and no minors (adult-only platform).",
    intake: {
      business_name: "Marrow Bay Telehealth, LLC",
      entity_name: "Marrow Bay Telehealth, LLC",
      company_name: "Marrow Bay Telehealth, LLC",
      business_description:
        "Marrow Bay Telehealth operates an adult-only (18+) telehealth video platform connecting patients in California, Texas, and Virginia with licensed physicians for urgent-care and primary-care visits.",
      contact_email: "privacy@marrowbaytelehealth.example",
      data_categories:
        "Health and medical information (symptoms, diagnoses, prescriptions, vitals entered by the patient); identifiers (name, date of birth, address, phone, email); insurance information; video-visit recordings retained with patient consent.",
      collection_purposes:
        "Facilitating video visits between patients and physicians, an AI symptom-triage assistant that suggests a priority queue position for the on-call physician, and processing insurance claims.",
      third_party_sharing: "yes",
      third_party_categories:
        "A HIPAA-compliant video-conferencing vendor, a cloud hosting provider, an insurance-claims clearinghouse, and the AI triage-model vendor.",
      sale_or_sharing: "no",
      retention_general:
        "Medical records, including video-visit recordings, are retained for 7 years after the last visit to satisfy state medical-recordkeeping requirements for telehealth providers.",
      retention_criteria:
        "The 7-year period is set by the medical-recordkeeping statute applicable to telehealth encounters in Marrow Bay's licensed states.",
      data_sources:
        "Directly from patients during intake and video visits; from the AI triage-model vendor's output; from health insurers during claims processing.",
      ccpa_sensitive_data: "yes",
      ccpa_minors: "no",
      ccpa_financial_incentive: "no",
      ccpa_admt: "unsure",
    },
  },
  {
    id: "us-notice-p14-silverthorn-realty-retargeting",
    tool: "us-notice",
    label: "Regional real-estate brokerage sharing site visitors for retargeting ads",
    company: "Silverthorn Realty Group, Corp.",
    sector: "Real estate brokerage",
    geo: "us",
    summary:
      "Silverthorn Realty Group shares listing-browsing data with an advertising retargeting vendor without selling it, and is still confirming whether its MLS feed includes any sensitive personal information. Exercises sale_or_sharing = share_only, an unsure sensitive-PI answer, and no ADMT.",
    intake: {
      business_name: "Silverthorn Realty Group, Corp.",
      entity_name: "Silverthorn Realty Group, Corp.",
      company_name: "Silverthorn Realty Group, Corp.",
      business_description:
        "Silverthorn Realty Group is a residential real-estate brokerage with offices in Colorado and Texas, operating silverthornrealty.example to publish property listings pulled from the regional Multiple Listing Service feed.",
      contact_email: "privacy@silverthornrealty.example",
      data_categories:
        "Identifiers (name, email, phone) submitted through listing-inquiry forms; browsing history on silverthornrealty.example; saved-search and favorited-listing data; Multiple Listing Service feed data whose full field set Silverthorn has not yet fully audited.",
      collection_purposes:
        "Responding to listing inquiries, matching prospective buyers with agents, publishing MLS-sourced listing pages, and retargeting website visitors who viewed a listing but did not submit an inquiry.",
      third_party_sharing: "yes",
      third_party_categories:
        "An advertising retargeting vendor, the regional Multiple Listing Service data feed, and a customer-relationship-management platform used by agents.",
      sale_or_sharing: "share_only",
      retention_general:
        "Inquiry and browsing data is retained 18 months; agent CRM records for active clients are retained for the duration of the representation agreement plus 3 years.",
      retention_criteria:
        "Website browsing and retargeting data is retained only as long as it remains useful for the retargeting campaign; client CRM records follow the 3-year post-transaction period recommended by Silverthorn's brokerage errors-and-omissions insurer.",
      data_sources:
        "Directly from website visitors submitting an inquiry form; automatically from silverthornrealty.example browsing activity; from the regional Multiple Listing Service feed.",
      ccpa_sensitive_data: "unsure",
      ccpa_minors: "no",
      ccpa_financial_incentive: "no",
      ccpa_admt: "no",
    },
  },
  {
    id: "us-notice-p15-copperlantern-nonprofit-minimal",
    tool: "us-notice",
    label: "Small nonprofit donor-management platform with minimal vendor footprint",
    company: "Copperlantern Nonprofit Alliance, Inc.",
    sector: "Nonprofit / donor services",
    geo: "us",
    summary:
      "Copperlantern Nonprofit Alliance runs its own in-house donor database with a single hosting vendor, does not run advertising, and does not sell or share donor information. Exercises sale_or_sharing = no together with third_party_sharing = no, no sensitive PI, no minors, and no ADMT — the minimal-footprint branch.",
    intake: {
      business_name: "Copperlantern Nonprofit Alliance, Inc.",
      entity_name: "Copperlantern Nonprofit Alliance, Inc.",
      company_name: "Copperlantern Nonprofit Alliance, Inc.",
      business_description:
        "Copperlantern Nonprofit Alliance is a California-based 501(c)(3) that coordinates volunteer food-bank drives and manages its own donor and volunteer database in-house, with no advertising program.",
      contact_email: "privacy@copperlanternalliance.example",
      data_categories:
        "Identifiers (name, email, mailing address, phone) for donors and volunteers; donation-history amounts and dates; volunteer shift sign-up records.",
      collection_purposes:
        "Processing and acknowledging donations, coordinating volunteer shift sign-ups, and sending program updates to donors and volunteers who opted in.",
      third_party_sharing: "no",
      third_party_categories:
        "None — donor and volunteer records are held solely in Copperlantern's own hosted database with no advertising, analytics, or data-licensing vendors.",
      sale_or_sharing: "no",
      retention_general:
        "Donor and volunteer records are retained for 7 years after the last donation or volunteer shift to support annual tax-acknowledgment letters and grant reporting.",
      retention_criteria:
        "The 7-year period matches the recordkeeping period Copperlantern's accountant recommends for substantiating charitable-donation tax acknowledgments.",
      data_sources:
        "Directly from donors and volunteers who submit a donation or sign up for a shift on copperlanternalliance.example.",
      ccpa_sensitive_data: "no",
      ccpa_minors: "no",
      ccpa_financial_incentive: "no",
      ccpa_admt: "no",
    },
  },
];
